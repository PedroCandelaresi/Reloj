'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { logout } from '@/lib/actions';
import type { CurrentUserProfile } from '@/lib/api';
import type { CompanyRole } from '@/lib/auth-token';
import { BrandLogo } from './BrandLogo';
import { ThemeToggle } from './ThemeToggle';

type NavItem = {
  href: string;
  label: string;
};

function MenuIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
      <path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
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

function NavIcon({ label }: { label: string }) {
  const common = 'h-[22px] w-[22px]';
  switch (label) {
    case 'Inicio':
      return (
        <svg viewBox="0 0 24 24" fill="none" className={common}>
          <path d="M4 11.5 12 5l8 6.5V20a1 1 0 0 1-1 1h-5v-6h-4v6H5a1 1 0 0 1-1-1v-8.5Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
        </svg>
      );
    case 'Asistencia':
      return (
        <svg viewBox="0 0 24 24" fill="none" className={common}>
          <path d="M8 3v4M16 3v4M5 9h14M6 5h12a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          <path d="m8 14 2.2 2.2L16 11" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case 'Personal':
      return (
        <svg viewBox="0 0 24 24" fill="none" className={common}>
          <path d="M16 19a4 4 0 0 0-8 0M12 12a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM19 18a3 3 0 0 0-2.5-2.95M17 7.4a2.5 2.5 0 0 1 0 4.8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      );
    case 'Solicitudes':
      return (
        <svg viewBox="0 0 24 24" fill="none" className={common}>
          <path d="M8 6h10M8 12h10M8 18h6M5 6h.01M5 12h.01M5 18h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      );
    case 'Reportes':
      return (
        <svg viewBox="0 0 24 24" fill="none" className={common}>
          <path d="M5 19V5M5 19h15M9 16V9M13 16V7M17 16v-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      );
    case 'Calendario':
      return (
        <svg viewBox="0 0 24 24" fill="none" className={common}>
          <path d="M8 3v4M16 3v4M5 9h14M6 5h12a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      );
    case 'Configuración':
      return (
        <svg viewBox="0 0 24 24" fill="none" className={common}>
          <path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z" stroke="currentColor" strokeWidth="1.8" />
          <path d="M19 13.5v-3l-2.1-.5a6.7 6.7 0 0 0-.7-1.7l1.1-1.8-2.1-2.1-1.8 1.1a6.7 6.7 0 0 0-1.7-.7L11.2 2h-3l-.5 2.1a6.7 6.7 0 0 0-1.7.7L4.2 3.7 2.1 5.8 3.2 7.6a6.7 6.7 0 0 0-.7 1.7L.5 9.8v3l2.1.5c.2.6.4 1.2.7 1.7l-1.1 1.8 2.1 2.1 1.8-1.1c.5.3 1.1.5 1.7.7l.5 2.1h3l.5-2.1c.6-.2 1.2-.4 1.7-.7l1.8 1.1 2.1-2.1-1.1-1.8c.3-.5.5-1.1.7-1.7l2-.3Z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" transform="translate(1.8 1.5) scale(.85)" />
        </svg>
      );
    case 'Empresas':
      return (
        <svg viewBox="0 0 24 24" fill="none" className={common}>
          <path d="M4 21V6a1 1 0 0 1 1-1h8a1 1 0 0 1 1 1v15M14 9h5a1 1 0 0 1 1 1v11M7 9h4M7 13h4M7 17h4M17 13h1M17 17h1" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      );
    case 'Relojes':
      return (
        <svg viewBox="0 0 24 24" fill="none" className={common}>
          <path d="M8 3h8l1 3H7l1-3ZM7 18h10l-1 3H8l-1-3ZM7 6h10v12H7V6Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
          <path d="M10 10h4M10 14h4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      );
    case 'Usuarios':
      return <UserIcon />;
    default:
      return (
        <svg viewBox="0 0 24 24" fill="none" className={common}>
          <path d="M5 12h14M12 5v14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      );
  }
}

function SidebarLogo() {
  return (
    <span
      className="flex h-11 w-11 items-center justify-center rounded-2xl border border-emerald-300/20 bg-emerald-400/10 text-emerald-200 shadow-[0_0_22px_rgba(31,199,119,0.16)]"
      aria-hidden="true"
    >
      <MenuIcon />
    </span>
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

function getInitials(name: string) {
  return name
    .split(/[.\s@_-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || 'U';
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

function withCompanyId(href: string, companyId?: string | null) {
  if (!companyId) return href;
  const separator = href.includes('?') ? '&' : '?';
  return `${href}${separator}companyId=${encodeURIComponent(companyId)}`;
}

function getNavigationItems(user?: CurrentUserProfile | null, activeCompanyId?: string | null): NavItem[] {
  const commonItems = [
    { href: '/dashboard', label: 'Inicio' },
    { href: '/records', label: 'Asistencia' },
    { href: '/employees', label: 'Personal' },
    { href: '/attendance/requests', label: 'Solicitudes' },
    { href: '/reports', label: 'Reportes' },
  ];

  if (!user?.isSuperAdmin) {
    return user?.companyRole === 'company_admin'
      ? [...commonItems, { href: '/settings/holidays', label: 'Calendario' }, { href: '/settings', label: 'Configuración' }, { href: '/users', label: 'Usuarios' }]
      : [...commonItems, { href: '/settings/holidays', label: 'Calendario' }];
  }

  const adminItems = [
    { href: withCompanyId('/admin/dashboard', activeCompanyId), label: 'Inicio' },
    { href: activeCompanyId ? `/admin/companies?company=${encodeURIComponent(activeCompanyId)}` : '/admin/companies', label: 'Empresas' },
    { href: withCompanyId('/admin/devices', activeCompanyId), label: 'Relojes' },
  ];

  const scopedItems = activeCompanyId
    ? [
        { href: withCompanyId('/records', activeCompanyId), label: 'Asistencia' },
        { href: withCompanyId('/employees', activeCompanyId), label: 'Personal' },
      ]
    : [];

  return [
    ...adminItems,
    ...scopedItems,
    { href: withCompanyId('/reports', activeCompanyId), label: 'Reportes' },
    { href: withCompanyId('/attendance/requests', activeCompanyId), label: 'Solicitudes' },
    { href: withCompanyId('/settings/holidays', activeCompanyId), label: 'Calendario' },
    ...(activeCompanyId ? [{ href: withCompanyId('/settings/org-structure', activeCompanyId), label: 'Configuración' }] : []),
  ];
}

export function NavbarClient({ user }: { user?: CurrentUserProfile | null }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeCompanyId = user?.isSuperAdmin
    ? searchParams.get('companyId') || searchParams.get('company')
    : null;
  const displayName = formatUserName(user);
  const initials = getInitials(displayName);
  const roleLabel = formatRoleLabel(user?.companyRole, user?.isSuperAdmin);
  const activeCompanyName = getActiveCompanyName(user);
  const navigationItems = getNavigationItems(user, activeCompanyId);
  const logoHref = user?.isSuperAdmin
    ? withCompanyId('/admin/dashboard', activeCompanyId)
    : '/dashboard';

  useEffect(() => {
    document.documentElement.style.setProperty('--sidebar-width', isCollapsed ? '5.25rem' : '14.5rem');
  }, [isCollapsed]);

  return (
    <>
      <header
        className="fixed inset-x-0 top-0 z-50 flex h-16 items-center justify-between border-b px-4 text-white lg:hidden"
        style={{ background: 'rgba(2,11,5,0.92)', borderColor: 'rgba(31,199,119,0.18)', backdropFilter: 'blur(18px)' }}
      >
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="rounded-lg border border-white/10 p-2 text-slate-200 transition-colors hover:bg-white/10"
          aria-label={isOpen ? 'Cerrar menú' : 'Abrir menú'}
        >
          {isOpen ? <CloseIcon /> : <MenuIcon />}
        </button>
        <Link href={logoHref} className="flex min-w-0 items-center">
          <BrandLogo
            variant="steel"
            layout="horizontal"
            iconClassName="h-9 w-9"
            wordmarkClassName="h-8 w-36"
          />
        </Link>
        <ThemeToggle />
      </header>

      <aside
        className="fixed inset-y-0 left-0 z-40 hidden flex-col border-r px-4 py-5 text-white transition-[width] duration-200 ease-out lg:flex"
        style={{
          width: 'var(--sidebar-width, 14.5rem)',
          background: 'linear-gradient(180deg, rgba(5,16,10,0.88), rgba(4,18,11,0.84) 52%, rgba(6,9,10,0.9))',
          borderColor: 'rgba(31,199,119,0.16)',
          boxShadow: '8px 0 28px rgba(0,0,0,0.16)',
          backdropFilter: 'blur(18px)',
        }}
      >
        <button
          type="button"
          onClick={() => setIsCollapsed((value) => !value)}
          className="mb-7 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl outline-none transition-transform hover:scale-105 focus-visible:ring-2 focus-visible:ring-emerald-400/70"
          aria-label={isCollapsed ? 'Expandir menú' : 'Contraer menú'}
          title={isCollapsed ? 'Expandir menú' : 'Contraer menú'}
        >
          <SidebarLogo />
        </button>

        <nav className="flex flex-1 flex-col gap-1.5">
          {navigationItems.map((item) => (
            <SidebarLink
              key={item.href}
              item={item}
              active={isActivePath(pathname, item.href)}
              collapsed={isCollapsed}
            />
          ))}
        </nav>

        <div className={`mt-4 border-t border-white/10 pt-3 ${isCollapsed ? 'relative' : ''}`}>
          <div className={`mb-3 flex items-center ${isCollapsed ? 'justify-center' : 'justify-between gap-2 rounded-2xl border border-white/10 bg-white/[0.03] p-2'}`}>
            <div className={`flex min-w-0 items-center ${isCollapsed ? 'justify-center' : 'gap-3'}`}>
              <button
                type="button"
                onClick={() => setIsProfileMenuOpen((value) => !value)}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-emerald-300/24 bg-emerald-400/12 text-xs font-semibold text-emerald-100 transition-colors hover:bg-emerald-400/20"
                aria-label="Abrir menú de perfil"
                title={displayName}
              >
                {initials}
              </button>
              {!isCollapsed && <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-100">{displayName}</p>
                <p className="truncate text-xs text-emerald-300/70">
                  {roleLabel}{activeCompanyName ? ` · ${activeCompanyName}` : ''}
                </p>
              </div>}
            </div>
            {!isCollapsed && <ThemeToggle />}
          </div>

          {isProfileMenuOpen && (
            <ProfileMenu
              user={user}
              displayName={displayName}
              roleLabel={roleLabel}
              activeCompanyName={activeCompanyName}
              collapsed={isCollapsed}
            />
          )}
          {isCollapsed && (
            <div className="mt-2 flex justify-center">
              <ThemeToggle />
            </div>
          )}
        </div>
      </aside>

      {isOpen && (
        <div
          className="fixed inset-x-0 top-16 z-50 border-b p-4 lg:hidden"
          style={{ background: 'rgba(2,11,5,0.96)', borderColor: 'rgba(31,199,119,0.18)', backdropFilter: 'blur(18px)' }}
        >
          <nav className="flex flex-col gap-1.5">
            {navigationItems.map((item) => (
              <SidebarLink
                key={item.href}
                item={item}
                active={isActivePath(pathname, item.href)}
                onClick={() => setIsOpen(false)}
              />
            ))}
          </nav>
          <div className="mt-4 border-t border-white/10 pt-4">
            <div className="mb-3 flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-emerald-300/25 bg-emerald-400/10 text-sm font-semibold text-emerald-100">
                {initials}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-slate-100">{displayName}</p>
                {user?.username && <p className="truncate text-xs text-slate-400">@{user.username}</p>}
                <p className="truncate text-xs text-emerald-300/70">
                  {roleLabel}{activeCompanyName ? ` · ${activeCompanyName}` : ''}
                </p>
              </div>
            </div>
            <ProfileLinks onNavigate={() => setIsOpen(false)} />
          </div>
        </div>
      )}
    </>
  );
}

function SidebarLink({
  item,
  active,
  collapsed = false,
  onClick,
}: {
  item: NavItem;
  active: boolean;
  collapsed?: boolean;
  onClick?: () => void;
}) {
  return (
    <Link
      href={item.href}
      aria-current={active ? 'page' : undefined}
      onClick={onClick}
      title={collapsed ? item.label : undefined}
      className={`group flex items-center rounded-2xl border text-[15px] font-medium transition-colors ${collapsed ? 'justify-center px-0 py-3' : 'gap-3.5 px-3.5 py-3'} ${
        active
          ? 'border-emerald-300/30 bg-emerald-400/14 text-emerald-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_0_18px_rgba(31,199,119,0.10)]'
          : 'border-transparent text-slate-300 hover:border-emerald-300/18 hover:bg-white/8 hover:text-white'
      }`}
    >
      <span className={active ? 'text-emerald-300' : 'text-slate-400 group-hover:text-emerald-300'}>
        <NavIcon label={item.label} />
      </span>
      {!collapsed && <span className="truncate">{item.label}</span>}
    </Link>
  );
}

function ProfileMenu({
  user,
  displayName,
  roleLabel,
  activeCompanyName,
  collapsed = false,
}: {
  user?: CurrentUserProfile | null;
  displayName: string;
  roleLabel: string;
  activeCompanyName: string | null;
  collapsed?: boolean;
}) {
  return (
    <div className={`rounded-2xl border border-white/10 bg-black/25 p-3 shadow-xl ${collapsed ? 'absolute bottom-14 left-full ml-3 w-60' : ''}`}>
      <div className="mb-2 px-1">
        <p className="text-sm font-semibold text-slate-100">{displayName}</p>
        {user?.username && <p className="mt-1 truncate text-xs text-slate-400">@{user.username}</p>}
        <p className="mt-2 text-xs font-medium text-emerald-300">{roleLabel}</p>
        {activeCompanyName && <p className="mt-1 truncate text-xs text-slate-400">{activeCompanyName}</p>}
      </div>
      <ProfileLinks />
    </div>
  );
}

function ProfileLinks({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <div className="space-y-1">
      <Link href="/profile" onClick={onNavigate} className="block rounded-lg px-3 py-2 text-sm text-slate-300 transition-colors hover:bg-white/8 hover:text-white">
        Mi Perfil
      </Link>
      <Link href="/profile/password" onClick={onNavigate} className="block rounded-lg px-3 py-2 text-sm text-slate-300 transition-colors hover:bg-white/8 hover:text-white">
        Cambiar contraseña
      </Link>
      <form action={logout}>
        <button
          type="submit"
          className="block w-full rounded-lg px-3 py-2 text-left text-sm text-red-300 transition-colors hover:bg-red-500/10"
        >
          Cerrar sesión
        </button>
      </form>
    </div>
  );
}

function isActivePath(pathname: string, href: string) {
  const hrefPath = href.split('?')[0];

  if (pathname === hrefPath) {
    return true;
  }

  if (hrefPath === '/dashboard' || hrefPath === '/admin/dashboard' || hrefPath === '/settings') {
    return false;
  }

  return pathname.startsWith(`${hrefPath}/`);
}
