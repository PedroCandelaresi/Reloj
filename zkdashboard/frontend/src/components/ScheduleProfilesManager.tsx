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
    <section className="bg-white rounded-xl shadow-lg border border-gray-200">
      <div className="px-6 py-4 border-b border-gray-200">
        <h2 className="font-semibold text-gray-900">Perfiles de horario</h2>
        <p className="text-sm text-gray-500 mt-1">
          Creá perfiles para grupos de empleados y ajustá variaciones de verano o invierno.
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_420px] gap-6 p-6">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs uppercase text-gray-500 bg-gray-50">
                <th className="px-4 py-3 text-left">Perfil</th>
                <th className="px-4 py-3 text-left">Base</th>
                <th className="px-4 py-3 text-left">Verano</th>
                <th className="px-4 py-3 text-left">Invierno</th>
                <th className="px-4 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {profiles.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                    Todavía no hay perfiles horarios.
                  </td>
                </tr>
              ) : (
                profiles.map((profile) => (
                  <tr key={profile.id} className="hover:bg-emerald-50/50">
                    <td className="px-4 py-3 font-medium text-gray-900">{profile.name}</td>
                    <td className="px-4 py-3 text-gray-600">
                      {profile.entryTime} - {profile.exitTime}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {profile.summerEntryTime && profile.summerExitTime
                        ? `${profile.summerEntryTime} - ${profile.summerExitTime}`
                        : '—'}
                      {profile.summerStart && profile.summerEnd
                        ? ` · ${profile.summerStart} a ${profile.summerEnd}`
                        : ''}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {profile.winterEntryTime && profile.winterExitTime
                        ? `${profile.winterEntryTime} - ${profile.winterExitTime}`
                        : '—'}
                      {profile.winterStart && profile.winterEnd
                        ? ` · ${profile.winterStart} a ${profile.winterEnd}`
                        : ''}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setForm(toFormValues(profile));
                            setMessage(null);
                          }}
                          className="font-medium text-emerald-600 hover:text-emerald-700"
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(profile)}
                          disabled={isPending}
                          className="font-medium text-red-500 hover:text-red-600 disabled:opacity-60"
                        >
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

        <form onSubmit={handleSubmit} className="rounded-xl border border-gray-200 p-4 space-y-4">
          <div>
            <h3 className="font-semibold text-gray-900">
              {isEditing ? 'Editar perfil' : 'Nuevo perfil'}
            </h3>
            <p className="text-xs text-gray-500 mt-1">
              Las fechas de temporada usan formato MM-DD, por ejemplo 12-01.
            </p>
          </div>

          {message && (
            <div
              className={`rounded-lg border px-3 py-2 text-sm ${
                message.type === 'success'
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                  : 'border-red-200 bg-red-50 text-red-700'
              }`}
            >
              {message.text}
            </div>
          )}

          <label className="block text-sm">
            <span className="font-medium text-gray-700">Nombre</span>
            <input
              name="name"
              value={form.name}
              onChange={handleChange}
              required
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
          </label>

          <div className="grid grid-cols-2 gap-3">
            <TimeInput label="Entrada base" name="entryTime" value={form.entryTime} onChange={handleChange} required />
            <TimeInput label="Salida base" name="exitTime" value={form.exitTime} onChange={handleChange} required />
          </div>

          <div className="rounded-lg bg-blue-50/70 p-3 space-y-3">
            <p className="text-xs font-semibold uppercase text-blue-700">Verano</p>
            <div className="grid grid-cols-2 gap-3">
              <TimeInput label="Entrada" name="summerEntryTime" value={form.summerEntryTime} onChange={handleChange} />
              <TimeInput label="Salida" name="summerExitTime" value={form.summerExitTime} onChange={handleChange} />
              <MonthDayInput label="Desde" name="summerStart" value={form.summerStart} onChange={handleChange} />
              <MonthDayInput label="Hasta" name="summerEnd" value={form.summerEnd} onChange={handleChange} />
            </div>
          </div>

          <div className="rounded-lg bg-slate-50 p-3 space-y-3">
            <p className="text-xs font-semibold uppercase text-slate-700">Invierno</p>
            <div className="grid grid-cols-2 gap-3">
              <TimeInput label="Entrada" name="winterEntryTime" value={form.winterEntryTime} onChange={handleChange} />
              <TimeInput label="Salida" name="winterExitTime" value={form.winterExitTime} onChange={handleChange} />
              <MonthDayInput label="Desde" name="winterStart" value={form.winterStart} onChange={handleChange} />
              <MonthDayInput label="Hasta" name="winterEnd" value={form.winterEnd} onChange={handleChange} />
            </div>
          </div>

          <div className="flex justify-end gap-2">
            {isEditing && (
              <button
                type="button"
                onClick={resetForm}
                disabled={isPending}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-600"
              >
                Cancelar
              </button>
            )}
            <button
              type="submit"
              disabled={isPending}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
            >
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
      <span className="font-medium text-gray-700">{label}</span>
      <input
        type="time"
        name={name}
        value={value}
        onChange={onChange}
        required={required}
        step={60}
        className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
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
      <span className="font-medium text-gray-700">{label}</span>
      <input
        name={name}
        value={value}
        onChange={onChange}
        placeholder="MM-DD"
        pattern="^(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])$"
        className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
      />
    </label>
  );
}
