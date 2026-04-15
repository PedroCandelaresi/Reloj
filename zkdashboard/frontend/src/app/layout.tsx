import type { Metadata } from 'next';
import { Manrope, Space_Grotesk } from 'next/font/google';
import './globals.css';

const bodyFont = Manrope({
  subsets: ['latin'],
  variable: '--font-sans',
});

const displayFont = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-display',
});

export const metadata: Metadata = {
  title: 'STARNET | Control de Asistencia',
  description: 'Plataforma de control de asistencia y fichadas de STARNET',
  icons: {
    icon: [
      { url: '/brand/icon-512.png', type: 'image/png', sizes: '512x512' },
    ],
    shortcut: '/brand/icon-512.png',
    apple: '/brand/icon-512.png',
  },
  openGraph: {
    title: 'STARNET | Control de Asistencia',
    description: 'Plataforma de control de asistencia y fichadas de STARNET',
    images: ['/brand/logo-primary.jpeg'],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body
        className={`${bodyFont.variable} ${displayFont.variable} min-h-screen bg-[var(--surface-muted)] text-[var(--ink-strong)] antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
