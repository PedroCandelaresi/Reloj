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
      style={{ background: '#030e06' }}
    >
      {/* Background: always-dark matrix texture */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute inset-0 matrix-dark" />
        <div className="absolute inset-0 scanlines-dark opacity-50" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_30%,rgba(0,0,0,0.55)_100%)]" />

        {/* Decorative ring */}
        <div className="absolute left-1/2 top-1/2 h-[50rem] w-[50rem] -translate-x-1/2 -translate-y-1/2 rounded-full border border-emerald-400/8" />
        <div className="absolute left-1/2 top-1/2 h-[34rem] w-[34rem] -translate-x-1/2 -translate-y-1/2 rounded-full border border-emerald-400/5" />

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
        className="relative z-10 w-full max-w-sm rounded-2xl px-8 py-9"
        style={{
          background: 'rgba(4, 18, 8, 0.82)',
          border: '1px solid rgba(31, 199, 119, 0.14)',
          backdropFilter: 'blur(12px)',
          boxShadow: '0 24px 64px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.06)',
        }}
      >
        {/* Logo */}
        <div className="flex flex-col items-center gap-4 mb-8">
          <BrandLogo
            variant="emerald"
            layout="stacked"
            className="w-full"
            iconClassName="w-28 sm:w-32"
            wordmarkClassName="w-full max-w-[13rem] mx-auto"
          />
          <p className="text-sm text-center text-emerald-100/60">
            Ingresá con tus credenciales
          </p>
        </div>

        {state?.error && (
          <div className="mb-5 rounded-xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {state.error}
          </div>
        )}

        <form action={action} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-emerald-100/70 uppercase tracking-wide">
              Usuario
            </label>
            <input
              name="username"
              type="text"
              required
              autoComplete="username"
              placeholder="tu.usuario"
              className="w-full rounded-xl px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:ring-2 focus:ring-emerald-500/50"
              style={{
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.1)',
              }}
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-emerald-100/70 uppercase tracking-wide">
              Contraseña
            </label>
            <div
              className="flex items-center rounded-xl px-4 transition focus-within:ring-2 focus-within:ring-emerald-500/50"
              style={{
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.1)',
              }}
            >
              <input
                name="password"
                type={showPassword ? 'text' : 'password'}
                required
                autoComplete="current-password"
                placeholder="••••••••"
                className="w-full bg-transparent py-3 text-sm text-white outline-none placeholder:text-slate-500"
              />
              <button
                type="button"
                onClick={() => setShowPassword((c) => !c)}
                aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                className="ml-3 shrink-0 text-slate-500 hover:text-slate-300 transition-colors"
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
      `}</style>
    </main>
  );
}
