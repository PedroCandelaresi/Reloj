'use client';

import { useEffect, useState } from 'react';

type AnimationPhase = 'hidden' | 'revealing' | 'visible';

export function MarketingIntroAnimation({ children }: { children: React.ReactNode }) {
  const [phase, setPhase] = useState<AnimationPhase>('hidden');

  useEffect(() => {
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReduced) {
      setPhase('visible');
      return;
    }

    // Content reveals progressively while brand transforms
    const timer1 = setTimeout(() => setPhase('revealing'), 2600);
    const timer2 = setTimeout(() => setPhase('visible'), 3400);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, []);

  if (phase === 'hidden') {
    return null; // Content hidden during brand intro
  }

  if (phase === 'revealing') {
    return (
      <div className="animate-content-reveal">
        {children}
      </div>
    );
  }

  // Visible: Content fully shown
  return <>{children}</>;
}
