import { useEffect } from 'react';
import type { MoveDirection } from '../store/runtime';
import { useGameStore } from '../store/useGameStore';
import { pressMove, releaseAll, releaseMove, SOURCE } from '../world/input';

/**
 * Controles Crossy Road: flechas/WASD saltan una casilla en las 4 direcciones
 * (Espacio = adelante, como el tap del original).
 *
 * Estrictamente 1 pulsación = 1 paso: el paso se encola en el `keydown` y no se
 * acepta otro de esa dirección hasta el `keyup` correspondiente (ver
 * `world/input.ts`, que además arbitra con el mando). El filtro `e.repeat`
 * se mantiene como primera barrera contra la auto-repetición del navegador.
 */
/** 'backward' SÍ mueve: se puede recular unas pocas filas (BACK_STEPS_MAX).
 *  Pasarse de ahí no es un salto descartado — baja la gaviota y se te lleva
 *  (ver `world/snatch.ts`). */
const KEY_MAP: Record<string, MoveDirection> = {
  ArrowUp: 'forward',
  KeyW: 'forward',
  Space: 'forward',
  ArrowDown: 'backward',
  KeyS: 'backward',
  ArrowLeft: 'left',
  KeyA: 'left',
  ArrowRight: 'right',
  KeyD: 'right',
};

/**
 * ¿El foco está en un campo de texto? Entonces las teclas son ESCRITURA, no
 * controles: sin esto, el `preventDefault` de abajo se comía las W, A, S, D y
 * los espacios del nombre en la pantalla final (escribir "DAVID" dejaba "VI").
 */
function escribiendo(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  if (!el || !el.tagName) return false;
  return (
    el.tagName === 'INPUT' ||
    el.tagName === 'TEXTAREA' ||
    el.tagName === 'SELECT' ||
    el.isContentEditable
  );
}

export function useKeyboardControls() {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const direction = KEY_MAP[e.code];
      if (!direction) return;
      if (escribiendo(e.target)) return;
      e.preventDefault();
      if (e.repeat) return; // auto-repetición del navegador
      if (useGameStore.getState().phase !== 'playing') return;
      pressMove(direction, SOURCE.KEYBOARD);
    };

    // El `keyup` SIEMPRE se procesa, aunque la partida ya no esté en curso:
    // si no, una tecla pulsada al morir quedaría marcada como mantenida.
    const onKeyUp = (e: KeyboardEvent) => {
      const direction = KEY_MAP[e.code];
      // Se suelta aunque venga de un campo de texto: soltar de más es
      // inofensivo, quedarse una tecla marcada como mantenida no lo es.
      if (direction) releaseMove(direction, SOURCE.KEYBOARD);
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    // Al perder el foco no llegan los `keyup` → se sueltan todas las teclas
    window.addEventListener('blur', releaseAll);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', releaseAll);
      releaseAll();
    };
  }, []);
}
