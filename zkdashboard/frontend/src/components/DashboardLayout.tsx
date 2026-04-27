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
        @keyframes driftSlow {
          0% { transform: translate3d(0, 0, 0) scale(1); }
          50% { transform: translate3d(-2%, 2%, 0) scale(1.05); }
          100% { transform: translate3d(0, 0, 0) scale(1); }
        }
        @keyframes blob1 {
          0% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(50px, -20px) scale(1.08); }
          66% { transform: translate(-20px, 35px) scale(0.95); }
          100% { transform: translate(0, 0) scale(1); }
        }
        @keyframes blob2 {
          0% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(-40px, 25px) scale(1.1); }
          100% { transform: translate(0, 0) scale(1); }
        }
        @keyframes blob3 {
          0% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(25px, -20px) scale(1.04); }
          66% { transform: translate(-35px, 10px) scale(1.1); }
          100% { transform: translate(0, 0) scale(1); }
        }
        @keyframes blob4 {
          0% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(30px, -25px) scale(0.96); }
          100% { transform: translate(0, 0) scale(1); }
        }
        @keyframes water {
          0% { transform: translate3d(0, 0, 0) scale(1.1) rotate(0deg); }
          50% { transform: translate3d(-2%, 2%, 0) scale(1.15) rotate(1.5deg); }
          100% { transform: translate3d(0, 0, 0) scale(1.1) rotate(0deg); }
        }
        @keyframes waterReverse {
          0% { transform: translate3d(0, 0, 0) scale(1.1) rotate(0deg); }
          50% { transform: translate3d(2%, -2%, 0) scale(1.16) rotate(-1.5deg); }
          100% { transform: translate3d(0, 0, 0) scale(1.1) rotate(0deg); }
        }
        @keyframes caustics {
          0% { transform: translate3d(0, 0, 0) scale(1) rotate(0deg); }
          50% { transform: translate3d(-2%, 1%, 0) scale(1.08) rotate(2deg); }
          100% { transform: translate3d(0, 0, 0) scale(1) rotate(0deg); }
        }
        @keyframes ring1 {
          0% { transform: translate(0, 0) scale(1); opacity: 0.2; }
          50% { transform: translate(20px, -12px) scale(1.05); opacity: 0.3; }
          100% { transform: translate(0, 0) scale(1); opacity: 0.2; }
        }
        @keyframes ring2 {
          0% { transform: translate(0, 0) scale(1); opacity: 0.25; }
          50% { transform: translate(-12px, 10px) scale(0.96); opacity: 0.35; }
          100% { transform: translate(0, 0) scale(1); opacity: 0.25; }
        }
        @keyframes ring3 {
          0% { transform: translate(0, 0) scale(1); opacity: 0.18; }
          50% { transform: translate(16px, -10px) scale(1.04); opacity: 0.28; }
          100% { transform: translate(0, 0) scale(1); opacity: 0.18; }
        }
        @keyframes ring4 {
          0% { transform: translate(0, 0) scale(1); opacity: 0.18; }
          50% { transform: translate(-18px, 16px) scale(1.03); opacity: 0.28; }
          100% { transform: translate(0, 0) scale(1); opacity: 0.18; }
        }
        @keyframes floatParticle {
          0% { transform: translateY(0px) scale(1); opacity: 0.2; }
          50% { transform: translateY(-14px) scale(1.2); opacity: 0.85; }
          100% { transform: translateY(0px) scale(1); opacity: 0.2; }
        }
        .animate-drift-slow { animation: driftSlow 18s ease-in-out infinite; }
        .animate-blob1 { animation: blob1 20s ease-in-out infinite; }
        .animate-blob2 { animation: blob2 18s ease-in-out infinite; }
        .animate-blob3 { animation: blob3 22s ease-in-out infinite; }
        .animate-blob4 { animation: blob4 19s ease-in-out infinite; }
        .animate-water { animation: water 14s ease-in-out infinite; }
        .animate-water-reverse { animation: waterReverse 17s ease-in-out infinite; }
        .animate-caustics { animation: caustics 12s ease-in-out infinite; }
        .animate-ring1 { animation: ring1 13s ease-in-out infinite; }
        .animate-ring2 { animation: ring2 15s ease-in-out infinite; }
        .animate-ring3 { animation: ring3 17s ease-in-out infinite; }
        .animate-ring4 { animation: ring4 19s ease-in-out infinite; }
        .animate-float-particle {
          animation-name: floatParticle;
          animation-timing-function: ease-in-out;
          animation-iteration-count: infinite;
        }
      `}</style>
    </div>
  );
}
