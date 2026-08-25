import {
  BALANCE,
  badChanceFor,
  beltSpeedFor,
  colX,
  goodChanceFor,
  roadStreakLimitFor,
  speedFactorForRow,
} from '../data/balance';
import { badItemsFor, goodItemsFor } from '../data/items';
import { runtime } from '../store/runtime';

/**
 * Metadatos del mapa procedural, espejo del `generateRows` del tutorial de
 * Crossy Road (javascriptgametutorials.com) tematizado a terminal portuaria:
 *  - forest → `yard` (pilas de contenedores en vez de árboles, alturas 1-3)
 *  - car/truck → `road` (AGVs de 3 casillas y camiones de 5, con dirección
 *    aleatoria y wrap-around en los bordes)
 *  - extra propio: `crane` — grúa RTG MÓVIL que recorre la fila; sus patas
 *    atropellan, el hueco entre ellas es paso seguro (mecánica tipo Frogger)
 *
 * Accesibilidad de stand: primeras filas sin tráfico, máximo 2 filas de
 * vía consecutivas, velocidades moderadas.
 */
export type RowType = 'yard' | 'road' | 'crane' | 'gate' | 'water' | 'dock' | 'rail' | 'gantry' | 'belt';
export type VehicleKind =
  | 'truck' | 'agv' | 'train' | 'forklift' | 'hopper' | 'loader'
  /** Flota abordable de la dársena (ver BALANCE.BOAT_FLEET) + el crucero */
  | 'ship' | 'tug' | 'sail' | 'yacht' | 'fish';

/**
 * BIOMAS INDUSTRIALES — una UNIDAD DE NEGOCIO por bioma, en rotación secuencial
 * cada ZONE_LENGTH filas. Los nombres de pantalla viven en `data/units.ts`.
 *
 * Cada terminal tiene que traer un VERBO propio, no un decorado nuevo: si dos
 * biomas se juegan igual, el jugador cruza el segundo sin enterarse de que
 * cambió de negocio.
 *
 *  - 'port'     → TEC, Terminal de Contenedores: esquivar tráfico y rodear pilas
 *  - 'multi'    → Terminal Multipropósito: el SUELO SE MUEVE (bandas
 *                 transportadoras) y el convoy de tolvas de granel cruza el patio
 *  - 'cruise'   → ECV, Terminal de Cruceros: montarse en plataformas móviles
 *  - 'shipyard' → TNG, Astillero Naval: refugiarse en andamios, cronometrar la
 *                 grúa pórtico, rodear los diques
 *  - 'rail'     → TILH, Terminal Intermodal: leer el semáforo y esperar el tren
 */
export type ZoneTheme = 'port' | 'multi' | 'cruise' | 'shipyard' | 'rail';

// El orden es el del recorrido: TUM va en segunda posición a propósito. Puesta
// al final del ciclo, casi ningún jugador de stand llegaría a verla.
export const BIOME_SEQUENCE: ZoneTheme[] = ['port', 'multi', 'cruise', 'shipyard', 'rail'];

/** Bioma al que pertenece una fila — rotan cada ZONE_LENGTH filas */
export function zoneOf(index: number): ZoneTheme {
  return BIOME_SEQUENCE[Math.floor(index / BALANCE.ZONE_LENGTH) % BIOME_SEQUENCE.length];
}

/** Fila-ancla de un bioma: donde se montan las super-estructuras (STS/RMG/dique)
 *  UNA sola vez por instancia de bioma, para no multiplicar draw calls. */
export function isBiomeAnchor(index: number): boolean {
  return index % BALANCE.ZONE_LENGTH === Math.floor(BALANCE.ZONE_LENGTH / 2);
}

export interface VehicleData {
  /** Posición X en unidades de mundo — MUTADA por traffic.ts cada frame */
  x: number;
  /** X del frame anterior — el hit test barre el tramo [prevX, x] */
  prevX: number;
  /** Largo en casillas (tutorial: auto 3, camión 5). En plataformas es además
   *  el tramo abordable. */
  tiles: number;
  /** Largo DIBUJADO, si es mayor que `tiles` (crucero: cubierta abordable de 5
   *  casillas dentro de un casco de 8). Solo lo usa el wrap, para que la
   *  reaparición ocurra con el modelo entero fuera de cuadro. */
  visualTiles?: number;
  speed: number;
  direction: 1 | -1;
  kind: VehicleKind;
  colorIndex: number;
  /** FLOTACIÓN (solo barcazas y remolcadores): cuánto está hundido el casco
   *  ahora mismo, en unidades de mundo. Lo integra `updateTraffic` como un
   *  muelle amortiguado y lo leen el modelo (para bajar la malla) y
   *  `updateWaterRiding` (para bajar con él al colaborador). */
  sink?: number;
  sinkVel?: number;
  /** ¿Va el colaborador a bordo? Lo marca `updateWaterRiding` cada frame. */
  boarded?: boolean;
}

export interface CraneData {
  /** Centro del pórtico — MUTADO por traffic.ts cada frame */
  x: number;
  /** X del frame anterior — el hit test barre el tramo [prevX, x] */
  prevX: number;
  speed: number;
  direction: 1 | -1;
}

/**
 * Modelo que dibuja una pieza de decorado. Antes se deducía de su ÍNDICE en el
 * array (`i % 3` en el mapa), así que añadir o quitar una pieza cambiaba el
 * modelo de todas las demás y era imposible razonar sobre el espacio que ocupa
 * cada una. Ahora la pieza dice lo que es.
 */
export type DecorKind = 'stack' | 'warehouse' | 'jib' | 'block' | 'silo' | 'cargo' | 'mobile';

export interface StackData {
  col: number;
  /** Contenedores apilados (equivalente a las alturas 20/45/60 de árboles) */
  height: number;
  colorIndex: number;
  /** Solo en decorado: qué modelo se dibuja (ver `DecorKind`) */
  kind?: DecorKind;
}

/** Dique seco JUGABLE: foso VERTICAL que corre a lo largo del recorrido.
 *  Ocupa cols [col, col+tiles-1] durante `len` filas y bloquea el paso SALVO
 *  por `bridge`, la columna de la CADENA DE ANDAMIOS: una pasarela por fila,
 *  todas alineadas — se cruza el dique saltando de andamio en andamio, o se
 *  rodea por los costados. Cada fila del foso lleva su propio DockData (la
 *  colisión es por fila); el dibujo es UNA pieza, en la fila cabeza. */
export interface DockData {
  col: number;
  tiles: number;
  /** Dique con compuerta abierta (lleno de agua) — solo visual */
  flooded: boolean;
  /** Columna transitable: la cadena de andamios sobre el foso. Sin ella el
   *  dique es un tapón macizo y hay que rodearlo. */
  bridge?: number;
  /** Buque mediano en reparación dentro del foso (apeado a lo largo) */
  ship?: boolean;
  /** Segmento del DIQUE MAYOR: el muro de lado a lado con el buque grande.
   *  Los segmentos son solo colisión — el dibujo es UNA pieza por fila. */
  mega?: boolean;
  /** Filas de fondo del dique vertical — solo en la fila CABEZA (es quien
   *  dibuja el foso completo y sus andamios) */
  len?: number;
  /** Segmento de CONTINUACIÓN de un dique vertical: colisión sin dibujo */
  cont?: boolean;
}

/** Andamio: plataforma elevada donde el colaborador queda POR ENCIMA de la
 *  viga de la grúa pórtico. Es el refugio de las filas 'gantry'. */
export interface ScaffoldData {
  col: number;
  /** Cota de la plataforma si no es la estándar (las pasarelas del dique mayor
   *  van a MEGADOCK_WALK_Y: cruzan por encima del buque) */
  y?: number;
}

export interface CardData {
  col: number;
  good: boolean;
  label: string;
  collected: boolean;
}

export interface RowData {
  index: number;
  type: RowType;
  theme: ZoneTheme;
  stacks: StackData[];
  /** Pilas decorativas fuera del tablero jugable (skyline del puerto) */
  decor: StackData[];
  vehicles: VehicleData[];
  cranes: CraneData[];
  cards: CardData[];
  /** Diques jugables (solo astillero) */
  docks?: DockData[];
  /** Andamios: casillas seguras frente a la grúa pórtico (filas 'gantry') */
  scaffolds?: ScaffoldData[];
  /** Acabado del pontón en las filas transitables de la terminal de cruceros
   *  (ver `DockDeck`). Dos muelles seguidos nunca repiten acabado. */
  deck?: number;
  /** BANDA TRANSPORTADORA (TUM): sentido y velocidad con que el suelo arrastra
   *  al colaborador mientras esté parado encima. */
  belt?: { direction: 1 | -1; speed: number };
  /** PUNTO DE EMBARQUE del dique mayor: columna de la fila ANTERIOR donde hay
   *  que ponerse para que la grúa te aviente por encima del buque. */
  padCol?: number;
}

export const rows: RowData[] = [];

let rand = Math.random;

/** DIQUE VERTICAL en construcción: las filas que le faltan por sembrar. El
 *  generador es secuencial (una fila cada vez), así que el dique de varias
 *  filas se reparte: la cabeza lo define y las siguientes lo continúan. */
let vdock: { col: number; tiles: number; bridge: number; flooded: boolean; ship: boolean; rowsLeft: number } | null =
  null;

/** Última fila ocupada por un dique vertical — el siguiente tiene que dejar
 *  VDOCK_MIN_GAP filas de patio de por medio (ver BALANCE.VDOCK_MIN_GAP). */
let lastVDockEnd = -Infinity;

export function resetRows(rng: () => number = Math.random) {
  rand = rng;
  vdock = null;
  lastVDockEnd = -Infinity;
  rows.length = 0;
  // Filas de arranque despejadas
  rows.push(emptyYard(0));
  rows.push(emptyYard(1));
  // Se genera ya todo lo que la cámara alcanza a ver: antes se arrancaba con 22
  // filas y en una pantalla grande (que ve 24) el mapa se acababa en cuadro
  // desde el primer fotograma.
  extendRowsIfNeeded(0);
}

export function generateRows(amount: number) {
  for (let i = 0; i < amount; i++) {
    const row = generateRow(rows.length);
    ensurePassable(row);
    rows.push(row);
  }
}

/** Columnas del tablero que esta fila bloquea (pilas de contenedor y diques).
 *  La pasarela del dique NO bloquea: por ahí se cruza el foso. */
function blockedCols(row: RowData): Set<number> {
  const set = new Set<number>();
  for (const s of row.stacks) set.add(s.col);
  for (const d of row.docks ?? []) {
    for (let c = d.col; c < d.col + d.tiles; c++) if (c !== d.bridge) set.add(c);
  }
  return set;
}

/**
 * GARANTÍA DE PASO — como no se puede retroceder (regla de Crossy Road), una
 * fila nunca debe sellar por completo un tramo libre de la anterior: el jugador
 * que estuviera ahí se quedaría encerrado para siempre, sin muerte ni salida.
 *
 * Se detectó con `scripts/trap-test.ts`: 12 callejones sin salida cada 400
 * filas, casi siempre tramos de una sola casilla contra el borde del tablero.
 *
 * Por cada tramo libre de la fila anterior que quede tapado en TODAS sus
 * columnas, se retira el bloqueo de una de ellas.
 */
function ensurePassable(row: RowData) {
  const prev = rows[row.index - 1];
  if (!prev) return;
  const prevBlocked = blockedCols(prev);
  const blocked = blockedCols(row);
  if (blocked.size === 0) return;

  const liberar = (col: number) => {
    row.stacks = row.stacks.filter((s) => s.col !== col);
    row.docks = row.docks?.filter((d) => !(col >= d.col && col < d.col + d.tiles));
    blocked.delete(col);
  };

  let tramo: number[] = [];
  const revisar = () => {
    if (tramo.length && tramo.every((c) => blocked.has(c))) {
      liberar(tramo[Math.floor(tramo.length / 2)]);
    }
    tramo = [];
  };
  for (let c = BALANCE.MIN_TILE; c <= BALANCE.MAX_TILE; c++) {
    if (prevBlocked.has(c)) revisar();
    else tramo.push(c);
  }
  revisar();
}

/**
 * Filas que la cámara alcanza a ver por delante. Lo fija `<Map/>` a partir del
 * tamaño de la ventana: con zoom ortográfico fijo, una pantalla grande ve mucho
 * más mapa, y si el generador no va por delante aparece el océano de fondo.
 */
let lookahead: number = BALANCE.VIEW_AHEAD;
export function setLookahead(rowsAhead: number) {
  lookahead = rowsAhead;
  extendRowsIfNeeded(runtime.row);
}

/** Extiende el mapa cuando el jugador se acerca al final (patrón del tutorial) */
export function extendRowsIfNeeded(currentRow: number) {
  // Colchón: lo que se ve más el margen de configuración, para que el mapa
  // nunca se acabe dentro del encuadre.
  const necesario = currentRow + Math.max(BALANCE.ROWS_EXTEND_AT, lookahead + BALANCE.ROWS_BATCH);
  while (rows.length < necesario) generateRows(BALANCE.ROWS_BATCH);
}

function emptyYard(index: number): RowData {
  return {
    index,
    type: 'yard',
    theme: zoneOf(index),
    stacks: [],
    decor: makeDecor(index, zoneOf(index)),
    vehicles: [],
    cranes: [],
    cards: [],
  };
}

function pick<T>(list: readonly T[]): T {
  return list[Math.floor(rand() * list.length)];
}

/** Filas seguidas con PELIGRO MÓVIL hacia atrás. La banda de TUM no cuenta:
 *  arrastra pero no atropella, y si contara, detrás de cada banda se forzaría
 *  un patio y la rampa Ro-Ro no llegaría a salir casi nunca. */
function roadStreak(index: number): number {
  let streak = 0;
  for (
    let i = index - 1;
    i >= 0 && rows[i] && rows[i].type !== 'yard' && rows[i].type !== 'gate' && rows[i].type !== 'belt';
    i--
  ) {
    streak++;
  }
  return streak;
}

function generateRow(index: number): RowData {
  // Frontera de bioma: fila de respiro al entrar en la terminal que empieza
  if (index > 0 && index % BALANCE.ZONE_LENGTH === 0) return generateGateRow(index);

  const biome = zoneOf(index);
  // ECV = mecánica de río (agua fatal + barcazas + muelles)
  if (biome === 'cruise') return generateCruiseRow(index);
  // TILH = vías de tren + patios intermodales
  if (biome === 'rail') return generateRailBiomeRow(index);
  // TUM = bandas transportadoras + convoyes Ro-Ro + patios de carga general
  if (biome === 'multi') return generateMultiRow(index);

  // DIQUE MAYOR del astillero, en posición FIJA de la zona. Va antes del corte
  // de roadStreak a propósito: sus dos filas vecinas tienen que salir SIEMPRE
  // despejadas — la de antes porque `ensurePassable` perforaría el muro si un
  // bloqueo previo dejara un tramo sin acceso a los andamios, y la de después
  // porque ahí aterriza el izado de la grúa y no puede caer sobre tráfico.
  if (biome === 'shipyard') {
    const zpos = index % BALANCE.ZONE_LENGTH;
    if (zpos === BALANCE.MEGADOCK_POS) return generateMegaDockRow(index);
    if (Math.abs(zpos - BALANCE.MEGADOCK_POS) === 1) return clearShipyardYard(index);
    // Dique vertical a medio sembrar: la fila le pertenece (por construcción
    // nunca choca con el dique mayor ni con la frontera — ver startVDock)
    if (vdock) return continueVDockRow(index);
  }

  // ---- LCT (contenedores) y TNG (astillero): patios + tráfico rodado ----
  // Arranque suave: sin tráfico en las primeras filas
  if (index < BALANCE.SAFE_START_ROWS) return generateYardRow(index);
  // Nunca más filas de peligro móvil seguidas de las que tolera la dificultad
  // de esta profundidad: 1 al principio, 2 pasada media rampa.
  if (roadStreak(index) >= roadStreakLimitFor(index)) return generateYardRow(index);

  // TNG = taller: la grúa pórtico manda, y se cruza por los andamios.
  // Antes, el sorteo del DIQUE VERTICAL: la seña de identidad del patio.
  if (biome === 'shipyard') {
    if (rand() < BALANCE.VDOCK_CHANCE) {
      const head = startVDockRow(index);
      if (head) return head;
    }
    return generateShipyardRow(index);
  }

  const roll = rand();
  // Grúas MÓVILES: RTG que recorre la fila (peligro de patas, mecánica Frogger)
  if (roll < 0.07 && index > 10) return generateCraneRow(index);
  if (roll < 0.76) return generateYardRow(index);
  return generateRoadRow(index);
}

/**
 * Fila del ASTILLERO (TNG). El peligro propio del bioma es la GRÚA PÓRTICO que
 * barre el taller de lado a lado: arrolla todo lo que esté a ras de suelo, así
 * que la fila se cruza saltando de ANDAMIO en andamio (quedan por encima de su
 * viga). El resto son patios con diques —que ahora se cruzan por su pasarela—,
 * alguna RTG y tráfico de montacargas.
 */
function generateShipyardRow(index: number): RowData {
  // Nota: entre dos filas de peligro siempre cae un patio (`roadStreakLimitFor`
  // lo impone antes de llegar aquí), así que estos pesos se aplican sobre la
  // mitad de las filas del bioma. De ahí que la grúa pórtico se lleve la mayor
  // parte: es el peligro que da carácter al astillero.
  //
  // El patio pelado se quedó en un resto testimonial (6%). Medido con
  // `scripts/shipyard-audit.ts`, el astillero era el bioma con MENOS peligro
  // móvil de los cinco —22% de sus filas, empatado con el último— y a la vez el
  // que más casillas bloqueadas tenía: mucho bulto quieto y poco que esquivar.
  // Y el patio de más no hacía falta para respirar, porque el respiro ya lo
  // garantiza el corte de racha de arriba.
  const roll = rand();
  if (roll < 0.56) return generateGantryRow(index);
  if (roll < 0.76) return generateCraneRow(index);
  if (roll < 0.94) return generateRoadRow(index);
  return generateYardRow(index);
}

/**
 * Fila de GRÚA PÓRTICO: sin bloqueos, pero el suelo entero es peligroso cuando
 * pasa el carro. Los andamios se reparten a lo ancho con un hueco mínimo para
 * que el cruce sea una cadena de saltos con espera, no un pasillo corrido.
 */
function generateGantryRow(index: number): RowData {
  const scaffolds: ScaffoldData[] = [];
  const count = pick(BALANCE.SCAFFOLD_COUNT);
  const span = BALANCE.MAX_TILE - BALANCE.MIN_TILE;
  for (let i = 0; i < count; i++) {
    const base = BALANCE.MIN_TILE + Math.round(((i + 0.5) * span) / count);
    const col = Math.max(
      BALANCE.MIN_TILE,
      Math.min(BALANCE.MAX_TILE, base + Math.floor(rand() * 3) - 1),
    );
    if (scaffolds.some((s) => Math.abs(s.col - col) < BALANCE.SCAFFOLD_MIN_GAP)) continue;
    scaffolds.push({ col });
  }

  // Arranca fuera del tablero para que se vea venir antes de entrar
  const direction: 1 | -1 = rand() < 0.5 ? 1 : -1;
  const x = colX(direction === 1 ? BALANCE.MIN_TILE - 2 : BALANCE.MAX_TILE + 2);

  // Premio en un andamio: recompensa por usar el refugio en vez de correr
  const cards: CardData[] = [];
  if (scaffolds.length && rand() < 0.55) {
    cards.push({ col: pick(scaffolds).col, good: true, label: pick(goodItemsFor('shipyard')), collected: false });
  }

  return {
    index,
    type: 'gantry',
    theme: 'shipyard',
    stacks: [],
    decor: makeDecor(index, 'shipyard'),
    vehicles: [],
    cranes: [{ x, prevX: x, speed: pick(BALANCE.GANTRY_SPEEDS) * BALANCE.TILE, direction }],
    cards,
    scaffolds,
  };
}

/**
 * DIQUE VERTICAL — la seña del patio del astillero. Un foso de `width`
 * columnas que corre `len` filas A LO LARGO del recorrido (como un dique seco
 * de verdad: excavado perpendicular al muelle), con un buque mediano apeado
 * dentro si hay fondo para él. Se cruza por su CADENA DE ANDAMIOS — una
 * pasarela por fila, todas en la MISMA columna, en un borde de la banda — o se
 * rodea por los costados.
 *
 * Esta función siembra la fila CABEZA y deja en `vdock` lo que falta; las
 * filas siguientes las devuelve `continueVDockRow` (el generador es
 * secuencial). Devuelve null si no hay fondo (len < 2) o no hay colocación
 * válida contra la fila anterior.
 */
function startVDockRow(index: number): RowData | null {
  // RESPIRO entre diques: dos fosos pegados comparten muro y se leen como una
  // sola excavación (justo lo que se veía en el astillero). Además el jugador
  // necesita una fila de patio para recolocarse antes del siguiente.
  if (index - lastVDockEnd <= BALANCE.VDOCK_MIN_GAP) return null;

  // Fondo disponible: filas del mismo bioma, lejos del dique mayor (sus dos
  // filas vecinas tienen que quedar despejadas — ahí aterriza el izado)
  // `number`, no la unión literal de VDOCK_LEN: se recorta abajo con el fondo
  // realmente disponible antes del dique mayor o de la frontera de bioma
  let len: number = pick(BALANCE.VDOCK_LEN);
  let disponible = 0;
  for (let k = 0; k < len; k++) {
    const i = index + k;
    if (zoneOf(i) !== 'shipyard') break;
    if (Math.abs((i % BALANCE.ZONE_LENGTH) - BALANCE.MEGADOCK_POS) <= 1) break;
    disponible++;
  }
  len = Math.min(len, disponible);
  // Menos de 3 filas de fondo ya no se lee como dique seco: mejor patio normal
  if (len < 3) return null;

  // Colocación: la cadena de andamios va en un BORDE de la banda, para que el
  // buque se apee al costado contrario sin que la pasarela lo atraviese. Se
  // valida contra la fila anterior para que `ensurePassable` nunca tenga que
  // perforar el foso (se llevaría el DockData entero y dejaría huérfanos los
  // segmentos de continuación).
  const width = pick(BALANCE.VDOCK_WIDTH);
  const prev = rows[index - 1];
  const prevBlocked = prev ? blockedCols(prev) : new Set<number>();
  for (let intento = 0; intento < BALANCE.VDOCK_TRIES; intento++) {
    const col = BALANCE.MIN_TILE + 1 + Math.floor(rand() * (BALANCE.MAX_TILE - BALANCE.MIN_TILE - width));
    const bridge = rand() < 0.5 ? col : col + width - 1;
    if (!vdockFits(prevBlocked, col, width, bridge)) continue;
    const ship = len >= 4 && rand() < BALANCE.VDOCK_SHIP_CHANCE;
    const flooded = !ship && rand() < 0.35;
    vdock = { col, tiles: width, bridge, flooded, ship, rowsLeft: len - 1 };
    lastVDockEnd = index + len - 1;
    // Premio sobre el primer andamio de la cadena: paga cruzar por encima
    const cards: CardData[] = [];
    if (rand() < 0.45) cards.push({ col: bridge, good: true, label: pick(goodItemsFor('shipyard')), collected: false });
    return {
      index,
      type: 'yard',
      theme: 'shipyard',
      stacks: [],
      decor: makeDecor(index, 'shipyard'),
      vehicles: [],
      cranes: [],
      cards,
      docks: [{ col, tiles: width, flooded, bridge, ship, len }],
    };
  }
  return null;
}

/** ¿Puede plantarse aquí la banda del dique sin encerrar a nadie? Ningún tramo
 *  libre de la fila anterior puede quedar tapado POR COMPLETO por el foso —
 *  es la misma condición que dispara `ensurePassable`, comprobada antes. */
function vdockFits(prevBlocked: Set<number>, col: number, width: number, bridge: number): boolean {
  const tapado = (c: number) => c >= col && c < col + width && c !== bridge;
  let tramo: number[] = [];
  for (let c = BALANCE.MIN_TILE; c <= BALANCE.MAX_TILE + 1; c++) {
    if (c > BALANCE.MAX_TILE || prevBlocked.has(c)) {
      if (tramo.length && tramo.every(tapado)) return false;
      tramo = [];
    } else {
      tramo.push(c);
    }
  }
  return true;
}

/** Fila de CONTINUACIÓN del dique vertical: mismo foso, mismo andamio. La
 *  cadena TIENE que quedar alineada columna a columna: un andamio desplazado
 *  sería una trampa sin salida (no se puede retroceder). */
function continueVDockRow(index: number): RowData {
  const d = vdock!;
  d.rowsLeft--;
  if (d.rowsLeft <= 0) vdock = null;
  const cards: CardData[] = [];
  if (rand() < 0.25) cards.push({ col: d.bridge, good: true, label: pick(goodItemsFor('shipyard')), collected: false });
  return {
    index,
    type: 'yard',
    theme: 'shipyard',
    stacks: [],
    decor: makeDecor(index, 'shipyard'),
    vehicles: [],
    cranes: [],
    cards,
    docks: [{ col: d.col, tiles: d.tiles, flooded: d.flooded, bridge: d.bridge, ship: d.ship, cont: true }],
  };
}

/** ¿Hay una banda en las últimas BELT_MIN_GAP filas? */
function beltNear(index: number): boolean {
  for (let i = index - 1; i >= 0 && i >= index - BALANCE.BELT_MIN_GAP; i--) {
    if (rows[i]?.type === 'belt') return true;
  }
  return false;
}

/**
 * Fila de la TERMINAL MULTIPROPÓSITO. Tres sabores:
 *  - BANDA transportadora: no mata, arrastra. Es el verbo del bioma.
 *  - PATIO DE MANIOBRA: convoy de tolvas de granel (pegadas, con un solo hueco
 *    por vuelta) o cargadoras de pala repartidas cruzando el patio.
 *  - PATIO de carga general: bobinas, tubería y pacas como bloqueo.
 *
 * Dos bandas seguidas se descartan: encadenar arrastres deja al jugador sin
 * control real durante dos filas y eso deja de leerse como mecánica.
 */
function generateMultiRow(index: number): RowData {
  if (index < BALANCE.SAFE_START_ROWS) return generateYardRow(index);
  const roll = rand();
  if (roll < BALANCE.BELT_ROW_CHANCE && !beltNear(index)) return generateBeltRow(index);
  if (roll < BALANCE.BELT_ROW_CHANCE + BALANCE.BULK_ROW_CHANCE && roadStreak(index) < roadStreakLimitFor(index)) {
    return generateBulkRow(index);
  }
  return generateYardRow(index);
}

/**
 * BANDA TRANSPORTADORA: fila segura cuyo suelo corre. Lleva premio encima
 * porque el arrastre convierte una recogida trivial en una de tiempo: la
 * tarjeta pasa por delante y hay que saltar cuando toca.
 */
function generateBeltRow(index: number): RowData {
  const direction: 1 | -1 = rand() < 0.5 ? 1 : -1;
  return {
    index,
    type: 'belt',
    theme: 'multi',
    stacks: [],
    decor: makeDecor(index, 'multi'),
    vehicles: [],
    cranes: [],
    cards: spawnCards(index, 'multi', new Set(), 0.65, 0.15),
    // El arrastre aprieta con la distancia: la misma banda descoloca más
    // lejos que cerca, así que la corrección hay que hacerla antes.
    belt: { direction, speed: beltSpeedFor(index) },
  };
}

/**
 * PATIO DE MANIOBRA de TUM. Dos sabores con ritmo distinto:
 *  - TOLVAS de granel en convoy cerrado: un solo hueco por vuelta, hay que
 *    cronometrarlo (la fila que se forma bajo la torre de carga).
 *  - CARGADORAS de pala repartidas: lentas y separadas, se cruzan a pie firme.
 */
function generateBulkRow(index: number): RowData {
  const direction: 1 | -1 = rand() < 0.5 ? 1 : -1;
  const tolvas = rand() < BALANCE.HOPPER_ROW_SHARE;
  const kind: VehicleKind = tolvas ? 'hopper' : 'loader';
  const speeds = tolvas ? BALANCE.HOPPER_SPEEDS : BALANCE.LOADER_SPEEDS;
  const tiles = tolvas ? BALANCE.HOPPER_TILES : BALANCE.LOADER_TILES;
  const count = tolvas ? BALANCE.HOPPER_COUNT : BALANCE.LOADER_COUNT;
  const speed = pick(speeds) * speedFactorForRow(index) * BALANCE.TILE;
  const vehicles: VehicleData[] = [];
  for (let i = 0; i < count; i++) {
    vehicles.push({ x: 0, prevX: 0, tiles, speed, direction, kind, colorIndex: Math.floor(rand() * 4) });
  }
  // Las tolvas van pegadas (convoy); las palas, repartidas por el patio
  spreadOnWrapCycle(vehicles, 'road', tolvas ? tiles + BALANCE.HOPPER_GAP_TILES : undefined);
  return {
    index,
    type: 'road',
    theme: 'multi',
    stacks: [],
    decor: [],
    vehicles,
    cranes: [],
    cards: spawnCards(index, 'multi', new Set(), 0.3, 0.12),
  };
}

/** Antesala y salida del dique mayor: patio SIN bloqueos (ver generateRow) */
function clearShipyardYard(index: number): RowData {
  return {
    index,
    type: 'yard',
    theme: 'shipyard',
    stacks: [],
    decor: makeDecor(index, 'shipyard'),
    vehicles: [],
    cranes: [],
    cards: spawnCards(index, 'shipyard', new Set(), 0.4, 0.1),
  };
}

/**
 * DIQUE MAYOR — el tapón monumental del astillero. Un dique seco de lado a
 * lado del tablero con un buque GRANDE en reparación dentro: no se puede
 * rodear. Dos maneras de cruzarlo:
 *
 *  1. ANDAMIOS en los flancos (donde el casco no llega): pasarelas elevadas
 *     sobre el foso, una por costado, mecánica de las filas 'gantry'.
 *  2. La GRÚA DEL DIQUE, que recorre la fila sin parar: si su gancho pasa por
 *     tu columna cuando intentas avanzar, te IZA por encima del buque y te
 *     deposita al otro lado (ver `megaDockCarry` + playerLogic).
 *
 * El muro se modela en SEGMENTOS de DockData con hueco en las columnas de
 * andamio: así `isBlocked` deja pasar por ellas y `standHeight` las eleva sin
 * tocar ni una línea de la lógica existente.
 */
function generateMegaDockRow(index: number): RowData {
  // PUNTO DE EMBARQUE de la grúa, cerca del centro (donde está el casco y no
  // hay pasarela posible); las PASARELAS, repartidas a los lados con separación
  const padCol = Math.floor(rand() * 5) - 2;
  // SIEMPRE dos pasarelas, una por costado: se sortea entre las columnas del
  // flanco que no chocan con el pad (antes se descartaba la que caía pegada y
  // el dique podía quedarse con una sola ruta a pie).
  const scaffolds: ScaffoldData[] = [];
  for (const side of [-1, 1]) {
    const libres = [3, 4, 5, 6].map((c) => side * c).filter((c) => Math.abs(c - padCol) >= 2);
    scaffolds.push({ col: pick(libres), y: BALANCE.MEGADOCK_WALK_Y });
  }

  const docks: DockData[] = [];
  const gaps = scaffolds.map((s) => s.col).sort((a, b) => a - b);
  let start = BALANCE.MIN_TILE;
  for (const gap of gaps) {
    if (gap > start) docks.push({ col: start, tiles: gap - start, flooded: false, ship: true, mega: true });
    start = gap + 1;
  }
  if (start <= BALANCE.MAX_TILE) {
    docks.push({ col: start, tiles: BALANCE.MAX_TILE - start + 1, flooded: false, ship: true, mega: true });
  }

  // Premio sobre una pasarela: paga cruzar por encima del buque
  const cards: CardData[] = [];
  if (rand() < 0.6) cards.push({ col: pick(scaffolds).col, good: true, label: pick(goodItemsFor('shipyard')), collected: false });

  // La grúa vive PARADA sobre el punto de embarque: es un ascensor, no patrulla
  const x = colX(padCol);
  return {
    index,
    type: 'yard',
    theme: 'shipyard',
    stacks: [],
    decor: [], // el dique ocupa el encuadre entero; decorado aparte sobraría
    vehicles: [],
    cranes: [{ x, prevX: x, speed: 0, direction: 1 }],
    cards,
    docks,
    scaffolds,
    padCol,
  };
}

/** ¿Puede la grúa del dique AVENTAR a alguien que avanza desde esta columna?
 *  Solo desde el PUNTO DE EMBARQUE — ahí está parada con el gancho abajo. */
export function megaDockCarry(rowIndex: number, col: number): boolean {
  const row = rows[rowIndex];
  return row?.padCol === col && (row.docks?.some((d) => d.mega) ?? false);
}

/** Fila TILH: vía férrea con tren de carga (rápido, con semáforo de aviso) o
 *  patio intermodal seguro, nunca más de MAX_ROAD_STREAK vías seguidas. */
function generateRailBiomeRow(index: number): RowData {
  const zoneStart = Math.floor(index / BALANCE.ZONE_LENGTH) * BALANCE.ZONE_LENGTH;
  if (index === zoneStart + 1) return generateYardRow(index); // andén de entrada
  if (roadStreak(index) >= roadStreakLimitFor(index)) return generateYardRow(index);
  return rand() < BALANCE.RAIL_ROW_CHANCE ? generateTrainRow(index) : generateYardRow(index);
}

/**
 * Vía férrea TILH: UN tren largo y veloz por fila. El wrap lleva un aire extra
 * (TRAIN_GAP_TILES) para que haya pausa entre pasadas; el semáforo del borde
 * parpadea en rojo cuando el tren está por entrar (render lo deriva de x).
 */
function generateTrainRow(index: number): RowData {
  const direction: 1 | -1 = rand() < 0.5 ? 1 : -1;
  const speed = pick(BALANCE.TRAIN_SPEEDS) * BALANCE.TILE;
  // Arranca lejos, fuera del tablero, para dar aviso desde el inicio
  const startX = -direction * colX(BALANCE.MAX_TILE + 6 + Math.floor(rand() * BALANCE.TRAIN_GAP_TILES));
  return {
    index,
    type: 'rail',
    theme: 'rail',
    stacks: [],
    decor: [],
    vehicles: [
      { x: startX, prevX: startX, tiles: BALANCE.TRAIN_TILES, speed, direction, kind: 'train', colorIndex: Math.floor(rand() * 4) },
    ],
    cranes: [],
    cards: spawnCards(index, 'rail', new Set(), 0.3, 0.1),
  };
}

/** Cuenta filas de AGUA consecutivas hacia atrás (para intercalar muelles) */
function waterStreak(index: number): number {
  let s = 0;
  for (let i = index - 1; i >= 0 && rows[i] && rows[i].type === 'water'; i--) s++;
  return s;
}

/** Cuenta filas de TABLADO consecutivas hacia atrás — muelles y el arco de
 *  entrada, que se apoya en el mismo pontón. */
function dockStreak(index: number): number {
  let s = 0;
  for (
    let i = index - 1;
    i >= 0 && rows[i] && rows[i].theme === 'cruise' && (rows[i].type === 'dock' || rows[i].type === 'gate');
    i--
  ) {
    s++;
  }
  return s;
}

/**
 * Fila de la terminal de cruceros: la primera tras el arco es un muelle de
 * embarque; a partir de ahí se alternan filas de AGUA (barcazas a abordar) con
 * muelles de descanso.
 *
 * El sorteo va acotado por los DOS lados. Antes solo había tope de agua, así que
 * la moneda 50/50 encadenaba rachas de cinco y seis muelles: el bioma se veía
 * como un tablado de madera corrido —el suelo repetido hasta el horizonte— y no
 * había nada que hacer en él. Ahora nunca hay más de MAX_DOCK_STREAK pontones
 * seguidos, y a cambio el agua puede encadenar una segunda fila de vez en cuando
 * (saltar de barcaza a barcaza, que es la gracia del bioma).
 */
function generateCruiseRow(index: number): RowData {
  const zoneStart = Math.floor(index / BALANCE.ZONE_LENGTH) * BALANCE.ZONE_LENGTH;
  if (index === zoneStart + 1) return generateDockRow(index); // muelle de embarque
  const agua = waterStreak(index);
  if (agua >= BALANCE.MAX_WATER_STREAK) return generateDockRow(index);
  // Detrás de un crucero siempre va muelle: encadenar agua le metería un vecino
  // dentro de la manga (ver `prevRowIsWater`)
  if (prevWaterHasShip(index)) return generateDockRow(index);
  if (dockStreak(index) >= BALANCE.MAX_DOCK_STREAK) return generateWaterRow(index);
  const p = agua > 0 ? BALANCE.WATER_CHAIN_CHANCE : BALANCE.WATER_ROW_CHANCE;
  return rand() < p ? generateWaterRow(index) : generateDockRow(index);
}

/** Acabado del pontón, distinto del de la fila anterior: dos muelles seguidos
 *  con el mismo tablado se leen como uno solo del doble de fondo. */
function pickDeckVariant(index: number): number {
  const previo = rows[index - 1]?.deck;
  const v = Math.floor(rand() * BALANCE.DECK_VARIANTS);
  if (v !== previo) return v;
  return (v + 1 + Math.floor(rand() * (BALANCE.DECK_VARIANTS - 1))) % BALANCE.DECK_VARIANTS;
}

/** FRONTERA entre terminales — fila segura con premio al centro. Ya no lleva
 *  arco ni letrero: el cambio de unidad de negocio lo anuncia el sello del
 *  pasaporte, y el decorado de la terminal nueva se ve venir por sí solo. */
function generateGateRow(index: number): RowData {
  const cards: CardData[] = [];
  if (rand() < 0.6) cards.push({ col: 0, good: true, label: pick(goodItemsFor(zoneOf(index))), collected: false });
  return {
    index,
    type: 'gate',
    theme: zoneOf(index),
    stacks: [],
    decor: makeDecor(index, zoneOf(index)),
    vehicles: [],
    cranes: [],
    cards,
    // En cruceros el arco se apoya en el andén de hormigón del atraque: así no
    // arranca la terminal con dos tablados de madera pegados.
    deck: 1,
  };
}

/**
 * Fila segura por bioma. Bloqueos (equivalentes a los 4 árboles del tutorial):
 * contenedores (LCT/TILH) o piezas de astillero — hélices, andamios (TNG).
 * En el mar (cruise) no hay bloqueos: se descansa en los muelles.
 * (Los DIQUES del astillero ya no se siembran aquí: son estructuras de varias
 * filas y las gestiona `startVDockRow`/`continueVDockRow`.)
 */
function generateYardRow(index: number): RowData {
  const theme = zoneOf(index);
  const occupied = new Set<number>();
  const stacks: StackData[] = [];

  if (theme !== 'cruise') {
    // TUM mueve carga general (bobinas, tubería, pacas): eso no se apila tres
    // alturas como un contenedor, así que el bloqueo es bajo y ancho.
    const maxHeight = theme === 'multi' ? 2 : 3;
    for (let i = 0; i < 2; i++) {
      let col = randomCol();
      while (occupied.has(col)) col = randomCol();
      occupied.add(col);
      stacks.push({ col, height: 1 + Math.floor(rand() * maxHeight), colorIndex: Math.floor(rand() * 4) });
    }
  }
  return {
    index,
    type: 'yard',
    theme,
    stacks,
    decor: makeDecor(index, theme),
    vehicles: [],
    cranes: [],
    cards: spawnCards(index, theme, occupied, 0.5, 0.18),
  };
}

/**
 * El CRUCERO solo navega en filas de agua AISLADAS (sin otra fila de agua ni
 * delante ni detrás).
 *
 * Su manga es 1.8 y la fila mide 1.1 de fondo: se sale 0.35 por cada costado.
 * Contra un muelle no se nota —se lee como un barco atracado—, pero contra otra
 * fila de agua se come el canal del vecino y parece que los barcos van a
 * chocar. Como al generar la fila N la N+1 aún no existe, la regla se aplica
 * por los dos lados: aquí se mira hacia atrás, y `generateCruiseRow` se niega a
 * encadenar agua detrás de una fila con crucero.
 */
function prevRowIsWater(index: number): boolean {
  return rows[index - 1]?.type === 'water';
}

function prevWaterHasShip(index: number): boolean {
  const prev = rows[index - 1];
  return prev?.type === 'water' && prev.vehicles.some((v) => v.kind === 'ship');
}

/** Sorteo ponderado de la flota: el remolcador sale más que el resto */
function pickBoat(): (typeof BALANCE.BOAT_FLEET)[number] {
  const total = BALANCE.BOAT_FLEET.reduce((a, b) => a + b.weight, 0);
  let r = rand() * total;
  for (const b of BALANCE.BOAT_FLEET) {
    r -= b.weight;
    if (r <= 0) return b;
  }
  return BALANCE.BOAT_FLEET[0];
}

/**
 * Fila de AGUA (fatal): la flota de la dársena cruza el canal y el jugador DEBE
 * aterrizar sobre una cubierta para no caer al mar; montado, la embarcación lo
 * arrastra en X hasta que salte a la siguiente fila (mecánica río de Crossy).
 *
 * La flota se sortea de `BALANCE.BOAT_FLEET` — remolcadores sobre todo, más
 * veleros, yates y pesqueros — y como mucho un crucero, que es la pieza
 * monumental del bioma. Se retiran embarcaciones hasta que quepa el agua libre
 * mínima entre cascos (`BOAT_MIN_GAP`).
 */
function generateWaterRow(index: number): RowData {
  const direction: 1 | -1 = rand() < 0.5 ? 1 : -1;
  const vehicles: VehicleData[] = [];

  const withShip = rand() < BALANCE.SHIP_ROW_CHANCE && !prevRowIsWater(index);
  // Todos comparten velocidad: es lo que mantiene invariante la separación
  const speed = withShip
    ? pick(BALANCE.SHIP_SPEEDS) * BALANCE.TILE
    : pick(BALANCE.BOAT_SPEEDS) * speedFactorForRow(index) * BALANCE.TILE;

  if (withShip) {
    vehicles.push({
      x: 0, prevX: 0,
      tiles: BALANCE.SHIP_DECK_TILES,
      visualTiles: BALANCE.SHIP_TILES,
      speed, direction, kind: 'ship', colorIndex: 0,
    });
  }
  for (let i = vehicles.length; i < BALANCE.BOAT_COUNT; i++) {
    const tipo = pickBoat();
    vehicles.push({
      x: 0, prevX: 0,
      tiles: tipo.tiles,
      visualTiles: tipo.visual,
      speed, direction, kind: tipo.kind, colorIndex: Math.floor(rand() * 4),
      sink: 0, sinkVel: 0, boarded: false,
    });
  }
  // Si no cabe el agua libre mínima, sobra una embarcación (nunca el crucero)
  while (vehicles.length > 1 && spreadFleet(vehicles) < BALANCE.BOAT_MIN_GAP) {
    vehicles.pop();
  }

  // Sin tarjetas en el agua (inalcanzables); van en los muelles
  return { index, type: 'water', theme: 'cruise', stacks: [], decor: makeDecor(index, 'cruise'), vehicles, cranes: [], cards: [] };
}

/**
 * Reparte la flota de una fila dejando la MISMA agua libre entre cascos
 * consecutivos, y devuelve cuánta.
 *
 * `spreadOnWrapCycle` reparte los CENTROS a distancias iguales, que vale
 * mientras todos midan parecido. En el agua no: un crucero de 8.8 junto a
 * remolcadores de 4.4 se come su parte del reparto por el casco y deja a sus
 * vecinos casi tocándolo — que es de donde venía la sensación de barcos
 * chocando. Aquí se reparte el AGUA, no los centros.
 */
function spreadFleet(vehicles: VehicleData[]): number {
  if (vehicles.length === 0) return Infinity;
  let half = 0;
  for (const v of vehicles) half = Math.max(half, ((v.visualTiles ?? v.tiles) * BALANCE.TILE) / 2);
  const minX = colX(BALANCE.MIN_TILE - BALANCE.WRAP_MARGIN) - half;
  const maxX = colX(BALANCE.MAX_TILE + BALANCE.WRAP_MARGIN) + half;
  const cycle = maxX - minX;

  const largos = vehicles.map((v) => (v.visualTiles ?? v.tiles) * BALANCE.TILE);
  const casco = largos.reduce((a, b) => a + b, 0);
  const libre = (cycle - casco) / vehicles.length;
  if (libre <= 0) return libre;

  const phase = rand() * cycle;
  let cursor = 0;
  vehicles.forEach((v, i) => {
    v.x = v.prevX = minX + ((phase + cursor + largos[i] / 2) % cycle);
    cursor += largos[i] + libre;
  });
  return libre;
}

/**
 * Reparte los vehículos de una fila a distancias IGUALES del ciclo de wrap.
 *
 * Como comparten velocidad y ciclo (ver `rowWrapBounds` en traffic.ts), esa
 * separación no cambia nunca: no se alcanzan, no se solapan y siempre hay una
 * plataforma acercándose. Antes se sembraban en columnas al azar y con ciclos
 * distintos por vehículo, así que acababan montándose unas sobre otras.
 *
 * `stepTiles` rompe el reparto uniforme para formar un CONVOY (Ro-Ro de TUM):
 * los vehículos van pegados a una distancia fija y todo el aire del ciclo se
 * junta en un solo hueco, que es por donde hay que colarse.
 */
function spreadOnWrapCycle(vehicles: VehicleData[], type: RowType, stepTiles?: number) {
  if (vehicles.length === 0) return;
  const gap = type === 'rail' ? BALANCE.WRAP_MARGIN + BALANCE.TRAIN_GAP_TILES : BALANCE.WRAP_MARGIN;
  let half = 0;
  for (const v of vehicles) half = Math.max(half, ((v.visualTiles ?? v.tiles) * BALANCE.TILE) / 2);
  const minX = colX(BALANCE.MIN_TILE - gap) - half;
  const maxX = colX(BALANCE.MAX_TILE + gap) + half;
  const cycle = maxX - minX;
  const step = stepTiles === undefined ? cycle / vehicles.length : stepTiles * BALANCE.TILE;
  const phase = rand() * cycle;
  vehicles.forEach((v, i) => {
    v.x = v.prevX = minX + ((phase + i * step) % cycle);
  });
}

/** Muelle/pontón flotante SEGURO — descanso entre aguas y tarjetas de concepto */
function generateDockRow(index: number): RowData {
  return {
    index,
    type: 'dock',
    theme: 'cruise',
    stacks: [],
    decor: makeDecor(index, 'cruise'),
    vehicles: [],
    cranes: [],
    cards: spawnCards(index, 'cruise', new Set(), 0.5, 0.2),
    deck: pickDeckVariant(index),
  };
}

/**
 * Tráfico rodado por bioma. LCT: AGVs (3 casillas) o camiones (5), como el
 * tutorial. TNG (astillero): SIN camiones — montacargas de patio naval
 * (2 casillas, más lentos y numerosos), equipo real de un astillero.
 */
function generateRoadRow(index: number): RowData {
  const shipyard = zoneOf(index) === 'shipyard';
  // LCT es "puro camión y contenedor": el tráfico rodado son SOLO camiones
  const kind: VehicleKind = shipyard ? 'forklift' : 'truck';
  const count = kind === 'forklift' ? 2 : 2;
  const tiles = kind === 'forklift' ? 2 : kind === 'truck' ? 5 : 3;
  const direction = rand() < 0.5 ? 1 : -1;
  const speedScale = shipyard ? 0.78 : 1; // los montacargas van más despacio
  const speed = pick(BALANCE.VEHICLE_SPEEDS) * speedFactorForRow(index) * BALANCE.TILE * speedScale;

  const vehicles: VehicleData[] = [];
  for (let i = 0; i < count; i++) {
    vehicles.push({ x: 0, prevX: 0, tiles, speed, direction, kind, colorIndex: Math.floor(rand() * 4) });
  }
  // Repartidos a distancias iguales: al sembrarlos en columnas al azar salían
  // pegados de dos en dos y cerraban la fila entera.
  spreadOnWrapCycle(vehicles, 'road');
  // Tarjetas flotando sobre la vía: recompensa con riesgo
  return {
    index,
    type: 'road',
    theme: zoneOf(index),
    stacks: [],
    decor: [],
    vehicles,
    cranes: [],
    cards: spawnCards(index, zoneOf(index), new Set(), 0.3, 0.12),
  };
}

/** Grúa RTG móvil: recorre la fila; peligro = patas, hueco central = seguro */
function generateCraneRow(index: number): RowData {
  const x = colX(randomCol());
  return {
    index,
    type: 'crane',
    theme: zoneOf(index),
    stacks: [],
    decor: makeDecor(index, zoneOf(index)),
    vehicles: [],
    cranes: [
      {
        x,
        prevX: x,
        speed: BALANCE.CRANE_SPEED * BALANCE.TILE,
        direction: rand() < 0.5 ? 1 : -1,
      },
    ],
    cards: spawnCards(index, zoneOf(index), new Set(), 0.6, 0.1),
  };
}

/**
 * Skyline: elementos decorativos fuera del tablero jugable, a ambos lados.
 *
 * REGLA: nada que ocupe más que una fila puede sembrarse fila a fila. El almacén
 * del astillero mide 3.2 de fondo —casi tres filas— y se sorteaba en cada una:
 * medido sobre el mapa generado, 15 de cada 19 almacenes se solapaban con otro y
 * el patio se leía como un amontonamiento de techos. Las piezas grandes van por
 * CADENCIA de filas (una cada N, y cada costado en su propia fase), no por azar;
 * el azar se queda para las piezas que caben en su casilla.
 */
/** Fondo del almacén: 3.2 → hacen falta tres filas de aire entre dos */
const WAREHOUSE_EVERY = 5;
/** La pluma de la grúa vuela 3.2 en X: repetirla seguido llena el horizonte */
const JIB_EVERY = 7;

function makeDecor(index = 0, theme: ZoneTheme = 'port'): StackData[] {
  const decor: StackData[] = [];

  // MARINA (ECV): la dársena está cerrada por terminales macizas de 4.4 de alto
  // que arrancan en x 9.5. Todo lo que se sembraba más allá (barcos y cruceros
  // amarrados a x 13-21) quedaba DENTRO del edificio: nunca se vio ni un casco,
  // y aun así se dibujaba. Aquí no va decorado; los remolcadores que sí se ven
  // los coloca el mapa en el canal de las filas de agua.
  if (theme === 'cruise') return decor;

  for (let side = -1; side <= 1; side += 2) {
    const fase = side === 1 ? 0 : Math.floor(WAREHOUSE_EVERY / 2);
    const faseJib = side === 1 ? 2 : 2 + Math.floor(JIB_EVERY / 2);

    if (theme === 'shipyard') {
      // Piezas GRANDES por cadencia: como mucho una de cada por costado y fila
      if ((index + fase) % WAREHOUSE_EVERY === 0) {
        decor.push({
          col: side * (BALANCE.MAX_TILE + 5),
          height: 2,
          colorIndex: Math.floor(rand() * 4),
          kind: 'warehouse',
        });
      }
      if ((index + faseJib) % JIB_EVERY === 0) {
        decor.push({
          col: side * (BALANCE.MAX_TILE + 2 + Math.floor(rand() * 2)),
          height: 2,
          colorIndex: Math.floor(rand() * 4),
          kind: 'jib',
        });
      }
      // Piezas pequeñas (hélices, secciones de casco): caben en su casilla
      if (rand() < 0.55) {
        decor.push({
          col: side * (BALANCE.MAX_TILE + 2 + Math.floor(rand() * 5)),
          height: 2 + Math.floor(rand() * 3),
          colorIndex: Math.floor(rand() * 4),
          kind: 'block',
        });
      }
      continue;
    }

    if (theme === 'multi') {
      // Baterías de silos y grúa móvil de gancho: piezas grandes, por cadencia
      // (misma regla que el almacén del astillero — nada que ocupe más de una
      // fila puede sortearse fila a fila sin acabar amontonado).
      if ((index + fase) % WAREHOUSE_EVERY === 0) {
        decor.push({ col: side * (BALANCE.MAX_TILE + 5), height: 3, colorIndex: Math.floor(rand() * 4), kind: 'silo' });
      }
      if ((index + faseJib) % JIB_EVERY === 0) {
        decor.push({ col: side * (BALANCE.MAX_TILE + 3), height: 2, colorIndex: Math.floor(rand() * 4), kind: 'mobile' });
      }
      // Carga general suelta en el muelle: bobinas, tubería, pacas
      if (rand() < 0.6) {
        decor.push({
          col: side * (BALANCE.MAX_TILE + 2 + Math.floor(rand() * 5)),
          height: 1 + Math.floor(rand() * 2),
          colorIndex: Math.floor(rand() * 4),
          kind: 'cargo',
        });
      }
      continue;
    }

    // LCT / TILH: pilas de contenedor, de 1×1 — el azar aquí no solapa nada
    const count = 1 + Math.floor(rand() * 2);
    for (let i = 0; i < count; i++) {
      decor.push({
        col: side * (BALANCE.MAX_TILE + 2 + Math.floor(rand() * 5)),
        height: 2 + Math.floor(rand() * 3),
        colorIndex: Math.floor(rand() * 4),
        kind: 'stack',
      });
    }
  }
  return decor;
}

/**
 * Tarjetas de una fila, con el vocabulario DE SU TERMINAL: cada unidad de
 * negocio tiene sus propios temas (ver `TERMINAL_ITEMS`), así que cruzar TEC
 * pregunta por ciberseguridad y cruzar ECV por nomenclatura naval. Es lo que
 * convierte el recorrido en cinco terminales distintas y no en una sola con
 * cinco decorados.
 */
function spawnCards(
  index: number,
  theme: ZoneTheme,
  occupied: Set<number>,
  pGood: number,
  pBad: number,
): CardData[] {
  const cards: CardData[] = [];
  // La densidad NO es fija: las verdes escasean y las rojas abundan conforme
  // se avanza (ver `difficultyForRow`). `pGood`/`pBad` son el reparto base de
  // cada tipo de fila; la profundidad los inclina.
  if (rand() < goodChanceFor(index, pGood)) {
    const col = freeCol(occupied);
    if (col !== null) {
      occupied.add(col);
      cards.push({ col, good: true, label: pick(goodItemsFor(theme)), collected: false });
    }
  }
  if (rand() < badChanceFor(index, pBad)) {
    const col = freeCol(occupied);
    if (col !== null) {
      occupied.add(col);
      cards.push({ col, good: false, label: pick(badItemsFor(theme)), collected: false });
    }
  }
  return cards;
}

function randomCol(): number {
  return BALANCE.MIN_TILE + Math.floor(rand() * (BALANCE.MAX_TILE - BALANCE.MIN_TILE + 1));
}

function freeCol(occupied: Set<number>, tries = 12): number | null {
  for (let i = 0; i < tries; i++) {
    const col = randomCol();
    if (!occupied.has(col)) return col;
  }
  return null;
}

/** Validación de destino (tutorial: `endsUpInValidPosition`) */
export function isBlocked(rowIndex: number, col: number): boolean {
  if (col < BALANCE.MIN_TILE || col > BALANCE.MAX_TILE) return true;
  if (rowIndex < 0) return true;
  const row = rows[rowIndex];
  if (!row) return false; // aún no generada — se permitirá al generarse
  // El foso del dique bloquea salvo en la columna de la pasarela
  if (row.docks?.some((d) => col >= d.col && col < d.col + d.tiles && col !== d.bridge)) return true;
  return row.stacks.some((s) => s.col === col);
}

/** Altura sobre la que se apoya el colaborador en esa casilla: andamio de una
 *  fila de grúa pórtico o pasarela de un dique. 0 = suelo. */
export function standHeight(rowIndex: number, col: number): number {
  const row = rows[rowIndex];
  if (!row) return 0;
  // Cota propia del andamio: las pasarelas del dique mayor van por ENCIMA del
  // buque (MEGADOCK_WALK_Y); las demás, a la altura estándar de taller.
  const sc = row.scaffolds?.find((s) => s.col === col);
  if (sc) return sc.y ?? BALANCE.SCAFFOLD_Y;
  if (row.docks?.some((d) => d.bridge === col)) return BALANCE.SCAFFOLD_Y;
  return 0;
}

/** ¿Esta casilla queda por ENCIMA de la viga de la grúa pórtico? (refugio) */
export function isSheltered(rowIndex: number, col: number): boolean {
  return standHeight(rowIndex, col) > 0;
}

export function cardAt(rowIndex: number, col: number): CardData | undefined {
  return rows[rowIndex]?.cards.find((c) => !c.collected && c.col === col);
}

/**
 * Tarjeta que el colaborador tiene AHORA MISMO bajo los pies, buscada por
 * posición real en X y no por casilla lógica.
 *
 * Es la que hace falta allí donde el suelo se mueve (la BANDA de TUM, la
 * cubierta de una barcaza): ahí la X del colaborador es continua y la casilla
 * es una redondeo, así que preguntar «¿hay tarjeta en mi casilla?» se pierde
 * las que le pasan por debajo entre frame y frame.
 *
 * `PICKUP_RADIUS` es media casilla: se recoge lo que se pisa y ni un dedo más
 * — con un radio mayor se recogerían tarjetas de la casilla de al lado, que es
 * justo lo que rompería las rojas (esquivarlas es la mecánica).
 */
export function cardNearX(rowIndex: number, x: number): CardData | undefined {
  return rows[rowIndex]?.cards.find(
    (c) => !c.collected && Math.abs(colX(c.col) - x) <= BALANCE.PICKUP_RADIUS,
  );
}

/** Fila de agua fatal (hay que ir sobre una barcaza) */
export function isWaterRow(rowIndex: number): boolean {
  return rows[rowIndex]?.type === 'water';
}

/** Fila donde el jugador puede pararse sin caer (todo menos agua) */
export function isSafeRow(rowIndex: number): boolean {
  const r = rows[rowIndex];
  return !r || r.type !== 'water';
}

/** CARRERA DIARIA: con ?daily en la URL, todos juegan el mismo mapa del día */
function dailyRng(): (() => number) | undefined {
  if (typeof window === 'undefined' || !window.location.search.includes('daily')) return undefined;
  const d = new Date();
  let seed = d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Cada partida nueva (store.startGame → runtime.reset) regenera el mapa
runtime.resetCallbacks.push(() => resetRows(dailyRng() ?? Math.random));
