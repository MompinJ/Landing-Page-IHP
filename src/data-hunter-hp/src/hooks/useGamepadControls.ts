import { useEffect, useRef } from 'react';
import { unlockAudio } from '../audio/sfx';
import type { MoveDirection } from '../store/runtime';
import { useGameStore } from '../store/useGameStore';
import { pressMove, releaseMove, SOURCE } from '../world/input';

/**
 * Web Gamepad API (estándar W3C — Chrome/Edge/Firefox/Safari en cualquier OS,
 * mapeo "standard" que cubre Xbox, PlayStation y genéricos):
 *
 *  - Menú:      A o Start → iniciar misión
 *  - Jugando:   D-Pad / stick izquierdo para saltar (edge-triggered), A → avanzar
 *  - Game over: A → jugar de nuevo, B → volver al menú (con guardia de 1 s
 *               para no reiniciar por un botón que venía presionado del gameplay)
 *
 * Vibración de 200 ms en cada golpe (actuador del mando + fallback
 * navigator.vibrate). Se sondea por rAF: la Gamepad API no emite eventos de
 * botones, solo snapshots.
 */

const MOVE_DIRECTIONS: MoveDirection[] = ['forward', 'backward', 'left', 'right'];

/** Primer gamepad conectado en cualquier slot (algunos navegadores dejan huecos null) */
function activeGamepad(): Gamepad | null {
  for (const gp of navigator.getGamepads?.() ?? []) {
    if (gp?.connected) return gp;
  }
  return null;
}

export function useGamepadControls() {
  const prev = useRef({ up: false, down: false, left: false, right: false, a: false, b: false, start: false });
  const gameoverAt = useRef(0);

  useEffect(() => {
    let raf = 0;
    const poll = () => {
      raf = requestAnimationFrame(poll);
      const gp = activeGamepad();
      if (!gp) return;

      const ax = gp.axes[0] ?? 0;
      const ay = gp.axes[1] ?? 0;
      const cur = {
        up: (gp.buttons[12]?.pressed ?? false) || ay < -0.6,
        down: (gp.buttons[13]?.pressed ?? false) || ay > 0.6,
        left: (gp.buttons[14]?.pressed ?? false) || ax < -0.6,
        right: (gp.buttons[15]?.pressed ?? false) || ax > 0.6,
        a: gp.buttons[0]?.pressed ?? false,
        b: gp.buttons[1]?.pressed ?? false,
        start: gp.buttons[9]?.pressed ?? false,
      };
      const pressed = (k: keyof typeof cur) => cur[k] && !prev.current[k];
      const store = useGameStore.getState();

      switch (store.phase) {
        case 'playing': {
          // Se consolida el estado POR DIRECCIÓN antes de avisar al árbitro:
          // D-Pad, stick y botón A comparten 'forward', así que soltar uno
          // mientras se mantiene otro no debe contar como pulsación nueva.
          const dir: Record<MoveDirection, boolean> = {
            forward: cur.up || cur.a,
            backward: cur.down,
            left: cur.left,
            right: cur.right,
          };
          // El árbitro de `world/input.ts` cierra el paso hasta que se suelta,
          // así que el mando tampoco puede duplicar un salto ya dado por el
          // teclado (encoders arcade que emiten ambos a la vez).
          for (const d of MOVE_DIRECTIONS) {
            if (dir[d]) pressMove(d, SOURCE.GAMEPAD);
            else releaseMove(d, SOURCE.GAMEPAD);
          }
          break;
        }
        // Portada: A/Start NO arranca la partida — abre el briefing. En el
        // stand, el que acaba le pasa el mando al siguiente, y ese siguiente
        // tiene que pasar por las instrucciones y no caer de golpe dentro de
        // un juego que no ha visto.
        case 'menu':
          if (pressed('a') || pressed('start')) {
            unlockAudio();
            store.openBriefing();
          }
          break;
        // Briefing: A/Start entra a jugar, B vuelve a la portada sin tener que
        // apuntar a un botón con el stick.
        case 'briefing':
          if (pressed('a') || pressed('start')) {
            unlockAudio();
            store.startGame();
          } else if (pressed('b')) {
            store.backToMenu();
          }
          break;
        case 'gameover':
          // Guardia: ignora pulsaciones el primer segundo tras morir para que
          // el machaqueo del gameplay no salte la pantalla de resultados
          if (performance.now() - gameoverAt.current > 1000) {
            if (pressed('a') || pressed('start')) {
              unlockAudio();
              store.startGame();
            } else if (pressed('b')) {
              store.backToMenu();
            }
          }
          break;
      }
      prev.current = cur;
    };
    poll();

    // Marca el instante de entrada a gameover (para la guardia anti-machaqueo)
    const unsubPhase = useGameStore.subscribe(
      (s) => s.phase,
      (phase) => {
        if (phase === 'gameover') gameoverAt.current = performance.now();
      },
    );

    // Vibracion en golpes (200 ms)
    const unsubEvent = useGameStore.subscribe(
      (s) => s.lastEvent,
      (e) => {
        if (!e || e.type === 'good') return;
        navigator.vibrate?.(200);
        const gp = activeGamepad() as
          | (Gamepad & { vibrationActuator?: { playEffect: (t: string, p: object) => void } })
          | null;
        gp?.vibrationActuator?.playEffect('dual-rumble', { duration: 200, strongMagnitude: 0.8, weakMagnitude: 0.4 });
      },
    );
    return () => {
      cancelAnimationFrame(raf);
      unsubPhase();
      unsubEvent();
    };
  }, []);
}
