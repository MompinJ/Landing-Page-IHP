/**
 * Auditoría del mapa generado: qué se encuentra de verdad el jugador fila a
 * fila, por bioma. Sirve para decidir dificultad con datos y no a ojo.
 *
 *   npx tsx scripts/map-audit.ts [filas]
 */
import { BALANCE } from '../src/data/balance';
import { BIOME_SEQUENCE, rows, zoneOf, type RowData } from '../src/world/rows';

// Una vuelta COMPLETA al recorrido: si se codifica a mano, al cambiar
// ZONE_LENGTH o añadir una unidad de negocio la tabla mezcla dos biomas en una
// fila y las cuentas dejan de cuadrar sin avisar.
const N = Number(process.argv[2] ?? BALANCE.ZONE_LENGTH * BIOME_SEQUENCE.length);
/**
 * Mapas que se promedian. NO era 1 por accidente: con una sola tirada la tabla
 * bailaba tanto que no servía para comparar biomas — el mismo 'port' salía al
 * 22% en una corrida y al 6% en la siguiente, y a partir de ahí cualquier
 * conclusión sobre «qué bioma tiene más peligro» era ruido.
 */
const MAPAS = Number(process.argv[3] ?? 25);
const { generateRows, resetRows } = await import('../src/world/rows');

const COLS = BALANCE.MAX_TILE - BALANCE.MIN_TILE + 1;

/** ¿Esta fila obliga a esquivar algo móvil? */
const esPeligrosa = (r: RowData) =>
  r.vehicles.some((v) => !BALANCE.BOAT_FLEET.some((b) => b.kind === v.kind) && v.kind !== 'ship') || r.cranes.length > 0 || r.type === 'water';

/** Columnas bloqueadas (pilas de contenedor / diques) */
const bloqueadas = (r: RowData) =>
  r.stacks.length + (r.docks?.reduce((a, d) => a + d.tiles, 0) ?? 0);

const porBioma: Record<string, any> = {};
for (let m = 0; m < MAPAS; m++) {
  resetRows();
  while (rows.length < N) generateRows(BALANCE.ROWS_BATCH);
  acumula();
}

function acumula() {
for (const r of rows.slice(0, N)) {
  const b = zoneOf(r.index);
  const s = (porBioma[b] ??= {
    bioma: b, filas: 0, peligrosas: 0, seguras: 0, bloqueosTotales: 0,
    filasAgua: 0, filasConCrucero: 0, vehiculos: 0, gruas: 0, filasBanda: 0,
  });
  s.filas++;
  if (esPeligrosa(r)) s.peligrosas++;
  else s.seguras++;
  s.bloqueosTotales += bloqueadas(r);
  s.vehiculos += r.vehicles.length;
  s.gruas += r.cranes.length;
  if (r.type === 'water') s.filasAgua++;
  if (r.type === 'belt') s.filasBanda++;
  if (r.vehicles.some((v) => v.kind === 'ship')) s.filasConCrucero++;
}
}

console.log(`\npromedio de ${MAPAS} mapas · ${N} filas cada uno\n`);
const tabla = Object.values(porBioma).map((s: any) => ({
  bioma: s.bioma,
  'filas/vuelta': +(s.filas / MAPAS).toFixed(0),
  '% peligrosas': `${Math.round((s.peligrosas / s.filas) * 100)}%`,
  'bloqueos/fila': (s.bloqueosTotales / s.filas).toFixed(1),
  '% cols libres': `${Math.round((1 - s.bloqueosTotales / s.filas / COLS) * 100)}%`,
  'agua/vuelta': +(s.filasAgua / MAPAS).toFixed(1),
  'bandas/vuelta': +(s.filasBanda / MAPAS).toFixed(1),
  'grúas/vuelta': +(s.gruas / MAPAS).toFixed(1),
}));
console.table(tabla);

// Racha peor y reparto de cruceros: se miran sobre el ÚLTIMO mapa generado, no
// sobre el promedio — son cosas que se leen fila a fila, no en media.
let racha = 0, peorRacha = 0, peorEn = 0;
for (const r of rows.slice(0, N)) {
  if (esPeligrosa(r)) {
    racha++;
    if (racha > peorRacha) { peorRacha = racha; peorEn = r.index; }
  } else racha = 0;
}
console.log(`racha máxima de filas peligrosas seguidas: ${peorRacha} (hacia la fila ${peorEn})`);

// Cruceros abordables: ¿los ve el jugador al cruzar el bioma?
const cruise = rows.slice(0, N).filter((r) => zoneOf(r.index) === 'cruise');
const agua = cruise.filter((r) => r.type === 'water');
const conBarco = agua.filter((r) => r.vehicles.some((v) => v.kind === 'ship'));
console.log(
  `bioma cruceros: ${cruise.length} filas · ${agua.length} de agua · ` +
    `${conBarco.length} con crucero abordable (${agua.length ? Math.round((conBarco.length / agua.length) * 100) : 0}% del agua)`,
);
console.log('filas con crucero abordable:', conBarco.map((r) => r.index).join(', ') || '(ninguna)');
