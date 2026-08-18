/**
 * Test de SEPARACIÓN entre embarcaciones/vehículos de una misma fila.
 *
 * El motivo del "parece que están chocando": cada vehículo hacía su propio
 * wrap con su propio largo, así que dos barcazas de 3 y 4 casillas recorrían
 * ciclos distintos y su separación derivaba vuelta a vuelta hasta solaparse.
 * Aquí se simulan minutos de tráfico y se comprueba que dos modelos de la misma
 * fila NUNCA llegan a superponerse.
 *
 *   npx tsx scripts/spacing-test.ts
 */
import { BALANCE } from '../src/data/balance';
import { useGameStore } from '../src/store/useGameStore';
import { rows } from '../src/world/rows';
import { rowWrapBounds, updateTraffic } from '../src/world/traffic';
import { runtime } from '../src/store/runtime';

useGameStore.getState().startGame();

// Mapa largo para cubrir los 4 biomas (agua, carretera, vía)
while (rows.length < 120) {
  runtime.row = rows.length - 12;
  useGameStore.getState().advanceRow(runtime.row);
  const { extendRowsIfNeeded } = await import('../src/world/rows');
  extendRowsIfNeeded(rows.length - 5);
}

/** Media longitud DIBUJADA (el crucero dibuja más de lo que es abordable) */
const visualHalf = (v: { tiles: number; visualTiles?: number }) =>
  ((v.visualTiles ?? v.tiles) * BALANCE.TILE) / 2;

const DT = 1 / 60;
const MINUTES = 4;
let worstOverlap = 0;
let worstRow = -1;
let worstPair = '';
let samples = 0;

// El jugador se mantiene al fondo para que updateTraffic recorra todo el mapa
runtime.row = 60;

for (let f = 0; f < MINUTES * 60 * 60; f++) {
  updateTraffic(DT);
  if (f % 10 !== 0) continue;
  for (const row of rows) {
    if (row.vehicles.length < 2) continue;
    samples++;
    for (let i = 0; i < row.vehicles.length; i++) {
      for (let j = i + 1; j < row.vehicles.length; j++) {
        const a = row.vehicles[i];
        const b = row.vehicles[j];
        // Solape = cuánto se meten los modelos uno dentro del otro
        const overlap = visualHalf(a) + visualHalf(b) - Math.abs(a.x - b.x);
        if (overlap > worstOverlap) {
          worstOverlap = overlap;
          worstRow = row.index;
          worstPair = `${a.kind}(${a.tiles}) vs ${b.kind}(${b.tiles})`;
        }
      }
    }
  }
}

console.log(`simulados ${MINUTES} min de tráfico sobre ${rows.length} filas (${samples} muestras de fila)`);
console.log(`solape máximo entre dos modelos de la misma fila: ${worstOverlap.toFixed(2)} u`);
if (worstOverlap > 0) console.log(`  peor caso: fila ${worstRow} — ${worstPair}`);

/*
 * AGUA LIBRE. Que no se solapen no basta: dos cascos separados por 30 cm se ven
 * como un choque a punto de pasar. La marina tiene que respirar, así que se
 * exige `BOAT_MIN_GAP` de agua entre cascos consecutivos de la misma fila.
 */
let peorHueco = Infinity;
let peorHuecoFila = -1;
for (const row of rows) {
  if (row.type !== 'water' || row.vehicles.length < 2) continue;
  const { minX, maxX } = rowWrapBounds(row);
  const cycle = maxX - minX;
  const pos = row.vehicles.map((v) => ({ x: v.x, l: visualHalf(v) * 2 })).sort((a, b) => a.x - b.x);
  for (let i = 0; i < pos.length; i++) {
    const a = pos[i];
    const b = pos[(i + 1) % pos.length];
    const dx = i === pos.length - 1 ? b.x + cycle - a.x : b.x - a.x;
    const hueco = dx - a.l / 2 - b.l / 2;
    if (hueco < peorHueco) {
      peorHueco = hueco;
      peorHuecoFila = row.index;
    }
  }
}
console.log(`agua libre mínima entre cascos de la misma fila: ${peorHueco.toFixed(2)} u (fila ${peorHuecoFila})`);

/*
 * Y ENTRE FILAS: el casco no puede ser más ancho que el fondo de la fila, o los
 * barcos de dos filas de agua contiguas se pisan. El crucero (manga 1.8) sí lo
 * es, y por eso solo navega en filas de agua aisladas — se comprueba aquí.
 */
const canal = BALANCE.TILE - BALANCE.BOAT_BEAM;
let cruceroPegado = 0;
for (const row of rows) {
  if (row.type !== 'water' || !row.vehicles.some((v) => v.kind === 'ship')) continue;
  for (const vecino of [rows[row.index - 1], rows[row.index + 1]]) {
    if (vecino?.type === 'water') cruceroPegado++;
  }
}
console.log(`canal de agua entre filas: ${canal.toFixed(2)} u · cruceros con fila de agua pegada: ${cruceroPegado}`);

const fallos: string[] = [];
if (worstOverlap > 0) fallos.push('hay vehículos de la misma fila superponiéndose');
if (peorHueco < BALANCE.BOAT_MIN_GAP) {
  fallos.push(`agua libre ${peorHueco.toFixed(2)} < ${BALANCE.BOAT_MIN_GAP} exigida (fila ${peorHuecoFila})`);
}
if (canal <= 0) fallos.push(`el casco (${BALANCE.BOAT_BEAM}) no cabe en el fondo de fila (${BALANCE.TILE})`);
if (cruceroPegado > 0) fallos.push(`${cruceroPegado} cruceros con otra fila de agua pegada: su manga invade el canal vecino`);

if (fallos.length) {
  console.error('FALLOS:\n - ' + fallos.join('\n - '));
  process.exit(1);
}
console.log('OK: sin solapes, con agua libre de sobra y sin cruceros pegados a otra fila de agua');
