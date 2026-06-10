'use client';

import { ReactNode } from 'react';
import { trackWhatsAppClick } from '@/lib/analytics';

type TrackedWhatsAppLinkProps = {
  href: string;
  children: ReactNode;
  className?: string;
  placement: string;
  service?: string;
};

export function TrackedWhatsAppLink({
  href,
  children,
  className = '',
  placement,
  service = 'Sistema de RRHH y fichadas',
}: TrackedWhatsAppLinkProps) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      onClick={() =>
        trackWhatsAppClick({
          source: 'marketing',
          placement,
          service,
        })
      }
      className={className}
    >
      {children}
    </a>
  );
}
