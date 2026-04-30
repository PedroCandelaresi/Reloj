import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, QueryFailedError, Repository } from 'typeorm';
import { promises as fs } from 'fs';
import * as path from 'path';
import { randomUUID } from 'crypto';
import { AttendanceRecord } from './attendance.entity';
import { AttendanceCalculationService } from './attendance-calculation.service';
import { AttendanceAuditLog, AttendanceAuditAction } from './entities/attendance-audit-log.entity';
import { AttendanceDaySummary } from './entities/attendance-day-summary.entity';
import { AttendanceJustificationType, AttendanceJustificationAppliesTo } from './entities/attendance-justification-type.entity';
import { AttendanceRequestAttachment } from './entities/attendance-request-attachment.entity';
import {
  AttendancePunchType,
  AttendanceRequest,
  AttendanceRequestType,
} from './entities/attendance-request.entity';
import {
  AttendanceAuditLogQueryDto,
  AttendanceJustificationTypesQueryDto,
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
  justificationType: Pick<AttendanceJustificationType, 'id' | 'code' | 'name' | 'requiresAttachment'> | null;
  attachmentCount: number;
}

export interface AttendanceAuditLogView extends AttendanceAuditLog {
  employee: Pick<Employee, 'id' | 'nombre' | 'apellido'> | null;
}

export type AttendanceRequestAttachmentView = Omit<AttendanceRequestAttachment, 'storagePath'>;

interface RecalculateTask {
  companyId: string;
  employeeId: string;
  date: string;
}

const MAX_ATTACHMENT_BYTES = 5 * 1024 * 1024;
const MAX_ATTACHMENTS_PER_REQUEST = 5;
const ALLOWED_ATTACHMENT_MIME_TYPES = new Set(['application/pdf', 'image/jpeg', 'image/png']);
const ALLOWED_ATTACHMENT_EXTENSIONS = new Set(['.pdf', '.jpg', '.jpeg', '.png']);

@Injectable()
export class AttendanceRequestsService {
  private readonly logger = new Logger(AttendanceRequestsService.name);

  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(AttendanceRequest)
    private readonly requestsRepo: Repository<AttendanceRequest>,
    @InjectRepository(AttendanceJustificationType)
    private readonly justificationTypesRepo: Repository<AttendanceJustificationType>,
    @InjectRepository(AttendanceRequestAttachment)
    private readonly attachmentsRepo: Repository<AttendanceRequestAttachment>,
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
      .leftJoinAndMapOne('request.justificationType', AttendanceJustificationType, 'justificationType', 'justificationType.id = request.justification_type_id')
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
    return this.toRequestViews(requests);
  }

  async create(user: AuthenticatedUser, dto: CreateAttendanceRequestDto): Promise<AttendanceRequestView> {
    this.assertCanCreate(user);
    const companyId = user.isSuperAdmin && !dto.companyId
      ? await this.resolveEmployeeCompanyId(dto.employeeId)
      : this.resolveWritableCompanyId(user, dto.companyId);
    const employee = await this.getEmployeeOrFail(companyId, dto.employeeId);
    this.validateCreatePayload(dto);
    await this.validateJustificationType(companyId, dto.type, dto.justificationTypeId);

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
      justificationTypeId: dto.justificationTypeId ?? null,
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

  async listJustificationTypes(
    user: AuthenticatedUser,
    query: AttendanceJustificationTypesQueryDto,
  ): Promise<AttendanceJustificationType[]> {
    const companyId = this.resolveReadableCompanyId(user, query.companyId);
    const qb = this.justificationTypesRepo
      .createQueryBuilder('type')
      .where('type.is_active = true')
      .andWhere('(type.company_id IS NULL OR type.company_id = :companyId)', { companyId });

    if (query.appliesTo) {
      qb.andWhere('(type.applies_to = :appliesTo OR type.applies_to = :general)', {
        appliesTo: query.appliesTo,
        general: 'general',
      });
    }

    return qb
      .orderBy('type.company_id', 'ASC', 'NULLS FIRST')
      .addOrderBy('type.name', 'ASC')
      .getMany();
  }

  async approve(user: AuthenticatedUser, id: string, dto: ReviewAttendanceRequestDto): Promise<AttendanceRequestView> {
    this.assertCanReview(user);
    const recalculateTasks = await this.dataSource.transaction(async (manager) => {
      const request = await this.findWritableRequest(user, id, manager);
      if (request.status !== 'pending') {
        throw new BadRequestException('La solicitud ya fue revisada.');
      }

      await this.assertRequiredAttachment(request, manager);
      const tasks = await this.applyApprovedRequest(request, user.id, manager);
      request.status = 'approved';
      request.reviewedByUserId = user.id;
      request.reviewNotes = dto.reviewNotes?.trim() || null;
      request.reviewedAt = new Date();
      await manager.getRepository(AttendanceRequest).save(request);
      await this.writeAudit({
        companyId: request.companyId,
        employeeId: request.employeeId,
        requestId: request.id,
        action: 'request_approved',
        newValue: this.requestSnapshot(request),
        userId: user.id,
      }, manager);
      return tasks;
    });

    await this.runRecalculations(recalculateTasks);
    return this.findOneView(id);
  }

  async reject(user: AuthenticatedUser, id: string, dto: ReviewAttendanceRequestDto): Promise<AttendanceRequestView> {
    this.assertCanReview(user);
    if (!dto.reviewNotes?.trim()) {
      throw new BadRequestException('reviewNotes es obligatorio al rechazar.');
    }
    await this.dataSource.transaction(async (manager) => {
      const request = await this.findWritableRequest(user, id, manager);
      if (request.status !== 'pending') {
        throw new BadRequestException('La solicitud ya fue revisada.');
      }

      request.status = 'rejected';
      request.reviewedByUserId = user.id;
      request.reviewNotes = dto.reviewNotes.trim();
      request.reviewedAt = new Date();
      await manager.getRepository(AttendanceRequest).save(request);

      if (this.isJustification(request.type)) {
        await this.markSummaryJustification(request, 'rejected', user.id, false, undefined, manager);
      }

      await this.writeAudit({
        companyId: request.companyId,
        employeeId: request.employeeId,
        requestId: request.id,
        action: 'request_rejected',
        newValue: this.requestSnapshot(request),
        userId: user.id,
      }, manager);
    });

    return this.findOneView(id);
  }

  async cancel(user: AuthenticatedUser, id: string): Promise<AttendanceRequestView> {
    await this.dataSource.transaction(async (manager) => {
      const request = await this.findCancellableRequest(user, id, manager);
      if (request.status !== 'pending') {
        throw new BadRequestException('Solo se pueden cancelar solicitudes pendientes.');
      }

      request.status = 'cancelled';
      request.reviewedByUserId = user.id;
      request.reviewedAt = new Date();
      await manager.getRepository(AttendanceRequest).save(request);

      if (this.isJustification(request.type)) {
        await this.markSummaryJustification(request, 'none', user.id, false, undefined, manager);
      }

      await this.writeAudit({
        companyId: request.companyId,
        employeeId: request.employeeId,
        requestId: request.id,
        action: 'request_cancelled',
        newValue: this.requestSnapshot(request),
        userId: user.id,
      }, manager);
    });

    return this.findOneView(id);
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

  async listAttachments(user: AuthenticatedUser, requestId: string): Promise<AttendanceRequestAttachmentView[]> {
    const request = await this.findReadableRequest(user, requestId);
    const attachments = await this.attachmentsRepo.find({
      where: { companyId: request.companyId, attendanceRequestId: request.id },
      order: { createdAt: 'ASC' },
    });
    return attachments.map((attachment) => this.toAttachmentView(attachment));
  }

  async uploadAttachment(
    user: AuthenticatedUser,
    requestId: string,
    file: { originalname: string; mimetype: string; size: number; buffer?: Buffer; path?: string } | undefined,
  ): Promise<AttendanceRequestAttachment> {
    if (!file) {
      throw new BadRequestException('No se recibió ningún archivo.');
    }
    const request = await this.findAttachableRequest(user, requestId);
    const fileBuffer = await this.getUploadBuffer(file);
    await this.validateAttachment(file, fileBuffer, request);

    const baseDir = this.attachmentsBaseDir();
    const relativeDir = path.join(request.companyId, request.id);
    const targetDir = this.safeResolve(baseDir, relativeDir);
    await fs.mkdir(targetDir, { recursive: true });

    const ext = path.extname(file.originalname).toLowerCase();
    const storedName = `${randomUUID()}${ext}`;
    const storagePath = this.safeResolve(targetDir, storedName);
    await fs.writeFile(storagePath, fileBuffer);

    try {
      return await this.attachmentsRepo.save(
        this.attachmentsRepo.create({
          companyId: request.companyId,
          attendanceRequestId: request.id,
          uploadedByUserId: user.id,
          originalName: path.basename(file.originalname),
          storedName,
          mimeType: file.mimetype,
          sizeBytes: file.size,
          storagePath,
        }),
      );
    } catch (error) {
      await fs.unlink(storagePath).catch((unlinkError) => {
        this.logger.warn(`No se pudo limpiar archivo de adjunto tras error de DB. attachmentName=${storedName} error=${this.errorMessage(unlinkError)}`);
      });
      throw error;
    }
  }

  async getAttachmentForDownload(
    user: AuthenticatedUser,
    requestId: string,
    attachmentId: string,
  ): Promise<AttendanceRequestAttachment> {
    const request = await this.findReadableRequest(user, requestId);
    const attachment = await this.attachmentsRepo.findOneBy({
      id: attachmentId,
      attendanceRequestId: request.id,
      companyId: request.companyId,
    });
    if (!attachment) {
      throw new NotFoundException('Adjunto no encontrado.');
    }
    this.safeResolve(this.attachmentsBaseDir(), path.relative(this.attachmentsBaseDir(), attachment.storagePath));
    return attachment;
  }

  async deleteAttachment(user: AuthenticatedUser, requestId: string, attachmentId: string): Promise<{ success: true }> {
    const request = await this.findAttachableRequest(user, requestId);
    const attachment = await this.attachmentsRepo.findOneBy({
      id: attachmentId,
      attendanceRequestId: request.id,
      companyId: request.companyId,
    });
    if (!attachment) {
      throw new NotFoundException('Adjunto no encontrado.');
    }
    try {
      await fs.unlink(attachment.storagePath);
    } catch (error) {
      if (this.isFileNotFoundError(error)) {
        this.logger.warn(`Archivo físico de adjunto no encontrado al eliminar. attachmentId=${attachment.id}`);
      } else {
        this.logger.warn(`No se pudo eliminar archivo físico de adjunto. attachmentId=${attachment.id} error=${this.errorMessage(error)}`);
        throw new InternalServerErrorException('No se pudo eliminar el archivo físico. Intentá nuevamente o contactá soporte.');
      }
    }
    await this.attachmentsRepo.delete({ id: attachment.id });
    return { success: true };
  }

  private async applyApprovedRequest(
    request: AttendanceRequest,
    userId: number,
    manager: EntityManager,
  ): Promise<RecalculateTask[]> {
    switch (request.type) {
      case 'manual_punch':
        return [await this.applyManualPunch(request, userId, manager)];
      case 'punch_correction':
        return this.applyPunchCorrection(request, userId, manager);
      case 'absence_justification':
        await this.markSummaryJustification(request, 'approved', userId, true, 'absence_justified', manager);
        return [];
      case 'late_justification':
        await this.markSummaryJustification(request, 'approved', userId, true, 'late_justified', manager);
        return [];
    }
    return [];
  }

  private async applyManualPunch(
    request: AttendanceRequest,
    userId: number,
    manager: EntityManager,
  ): Promise<RecalculateTask> {
    if (!request.punchTime) {
      throw new BadRequestException('La solicitud no tiene punchTime.');
    }

    const attendanceRepo = manager.getRepository(AttendanceRecord);
    const existing = await attendanceRepo.findOne({
      where: {
        companyId: request.companyId,
        userId: request.employeeId,
        timestamp: request.punchTime,
      },
    });
    if (existing) {
      throw new BadRequestException('Ya existe una fichada para ese empleado en ese horario.');
    }

    let record: AttendanceRecord;
    try {
      record = await attendanceRepo.save(attendanceRepo.create({
        deviceSn: 'manual',
        userId: request.employeeId,
        deviceId: null,
        companyId: request.companyId,
        timestamp: request.punchTime,
        status: this.statusFromPunchType(request.punchType),
        verifyType: 0,
        workCode: null,
        source: 'manual',
      }));
    } catch (error) {
      if (this.isUniqueConstraintError(error)) {
        throw new BadRequestException('Ya existe una fichada para ese empleado en ese horario.');
      }
      throw error;
    }

    await this.writeAudit({
      companyId: request.companyId,
      employeeId: request.employeeId,
      recordId: record.id,
      requestId: request.id,
      action: 'manual_punch_created',
      newValue: this.recordSnapshot(record),
      userId,
    }, manager);
    return { companyId: request.companyId, employeeId: request.employeeId, date: request.date };
  }

  private async applyPunchCorrection(
    request: AttendanceRequest,
    userId: number,
    manager: EntityManager,
  ): Promise<RecalculateTask[]> {
    if (!request.targetAttendanceRecordId || !request.newPunchTime) {
      throw new BadRequestException('La solicitud de corrección está incompleta.');
    }

    const record = await this.getTargetRecordOrFail(
      request.companyId,
      request.employeeId,
      request.targetAttendanceRecordId,
      manager,
    );
    await this.assertNoDuplicatePunchCorrection(request, manager);
    const oldSnapshot = this.recordSnapshot(record);
    const oldDate = getArgentinaDateKey(record.timestamp);

    record.timestamp = request.newPunchTime;
    record.source = 'correction';
    let saved: AttendanceRecord;
    try {
      saved = await manager.getRepository(AttendanceRecord).save(record);
    } catch (error) {
      if (this.isUniqueConstraintError(error)) {
        throw new BadRequestException('Ya existe una fichada para ese empleado en ese horario.');
      }
      throw error;
    }
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
    }, manager);

    const tasks: RecalculateTask[] = [{ companyId: request.companyId, employeeId: request.employeeId, date: oldDate }];
    if (newDate !== oldDate) {
      tasks.push({ companyId: request.companyId, employeeId: request.employeeId, date: newDate });
    }
    return tasks;
  }

  private async markSummaryJustification(
    request: AttendanceRequest,
    status: 'none' | 'pending' | 'approved' | 'rejected',
    userId: number,
    markJustified: boolean,
    action?: AttendanceAuditAction,
    manager?: EntityManager,
  ): Promise<void> {
    const summariesRepo = manager?.getRepository(AttendanceDaySummary) ?? this.summariesRepo;
    const summary = await summariesRepo.findOneBy({
      companyId: request.companyId,
      employeeId: request.employeeId,
      date: request.date,
    });

    if (!summary) {
      if (status !== 'approved') return;
      throw new BadRequestException('No existe resumen diario para justificar. Recalculá el período primero.');
    }

    const oldValue = this.summarySnapshot(summary);
    if (status === 'none') {
      if (summary.justificationRequestId === request.id) {
        summary.justificationStatus = 'none';
        summary.justificationRequestId = null;
        summary.notes = null;
      }
    } else {
      summary.justificationStatus = status;
      summary.justificationRequestId = request.id;
      if (markJustified) {
        summary.notes = request.reason;
      }
    }
    await summariesRepo.save(summary);

    if (action) {
      await this.writeAudit({
        companyId: request.companyId,
        employeeId: request.employeeId,
        requestId: request.id,
        action,
        oldValue,
        newValue: this.summarySnapshot(summary),
        userId,
      }, manager);
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

  private resolveReadableCompanyId(user: AuthenticatedUser, requestedCompanyId?: string): string | null {
    if (user.isSuperAdmin) {
      return requestedCompanyId || null;
    }
    if (!user.companyId) {
      throw new ForbiddenException('El usuario no tiene una empresa activa asignada.');
    }
    if (requestedCompanyId && requestedCompanyId !== user.companyId) {
      throw new ForbiddenException('No podés consultar otra empresa.');
    }
    return user.companyId;
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

  private async findWritableRequest(
    user: AuthenticatedUser,
    id: string,
    manager?: EntityManager,
  ): Promise<AttendanceRequest> {
    const repo = manager?.getRepository(AttendanceRequest) ?? this.requestsRepo;
    const request = await repo.findOneBy({ id });
    if (!request) throw new NotFoundException('Solicitud no encontrada.');
    if (user.isSuperAdmin) return request;
    if (!user.companyId || request.companyId !== user.companyId) {
      throw new ForbiddenException('No podés gestionar esta solicitud.');
    }
    return request;
  }

  private async findReadableRequest(user: AuthenticatedUser, id: string): Promise<AttendanceRequest> {
    const request = await this.requestsRepo.findOneBy({ id });
    if (!request) throw new NotFoundException('Solicitud no encontrada.');
    if (user.isSuperAdmin) return request;
    if (!user.companyId || request.companyId !== user.companyId) {
      throw new ForbiddenException('No tenés permisos para ver este adjunto.');
    }
    return request;
  }

  private async findAttachableRequest(user: AuthenticatedUser, id: string): Promise<AttendanceRequest> {
    const request = await this.findReadableRequest(user, id);
    if (request.status !== 'pending') {
      throw new BadRequestException('Solo se pueden adjuntar archivos a solicitudes pendientes.');
    }
    if (user.isSuperAdmin || user.companyRole === CompanyRole.COMPANY_ADMIN) {
      return request;
    }
    if (user.companyRole === CompanyRole.OPERATOR && request.requestedByUserId === user.id) {
      return request;
    }
    throw new ForbiddenException('No tenés permisos para adjuntar archivos a esta solicitud.');
  }

  private async findCancellableRequest(
    user: AuthenticatedUser,
    id: string,
    manager?: EntityManager,
  ): Promise<AttendanceRequest> {
    const request = await this.findWritableRequest(user, id, manager);
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

  private async validateJustificationType(
    companyId: string,
    requestType: AttendanceRequestType,
    justificationTypeId?: string,
  ): Promise<void> {
    if (!justificationTypeId) return;
    const type = await this.justificationTypesRepo.findOneBy({ id: justificationTypeId, isActive: true });
    if (!type || (type.companyId && type.companyId !== companyId)) {
      throw new BadRequestException('El tipo de justificación no está disponible para esta empresa.');
    }
    const appliesTo = this.appliesToFromRequestType(requestType);
    if (type.appliesTo !== appliesTo && type.appliesTo !== 'general') {
      throw new BadRequestException('El tipo de justificación no corresponde a esta solicitud.');
    }
  }

  private async assertRequiredAttachment(request: AttendanceRequest, manager: EntityManager): Promise<void> {
    if (!request.justificationTypeId) return;
    const type = await manager.getRepository(AttendanceJustificationType).findOneBy({
      id: request.justificationTypeId,
      isActive: true,
    });
    if (!type?.requiresAttachment) return;

    const attachmentCount = await manager.getRepository(AttendanceRequestAttachment).countBy({
      companyId: request.companyId,
      attendanceRequestId: request.id,
    });
    if (attachmentCount === 0) {
      throw new BadRequestException('Este tipo de justificación requiere al menos un adjunto.');
    }
  }

  private appliesToFromRequestType(type: AttendanceRequestType): AttendanceJustificationAppliesTo {
    switch (type) {
      case 'absence_justification':
        return 'absence';
      case 'late_justification':
        return 'late';
      case 'manual_punch':
        return 'manual_punch';
      case 'punch_correction':
        return 'punch_correction';
    }
  }

  private async getTargetRecordOrFail(
    companyId: string,
    employeeId: string,
    recordId?: number,
    manager?: EntityManager,
  ): Promise<AttendanceRecord> {
    if (!recordId) {
      throw new BadRequestException('targetAttendanceRecordId es requerido.');
    }
    const repo = manager?.getRepository(AttendanceRecord) ?? this.attendanceRepo;
    const record = await repo.findOneBy({ id: recordId });
    if (!record || record.companyId !== companyId || record.userId !== employeeId) {
      throw new BadRequestException('La fichada objetivo no pertenece al empleado y empresa indicados.');
    }
    return record;
  }

  private async assertNoDuplicatePunchCorrection(
    request: AttendanceRequest,
    manager: EntityManager,
  ): Promise<void> {
    if (!request.newPunchTime || !request.targetAttendanceRecordId) {
      return;
    }

    const duplicate = await manager
      .getRepository(AttendanceRecord)
      .createQueryBuilder('record')
      .where('record.company_id = :companyId', { companyId: request.companyId })
      .andWhere('record.user_id = :employeeId', { employeeId: request.employeeId })
      .andWhere('record.timestamp = :timestamp', { timestamp: request.newPunchTime })
      .andWhere('record.id <> :recordId', { recordId: request.targetAttendanceRecordId })
      .getOne();

    if (duplicate) {
      throw new BadRequestException('Ya existe una fichada para ese empleado en ese horario.');
    }
  }

  private async findOneView(id: string): Promise<AttendanceRequestView> {
    const request = await this.requestsRepo
      .createQueryBuilder('request')
      .leftJoinAndMapOne('request.employee', Employee, 'employee', 'employee.id = request.employee_id')
      .leftJoinAndMapOne('request.justificationType', AttendanceJustificationType, 'justificationType', 'justificationType.id = request.justification_type_id')
      .where('request.id = :id', { id })
      .getOne();
    if (!request) throw new NotFoundException('Solicitud no encontrada.');
    const [view] = await this.toRequestViews([request]);
    return view;
  }

  private toRequestView(request: AttendanceRequest): AttendanceRequestView {
    const employee = (request as AttendanceRequest & { employee?: Employee | null }).employee;
    const justificationType = (request as AttendanceRequest & { justificationType?: AttendanceJustificationType | null }).justificationType;
    const attachmentCount = (request as AttendanceRequest & { attachmentCount?: number }).attachmentCount ?? 0;
    return {
      ...request,
      employee: employee ? { id: employee.id, nombre: employee.nombre, apellido: employee.apellido } : null,
      justificationType: justificationType
        ? {
            id: justificationType.id,
            code: justificationType.code,
            name: justificationType.name,
            requiresAttachment: justificationType.requiresAttachment,
          }
        : null,
      attachmentCount,
    };
  }

  private async toRequestViews(requests: AttendanceRequest[]): Promise<AttendanceRequestView[]> {
    if (requests.length === 0) return [];
    const counts = await this.getAttachmentCountsForRequests(requests.map((request) => request.id));
    const countsByRequest = new Map(counts.map((row) => [String(row.requestId), Number(row.count)]));
    return requests.map((request) => {
      (request as AttendanceRequest & { attachmentCount?: number }).attachmentCount = countsByRequest.get(request.id) ?? 0;
      return this.toRequestView(request);
    });
  }

  private async getAttachmentCountsForRequests(requestIds: string[]): Promise<Array<{ requestId: string; count: string | number }>> {
    try {
      return await this.attachmentsRepo
        .createQueryBuilder('attachment')
        .select('attachment.attendance_request_id', 'requestId')
        .addSelect('COUNT(*)', 'count')
        .where('attachment.attendance_request_id IN (:...requestIds)', { requestIds })
        .groupBy('attachment.attendance_request_id')
        .getRawMany();
    } catch (error) {
      this.logger.warn(`No se pudo obtener el conteo de adjuntos para solicitudes. error=${this.errorMessage(error)}`);
      return [];
    }
  }

  private toAuditView(log: AttendanceAuditLog): AttendanceAuditLogView {
    const employee = (log as AttendanceAuditLog & { employee?: Employee | null }).employee;
    return {
      ...log,
      employee: employee ? { id: employee.id, nombre: employee.nombre, apellido: employee.apellido } : null,
    };
  }

  private toAttachmentView(attachment: AttendanceRequestAttachment): AttendanceRequestAttachmentView {
    return {
      id: attachment.id,
      companyId: attachment.companyId,
      attendanceRequestId: attachment.attendanceRequestId,
      uploadedByUserId: attachment.uploadedByUserId,
      originalName: attachment.originalName,
      storedName: attachment.storedName,
      mimeType: attachment.mimeType,
      sizeBytes: attachment.sizeBytes,
      createdAt: attachment.createdAt,
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
      justificationTypeId: request.justificationTypeId,
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
  }, manager?: EntityManager): Promise<AttendanceAuditLog> {
    const repo = manager?.getRepository(AttendanceAuditLog) ?? this.auditRepo;
    return repo.save(
      repo.create({
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

  private async runRecalculations(tasks: RecalculateTask[]): Promise<void> {
    for (const task of tasks) {
      await this.calculations.calculateEmployeeDay(task.companyId, task.employeeId, task.date);
    }
  }

  private isUniqueConstraintError(error: unknown): boolean {
    if (!(error instanceof QueryFailedError)) {
      return false;
    }
    const driverError = error.driverError as { code?: string } | undefined;
    return driverError?.code === '23505';
  }

  private async validateAttachment(
    file: { originalname: string; mimetype: string; size: number },
    buffer: Buffer,
    request: AttendanceRequest,
  ): Promise<void> {
    if (file.size > MAX_ATTACHMENT_BYTES) {
      throw new BadRequestException('El archivo supera el tamaño permitido.');
    }
    const ext = path.extname(file.originalname).toLowerCase();
    if (!ALLOWED_ATTACHMENT_EXTENSIONS.has(ext) || !ALLOWED_ATTACHMENT_MIME_TYPES.has(file.mimetype)) {
      throw new BadRequestException('Formato no permitido. Usá PDF, JPG o PNG.');
    }
    if (!this.hasAllowedMagicBytes(buffer)) {
      throw new BadRequestException('El contenido del archivo no coincide con un PDF, JPG o PNG válido.');
    }
    const count = await this.attachmentsRepo.countBy({
      companyId: request.companyId,
      attendanceRequestId: request.id,
    });
    if (count >= MAX_ATTACHMENTS_PER_REQUEST) {
      throw new BadRequestException('La solicitud ya tiene el máximo de adjuntos permitido.');
    }
  }

  private attachmentsBaseDir(): string {
    return path.resolve(process.env.ATTENDANCE_ATTACHMENTS_DIR || '/home/reloj/attachments');
  }

  private async getUploadBuffer(file: { buffer?: Buffer; path?: string }): Promise<Buffer> {
    if (file.buffer) return file.buffer;
    if (file.path) return fs.readFile(file.path);
    throw new BadRequestException('No se pudo leer el archivo adjunto.');
  }

  private hasAllowedMagicBytes(buffer: Buffer): boolean {
    if (buffer.length >= 4 && buffer.subarray(0, 4).equals(Buffer.from('%PDF'))) {
      return true;
    }
    if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
      return true;
    }
    const pngSignature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    return buffer.length >= pngSignature.length && buffer.subarray(0, pngSignature.length).equals(pngSignature);
  }

  private isFileNotFoundError(error: unknown): boolean {
    return typeof error === 'object' && error !== null && (error as { code?: string }).code === 'ENOENT';
  }

  private errorMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
  }

  private safeResolve(baseDir: string, relativePath: string): string {
    const resolvedBase = path.resolve(baseDir);
    const resolvedPath = path.resolve(resolvedBase, relativePath);
    if (resolvedPath !== resolvedBase && !resolvedPath.startsWith(`${resolvedBase}${path.sep}`)) {
      throw new ForbiddenException('No tenés permisos para ver este adjunto.');
    }
    return resolvedPath;
  }
}
