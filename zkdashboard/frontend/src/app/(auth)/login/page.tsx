'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import { login } from '@/lib/actions';
import { BrandLogo } from '@/components/BrandLogo';
import { BackgroundTextureLayer } from '@/components/marketing/BackgroundTextureLayer';
import { buildMarketingWhatsAppUrl, marketingConfig } from '@/lib/marketing';

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
      className="h-14 w-full rounded-full bg-emerald-400 px-4 text-sm font-semibold uppercase tracking-[0.14em] text-slate-950 shadow-[0_16px_34px_rgba(31,199,119,0.28)] transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? 'Accediendo...' : 'Ingresar al sistema'}
    </button>
  );
}

const highlights = [
  'Control de fichadas para empresas y equipos.',
  'Reportes y gestión diaria para RRHH.',
  'Soporte técnico cercano para la operación.',
  'Implementación real para comercios e industrias.',
] as const;

export default function LoginPage() {
  const [state, action] = useFormState(login, undefined);
  const [showPassword, setShowPassword] = useState(false);
  const supportUrl = buildMarketingWhatsAppUrl({ service: 'Consulta general' });

  return (
    <main className="relative min-h-screen overflow-hidden text-slate-100">
      <BackgroundTextureLayer />
      <div className="pointer-events-none absolute inset-0 z-0 bg-[radial-gradient(ellipse_at_top,rgba(255,255,255,0.07),transparent_48%),radial-gradient(ellipse_at_80%_20%,rgba(55,240,166,0.08),transparent_34%)]" />

      <div className="relative z-10 min-h-screen px-4 pb-8 pt-6 sm:px-6 sm:pt-8">
        <div className="mx-auto flex w-full max-w-6xl justify-start">
          <Link
            href="/"
            className="inline-flex min-h-10 items-center gap-2 rounded-full border border-white/15 bg-[#0b1111]/70 px-4 text-sm font-medium text-slate-200 backdrop-blur-xl transition hover:bg-white/10 hover:text-white"
          >
            <ArrowLeftIcon />
            <span>Volver al inicio</span>
          </Link>
        </div>

        <div className="mx-auto mt-5 grid w-full max-w-6xl gap-6 lg:mt-8 lg:grid-cols-[1.08fr_0.92fr] lg:gap-8">
          <section className="order-2 hidden rounded-[2rem] border border-white/15 bg-[#0b1111]/70 p-8 backdrop-blur-xl shadow-[0_16px_40px_rgba(0,0,0,0.35)] lg:flex lg:flex-col">
            <span className="inline-flex w-fit rounded-full border border-emerald-300/40 bg-emerald-300/15 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-200">
              {marketingConfig.brandName}
            </span>
            <h2 className="mt-5 text-3xl font-semibold leading-tight text-white xl:text-4xl">
              Acceso profesional al sistema de gestión Conflunet.
            </h2>
            <p className="mt-4 max-w-2xl text-base leading-8 text-slate-300">
              La misma estética y enfoque del sitio principal, ahora aplicada a tu ingreso operativo diario.
            </p>

            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              {highlights.map((highlight) => (
                <article key={highlight} className="rounded-2xl border border-white/12 bg-white/5 px-4 py-3 text-sm text-slate-200">
                  {highlight}
                </article>
              ))}
            </div>

            <div className="mt-auto pt-8">
              <a
                href={supportUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex min-h-12 items-center justify-center rounded-full border border-white/15 bg-white/5 px-6 text-sm font-semibold text-white transition hover:bg-white/10"
              >
                Soporte por WhatsApp · {marketingConfig.whatsappDisplay}
              </a>
            </div>
          </section>

          <section className="order-1 relative overflow-hidden rounded-[2rem] border border-white/15 bg-[#0b1111]/80 p-6 backdrop-blur-xl shadow-[0_16px_40px_rgba(0,0,0,0.35)] sm:p-8 lg:order-2 lg:p-10">
            <img
              src="/brand/conflunet-isotipo.svg"
              alt=""
              aria-hidden="true"
              className="pointer-events-none absolute -right-10 -top-10 h-36 w-36 opacity-[0.12] saturate-0"
            />

            <div className="relative z-10">
              <BrandLogo
                variant="steel"
                layout="horizontal"
                className="justify-start"
                iconClassName="w-14"
                wordmarkClassName="w-52 sm:w-56"
              />

              <p className="mt-6 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-200/85">Acceso seguro</p>
              <h1 className="mt-3 text-3xl font-semibold leading-tight text-white sm:text-4xl">
                Ingresá a tu panel de trabajo
              </h1>
              <p className="mt-4 max-w-lg text-sm leading-7 text-slate-300 sm:text-base">
                Gestioná empresas, usuarios y fichadas desde una experiencia alineada con la identidad visual de Conflunet.
              </p>

              {state?.error && (
                <div className="mt-7 rounded-xl border border-red-400/35 bg-red-500/10 px-4 py-3 text-sm text-red-100">
                  {state.error}
                </div>
              )}

              <form action={action} className="mt-8 space-y-5">
                <label className="block">
                  <span className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-100/80">Usuario</span>
                  <div className="mt-2 flex h-14 items-center gap-3 rounded-xl border border-white/15 bg-white/5 px-4 transition focus-within:border-emerald-300/60 focus-within:bg-white/10">
                    <input
                      name="username"
                      type="text"
                      required
                      autoComplete="username"
                      placeholder="tu.usuario"
                      className="min-w-0 flex-1 bg-transparent text-sm text-slate-100 outline-none placeholder:text-slate-400"
                    />
                    <span className="text-slate-400">
                      <UserIcon />
                    </span>
                  </div>
                </label>

                <label className="block">
                  <span className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-100/80">Contraseña</span>
                  <div className="mt-2 flex h-14 items-center gap-3 rounded-xl border border-white/15 bg-white/5 px-4 transition focus-within:border-emerald-300/60 focus-within:bg-white/10">
                    <input
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      required
                      autoComplete="current-password"
                      placeholder="••••••••"
                      className="min-w-0 flex-1 bg-transparent text-sm text-slate-100 outline-none placeholder:text-slate-400"
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

              <p className="mt-6 text-sm text-slate-300">
                ¿Necesitás ayuda para ingresar?{' '}
                <a
                  href={supportUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="font-semibold text-emerald-200 transition hover:text-emerald-100"
                >
                  Contactar soporte
                </a>
                .
              </p>
            </div>
          </section>
        </div>
      </div>

      <style jsx>{`
        input:-webkit-autofill,
        input:-webkit-autofill:hover,
        input:-webkit-autofill:focus,
        input:-webkit-autofill:active {
          -webkit-text-fill-color: #e2e8f0;
          caret-color: #e2e8f0;
          transition: background-color 9999s ease-in-out 0s;
          box-shadow: 0 0 0 1000px rgba(11, 17, 17, 0.92) inset;
        }
      `}</style>
    </main>
  );
}
