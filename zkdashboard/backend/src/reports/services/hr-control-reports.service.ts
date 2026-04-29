import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AttendanceRecord } from '../../attendance/attendance.entity';
import { AttendanceAuditLog } from '../../attendance/entities/attendance-audit-log.entity';
import { AttendanceJustificationType } from '../../attendance/entities/attendance-justification-type.entity';
import { AttendanceRequestAttachment } from '../../attendance/entities/attendance-request-attachment.entity';
import { AttendanceRequest } from '../../attendance/entities/attendance-request.entity';
import { AuthenticatedUser } from '../../auth/authenticated-user.interface';
import { Employee } from '../../employees/employee.entity';
import { AdminUser } from '../../users/admin-user.entity';
import { ReportFiltersDto } from '../dto/report-filters.dto';
import {
  assertMaxRangeDays,
  getArgentinaDateKey,
  normalizeArgentinaDate,
  parseArgentinaDateEnd,
  parseArgentinaDateStart,
} from '../utils/argentina-date.util';
import { resolveReportCompanyId } from './report-scope.util';

type ReportEmployee = { id: string; nombre: string; apellido: string } | null;

export interface ManualPunchReportRow {
  employee: ReportEmployee;
  employeeId: string;
  punchTime: Date;
  punchType: string | null;
  reason: string | null;
  createdBy: string | null;
  createdAt: Date;
  source: 'manual';
  requestId: string | null;
  requestStatus: string | null;
  justificationTypeName: string | null;
  attachmentCount: number;
}

export interface CorrectedPunchReportRow {
  employee: ReportEmployee;
  employeeId: string | null;
  originalDate: string | null;
  correctedDate: string | null;
  oldValue: string | null;
  newValue: string | null;
  reason: string | null;
  correctedBy: string | null;
  correctedAt: Date;
  requestId: string | null;
  requestStatus: string | null;
  justificationTypeName: string | null;
  attachmentCount: number;
}

export interface EmployeeWithoutScheduleReportRow {
  employee: ReportEmployee;
  employeeId: string;
  document: string;
  status: 'Activo';
  reason: 'No tiene perfil de horario asignado';
}

export interface EmployeeWithoutPunchesReportRow {
  employee: ReportEmployee;
  employeeId: string;
  document: string;
  dateFrom: string;
  dateTo: string;
  punchCount: 0;
}

@Injectable()
export class HrControlReportsService {
  constructor(
    @InjectRepository(AttendanceRecord)
    private readonly recordsRepo: Repository<AttendanceRecord>,
    @InjectRepository(AttendanceAuditLog)
    private readonly auditRepo: Repository<AttendanceAuditLog>,
    @InjectRepository(AttendanceRequestAttachment)
    private readonly attachmentsRepo: Repository<AttendanceRequestAttachment>,
    @InjectRepository(Employee)
    private readonly employeesRepo: Repository<Employee>,
  ) {}

  async manualPunches(filters: ReportFiltersDto, user: AuthenticatedUser): Promise<ManualPunchReportRow[]> {
    const { companyId, dateFrom, dateTo } = this.resolveRange(filters, user, true);
    const qb = this.recordsRepo
      .createQueryBuilder('record')
      .leftJoin(Employee, 'employee', 'employee.id = record.user_id')
      .leftJoin(
        AttendanceAuditLog,
        'audit',
        'audit.attendance_record_id = record.id AND audit.action = :auditAction',
        { auditAction: 'manual_punch_created' },
      )
      .leftJoin(AttendanceRequest, 'request', 'request.id = audit.attendance_request_id')
      .leftJoin(AttendanceJustificationType, 'type', 'type.id = request.justification_type_id')
      .leftJoin(AdminUser, 'performedUser', 'performedUser.id = audit.performed_by_user_id')
      .leftJoin(AdminUser, 'requestedUser', 'requestedUser.id = request.requested_by_user_id')
      .select([
        'record.user_id AS "employeeId"',
        'record.timestamp AS "punchTime"',
        'record.created_at AS "createdAt"',
        'record.source AS "source"',
        'record.device_punch_state_label AS "recordPunchType"',
        'employee.id AS "employee_id"',
        'employee.nombre AS "employee_nombre"',
        'employee.apellido AS "employee_apellido"',
        'request.id AS "requestId"',
        'request.status AS "requestStatus"',
        'request.punch_type AS "requestPunchType"',
        'request.reason AS "reason"',
        'type.name AS "justificationTypeName"',
        'performedUser.username AS "performedUsername"',
        'performedUser.nombre AS "performedNombre"',
        'performedUser.apellido AS "performedApellido"',
        'requestedUser.username AS "requestedUsername"',
        'requestedUser.nombre AS "requestedNombre"',
        'requestedUser.apellido AS "requestedApellido"',
      ])
      .where('record.source = :source', { source: 'manual' })
      .andWhere('record.timestamp BETWEEN :dateFrom AND :dateTo', {
        dateFrom: parseArgentinaDateStart(dateFrom),
        dateTo: parseArgentinaDateEnd(dateTo),
      });

    if (companyId) qb.andWhere('record.company_id = :companyId', { companyId });
    if (filters.employeeId || filters.userId) {
      qb.andWhere('record.user_id = :employeeId', { employeeId: filters.employeeId || filters.userId });
    }

    const rows = await qb.orderBy('record.timestamp', 'ASC').addOrderBy('employee.apellido', 'ASC').getRawMany();

    const counts = await this.getAttachmentCounts(rows.map((row) => row.requestId).filter(Boolean));
    return rows.map((row) => ({
      employee: this.employeeFromRaw(row),
      employeeId: row.employeeId,
      punchTime: row.punchTime,
      punchType: row.requestPunchType ?? row.recordPunchType ?? null,
      reason: row.reason ?? null,
      createdBy:
        this.userName(row.performedNombre, row.performedApellido, row.performedUsername) ??
        this.userName(row.requestedNombre, row.requestedApellido, row.requestedUsername),
      createdAt: row.createdAt,
      source: 'manual',
      requestId: row.requestId ?? null,
      requestStatus: row.requestStatus ?? null,
      justificationTypeName: row.justificationTypeName ?? null,
      attachmentCount: row.requestId ? counts.get(String(row.requestId)) ?? 0 : 0,
    }));
  }

  async correctedPunches(filters: ReportFiltersDto, user: AuthenticatedUser): Promise<CorrectedPunchReportRow[]> {
    const { companyId, dateFrom, dateTo } = this.resolveRange(filters, user, true);
    const qb = this.auditRepo
      .createQueryBuilder('audit')
      .leftJoin(Employee, 'employee', 'employee.id = audit.employee_id')
      .leftJoin(AttendanceRequest, 'request', 'request.id = audit.attendance_request_id')
      .leftJoin(AttendanceJustificationType, 'type', 'type.id = request.justification_type_id')
      .leftJoin(AdminUser, 'performedUser', 'performedUser.id = audit.performed_by_user_id')
      .select([
        'audit.employee_id AS "employeeId"',
        'audit.old_value AS "oldValue"',
        'audit.new_value AS "newValue"',
        'audit.created_at AS "correctedAt"',
        'employee.id AS "employee_id"',
        'employee.nombre AS "employee_nombre"',
        'employee.apellido AS "employee_apellido"',
        'request.id AS "requestId"',
        'request.status AS "requestStatus"',
        'request.reason AS "reason"',
        'type.name AS "justificationTypeName"',
        'request.old_punch_time AS "requestOldPunchTime"',
        'request.new_punch_time AS "requestNewPunchTime"',
        'performedUser.username AS "performedUsername"',
        'performedUser.nombre AS "performedNombre"',
        'performedUser.apellido AS "performedApellido"',
      ])
      .where('audit.action = :action', { action: 'punch_corrected' })
      .andWhere('audit.created_at BETWEEN :dateFrom AND :dateTo', {
        dateFrom: parseArgentinaDateStart(dateFrom),
        dateTo: parseArgentinaDateEnd(dateTo),
      });

    if (companyId) qb.andWhere('audit.company_id = :companyId', { companyId });
    if (filters.employeeId || filters.userId) {
      qb.andWhere('audit.employee_id = :employeeId', { employeeId: filters.employeeId || filters.userId });
    }

    const rows = await qb.orderBy('audit.created_at', 'ASC').addOrderBy('employee.apellido', 'ASC').getRawMany();

    const counts = await this.getAttachmentCounts(rows.map((row) => row.requestId).filter(Boolean));
    return rows.map((row) => {
      const oldValue = this.valueFromJson(row.oldValue, 'timestamp') ?? row.requestOldPunchTime ?? null;
      const newValue = this.valueFromJson(row.newValue, 'timestamp') ?? row.requestNewPunchTime ?? null;
      return {
        employee: this.employeeFromRaw(row),
        employeeId: row.employeeId ?? null,
        originalDate: this.dateKeyFromValue(oldValue),
        correctedDate: this.dateKeyFromValue(newValue),
        oldValue: this.formatValue(oldValue),
        newValue: this.formatValue(newValue),
        reason: row.reason ?? null,
        correctedBy: this.userName(row.performedNombre, row.performedApellido, row.performedUsername),
        correctedAt: row.correctedAt,
        requestId: row.requestId ?? null,
        requestStatus: row.requestStatus ?? null,
        justificationTypeName: row.justificationTypeName ?? null,
        attachmentCount: row.requestId ? counts.get(String(row.requestId)) ?? 0 : 0,
      };
    });
  }

  async employeesWithoutSchedule(
    filters: ReportFiltersDto,
    user: AuthenticatedUser,
  ): Promise<EmployeeWithoutScheduleReportRow[]> {
    const companyId = this.resolveCompany(filters, user, true);
    const qb = this.employeesRepo
      .createQueryBuilder('employee')
      .where('employee.schedule_profile_id IS NULL');

    if (companyId) qb.andWhere('employee.company_id = :companyId', { companyId });
    if (filters.employeeId || filters.userId) {
      qb.andWhere('employee.id = :employeeId', { employeeId: filters.employeeId || filters.userId });
    }

    const employees = await qb.orderBy('employee.apellido', 'ASC').addOrderBy('employee.nombre', 'ASC').getMany();
    return employees.map((employee) => ({
      employee: { id: employee.id, nombre: employee.nombre, apellido: employee.apellido },
      employeeId: employee.id,
      document: employee.id,
      status: 'Activo',
      reason: 'No tiene perfil de horario asignado',
    }));
  }

  async employeesWithoutPunches(
    filters: ReportFiltersDto,
    user: AuthenticatedUser,
  ): Promise<EmployeeWithoutPunchesReportRow[]> {
    const { companyId, dateFrom, dateTo } = this.resolveRange(filters, user, true);
    const qb = this.employeesRepo
      .createQueryBuilder('employee')
      .leftJoin(
        AttendanceRecord,
        'record',
        [
          'record.user_id = employee.id',
          'record.timestamp BETWEEN :dateFromStart AND :dateToEnd',
          companyId ? 'record.company_id = :companyId' : '1=1',
        ].join(' AND '),
        {
          dateFromStart: parseArgentinaDateStart(dateFrom),
          dateToEnd: parseArgentinaDateEnd(dateTo),
          companyId,
        },
      )
      .where('employee.company_id = :companyId', { companyId })
      .andWhere('record.id IS NULL');

    if (filters.employeeId || filters.userId) {
      qb.andWhere('employee.id = :employeeId', { employeeId: filters.employeeId || filters.userId });
    }

    const employees = await qb.orderBy('employee.apellido', 'ASC').addOrderBy('employee.nombre', 'ASC').getMany();
    return employees.map((employee) => ({
      employee: { id: employee.id, nombre: employee.nombre, apellido: employee.apellido },
      employeeId: employee.id,
      document: employee.id,
      dateFrom,
      dateTo,
      punchCount: 0,
    }));
  }

  private resolveRange(filters: ReportFiltersDto, user: AuthenticatedUser, requireCompanyForSuperAdmin: boolean) {
    const companyId = this.resolveCompany(filters, user, requireCompanyForSuperAdmin);
    const dateFrom = normalizeArgentinaDate(filters.dateFrom);
    const dateTo = normalizeArgentinaDate(filters.dateTo ?? dateFrom);
    assertMaxRangeDays(dateFrom, dateTo, 366);
    return { companyId, dateFrom, dateTo };
  }

  private resolveCompany(filters: ReportFiltersDto, user: AuthenticatedUser, requireCompanyForSuperAdmin: boolean): string | null {
    if (user.isSuperAdmin && requireCompanyForSuperAdmin && !filters.companyId) {
      throw new BadRequestException('Para consultar este reporte como super admin, seleccioná una empresa.');
    }
    return resolveReportCompanyId(user, filters.companyId);
  }

  private employeeFromRaw(row: Record<string, unknown>): ReportEmployee {
    if (!row.employee_id) return null;
    return {
      id: String(row.employee_id),
      nombre: String(row.employee_nombre ?? ''),
      apellido: String(row.employee_apellido ?? ''),
    };
  }

  private userName(nombre?: unknown, apellido?: unknown, username?: unknown): string | null {
    const fullName = [apellido, nombre].filter(Boolean).join(', ');
    return fullName || (username ? String(username) : null);
  }

  private async getAttachmentCounts(requestIds: unknown[]): Promise<Map<string, number>> {
    const ids = requestIds.map(String).filter(Boolean);
    if (ids.length === 0) return new Map();
    const counts = await this.attachmentsRepo
      .createQueryBuilder('attachment')
      .select('attachment.attendance_request_id', 'requestId')
      .addSelect('COUNT(*)', 'count')
      .where('attachment.attendance_request_id IN (:...requestIds)', { requestIds: ids })
      .groupBy('attachment.attendance_request_id')
      .getRawMany();
    return new Map(counts.map((row) => [String(row.requestId), Number(row.count)]));
  }

  private valueFromJson(value: unknown, key: string): unknown {
    if (!value || typeof value !== 'object') return null;
    return (value as Record<string, unknown>)[key] ?? null;
  }

  private dateKeyFromValue(value: unknown): string | null {
    if (!value) return null;
    const date = new Date(String(value));
    return Number.isNaN(date.getTime()) ? null : getArgentinaDateKey(date);
  }

  private formatValue(value: unknown): string | null {
    if (value === null || value === undefined) return null;
    return String(value);
  }
}
