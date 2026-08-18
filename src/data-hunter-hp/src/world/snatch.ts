import { playBad, playImpact } from '../audio/sfx';
import { BALANCE, colX, rowZ } from '../data/balance';
import { runtime } from '../store/runtime';
import { useGameStore } from '../store/useGameStore';
import { isBlocked, rows, standHeight } from './rows';
import { vfxBus } from './vfxBus';

/**
 * QUEDARSE ATRÁS TIENE PRECIO — lo que en Crossy Road hace el águila, aquí lo
 * hace la propia operación portuaria. En este juego SÍ se puede retroceder (ver
 * `playerLogic`), pero con correa: `BACK_STEPS_MAX` filas por detrás de la
 * máxima alcanzada. Esa correa necesita un guardián que se vea venir, porque un
 * paso que simplemente "no hace nada" se lee como que el mando falla.
 *
 * Hay DOS castigos y se ALTERNAN, para que quien juega dos veces en el stand no
 * vea la misma escena (y porque cada uno enseña un peligro distinto del puerto):
 *
 *   DRON DE SEGURIDAD — patrulla en círculos con el foco encima del rezagado y,
 *   si se pasa, baja en vertical, lo engancha con el cabestrante y se lo lleva
 *   fuera de cuadro.
 *
 *   CONTENEDOR — la grúa pórtico se planta encima con un TEU colgando del
 *   spreader y una marca de peligro en el suelo; si se pasa, abre los
 *   twistlocks y se lo deja caer encima.
 *
 * Las dos cuestan una vida. Todo el movimiento se calcula aquí, sin React ni
 * Three, así que la simulación headless pasa por el mismo código que la
 * pantalla; los componentes solo leen las poses `drone` y `crane`.
 */
export type SnatchKind = 'drone' | 'crane';

const DIVE = BALANCE.DRONE_DIVE_TIME;
const GRAB = BALANCE.DRONE_GRAB_TIME;
const RISE = BALANCE.DRONE_RISE_TIME;
const DRONE_TOTAL = DIVE + GRAB + RISE;

const RELEASE = BALANCE.DROP_RELEASE_TIME;
const FALL = BALANCE.DROP_FALL_TIME;
const IMPACT = BALANCE.DROP_IMPACT_TIME;
const SETTLE = BALANCE.DROP_SETTLE_TIME;
const CRANE_TOTAL = RELEASE + FALL + IMPACT + SETTLE;

/** Duración de cada retirada (la usa el temporizador de invulnerabilidad) */
export function snatchDuration(kind: SnatchKind): number {
  return kind === 'crane' ? CRANE_TOTAL : DRONE_TOTAL;
}

const BOX = BALANCE.DROP_BOX;
const BEAM_Y = BALANCE.DROP_BEAM_Y;
const HOLD_Y = BALANCE.DROP_HOLD_Y;
/** Cota de reposo del contenedor: apoyado en el suelo */
const REST_Y = BOX[1] / 2;
/** Cota de viaje: con el cajón recogido contra la viga, que es como se mueve
 *  cualquier grúa (nadie traslada una carga a media altura). */
const TRAVEL_Y = BEAM_Y - 1.15;

/**
 * VELOCIDADES de la máquina, no interpolaciones. Es la diferencia entre una
 * grúa y un adorno que se desliza: el pórtico recorre sus rieles, el carro
 * recorre la viga y el cable paga a su ritmo, cada eje por separado y en el
 * orden en que se hace de verdad — primero llegar, luego centrar, luego bajar.
 */
const GANTRY_SPEED = 11; // m/s del pórtico sobre los rieles (eje Z)
const TROLLEY_SPEED = 7; // m/s del carro sobre la viga (eje X)
const HOIST_SPEED = 4; // m/s del cable (eje Y)
/** Entra por el fondo del encuadre, rodando; no se materializa encima */
const ENTRY_Z = -12;
/** ...y el carro entra por el extremo de la viga, el más lejano al jugador */
const ENTRY_X = colX(BALANCE.MAX_TILE) + 1.2;

/** Cota del enganche: el gancho baja hasta el arnés, a la altura del casco */
const HOOK_Y = 1.5;
/** Largo del cable — lo que cuelga el colaborador bajo el dron */
const ROPE = BALANCE.DRONE_ROPE;

/** De dónde baja, relativo al colaborador: casi en vertical (es un dron, no un
 *  ave: no planea, se deja caer y frena en seco encima). */
const ENTRY = { x: 1.7, y: 9.5, z: -2.4 };
/** Por dónde se lo lleva: sube y sale del encuadre por la esquina del fondo */
const EXIT = { x: -3.6, y: 12.5, z: -9.5 };

/** Vuelo de patrulla del aviso */
const PATROL_R = 2.7;
const PATROL_Y = 5.6;

/** Péndulo de la carga: cuánto abre la oscilación y a qué ritmo se apaga */
const SWING_AMP = 0.42;
const SWING_FREQ = 7.4;
const SWING_DECAY = 1.5;

/**
 * Pose del dron para el render (`components/Drone`). Objeto mutable
 * reutilizado: se escribe cada frame y nunca se asigna nada nuevo.
 */
export const drone = {
  x: 0,
  y: 0,
  z: 0,
  /** Rumbo del morro (el modelo mira a +z) */
  yaw: 0,
  /** Inclinación del chasis: un multirrotor se INCLINA hacia donde acelera */
  pitch: 0,
  roll: 0,
  /** Fase de los rotores (radianes acumulados) */
  rotor: 0,
  /** Baliza roja: 0..1, parpadeo más rápido cuando ya va a por alguien */
  beacon: 0,
  /** Foco de inspección: 0 apagado, 1 a plena potencia */
  light: 0,
  /** Ángulos del cable (péndulo): el render lo usa para orientarlo */
  ropeX: 0,
  ropeZ: 0,
  /** Lleva al colaborador colgado (cable y garra cerrada a la vista) */
  carrying: false,
  /** Está patrullando sobre un colaborador rezagado */
  hunting: false,
  visible: false,
};

/**
 * Pose de la GRÚA PÓRTICO y su contenedor (`components/CraneDrop`). Mismo
 * contrato que `drone`: objeto mutable que se reescribe cada frame.
 */
export const crane = {
  visible: false,
  /** Fila (Z) sobre la que se ha plantado el pórtico */
  z: 0,
  /** X del carro sobre la viga */
  x: 0,
  /** Spreader: cuelga del carro por el cable, así que oscila con él */
  spreaderX: 0,
  spreaderY: 0,
  cable: 0,
  /** El spreader lleva el contenedor enganchado (twistlocks cerrados) */
  loaded: true,
  /** Contenedor: posición y balanceo del cajón */
  boxX: 0,
  boxY: 0,
  boxZ: 0,
  boxTilt: 0,
  /** Marca de peligro en el suelo, 0..1 (pulso; 1 = a punto de soltar) */
  mark: 0,
};

/** Punto del enganche (se congela al arrancar: la carga ya no se mueve sola) */
const hookAt = { x: 0, y: 0, z: 0 };
let grabbed = false;
let dropped = false;
/** Ángulo del péndulo de la carga (lo produce la aceleración del carro) */
let swing = 0;
/** Cota del suelo bajo la carga: la casilla puede ser un andamio, no el patio */
let groundY = 0;

/**
 * Sorteo de castigo. No es aleatorio: se ALTERNAN, que es lo que garantiza que
 * las dos escenas se vean en un stand donde casi nadie juega más de tres veces.
 * Se decide al ENTRAR en zona de aviso, para que lo que patrulla sobre el
 * jugador sea ya lo que se lo va a llevar.
 */
let nextKind: SnatchKind = 'crane';
let warned = false;

runtime.resetCallbacks.push(() => {
  // Partida nueva: siempre se estrena con el contenedor, que es la más vistosa
  nextKind = 'crane';
});

function armKind() {
  // Solo se ARMA: el turno no avanza hasta que el castigo se ejecuta de verdad
  // (ver `resolve`). Si no, entrar y salir de la zona de aviso barajaba las dos
  // máquinas y podía tocar la misma dos veces seguidas.
  runtime.snatchKind = nextKind;
}

runtime.resetCallbacks.push(() => {
  drone.visible = false;
  drone.hunting = false;
  drone.carrying = false;
  drone.light = 0;
  crane.visible = false;
  crane.mark = 0;
  crane.loaded = true;
  grabbed = false;
  dropped = false;
  warned = false;
});

/** Fila por debajo de la cual ya no se puede retroceder */
export function backLimitRow(): number {
  return runtime.maxRow - BALANCE.BACK_STEPS_MAX;
}

/** Filas de retroceso que le quedan al jugador antes de que baje el dron */
export function backRoomLeft(): number {
  return runtime.row - backLimitRow();
}

/** ¿El dron ya está avisando? (lo usan el render y los tests) */
export function backDanger(): boolean {
  // Al principio de la partida no hay correa que apretar: con maxRow pequeño
  // el límite cae por debajo de la fila 0 y el borde del mapa ya frena solo.
  return runtime.maxRow > BALANCE.BACK_STEPS_MAX && backRoomLeft() <= BALANCE.BACK_WARN_STEPS;
}

/** Arranca la retirada. A partir de aquí el jugador no controla nada. */
export function startSnatch() {
  if (runtime.snatching) return;
  // Sin aviso previo (llegó al límite de un salto) no se ha sorteado nada aún
  if (!warned) armKind();
  warned = false;
  runtime.snatching = true;
  runtime.snatchTime = 0;
  runtime.snatchSquash = 1;
  runtime.snatchSpin = 0;
  runtime.snatchRoll = 0;
  runtime.snatchPitch = 0;
  runtime.stepping = false;
  runtime.carrying = false;
  runtime.carryPhase = -1;
  runtime.riding = false;
  runtime.dragging = false;
  runtime.moveQueue.length = 0;
  runtime.stunTimer = 0;
  // Inmune mientras lo retiran: un camión atropellando a quien ya se lleva el
  // dron cobraría dos vidas por el mismo error.
  runtime.invulnTimer = Math.max(
    runtime.invulnTimer,
    snatchDuration(runtime.snatchKind) + 0.05,
  );
  grabbed = false;
  dropped = false;
  drone.carrying = false;

  hookAt.x = runtime.x;
  hookAt.z = runtime.z;
  groundY = standHeight(runtime.row, runtime.col);
  hookAt.y = groundY + HOOK_Y;
  playBad();
}

/**
 * Un frame de dron. Devuelve `true` si la retirada tiene tomado el control del
 * jugador (entonces `updatePlayer` no debe tocar posición ni cola).
 */
export function updateSnatch(dt: number): boolean {
  if (!runtime.snatching) {
    warn(dt);
    return false;
  }
  // Inmunidad renovada frame a frame: la maniobra puede alargarse esperando a
  // que la grúa llegue, y nadie debe cobrar un segundo golpe mientras tanto.
  runtime.invulnTimer = Math.max(runtime.invulnTimer, 0.3);
  if (runtime.snatchKind === 'crane') return dropContainer(dt);
  runtime.snatchTime += dt;
  return flyAway(dt);
}

/** DRON — descenso, enganche del cabestrante y salida de cuadro con la carga */
function flyAway(dt: number): boolean {
  const t = runtime.snatchTime;
  crane.visible = false;
  drone.visible = true;
  drone.hunting = true;
  drone.rotor += dt * 58; // a tope: está maniobrando
  drone.beacon = 0.5 + 0.5 * Math.sin(t * 22);
  drone.light = Math.min(1, drone.light + dt * 5);

  if (t < DIVE) {
    // DESCENSO — cae casi en vertical y FRENA EN SECO encima del colaborador.
    // El easing es smootherstep (arranca y termina con velocidad cero): un
    // multirrotor no llega de largo, se planta.
    const p = t / DIVE;
    const e = p * p * p * (p * (p * 6 - 15) + 10);
    const k = 1 - e;
    drone.x = hookAt.x + ENTRY.x * k;
    drone.y = hookAt.y + ROPE + ENTRY.y * k;
    drone.z = hookAt.z + ENTRY.z * k;
    drone.yaw = Math.atan2(-ENTRY.x, -ENTRY.z);
    // Se inclina en el sentido de la maniobra y se endereza al frenar: la
    // derivada del easing es la aceleración, y es lo que inclina el chasis.
    const lean = Math.sin(p * Math.PI);
    drone.pitch = 0.34 * lean;
    drone.roll = -0.16 * lean;
    drone.ropeX = drone.ropeZ = 0;
    drone.carrying = false;
    // La carga sigue en el suelo, esperando
    runtime.x = hookAt.x;
    runtime.z = hookAt.z;
    runtime.y = hookAt.y - HOOK_Y;
    runtime.snatchSpin = runtime.snatchRoll = runtime.snatchPitch = 0;
    return true;
  }

  if (t < DIVE + GRAB) {
    // ENGANCHE — la garra cierra: golpe seco, sacudida de cámara y el cuerpo
    // despega del suelo hasta quedar colgado del cable.
    if (!grabbed) {
      grabbed = true;
      drone.carrying = true;
      playImpact();
      runtime.shakeTimer = BALANCE.SHAKE_DURATION;
      vfxBus.push({ kind: 'impact', x: hookAt.x, y: hookAt.y, z: hookAt.z });
    }
    const p = (t - DIVE) / GRAB;
    // Acuse de recibo del peso: el dron se hunde un palmo y se recupera
    const dip = Math.sin(p * Math.PI) * 0.28;
    drone.x = hookAt.x;
    drone.y = hookAt.y + ROPE - dip;
    drone.z = hookAt.z;
    drone.pitch = 0.06 * Math.sin(p * Math.PI * 2);
    drone.roll = 0;
    drone.ropeX = drone.ropeZ = 0;
    // El cuerpo sube del suelo al extremo del cable con arranque suave
    const e = p * p * (3 - 2 * p);
    runtime.x = hookAt.x;
    runtime.z = hookAt.z;
    runtime.y = (hookAt.y - HOOK_Y) * (1 - e) + (drone.y - ROPE) * e;
    runtime.snatchRoll = runtime.snatchPitch = 0;
    runtime.snatchSpin += dt * 1.2;
    return true;
  }

  // IZADO — sube acelerando y sale de cuadro. La carga NO va clavada bajo el
  // dron: cuelga de un cable y oscila como un péndulo amortiguado, con el
  // tirón inicial en el sentido contrario a la marcha.
  const p = Math.min(1, (t - DIVE - GRAB) / RISE);
  const e = p * p; // acelera al alejarse
  drone.x = hookAt.x + EXIT.x * e;
  drone.y = hookAt.y + ROPE + EXIT.y * e;
  drone.z = hookAt.z + EXIT.z * e;
  drone.yaw = Math.atan2(EXIT.x, EXIT.z);
  drone.rotor += dt * 14; // esfuerzo extra: va cargado
  const lean = 0.3 * (1 - p * 0.5);
  drone.pitch = lean;
  drone.roll = 0.12 * Math.sin(p * Math.PI);

  const swing = SWING_AMP * Math.exp(-SWING_DECAY * p * RISE) * Math.sin(p * RISE * SWING_FREQ);
  // El péndulo se abre en la dirección de la marcha (queda rezagado)
  const dir = Math.hypot(EXIT.x, EXIT.z) || 1;
  drone.ropeX = (-EXIT.x / dir) * swing;
  drone.ropeZ = (-EXIT.z / dir) * swing;
  drone.carrying = true;

  runtime.x = drone.x + Math.sin(drone.ropeX) * ROPE;
  runtime.z = drone.z + Math.sin(drone.ropeZ) * ROPE;
  runtime.y = drone.y - Math.cos(drone.ropeX) * Math.cos(drone.ropeZ) * ROPE;
  // El cuerpo acompaña al cable (roll/pitch) y gira despacio sobre su eje
  runtime.snatchRoll = drone.ropeX;
  runtime.snatchPitch = drone.ropeZ;
  runtime.snatchSpin += dt * (1.2 + 2.6 * p);

  if (p >= 1) resolve();
  return true;
}

/**
 * GRÚA — el spreader abre los twistlocks y suelta el contenedor sobre el
 * rezagado. Cuatro tiempos: SUELTA (el cajón se queda un instante suspendido
 * sin nada que lo sujete), CAÍDA (libre, acelerando), IMPACTO (el colaborador
 * queda de sello y el cajón pega el bote) y REPOSO antes de reaparecer.
 */
function dropContainer(dt: number): boolean {
  drone.visible = false;
  // El colaborador no se mueve de la casilla en ningún momento: esta muerte
  // NO lo desplaza, lo aplasta donde está.
  runtime.x = hookAt.x;
  runtime.z = hookAt.z;
  runtime.y = groundY;
  const espera = groundY + HOLD_Y; // cota de la carga suspendida
  const suelo = groundY + REST_Y; // cota del cajón ya apoyado

  // FASE 0 — PLANTARSE. Si el jugador se pasó de la correa antes de que la
  // máquina terminara de llegar, el reloj del castigo NO arranca: primero la
  // grúa se pone encima (a marcha forzada) y luego suelta. Así nunca hay un
  // salto de posición, que es lo que delataba el truco.
  if (!crane.visible) spawnCrane();
  if (runtime.snatchTime === 0 && !driveCrane(dt, 2.4)) {
    // (driveCrane ya deja la pose lista; aquí solo el aviso a toda prisa)
    crane.mark = 0.55 + 0.45 * Math.sin(runtime.elapsed * 26);
    runtime.snatchSquash = 1;
    return true;
  }

  runtime.snatchTime += dt;
  const t = runtime.snatchTime;

  if (t < RELEASE) {
    // SUELTA — twistlocks abiertos: el cajón deja de estar sujeto y el
    // spreader se separa un dedo. La marca del suelo pasa a parpadeo rápido.
    const p = t / RELEASE;
    crane.loaded = p < 0.45;
    // El cajón deja de oscilar: los twistlocks no abren con la carga bailando
    swing *= Math.max(0, 1 - dt * 8);
    crane.boxY = espera - (crane.loaded ? 0 : 0.06);
    poseCrane();
    crane.spreaderY += crane.loaded ? 0 : 0.18; // el spreader se separa al abrir
    crane.mark = 0.55 + 0.45 * Math.sin(t * 34);
    runtime.snatchSquash = 1;
    return true;
  }

  if (t < RELEASE + FALL) {
    // CAÍDA LIBRE — y = y0 − ½gt², que es lo que hace que llegue lanzado y no
    // "bajando": el bicho de 30 toneladas tiene que dar miedo en el último
    // cuarto de segundo, no en el primero.
    const p = (t - RELEASE) / FALL;
    crane.loaded = false;
    crane.boxX = crane.x;
    crane.boxZ = crane.z;
    crane.boxY = espera - (espera - suelo) * p * p;
    crane.boxTilt = 0.02 * Math.sin(p * Math.PI * 3);
    // El spreader, ya vacío, recoge cable hacia el carro
    crane.spreaderX = crane.x;
    crane.spreaderY = espera + BOX[1] / 2 + 0.28 + 0.9 * p;
    crane.cable = Math.max(0.05, BEAM_Y - 0.28 - crane.spreaderY);
    crane.mark = 1;
    // El cuerpo lo comprime el propio cajón al bajar: el aplastado no aparece
    // de golpe en el fotograma del impacto, va con la panza del contenedor.
    runtime.snatchSquash = squashAt(crane.boxY);
    return true;
  }

  if (t < RELEASE + FALL + IMPACT) {
    // IMPACTO — sello en el suelo. El aplastado es instantáneo (el cajón no
    // negocia) y el bote del cajón es el que devuelve la lectura de peso.
    if (!dropped) {
      dropped = true;
      playImpact();
      runtime.shakeTimer = BALANCE.SHAKE_DURATION * 1.7;
      vfxBus.push({ kind: 'impact', x: hookAt.x, y: 0.3, z: hookAt.z });
      vfxBus.push({ kind: 'impact', x: hookAt.x - 0.7, y: 0.15, z: hookAt.z + 0.4 });
      vfxBus.push({ kind: 'impact', x: hookAt.x + 0.7, y: 0.15, z: hookAt.z - 0.4 });
    }
    const p = (t - RELEASE - FALL) / IMPACT;
    crane.boxY = suelo + Math.sin(p * Math.PI) * 0.16; // bote seco
    crane.boxTilt = 0.05 * Math.sin(p * Math.PI * 2);
    crane.spreaderY = espera + 1.2 + p * 1.4;
    crane.cable = Math.max(0.05, BEAM_Y - 0.28 - crane.spreaderY);
    crane.mark = 0;
    runtime.snatchSquash = squashAt(crane.boxY);
    return true;
  }

  // REPOSO — el cajón asentado y el spreader subiendo a la viga. El silencio
  // de este segundo es lo que remata el chiste negro.
  const p = Math.min(1, (t - RELEASE - FALL - IMPACT) / SETTLE);
  crane.boxY = suelo;
  crane.boxTilt = 0.03;
  // El spreader sube hasta la cota de viaje: la grúa ya está lista para irse
  crane.spreaderY = espera + 2.6 + (TRAVEL_Y - espera - 2.6) * p;
  crane.cable = Math.max(0.05, BEAM_Y - 0.28 - crane.spreaderY);
  crane.mark = 0;
  runtime.snatchSquash = SQUASH_MIN;

  if (p >= 1) resolve();
  return true;
}

/**
 * AVISO. Lo que patrulla sobre el rezagado es YA el castigo que le tocará: el
 * dron dando vueltas con el foco encima, o la grúa plantada con el contenedor
 * colgando y la marca de peligro pintada en el suelo. Fuera de la zona de
 * aviso no hay nada en pantalla.
 */
function warn(dt: number) {
  const alerta = backDanger() && useGameStore.getState().phase === 'playing';
  if (!alerta) {
    drone.visible = false;
    drone.hunting = false;
    drone.light = 0;
    // La grúa no se apaga: recoge y se va rodando por donde vino
    if (crane.visible) craneLeave(dt);
    warned = false;
    return;
  }
  // Flanco de entrada en la zona: se sortea (alternando) quién baja esta vez
  if (!warned) {
    warned = true;
    armKind();
  }
  if (runtime.snatchKind === 'crane') cranePoised(dt);
  else dronePatrol(dt);
}

/** Círculos del dron sobre el rezagado, con la baliza y el foco encendidos */
function dronePatrol(dt: number) {
  crane.visible = false;
  crane.mark = 0;
  drone.visible = true;
  drone.hunting = false;
  drone.carrying = false;
  drone.rotor += dt * 30;
  drone.beacon = 0.5 + 0.5 * Math.sin(runtime.elapsed * 9);
  drone.light = Math.min(0.75, drone.light + dt * 2);

  const a = runtime.elapsed * 1.25;
  drone.x = runtime.x + Math.cos(a) * PATROL_R;
  drone.z = runtime.z + Math.sin(a) * PATROL_R - 1.0;
  drone.y = PATROL_Y + Math.sin(a * 2) * 0.22;
  // Rumbo tangente a la circunferencia, y alabeo hacia dentro del viraje: un
  // multirrotor en órbita va inclinado hacia el centro, no plano.
  drone.yaw = Math.atan2(-Math.sin(a), Math.cos(a));
  drone.pitch = 0.1;
  drone.roll = 0.26;
  drone.ropeX = drone.ropeZ = 0;
}

/**
 * La grúa ENTRA EN ESCENA como entra una grúa: el pórtico rueda por sus rieles
 * desde el fondo del encuadre hasta la fila del colaborador, el carro recorre
 * la viga de un extremo hasta su columna y solo entonces el cable paga y baja
 * el cajón sobre su cabeza. Un eje detrás de otro, cada uno a su velocidad.
 */
function cranePoised(dt: number) {
  drone.visible = false;
  drone.light = 0;
  groundY = standHeight(runtime.row, runtime.col);
  if (!crane.visible) spawnCrane();
  const listo = driveCrane(dt, 1);
  crane.loaded = true;
  // La marca del suelo solo se enciende cuando la carga ya está a plomo: antes
  // de eso el peligro todavía está de camino y marcar sería mentir.
  crane.mark = listo ? 0.35 + 0.3 * Math.sin(runtime.elapsed * 6) : 0;
}

/** Aparece fuera de cuadro, con el cajón recogido contra la viga */
function spawnCrane() {
  crane.visible = true;
  crane.z = runtime.z + ENTRY_Z;
  crane.x = runtime.x >= 0 ? -ENTRY_X : ENTRY_X; // el carro, por el lado lejano
  crane.boxY = TRAVEL_Y;
  swing = 0;
  poseCrane();
}

/**
 * Un frame de maniobra. Devuelve `true` cuando la carga ya está quieta a plomo
 * sobre el colaborador. `urgencia` acelera los tres ejes: se usa cuando el
 * castigo ya está lanzado y la máquina todavía venía de camino.
 */
function driveCrane(dt: number, urgencia: number): boolean {
  // 1. TRASLACIÓN DEL PÓRTICO por los rieles hasta la fila
  crane.z = approach(crane.z, runtime.z, GANTRY_SPEED * urgencia * dt);
  const dz = Math.abs(crane.z - runtime.z);

  // 2. CARRO por la viga, a la vez que el pórtico rueda: las dos traslaciones
  //    se solapan en una grúa de verdad, y encadenarlas se hacía eterno.
  const antesX = crane.x;
  crane.x = approach(crane.x, runtime.x, TROLLEY_SPEED * urgencia * dt);
  const dx = Math.abs(crane.x - runtime.x);

  // 3. IZADO: el cajón viaja recogido contra la viga y el cable empieza a pagar
  //    cuando el carro ya está prácticamente sobre la columna.
  const espera = groundY + HOLD_Y;
  const bajando = dz < 0.6 && dx < 1.2;
  crane.boxY = approach(crane.boxY, bajando ? espera : TRAVEL_Y, HOIST_SPEED * urgencia * dt);
  const aPlomo = dz < 0.35 && dx < 0.25;

  // BALANCEO: lo produce la ACELERACIÓN del carro — la carga se queda atrás al
  // arrancar y se adelanta al frenar. Con el carro parado se apaga solo.
  const vel = dt > 0 ? (crane.x - antesX) / dt : 0;
  const objetivo = Math.max(-0.3, Math.min(0.3, -vel * 0.075));
  swing += (objetivo - swing) * Math.min(1, dt * 5);
  poseCrane();
  return aPlomo && Math.abs(crane.boxY - espera) < 0.05;
}

/** Deriva la pose visible (cable, spreader y cajón) del estado de los ejes */
function poseCrane() {
  const largo = Math.max(0.25, BEAM_Y - crane.boxY); // cable del carro al cajón
  crane.boxTilt = swing;
  crane.boxX = crane.x + Math.sin(swing) * largo;
  crane.boxZ = crane.z;
  crane.spreaderX = crane.x + Math.sin(swing) * (largo - BOX[1] / 2 - 0.1);
  crane.spreaderY = crane.boxY + BOX[1] / 2 + 0.1;
  crane.cable = Math.max(0.05, BEAM_Y - 0.28 - crane.spreaderY);
}

/**
 * RETIRADA. Cuando el colaborador vuelve a estar en zona, la grúa no se
 * desvanece: recoge el cajón y se va rodando por donde vino. Una máquina de 300
 * toneladas que parpadea y desaparece es lo que rompía la escena.
 */
function craneLeave(dt: number) {
  crane.mark = 0;
  crane.loaded = true;
  crane.boxY = approach(crane.boxY, TRAVEL_Y, HOIST_SPEED * 1.3 * dt);
  if (crane.boxY >= TRAVEL_Y - 0.05) {
    const salida = runtime.z + ENTRY_Z;
    crane.z = approach(crane.z, salida, GANTRY_SPEED * dt);
    if (Math.abs(crane.z - salida) < 0.4) crane.visible = false;
  }
  swing += (0 - swing) * Math.min(1, dt * 4);
  poseCrane();
}

/** Altura del colaborador de pie (el casco remata en ~1.56) */
const BODY_H = 1.62;
/** Grosor del sello: por debajo de esto ya no se comprime más */
const SQUASH_MIN = 0.1;

/** Cuánto queda del cuerpo con la panza del contenedor a la cota `boxY` */
function squashAt(boxY: number): number {
  const hueco = boxY - BOX[1] / 2 - groundY; // aire entre el cajón y el suelo
  return Math.max(SQUASH_MIN, Math.min(1, hueco / BODY_H));
}

/** Avanza `from` hacia `to` como mucho `step`: velocidad, no interpolación */
function approach(from: number, to: number, step: number): number {
  const d = to - from;
  return Math.abs(d) <= step ? to : from + Math.sign(d) * step;
}

/**
 * Fin de la retirada: cuesta una vida (como cualquier golpe) y el colaborador
 * reaparece cerca del frente, nunca en el agua ni dentro de un obstáculo.
 */
function resolve() {
  runtime.snatching = false;
  runtime.snatchTime = 0;
  runtime.snatchSpin = 0;
  runtime.snatchRoll = 0;
  runtime.snatchPitch = 0;
  runtime.snatchSquash = 1;
  drone.visible = false;
  drone.hunting = false;
  drone.carrying = false;
  drone.light = 0;
  crane.visible = false;
  crane.mark = 0;
  crane.loaded = true;
  warned = false;

  // Turno consumido: al siguiente rezagado le toca la otra máquina
  nextKind = runtime.snatchKind === 'crane' ? 'drone' : 'crane';

  const store = useGameStore.getState();
  // El texto del popup nombra el motivo: en el stand hay que entender en un
  // segundo que la vida se fue por rezagarse, no por un atropello.
  store.hitObstacle('¡Te quedaste atrás!'); // −25 y una vida

  runtime.col = safeCol(Math.max(BALANCE.MIN_TILE, Math.min(BALANCE.MAX_TILE, runtime.col)));
  runtime.row = safeRow(Math.max(0, runtime.maxRow - 1), runtime.col);
  runtime.x = colX(runtime.col);
  runtime.z = rowZ(runtime.row);
  runtime.y = 0;
  runtime.prevX = runtime.x;
  runtime.prevZ = runtime.z;
  runtime.facing = 0;
  runtime.stunTimer = BALANCE.STUN_TIME;
  runtime.invulnTimer = BALANCE.INVULN_TIME;
  runtime.moveQueue.length = 0;
  store.setCurrentRow(runtime.row);
}

/** Fila pisable más cercana bajando desde `from` (ni agua ni casilla ocupada) */
function safeRow(from: number, col: number): number {
  let r = from;
  while (r > 0 && (rows[r]?.type === 'water' || isBlocked(r, col))) r--;
  return r;
}

/** Si la columna está tapiada en todo el tramo, se vuelve al centro del muelle */
function safeCol(col: number): number {
  const from = Math.max(0, runtime.maxRow - 1);
  for (let r = from; r > Math.max(0, from - 6); r--) {
    if (rows[r] && rows[r].type !== 'water' && !isBlocked(r, col)) return col;
  }
  return 0;
}
