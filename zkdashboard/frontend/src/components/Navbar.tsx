'use client';

import { useState } from 'react';
import Link from 'next/link';
import { logout } from '@/lib/actions';

function MenuIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6">
      <path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6">
      <path d="M6 6l12 12M6 18L18 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function Navbar({ username }: { username?: string }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 text-white px-4 py-5 flex items-center justify-between shadow-md">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_#0a6b3d_0%,_#064525_20%,_#032415_55%,_#010d07_100%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_15%,rgba(22,163,74,0.10),transparent_18%),radial-gradient(circle_at_80%_20%,rgba(110,231,183,0.05),transparent_18%),radial-gradient(circle_at_30%_75%,rgba(34,197,94,0.06),transparent_24%),radial-gradient(circle_at_75%_85%,rgba(16,185,129,0.05),transparent_20%)] animate-drift-slow" />
        <div className="absolute -left-32 top-12 h-80 w-80 rounded-full bg-emerald-400/8 blur-3xl animate-blob1" />
        <div className="absolute right-[-6rem] top-24 h-96 w-96 rounded-full bg-green-300/6 blur-3xl animate-blob2" />
        <div className="absolute bottom-[-5rem] left-[12%] h-96 w-96 rounded-full bg-emerald-500/8 blur-3xl animate-blob3" />
        <div className="absolute inset-0 opacity-[0.06] mix-blend-screen animate-water">
          <div className="h-full w-full bg-[repeating-linear-gradient(115deg,rgba(255,255,255,0.04)_0px,rgba(255,255,255,0.01)_2px,transparent_6px,transparent_18px)] blur-[1px]" />
        </div>
        <div className="absolute inset-0 opacity-[0.04] mix-blend-screen animate-water-reverse">
          <div className="h-full w-full bg-[repeating-linear-gradient(65deg,rgba(255,255,255,0.04)_0px,rgba(255,255,255,0.01)_2px,transparent_6px,transparent_16px)] blur-[2px]" />
        </div>
      </div>
      <div className="relative flex items-center gap-2">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="lg:hidden p-2 hover:bg-emerald-800/50 rounded-md transition-colors"
          aria-label={isOpen ? 'Cerrar menú' : 'Abrir menú'}
        >
          {isOpen ? <CloseIcon /> : <MenuIcon />}
        </button>
        <Link href="/dashboard" className="flex items-center gap-2">
          <span
            className="font-bold text-xl tracking-wide"
            style={{
              background:
                'linear-gradient(180deg, #ffffff 0%, #f5f5f5 15%, #d4d4d8 35%, #ffffff 50%, #9ca3af 70%, #f8fafc 85%, #a1a1aa 100%)',
              WebkitBackgroundClip: 'text',
              backgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              textShadow:
                '0 1px 0 rgba(255,255,255,0.15), 0 8px 18px rgba(255,255,255,0.04)',
              filter: 'drop-shadow(0 1px 2px rgba(255,255,255,0.12))',
            }}
          >
            STARNET
          </span>
        </Link>
      </div>

      <div className="relative hidden lg:flex items-center gap-6">
        <Link href="/dashboard" className="text-emerald-100 hover:text-white text-sm transition-colors">
          Inicio
        </Link>
        <Link href="/employees" className="text-emerald-100 hover:text-white text-sm transition-colors">
          Empleados
        </Link>
        <Link href="/records" className="text-emerald-100 hover:text-white text-sm transition-colors">
          Registros
        </Link>
      </div>

      <div className="relative hidden lg:flex items-center gap-4">
        {username && <span className="text-emerald-100/80 text-sm">{username}</span>}
        <form action={logout}>
          <button
            type="submit"
            className="text-red-200 hover:text-white text-sm transition-colors"
          >
            Cerrar sesión
          </button>
        </form>
      </div>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 shadow-lg lg:hidden z-50" style={{ background: 'linear-gradient(180deg, #032415 0%, #02120b 100%)' }}>
          <div className="flex flex-col p-4 gap-4">
            <Link href="/dashboard" className="text-emerald-100 hover:text-white text-sm py-2" onClick={() => setIsOpen(false)}>
              Inicio
            </Link>
            <Link href="/employees" className="text-emerald-100 hover:text-white text-sm py-2" onClick={() => setIsOpen(false)}>
              Empleados
            </Link>
            <Link href="/records" className="text-emerald-100 hover:text-white text-sm py-2" onClick={() => setIsOpen(false)}>
              Registros
            </Link>
            <div className="border-t border-emerald-600/50 pt-4">
              {username && <span className="text-emerald-100/80 text-sm block mb-2">{username}</span>}
              <form action={logout}>
                <button
                  type="submit"
                  className="text-red-200 hover:text-white text-sm"
                >
                  Cerrar sesión
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
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
        .animate-drift-slow { animation: driftSlow 18s ease-in-out infinite; }
        .animate-blob1 { animation: blob1 20s ease-in-out infinite; }
        .animate-blob2 { animation: blob2 18s ease-in-out infinite; }
        .animate-blob3 { animation: blob3 22s ease-in-out infinite; }
        .animate-water { animation: water 14s ease-in-out infinite; }
        .animate-water-reverse { animation: waterReverse 17s ease-in-out infinite; }
      `}</style>
    </nav>
  );
}