'use client';

import { useState } from 'react';
import Link from 'next/link';
import { logout } from '@/lib/actions';
import type { CurrentUserProfile } from '@/lib/api';
import type { CompanyRole } from '@/lib/auth-token';
import { BrandLogo } from './BrandLogo';
import { ThemeToggle } from './ThemeToggle';

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
    case 'company_admin': return 'Admin empresa';
    case 'operator':      return 'Operador';
    case 'read_only':     return 'Solo lectura';
    default:              return 'Usuario';
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
    { href: '/reports', label: 'Reportes' },
    { href: '/employees', label: 'Empleados' },
  ];

  if (!user?.isSuperAdmin) {
    return user?.companyRole === 'company_admin'
      ? [...commonItems, { href: '/users', label: 'Usuarios' }, { href: '/settings', label: 'Configuración' }]
      : commonItems;
  }

  return [
    { href: '/admin/dashboard', label: 'Panel global' },
    { href: '/admin/companies', label: 'Empresas' },
    { href: '/admin/devices', label: 'Dispositivos' },
    { href: '/reports', label: 'Reportes' },
  ];
}

export function NavbarClient({ user }: { user?: CurrentUserProfile | null }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const displayName = formatUserName(user);
  const roleLabel = formatRoleLabel(user?.companyRole, user?.isSuperAdmin);
  const activeCompanyName = getActiveCompanyName(user);
  const navigationItems = getNavigationItems(user);

  /* Navbar keeps dark bg in both themes (GNOME Adwaita headerbar style) */
  return (
    <nav
      className="fixed top-0 left-0 right-0 z-50 text-white px-4 py-4 flex items-center justify-between"
      style={{ background: 'var(--bg-navbar)', borderBottom: '1px solid rgba(255,255,255,0.06)', boxShadow: '0 2px 12px rgba(0,0,0,0.35)' }}
    >
      {/* Logo + hamburger */}
      <div className="flex items-center gap-2">
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
            className="min-h-14"
            iconClassName="h-14 w-14 -my-2"
            wordmarkClassName="h-11 w-44 sm:w-56"
          />
        </Link>
      </div>

      {/* Desktop nav links */}
      <div className="hidden lg:flex items-center gap-6">
        {navigationItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="text-slate-300 hover:text-white text-sm transition-colors"
          >
            {item.label}
          </Link>
        ))}
      </div>

      {/* Desktop right: theme toggle + user */}
      <div className="hidden lg:flex items-center gap-2">
        <ThemeToggle />

        <div className="text-right ml-2">
          <span className="block text-slate-100/95 text-sm">{displayName}</span>
          <span className="block text-[11px] text-emerald-300/70">
            {roleLabel}{activeCompanyName ? ` · ${activeCompanyName}` : ''}
          </span>
        </div>
        <button
          type="button"
          onClick={() => setIsProfileMenuOpen((c) => !c)}
          className="h-10 w-10 rounded-full border border-slate-200/20 bg-white/10 hover:bg-white/15 transition-colors flex items-center justify-center"
          aria-label="Abrir menú de perfil"
        >
          <UserIcon />
        </button>

        {isProfileMenuOpen && (
          <div className="absolute right-4 top-full mt-2 w-60 rounded-xl border overflow-hidden"
            style={{ background: 'var(--surface)', borderColor: 'var(--border)', boxShadow: 'var(--shadow-card)' }}
          >
            <div className="px-4 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
              <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{displayName}</p>
              {user?.username && <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>@{user.username}</p>}
              <p className="text-xs mt-2 font-medium" style={{ color: 'var(--brand-text)' }}>{roleLabel}</p>
              {activeCompanyName && <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{activeCompanyName}</p>}
            </div>
            <div className="py-1">
              <Link href="/profile" onClick={() => setIsProfileMenuOpen(false)}
                className="block px-4 py-2.5 text-sm transition-colors hover:bg-black/5 dark:hover:bg-white/5"
                style={{ color: 'var(--text-primary)' }}
              >
                Mi Perfil
              </Link>
              <Link href="/profile/password" onClick={() => setIsProfileMenuOpen(false)}
                className="block px-4 py-2.5 text-sm transition-colors hover:bg-black/5 dark:hover:bg-white/5"
                style={{ color: 'var(--text-primary)' }}
              >
                Cambiar contraseña
              </Link>
              <form action={logout}>
                <button
                  type="submit"
                  className="w-full text-left px-4 py-2.5 text-sm transition-colors hover:bg-red-500/10"
                  style={{ color: 'var(--danger)' }}
                >
                  Cerrar sesión
                </button>
              </form>
            </div>
          </div>
        )}
      </div>

      {/* Mobile menu */}
      {isOpen && (
        <div
          className="absolute top-full left-0 right-0 lg:hidden z-50 border-t"
          style={{ background: 'var(--bg-navbar)', borderColor: 'rgba(255,255,255,0.08)' }}
        >
          <div className="flex flex-col p-4 gap-1">
            {navigationItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="text-slate-300 hover:text-white text-sm py-2 px-2 rounded-md hover:bg-white/8 transition-colors"
                onClick={() => setIsOpen(false)}
              >
                {item.label}
              </Link>
            ))}
            <div className="mt-3 pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.1)' }}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-full border border-slate-200/20 bg-white/10 flex items-center justify-center">
                    <UserIcon />
                  </div>
                  <div>
                    <p className="text-slate-100 text-sm font-medium">{displayName}</p>
                    {user?.username && <p className="text-slate-400 text-xs">@{user.username}</p>}
                    <p className="text-emerald-300/70 text-xs mt-0.5">
                      {roleLabel}{activeCompanyName ? ` · ${activeCompanyName}` : ''}
                    </p>
                  </div>
                </div>
                <ThemeToggle />
              </div>
              <Link href="/profile" className="text-slate-300 hover:text-white text-sm block py-2 px-2 rounded-md hover:bg-white/8 transition-colors" onClick={() => setIsOpen(false)}>
                Mi Perfil
              </Link>
              <Link href="/profile/password" className="text-slate-300 hover:text-white text-sm block py-2 px-2 rounded-md hover:bg-white/8 transition-colors" onClick={() => setIsOpen(false)}>
                Cambiar contraseña
              </Link>
              <form action={logout}>
                <button type="submit" className="text-sm py-2 px-2 block transition-colors" style={{ color: 'var(--danger)' }}>
                  Cerrar sesión
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
