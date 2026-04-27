'use client';

import { useState } from 'react';
import Link from 'next/link';
import { logout } from '@/lib/actions';
import type { CurrentUserProfile } from '@/lib/api';
import type { CompanyRole } from '@/lib/auth-token';
import { BrandLogo } from './BrandLogo';

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

function formatRoleLabel(role?: CompanyRole | null, isSuperAdmin?: boolean) {
  if (isSuperAdmin) return 'Super admin';
  switch (role) {
    case 'company_admin':
      return 'Admin empresa';
    case 'operator':
      return 'Operador';
    case 'read_only':
      return 'Solo lectura';
    default:
      return 'Usuario';
  }
}

function getActiveCompanyName(user?: CurrentUserProfile | null) {
  if (!user || user.isSuperAdmin) return null;
  const activeMembership = user.memberships.find(
    (membership) => membership.companyId === user.companyId,
  );
  return (
    activeMembership?.company?.nombreFantasia ||
    activeMembership?.company?.razonSocial ||
    null
  );
}

function getNavigationItems(user?: CurrentUserProfile | null) {
  const commonItems = [
    { href: '/dashboard', label: 'Dashboard' },
    { href: '/records', label: 'Fichadas' },
    { href: '/employees', label: 'Empleados' },
  ];

  if (!user?.isSuperAdmin) {
    return user?.companyRole === 'company_admin'
      ? [
          ...commonItems,
          { href: '/users', label: 'Usuarios' },
          { href: '/settings', label: 'Configuración' },
        ]
      : commonItems;
  }

  return [
    { href: '/admin/dashboard', label: 'Panel global' },
    { href: '/admin/companies', label: 'Empresas' },
    { href: '/admin/devices', label: 'Dispositivos' },
  ];
}

export function NavbarClient({ user }: { user?: CurrentUserProfile | null }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const displayName = formatUserName(user);
  const roleLabel = formatRoleLabel(user?.companyRole, user?.isSuperAdmin);
  const activeCompanyName = getActiveCompanyName(user);
  const navigationItems = getNavigationItems(user);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 text-white px-4 py-4 flex items-center justify-between shadow-[0_12px_34px_rgba(0,0,0,0.36)]">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute inset-0 conflunet-steel-bg" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_0%,rgba(35,255,153,0.13),transparent_24%),linear-gradient(180deg,rgba(0,0,0,0.22),rgba(0,0,0,0.46))]" />
        <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-emerald-300/35 to-transparent" />
      </div>
      <div className="relative flex items-center gap-2">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="lg:hidden p-2 hover:bg-white/10 rounded-md transition-colors"
          aria-label={isOpen ? 'Cerrar menú' : 'Abrir menú'}
        >
          {isOpen ? <CloseIcon /> : <MenuIcon />}
        </button>
        <Link href={user?.isSuperAdmin ? '/admin/dashboard' : '/dashboard'} className="flex items-center gap-2">
          <BrandLogo
            variant="steel"
            layout="horizontal"
            iconClassName="w-9"
            wordmarkClassName="w-40 sm:w-48"
          />
        </Link>
      </div>

      <div className="relative hidden lg:flex items-center gap-6">
        {navigationItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="text-slate-200 hover:text-white text-sm transition-colors"
          >
            {item.label}
          </Link>
        ))}
      </div>

      <div className="relative hidden lg:flex items-center gap-3">
        <div className="text-right">
          <span className="block text-slate-100/95 text-sm">{displayName}</span>
          <span className="block text-[11px] text-emerald-100/70">
            {roleLabel}
            {activeCompanyName ? ` · ${activeCompanyName}` : ''}
          </span>
        </div>
        <button
          type="button"
          onClick={() => setIsProfileMenuOpen((current) => !current)}
          className="h-10 w-10 rounded-full border border-slate-200/25 bg-white/10 hover:bg-white/15 transition-colors flex items-center justify-center"
          aria-label="Abrir menú de perfil"
        >
          <UserIcon />
        </button>

        {isProfileMenuOpen && (
          <div className="absolute right-0 top-full mt-3 w-60 rounded-2xl border border-emerald-900/30 bg-white/95 text-gray-800 shadow-2xl backdrop-blur-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100">
              <p className="text-sm font-semibold text-gray-900">{displayName}</p>
              {user?.username && <p className="text-xs text-gray-500 mt-1">@{user.username}</p>}
              <p className="text-xs text-emerald-700 mt-2 font-medium">{roleLabel}</p>
              {activeCompanyName && (
                <p className="text-xs text-gray-500 mt-1">{activeCompanyName}</p>
              )}
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
                href="/profile/password"
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
        <div className="absolute top-full left-0 right-0 shadow-lg lg:hidden z-50" style={{ background: 'linear-gradient(180deg, #15191f 0%, #050708 100%)' }}>
          <div className="flex flex-col p-4 gap-4">
            {navigationItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="text-emerald-100 hover:text-white text-sm py-2"
                onClick={() => setIsOpen(false)}
              >
                {item.label}
              </Link>
            ))}
            <div className="border-t border-emerald-600/50 pt-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="h-10 w-10 rounded-full border border-emerald-200/30 bg-white/10 flex items-center justify-center">
                  <UserIcon />
                </div>
                <div>
                  <p className="text-emerald-50 text-sm font-medium">{displayName}</p>
                  {user?.username && <p className="text-emerald-100/70 text-xs">@{user.username}</p>}
                  <p className="text-emerald-100/70 text-xs mt-1">
                    {roleLabel}
                    {activeCompanyName ? ` · ${activeCompanyName}` : ''}
                  </p>
                </div>
              </div>
              <Link href="/profile" className="text-emerald-100 hover:text-white text-sm block py-2" onClick={() => setIsOpen(false)}>
                Mi Perfil
              </Link>
              <Link href="/profile/password" className="text-emerald-100 hover:text-white text-sm block py-2" onClick={() => setIsOpen(false)}>
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
