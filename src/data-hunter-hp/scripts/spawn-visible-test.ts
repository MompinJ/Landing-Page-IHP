/**
 * ¿Se ve nacer a los barcos? (dársena cerrada)
 *
 * Para cada embarcación fuera de la línea del dique comprueba si su línea de
 * visión hacia la cámara está TAPADA por la masa del muelle. La cámara mira
 * 43.7° por encima de la horizontal, así que un barco a x = -19 necesita masa
 * opaca a x ≈ -18.2 y hasta y ≈ 3.9 en la fila contigua.
 *
 * Es geometría pura: no depende de la resolución de pantalla.
 *
 *   npx tsx scripts/spawn-visible-test.ts
 */
import { BALANCE, colX } from '../src/data/balance';
import { useGameStore } from '../src/store/useGameStore';
import { generateRows, rows, zoneOf } from '../src/world/rows';

useGameStore.getState().startGame();
while (rows.length < 80) generateRows(BALANCE.ROWS_BATCH);

// Eje de cámara del juego (CameraRig): offset (5.2, 9.2, 6.4) mirando a (0,0.4,-1.2)
const dir = [-5.2, -8.8, -7.6];
const len = Math.hypot(...dir);
const toCam = dir.map((n) => -n / len); // del mundo hacia la cámara

const HARBOUR_X = colX(BALANCE.MAX_TILE + BALANCE.WRAP_MARGIN);
const TERMINAL_INNER_MOLE = HARBOUR_X - 0.2; // morros de la propia fila de agua
const TERMINAL_INNER_WALL = 9.5; // tramos macizos de las filas vecinas
const TERMINAL_OUTER = 21;
const TERMINAL_H = 4.4;
/** Distancia en Z a la que está cada masa opaca desde la fila del barco */
const OCLUSORES: { z: number; inner: number }[] = [
  { z: 0.885, inner: TERMINAL_INNER_MOLE }, // morro de su propia fila
  { z: BALANCE.TILE, inner: TERMINAL_INNER_WALL }, // muelle de la fila contigua
];

/** Altura máxima del modelo por tipo (ver models.tsx) */
const ALTO: Record<string, number> = { ship: 2.66, tug: 0.9, sail: 3.4, yacht: 1.3, fish: 2.2 };

let expuestos = 0;
const ejemplos: string[] = [];

for (const row of rows) {
  if (zoneOf(row.index) !== 'cruise' || row.type !== 'water') continue;
  for (const v of row.vehicles) {
    const half = ((v.visualTiles ?? v.tiles) * BALANCE.TILE) / 2;
    const alto = ALTO[v.kind] ?? 1;
    // Se recorre el barco de proa a popa en el momento de reaparecer
    for (const s of [1, -1] as const) {
      const centro = s * (colX(BALANCE.MAX_TILE + BALANCE.WRAP_MARGIN) + half);
      for (let f = -1; f <= 1; f += 0.1) {
        const x = centro + f * half;
        if (Math.abs(x) <= TERMINAL_INNER_MOLE) continue; // ya está dentro de la dársena
        // Punto más alto del casco en esa X, y su rayo hacia la cámara
        for (const y0 of [0, alto]) {
          // Basta con que UNA de las masas del muelle corte la línea de visión
          const tapado = OCLUSORES.some((o) => {
            const t = o.z / toCam[2];
            const xh = x + toCam[0] * t;
            const yh = y0 + toCam[1] * t;
            return Math.abs(xh) >= o.inner && Math.abs(xh) <= TERMINAL_OUTER && yh <= TERMINAL_H;
          });
          if (!tapado) {
            const t = BALANCE.TILE / toCam[2];
            const xh = x + toCam[0] * t;
            const yh = y0 + toCam[1] * t;
            expuestos++;
            if (ejemplos.length < 4) {
              ejemplos.push(
                `fila ${row.index} ${v.kind} en x=${x.toFixed(1)} → necesita masa en x=${xh.toFixed(1)}, y=${yh.toFixed(1)}`,
              );
            }
          }
        }
      }
    }
  }
}

console.log(`dique: muelle desde |x|=${TERMINAL_INNER_WALL}, morros desde |x|=${TERMINAL_INNER_MOLE.toFixed(2)}, hasta ${TERMINAL_OUTER} · altura ${TERMINAL_H}`);
console.log(`puntos de casco visibles fuera de la dársena: ${expuestos}`);
for (const e of ejemplos) console.log('  ' + e);

if (expuestos > 0) {
  console.error('FALLO: parte del barco se vería aparecer fuera del dique');
  process.exit(1);
}
console.log('OK: ninguna embarcación es visible fuera de la dársena');
