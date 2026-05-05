import Link from 'next/link';
import { buildMarketingWhatsAppUrl, marketingConfig } from '@/lib/marketing';
import { useIntro } from './IntroProvider';

export function MarketingFooter() {
  const { isIntroComplete } = useIntro();

  return (
    <footer
      className={`border-t border-white/10 bg-[#060a0a] py-12 transition-all duration-800 ease-out ${
        isIntroComplete
          ? 'opacity-100 translate-y-0'
          : 'opacity-0 translate-y-4 pointer-events-none'
      }`}
    >
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
        <div className="grid gap-8 md:grid-cols-[1.2fr_0.8fr] md:items-start">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-emerald-300/80">Conflunet</p>
            <h2 className="mt-3 text-2xl font-semibold text-white">Control de asistencia y gestión de fichadas</h2>
            <p className="mt-3 max-w-xl text-sm leading-7 text-slate-300">
              Plataforma enfocada en ordenar operación diaria, mejorar trazabilidad y acelerar decisiones con soporte cercano.
            </p>
          </div>

          <div className="flex flex-col gap-3 md:items-end">
            <a
              href={buildMarketingWhatsAppUrl()}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center rounded-full bg-emerald-400 px-5 py-2 text-sm font-semibold text-slate-950 transition hover:bg-emerald-300"
            >
              Soporte rápido por WhatsApp
            </a>
            <Link
              href="/login"
              className="inline-flex items-center justify-center rounded-full border border-white/15 px-5 py-2 text-sm font-medium text-slate-200 transition hover:bg-white/10 hover:text-white"
            >
              Acceso al sistema
            </Link>
          </div>
        </div>

        <p className="mt-8 border-t border-white/10 pt-6 text-xs uppercase tracking-[0.18em] text-slate-500">
          {new Date().getFullYear()} {marketingConfig.brandName}. Todos los derechos reservados.
        </p>
      </div>
    </footer>
  );
}
