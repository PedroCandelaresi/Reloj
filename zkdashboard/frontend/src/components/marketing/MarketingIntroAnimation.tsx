'use client';

import { useEffect, useState } from 'react';

type AnimationPhase = 'intro' | 'welcome' | 'blur' | 'content';

export function MarketingIntroAnimation({ children }: { children: React.ReactNode }) {
  const [phase, setPhase] = useState<AnimationPhase>('intro');

  useEffect(() => {
    const timer1 = setTimeout(() => setPhase('welcome'), 1000);
    const timer2 = setTimeout(() => setPhase('blur'), 3000);
    const timer3 = setTimeout(() => setPhase('content'), 4500);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
    };
  }, []);

  // Intro phase: Logo and "Conflunet" text
  if (phase === 'intro') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#050909]">
        <div className="text-center">
          <img
            src="/brand/conflunet-isotipo.svg"
            alt="Conflunet Logo"
            className="mx-auto h-32 w-32 mb-8 animate-pulse"
          />
          <h1 className="text-6xl font-bold text-white animate-pulse">Conflunet</h1>
        </div>
      </div>
    );
  }

  // Welcome phase: Show "Bienvenido a Conflunet"
  if (phase === 'welcome') {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#050909]">
        <div className="text-center mb-16">
          <img
            src="/brand/conflunet-isotipo.svg"
            alt="Conflunet Logo"
            className="mx-auto h-32 w-32 mb-8"
          />
          <h1 className="text-6xl font-bold text-white">Conflunet</h1>
        </div>
        <h2 className="text-4xl font-semibold text-emerald-400 animate-pulse">Bienvenido a Conflunet</h2>
      </div>
    );
  }

  // Blur phase: Logo becomes blurred
  if (phase === 'blur') {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#050909]">
        <div className="text-center mb-16 filter blur-md">
          <img
            src="/brand/conflunet-isotipo.svg"
            alt="Conflunet Logo"
            className="mx-auto h-32 w-32 mb-8"
          />
          <h1 className="text-6xl font-bold text-white">Conflunet</h1>
        </div>
        <h2 className="text-4xl font-semibold text-emerald-400 opacity-50">Bienvenido a Conflunet</h2>
      </div>
    );
  }

  // Content phase: Show main content
  return <>{children}</>;
}
