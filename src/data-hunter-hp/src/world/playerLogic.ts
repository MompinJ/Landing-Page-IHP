import { playBad, playGood } from '../audio/sfx';
import { BALANCE, colX, rowZ } from '../data/balance';
import { debug } from '../debug/debug';
import { runtime, type MoveDirection } from '../store/runtime';
import { useGameStore } from '../store/useGameStore';
import {
  cardAt,
  cardNearX,
  extendRowsIfNeeded,
  isBlocked,
  megaDockCarry,
  zoneOf,
  type CardData,
} from './rows';
import { backLimitRow, startSnatch, updateSnatch } from './snatch';
import { vfxBus } from './vfxBus';

/**
 * Lógica pura del jugador (sin React/Three) — espejo del sistema del
 * tutorial: cola de movimientos, validación `endsUpInValidPosition`, salto
 * de 0.2 s con arco sin(p·π), commit de posición y rotación por dirección.
 * La usan por igual el componente <Player/> y la simulación headless.
 */
const FACING: Record<MoveDirection, number> = {
  forward: 0,
  left: Math.PI / 2,
  right: -Math.PI / 2,
  backward: Math.PI,
};

/** Encola un salto si la cola no está llena (tutorial: `queueMove`) */
export function queueMove(direction: MoveDirection) {
  if (runtime.moveQueue.length >= BALANCE.MOVE_QUEUE_MAX) {
    debug.stats.rejected++;
    return;
  }
  debug.stats.queued++;
  runtime.moveQueue.push(direction);
}

function targetOf(direction: MoveDirection): { row: number; col: number } {
  let { row, col } = runtime.stepping
    ? { row: runtime.toRow, col: runtime.toCol }
    : { row: runtime.row, col: runtime.col };
  if (direction === 'forward') row += 1;
  else if (direction === 'backward') row -= 1;
  else if (direction === 'left') col -= 1;
  else col += 1;
  return { row, col };
}

/** Avanza la animación y consume la cola. Llamar una vez por frame. */
export function updatePlayer(dt: number) {
  // Punto de partida del barrido de colisión de este frame
  runtime.prevX = runtime.x;
  runtime.prevZ = runtime.z;

  // LA GRÚA PÓRTICO se planta sobre el que se queda atrás y, si se pasa de la
  // correa, le suelta el contenedor encima. Mientras dura, la posición la
  // escribe `snatch.ts`: aquí no hay ni saltos ni cola que atender.
  if (updateSnatch(dt)) return;

  if (runtime.stunTimer > 0) {
    runtime.stunTimer = Math.max(0, runtime.stunTimer - dt);
    runtime.moveQueue.length = 0;
  }
  if (runtime.invulnTimer > 0) runtime.invulnTimer = Math.max(0, runtime.invulnTimer - dt);

  // Iniciar el siguiente salto de la cola
  if (!runtime.stepping && runtime.moveQueue.length > 0 && runtime.stunTimer === 0) {
    const direction = runtime.moveQueue.shift()!;
    const target = targetOf(direction);
    runtime.facing = FACING[direction];

    // RETROCESO CON CORREA. Se puede recular —para dejar pasar un tren, para
    // esperar la barcaza siguiente— pero solo `BACK_STEPS_MAX` filas por detrás
    // de la máxima alcanzada. El paso que se pasa de ahí NO se descarta en
    // silencio (eso se lee como que el mando falla): baja el contenedor.
    // El borde del mapa (fila negativa) sí es simple muro, ver `isBlocked`.
    if (direction === 'backward' && target.row >= 0 && target.row < backLimitRow()) {
      startSnatch();
      return;
    }

    if (isBlocked(target.row, target.col)) {
      // LANZAMIENTO DE LA GRÚA DEL DIQUE: si lo que cierra el paso es el dique
      // mayor y el colaborador está en el PUNTO DE EMBARQUE (el pad marcado
      // bajo el gancho), la grúa lo avienta por encima del buque y lo deposita
      // en la fila del otro lado. Desde cualquier otra columna el muro es muro:
      // o vas al pad, o cruzas por las pasarelas de andamio.
      if (
        direction === 'forward' &&
        megaDockCarry(target.row, runtime.col) &&
        !isBlocked(target.row + 1, target.col)
      ) {
        runtime.stepping = true;
        runtime.carrying = true;
        runtime.riding = false;
        runtime.dragging = false;
        runtime.stepProgress = 0;
        runtime.fromRow = runtime.row;
        runtime.fromCol = runtime.col;
        runtime.fromX = runtime.x;
        runtime.toRow = target.row + 1; // aterriza PASADO el dique
        runtime.toCol = target.col;
      }
      // resto de inválidos (borde, pila, muro sin gancho): se descartan
    } else {
      runtime.stepping = true;
      runtime.riding = false; // al saltar se suelta de la barcaza
      runtime.dragging = false; // ...y de la banda transportadora
      runtime.stepProgress = 0;
      runtime.fromRow = runtime.row;
      runtime.fromCol = runtime.col;
      runtime.fromX = runtime.x; // arranca desde la X real (puede venir arrastrada)
      runtime.toRow = target.row;
      runtime.toCol = target.col;
    }
  }

  // Animar salto en curso (tutorial: stepTime 0.2 s, arco sin(p·π)). El IZADO
  // de la grúa del dique usa la misma máquina de progreso pero NO es un salto:
  // va por fases — izar en vertical, trasladar colgado y AVENTAR al final.
  if (runtime.stepping && runtime.carrying) {
    runtime.stepProgress = Math.min(1, runtime.stepProgress + dt / BALANCE.CARRY_TIME);
    const p = runtime.stepProgress;
    runtime.carryPhase = p;
    const fromZ = rowZ(runtime.fromRow);
    const toZ = rowZ(runtime.toRow);
    // Punto de SUELTA: la grúa no llega hasta la casilla de destino — suelta
    // antes y el impulso hace el resto (eso es lo que lo hace lectura de
    // "me aventó" y no de "me depositó").
    const releaseZ = fromZ + (toZ - fromZ) * BALANCE.CARRY_RELEASE_DIST;
    const lift = BALANCE.CARRY_LIFT_FRAC;
    const rel = BALANCE.CARRY_RELEASE_FRAC;
    runtime.x = runtime.fromX + (colX(runtime.toCol) - runtime.fromX) * p;
    if (p < lift) {
      // FASE 1 — IZADO: sube en vertical desde el pad, con arranque suave
      const t = p / lift;
      const e = t * t * (3 - 2 * t); // smoothstep: el cable no da tirones
      runtime.z = fromZ;
      runtime.y = BALANCE.CARRY_LIFT_Y * e;
    } else if (p < rel) {
      // FASE 2 — TRASLADO: colgado del carro, acelerando hacia la suelta
      // (easing t²: llega al punto de suelta CON velocidad, no frenando)
      const t = (p - lift) / (rel - lift);
      runtime.z = fromZ + (releaseZ - fromZ) * t * t;
      // Balanceo de péndulo mientras cuelga
      runtime.y = BALANCE.CARRY_LIFT_Y + Math.sin(t * Math.PI * 2) * 0.12;
    } else {
      // FASE 3 — AVENTADO: proyectil — sigue de largo en Z y cae en parábola
      const t = (p - rel) / (1 - rel);
      runtime.z = releaseZ + (toZ - releaseZ) * t;
      runtime.y = BALANCE.CARRY_LIFT_Y * (1 - t * t);
    }
    if (p >= 1) completeStep();
  } else if (runtime.stepping) {
    runtime.stepProgress = Math.min(1, runtime.stepProgress + dt / BALANCE.STEP_TIME);
    const p = runtime.stepProgress;
    runtime.x = runtime.fromX + (colX(runtime.toCol) - runtime.fromX) * p;
    runtime.z = rowZ(runtime.fromRow) + (rowZ(runtime.toRow) - rowZ(runtime.fromRow)) * p;
    runtime.y = Math.sin(p * Math.PI) * BALANCE.HOP_HEIGHT;
    if (p >= 1) completeStep();
  } else if (!runtime.riding && !runtime.dragging) {
    // Quieto en tierra/muelle: fija al centro de casilla. Montado en barcaza o
    // sobre una banda NO: ahí la X la llevan `updateWaterRiding` /
    // `updateConveyor`, que corren después en el mismo frame.
    runtime.x = colX(runtime.col);
    runtime.z = rowZ(runtime.row);
    runtime.y = 0;
  }
}

/** Commit del salto (tutorial: `stepCompleted`) + recogida de tarjetas + score */
function completeStep() {
  runtime.stepping = false;
  runtime.carrying = false;
  runtime.carryPhase = -1;
  runtime.row = runtime.toRow;
  runtime.col = runtime.toCol;
  debug.stats.steps++;

  const store = useGameStore.getState();

  // Progreso: puntos por cada fila nueva alcanzada
  if (runtime.row > runtime.maxRow) {
    runtime.maxRow = runtime.row;
    store.advanceRow(runtime.row);
    // Cartel de bienvenida CADA vez que se cruza a otra terminal (el recorrido
    // da vueltas), y sello de pasaporte solo la primera vez de cada una.
    store.enterUnit(zoneOf(runtime.row), Math.floor(runtime.row / BALANCE.ZONE_LENGTH));
    store.stampUnit(zoneOf(runtime.row));
    extendRowsIfNeeded(runtime.row);
  }
  store.setCurrentRow(runtime.row);

  // Tarjeta sobre la casilla de aterrizaje
  const card = cardAt(runtime.row, runtime.col);
  if (card) takeCard(card);
}

/**
 * Cobra una tarjeta (verde o roja) esté quien esté pisándola y como sea que
 * haya llegado hasta ella: aterrizando de un salto o pasando por encima
 * arrastrado. Un solo sitio donde se resuelve, para que las dos maneras de
 * recogerla suenen, puntúen y suelten las mismas partículas.
 */
function takeCard(card: CardData) {
  card.collected = true;
  const store = useGameStore.getState();
  if (card.good) {
    store.collectGood(card.label);
    playGood(useGameStore.getState().multiplier);
    vfxBus.push({ kind: 'collect', x: runtime.x, y: 1.0, z: runtime.z });
  } else {
    store.hitBad(card.label);
    playBad();
    runtime.shakeTimer = BALANCE.SHAKE_DURATION;
    vfxBus.push({ kind: 'impact', x: runtime.x, y: 1.0, z: runtime.z });
  }
}

/**
 * RECOGIDA AL PASAR POR ENCIMA. Llamar una vez por frame DESPUÉS de que se
 * hayan movido el suelo y las plataformas (`updateConveyor` /
 * `updateWaterRiding`), que son las que dejan al colaborador en una X que no
 * eligió él.
 *
 * Corrige lo que se leía como un fallo del juego: en la BANDA de TUM el suelo
 * te lleva por encima del hexágono verde y no lo recogías — para cogerlo había
 * que saltar justo encima, o sea que la fila con premio era la única donde el
 * premio se te escapaba solo. Si el colaborador lo pisa, es suyo.
 *
 * Vale igual para las rojas, y así tiene que ser: si la banda te arrastra
 * hacia un riesgo, quitarte de en medio a tiempo ES la mecánica de la fila.
 * Durante el salto no se barre — ahí la recogida la resuelve `completeStep` en
 * la casilla de aterrizaje, y barrer en el aire recogería lo que se sobrevuela.
 */
export function sweepPickup() {
  if (runtime.stepping || runtime.snatching || runtime.stunTimer > 0) return;
  const card = cardNearX(runtime.row, runtime.x);
  if (card) takeCard(card);
}
