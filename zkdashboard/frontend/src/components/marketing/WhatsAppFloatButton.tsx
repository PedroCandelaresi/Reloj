import { buildMarketingWhatsAppUrl } from '@/lib/marketing';
import { useIntro } from './IntroProvider';

function WhatsAppIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="h-5 w-5">
      <path
        d="M6 6h12v8H10l-4 4V6Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function WhatsAppFloatButton() {
  const { isIntroComplete } = useIntro();

  return (
    <a
      href={buildMarketingWhatsAppUrl()}
      target="_blank"
      rel="noreferrer"
      aria-label="Abrir WhatsApp para soporte rápido"
      className={`fixed bottom-5 right-5 z-50 inline-flex items-center gap-3 rounded-full border border-emerald-300/40 bg-[#0f1515]/90 px-4 py-3 text-sm font-semibold text-white shadow-[0_18px_45px_rgba(0,0,0,0.45)] backdrop-blur-xl transition-all duration-800 ease-out hover:-translate-y-0.5 hover:border-emerald-300 hover:bg-[#141c1c] ${
        isIntroComplete
          ? 'opacity-100 translate-y-0'
          : 'opacity-0 translate-y-4 pointer-events-none'
      }`}
      style={{
        transitionDelay: isIntroComplete ? '1.2s' : '0s'
      }}
    >
      <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-emerald-400 text-slate-950">
        <WhatsAppIcon />
      </span>
      <span className="leading-none">
        <span className="block text-sm font-semibold">WhatsApp</span>
        <span className="mt-1 hidden text-[11px] uppercase tracking-[0.16em] text-emerald-200/80 sm:block">
          Soporte rápido
        </span>
      </span>
    </a>
  );
}
