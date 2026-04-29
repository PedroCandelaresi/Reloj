import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, In, Repository } from 'typeorm';
import { AttendanceRecord } from '../../attendance/attendance.entity';
import { AttendanceAuditLog } from '../../attendance/entities/attendance-audit-log.entity';
import { AttendanceDaySummary } from '../../attendance/entities/attendance-day-summary.entity';
import { AttendanceJustificationType } from '../../attendance/entities/attendance-justification-type.entity';
import { AttendanceRequest } from '../../attendance/entities/attendance-request.entity';
import { AttendanceRequestAttachment } from '../../attendance/entities/attendance-request-attachment.entity';
import { AuthenticatedUser } from '../../auth/authenticated-user.interface';
import { Company } from '../../companies/company.entity';
import { Employee } from '../../employees/employee.entity';
import { MonthlySummaryDto } from '../dto/monthly-summary.dto';
import { parseArgentinaDateEnd, parseArgentinaDateStart } from '../utils/argentina-date.util';
import { eachDate, monthDateRange } from './report-date.util';
import { resolveReportCompanyId } from './report-scope.util';

export type MonthlyClosingStatus = 'ok' | 'review_required' | 'incomplete_data';

export interface MonthlyClosingDay {
  employeeId: string;
  employeeName: string;
  document: string;
  date: string;
  dayStatus: string;
  firstPunch: Date | null;
  lastPunch: Date | null;
  workedMinutes: number;
  expectedMinutes: number;
  lateMinutes: number;
  earlyDepartureMinutes: number;
  overtimeMinutes: number;
  justificationStatus: 'none' | 'pending' | 'approved' | 'rejected';
  justificationTypeName: string | null;
  attachmentCount: number;
  observation: string;
}

export interface MonthlyClosingRow {
  employeeId: string;
  employeeName: string;
  document: string;
  workDaysCount: number;
  presentDaysCount: number;
  workedDaysCount: number;
  absentDaysCount: number;
  justifiedAbsentDaysCount: number;
  unjustifiedAbsentDaysCount: number;
  lateDaysCount: number;
  justifiedLateDaysCount: number;
  unjustifiedLateDaysCount: number;
  earlyDepartureDaysCount: number;
  workedMinutes: number;
  expectedMinutes: number;
  overtimeMinutes: number;
  manualPunchesCount: number;
  correctedPunchesCount: number;
  pendingJustificationsCount: number;
  pendingAbsenceJustificationsCount: number;
  pendingLateJustificationsCount: number;
  attendancePercentage: number | null;
  observations: string[];
  status: MonthlyClosingStatus;
  days: MonthlyClosingDay[];
}

export interface MonthlyClosingReport {
  company: {
    id: string | null;
    name: string;
  };
  period: {
    year: number;
    month: number;
    label: string;
  };
  coverage: {
    source: 'summaries';
    expectedDays: number;
    calculatedDays: number;
    expectedSummaryDays: number;
    calculatedSummaryDays: number;
    missingSummaryDays: number;
    isComplete: boolean;
    hasEmployees: boolean;
  };
  totals: {
    employees: number;
    workedDays: number;
    justifiedAbsences: number;
    unjustifiedAbsences: number;
    lateDays: number;
    earlyDepartureDays: number;
    manualPunches: number;
    correctedPunches: number;
  };
  rows: MonthlyClosingRow[];
}

@Injectable()
export class MonthlyClosingService {
  constructor(
    @InjectRepository(AttendanceDaySummary)
    private readonly summariesRepo: Repository<AttendanceDaySummary>,
    @InjectRepository(AttendanceRecord)
    private readonly recordsRepo: Repository<AttendanceRecord>,
    @InjectRepository(AttendanceAuditLog)
    private readonly auditRepo: Repository<AttendanceAuditLog>,
    @InjectRepository(AttendanceRequest)
    private readonly requestsRepo: Repository<AttendanceRequest>,
    @InjectRepository(AttendanceRequestAttachment)
    private readonly attachmentsRepo: Repository<AttendanceRequestAttachment>,
    @InjectRepository(Employee)
    private readonly employeesRepo: Repository<Employee>,
    @InjectRepository(Company)
    private readonly companiesRepo: Repository<Company>,
  ) {}

  async getReport(filters: MonthlySummaryDto, user: AuthenticatedUser): Promise<MonthlyClosingReport> {
    const year = Number.parseInt(filters.year, 10);
    const month = Number.parseInt(filters.month, 10);

    if (!Number.isFinite(year) || year < 2000 || year > 2100 || !Number.isFinite(month) || month < 1 || month > 12) {
      throw new BadRequestException('El año y mes del cierre mensual no son válidos.');
    }
    if (user.isSuperAdmin && !filters.companyId) {
      throw new BadRequestException('Para consultar el cierre mensual como super admin, seleccioná una empresa.');
    }

    const companyId = resolveReportCompanyId(user, filters.companyId);
    if (!companyId) {
      throw new BadRequestException('Para consultar el cierre mensual, seleccioná una empresa.');
    }

    const employeeId = filters.employeeId || filters.userId;
    const { dateFrom, dateTo } = monthDateRange(year, month);
    const dates = eachDate(dateFrom, dateTo);
    const [company, employees] = await Promise.all([
      this.companiesRepo.findOneBy({ id: companyId }),
      this.getEmployees(companyId, employeeId),
    ]);

    const employeeIds = employees.map((employee) => employee.id);
    const summaries = await this.getSummaries(companyId, employeeIds, dateFrom, dateTo);
    const summaryDateCount = new Set(summaries.map((summary) => summary.date)).size;
    const expectedSummaryDays = employees.length * dates.length;
    const calculatedSummaryDays = summaries.length;
    const coverage = {
      source: 'summaries' as const,
      expectedDays: dates.length,
      calculatedDays: summaryDateCount,
      expectedSummaryDays,
      calculatedSummaryDays,
      missingSummaryDays: Math.max(expectedSummaryDays - calculatedSummaryDays, 0),
      isComplete: expectedSummaryDays > 0 && calculatedSummaryDays >= expectedSummaryDays,
      hasEmployees: employees.length > 0,
    };

    if (summaries.length === 0) {
      return {
        company: { id: company?.id ?? companyId, name: this.companyName(company) },
        period: { year, month, label: this.periodLabel(year, month) },
        coverage,
        totals: this.emptyTotals(),
        rows: [],
      };
    }

    const [requestMeta, manualCounts, correctionCounts] = await Promise.all([
      this.getRequestMeta(summaries.map((summary) => summary.justificationRequestId).filter(Boolean) as string[]),
      this.getManualPunchCounts(companyId, employeeIds, dateFrom, dateTo),
      this.getCorrectionCounts(companyId, employeeIds, dateFrom, dateTo),
    ]);

    const summariesByEmployee = new Map<string, Map<string, AttendanceDaySummary>>();
    for (const summary of summaries) {
      const employeeSummaries = summariesByEmployee.get(summary.employeeId) ?? new Map<string, AttendanceDaySummary>();
      employeeSummaries.set(summary.date, summary);
      summariesByEmployee.set(summary.employeeId, employeeSummaries);
    }

    const rows = employees.map((employee) =>
      this.buildRow({
        employee,
        dates,
        summariesByDate: summariesByEmployee.get(employee.id) ?? new Map(),
        requestMeta,
        manualPunchesCount: manualCounts.get(employee.id) ?? 0,
        correctedPunchesCount: correctionCounts.get(employee.id) ?? 0,
        hasIncompletePeriod: !coverage.isComplete,
      }),
    );

    return {
      company: { id: company?.id ?? companyId, name: this.companyName(company) },
      period: { year, month, label: this.periodLabel(year, month) },
      coverage,
      totals: {
        employees: rows.length,
        workedDays: rows.reduce((total, row) => total + row.workedDaysCount, 0),
        justifiedAbsences: rows.reduce((total, row) => total + row.justifiedAbsentDaysCount, 0),
        unjustifiedAbsences: rows.reduce((total, row) => total + row.unjustifiedAbsentDaysCount, 0),
        lateDays: rows.reduce((total, row) => total + row.lateDaysCount, 0),
        earlyDepartureDays: rows.reduce((total, row) => total + row.earlyDepartureDaysCount, 0),
        manualPunches: rows.reduce((total, row) => total + row.manualPunchesCount, 0),
        correctedPunches: rows.reduce((total, row) => total + row.correctedPunchesCount, 0),
      },
      rows,
    };
  }

  private async getEmployees(companyId: string, employeeId?: string): Promise<Employee[]> {
    const where = {
      companyId,
      ...(employeeId ? { id: employeeId } : {}),
    };
    return this.employeesRepo.find({
      where,
      order: { apellido: 'ASC', nombre: 'ASC', id: 'ASC' },
    });
  }

  private async getSummaries(
    companyId: string,
    employeeIds: string[],
    dateFrom: string,
    dateTo: string,
  ): Promise<AttendanceDaySummary[]> {
    if (employeeIds.length === 0) return [];
    return this.summariesRepo.find({
      where: {
        companyId,
        employeeId: In(employeeIds),
        date: Between(dateFrom, dateTo),
      },
      order: { employeeId: 'ASC', date: 'ASC' },
    });
  }

  private buildRow({
    employee,
    dates,
    summariesByDate,
    requestMeta,
    manualPunchesCount,
    correctedPunchesCount,
    hasIncompletePeriod,
  }: {
    employee: Employee;
    dates: string[];
    summariesByDate: Map<string, AttendanceDaySummary>;
    requestMeta: Map<string, { justificationTypeName: string | null; attachmentCount: number }>;
    manualPunchesCount: number;
    correctedPunchesCount: number;
    hasIncompletePeriod: boolean;
  }): MonthlyClosingRow {
    const employeeName = this.employeeName(employee);
    const days = dates.map((date) => {
      const summary = summariesByDate.get(date);
      if (!summary) {
        return this.emptyDay(employee.id, employeeName, date);
      }
      const meta = summary.justificationRequestId ? requestMeta.get(summary.justificationRequestId) : undefined;
      return {
        employeeId: employee.id,
        employeeName,
        document: employee.id,
        date,
        dayStatus: this.dayStatusLabel(summary),
        firstPunch: summary.firstPunchAt,
        lastPunch: summary.lastPunchAt,
        workedMinutes: summary.workedMinutes,
        expectedMinutes: summary.expectedMinutes,
        lateMinutes: summary.lateMinutes,
        earlyDepartureMinutes: summary.earlyDepartureMinutes,
        overtimeMinutes: summary.overtimeMinutes,
        justificationStatus: summary.justificationStatus,
        justificationTypeName: meta?.justificationTypeName ?? null,
        attachmentCount: meta?.attachmentCount ?? 0,
        observation: this.dayObservation(summary),
      };
    });

    const workDays = days.filter((day) => {
      const summary = summariesByDate.get(day.date);
      return Boolean(summary && !summary.isWeekend && !summary.isHoliday && summary.expectedMinutes > 0);
    });
    const absentDays = workDays.filter((day) => {
      const summary = summariesByDate.get(day.date);
      return Boolean(summary?.isAbsent || summary?.status === 'absent');
    });
    const lateDays = workDays.filter((day) => day.lateMinutes > 0);
    const presentDaysCount = workDays.filter((day) => {
      const summary = summariesByDate.get(day.date);
      return Boolean(summary?.isPresent || summary?.totalPunchCount || day.workedMinutes > 0);
    }).length;
    const justifiedAbsentDaysCount = absentDays.filter((day) => day.justificationStatus === 'approved').length;
    const unjustifiedAbsentDaysCount = absentDays.filter((day) => day.justificationStatus !== 'approved' && day.justificationStatus !== 'pending').length;
    const justifiedLateDaysCount = lateDays.filter((day) => day.justificationStatus === 'approved').length;
    const unjustifiedLateDaysCount = lateDays.filter((day) => day.justificationStatus !== 'approved' && day.justificationStatus !== 'pending').length;
    const pendingAbsenceJustificationsCount = absentDays.filter((day) => day.justificationStatus === 'pending').length;
    const pendingLateJustificationsCount = lateDays.filter((day) => day.justificationStatus === 'pending').length;
    const pendingJustificationsCount = days.filter((day) => day.justificationStatus === 'pending').length;
    const earlyDepartureDaysCount = workDays.filter((day) => day.earlyDepartureMinutes > 0).length;
    const observations = this.buildObservations({
      employee,
      hasIncompletePeriod,
      missingDays: dates.length - summariesByDate.size,
      unjustifiedAbsentDaysCount,
      unjustifiedLateDaysCount,
      earlyDepartureDaysCount,
      manualPunchesCount,
      correctedPunchesCount,
      pendingJustificationsCount,
    });
    const status = this.rowStatus(employee, hasIncompletePeriod, dates.length - summariesByDate.size, observations);
    const workDaysCount = workDays.length;

    return {
      employeeId: employee.id,
      employeeName,
      document: employee.id,
      workDaysCount,
      presentDaysCount,
      workedDaysCount: presentDaysCount,
      absentDaysCount: absentDays.length,
      justifiedAbsentDaysCount,
      unjustifiedAbsentDaysCount,
      lateDaysCount: lateDays.length,
      justifiedLateDaysCount,
      unjustifiedLateDaysCount,
      earlyDepartureDaysCount,
      workedMinutes: days.reduce((total, day) => total + day.workedMinutes, 0),
      expectedMinutes: workDays.reduce((total, day) => total + day.expectedMinutes, 0),
      overtimeMinutes: days.reduce((total, day) => total + day.overtimeMinutes, 0),
      manualPunchesCount,
      correctedPunchesCount,
      pendingJustificationsCount,
      pendingAbsenceJustificationsCount,
      pendingLateJustificationsCount,
      attendancePercentage: workDaysCount > 0 ? Math.round((presentDaysCount / workDaysCount) * 10000) / 100 : null,
      observations,
      status,
      days,
    };
  }

  private emptyDay(employeeId: string, employeeName: string, date: string): MonthlyClosingDay {
    return {
      employeeId,
      employeeName,
      document: employeeId,
      date,
      dayStatus: 'Sin datos calculados',
      firstPunch: null,
      lastPunch: null,
      workedMinutes: 0,
      expectedMinutes: 0,
      lateMinutes: 0,
      earlyDepartureMinutes: 0,
      overtimeMinutes: 0,
      justificationStatus: 'none',
      justificationTypeName: null,
      attachmentCount: 0,
      observation: 'Período con datos incompletos',
    };
  }

  private buildObservations({
    employee,
    hasIncompletePeriod,
    missingDays,
    unjustifiedAbsentDaysCount,
    unjustifiedLateDaysCount,
    earlyDepartureDaysCount,
    manualPunchesCount,
    correctedPunchesCount,
    pendingJustificationsCount,
  }: {
    employee: Employee;
    hasIncompletePeriod: boolean;
    missingDays: number;
    unjustifiedAbsentDaysCount: number;
    unjustifiedLateDaysCount: number;
    earlyDepartureDaysCount: number;
    manualPunchesCount: number;
    correctedPunchesCount: number;
    pendingJustificationsCount: number;
  }): string[] {
    const observations: string[] = [];
    if (!employee.scheduleProfileId) observations.push('Empleado sin horario configurado');
    if (hasIncompletePeriod || missingDays > 0) observations.push('Período con datos incompletos');
    if (unjustifiedAbsentDaysCount > 0) observations.push(`Tiene ${unjustifiedAbsentDaysCount} ${this.plural(unjustifiedAbsentDaysCount, 'ausencia sin justificar', 'ausencias sin justificar')}`);
    if (unjustifiedLateDaysCount > 0) observations.push(`Tiene ${unjustifiedLateDaysCount} ${this.plural(unjustifiedLateDaysCount, 'tardanza sin justificar', 'tardanzas sin justificar')}`);
    if (pendingJustificationsCount > 0) observations.push(`Tiene ${pendingJustificationsCount} ${this.plural(pendingJustificationsCount, 'justificación pendiente de revisión', 'justificaciones pendientes de revisión')}`);
    if (earlyDepartureDaysCount > 0) observations.push(`Tiene ${earlyDepartureDaysCount} ${this.plural(earlyDepartureDaysCount, 'salida temprana', 'salidas tempranas')}`);
    if (manualPunchesCount > 0) observations.push(`Tiene ${manualPunchesCount} ${this.plural(manualPunchesCount, 'fichada manual', 'fichadas manuales')}`);
    if (correctedPunchesCount > 0) observations.push(`Tiene ${correctedPunchesCount} ${this.plural(correctedPunchesCount, 'fichada corregida', 'fichadas corregidas')}`);
    return observations.length > 0 ? observations : ['Sin observaciones'];
  }

  private rowStatus(employee: Employee, hasIncompletePeriod: boolean, missingDays: number, observations: string[]): MonthlyClosingStatus {
    if (!employee.scheduleProfileId || hasIncompletePeriod || missingDays > 0) return 'incomplete_data';
    return observations.length === 1 && observations[0] === 'Sin observaciones' ? 'ok' : 'review_required';
  }

  private async getManualPunchCounts(
    companyId: string,
    employeeIds: string[],
    dateFrom: string,
    dateTo: string,
  ): Promise<Map<string, number>> {
    if (employeeIds.length === 0) return new Map();
    const rows = await this.recordsRepo
      .createQueryBuilder('record')
      .select('record.user_id', 'employeeId')
      .addSelect('COUNT(*)', 'count')
      .where('record.company_id = :companyId', { companyId })
      .andWhere('record.user_id IN (:...employeeIds)', { employeeIds })
      .andWhere('record.source = :source', { source: 'manual' })
      .andWhere('record.timestamp BETWEEN :dateFrom AND :dateTo', {
        dateFrom: parseArgentinaDateStart(dateFrom),
        dateTo: parseArgentinaDateEnd(dateTo),
      })
      .groupBy('record.user_id')
      .getRawMany();
    return new Map(rows.map((row) => [String(row.employeeId), Number(row.count)]));
  }

  private async getCorrectionCounts(
    companyId: string,
    employeeIds: string[],
    dateFrom: string,
    dateTo: string,
  ): Promise<Map<string, number>> {
    if (employeeIds.length === 0) return new Map();
    const rows = await this.auditRepo
      .createQueryBuilder('audit')
      .select('audit.employee_id', 'employeeId')
      .addSelect('COUNT(*)', 'count')
      .where('audit.company_id = :companyId', { companyId })
      .andWhere('audit.employee_id IN (:...employeeIds)', { employeeIds })
      .andWhere('audit.action = :action', { action: 'punch_corrected' })
      .andWhere('audit.created_at BETWEEN :dateFrom AND :dateTo', {
        dateFrom: parseArgentinaDateStart(dateFrom),
        dateTo: parseArgentinaDateEnd(dateTo),
      })
      .groupBy('audit.employee_id')
      .getRawMany();
    return new Map(rows.map((row) => [String(row.employeeId), Number(row.count)]));
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

  private dayStatusLabel(summary: AttendanceDaySummary): string {
    if (summary.isHoliday || summary.status === 'holiday') return 'Feriado';
    if (summary.isWeekend || summary.status === 'weekend') return 'Fin de semana';
    if (summary.isAbsent || summary.status === 'absent') return summary.justificationStatus === 'approved' ? 'Ausente justificado' : 'Ausente sin justificar';
    if (summary.hasIncompleteRecord || summary.status === 'incomplete') return 'Fichada incompleta';
    if (summary.isPresent || summary.status === 'present' || summary.status === 'calculated') return 'Presente';
    return 'Sin fichadas';
  }

  private dayObservation(summary: AttendanceDaySummary): string {
    const observations: string[] = [];
    if (summary.lateMinutes > 0) observations.push(`Tardanza: ${summary.lateMinutes} min`);
    if (summary.earlyDepartureMinutes > 0) observations.push(`Salida temprana: ${summary.earlyDepartureMinutes} min`);
    if (summary.hasIncompleteRecord) observations.push('Fichada incompleta');
    if (summary.notes) observations.push(summary.notes);
    return observations.join(' · ');
  }

  private employeeName(employee: Employee): string {
    return [employee.apellido, employee.nombre].filter(Boolean).join(', ') || employee.id;
  }

  private companyName(company: Company | null): string {
    return company?.nombreFantasia || company?.razonSocial || 'Empresa';
  }

  private periodLabel(year: number, month: number): string {
    const label = new Intl.DateTimeFormat('es-AR', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(Date.UTC(year, month - 1, 1)));
    return label.charAt(0).toUpperCase() + label.slice(1);
  }

  private plural(count: number, singular: string, plural: string): string {
    return count === 1 ? singular : plural;
  }

  private emptyTotals(): MonthlyClosingReport['totals'] {
    return {
      employees: 0,
      workedDays: 0,
      justifiedAbsences: 0,
      unjustifiedAbsences: 0,
      lateDays: 0,
      earlyDepartureDays: 0,
      manualPunches: 0,
      correctedPunches: 0,
    };
  }
}
