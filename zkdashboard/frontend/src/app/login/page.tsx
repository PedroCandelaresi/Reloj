'use client';

import Image from 'next/image';
import { useState } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import { login } from '@/lib/actions';

function EyeIcon({ open }: { open: boolean }) {
  if (open) {
    return (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="h-5 w-5">
        <path
          d="M3 3l18 18"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M10.584 10.588A2 2 0 0013.412 13.4"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M9.364 5.365A10.48 10.48 0 0112 5c5.523 0 10 7 10 7a19.77 19.77 0 01-4.22 4.949M6.61 6.617C3.61 8.51 2 12 2 12a19.648 19.648 0 004.357 5.068A10.42 10.42 0 0012 19c1.772 0 3.443-.391 4.943-1.087"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="h-5 w-5">
      <path
        d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-2xl bg-[var(--brand)] px-4 py-3.5 text-sm font-semibold text-white shadow-[0_16px_38px_rgba(12,106,56,0.24)] transition hover:bg-[var(--brand-strong)] disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? 'Accediendo...' : 'Acceder'}
    </button>
  );
}

export default function LoginPage() {
  const [state, action] = useFormState(login, undefined);
  const [showPassword, setShowPassword] = useState(false);

  return (
    <main className="min-h-screen bg-[var(--surface-muted)]">
      <div className="grid min-h-screen lg:grid-cols-[minmax(0,1fr)_minmax(380px,0.9fr)]">
        <section className="relative flex items-center justify-center px-6 py-12 sm:px-10 lg:px-16">
          <div className="absolute inset-y-0 right-0 hidden w-px bg-slate-200/90 lg:block" />

          <div className="w-full max-w-sm">
            <div className="mb-10 flex items-center gap-3">
              <Image
                src="/brand/icon-512.png"
                alt="STARNET"
                width={40}
                height={40}
                className="h-10 w-10 rounded-lg object-contain"
                priority
              />
              <span className="font-display text-lg font-semibold tracking-tight text-slate-900">
                STARNET
              </span>
            </div>

            <h1 className="font-display text-3xl font-semibold tracking-tight text-slate-900">
              Acceder
            </h1>
            <p className="mt-2 text-sm text-slate-500">
              Ingresá con tus credenciales.
            </p>

            {state?.error && (
              <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {state.error}
              </div>
            )}

            <form action={action} className="mt-8 space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-600">Usuario</label>
                <input
                  name="username"
                  type="text"
                  required
                  autoComplete="username"
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[var(--brand)] focus:ring-4 focus:ring-[rgba(12,106,56,0.12)]"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-600">
                  Contraseña
                </label>
                <div className="group flex items-center rounded-2xl border border-slate-200 bg-white px-4 transition focus-within:border-[var(--brand)] focus-within:ring-4 focus-within:ring-[rgba(12,106,56,0.12)]">
                  <input
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    autoComplete="current-password"
                    className="w-full bg-transparent py-3 text-sm text-slate-900 outline-none placeholder:text-slate-400"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((current) => !current)}
                    aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                    className="ml-3 text-slate-400 transition hover:text-slate-700"
                  >
                    <EyeIcon open={showPassword} />
                  </button>
                </div>
              </div>

              <div className="pt-2">
                <SubmitButton />
              </div>
            </form>
          </div>
        </section>

        <aside className="relative hidden overflow-hidden bg-[radial-gradient(circle_at_top,_#1b7a48_0%,_#0d6136_28%,_#05371c_66%,_#021f0d_100%)] lg:flex lg:items-center lg:justify-center">
          <div className="relative flex flex-col items-center gap-5 px-8 text-center">
            <div className="relative h-40 w-40 overflow-hidden rounded-3xl ring-1 ring-white/15">
              <Image
                src="/brand/logo-mark.jpeg"
                alt="STARNET"
                fill
                sizes="10rem"
                className="object-cover"
                priority
              />
            </div>
            <p className="font-display text-2xl font-semibold tracking-tight text-white">
              STARNET
            </p>
          </div>
        </aside>
      </div>
    </main>
  );
}
