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
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#050909]">
        <div className="animate-brand-intro text-center">
          <img
            src="/brand/conflunet-isotipo.svg"
            alt="Conflunet Logo"
            className="mx-auto mb-6 h-32 w-32 object-contain sm:mb-8 sm:h-40 sm:w-40"
          />
          <img
            src="/brand/conflunet-wordmark-brushed-steel.svg"
            alt="Conflunet"
            className="mx-auto h-8 w-auto object-contain sm:h-10"
          />
        </div>
      </div>
    );
  }

  // Dissolve: Brand fades, blurs, and moves to background
  if (phase === 'dissolve') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#050909]">
        <div className="animate-brand-dissolve text-center">
          <img
            src="/brand/conflunet-isotipo.svg"
            alt="Conflunet Logo"
            className="mx-auto mb-6 h-40 w-40 object-contain sm:mb-8"
          />
          <img
            src="/brand/conflunet-wordmark-brushed-steel.svg"
            alt="Conflunet"
            className="mx-auto h-10 w-auto object-contain"
          />
        </div>
      </div>
    );
  }

  // Complete: Show main content
  return <>{children}</>;
}
