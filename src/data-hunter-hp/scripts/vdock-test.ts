/**
 * Verificación de los DIQUES VERTICALES del astillero:
 *  - cada cabeza (len) va seguida de exactamente len-1 continuaciones idénticas
 *  - la cadena de andamios queda ALINEADA (mismo bridge en todas las filas)
 *  - el bridge está en un BORDE de la banda y dentro de ella
 *  - nunca pisan el dique mayor ni sus filas vecinas, ni la frontera de bioma
 *  - NUNCA SE SUPERPONEN: entre dos diques quedan VDOCK_MIN_GAP filas de patio
 *  - el buque cabe DENTRO del foso también a lo largo (la roda no asoma)
 */
import { BALANCE, colX } from '../src/data/balance';
import { generateRows, resetRows, rows, zoneOf } from '../src/world/rows';

/**
 * ENCAJE DEL BUQUE en el foso — replica el cálculo de `VerticalDock` (models).
 * Son constantes acopladas entre `balance.ts` (anchos de dique) y el modelo: si
 * alguien ensancha el buque o estrecha el foso, el casco se saldría de los
 * muros o se comería la casilla de la pasarela, y el jugador cruzaría por
 * dentro del barco. Comprobarlo aquí es lo que impide que pase en silencio.
 */
function encajeBuque(widthCols: number, bridgeCol: number, col: number) {
  const centerX = colX(col) + ((widthCols - 1) * BALANCE.TILE) / 2;
  const bridgeX = colX(bridgeCol) - centerX;
  const beam = Math.min((widthCols - 1) * BALANCE.TILE - 0.8, 3.3);
  const vesselX = bridgeX === 0 ? 0 : (bridgeX > 0 ? -1 : 1) * (BALANCE.TILE / 2);
  const andamio = beam / 2 + 0.09 + 0.08; // montante exterior del andamiaje
  return {
    // Extremos ocupados por el buque con su andamiaje, en X local al foso
    min: vesselX - andamio,
    max: vesselX + andamio,
    // Media caja del foso y de la casilla de la pasarela
    fosoHalf: (widthCols * BALANCE.TILE - 0.12) / 2,
    pasarelaMin: bridgeX - BALANCE.TILE / 2,
    pasarelaMax: bridgeX + BALANCE.TILE / 2,
  };
}

/**
 * ENCAJE DEL BUQUE A LO LARGO — replica `vDockShipFit` (models). La roda es una
 * caja girada 45°, así que asoma manga·0.55·√½ POR DELANTE del casco: si la
 * eslora no se despeja de ahí, la proa atraviesa el muro del fondo y se mete en
 * el foso siguiente. Es justo lo que hacía que dos diques se leyeran como uno.
 */
function esloraBuque(lenRows: number, widthCols: number) {
  const d = lenRows * BALANCE.TILE - 0.1;
  const beam = Math.min((widthCols - 1) * BALANCE.TILE - 0.8, 3.3);
  const bow = beam * 0.55 * Math.SQRT1_2;
  const stern = 0.43;
  const L = Math.max(1.6, d - 0.44 - bow - stern);
  const zOff = (stern - bow) / 2;
  return {
    proa: zOff + L / 2 + bow,
    popa: zOff - L / 2 - stern,
    fosoHalf: d / 2,
  };
}

let heads = 0;
let conts = 0;
let errores = 0;
/** Fila en que terminó el dique anterior de la corrida (para el respiro) */
let finAnterior = -Infinity;
const lens: Record<number, number> = {};
const err = (msg: string) => {
  errores++;
  console.error('ERROR:', msg);
};

for (let corrida = 0; corrida < 30; corrida++) {
  resetRows();
  generateRows(400);
  finAnterior = -Infinity;

  for (const row of rows) {
    for (const d of row.docks ?? []) {
      if (d.mega || d.cont) continue;
      // Es una cabeza de dique vertical
      heads++;
      if (!d.len || d.len < 2) err(`fila ${row.index}: cabeza con len inválido (${d.len})`);
      const len = d.len ?? 1;
      lens[len] = (lens[len] ?? 0) + 1;
      if (d.bridge === undefined) err(`fila ${row.index}: dique sin cadena de andamios`);
      else if (d.bridge !== d.col && d.bridge !== d.col + d.tiles - 1) {
        err(`fila ${row.index}: bridge ${d.bridge} no está en un borde de [${d.col}..${d.col + d.tiles - 1}]`);
      }
      for (let k = 1; k < len; k++) {
        const seg = rows[row.index + k]?.docks?.find((s) => s.cont);
        conts++;
        if (!seg) {
          err(`fila ${row.index}: falta continuación en fila ${row.index + k}`);
          continue;
        }
        if (seg.col !== d.col || seg.tiles !== d.tiles || seg.bridge !== d.bridge) {
          err(`fila ${row.index + k}: continuación desalineada (${seg.col}/${seg.tiles}/${seg.bridge} vs ${d.col}/${d.tiles}/${d.bridge})`);
        }
      }
      // SIN SUPERPOSICIÓN: el dique anterior tiene que haber terminado y haber
      // dejado sus filas de patio de por medio
      if (row.index - finAnterior <= BALANCE.VDOCK_MIN_GAP) {
        err(`fila ${row.index}: dique pegado al anterior (terminó en ${finAnterior})`);
      }
      finAnterior = row.index + len - 1;

      if (d.ship) {
        const e = esloraBuque(len, d.tiles);
        if (e.proa > e.fosoHalf || e.popa < -e.fosoHalf) {
          err(
            `fila ${row.index}: el buque asoma por los extremos del foso ` +
              `(${e.popa.toFixed(2)}..${e.proa.toFixed(2)} vs ±${e.fosoHalf.toFixed(2)})`,
          );
        }
      }
      if (d.ship && d.bridge !== undefined) {
        const e = encajeBuque(d.tiles, d.bridge, d.col);
        if (e.min < -e.fosoHalf || e.max > e.fosoHalf) {
          err(`fila ${row.index}: el buque asoma de los muros (${e.min.toFixed(2)}..${e.max.toFixed(2)} vs ±${e.fosoHalf.toFixed(2)})`);
        }
        if (e.max > e.pasarelaMin && e.min < e.pasarelaMax) {
          err(`fila ${row.index}: el buque invade la casilla de la pasarela (${e.pasarelaMin.toFixed(2)}..${e.pasarelaMax.toFixed(2)})`);
        }
      }
      for (let k = 0; k < len; k++) {
        const i = row.index + k;
        if (zoneOf(i) !== 'shipyard') err(`fila ${i}: el dique se sale del astillero`);
        if (Math.abs((i % BALANCE.ZONE_LENGTH) - BALANCE.MEGADOCK_POS) <= 1) {
          err(`fila ${i}: el dique pisa el dique mayor o sus vecinas`);
        }
      }
    }
    // Ninguna continuación huérfana (sin cabeza que la dibuje)
    for (const d of row.docks ?? []) {
      if (!d.cont) continue;
      let found = false;
      const maxLen = Math.max(...BALANCE.VDOCK_LEN);
      for (let back = 1; back < maxLen; back++) {
        const head = rows[row.index - back]?.docks?.find((h) => h.len && h.col === d.col);
        if (head && (head.len ?? 0) > back) found = true;
      }
      if (!found) err(`fila ${row.index}: continuación huérfana en col ${d.col}`);
    }
  }
}

console.log(`cabezas de dique vertical: ${heads} · segmentos de continuación: ${conts}`);
console.log('reparto de fondos (filas):', lens);
if (errores) {
  console.error(`${errores} errores`);
  process.exit(1);
}
console.log('OK: diques verticales bien formados, cadena de andamios alineada');
