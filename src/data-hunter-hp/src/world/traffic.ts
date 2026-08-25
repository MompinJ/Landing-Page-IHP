import { playImpact } from '../audio/sfx';
import { BALANCE, colX, hitHalfExtents, rowZ } from '../data/balance';
import { runtime } from '../store/runtime';
import { useGameStore } from '../store/useGameStore';
import { isBlocked, isSheltered, rows, type RowData, type VehicleData, type VehicleKind } from './rows';
import { vfxBus } from './vfxBus';

/**
 * Movimiento de vehículos + hit detection — espejo del capítulo
 * "Animating the Vehicles"/"Hit Detection" del tutorial: los vehículos
 * recorren su fila en X con wrap-around fuera del tablero, y cada frame se
 * comprueba la intersección con el jugador en su fila actual (y la fila
 * destino si está a mitad de salto).
 *
 * Adaptación al formato congreso: en vez de terminar la partida, el golpe
 * penaliza (-25), aturde y empuja al jugador una fila atrás (con ventana de
 * invulnerabilidad para no encadenar golpes) — el timer de 90 s sigue.
 */
/** Altura de la cubierta pisable de la flota pequeña (ver `hullParts`) */
const BOAT_DECK_Y = BALANCE.BOAT_DECK_Y;

/**
 * FLOTACIÓN — qué embarcaciones acusan el peso del colaborador.
 *
 * Toda la flota pequeña (remolcador, velero, yate, pesquero) se hunde un palmo
 * al subirse y rebota como un muelle amortiguado: es el acuse de recibo físico
 * de que has abordado, y de paso deja claro de un vistazo sobre cuál vas
 * montado. El CRUCERO no: son ocho casillas de casco y que alguien salte a la
 * cubierta de paseo no lo mueve — hundirlo se leería como un fallo de escala.
 */
function isSinkable(kind: VehicleKind): boolean {
  return BALANCE.BOAT_FLEET.some((b) => b.kind === kind);
}

/**
 * Integra el muelle de flotación de una fila de agua. `dt` va acotado porque un
 * frame largo (pestaña en segundo plano) con integración de Euler dispararía el
 * muelle en vez de amortiguarlo.
 */
function updateBuoyancy(row: RowData, dt: number) {
  const h = Math.min(dt, 1 / 30);
  for (const v of row.vehicles) {
    if (!isSinkable(v.kind)) continue;
    const sink = v.sink ?? 0;
    const target = v.boarded ? BALANCE.BOAT_SINK_DEPTH : 0;
    const vel =
      (v.sinkVel ?? 0) +
      ((target - sink) * BALANCE.BOAT_SINK_STIFFNESS - (v.sinkVel ?? 0) * BALANCE.BOAT_SINK_DAMPING) * h;
    v.sinkVel = vel;
    v.sink = sink + vel * h;
  }
}

/**
 * Embarcación que el colaborador tiene ahora mismo bajo los pies. Se guarda
 * aparte (y no solo como bandera en el vehículo) para poder DESmarcar la
 * anterior cuando salta a otra o pisa muelle: si no, cada barcaza que ha pisado
 * en la partida se quedaría hundida para siempre.
 */
let boardedBoat: VehicleData | null = null;

// Partida nueva: el mapa se regenera entero, así que la referencia anterior
// apunta a una barcaza que ya no existe.
runtime.resetCallbacks.push(() => {
  boardedBoat = null;
});

function setBoarded(v: VehicleData | null) {
  if (boardedBoat === v) return;
  if (boardedBoat) boardedBoat.boarded = false;
  boardedBoat = v;
  if (!v) return;
  v.boarded = true;
  // Golpe de entrada: el casco se hunde de golpe y luego rebota
  if (isSinkable(v.kind)) v.sinkVel = (v.sinkVel ?? 0) + BALANCE.BOAT_SINK_IMPULSE;
}

/**
 * Límites de wrap COMPARTIDOS por todos los vehículos de una fila: se toma el
 * modelo más largo (el dibujado, que en el crucero excede su tramo abordable)
 * para que ninguno reaparezca con parte del casco todavía en cuadro.
 * Es la misma cuenta que usa `rows.ts` al repartir los vehículos al generarlos.
 */
export function rowWrapBounds(row: RowData): { minX: number; maxX: number } {
  const gap = row.type === 'rail' ? BALANCE.WRAP_MARGIN + BALANCE.TRAIN_GAP_TILES : BALANCE.WRAP_MARGIN;
  let half = 0;
  for (const v of row.vehicles) half = Math.max(half, ((v.visualTiles ?? v.tiles) * BALANCE.TILE) / 2);
  return {
    minX: colX(BALANCE.MIN_TILE - gap) - half,
    maxX: colX(BALANCE.MAX_TILE + gap) + half,
  };
}

export function updateTraffic(dt: number) {
  const from = Math.max(0, runtime.row - BALANCE.VIEW_BEHIND);
  const to = Math.min(rows.length - 1, runtime.row + BALANCE.VIEW_AHEAD);

  for (let r = from; r <= to; r++) {
    const row = rows[r];
    // El ciclo de wrap es de la FILA, no de cada vehículo. Antes cada uno usaba
    // su propio largo, así que dos barcazas de 3 y 4 casillas recorrían ciclos
    // distintos: la separación derivaba vuelta a vuelta hasta que se montaban
    // una encima de otra. Con un ciclo común la distancia entre ellas es
    // invariante — se reparten al generar la fila y así siguen para siempre.
    const wrapBounds = rowWrapBounds(row);
    for (const vehicle of row.vehicles) {
      vehicle.prevX = vehicle.x;
      vehicle.x += vehicle.speed * vehicle.direction * dt;
      // Al reaparecer por el otro lado el barrido se reinicia: si no, cubriría
      // todo el tablero de golpe y atropellaría a quien no ha tocado.
      if (vehicle.direction === 1 && vehicle.x > wrapBounds.maxX) vehicle.x = vehicle.prevX = wrapBounds.minX;
      else if (vehicle.direction === -1 && vehicle.x < wrapBounds.minX) vehicle.x = vehicle.prevX = wrapBounds.maxX;
    }
    if (row.type === 'water') updateBuoyancy(row, dt);
    // La grúa pórtico del taller sale del tablero antes de volver: esa pausa en
    // el borde es la ventana para cruzar entre andamios.
    const edge = row.type === 'gantry' ? BALANCE.MAX_TILE + 2 : BALANCE.MAX_TILE;
    for (const crane of row.cranes) {
      crane.prevX = crane.x;
      crane.x += crane.speed * crane.direction * dt;
      // La grúa rebota en los bordes del tablero (no hace wrap: es un pórtico)
      if (crane.x > colX(edge)) crane.direction = -1;
      else if (crane.x < colX(-edge)) crane.direction = 1;
    }
  }
}

/**
 * Comprobación de impacto. Se llama DESPUÉS de mover al jugador (en
 * `<Player/>`), no dentro de `updateTraffic`: si no, se contrastaba la posición
 * del jugador del frame anterior contra la de los vehículos de este.
 */
export function checkHits() {
  hitTest();
}

/**
 * Detección de impacto por SOLAPE DE CAJAS en X y Z, sobre la posición
 * INTERPOLADA del jugador.
 *
 * Antes se hacía por casilla lógica: durante los 0.2 s de salto el jugador
 * "ocupaba" la fila de origen Y la de destino enteras, así que un camión que
 * pasaba por la fila que acababa de dejar (o por la que aún no había pisado)
 * contaba como atropello aunque en pantalla se hubiera librado. Ahora cada fila
 * solo es peligrosa mientras el cuerpo del jugador solapa de verdad su franja.
 *
 * Además se barre el segmento recorrido en el frame (jugador y vehículo), de
 * modo que un tren rápido con dt grande no puede atravesarlo sin registrarse.
 */
function hitTest() {
  if (runtime.invulnTimer > 0) return;

  // Basta con mirar la fila actual y sus vecinas: ninguna caja llega más lejos
  const near = runtime.stepping
    ? [runtime.fromRow, runtime.toRow]
    : [runtime.row - 1, runtime.row, runtime.row + 1];

  const px0 = Math.min(runtime.prevX, runtime.x);
  const px1 = Math.max(runtime.prevX, runtime.x);
  const pz0 = Math.min(runtime.prevZ, runtime.z);
  const pz1 = Math.max(runtime.prevZ, runtime.z);

  for (const r of near) {
    const row = rows[r];
    if (!row) continue;
    // El agua (barcazas) NO atropella: se maneja como plataforma en updateWaterRiding
    if (row.theme === 'cruise') continue;
    const rz = rowZ(r);

    for (const vehicle of row.vehicles) {
      const half = hitHalfExtents(vehicle.kind);
      if (half.x === 0) continue; // decorativos
      if (pz0 > rz + half.z || pz1 < rz - half.z) continue;
      const vx0 = Math.min(vehicle.prevX, vehicle.x) - half.x;
      const vx1 = Math.max(vehicle.prevX, vehicle.x) + half.x;
      if (px1 > vx0 && px0 < vx1) {
        onVehicleHit();
        return;
      }
    }

    // GRÚA PÓRTICO del astillero: a diferencia de la RTG, el carro arrolla en
    // TODA su manga — no hay hueco central. El refugio son los andamios, que
    // quedan por encima de la viga: ahí la grúa pasa por debajo del jugador.
    if (row.type === 'gantry') {
      // Al saltar cuenta el andamio de la casilla que le corresponde a ESTA
      // fila: se sale de un refugio sin castigo, y al entrar en uno ya protege.
      const col = runtime.stepping ? (r === runtime.toRow ? runtime.toCol : runtime.fromCol) : runtime.col;
      if (isSheltered(r, col)) continue;
      const halfX = BALANCE.GANTRY_HALF_X + BALANCE.PLAYER_HALF_X - BALANCE.HIT_FORGIVE;
      const halfZ = 0.5 + BALANCE.PLAYER_HALF_Z - BALANCE.HIT_FORGIVE;
      for (const crane of row.cranes) {
        if (pz0 > rz + halfZ || pz1 < rz - halfZ) continue;
        const cx0 = Math.min(crane.prevX, crane.x) - halfX;
        const cx1 = Math.max(crane.prevX, crane.x) + halfX;
        if (px1 > cx0 && px0 < cx1) {
          onVehicleHit();
          return;
        }
      }
      continue;
    }

    // La grúa del DIQUE MAYOR no atropella: es la que te cruza en volandas.
    // Su fila además es intransitable a ras de suelo (muro), así que aquí solo
    // podría estar un jugador subido a un andamio — y a ese no se le pega.
    if (row.docks?.some((d) => d.mega)) continue;

    // Grúa RTG: peligro solo en las patas; el hueco central sigue siendo seguro
    const legHalfX = BALANCE.CRANE_LEG_HALF_X + BALANCE.PLAYER_HALF_X - BALANCE.HIT_FORGIVE;
    const legHalfZ = BALANCE.CRANE_LEG_HALF_Z + BALANCE.PLAYER_HALF_Z - BALANCE.HIT_FORGIVE;
    for (const crane of row.cranes) {
      if (pz0 > rz + legHalfZ || pz1 < rz - legHalfZ) continue;
      for (const side of [-1, 1]) {
        const legX = crane.x + side * BALANCE.CRANE_LEG_OFFSET;
        const legPrevX = crane.prevX + side * BALANCE.CRANE_LEG_OFFSET;
        const lx0 = Math.min(legPrevX, legX) - legHalfX;
        const lx1 = Math.max(legPrevX, legX) + legHalfX;
        if (px1 > lx0 && px0 < lx1) {
          onVehicleHit();
          return;
        }
      }
    }
  }
}

/**
 * Mecánica de río (Crossy Road): en filas de AGUA el jugador debe ir sobre una
 * barcaza. Si está montado, la barcaza lo arrastra en X; si aterriza en agua
 * sin barcaza —o la barcaza lo arrastra fuera del tablero— cae (salpicadura,
 * −25, retroceso). Llamar cada frame DESPUÉS de updatePlayer.
 */
export function updateWaterRiding(dt: number) {
  if (useGameStore.getState().phase !== 'playing') return;
  // Mientras la gaviota se lo lleva por los aires no hay agua que valga
  if (runtime.snatching) {
    runtime.riding = false;
    setBoarded(null);
    return;
  }
  // Durante el salto la caída se resuelve al aterrizar
  if (runtime.stepping) {
    runtime.riding = false;
    setBoarded(null); // al despegar, el casco vuelve a su línea de flotación
    return;
  }
  const row = rows[runtime.row];
  if (!row || row.type !== 'water') {
    runtime.riding = false;
    setBoarded(null);
    return;
  }

  const barco = boatUnderPlayer(row.vehicles);
  if (!barco) {
    setBoarded(null);
    if (runtime.invulnTimer <= 0) fallInWater();
    return;
  }

  // Montado: la embarcación lo lleva. Se mantiene la col derivada para saltar recto.
  setBoarded(barco);
  runtime.riding = true;
  // La cubierta baja con el casco: el colaborador se hunde CON la barcaza
  runtime.rideY = (barco.kind === 'ship' ? BALANCE.SHIP_DECK_Y : BOAT_DECK_Y) - (barco.sink ?? 0);
  runtime.x += barco.speed * barco.direction * dt;
  runtime.z = rowZ(runtime.row);
  runtime.y = 0;
  runtime.col = Math.round(runtime.x / BALANCE.TILE);

  // Arrastrado fuera del tablero → cae
  if (runtime.x < colX(BALANCE.MIN_TILE) - 0.4 || runtime.x > colX(BALANCE.MAX_TILE) + 0.4) {
    if (runtime.invulnTimer <= 0) fallInWater();
  }
}

/**
 * BANDA TRANSPORTADORA — el verbo propio de la terminal multipropósito: el
 * suelo se mueve. A diferencia del agua no mata, te DESCOLOCA: te saca de la
 * columna desde la que ibas a saltar y te obliga a corregir.
 *
 * Contra los bordes del tablero se topa en vez de tirarte: si arrastrara fuera
 * sería una trampa mortal aleatoria por pisar la casilla equivocada, y este
 * bioma está pensado como el respiro con truco entre TEC y ECV.
 *
 * Llamar cada frame DESPUÉS de updatePlayer y antes de checkHits.
 */
export function updateConveyor(dt: number) {
  if (useGameStore.getState().phase !== 'playing' || runtime.stepping || runtime.snatching) {
    runtime.dragging = false;
    return;
  }
  const belt = rows[runtime.row]?.belt;
  if (!belt) {
    runtime.dragging = false;
    return;
  }

  runtime.dragging = true;
  const minX = colX(BALANCE.MIN_TILE);
  const maxX = colX(BALANCE.MAX_TILE);
  runtime.x = Math.max(minX, Math.min(maxX, runtime.x + belt.speed * belt.direction * dt));
  runtime.z = rowZ(runtime.row);
  runtime.y = 0;
  // La columna lógica se deriva de la X real, para que el siguiente salto salga
  // de donde el jugador SE VE, no de donde aterrizó hace dos segundos.
  runtime.col = Math.round(runtime.x / BALANCE.TILE);
}

function boatUnderPlayer(vehicles: VehicleData[]): VehicleData | null {
  for (const v of vehicles) {
    const half = (v.tiles * BALANCE.TILE) / 2;
    if (Math.abs(v.x - runtime.x) < half + BALANCE.BOARD_MARGIN) return v;
  }
  return null;
}

function fallInWater() {
  const store = useGameStore.getState();
  store.hitObstacle(); // −25
  playImpact();
  vfxBus.push({ kind: 'splash', x: runtime.x, y: 0.05, z: runtime.z });

  runtime.stunTimer = BALANCE.STUN_TIME;
  runtime.invulnTimer = BALANCE.INVULN_TIME;
  runtime.shakeTimer = BALANCE.SHAKE_DURATION;
  runtime.moveQueue.length = 0;
  runtime.stepping = false;
  runtime.carrying = false;
  runtime.carryPhase = -1;
  runtime.riding = false;
  setBoarded(null);

  // Retroceder a la fila segura más cercana (muelle/tierra), nunca al agua
  let r = runtime.row - 1;
  while (r > 0 && rows[r] && rows[r].type === 'water') r--;
  runtime.row = Math.max(0, r);
  runtime.col = Math.max(BALANCE.MIN_TILE, Math.min(BALANCE.MAX_TILE, runtime.col));
  runtime.x = colX(runtime.col);
  runtime.z = rowZ(runtime.row);
  runtime.y = 0;
  store.setCurrentRow(runtime.row);
}

function onVehicleHit() {
  const store = useGameStore.getState();
  store.hitObstacle();
  playImpact();
  vfxBus.push({ kind: 'impact', x: runtime.x, y: 0.8, z: runtime.z });

  runtime.stunTimer = BALANCE.STUN_TIME;
  runtime.invulnTimer = BALANCE.INVULN_TIME;
  runtime.shakeTimer = BALANCE.SHAKE_DURATION;
  runtime.moveQueue.length = 0;
  runtime.stepping = false;
  runtime.carrying = false;
  runtime.carryPhase = -1;

  // Empujón: una fila atrás si está libre; si no, se queda donde está
  const backRow = runtime.row - 1;
  if (backRow >= 0 && !isBlocked(backRow, runtime.col)) runtime.row = backRow;
  runtime.x = colX(runtime.col);
  runtime.z = rowZ(runtime.row);
  runtime.y = 0;
  useGameStore.getState().setCurrentRow(runtime.row);
}
