/**
 * Comprobaciones del vocabulario de tarjetas (lista "Palabras del juego"):
 *  - las CINCO terminales tienen vocabulario propio, de valor Y de riesgo. Es
 *    lo más importante que se comprueba aquí: si una se quedara sin palabras,
 *    `goodItemsFor` caería al fondo común y el reparto por terminal dejaría de
 *    existir en silencio, sin que nada fallara.
 *  - sin repetidos (ni dentro de una terminal ni entre terminales)
 *  - los conceptos de ESCUDO existen de verdad en la lista (si se renombra uno,
 *    la mecánica dejaría de dispararse en silencio)
 *  - ninguna etiqueta tan larga que se aplaste en la tarjeta
 *  - ningún concepto aparece a la vez como bueno y como malo
 *
 *   npx tsx scripts/items-test.ts
 */
import {
  BAD_ITEMS,
  GOOD_ITEMS,
  SHIELD_ITEMS,
  TERMINAL_ITEMS,
  badItemsFor,
  goodItemsFor,
} from '../src/data/items';
import { BIOME_SEQUENCE, generateRows, resetRows, rows } from '../src/world/rows';

/** Ancho máximo cómodo: la etiqueta se dibuja a 28px en 240px de canvas */
const MAX_CHARS = 21;
/** Mínimo por terminal para que su temario no se agote en una sola pasada */
const MIN_BUENAS = 20;
const MIN_MALAS = 3;

const failures: string[] = [];

// --- Cada bioma del recorrido tiene que traer su propio vocabulario ---
for (const bioma of BIOME_SEQUENCE) {
  const t = TERMINAL_ITEMS.find((x) => x.terminal === bioma);
  if (!t) {
    failures.push(`la terminal '${bioma}' no tiene vocabulario propio`);
    continue;
  }
  const buenas = goodItemsFor(bioma);
  const malas = badItemsFor(bioma);
  // Comparar contra el fondo común detecta el respaldo silencioso
  if (buenas === GOOD_ITEMS) failures.push(`'${bioma}' cae al vocabulario común de buenas`);
  if (malas === BAD_ITEMS) failures.push(`'${bioma}' cae al vocabulario común de malas`);
  if (buenas.length < MIN_BUENAS) failures.push(`'${bioma}': solo ${buenas.length} conceptos de valor`);
  if (malas.length < MIN_MALAS) failures.push(`'${bioma}': solo ${malas.length} conceptos de riesgo`);
}

const dupGood = GOOD_ITEMS.filter((v, i) => GOOD_ITEMS.indexOf(v) !== i);
if (dupGood.length) failures.push(`positivos repetidos: ${[...new Set(dupGood)].join(', ')}`);

const dupBad = BAD_ITEMS.filter((v, i) => BAD_ITEMS.indexOf(v) !== i);
if (dupBad.length) failures.push(`negativos repetidos: ${[...new Set(dupBad)].join(', ')}`);

const cruce = GOOD_ITEMS.filter((g) => BAD_ITEMS.includes(g));
if (cruce.length) failures.push(`aparecen como bueno Y malo: ${cruce.join(', ')}`);

const huerfanos = SHIELD_ITEMS.filter((s) => !GOOD_ITEMS.includes(s));
if (huerfanos.length) failures.push(`conceptos de escudo que no existen en GOOD_ITEMS: ${huerfanos.join(', ')}`);
if (SHIELD_ITEMS.length === 0) failures.push('no hay ningún concepto que active escudo');

const largos = [...GOOD_ITEMS, ...BAD_ITEMS].filter((s) => s.length > MAX_CHARS);
if (largos.length) failures.push(`etiquetas de más de ${MAX_CHARS} caracteres: ${largos.join(' | ')}`);

// --- Sobre el mapa REAL: cada tarjeta habla del vocabulario de SU terminal ---
// Comprobar solo la tabla no basta: las tarjetas se siembran desde ocho sitios
// distintos de `rows.ts` y a cada uno hay que pasarle su bioma a mano. Uno que
// se quede con el tema equivocado no rompe nada — simplemente pregunta por
// ciberseguridad en mitad del astillero, y eso no se ve hasta jugarlo.
resetRows();
generateRows(500);
const repartidas = new Map<string, number>();
let cartas = 0;
for (const row of rows) {
  for (const card of row.cards) {
    cartas++;
    const permitido = card.good ? goodItemsFor(row.theme) : badItemsFor(row.theme);
    if (!permitido.includes(card.label)) {
      failures.push(`fila ${row.index} (${row.theme}, ${row.type}): "${card.label}" no es de esa terminal`);
    }
    repartidas.set(row.theme, (repartidas.get(row.theme) ?? 0) + 1);
  }
}
for (const bioma of BIOME_SEQUENCE) {
  if (!repartidas.get(bioma)) failures.push(`'${bioma}' no sembró ni una tarjeta en 500 filas`);
}

console.log(`total: ${GOOD_ITEMS.length} de valor · ${BAD_ITEMS.length} de riesgo`);
for (const t of TERMINAL_ITEMS) {
  const b = t.bloques.flatMap((x) => x.buenas ?? []).length;
  const m = t.bloques.flatMap((x) => x.malas ?? []).length;
  const temas = t.bloques.map((x) => x.tema).join(', ');
  console.log(`  ${t.etiqueta.padEnd(32)} ${String(b).padStart(3)} valor · ${m} riesgo — ${temas}`);
}
console.log(`probabilidad de escudo por tarjeta buena: ${((SHIELD_ITEMS.length / GOOD_ITEMS.length) * 100).toFixed(1)}%`);
console.log(`sobre el mapa: ${cartas} tarjetas en 500 filas, todas del vocabulario de su terminal`);

if (failures.length) {
  console.error('FALLOS:\n - ' + failures.join('\n - '));
  process.exit(1);
}
console.log('OK: vocabulario por terminal consistente');
