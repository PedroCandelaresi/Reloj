'use client';

import { useState, useTransition } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import type { ActionResult } from '@/app/(protected)/profile/actions';
import { changePasswordAction } from '@/app/(protected)/profile/actions';

type PasswordFormValues = {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
};

type BannerState =
  | { type: 'success'; text: string }
  | { type: 'error'; text: string }
  | null;

export function ChangePasswordManager() {
  const [isPending, startTransition] = useTransition();
  const [banner, setBanner] = useState<BannerState>(null);
  const [form, setForm] = useState<PasswordFormValues>({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBanner(null);

    if (form.newPassword !== form.confirmPassword) {
      setBanner({ type: 'error', text: 'La confirmación no coincide con la nueva contraseña.' });
      return;
    }

    startTransition(() => {
      void changePasswordAction({
        currentPassword: form.currentPassword,
        newPassword: form.newPassword,
      })
        .then((result: ActionResult) => {
          if (result.error) {
            setBanner({ type: 'error', text: result.error });
            return;
          }

          setForm({
            currentPassword: '',
            newPassword: '',
            confirmPassword: '',
          });
          setBanner({ type: 'success', text: 'Contraseña actualizada correctamente.' });
        })
        .catch(() => {
          setBanner({ type: 'error', text: 'No se pudo cambiar la contraseña.' });
        });
    });
  };

  return (
    <section className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
      <div className="px-6 py-5 border-b border-gray-100">
        <h1 className="text-2xl font-bold text-gray-900">Cambiar contraseña</h1>
        <p className="text-sm text-gray-500 mt-1">
          Ingresá tu contraseña actual y definí una nueva clave para tu usuario.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="px-6 py-6 space-y-5">
        {banner && (
          <div
            className={`rounded-lg border px-4 py-3 text-sm ${
              banner.type === 'success'
                ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                : 'border-red-200 bg-red-50 text-red-700'
            }`}
          >
            {banner.text}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Field
            label="Contraseña actual"
            name="currentPassword"
            type="password"
            value={form.currentPassword}
            onChange={handleChange}
            autoComplete="current-password"
          />
          <Field
            label="Nueva contraseña"
            name="newPassword"
            type="password"
            value={form.newPassword}
            onChange={handleChange}
            autoComplete="new-password"
          />
          <Field
            label="Confirmar nueva contraseña"
            name="confirmPassword"
            type="password"
            value={form.confirmPassword}
            onChange={handleChange}
            autoComplete="new-password"
          />
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isPending}
            className="px-5 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-60 transition-colors"
          >
            {isPending ? 'Actualizando...' : 'Cambiar contraseña'}
          </button>
        </div>
      </form>
    </section>
  );
}

function Field(props: {
  label: string;
  name: string;
  value: string;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
  type?: string;
  autoComplete?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{props.label}</label>
      <input
        name={props.name}
        type={props.type ?? 'text'}
        value={props.value}
        onChange={props.onChange}
        autoComplete={props.autoComplete}
        className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
    </div>
  );
}
