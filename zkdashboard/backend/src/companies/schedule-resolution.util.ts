import { Company } from './company.entity';
import { ScheduleProfileDayInterval } from './schedule-profile-day-interval.entity';
import { ScheduleProfileDayRule, ScheduleProfileSeason } from './schedule-profile-day-rule.entity';
import { ScheduleProfile } from './schedule-profile.entity';
import { Employee } from '../employees/employee.entity';

export type ResolvedScheduleSource =
  | 'day_rule_summer'
  | 'day_rule_winter'
  | 'day_rule_normal'
  | 'day_rule_weekly'
  | 'day_rule_daily_cycle'
  | 'legacy_profile'
  | 'no_schedule';

export interface ResolvedScheduleInterval {
  entryDateTime: Date;
  exitDateTime: Date;
  entryTime: string;
  exitTime: string;
  crossesMidnight: boolean;
  expectedMinutes: number;
}

export interface ResolvedScheduleForDate {
  isWorkday: boolean;
  date: string;
  scheduleProfileId: string | null;
  ruleId: string | null;
  season: ScheduleProfileSeason;
  cycleWeek: number | null;
  cycleDay: number | null;
  entryTime: string | null;
  exitTime: string | null;
  isSplitShift: boolean;
  secondEntryTime: string | null;
  secondExitTime: string | null;
  intervals: ResolvedScheduleInterval[];
  expectedMinutes: number;
  breakMinutes: number;
  lateToleranceMinutes: number;
  earlyDepartureToleranceMinutes: number;
  overtimeAfterMinutes: number;
  timeBankEnabled: boolean;
  timeBankMode: 'none' | 'overtime_only' | 'overtime_and_deficit';
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

type ProfileWithRules = ScheduleProfile & { dayRules?: Array<ScheduleProfileDayRule & { intervals?: ScheduleProfileDayInterval[] }> };

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
  const profile = employee.scheduleProfile as ProfileWithRules | null | undefined;

  if (!profile && !employee.entryTime && !employee.exitTime && !company?.defaultEntryTime && !company?.defaultExitTime) {
    return emptySchedule('no_schedule', date, profile, 'normal', null, null);
  }

  const season = resolveSeason(profile, date);
  const rotation = resolveRotation(profile, date);
  const dayOfWeek = dayOfWeekArgentina(date);
  const dayRule = findScheduleRule(profile?.dayRules, {
    season,
    dayOfWeek,
    cycleWeek: rotation.cycleWeek,
    cycleDay: rotation.cycleDay,
    rotationMode: profile?.rotationMode ?? 'none',
  });

  if (dayRule) {
    return scheduleFromRule(dayRule, profile, season, date, rotation.cycleWeek, rotation.cycleDay);
  }

  return legacySchedule(employee, profile, company, date, season);
}

function scheduleFromRule(
  rule: ScheduleProfileDayRule & { intervals?: ScheduleProfileDayInterval[] },
  profile: ProfileWithRules | null | undefined,
  season: ScheduleProfileSeason,
  date: string,
  cycleWeek: number | null,
  cycleDay: number | null,
): ResolvedScheduleForDate {
  const source = resolveRuleSource(rule, profile?.rotationMode ?? 'none', season);

  if (!rule.isWorkday) {
    return {
      ...emptySchedule(source, date, profile, season, cycleWeek, cycleDay),
      scheduleProfileId: profile?.id ?? null,
      ruleId: rule.id,
      lateToleranceMinutes: rule.lateToleranceMinutes ?? profile?.lateToleranceMinutes ?? 0,
      earlyDepartureToleranceMinutes: rule.earlyDepartureToleranceMinutes ?? profile?.earlyDepartureToleranceMinutes ?? 0,
      breakMinutes: rule.breakMinutes ?? profile?.breakMinutes ?? 0,
      overtimeAfterMinutes: rule.overtimeAfterMinutes ?? profile?.overtimeAfterMinutes ?? 0,
    };
  }

  const intervalInputs = intervalsForRule(rule);
  if (intervalInputs.length === 0) {
    return emptySchedule('no_schedule', date, profile, season, cycleWeek, cycleDay);
  }

  const intervals = intervalInputs.map((interval) => resolveInterval(date, interval));
  const breakMinutes = rule.breakMinutes ?? profile?.breakMinutes ?? 0;
  const expectedMinutes = rule.expectedMinutes ?? Math.max(
    intervals.reduce((total, interval) => total + interval.expectedMinutes, 0) - breakMinutes,
    0,
  );
  const firstInterval = intervals[0];
  const lastInterval = intervals[intervals.length - 1];
  const secondInterval = intervals[1] ?? null;

  return {
    isWorkday: true,
    date,
    scheduleProfileId: profile?.id ?? null,
    ruleId: rule.id,
    season,
    cycleWeek,
    cycleDay,
    entryTime: firstInterval.entryTime,
    exitTime: lastInterval.exitTime,
    isSplitShift: intervals.length > 1,
    secondEntryTime: secondInterval?.entryTime ?? null,
    secondExitTime: secondInterval?.exitTime ?? null,
    intervals,
    expectedMinutes,
    breakMinutes,
    lateToleranceMinutes: rule.lateToleranceMinutes ?? profile?.lateToleranceMinutes ?? 0,
    earlyDepartureToleranceMinutes: rule.earlyDepartureToleranceMinutes ?? profile?.earlyDepartureToleranceMinutes ?? 0,
    overtimeAfterMinutes: rule.overtimeAfterMinutes ?? profile?.overtimeAfterMinutes ?? 0,
    timeBankEnabled: Boolean(profile?.timeBankEnabled),
    timeBankMode: profile?.timeBankEnabled ? profile.timeBankMode ?? 'overtime_only' : 'none',
    source,
  };
}

function legacySchedule(
  employee: Employee,
  profile: ProfileWithRules | null | undefined,
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
    return emptySchedule('no_schedule', date, profile, season, null, null);
  }

  const workDays = profile?.workDays?.length
    ? profile.workDays
    : company?.defaultWorkDays?.length
      ? company.defaultWorkDays
      : DEFAULT_WORK_DAYS;
  const isWorkday = workDays.includes(dayCodeArgentina(date));
  const breakMinutes = profile?.breakMinutes ?? 0;
  const interval = resolveInterval(date, {
    entryTime,
    exitTime,
    crossesMidnight: exitTime < entryTime,
    expectedMinutes: null,
  });
  const expectedMinutes = profile?.expectedMinutesPerDay ?? Math.max(interval.expectedMinutes - breakMinutes, 0);

  return {
    isWorkday,
    date,
    scheduleProfileId: profile?.id ?? null,
    ruleId: null,
    season,
    cycleWeek: null,
    cycleDay: null,
    entryTime: isWorkday ? entryTime : null,
    exitTime: isWorkday ? exitTime : null,
    isSplitShift: false,
    secondEntryTime: null,
    secondExitTime: null,
    intervals: isWorkday ? [interval] : [],
    expectedMinutes: isWorkday ? expectedMinutes : 0,
    breakMinutes,
    lateToleranceMinutes: profile?.lateToleranceMinutes ?? 0,
    earlyDepartureToleranceMinutes: profile?.earlyDepartureToleranceMinutes ?? 0,
    overtimeAfterMinutes: profile?.overtimeAfterMinutes ?? 0,
    timeBankEnabled: Boolean(profile?.timeBankEnabled),
    timeBankMode: profile?.timeBankEnabled ? profile.timeBankMode ?? 'overtime_only' : 'none',
    source: 'legacy_profile',
  };
}

function findScheduleRule(
  rules: Array<ScheduleProfileDayRule & { intervals?: ScheduleProfileDayInterval[] }> | null | undefined,
  opts: {
    season: ScheduleProfileSeason;
    dayOfWeek: number;
    cycleWeek: number | null;
    cycleDay: number | null;
    rotationMode: string;
  },
): (ScheduleProfileDayRule & { intervals?: ScheduleProfileDayInterval[] }) | null {
  if (!rules?.length) return null;
  const seasons: ScheduleProfileSeason[] = opts.season === 'normal' ? ['normal'] : [opts.season, 'normal'];

  if (opts.rotationMode === 'weekly' && opts.cycleWeek) {
    for (const season of seasons) {
      const match = rules.find((rule) => rule.season === season && rule.cycleWeek === opts.cycleWeek && rule.dayOfWeek === opts.dayOfWeek);
      if (match) return match;
    }
  }

  if (opts.rotationMode === 'daily_cycle' && opts.cycleDay) {
    for (const season of seasons) {
      const match = rules.find((rule) => rule.season === season && rule.cycleDay === opts.cycleDay);
      if (match) return match;
    }
  }

  for (const season of seasons) {
    const match = rules.find((rule) => rule.season === season && rule.cycleWeek == null && rule.cycleDay == null && rule.dayOfWeek === opts.dayOfWeek);
    if (match) return match;
  }

  return null;
}

function resolveRotation(profile: ProfileWithRules | null | undefined, date: string): { cycleWeek: number | null; cycleDay: number | null } {
  if (!profile?.rotationMode || profile.rotationMode === 'none' || !profile.rotationStartDate) {
    return { cycleWeek: null, cycleDay: null };
  }

  const days = diffArgentinaDays(profile.rotationStartDate, date);
  if (days < 0) {
    return { cycleWeek: null, cycleDay: null };
  }

  if (profile.rotationMode === 'weekly' && profile.rotationLengthWeeks) {
    return { cycleWeek: Math.floor(days / 7) % profile.rotationLengthWeeks + 1, cycleDay: null };
  }

  if (profile.rotationMode === 'daily_cycle' && profile.rotationLengthDays) {
    return { cycleWeek: null, cycleDay: days % profile.rotationLengthDays + 1 };
  }

  return { cycleWeek: null, cycleDay: null };
}

function resolveRuleSource(rule: ScheduleProfileDayRule, rotationMode: string, season: ScheduleProfileSeason): ResolvedScheduleSource {
  if (rotationMode === 'weekly' && rule.cycleWeek) return 'day_rule_weekly';
  if (rotationMode === 'daily_cycle' && rule.cycleDay) return 'day_rule_daily_cycle';
  if (rule.season === 'normal') return 'day_rule_normal';
  return season === 'summer' ? 'day_rule_summer' : 'day_rule_winter';
}

function intervalsForRule(rule: ScheduleProfileDayRule & { intervals?: ScheduleProfileDayInterval[] }) {
  if (rule.intervals?.length) {
    return rule.intervals
      .slice()
      .sort((a, b) => a.sequence - b.sequence)
      .map((interval) => ({
        entryTime: interval.entryTime,
        exitTime: interval.exitTime,
        crossesMidnight: interval.crossesMidnight,
        expectedMinutes: interval.expectedMinutes,
      }));
  }

  return [
    ...(rule.entryTime && rule.exitTime
      ? [{ entryTime: rule.entryTime, exitTime: rule.exitTime, crossesMidnight: rule.exitTime < rule.entryTime, expectedMinutes: null }]
      : []),
    ...(rule.isSplitShift && rule.secondEntryTime && rule.secondExitTime
      ? [{ entryTime: rule.secondEntryTime, exitTime: rule.secondExitTime, crossesMidnight: rule.secondExitTime < rule.secondEntryTime, expectedMinutes: null }]
      : []),
  ];
}

function resolveInterval(date: string, interval: { entryTime: string; exitTime: string; crossesMidnight?: boolean; expectedMinutes?: number | null }): ResolvedScheduleInterval {
  const crossesMidnight = Boolean(interval.crossesMidnight || interval.exitTime < interval.entryTime);
  const entryDateTime = dateTimeFor(date, interval.entryTime, 0);
  const exitDateTime = dateTimeFor(date, interval.exitTime, crossesMidnight ? 1 : 0);
  const minutes = interval.expectedMinutes ?? Math.max(Math.floor((exitDateTime.getTime() - entryDateTime.getTime()) / 60000), 0);

  return {
    entryDateTime,
    exitDateTime,
    entryTime: interval.entryTime,
    exitTime: interval.exitTime,
    crossesMidnight,
    expectedMinutes: minutes,
  };
}

function resolveSeason(profile: ProfileWithRules | null | undefined, date: string): ScheduleProfileSeason {
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

function emptySchedule(
  source: ResolvedScheduleSource,
  date: string,
  profile: ProfileWithRules | null | undefined,
  season: ScheduleProfileSeason,
  cycleWeek: number | null,
  cycleDay: number | null,
): ResolvedScheduleForDate {
  return {
    isWorkday: false,
    date,
    scheduleProfileId: profile?.id ?? null,
    ruleId: null,
    season,
    cycleWeek,
    cycleDay,
    entryTime: null,
    exitTime: null,
    isSplitShift: false,
    secondEntryTime: null,
    secondExitTime: null,
    intervals: [],
    expectedMinutes: 0,
    breakMinutes: 0,
    lateToleranceMinutes: 0,
    earlyDepartureToleranceMinutes: 0,
    overtimeAfterMinutes: 0,
    timeBankEnabled: Boolean(profile?.timeBankEnabled),
    timeBankMode: profile?.timeBankEnabled ? profile.timeBankMode ?? 'overtime_only' : 'none',
    source,
  };
}

function dateTimeFor(date: string, time: string, addDays: number): Date {
  const base = new Date(`${date}T${time}:00.000-03:00`);
  if (addDays > 0) {
    base.setUTCDate(base.getUTCDate() + addDays);
  }
  return base;
}

function diffArgentinaDays(startDate: string, endDate: string): number {
  const start = new Date(`${startDate}T12:00:00.000-03:00`);
  const end = new Date(`${endDate}T12:00:00.000-03:00`);
  return Math.floor((end.getTime() - start.getTime()) / 86400000);
}
