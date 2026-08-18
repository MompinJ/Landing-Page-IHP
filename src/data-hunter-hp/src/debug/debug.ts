/**
 * Herramientas de DEPURACIÓN — desactivadas por defecto.
 *
 * Se habilitan con `?debug` en la URL (mismo flag que ya usa el panel Leva de
 * App.tsx). Con el flag activo:
 *
 *   H  → dibuja las hitboxes reales (las que evalúa `traffic.ts`) sobre el mundo
 *   C  → cámara libre: órbita alrededor del jugador para inspeccionar modelos
 *   + / -        → zoom de la cámara libre (acercar/alejar al máximo)
 *   [ / ]        → giro de la órbita   ,  ; / '  → altura de la órbita
 *
 * Nada de esto se monta ni se evalúa si `debug.enabled` es false, así que el
 * coste en producción/kiosco es cero (una comparación booleana por frame).
 */
import { runtime } from '../store/runtime';
import { useGameStore } from '../store/useGameStore';
import { extendRowsIfNeeded, rows } from '../world/rows';

export const debug = {
  /** ?debug en la URL */
  enabled: false,
  /** Dibujar hitboxes (tecla H) */
  hitboxes: false,
  /** Cámara libre orbital (tecla C) */
  freeCam: false,
  /** Zoom de la cámara libre (la de juego es fija en 58) */
  zoom: 58,
  /** Ángulo de órbita y altura de la cámara libre */
  yaw: Math.PI * 0.25,
  height: 9.2,

  /** Contadores para los tests automatizados (1 input = 1 paso) */
  stats: { queued: 0, rejected: 0, steps: 0 },
};

/** Inicializa el flag y los atajos. Idempotente. */
export function initDebug() {
  if (typeof window === 'undefined') return;
  debug.enabled = window.location.search.includes('debug');

  // El handle siempre existe: los tests de Playwright lo usan para leer
  // contadores y posiciones sin depender de la UI.
  (window as unknown as { __DH: unknown }).__DH = {
    debug,
    runtime,
    rows,
    store: useGameStore,
    /** Teletransporte instantáneo usado por los scripts de captura */
    teleport(row: number, col: number) {
      extendRowsIfNeeded(row + 20);
      runtime.row = row;
      runtime.col = col;
      // La fila máxima se REESCRIBE (no se acumula): tras un teletransporte
      // hacia atrás, dejar el máximo antiguo pondría al colaborador fuera de
      // la correa de retroceso y la gaviota bajaría a por él (world/snatch.ts).
      runtime.maxRow = row;
      runtime.stepping = false;
      runtime.moveQueue.length = 0;
      useGameStore.getState().setCurrentRow(row);
    },
  };

  if (!debug.enabled) return;
  window.addEventListener('keydown', (e) => {
    if (e.repeat) return;
    switch (e.code) {
      case 'KeyH': debug.hitboxes = !debug.hitboxes; break;
      case 'KeyC': debug.freeCam = !debug.freeCam; break;
      case 'Equal': case 'NumpadAdd': debug.zoom = Math.min(400, debug.zoom * 1.25); break;
      case 'Minus': case 'NumpadSubtract': debug.zoom = Math.max(12, debug.zoom / 1.25); break;
      case 'BracketLeft': debug.yaw -= Math.PI / 12; break;
      case 'BracketRight': debug.yaw += Math.PI / 12; break;
      case 'Semicolon': debug.height = Math.max(0.5, debug.height - 0.8); break;
      case 'Quote': debug.height = Math.min(20, debug.height + 0.8); break;
    }
  });
}
