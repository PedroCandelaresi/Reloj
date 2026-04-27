'use client';

import { useState, useTransition } from 'react';
import type { FormEvent } from 'react';
import type { CompanySummary } from '@/lib/api';
import { updateCompanySettingsAction } from '@/app/(protected)/settings/actions';

export function CompanySettingsManager({ company }: { company: CompanySummary }) {
  const [isPending, startTransition] = useTransition();
  const [defaultEntryTime, setDefaultEntryTime] = useState(company.defaultEntryTime ?? '');
  const [defaultExitTime, setDefaultExitTime] = useState(company.defaultExitTime ?? '');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage(null);

    startTransition(() => {
      void updateCompanySettingsAction({ defaultEntryTime, defaultExitTime }).then((result) => {
        if (result.error) {
          setMessage({ type: 'error', text: result.error });
          return;
        }

        setMessage({ type: 'success', text: 'Horarios globales guardados correctamente.' });
      });
    });
  };

  return (
    <section className="bg-white rounded-xl shadow-lg border border-gray-200">
      <div className="px-6 py-4 border-b border-gray-200">
        <h2 className="font-semibold text-gray-900">Horarios globales</h2>
        <p className="text-sm text-gray-500 mt-1">
          Estos horarios aplican por defecto a todos los empleados de la empresa. Cada empleado puede
          tener horarios propios si hace falta.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="px-6 py-5 space-y-5">
        {message && (
          <div
            className={`rounded-lg border px-4 py-3 text-sm ${
              message.type === 'success'
                ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                : 'border-red-200 bg-red-50 text-red-700'
            }`}
          >
            {message.text}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Entrada global
            </label>
            <input
              type="time"
              value={defaultEntryTime}
              onChange={(event) => setDefaultEntryTime(event.target.value)}
              step={60}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Salida global
            </label>
            <input
              type="time"
              value={defaultExitTime}
              onChange={(event) => setDefaultExitTime(event.target.value)}
              step={60}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isPending}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
          >
            {isPending ? 'Guardando...' : 'Guardar horarios'}
          </button>
        </div>
      </form>
    </section>
  );
}
