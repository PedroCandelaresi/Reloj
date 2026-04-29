import { Company } from './company.entity';
import { ScheduleProfileDayRule, ScheduleProfileSeason } from './schedule-profile-day-rule.entity';
import { ScheduleProfile } from './schedule-profile.entity';
import { Employee } from '../employees/employee.entity';

export type ResolvedScheduleSource =
  | 'day_rule_summer'
  | 'day_rule_winter'
  | 'day_rule_normal'
  | 'legacy_profile'
  | 'no_schedule';

export interface ResolvedScheduleForDate {
  isWorkday: boolean;
  entryTime: string | null;
  exitTime: string | null;
  expectedMinutes: number;
  breakMinutes: number;
  lateToleranceMinutes: number;
  earlyDepartureToleranceMinutes: number;
  overtimeAfterMinutes: number;
  source: ResolvedScheduleSource;
}

const DEFAULT_WORK_DAYS = ['mon', 'tue', 'wed', 'thu', 'fri'];
const DAY_CODE_TO_NUMBER: Record<string, number> = {
  mon: 1,
  tue: 2,
  wed: 3,
  thu: 4,
  fri: 5,
  sat: 6,
  sun: 7,
};
const DAY_NUMBER_TO_CODE: Record<number, string> = {
  1: 'mon',
  2: 'tue',
  3: 'wed',
  4: 'thu',
  5: 'fri',
  6: 'sat',
  7: 'sun',
};

export function dayOfWeekArgentina(date: string): number {
  const day = new Date(`${date}T12:00:00.000-03:00`).getUTCDay();
  return day === 0 ? 7 : day;
}

export function dayCodeArgentina(date: string): string {
  return DAY_NUMBER_TO_CODE[dayOfWeekArgentina(date)] ?? 'mon';
}

export function dayNumberFromWorkDayCode(code: string): number | null {
  return DAY_CODE_TO_NUMBER[code] ?? null;
}

export function resolveScheduleForDate(
  employee: Employee,
  date: string,
  company: Company | null,
): ResolvedScheduleForDate {
  const profile = employee.scheduleProfile as
    | (ScheduleProfile & { dayRules?: ScheduleProfileDayRule[] })
    | null
    | undefined;

  if (!profile && !employee.entryTime && !employee.exitTime && !company?.defaultEntryTime && !company?.defaultExitTime) {
    return emptySchedule('no_schedule');
  }

  const dayOfWeek = dayOfWeekArgentina(date);
  const season = resolveSeason(profile, date);
  const dayRule = findRule(profile?.dayRules, dayOfWeek, season) ?? findRule(profile?.dayRules, dayOfWeek, 'normal');

  if (dayRule) {
    return scheduleFromRule(dayRule, profile, season);
  }

  return legacySchedule(employee, profile, company, date, season);
}

function scheduleFromRule(
  rule: ScheduleProfileDayRule,
  profile: ScheduleProfile | null | undefined,
  season: ScheduleProfileSeason,
): ResolvedScheduleForDate {
  if (!rule.isWorkday) {
    return {
      ...emptySchedule(rule.season === 'normal' ? 'day_rule_normal' : rule.season === 'summer' ? 'day_rule_summer' : 'day_rule_winter'),
      lateToleranceMinutes: rule.lateToleranceMinutes ?? profile?.lateToleranceMinutes ?? 0,
      earlyDepartureToleranceMinutes: rule.earlyDepartureToleranceMinutes ?? profile?.earlyDepartureToleranceMinutes ?? 0,
      breakMinutes: rule.breakMinutes ?? profile?.breakMinutes ?? 0,
      overtimeAfterMinutes: rule.overtimeAfterMinutes ?? profile?.overtimeAfterMinutes ?? 0,
    };
  }

  const entryTime = rule.entryTime ?? null;
  const exitTime = rule.exitTime ?? null;
  if (!entryTime || !exitTime) {
    return emptySchedule('no_schedule');
  }

  const breakMinutes = rule.breakMinutes ?? profile?.breakMinutes ?? 0;
  const expectedMinutes = rule.expectedMinutes ?? Math.max(minutesFromTime(exitTime) - minutesFromTime(entryTime) - breakMinutes, 0);
  const source = rule.season === 'normal'
    ? 'day_rule_normal'
    : season === 'summer'
      ? 'day_rule_summer'
      : 'day_rule_winter';

  return {
    isWorkday: true,
    entryTime,
    exitTime,
    expectedMinutes,
    breakMinutes,
    lateToleranceMinutes: rule.lateToleranceMinutes ?? profile?.lateToleranceMinutes ?? 0,
    earlyDepartureToleranceMinutes: rule.earlyDepartureToleranceMinutes ?? profile?.earlyDepartureToleranceMinutes ?? 0,
    overtimeAfterMinutes: rule.overtimeAfterMinutes ?? profile?.overtimeAfterMinutes ?? 0,
    source,
  };
}

function legacySchedule(
  employee: Employee,
  profile: ScheduleProfile | null | undefined,
  company: Company | null,
  date: string,
  season: ScheduleProfileSeason,
): ResolvedScheduleForDate {
  const entryTime =
    season === 'summer' && profile?.summerEntryTime
      ? profile.summerEntryTime
      : season === 'winter' && profile?.winterEntryTime
        ? profile.winterEntryTime
        : profile?.entryTime ?? employee.entryTime ?? company?.defaultEntryTime ?? null;
  const exitTime =
    season === 'summer' && profile?.summerExitTime
      ? profile.summerExitTime
      : season === 'winter' && profile?.winterExitTime
        ? profile.winterExitTime
        : profile?.exitTime ?? employee.exitTime ?? company?.defaultExitTime ?? null;

  if (!entryTime || !exitTime) {
    return emptySchedule('no_schedule');
  }

  const workDays = profile?.workDays?.length
    ? profile.workDays
    : company?.defaultWorkDays?.length
      ? company.defaultWorkDays
      : DEFAULT_WORK_DAYS;
  const isWorkday = workDays.includes(dayCodeArgentina(date));
  const breakMinutes = profile?.breakMinutes ?? 0;
  const expectedMinutes =
    profile?.expectedMinutesPerDay ?? Math.max(minutesFromTime(exitTime) - minutesFromTime(entryTime) - breakMinutes, 0);

  return {
    isWorkday,
    entryTime: isWorkday ? entryTime : null,
    exitTime: isWorkday ? exitTime : null,
    expectedMinutes: isWorkday ? expectedMinutes : 0,
    breakMinutes,
    lateToleranceMinutes: profile?.lateToleranceMinutes ?? 0,
    earlyDepartureToleranceMinutes: profile?.earlyDepartureToleranceMinutes ?? 0,
    overtimeAfterMinutes: profile?.overtimeAfterMinutes ?? 0,
    source: 'legacy_profile',
  };
}

function findRule(
  rules: ScheduleProfileDayRule[] | null | undefined,
  dayOfWeek: number,
  season: ScheduleProfileSeason,
): ScheduleProfileDayRule | null {
  return rules?.find((rule) => rule.dayOfWeek === dayOfWeek && rule.season === season) ?? null;
}

function resolveSeason(profile: ScheduleProfile | null | undefined, date: string): ScheduleProfileSeason {
  const monthDay = date.slice(5, 10);
  if (profile?.summerStart && profile.summerEnd && isMonthDayInRange(monthDay, profile.summerStart, profile.summerEnd)) {
    return 'summer';
  }
  if (profile?.winterStart && profile.winterEnd && isMonthDayInRange(monthDay, profile.winterStart, profile.winterEnd)) {
    return 'winter';
  }
  return 'normal';
}

function isMonthDayInRange(value: string, start: string, end: string): boolean {
  if (start <= end) {
    return value >= start && value <= end;
  }
  return value >= start || value <= end;
}

function emptySchedule(source: ResolvedScheduleSource): ResolvedScheduleForDate {
  return {
    isWorkday: false,
    entryTime: null,
    exitTime: null,
    expectedMinutes: 0,
    breakMinutes: 0,
    lateToleranceMinutes: 0,
    earlyDepartureToleranceMinutes: 0,
    overtimeAfterMinutes: 0,
    source,
  };
}

function minutesFromTime(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}
