'use client';

import { ReactNode, useMemo } from 'react';
import { BrandLogo } from './BrandLogo';

export function DashboardLayout({ children }: { children: ReactNode }) {
  const particles = useMemo(
    () =>
      Array.from({ length: 26 }, (_, i) => ({
        id: i,
        left: `${Math.random() * 100}%`,
        top: `${Math.random() * 100}%`,
        size: `${2 + Math.random() * 5}px`,
        duration: `${4 + Math.random() * 8}s`,
        delay: `${Math.random() * 6}s`,
        opacity: 0.25 + Math.random() * 0.5,
      })),
    []
  );

  return (
    <div className="min-h-screen relative">
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute inset-0 conflunet-matrix-bg" />
        <div className="absolute inset-0 conflunet-scanlines opacity-45" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(154,164,175,0.12),transparent_30%),linear-gradient(180deg,rgba(0,0,0,0.08),rgba(0,0,0,0.28))]" />

        {particles.map((p) => (
          <span
            key={p.id}
            className="absolute rounded-full bg-emerald-200 shadow-[0_0_12px_rgba(35,255,153,0.45)] animate-float-particle"
            style={{
              left: p.left,
              top: p.top,
              width: p.size,
              height: p.size,
              opacity: p.opacity,
              animationDuration: p.duration,
              animationDelay: p.delay,
            }}
          />
        ))}

        <div className="absolute left-[-7rem] top-28 w-[30rem] opacity-[0.12] blur-[0.4px]">
          <BrandLogo variant="emerald" layout="stacked" iconClassName="w-48" wordmarkClassName="w-[28rem]" />
        </div>
      </div>

      <div className="relative z-10">{children}</div>

      <style jsx>{`
        @keyframes floatParticle {
          0%   { transform: translateY(0px) scale(1);   opacity: 0.2;  }
          50%  { transform: translateY(-14px) scale(1.2); opacity: 0.85; }
          100% { transform: translateY(0px) scale(1);   opacity: 0.2;  }
        }
        .animate-float-particle {
          animation-name: floatParticle;
          animation-timing-function: ease-in-out;
          animation-iteration-count: infinite;
        }
      `}</style>
    </div>
  );
}
