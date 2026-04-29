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
      {pending ? 'Accediendo...' : 'Seguir adelante'}
    </button>
  );
}

export default function LoginPage() {
  const [state, action] = useFormState(login, undefined);
  const [showPassword, setShowPassword] = useState(false);

  return (
    <main className="grid min-h-screen bg-white text-slate-950 lg:grid-cols-[minmax(0,0.96fr)_minmax(520px,1.04fr)]">
      <section className="login-soft-panel relative flex min-h-screen flex-col px-6 py-8 sm:px-10 lg:px-12">
        <div className="relative z-10 flex flex-1 items-center justify-center py-12">
          <div className="w-full max-w-[390px]">
            {state?.error && (
              <div className="mb-8 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {state.error}
              </div>
            )}

            <form action={action} className="space-y-7">
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
        <div className="absolute bottom-6 right-6 z-20 lg:hidden">
          <BrandLogo
            variant="steel"
            layout="horizontal"
            className="justify-end"
            iconClassName="w-14"
            wordmarkClassName="w-48 max-w-[64vw]"
          />
        </div>
      </section>

      <section className="relative hidden min-h-screen overflow-hidden lg:block">
        <div className="absolute inset-0 login-brand-art" />
        <div className="absolute bottom-10 right-10 z-20">
          <BrandLogo
            variant="steel"
            layout="horizontal"
            className="justify-end"
            iconClassName="w-20"
            wordmarkClassName="w-72 max-w-[34vw]"
          />
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

        .login-soft-panel {
          overflow: hidden;
          background:
            linear-gradient(90deg, rgba(255,255,255,0.96), rgba(255,255,255,0.9)),
            linear-gradient(232deg, rgba(126,232,192,0.08) 0%, rgba(44,181,125,0.055) 24%, rgba(7,150,94,0.035) 48%, rgba(7,88,60,0.02) 70%, rgba(4,20,15,0.016) 100%);
        }

        .login-soft-panel::before,
        .login-soft-panel::after {
          content: '';
          position: absolute;
          inset: -12%;
          pointer-events: none;
        }

        .login-soft-panel::before {
          background:
            radial-gradient(circle at 22% 8%, rgba(7,150,94,0.055) 0 1px, transparent 2px),
            radial-gradient(circle at 80% 22%, rgba(7,150,94,0.045) 0 1px, transparent 2px),
            radial-gradient(circle at 28% 70%, rgba(7,150,94,0.035) 0 2px, transparent 3px),
            linear-gradient(52deg, transparent 0 34%, rgba(31,199,119,0.035) 40% 42%, transparent 54% 100%),
            linear-gradient(38deg, rgba(255,255,255,0.82), rgba(255,255,255,0.96));
          filter: saturate(0.42) contrast(0.62) brightness(1.72);
          opacity: 0.85;
          transform: scaleX(-1) rotate(-2deg);
        }

        .login-soft-panel::after {
          background:
            radial-gradient(ellipse at 76% 30%, rgba(31,199,119,0.032), transparent 18%),
            radial-gradient(ellipse at 30% 74%, rgba(7,88,60,0.026), transparent 26%),
            linear-gradient(58deg, transparent 0 18%, rgba(31,199,119,0.03) 24% 27%, transparent 36% 100%);
          filter: blur(12px) saturate(0.35) brightness(1.85);
          opacity: 0.64;
          transform: scaleX(-1) rotate(5deg);
        }

        .login-brand-art {
          background:
            radial-gradient(circle at 78% 8%, rgba(255,255,255,0.42) 0 1px, transparent 2px),
            radial-gradient(circle at 20% 22%, rgba(255,255,255,0.36) 0 1px, transparent 2px),
            radial-gradient(circle at 72% 70%, rgba(255,255,255,0.26) 0 2px, transparent 3px),
            radial-gradient(circle at 44% 58%, rgba(255,255,255,0.28) 0 3px, transparent 5px),
            linear-gradient(128deg, rgba(255,255,255,0.28) 0 3%, transparent 14% 100%),
            linear-gradient(112deg, transparent 0 12%, rgba(255,255,255,0.14) 16% 18%, transparent 25% 100%),
            linear-gradient(128deg, transparent 0 32%, rgba(0,69,47,0.58) 39% 43%, transparent 54% 100%),
            linear-gradient(142deg, #7ee8c0 0%, #2cb57d 24%, #07965e 48%, #07583c 70%, #04140f 100%);
        }

        .login-brand-art::before,
        .login-brand-art::after {
          content: '';
          position: absolute;
          inset: -12%;
          background:
            radial-gradient(ellipse at 24% 34%, rgba(255,255,255,0.36), transparent 18%),
            radial-gradient(ellipse at 70% 60%, rgba(107,255,189,0.28), transparent 22%),
            linear-gradient(120deg, transparent 0 22%, rgba(255,255,255,0.12) 26%, transparent 36% 100%);
          filter: blur(8px);
          transform: rotate(-7deg);
          mix-blend-mode: screen;
        }

        .login-brand-art::after {
          background:
            linear-gradient(115deg, transparent 0 18%, rgba(0,32,24,0.44) 24% 27%, transparent 34% 100%),
            radial-gradient(ellipse at 68% 30%, rgba(255,255,255,0.14), transparent 18%),
            radial-gradient(ellipse at 42% 74%, rgba(0,67,48,0.48), transparent 28%);
          filter: blur(4px);
          transform: rotate(9deg);
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
