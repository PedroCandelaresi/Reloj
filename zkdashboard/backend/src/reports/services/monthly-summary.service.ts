import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, In, Repository } from 'typeorm';
import { AuthenticatedUser } from '../../auth/authenticated-user.interface';
import { AttendanceDaySummary } from '../../attendance/entities/attendance-day-summary.entity';
import { Employee } from '../../employees/employee.entity';
import { MonthlySummaryDto } from '../dto/monthly-summary.dto';
import {
  MonthlySummaryDay,
  MonthlySummaryReport,
  MonthlySummaryRow,
  toReportEmployee,
} from '../types/report.types';
import { eachDate, monthDateRange } from './report-date.util';
import { PairingService } from './pairing.service';
import { ReportQueryService } from './report-query.service';
import { resolveReportCompanyId } from './report-scope.util';

@Injectable()
export class MonthlySummaryService {
  constructor(
    private readonly pairing: PairingService,
    private readonly queries: ReportQueryService,
    @InjectRepository(AttendanceDaySummary)
    private readonly summariesRepo: Repository<AttendanceDaySummary>,
  ) {}

  async getReport(filters: MonthlySummaryDto, user: AuthenticatedUser): Promise<MonthlySummaryReport> {
    const year = Number.parseInt(filters.year, 10);
    const month = Number.parseInt(filters.month, 10);

    if (!Number.isFinite(year) || year < 2000 || year > 2100 || !Number.isFinite(month) || month < 1 || month > 12) {
      throw new BadRequestException('El año y mes del reporte no son válidos.');
    }

    if (user.isSuperAdmin && !filters.companyId) {
      throw new BadRequestException('Para consultar el resumen mensual como super admin, seleccioná una empresa.');
    }

    const companyId = resolveReportCompanyId(user, filters.companyId);
    const employeeId = filters.employeeId || filters.userId;
    const { dateFrom, dateTo } = monthDateRange(year, month);
    const employees = await this.queries.getEmployees(companyId, employeeId);
    const dates = eachDate(dateFrom, dateTo);
    const summaries = await this.getSummaries(companyId, employees.map((employee) => employee.id), dateFrom, dateTo);

    if (summaries.length > 0) {
      return this.buildFromSummaries(employees, summaries, dates, year, month);
    }

    const recordGroups = await this.queries.getRecordGroups({
      companyId,
      dateFrom,
      dateTo,
      filters,
    });

    const rows = employees.map((employee) => {
      const userGroups = recordGroups.get(employee.id);
      const days: MonthlySummaryDay[] = dates.map((date, index) => {
        const records = userGroups?.get(date) ?? [];
        const summary = this.pairing.summarize(records);
        return {
          day: index + 1,
          date,
          firstPunch: summary.firstPunch,
          lastPunch: summary.lastPunch,
          firstPunchAt: summary.firstPunch,
          lastPunchAt: summary.lastPunch,
          punchCount: summary.punchCount,
          workedMinutes: summary.workedMinutes,
          expectedMinutes: 0,
          lateMinutes: 0,
          earlyDepartureMinutes: 0,
          overtimeMinutes: 0,
          isAbsent: false,
          isHoliday: false,
          isWeekend: false,
          hasIncompleteRecord: summary.isIncomplete,
          status:
            summary.punchCount === 0
              ? 'no_records'
              : summary.isIncomplete
                ? 'incomplete'
                : 'present',
        };
      });
      const totalWorkedMinutes = days.reduce((total, day) => total + day.workedMinutes, 0);

      return {
        employee: toReportEmployee(employee),
        userId: employee.id,
        year,
        month,
        daysWithRecords: days.filter((day) => day.punchCount > 0).length,
        presentDays: days.filter((day) => day.status === 'present').length,
        absentDays: 0,
        holidayDays: 0,
        weekendDays: 0,
        totalPunches: days.reduce((total, day) => total + day.punchCount, 0),
        totalWorkedMinutes,
        totalWorkedHours: Math.round((totalWorkedMinutes / 60) * 100) / 100,
        totalLateMinutes: 0,
        totalEarlyDepartureMinutes: 0,
        totalOvertimeMinutes: 0,
        incompleteDays: days.filter((day) => day.status === 'incomplete').length,
        days,
      };
    });

    return {
      source: 'raw_records',
      coverage: {
        expectedSummaryDays: employees.length * dates.length,
        calculatedSummaryDays: 0,
        missingSummaryDays: employees.length * dates.length,
        isPartial: false,
      },
      rows,
    };
  }

  private async getSummaries(
    companyId: string | null,
    employeeIds: string[],
    dateFrom: string,
    dateTo: string,
  ): Promise<AttendanceDaySummary[]> {
    if (employeeIds.length === 0) return [];

    const where = {
      employeeId: In(employeeIds),
      date: Between(dateFrom, dateTo),
      ...(companyId ? { companyId } : {}),
    };

    return this.summariesRepo.find({
      where,
      order: { employeeId: 'ASC', date: 'ASC' },
    });
  }

  private buildFromSummaries(
    employees: Employee[],
    summaries: AttendanceDaySummary[],
    dates: string[],
    year: number,
    month: number,
  ): MonthlySummaryReport {
    const summariesByEmployee = new Map<string, Map<string, AttendanceDaySummary>>();
    for (const summary of summaries) {
      const employeeSummaries = summariesByEmployee.get(summary.employeeId) ?? new Map<string, AttendanceDaySummary>();
      employeeSummaries.set(summary.date, summary);
      summariesByEmployee.set(summary.employeeId, employeeSummaries);
    }

    const rows: MonthlySummaryRow[] = employees.map((employee) => {
      const employeeSummaries = summariesByEmployee.get(employee.id);
      const days: MonthlySummaryDay[] = dates.map((date, index) => {
        const summary = employeeSummaries?.get(date);
        if (!summary) {
          return this.emptySummaryDay(index, date);
        }

        return {
          day: index + 1,
          date,
          firstPunch: summary.firstPunchAt,
          lastPunch: summary.lastPunchAt,
          firstPunchAt: summary.firstPunchAt,
          lastPunchAt: summary.lastPunchAt,
          punchCount: summary.totalPunchCount,
          workedMinutes: summary.workedMinutes,
          expectedMinutes: summary.expectedMinutes,
          lateMinutes: summary.lateMinutes,
          earlyDepartureMinutes: summary.earlyDepartureMinutes,
          overtimeMinutes: summary.overtimeMinutes,
          isAbsent: summary.isAbsent,
          isHoliday: summary.isHoliday,
          isWeekend: summary.isWeekend,
          hasIncompleteRecord: summary.hasIncompleteRecord,
          status: summary.status,
        };
      });
      const totalWorkedMinutes = days.reduce((total, day) => total + day.workedMinutes, 0);

      return {
        employee: toReportEmployee(employee),
        userId: employee.id,
        year,
        month,
        daysWithRecords: days.filter((day) => day.punchCount > 0).length,
        presentDays: days.filter((day) => day.status === 'present' || day.status === 'calculated').length,
        absentDays: days.filter((day) => day.isAbsent || day.status === 'absent').length,
        holidayDays: days.filter((day) => day.isHoliday || day.status === 'holiday').length,
        weekendDays: days.filter((day) => day.isWeekend || day.status === 'weekend').length,
        totalPunches: days.reduce((total, day) => total + day.punchCount, 0),
        totalWorkedMinutes,
        totalWorkedHours: Math.round((totalWorkedMinutes / 60) * 100) / 100,
        totalLateMinutes: days.reduce((total, day) => total + day.lateMinutes, 0),
        totalEarlyDepartureMinutes: days.reduce((total, day) => total + day.earlyDepartureMinutes, 0),
        totalOvertimeMinutes: days.reduce((total, day) => total + day.overtimeMinutes, 0),
        incompleteDays: days.filter((day) => day.hasIncompleteRecord || day.status === 'incomplete').length,
        days,
      };
    });

    const expectedSummaryDays = employees.length * dates.length;
    const calculatedSummaryDays = summaries.length;

    return {
      source: 'summaries',
      coverage: {
        expectedSummaryDays,
        calculatedSummaryDays,
        missingSummaryDays: Math.max(expectedSummaryDays - calculatedSummaryDays, 0),
        isPartial: calculatedSummaryDays < expectedSummaryDays,
      },
      rows,
    };
  }

  private emptySummaryDay(index: number, date: string): MonthlySummaryDay {
    return {
      day: index + 1,
      date,
      firstPunch: null,
      lastPunch: null,
      firstPunchAt: null,
      lastPunchAt: null,
      punchCount: 0,
      workedMinutes: 0,
      expectedMinutes: 0,
      lateMinutes: 0,
      earlyDepartureMinutes: 0,
      overtimeMinutes: 0,
      isAbsent: false,
      isHoliday: false,
      isWeekend: false,
      hasIncompleteRecord: false,
      status: 'no_records',
    };
  }
}
