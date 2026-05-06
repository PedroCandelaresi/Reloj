'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import { login } from '@/lib/actions';
import { BrandLogo } from '@/components/BrandLogo';
import { marketingConfig } from '@/lib/marketing';

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

function ArrowLeftIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="h-4 w-4">
      <path d="M5 12h14M5 12l5-5M5 12l5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="h-14 w-full rounded-md bg-emerald-600 px-4 text-sm font-semibold text-slate-100 shadow-[0_16px_34px_rgba(4,84,59,0.42)] transition-colors hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? 'Accediendo...' : 'Ingresar'}
    </button>
  );
}

const serviceSlides = [
  {
    label: 'Servicio técnico',
    title: 'Si una PC falla, lo resolvemos sin vueltas.',
    description: 'Diagnóstico, arreglo y puesta a punto para que tu trabajo siga.',
  },
  {
    label: 'Diseño web comercial',
    title: 'Tu negocio en internet, claro y fácil de entender.',
    description: 'Landings, tiendas y menús online pensados para vender mejor.',
  },
  {
    label: 'Instalaciones técnicas',
    title: 'Cámaras, red y relojes instalados como corresponde.',
    description: 'Todo conectado y funcionando para evitar dolores de cabeza.',
  },
  {
    label: 'Sistema RRHH',
    title: 'Fichadas y reportes ordenados, sin planillas eternas.',
    description: 'Control de asistencia simple para comercios e industrias.',
  },
] as const;

function ServiceCarousel() {
  const [activeIndex, setActiveIndex] = useState(0);
  const activeSlide = serviceSlides[activeIndex];

  useEffect(() => {
    const timer = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % serviceSlides.length);
    }, 5600);

    return () => window.clearInterval(timer);
  }, []);

  return (
    <div className="subtle-service-card rounded-3xl border border-white/15 p-5 backdrop-blur-xl">
      <div className="flex items-center justify-between gap-3">
        <span className="rounded-full border border-emerald-300/35 bg-emerald-300/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-200">
          Soluciones Conflunet
        </span>
        <div className="flex items-center gap-1.5">
          {serviceSlides.map((slide, index) => (
            <button
              key={slide.label}
              type="button"
              onClick={() => setActiveIndex(index)}
              className={`h-2 w-2 rounded-full transition ${
                index === activeIndex ? 'bg-emerald-300' : 'bg-white/35'
              }`}
              aria-label={`Ver servicio ${slide.label}`}
            />
          ))}
        </div>
      </div>

      <div key={activeIndex} className="service-fade-in mt-4 min-h-[118px]">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-100/85">{activeSlide.label}</p>
        <h2 className="mt-2 text-xl font-semibold leading-tight text-white">{activeSlide.title}</h2>
        <p className="mt-3 text-sm leading-6 text-slate-300">{activeSlide.description}</p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  const [state, action] = useFormState(login, undefined);
  const [showPassword, setShowPassword] = useState(false);

  return (
    <main className="grid min-h-screen bg-[#030b0a] text-slate-100 lg:grid-cols-[minmax(0,0.96fr)_minmax(520px,1.04fr)]">
      <section className="login-soft-panel relative flex min-h-screen flex-col px-6 py-8 sm:px-10 lg:px-12">
        <Link
          href="/"
          className="absolute left-4 top-4 z-30 inline-flex min-h-10 items-center gap-2 rounded-full border border-white/20 bg-[#0b1111]/72 px-4 text-sm font-medium text-slate-200 backdrop-blur-md transition hover:border-emerald-300/60 hover:text-emerald-100 sm:left-6 sm:top-6"
        >
          <ArrowLeftIcon />
          <span>Volver al inicio</span>
        </Link>

        <div className="relative z-10 flex flex-1 items-center justify-center py-12">
          <div className="w-full max-w-[390px]">
            <div className="mb-7">
              <BrandLogo variant="steel" layout="wordmark" className="w-52 max-w-full" />
              <p className="mt-4 text-sm leading-7 text-slate-300">
                Acceso al sistema de gestión de {marketingConfig.brandName}.
              </p>
            </div>

            {state?.error && (
              <div className="mb-8 rounded-md border border-red-400/35 bg-red-500/10 px-4 py-3 text-sm text-red-100">
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
                    className="min-w-0 flex-1 appearance-none bg-transparent text-sm text-slate-100 outline-none placeholder:text-slate-400"
                  />
                  <span className="text-slate-400">
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
                    className="min-w-0 flex-1 appearance-none bg-transparent text-sm text-slate-100 outline-none placeholder:text-slate-400"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((current) => !current)}
                    aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                    className="text-slate-400 transition-colors hover:text-emerald-200"
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
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.34),rgba(0,0,0,0.48)),radial-gradient(ellipse_at_72%_20%,rgba(255,255,255,0.04),transparent_30%),radial-gradient(ellipse_at_16%_86%,rgba(109,255,202,0.06),transparent_28%)]" />

        <div className="absolute right-10 top-10 z-20">
          <BrandLogo
            variant="steel"
            layout="horizontal"
            className="justify-end"
            iconClassName="w-20"
            wordmarkClassName="w-72 max-w-[34vw]"
          />
        </div>

        <div className="absolute bottom-10 left-10 z-20 w-[min(460px,calc(100%-5rem))]">
          <ServiceCarousel />
        </div>
      </section>

      <style jsx>{`
        @keyframes service-fade-in {
          0% {
            opacity: 0;
            transform: translateY(4px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .service-fade-in {
          animation: service-fade-in 300ms ease-out;
        }

        .subtle-service-card {
          background:
            linear-gradient(140deg, rgba(6, 12, 11, 0.97), rgba(6, 12, 11, 0.9)),
            radial-gradient(ellipse at 72% 18%, rgba(35, 122, 94, 0.16), transparent 30%);
          box-shadow: 0 16px 40px rgba(0, 0, 0, 0.5);
        }

        .login-outline-field {
          position: relative;
          border: 1px solid rgba(255, 255, 255, 0.16);
          border-radius: 8px;
          background: rgba(255, 255, 255, 0.03);
          transition: border-color 160ms ease, box-shadow 160ms ease, background-color 160ms ease;
        }

        .login-outline-field:focus-within {
          border-color: rgba(110, 231, 183, 0.74);
          box-shadow: 0 0 0 3px rgba(31, 199, 119, 0.18);
          background: rgba(255, 255, 255, 0.05);
        }

        .login-outline-field input {
          background: transparent !important;
          box-shadow: none !important;
        }

        .login-outline-field input:focus,
        .login-outline-field input:active,
        .login-outline-field input:hover {
          background: transparent !important;
        }

        .login-outline-field input:-webkit-autofill,
        .login-outline-field input:-webkit-autofill:hover,
        .login-outline-field input:-webkit-autofill:focus,
        .login-outline-field input:-webkit-autofill:active,
        .login-outline-field input:autofill,
        .login-outline-field input:autofill:hover,
        .login-outline-field input:autofill:focus,
        .login-outline-field input:autofill:active {
          -webkit-text-fill-color: #e2e8f0 !important;
          caret-color: #e2e8f0 !important;
          background-color: transparent !important;
          background-image: none !important;
          -webkit-background-clip: text !important;
          background-clip: text !important;
          -webkit-box-shadow: 0 0 0 1000px rgba(0, 0, 0, 0) inset !important;
          box-shadow: 0 0 0 1000px rgba(0, 0, 0, 0) inset !important;
          transition: background-color 9999s ease-in-out 0s;
        }

        .login-outline-field input::-webkit-credentials-auto-fill-button,
        .login-outline-field input::-webkit-contacts-auto-fill-button {
          visibility: hidden;
          pointer-events: none;
          position: absolute;
          right: 0;
          width: 0;
          margin: 0;
        }

        .login-outline-field input::-webkit-textfield-decoration-container {
          background: transparent !important;
        }

        .login-outline-field > span {
          position: absolute;
          top: -0.72rem;
          left: 1rem;
          background: transparent;
          padding: 0;
          color: #9ee6c7;
          font-size: 0.82rem;
          font-weight: 600;
          text-shadow: 0 1px 8px rgba(0, 0, 0, 0.45);
        }

        .login-soft-panel {
          color-scheme: dark;
          overflow: hidden;
          background:
            radial-gradient(circle at 16% 10%, rgba(126, 232, 192, 0.11), transparent 36%),
            radial-gradient(circle at 80% 86%, rgba(44, 181, 125, 0.09), transparent 40%),
            linear-gradient(158deg, #06100f 0%, #091615 44%, #0b1111 100%);
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
            radial-gradient(circle at 22% 8%, rgba(153, 255, 222, 0.11) 0 1px, transparent 2px),
            radial-gradient(circle at 78% 24%, rgba(153, 255, 222, 0.1) 0 1px, transparent 2px),
            linear-gradient(56deg, transparent 0 34%, rgba(31, 199, 119, 0.12) 40% 42%, transparent 54% 100%);
          filter: blur(0.2px) saturate(0.95);
          opacity: 0.72;
          transform: rotate(-2deg);
        }

        .login-soft-panel::after {
          background:
            radial-gradient(ellipse at 76% 30%, rgba(31, 199, 119, 0.14), transparent 18%),
            radial-gradient(ellipse at 30% 74%, rgba(7, 88, 60, 0.2), transparent 26%),
            linear-gradient(58deg, transparent 0 18%, rgba(31, 199, 119, 0.1) 24% 27%, transparent 36% 100%);
          filter: blur(10px) saturate(0.9);
          opacity: 0.72;
          transform: rotate(5deg);
        }

        .login-brand-art {
          background:
            radial-gradient(circle at 78% 8%, rgba(255, 255, 255, 0.22) 0 1px, transparent 2px),
            radial-gradient(circle at 20% 22%, rgba(255, 255, 255, 0.18) 0 1px, transparent 2px),
            radial-gradient(circle at 72% 70%, rgba(255, 255, 255, 0.14) 0 2px, transparent 3px),
            linear-gradient(128deg, rgba(255, 255, 255, 0.14) 0 3%, transparent 14% 100%),
            linear-gradient(112deg, transparent 0 12%, rgba(255, 255, 255, 0.07) 16% 18%, transparent 25% 100%),
            linear-gradient(128deg, transparent 0 32%, rgba(0, 52, 36, 0.6) 39% 43%, transparent 54% 100%),
            linear-gradient(142deg, #2b8a69 0%, #19694f 24%, #0b533d 48%, #083b2d 70%, #02120e 100%);
        }
      `}</style>
    </main>
  );
}
