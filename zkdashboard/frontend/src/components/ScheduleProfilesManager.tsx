'use client';

import { useState, useTransition } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import {
  deleteScheduleProfileAction,
  saveScheduleProfileAction,
} from '@/app/(protected)/settings/actions';
import type { ScheduleProfile } from '@/lib/api';

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
};

const EMPTY_FORM: FormValues = {
  id: '',
  name: '',
  entryTime: '',
  exitTime: '',
  summerEntryTime: '',
  summerExitTime: '',
  summerStart: '',
  summerEnd: '',
  winterEntryTime: '',
  winterExitTime: '',
  winterStart: '',
  winterEnd: '',
  lateToleranceMinutes: '0',
  earlyDepartureToleranceMinutes: '0',
  expectedMinutesPerDay: '',
  breakMinutes: '0',
  overtimeAfterMinutes: '0',
  workDays: ['mon', 'tue', 'wed', 'thu', 'fri'],
};

function toFormValues(profile: ScheduleProfile): FormValues {
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
    workDays: profile.workDays?.length ? profile.workDays : ['mon', 'tue', 'wed', 'thu', 'fri'],
  };
}

export function ScheduleProfilesManager({ profiles }: { profiles: ScheduleProfile[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [form, setForm] = useState<FormValues>(EMPTY_FORM);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const isEditing = Boolean(form.id);

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const handleWorkDayChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { value, checked } = event.target;
    setForm((current) => ({
      ...current,
      workDays: checked
        ? current.workDays.includes(value)
          ? current.workDays
          : [...current.workDays, value]
        : current.workDays.filter((day) => day !== value),
    }));
  };

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setMessage(null);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage(null);

    if (!form.name.trim() || !form.entryTime || !form.exitTime) {
      setMessage({ type: 'error', text: 'Completá nombre, entrada base y salida base.' });
      return;
    }

    startTransition(() => {
      void saveScheduleProfileAction(form).then((result) => {
        if (result.error) {
          setMessage({ type: 'error', text: result.error });
          return;
        }

        setMessage({
          type: 'success',
          text: isEditing ? 'Perfil actualizado correctamente.' : 'Perfil creado correctamente.',
        });
        setForm(EMPTY_FORM);
        router.refresh();
      });
    });
  };

  const handleDelete = (profile: ScheduleProfile) => {
    setMessage(null);
    if (!window.confirm(`¿Eliminar el perfil ${profile.name}?`)) {
      return;
    }

    startTransition(() => {
      void deleteScheduleProfileAction(profile.id).then((result) => {
        if (result.error) {
          setMessage({ type: 'error', text: result.error });
          return;
        }

        if (form.id === profile.id) {
          setForm(EMPTY_FORM);
        }
        setMessage({ type: 'success', text: 'Perfil eliminado correctamente.' });
        router.refresh();
      });
    });
  };

  return (
    <section className="card rounded-xl">
      <div className="px-6 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
        <h2 className="font-semibold" style={{ color: 'var(--text-primary)' }}>Perfiles de horario</h2>
        <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
          Creá perfiles para grupos de empleados y ajustá variaciones de verano o invierno.
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_420px] gap-6 p-6">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="table-header-row text-xs uppercase">
                <th className="px-4 py-3 text-left">Perfil</th>
                <th className="px-4 py-3 text-left">Base</th>
                <th className="px-4 py-3 text-left">Verano</th>
                <th className="px-4 py-3 text-left">Invierno</th>
                <th className="px-4 py-3 text-left">Reglas</th>
                <th className="px-4 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {profiles.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center" style={{ color: 'var(--text-muted)' }}>
                    Todavía no hay perfiles horarios.
                  </td>
                </tr>
              ) : (
                profiles.map((profile) => (
                  <tr key={profile.id} className="transition-colors border-t" style={{ borderColor: 'var(--border)' }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--row-hover)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = '')}
                  >
                    <td className="px-4 py-3 font-medium" style={{ color: 'var(--text-primary)' }}>{profile.name}</td>
                    <td className="px-4 py-3" style={{ color: 'var(--text-secondary)' }}>{profile.entryTime} - {profile.exitTime}</td>
                    <td className="px-4 py-3" style={{ color: 'var(--text-secondary)' }}>
                      {profile.summerEntryTime && profile.summerExitTime ? `${profile.summerEntryTime} - ${profile.summerExitTime}` : '—'}
                      {profile.summerStart && profile.summerEnd ? ` · ${profile.summerStart} a ${profile.summerEnd}` : ''}
                    </td>
                    <td className="px-4 py-3" style={{ color: 'var(--text-secondary)' }}>
                      {profile.winterEntryTime && profile.winterExitTime ? `${profile.winterEntryTime} - ${profile.winterExitTime}` : '—'}
                      {profile.winterStart && profile.winterEnd ? ` · ${profile.winterStart} a ${profile.winterEnd}` : ''}
                    </td>
                    <td className="px-4 py-3 text-xs" style={{ color: 'var(--text-secondary)' }}>
                      Tol. entrada {profile.lateToleranceMinutes ?? 0}m · Tol. salida {profile.earlyDepartureToleranceMinutes ?? 0}m
                      <br />
                      Esperado {profile.expectedMinutesPerDay ?? 'calc.'}m · Descanso {profile.breakMinutes ?? 0}m
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <button type="button" onClick={() => { setForm(toFormValues(profile)); setMessage(null); }}
                          className="font-medium transition-colors" style={{ color: 'var(--brand-text)' }}>
                          Editar
                        </button>
                        <button type="button" onClick={() => handleDelete(profile)} disabled={isPending}
                          className="font-medium transition-colors disabled:opacity-60" style={{ color: 'var(--danger-text)' }}>
                          Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <form onSubmit={handleSubmit} className="rounded-xl p-4 space-y-4" style={{ border: '1px solid var(--border)', background: 'var(--surface-raised)' }}>
          <div>
            <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>
              {isEditing ? 'Editar perfil' : 'Nuevo perfil'}
            </h3>
            <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
              Las fechas de temporada usan formato MM-DD, por ejemplo 12-01.
            </p>
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

          <label className="block text-sm">
            <span className="font-medium" style={{ color: 'var(--text-secondary)' }}>Nombre</span>
            <input name="name" value={form.name} onChange={handleChange} required
              className="mt-1 w-full rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              style={{ background: 'var(--input-bg)', border: '1px solid var(--input-border)', color: 'var(--text-primary)' }}
            />
          </label>

          <div className="grid grid-cols-2 gap-3">
            <TimeInput label="Entrada base" name="entryTime" value={form.entryTime} onChange={handleChange} required />
            <TimeInput label="Salida base" name="exitTime" value={form.exitTime} onChange={handleChange} required />
          </div>

          <div className="rounded-lg p-3 space-y-3" style={{ background: 'var(--blue-soft)', border: '1px solid rgba(59,130,246,0.2)' }}>
            <p className="text-xs font-semibold uppercase" style={{ color: 'var(--blue-text)' }}>Verano</p>
            <div className="grid grid-cols-2 gap-3">
              <TimeInput label="Entrada" name="summerEntryTime" value={form.summerEntryTime} onChange={handleChange} />
              <TimeInput label="Salida" name="summerExitTime" value={form.summerExitTime} onChange={handleChange} />
              <MonthDayInput label="Desde" name="summerStart" value={form.summerStart} onChange={handleChange} />
              <MonthDayInput label="Hasta" name="summerEnd" value={form.summerEnd} onChange={handleChange} />
            </div>
          </div>

          <div className="rounded-lg p-3 space-y-3" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <p className="text-xs font-semibold uppercase" style={{ color: 'var(--text-secondary)' }}>Invierno</p>
            <div className="grid grid-cols-2 gap-3">
              <TimeInput label="Entrada" name="winterEntryTime" value={form.winterEntryTime} onChange={handleChange} />
              <TimeInput label="Salida" name="winterExitTime" value={form.winterExitTime} onChange={handleChange} />
              <MonthDayInput label="Desde" name="winterStart" value={form.winterStart} onChange={handleChange} />
              <MonthDayInput label="Hasta" name="winterEnd" value={form.winterEnd} onChange={handleChange} />
            </div>
          </div>

          <div className="rounded-lg p-3 space-y-3" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <p className="text-xs font-semibold uppercase" style={{ color: 'var(--text-secondary)' }}>Reglas RRHH</p>
            <div className="grid grid-cols-2 gap-3">
              <NumberInput label="Tol. llegada tarde (min)" name="lateToleranceMinutes" value={form.lateToleranceMinutes} onChange={handleChange} />
              <NumberInput label="Tol. salida temprana (min)" name="earlyDepartureToleranceMinutes" value={form.earlyDepartureToleranceMinutes} onChange={handleChange} />
              <NumberInput label="Minutos esperados" name="expectedMinutesPerDay" value={form.expectedMinutesPerDay} onChange={handleChange} />
              <NumberInput label="Descanso (min)" name="breakMinutes" value={form.breakMinutes} onChange={handleChange} />
              <NumberInput label="Extra después de (min)" name="overtimeAfterMinutes" value={form.overtimeAfterMinutes} onChange={handleChange} />
            </div>
            <div>
              <p className="text-xs mb-2" style={{ color: 'var(--text-muted)' }}>Días laborales</p>
              <div className="grid grid-cols-4 gap-2 text-xs" style={{ color: 'var(--text-secondary)' }}>
                {[
                  ['mon', 'Lun'],
                  ['tue', 'Mar'],
                  ['wed', 'Mié'],
                  ['thu', 'Jue'],
                  ['fri', 'Vie'],
                  ['sat', 'Sáb'],
                  ['sun', 'Dom'],
                ].map(([value, label]) => (
                  <label key={value} className="inline-flex items-center gap-2">
                    <input type="checkbox" value={value} checked={form.workDays.includes(value)} onChange={handleWorkDayChange} />
                    {label}
                  </label>
                ))}
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            {isEditing && (
              <button type="button" onClick={resetForm} disabled={isPending}
                className="rounded-lg px-4 py-2 text-sm transition-colors"
                style={{ border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
                Cancelar
              </button>
            )}
            <button type="submit" disabled={isPending}
              className="rounded-lg bg-blue-600 hover:bg-blue-700 px-4 py-2 text-sm font-medium text-white disabled:opacity-60 transition-colors">
              {isPending ? 'Guardando...' : isEditing ? 'Guardar perfil' : 'Crear perfil'}
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}

function TimeInput({
  label,
  name,
  value,
  onChange,
  required = false,
}: {
  label: string;
  name: keyof FormValues;
  value: string;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
  required?: boolean;
}) {
  return (
    <label className="block text-sm">
      <span className="font-medium" style={{ color: 'var(--text-secondary)' }}>{label}</span>
      <input
        type="text" name={name} value={value} onChange={onChange} required={required}
        placeholder="HH:MM" pattern="^([01][0-9]|2[0-3]):[0-5][0-9]$" inputMode="numeric"
        className="mt-1 w-full rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
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

function NumberInput({
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
      <input
        type="number"
        min="0"
        name={name}
        value={value}
        onChange={onChange}
        className="mt-1 w-full rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
        style={{ background: 'var(--input-bg)', border: '1px solid var(--input-border)', color: 'var(--text-primary)' }}
      />
    </label>
  );
}
