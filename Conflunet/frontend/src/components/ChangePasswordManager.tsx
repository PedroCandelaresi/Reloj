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
      void changePasswordAction({ currentPassword: form.currentPassword, newPassword: form.newPassword })
        .then((result: ActionResult) => {
          if (result.error) { setBanner({ type: 'error', text: result.error }); return; }
          setForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
          setBanner({ type: 'success', text: 'Contraseña actualizada correctamente.' });
        })
        .catch(() => { setBanner({ type: 'error', text: 'No se pudo cambiar la contraseña.' }); });
    });
  };

  return (
    <section className="card rounded-2xl overflow-hidden">
      <div className="px-6 py-5" style={{ borderBottom: '1px solid var(--border)' }}>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Cambiar contraseña</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
          Ingresá tu contraseña actual y definí una nueva clave para tu usuario.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="px-6 py-6 space-y-5">
        {banner && (
          <div className="rounded-lg border px-4 py-3 text-sm" style={
            banner.type === 'success'
              ? { background: 'var(--brand-soft)', borderColor: 'rgba(31,199,119,0.3)', color: 'var(--brand-text)' }
              : { background: 'var(--danger-soft)', borderColor: 'rgba(230,45,66,0.3)', color: 'var(--danger-text)' }
          }>
            {banner.text}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Field label="Contraseña actual"           name="currentPassword" type="password" value={form.currentPassword} onChange={handleChange} autoComplete="current-password" />
          <Field label="Nueva contraseña"            name="newPassword"     type="password" value={form.newPassword}     onChange={handleChange} autoComplete="new-password" />
          <Field label="Confirmar nueva contraseña"  name="confirmPassword" type="password" value={form.confirmPassword} onChange={handleChange} autoComplete="new-password" />
        </div>

        <div className="flex justify-end">
          <button type="submit" disabled={isPending}
            className="px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium disabled:opacity-60 transition-colors">
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
      <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>{props.label}</label>
      <input name={props.name} type={props.type ?? 'text'} value={props.value} onChange={props.onChange} autoComplete={props.autoComplete}
        className="w-full rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
        style={{ background: 'var(--input-bg)', border: '1px solid var(--input-border)', color: 'var(--text-primary)' }}
      />
    </div>
  );
}
