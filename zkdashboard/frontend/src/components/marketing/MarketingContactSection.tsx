'use client';

import { MarketingContactForm } from '@/components/marketing/MarketingContactForm';
import { buildMarketingWhatsAppUrl, marketingConfig } from '@/lib/marketing';

export function MarketingContactSection() {
  return (
    <section id="contacto" className="scroll-mt-28 py-16 md:py-20">
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
        <div className="rounded-[2rem] border border-white/15 bg-[#0b1111]/75 p-5 backdrop-blur-xl sm:p-8 lg:p-10">
          <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:gap-12">
            <div>
              <span className="inline-flex rounded-full border border-emerald-300/40 bg-emerald-300/15 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-200">
                Contacto
              </span>
              <h2 className="mt-4 text-3xl font-semibold text-white sm:text-4xl">
                Contanos tu contexto y te proponemos una implementación clara
              </h2>
              <p className="mt-4 text-base leading-8 text-slate-300">
                Podés iniciar por formulario o avanzar directo por WhatsApp con mensaje prearmado para acelerar la conversación.
              </p>

              <div className="mt-8 space-y-4 text-sm text-slate-200">
                <div className="rounded-2xl border border-white/15 bg-white/5 p-4">
                  <p className="font-semibold text-white">Soporte rápido</p>
                  <p className="mt-1 text-slate-300">Respondemos por WhatsApp para destrabar dudas operativas sin demora.</p>
                </div>
                <div className="rounded-2xl border border-white/15 bg-white/5 p-4">
                  <p className="font-semibold text-white">Enfoque operativo</p>
                  <p className="mt-1 text-slate-300">Control de asistencia, gestión de fichadas y reportes con foco en uso real.</p>
                </div>
                <div className="rounded-2xl border border-white/15 bg-white/5 p-4">
                  <p className="font-semibold text-white">Canal directo</p>
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
