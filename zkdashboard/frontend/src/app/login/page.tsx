'use client';

import { useState } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import { login } from '@/lib/actions';
import { BrandLogo } from '@/components/BrandLogo';

function EyeIcon({ open }: { open: boolean }) {
  if (open) {
    return (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="h-5 w-5">
        <path d="M3 3l18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M10.58 10.58A2 2 0 0013.42 13.4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M9.36 5.36A10.5 10.5 0 0112 5c5.52 0 10 7 10 7a19.8 19.8 0 01-4.22 4.95M6.61 6.62C3.61 8.51 2 12 2 12a19.6 19.6 0 004.36 5.07A10.4 10.4 0 0012 19c1.77 0 3.44-.39 4.94-1.09" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="h-5 w-5">
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

function UserIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="h-5 w-5">
      <path d="M20 21a8 8 0 10-16 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <circle cx="12" cy="7" r="4" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="h-14 w-full rounded-md bg-emerald-600 px-4 text-sm font-semibold text-white shadow-[0_16px_34px_rgba(31,199,119,0.28)] transition-colors hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? 'Accediendo...' : 'Acceder'}
    </button>
  );
}

export default function LoginPage() {
  const [state, action] = useFormState(login, undefined);
  const [showPassword, setShowPassword] = useState(false);

  return (
    <main className="grid min-h-screen bg-white text-slate-950 lg:grid-cols-[minmax(0,0.96fr)_minmax(520px,1.04fr)]">
      <section className="relative flex min-h-screen flex-col px-6 py-8 sm:px-10 lg:px-12">
        <div className="flex h-16 items-center">
          <BrandLogo
            variant="emerald"
            layout="horizontal"
            className="justify-start"
            iconClassName="w-10"
            wordmarkClassName="w-44"
          />
        </div>

        <div className="flex flex-1 items-center justify-center py-12">
          <div className="w-full max-w-[390px]">
            <p className="text-base font-medium text-slate-500">Panel operativo</p>
            <h1 className="mt-4 text-3xl font-bold tracking-normal text-slate-950">
              Ingresar a CONFLUNET
            </h1>

            {state?.error && (
              <div className="mt-8 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {state.error}
              </div>
            )}

            <form action={action} className="mt-12 space-y-7">
              <label className="login-outline-field block">
                <span>Usuario</span>
                <div className="flex h-14 items-center gap-3 px-4">
                  <input
                    name="username"
                    type="text"
                    required
                    autoComplete="username"
                    placeholder="tu.usuario"
                    className="min-w-0 flex-1 bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
                  />
                  <span className="text-slate-300">
                    <UserIcon />
                  </span>
                </div>
              </label>

              <label className="login-outline-field block">
                <span>Contraseña</span>
                <div className="flex h-14 items-center gap-3 px-4">
                  <input
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    autoComplete="current-password"
                    placeholder="••••••••"
                    className="min-w-0 flex-1 bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((current) => !current)}
                    aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                    className="text-slate-300 transition-colors hover:text-emerald-600"
                  >
                    <EyeIcon open={showPassword} />
                  </button>
                </div>
              </label>

              <SubmitButton />
            </form>
          </div>
        </div>

        <p className="text-sm text-slate-400">Acceso seguro para empresas y administradores.</p>
      </section>

      <section className="relative hidden min-h-screen overflow-hidden lg:block">
        <div className="absolute inset-0 login-brand-art" />
        <div className="absolute inset-0 login-brand-grid opacity-40" />
        <div className="absolute left-12 top-12 rounded-full border border-white/25 bg-white/20 px-4 py-2 text-sm font-medium text-white shadow-lg backdrop-blur-md">
          ADMS activo
        </div>
        <div className="absolute bottom-14 left-12 right-12 max-w-xl text-white">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-100/90">ZKTeco conectado</p>
          <h2 className="mt-4 text-4xl font-bold leading-tight tracking-normal drop-shadow-sm">
            Control de asistencia claro, centralizado y listo para operar.
          </h2>
        </div>
      </section>

      <style jsx>{`
        .login-outline-field {
          position: relative;
          border: 1px solid #d6d9d6;
          border-radius: 5px;
          background: #ffffff;
          transition: border-color 160ms ease, box-shadow 160ms ease;
        }

        .login-outline-field:focus-within {
          border-color: #1fc777;
          box-shadow: 0 0 0 3px rgba(31, 199, 119, 0.14);
        }

        .login-outline-field > span {
          position: absolute;
          top: -0.72rem;
          left: 1rem;
          background: #ffffff;
          padding: 0 0.45rem;
          color: #17a85f;
          font-size: 0.82rem;
          font-weight: 600;
        }

        .login-brand-art {
          background:
            radial-gradient(circle at 78% 8%, rgba(255,255,255,0.78) 0 1px, transparent 2px),
            radial-gradient(circle at 18% 22%, rgba(255,255,255,0.62) 0 1px, transparent 2px),
            radial-gradient(circle at 74% 70%, rgba(255,255,255,0.46) 0 2px, transparent 3px),
            radial-gradient(circle at 44% 58%, rgba(255,255,255,0.54) 0 3px, transparent 5px),
            linear-gradient(128deg, rgba(255,255,255,0.58) 0 3%, transparent 14% 100%),
            linear-gradient(112deg, transparent 0 12%, rgba(255,255,255,0.26) 16% 18%, transparent 25% 100%),
            linear-gradient(128deg, transparent 0 33%, rgba(9,102,69,0.42) 39% 42%, transparent 52% 100%),
            linear-gradient(142deg, #d9fff0 0%, #a9efd1 22%, #1fc777 47%, #0f7f52 69%, #0d2519 100%);
        }

        .login-brand-art::before,
        .login-brand-art::after {
          content: '';
          position: absolute;
          inset: -12%;
          background:
            radial-gradient(ellipse at 24% 34%, rgba(255,255,255,0.58), transparent 18%),
            radial-gradient(ellipse at 70% 60%, rgba(196,255,226,0.42), transparent 22%),
            linear-gradient(120deg, transparent 0 22%, rgba(255,255,255,0.24) 26%, transparent 36% 100%);
          filter: blur(8px);
          transform: rotate(-7deg);
          mix-blend-mode: screen;
        }

        .login-brand-art::after {
          background:
            linear-gradient(115deg, transparent 0 18%, rgba(0,52,36,0.3) 24% 27%, transparent 34% 100%),
            radial-gradient(ellipse at 68% 30%, rgba(255,255,255,0.22), transparent 18%),
            radial-gradient(ellipse at 42% 74%, rgba(9,102,69,0.34), transparent 28%);
          filter: blur(4px);
          transform: rotate(9deg);
        }

        .login-brand-grid {
          background:
            linear-gradient(rgba(255,255,255,0.14) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px);
          background-size: 42px 42px;
          mask-image: linear-gradient(90deg, transparent 0%, black 22%, black 100%);
        }

        input:-webkit-autofill,
        input:-webkit-autofill:hover,
        input:-webkit-autofill:focus,
        input:-webkit-autofill:active {
          -webkit-text-fill-color: #0f172a;
          caret-color: #0f172a;
          transition: background-color 9999s ease-in-out 0s;
          box-shadow: 0 0 0 1000px #ffffff inset;
        }
      `}</style>
    </main>
  );
}
