'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

type IntroState = 'loading' | 'intro' | 'revealing' | 'complete';

interface IntroContextType {
  state: IntroState;
  isIntroComplete: boolean;
}

const IntroContext = createContext<IntroContextType | undefined>(undefined);

export function IntroProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<IntroState>('loading');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReduced) {
      setState('complete');
      return;
    }

    // Sequence: loading → intro → revealing → complete
    const timer1 = setTimeout(() => setState('intro'), 100);
    const timer2 = setTimeout(() => setState('revealing'), 2600);
    const timer3 = setTimeout(() => setState('complete'), 3400);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
    };
  }, [mounted]);

  const isIntroComplete = state === 'complete';

  return (
    <IntroContext.Provider value={{ state, isIntroComplete }}>
      <div data-intro-state={state} data-intro-complete={isIntroComplete.toString()}>
        {children}
      </div>
    </IntroContext.Provider>
  );
}

export function useIntro() {
  const context = useContext(IntroContext);
  if (context === undefined) {
    throw new Error('useIntro must be used within an IntroProvider');
  }
  return context;
}