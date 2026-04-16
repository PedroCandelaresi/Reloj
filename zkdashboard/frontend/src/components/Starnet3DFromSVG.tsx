'use client';

import React, { useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

type StarnetRib3DProps = {
  className?: string;
  autoRotate?: boolean;
  speed?: number;
  ribs?: number;
  ribRadius?: number;
};

type Pt2 = { x: number; y: number };

function roundedSquarePoints(size = 2.8, radius = 0.18, segments = 18): Pt2[] {
  const pts: Pt2[] = [];
  const h = size / 2;
  const s = h - radius;

  const line = (x1: number, y1: number, x2: number, y2: number) => {
    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      pts.push({
        x: x1 + (x2 - x1) * t,
        y: y1 + (y2 - y1) * t,
      });
    }
  };

  const arc = (cx: number, cy: number, a1: number, a2: number) => {
    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const a = a1 + (a2 - a1) * t;
      pts.push({
        x: cx + Math.cos(a) * radius,
        y: cy + Math.sin(a) * radius,
      });
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

function buildRibCurve(base: Pt2[], i: number, total: number) {
  const t = total <= 1 ? 0 : i / (total - 1);
  const e = Math.pow(t, 0.9);

  // giro global del conjunto
  const globalAngle = Math.PI / 4 + e * (Math.PI / 1.5);

  const pts = base.map((p) => {
    const theta = Math.atan2(p.y, p.x);
    const r = Math.hypot(p.x, p.y);

    // 4 lóbulos / aspas base
    const blade = Math.cos(4 * theta);

    // esta es la curvatura lateral que habías ajustado y funciona bien
    const radialWarp = 1 - 0.03 * blade + 0.06 * e * blade;

    // máscara para que el giro “sobre sí mismo” se note más sobre los lados
    const sideMask = Math.pow(Math.abs(Math.cos(2 * theta)), 1.15);

    // giro de la propia curva sobre sí misma:
    // más fuerte hacia el final y concentrado en los lados
    const selfTwist =
      (0.1 + e * 0.8 + e * e * 0.42) *
      Math.sin(4 * theta) *
      (0.28 + 0.72 * sideMask);

    // micro torsión para ayudar a “trenzar” el centro
    const microTwist =
      (0.008 + e * 0.03) * Math.sin(8 * theta + e * 1.35);

    // compresión moderada
    const shrink = 1 - e * 0.62;

    // empuje al centro:
    // no uniforme, así mantiene 4 aspas y permite que el centro se arme
    const centerPull =
      (0.08 + e * 0.24 + e * e * 0.28) *
      (0.7 + 0.18 * blade);

    // permitir pasar levemente al otro lado del centro
    // para que se cruce y no quede un agujero
    let rr = r * shrink * radialWarp - centerPull;
    rr = Math.max(rr, -0.03);

    const localAngle = theta + selfTwist + microTwist;

    let x = Math.cos(localAngle) * rr;
    let y = Math.sin(localAngle) * rr;

    // rotación global del “layer”
    const cg = Math.cos(globalAngle);
    const sg = Math.sin(globalAngle);
    const gx = x * cg - y * sg;
    const gy = x * sg + y * cg;

    // profundidad / extrusión
    const zBase = (t - 0.5) * 0.82;

    // pequeña ondulación espacial para evitar que quede completamente plano
    const zWave =
      Math.sin(4 * theta + e * 0.5) *
      0.1 *
      (0.18 + e * 0.82);

    return new THREE.Vector3(gx, gy, zBase + zWave);
  });

  pts.push(pts[0].clone());

  return new THREE.CatmullRomCurve3(pts, true, 'catmullrom', 0.5);
}

function LogoMesh({
  autoRotate = true,
  speed = 1,
  ribs = 42,
  ribRadius = 0.028,
}: {
  autoRotate?: boolean;
  speed?: number;
  ribs?: number;
  ribRadius?: number;
}) {
  const groupRef = useRef<THREE.Group>(null);

  const base = useMemo(() => roundedSquarePoints(2.9, 0.18, 18), []);
  const curves = useMemo(
    () => Array.from({ length: ribs }, (_, i) => buildRibCurve(base, i, ribs)),
    [base, ribs],
  );

  const material = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        color: new THREE.Color('#b9b9b9'),
        metalness: 1.9,
        roughness: 0.27,
        clearcoat: 0.55,
        clearcoatRoughness: 0.18,
        reflectivity: 0.5,
      }),
    [],
  );

  useFrame((state, delta) => {
    if (!groupRef.current || !autoRotate) return;

    groupRef.current.rotation.y += delta * 0.42 * speed;
    groupRef.current.rotation.x = -0.2 + Math.sin(state.clock.elapsedTime * 0.65) * 0.05;
    groupRef.current.rotation.z = Math.cos(state.clock.elapsedTime * 0.35) * 0.04;
  });

  return (
    <group ref={groupRef} scale={0.82}>
      {curves.map((curve, idx) => {
        const geometry = new THREE.TubeGeometry(curve, 240, ribRadius, 10, true);
        return <mesh key={idx} geometry={geometry} material={material} />;
      })}
    </group>
  );
}

export default function StarnetRib3D({
  className,
  autoRotate = true,
  speed = 1,
  ribs = 42,
  ribRadius = 0.028,
}: StarnetRib3DProps) {
  return (
    <div
      className={className}
      style={{
        width: '100%',
        height: '100%',
        background: 'transparent',
      }}
    >
      <Canvas
        camera={{ position: [0, 0, 6.6], fov: 32 }}
        gl={{ antialias: true, alpha: true }}
        style={{ background: 'transparent' }}
      >
        <ambientLight intensity={1} />

        {/* luz principal superior-derecha */}
        <directionalLight position={[5, 6, 6]} intensity={3} color="#ffffff" />

        {/* relleno lateral */}
        <directionalLight position={[-3, 1, 2]} intensity={1.55} color="#108d25" />

        {/* leve contraluz */}
        <directionalLight position={[0, -4, -3]} intensity={0.24} color="#043608" />

        <LogoMesh
          autoRotate={autoRotate}
          speed={speed}
          ribs={ribs}
          ribRadius={ribRadius}
        />
      </Canvas>
    </div>
  );
}