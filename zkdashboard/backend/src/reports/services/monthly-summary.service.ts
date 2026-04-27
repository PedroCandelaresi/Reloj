import { BadRequestException, Injectable } from '@nestjs/common';
import { AuthenticatedUser } from '../../auth/authenticated-user.interface';
import { MonthlySummaryDto } from '../dto/monthly-summary.dto';
import { MonthlySummaryDay, MonthlySummaryRow, toReportEmployee } from '../types/report.types';
import { eachDate, monthDateRange } from './report-date.util';
import { PairingService } from './pairing.service';
import { ReportQueryService } from './report-query.service';
import { resolveReportCompanyId } from './report-scope.util';

@Injectable()
export class MonthlySummaryService {
  constructor(
    private readonly pairing: PairingService,
    private readonly queries: ReportQueryService,
  ) {}

  async getReport(filters: MonthlySummaryDto, user: AuthenticatedUser): Promise<MonthlySummaryRow[]> {
    const year = Number.parseInt(filters.year, 10);
    const month = Number.parseInt(filters.month, 10);

    if (!Number.isFinite(year) || year < 2000 || year > 2100 || !Number.isFinite(month) || month < 1 || month > 12) {
      throw new BadRequestException('El año y mes del reporte no son válidos.');
    }

    const companyId = resolveReportCompanyId(user, filters.companyId);
    const employeeId = filters.employeeId || filters.userId;
    const { dateFrom, dateTo } = monthDateRange(year, month);
    const [employees, recordGroups] = await Promise.all([
      this.queries.getEmployees(companyId, employeeId),
      this.queries.getRecordGroups({
        companyId,
        dateFrom,
        dateTo,
        filters,
      }),
    ]);
    const dates = eachDate(dateFrom, dateTo);

    return employees.map((employee) => {
      const userGroups = recordGroups.get(employee.id);
      const days: MonthlySummaryDay[] = dates.map((date, index) => {
        const records = userGroups?.get(date) ?? [];
        const summary = this.pairing.summarize(records);
        return {
          day: index + 1,
          date,
          firstPunch: summary.firstPunch,
          lastPunch: summary.lastPunch,
          punchCount: summary.punchCount,
          workedMinutes: summary.workedMinutes,
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
        totalPunches: days.reduce((total, day) => total + day.punchCount, 0),
        totalWorkedMinutes,
        totalWorkedHours: Math.round((totalWorkedMinutes / 60) * 100) / 100,
        incompleteDays: days.filter((day) => day.status === 'incomplete').length,
        days,
      };
    });
  }
}
