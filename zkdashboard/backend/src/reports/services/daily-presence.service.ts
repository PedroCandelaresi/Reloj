import { BadRequestException, Injectable } from '@nestjs/common';
import { AuthenticatedUser } from '../../auth/authenticated-user.interface';
import { ReportFiltersDto } from '../dto/report-filters.dto';
import { DailyPresenceRow, toReportEmployee } from '../types/report.types';
import { eachDate, normalizeDate } from './report-date.util';
import { PairingService } from './pairing.service';
import { ReportQueryService } from './report-query.service';
import { resolveReportCompanyId } from './report-scope.util';
import { assertMaxRangeDays } from '../utils/argentina-date.util';

@Injectable()
export class DailyPresenceService {
  constructor(
    private readonly pairing: PairingService,
    private readonly queries: ReportQueryService,
  ) {}

  async getReport(filters: ReportFiltersDto, user: AuthenticatedUser): Promise<DailyPresenceRow[]> {
    if (user.isSuperAdmin && !filters.companyId) {
      throw new BadRequestException('Para consultar presencia diaria como super admin, seleccioná una empresa.');
    }

    const companyId = resolveReportCompanyId(user, filters.companyId);
    const dateFrom = normalizeDate(filters.dateFrom);
    const dateTo = normalizeDate(filters.dateTo ?? dateFrom);
    assertMaxRangeDays(dateFrom, dateTo, 62);
    const employeeId = filters.employeeId || filters.userId;
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
    const rows: DailyPresenceRow[] = [];

    for (const employee of employees) {
      const userGroups = recordGroups.get(employee.id);

      for (const date of dates) {
        const records = userGroups?.get(date) ?? [];
        const summary = this.pairing.summarize(records);
        rows.push({
          employee: toReportEmployee(employee),
          userId: employee.id,
          date,
          firstPunch: summary.firstPunch,
          lastPunch: summary.lastPunch,
          punchCount: summary.punchCount,
          workedMinutes: summary.workedMinutes,
          primaryDevice: summary.primaryDevice,
          devices: summary.devices,
          status:
            summary.punchCount === 0
              ? 'no_records'
              : summary.isIncomplete
                ? 'incomplete'
                : 'present',
        });
      }
    }

    return rows;
  }
}
