import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AttendanceRecord } from './attendance.entity';
import { AttendanceCalculationService } from './attendance-calculation.service';
import { AttendanceAuditLog, AttendanceAuditAction } from './entities/attendance-audit-log.entity';
import { AttendanceDaySummary } from './entities/attendance-day-summary.entity';
import {
  AttendancePunchType,
  AttendanceRequest,
  AttendanceRequestType,
} from './entities/attendance-request.entity';
import {
  AttendanceAuditLogQueryDto,
  AttendanceRequestsQueryDto,
  CreateAttendanceRequestDto,
  ReviewAttendanceRequestDto,
} from './dto/attendance-request.dto';
import { Employee } from '../employees/employee.entity';
import { AuthenticatedUser } from '../auth/authenticated-user.interface';
import { CompanyRole } from '../companies/company-role.enum';
import {
  assertMaxRangeDays,
  getArgentinaDateKey,
  parseArgentinaDateEnd,
  parseArgentinaDateStart,
  todayArgentinaDateKey,
} from '../reports/utils/argentina-date.util';

export interface AttendanceRequestView extends AttendanceRequest {
  employee: Pick<Employee, 'id' | 'nombre' | 'apellido'> | null;
}

export interface AttendanceAuditLogView extends AttendanceAuditLog {
  employee: Pick<Employee, 'id' | 'nombre' | 'apellido'> | null;
}

@Injectable()
export class AttendanceRequestsService {
  constructor(
    @InjectRepository(AttendanceRequest)
    private readonly requestsRepo: Repository<AttendanceRequest>,
    @InjectRepository(AttendanceAuditLog)
    private readonly auditRepo: Repository<AttendanceAuditLog>,
    @InjectRepository(AttendanceRecord)
    private readonly attendanceRepo: Repository<AttendanceRecord>,
    @InjectRepository(AttendanceDaySummary)
    private readonly summariesRepo: Repository<AttendanceDaySummary>,
    @InjectRepository(Employee)
    private readonly employeesRepo: Repository<Employee>,
    private readonly calculations: AttendanceCalculationService,
  ) {}

  async findAll(user: AuthenticatedUser, query: AttendanceRequestsQueryDto): Promise<AttendanceRequestView[]> {
    const { companyId, dateFrom, dateTo } = this.resolveReadableScope(user, query.companyId, query.dateFrom, query.dateTo);
    const qb = this.requestsRepo
      .createQueryBuilder('request')
      .leftJoinAndMapOne('request.employee', Employee, 'employee', 'employee.id = request.employee_id')
      .where('request.date >= :dateFrom', { dateFrom })
      .andWhere('request.date <= :dateTo', { dateTo });

    if (companyId) {
      qb.andWhere('request.company_id = :companyId', { companyId });
    }
    if (query.status) {
      qb.andWhere('request.status = :status', { status: query.status });
    }
    if (query.type) {
      qb.andWhere('request.type = :type', { type: query.type });
    }
    if (query.employeeId) {
      qb.andWhere('request.employee_id = :employeeId', { employeeId: query.employeeId });
    }

    qb.orderBy('request.created_at', 'DESC');
    const requests = await qb.getMany();
    return requests.map((request) => this.toRequestView(request));
  }

  async create(user: AuthenticatedUser, dto: CreateAttendanceRequestDto): Promise<AttendanceRequestView> {
    this.assertCanCreate(user);
    const companyId = user.isSuperAdmin && !dto.companyId
      ? await this.resolveEmployeeCompanyId(dto.employeeId)
      : this.resolveWritableCompanyId(user, dto.companyId);
    const employee = await this.getEmployeeOrFail(companyId, dto.employeeId);
    this.validateCreatePayload(dto);

    let targetRecord: AttendanceRecord | null = null;
    if (dto.type === 'punch_correction') {
      targetRecord = await this.getTargetRecordOrFail(companyId, dto.employeeId, dto.targetAttendanceRecordId);
    }
    const punchTime = dto.punchTime ? this.parseArgentinaDateTime(dto.punchTime) : null;
    const newPunchTime = dto.newPunchTime ? this.parseArgentinaDateTime(dto.newPunchTime) : null;
    const requestDate =
      dto.type === 'manual_punch' && punchTime
        ? getArgentinaDateKey(punchTime)
        : dto.type === 'punch_correction' && targetRecord
          ? getArgentinaDateKey(targetRecord.timestamp)
          : dto.date;

    const request = this.requestsRepo.create({
      companyId,
      employeeId: employee.id,
      requestedByUserId: user.id,
      reviewedByUserId: null,
      type: dto.type,
      status: 'pending',
      date: requestDate,
      punchTime,
      punchType: dto.punchType ?? null,
      targetAttendanceRecordId: targetRecord?.id ?? null,
      oldPunchTime: targetRecord?.timestamp ?? null,
      newPunchTime,
      reason: dto.reason.trim(),
      reviewNotes: null,
      reviewedAt: null,
    });

    const saved = await this.requestsRepo.save(request);
    await this.writeAudit({
      companyId,
      employeeId: employee.id,
      requestId: saved.id,
      action: 'request_created',
      newValue: this.requestSnapshot(saved),
      userId: user.id,
    });

    if (this.isJustification(saved.type)) {
      await this.markSummaryJustification(saved, 'pending', user.id, false);
    }

    if (dto.autoApprove && this.canReview(user)) {
      return this.approve(user, saved.id, { reviewNotes: 'Aprobación automática al crear.' });
    }

    return this.findOneView(saved.id);
  }

  async approve(user: AuthenticatedUser, id: string, dto: ReviewAttendanceRequestDto): Promise<AttendanceRequestView> {
    this.assertCanReview(user);
    const request = await this.findWritableRequest(user, id);
    if (request.status !== 'pending') {
      throw new BadRequestException('La solicitud ya fue revisada.');
    }

    await this.applyApprovedRequest(request, user.id);
    request.status = 'approved';
    request.reviewedByUserId = user.id;
    request.reviewNotes = dto.reviewNotes?.trim() || null;
    request.reviewedAt = new Date();
    await this.requestsRepo.save(request);
    await this.writeAudit({
      companyId: request.companyId,
      employeeId: request.employeeId,
      requestId: request.id,
      action: 'request_approved',
      newValue: this.requestSnapshot(request),
      userId: user.id,
    });

    return this.findOneView(request.id);
  }

  async reject(user: AuthenticatedUser, id: string, dto: ReviewAttendanceRequestDto): Promise<AttendanceRequestView> {
    this.assertCanReview(user);
    if (!dto.reviewNotes?.trim()) {
      throw new BadRequestException('reviewNotes es obligatorio al rechazar.');
    }

    const request = await this.findWritableRequest(user, id);
    if (request.status !== 'pending') {
      throw new BadRequestException('La solicitud ya fue revisada.');
    }

    request.status = 'rejected';
    request.reviewedByUserId = user.id;
    request.reviewNotes = dto.reviewNotes.trim();
    request.reviewedAt = new Date();
    await this.requestsRepo.save(request);

    if (this.isJustification(request.type)) {
      await this.markSummaryJustification(request, 'rejected', user.id, false);
    }

    await this.writeAudit({
      companyId: request.companyId,
      employeeId: request.employeeId,
      requestId: request.id,
      action: 'request_rejected',
      newValue: this.requestSnapshot(request),
      userId: user.id,
    });

    return this.findOneView(request.id);
  }

  async cancel(user: AuthenticatedUser, id: string): Promise<AttendanceRequestView> {
    const request = await this.findCancellableRequest(user, id);
    if (request.status !== 'pending') {
      throw new BadRequestException('Solo se pueden cancelar solicitudes pendientes.');
    }

    request.status = 'cancelled';
    request.reviewedByUserId = user.id;
    request.reviewedAt = new Date();
    await this.requestsRepo.save(request);

    if (this.isJustification(request.type)) {
      await this.markSummaryJustification(request, 'none', user.id, true);
    }

    await this.writeAudit({
      companyId: request.companyId,
      employeeId: request.employeeId,
      requestId: request.id,
      action: 'request_cancelled',
      newValue: this.requestSnapshot(request),
      userId: user.id,
    });

    return this.findOneView(request.id);
  }

  async auditLog(user: AuthenticatedUser, query: AttendanceAuditLogQueryDto): Promise<AttendanceAuditLogView[]> {
    const { companyId, dateFrom, dateTo } = this.resolveReadableScope(user, query.companyId, query.dateFrom, query.dateTo);
    const qb = this.auditRepo
      .createQueryBuilder('audit')
      .leftJoinAndMapOne('audit.employee', Employee, 'employee', 'employee.id = audit.employee_id')
      .where('audit.created_at >= :dateFrom', { dateFrom: parseArgentinaDateStart(dateFrom) })
      .andWhere('audit.created_at <= :dateTo', { dateTo: parseArgentinaDateEnd(dateTo) });

    if (companyId) {
      qb.andWhere('audit.company_id = :companyId', { companyId });
    }
    if (query.employeeId) {
      qb.andWhere('audit.employee_id = :employeeId', { employeeId: query.employeeId });
    }
    if (query.action) {
      qb.andWhere('audit.action = :action', { action: query.action });
    }
    if (query.requestId) {
      qb.andWhere('audit.attendance_request_id = :requestId', { requestId: query.requestId });
    }

    qb.orderBy('audit.created_at', 'DESC');
    const logs = await qb.getMany();
    return logs.map((log) => this.toAuditView(log));
  }

  private async applyApprovedRequest(request: AttendanceRequest, userId: number): Promise<void> {
    switch (request.type) {
      case 'manual_punch':
        await this.applyManualPunch(request, userId);
        return;
      case 'punch_correction':
        await this.applyPunchCorrection(request, userId);
        return;
      case 'absence_justification':
        await this.markSummaryJustification(request, 'approved', userId, true, 'absence_justified');
        return;
      case 'late_justification':
        await this.markSummaryJustification(request, 'approved', userId, true, 'late_justified');
        return;
    }
  }

  private async applyManualPunch(request: AttendanceRequest, userId: number): Promise<void> {
    if (!request.punchTime) {
      throw new BadRequestException('La solicitud no tiene punchTime.');
    }

    const existing = await this.attendanceRepo.findOne({
      where: {
        companyId: request.companyId,
        userId: request.employeeId,
        timestamp: request.punchTime,
      },
    });
    if (existing) {
      throw new BadRequestException('Ya existe una fichada para ese empleado y horario.');
    }

    const record = await this.attendanceRepo.save(
      this.attendanceRepo.create({
        deviceSn: 'manual',
        userId: request.employeeId,
        deviceId: null,
        companyId: request.companyId,
        timestamp: request.punchTime,
        status: this.statusFromPunchType(request.punchType),
        verifyType: 0,
        workCode: null,
        source: 'manual',
      }),
    );

    await this.writeAudit({
      companyId: request.companyId,
      employeeId: request.employeeId,
      recordId: record.id,
      requestId: request.id,
      action: 'manual_punch_created',
      newValue: this.recordSnapshot(record),
      userId,
    });
    await this.calculations.calculateEmployeeDay(request.companyId, request.employeeId, request.date);
  }

  private async applyPunchCorrection(request: AttendanceRequest, userId: number): Promise<void> {
    if (!request.targetAttendanceRecordId || !request.newPunchTime) {
      throw new BadRequestException('La solicitud de corrección está incompleta.');
    }

    const record = await this.getTargetRecordOrFail(
      request.companyId,
      request.employeeId,
      request.targetAttendanceRecordId,
    );
    const oldSnapshot = this.recordSnapshot(record);
    const oldDate = getArgentinaDateKey(record.timestamp);

    record.timestamp = request.newPunchTime;
    record.source = 'correction';
    const saved = await this.attendanceRepo.save(record);
    const newDate = getArgentinaDateKey(saved.timestamp);

    await this.writeAudit({
      companyId: request.companyId,
      employeeId: request.employeeId,
      recordId: saved.id,
      requestId: request.id,
      action: 'punch_corrected',
      oldValue: oldSnapshot,
      newValue: this.recordSnapshot(saved),
      userId,
    });

    await this.calculations.calculateEmployeeDay(request.companyId, request.employeeId, oldDate);
    if (newDate !== oldDate) {
      await this.calculations.calculateEmployeeDay(request.companyId, request.employeeId, newDate);
    }
  }

  private async markSummaryJustification(
    request: AttendanceRequest,
    status: 'none' | 'pending' | 'approved' | 'rejected',
    userId: number,
    markJustified: boolean,
    action?: AttendanceAuditAction,
  ): Promise<void> {
    const summary = await this.summariesRepo.findOneBy({
      companyId: request.companyId,
      employeeId: request.employeeId,
      date: request.date,
    });

    if (!summary) {
      if (status === 'pending') return;
      throw new BadRequestException('No existe resumen diario para justificar. Recalculá el período primero.');
    }

    const oldValue = this.summarySnapshot(summary);
    summary.justificationStatus = status;
    summary.justificationRequestId = status === 'none' ? null : request.id;
    summary.notes = markJustified ? request.reason : summary.notes;
    if (markJustified) {
      summary.status = 'justified';
    }
    await this.summariesRepo.save(summary);

    if (action) {
      await this.writeAudit({
        companyId: request.companyId,
        employeeId: request.employeeId,
        requestId: request.id,
        action,
        oldValue,
        newValue: this.summarySnapshot(summary),
        userId,
      });
    }
  }

  private validateCreatePayload(dto: CreateAttendanceRequestDto): void {
    if (dto.type === 'manual_punch' && !dto.punchTime) {
      throw new BadRequestException('punchTime es requerido para fichada manual.');
    }
    if (dto.type === 'punch_correction') {
      if (!dto.targetAttendanceRecordId) {
        throw new BadRequestException('targetAttendanceRecordId es requerido para corrección.');
      }
      if (!dto.newPunchTime) {
        throw new BadRequestException('newPunchTime es requerido para corrección.');
      }
    }
  }

  private resolveReadableScope(
    user: AuthenticatedUser,
    requestedCompanyId?: string,
    requestedDateFrom?: string,
    requestedDateTo?: string,
  ): { companyId: string | null; dateFrom: string; dateTo: string } {
    const today = todayArgentinaDateKey();
    const dateFrom = requestedDateFrom || today;
    const dateTo = requestedDateTo || today;
    assertMaxRangeDays(dateFrom, dateTo, 62);

    if (user.isSuperAdmin) {
      return { companyId: requestedCompanyId || null, dateFrom, dateTo };
    }
    if (!user.companyId) {
      throw new ForbiddenException('El usuario no tiene una empresa activa asignada.');
    }
    if (requestedCompanyId && requestedCompanyId !== user.companyId) {
      throw new ForbiddenException('No podés consultar otra empresa.');
    }
    return { companyId: user.companyId, dateFrom, dateTo };
  }

  private resolveWritableCompanyId(user: AuthenticatedUser, requestedCompanyId?: string): string {
    if (user.isSuperAdmin) {
      if (!requestedCompanyId) {
        throw new BadRequestException('companyId es requerido como super_admin.');
      }
      return requestedCompanyId;
    }
    if (!user.companyId) {
      throw new ForbiddenException('El usuario no tiene una empresa activa asignada.');
    }
    if (requestedCompanyId && requestedCompanyId !== user.companyId) {
      throw new ForbiddenException('No podés modificar otra empresa.');
    }
    return user.companyId;
  }

  private assertCanCreate(user: AuthenticatedUser): void {
    if (user.isSuperAdmin) return;
    if (user.companyRole === CompanyRole.READ_ONLY) {
      throw new ForbiddenException('El rol solo lectura no puede crear solicitudes.');
    }
  }

  private assertCanReview(user: AuthenticatedUser): void {
    if (this.canReview(user)) return;
    throw new ForbiddenException('Se requieren permisos de administrador para revisar solicitudes.');
  }

  private canReview(user: AuthenticatedUser): boolean {
    return user.isSuperAdmin || user.companyRole === CompanyRole.COMPANY_ADMIN;
  }

  private async findWritableRequest(user: AuthenticatedUser, id: string): Promise<AttendanceRequest> {
    const request = await this.requestsRepo.findOneBy({ id });
    if (!request) throw new NotFoundException('Solicitud no encontrada.');
    if (user.isSuperAdmin) return request;
    if (!user.companyId || request.companyId !== user.companyId) {
      throw new ForbiddenException('No podés gestionar esta solicitud.');
    }
    return request;
  }

  private async findCancellableRequest(user: AuthenticatedUser, id: string): Promise<AttendanceRequest> {
    const request = await this.findWritableRequest(user, id);
    if (this.canReview(user) || request.requestedByUserId === user.id) {
      return request;
    }
    throw new ForbiddenException('Solo podés cancelar solicitudes propias pendientes.');
  }

  private async getEmployeeOrFail(companyId: string, employeeId: string): Promise<Employee> {
    const employee = await this.employeesRepo.findOneBy({ id: employeeId, companyId });
    if (!employee) {
      throw new BadRequestException('El empleado no pertenece a la empresa indicada.');
    }
    return employee;
  }

  private async resolveEmployeeCompanyId(employeeId: string): Promise<string> {
    const employee = await this.employeesRepo.findOneBy({ id: employeeId });
    if (!employee?.companyId) {
      throw new BadRequestException('El empleado no tiene empresa asignada.');
    }
    return employee.companyId;
  }

  private async getTargetRecordOrFail(
    companyId: string,
    employeeId: string,
    recordId?: number,
  ): Promise<AttendanceRecord> {
    if (!recordId) {
      throw new BadRequestException('targetAttendanceRecordId es requerido.');
    }
    const record = await this.attendanceRepo.findOneBy({ id: recordId });
    if (!record || record.companyId !== companyId || record.userId !== employeeId) {
      throw new BadRequestException('La fichada objetivo no pertenece al empleado y empresa indicados.');
    }
    return record;
  }

  private async findOneView(id: string): Promise<AttendanceRequestView> {
    const request = await this.requestsRepo
      .createQueryBuilder('request')
      .leftJoinAndMapOne('request.employee', Employee, 'employee', 'employee.id = request.employee_id')
      .where('request.id = :id', { id })
      .getOne();
    if (!request) throw new NotFoundException('Solicitud no encontrada.');
    return this.toRequestView(request);
  }

  private toRequestView(request: AttendanceRequest): AttendanceRequestView {
    const employee = (request as AttendanceRequest & { employee?: Employee | null }).employee;
    return {
      ...request,
      employee: employee ? { id: employee.id, nombre: employee.nombre, apellido: employee.apellido } : null,
    };
  }

  private toAuditView(log: AttendanceAuditLog): AttendanceAuditLogView {
    const employee = (log as AttendanceAuditLog & { employee?: Employee | null }).employee;
    return {
      ...log,
      employee: employee ? { id: employee.id, nombre: employee.nombre, apellido: employee.apellido } : null,
    };
  }

  private parseArgentinaDateTime(value: string): Date {
    let parsed: Date;
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) {
      parsed = new Date(`${value}:00.000-03:00`);
    } else if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(value)) {
      parsed = new Date(`${value}.000-03:00`);
    } else {
      parsed = new Date(value);
    }
    if (Number.isNaN(parsed.getTime())) {
      throw new BadRequestException('La fecha/hora no es válida.');
    }
    return parsed;
  }

  private statusFromPunchType(type: AttendancePunchType | null): number {
    if (type === 'out') return 1;
    return 0;
  }

  private isJustification(type: AttendanceRequestType): boolean {
    return type === 'absence_justification' || type === 'late_justification';
  }

  private requestSnapshot(request: AttendanceRequest): Record<string, unknown> {
    return {
      id: request.id,
      type: request.type,
      status: request.status,
      employeeId: request.employeeId,
      date: request.date,
      punchTime: request.punchTime,
      targetAttendanceRecordId: request.targetAttendanceRecordId,
      newPunchTime: request.newPunchTime,
      reason: request.reason,
      reviewNotes: request.reviewNotes,
    };
  }

  private recordSnapshot(record: AttendanceRecord): Record<string, unknown> {
    return {
      id: record.id,
      userId: record.userId,
      companyId: record.companyId,
      timestamp: record.timestamp,
      status: record.status,
      verifyType: record.verifyType,
      source: record.source,
    };
  }

  private summarySnapshot(summary: AttendanceDaySummary): Record<string, unknown> {
    return {
      id: summary.id,
      employeeId: summary.employeeId,
      date: summary.date,
      status: summary.status,
      justificationStatus: summary.justificationStatus,
      justificationRequestId: summary.justificationRequestId,
      notes: summary.notes,
      isAbsent: summary.isAbsent,
      lateMinutes: summary.lateMinutes,
    };
  }

  private writeAudit(opts: {
    companyId: string;
    employeeId?: string | null;
    recordId?: number | null;
    requestId?: string | null;
    action: AttendanceAuditAction;
    oldValue?: Record<string, unknown> | null;
    newValue?: Record<string, unknown> | null;
    userId: number;
  }): Promise<AttendanceAuditLog> {
    return this.auditRepo.save(
      this.auditRepo.create({
        companyId: opts.companyId,
        employeeId: opts.employeeId ?? null,
        attendanceRecordId: opts.recordId ?? null,
        attendanceRequestId: opts.requestId ?? null,
        action: opts.action,
        oldValue: opts.oldValue ?? null,
        newValue: opts.newValue ?? null,
        performedByUserId: opts.userId,
      }),
    );
  }
}
