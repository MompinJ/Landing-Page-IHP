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
  /** Conceptos correctos SEGUIDOS que devuelven una vida (nunca por encima de
   *  LIVES: la vida extra repone, no acumula). */
  EXTRA_LIFE_STREAK: 15,
  /** Referencia de duración (ya solo informativa para la simulación) */
  GAME_DURATION: 90,

  // --- REMATE DE MUERTE (el compás antes de la pantalla final) ---
  /**
   * Lo que dura el remate entero. Un segundo y pico: bastante para leer qué te
   * ha matado y ni un frame más — en un stand hay cola detrás, y una muerte que
   * se hace larga se vive como que el juego no responde.
   */
  DEATH_BEAT: 1.15,
  /**
   * CONGELADO inicial. El mundo se para en seco en el instante del golpe: es lo
   * que hace que el ojo vuelva al sitio del impacto en vez de seguir al camión.
   * Es el mismo truco de fotograma congelado de los juegos de pelea, y a 0.16 s
   * se lee como un golpe, no como un tirón.
   */
  DEATH_FREEZE: 0.16,
  /** Pasado el congelado, el mundo sigue a esta fracción de velocidad */
  DEATH_SLOWMO: 0.22,
  /** Acercamiento de la cámara al final del remate (1 = no se mueve) */
  DEATH_ZOOM: 1.42,
  /** Aplastado del cuerpo al morir: se conserva el volumen a ojo — lo que
   *  pierde de alto lo gana de ancho, el aplastado de dibujo animado. */
  DEATH_SQUASH: 0.26,

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

  // --- CONTENEDOR SOBRE LA CABEZA (lo que le pasa al que se queda atrás) ---
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
   *  Bajó de 26 a 18 al entrar la quinta terminal (TUM), y de 18 a 13 por el
   *  mismo motivo que entonces: la vuelta completa era de 90 filas y las
   *  terminales del final no llegaban a verse. El ASTILLERO es el cuarto de la
   *  rotación, o sea que había que sobrevivir hasta la fila 54 para pisarlo por
   *  primera vez — existía en el código y no en la partida.
   *
   *  Con 13 la vuelta son 65 filas y el astillero arranca en la 39: quince
   *  filas antes. Se paga con terminales más cortas, pero el reparto es mejor
   *  para un stand — se ven MÁS unidades de negocio en la misma partida, que es
   *  justo lo que persigue el pasaporte. */
  ZONE_LENGTH: 13,

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

  // --- DIFICULTAD PROGRESIVA (cuanto más lejos, más difícil) ---
  /**
   * Filas que hay que recorrer para llegar a la dificultad MÁXIMA. `RAMP_ROWS`
   * es la escala de todo lo que sube con la distancia (ver `difficultyForRow`):
   * velocidades, densidad de riesgo y filas de peligro encadenadas.
   *
   * 150 filas ≈ ocho terminales (ZONE_LENGTH 18), o sea vuelta y media larga:
   * el jugador de stand que cruza dos o tres terminales nota que aprieta, y el
   * que aguanta la vuelta entera se encuentra el juego al máximo. Que la rampa
   * acabe en algún punto es deliberado: si no tuviera techo, la partida larga
   * dejaría de ser difícil para ser imposible, y eso no premia jugar bien.
   */
  RAMP_ROWS: 150,
  /** Velocidad de los vehículos: de ×1 al arrancar a ×1.75 al final de la
   *  rampa. Antes el techo era ×1.2 alcanzado a la fila 60 — o sea que la
   *  dificultad estaba resuelta antes de salir de la segunda terminal. */
  SPEED_FACTOR_CAP: 1.75,
  /** Filas de tráfico consecutivas: 1 al principio (detrás de cada peligro
   *  móvil va una de descanso) y 2 pasada la mitad de la rampa. Encadenar dos
   *  esquivas sin parar es el salto de exigencia más grande que hay, así que
   *  llega tarde y no sube más de ahí. */
  MAX_ROAD_STREAK: 1,
  ROAD_STREAK_MAX_LATE: 2,
  /** Fracción de la rampa a partir de la cual se permite encadenar peligros */
  ROAD_STREAK_AT: 0.5,
  /** Tarjetas ROJAS: su probabilidad se multiplica por esto al final de la
   *  rampa. Más riesgo en el tablero = más lectura antes de saltar. */
  BAD_CARD_RAMP: 2.0,
  /** ...y las VERDES escasean un poco (×0.8): el combo se vuelve algo que hay
   *  que ir a buscar, no algo que cae solo por avanzar. */
  GOOD_CARD_RAMP: 0.8,
  /** La banda transportadora arrastra más fuerte cuanto más lejos (×1.55) */
  BELT_SPEED_RAMP: 1.55,

  /** Filas iniciales garantizadas sin tráfico. Bajó de 8 con las zonas de 13:
   *  ocupaba más de la mitad de la primera terminal y la TEC se presentaba
   *  como un patio vacío. Con 5 sigue habiendo arranque de cortesía. */
  SAFE_START_ROWS: 5,

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

  // --- Bioma multipropósito (carga general, granel y Ro-Ro) ---
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
   *  Más baja que la vieja DOCK_CHANCE porque cada dique ocupa varias filas.
   *  Subida de 0.34: con aquella, el 36% de la zona salía patio pelado que
   *  podía estar en cualquier otra terminal, y el dique seco —que es LO que
   *  hace que un astillero se lea como astillero— aparecía 1.45 veces por
   *  zona. Ver `scripts/shipyard-audit.ts`.
   *
   *  OJO al subirla más: cada dique ocupa VDOCK_LEN filas, así que subir esto
   *  se come el presupuesto de filas del bioma y ahoga el peligro MÓVIL. Con
   *  0.44 los diques pasaban a 8.4 filas por zona y las grúas pórtico se
   *  quedaban clavadas en 2.3, que era justo lo contrario de lo que se buscaba. */
  VDOCK_CHANCE: 0.4,
  /** Ancho en columnas. A ESCALA DEL DIQUE MAYOR: los de 2-3 casillas se
   *  leían como zanjas al lado del colaborador, no como un dique seco.
   *  Tope 5: con 6, el hueco que queda para rodearlo por un costado baja de
   *  5 casillas y el rodeo se vuelve una carrera lateral. */
  VDOCK_WIDTH: [4, 5] as const,
  /** Fondo en filas — el conjunto de andamios que hay que encadenar.
   *
   *  Acortado desde [5,6,7]: el bioma tiene 18 filas y de ahí ya salen fijas el
   *  cartel de entrada, el dique mayor y sus dos filas despejadas. Con diques
   *  de hasta 7 filas, DOS diques se comían casi todo lo que quedaba y no había
   *  presupuesto para grúas ni tráfico — el astillero acababa siendo el bioma
   *  con menos peligro móvil de los cinco. Diques más cortos dejan sitio sin
   *  quitar ni un dique: siguen apareciendo igual de a menudo. */
  VDOCK_LEN: [4, 5, 6] as const,
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
   *  del dique te aviente al otro lado.
   *
   *  TIENE QUE CABER CON SUS DOS VECINAS: la fila de antes y la de después se
   *  fuerzan despejadas (ver `generateRow`), la primera para que `ensurePassable`
   *  no perfore el muro y la segunda porque ahí ATERRIZA el lanzamiento de la
   *  grúa y no puede caer sobre tráfico. Con ZONE_LENGTH 13 y la posición
   *  antigua (12) el dique caía en la ÚLTIMA fila de la zona y su vecina de
   *  después ya era la frontera del bioma siguiente, así que se centra: 6 deja
   *  las tres filas (5, 6 y 7) holgadamente dentro. */
  MEGADOCK_POS: 6,
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
  /**
   * TODO SUMA Y RESTA DE DIEZ EN DIEZ, como en Terminal Rally: el marcador del
   * stand se lee de un vistazo y las dos dinámicas hablan el mismo idioma.
   * Antes esto iba en centenas (+100/−50) y una partida decente pasaba de
   * 20.000 puntos: la cifra dejaba de significar nada.
   */
  SCORE_GOOD: 10,
  /** Concepto de riesgo — lo mismo que cuesta en Terminal Rally */
  SCORE_BAD: -10,
  /**
   * CHOCAR NO RESTA PUNTOS: cuesta UNA VIDA y ya. Cobrar las dos cosas era
   * castigo doble por el mismo error, y encima el único que el jugador no
   * siempre puede evitar (una grúa que barre la fila entera). La vida es la
   * moneda de los golpes; los puntos, la de las decisiones.
   */
  SCORE_OBSTACLE: 0,
  /** Puntos de progreso: +10 cada SCORE_ROW_EVERY filas nuevas. No por fila —
   *  a fila suelta el marcador se convertía en un cuentakilómetros y las
   *  tarjetas dejaban de decidir la partida. */
  SCORE_ROW: 10,
  SCORE_ROW_EVERY: 10,
  COMBO_X2_AT: 5,
  COMBO_X3_AT: 10,
  /** PASAPORTE: bonus al sellar una terminal nueva, y premio gordo al
   *  completar las cinco. Es lo que convierte la partida infinita en un
   *  recorrido con meta. Reescalados a la puntuación de decenas: el sello vale
   *  5 conceptos y el pasaporte entero 30. */
  SCORE_STAMP: 50,
  SCORE_PASSPORT_COMPLETE: 300,

  // --- Recogida de tarjetas ---
  /**
   * RADIO DE RECOGIDA en X. La tarjeta se recoge cuando el colaborador PASA
   * POR ENCIMA de ella, no solo cuando aterriza en su casilla: media casilla a
   * cada lado, o sea justo el ancho de la casilla de la tarjeta.
   *
   * Existe porque en las filas donde el suelo se mueve (la BANDA de TUM) la
   * posición del colaborador es continua, no una casilla: la banda lo pasaba
   * por encima del hexágono verde y no lo recogía, y para cogerlo había que
   * saltar en el sitio justo. Eso se lee como que el juego falla, no como
   * mecánica. Ver `sweepPickup` en `playerLogic.ts`.
   */
  PICKUP_RADIUS: 0.55,

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
 * DESPLAZAMIENTO DE LA CÁMARA respecto al jugador y ALTURA del punto de mira.
 * Son los de `components/CameraRig.tsx` y viven aquí porque `viewRowsFor` tiene
 * que proyectar el encuadre EXACTO para saber cuántas filas dibujar: si las dos
 * cuentas se separan, aparece océano en el hueco del mapa.
 */
export const CAM_OFFSET: readonly [number, number, number] = [5.2, 9.2, 6.4];
export const CAM_LOOK_Y = 0.4;

/**
 * Filas que hay que dibujar para que la cámara NUNCA vea océano en el hueco del
 * mapa, en función del tamaño de la ventana.
 *
 * Con la ventana fija de 16/12 filas, en cuanto la pantalla pasaba de ~1280×800
 * el mapa se acababa dentro del encuadre y aparecía el azul del océano de fondo.
 * Medido: 1600×900 ve 17 filas adelante, 1920×1080 ve 20, 2560×1440 ve 26 y 4K
 * ve 39.
 *
 * CÓMO SE CUENTA, y por qué ya no son coeficientes ajustados. Antes esto era
 * `1.194·halfH + 0.565·halfW ± 1.545`: tres números medidos UNA vez contra el
 * encuadre de escritorio, con el zoom clavado en 58 y la mira siempre 1.2 por
 * delante. En cuanto el teléfono movió las dos cosas (`camZoomFor` aleja la
 * cámara) los coeficientes pasaron a mentir
 * — y a mentir CORTO, que es el lado malo: se dibujaban 17 filas donde la
 * cámara alcanzaba 18.5, o sea océano por delante justo en la pantalla nueva.
 *
 * Así que se proyecta de verdad. En una cámara ORTOGRÁFICA todos los rayos son
 * paralelos a la dirección de vista, así que basta con lanzar las cuatro
 * ESQUINAS de la caja de vista contra el plano del suelo y quedarse con la que
 * más lejos cae en cada sentido. Sale exacto para cualquier zoom y cualquier
 * mira, sin nada que reajustar la próxima vez que se toque el encuadre.
 */
export function viewRowsFor(width: number, height: number): { ahead: number; behind: number } {
  const zoom = camZoomFor(width, height);
  const halfW = width / zoom / 2;
  const halfH = height / zoom / 2;

  // Base de la vista, con el jugador en el origen
  const look: [number, number, number] = [0, CAM_LOOK_Y, -CAM_LOOK_AHEAD];
  const dir: [number, number, number] = [
    look[0] - CAM_OFFSET[0],
    look[1] - CAM_OFFSET[1],
    look[2] - CAM_OFFSET[2],
  ];
  const dl = Math.hypot(dir[0], dir[1], dir[2]);
  const v: [number, number, number] = [dir[0] / dl, dir[1] / dl, dir[2] / dl];

  // Derecha de pantalla: perpendicular a la vista y horizontal (no tiene
  // componente vertical, por eso más abajo solo `U` interviene en la altura).
  const rl = Math.hypot(v[2], v[0]);
  const R: [number, number] = [-v[2] / rl, v[0] / rl]; // [x, z]

  // Arriba de pantalla: el vertical del mundo con la parte que mira a cámara
  // descontada, renormalizado.
  const d = v[1];
  const u: [number, number, number] = [-d * v[0], 1 - d * v[1], -d * v[2]];
  const ul = Math.hypot(u[0], u[1], u[2]);
  const U: [number, number, number] = [u[0] / ul, u[1] / ul, u[2] / ul];

  let adelante = -Infinity;
  let atras = -Infinity;
  for (const sw of [-halfW, halfW]) {
    for (const sh of [-halfH, halfH]) {
      // Cuánto hay que avanzar desde la esquina, a lo largo de la vista, hasta
      // tocar el suelo (y = 0)
      const t = -(look[1] + sh * U[1]) / v[1];
      const z = look[2] + sw * R[1] + sh * U[2] + t * v[2];
      adelante = Math.max(adelante, -z);
      atras = Math.max(atras, z);
    }
  }

  const margen = 2; // filas de colchón para que nunca se vea el borde
  const filas = (z: number) => Math.ceil(z / BALANCE.TILE) + margen;
  return {
    ahead: Math.min(BALANCE.VIEW_MAX, Math.max(BALANCE.VIEW_AHEAD, filas(adelante))),
    behind: Math.min(BALANCE.VIEW_MAX, Math.max(BALANCE.VIEW_BEHIND, filas(atras))),
  };
}

/**
 * RECORTE de la ventana de dibujo al techo del nivel gráfico.
 *
 * Cada fila de más son mallas, llamadas de dibujo y —si hay sombra— una segunda
 * pasada de todas ellas. En una pantalla de 4K con gráfica integrada, dibujar
 * las 41 filas de puerto que la cámara alcanza es justo lo que no se puede
 * pagar, así que el nivel pone techo (ver `render/quality.ts`).
 *
 * Recortar tiene un coste y hay que verlo: por debajo de lo que la cámara
 * alcanza, en el hueco del mapa aparece el azul del océano. Por eso se recorta
 * a proporción pero SIEMPRE se conserva más vista por delante que por detrás —
 * quedarse corto por delante se ve de frente y quedarse corto por detrás casi
 * no se mira.
 *
 * Vive aquí, y no dentro del componente, para que `scripts/viewport-test.ts`
 * pueda comprobar el resultado FINAL: la ventana que de verdad se dibuja es
 * esta, no la que devuelve `viewRowsFor`, y el fallo que hay que cazar es que
 * el techo se coma lo que la cámara ve.
 */
export function clampViewRows(
  view: { ahead: number; behind: number },
  maxRows: number,
): { ahead: number; behind: number } {
  if (view.ahead + view.behind <= maxRows) return view;
  const k = maxRows / (view.ahead + view.behind);
  return {
    ahead: Math.max(BALANCE.VIEW_AHEAD, Math.round(view.ahead * k)),
    behind: Math.max(8, Math.round(view.behind * k)),
  };
}

/** Zoom de la cámara ortográfica en el caso bueno: pantalla de escritorio.
 *  Es el TECHO, no el valor: `camZoomFor` solo puede alejarse de aquí. */
export const CAM_ZOOM = 58;

/**
 * ANCHO Y ALTO MÍNIMOS DE MUNDO en cuadro, en unidades. Es el contrato de
 * jugabilidad: pase lo que pase con la pantalla, el jugador ve al menos esto.
 *
 * De dónde sale el número. La cámara mira en diagonal, así que una casilla de
 * columna (eje X, 1.1 de lado) no ocupa 1.1 de ancho de pantalla sino su
 * proyección sobre el eje horizontal de la vista: con el desplazamiento de
 * `CameraRig` (5.2/9.2/6.4 mirando al jugador) ese factor es 0.777, o sea 0.855
 * por casilla. Once unidades son entonces ~13 columnas a la vista, que es lo
 * que hay que ver para decidir a dónde esquivar (Crossy Road enseña nueve).
 *
 * Y ES UN MÍNIMO, NO UN OBJETIVO: en una pantalla ancha el zoom se queda en
 * `CAM_ZOOM` y se ve MÁS. Lo que arregla es el caso contrario, que era el roto:
 * con el zoom clavado en 58, un teléfono de 390 px de ancho veía 6.7 unidades
 * — seis casillas — y esquivar era adivinar.
 */
const VISTA_MIN = 11;

/**
 * Zoom de la cámara ortográfica para un tamaño de ventana dado.
 *
 * En una cámara ortográfica el zoom es literalmente «píxeles por unidad de
 * mundo», así que garantizar que caben N unidades es una división. Se toma el
 * MENOR de los tres candidatos porque el contrato tiene que cumplirse en los
 * dos ejes a la vez: en vertical manda el ancho y en horizontal manda el alto.
 */
export function camZoomFor(width: number, height: number): number {
  return Math.min(CAM_ZOOM, width / VISTA_MIN, height / VISTA_MIN);
}

/**
 * A DÓNDE MIRA la cámara: AL JUGADOR, exactamente. Es lo que lo deja en el
 * centro de la pantalla, como en Crossy Road.
 *
 * En una cámara ortográfica el punto de mira cae siempre en el centro exacto
 * del cuadro, así que «centrar al personaje» y «mirarle a él» son la misma
 * frase. Suena obvio y aquí no lo era: la mira iba 1.2 unidades POR DELANTE del
 * jugador (y llegué a subirla a 3.4 en pantallas altas, para descubrir camino
 * por arriba). El efecto secundario es que el desplazamiento de la cámara es
 * DIAGONAL —(5.2, 9.2, 6.4)—, así que adelantar la mira no baja al personaje en
 * vertical: lo empuja en diagonal, abajo Y A LA IZQUIERDA. En un teléfono en
 * vertical se quedaba a un 37% del ancho, descentrado de forma bien visible.
 *
 * Se paga con lo que se ganaba: ahora se ve tanto por detrás como por delante,
 * y lo de detrás ya está jugado. Se acepta porque a cambio el personaje deja de
 * bailar por el cuadro según la forma de la pantalla — y porque el encuadre
 * ahora es el mismo en todas: sea cual sea el móvil, el corredor está en el
 * mismo sitio y lo que cambia es cuánto mundo se ve a su alrededor.
 *
 * Es una CONSTANTE y no una función de la ventana, y eso es justo lo que la
 * hace adaptable: el centro es el centro en cualquier pantalla.
 */
export const CAM_LOOK_AHEAD = 0;

/** X del centro de una columna del tablero */
export function colX(col: number): number {
  return col * BALANCE.TILE;
}

/** Z del centro de una fila (avanzar = -z) */
export function rowZ(row: number): number {
  return -row * BALANCE.TILE;
}

/**
 * DIFICULTAD 0..1 según lo lejos que se haya llegado. Es la única fuente de la
 * curva: todo lo que aprieta con la distancia (velocidades, densidad de
 * riesgo, peligros encadenados, arrastre de la banda) se deriva de aquí, así
 * que la curva se retoca en un sitio y no en siete.
 *
 * Arranca DESPUÉS de las filas seguras del principio — el jugador que acaba de
 * coger el mando merece unas filas a ritmo de tutorial — y satura en
 * `RAMP_ROWS`.
 */
export function difficultyForRow(rowIndex: number): number {
  const t = (rowIndex - BALANCE.SAFE_START_ROWS) / BALANCE.RAMP_ROWS;
  return Math.max(0, Math.min(1, t));
}

/** Multiplicador de velocidad de vehículos según profundidad (dificultad progresiva) */
export function speedFactorForRow(rowIndex: number): number {
  return 1 + (BALANCE.SPEED_FACTOR_CAP - 1) * difficultyForRow(rowIndex);
}

/** Probabilidad de tarjeta VERDE en esta fila (escasean con la distancia) */
export function goodChanceFor(rowIndex: number, base: number): number {
  return base * (1 + (BALANCE.GOOD_CARD_RAMP - 1) * difficultyForRow(rowIndex));
}

/** Probabilidad de tarjeta ROJA en esta fila (abundan con la distancia) */
export function badChanceFor(rowIndex: number, base: number): number {
  return Math.min(1, base * (1 + (BALANCE.BAD_CARD_RAMP - 1) * difficultyForRow(rowIndex)));
}

/** Filas de peligro móvil que se pueden encadenar a esta profundidad */
export function roadStreakLimitFor(rowIndex: number): number {
  return difficultyForRow(rowIndex) >= BALANCE.ROAD_STREAK_AT
    ? BALANCE.ROAD_STREAK_MAX_LATE
    : BALANCE.MAX_ROAD_STREAK;
}

/** Velocidad de arrastre de la banda transportadora a esta profundidad */
export function beltSpeedFor(rowIndex: number): number {
  const factor = 1 + (BALANCE.BELT_SPEED_RAMP - 1) * difficultyForRow(rowIndex);
  return BALANCE.BELT_SPEED * factor * BALANCE.TILE;
}
