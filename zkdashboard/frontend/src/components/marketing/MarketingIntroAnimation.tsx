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
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#050909] text-center">
        <div className="space-y-6">
          <img
            src="/brand/conflunet-isotipo.svg"
            alt="Conflunet Logo"
            className="mx-auto h-28 w-28 animate-pulse"
          />
          <img
            src="/brand/conflunet-wordmark-brushed-steel.svg"
            alt="Conflunet"
            className="mx-auto h-10 w-auto opacity-80"
          />
        </div>
      </div>
    );
  }

  // Welcome phase: Show "Bienvenido a Conflunet"
  if (phase === 'welcome') {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#050909] text-center px-4">
        <div className="space-y-6">
          <img
            src="/brand/conflunet-isotipo.svg"
            alt="Conflunet Logo"
            className="mx-auto h-28 w-28"
          />
          <img
            src="/brand/conflunet-wordmark-brushed-steel.svg"
            alt="Conflunet"
            className="mx-auto h-12 w-auto"
          />
        </div>
        <h2 className="mt-10 text-3xl font-semibold text-emerald-400 sm:text-4xl">Bienvenido a Conflunet</h2>
      </div>
    );
  }

  // Blur phase: Logo and wordmark become blurred and remain visible as overlay
  if (phase === 'blur') {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#050909] text-center px-4">
        <div className="space-y-8 filter blur-2xl opacity-80">
          <img
            src="/brand/conflunet-isotipo.svg"
            alt="Conflunet Logo"
            className="mx-auto h-40 w-40"
          />
          <img
            src="/brand/conflunet-wordmark-brushed-steel.svg"
            alt="Conflunet"
            className="mx-auto h-16 w-auto"
          />
        </div>
        <p className="mt-10 max-w-xl text-lg leading-8 text-slate-300/80">
          Tu portal de control de asistencia con navegación suave, diseño moderno y una base sólida para RRHH.
        </p>
      </div>
    );
  }

  // Content phase: Show main content
  return <>{children}</>;
}
