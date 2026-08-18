import { useFrame, useThree } from '@react-three/fiber';
import { useRef } from 'react';
import * as THREE from 'three';
import { runtime } from '../store/runtime';
import { zoneOf, type ZoneTheme } from '../world/rows';

/**
 * FASE 2 — Atmósfera dinámica por bioma: el color de cielo/niebla se
 * interpola suavemente al cruzar de terminal (transición climática, sin
 * saltos). Paletas nocturno-industriales coherentes con la identidad.
 */
const SKY: Record<ZoneTheme, string> = {
  port: '#0a2740', // noche portuaria azul
  multi: '#123049', // muelle de carga general, sodio y polvo de granel
  cruise: '#0d3a52', // crepúsculo marino teal
  shipyard: '#2a2030', // taller nocturno violáceo-cálido
  rail: '#1c2433', // acero nocturno
};

export function Atmosphere() {
  const scene = useThree((s) => s.scene);
  const target = useRef(new THREE.Color(SKY.port));

  useFrame((_, dt) => {
    target.current.set(SKY[zoneOf(Math.max(0, runtime.row))]);
    const k = Math.min(1, dt * 0.8); // transición de ~1.5 s
    if (scene.background instanceof THREE.Color) scene.background.lerp(target.current, k);
    if (scene.fog) scene.fog.color.lerp(target.current, k);
  });

  return null;
}
