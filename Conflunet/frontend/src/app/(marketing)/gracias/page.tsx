'use client';

import Link from 'next/link';
import { trackWhatsAppClick } from '@/lib/analytics';
import { buildMarketingWhatsAppUrl } from '@/lib/marketing';

export default function GraciasPage() {
  return (
    <section className="py-16 md:py-24">
      <div className="mx-auto w-full max-w-3xl px-4 text-center sm:px-6">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-200">
          Consulta preparada
        </p>
        <h1 className="mt-5 text-4xl font-semibold leading-tight text-white sm:text-5xl">
          Gracias por contactar a Conflunet
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-base leading-8 text-slate-300">
          Recibimos la intención de consulta. Para acelerar la respuesta, podés continuar por WhatsApp y compartirnos el detalle de lo que necesitás resolver.
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <a
            href={buildMarketingWhatsAppUrl({ service: 'Consulta general' })}
            target="_blank"
            rel="noreferrer"
            onClick={() =>
              trackWhatsAppClick({
                source: 'marketing',
                placement: 'thank_you',
                service: 'Consulta general',
              })
            }
            className="inline-flex min-h-12 items-center justify-center rounded-full bg-emerald-400 px-6 text-sm font-semibold text-slate-950 transition hover:bg-emerald-300"
          >
            Continuar por WhatsApp
          </a>
          <Link
            href="/"
            className="inline-flex min-h-12 items-center justify-center rounded-full border border-white/15 bg-white/5 px-6 text-sm font-semibold text-white transition hover:bg-white/10"
          >
            Volver al inicio
          </Link>
        </div>
      </div>
    </section>
  );
}
