import { ReactNode } from 'react';
import { MarketingTopbar } from '@/components/marketing/MarketingTopbar';
import { MarketingFooter } from '@/components/marketing/MarketingFooter';
import { WhatsAppFloatButton } from '@/components/marketing/WhatsAppFloatButton';

export default function MarketingLayout({ children }: { children: ReactNode }) {
  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[#050909] text-slate-100">
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(31,199,119,0.22),transparent_32%),radial-gradient(circle_at_78%_16%,rgba(55,240,166,0.14),transparent_26%),linear-gradient(180deg,#050909_0%,#060d0d_54%,#040707_100%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:44px_44px] opacity-45" />

        <img
          src="/brand/conflunet-isotipo.svg"
          alt=""
          aria-hidden="true"
          className="absolute left-[8%] top-[8%] h-[24rem] w-auto opacity-10 blur-3xl"
        />
        <img
          src="/brand/conflunet-wordmark-brushed-steel.svg"
          alt=""
          aria-hidden="true"
          className="absolute right-[-6%] top-[30%] h-[18rem] w-auto opacity-12 blur-3xl"
        />
      </div>

      <MarketingTopbar />
      <main className="relative z-10 pt-24 scroll-smooth">{children}</main>
      <MarketingFooter />
      <WhatsAppFloatButton />
    </div>
  );
}
