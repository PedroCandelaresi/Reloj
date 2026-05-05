'use client';

import { useEffect, useMemo, useState } from 'react';

const slides = [
  {
    label: 'Servicio técnico',
    title: 'Soporte técnico para tu operación diaria',
    description:
      'Reparamos y optimizamos PC y notebooks para que tu equipo trabaje sin frenar la operación.',
  },
  {
    label: 'Diseño web',
    title: 'Web comercial clara y lista para vender',
    description:
      'Armamos landings, tiendas y menús online simples para mostrar lo que ofrecés y recibir consultas.',
  },
  {
    label: 'Sistema RRHH',
    title: 'Instalación y control de asistencia',
    description:
      'Instalamos relojes, cámaras y redes, y te ayudamos a ordenar fichadas y reportes de RRHH.',
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
          aria-label={`Ver ${index + 1}° servicio`}
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
          <h2 className="text-2xl font-medium leading-tight text-white sm:text-3xl">{activeSlide.title}</h2>
          <p className="text-[15px] font-normal leading-7 text-slate-300/95">{activeSlide.description}</p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3 sm:auto-rows-fr">
        {slides.map((slide, index) => (
          <button
            key={slide.title}
            type="button"
            onClick={() => setActiveIndex(index)}
            className={`h-full min-h-[172px] rounded-3xl border px-4 py-5 text-left transition ${
              index === activeIndex
                ? 'border-emerald-400/40 bg-emerald-400/10 text-white'
                : 'border-white/10 bg-white/5 text-slate-300 hover:border-white/20 hover:bg-white/10'
            }`}
          >
            <div className="flex h-full flex-col items-start">
              <p className="text-xs uppercase tracking-[0.16em] text-emerald-200/90">{slide.label}</p>
              <p className="mt-3 text-base font-medium leading-7 text-white/95">{slide.title}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
