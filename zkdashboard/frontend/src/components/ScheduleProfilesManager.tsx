'use client';

import { useMemo, useState, useTransition } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import {
  deleteScheduleProfileAction,
  saveScheduleProfileAction,
} from '@/app/(protected)/settings/actions';
import type { ScheduleProfile, ScheduleProfileDayRule, ScheduleProfileSeason } from '@/lib/api';
import { humanizeActionError } from '@/lib/ux-labels';

type EditableDayRule = Omit<ScheduleProfileDayRule, 'id' | 'scheduleProfileId' | 'createdAt' | 'updatedAt'>;

type FormValues = {
  id: string;
  name: string;
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
  { value: 'normal', label: 'Normal' },
  { value: 'summer', label: 'Verano' },
  { value: 'winter', label: 'Invierno' },
];

const DEFAULT_WORK_DAYS = ['mon', 'tue', 'wed', 'thu', 'fri'];

function minutesBetween(entryTime: string, exitTime: string, breakMinutes: number) {
  if (!entryTime || !exitTime) return null;
  const [entryHours, entryMinutes] = entryTime.split(':').map(Number);
  const [exitHours, exitMinutes] = exitTime.split(':').map(Number);
  const diff = exitHours * 60 + exitMinutes - (entryHours * 60 + entryMinutes) - breakMinutes;
  return Math.max(diff, 0);
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
  return {
    id: profile.id,
    name: profile.name,
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

function ensureSeasonRules(form: FormValues, season: ScheduleProfileSeason): EditableDayRule[] {
  const existing = form.dayRules.filter((rule) => rule.season === season);
  if (existing.length) return existing;

  return makeRulesFromValues(form, season);
}

export function ScheduleProfilesManager({ profiles }: { profiles: ScheduleProfile[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [form, setForm] = useState<FormValues>(EMPTY_FORM);
  const [activeSeason, setActiveSeason] = useState<ScheduleProfileSeason>('normal');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const isEditing = Boolean(form.id);
  const activeRules = useMemo(() => ensureSeasonRules(form, activeSeason), [activeSeason, form]);

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const updateRule = (dayOfWeek: number, patch: Partial<EditableDayRule>) => {
    setForm((current) => {
      const seasonRules = ensureSeasonRules(current, activeSeason);
      const nextRules = current.dayRules.filter((rule) => rule.season !== activeSeason);
      const updatedSeasonRules = seasonRules.map((rule) => {
        if (rule.dayOfWeek !== dayOfWeek) return rule;
        const merged = { ...rule, ...patch };
        if (patch.isWorkday === false) {
          merged.entryTime = null;
          merged.exitTime = null;
          merged.expectedMinutes = 0;
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
    setMessage(null);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage(null);

    if (!form.name.trim()) {
      setMessage({ type: 'error', text: 'Completá el nombre del perfil.' });
      return;
    }

    const allRules = SEASONS.flatMap((season) => ensureSeasonRules(form, season.value));
    const invalidRule = allRules.find((rule) => rule.isWorkday && (!rule.entryTime || !rule.exitTime));
    if (invalidRule) {
      setMessage({ type: 'error', text: 'Los días laborables necesitan horario de entrada y salida.' });
      return;
    }

    if (!window.confirm('Cambiar este perfil puede modificar los cálculos de asistencia. Después de guardar, recalculá los períodos afectados. ¿Continuás?')) {
      return;
    }
    const normalWorkRule = allRules.find((rule) => rule.season === 'normal' && rule.isWorkday && rule.entryTime && rule.exitTime);
    const normalWorkDays: string[] = allRules.reduce<string[]>((days, rule) => {
      if (rule.season !== 'normal' || !rule.isWorkday) return days;
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
                    <button type="button" onClick={() => { setForm(toFormValues(profile)); setActiveSeason('normal'); setMessage(null); }}
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
                  <span>Normal: {profile.dayRules?.filter((rule) => rule.season === 'normal' && rule.isWorkday).length || profile.workDays?.length || 5} días laborables</span>
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
                Configurá la semana laboral por temporada. Si no usás verano o invierno, dejá solo “Normal”.
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

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(260px,360px)_minmax(0,1fr)]">
            <label className="block text-sm">
              <span className="font-medium" style={{ color: 'var(--text-secondary)' }}>Nombre del perfil</span>
              <input name="name" value={form.name} onChange={handleChange} required
                className="mt-1 w-full rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                style={{ background: 'var(--input-bg)', border: '1px solid var(--input-border)', color: 'var(--text-primary)' }}
              />
            </label>

            <div className="rounded-lg p-3" style={{ background: 'var(--blue-soft)', border: '1px solid rgba(59,130,246,0.2)' }}>
              <p className="text-xs leading-relaxed" style={{ color: 'var(--blue-text)' }}>
                El reloj solo registra fichadas. Estos horarios se aplican en el sistema para calcular tardanzas, ausencias y horas.
              </p>
            </div>
          </div>

          <div className="rounded-xl p-3" style={{ border: '1px solid var(--border)', background: 'var(--surface)' }}>
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="inline-flex rounded-lg p-1" style={{ background: 'var(--surface-raised)', border: '1px solid var(--border)' }}>
                {SEASONS.map((season) => (
                  <button key={season.value} type="button" onClick={() => setActiveSeason(season.value)}
                    className="rounded-md px-3 py-2 text-sm font-medium"
                    style={activeSeason === season.value
                      ? { background: 'var(--brand-soft)', color: 'var(--brand-text)' }
                      : { color: 'var(--text-secondary)' }}>
                    {season.label}
                  </button>
                ))}
              </div>
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => copyNormalToSeason('summer')}
                  className="rounded-lg px-3 py-2 text-sm" style={{ border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
                  Copiar normal a verano
                </button>
                <button type="button" onClick={() => copyNormalToSeason('winter')}
                  className="rounded-lg px-3 py-2 text-sm" style={{ border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
                  Copiar normal a invierno
                </button>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            {activeRules.slice().sort((a, b) => a.dayOfWeek - b.dayOfWeek).map((rule) => (
              <DayRuleEditor key={`${rule.season}-${rule.dayOfWeek}`} rule={rule} onChange={(patch) => updateRule(rule.dayOfWeek, patch)} />
            ))}
          </div>

          <div className="rounded-lg p-3 space-y-3" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <p className="text-xs font-semibold uppercase" style={{ color: 'var(--text-secondary)' }}>Fechas de temporada</p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
              <MonthDayInput label="Verano desde" name="summerStart" value={form.summerStart} onChange={handleChange} />
              <MonthDayInput label="Verano hasta" name="summerEnd" value={form.summerEnd} onChange={handleChange} />
              <MonthDayInput label="Invierno desde" name="winterStart" value={form.winterStart} onChange={handleChange} />
              <MonthDayInput label="Invierno hasta" name="winterEnd" value={form.winterEnd} onChange={handleChange} />
            </div>
          </div>

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
  return (
    <div className="rounded-xl p-4" style={{ border: '1px solid var(--border)', background: 'var(--surface)' }}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <label className="inline-flex items-center gap-3 text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
          <input type="checkbox" checked={rule.isWorkday} onChange={(event) => onChange({ isWorkday: event.target.checked })} />
          {day?.label ?? rule.dayOfWeek}
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
          <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-7">
            <SmallTimeInput label="Entrada" value={rule.entryTime ?? ''} onChange={(value) => onChange({ entryTime: value || null })} />
            <SmallTimeInput label="Salida" value={rule.exitTime ?? ''} onChange={(value) => onChange({ exitTime: value || null })} />
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
      <input value={value} disabled={disabled} onChange={(event) => onChange(event.target.value)}
        placeholder="HH:MM" pattern="^([01][0-9]|2[0-3]):[0-5][0-9]$"
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
  return (
    <label className="block text-sm">
      <span className="font-medium" style={{ color: 'var(--text-secondary)' }}>{label}</span>
      <input name={name} value={value} onChange={onChange} placeholder="MM-DD" pattern="^(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])$"
        className="mt-1 w-full rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
        style={{ background: 'var(--input-bg)', border: '1px solid var(--input-border)', color: 'var(--text-primary)' }}
      />
    </label>
  );
}
