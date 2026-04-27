import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AttendanceDaySummary } from '../../attendance/entities/attendance-day-summary.entity';
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
  reason?: string;
}

@Injectable()
export class Phase2ReportsService {
  constructor(
    @InjectRepository(AttendanceDaySummary)
    private readonly summariesRepo: Repository<AttendanceDaySummary>,
  ) {}

  lateArrivals(filters: ReportFiltersDto, user: AuthenticatedUser): Promise<Phase2ReportRow[]> {
    return this.getRows(filters, user, (qb) => {
      const minLate = Number.parseInt(filters.minLateMinutes || '1', 10);
      qb.andWhere('summary.late_minutes >= :minLate', { minLate: Number.isFinite(minLate) ? minLate : 1 });
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

    return summaries.map((summary) => {
      const employee = (summary as AttendanceDaySummary & { employee?: Employee | null }).employee ?? null;
      const schedule = employee?.scheduleProfile;
      return {
        employee: employee ? { id: employee.id, nombre: employee.nombre, apellido: employee.apellido } : null,
        employeeId: summary.employeeId,
        date: summary.date,
        firstPunchAt: summary.firstPunchAt,
        lastPunchAt: summary.lastPunchAt,
        expectedEntryTime: schedule?.entryTime ?? employee?.entryTime ?? null,
        expectedExitTime: schedule?.exitTime ?? employee?.exitTime ?? null,
        lateToleranceMinutes: schedule?.lateToleranceMinutes ?? 0,
        earlyDepartureToleranceMinutes: schedule?.earlyDepartureToleranceMinutes ?? 0,
        lateMinutes: summary.lateMinutes,
        earlyDepartureMinutes: summary.earlyDepartureMinutes,
        workedMinutes: summary.workedMinutes,
        expectedMinutes: summary.expectedMinutes,
        overtimeMinutes: summary.overtimeMinutes,
        status: summary.status,
        reason,
      };
    });
  }
}
