/**
 * Variables de balanceo del juego. Cualquier tuning de dificultad,
 * puntuación o ritmo se hace aquí — nunca hardcodeado en componentes.
 *
 * Mecánica Crossy Road (javascriptgametutorials.com): tablero ancho de
 * casillas, el jugador avanza a saltos discretos, vehículos cruzan las filas.
 */
export const BALANCE = {
  /** Vidas por partida (la partida termina al perderlas, no por tiempo) */
  LIVES: 3,
  /** Referencia de duración (ya solo informativa para la simulación) */
  GAME_DURATION: 90,

  // --- Tablero (tutorial: minTileIndex -8, maxTileIndex 8 → 17 casillas) ---
  TILE: 1.1,
  MIN_TILE: -8,
  MAX_TILE: 8,

  // --- Movimiento del jugador (tutorial: stepTime 0.2 s, salto sin(p·π)) ---
  STEP_TIME: 0.2,
  HOP_HEIGHT: 0.42,
  /** Máximo de saltos encolables (como el tutorial, evita spam) */
  MOVE_QUEUE_MAX: 3,

  // --- Retroceso (marcha atrás con correa) ---
  /**
   * PASOS ATRÁS permitidos. Crossy Road deja retroceder — lo que no deja es
   * quedarse atrás: el águila baja a por ti. Aquí igual, pero medido en filas
   * por detrás de la MÁXIMA alcanzada, porque esta cámara sigue al jugador y no
   * hay scroll forzado que haga de reloj.
   *
   * Tres es el número: da sitio para recular de un tren o de una barcaza que no
   * llega, y no alcanza para desandar media terminal recogiendo tarjetas.
   */
  BACK_STEPS_MAX: 3,
  /** Filas de margen a las que la máquina de turno empieza a rondar. A UNA: el
   *  primer paso atrás es gratis y no pasa nada — recular una casilla para
   *  dejar pasar un tren es JUGAR, y sacar un pórtico de 300 toneladas por eso
   *  asustaba de más. La máquina aparece en el segundo, con el margen ya en
   *  rojo. Que llegue justa de tiempo no rompe nada: si el jugador se pasa
   *  antes de que esté montada, `snatch.ts` la deja plantarse primero. */
  BACK_WARN_STEPS: 1,

  // --- RETIRADA DEL DRON DE SEGURIDAD (lo que le pasa al que se queda atrás) ---
  /** Descenso: el dron cae en vertical sobre el colaborador y frena en seco */
  DRONE_DIVE_TIME: 0.7,
  /** Enganche del cabestrante: la garra cierra y el cuerpo despega */
  DRONE_GRAB_TIME: 0.18,
  /** Izado y salida de cuadro, con la carga oscilando bajo el dron */
  DRONE_RISE_TIME: 1.3,
  /** Largo del cable del cabestrante. Generoso a propósito: con un cable corto
   *  el colaborador se lee como PARTE del dron y no como alguien colgando de
   *  él, que es justo lo que la escena tiene que contar. */
  DRONE_ROPE: 2.0,

  // --- CONTENEDOR SOBRE LA CABEZA (la otra retirada; se alternan) ---
  /** Los twistlocks abren y el spreader suelta */
  DROP_RELEASE_TIME: 0.32,
  /** Caída libre desde la cota de espera */
  DROP_FALL_TIME: 0.3,
  /** Impacto: el colaborador queda de sello y el contenedor pega el bote */
  DROP_IMPACT_TIME: 0.2,
  /** El contenedor asentado en el suelo antes de reaparecer */
  DROP_SETTLE_TIME: 0.62,
  /** Cota de la viga del pórtico y del contenedor en espera. El cajón cuelga
   *  BAJO a propósito: en cámara isométrica lo que está muy alto se lee como
   *  "detrás" y no como "encima de tu cabeza", que es justo lo que hay que
   *  entender antes de dar el paso. */
  DROP_BEAM_Y: 6.4,
  DROP_HOLD_Y: 3.0,
  /** Contenedor que cae — un TEU a la escala del tablero */
  DROP_BOX: [2.3, 1.15, 1.15] as [number, number, number],

  /** Casillas de aire que recorre un vehículo, ya fuera del tablero, antes de
   *  reaparecer por el otro lado */
  WRAP_MARGIN: 1.5,

  // --- Biomas (una unidad de negocio cada uno; ver BIOME_SEQUENCE) ---
  /** Filas por unidad de negocio.
   *
   *  Bajó de 26 a 18 al entrar la quinta terminal (TUM). Con 26 la vuelta
   *  completa eran 130 filas y la simulación headless muere en la 40: el
   *  jugador de stand se iba habiendo visto bioma y medio, así que las
   *  terminales del final no existían en la práctica. Con 18 la vuelta son 90
   *  filas y una partida decente pasa por todas. */
  ZONE_LENGTH: 18,

  // --- Bioma TILH (terminal intermodal ferroviaria) ---
  /** Largo del tren en casillas (locomotora + plataformas) */
  TRAIN_TILES: 10,
  /** RAPIDÍSIMO, como el tren de Crossy Road: no se esquiva reaccionando, se
   *  cruza LEYENDO EL SEMÁFORO. A esta velocidad el aviso es la mecánica. */
  TRAIN_SPEEDS: [7.5, 8.5],
  /** Aire extra del wrap del tren: pausa entre pasadas. Menos aire = pasa más
   *  seguido; el descanso real es el semáforo apagado. */
  TRAIN_GAP_TILES: 9,
  /** Distancia a la que el semáforo empieza a parpadear. Subida con la
   *  velocidad: el tren tarda ~1.6 s desde el aviso hasta entrar en tablero —
   *  tiempo de terminar el salto en curso y ni uno más. */
  TRAIN_WARN_DISTANCE: 13,
  /** Probabilidad de VÍA en una fila libre del bioma (antes 0.3: la terminal
   *  ferroviaria tenía menos trenes que patios vacíos) */
  RAIL_ROW_CHANCE: 0.5,

  // --- Generación de filas (tutorial: 20 por lote, extender a falta de 10) ---
  ROWS_BATCH: 24,
  /** Se extiende el mapa en cuanto quedan menos de estas filas por delante.
   *  Debe superar lo que ve la cámara en la pantalla más grande (39 filas a 4K)
   *  o el jugador alcanza el final del mapa generado y ve océano. */
  ROWS_EXTEND_AT: 56,
  /** Suelo mínimo de la ventana de render; el valor real lo calcula
   *  `viewRowsFor` a partir del tamaño de la ventana. */
  VIEW_BEHIND: 12,
  VIEW_AHEAD: 16,
  /** Techo de la ventana de render (freno de seguridad en pantallas enormes) */
  VIEW_MAX: 44,

  // --- Vehículos (tutorial: 125/156/188 px/s; rebajados para el stand) ---
  VEHICLE_SPEEDS: [2.0, 2.5, 3.0],
  /** Factor de dificultad progresiva por profundidad de fila (cap +20%) */
  SPEED_ROW_FACTOR: 1 / 300,
  SPEED_FACTOR_CAP: 1.2,
  /** Máximo de filas de tráfico consecutivas. A 1, detrás de cada fila con
   *  peligro móvil va siempre una de descanso: nunca hay que encadenar dos
   *  esquivas sin parar (accesibilidad del stand). */
  MAX_ROAD_STREAK: 1,
  /** Filas iniciales garantizadas sin tráfico */
  SAFE_START_ROWS: 8,

  // --- Zona cruceros (ECV) ---
  /** Largo DIBUJADO del crucero */
  SHIP_TILES: 8,
  /** Tramo ABORDABLE: la cubierta de paseo central. Los castillos de proa y
   *  popa quedan fuera, así el jugador nunca aterriza dentro de una caseta. */
  SHIP_DECK_TILES: 5,
  /** Altura de la cubierta de paseo (donde se para el jugador) */
  SHIP_DECK_Y: 0.46,
  /** Un crucero es enorme: va despacio y se ve venir de lejos */
  SHIP_SPEEDS: [1.8, 2.2],
  /** Probabilidad de que una fila de agua lleve un crucero abordable. Alta: el
   *  crucero ES la seña de identidad del bioma, tiene que aparecer varias veces
   *  al cruzarlo. Va UNO por fila (con más, la marina se lee como un muro de
   *  cascos blancos) y nunca en dos filas de agua seguidas. */
  SHIP_ROW_CHANCE: 0.7,

  // --- FLOTA de la dársena: las plataformas abordables (mecánica de río) ---
  /**
   * Antes toda la marina eran BARCAZAS: una plancha con franjas naranja,
   * repetida tres veces por fila. Cumplía como plataforma pero no se parecía a
   * nada que se vea en un puerto de cruceros. Ahora hay flota de verdad y el
   * REMOLCADOR es la principal (más peso en el sorteo).
   *
   * `tiles` es el tramo ABORDABLE y `visual` el largo DIBUJADO: la caseta, el
   * palo y la cabina caen fuera del tramo abordable, así el colaborador nunca
   * aterriza dentro de una superestructura.
   *
   * OJO: todas las embarcaciones de una fila comparten VELOCIDAD (ver
   * `spreadFleet`). Si cada tipo tuviera la suya, la separación derivaría vuelta
   * a vuelta hasta que se alcanzaran — que es justo lo que no puede pasar.
   */
  BOAT_FLEET: [
    { kind: 'tug', tiles: 3, visual: 4, weight: 4 },
    { kind: 'fish', tiles: 3, visual: 5, weight: 2 },
    { kind: 'sail', tiles: 3, visual: 5, weight: 2 },
    { kind: 'yacht', tiles: 3, visual: 4, weight: 2 },
  ] as const,
  /** Embarcaciones por fila de agua (el crucero cuenta como una) */
  BOAT_COUNT: 3,
  BOAT_SPEEDS: [1.6, 2.0, 2.4],
  /** Cubierta abordable — la misma cota en toda la flota pequeña */
  BOAT_DECK_Y: 0.3,
  /**
   * MANGA del casco. Por debajo de la fila (1.1) A PROPÓSITO: con 1.12 los
   * cascos de dos filas de agua contiguas se solapaban y la marina se leía como
   * barcos chocando. Con 0.92 queda un canal de agua visible entre filas.
   */
  BOAT_BEAM: 0.92,
  /**
   * AGUA LIBRE mínima entre dos cascos de la MISMA fila. Si con las
   * embarcaciones sorteadas no cabe, se retira una: antes se repartían por
   * centros y un crucero de 8.8 dejaba a sus vecinas casi pegadas.
   */
  BOAT_MIN_GAP: 2.4,
  /** Tolerancia extra para considerar que aterrizaste sobre la cubierta */
  BOARD_MARGIN: 0.18,
  /** Máximo de filas de agua consecutivas antes de un muelle de descanso */
  MAX_WATER_STREAK: 2,
  /** Máximo de MUELLES seguidos. Sin tope, el sorteo 50/50 encadenaba tandas de
   *  cinco y seis pontones: media terminal de cruceros era un tablado de madera
   *  corrido, sin nada que esquivar y sin nada que mirar. */
  MAX_DOCK_STREAK: 2,
  /** Probabilidad de que una fila libre de la terminal sea AGUA */
  WATER_ROW_CHANCE: 0.62,
  /** ...y de encadenar una SEGUNDA fila de agua seguida: el salto de barcaza a
   *  barcaza es el momento fuerte del bioma, pero en dosis pequeñas. */
  WATER_CHAIN_CHANCE: 0.3,
  /** Acabados distintos de pontón (ver `DockDeck`): madera, hormigón, servicio */
  DECK_VARIANTS: 3,

  // --- Flotación de las embarcaciones pequeñas (barcaza / remolcador) ---
  /** Cuánto se hunde el casco con el colaborador encima */
  BOAT_SINK_DEPTH: 0.14,
  /** Golpe de entrada al aterrizar de un salto (velocidad inicial del muelle) */
  BOAT_SINK_IMPULSE: 0.85,
  /** Rigidez y amortiguación del muelle de flotación. Con estos valores la
   *  frecuencia es ~1.5 Hz y el amortiguamiento ~0.58: se hunde de golpe, rebota
   *  una vez y se asienta. */
  BOAT_SINK_STIFFNESS: 90,
  BOAT_SINK_DAMPING: 11,

  // --- Bioma TUM (terminal universal: carga general, granel y Ro-Ro) ---
  /** BANDA TRANSPORTADORA: el suelo se mueve. Es el verbo propio de TUM —
   *  ni esquivar (TEC) ni montarse (ECV): dejarse llevar y corregir. No mata,
   *  te descoloca, y por eso la fila lleva premio encima. */
  BELT_SPEED: 1.5,
  /** Reparto de filas del bioma: banda / tráfico de patio / patio de carga.
   *  Con 0.42 y una sola fila de separación salía una banda de cada dos filas
   *  (medido: 6 de 17) y el bioma se leía como una fábrica de cintas, no como
   *  una terminal que tiene cintas. */
  BELT_ROW_CHANCE: 0.28,
  BULK_ROW_CHANCE: 0.34,
  /** Filas mínimas entre dos bandas */
  BELT_MIN_GAP: 2,
  /** MAQUINARIA DE GRANEL — el tráfico de TUM. Las tolvas van en CONVOY (la
   *  fila que se forma bajo la torre de carga) y el hueco entre dos es la
   *  ventana de paso; las cargadoras de pala van repartidas, cruzando el patio
   *  entre el montón y el barco. */
  HOPPER_TILES: 4,
  HOPPER_COUNT: 3,
  /** Casillas de aire entre dos tolvas del convoy */
  HOPPER_GAP_TILES: 1.6,
  HOPPER_SPEEDS: [2.2, 2.6, 3.0],
  LOADER_TILES: 3,
  LOADER_COUNT: 2,
  /** La cargadora va cargada y despacio: es la máquina lenta del patio */
  LOADER_SPEEDS: [1.7, 2.0],
  /** De las filas de tráfico de TUM, cuántas son de tolvas (el resto, palas) */
  HOPPER_ROW_SHARE: 0.6,

  // --- Bioma TNG (astillero naval) ---
  /** Los diques jugables son VERTICALES: corren a lo LARGO del recorrido
   *  (varias filas de fondo, pocas columnas de ancho — como un dique seco de
   *  verdad, que se excava perpendicular al muelle). Se cruzan por una CADENA
   *  DE ANDAMIOS: una pasarela por fila, alineadas en la misma columna, o se
   *  rodean por los costados. */
  /** Probabilidad de ARRANCAR un dique vertical en una fila de patio elegible.
   *  Más baja que la vieja DOCK_CHANCE porque cada dique ocupa varias filas. */
  VDOCK_CHANCE: 0.34,
  /** Ancho en columnas. A ESCALA DEL DIQUE MAYOR: los de 2-3 casillas se
   *  leían como zanjas al lado del colaborador, no como un dique seco.
   *  Tope 5: con 6, el hueco que queda para rodearlo por un costado baja de
   *  5 casillas y el rodeo se vuelve una carrera lateral. */
  VDOCK_WIDTH: [4, 5] as const,
  /** Fondo en filas — el conjunto de andamios que hay que encadenar */
  VDOCK_LEN: [5, 6, 7] as const,
  /** Probabilidad de buque en reparación dentro (solo si len ≥ 4: el casco
   *  monumental necesita eslora para leerse como barco) */
  VDOCK_SHIP_CHANCE: 0.7,
  /** Intentos de colocación antes de rendirse (colisión con la fila previa) */
  VDOCK_TRIES: 8,
  /** Filas de patio LIBRES entre dos diques verticales. Sin este respiro el
   *  generador podía arrancar un dique en la fila siguiente a la última de otro:
   *  los dos fosos compartían muro y desde la cámara isométrica se leían como
   *  UNA sola excavación con dos barcos encajados. Además el patio intermedio
   *  es lo que da al jugador una fila para reposicionarse antes del siguiente
   *  foso. */
  VDOCK_MIN_GAP: 3,
  // --- DIQUE MAYOR (astillero): muro de lado a lado con un buque grande ---
  /** Fila del dique dentro de la zona (zpos). Es un TAPÓN total: no se rodea.
   *  Se cruza de dos maneras — por las PASARELAS de andamio que salvan el
   *  buque POR ENCIMA, o poniéndote en el PUNTO DE EMBARQUE para que la grúa
   *  del dique te aviente al otro lado. */
  MEGADOCK_POS: 12,
  /** Cota de la pasarela de andamio: por ENCIMA de TODO el buque — el cruce a
   *  pie pasa sobre el barco, no lo rodea.
   *
   *  El punto más alto del buque no es la cubierta (2.05) sino sus CASETAS, que
   *  rematan en 2.55. Con la cota antigua (2.45) el tablón ocupaba 2.37→2.45 y
   *  la caseta de x=−3.2 remataba justo en 2.45: dos caras coplanares que se
   *  peleaban por el píxel (parche gris en el tablón, siempre que la pasarela
   *  caía en la columna −3, y las casetas altas asomaban por encima).
   *
   *  2.8 deja el tablón en 2.72→2.80, con 0.17 de aire sobre la caseta más
   *  alta. Si se sube alguna caseta de `megaDockParts`, hay que subir esto. */
  MEGADOCK_WALK_Y: 2.8,
  /** Duración total del viaje en grúa (el salto normal dura 0.2 s). Ya no es
   *  un arco de salto: son TRES FASES — izado vertical en el pad, traslado
   *  colgado sobre el buque y LANZAMIENTO al otro lado. */
  CARRY_TIME: 1.6,
  /** Cota a la que iza el gancho — por encima de pasarelas (2.8) y casetas */
  CARRY_LIFT_Y: 3.6,
  /** Reparto de fases sobre el progreso 0..1: hasta LIFT se iza en vertical,
   *  hasta RELEASE se traslada colgado, y de ahí al final va VOLANDO SOLO
   *  (la grúa lo suelta con impulso, no lo deposita). */
  CARRY_LIFT_FRAC: 0.32,
  CARRY_RELEASE_FRAC: 0.78,
  /** Fracción del recorrido en Z ya cubierta al soltar: el resto es vuelo */
  CARRY_RELEASE_DIST: 0.62,

  /** GRÚA PÓRTICO de taller: barre la fila entera a ras de suelo. A diferencia
   *  de la RTG (solo patas), aquí el carro arrolla en TODA su manga: el paso
   *  seguro son los andamios, que quedan por encima de la viga. */
  GANTRY_SPEEDS: [2.2, 2.8, 3.4],
  /** Media caja del carro de la grúa pórtico (lo que arrolla) */
  GANTRY_HALF_X: 1.05,
  /** Altura de la plataforma del andamio: el colaborador se sube encima */
  SCAFFOLD_Y: 0.66,
  /** Andamios por fila de grúa pórtico (refugios repartidos por el tablero) */
  SCAFFOLD_COUNT: [3, 4],
  /** Separación mínima entre andamios, para que el salto entre refugios sea de
   *  2-4 casillas: ni pegados (trivial) ni inalcanzables. */
  SCAFFOLD_MIN_GAP: 2,

  // --- Grúas RTG móviles (peligro: sus patas; el hueco central es seguro) ---
  CRANE_SPEED: 1.5,
  /** Distancia del centro de la grúa a cada pata (en unidades de mundo) */
  CRANE_LEG_OFFSET: 1.65,
  /** Media caja de la base de la pata, MEDIDA sobre la malla dibujada
   *  (scripts/measure-hitboxes.ts). Antes se usaba un radio de 0.48: más del
   *  doble de lo que se ve, así que atropellaba a quien pasaba de largo. */
  CRANE_LEG_HALF_X: 0.21,
  CRANE_LEG_HALF_Z: 0.66,

  // --- Puntuación ---
  SCORE_GOOD: 100,
  SCORE_BAD: -50,
  SCORE_OBSTACLE: -25,
  /** Puntos por cada fila nueva alcanzada (progreso, como el score del tutorial) */
  SCORE_ROW: 10,
  COMBO_X2_AT: 5,
  COMBO_X3_AT: 10,
  /** PASAPORTE: bonus al sellar una terminal nueva, y premio gordo al
   *  completar las cinco. Es lo que convierte la partida infinita en un
   *  recorrido con meta. */
  SCORE_STAMP: 250,
  SCORE_PASSPORT_COMPLETE: 1500,

  // --- Colisión ---
  /** Media caja del colaborador. El torso mide 0.56×0.34; se usan valores algo
   *  menores (y se ignoran los brazos) para que la colisión perdone roces. */
  PLAYER_HALF_X: 0.24,
  PLAYER_HALF_Z: 0.14,
  /** Perdón: las cajas deben solaparse MÁS que esto para contar como golpe.
   *  Garantiza que la colisión nunca sea más estricta que lo que se dibuja. */
  HIT_FORGIVE: 0.08,

  // --- Feedback de impacto ---
  STUN_TIME: 0.45,
  INVULN_TIME: 1.5,
  SHAKE_DURATION: 0.35,
} as const;

/**
 * Media caja DIBUJADA de cada vehículo, medida sobre las mallas reales con
 * `scripts/measure-hitboxes.ts` (no derivada de `tiles`, que solo describe el
 * hueco que el vehículo reserva en la fila y siempre sobra por los extremos).
 *
 *   camión      2.53 dibujado  vs  2.97 de hitbox antigua  → 0.44 de más
 *   AGV         1.49                1.87                    → 0.38
 *   montacargas 1.00                1.32                    → 0.32
 *   tren        5.55                5.72                    → 0.17
 *
 * Las barcazas no aparecen: en el agua son PLATAFORMA, no obstáculo.
 */
export const VEHICLE_HITBOX: Record<string, { x: number; z: number }> = {
  truck: { x: 2.53, z: 0.53 },
  agv: { x: 1.49, z: 0.51 },
  forklift: { x: 1.0, z: 0.45 },
  train: { x: 5.55, z: 0.47 },
  hopper: { x: 1.73, z: 0.55 },
  loader: { x: 1.8, z: 0.6 },
};

/** Vehículo + jugador, con el perdón ya aplicado. Precalculado: el hit test lo
 *  consulta por cada vehículo y frame, así que no debe asignar nada. */
const NO_HIT = { x: 0, z: 0 };
const EFFECTIVE_HITBOX: Record<string, { x: number; z: number }> = Object.fromEntries(
  Object.entries(VEHICLE_HITBOX).map(([kind, box]) => [
    kind,
    {
      x: box.x + BALANCE.PLAYER_HALF_X - BALANCE.HIT_FORGIVE,
      z: box.z + BALANCE.PLAYER_HALF_Z - BALANCE.HIT_FORGIVE,
    },
  ]),
);

/** Media caja efectiva vehículo+jugador. `{x:0}` = no atropella (barcazas y
 *  decorativos: en el agua la barcaza es plataforma, no obstáculo). */
export function hitHalfExtents(kind: string): { x: number; z: number } {
  return EFFECTIVE_HITBOX[kind] ?? NO_HIT;
}

/**
 * Filas que hay que dibujar para que la cámara NUNCA vea océano en el hueco del
 * mapa, en función del tamaño de la ventana.
 *
 * La cámara es ortográfica con zoom FIJO (58): a más resolución, más mundo entra
 * en cuadro. Con la ventana fija de 16/12 filas eso significaba que en cuanto la
 * pantalla pasaba de ~1280×800 el mapa se acababa dentro del encuadre y
 * aparecía el azul del océano de fondo. Medido: 1600×900 ve 17 filas adelante,
 * 1920×1080 ve 20, 2560×1440 ve 26 y 4K ve 39.
 *
 * Los coeficientes salen de proyectar las ESQUINAS de la caja ortográfica sobre
 * el plano del suelo con la base de la cámara de `CameraRig` (offset 5.2/9.2/6.4
 * mirando a 0/0.4/-1.2). Adelante y atrás solo difieren en el término constante.
 */
export function viewRowsFor(width: number, height: number): { ahead: number; behind: number } {
  const halfW = width / CAM_ZOOM / 2;
  const halfH = height / CAM_ZOOM / 2;
  const span = 1.194 * halfH + 0.565 * halfW; // alcance de la esquina, en unidades
  const margen = 2; // filas de colchón para que nunca se vea el borde
  const filas = (z: number) => Math.ceil(z / BALANCE.TILE) + margen;
  return {
    ahead: Math.min(BALANCE.VIEW_MAX, Math.max(BALANCE.VIEW_AHEAD, filas(span + 1.545))),
    behind: Math.min(BALANCE.VIEW_MAX, Math.max(BALANCE.VIEW_BEHIND, filas(span - 1.545))),
  };
}

/** Zoom de la cámara ortográfica (ver CameraRig) */
export const CAM_ZOOM = 58;

/** X del centro de una columna del tablero */
export function colX(col: number): number {
  return col * BALANCE.TILE;
}

/** Z del centro de una fila (avanzar = -z) */
export function rowZ(row: number): number {
  return -row * BALANCE.TILE;
}

/** Multiplicador de velocidad de vehículos según profundidad (dificultad progresiva) */
export function speedFactorForRow(rowIndex: number): number {
  return Math.min(BALANCE.SPEED_FACTOR_CAP, 1 + rowIndex * BALANCE.SPEED_ROW_FACTOR);
}
