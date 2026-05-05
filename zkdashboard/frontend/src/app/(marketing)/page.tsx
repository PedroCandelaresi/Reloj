import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { useEffect, useState } from 'react';
import { MarketingCarousel } from '@/components/marketing/MarketingCarousel';
import { MarketingContactSection } from '@/components/marketing/MarketingContactSection';
import { decodeJwtPayload, getDefaultAppPath } from '@/lib/auth-token';
import { buildMarketingWhatsAppUrl } from '@/lib/marketing';

const highlights = [
  {
    title: 'Control de asistencia',
    description: 'Visualizá presencia diaria por equipo, sector y rango horario desde una única pantalla.',
  },
  {
    title: 'Gestión de fichadas',
    description: 'Centralizá correcciones y solicitudes en un circuito ordenado, trazable y auditable.',
  },
  {
    title: 'Reportes útiles',
    description: 'Convertí registros en información accionable para RRHH, operaciones y supervisión.',
  },
] as const;

const steps = [
  {
    step: '01',
    title: 'Relevamiento inicial',
    description: 'Entendemos tu dinámica de trabajo y los puntos críticos del control de asistencia.',
  },
  {
    step: '02',
    title: 'Configuración guiada',
    description: 'Definimos reglas de fichadas, permisos y estructura operativa de forma clara.',
  },
  {
    step: '03',
    title: 'Puesta en marcha',
    description: 'Activamos el flujo y mantenemos soporte rápido por WhatsApp para acompañar al equipo.',
  },
] as const;

export default async function MarketingHomePage() {
  const cookieStore = await cookies();
  const token = cookieStore.get('token')?.value;

  if (token) {
    redirect(getDefaultAppPath(decodeJwtPayload(token)));
  }

  return (
    <>
      <section id="inicio" className="scroll-mt-28 py-14 md:py-20">
        <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
          <div className="grid gap-10 lg:grid-cols-[1.06fr_0.94fr] lg:items-center">
            <div>
              <span className="inline-flex rounded-full border border-emerald-300/40 bg-emerald-300/15 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-200">
                Conflunet
              </span>
              <h1 className="mt-5 text-4xl font-semibold leading-tight text-white sm:text-5xl lg:text-6xl">
                Gestión de asistencia moderna para equipos que necesitan orden real.
              </h1>
              <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-300">
                Unificá control de asistencia, gestión de fichadas y reportes en una experiencia simple, robusta y preparada para escalar.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <a
                  href={buildMarketingWhatsAppUrl()}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex min-h-12 items-center justify-center rounded-full bg-emerald-400 px-6 text-sm font-semibold text-slate-950 transition hover:bg-emerald-300"
                >
                  Soporte rápido por WhatsApp
                </a>
                <a
                  href="#contacto"
                  className="inline-flex min-h-12 items-center justify-center rounded-full border border-white/15 bg-white/5 px-6 text-sm font-semibold text-white transition hover:bg-white/10"
                >
                  Solicitar contacto
                </a>
              </div>
            </div>

            <div className="rounded-[2rem] border border-white/15 bg-[#0b1111]/75 p-5 backdrop-blur-xl sm:p-6">
              <MarketingCarousel />
            </div>
          </div>
        </div>
      </section>

      <section id="servicios" className="scroll-mt-28 py-8 md:py-12">
        <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
          <div className="rounded-[2rem] border border-white/15 bg-[#0b1111]/75 p-6 backdrop-blur-xl sm:p-8">
            <p className="text-xs uppercase tracking-[0.2em] text-emerald-200/85">Servicios</p>
            <h2 className="mt-3 text-3xl font-semibold text-white sm:text-4xl">
              Servicios pensados para tu control de asistencia
            </h2>
            <p className="mt-4 max-w-3xl text-base leading-8 text-slate-300">
              Desde el reloj de punto hasta reportes inteligentes y gestión de turnos, trabajamos para que tu equipo tenga menos fricción y más transparencia.
            </p>
            <div className="mt-8 grid gap-4 lg:grid-cols-3">
              {steps.map((step) => (
                <article key={step.step} className="rounded-2xl border border-white/15 bg-white/5 p-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-200">{step.step}</p>
                  <h3 className="mt-3 text-xl font-semibold text-white">{step.title}</h3>
                  <p className="mt-2 text-sm leading-7 text-slate-300">{step.description}</p>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="fichadas" className="scroll-mt-28 py-8 md:py-12">
        <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
          <div className="rounded-[2rem] border border-white/15 bg-[#0b1111]/75 p-6 backdrop-blur-xl sm:p-8">
            <h2 className="text-3xl font-semibold text-white sm:text-4xl">
              Diseñada para control de asistencia y gestión de fichadas
            </h2>
            <p className="mt-4 max-w-3xl text-base leading-8 text-slate-300">
              Landing de marketing clara, navegación simple y llamados a la acción visibles para convertir visitas en conversaciones concretas.
            </p>
          </div>
        </div>
      </section>

      <MarketingContactSection />
    </>
  );
}
