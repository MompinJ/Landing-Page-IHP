import {
  LANES,
  PLAYER_Z,
  GOOD_ITEMS,
  BAD_ITEMS,
  THEME_METERS,
  OBSTACLE_LEN,
  TRUCK_APPROACH,
  LOCO_APPROACH,
  HOOK_APPROACH,
} from './constants'

// Lo que se mueve por su cuenta y cuanto cierra de mas sobre el mundo
const APPROACH = { truck: TRUCK_APPROACH, loco: LOCO_APPROACH, hook: HOOK_APPROACH }

// Curso fijo, sin azar: el mismo trazado en todas las partidas.
//
// Cada zona es una unidad de negocio del grupo y se recorren en el orden en que
// la carga las atraviesa. Es una prueba de stand y el TOP 10 solo tiene sentido
// si todos corrieron exactamente lo mismo. Ademas permite dosificar la
// dificultad al metro: la velocidad esta fijada por el reloj (13 m/s que suben
// a 26 en 120 s), asi que una partida siempre recorre 2340 m y se sabe a que
// velocidad se llega a cada obstaculo. Los huecos entre patrones estan escritos
// en metros pero pensados en segundos de reaccion, por eso crecen zona a zona:
//
//   1 TUM          0-468 m    13.0 - 16.4 m/s
//   2 TEC        468-936      16.4 - 19.3
//   3 INTERMODAL 936-1404     19.3 - 21.8
//   4 CRUCERO   1404-1872     21.8 - 24.0
//   5 ASTILLERO 1872+         24.0 - 26.0
//
// El tema del escenario y las piezas de los obstaculos salen de zone.key, asi
// que paisaje, portico y equipo no pueden desincronizarse.

// Carriles: 0 izquierda, 1 centro, 2 derecha.
// Cada patron declara:
//   obs   [desplazamiento en metros dentro del patron, tipo, carril]
//   safe  carril que queda transitable: ahi cae la fila de premio
//   bad   riesgos colocados a mano, normalmente en el carril al que tienta
//         escapar cuando la salida correcta era saltar o rodar
//
// Un patron con varios obstaculos a desplazamiento 0 es un muro: se lee de un
// golpe y solo tiene una salida.

const ZONE_LEN = THEME_METERS

// ---------- Relieve de la zona de cruceros ----------
//
// Es la unica zona que no es plana. Se sale de un muelle, se cruza el agua
// saltando de lancha en lancha (cada una ocupa un solo carril, el resto es
// mar) y una pasarela sube a la cubierta del crucero, tres metros mas arriba.
// Al final una pasarela de desembarco baja otra vez al nivel del suelo para
// enlazar con la zona siguiente.
//
// Todo lo que se dibuja lleva su altura calculada con deckAt(d) al construir el
// curso, y el corredor la lee cada frame con la misma funcion: si se separaran,
// el jugador correria por encima o por debajo de su propia cubierta.
const CRU = 3 * ZONE_LEN // 1404 m: inicio de la zona de cruceros
export const DECK_Y = 3.2
// El mar es SUELO, no un obstaculo invisible. La primera version ponia agua
// como colision y dejaba al corredor trotando en el aire sobre el mar, y al
// caerse lo teletransportaba de carril: parecia un fallo del juego y encima
// nadie entendia por que se movia solo. Ahora el mar tiene su nivel (SEA_LEVEL,
// lo que se ve) y su fondo pisable medio metro mas abajo (SEA_FLOOR): caerse
// significa caer de verdad, seguir corriendo con el agua por las rodillas y
// volver a subirse a la lancha siguiente por su propio pie.
export const SEA_LEVEL = -1.0
export const SEA_FLOOR = -1.45
export const CRU_MUELLE_END = CRU + 34
export const CRU_BOATS_END = CRU + 214
export const CRU_RAMP_END = CRU + 252
export const CRU_DOWN_START = CRU + 434
export const CRU_DOWN_END = CRU + 464

// ---------- Relieve del astillero ----------
//
// El dique es el protagonista, asi que el recorrido baja a su fondo en vez de
// pasar por el borde mirando: se corre por la solera, junto a la quilla del
// buque en reparacion, con el dique cerrandose a los dos lados.
//
// Las alturas de aqui NO son un tramo obligatorio como la pasarela del crucero.
// Son andamios que ocupan UN carril: el que los toma sube por su rampa y sigue
// por el tablero recogiendo valores; el que no, pasa por debajo. La decision es
// del jugador, y por eso el suelo dejo de ser una funcion de la distancia y
// pasa a depender tambien del carril (ver supportAt).
const AST = 4 * ZONE_LEN // 1872 m
export const DOCK_Y = -4.6 // fondo del dique seco
export const AST_EDGE_END = AST + 30
export const AST_FLOOR_START = AST + 66
export const AST_FLOOR_END = AST + 404
export const AST_GRADA_START = AST + 436

// El buque en reparacion ocupa casi todo el dique: se entra por su popa (con la
// helice y el timon a la vista) y se sale por la proa.
export const SHIP_FROM = AST_FLOOR_START + 14
export const SHIP_TO = AST_FLOOR_END - 12

// Perfil de alturas de todo el recorrido, como tabla de puntos con
// interpolacion lineal entre ellos. Antes era una escalera de ifs solo para el
// crucero; con dos zonas de relieve la tabla es lo unico que se sostiene, y
// ademas garantiza que las rampas y sus mesetas encajen sin huecos.
const PROFILE = [
  [0, 0],
  // Canto del muelle: la caida es de medio metro de recorrido, o sea un escalon.
  // Con dos metros de bajada el corredor se hundia en la losa del muelle, que se
  // dibuja plana a cota cero hasta el final. La primera lancha arranca justo en
  // el canto, asi que quien va por su carril pasa a bordo sin mojarse.
  [CRU_MUELLE_END - 0.6, 0],
  [CRU_MUELLE_END, SEA_FLOOR],
  [CRU_BOATS_END - 8, SEA_FLOOR],
  // salida del agua a la pasarela de embarque
  [CRU_BOATS_END, 0],
  [CRU_RAMP_END, DECK_Y],
  [CRU_DOWN_START, DECK_Y],
  [CRU_DOWN_END, 0],
  [AST_EDGE_END, 0],
  [AST_FLOOR_START, DOCK_Y],
  [AST_FLOOR_END, DOCK_Y],
  [AST_GRADA_START, 0],
]

export function deckAt(d) {
  if (d <= 0) return 0
  for (let i = 1; i < PROFILE.length; i++) {
    const [d1, y1] = PROFILE[i]
    if (d <= d1) {
      const [d0, y0] = PROFILE[i - 1]
      return y0 + ((y1 - y0) * (d - d0)) / (d1 - d0)
    }
  }
  return 0
}

export function astStage(d) {
  if (d < AST) return null
  if (d <= AST_EDGE_END) return 'borde'
  if (d < AST_FLOOR_START) return 'bajada'
  if (d <= AST_FLOOR_END) return 'fondo'
  if (d < AST_GRADA_START) return 'subida'
  return 'grada'
}

// ---------- Andamios que se pueden subir ----------
//
// Cada uno ocupa un carril: rampa de acceso, tablero, y al final se cae al
// suelo del dique. Van de uno en uno para que la eleccion sea legible: este
// carril sube, los otros dos no.
export const SCAF_RAMP = 9
export const SCAF_H = 2.7
const F = AST_FLOOR_START

// Los andamios van en CADENAS, no sueltos. Una cadena empieza con un tablero
// con rampa (el unico por el que se sube desde el suelo) y sigue con tableros
// sin rampa separados por un hueco: para seguir arriba hay que saltar de uno a
// otro. Un tablero sin rampa no se alcanza desde el suelo (el salto sube 1.35 m
// y el tablero esta a 2.7), asi que solo existe para quien viene por arriba.
//
// Con eso las alturas dejan de ser un carril de regalo: arriba se cobran mas
// valores, pero hay que sostenerse saltando huecos y esquivando lo que hay
// sobre el tablero. Caerse no mata: se vuelve al suelo del dique y se pierde
// la fila de valores.
//
// La ultima cadena cambia de carril en el aire (tablero en el 1, siguiente en
// el 2): el salto y el cambio de carril se hacen a la vez.
//
// Los huecos miden 5-7 m y no mas. El salto dura 0.52 s y a 25 m/s cubre 13 m,
// de los que hay que gastar el hueco entero: con 10 m de hueco solo quedaban
// 3 m de margen para pulsar (0.12 s) y era una loteria. Con 6 m el margen es de
// unos 9 m, o sea los mismos 0.35 s que se tienen para saltar cualquier otro
// obstaculo del juego.
export const PLATFORMS = [
  // A - lane 0: subir y sostener un salto
  { d0: F + 30, lane: 0, len: 26, ramp: SCAF_RAMP },
  { d0: F + 70, lane: 0, len: 32, ramp: 0 },
  // B - lane 2: dos saltos seguidos
  { d0: F + 124, lane: 2, len: 22, ramp: SCAF_RAMP },
  { d0: F + 161, lane: 2, len: 20, ramp: 0 },
  { d0: F + 187, lane: 2, len: 31, ramp: 0 },
  // C - salto diagonal: se sube por el centro y se aterriza en la derecha
  { d0: F + 240, lane: 1, len: 24, ramp: SCAF_RAMP },
  { d0: F + 280, lane: 2, len: 30, ramp: 0 },
].map((p) => ({
  ...p,
  d0d: p.d0 + p.ramp, // metro en el que el tablero ya esta a plena altura
  end: p.d0 + p.ramp + p.len,
  d: p.d0 + (p.ramp + p.len) / 2,
  span: p.ramp + p.len,
}))

// Marca los tableros desde los que se salta al siguiente: es lo que dibuja los
// galones del canto. Sin ese aviso el tablero de enfrente se ve de canto y a la
// misma altura, o sea casi invisible, y el salto se convierte en adivinanza.
PLATFORMS.forEach((p, i) => {
  const n = PLATFORMS[i + 1]
  p.jump = !!(n && n.ramp === 0 && n.d0 - p.end < 14)
  // el ultimo de la cadena es el que paga: salir por su canto significa que se
  // aguantaron arriba todos los saltos
  p.last = !p.jump
})

// Bono por cadena completa. Sustituye a las fichas que antes iban sobre el
// tablero: premia lo mismo sin meter un hexagono en mitad de la trayectoria.
export const SCAF_BONUS = 40

// Obstaculos del juego de alturas, escritos a mano tablero a tablero.
//   'alto'  va SOBRE el tablero: es lo que hay que resolver para no bajarse
//   'bajo'  va debajo del tablero, y ahi solo caben piezas de rodar: saltando
//           se atravesaria el tablero, que esta a 2.7 m del suelo
// El gancho de grua es lo unico que se mueve aqui: baja por el dique de frente
// a la altura del tablero y hay que pasarlo rodando sin salirse del andamio.
//
// Regla del tablero que termina en hueco: ahi solo van piezas de RODAR. El
// salto que se usa para pasar una pieza baja tambien cubre 13 m, asi que se
// aterriza justo en el canto y no queda tiempo de volver a pulsar. Rodar no
// estorba: saltar cancela la rodada en cualquier momento. Las piezas de saltar
// se reservan para el ultimo tablero de cada cadena, que acaba en caida.
//
// Arriba va UN obstaculo por cadena, y con dos zonas libres alrededor:
//
//   - el primer tablero (el de la rampa) va vacio: la rampa deja al corredor
//     arriba a 25 m/s con la camara todavia subiendo 2.7 m, y poner ahi una
//     pieza a nueve metros daba 0.35 s para leerla;
//   - en un tablero al que se llega saltando, los primeros 13 m son zona de
//     aterrizaje (el salto cubre 13 m, asi que segun cuando se pulse se cae en
//     cualquier punto de esa franja) y la pieza va 14 m mas alla.
//
// Con eso solo caben tres piezas arriba en toda la zona, y esta bien: el juego
// de alturas son los saltos, la pieza es la guinda.
const SCAF_OBS = [
  [F + 92, 'low', 0, 'alto'],
  [F + 208, 'hook', 2, 'alto'],
  [F + 300, 'hook', 2, 'alto'],
  [F + 56, 'pipe', 0, 'bajo'],
  [F + 80, 'pipe', 0, 'bajo'],
  [F + 146, 'pipe', 2, 'bajo'],
  [F + 196, 'pipe', 2, 'bajo'],
  [F + 262, 'pipe', 1, 'bajo'],
]

// Altura del tablero de un andamio en el metro d, o null si ahi no llega
function platTop(p, d) {
  if (d < p.d0 || d > p.end) return null
  const base = deckAt(d)
  if (d < p.d0d) return base + (SCAF_H * (d - p.d0)) / p.ramp
  return base + SCAF_H
}

// Cubierta de la lancha que hay bajo los pies en el metro d, o null.
//
// A diferencia del andamio, la lancha sostiene SIEMPRE al que va por su carril,
// venga de arriba o del agua: son 1.45 m sobre el fondo y subirse es trepar a
// bordo, que es justo lo que se quiere que pase al caer al mar. Ademas evita
// que el corredor atraviese el casco de lado, que es lo que se veria si el
// canto fuera pared.
function boatTop(d, x) {
  for (const b of COURSE_BOATS) {
    // 1.5 y no 1.2: los carriles distan 2.4 m, asi que con 1.2 el corredor se
    // quedaba sin suelo justo a mitad del cambio de carril y empezaba a caerse
    // al mar cuando en realidad estaba saltando a la lancha de al lado
    if (Math.abs(LANES[b.lane] - x) > 1.5) continue
    if (Math.abs(d - b.d) <= b.len / 2) return 0
  }
  return null
}

// Andamio que hay bajo los pies, o null. Se saca aparte de supportAt porque el
// bono por completar una cadena necesita saber sobre CUAL se va.
export function platformUnder(d, x, gy) {
  for (const p of PLATFORMS) {
    // margen de 1.3 m: mientras se cambia de carril el corredor va entre dos, y
    // sin holgura se caia del tablero justo al pisarlo
    if (Math.abs(LANES[p.lane] - x) > 1.3) continue
    const top = platTop(p, d)
    if (top === null) continue
    // La rampa sostiene siempre al que va en su carril, sin mirar la altura:
    // son escalones, y a 25 m/s se entra en ellos por la mitad continuamente.
    // Con la comprobacion de altura el corredor los atravesaba de largo, que es
    // justo lo que no puede pasar con algo que se ve macizo.
    //
    // En el tablero si se mira la altura, y con 1 m de tolerancia (no 0.4): la
    // rampa sube 0.3 m por metro, asi que a pocos fps el tablero sube mas de
    // medio metro entre frames. Un metro no engancha por error, porque el
    // tablero esta 2.7 m sobre el suelo: desde abajo se pasa por debajo.
    if (d < p.d0d || gy >= top - 1.0) return p
  }
  return null
}

// Suelo bajo los pies: depende del metro Y del carril, y tambien de a que altura
// va el corredor. Un andamio solo sostiene si ya vas a la altura de su tablero;
// si vas por el suelo, simplemente pasas por debajo. Esa condicion es lo que
// evita tener que tratar el canto del tablero como una pared.
export function supportAt(d, x, gy) {
  let s = deckAt(d)
  const p = platformUnder(d, x, gy)
  if (p) s = Math.max(s, platTop(p, d))
  const b = boatTop(d, x)
  if (b !== null) s = Math.max(s, b)
  return s
}

// Cara inferior del tablero que haya sobre la cabeza en ese carril, o Infinity.
// Sin esto, saltar por debajo de un andamio metia la cabeza del corredor a
// traves de los tablones: el salto sube 1.35 m sobre un galibo de 2.5 y el
// personaje mide 1.85.
export function ceilingAt(d, x) {
  for (const p of PLATFORMS) {
    if (Math.abs(LANES[p.lane] - x) > 1.3) continue
    // solo el tablero; en la rampa se va por encima, no por debajo
    if (d < p.d0d || d > p.end) continue
    return deckAt(d) + SCAF_H - 0.22
  }
  return Infinity
}

// Se esta cruzando el mar a pie en el metro d?
export function inSeaAt(d) {
  return d > CRU_MUELLE_END && d < CRU_BOATS_END
}

// Altura de la lamina de agua. En la travesia el mar es lo que se pisa, asi que
// sube al nivel del casco de las lanchas; fuera de ahi es solo fondo lejano y
// se queda por debajo del suelo (en el dique seco eso significa esconderse).
export function seaLevelAt(d) {
  const base = Math.min(-2.6, deckAt(d) - 2.4)
  const fadeIn = Math.max(0, Math.min(1, (d - (CRU - 40)) / 30))
  const fadeOut = Math.max(0, Math.min(1, (CRU_DOWN_END + 40 - d) / 30))
  return base + (SEA_LEVEL - base) * Math.min(fadeIn, fadeOut)
}

// Tramo del recorrido en el metro d, para que el escenario sepa que dibujar
export function cruStage(d) {
  if (d < CRU || d >= CRU + ZONE_LEN) return null
  if (d <= CRU_MUELLE_END) return 'muelle'
  if (d <= CRU_BOATS_END) return 'botes'
  if (d <= CRU_RAMP_END) return 'rampa'
  if (d <= CRU_DOWN_START) return 'cubierta'
  // la pasarela de desembarco usa el mismo dibujo que la de embarque: las dos
  // salen de deckAt(), que ya sabe si sube o baja
  if (d <= CRU_DOWN_END) return 'rampa'
  return 'muelle'
}
// Se escribe mas curso del que da tiempo a correr (2340 m) por si algun dia
// cambia la duracion o la velocidad: sobrar es gratis, quedarse corto no.
const COURSE_END = 2430

export const ZONES = [
  {
    key: 'tum',
    name: 'TERMINAL DE USOS MULTIPLES',
    short: 'USOS MULTIPLES',
    tag: 'Granel, proyecto y carga general',
    accent: '#FFC627',
    gap: 26,
    lead: 26,
    // Un obstaculo a la vez y en el orden en que se aprenden las tres salidas:
    // cambiar de carril, saltar, rodar. Nada se encima con nada.
    patterns: [
      { obs: [[0, 'tall', 1]], safe: 0 },
      { obs: [[0, 'low', 1]], safe: 1, bad: [[9, 0]] },
      { obs: [[0, 'high', 1]], safe: 1, bad: [[9, 2]] },
      { obs: [[0, 'tall', 0]], safe: 2 },
      { obs: [[0, 'low', 2]], safe: 2, bad: [[9, 1]] },
      { obs: [[0, 'high', 0]], safe: 0, bad: [[9, 1]] },
    ],
  },
  {
    key: 'tec',
    name: 'TERMINAL ESPECIALIZADA DE CONTENEDORES',
    short: 'CONTENEDORES',
    tag: 'STS, patios de apilamiento y reefers',
    accent: '#00aef0',
    gap: 25,
    lead: 22,
    // La TEC es la zona que sube el escalon. Ademas de encadenar dos acciones
    // seguidas, aparecen los dos bloqueos largos: contenedores consecutivos y
    // el de 40 pies, que cierran un carril durante metros en vez de un punto,
    // y el tractocamion, que viene de frente. Aqui ya no basta con reaccionar:
    // hay que comprometerse con un carril y sostenerlo.
    patterns: [
      {
        obs: [
          [0, 'low', 1],
          [16, 'high', 1],
        ],
        safe: 1,
        bad: [
          [8, 0],
          [8, 2],
        ],
      },
      // Muro de tres contenedores seguidos: el carril queda cerrado 14 m. La
      // barrera va DESPUES del muro, no a su lado: pegada al segundo
      // contenedor obligaba a saltar 0.4 s despues de esquivar, y ademas se
      // leian como una sola masa. Asi el patron tiene dos tiempos claros y
      // premia haberse ido al carril 2 desde el principio.
      {
        obs: [
          [0, 'tall', 0],
          [7, 'tall', 0],
          [14, 'tall', 0],
          [23, 'low', 1],
        ],
        safe: 2,
      },
      {
        obs: [
          [0, 'long', 2],
          [8, 'high', 1],
        ],
        safe: 0,
        bad: [[16, 2]],
      },
      { obs: [[0, 'truck', 1]], safe: 2, bad: [[9, 0]] },
      {
        obs: [
          [0, 'high', 2],
          [16, 'tall', 1],
        ],
        safe: 2,
        bad: [[8, 1]],
      },
      {
        obs: [
          [0, 'long', 0],
          [0, 'tall', 1],
        ],
        safe: 2,
      },
      {
        obs: [
          [0, 'low', 0],
          [0, 'low', 1],
          [0, 'low', 2],
          [24, 'truck', 0],
        ],
        safe: 2,
      },
      {
        obs: [
          [0, 'tall', 2],
          [7, 'tall', 2],
          [14, 'tall', 2],
        ],
        safe: 0,
        bad: [[9, 1]],
      },
      {
        obs: [
          [0, 'high', 0],
          [0, 'high', 1],
          [0, 'high', 2],
          [26, 'long', 1],
        ],
        safe: 0,
      },
    ],
  },
  {
    key: 'intermodal',
    name: 'TERMINAL INTERMODAL',
    short: 'INTERMODAL',
    tag: 'Vagones estacionados y maniobras',
    accent: '#ff6b6b',
    gap: 25,
    lead: 22,
    // La zona que se juega como Subway Surfers: aqui el carril no se cierra un
    // instante, se cierra durante un tren entero. Vagones encadenados a 12.5 m
    // (su propio largo) forman convoyes estacionados de 25 a 37 m; encima de
    // eso llegan de frente la locomotora y las mulas. A 21 m/s un convoy de
    // 37 m son 1.8 s sin poder volver a ese carril, asi que la decision se
    // toma de lejos o no se toma.
    patterns: [
      // convoy en un carril + barrera al final del otro: el unico camino
      // limpio es el tercero, y hay que elegirlo antes de entrar
      // la barrera va pasada la cola del convoy, no a su costado: metida a la
      // altura del ultimo vagon quedaba tapada por el y aparecia de la nada
      {
        obs: [
          [0, 'long', 0],
          [12.5, 'long', 0],
          [25, 'long', 0],
          [37, 'low', 1],
        ],
        safe: 2,
      },
      // locomotora de frente por el centro, con riesgos tentando a la izquierda
      { obs: [[0, 'loco', 1]], safe: 2, bad: [[10, 0]] },
      // dos convoyes paralelos: solo queda el centro, y en el centro hay que saltar
      {
        obs: [
          [0, 'long', 0],
          [0, 'long', 2],
          [12.5, 'long', 0],
          [12.5, 'long', 2],
          [25, 'low', 1],
        ],
        safe: 1,
      },
      // muro de gruas puente: rodar obligatorio, y al salir el carril 1 esta tomado
      {
        obs: [
          [0, 'high', 0],
          [0, 'high', 1],
          [0, 'high', 2],
          [26, 'long', 1],
        ],
        safe: 0,
      },
      // convoy a la derecha y locomotora entrando por la izquierda
      {
        obs: [
          [0, 'long', 2],
          [12.5, 'long', 2],
          [30, 'loco', 0],
        ],
        safe: 1,
      },
      // muro bajo y, al aterrizar, tren en el carril al que tiende a irse
      {
        obs: [
          [0, 'low', 0],
          [0, 'low', 1],
          [0, 'low', 2],
          [24, 'long', 2],
        ],
        safe: 0,
      },
      {
        obs: [
          [0, 'tall', 0],
          [0, 'tall', 1],
          [22, 'truck', 2],
        ],
        safe: 1,
      },
    ],
  },
  {
    key: 'crucero',
    name: 'TERMINAL DE CRUCEROS',
    short: 'CRUCEROS',
    tag: 'Del muelle a bordo',
    accent: '#35d3ff',
    gap: 24,
    lead: 22,
    // Esta zona no usa el generador de patrones: la construye buildCrucero(),
    // porque la primera mitad no tiene suelo y hay que colocar lanchas, agua y
    // pasarela a mano. Los patrones de abajo son solo para la cubierta del
    // barco, donde ya se vuelve a correr sobre algo solido.
    custom: 'crucero',
    // Los obstaculos solo se sueltan sobre la cubierta del barco. Sin acotarlo,
    // el generador seguia colocando piezas hasta el metro 1872 y acababan
    // repartiendo tumbonas y toldos por la pasarela de desembarco y por el
    // porton del astillero, que ya es otra zona.
    ranges: [[CRU_RAMP_END + 16, CRU_DOWN_START - 10]],
    patterns: [
      // la piscina ocupa un carril doce metros: no se cruza, se rodea
      { obs: [[0, 'long', 1]], safe: 2, bad: [[16, 1]] },
      {
        obs: [
          [0, 'low', 0],
          [0, 'low', 1],
          [0, 'low', 2],
        ],
        safe: 2,
      },
      {
        obs: [
          [0, 'tall', 0],
          [0, 'tall', 1],
        ],
        safe: 2,
      },
      {
        obs: [
          [0, 'long', 0],
          [8, 'high', 1],
        ],
        safe: 2,
      },
      {
        obs: [
          [0, 'high', 0],
          [0, 'high', 1],
          [0, 'high', 2],
        ],
        safe: 0,
      },
      {
        obs: [
          [0, 'tall', 1],
          [0, 'tall', 2],
        ],
        safe: 0,
      },
      {
        obs: [
          [0, 'long', 2],
          [8, 'low', 1],
        ],
        safe: 0,
      },
      {
        obs: [
          [0, 'tall', 0],
          [0, 'tall', 2],
        ],
        safe: 1,
        bad: [[10, 1]],
      },
    ],
  },
  {
    key: 'astillero',
    name: 'ASTILLERO',
    short: 'ASTILLERO',
    tag: 'Al fondo del dique y arriba',
    accent: '#ff7a45',
    gap: 26,
    lead: 24,
    // Zona final, a 24-26 m/s, y la de mas relieve: se baja al fondo del dique
    // seco, se corre junto a la quilla, se sube por el andamio y se sigue a
    // media altura del casco. Los patrones solo se sueltan en los tramos
    // llanos: en las rampas hay que poder mirar donde se pisa, asi que ahi solo
    // caen valores.
    ranges: [
      [AST + 4, AST_EDGE_END - 6],
      [AST_FLOOR_START + 8, AST_FLOOR_END - 8],
      [AST_GRADA_START + 8, AST + ZONE_LEN + 90],
    ],
    patterns: [
      {
        obs: [
          [0, 'low', 1],
          [20, 'high', 1],
          [40, 'low', 1],
        ],
        safe: 1,
      },
      {
        obs: [
          [0, 'low', 0],
          [0, 'low', 1],
          [0, 'low', 2],
          [24, 'high', 0],
          [24, 'high', 1],
          [24, 'high', 2],
        ],
        safe: 1,
      },
      {
        obs: [
          [0, 'high', 0],
          [0, 'high', 2],
        ],
        safe: 2,
        bad: [[10, 0]],
      },
      {
        obs: [
          [0, 'tall', 0],
          [0, 'tall', 1],
          [22, 'low', 2],
        ],
        safe: 2,
      },
      // mega-bloque de casco: el bloqueo largo del astillero
      {
        obs: [
          [0, 'long', 0],
          [8, 'high', 1],
        ],
        safe: 2,
      },
      {
        obs: [
          [0, 'tall', 0],
          [16, 'tall', 2],
        ],
        safe: 1,
      },
      // SPMT arrastrando una seccion de casco, de frente
      { obs: [[0, 'truck', 1]], safe: 0, bad: [[9, 2]] },
      {
        obs: [
          [0, 'high', 0],
          [0, 'high', 1],
          [0, 'high', 2],
          [24, 'tall', 1],
        ],
        safe: 0,
      },
      {
        obs: [
          [0, 'long', 2],
          [10, 'low', 1],
        ],
        safe: 0,
      },
    ],
  },
]

// Nombre del obstaculo por zona. Es lo que sale en el mensaje del golpe, asi
// que tiene que ser la pieza real: "-15 TOLVA RECEPTORA", no "-15 OBSTACULO".
// Las zonas sin lista propia todavia se nombran con las piezas de la TEC.
const OBSTACLE_LABELS = {
  tum: {
    low: 'CUCHARA BIVALVA',
    high: 'BANDA TRANSPORTADORA',
    tall: 'TOLVA RECEPTORA',
    long: 'BANDA DE PATIO',
    truck: 'MONTACARGAS',
  },
  tec: {
    low: 'AMARRE',
    high: 'SPREADER',
    tall: 'CONTENEDOR',
    long: 'CONTENEDOR 40 PIES',
    truck: 'TRACTOCAMION',
  },
  intermodal: {
    low: 'CHASIS VACIO',
    high: 'GRUA PUENTE',
    tall: 'CAJA TRAILER',
    long: 'VAGON ESTACIONADO',
    truck: 'TRACTOCAMION',
    loco: 'LOCOMOTORA',
  },
  crucero: {
    low: 'TUMBONAS',
    high: 'TOLDO',
    tall: 'BAR DE CUBIERTA',
    long: 'PISCINA',
    truck: 'CARRITO DE SERVICIO',
    gap: 'AL AGUA',
  },
  astillero: {
    low: 'PLANCHAS DE ACERO',
    high: 'ANDAMIO',
    tall: 'TORRE DE ANDAMIO',
    long: 'MEGA-BLOQUE',
    truck: 'SPMT',
    hook: 'GANCHO DE GRUA',
    pipe: 'LINEA DE SERVICIOS',
  },
}

export function zoneIndexAt(distance) {
  return Math.min(ZONES.length - 1, Math.max(0, Math.floor(distance / ZONE_LEN)))
}

// Secuencia de lanchas: cada una ocupa UN carril y entre una y otra hay mar
// abierto. El carril va cambiando, asi que no basta con saltar el hueco: hay
// que caer en el carril donde esta la siguiente.
const BOAT_LANES = [1, 2, 1, 0, 1, 2, 0, 2, 1, 0, 1, 2]
const BOAT_LEN = 13
const BOAT_GAP = 5.5

// Construye la primera mitad de la zona de cruceros: muelle, cadena de lanchas
// con su agua, y pasarela. Devuelve el metro donde empieza la cubierta del
// barco, que a partir de ahi ya se genera con patrones normales.
function buildCrucero(ctx) {
  const { obstacles, boats, items, addGood } = ctx

  // El agua ya no se coloca: es el suelo de este tramo (ver PROFILE y
  // seaLevelAt). Aqui solo van las lanchas, que son lo que sobresale de el.
  let d = CRU_MUELLE_END
  let i = 0
  while (d + BOAT_LEN < CRU_BOATS_END) {
    const lane = BOAT_LANES[i % BOAT_LANES.length]
    boats.push({ d: d + BOAT_LEN / 2, len: BOAT_LEN, lane, dy: 0 })

    // el premio va sobre la lancha: recompensa ir por el carril correcto
    addGood(d + 4, lane, 0)
    addGood(d + 9, lane, 0)

    d += BOAT_LEN + BOAT_GAP
    i++
  }

  // la pasarela es respiro: se sube sin nada que esquivar, con valores en fila
  for (let k = 0; k < 4; k++) addGood(CRU_BOATS_END + 8 + k * 7, 1, deckAt(CRU_BOATS_END + 8 + k * 7))
  return CRU_RAMP_END + 16
}

function build() {
  const obstacles = []
  const items = []
  const boats = []
  const gates = []
  let goodN = 0
  let badN = 0

  const addGood = (d, lane, dy) =>
    items.push({ d, lane, good: true, dy, label: GOOD_ITEMS[goodN++ % GOOD_ITEMS.length] })

  for (let zi = 0; zi < ZONES.length; zi++) {
    const zone = ZONES[zi]
    const start = zi * ZONE_LEN
    const end = zi === ZONES.length - 1 ? COURSE_END : start + ZONE_LEN
    // El portico va justo en el limite, salvo el primero: en el metro 0 nace
    // encima del corredor y no se ve pasar.
    gates.push({ d: zi === 0 ? 18 : start, zone: zi })

    // La zona de cruceros se arma a mano hasta que se llega a bordo.
    const from = zone.custom === 'crucero' ? buildCrucero({ obstacles, boats, items, addGood }) : start + zone.lead
    // Una zona puede tener el recorrido partido en tramos llanos con rampas en
    // medio (el astillero baja al dique y luego sube al andamio). En las rampas
    // no se sueltan obstaculos: ahi hay que poder mirar donde se pisa.
    const ranges = zone.ranges || [[from, end]]
    let n = 0

    for (const [rFrom, rTo] of ranges) {
      let d = rFrom
      while (d < rTo) {
        const p = zone.patterns[n % zone.patterns.length]
        // el span cuenta el largo de la pieza, no solo su centro: si no, un
        // contenedor de 40 pies se comeria el hueco hasta el patron siguiente
        const span = p.obs.reduce((m, o) => Math.max(m, o[0] + OBSTACLE_LEN[o[1]] / 2), 0)
        // El patron entra entero o no entra. Con solo comprobar el inicio, uno
        // que arrancaba a dos metros del final del tramo colocaba su cola veinte
        // metros mas alla, o sea dentro de la rampa que se queria dejar limpia.
        if (d + span > rTo) break

        for (const [od, type, lane] of p.obs) {
          obstacles.push({
            d: d + od,
            type,
            lane,
            zone: zi,
            dy: deckAt(d + od),
            approach: APPROACH[type] || 0,
            // la pieza y su nombre salen de la zona: el mismo 'tall' es un
            // contenedor en la TEC y una tolva receptora en la TUM
            theme: zone.key,
            label: (OBSTACLE_LABELS[zone.key] || OBSTACLE_LABELS.tec)[type],
          })
        }
        for (const [bd, lane] of p.bad || []) {
          items.push({
            d: d + bd,
            lane,
            good: false,
            dy: deckAt(d + bd),
            label: BAD_ITEMS[badN++ % BAD_ITEMS.length],
          })
        }
        // Premio: una fila de tres valores en el carril que el patron deja libre.
        // Es lo que convierte "esquivar" en "esquivar hacia el lado correcto".
        // La fila se cierra pronto a proposito: con 5.5 m de paso la ultima ficha
        // caia a 3 m del siguiente obstaculo y se recogia justo encima de el.
        for (let i = 0; i < 3; i++) addGood(d + span + 8 + i * 4, p.safe, deckAt(d + span + 8 + i * 4))

        d += span + zone.gap
        n++
      }
    }

    if (zone.key === 'astillero') {
      // Las rampas de bajada al dique y de salida se pagan con valores en fila:
      // no deberian sentirse como tiempo muerto.
      for (const [a, b] of [
        [AST_EDGE_END + 6, AST_FLOOR_START - 4],
        [AST_FLOOR_END + 6, AST_GRADA_START - 4],
      ]) {
        for (let dd = a; dd < b; dd += 7) addGood(dd, 1, deckAt(dd))
      }

      // Se limpia el carril del andamio de los obstaculos del generador: sus
      // piezas taparian la rampa y el hueco entre tableros, y la eleccion de
      // subir o no dejaria de leerse. Lo que se juega ahi se escribe a mano
      // justo despues.
      for (const p of PLATFORMS) {
        for (let i = obstacles.length - 1; i >= 0; i--) {
          const o = obstacles[i]
          // 16 m pasado el canto de CUALQUIER tablero: el que se sale de uno
          // cae al fondo del dique unos nueve metros mas alla, y aterrizar
          // encima de un SPMT que ya no podia esquivar no es castigo, es un
          // accidente. Paso de verdad con el andamio del carril central.
          if (o.lane === p.lane && o.d > p.d0 - 10 && o.d < p.end + 16) obstacles.splice(i, 1)
        }
      }

      const topOf = (p) => deckAt(p.d0d + 2) + SCAF_H

      for (const [d, type, lane, where] of SCAF_OBS) {
        const p = PLATFORMS.find((q) => q.lane === lane && d > q.d0 && d < q.end)
        if (!p) continue
        // Estas piezas se escriben DESPUES de las filas de premio, asi que hay
        // que apartar la ficha que caiga dentro: si no, el hexagono sale
        // clavado en mitad del obstaculo.
        for (let k = items.length - 1; k >= 0; k--) {
          const it = items[k]
          if (it.lane === lane && Math.abs(it.d - d) < 3.5) items.splice(k, 1)
        }
        obstacles.push({
          d,
          type,
          lane,
          zone: zi,
          // arriba se corre sobre el tablero, abajo se pasa por debajo de el
          dy: where === 'alto' ? topOf(p) : deckAt(d),
          approach: APPROACH[type] || 0,
          theme: zone.key,
          label: OBSTACLE_LABELS.astillero[type],
        })
      }

      // Arriba NO van fichas. Se probo con la fila de valores sobre el tablero
      // y sobre el hueco, y el hexagono es tan grande que tapaba justo el canto
      // donde hay que aterrizar: o te caias o chocabas con lo que venia detras.
      // Lo que paga sostenerse arriba es el bono de cadena completa, que no
      // ocupa sitio en pantalla (ver SCAF_BONUS y Player).
    }
  }

  // zw es la coordenada de mundo fija de la pieza. Para lo que se mueve solo,
  // el reparto se hace al reves: se escribe el metro en el que TIENE que
  // encontrarse con el corredor y de ahi sale donde nace, mas lejos.
  const toWorld = (a) =>
    a
      .sort((x, y) => x.d - y.d)
      .map((e, i) => ({
        ...e,
        key: i,
        dy: e.dy || 0,
        zw: PLAYER_Z - e.d * (1 + (e.approach || 0)),
      }))

  return {
    obstacles: toWorld(obstacles),
    items: toWorld(items),
    boats: toWorld(boats),
    gates: toWorld(gates).map((g) => ({ ...g, dy: deckAt(g.d) })),
  }
}

export const COURSE = build()

// lista de lanchas para boatTop(); COURSE se construye al cargar el modulo, asi
// que cuando corre el juego ya existe
const COURSE_BOATS = COURSE.boats
