'use client';

import { useMemo, useState } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import { login } from '@/lib/actions';
import { BrandLogo } from '@/components/BrandLogo';

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
      className="w-full rounded-2xl bg-gradient-to-r from-emerald-700 via-emerald-600 to-green-700 px-4 py-3.5 text-sm font-semibold text-white shadow-[0_12px_30px_rgba(0,0,0,0.35)] transition hover:scale-[1.01] hover:from-emerald-600 hover:via-emerald-500 hover:to-green-600 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? 'Accediendo...' : 'Acceder'}
    </button>
  );
}

export default function LoginPage() {
  const [state, action] = useFormState(login, undefined);
  const [showPassword, setShowPassword] = useState(false);

  const particles = useMemo(() => {
    return Array.from({ length: 26 }, (_, i) => ({
      id: i,
      left: `${Math.random() * 100}%`,
      top: `${Math.random() * 100}%`,
      size: `${2 + Math.random() * 5}px`,
      duration: `${4 + Math.random() * 8}s`,
      delay: `${Math.random() * 6}s`,
      opacity: 0.25 + Math.random() * 0.5,
    }));
  }, []);

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-6 py-10 text-white" style={{ background: '#0d1410' }}>
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute inset-0 conflunet-matrix-bg" />
        <div className="absolute inset-0 conflunet-scanlines opacity-70" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_34%,rgba(0,0,0,0.38)_100%)]" />

        {particles.map((p) => (
          <span
            key={p.id}
            className="absolute rounded-full bg-emerald-200 shadow-[0_0_14px_rgba(35,255,153,0.55)] animate-float-particle"
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

        <div className="absolute left-1/2 top-1/2 h-[44rem] w-[44rem] -translate-x-1/2 -translate-y-1/2 rounded-full border border-emerald-300/10" />
      </div>

      <div
        className="relative z-10 w-full max-w-md rounded-[34px] p-[5px] shadow-[0_30px_100px_rgba(0,0,0,0.62)]"
        style={{
          background:
            'linear-gradient(145deg, #f5f5f5 0%, #bfc4cc 10%, #7f8791 20%, #e6ebef 32%, #7f8791 44%, #c5ccd3 58%, #6b737c 72%, #e8edf2 86%, #9aa2ab 100%)',
        }}
      >
        <div
          className="rounded-[29px] px-7 py-8 sm:px-8 sm:py-10"
          style={{
            background:
              'linear-gradient(180deg, rgba(3,20,10,0.92) 0%, rgba(1,8,5,0.94) 100%)',
            boxShadow:
              'inset 0 1px 0 rgba(255,255,255,0.22), inset 0 -1px 0 rgba(0,0,0,0.35), inset 0 0 0 1px rgba(255,255,255,0.05)',
          }}
        >
          <div className="flex flex-col items-center">
            <div className="relative flex w-full flex-col items-center gap-5 py-6">
              <BrandLogo
                variant="emerald"
                layout="stacked"
                className="w-full"
                iconClassName="w-36 sm:w-44"
                wordmarkClassName="w-full max-w-xs sm:max-w-sm mx-auto"
              />
            </div>

            <p className="mt-3 text-center text-sm text-emerald-100/75">
              Ingresá con tus credenciales
            </p>
          </div>

          {state?.error && (
            <div className="mt-6 rounded-2xl border border-red-300/30 bg-red-400/10 px-4 py-3 text-sm text-red-100">
              {state.error}
            </div>
          )}

          <form action={action} className="mt-8 space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-emerald-50/90">
                Usuario
              </label>
              <input
                name="username"
                type="text"
                required
                autoComplete="username"
                placeholder="Ingresá tu usuario"
                className="w-full rounded-2xl border border-emerald-200/20 bg-white px-4 py-3 text-sm text-slate-900 shadow-[0_10px_25px_rgba(0,0,0,0.22)] outline-none transition placeholder:text-slate-500 focus:border-emerald-300/50 focus:ring-4 focus:ring-emerald-300/10"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-emerald-50/90">
                Contraseña
              </label>
              <div className="group flex items-center rounded-2xl border border-emerald-200/20 bg-white px-4 shadow-[0_10px_25px_rgba(0,0,0,0.22)] transition focus-within:border-emerald-300/50 focus-within:ring-4 focus-within:ring-emerald-300/10">
                <input
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  placeholder="Ingresá tu contraseña"
                  className="w-full bg-transparent py-3 text-sm text-slate-900 outline-none placeholder:text-slate-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((current) => !current)}
                  aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  className="ml-3 shrink-0 bg-transparent p-0 text-slate-500 transition hover:text-slate-700"
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
      </div>

      <style jsx>{`
        @keyframes driftSlow {
          0% {
            transform: translate3d(0, 0, 0) scale(1);
          }
          50% {
            transform: translate3d(-2%, 2%, 0) scale(1.05);
          }
          100% {
            transform: translate3d(0, 0, 0) scale(1);
          }
        }

        @keyframes blob1 {
          0% {
            transform: translate(0, 0) scale(1);
          }
          33% {
            transform: translate(50px, -20px) scale(1.08);
          }
          66% {
            transform: translate(-20px, 35px) scale(0.95);
          }
          100% {
            transform: translate(0, 0) scale(1);
          }
        }

        @keyframes blob2 {
          0% {
            transform: translate(0, 0) scale(1);
          }
          50% {
            transform: translate(-40px, 25px) scale(1.1);
          }
          100% {
            transform: translate(0, 0) scale(1);
          }
        }

        @keyframes blob3 {
          0% {
            transform: translate(0, 0) scale(1);
          }
          33% {
            transform: translate(25px, -20px) scale(1.04);
          }
          66% {
            transform: translate(-35px, 10px) scale(1.1);
          }
          100% {
            transform: translate(0, 0) scale(1);
          }
        }

        @keyframes blob4 {
          0% {
            transform: translate(0, 0) scale(1);
          }
          50% {
            transform: translate(30px, -25px) scale(0.96);
          }
          100% {
            transform: translate(0, 0) scale(1);
          }
        }

        @keyframes water {
          0% {
            transform: translate3d(0, 0, 0) scale(1.1) rotate(0deg);
          }
          50% {
            transform: translate3d(-2%, 2%, 0) scale(1.15) rotate(1.5deg);
          }
          100% {
            transform: translate3d(0, 0, 0) scale(1.1) rotate(0deg);
          }
        }

        @keyframes waterReverse {
          0% {
            transform: translate3d(0, 0, 0) scale(1.1) rotate(0deg);
          }
          50% {
            transform: translate3d(2%, -2%, 0) scale(1.16) rotate(-1.5deg);
          }
          100% {
            transform: translate3d(0, 0, 0) scale(1.1) rotate(0deg);
          }
        }

        @keyframes caustics {
          0% {
            transform: translate3d(0, 0, 0) scale(1) rotate(0deg);
          }
          50% {
            transform: translate3d(-2%, 1%, 0) scale(1.08) rotate(2deg);
          }
          100% {
            transform: translate3d(0, 0, 0) scale(1) rotate(0deg);
          }
        }

        @keyframes floatParticle {
          0% {
            transform: translateY(0px) scale(1);
            opacity: 0.2;
          }
          50% {
            transform: translateY(-14px) scale(1.2);
            opacity: 0.85;
          }
          100% {
            transform: translateY(0px) scale(1);
            opacity: 0.2;
          }
        }

        @keyframes ring1 {
          0% {
            transform: translate(0, 0) scale(1);
            opacity: 0.2;
          }
          50% {
            transform: translate(20px, -12px) scale(1.05);
            opacity: 0.3;
          }
          100% {
            transform: translate(0, 0) scale(1);
            opacity: 0.2;
          }
        }

        @keyframes ring2 {
          0% {
            transform: translate(0, 0) scale(1);
            opacity: 0.25;
          }
          50% {
            transform: translate(-12px, 10px) scale(0.96);
            opacity: 0.35;
          }
          100% {
            transform: translate(0, 0) scale(1);
            opacity: 0.25;
          }
        }

        @keyframes ring3 {
          0% {
            transform: translate(0, 0) scale(1);
            opacity: 0.18;
          }
          50% {
            transform: translate(16px, -10px) scale(1.04);
            opacity: 0.28;
          }
          100% {
            transform: translate(0, 0) scale(1);
            opacity: 0.18;
          }
        }

        @keyframes ring4 {
          0% {
            transform: translate(0, 0) scale(1);
            opacity: 0.18;
          }
          50% {
            transform: translate(-18px, 16px) scale(1.03);
            opacity: 0.28;
          }
          100% {
            transform: translate(0, 0) scale(1);
            opacity: 0.18;
          }
        }

        .animate-drift-slow {
          animation: driftSlow 18s ease-in-out infinite;
        }

        .animate-blob1 {
          animation: blob1 20s ease-in-out infinite;
        }

        .animate-blob2 {
          animation: blob2 18s ease-in-out infinite;
        }

        .animate-blob3 {
          animation: blob3 22s ease-in-out infinite;
        }

        .animate-blob4 {
          animation: blob4 19s ease-in-out infinite;
        }

        .animate-water {
          animation: water 14s ease-in-out infinite;
        }

        .animate-water-reverse {
          animation: waterReverse 17s ease-in-out infinite;
        }

        .animate-caustics {
          animation: caustics 12s ease-in-out infinite;
        }

        .animate-float-particle {
          animation-name: floatParticle;
          animation-timing-function: ease-in-out;
          animation-iteration-count: infinite;
        }

        .animate-ring1 {
          animation: ring1 13s ease-in-out infinite;
        }

        .animate-ring2 {
          animation: ring2 15s ease-in-out infinite;
        }

        .animate-ring3 {
          animation: ring3 17s ease-in-out infinite;
        }

        .animate-ring4 {
          animation: ring4 19s ease-in-out infinite;
        }
      `}</style>
    </main>
  );
}
