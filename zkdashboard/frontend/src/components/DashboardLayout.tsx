'use client';

import { ReactNode } from 'react';

export function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div
      className="min-h-screen"
      style={{ background: 'linear-gradient(160deg, #1a1d21 0%, #16191d 60%, #13161a 100%)' }}
    >
      {children}
    </div>
  );
}
