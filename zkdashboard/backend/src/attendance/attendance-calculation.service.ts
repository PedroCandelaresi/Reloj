import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { AttendanceRecord } from './attendance.entity';
import {
  AttendanceDaySummary,
  AttendanceDaySummaryStatus,
} from './entities/attendance-day-summary.entity';
import { Employee } from '../employees/employee.entity';
import { Device } from '../devices/device.entity';
import { Company } from '../companies/company.entity';
import { ScheduleProfile } from '../companies/schedule-profile.entity';
import { Holiday } from './entities/holiday.entity';
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

interface ExpectedSchedule {
  entryTime: string;
  exitTime: string;
  lateToleranceMinutes: number;
  earlyDepartureToleranceMinutes: number;
  expectedMinutes: number;
  breakMinutes: number;
  overtimeAfterMinutes: number;
  workDays: string[];
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
        const records = employeeGroups?.get(date) ?? [];
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

        this.applyRecordsToSummary(summary, records, devicesById, employee, company, holidays.get(date) ?? null);
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
      await this.summariesRepo.save(toSave);
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
      .andWhere('record.timestamp >= :dateFrom', { dateFrom: parseArgentinaDateStart(dateFrom) })
      .andWhere('record.timestamp <= :dateTo', { dateTo: parseArgentinaDateEnd(dateTo) })
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
    records: AttendanceRecord[],
    devicesById: Map<number, Device>,
    employee: Employee,
    company: Company | null,
    holiday: Holiday | null,
  ): void {
    const pairing = this.pairing.summarize(
      records.map((record) => ({
        timestamp: record.timestamp,
        deviceSn: record.deviceSn,
        deviceId: record.deviceId,
      })),
    );
    const primaryDevice = this.resolvePrimaryDevice(records, devicesById);
    const hasRecords = pairing.punchCount > 0;
    const schedule = this.resolveExpectedSchedule(employee, company);
    const isHoliday = Boolean(holiday && !holiday.isWorkable);
    const isWorkDay = schedule ? this.isWorkDay(summary.date, schedule.workDays) : false;
    const isWeekend = schedule ? !isWorkDay : this.isArgentinaWeekend(summary.date);
    const expectedEntry = schedule ? this.dateTimeFor(summary.date, schedule.entryTime) : null;
    const expectedExit = schedule ? this.dateTimeFor(summary.date, schedule.exitTime) : null;
    const workedMinutes = pairing.isIncomplete ? 0 : pairing.workedMinutes;

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
    summary.expectedMinutes = schedule?.expectedMinutes ?? 0;
    summary.lateMinutes = this.calculateLateMinutes(pairing.firstPunch, expectedEntry, schedule?.lateToleranceMinutes ?? 0);
    summary.earlyDepartureMinutes =
      pairing.isIncomplete
        ? 0
        : this.calculateEarlyDepartureMinutes(pairing.lastPunch, expectedExit, schedule?.earlyDepartureToleranceMinutes ?? 0);
    summary.overtimeMinutes =
      schedule && schedule.expectedMinutes > 0
        ? Math.max(workedMinutes - schedule.expectedMinutes - schedule.overtimeAfterMinutes, 0)
        : 0;
    summary.isHoliday = isHoliday;
    summary.isWeekend = !isHoliday && isWeekend;
    summary.isAbsent = Boolean(schedule && isWorkDay && !isHoliday && !hasRecords);
    summary.status = this.resolveStatus({
      hasRecords,
      isIncomplete: pairing.isIncomplete,
      hasSchedule: Boolean(schedule),
      isAbsent: summary.isAbsent,
      isHoliday: summary.isHoliday,
      isWeekend: summary.isWeekend,
    });
    summary.calculatedAt = new Date();
  }

  private resolveExpectedSchedule(employee: Employee, company: Company | null): ExpectedSchedule | null {
    const profile = employee.scheduleProfile as ScheduleProfile | null | undefined;
    const entryTime = profile?.entryTime ?? employee.entryTime ?? company?.defaultEntryTime ?? null;
    const exitTime = profile?.exitTime ?? employee.exitTime ?? company?.defaultExitTime ?? null;

    if (!entryTime || !exitTime) {
      return null;
    }

    const breakMinutes = profile?.breakMinutes ?? 0;
    const expectedMinutes =
      profile?.expectedMinutesPerDay ??
      Math.max(this.minutesFromTime(exitTime) - this.minutesFromTime(entryTime) - breakMinutes, 0);

    return {
      entryTime,
      exitTime,
      lateToleranceMinutes: profile?.lateToleranceMinutes ?? 0,
      earlyDepartureToleranceMinutes: profile?.earlyDepartureToleranceMinutes ?? 0,
      expectedMinutes,
      breakMinutes,
      overtimeAfterMinutes: profile?.overtimeAfterMinutes ?? 0,
      workDays: profile?.workDays?.length ? profile.workDays : ['mon', 'tue', 'wed', 'thu', 'fri'],
    };
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

  private dateTimeFor(date: string, time: string): Date {
    return new Date(`${date}T${time}:00.000-03:00`);
  }

  private isWorkDay(date: string, workDays: string[]): boolean {
    return workDays.includes(this.dayCode(date));
  }

  private isArgentinaWeekend(date: string): boolean {
    const code = this.dayCode(date);
    return code === 'sat' || code === 'sun';
  }

  private dayCode(date: string): string {
    const day = new Date(`${date}T12:00:00.000-03:00`).getUTCDay();
    return ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'][day];
  }

  private minutesFromTime(time: string): number {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
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
