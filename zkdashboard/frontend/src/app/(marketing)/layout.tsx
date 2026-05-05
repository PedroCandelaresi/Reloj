import { ReactNode } from 'react';
import { MarketingTopbar } from '@/components/marketing/MarketingTopbar';
import { MarketingFooter } from '@/components/marketing/MarketingFooter';
import { WhatsAppFloatButton } from '@/components/marketing/WhatsAppFloatButton';
import { BackgroundTextureLayer } from '@/components/marketing/BackgroundTextureLayer';
import { BrandPresenceLayer } from '@/components/marketing/BrandPresenceLayer';
import { IntroProvider } from '@/components/marketing/IntroProvider';

// Force dynamic rendering for the entire marketing route
export const dynamic = 'force-dynamic';

export default function MarketingLayout({ children }: { children: ReactNode }) {
  return (
    <IntroProvider>
      <div className="relative min-h-screen overflow-x-hidden text-slate-100">
        {/* Layer 0: Background texture */}
        <BackgroundTextureLayer />

        {/* Layer 1: Continuous brand presence - from intro to background */}
        <BrandPresenceLayer />

        {/* Layer 10+: Content */}
        <div className="relative z-10">
          <MarketingTopbar />
          <main className="pt-20 scroll-smooth">{children}</main>
          <MarketingFooter />
          <WhatsAppFloatButton />
        </div>
      </div>
    </IntroProvider>
  );
}
