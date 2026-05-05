'use client';

import { useEffect, useState } from 'react';

type AnimationPhase = 'brand' | 'dissolve' | 'complete';

export function MarketingIntroAnimation({ children }: { children: React.ReactNode }) {
  const [phase, setPhase] = useState<AnimationPhase>('brand');

  useEffect(() => {
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReduced) {
      setPhase('complete');
      return;
    }

    const timer1 = setTimeout(() => setPhase('dissolve'), 2000);
    const timer2 = setTimeout(() => setPhase('complete'), 3200);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, []);

  // Brand intro: Show isotipo and wordmark centered
  if (phase === 'brand') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#050909] px-4">
        <div className="animate-brand-fade-in text-center w-full max-w-[1200px] px-2 sm:px-0">
          <img
            src="/brand/conflunet-isotipo.svg"
            alt="Conflunet Logo"
            className="mx-auto mb-8 w-[clamp(140px,18vw,260px)] max-w-[260px] object-contain sm:mb-10"
          />
          <img
            src="/brand/conflunet-wordmark-brushed-steel.svg"
            alt="Conflunet"
            className="mx-auto w-[80vw] max-w-[1200px] object-contain"
          />
        </div>
      </div>
    );
  }

  // Dissolve: Brand fades, blurs, and becomes subtle before content
  if (phase === 'dissolve') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#050909] px-4">
        <div className="animate-brand-fade-out text-center w-full max-w-[1200px] px-2 sm:px-0">
          <img
            src="/brand/conflunet-isotipo.svg"
            alt="Conflunet Logo"
            className="mx-auto mb-8 w-[clamp(140px,18vw,260px)] max-w-[260px] object-contain sm:mb-10"
          />
          <img
            src="/brand/conflunet-wordmark-brushed-steel.svg"
            alt="Conflunet"
            className="mx-auto w-[80vw] max-w-[1200px] object-contain"
          />
        </div>
      </div>
    );
  }

  // Complete: Show main content with a soft fade-in
  return <div className="animate-content-fade-in">{children}</div>;
}
