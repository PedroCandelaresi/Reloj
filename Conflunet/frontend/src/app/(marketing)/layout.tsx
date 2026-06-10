import type { Metadata } from 'next';
import { ReactNode } from 'react';
import { MarketingTopbar } from '@/components/marketing/MarketingTopbar';
import { MarketingFooter } from '@/components/marketing/MarketingFooter';
import { WhatsAppFloatButton } from '@/components/marketing/WhatsAppFloatButton';
import { BackgroundTextureLayer } from '@/components/marketing/BackgroundTextureLayer';
import { BrandPresenceLayer } from '@/components/marketing/BrandPresenceLayer';
import { IntroProvider } from '@/components/marketing/IntroProvider';

// Force dynamic rendering for the entire marketing route
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Conflunet | Servicios informáticos en Neuquén',
  description:
    'Servicio técnico, diseño web comercial, instalaciones y sistema de control de asistencia para comercios e industrias de Neuquén.',
  keywords: [
    'servicio técnico Neuquén',
    'reparación de PC',
    'reparación de notebooks',
    'diseño web comercial',
    'tiendas online',
    'instalación de cámaras',
    'relojes de asistencia',
    'control de fichadas',
    'sistema de RRHH',
  ],
};

export default function MarketingLayout({ children }: { children: ReactNode }) {
  return (
    <IntroProvider>
      <div className="relative min-h-screen overflow-x-clip text-slate-100">
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
