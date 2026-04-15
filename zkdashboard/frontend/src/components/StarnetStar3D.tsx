'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';

type StarnetStarProps = {
  className?: string;
  autoRotate?: boolean;
  speed?: number;
  color?: string;
  strokeWidth?: number;
  layers?: number;
  size?: number;
};

type Pt = { x: number; y: number };

function clamp(n: number, lo: number, hi: number) {
  return Math.min(Math.max(n, lo), hi);
}

function roundedSquarePts(size: number, radius: number, segments: number): Pt[] {
  const h = size / 2;
  const s = h - radius;
  const pts: Pt[] = [];

  const line = (x1: number, y1: number, x2: number, y2: number) => {
    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      pts.push({ x: x1 + (x2 - x1) * t, y: y1 + (y2 - y1) * t });
    }
  };

  const arc = (cx: number, cy: number, a1: number, a2: number) => {
    for (let i = 0; i <= segments; i++) {
      const a = a1 + (a2 - a1) * (i / segments);
      pts.push({ x: cx + Math.cos(a) * radius, y: cy + Math.sin(a) * radius });
    }
  };

  line(-s, -h, s, -h);
  arc(s, -s, -Math.PI / 2, 0);

  line(h, -s, h, s);
  arc(s, s, 0, Math.PI / 2);

  line(s, h, -s, h);
  arc(-s, s, Math.PI / 2, Math.PI);

  line(-h, s, -h, -s);
  arc(-s, -s, Math.PI, Math.PI * 1.5);

  return pts;
}

function layerPath(
  base: Pt[],
  i: number,
  n: number,
  phase: number,
  cx: number,
  cy: number,
): string {
  const t = n <= 1 ? 0 : i / (n - 1);

  // progreso no lineal: el giro se siente más hacia adentro
  const e = Math.pow(t, 0.9);

  // giro global total ~90°
  const angle = e * (Math.PI / 2) + phase;

  // escala: no colapsar demasiado pronto
  const scale = 1 - Math.pow(t, 0.84) * 0.86;

  const cosA = Math.cos(angle);
  const sinA = Math.sin(angle);

  const d = base
    .map(({ x, y }, idx) => {
      const bx = x * scale;
      const by = y * scale;

      const theta = Math.atan2(by, bx);
      const r = Math.hypot(bx, by);

      // 4 aspas / 4 lados
      const blade = Math.cos(4 * theta);

      // ESTA la mantenemos porque coincide con tu modelo
      const radialWarp = 1 - 0.03 * blade + 0.06 * e * blade;

      // más efecto en los lados, menos en las esquinas
      const sideMask = Math.pow(Math.abs(Math.cos(2 * theta)), 1.15);

      // envelope: el retorcido pega más en zona media-interna
      const twistEnvelope =
        Math.sin(e * Math.PI) * 0.58 + e * e * 0.42;

      // la curva rota sobre sí misma
      const selfRotate =
        twistEnvelope *
        (0.18 + 0.62 * e) *
        Math.sin(4 * theta) *
        sideMask;

      // detalle fino secundario
      const microTwist =
        (0.008 + e * 0.024) *
        Math.sin(8 * theta + e * 0.9);

      // cierre central progresivo
      const centerPull =
        (e * e * 20 + e * 6) * (0.66 + 0.14 * blade);

      // curvatura radial buena
      let rr = r * radialWarp - centerPull;

      // permitir que algunas capas crucen un poco el centro
      // para llenar la "flor" central sin empastar del todo
      rr = Math.max(rr, -4.5);

      const localAngle = theta + selfRotate + microTwist;

      const px = Math.cos(localAngle) * rr;
      const py = Math.sin(localAngle) * rr;

      const rx = cx + px * cosA - py * sinA;
      const ry = cy + px * sinA + py * cosA;

      return `${idx === 0 ? 'M' : 'L'}${rx.toFixed(2)},${ry.toFixed(2)}`;
    })
    .join(' ');

  return d + ' Z';
}

export default function StarnetStar3D({
  className,
  autoRotate = true,
  speed = 1,
  color = '#ffffff',
  strokeWidth = 1,
  layers = 72,
  size = 255,
}: StarnetStarProps) {
  const [phase, setPhase] = useState(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (!autoRotate) return;

    let last = performance.now();

    const tick = (now: number) => {
      const dt = now - last;
      last = now;
      setPhase((p) => p + dt * 0.00012 * clamp(speed, 0, 4));
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [autoRotate, speed]);

  const base = useMemo(
    () => roundedSquarePts(size, size * 0.02, 22),
    [size],
  );

  const paths = useMemo(
    () =>
      Array.from({ length: layers }, (_, i) =>
        layerPath(base, i, layers, phase, 256, 256),
      ),
    [base, layers, phase],
  );

  return (
    <div
      className={className}
      style={{ width: '100%', height: '100%', background: 'transparent' }}
    >
      <svg
        viewBox="0 0 512 512"
        width="100%"
        height="100%"
        xmlns="http://www.w3.org/2000/svg"
        style={{ display: 'block', overflow: 'visible' }}
      >
        {paths.map((d, i) => (
          <path
            key={i}
            d={d}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ))}
      </svg>
    </div>
  );
}