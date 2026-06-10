'use client';

import { useMemo, useState, useTransition } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import {
  deleteScheduleProfileAction,
  saveScheduleProfileAction,
} from '@/app/(protected)/settings/actions';
import type { ScheduleProfile, ScheduleProfileDayRule, ScheduleProfileSeason } from '@/lib/api';
import { displayDateToIso, displayToMonthDay, isoToDisplayDate, maskDateInput, maskDayMonthInput, maskTimeInput, monthDayToDisplay } from '@/lib/input-masks';
import { humanizeActionError } from '@/lib/ux-labels';

type EditableDayRule = Omit<ScheduleProfileDayRule, 'id' | 'scheduleProfileId' | 'createdAt' | 'updatedAt'>;

type FormValues = {
  id: string;
  name: string;
  scheduleMode: 'single' | 'seasonal' | 'weekly' | 'daily_cycle';
  rotationStartDate: string;
  rotationLengthWeeks: string;
  rotationLengthDays: string;
  timeBankEnabled: boolean;
  timeBankMode: 'none' | 'overtime_only' | 'overtime_and_deficit';
  entryTime: string;
  exitTime: string;
  summerEntryTime: string;
  summerExitTime: string;
  summerStart: string;
  summerEnd: string;
  winterEntryTime: string;
  winterExitTime: string;
  winterStart: string;
  winterEnd: string;
  lateToleranceMinutes: string;
  earlyDepartureToleranceMinutes: string;
  expectedMinutesPerDay: string;
  breakMinutes: string;
  overtimeAfterMinutes: string;
  workDays: string[];
  dayRules: EditableDayRule[];
};

const DAYS = [
  { value: 1, code: 'mon', label: 'Lunes' },
  { value: 2, code: 'tue', label: 'Martes' },
  { value: 3, code: 'wed', label: 'Miércoles' },
  { value: 4, code: 'thu', label: 'Jueves' },
  { value: 5, code: 'fri', label: 'Viernes' },
  { value: 6, code: 'sat', label: 'Sábado' },
  { value: 7, code: 'sun', label: 'Domingo' },
] as const;

const SEASONS: Array<{ value: ScheduleProfileSeason; label: string }> = [
  { value: 'normal', label: 'Todo el año' },
  { value: 'summer', label: 'Verano' },
  { value: 'winter', label: 'Invierno' },
];

const DEFAULT_WORK_DAYS = ['mon', 'tue', 'wed', 'thu', 'fri'];

function timeToMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

function hasOverlappingIntervals(
  intervals: Array<{ entryTime: string; exitTime: string; crossesMidnight?: boolean }>,
): boolean {
  if (intervals.length < 2) return false;
  const abs = intervals.map((interval) => {
    const entry = timeToMinutes(interval.entryTime);
    const rawExit = timeToMinutes(interval.exitTime);
    const cm = Boolean(interval.crossesMidnight) || rawExit <= entry;
    return { entry, exit: cm ? rawExit + 1440 : rawExit, cm };
  });
  abs.sort((a, b) => a.entry - b.entry);
  for (let i = 0; i < abs.length; i++) {
    for (let j = i + 1; j < abs.length; j++) {
      const a = abs[i];
      const b = abs[j];
      if (b.entry < a.exit) return true;
      if (b.cm && b.exit - 1440 > 0 && a.entry < b.exit - 1440) return true;
    }
  }
  return false;
}

function minutesBetween(entryTime: string, exitTime: string, breakMinutes: number) {
  if (!entryTime || !exitTime) return null;
  const [entryHours, entryMinutes] = entryTime.split(':').map(Number);
  const [exitHours, exitMinutes] = exitTime.split(':').map(Number);
  const entry = entryHours * 60 + entryMinutes;
  let exit = exitHours * 60 + exitMinutes;
  if (exit < entry) exit += 24 * 60;
  const diff = exit - entry - breakMinutes;
  return Math.max(diff, 0);
}

function expectedMinutesForRule(rule: Partial<EditableDayRule>) {
  const intervals = rule.intervals?.length
    ? rule.intervals
    : [
        ...(rule.entryTime && rule.exitTime ? [{ entryTime: rule.entryTime, exitTime: rule.exitTime }] : []),
        ...(rule.isSplitShift && rule.secondEntryTime && rule.secondExitTime ? [{ entryTime: rule.secondEntryTime, exitTime: rule.secondExitTime }] : []),
      ];
  if (!intervals.length) return rule.expectedMinutes ?? 0;
  const total = intervals.reduce((sum, interval) => sum + (minutesBetween(interval.entryTime, interval.exitTime, 0) ?? 0), 0);
  return Math.max(total - (rule.breakMinutes ?? 0), 0);
}

function makeRulesFromValues(values: {
  entryTime: string;
  exitTime: string;
  lateToleranceMinutes: string;
  earlyDepartureToleranceMinutes: string;
  expectedMinutesPerDay: string;
  breakMinutes: string;
  overtimeAfterMinutes: string;
  workDays: string[];
}, season: ScheduleProfileSeason = 'normal'): EditableDayRule[] {
  const breakMinutes = Number.parseInt(values.breakMinutes || '0', 10) || 0;
  const expected = Number.parseInt(values.expectedMinutesPerDay || '', 10);
  return DAYS.map((day) => {
    const isWorkday = values.workDays.includes(day.code);
    return {
      dayOfWeek: day.value,
      season,
      isWorkday,
      entryTime: isWorkday ? values.entryTime || null : null,
      exitTime: isWorkday ? values.exitTime || null : null,
      isSplitShift: false,
      secondEntryTime: null,
      secondExitTime: null,
      intervals: isWorkday
        ? [{ sequence: 1, entryTime: values.entryTime, exitTime: values.exitTime, crossesMidnight: values.exitTime < values.entryTime, expectedMinutes: null }]
        : [],
      breakMinutes,
      expectedMinutes: isWorkday ? (Number.isFinite(expected) ? expected : minutesBetween(values.entryTime, values.exitTime, breakMinutes)) : 0,
      lateToleranceMinutes: Number.parseInt(values.lateToleranceMinutes || '0', 10) || 0,
      earlyDepartureToleranceMinutes: Number.parseInt(values.earlyDepartureToleranceMinutes || '0', 10) || 0,
      overtimeAfterMinutes: Number.parseInt(values.overtimeAfterMinutes || '0', 10) || 0,
      notes: null,
    };
  });
}

function normalizeRules(profile: ScheduleProfile): EditableDayRule[] {
  if (profile.dayRules?.length) {
    return profile.dayRules.map((rule) => ({
      dayOfWeek: rule.dayOfWeek,
      season: rule.season,
      isWorkday: rule.isWorkday,
      entryTime: rule.entryTime,
      exitTime: rule.exitTime,
      isSplitShift: Boolean(rule.isSplitShift),
      secondEntryTime: rule.secondEntryTime ?? null,
      secondExitTime: rule.secondExitTime ?? null,
      intervals: rule.intervals?.length
        ? rule.intervals
        : [
            ...(rule.entryTime && rule.exitTime
              ? [{ sequence: 1, entryTime: rule.entryTime, exitTime: rule.exitTime, crossesMidnight: rule.exitTime < rule.entryTime, expectedMinutes: null }]
              : []),
            ...(rule.isSplitShift && rule.secondEntryTime && rule.secondExitTime
              ? [{ sequence: 2, entryTime: rule.secondEntryTime, exitTime: rule.secondExitTime, crossesMidnight: rule.secondExitTime < rule.secondEntryTime, expectedMinutes: null }]
              : []),
          ],
      breakMinutes: rule.breakMinutes ?? 0,
      expectedMinutes: rule.expectedMinutes ?? null,
      lateToleranceMinutes: rule.lateToleranceMinutes ?? profile.lateToleranceMinutes ?? 0,
      earlyDepartureToleranceMinutes: rule.earlyDepartureToleranceMinutes ?? profile.earlyDepartureToleranceMinutes ?? 0,
      overtimeAfterMinutes: rule.overtimeAfterMinutes ?? profile.overtimeAfterMinutes ?? 0,
      notes: rule.notes ?? null,
    }));
  }

  return makeRulesFromValues({
    entryTime: profile.entryTime,
    exitTime: profile.exitTime,
    lateToleranceMinutes: String(profile.lateToleranceMinutes ?? 0),
    earlyDepartureToleranceMinutes: String(profile.earlyDepartureToleranceMinutes ?? 0),
    expectedMinutesPerDay: profile.expectedMinutesPerDay ? String(profile.expectedMinutesPerDay) : '',
    breakMinutes: String(profile.breakMinutes ?? 0),
    overtimeAfterMinutes: String(profile.overtimeAfterMinutes ?? 0),
    workDays: profile.workDays?.length ? profile.workDays : DEFAULT_WORK_DAYS,
  });
}

const EMPTY_FORM: FormValues = {
  id: '',
  name: '',
  scheduleMode: 'single',
  rotationStartDate: '',
  rotationLengthWeeks: '3',
  rotationLengthDays: '6',
  timeBankEnabled: false,
  timeBankMode: 'overtime_only',
  entryTime: '08:00',
  exitTime: '17:00',
  summerEntryTime: '',
  summerExitTime: '',
  summerStart: '',
  summerEnd: '',
  winterEntryTime: '',
  winterExitTime: '',
  winterStart: '',
  winterEnd: '',
  lateToleranceMinutes: '10',
  earlyDepartureToleranceMinutes: '5',
  expectedMinutesPerDay: '',
  breakMinutes: '0',
  overtimeAfterMinutes: '0',
  workDays: DEFAULT_WORK_DAYS,
  dayRules: makeRulesFromValues({
    entryTime: '08:00',
    exitTime: '17:00',
    lateToleranceMinutes: '10',
    earlyDepartureToleranceMinutes: '5',
    expectedMinutesPerDay: '',
    breakMinutes: '0',
    overtimeAfterMinutes: '0',
    workDays: DEFAULT_WORK_DAYS,
  }),
};

function toFormValues(profile: ScheduleProfile): FormValues {
  const workDays = profile.workDays?.length ? profile.workDays : DEFAULT_WORK_DAYS;
  const rotationMode = profile.rotationMode ?? 'none';
  const hasSeasonalRules = profile.dayRules?.some((rule) => rule.season === 'summer' || rule.season === 'winter') ?? false;
  return {
    id: profile.id,
    name: profile.name,
    scheduleMode: rotationMode === 'weekly' ? 'weekly' : rotationMode === 'daily_cycle' ? 'daily_cycle' : hasSeasonalRules || Boolean(profile.summerStart || profile.summerEnd || profile.winterStart || profile.winterEnd) ? 'seasonal' : 'single',
    rotationStartDate: isoToDisplayDate(profile.rotationStartDate),
    rotationLengthWeeks: String(profile.rotationLengthWeeks ?? 3),
    rotationLengthDays: String(profile.rotationLengthDays ?? 6),
    timeBankEnabled: Boolean(profile.timeBankEnabled),
    timeBankMode: profile.timeBankMode ?? 'overtime_only',
    entryTime: profile.entryTime,
    exitTime: profile.exitTime,
    summerEntryTime: profile.summerEntryTime ?? '',
    summerExitTime: profile.summerExitTime ?? '',
    summerStart: profile.summerStart ?? '',
    summerEnd: profile.summerEnd ?? '',
    winterEntryTime: profile.winterEntryTime ?? '',
    winterExitTime: profile.winterExitTime ?? '',
    winterStart: profile.winterStart ?? '',
    winterEnd: profile.winterEnd ?? '',
    lateToleranceMinutes: String(profile.lateToleranceMinutes ?? 0),
    earlyDepartureToleranceMinutes: String(profile.earlyDepartureToleranceMinutes ?? 0),
    expectedMinutesPerDay: profile.expectedMinutesPerDay ? String(profile.expectedMinutesPerDay) : '',
    breakMinutes: String(profile.breakMinutes ?? 0),
    overtimeAfterMinutes: String(profile.overtimeAfterMinutes ?? 0),
    workDays,
    dayRules: normalizeRules(profile),
  };
}

function profileScheduleMode(profile: ScheduleProfile): FormValues['scheduleMode'] {
  if (profile.rotationMode === 'weekly') return 'weekly';
  if (profile.rotationMode === 'daily_cycle') return 'daily_cycle';
  const hasSeasonalRules = profile.dayRules?.some((rule) => rule.season === 'summer' || rule.season === 'winter') ?? false;
  return hasSeasonalRules || Boolean(profile.summerStart || profile.summerEnd || profile.winterStart || profile.winterEnd)
    ? 'seasonal'
    : 'single';
}

function profileScheduleSummary(profile: ScheduleProfile) {
  const countWorkDays = (season: ScheduleProfileSeason) => {
    const seasonRules = profile.dayRules?.filter((rule) => rule.season === season);
    if (!seasonRules?.length && season === 'normal') return profile.workDays?.length || 5;
    return seasonRules?.filter((rule) => rule.isWorkday).length || 0;
  };

  if (profileScheduleMode(profile) === 'seasonal') {
    return `Verano: ${countWorkDays('summer')} días · Invierno: ${countWorkDays('winter')} días`;
  }
  if (profileScheduleMode(profile) === 'weekly') {
    return `Rotación semanal: ${profile.rotationLengthWeeks ?? 1} semanas`;
  }
  if (profileScheduleMode(profile) === 'daily_cycle') {
    return `Ciclo por días: ${profile.rotationLengthDays ?? 1} días`;
  }

  return `Todo el año: ${countWorkDays('normal')} días laborables`;
}

function ensureSeasonRules(form: FormValues, season: ScheduleProfileSeason): EditableDayRule[] {
  const existing = form.dayRules.filter((rule) => rule.season === season);
  if (existing.length) return existing;

  return makeRulesFromValues(form, season);
}

function ensureWeekRules(form: FormValues, cycleWeek: number): EditableDayRule[] {
  const existing = form.dayRules.filter((rule) => rule.season === 'normal' && rule.cycleWeek === cycleWeek);
  if (existing.length) return existing;
  return makeRulesFromValues(form, 'normal').map((rule) => ({ ...rule, cycleWeek, cycleDay: null }));
}

function ensureCycleDayRules(form: FormValues): EditableDayRule[] {
  const length = Number.parseInt(form.rotationLengthDays || '6', 10) || 6;
  return Array.from({ length }, (_, index) => {
    const cycleDay = index + 1;
    const existing = form.dayRules.find((rule) => rule.season === 'normal' && rule.cycleDay === cycleDay);
    if (existing) return existing;
    const base = makeRulesFromValues(form, 'normal')[0];
    const isWorkday = cycleDay <= Math.max(length - 2, 1);
    return {
      ...base,
      dayOfWeek: null,
      cycleDay,
      cycleWeek: null,
      isWorkday,
      entryTime: isWorkday ? base.entryTime : null,
      exitTime: isWorkday ? base.exitTime : null,
      intervals: isWorkday ? base.intervals : [],
      expectedMinutes: isWorkday ? base.expectedMinutes : 0,
    };
  });
}

export function ScheduleProfilesManager({ profiles }: { profiles: ScheduleProfile[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [form, setForm] = useState<FormValues>(EMPTY_FORM);
  const [activeSeason, setActiveSeason] = useState<ScheduleProfileSeason>('normal');
  const [activeCycleWeek, setActiveCycleWeek] = useState(1);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const isEditing = Boolean(form.id);
  const visibleSeasons = form.scheduleMode === 'single' || form.scheduleMode === 'weekly' || form.scheduleMode === 'daily_cycle'
    ? SEASONS.filter((season) => season.value === 'normal')
    : SEASONS.filter((season) => season.value !== 'normal');
  const activeRules = useMemo(() => {
    if (form.scheduleMode === 'weekly') return ensureWeekRules(form, activeCycleWeek);
    if (form.scheduleMode === 'daily_cycle') return ensureCycleDayRules(form);
    return ensureSeasonRules(form, activeSeason);
  }, [activeCycleWeek, activeSeason, form]);

  const setScheduleMode = (scheduleMode: FormValues['scheduleMode']) => {
    setForm((current) => {
      if (scheduleMode === 'single' || scheduleMode === 'weekly' || scheduleMode === 'daily_cycle') {
        const normalRules = scheduleMode === 'weekly'
          ? Array.from({ length: Number.parseInt(current.rotationLengthWeeks || '3', 10) || 3 }, (_, index) => ensureWeekRules(current, index + 1)).flat()
          : scheduleMode === 'daily_cycle'
            ? ensureCycleDayRules(current)
            : current.dayRules.filter((rule) => rule.season === 'normal' && !rule.cycleWeek && !rule.cycleDay);
        return {
          ...current,
          scheduleMode,
          dayRules: normalRules.length ? normalRules : current.dayRules,
          summerStart: '',
          summerEnd: '',
          winterStart: '',
          winterEnd: '',
          rotationStartDate: scheduleMode === 'single' ? '' : current.rotationStartDate || isoToDisplayDate(new Date().toISOString().slice(0, 10)),
        };
      }
      const normalRules = ensureSeasonRules(current, 'normal');
      const summerRules = current.dayRules.some((rule) => rule.season === 'summer')
        ? current.dayRules.filter((rule) => rule.season === 'summer')
        : normalRules.map((rule) => ({ ...rule, season: 'summer' as const }));
      const winterRules = current.dayRules.some((rule) => rule.season === 'winter')
        ? current.dayRules.filter((rule) => rule.season === 'winter')
        : normalRules.map((rule) => ({ ...rule, season: 'winter' as const }));
      return {
        ...current,
        scheduleMode,
        dayRules: [
          ...current.dayRules.filter((rule) => rule.season === 'normal'),
          ...summerRules,
          ...winterRules,
        ],
        summerStart: current.summerStart || '10-01',
        summerEnd: current.summerEnd || '03-31',
        winterStart: current.winterStart || '04-01',
        winterEnd: current.winterEnd || '09-30',
      };
    });
    setActiveSeason(scheduleMode === 'seasonal' ? 'summer' : 'normal');
    setActiveCycleWeek(1);
  };

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setForm((current) => ({
      ...current,
      [name]: name === 'rotationStartDate' ? maskDateInput(value) : value,
    }));
  };

  const updateRule = (target: EditableDayRule, patch: Partial<EditableDayRule>) => {
    setForm((current) => {
      const seasonRules = form.scheduleMode === 'weekly'
        ? ensureWeekRules(current, activeCycleWeek)
        : form.scheduleMode === 'daily_cycle'
          ? ensureCycleDayRules(current)
          : ensureSeasonRules(current, activeSeason);
      const nextRules = current.dayRules.filter((rule) => !seasonRules.some((candidate) =>
        candidate.season === rule.season &&
        candidate.dayOfWeek === rule.dayOfWeek &&
        candidate.cycleDay === rule.cycleDay &&
        candidate.cycleWeek === rule.cycleWeek));
      const updatedSeasonRules = seasonRules.map((rule) => {
        if (
          rule.dayOfWeek !== target.dayOfWeek ||
          rule.cycleDay !== target.cycleDay ||
          rule.cycleWeek !== target.cycleWeek
        ) return rule;
        const merged = { ...rule, ...patch };
        if (patch.isWorkday === false) {
          merged.entryTime = null;
          merged.exitTime = null;
          merged.isSplitShift = false;
          merged.secondEntryTime = null;
          merged.secondExitTime = null;
          merged.intervals = [];
          merged.expectedMinutes = 0;
        }
        if (patch.intervals !== undefined) {
          const sortedIntervals = patch.intervals
            .slice()
            .sort((a, b) => a.sequence - b.sequence)
            .map((interval, index) => ({ ...interval, sequence: index + 1, crossesMidnight: Boolean(interval.crossesMidnight || interval.exitTime < interval.entryTime) }));
          merged.intervals = sortedIntervals;
          merged.entryTime = sortedIntervals[0]?.entryTime ?? null;
          merged.exitTime = sortedIntervals[0]?.exitTime ?? null;
          merged.isSplitShift = sortedIntervals.length > 1;
          merged.secondEntryTime = sortedIntervals[1]?.entryTime ?? null;
          merged.secondExitTime = sortedIntervals[1]?.exitTime ?? null;
        }
        if (
          patch.entryTime !== undefined ||
          patch.exitTime !== undefined ||
          patch.secondEntryTime !== undefined ||
          patch.secondExitTime !== undefined ||
          patch.intervals !== undefined ||
          patch.breakMinutes !== undefined ||
          patch.isSplitShift !== undefined
        ) {
          merged.expectedMinutes = expectedMinutesForRule(merged);
        }
        return merged;
      });
      return { ...current, dayRules: [...nextRules, ...updatedSeasonRules] };
    });
  };

  const copyNormalToSeason = (season: Exclude<ScheduleProfileSeason, 'normal'>) => {
    setForm((current) => {
      const normalRules = ensureSeasonRules(current, 'normal');
      const copied = normalRules.map((rule) => ({ ...rule, season }));
      return {
        ...current,
        dayRules: [...current.dayRules.filter((rule) => rule.season !== season), ...copied],
      };
    });
    setActiveSeason(season);
  };

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setActiveSeason('normal');
    setActiveCycleWeek(1);
    setMessage(null);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage(null);

    if (!form.name.trim()) {
      setMessage({ type: 'error', text: 'Completá el nombre del perfil.' });
      return;
    }

    const activeSeasonValues = form.scheduleMode === 'seasonal'
      ? (['summer', 'winter'] as ScheduleProfileSeason[])
      : (['normal'] as ScheduleProfileSeason[]);
    const allRules = form.scheduleMode === 'weekly'
      ? Array.from({ length: Number.parseInt(form.rotationLengthWeeks || '3', 10) || 3 }, (_, index) => ensureWeekRules(form, index + 1)).flat()
      : form.scheduleMode === 'daily_cycle'
        ? ensureCycleDayRules(form)
        : activeSeasonValues.flatMap((season) => ensureSeasonRules(form, season));
    const invalidRule = allRules.find((rule) => rule.isWorkday && (!rule.intervals?.length || rule.intervals.some((interval) => !interval.entryTime || !interval.exitTime)));
    if (invalidRule) {
      setMessage({ type: 'error', text: 'Los días laborables necesitan al menos un intervalo completo de entrada y salida.' });
      return;
    }

    const overlappingRule = allRules.find((rule) => rule.isWorkday && hasOverlappingIntervals(rule.intervals ?? []));
    if (overlappingRule) {
      setMessage({ type: 'error', text: 'Los intervalos del día no pueden superponerse.' });
      return;
    }

    if (!window.confirm('Cambiar este perfil puede modificar los cálculos de asistencia. Después de guardar, recalculá los períodos afectados. ¿Continuás?')) {
      return;
    }
    const baseSeason = form.scheduleMode === 'seasonal' ? 'summer' : 'normal';
    const normalWorkRule = allRules.find((rule) => rule.season === baseSeason && rule.isWorkday && rule.entryTime && rule.exitTime);
    const normalWorkDays: string[] = allRules.reduce<string[]>((days, rule) => {
      if (rule.season !== baseSeason || !rule.isWorkday) return days;
      const code = DAYS.find((day) => day.value === rule.dayOfWeek)?.code;
      if (code) days.push(code);
      return days;
    }, []);

    startTransition(() => {
      void saveScheduleProfileAction({
        ...form,
        entryTime: normalWorkRule?.entryTime ?? form.entryTime,
        exitTime: normalWorkRule?.exitTime ?? form.exitTime,
        lateToleranceMinutes: normalWorkRule?.lateToleranceMinutes ?? form.lateToleranceMinutes,
        earlyDepartureToleranceMinutes: normalWorkRule?.earlyDepartureToleranceMinutes ?? form.earlyDepartureToleranceMinutes,
        expectedMinutesPerDay: normalWorkRule?.expectedMinutes ?? form.expectedMinutesPerDay,
        breakMinutes: normalWorkRule?.breakMinutes ?? form.breakMinutes,
        overtimeAfterMinutes: normalWorkRule?.overtimeAfterMinutes ?? form.overtimeAfterMinutes,
        rotationMode: form.scheduleMode === 'weekly' ? 'weekly' : form.scheduleMode === 'daily_cycle' ? 'daily_cycle' : 'none',
        rotationStartDate: form.scheduleMode === 'weekly' || form.scheduleMode === 'daily_cycle' ? displayDateToIso(form.rotationStartDate) || null : null,
        rotationLengthWeeks: form.scheduleMode === 'weekly' ? form.rotationLengthWeeks : null,
        rotationLengthDays: form.scheduleMode === 'daily_cycle' ? form.rotationLengthDays : null,
        timeBankEnabled: form.timeBankEnabled,
        timeBankMode: form.timeBankEnabled ? form.timeBankMode : 'none',
        dayRules: allRules,
        workDays: normalWorkDays,
      }).then((result) => {
        if (result.error) {
          setMessage({ type: 'error', text: humanizeActionError(result.error) });
          return;
        }

        setMessage({
          type: 'success',
          text: isEditing ? 'Perfil actualizado. Recalculá los períodos afectados para actualizar reportes.' : 'Perfil creado correctamente.',
        });
        setForm(EMPTY_FORM);
        setActiveSeason('normal');
        setActiveCycleWeek(1);
        router.refresh();
      });
    });
  };

  const handleDelete = (profile: ScheduleProfile) => {
    setMessage(null);
    if (!window.confirm(`¿Eliminar el perfil ${profile.name}? Esto puede afectar empleados que tengan este horario asignado.`)) {
      return;
    }

    startTransition(() => {
      void deleteScheduleProfileAction(profile.id).then((result) => {
        if (result.error) {
          setMessage({ type: 'error', text: humanizeActionError(result.error) });
          return;
        }

        if (form.id === profile.id) resetForm();
        setMessage({ type: 'success', text: 'Perfil eliminado correctamente.' });
        router.refresh();
      });
    });
  };

  return (
    <section className="card rounded-xl">
      <div className="px-6 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
        <h2 className="font-semibold" style={{ color: 'var(--text-primary)' }}>Perfiles de horario</h2>
        <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
          Definí los días y horarios de trabajo. El sistema usa estos datos para calcular tardanzas, ausencias, horas trabajadas y cierre mensual.
        </p>
      </div>

      <div className="space-y-6 p-5 sm:p-6">
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {profiles.length === 0 ? (
            <div className="rounded-xl px-4 py-8 text-center" style={{ border: '1px dashed var(--border)', color: 'var(--text-muted)' }}>
              No hay perfiles de horario cargados. Creá un perfil para que el sistema pueda calcular asistencia.
            </div>
          ) : (
            profiles.map((profile) => (
              <div key={profile.id} className="rounded-xl p-4" style={{ border: '1px solid var(--border)', background: 'var(--surface-raised)' }}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>{profile.name}</h3>
                    <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
                      Base {profile.entryTime} - {profile.exitTime} · {profile.dayRules?.length ? 'Horario por día configurado' : 'Perfil simple'}
                    </p>
                  </div>
                  <div className="flex gap-3 text-sm">
                    <button type="button" onClick={() => { setForm(toFormValues(profile)); setActiveSeason(profileScheduleMode(profile) === 'seasonal' ? 'summer' : 'normal'); setActiveCycleWeek(1); setMessage(null); }}
                      className="font-medium" style={{ color: 'var(--brand-text)' }}>
                      Editar
                    </button>
                    <button type="button" onClick={() => handleDelete(profile)} disabled={isPending}
                      className="font-medium disabled:opacity-60" style={{ color: 'var(--danger-text)' }}>
                      Eliminar
                    </button>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-2 text-xs" style={{ color: 'var(--text-muted)' }}>
                  <span>{profileScheduleSummary(profile)}</span>
                  <span>Descanso: {profile.breakMinutes ?? 0} min</span>
                  <span>Tolerancia: {profile.lateToleranceMinutes ?? 0} min</span>
                </div>
              </div>
            ))
          )}
        </div>

        <form onSubmit={handleSubmit} className="rounded-xl p-5 sm:p-6 space-y-5" style={{ border: '1px solid var(--border)', background: 'var(--surface-raised)' }}>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                {isEditing ? 'Editar perfil' : 'Nuevo perfil'}
              </h3>
              <p className="mt-1 text-sm" style={{ color: 'var(--text-muted)' }}>
                Elegí si el perfil usa un horario fijo, temporadas, rotación semanal o francos por ciclo.
              </p>
            </div>
            {isEditing && (
              <button type="button" onClick={resetForm} disabled={isPending}
                className="self-start rounded-lg px-3 py-2 text-sm"
                style={{ border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
                Crear otro perfil
              </button>
            )}
          </div>

          {message && (
            <div className="rounded-lg border px-3 py-2 text-sm" style={
              message.type === 'success'
                ? { background: 'var(--brand-soft)', borderColor: 'rgba(31,199,119,0.3)', color: 'var(--brand-text)' }
                : { background: 'var(--danger-soft)', borderColor: 'rgba(230,45,66,0.3)', color: 'var(--danger-text)' }
            }>
              {message.text}
            </div>
          )}

          <label className="block max-w-md text-sm">
            <span className="font-medium" style={{ color: 'var(--text-secondary)' }}>Nombre del perfil</span>
            <input name="name" value={form.name} onChange={handleChange} required
              className="mt-1 w-full rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              style={{ background: 'var(--input-bg)', border: '1px solid var(--input-border)', color: 'var(--text-primary)' }}
            />
          </label>

          <div className="grid grid-cols-1 gap-3 lg:grid-cols-4">
            <button type="button" onClick={() => setScheduleMode('single')}
              className="rounded-xl px-4 py-3 text-left text-sm"
              style={form.scheduleMode === 'single'
                ? { background: 'var(--brand-soft)', border: '1px solid rgba(31,199,119,0.35)', color: 'var(--brand-text)' }
                : { background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
              <span className="block font-semibold">Un horario todo el año</span>
              <span className="mt-1 block text-xs">Usa la misma configuración sin separar verano e invierno.</span>
            </button>
            <button type="button" onClick={() => setScheduleMode('seasonal')}
              className="rounded-xl px-4 py-3 text-left text-sm"
              style={form.scheduleMode === 'seasonal'
                ? { background: 'var(--brand-soft)', border: '1px solid rgba(31,199,119,0.35)', color: 'var(--brand-text)' }
                : { background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
              <span className="block font-semibold">Verano e invierno</span>
              <span className="mt-1 block text-xs">Permite horarios distintos por temporada.</span>
            </button>
            <button type="button" onClick={() => setScheduleMode('weekly')}
              className="rounded-xl px-4 py-3 text-left text-sm"
              style={form.scheduleMode === 'weekly'
                ? { background: 'var(--brand-soft)', border: '1px solid rgba(31,199,119,0.35)', color: 'var(--brand-text)' }
                : { background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
              <span className="block font-semibold">Rotación semanal</span>
              <span className="mt-1 block text-xs">Semana 1, semana 2, semana 3, etc.</span>
            </button>
            <button type="button" onClick={() => setScheduleMode('daily_cycle')}
              className="rounded-xl px-4 py-3 text-left text-sm"
              style={form.scheduleMode === 'daily_cycle'
                ? { background: 'var(--brand-soft)', border: '1px solid rgba(31,199,119,0.35)', color: 'var(--brand-text)' }
                : { background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
              <span className="block font-semibold">Ciclo por días</span>
              <span className="mt-1 block text-xs">Francos rotativos como 4x2, 6x1 o 2x2.</span>
            </button>
          </div>

          {(form.scheduleMode === 'weekly' || form.scheduleMode === 'daily_cycle') && (
            <div className="rounded-xl p-3" style={{ border: '1px solid var(--border)', background: 'var(--surface)' }}>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                <label className="block text-xs">
                  <span style={{ color: 'var(--text-muted)' }}>Inicio del ciclo</span>
                  <input name="rotationStartDate" value={form.rotationStartDate} onChange={handleChange}
                    placeholder="DD/MM/AAAA" inputMode="numeric" maxLength={10}
                    className="mt-1 w-full rounded-lg px-3 py-2 text-sm"
                    style={{ background: 'var(--input-bg)', border: '1px solid var(--input-border)', color: 'var(--text-primary)' }}
                  />
                </label>
                {form.scheduleMode === 'weekly' ? (
                  <SmallNumberInput label="Semanas del ciclo" value={Number.parseInt(form.rotationLengthWeeks || '3', 10) || 3}
                    onChange={(value) => setForm((current) => ({ ...current, rotationLengthWeeks: String(value) }))} />
                ) : (
                  <SmallNumberInput label="Días del ciclo" value={Number.parseInt(form.rotationLengthDays || '6', 10) || 6}
                    onChange={(value) => setForm((current) => ({ ...current, rotationLengthDays: String(value) }))} />
                )}
                <label className="flex items-end gap-2 pb-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                  <input type="checkbox" checked={form.timeBankEnabled} onChange={(event) => setForm((current) => ({ ...current, timeBankEnabled: event.target.checked }))} />
                  Activar banco de horas
                </label>
              </div>
              {form.timeBankEnabled && (
                <select value={form.timeBankMode} onChange={(event) => setForm((current) => ({ ...current, timeBankMode: event.target.value as FormValues['timeBankMode'] }))}
                  className="mt-3 rounded-lg px-3 py-2 text-sm"
                  style={{ background: 'var(--input-bg)', border: '1px solid var(--input-border)', color: 'var(--text-primary)' }}>
                  <option value="overtime_only">Solo acumular horas extra</option>
                  <option value="overtime_and_deficit">Acumular extra y descontar déficit</option>
                </select>
              )}
            </div>
          )}

          <div className="rounded-xl p-3" style={{ border: '1px solid var(--border)', background: 'var(--surface)' }}>
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="inline-flex flex-wrap rounded-lg p-1" style={{ background: 'var(--surface-raised)', border: '1px solid var(--border)' }}>
                {form.scheduleMode === 'weekly' ? Array.from({ length: Number.parseInt(form.rotationLengthWeeks || '3', 10) || 3 }, (_, index) => (
                  <button key={index + 1} type="button" onClick={() => setActiveCycleWeek(index + 1)}
                    className="rounded-md px-3 py-2 text-sm font-medium"
                    style={activeCycleWeek === index + 1
                      ? { background: 'var(--brand-soft)', color: 'var(--brand-text)' }
                      : { color: 'var(--text-secondary)' }}>
                    Semana {index + 1}
                  </button>
                )) : visibleSeasons.map((season) => (
                  <button key={season.value} type="button" onClick={() => setActiveSeason(season.value)}
                    className="rounded-md px-3 py-2 text-sm font-medium"
                    style={activeSeason === season.value
                      ? { background: 'var(--brand-soft)', color: 'var(--brand-text)' }
                      : { color: 'var(--text-secondary)' }}>
                    {season.label}
                  </button>
                ))}
              </div>
              {form.scheduleMode === 'seasonal' && (
                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={() => copyNormalToSeason('summer')}
                    className="rounded-lg px-3 py-2 text-sm" style={{ border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
                    Copiar todo el año a verano
                  </button>
                  <button type="button" onClick={() => copyNormalToSeason('winter')}
                    className="rounded-lg px-3 py-2 text-sm" style={{ border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
                    Copiar todo el año a invierno
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-3">
            {activeRules.slice().sort((a, b) => (a.dayOfWeek ?? a.cycleDay ?? 0) - (b.dayOfWeek ?? b.cycleDay ?? 0)).map((rule) => (
              <DayRuleEditor key={`${rule.season}-${rule.dayOfWeek ?? 'cycle'}-${rule.cycleDay ?? ''}-${rule.cycleWeek ?? ''}`} rule={rule} onChange={(patch) => updateRule(rule, patch)} />
            ))}
          </div>

          {form.scheduleMode === 'seasonal' && (
            <div className="rounded-lg p-3 space-y-3" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
              <p className="text-xs font-semibold uppercase" style={{ color: 'var(--text-secondary)' }}>Fechas de temporada</p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
                <MonthDayInput label="Verano desde" name="summerStart" value={form.summerStart} onChange={handleChange} />
                <MonthDayInput label="Verano hasta" name="summerEnd" value={form.summerEnd} onChange={handleChange} />
                <MonthDayInput label="Invierno desde" name="winterStart" value={form.winterStart} onChange={handleChange} />
                <MonthDayInput label="Invierno hasta" name="winterEnd" value={form.winterEnd} onChange={handleChange} />
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2">
            {isEditing && (
              <button type="button" onClick={resetForm} disabled={isPending}
                className="rounded-lg px-4 py-2 text-sm"
                style={{ border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
                Cancelar
              </button>
            )}
            <button type="submit" disabled={isPending}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-60">
              {isPending ? 'Guardando...' : isEditing ? 'Guardar perfil' : 'Crear perfil'}
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}

function DayRuleEditor({
  rule,
  onChange,
}: {
  rule: EditableDayRule;
  onChange: (patch: Partial<EditableDayRule>) => void;
}) {
  const day = DAYS.find((candidate) => candidate.value === rule.dayOfWeek);
  const label = day?.label ?? (rule.cycleDay ? `Día ${rule.cycleDay}` : 'Día');
  const intervals = rule.intervals?.length
    ? rule.intervals
    : rule.entryTime && rule.exitTime
      ? [{ sequence: 1, entryTime: rule.entryTime, exitTime: rule.exitTime, crossesMidnight: rule.exitTime < rule.entryTime, expectedMinutes: null }]
      : [];
  const updateInterval = (sequence: number, patch: Partial<(typeof intervals)[number]>) => {
    onChange({
      intervals: intervals.map((interval) =>
        interval.sequence === sequence
          ? { ...interval, ...patch, crossesMidnight: patch.crossesMidnight ?? Boolean((patch.exitTime ?? interval.exitTime) < (patch.entryTime ?? interval.entryTime)) }
          : interval),
    });
  };
  const addInterval = () => {
    if (intervals.length >= 4) return;
    const nextSequence = intervals.length + 1;
    onChange({
      intervals: [
        ...intervals,
        { sequence: nextSequence, entryTime: '', exitTime: '', crossesMidnight: false, expectedMinutes: null },
      ],
    });
  };
  const removeInterval = (sequence: number) => {
    onChange({ intervals: intervals.filter((interval) => interval.sequence !== sequence) });
  };
  return (
    <div className="rounded-xl p-4" style={{ border: '1px solid var(--border)', background: 'var(--surface)' }}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <label className="inline-flex items-center gap-3 text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
          <input type="checkbox" checked={rule.isWorkday} onChange={(event) => onChange({ isWorkday: event.target.checked })} />
          {label}
        </label>
        <span className="w-fit rounded-full px-2.5 py-1 text-xs font-medium" style={
          rule.isWorkday
            ? { background: 'var(--brand-soft)', color: 'var(--brand-text)' }
            : { background: 'var(--surface-raised)', color: 'var(--text-muted)' }
        }>
          {rule.isWorkday ? 'Trabaja este día' : 'No trabaja'}
        </span>
      </div>

      {rule.isWorkday ? (
        <>
          <div className="mt-4 space-y-3">
            {intervals.map((interval, index) => (
              <div key={interval.sequence} className="rounded-lg p-3" style={{ border: '1px solid var(--border)', background: 'var(--surface-raised)' }}>
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-semibold uppercase" style={{ color: 'var(--text-secondary)' }}>
                    Intervalo {index + 1}
                  </span>
                  {intervals.length > 1 && (
                    <button type="button" onClick={() => removeInterval(interval.sequence)}
                      className="text-xs font-medium" style={{ color: 'var(--danger-text)' }}>
                      Quitar
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                  <SmallTimeInput label="Entrada" value={interval.entryTime} onChange={(value) => updateInterval(interval.sequence, { entryTime: value })} />
                  <SmallTimeInput label="Salida" value={interval.exitTime} onChange={(value) => updateInterval(interval.sequence, { exitTime: value })} />
                  <label className="flex items-end gap-2 pb-2 text-xs" style={{ color: 'var(--text-secondary)' }}>
                    <input type="checkbox" checked={Boolean(interval.crossesMidnight)} onChange={(event) => updateInterval(interval.sequence, { crossesMidnight: event.target.checked })} />
                    Cruza medianoche
                  </label>
                </div>
              </div>
            ))}
            <button type="button" onClick={addInterval} disabled={intervals.length >= 4}
              className="rounded-lg px-3 py-2 text-sm disabled:opacity-50"
              style={{ border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
              Agregar intervalo
            </button>
            {intervals.some((interval) => interval.crossesMidnight) && (
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                Turno nocturno: la salida se computa al día siguiente.
              </p>
            )}
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-5">
            <SmallNumberInput label="Pausa" value={rule.breakMinutes} onChange={(value) => onChange({ breakMinutes: value })} />
            <SmallNumberInput label="Jornada" value={rule.expectedMinutes ?? 0} onChange={(value) => onChange({ expectedMinutes: value })} />
            <SmallNumberInput label="Tol. tardanza" value={rule.lateToleranceMinutes ?? 0} onChange={(value) => onChange({ lateToleranceMinutes: value })} />
            <SmallNumberInput label="Tol. salida" value={rule.earlyDepartureToleranceMinutes ?? 0} onChange={(value) => onChange({ earlyDepartureToleranceMinutes: value })} />
            <SmallNumberInput label="Extra desde" value={rule.overtimeAfterMinutes ?? 0} onChange={(value) => onChange({ overtimeAfterMinutes: value })} />
          </div>
          <label className="mt-3 block text-xs">
            <span style={{ color: 'var(--text-muted)' }}>Notas</span>
            <input value={rule.notes ?? ''} onChange={(event) => onChange({ notes: event.target.value || null })}
              className="mt-1 w-full min-w-0 rounded-lg px-2 py-2 text-sm"
              style={{ background: 'var(--input-bg)', border: '1px solid var(--input-border)', color: 'var(--text-primary)' }}
            />
          </label>
        </>
      ) : (
        <p className="mt-3 text-sm" style={{ color: 'var(--text-muted)' }}>
          Este día no genera ausencia si el empleado no ficha.
        </p>
      )}
    </div>
  );
}

function SmallTimeInput({ label, value, disabled, onChange }: { label: string; value: string; disabled?: boolean; onChange: (value: string) => void }) {
  return (
    <label className="block min-w-0 text-xs">
      <span style={{ color: 'var(--text-muted)' }}>{label}</span>
      <input value={value} disabled={disabled} onChange={(event) => onChange(maskTimeInput(event.target.value))}
        placeholder="HH:MM" pattern="^([01][0-9]|2[0-3]):[0-5][0-9]$"
        inputMode="numeric" maxLength={5}
        className="mt-1 w-full min-w-0 rounded-lg px-2 py-2 text-sm disabled:opacity-60"
        style={{ background: 'var(--input-bg)', border: '1px solid var(--input-border)', color: 'var(--text-primary)' }}
      />
    </label>
  );
}

function SmallNumberInput({ label, value, disabled, onChange }: { label: string; value: number; disabled?: boolean; onChange: (value: number) => void }) {
  return (
    <label className="block min-w-0 text-xs">
      <span style={{ color: 'var(--text-muted)' }}>{label}</span>
      <input type="number" min="0" value={value} disabled={disabled}
        onChange={(event) => onChange(Number.parseInt(event.target.value || '0', 10) || 0)}
        className="mt-1 w-full min-w-0 rounded-lg px-2 py-2 text-sm disabled:opacity-60"
        style={{ background: 'var(--input-bg)', border: '1px solid var(--input-border)', color: 'var(--text-primary)' }}
      />
    </label>
  );
}

function MonthDayInput({
  label,
  name,
  value,
  onChange,
}: {
  label: string;
  name: keyof FormValues;
  value: string;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
}) {
  const displayValue = monthDayToDisplay(value);
  return (
    <label className="block text-sm">
      <span className="font-medium" style={{ color: 'var(--text-secondary)' }}>{label}</span>
      <input name={name} value={displayValue} onChange={(event) => {
        const masked = maskDayMonthInput(event.target.value);
        onChange({ target: { name, value: displayToMonthDay(masked) } } as ChangeEvent<HTMLInputElement>);
      }} placeholder="DD/MM" pattern="^(0[1-9]|[12][0-9]|3[01])/(0[1-9]|1[0-2])$" inputMode="numeric" maxLength={5}
        className="mt-1 w-full rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
        style={{ background: 'var(--input-bg)', border: '1px solid var(--input-border)', color: 'var(--text-primary)' }}
      />
    </label>
  );
}
