'use client';

import { useEffect } from 'react';
import { useIntro } from './IntroProvider';

export function MarketingIntroAnimation({ children }: { children: React.ReactNode }) {
  const { state } = useIntro();

  useEffect(() => {
    // Disable scroll restoration for landing page experience
    if (typeof window !== 'undefined') {
      history.scrollRestoration = 'manual';
      window.scrollTo(0, 0);
    }
  }, []);

  if (state === 'loading' || state === 'intro') {
    return null; // Content hidden during brand intro
  }

  if (state === 'revealing') {
    return (
      <div className="animate-content-reveal">
        {children}
      </div>
    );
  }

  // Complete: Content fully shown
  return <>{children}</>;
}
