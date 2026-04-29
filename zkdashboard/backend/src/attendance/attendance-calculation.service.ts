import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { AttendanceRecord } from './attendance.entity';
import {
  AttendanceJustificationStatus,
  AttendanceDaySummary,
  AttendanceDaySummaryStatus,
} from './entities/attendance-day-summary.entity';
import { Employee } from '../employees/employee.entity';
import { Device } from '../devices/device.entity';
import { Company } from '../companies/company.entity';
import { ResolvedScheduleForDate, resolveScheduleForDate } from '../companies/schedule-resolution.util';
import { Holiday } from './entities/holiday.entity';
import { EmployeeTimeBankLedger } from '../employees/employee-time-bank-ledger.entity';
import { AuthenticatedUser } from '../auth/authenticated-user.interface';
import { CompanyRole } from '../companies/company-role.enum';
import { PairingService } from '../reports/services/pairing.service';
import {
  assertMaxRangeDays,
  eachArgentinaDate,
  formatArgentinaDateTime,
  getArgentinaDateKey,
  parseArgentinaDateEnd,
  parseArgentinaDateStart,
} from '../reports/utils/argentina-date.util';

export interface RecalculateResult {
  employeesProcessed: number;
  daysProcessed: number;
  summariesCreated: number;
  summariesUpdated: number;
  dateFrom: string;
  dateTo: string;
  absentDays: number;
  incompleteDays: number;
  lateDays: number;
  earlyDepartureDays: number;
  holidayDays: number;
  weekendDays: number;
}

export interface AttendanceDaySummaryView {
  id: string;
  companyId: string;
  employeeId: string;
  employee: Pick<Employee, 'id' | 'nombre' | 'apellido'> | null;
  date: string;
  firstPunchAt: Date | null;
  lastPunchAt: Date | null;
  totalPunchCount: number;
  punchTimesJson: string[] | null;
  deviceIdsJson: number[] | null;
  primaryDeviceId: number | null;
  primaryDeviceSn: string | null;
  primaryDeviceName: string | null;
  isPresent: boolean;
  hasRecords: boolean;
  hasIncompleteRecord: boolean;
  workedMinutes: number;
  expectedMinutes: number;
  lateMinutes: number;
  earlyDepartureMinutes: number;
  overtimeMinutes: number;
  isAbsent: boolean;
  isHoliday: boolean;
  isWeekend: boolean;
  status: AttendanceDaySummaryStatus;
  justificationStatus: string;
  justificationRequestId: string | null;
  notes: string | null;
  calculatedAt: Date | null;
}

@Injectable()
export class AttendanceCalculationService {
  constructor(
    @InjectRepository(AttendanceRecord)
    private readonly attendanceRepo: Repository<AttendanceRecord>,
    @InjectRepository(AttendanceDaySummary)
    private readonly summariesRepo: Repository<AttendanceDaySummary>,
    @InjectRepository(Employee)
    private readonly employeesRepo: Repository<Employee>,
    @InjectRepository(Device)
    private readonly devicesRepo: Repository<Device>,
    @InjectRepository(Company)
    private readonly companiesRepo: Repository<Company>,
    @InjectRepository(Holiday)
    private readonly holidaysRepo: Repository<Holiday>,
    @InjectRepository(EmployeeTimeBankLedger)
    private readonly timeBankLedgerRepo: Repository<EmployeeTimeBankLedger>,
    private readonly pairing: PairingService,
  ) {}

  resolveWritableCompanyId(user: AuthenticatedUser, requestedCompanyId?: string): string {
    if (user.isSuperAdmin) {
      if (!requestedCompanyId) {
        throw new BadRequestException('companyId es requerido para recalcular como super_admin.');
      }
      return requestedCompanyId;
    }

    if (!user.companyId) {
      throw new ForbiddenException('El usuario no tiene una empresa activa asignada.');
    }

    if (requestedCompanyId && requestedCompanyId !== user.companyId) {
      throw new ForbiddenException('No podés recalcular otra empresa.');
    }

    if (user.companyRole !== CompanyRole.COMPANY_ADMIN) {
      throw new ForbiddenException('Se requieren permisos de administrador de empresa.');
    }

    return user.companyId;
  }

  resolveReadableCompanyId(user: AuthenticatedUser, requestedCompanyId?: string): string | null {
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

  async calculateEmployeeDay(companyId: string, employeeId: string, date: string): Promise<AttendanceDaySummary> {
    const result = await this.recalculateCompanyRange(companyId, date, date, employeeId);
    if (result.employeesProcessed === 0) {
      throw new BadRequestException('El empleado no pertenece a la empresa indicada.');
    }

    return this.summariesRepo.findOneByOrFail({ companyId, employeeId, date });
  }

  async recalculateFromAttendanceRecords(
    companyId: string,
    dateFrom: string,
    dateTo: string,
  ): Promise<RecalculateResult> {
    return this.recalculateCompanyRange(companyId, dateFrom, dateTo);
  }

  async recalculateCompanyRange(
    companyId: string,
    dateFrom: string,
    dateTo: string,
    employeeId?: string,
  ): Promise<RecalculateResult> {
    this.validateRange(dateFrom, dateTo);

    const employees = await this.getEmployees(companyId, employeeId);
    if (employeeId && employees.length === 0) {
      throw new BadRequestException('El empleado no pertenece a la empresa indicada.');
    }

    const dates = eachArgentinaDate(dateFrom, dateTo);
    const recordGroups = await this.getRecordGroups(companyId, dateFrom, dateTo, employees.map((employee) => employee.id));
    const devicesById = await this.getDevicesById(recordGroups);
    const existing = await this.getExistingSummaries(companyId, dates, employees.map((employee) => employee.id));
    let summariesCreated = 0;
    let summariesUpdated = 0;
    let absentDays = 0;
    let incompleteDays = 0;
    let lateDays = 0;
    let earlyDepartureDays = 0;
    let holidayDays = 0;
    let weekendDays = 0;
    const toSave: AttendanceDaySummary[] = [];
    const company = await this.companiesRepo.findOneBy({ id: companyId });
    const holidays = await this.getHolidays(companyId, dates);

    for (const employee of employees) {
      const employeeGroups = recordGroups.get(employee.id);

      for (const date of dates) {
        const key = this.summaryKey(employee.id, date);
        const summary =
          existing.get(key) ??
          this.summariesRepo.create({
            companyId,
            employeeId: employee.id,
            date,
          });

        if (summary.id) {
          summariesUpdated += 1;
        } else {
          summariesCreated += 1;
        }

        const approvedJustification = this.approvedJustificationSnapshot(summary);
        this.applyRecordsToSummary(summary, employeeGroups, devicesById, employee, company, holidays.get(date) ?? null);
        this.restoreApprovedJustification(summary, approvedJustification);
        if (summary.isAbsent) absentDays += 1;
        if (summary.hasIncompleteRecord) incompleteDays += 1;
        if (summary.lateMinutes > 0) lateDays += 1;
        if (summary.earlyDepartureMinutes > 0) earlyDepartureDays += 1;
        if (summary.isHoliday) holidayDays += 1;
        if (summary.isWeekend) weekendDays += 1;
        toSave.push(summary);
      }
    }

    if (toSave.length > 0) {
      const savedSummaries = await this.summariesRepo.save(toSave);
      await this.syncAutomaticTimeBank(savedSummaries, employees);
    }

    return {
      employeesProcessed: employees.length,
      daysProcessed: employees.length * dates.length,
      summariesCreated,
      summariesUpdated,
      dateFrom,
      dateTo,
      absentDays,
      incompleteDays,
      lateDays,
      earlyDepartureDays,
      holidayDays,
      weekendDays,
    };
  }

  async getDaySummaries(opts: {
    user: AuthenticatedUser;
    dateFrom: string;
    dateTo: string;
    employeeId?: string;
    companyId?: string;
  }): Promise<AttendanceDaySummaryView[]> {
    this.validateRange(opts.dateFrom, opts.dateTo);
    const companyId = this.resolveReadableCompanyId(opts.user, opts.companyId);
    const qb = this.summariesRepo
      .createQueryBuilder('summary')
      .leftJoinAndMapOne('summary.employee', Employee, 'employee', 'employee.id = summary.employee_id')
      .where('summary.date >= :dateFrom', { dateFrom: opts.dateFrom })
      .andWhere('summary.date <= :dateTo', { dateTo: opts.dateTo });

    if (companyId) {
      qb.andWhere('summary.company_id = :companyId', { companyId });
    }

    if (opts.employeeId) {
      qb.andWhere('summary.employee_id = :employeeId', { employeeId: opts.employeeId });
    }

    qb.orderBy('summary.date', 'ASC')
      .addOrderBy('employee.apellido', 'ASC', 'NULLS LAST')
      .addOrderBy('employee.nombre', 'ASC', 'NULLS LAST')
      .addOrderBy('summary.employee_id', 'ASC');

    const summaries = await qb.getMany();
    return summaries.map((summary) => {
      const employee = (summary as AttendanceDaySummary & { employee?: Employee | null }).employee;
      return {
        ...summary,
        employee: employee
          ? {
              id: employee.id,
              nombre: employee.nombre,
              apellido: employee.apellido,
            }
          : null,
      };
    });
  }

  private validateRange(dateFrom: string, dateTo: string): void {
    if (!dateFrom || !dateTo) {
      throw new BadRequestException('dateFrom y dateTo son requeridos.');
    }
    assertMaxRangeDays(dateFrom, dateTo, 62);
  }

  private getEmployees(companyId: string, employeeId?: string): Promise<Employee[]> {
    const qb = this.employeesRepo
      .createQueryBuilder('employee')
      .leftJoinAndSelect('employee.scheduleProfile', 'scheduleProfile')
      .leftJoinAndSelect('scheduleProfile.dayRules', 'scheduleProfileDayRules')
      .leftJoinAndSelect('scheduleProfileDayRules.intervals', 'scheduleProfileDayRuleIntervals')
      .where('employee.company_id = :companyId', { companyId });

    if (employeeId) {
      qb.andWhere('employee.id = :employeeId', { employeeId });
    }

    return qb.orderBy('employee.apellido', 'ASC').addOrderBy('employee.nombre', 'ASC').getMany();
  }

  private async getRecordGroups(
    companyId: string,
    dateFrom: string,
    dateTo: string,
    employeeIds: string[],
  ): Promise<Map<string, Map<string, AttendanceRecord[]>>> {
    const groups = new Map<string, Map<string, AttendanceRecord[]>>();
    if (employeeIds.length === 0) {
      return groups;
    }

    const records = await this.attendanceRepo
      .createQueryBuilder('record')
      .where('record.company_id = :companyId', { companyId })
      .andWhere('record.user_id IN (:...employeeIds)', { employeeIds })
      .andWhere('record.timestamp >= :dateFrom', { dateFrom: parseArgentinaDateStart(this.addDays(dateFrom, -1)) })
      .andWhere('record.timestamp <= :dateTo', { dateTo: parseArgentinaDateEnd(this.addDays(dateTo, 1)) })
      .orderBy('record.user_id', 'ASC')
      .addOrderBy('record.timestamp', 'ASC')
      .getMany();

    for (const record of records) {
      const date = getArgentinaDateKey(record.timestamp);
      const employeeGroups = groups.get(record.userId) ?? new Map<string, AttendanceRecord[]>();
      const dayRecords = employeeGroups.get(date) ?? [];
      dayRecords.push(record);
      employeeGroups.set(date, dayRecords);
      groups.set(record.userId, employeeGroups);
    }

    return groups;
  }

  private async getExistingSummaries(
    companyId: string,
    dates: string[],
    employeeIds: string[],
  ): Promise<Map<string, AttendanceDaySummary>> {
    const existing = new Map<string, AttendanceDaySummary>();
    if (dates.length === 0 || employeeIds.length === 0) {
      return existing;
    }

    const summaries = await this.summariesRepo.find({
      where: {
        companyId,
        employeeId: In(employeeIds),
        date: In(dates),
      },
    });

    for (const summary of summaries) {
      existing.set(this.summaryKey(summary.employeeId, summary.date), summary);
    }

    return existing;
  }

  private async getHolidays(companyId: string, dates: string[]): Promise<Map<string, Holiday>> {
    const holidays = await this.holidaysRepo
      .createQueryBuilder('holiday')
      .where('holiday.date IN (:...dates)', { dates })
      .andWhere('(holiday.company_id = :companyId OR holiday.company_id IS NULL)', { companyId })
      .orderBy('holiday.company_id', 'ASC', 'NULLS FIRST')
      .getMany();
    const byDate = new Map<string, Holiday>();

    for (const holiday of holidays) {
      const current = byDate.get(holiday.date);
      if (!current || holiday.companyId === companyId) {
        byDate.set(holiday.date, holiday);
      }
    }

    return byDate;
  }

  private async getDevicesById(
    recordGroups: Map<string, Map<string, AttendanceRecord[]>>,
  ): Promise<Map<number, Device>> {
    const deviceIds = new Set<number>();

    for (const employeeGroups of recordGroups.values()) {
      for (const records of employeeGroups.values()) {
        records.forEach((record) => {
          if (record.deviceId) {
            deviceIds.add(record.deviceId);
          }
        });
      }
    }

    if (deviceIds.size === 0) {
      return new Map();
    }

    const devices = await this.devicesRepo.findBy({ id: In([...deviceIds]) });
    return new Map(devices.map((device) => [device.id, device]));
  }

  private applyRecordsToSummary(
    summary: AttendanceDaySummary,
    employeeGroups: Map<string, AttendanceRecord[]> | undefined,
    devicesById: Map<number, Device>,
    employee: Employee,
    company: Company | null,
    holiday: Holiday | null,
  ): void {
    const schedule = resolveScheduleForDate(employee, summary.date, company);
    const records = this.recordsForSchedule(employeeGroups, summary.date, schedule);
    const pairing = this.pairing.summarize(
      records.map((record) => ({
        timestamp: record.timestamp,
        deviceSn: record.deviceSn,
        deviceId: record.deviceId,
      })),
    );
    const primaryDevice = this.resolvePrimaryDevice(records, devicesById);
    const hasRecords = pairing.punchCount > 0;
    const isHoliday = Boolean(holiday && !holiday.isWorkable);
    const isWorkDay = schedule.isWorkday;
    const isWeekend = !isWorkDay && this.isArgentinaWeekend(summary.date);
    const expectedEntry = schedule.intervals[0]?.entryDateTime ?? null;
    const expectedExit = schedule.intervals[schedule.intervals.length - 1]?.exitDateTime ?? null;
    const workedMinutes = pairing.workedMinutes;

    summary.firstPunchAt = pairing.firstPunch;
    summary.lastPunchAt = pairing.lastPunch;
    summary.totalPunchCount = pairing.punchCount;
    summary.punchTimesJson = pairing.punchTimes.map((date) => formatArgentinaDateTime(date));
    summary.deviceIdsJson = [...new Set(records.map((record) => record.deviceId).filter((id): id is number => id !== null))];
    summary.primaryDeviceId = primaryDevice?.id ?? null;
    summary.primaryDeviceSn = primaryDevice?.serialNumber ?? pairing.primaryDevice;
    summary.primaryDeviceName = primaryDevice?.alias || primaryDevice?.serialNumber || pairing.primaryDevice;
    summary.hasRecords = hasRecords;
    summary.isPresent = hasRecords;
    summary.hasIncompleteRecord = pairing.isIncomplete;
    summary.workedMinutes = workedMinutes;
    summary.expectedMinutes = isWorkDay && !isHoliday ? schedule.expectedMinutes : 0;
    summary.lateMinutes = isWorkDay && !isHoliday
      ? this.calculateLateMinutes(pairing.firstPunch, expectedEntry, schedule.lateToleranceMinutes)
      : 0;
    summary.earlyDepartureMinutes =
      pairing.isIncomplete || !isWorkDay || isHoliday
        ? 0
        : this.calculateEarlyDepartureMinutes(pairing.lastPunch, expectedExit, schedule.earlyDepartureToleranceMinutes);
    summary.overtimeMinutes =
      schedule.expectedMinutes > 0
        ? Math.max(workedMinutes - schedule.expectedMinutes - schedule.overtimeAfterMinutes, 0)
        : 0;
    summary.isHoliday = isHoliday;
    summary.isWeekend = !isHoliday && isWeekend;
    summary.isAbsent = Boolean(isWorkDay && !isHoliday && !hasRecords);
    summary.status = this.resolveStatus({
      hasRecords,
      isIncomplete: pairing.isIncomplete,
      hasSchedule: schedule.source !== 'no_schedule',
      isAbsent: summary.isAbsent,
      isHoliday: summary.isHoliday,
      isWeekend: summary.isWeekend,
    });
    summary.calculatedAt = new Date();
  }

  private approvedJustificationSnapshot(summary: AttendanceDaySummary): {
    status: AttendanceJustificationStatus;
    requestId: string | null;
    notes: string | null;
  } | null {
    if (summary.justificationStatus !== 'approved') {
      return null;
    }

    return {
      status: summary.justificationStatus,
      requestId: summary.justificationRequestId,
      notes: summary.notes,
    };
  }

  private restoreApprovedJustification(
    summary: AttendanceDaySummary,
    snapshot: { status: AttendanceJustificationStatus; requestId: string | null; notes: string | null } | null,
  ): void {
    if (!snapshot) {
      return;
    }

    summary.justificationStatus = snapshot.status;
    summary.justificationRequestId = snapshot.requestId;
    summary.notes = snapshot.notes;
  }

  private resolveStatus(opts: {
    hasRecords: boolean;
    isIncomplete: boolean;
    hasSchedule: boolean;
    isAbsent: boolean;
    isHoliday: boolean;
    isWeekend: boolean;
  }): AttendanceDaySummary['status'] {
    if (opts.hasRecords && opts.isIncomplete) return 'incomplete';
    if (opts.isAbsent) return 'absent';
    if (!opts.hasRecords && opts.isHoliday) return 'holiday';
    if (!opts.hasRecords && opts.isWeekend) return 'weekend';
    if (opts.hasRecords && opts.hasSchedule) return 'calculated';
    if (opts.hasRecords) return 'present';
    return 'no_records';
  }

  private calculateLateMinutes(actual: Date | null, expected: Date | null, tolerance: number): number {
    if (!actual || !expected) return 0;
    return Math.max(Math.floor((actual.getTime() - expected.getTime()) / 60000) - tolerance, 0);
  }

  private calculateEarlyDepartureMinutes(actual: Date | null, expected: Date | null, tolerance: number): number {
    if (!actual || !expected) return 0;
    return Math.max(Math.floor((expected.getTime() - actual.getTime()) / 60000) - tolerance, 0);
  }

  private recordsForSchedule(
    employeeGroups: Map<string, AttendanceRecord[]> | undefined,
    date: string,
    schedule: ResolvedScheduleForDate,
  ): AttendanceRecord[] {
    if (!employeeGroups) {
      return [];
    }
    if (schedule.intervals.length === 0) {
      return employeeGroups.get(date) ?? [];
    }

    const firstInterval = schedule.intervals[0];
    const lastInterval = schedule.intervals[schedule.intervals.length - 1];
    const windowStart = new Date(firstInterval.entryDateTime.getTime() - 4 * 60 * 60 * 1000);
    const windowEnd = new Date(lastInterval.exitDateTime.getTime() + 6 * 60 * 60 * 1000);
    const candidates = [
      ...(employeeGroups.get(this.addDays(date, -1)) ?? []),
      ...(employeeGroups.get(date) ?? []),
      ...(employeeGroups.get(this.addDays(date, 1)) ?? []),
    ];

    return candidates
      .filter((record) => record.timestamp >= windowStart && record.timestamp <= windowEnd)
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }

  private async syncAutomaticTimeBank(
    summaries: AttendanceDaySummary[],
    employees: Employee[],
  ): Promise<void> {
    const summaryIds = summaries.map((summary) => summary.id).filter(Boolean);
    if (summaryIds.length === 0) {
      return;
    }

    await this.timeBankLedgerRepo
      .createQueryBuilder()
      .delete()
      .where('attendance_day_summary_id IN (:...summaryIds)', { summaryIds })
      .andWhere('source IN (:...sources)', { sources: ['overtime', 'deficit'] })
      .execute();

    const employeesById = new Map(employees.map((employee) => [employee.id, employee]));
    const entries: EmployeeTimeBankLedger[] = [];

    for (const summary of summaries) {
      const employee = employeesById.get(summary.employeeId);
      if (!employee || summary.hasIncompleteRecord) {
        continue;
      }
      // timeBankEnabled y timeBankMode son propiedades del perfil, no dependen de la fecha,
      // por lo que se leen directamente del perfil en lugar de recalcular el horario completo.
      const profile = (employee as Employee & { scheduleProfile?: { timeBankEnabled?: boolean; timeBankMode?: string } }).scheduleProfile;
      const timeBankEnabled = Boolean(profile?.timeBankEnabled);
      const timeBankMode = timeBankEnabled ? (profile?.timeBankMode ?? 'overtime_only') : 'none';
      if (!timeBankEnabled || timeBankMode === 'none') {
        continue;
      }
      if (summary.overtimeMinutes > 0) {
        entries.push(this.timeBankLedgerRepo.create({
          companyId: summary.companyId,
          employeeId: summary.employeeId,
          date: summary.date,
          attendanceDaySummaryId: summary.id,
          type: 'credit',
          minutes: summary.overtimeMinutes,
          source: 'overtime',
          reason: 'Horas extra simples generadas por recálculo de asistencia.',
          createdByUserId: null,
        }));
      }
      const deficitMinutes = Math.max(summary.expectedMinutes - summary.workedMinutes, 0);
      if (timeBankMode === 'overtime_and_deficit' && summary.hasRecords && deficitMinutes > 0) {
        entries.push(this.timeBankLedgerRepo.create({
          companyId: summary.companyId,
          employeeId: summary.employeeId,
          date: summary.date,
          attendanceDaySummaryId: summary.id,
          type: 'debit',
          minutes: -deficitMinutes,
          source: 'deficit',
          reason: 'Déficit de minutos generado por recálculo de asistencia.',
          createdByUserId: null,
        }));
      }
    }

    if (entries.length > 0) {
      await this.timeBankLedgerRepo.save(entries);
    }
  }

  private addDays(date: string, amount: number): string {
    const value = new Date(`${date}T12:00:00.000-03:00`);
    value.setUTCDate(value.getUTCDate() + amount);
    return value.toISOString().slice(0, 10);
  }

  private isArgentinaWeekend(date: string): boolean {
    const code = this.dayCode(date);
    return code === 'sat' || code === 'sun';
  }

  private dayCode(date: string): string {
    const day = new Date(`${date}T12:00:00.000-03:00`).getUTCDay();
    return ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'][day];
  }

  private resolvePrimaryDevice(
    records: AttendanceRecord[],
    devicesById: Map<number, Device>,
  ): Device | null {
    const counts = new Map<number, number>();

    for (const record of records) {
      if (!record.deviceId) {
        continue;
      }
      counts.set(record.deviceId, (counts.get(record.deviceId) ?? 0) + 1);
    }

    let primaryDeviceId: number | null = null;
    let max = 0;
    for (const [deviceId, count] of counts.entries()) {
      if (count > max) {
        primaryDeviceId = deviceId;
        max = count;
      }
    }

    return primaryDeviceId ? devicesById.get(primaryDeviceId) ?? null : null;
  }

  private summaryKey(employeeId: string, date: string): string {
    return `${employeeId}|${date}`;
  }
}
