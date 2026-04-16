'use client';

import { ReactNode, useMemo } from 'react';
import Starnet3DFromSVG from './Starnet3DFromSVG';

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
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_#0a6b3d_0%,_#064525_20%,_#032415_55%,_#010d07_100%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_15%,rgba(22,163,74,0.10),transparent_18%),radial-gradient(circle_at_80%_20%,rgba(110,231,183,0.06),transparent_18%),radial-gradient(circle_at_30%_75%,rgba(34,197,94,0.08),transparent_24%),radial-gradient(circle_at_75%_85%,rgba(16,185,129,0.06),transparent_20%)] animate-drift-slow" />
        <div className="absolute -left-32 top-12 h-80 w-80 rounded-full bg-emerald-400/10 blur-3xl animate-blob1" />
        <div className="absolute right-[-6rem] top-24 h-96 w-96 rounded-full bg-green-300/8 blur-3xl animate-blob2" />
        <div className="absolute bottom-[-5rem] left-[12%] h-96 w-96 rounded-full bg-emerald-500/10 blur-3xl animate-blob3" />
        <div className="absolute bottom-[8%] right-[15%] h-80 w-80 rounded-full bg-lime-200/5 blur-3xl animate-blob4" />

        <div className="absolute inset-0 opacity-[0.12] mix-blend-screen animate-water">
          <div className="h-full w-full bg-[repeating-linear-gradient(115deg,rgba(255,255,255,0.06)_0px,rgba(255,255,255,0.02)_2px,transparent_6px,transparent_18px)] blur-[2px]" />
        </div>

        <div className="absolute inset-0 opacity-[0.08] mix-blend-screen animate-water-reverse">
          <div className="h-full w-full bg-[repeating-linear-gradient(65deg,rgba(255,255,255,0.06)_0px,rgba(255,255,255,0.02)_2px,transparent_6px,transparent_16px)] blur-[3px]" />
        </div>

        <div className="absolute inset-[-25%] opacity-[0.08] mix-blend-screen blur-[1px] animate-caustics">
          <div
            className="h-full w-full"
            style={{
              background: 'radial-gradient(circle at 20% 30%, rgba(255,255,255,0.15), transparent 10%), radial-gradient(circle at 70% 20%, rgba(255,255,255,0.10), transparent 8%), radial-gradient(circle at 40% 70%, rgba(255,255,255,0.12), transparent 12%), radial-gradient(circle at 80% 75%, rgba(255,255,255,0.10), transparent 50%)',
            }}
          />
        </div>

        <div className="absolute -left-16 top-[18%] h-80 w-80 rounded-full border border-white/15 animate-ring1" />
        <div className="absolute right-[8%] top-[10%] h-32 w-32 rounded-full border border-white/15 animate-ring2" />
        <div className="absolute left-[20%] bottom-[12%] h-56 w-56 rounded-full border border-white/15 animate-ring3" />
        <div className="absolute right-[-6%] bottom-[8%] h-96 w-96 rounded-full border border-white/15 animate-ring4" />

        {particles.map((p) => (
          <span
            key={p.id}
            className="absolute rounded-full bg-white shadow-[0_0_12px_rgba(255,255,255,0.45)] animate-float-particle"
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

        <div className="absolute top-0 left-0 w-[450px] h-[450px] -translate-x-6 translate-y-24">
          <div className="w-full h-full blur-[0.9px] opacity-80">
            <Starnet3DFromSVG
              className="w-full h-full"
              autoRotate={true}
              speed={1.5}
              ribs={32}
              ribRadius={0.028}
            />
          </div>
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