/**
 * Estado TRANSITORIO del game loop — mutado a 60 fps dentro de useFrame.
 *
 * Es un singleton mutable a propósito: nada de esto pasa por React ni por
 * Zustand, así el bucle de render no provoca re-renders. Solo los eventos
 * discretos (recolectar, chocar, completar salto, fin de partida) tocan
 * `useGameStore`.
 */
export type MoveDirection = 'forward' | 'backward' | 'left' | 'right';

export const runtime = {
  /** Segundos transcurridos de partida */
  elapsed: 0,

  // --- Posición lógica en el tablero (comprometida al terminar cada salto) ---
  row: 0,
  col: 0,
  /** Fila máxima alcanzada (score de progreso, como el tutorial) */
  maxRow: 0,

  // --- Posición animada en mundo (la escribe playerLogic cada frame) ---
  x: 0,
  y: 0,
  z: 0,
  /** Rotación Y objetivo según dirección del último salto (tutorial) */
  facing: 0,

  /** Posición del frame anterior — el hit test barre el segmento recorrido
   *  entre frames en vez de muestrear un punto suelto (evita falsos positivos
   *  y tunneling con dt grandes). La escribe `updatePlayer`. */
  prevX: 0,
  prevZ: 0,

  // --- Salto en curso ---
  stepping: false,
  stepProgress: 0,
  /** El "salto" en curso es un IZADO de la grúa del dique mayor: el gancho lo
   *  agarra en el pad, lo iza, lo traslada sobre el buque y lo AVIENTA. */
  carrying: false,
  /** Progreso 0..1 del izado (−1 si no hay izado). Lo lee el render de la
   *  grúa del dique para mover su gancho a la par del colaborador. */
  carryPhase: -1,
  fromRow: 0,
  fromCol: 0,
  toRow: 0,
  toCol: 0,
  /** X de origen del salto (mundo) — permite arrancar desde una X arrastrada
   *  por una barcaza, no solo del centro exacto de la casilla */
  fromX: 0,

  /** El jugador va montado sobre una barcaza/crucero en el agua (mecánica río) */
  riding: false,
  /** Altura de la cubierta sobre la que va montado (la barcaza y el crucero no
   *  están a la misma altura). Solo afecta al render del personaje. */
  rideY: 0,

  /** El colaborador está sobre una BANDA TRANSPORTADORA de TUM y el suelo lo
   *  arrastra. Como `riding`, impide que `updatePlayer` lo fije al centro de la
   *  casilla — la X la lleva `updateConveyor`. */
  dragging: false,

  /**
   * RETIRADA POR QUEDARSE ATRÁS — el castigo de la correa (el papel que en
   * Crossy Road hace el águila): la grúa pórtico le suelta un contenedor
   * encima. Mientras dura, el jugador NO controla nada: la lógica de salto, el
   * agua, la banda y el hit test se apartan y la posición la escribe
   * `world/snatch.ts`.
   */
  snatching: false,
  /** Segundos transcurridos de la retirada */
  snatchTime: 0,
  /** Aplastamiento del cuerpo bajo el contenedor: 1 normal, ~0.1 de sello */
  snatchSquash: 1,

  /** Cola de movimientos (tutorial: `movesQueue`) */
  moveQueue: [] as MoveDirection[],

  // --- Feedback de impacto ---
  stunTimer: 0,
  invulnTimer: 0,
  shakeTimer: 0,

  /** Subsistemas (mapa, VFX) registran aquí su propio reset */
  resetCallbacks: [] as Array<() => void>,

  reset() {
    this.elapsed = 0;
    this.row = 0;
    this.col = 0;
    this.maxRow = 0;
    this.x = 0;
    this.y = 0;
    this.z = 0;
    this.facing = 0;
    this.prevX = 0;
    this.prevZ = 0;
    this.stepping = false;
    this.stepProgress = 0;
    this.carrying = false;
    this.carryPhase = -1;
    this.fromRow = 0;
    this.fromCol = 0;
    this.toRow = 0;
    this.toCol = 0;
    this.fromX = 0;
    this.riding = false;
    this.rideY = 0;
    this.dragging = false;
    this.snatching = false;
    this.snatchTime = 0;
    this.snatchSquash = 1;
    this.moveQueue.length = 0;
    this.stunTimer = 0;
    this.invulnTimer = 0;
    this.shakeTimer = 0;
    for (const cb of this.resetCallbacks) cb();
  },
};
