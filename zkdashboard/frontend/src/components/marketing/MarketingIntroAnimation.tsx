'use client';

import { useEffect, useState } from 'react';

type AnimationPhase = 'intro' | 'hidden';

export function MarketingIntroAnimation({ children }: { children: React.ReactNode }) {
  const [phase, setPhase] = useState<AnimationPhase>('intro');

  useEffect(() => {
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReduced) {
      setPhase('hidden');
      return;
    }

    // Intro sequence: 2s visible, then 1.3s fade out, then hidden
    const timer1 = setTimeout(() => setPhase('hidden'), 3400);

    return () => {
      clearTimeout(timer1);
    };
  }, []);

  // Intro overlay: Show brand prominently, then fade out
  if (phase === 'intro') {
    return (
      <>
        {/* Intro overlay - temporary */}
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#050909] px-4">
          <div className="animate-brand-intro text-center w-full max-w-[1200px] px-2 sm:px-0">
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

        {/* Content behind intro - visible but covered */}
        <div className="opacity-0">{children}</div>
      </>
    );
  }

  // Hidden: Intro overlay gone, show content normally
  return <>{children}</>;
}
