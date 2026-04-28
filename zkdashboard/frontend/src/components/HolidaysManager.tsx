'use client';

import { useState, useTransition } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import {
  deleteHolidayAction,
  saveHolidayAction,
} from '@/app/(protected)/settings/holidays/actions';
import type { CurrentUserProfile, Holiday, HolidayInput } from '@/lib/api';

type HolidayType = 'national' | 'company' | 'regional';

type FormValues = {
  id: string;
  date: string;
  name: string;
  type: HolidayType;
  isWorkable: boolean;
};

const EMPTY_FORM: FormValues = {
  id: '',
  date: '',
  name: '',
  type: 'company',
  isWorkable: false,
};

const TYPE_LABELS: Record<HolidayType, string> = {
  national: 'Nacional',
  company: 'Empresa',
  regional: 'Regional',
};

function toFormValues(holiday: Holiday): FormValues {
  return {
    id: holiday.id,
    date: holiday.date,
    name: holiday.name,
    type: holiday.type,
    isWorkable: holiday.isWorkable,
  };
}

function canWrite(user: CurrentUserProfile) {
  return user.isSuperAdmin || user.companyRole === 'company_admin';
}

function canEditHoliday(user: CurrentUserProfile, holiday: Holiday) {
  return user.isSuperAdmin || (user.companyRole === 'company_admin' && holiday.companyId === user.companyId);
}

export function HolidaysManager({
  holidays,
  user,
}: {
  holidays: Holiday[];
  user: CurrentUserProfile;
}) {
  const router = useRouter();
  const writable = canWrite(user);
  const [isPending, startTransition] = useTransition();
  const [form, setForm] = useState<FormValues>(user.isSuperAdmin ? { ...EMPTY_FORM, type: 'national' } : EMPTY_FORM);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const isEditing = Boolean(form.id);

  const handleChange = (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const handleWorkableChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { checked } = event.target;
    setForm((current) => ({ ...current, isWorkable: checked }));
  };

  const resetForm = () => {
    setForm(user.isSuperAdmin ? { ...EMPTY_FORM, type: 'national' } : EMPTY_FORM);
    setMessage(null);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage(null);

    if (!writable) return;
    if (!form.date || !form.name.trim()) {
      setMessage({ type: 'error', text: 'Completá fecha y nombre.' });
      return;
    }

    const payload: HolidayInput & { id?: string } = {
      id: form.id || undefined,
      date: form.date,
      name: form.name,
      type: form.type,
      isWorkable: form.isWorkable,
      companyId: user.isSuperAdmin ? null : undefined,
    };

    startTransition(() => {
      void saveHolidayAction(payload).then((result) => {
        if (result.error) {
          setMessage({ type: 'error', text: result.error });
          return;
        }

        setMessage({ type: 'success', text: isEditing ? 'Feriado actualizado.' : 'Feriado creado.' });
        resetForm();
        router.refresh();
      });
    });
  };

  const handleDelete = (holiday: Holiday) => {
    setMessage(null);
    if (!writable || !window.confirm(`¿Eliminar el feriado ${holiday.name}?`)) return;

    startTransition(() => {
      void deleteHolidayAction(holiday.id).then((result) => {
        if (result.error) {
          setMessage({ type: 'error', text: result.error });
          return;
        }

        if (form.id === holiday.id) resetForm();
        setMessage({ type: 'success', text: 'Feriado eliminado.' });
        router.refresh();
      });
    });
  };

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
      <section className="card rounded-xl">
        <div className="px-6 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
          <h2 className="font-semibold" style={{ color: 'var(--text-primary)' }}>Feriados cargados</h2>
          <p className="mt-1 text-sm" style={{ color: 'var(--text-muted)' }}>
            Los feriados no laborables evitan marcar ausencia al recalcular summaries.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="table-header-row text-xs uppercase">
                <th className="px-6 py-4 text-left font-semibold">Fecha</th>
                <th className="px-6 py-4 text-left font-semibold">Nombre</th>
                <th className="px-6 py-4 text-left font-semibold">Tipo</th>
                <th className="px-6 py-4 text-left font-semibold">Alcance</th>
                <th className="px-6 py-4 text-left font-semibold">Laborable</th>
                {writable && <th className="px-6 py-4 text-right font-semibold">Acciones</th>}
              </tr>
            </thead>
            <tbody>
              {holidays.length === 0 ? (
                <tr>
                  <td colSpan={writable ? 6 : 5} className="px-6 py-10 text-center" style={{ color: 'var(--text-muted)' }}>
                    No hay feriados para el filtro seleccionado.
                  </td>
                </tr>
              ) : (
                holidays.map((holiday) => {
                  const editable = canEditHoliday(user, holiday);
                  return (
                    <tr key={holiday.id} className="table-row">
                        <td className="px-6 py-4" style={{ color: 'var(--text-secondary)' }}>{holiday.date}</td>
                        <td className="px-6 py-4 font-medium" style={{ color: 'var(--text-primary)' }}>{holiday.name}</td>
                        <td className="px-6 py-4" style={{ color: 'var(--text-secondary)' }}>{TYPE_LABELS[holiday.type]}</td>
                        <td className="px-6 py-4" style={{ color: 'var(--text-secondary)' }}>
                          {holiday.companyId ? 'Empresa' : 'Global'}
                        </td>
                        <td className="px-6 py-4" style={{ color: 'var(--text-secondary)' }}>
                          {holiday.isWorkable ? 'Sí' : 'No'}
                        </td>
                        {writable && (
                          <td className="px-6 py-4">
                            {editable ? (
                              <div className="flex justify-end gap-3">
                                <button type="button" onClick={() => { setForm(toFormValues(holiday)); setMessage(null); }}
                                  className="font-medium" style={{ color: 'var(--brand-text)' }}>
                                  Editar
                                </button>
                                <button type="button" onClick={() => handleDelete(holiday)} disabled={isPending}
                                  className="font-medium disabled:opacity-60" style={{ color: 'var(--danger-text)' }}>
                                  Eliminar
                                </button>
                              </div>
                            ) : (
                              <span className="block text-right text-xs" style={{ color: 'var(--text-muted)' }}>Solo lectura</span>
                            )}
                          </td>
                        )}
                      </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      {writable && (
        <section className="card rounded-xl">
          <div className="px-5 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
            <h2 className="font-semibold" style={{ color: 'var(--text-primary)' }}>
              {isEditing ? 'Editar feriado' : 'Nuevo feriado'}
            </h2>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 p-5">
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
              <span className="font-medium" style={{ color: 'var(--text-secondary)' }}>Fecha</span>
              <input type="date" name="date" value={form.date} onChange={handleChange} required
                className="mt-1 w-full rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                style={{ background: 'var(--input-bg)', border: '1px solid var(--input-border)', color: 'var(--text-primary)' }}
              />
            </label>

            <label className="block text-sm">
              <span className="font-medium" style={{ color: 'var(--text-secondary)' }}>Nombre</span>
              <input name="name" value={form.name} onChange={handleChange} required
                className="mt-1 w-full rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                style={{ background: 'var(--input-bg)', border: '1px solid var(--input-border)', color: 'var(--text-primary)' }}
              />
            </label>

            <label className="block text-sm">
              <span className="font-medium" style={{ color: 'var(--text-secondary)' }}>Tipo</span>
              <select name="type" value={form.type} onChange={handleChange}
                className="mt-1 w-full rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                style={{ background: 'var(--input-bg)', border: '1px solid var(--input-border)', color: 'var(--text-primary)' }}
              >
                <option value="national">Nacional</option>
                <option value="company">Empresa</option>
                <option value="regional">Regional</option>
              </select>
            </label>

            <label className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
              <input type="checkbox" checked={form.isWorkable} onChange={handleWorkableChange} />
              Laborable
            </label>

            <div className="flex justify-end gap-2">
              {isEditing && (
                <button type="button" onClick={resetForm}
                  className="rounded-lg px-4 py-2 text-sm font-medium"
                  style={{ border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
                  Cancelar
                </button>
              )}
              <button type="submit" disabled={isPending}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-60">
                {isPending ? 'Guardando...' : isEditing ? 'Guardar' : 'Crear'}
              </button>
            </div>
          </form>
        </section>
      )}
    </div>
  );
}
