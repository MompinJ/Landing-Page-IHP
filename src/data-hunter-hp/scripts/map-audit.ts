/**
 * Auditoría del mapa generado: qué se encuentra de verdad el jugador fila a
 * fila, por bioma. Sirve para decidir dificultad con datos y no a ojo.
 *
 *   npx tsx scripts/map-audit.ts [filas]
 */
import { BALANCE } from '../src/data/balance';
import { useGameStore } from '../src/store/useGameStore';
import { BIOME_SEQUENCE, rows, zoneOf, type RowData } from '../src/world/rows';

// Una vuelta COMPLETA al recorrido: si se codifica a mano, al cambiar
// ZONE_LENGTH o añadir una unidad de negocio la tabla mezcla dos biomas en una
// fila y las cuentas dejan de cuadrar sin avisar.
const N = Number(process.argv[2] ?? BALANCE.ZONE_LENGTH * BIOME_SEQUENCE.length);
useGameStore.getState().startGame();
const { generateRows } = await import('../src/world/rows');
while (rows.length < N) generateRows(BALANCE.ROWS_BATCH);

const COLS = BALANCE.MAX_TILE - BALANCE.MIN_TILE + 1;

/** ¿Esta fila obliga a esquivar algo móvil? */
const esPeligrosa = (r: RowData) =>
  r.vehicles.some((v) => !BALANCE.BOAT_FLEET.some((b) => b.kind === v.kind) && v.kind !== 'ship') || r.cranes.length > 0 || r.type === 'water';

/** Columnas bloqueadas (pilas de contenedor / diques) */
const bloqueadas = (r: RowData) =>
  r.stacks.length + (r.docks?.reduce((a, d) => a + d.tiles, 0) ?? 0);

const porBioma: Record<string, any> = {};
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

const tabla = Object.values(porBioma).map((s: any) => ({
  bioma: s.bioma,
  filas: s.filas,
  '% peligrosas': `${Math.round((s.peligrosas / s.filas) * 100)}%`,
  'bloqueos/fila': (s.bloqueosTotales / s.filas).toFixed(1),
  '% cols libres': `${Math.round((1 - s.bloqueosTotales / s.filas / COLS) * 100)}%`,
  agua: s.filasAgua,
  bandas: s.filasBanda,
  'con crucero': s.filasConCrucero,
  grúas: s.gruas,
}));
console.table(tabla);

// Racha peor: cuántas filas peligrosas seguidas puede encontrarse
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
