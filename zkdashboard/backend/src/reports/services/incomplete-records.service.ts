import { Injectable } from '@nestjs/common';
import { AuthenticatedUser } from '../../auth/authenticated-user.interface';
import { ReportFiltersDto } from '../dto/report-filters.dto';
import { IncompleteReason, IncompleteRecordRow, toReportEmployee } from '../types/report.types';
import { normalizeDate } from './report-date.util';
import { PairingService } from './pairing.service';
import { ReportQueryService } from './report-query.service';
import { resolveReportCompanyId } from './report-scope.util';
import { assertMaxRangeDays } from '../utils/argentina-date.util';

@Injectable()
export class IncompleteRecordsService {
  constructor(
    private readonly pairing: PairingService,
    private readonly queries: ReportQueryService,
  ) {}

  async getReport(filters: ReportFiltersDto, user: AuthenticatedUser): Promise<IncompleteRecordRow[]> {
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
    const rows: IncompleteRecordRow[] = [];

    for (const employee of employees) {
      const userGroups = recordGroups.get(employee.id);
      if (!userGroups) {
        continue;
      }

      for (const [date, records] of userGroups.entries()) {
        const summary = this.pairing.summarize(records);
        if (!summary.isIncomplete) {
          continue;
        }

        rows.push({
          employee: toReportEmployee(employee),
          userId: employee.id,
          date,
          punchCount: summary.punchCount,
          punchTimes: summary.punchTimes,
          devices: summary.devices,
          reason: this.resolveReason(summary.punchCount),
        });
      }
    }

    return rows.sort((a, b) => a.date.localeCompare(b.date) || a.userId.localeCompare(b.userId));
  }

  private resolveReason(punchCount: number): IncompleteReason {
    if (punchCount === 1) {
      return 'single_punch';
    }

    if (punchCount % 2 === 1) {
      return 'odd_punch_count';
    }

    return 'missing_entry_unknown';
  }
}
