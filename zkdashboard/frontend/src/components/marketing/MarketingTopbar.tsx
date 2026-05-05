'use client';

import Link from 'next/link';
import { useState } from 'react';
import { marketingNavItems, marketingConfig } from '@/lib/marketing';

function MenuIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="h-5 w-5">
      <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="h-5 w-5">
      <path d="M6 6l12 12M6 18L18 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function MarketingTopbar() {
  const [open, setOpen] = useState(false);

  return (
    <header className="fixed inset-x-0 top-0 z-40 px-4 pt-4 sm:px-6">
      <div className="relative mx-auto w-full max-w-6xl lg:max-w-[82rem]">
        {/* Desktop: Brand + Nav centered, Login button separate on the right */}
        <div className="hidden lg:block">
          <div className="absolute left-1/2 top-0 z-10 -translate-x-1/2">
            <div className="header-control animate-header-reveal rounded-full border border-white/15 bg-[#0b1111]/70 px-7 xl:px-9 backdrop-blur-xl shadow-[0_16px_40px_rgba(0,0,0,0.35)]">
              <div className="flex items-center gap-8 xl:gap-10">
                <Link href="/" className="inline-flex items-center gap-3 flex-shrink-0">
                  <img src="/brand/conflunet-isotipo.svg" alt="" aria-hidden="true" className="h-8 w-8 object-contain" />
                  <img
                    src="/brand/conflunet-wordmark-brushed-steel.svg"
                    alt={marketingConfig.brandName}
                    className="h-6 w-auto object-contain"
                  />
                </Link>

                <nav className="flex items-center gap-2 xl:gap-3">
                  {marketingNavItems.map((item) => (
                    <a
                      key={item.href}
                      href={item.href}
                      className="rounded-full px-5 py-2 text-sm whitespace-nowrap text-slate-200 transition hover:bg-white/10 hover:text-white"
                    >
                      {item.label}
                    </a>
                  ))}
                </nav>
              </div>
            </div>
          </div>

          <div className="absolute right-0 top-0 z-20">
            <Link
              href="/login"
              className="header-control animate-header-reveal-delayed rounded-full border border-white/15 bg-[#0b1111]/70 px-6 xl:px-7 backdrop-blur-xl shadow-[0_16px_40px_rgba(0,0,0,0.35)] text-sm font-medium text-slate-200 transition hover:bg-white/10 hover:text-white"
            >
              Ingresar
            </Link>
          </div>
        </div>

        {/* Mobile: Compact layout */}
        <div className="flex items-center justify-between lg:hidden">
          <Link href="/" className="inline-flex items-center gap-2 flex-shrink-0">
            <img src="/brand/conflunet-isotipo.svg" alt="" aria-hidden="true" className="h-8 w-8 object-contain" />
            <img
              src="/brand/conflunet-wordmark-brushed-steel.svg"
              alt={marketingConfig.brandName}
              className="h-6 w-auto object-contain"
            />
          </Link>

          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-white/5 text-white transition hover:bg-white/10"
            aria-label={open ? 'Cerrar menú' : 'Abrir menú'}
            aria-expanded={open}
          >
            {open ? <CloseIcon /> : <MenuIcon />}
          </button>
        </div>

        {/* Mobile menu */}
        {open && (
          <div className="mt-3 rounded-3xl border border-white/15 bg-[#0b1111]/90 p-4 backdrop-blur-xl shadow-[0_16px_40px_rgba(0,0,0,0.35)] lg:hidden">
            <nav className="grid gap-2">
              {marketingNavItems.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className="rounded-2xl px-4 py-3 text-sm text-slate-200 transition hover:bg-white/10 hover:text-white"
                >
                  {item.label}
                </a>
              ))}
            </nav>

            <div className="mt-4 pt-4 border-t border-white/10">
              <Link
                href="/login"
                onClick={() => setOpen(false)}
                className="block rounded-2xl border border-white/15 px-4 py-3 text-center text-sm font-medium text-slate-200 transition hover:bg-white/10 hover:text-white"
              >
                Ingresar
              </Link>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
