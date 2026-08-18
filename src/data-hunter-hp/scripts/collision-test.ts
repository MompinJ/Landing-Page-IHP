/**
 * Test de COLISIÓN (Problema 2): barre al jugador por una rejilla de posiciones
 * alrededor de un camión y compara el veredicto del motor con el SOLAPE REAL
 * de las cajas dibujadas (medidas con scripts/measure-hitboxes.ts).
 *
 *  - falso positivo = golpe sin que los modelos se toquen  ← el bug reportado
 *  - falso negativo = modelos claramente solapados sin golpe
 *
 * Incluye el predicado ANTIGUO para tener el antes/después en la misma tabla.
 *
 *   npx tsx scripts/collision-test.ts
 */
import { BALANCE, rowZ, VEHICLE_HITBOX } from '../src/data/balance';
import { runtime } from '../src/store/runtime';
import { useGameStore } from '../src/store/useGameStore';
import { rows, type RowData } from '../src/world/rows';
import { checkHits } from '../src/world/traffic';

useGameStore.getState().startGame();

const ROW = 8;
const TRUCK = { tiles: 5, kind: 'truck' as const };
const DRAWN = VEHICLE_HITBOX.truck; // media caja dibujada del camión
const PLAYER_DRAWN = { x: 0.28, z: 0.17 }; // torso del colaborador

function makeRow(index: number, withTruck: boolean): RowData {
  return {
    index,
    type: withTruck ? 'road' : 'yard',
    theme: 'port',
    stacks: [],
    decor: [],
    cards: [],
    cranes: [],
    vehicles: withTruck
      ? [{ x: 0, prevX: 0, tiles: TRUCK.tiles, speed: 0, direction: 1, kind: TRUCK.kind, colorIndex: 0 }]
      : [],
  };
}

// Mapa controlado: solo la fila ROW tiene el camión
rows.length = 0;
for (let i = 0; i < 20; i++) rows.push(makeRow(i, i === ROW));

/** ¿El motor ACTUAL registra golpe con el jugador en (x, z)? */
function engineHit(x: number, z: number): boolean {
  runtime.x = runtime.prevX = x;
  runtime.z = runtime.prevZ = z;
  runtime.row = Math.round(-z / BALANCE.TILE);
  runtime.stepping = false;
  runtime.invulnTimer = 0;
  runtime.stunTimer = 0;
  useGameStore.setState({ phase: 'playing', lives: 99, shield: false });
  const before = useGameStore.getState().obstaclesHit;
  checkHits();
  return useGameStore.getState().obstaclesHit > before;
}

/** Predicado ANTIGUO: fila lógica completa + halfLen(tiles) + HIT_MARGIN */
function legacyHit(x: number, z: number): boolean {
  const row = Math.round(-z / BALANCE.TILE);
  if (row !== ROW) return false; // parado: solo cuenta su fila
  return Math.abs(0 - x) < (TRUCK.tiles * BALANCE.TILE) / 2 + 0.22;
}

/** Verdad de campo: ¿se tocan de verdad los modelos en pantalla? */
function drawnOverlap(x: number, z: number): boolean {
  return (
    Math.abs(x) < DRAWN.x + PLAYER_DRAWN.x &&
    Math.abs(z - rowZ(ROW)) < DRAWN.z + PLAYER_DRAWN.z
  );
}

let fpNew = 0, fnNew = 0, fpOld = 0, fnOld = 0, samples = 0;
const fpExamples: string[] = [];

for (let ix = -400; ix <= 400; ix++) {
  const x = ix * 0.01;
  for (let iz = -14; iz <= 14; iz++) {
    const z = rowZ(ROW) + iz * 0.1;
    samples++;
    const truth = drawnOverlap(x, z);
    const nu = engineHit(x, z);
    const old = legacyHit(x, z);
    if (nu && !truth) { fpNew++; if (fpExamples.length < 5) fpExamples.push(`x=${x.toFixed(2)} z=${z.toFixed(2)}`); }
    if (!nu && truth) fnNew++;
    if (old && !truth) fpOld++;
    if (!old && truth) fnOld++;
  }
}

// --- Margen de perdón: distancia entre el borde dibujado y el que golpea ---
function edge(axis: 'x' | 'z', predicate: (x: number, z: number) => boolean): number {
  const rz = rowZ(ROW);
  let last = 0;
  for (let i = 0; i <= 600; i++) {
    const d = i * 0.01;
    const hit = axis === 'x' ? predicate(d, rz) : predicate(0, rz + d);
    if (hit) last = d;
    else if (last > 0) break;
  }
  return last;
}
const margins = {
  x: {
    dibujado: +(DRAWN.x + PLAYER_DRAWN.x).toFixed(2),
    golpeaAntes: +edge('x', legacyHit).toFixed(2),
    golpeaAhora: +edge('x', engineHit).toFixed(2),
  },
  z: {
    dibujado: +(DRAWN.z + PLAYER_DRAWN.z).toFixed(2),
    golpeaAntes: +edge('z', legacyHit).toFixed(2),
    golpeaAhora: +edge('z', engineHit).toFixed(2),
  },
};

// --- Salto completo por encima de una fila con camión: falsos positivos ---
function jumpSpuriousHits(truckX: number): number {
  let hits = 0;
  const steps = 12; // 0.2 s a 60 fps
  let px = 0, pz = rowZ(ROW - 1);
  for (let s = 1; s <= steps; s++) {
    const p = s / steps;
    const nz = rowZ(ROW - 1) + (rowZ(ROW) - rowZ(ROW - 1)) * p;
    rows[ROW].vehicles[0].x = rows[ROW].vehicles[0].prevX = truckX;
    runtime.prevX = px; runtime.prevZ = pz;
    runtime.x = px = 0; runtime.z = pz = nz;
    runtime.stepping = true;
    runtime.fromRow = ROW - 1; runtime.toRow = ROW;
    runtime.invulnTimer = 0; runtime.stunTimer = 0;
    useGameStore.setState({ phase: 'playing', lives: 99, shield: false });
    const before = useGameStore.getState().obstaclesHit;
    checkHits();
    if (useGameStore.getState().obstaclesHit > before) hits++;
  }
  return hits;
}

// Camión bien lejos en X: saltar hacia su fila NO debe golpear en ningún momento
const farHits = jumpSpuriousHits(6.0);

/**
 * EL CASO DEL BUG: el jugador está a un 10 % del salto (visualmente todavía
 * sobre la casilla anterior) y un camión cruza la casilla DE DESTINO, o va al
 * 90 % (ya sobre la nueva) y el camión barre la que acaba de dejar.
 * El motor antiguo daba por ocupadas AMBAS filas durante todo el salto.
 */
function midJump(progress: number, truckIsOrigin: boolean): { antiguo: boolean; nuevo: boolean } {
  // La fila con el camión es siempre ROW; se elige si es el origen o el destino
  const fromRow = truckIsOrigin ? ROW : ROW - 1;
  const toRow = truckIsOrigin ? ROW - 1 : ROW;
  const z = rowZ(fromRow) + (rowZ(toRow) - rowZ(fromRow)) * progress;
  rows[ROW].vehicles[0].x = rows[ROW].vehicles[0].prevX = 0; // justo encima en X

  runtime.prevX = runtime.x = 0;
  runtime.prevZ = runtime.z = z;
  runtime.stepping = true;
  runtime.fromRow = fromRow;
  runtime.toRow = toRow;
  runtime.row = fromRow;
  runtime.invulnTimer = runtime.stunTimer = 0;
  useGameStore.setState({ phase: 'playing', lives: 99, shield: false });
  const before = useGameStore.getState().obstaclesHit;
  checkHits();
  const nuevo = useGameStore.getState().obstaclesHit > before;
  // Antiguo: en salto ocupaba fromRow Y toRow enteras, sin mirar la Z real
  const antiguo = [fromRow, toRow].includes(ROW) && Math.abs(0) < (TRUCK.tiles * BALANCE.TILE) / 2 + 0.22;
  return { antiguo, nuevo };
}

const jumpCases = [
  { caso: '10% del salto · camión en la fila DESTINO', esperado: 'sin golpe', ...midJump(0.1, false) },
  { caso: '90% del salto · camión en la fila DE ORIGEN', esperado: 'sin golpe', ...midJump(0.9, true) },
  { caso: '90% del salto · camión en la fila DESTINO', esperado: 'GOLPE', ...midJump(0.9, false) },
  { caso: '10% del salto · camión en la fila DE ORIGEN', esperado: 'GOLPE', ...midJump(0.1, true) },
];

console.table([
  { predicado: 'ANTIGUO (fila lógica + margen)', falsosPositivos: fpOld, falsosNegativos: fnOld },
  { predicado: 'NUEVO (cajas medidas + barrido)', falsosPositivos: fpNew, falsosNegativos: fnNew },
]);
console.log(`muestras: ${samples}`);
console.log('Borde de contacto (media caja camión+jugador, unidades de mundo):');
console.table(margins);
if (fpExamples.length) console.log('ejemplos de falso positivo NUEVO:', fpExamples.join(' | '));
console.log(`salto sobre fila con camión a 6.0 de distancia → golpes espurios: ${farHits} (esperado 0)`);
console.log('\nJugador a mitad de salto, camión justo encima en X:');
console.table(jumpCases);

// --- i-frames: un mismo contacto sostenido no puede costar dos vidas ---
function livesLostInContact(seconds: number): number {
  rows[ROW].vehicles[0].x = rows[ROW].vehicles[0].prevX = 0;
  runtime.x = runtime.prevX = 0;
  runtime.z = runtime.prevZ = rowZ(ROW);
  runtime.row = ROW;
  runtime.stepping = false;
  runtime.invulnTimer = runtime.stunTimer = 0;
  useGameStore.setState({ phase: 'playing', lives: 99, shield: false });
  const before = useGameStore.getState().lives;
  const DT = 1 / 60;
  for (let i = 0; i < seconds * 60; i++) {
    // El camión se queda encima; el jugador aturdido no puede apartarse
    runtime.x = runtime.prevX = 0;
    runtime.z = runtime.prevZ = rowZ(ROW);
    runtime.row = ROW;
    if (runtime.invulnTimer > 0) runtime.invulnTimer = Math.max(0, runtime.invulnTimer - DT);
    checkHits();
  }
  return before - useGameStore.getState().lives;
}
const iframes = {
  'contacto de 1.0 s': livesLostInContact(1.0),
  'contacto de 1.4 s': livesLostInContact(1.4),
  'contacto de 3.0 s': livesLostInContact(3.0),
};
console.log('\nVidas perdidas por un contacto sostenido (INVULN_TIME =', BALANCE.INVULN_TIME, 's):');
console.table(iframes);
const iframesBad = iframes['contacto de 1.0 s'] !== 1 || iframes['contacto de 1.4 s'] !== 1;

const jumpWrong = jumpCases.filter((c) => c.nuevo !== (c.esperado === 'GOLPE'));
const fail = fpNew > 0 || farHits > 0 || jumpWrong.length > 0 || iframesBad;
if (fail) {
  console.error('FALLO: el motor sigue golpeando sin contacto visible');
  process.exit(1);
}
console.log('OK: ningún golpe sin contacto visible; nunca más estricto que el modelo');
