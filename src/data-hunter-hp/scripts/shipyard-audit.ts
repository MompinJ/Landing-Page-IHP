/**
 * ¿QUÉ TRAE DE VERDAD EL ASTILLERO?
 *
 * `map-audit.ts` dice cuántas filas peligrosas tiene cada bioma, pero no dice
 * si el astillero se PARECE a un astillero: cuántas de sus 18 filas traen algo
 * suyo —dique vertical, dique mayor, grúa pórtico— y cuántas son patio pelado
 * que podría estar en cualquier otra terminal.
 *
 * Y mide lo otro que se nota jugando: A QUÉ FILA hay que llegar para pisarlo.
 * Es el cuarto de cinco en `BIOME_SEQUENCE`, así que si el jugador medio muere
 * antes de esa fila, el bioma existe pero no se ve.
 *
 *   npx tsx scripts/shipyard-audit.ts [mapas]
 */
import { BALANCE } from '../src/data/balance';
import { BIOME_SEQUENCE, generateRows, resetRows, rows, zoneOf, type RowData } from '../src/world/rows';

const MAPAS = Number(process.argv[2] ?? 40);
const ZONA = BALANCE.ZONE_LENGTH;

/**
 * ¿Qué trae esta fila? Se distingue el patio CON BLOQUES del patio VACÍO a
 * propósito: la primera versión metía los dos en el mismo saco («patio pelado»)
 * y daba un 36% que parecía vacío cuando la mayoría de esas filas llevan pilas
 * de casco y bloques de astillero. Optimizar contra esa cifra habría sido
 * perseguir un problema inventado.
 */
type Que = 'dique mayor' | 'dique vertical' | 'grúa pórtico' | 'montacargas' | 'RTG' | 'patio con bloques' | 'patio VACÍO';

function esDeAstillero(r: RowData): Que {
  if (r.docks?.some((d) => d.mega)) return 'dique mayor';
  if (r.docks?.length) return 'dique vertical';
  if (r.type === 'gantry') return 'grúa pórtico';
  if (r.vehicles.some((v) => v.kind === 'forklift')) return 'montacargas';
  if (r.cranes.length) return 'RTG';
  return r.stacks.length ? 'patio con bloques' : 'patio VACÍO';
}

const cuenta: Record<string, number> = {};
const porTipo: Record<string, number> = {};
let filasTotales = 0;
let bloqueosTotales = 0;
let vdockPorZona = 0;
let zonas = 0;

for (let m = 0; m < MAPAS; m++) {
  resetRows();
  // Tres vueltas: la primera zona de astillero cae tarde y con una sola el
  // muestreo se quedaba corto para las tiradas de dique vertical.
  generateRows(ZONA * BIOME_SEQUENCE.length * 3 + 10);

  const inicios: number[] = [];
  for (let i = 0; i < rows.length; i++) {
    if (rows[i] && zoneOf(i) === 'shipyard' && (i === 0 || zoneOf(i - 1) !== 'shipyard')) inicios.push(i);
  }

  for (const ini of inicios) {
    if (ini + ZONA > rows.length) continue;
    zonas++;
    let vdockCabezas = 0;
    for (let i = ini; i < ini + ZONA; i++) {
      const r = rows[i];
      if (!r) continue;
      filasTotales++;
      porTipo[r.type] = (porTipo[r.type] ?? 0) + 1;
      bloqueosTotales += r.stacks.length + (r.docks?.reduce((s, d) => s + d.tiles, 0) ?? 0);
      cuenta[esDeAstillero(r)] = (cuenta[esDeAstillero(r)] ?? 0) + 1;
      // cabeza de dique vertical = la fila que lo arranca (lleva `docks` sin mega
      // y la anterior no)
      if (r.docks?.length && !r.docks.some((d) => d.mega) && !rows[i - 1]?.docks?.length) vdockCabezas++;
    }
    vdockPorZona += vdockCabezas;
  }
}

console.log(`\n${zonas} zonas de astillero muestreadas sobre ${MAPAS} mapas (${ZONA} filas cada una)\n`);

console.log('QUÉ SE ENCUENTRA EL JUGADOR, por fila de astillero:');
console.table(
  Object.fromEntries(
    Object.entries(cuenta)
      .sort((a, b) => b[1] - a[1])
      .map(([k, v]) => [k, { 'filas por zona': +(v / zonas).toFixed(1), '% de la zona': ((v / filasTotales) * 100).toFixed(0) + '%' }]),
  ),
);

console.log('\nTIPO DE FILA:');
console.table(
  Object.fromEntries(
    Object.entries(porTipo)
      .sort((a, b) => b[1] - a[1])
      .map(([k, v]) => [k, { 'por zona': +(v / zonas).toFixed(1) }]),
  ),
);

console.log(
  `\ndiques verticales por zona: ${(vdockPorZona / zonas).toFixed(2)} ` +
    `(VDOCK_CHANCE ${BALANCE.VDOCK_CHANCE}, hueco mínimo ${BALANCE.VDOCK_MIN_GAP} filas)`,
);
console.log(`casillas bloqueadas por fila: ${(bloqueosTotales / filasTotales).toFixed(1)}`);

// --- ¿A qué distancia está? ---
const idx = BIOME_SEQUENCE.indexOf('shipyard');
console.log(
  `\nel astillero es el ${idx + 1}.º de ${BIOME_SEQUENCE.length} en la rotación: ` +
    `hay que llegar a la FILA ${idx * ZONA} para pisarlo por primera vez, ` +
    `y a la ${(idx + 1) * ZONA - 1} para verlo entero.`,
);
console.log(`orden actual: ${BIOME_SEQUENCE.join(' → ')}`);
