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
    <header className="fixed inset-x-0 top-0 z-50 px-4 pt-4 sm:px-6">
      <div className="mx-auto w-full max-w-6xl">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="rounded-full border border-white/15 bg-[#0b1111]/70 px-4 py-3 backdrop-blur-xl shadow-[0_16px_40px_rgba(0,0,0,0.35)] sm:px-5">
            <div className="flex items-center gap-4">
              <Link href="/" className="inline-flex items-center gap-2">
                <img src="/brand/conflunet-isotipo.svg" alt="" aria-hidden="true" className="h-8 w-8 object-contain" />
                <img
                  src="/brand/conflunet-wordmark-brushed-steel.svg"
                  alt={marketingConfig.brandName}
                  className="h-7 w-auto object-contain"
                />
              </Link>

              <nav className="hidden items-center gap-2 lg:flex">
                {marketingNavItems.map((item) => (
                  <a
                    key={item.href}
                    href={item.href}
                    className="rounded-full px-4 py-2 text-sm text-slate-200 transition hover:bg-white/10 hover:text-white"
                  >
                    {item.label}
                  </a>
                ))}
              </nav>
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 lg:justify-end">
            <Link
              href="/login"
              className="hidden rounded-full border border-white/15 bg-[#0b1111]/70 px-5 py-3 text-sm font-medium text-slate-200 transition hover:bg-white/10 hover:text-white lg:inline-flex"
            >
              Ingresar
            </Link>

            <button
              type="button"
              onClick={() => setOpen((value) => !value)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-white/5 text-white transition hover:bg-white/10 lg:hidden"
              aria-label={open ? 'Cerrar menú' : 'Abrir menú'}
              aria-expanded={open}
            >
              {open ? <CloseIcon /> : <MenuIcon />}
            </button>
          </div>
        </div>

        {open ? (
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

            <div className="mt-4 grid gap-2">
              <Link
                href="/login"
                onClick={() => setOpen(false)}
                className="rounded-2xl border border-white/15 px-4 py-3 text-center text-sm font-medium text-slate-200 transition hover:bg-white/10 hover:text-white"
              >
                Ingresar
              </Link>
            </div>
          </div>
        ) : null}
      </div>
    </header>
  );
}
