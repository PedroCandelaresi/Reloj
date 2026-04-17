'use client';

import { useState } from 'react';
import Link from 'next/link';
import { logout } from '@/lib/actions';
import type { CurrentUserProfile } from '@/lib/api';

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

function UserIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
      <path d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4Z" stroke="currentColor" strokeWidth="1.8" />
      <path d="M5 20a7 7 0 0 1 14 0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function formatUserName(user?: CurrentUserProfile | null) {
  if (!user) return 'Mi cuenta';
  const fullName = [user.nombre?.trim(), user.apellido?.trim()].filter(Boolean).join(' ');
  return fullName || user.username;
}

export function NavbarClient({ user }: { user?: CurrentUserProfile | null }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const displayName = formatUserName(user);

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

      <div className="relative hidden lg:flex items-center gap-3">
        <span className="text-emerald-100/80 text-sm">{displayName}</span>
        <button
          type="button"
          onClick={() => setIsProfileMenuOpen((current) => !current)}
          className="h-10 w-10 rounded-full border border-emerald-200/30 bg-white/10 hover:bg-white/15 transition-colors flex items-center justify-center"
          aria-label="Abrir menú de perfil"
        >
          <UserIcon />
        </button>

        {isProfileMenuOpen && (
          <div className="absolute right-0 top-full mt-3 w-60 rounded-2xl border border-emerald-900/30 bg-white/95 text-gray-800 shadow-2xl backdrop-blur-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100">
              <p className="text-sm font-semibold text-gray-900">{displayName}</p>
              {user?.username && <p className="text-xs text-gray-500 mt-1">@{user.username}</p>}
            </div>
            <div className="py-2">
              <Link
                href="/profile"
                onClick={() => setIsProfileMenuOpen(false)}
                className="block px-4 py-2.5 text-sm hover:bg-emerald-50 transition-colors"
              >
                Mi Perfil
              </Link>
              <Link
                href="/profile#password"
                onClick={() => setIsProfileMenuOpen(false)}
                className="block px-4 py-2.5 text-sm hover:bg-emerald-50 transition-colors"
              >
                Cambiar contraseña
              </Link>
              <form action={logout}>
                <button
                  type="submit"
                  className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                >
                  Cerrar sesión
                </button>
              </form>
            </div>
          </div>
        )}
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
              <div className="flex items-center gap-3 mb-3">
                <div className="h-10 w-10 rounded-full border border-emerald-200/30 bg-white/10 flex items-center justify-center">
                  <UserIcon />
                </div>
                <div>
                  <p className="text-emerald-50 text-sm font-medium">{displayName}</p>
                  {user?.username && <p className="text-emerald-100/70 text-xs">@{user.username}</p>}
                </div>
              </div>
              <Link href="/profile" className="text-emerald-100 hover:text-white text-sm block py-2" onClick={() => setIsOpen(false)}>
                Mi Perfil
              </Link>
              <Link href="/profile#password" className="text-emerald-100 hover:text-white text-sm block py-2" onClick={() => setIsOpen(false)}>
                Cambiar contraseña
              </Link>
              <form action={logout}>
                <button
                  type="submit"
                  className="text-red-200 hover:text-white text-sm py-2"
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
