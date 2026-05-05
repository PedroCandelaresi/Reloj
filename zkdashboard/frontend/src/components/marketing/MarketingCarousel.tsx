'use client';

import { useEffect, useMemo, useState } from 'react';

const slides = [
  {
    title: 'Turnos y fichadas en un solo lugar',
    description:
      'Visualizá entradas, salidas y ausencias desde un panel único para tu equipo y tus supervisores.',
  },
  {
    title: 'Reportes claros para decisiones rápidas',
    description:
      'Obtené métricas de presencia, horas trabajadas y licencias con información lista para actuar.',
  },
  {
    title: 'Soporte directo por WhatsApp',
    description:
      'Implementación acompañada y atención inmediata para resolver dudas y poner tu sistema en marcha.',
  },
];

export function MarketingCarousel() {
  const [activeIndex, setActiveIndex] = useState(0);
  const activeSlide = slides[activeIndex];

  useEffect(() => {
    const timer = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % slides.length);
    }, 5500);

    return () => window.clearInterval(timer);
  }, []);

  const dots = useMemo(
    () =>
      slides.map((_, index) => (
        <button
          key={index}
          type="button"
          onClick={() => setActiveIndex(index)}
          className={`h-2.5 w-2.5 rounded-full transition ${
            index === activeIndex ? 'bg-emerald-400' : 'bg-white/35'
          }`}
          aria-label={`Ver ${index + 1}° beneficio`}
        />
      )),
    [activeIndex],
  );

  return (
    <div className="space-y-6">
      <div className="rounded-[1.75rem] border border-white/10 bg-slate-950/95 p-6 text-white shadow-2xl shadow-slate-950/20 sm:p-8">
        <div className="flex items-center justify-between gap-4">
          <span className="rounded-full bg-emerald-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-emerald-200">
            Beneficios
          </span>
          <div className="flex items-center gap-2">{dots}</div>
        </div>
        <div className="mt-6 space-y-4">
          <h2 className="text-2xl font-semibold text-white sm:text-3xl">{activeSlide.title}</h2>
          <p className="text-base leading-7 text-slate-300">{activeSlide.description}</p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {slides.map((slide, index) => (
          <button
            key={slide.title}
            type="button"
            onClick={() => setActiveIndex(index)}
            className={`rounded-3xl border px-4 py-5 text-left transition ${
              index === activeIndex
                ? 'border-emerald-400/40 bg-emerald-400/10 text-white'
                : 'border-white/10 bg-white/5 text-slate-300 hover:border-white/20 hover:bg-white/10'
            }`}
          >
            <p className="text-sm uppercase tracking-[0.2em] text-emerald-200/90">Paso {index + 1}</p>
            <p className="mt-3 font-semibold text-white">{slide.title}</p>
          </button>
        ))}
      </div>
    </div>
  );
}
