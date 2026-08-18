import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { useGameStore } from '../store/useGameStore';

/**
 * MODO ATRACCION (kiosco): tras 30 s sin input en el menu, la camara deja la
 * vista fija y vuela en una orbita suave (easing senoidal tipo Bezier) sobre
 * las terminales; cualquier tecla/click/gamepad la devuelve al menu activo.
 */
const IDLE_SECONDS = 30;
export const attractState = { active: false, lastInput: 0 };

export function AttractMode() {
  const camera = useThree((s) => s.camera);
  const t = useRef(0);
  const look = useRef(new THREE.Vector3());

  useEffect(() => {
    attractState.lastInput = performance.now();
    const wake = () => {
      attractState.lastInput = performance.now();
      attractState.active = false;
    };
    window.addEventListener('keydown', wake);
    window.addEventListener('pointerdown', wake);
    return () => {
      window.removeEventListener('keydown', wake);
      window.removeEventListener('pointerdown', wake);
    };
  }, []);

  useFrame((_, dt) => {
    const menu = useGameStore.getState().phase === 'menu';
    if (!menu) {
      attractState.active = false;
      return;
    }
    if (!attractState.active && performance.now() - attractState.lastInput > IDLE_SECONDS * 1000) {
      attractState.active = true;
      t.current = 0;
    }
    if (!attractState.active) return;

    // Vuelo: orbita amplia con altura ondulante (curvas suaves)
    t.current += dt * 0.14;
    const a = t.current;
    const r = 16 + Math.sin(a * 0.7) * 5;
    camera.position.set(Math.cos(a) * r, 7 + Math.sin(a * 1.3) * 3.5, Math.sin(a) * r - 12);
    look.current.set(Math.cos(a + 1.2) * 4, 0.5, Math.sin(a + 1.2) * 4 - 14);
    camera.lookAt(look.current);
  });

  return null;
}
