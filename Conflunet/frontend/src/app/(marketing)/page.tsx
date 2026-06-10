'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { MarketingCarousel } from '@/components/marketing/MarketingCarousel';
import { MarketingContactSection } from '@/components/marketing/MarketingContactSection';
import { MarketingIntroAnimation } from '@/components/marketing/MarketingIntroAnimation';
import { decodeJwtPayload, getDefaultAppPath } from '@/lib/auth-token';
import { trackWhatsAppClick } from '@/lib/analytics';
import { buildMarketingWhatsAppUrl } from '@/lib/marketing';

// Force dynamic rendering to avoid SSR issues
export const dynamic = 'force-dynamic';

const serviceCards = [
  {
    title: 'Servicio técnico',
    description:
      'Reparamos y mantenemos PC y notebooks. Hacemos diagnóstico, limpieza, optimización, instalación de software y soporte para equipos de trabajo.',
    bullets: [
      'Reparación de PC y notebooks',
      'Mantenimiento preventivo',
      'Optimización y puesta a punto',
      'Soporte para comercios y oficinas',
    ],
  },
  {
    title: 'Diseño web comercial',
    description:
      'Creamos landings, tiendas online, cartas y menús digitales para que tu comercio tenga presencia online clara, profesional y fácil de compartir.',
    bullets: [
      'Landings comerciales',
      'Tiendas online',
      'Cartas y menús online',
      'Sitios simples para vender mejor',
    ],
  },
  {
    title: 'Instalaciones técnicas',
    description:
      'Instalamos relojes de asistencia, cámaras, cableado de red y soluciones eléctricas asociadas a infraestructura tecnológica.',
    bullets: [
      'Relojes de asistencia',
      'Cámaras',
      'Cableado estructurado de red',
      'Cableado eléctrico para instalaciones',
    ],
  },
  {
    title: 'Sistema de RRHH y fichadas',
    description:
      'Sistema para controlar entradas, salidas y registros de personal desde relojes de asistencia. Pensado para recursos humanos, comercios e industrias.',
    bullets: [
      'Control de fichadas',
      'Reportes',
      'Consulta de registros',
      'Gestión por empresa',
      'Soporte para relojes de asistencia',
    ],
  },
] as const;

const rrhhHighlights = [
  'Lectura y organización de fichadas.',
  'Reportes para recursos humanos.',
  'Gestión de empleados.',
  'Control por empresa o área.',
  'Soporte cercano para la puesta en marcha.',
] as const;

const webExamples = [
  'Landing para servicios.',
  'Tienda online.',
  'Carta digital para locales gastronómicos.',
  'Menú online.',
  'Página para contacto por WhatsApp.',
] as const;

const installationSupportPoints = [
  'Instalación de relojes de asistencia.',
  'Cámaras y conectividad.',
  'Cableado estructurado.',
  'Reparación de PC y notebooks.',
  'Soporte técnico para comercios e industrias.',
] as const;

export default function MarketingHomePage() {
  const router = useRouter();

  useEffect(() => {
    const token = document.cookie
      .split('; ')
      .find((row) => row.startsWith('token='))
      ?.split('=')[1];

    if (token) {
      router.replace(getDefaultAppPath(decodeJwtPayload(token)));
    }
  }, [router]);

  const content = (
    <>
      <section id="inicio" className="py-14 md:py-20">
        <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
          <div className="grid gap-10 lg:grid-cols-[1.06fr_0.94fr] lg:items-center">
            <div>
              <span className="inline-flex rounded-full border border-emerald-300/40 bg-emerald-300/15 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-200">
                Neuquén, Argentina
              </span>
              <h1 className="mt-5 text-4xl font-semibold leading-tight text-white sm:text-5xl lg:text-6xl">
                Conflunet
              </h1>
              <h2 className="mt-4 text-2xl font-semibold leading-tight text-slate-100 sm:text-3xl lg:text-4xl">
                Soluciones informáticas para comercios, industrias y equipos de Neuquén.
              </h2>
              <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-300">
                Servicio técnico, diseño web comercial, instalaciones y sistemas para ordenar la gestión diaria de tu negocio.
              </p>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-emerald-100/85">
                Atención cercana, implementación práctica y soporte real.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <a
                  href={buildMarketingWhatsAppUrl()}
                  target="_blank"
                  rel="noreferrer"
                  onClick={() =>
                    trackWhatsAppClick({
                      source: 'marketing',
                      placement: 'hero',
                      service: 'Servicio técnico',
                    })
                  }
                  className="inline-flex min-h-12 items-center justify-center rounded-full bg-emerald-400 px-6 text-sm font-semibold text-slate-950 transition hover:bg-emerald-300"
                >
                  Consultar por WhatsApp
                </a>
                <Link
                  href="/login"
                  className="inline-flex min-h-12 items-center justify-center rounded-full border border-white/15 bg-white/5 px-6 text-sm font-semibold text-white transition hover:bg-white/10"
                >
                  Acceso al sistema
                </Link>
              </div>
            </div>

            <div className="rounded-[2rem] border border-white/15 bg-[#0b1111]/75 p-5 backdrop-blur-xl sm:p-6">
              <MarketingCarousel />
            </div>
          </div>
        </div>
      </section>

      <div id="servicios-anchor" className="section-scroll-anchor" aria-hidden="true" />
      <section id="servicios" className="py-8 md:py-12">
        <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
          <div className="rounded-[2rem] border border-white/15 bg-[#0b1111]/75 p-6 backdrop-blur-xl sm:p-8">
            <p className="text-xs uppercase tracking-[0.2em] text-emerald-200/85">Servicios</p>
            <h2 className="mt-3 text-3xl font-semibold text-white sm:text-4xl">
              Servicios para que tu negocio funcione mejor
            </h2>
            <p className="mt-4 max-w-3xl text-base leading-8 text-slate-300">
              Trabajamos con comercios, oficinas e industrias que necesitan resolver lo técnico sin vueltas: equipos, redes,
              cámaras, sitios web y sistemas de asistencia.
            </p>
            <div className="mt-8 grid gap-4 lg:grid-cols-2">
              {serviceCards.map((service) => (
                <article key={service.title} className="rounded-2xl border border-white/15 bg-white/5 p-5">
                  <h3 className="text-xl font-semibold text-white">{service.title}</h3>
                  <p className="mt-3 text-sm leading-7 text-slate-300">{service.description}</p>
                  <ul className="mt-4 space-y-2 text-sm text-slate-200">
                    {service.bullets.map((bullet) => (
                      <li key={bullet} className="flex items-start gap-2">
                        <span className="mt-[0.42rem] h-1.5 w-1.5 flex-shrink-0 rounded-full bg-emerald-300" />
                        <span>{bullet}</span>
                      </li>
                    ))}
                  </ul>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      <div id="rrhh-anchor" className="section-scroll-anchor" aria-hidden="true" />
      <section id="sistema-rrhh" className="py-8 md:py-12">
        <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
          <div className="rounded-[2rem] border border-white/15 bg-[#0b1111]/75 p-6 backdrop-blur-xl sm:p-8">
            <h2 className="text-3xl font-semibold text-white sm:text-4xl">
              Control de asistencia para empresas y equipos
            </h2>
            <p className="mt-4 max-w-3xl text-base leading-8 text-slate-300">
              Conflunet permite ordenar las fichadas del personal, consultar registros y generar información útil para recursos
              humanos sin depender de planillas manuales.
            </p>
            <p className="mt-4 max-w-3xl text-base leading-8 text-slate-300">
              El sistema está pensado para empresas que usan relojes de asistencia y necesitan una forma clara de controlar
              entradas, salidas, ausencias, llegadas tarde y reportes.
            </p>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {rrhhHighlights.map((point) => (
                <div key={point} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-200">
                  {point}
                </div>
              ))}
            </div>

            <div className="mt-7">
              <Link
                href="/control-asistencia"
                className="inline-flex min-h-12 items-center justify-center rounded-full bg-emerald-400 px-6 text-sm font-semibold text-slate-950 transition hover:bg-emerald-300"
              >
                Conocer el sistema
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section id="web-comercial" className="py-8 md:py-12">
        <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
          <div className="rounded-[2rem] border border-white/15 bg-[#0b1111]/75 p-6 backdrop-blur-xl sm:p-8">
            <h2 className="text-3xl font-semibold text-white sm:text-4xl">
              Webs simples, comerciales y listas para compartir
            </h2>
            <p className="mt-4 max-w-3xl text-base leading-8 text-slate-300">
              Diseñamos sitios pensados para mostrar lo que vendés, recibir consultas y mejorar la presencia online de tu negocio.
            </p>
            <p className="mt-4 max-w-3xl text-base leading-8 text-slate-300">
              Desde una landing institucional hasta una tienda online o un menú digital, buscamos que tu web sea clara, rápida
              y fácil de usar.
            </p>

            <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {webExamples.map((example) => (
                <div key={example} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-200">
                  {example}
                </div>
              ))}
            </div>

            <div className="mt-7">
              <a
                href={buildMarketingWhatsAppUrl({ service: 'Diseño web comercial' })}
                target="_blank"
                rel="noreferrer"
                onClick={() =>
                  trackWhatsAppClick({
                    source: 'marketing',
                    placement: 'web_section',
                    service: 'Diseño web comercial',
                  })
                }
                className="inline-flex min-h-12 items-center justify-center rounded-full bg-emerald-400 px-6 text-sm font-semibold text-slate-950 transition hover:bg-emerald-300"
              >
                Consultar por una web
              </a>
            </div>
          </div>
        </div>
      </section>

      <section id="instalaciones-soporte" className="py-8 md:py-12">
        <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
          <div className="rounded-[2rem] border border-white/15 bg-[#0b1111]/75 p-6 backdrop-blur-xl sm:p-8">
            <h2 className="text-3xl font-semibold text-white sm:text-4xl">
              Instalación, soporte y puesta en marcha
            </h2>
            <p className="mt-4 max-w-3xl text-base leading-8 text-slate-300">
              Nos ocupamos de que la tecnología quede instalada, configurada y funcionando.
            </p>
            <p className="mt-4 max-w-3xl text-base leading-8 text-slate-300">
              Trabajamos con instalaciones de relojes, cámaras, cableado de red y soporte técnico para equipos. La idea es resolver
              de forma prolija, práctica y con acompañamiento.
            </p>

            <ul className="mt-6 grid gap-3 sm:grid-cols-2">
              {installationSupportPoints.map((point) => (
                <li key={point} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-200">
                  {point}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <div id="contacto-anchor" className="section-scroll-anchor" aria-hidden="true" />
      <MarketingContactSection />
    </>
  );

  return <MarketingIntroAnimation>{content}</MarketingIntroAnimation>;
}
