'use client';

import { useEffect, useState } from 'react';

type BrandPhase = 'initial' | 'intro' | 'transforming' | 'background';

export function BrandPresenceLayer() {
  const [phase, setPhase] = useState<BrandPhase>('initial');

  useEffect(() => {
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReduced) {
      setPhase('background');
      return;
    }

    // Sequence: initial → intro → transforming → background
    const timer1 = setTimeout(() => setPhase('intro'), 100);
    const timer2 = setTimeout(() => setPhase('transforming'), 1800);
    const timer3 = setTimeout(() => setPhase('background'), 3400);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
    };
  }, []);

  return (
    <div className="pointer-events-none fixed inset-0 z-1 flex items-center justify-center isolate">
      <div
        className={`transition-all duration-1000 ease-out ${
          phase === 'initial' ? 'opacity-0 scale-95' :
          phase === 'intro' ? 'opacity-100 scale-100 blur-0' :
          phase === 'transforming' ? 'opacity-60 scale-102 blur-[6px]' :
          'opacity-18 scale-105 blur-[12px] translate-y-5 saturate-105'
        }`}
      >
        <img
          src="/brand/conflunet-isotipo.svg"
          alt=""
          aria-hidden="true"
          className={`mx-auto mb-8 object-contain transition-all duration-1000 ease-out ${
            phase === 'initial' ? 'h-0 w-0' :
            phase === 'intro' ? 'h-32 w-32 sm:h-40 sm:w-40' :
            phase === 'transforming' ? 'h-28 w-28 sm:h-36 sm:w-36' :
            'h-32 w-32 sm:h-40 sm:w-40'
          }`}
        />
        <img
          src="/brand/conflunet-wordmark-brushed-steel.svg"
          alt=""
          aria-hidden="true"
          className={`mx-auto object-contain transition-all duration-1000 ease-out ${
            phase === 'initial' ? 'w-0' :
            phase === 'intro' ? 'w-[80vw] max-w-[1200px]' :
            phase === 'transforming' ? 'w-[72vw] max-w-[1100px]' :
            'w-[clamp(620px,72vw,1400px)]'
          }`}
        />
      </div>
    </div>
  );
}