'use client';

import { useEffect, useState } from 'react';
import { useIntro } from './IntroProvider';

type BrandPhase = 'initial' | 'intro' | 'transforming' | 'background';

export function BrandPresenceLayer() {
  const { state: introState } = useIntro();
  const [phase, setPhase] = useState<BrandPhase>('initial');

  useEffect(() => {
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReduced) {
      setPhase('background');
      return;
    }

    // Sync with intro provider timing
    if (introState === 'intro') {
      setPhase('intro');
    } else if (introState === 'revealing') {
      setPhase('transforming');
    } else if (introState === 'complete') {
      setPhase('background');
    }
  }, [introState]);

  return (
    <div className="pointer-events-none fixed inset-0 z-1 flex items-center justify-center isolate overflow-hidden">
      <div
        className={`transition-all duration-1000 ease-out ${
          phase === 'initial' ? 'opacity-0 scale-95' :
          phase === 'intro' ? 'opacity-100 scale-100 blur-0' :
          phase === 'transforming' ? 'opacity-60 scale-[1.02] blur-[6px]' :
          'opacity-[0.22] scale-[1.06] blur-[12px] translate-y-5 saturate-105'
        }`}
      >
        <img
          src="/brand/conflunet-isotipo.svg"
          alt=""
          aria-hidden="true"
          className={`mx-auto mb-10 object-contain transition-all duration-1000 ease-out sm:mb-12 ${
            phase === 'initial' ? 'h-0 w-0' :
            phase === 'intro' ? 'h-[clamp(180px,18vw,290px)] w-[clamp(180px,18vw,290px)]' :
            phase === 'transforming' ? 'h-[clamp(168px,17vw,270px)] w-[clamp(168px,17vw,270px)]' :
            'h-[clamp(210px,21vw,360px)] w-[clamp(210px,21vw,360px)]'
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
