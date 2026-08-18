/**
 * ¿Se ve el océano donde debería haber mapa?
 *
 * La cámara es ortográfica con ZOOM FIJO: cuanto mayor es la ventana, más mundo
 * entra en cuadro. Este test comprueba, para varias resoluciones, que
 *   1. la ventana de render cubre lo que la cámara alcanza a ver, y
 *   2. el generador va siempre por delante de esa ventana, incluso al arrancar.
 *
 *   npx tsx scripts/viewport-test.ts
 */
import { BALANCE, CAM_ZOOM, viewRowsFor } from '../src/data/balance';
import { runtime } from '../src/store/runtime';
import { useGameStore } from '../src/store/useGameStore';
import { extendRowsIfNeeded, rows, setLookahead } from '../src/world/rows';

/** Filas de suelo que la cámara ve en cada dirección (esquinas de la caja) */
function filasVisibles(w: number, h: number) {
  const camOff = [5.2, 9.2, 6.4];
  const look = [0, 0.4, -1.2];
  const d = [look[0] - camOff[0], look[1] - camOff[1], look[2] - camOff[2]];
  const L = Math.hypot(...d);
  const v = d.map((n) => n / L);
  const r0 = [-v[2], 0, v[0]];
  const rl = Math.hypot(r0[0], r0[2]);
  const R = [r0[0] / rl, 0, r0[2] / rl];
  const dot = v[1];
  let U = [-dot * v[0], 1 - dot * v[1], -dot * v[2]];
  const ul = Math.hypot(...U);
  U = U.map((n) => n / ul);
  const halfW = w / CAM_ZOOM / 2;
  const halfH = h / CAM_ZOOM / 2;
  let ade = -Infinity;
  let atr = -Infinity;
  for (const sw of [-halfW, halfW]) {
    for (const sh of [-halfH, halfH]) {
      const t = -(look[1] + sh * U[1]) / v[1];
      const z = look[2] + sw * R[2] + sh * U[2] + t * v[2];
      ade = Math.max(ade, -z);
      atr = Math.max(atr, z);
    }
  }
  return { ade: ade / BALANCE.TILE, atr: atr / BALANCE.TILE };
}

const RESOLUCIONES: [number, number][] = [
  [1280, 800], [1600, 900], [1920, 1080], [2000, 1500], [2560, 1440], [3840, 2160],
];

const tabla: any[] = [];
const fallos: string[] = [];

for (const [w, h] of RESOLUCIONES) {
  const ve = filasVisibles(w, h);
  const view = viewRowsFor(w, h);

  // Partida nueva a esta resolución
  setLookahead(view.ahead);
  useGameStore.getState().startGame();
  setLookahead(view.ahead);
  const alArrancar = rows.length;

  // Se recorren 120 filas comprobando que el mapa siempre llega más lejos que
  // la ventana de render
  let peorMargen = Infinity;
  for (let r = 0; r < 120; r++) {
    runtime.row = r;
    extendRowsIfNeeded(r);
    peorMargen = Math.min(peorMargen, rows.length - 1 - (r + view.ahead));
  }

  const cubreAde = view.ahead >= Math.ceil(ve.ade);
  const cubreAtr = view.behind >= Math.ceil(ve.atr);
  if (!cubreAde) fallos.push(`${w}x${h}: la ventana dibuja ${view.ahead} filas adelante y la cámara ve ${ve.ade.toFixed(1)}`);
  if (!cubreAtr) fallos.push(`${w}x${h}: la ventana dibuja ${view.behind} filas atrás y la cámara ve ${ve.atr.toFixed(1)}`);
  if (peorMargen < 0) fallos.push(`${w}x${h}: el mapa generado se queda corto (margen ${peorMargen})`);
  if (alArrancar < view.ahead + 1) fallos.push(`${w}x${h}: al arrancar solo hay ${alArrancar} filas y se ven ${view.ahead}`);

  tabla.push({
    resolución: `${w}x${h}`,
    've adelante': +ve.ade.toFixed(1),
    'dibuja adelante': view.ahead,
    've atrás': +ve.atr.toFixed(1),
    'dibuja atrás': view.behind,
    'filas al arrancar': alArrancar,
    'margen generación': peorMargen,
  });
}

console.table(tabla);
if (fallos.length) {
  console.error('FALLOS:\n - ' + fallos.join('\n - '));
  process.exit(1);
}
console.log('OK: la ventana cubre lo que ve la cámara y el mapa va por delante en todas las resoluciones');
