import { runtime, type MoveDirection } from '../store/runtime';
import { queueMove } from './playerLogic';

/**
 * ÁRBITRO DE INPUT — garantiza 1 pulsación = 1 paso.
 *
 * El filtro `event.repeat` solo cubre la auto-repetición del navegador. En el
 * stand hay más caminos por los que una misma acción física llega dos veces:
 *
 *  - Teclado y mando activos a la vez (los encoders arcade de doble modo
 *    presentan el mismo joystick como HID gamepad Y como teclado): una sola
 *    empujada emitía `keydown ArrowUp` y `button[12]` → dos `queueMove`.
 *  - El botón A del mando también avanza, así que mantener el stick arriba y
 *    pulsar A disparaba dos pasos.
 *  - Teclados/encoders que reemiten `keydown` con `repeat=false`.
 *
 * La solución no es parchear cada fuente por separado sino centralizar el
 * estado de "mantenido" POR DIRECCIÓN: el paso se encola solo en el flanco
 * 0 → pulsado, y hasta que TODAS las fuentes sueltan esa dirección no se acepta
 * otro. Cada fuente aporta un bit, así que soltar el mando no desbloquea una
 * tecla que sigue pulsada (ni al revés).
 */
export const SOURCE = { KEYBOARD: 1, GAMEPAD: 2 } as const;
export type InputSource = (typeof SOURCE)[keyof typeof SOURCE];

const held: Record<MoveDirection, number> = { forward: 0, backward: 0, left: 0, right: 0 };

/** Flanco de pulsación. Encola un paso solo si la dirección estaba libre. */
export function pressMove(direction: MoveDirection, source: InputSource) {
  const before = held[direction];
  held[direction] = before | source;
  if (before !== 0) return; // ya la mantenía otra fuente (o la misma): sin repetición
  queueMove(direction);
}

/** Flanco de soltado: hasta que no se suelta, `pressMove` no vuelve a disparar */
export function releaseMove(direction: MoveDirection, source: InputSource) {
  held[direction] &= ~source;
}

/** Suelta todo. Al perder el foco de la ventana no llegan los `keyup`, y sin
 *  esto la dirección quedaría "pegada" para siempre. */
export function releaseAll() {
  held.forward = held.backward = held.left = held.right = 0;
}

// Cada partida nueva arranca sin direcciones pegadas
runtime.resetCallbacks.push(releaseAll);
