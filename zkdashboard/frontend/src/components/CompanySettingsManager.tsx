'use client';

import { useState, useTransition } from 'react';
import type { FormEvent } from 'react';
import type { CompanySummary } from '@/lib/api';
import { updateCompanySettingsAction } from '@/app/(protected)/settings/actions';

const WORK_DAY_OPTIONS = [
  ['mon', 'Lun'],
  ['tue', 'Mar'],
  ['wed', 'Mié'],
  ['thu', 'Jue'],
  ['fri', 'Vie'],
  ['sat', 'Sáb'],
  ['sun', 'Dom'],
] as const;

const DEFAULT_WORK_DAYS = ['mon', 'tue', 'wed', 'thu', 'fri'];

export function CompanySettingsManager({ company }: { company: CompanySummary }) {
  const [isPending, startTransition] = useTransition();
  const [defaultEntryTime, setDefaultEntryTime] = useState(company.defaultEntryTime ?? '');
  const [defaultExitTime, setDefaultExitTime] = useState(company.defaultExitTime ?? '');
  const [defaultWorkDays, setDefaultWorkDays] = useState<string[]>(
    company.defaultWorkDays?.length ? company.defaultWorkDays : DEFAULT_WORK_DAYS,
  );
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleWorkDayChange = (value: string, checked: boolean) => {
    setDefaultWorkDays((current) => {
      if (checked) {
        return current.includes(value) ? current : [...current, value];
      }

      return current.filter((day) => day !== value);
    });
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage(null);
    startTransition(() => {
      void updateCompanySettingsAction({ defaultEntryTime, defaultExitTime, defaultWorkDays }).then((result) => {
        if (result.error) { setMessage({ type: 'error', text: result.error }); return; }
        setMessage({ type: 'success', text: 'Horarios globales guardados correctamente.' });
      });
    });
  };

  const inputStyle = { background: 'var(--input-bg)', border: '1px solid var(--input-border)', color: 'var(--text-primary)' };

  return (
    <section className="card rounded-xl">
      <div className="px-6 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
        <h2 className="font-semibold" style={{ color: 'var(--text-primary)' }}>Horarios globales</h2>
        <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
          Estos horarios aplican por defecto a todos los empleados de la empresa. Cada empleado puede tener horarios propios si hace falta.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="px-6 py-5 space-y-5">
        {message && (
          <div className="rounded-lg border px-4 py-3 text-sm" style={
            message.type === 'success'
              ? { background: 'var(--brand-soft)', borderColor: 'rgba(31,199,119,0.3)', color: 'var(--brand-text)' }
              : { background: 'var(--danger-soft)', borderColor: 'rgba(230,45,66,0.3)', color: 'var(--danger-text)' }
          }>
            {message.text}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Entrada global</label>
            <input type="text" value={defaultEntryTime} onChange={(e) => setDefaultEntryTime(e.target.value)}
              placeholder="HH:MM" pattern="^([01][0-9]|2[0-3]):[0-5][0-9]$" inputMode="numeric"
              className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              style={inputStyle} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Salida global</label>
            <input type="text" value={defaultExitTime} onChange={(e) => setDefaultExitTime(e.target.value)}
              placeholder="HH:MM" pattern="^([01][0-9]|2[0-3]):[0-5][0-9]$" inputMode="numeric"
              className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              style={inputStyle} />
          </div>
        </div>

        <div>
          <p className="mb-2 text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Días laborales globales</p>
          <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4" style={{ color: 'var(--text-secondary)' }}>
            {WORK_DAY_OPTIONS.map(([value, label]) => (
              <label key={value} className="inline-flex items-center gap-2 rounded-lg px-3 py-2" style={{ background: 'var(--surface-raised)', border: '1px solid var(--border)' }}>
                <input
                  type="checkbox"
                  value={value}
                  checked={defaultWorkDays.includes(value)}
                  onChange={(event) => handleWorkDayChange(value, event.target.checked)}
                />
                {label}
              </label>
            ))}
          </div>
          <p className="mt-2 text-xs" style={{ color: 'var(--text-muted)' }}>
            Se usan para calcular ausencias cuando el empleado no tiene un perfil horario con días propios.
          </p>
        </div>

        <div className="flex justify-end">
          <button type="submit" disabled={isPending}
            className="rounded-lg bg-blue-600 hover:bg-blue-700 px-4 py-2 text-sm font-medium text-white disabled:opacity-60 transition-colors">
            {isPending ? 'Guardando...' : 'Guardar horarios'}
          </button>
        </div>
      </form>
    </section>
  );
}
