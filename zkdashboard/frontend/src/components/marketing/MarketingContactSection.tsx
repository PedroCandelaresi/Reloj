'use client';

import { MarketingContactForm } from '@/components/marketing/MarketingContactForm';
import { buildMarketingWhatsAppUrl, marketingConfig } from '@/lib/marketing';

export function MarketingContactSection() {
  return (
    <section id="contacto" className="py-16 md:py-20">
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
        <div className="rounded-[2rem] border border-white/15 bg-[#0b1111]/75 p-5 backdrop-blur-xl sm:p-8 lg:p-10">
          <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:gap-12">
            <div>
              <span className="inline-flex rounded-full border border-emerald-300/40 bg-emerald-300/15 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-200">
                Contacto
              </span>
              <h2 className="mt-4 text-3xl font-semibold text-white sm:text-4xl">
                Hablemos de lo que necesitás resolver
              </h2>
              <p className="mt-4 text-base leading-8 text-slate-300">
                Contanos si necesitás reparar equipos, armar una web, instalar infraestructura o implementar control de asistencia.
                Te orientamos con una solución concreta.
              </p>

              <div className="mt-8 space-y-4 text-sm text-slate-200">
                <div className="rounded-2xl border border-white/15 bg-white/5 p-4">
                  <p className="font-semibold text-white">Atención local y cercana</p>
                  <p className="mt-1 text-slate-300">
                    Atendemos consultas de comercios, oficinas, industrias y equipos de trabajo de Neuquén y alrededores.
                  </p>
                </div>
                <div className="rounded-2xl border border-white/15 bg-white/5 p-4">
                  <p className="font-semibold text-white">Canal directo por correo</p>
                  <a
                    href={`mailto:${marketingConfig.contactEmail}`}
                    className="mt-1 inline-block text-emerald-200 hover:text-emerald-100"
                  >
                    {marketingConfig.contactEmail}
                  </a>
                </div>
                <div className="rounded-2xl border border-white/15 bg-white/5 p-4">
                  <p className="font-semibold text-white">Contacto por WhatsApp</p>
                  <a href={buildMarketingWhatsAppUrl()} target="_blank" rel="noreferrer" className="mt-1 inline-block text-emerald-200 hover:text-emerald-100">
                    {marketingConfig.whatsappDisplay}
                  </a>
                </div>
              </div>
            </div>

            <div className="rounded-[1.6rem] border border-white/15 bg-[#0f1717]/80 p-5 sm:p-6">
              <MarketingContactForm />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
