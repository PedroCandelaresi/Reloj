'use client';

import { useMemo, useState } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import { login } from '@/lib/actions';
import { BrandLogo } from '@/components/BrandLogo';

function EyeIcon({ open }: { open: boolean }) {
  if (open) {
    return (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="h-5 w-5">
        <path d="M3 3l18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M10.584 10.588A2 2 0 0013.412 13.4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M9.364 5.365A10.48 10.48 0 0112 5c5.523 0 10 7 10 7a19.77 19.77 0 01-4.22 4.949M6.61 6.617C3.61 8.51 2 12 2 12a19.648 19.648 0 004.357 5.068A10.42 10.42 0 0012 19c1.772 0 3.443-.391 4.943-1.087" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
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

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-xl bg-emerald-600 hover:bg-emerald-500 px-4 py-3 text-sm font-semibold text-white transition-colors disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? 'Accediendo...' : 'Acceder'}
    </button>
  );
}

export default function LoginPage() {
  const [state, action] = useFormState(login, undefined);
  const [showPassword, setShowPassword] = useState(false);

  const particles = useMemo(() => {
    return Array.from({ length: 14 }, (_, i) => ({
      id: i,
      left: `${Math.random() * 100}%`,
      top: `${Math.random() * 100}%`,
      size: `${1.5 + Math.random() * 3.5}px`,
      duration: `${5 + Math.random() * 8}s`,
      delay: `${Math.random() * 7}s`,
      opacity: 0.15 + Math.random() * 0.35,
    }));
  }, []);

  return (
    <main
      className="relative flex min-h-screen items-center justify-center overflow-hidden px-6 py-10 text-white"
      style={{ background: '#0d2519' }}
    >
      {/* Background: always-dark matrix texture */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute inset-0 matrix-dark" />
        <div className="absolute inset-0 scanlines-dark opacity-50" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(24,105,65,0.24)_0%,transparent_46%,rgba(0,0,0,0.32)_100%)]" />

        {/* Particles */}
        {particles.map((p) => (
          <span
            key={p.id}
            className="absolute rounded-full bg-emerald-300 shadow-[0_0_8px_rgba(35,255,153,0.4)] animate-float-particle"
            style={{
              left: p.left,
              top: p.top,
              width: p.size,
              height: p.size,
              opacity: p.opacity,
              animationDuration: p.duration,
              animationDelay: p.delay,
            }}
          />
        ))}
      </div>

      {/* Card */}
      <div
        className="login-glass-card relative isolate z-10 w-full max-w-sm overflow-hidden rounded-2xl px-8 py-9"
        style={{
          background: 'linear-gradient(145deg, rgba(24,29,34,0.74), rgba(7,11,14,0.82))',
          border: '1px solid rgba(240,248,252,0.22)',
          backdropFilter: 'blur(26px) saturate(1.18)',
          boxShadow: '0 26px 70px rgba(0,0,0,0.42), inset 0 1px 0 rgba(255,255,255,0.30), inset 0 -1px 0 rgba(0,0,0,0.38), inset 1px 0 0 rgba(255,255,255,0.12), inset -1px 0 0 rgba(255,255,255,0.05)',
        }}
      >
        {/* Logo */}
        <div className="relative z-10 flex flex-col items-center gap-4 mb-8">
          <BrandLogo
            variant="steel"
            layout="stacked"
            className="w-full"
            iconClassName="w-28 sm:w-32"
            wordmarkClassName="w-full max-w-[13rem] mx-auto drop-shadow-[0_2px_10px_rgba(255,255,255,0.12)]"
          />
          <p className="text-sm text-center text-slate-200/68">
            Ingresá con tus credenciales
          </p>
        </div>

        {state?.error && (
          <div className="relative z-10 mb-5 rounded-xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {state.error}
          </div>
        )}

        <form action={action} className="relative z-10 space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-200/72 uppercase tracking-wide">
              Usuario
            </label>
            <input
              name="username"
              type="text"
              required
              autoComplete="username"
              placeholder="tu.usuario"
              className="login-field w-full rounded-xl px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:ring-2 focus:ring-emerald-500/45"
              style={{
                background: 'rgba(19,29,36,0.86)',
                border: '1px solid rgba(214,226,232,0.14)',
              }}
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-200/72 uppercase tracking-wide">
              Contraseña
            </label>
            <div
              className="login-password-field flex items-center rounded-xl transition focus-within:ring-2 focus-within:ring-emerald-500/45"
              style={{
                background: 'rgba(19,29,36,0.86)',
                border: '1px solid rgba(214,226,232,0.14)',
              }}
            >
              <input
                name="password"
                type={showPassword ? 'text' : 'password'}
                required
                autoComplete="current-password"
                placeholder="••••••••"
                className="login-field min-w-0 flex-1 rounded-l-xl bg-transparent py-3 pl-4 pr-3 text-sm text-white outline-none placeholder:text-slate-500"
              />
              <button
                type="button"
                onClick={() => setShowPassword((c) => !c)}
                aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                className="flex h-full shrink-0 items-center rounded-r-xl px-4 text-slate-500 transition-colors hover:text-slate-300"
              >
                <EyeIcon open={showPassword} />
              </button>
            </div>
          </div>

          <div className="pt-1">
            <SubmitButton />
          </div>
        </form>
      </div>

      <style jsx>{`
        @keyframes floatParticle {
          0%   { transform: translateY(0px) scale(1);     opacity: 0.15; }
          50%  { transform: translateY(-12px) scale(1.15); opacity: 0.7;  }
          100% { transform: translateY(0px) scale(1);     opacity: 0.15; }
        }
        .animate-float-particle {
          animation-name: floatParticle;
          animation-timing-function: ease-in-out;
          animation-iteration-count: infinite;
        }
        .login-glass-card::before {
          content: '';
          position: absolute;
          inset: 0;
          z-index: 0;
          border-radius: 1rem;
          background:
            linear-gradient(116deg, transparent 0%, transparent 17%, rgba(255,255,255,0.22) 19%, rgba(255,255,255,0.075) 25%, transparent 32%),
            linear-gradient(116deg, transparent 52%, rgba(255,255,255,0.12) 57%, rgba(255,255,255,0.035) 64%, transparent 72%),
            radial-gradient(ellipse at 24% 8%, rgba(255,255,255,0.24), transparent 34%),
            radial-gradient(ellipse at 88% 92%, rgba(64,255,190,0.08), transparent 38%);
          mix-blend-mode: screen;
          opacity: 0.95;
          pointer-events: none;
        }
        .login-glass-card::after {
          content: '';
          position: absolute;
          inset: 1px;
          z-index: 0;
          border-radius: 0.95rem;
          background:
            linear-gradient(180deg, rgba(255,255,255,0.18), transparent 18%),
            linear-gradient(90deg, rgba(255,255,255,0.12), transparent 16%, transparent 84%, rgba(255,255,255,0.06)),
            radial-gradient(ellipse at 50% 0%, rgba(255,255,255,0.28), transparent 42%);
          box-shadow: inset 0 0 0 1px rgba(255,255,255,0.08);
          opacity: 0.78;
          pointer-events: none;
        }
        .login-field:-webkit-autofill,
        .login-field:-webkit-autofill:hover,
        .login-field:-webkit-autofill:focus,
        .login-field:-webkit-autofill:active {
          -webkit-text-fill-color: #fff;
          caret-color: #fff;
          transition: background-color 9999s ease-in-out 0s;
          box-shadow: 0 0 0 1000px rgba(19,29,36,0.86) inset;
        }
        .login-password-field .login-field:-webkit-autofill,
        .login-password-field .login-field:-webkit-autofill:hover,
        .login-password-field .login-field:-webkit-autofill:focus,
        .login-password-field .login-field:-webkit-autofill:active {
          box-shadow: 0 0 0 1000px transparent inset;
        }
      `}</style>
    </main>
  );
}
