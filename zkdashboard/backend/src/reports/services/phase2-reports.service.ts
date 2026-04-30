import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AttendanceDaySummary } from '../../attendance/entities/attendance-day-summary.entity';
import { AttendanceRequest } from '../../attendance/entities/attendance-request.entity';
import { AttendanceJustificationType } from '../../attendance/entities/attendance-justification-type.entity';
import { AttendanceRequestAttachment } from '../../attendance/entities/attendance-request-attachment.entity';
import { Employee } from '../../employees/employee.entity';
import { AuthenticatedUser } from '../../auth/authenticated-user.interface';
import { ReportFiltersDto } from '../dto/report-filters.dto';
import { assertMaxRangeDays, normalizeArgentinaDate } from '../utils/argentina-date.util';
import { resolveReportCompanyId } from './report-scope.util';

export interface Phase2ReportRow {
  employee: { id: string; nombre: string; apellido: string } | null;
  employeeId: string;
  date: string;
  firstPunchAt: Date | null;
  lastPunchAt: Date | null;
  expectedEntryTime: string | null;
  expectedExitTime: string | null;
  lateToleranceMinutes: number;
  earlyDepartureToleranceMinutes: number;
  lateMinutes: number;
  earlyDepartureMinutes: number;
  workedMinutes: number;
  expectedMinutes: number;
  overtimeMinutes: number;
  status: string;
  justificationStatus: 'none' | 'pending' | 'approved' | 'rejected';
  justificationTypeName: string | null;
  attachmentCount: number;
  reason?: string;
}

@Injectable()
export class Phase2ReportsService {
  constructor(
    @InjectRepository(AttendanceDaySummary)
    private readonly summariesRepo: Repository<AttendanceDaySummary>,
    @InjectRepository(AttendanceRequest)
    private readonly requestsRepo: Repository<AttendanceRequest>,
    @InjectRepository(AttendanceRequestAttachment)
    private readonly attachmentsRepo: Repository<AttendanceRequestAttachment>,
  ) {}

  lateArrivals(filters: ReportFiltersDto, user: AuthenticatedUser): Promise<Phase2ReportRow[]> {
    return this.getRows(filters, user, (qb) => {
      const minLate = Number.parseInt(filters.minLateMinutes || '1', 10);
      qb.andWhere('summary.late_minutes >= :minLate', { minLate: Number.isFinite(minLate) ? minLate : 1 });
      this.applyJustificationFilter(qb, filters.justification);
    });
  }

  earlyDepartures(filters: ReportFiltersDto, user: AuthenticatedUser): Promise<Phase2ReportRow[]> {
    return this.getRows(filters, user, (qb) => {
      qb.andWhere('summary.early_departure_minutes > 0');
    });
  }

  absences(filters: ReportFiltersDto, user: AuthenticatedUser): Promise<Phase2ReportRow[]> {
    return this.getRows(filters, user, (qb) => {
      qb.andWhere('summary.is_absent = true');
      this.applyJustificationFilter(qb, filters.justification);
    }, 'no_records_workday');
  }

  workedHours(filters: ReportFiltersDto, user: AuthenticatedUser): Promise<Phase2ReportRow[]> {
    return this.getRows(filters, user, (qb) => {
      qb.andWhere('summary.has_records = true');
    });
  }

  private async getRows(
    filters: ReportFiltersDto,
    user: AuthenticatedUser,
    apply: (qb: ReturnType<Repository<AttendanceDaySummary>['createQueryBuilder']>) => void,
    reason?: string,
  ): Promise<Phase2ReportRow[]> {
    const companyId = resolveReportCompanyId(user, filters.companyId);
    const dateFrom = normalizeArgentinaDate(filters.dateFrom);
    const dateTo = normalizeArgentinaDate(filters.dateTo ?? dateFrom);
    assertMaxRangeDays(dateFrom, dateTo, 62);
    const qb = this.summariesRepo
      .createQueryBuilder('summary')
      .leftJoinAndMapOne('summary.employee', Employee, 'employee', 'employee.id = summary.employee_id')
      .leftJoinAndSelect('employee.scheduleProfile', 'scheduleProfile')
      .where('summary.date >= :dateFrom', { dateFrom })
      .andWhere('summary.date <= :dateTo', { dateTo });

    if (companyId) qb.andWhere('summary.company_id = :companyId', { companyId });
    if (filters.employeeId || filters.userId) {
      qb.andWhere('summary.employee_id = :employeeId', { employeeId: filters.employeeId || filters.userId });
    }

    apply(qb);
    const summaries = await qb
      .orderBy('summary.date', 'ASC')
      .addOrderBy('employee.apellido', 'ASC', 'NULLS LAST')
      .addOrderBy('summary.employee_id', 'ASC')
      .getMany();

    const requestMeta = await this.getRequestMeta(summaries.map((summary) => summary.justificationRequestId).filter(Boolean) as string[]);

    return summaries.map((summary) => {
      const employee = (summary as AttendanceDaySummary & { employee?: Employee | null }).employee ?? null;
      const schedule = employee?.scheduleProfile;
      const meta = summary.justificationRequestId ? requestMeta.get(summary.justificationRequestId) : undefined;
      return {
        employee: employee ? { id: employee.id, nombre: employee.nombre, apellido: employee.apellido } : null,
        employeeId: summary.employeeId,
        date: summary.date,
        firstPunchAt: summary.firstPunchAt,
        lastPunchAt: summary.lastPunchAt,
        expectedEntryTime: schedule?.entryTime ?? null,
        expectedExitTime: schedule?.exitTime ?? null,
        lateToleranceMinutes: schedule?.lateToleranceMinutes ?? 0,
        earlyDepartureToleranceMinutes: schedule?.earlyDepartureToleranceMinutes ?? 0,
        lateMinutes: summary.lateMinutes,
        earlyDepartureMinutes: summary.earlyDepartureMinutes,
        workedMinutes: summary.workedMinutes,
        expectedMinutes: summary.expectedMinutes,
        overtimeMinutes: summary.overtimeMinutes,
        status: summary.status,
        justificationStatus: summary.justificationStatus ?? 'none',
        justificationTypeName: meta?.justificationTypeName ?? null,
        attachmentCount: meta?.attachmentCount ?? 0,
        reason,
      };
    });
  }

  private async getRequestMeta(requestIds: string[]): Promise<Map<string, { justificationTypeName: string | null; attachmentCount: number }>> {
    if (requestIds.length === 0) return new Map();
    const requests = await this.requestsRepo
      .createQueryBuilder('request')
      .leftJoin(AttendanceJustificationType, 'type', 'type.id = request.justification_type_id')
      .select('request.id', 'id')
      .addSelect('type.name', 'justificationTypeName')
      .where('request.id IN (:...requestIds)', { requestIds })
      .getRawMany();
    const counts = await this.attachmentsRepo
      .createQueryBuilder('attachment')
      .select('attachment.attendance_request_id', 'requestId')
      .addSelect('COUNT(*)', 'count')
      .where('attachment.attendance_request_id IN (:...requestIds)', { requestIds })
      .groupBy('attachment.attendance_request_id')
      .getRawMany();
    const countByRequest = new Map(counts.map((row) => [String(row.requestId), Number(row.count)]));
    return new Map(
      requests.map((row) => [
        String(row.id),
        {
          justificationTypeName: row.justificationTypeName ?? null,
          attachmentCount: countByRequest.get(String(row.id)) ?? 0,
        },
      ]),
    );
  }

  private applyJustificationFilter(
    qb: ReturnType<Repository<AttendanceDaySummary>['createQueryBuilder']>,
    justification?: ReportFiltersDto['justification'],
  ): void {
    switch (justification) {
      case 'justified':
        qb.andWhere('summary.justification_status = :justificationStatus', { justificationStatus: 'approved' });
        break;
      case 'pending':
        qb.andWhere('summary.justification_status = :justificationStatus', { justificationStatus: 'pending' });
        break;
      case 'unjustified':
        qb.andWhere('(summary.justification_status IS NULL OR summary.justification_status IN (:...unjustifiedStatuses))', {
          unjustifiedStatuses: ['none', 'rejected'],
        });
        break;
      default:
        break;
    }
  }
}
