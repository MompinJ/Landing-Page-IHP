import {
  LANES,
  PLAYER_Z,
  OBSTACLE_LEN,
  TRUCK_APPROACH,
  LOCO_APPROACH,
  HOOK_APPROACH,
  RIG_H,
  RIG_RAMP,
  RIG_BONUS,
  FLY_LEN,
  FLY_H,
} from './constants'
import { ZONE_WORDS } from './words'

// CURSO INFINITO, PROCEDURAL.
//
// Esta es la diferencia de fondo con Terminal Rally (el de tiempo): alli el
// trazado esta escrito a mano metro a metro y es EL MISMO en todas las
// partidas, porque el TOP 10 de un stand por tiempo solo es comparable si
// todos corrieron lo mismo. Aqui no hay reloj y no hay final: la carrera dura
// lo que aguante el corredor, asi que un curso escrito a mano se acabaria.
//
// El curso se genera POR DELANTE y a trozos. `ensureCourse(d)` mira cuanto hay
// construido y va anadiendo terminales enteras hasta tener margen de sobra
// sobre el metro que se esta corriendo. Cada terminal se sortea de una bolsa de
// las cinco, asi que salen todas antes de repetirse ninguna pero nunca en el
// mismo orden, y cada una elige su propio largo, sus patrones y sus alturas.
//
// Lo que NO cambia respecto al juego de tiempo es la forma de los datos: el
// resto del juego (obstaculos, fichas, escenario, corredor) sigue leyendo las
// mismas listas ordenadas por distancia y las mismas funciones de relieve. Por
// eso las listas se MUTAN en sitio en vez de rehacerse: `COURSE.items` y
// compania las capturan los componentes al cargar el modulo, y si aqui se
// reasignaran, se quedarian mirando la lista de la partida anterior.

// Lo que se mueve por su cuenta y cuanto cierra de mas sobre el mundo
const APPROACH = { truck: TRUCK_APPROACH, loco: LOCO_APPROACH, hook: HOOK_APPROACH }

/* ============================ AZAR DE LA PARTIDA ============================

  Un solo generador para todo el curso, sembrado al empezar cada carrera. Se
  guarda la semilla para poder repetir una partida concreta con ?seed=, que es
  lo unico con lo que se puede depurar un tramo que salio mal: en un curso
  aleatorio, "el camion del metro 1200" no existe hasta que se dice con que
  semilla.
*/
function mulberry32(a) {
  return function () {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const SEED_FIJA = Number(new URLSearchParams(window.location.search).get('seed')) || 0
export let seedActual = 0
let rng = mulberry32(1)

const R = () => rng()
const rf = (a, b) => a + rng() * (b - a)
const ri = (a, b) => a + Math.floor(rng() * (b - a + 1))
const pick = (list) => list[Math.floor(rng() * list.length)]

function shuffled(list) {
  const a = [...list]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/* ============================== RELIEVE ==============================

  Alturas fijas del juego. Las que dependian de un metro concreto del curso
  (donde empieza el dique, donde acaba la pasarela) ya no son constantes: las
  calcula cada terminal al nacer y quedan guardadas en su ficha, porque ahora
  puede haber tres astilleros en una misma carrera y cada uno en otro metro.
*/
export const DECK_Y = 3.2 // cubierta del crucero
export const SEA_LEVEL = -1.0 // lamina de agua de la travesia
export const SEA_FLOOR = -1.45 // fondo pisable: caerse es caerse, no morir en el aire
export const DOCK_Y = -4.6 // solera del dique seco

export const SCAF_RAMP = 9
export const SCAF_H = 2.7
export const SCAF_BONUS = 40

/* ============================== ESTADO VIVO ==============================

  Todo lo de aqui abajo se vacia y se vuelve a llenar en cada carrera
  (resetCourse), pero SIN cambiar de objeto: ver la nota de arriba.
*/

// Perfil de alturas del recorrido, como tabla de puntos con interpolacion
// lineal. Crece con el curso. Es la unica fuente de verdad de "a que altura
// esta el suelo en el metro d": la leen el corredor, la camara, el escenario y
// cada pieza que se coloca.
const PROFILE = [[0, 0]]

// Plataformas subibles. En el juego de tiempo eran solo los andamios del
// astillero; aqui hay dos clases y comparten toda la maquinaria de soporte:
//   'scaf' andamio pegado al casco, en el dique seco
//   'rig'  camion portacontenedor, que se trepa por la rampa trasera y se
//          corre por encima del contenedor (lo de Subway Surfers)
export const PLATFORMS = []

// Terminales generadas, en orden. El indice es estable y no se recicla nunca:
// el HUD y los porticos guardan ese indice para saber que terminal anunciar.
const CHAIN = []

export const COURSE = { obstacles: [], items: [], boats: [], gates: [] }

let built = 0 // metros de curso ya generados
let keyN = 0 // identificador unico de pieza, para las keys de React
let bolsaZonas = [] // bolsa de terminales por repartir
let proxGrua = 0 // metro en el que toca el siguiente gancho de grua
let proxCamion = 0 // metro a partir del cual se puede volver a soltar un convoy
let proxEscudo = 0 // metro en el que toca el siguiente casco reforzado

/* ============================== LECTURAS ============================== */

export function deckAt(d) {
  if (d <= 0) return 0
  const last = PROFILE[PROFILE.length - 1]
  if (d >= last[0]) return last[1]
  // busqueda binaria: el perfil crece toda la carrera y esto se llama varias
  // veces por frame y por pieza dibujada
  let lo = 1
  let hi = PROFILE.length - 1
  while (lo < hi) {
    const mid = (lo + hi) >> 1
    if (PROFILE[mid][0] < d) lo = mid + 1
    else hi = mid
  }
  const [d1, y1] = PROFILE[lo]
  const [d0, y0] = PROFILE[lo - 1]
  if (d1 === d0) return y1
  return y0 + ((y1 - y0) * (d - d0)) / (d1 - d0)
}

// Terminal que ocupa el metro d, o la ultima generada si se pregunta por delante
export function zoneAt(d) {
  if (!CHAIN.length) return null
  if (d <= CHAIN[0].start) return CHAIN[0]
  let lo = 0
  let hi = CHAIN.length - 1
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1
    if (CHAIN[mid].start <= d) lo = mid
    else hi = mid - 1
  }
  return CHAIN[lo]
}

// Indice de terminal en el metro d: es lo que guarda el HUD para saber cuando
// cambiar el cartel, y ademas cuenta cuantas terminales se llevan cruzadas.
export function zoneIndexAt(d) {
  const z = zoneAt(d)
  return z ? z.i : 0
}

// Ficha de la terminal numero i (la def de ZONES con su nombre y su color)
export function chainZone(i) {
  const z = CHAIN[Math.max(0, Math.min(CHAIN.length - 1, i))]
  return z ? z.zone : ZONES[0]
}

export function chainCount() {
  return CHAIN.length
}

// Clave de tema del escenario en el metro d. La usa World para saber que
// franja dibujar; antes salia de dividir la distancia entre un largo fijo.
export function zoneKeyAt(d) {
  const z = zoneAt(d)
  return z ? z.key : 'tec'
}

// Tramo de la terminal de cruceros en el metro d, o null si ahi no hay crucero
export function cruStage(d) {
  const z = zoneAt(d)
  if (!z || z.key !== 'crucero' || d >= z.end) return null
  if (d <= z.muelleEnd) return 'muelle'
  if (d <= z.boatsEnd) return 'botes'
  if (d <= z.rampEnd) return 'rampa'
  if (d <= z.downStart) return 'cubierta'
  if (d <= z.downEnd) return 'rampa'
  return 'muelle'
}

// Tramo del astillero en el metro d, o null
export function astStage(d) {
  const z = zoneAt(d)
  if (!z || z.key !== 'astillero' || d >= z.end) return null
  if (d <= z.edgeEnd) return 'borde'
  if (d < z.floorStart) return 'bajada'
  if (d <= z.floorEnd) return 'fondo'
  if (d < z.gradaStart) return 'subida'
  return 'grada'
}

// Popa y proa del buque que hay en el dique del metro d. Sustituye a las
// constantes SHIP_FROM/SHIP_TO del juego de tiempo, que solo podian describir
// un unico astillero.
export function shipRange(d) {
  const z = zoneAt(d)
  if (!z || z.key !== 'astillero') return null
  return { from: z.shipFrom, to: z.shipTo }
}

// Se esta cruzando el mar a pie en el metro d?
export function inSeaAt(d) {
  const z = zoneAt(d)
  if (!z || z.key !== 'crucero') return false
  return d > z.muelleEnd && d < z.boatsEnd
}

// Altura de la lamina de agua. En la travesia el mar es lo que se pisa, asi que
// sube al nivel del casco de las lanchas; fuera de ahi es solo fondo lejano y
// se queda por debajo del suelo (en el dique seco eso significa esconderse).
export function seaLevelAt(d) {
  const base = Math.min(-2.6, deckAt(d) - 2.4)
  // El mar solo sube donde se cruza a pie. Se mira tambien setenta metros atras
  // y adelante porque el agua tiene que verse llegar y verse irse: si apareciera
  // justo en el portico, el mar saldria de golpe delante del corredor.
  let c = null
  for (const z of [zoneAt(d), zoneAt(d - 70), zoneAt(d + 70)]) {
    if (z && z.key === 'crucero') {
      c = z
      break
    }
  }
  if (!c) return base
  const fadeIn = Math.max(0, Math.min(1, (d - (c.start - 40)) / 30))
  const fadeOut = Math.max(0, Math.min(1, (c.downEnd + 40 - d) / 30))
  return base + (SEA_LEVEL - base) * Math.min(fadeIn, fadeOut)
}

/* ==================== SOPORTE: SUELO, PLATAFORMAS Y LANCHAS ====================

  El suelo dejo de ser funcion solo de la distancia en cuanto aparecieron cosas
  que ocupan UN carril y se pueden trepar. Ahora depende del metro, del carril y
  de a que altura va el corredor, y hay tres capas que pueden sostenerlo: el
  perfil del terreno, una plataforma (andamio o camion) y una lancha.
*/

/* ---------- PLATAFORMAS EN MARCHA ----------

  Los convoyes ya no estan todos parados. La mitad ARRANCA cuando el corredor
  se les acerca y rueda hacia adelante a una fraccion de la velocidad del
  mundo, que es lo que hace un tren de Subway Surfers: lo alcanzas porque vas
  mas rapido que el, te subes por atras y lo recorres de cola a morro mientras
  el sigue andando debajo de ti.

  El truco para que esto no obligue a reescribir medio juego es no mover nada:
  TODO el juego pregunta por metros del curso, asi que un camion que ha rodado
  `off` metros es exactamente el mismo camion parado preguntado `off` metros
  antes. De ahi que esta funcion sea lo unico que hay que anadir, y que quien la
  use solo tenga que restarsela a la distancia del corredor.

  `desde` es el metro del CORREDOR en el que el convoy se pone en marcha (unos
  setenta antes de su cola, para que se le vea arrancar), `v` la fraccion de la
  velocidad del mundo a la que rueda, y `tope` los metros que puede avanzar
  antes de volver a pararse. El tope no es un detalle: el carril por el que
  barre el convoy tiene que estar limpio de punta a punta, y lo que se limpia al
  generarlo es exactamente ese tramo.
*/
export function rodado(p, d) {
  if (!p.v) return 0
  const bruto = Math.max(0, (d - p.desde) * p.v)
  const F = 10 // metros de frenada
  if (bruto <= p.tope - F) return bruto
  if (bruto >= p.tope + F) return p.tope
  // FRENA, NO SE PARA EN SECO. Al llegar al final de su tramo el convoy tiene
  // que ir deteniendose, no cortar: quien va encima nota el cambio de ritmo del
  // suelo bajo los pies, y un corte se lee como un tiron del juego. La curva
  // entra con la misma pendiente que traia y sale con pendiente cero, asi que
  // no hay ningun salto en ningun punto.
  const u = (bruto - p.tope + F) / (2 * F)
  return p.tope - F * (1 - u) * (1 - u)
}

// Altura de la superficie de una plataforma en el metro d, o null si ahi no llega
function platTop(p, d) {
  if (d < p.d0 || d > p.end) return null
  const base = deckAt(d)
  if (p.ramp > 0 && d < p.d0d) return base + (p.h * (d - p.d0)) / p.ramp
  return base + p.h
}

// Cubierta de la lancha que hay bajo los pies en el metro d, o null.
//
// A diferencia de la plataforma, la lancha sostiene SIEMPRE al que va por su
// carril, venga de arriba o del agua: subirse es trepar a bordo, que es justo
// lo que se quiere que pase al caer al mar.
function boatTop(d, x) {
  for (const b of COURSE.boats) {
    if (b.d - b.len / 2 > d + 4) break // la lista va ordenada: mas alla no hay nada que mirar
    if (Math.abs(LANES[b.lane] - x) > 1.5) continue
    if (Math.abs(d - b.d) <= b.len / 2) return 0
  }
  return null
}

// Plataforma que hay bajo los pies, o null. Se saca aparte de supportAt porque
// el bono por completar una cadena necesita saber sobre CUAL se va.
export function platformUnder(d, x, gy) {
  // LA MAS ALTA DE LAS QUE PISA, no la primera que aparezca en la lista.
  //
  // Con una sola plataforma por carril daba igual: solo podia haber una debajo.
  // Con vias dobles, no: el carril mide 2.3 m y la tolerancia de aqui es 1.3, o
  // sea que a mitad de camino entre un techo y el de al lado se estan pisando
  // los dos a la vez -- que es justo lo que hace que cruzarse no sea un salto de
  // fe. Quedarse con la primera dejaba al corredor hundirse en la rampa del
  // convoy vecino mientras seguia teniendo el techo del suyo bajo los pies.
  let mejor = null
  let alto = -Infinity
  for (const p of PLATFORMS) {
    if (p.d0 > d + 2) break
    // en marcha, el corredor va `off` metros por detras de donde iria si el
    // convoy estuviera parado: ver rodado()
    const dl = d - rodado(p, d)
    if (dl > p.end) continue
    if (Math.abs(LANES[p.lane] - x) > 1.3) continue
    const top = platTop(p, dl)
    if (top === null) continue
    // La rampa sostiene siempre al que va en su carril, sin mirar la altura:
    // son escalones (o la rampa trasera del camion), y a 25 m/s se entra en
    // ellos por la mitad continuamente. En la superficie si se mira la altura,
    // con un metro de tolerancia: a pocos fps la rampa sube mas de medio metro
    // entre cuadros.
    if (((p.ramp > 0 && dl < p.d0d) || gy >= top - 1.0) && top > alto) {
      alto = top
      mejor = p
    }
  }
  return mejor
}

// Pendiente de la rampa de una plataforma en el metro d, en radianes, o 0 si
// ahi ya se va por la superficie llana. Vive aqui y no en el corredor porque la
// forma de la rampa es cosa del curso: quien la sube solo tiene que saber
// cuanto se empina para inclinarse contra ella.
export function rampAngle(p, d) {
  if (!p || !p.ramp) return 0
  const dl = d - rodado(p, d)
  if (dl < p.d0 || dl >= p.d0d) return 0
  return Math.atan2(p.h, p.ramp)
}

export function supportAt(d, x, gy) {
  let s = deckAt(d)
  const p = platformUnder(d, x, gy)
  if (p) s = Math.max(s, platTop(p, d - rodado(p, d)) ?? s)
  const b = boatTop(d, x)
  if (b !== null) s = Math.max(s, b)
  return s
}

// Cara inferior del tablero que haya sobre la cabeza en ese carril, o Infinity.
// Sin esto, saltar por debajo de un andamio metia la cabeza del corredor a
// traves de los tablones.
//
// El camion NO pone techo: por debajo de un camion no se pasa, se choca contra
// el (lo resuelve la propia pieza), asi que aqui solo cuentan los andamios.
export function ceilingAt(d, x) {
  for (const p of PLATFORMS) {
    if (p.d0 > d) break
    if (p.kind !== 'scaf' || d > p.end || d < p.d0d) continue
    if (Math.abs(LANES[p.lane] - x) > 1.3) continue
    return deckAt(d) + p.h - 0.22
  }
  return Infinity
}

/* ============================== IZADO DE GRUA ==============================

  El gancho de la grua es el "jetpack" de este juego: se recoge en el suelo, el
  cabestrante te levanta, cruzas volando una fila de conceptos que zigzaguea
  entre los tres carriles y te vuelve a dejar en el piso.

  El vuelo se mide en METROS de curso y no en segundos, y esa es la decision
  importante: las fichas del aire estan colocadas en el curso a una altura
  calculada con esta misma curva, asi que mientras el corredor y las fichas usen
  la misma funcion de la misma distancia, la fila cae exactamente en la
  trayectoria por rapido o lento que vaya el mundo.
*/
function suave(t) {
  return t * t * (3 - 2 * t)
}

// Fraccion de altura del vuelo, de 0 (en el suelo) a 1 (arriba del todo)
export function flyLift(u) {
  if (u <= 0 || u >= 1) return 0
  const sube = 0.16
  const baja = 0.78
  if (u < sube) return suave(u / sube)
  if (u > baja) return suave((1 - u) / (1 - baja))
  return 1
}

// Altura absoluta del corredor izado en el metro d, para un vuelo que empezo
// en `from`. Es la misma que se usa para colocar las fichas del aire.
export function flyHeightAt(d, from) {
  return deckAt(d) + FLY_H * flyLift((d - from) / FLY_LEN)
}

/* ============================== GLOSARIO ==============================

  Las palabras salen del glosario de RRHH por tema de terminal, igual que en el
  juego de tiempo. Lo que cambia es cuando se reparten: alli el curso entero
  existia antes de empezar y las etiquetas se asignaban de una vez; aqui las
  fichas nacen a mitad de partida, asi que cada tema lleva su propia bolsa que
  se rebaraja sola al agotarse. En una carrera larga se repiten palabras, pero
  no antes de haber pasado el tema entero.
*/
const bolsas = {}

function bolsaDe(key) {
  if (!bolsas[key]) {
    const z = ZONE_WORDS.find((w) => w.key === key) || ZONE_WORDS[0]
    bolsas[key] = { def: z, good: [], bad: [] }
  }
  return bolsas[key]
}

function palabra(key, good) {
  const b = bolsaDe(key)
  const lista = good ? b.good : b.bad
  if (!lista.length) {
    const fuente = good ? b.def.good.flatMap((t) => shuffled(t)) : shuffled(b.def.bad)
    lista.push(...fuente)
  }
  return lista.shift()
}

/* ============================== TERMINALES ============================== */

export const ZONES = [
  {
    key: 'tum',
    name: 'TERMINAL DE USOS MULTIPLES',
    short: 'USOS MULTIPLES',
    tag: 'Granel, proyecto y carga general',
    accent: '#FFC627',
    gap: 19,
    lead: 26,
    // con cuanta gana llena sus ranuras de convoy: en la de granel, no todas
    // -- hay camiones, pero no es su patio
    camiones: 0.7,
    patterns: [
      { obs: [[0, 'tall', 1]], safe: 0 },
      { obs: [[0, 'low', 1]], safe: 1, bad: [[9, 0]] },
      { obs: [[0, 'high', 1]], safe: 1, bad: [[9, 2]] },
      { obs: [[0, 'tall', 0]], safe: 2 },
      { obs: [[0, 'low', 2]], safe: 2, bad: [[9, 1]] },
      { obs: [[0, 'high', 0]], safe: 0, bad: [[9, 1]] },
      {
        obs: [
          [0, 'low', 0],
          [18, 'high', 2],
        ],
        safe: 1,
      },
      {
        obs: [
          [0, 'tall', 1],
          [0, 'tall', 2],
        ],
        safe: 0,
      },
      { obs: [[0, 'truck', 0]], safe: 1, bad: [[9, 2]] },
      // Patrones de dos y tres piezas. La terminal de graneles era la unica que
      // se recorria casi entera con obstaculos sueltos de uno en uno, y con los
      // huecos ya mas cortos eso se notaba todavia mas: mucho paso y poca
      // decision. Los tres de abajo obligan a elegir carril o a saltar, que es
      // lo que hacen los de las otras terminales.
      {
        obs: [
          [0, 'low', 0],
          [0, 'low', 1],
        ],
        safe: 2,
        bad: [[10, 2]],
      },
      {
        obs: [
          [0, 'tall', 2],
          [11, 'high', 1],
        ],
        safe: 0,
      },
      {
        obs: [
          [0, 'low', 0],
          [0, 'low', 1],
          [0, 'low', 2],
          [18, 'truck', 1],
        ],
        safe: 0,
      },
      {
        obs: [
          [0, 'high', 0],
          [0, 'high', 1],
          [15, 'tall', 2],
        ],
        safe: 1,
      },
    ],
  },
  {
    key: 'tec',
    name: 'TERMINAL ESPECIALIZADA DE CONTENEDORES',
    short: 'CONTENEDORES',
    tag: 'STS, patios de apilamiento y reefers',
    accent: '#00aef0',
    gap: 18,
    lead: 22,
    // el patio de contenedores es la casa del camion: aqui siempre hay uno
    camiones: 1,
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
    gap: 18,
    lead: 22,
    // AQUI EL CONVOY ES UN TREN, y siempre hay dos: es una terminal de
    // ferrocarril, asi que lo que se trepa son vagones sobre la via.
    rodante: 'tren',
    camiones: 1,
    patterns: [
      {
        obs: [
          [0, 'long', 0],
          [12.5, 'long', 0],
          [25, 'long', 0],
          [37, 'low', 1],
        ],
        safe: 2,
      },
      { obs: [[0, 'loco', 1]], safe: 2, bad: [[10, 0]] },
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
      {
        obs: [
          [0, 'high', 0],
          [0, 'high', 1],
          [0, 'high', 2],
          [26, 'long', 1],
        ],
        safe: 0,
      },
      {
        obs: [
          [0, 'long', 2],
          [12.5, 'long', 2],
          [30, 'loco', 0],
        ],
        safe: 1,
      },
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
    gap: 18,
    lead: 22,
    terreno: 'crucero',
    camiones: 0,
    patterns: [
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
    gap: 19,
    lead: 24,
    terreno: 'astillero',
    camiones: 0,
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

// Nombre del obstaculo por terminal: es lo que sale en el mensaje del golpe,
// asi que tiene que ser la pieza real, no "obstaculo".
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

/* ============================== GENERACION ============================== */

// Las listas van ordenadas por distancia y los componentes las recorren con
// cursores que solo avanzan. Cada terminal se construye en su propio lote, se
// ordena y se pega al final: como se genera siempre por delante del corredor,
// el orden global se mantiene sin tener que reordenar nada de lo ya pasado.
function empuja(lista, lote) {
  lote.sort((a, b) => a.d - b.d)
  for (const e of lote) {
    e.key = keyN++
    e.dy = e.dy || 0
    // zw es la coordenada de mundo fija de la pieza. Para lo que viene de
    // frente el reparto se hace al reves: se escribe el metro en el que TIENE
    // que encontrarse con el corredor y de ahi sale donde nace, mas lejos.
    e.zw = PLAYER_Z - e.d * (1 + (e.approach || 0))
    lista.push(e)
  }
}

// Siguiente terminal de la bolsa. Se reparten las cinco antes de repetir
// ninguna, pero nunca en el mismo orden, y no se admite que la misma caiga dos
// veces seguidas al cambiar de vuelta de bolsa.
function siguienteZona() {
  const anterior = CHAIN.length ? CHAIN[CHAIN.length - 1].key : null
  if (!bolsaZonas.length) {
    bolsaZonas = shuffled(ZONES.map((_, i) => i))
    if (ZONES[bolsaZonas[0]].key === anterior && bolsaZonas.length > 1) {
      const j = 1 + Math.floor(rng() * (bolsaZonas.length - 1))
      ;[bolsaZonas[0], bolsaZonas[j]] = [bolsaZonas[j], bolsaZonas[0]]
    }
  }
  return bolsaZonas.shift()
}

// Punto del perfil. Se ignora el que repita el metro anterior: la busqueda
// binaria de deckAt necesita que la tabla sea estrictamente creciente.
function perfil(d, y) {
  const last = PROFILE[PROFILE.length - 1]
  if (d <= last[0] + 0.001) {
    last[1] = y
    return
  }
  PROFILE.push([d, y])
}

// Suelta patrones de obstaculos por un tramo llano, con su fila de premio en el
// carril que cada patron deja libre. Es lo mismo que hacia el juego de tiempo,
// solo que el patron se sortea en vez de ir en orden.
function patrones(z, ctx, from, to) {
  const { obstacles, items } = ctx
  const zone = z.zone
  let d = from
  let ultimo = -1
  // LO QUE VA EN EL HUECO SE COLOCA UN PATRON MAS TARDE, y no es un rodeo: es
  // la unica forma de saber donde acaba el hueco de verdad.
  //
  // Un patron ocupa hacia ADELANTE lo que mide su ultima pieza (`span`), pero
  // tambien hacia ATRAS: sus piezas van CENTRADAS en su metro, asi que un
  // contenedor de cuarenta pies se come seis metros por delante de donde
  // empieza el patron, y una locomotora, siete. Mientras la fila de premio se
  // repartia nada mas colocar su patron, no habia forma de tenerlo en cuenta --
  // el patron siguiente todavia no estaba sorteado -- y la ultima ficha acababa
  // DENTRO de esa pieza. Un valor plantado donde hay que chocarse para cogerlo
  // es de lo peor que puede pasar en un juego de esquivar, porque encima invita
  // a intentarlo.
  //
  // Asi que el hueco se queda pendiente y se rellena cuando ya se sabe contra
  // que topa. Lo mismo vale para las fichas rojas del patron: la que va a
  // dieciseis metros cabia con los huecos largos de antes y con estos ya no
  // siempre, y si no cabe, no se pone.
  let pend = null

  // Reparte lo que quedo pendiente del patron anterior en el hueco, sabiendo ya
  // donde topa por delante.
  const rellena = (limite) => {
    if (!pend) return
    for (const b of pend.malas) {
      if (b.d < limite) items.push({ d: b.d, lane: b.lane, kind: 'bad', dy: deckAt(b.d), label: palabra(z.key, false) })
    }
    const largo = Math.max(0, limite - pend.desde)
    const cuantas = largo < 4 ? 1 : largo < 9 ? 2 : 3
    if (largo >= 1) {
      for (let i = 0; i < cuantas; i++) {
        const dd = pend.desde + (cuantas > 1 ? (largo * i) / (cuantas - 1) : 0)
        items.push({ d: dd, lane: pend.lane, kind: 'good', dy: deckAt(dd), label: palabra(z.key, true) })
      }
    }
    pend = null
  }

  while (d < to) {
    // el mismo patron dos veces seguidas se lee como un fallo del juego
    let n = Math.floor(rng() * zone.patterns.length)
    if (n === ultimo) n = (n + 1) % zone.patterns.length
    ultimo = n
    const p = zone.patterns[n]

    const span = p.obs.reduce((m, o) => Math.max(m, o[0] + OBSTACLE_LEN[o[1]] / 2), 0)
    // lo que este patron se come hacia atras de su propio metro de arranque
    const atras = p.obs.reduce((m, o) => Math.max(m, OBSTACLE_LEN[o[1]] / 2 - o[0]), 0)
    // El patron entra entero o no entra: si solo se comprueba el inicio, uno
    // que arranca a dos metros del final deja su cola dentro de la rampa que se
    // queria dejar limpia.
    if (d + span > to) break

    rellena(d - atras - 1.2)

    for (const [od, type, lane] of p.obs) {
      obstacles.push({
        d: d + od,
        type,
        lane,
        zone: z.i,
        dy: deckAt(d + od),
        approach: APPROACH[type] || 0,
        theme: z.key,
        label: (OBSTACLE_LABELS[z.key] || OBSTACLE_LABELS.tec)[type],
      })
    }

    // El hueco se mueve un poco de un patron a otro: con el paso clavado la
    // terminal entera cae a compas y se aprende de memoria.
    const hueco = zone.gap * rf(0.85, 1.2)
    pend = {
      desde: d + span + 3.5,
      lane: p.safe,
      malas: (p.bad || []).map(([bd, lane]) => ({ d: d + bd, lane })),
    }
    d += span + hueco
  }
  // el ultimo hueco topa con el final del tramo
  rellena(to - 2)
}

// Quita de un lote lo que caiga dentro de un carril y un tramo. Lo usan las
// plataformas y el vuelo de la grua: nacen despues que los patrones y no pueden
// heredar una tolva plantada en mitad de la rampa.
// `tipos`, si se pasa, limita la limpieza a esas clases de pieza. Lo necesita la
// via doble: ahi el carril libre no hay que vaciarlo -- seria un pasillo sin
// nada que hacer durante setenta metros -- sino solo quitarle lo que en un solo
// carril no tendria salida (ver convoy).
function despeja(lote, lane, from, to, tipos = null) {
  for (let i = lote.length - 1; i >= 0; i--) {
    const e = lote[i]
    if (tipos && !tipos.includes(e.type)) continue
    if ((lane === null || e.lane === lane) && e.d > from && e.d < to) lote.splice(i, 1)
  }
}

// Piezas que NO se saltan ni se ruedan: la unica salida es cambiarse de carril.
const SOLO_CARRIL = ['tall', 'long', 'truck', 'loco']

/* ---------- Camion portacontenedor: la plataforma de Subway Surfers ----------

  Un convoy son dos o tres camiones en fila por un carril, separados por un
  hueco de seis metros. El primero lleva la rampa trasera, que es la unica forma
  de subirse: quien entra por ese carril acaba arriba sin tener que clavar un
  salto. De ahi en adelante hay que ir saltando de techo en techo, y en los
  techos van los valores.

  Y la mitad de las veces salen DE DOS EN DOS, en carriles contiguos: ahi arriba
  se puede cambiar de convoy en marcha, que es la jugada por la que la gente
  reconoce el genero. Lo explica la via doble, mas abajo.

  Que la rampa recoja siempre a quien pasa por su carril es a proposito: el
  camion no es un obstaculo con premio escondido, es una ruta alternativa que se
  ve venir de lejos. Lo que cuesta es SOSTENERSE, igual que en los andamios del
  dique.
*/
function convoy(z, ctx, d0, lane, limite) {
  const { items } = ctx
  // En la intermodal el convoy es un TREN: mismos metros, misma rampa y mismo
  // techo, pero vagones sobre la via en vez de tractocamiones. Lo unico que
  // cambia es como se dibuja (ver Rigs.jsx), y ahi cambia todo: en un patio de
  // ferrocarril, subirse a un tren en marcha es la imagen entera del juego.
  const estilo = z.zone.rodante || 'camion'

  /* ---------- VIA DOBLE: DEL TECHO DE UNO AL DE AL LADO ----------

    Esto es lo que faltaba para que la jugada fuera la de Subway Surfers de
    verdad. Con un solo convoy, arriba solo se podia ir HACIA ADELANTE: el
    carril quedaba fijado al subirse y cambiarlo era bajarse. Ahora la mitad de
    los convoyes salen emparejados con otro en el carril de al lado, y ahi
    arriba se puede ir de un techo al otro sin tocar el suelo.

    Las dos vias arrancan su rampa en el MISMO metro -- se abordan las dos por
    igual, se elija la que se elija -- pero la segunda lleva un contenedor corto
    de cabeza, y eso es lo que ESCALONA sus huecos respecto a los de la de al
    lado. Es la diferencia entre que cruzarse sirva de algo o no: con los cortes
    alineados, pasarse de techo en techo no salva ningun hueco.

    Nunca son tres: el corredor tiene que conservar siempre un carril de suelo
    por el que seguir, y ademas dos convoyes ya llenan el patio de lado a lado.
  */
  const vecinos = [lane - 1, lane + 1].filter((l) => l >= 0 && l <= 2)
  const doble = vecinos.length > 0 && rng() < 0.5 * z.zone.camiones
  const vias = [{ lane, corto: false }]
  if (doble) vias.push({ lane: pick(vecinos), corto: true })

  // Cola del conjunto: donde acaba la via mas larga. De ahi salen los metros
  // que le quedan para rodar, que tienen que ser los mismos para las dos.
  let cola = d0
  for (const via of vias) {
    via.trozos = []
    let d = d0
    const n = ri(2, 3)
    for (let i = 0; i < n; i++) {
      // Un contenedor de 40 pies mas la cabina; el primero de la segunda via es
      // uno de 20, que es lo que desplaza sus huecos medio remolque.
      const len = via.corto && i === 0 ? rf(11.5, 13) : rf(15, 18)
      via.trozos.push({
        d0: d,
        lane: via.lane,
        len,
        ramp: i === 0 ? RIG_RAMP : 0,
        h: RIG_H,
        kind: 'rig',
        estilo,
        bonus: RIG_BONUS,
        bonusLabel: estilo === 'tren' ? 'TREN COMPLETO' : 'CONVOY COMPLETO',
      })
      d += (i === 0 ? RIG_RAMP : 0) + len + rf(5.5, 7)
    }
    cola = Math.max(cola, d)
  }

  /* ---------- ¿PARADO O EN MARCHA? ----------

    Lo que puede rodar es lo que quepa por delante: el convoy barre su carril
    hacia adelante y ese tramo tiene que quedar limpio, asi que los metros que
    rueda salen de los que sobran hasta el limite del hueco que se le reservo.
    Si no sobran, se queda parado, que es lo que hacia siempre hasta ahora.

    A 0.38 de la velocidad del mundo el corredor lo alcanza a poco mas de la
    mitad de su ritmo normal -- se ve venir de lejos, se tarda en llegar, y una
    vez arriba se recorre de cola a morro con el suelo moviendose debajo. Mas
    rapido que eso no se alcanza nunca; mas lento se lee como si estuviera
    parado.

    LAS DOS VIAS RUEDAN IGUAL, y no es un detalle de comodidad: `rodado` es lo
    que desplaza techos y fichas, asi que dos convoyes con distinta velocidad se
    irian separando y el salto de un techo al de al lado dejaria de caer donde
    se ve que cae.
  */
  // Lo que puede rodar es lo que le sobra hasta el final de su ranura, con tope.
  // Mas de medio centenar de metros no cabria sin comerse la ranura siguiente, y
  // lo que se gana con ello es un convoy mas por patio, que se nota mucho mas.
  const corre = Math.max(0, Math.min(50, (limite || cola) - cola - 10))
  const mueve = corre > 16 && rng() < 0.6
  if (mueve) {
    for (const via of vias) {
      for (const p of via.trozos) {
        p.v = 0.38
        // ARRANCA CUANDO YA SE LE VE. Veinte metros antes de su cola: el
        // corredor llega a un convoy parado y lo ve ponerse en marcha delante de
        // el, que es mucho mejor que encontrarselo ya rodando. Y ademas asi le
        // sobran metros de tramo para seguir andando mientras se le recorre por
        // encima, que es lo que se venia a sentir.
        p.desde = d0 - 20
        p.tope = corre
      }
    }
  }
  const fin = cola + (mueve ? corre : 0)

  // El carril del convoy queda limpio de punta a punta -- una tolva pegada a la
  // rampa o un contenedor donde se aterriza no es dificultad, es un accidente --
  // y si el convoy va a rodar, tambien todo lo que va a barrer por delante: un
  // camion en marcha atravesando un contenedor parado se ve fatal, y ademas
  // seria una pieza que se te viene encima sin que nadie la haya puesto ahi.
  for (const via of vias) {
    despeja(ctx.obstacles, via.lane, d0 - 12, fin + 16)
    despeja(ctx.items, via.lane, d0 - 6, fin + 14)
  }

  // CON DOS CARRILES OCUPADOS, EL QUE QUEDA NO PUEDE SER UNA ENCERRONA.
  //
  // Por el tercer carril se sigue pudiendo pasar de largo sin subirse a nada, y
  // ahi tiene que quedar algo que hacer -- por eso no se vacia --, pero lo que
  // solo se esquiva cambiando de carril si se quita: con los otros dos llenos
  // de camion, un contenedor plantado enfrente no tendria salida ninguna.
  if (doble) {
    const libre = [0, 1, 2].find((l) => !vias.some((v) => v.lane === l))
    despeja(ctx.obstacles, libre, d0 - 12, fin + 16, SOLO_CARRIL)
  }

  // Cada trozo sabe de que convoy es. Lo usa el dibujo para fusionar el convoy
  // ENTERO en una sola tanda de mallas en vez de una por remolque: son la misma
  // pieza moviendose junta, y con tres convoyes en pantalla la diferencia entre
  // una cosa y otra son cien llamadas de dibujo (ver Rigs.jsx).
  for (const via of vias) for (const p of via.trozos) p.convoy = via.trozos

  registraPlataformas(...vias.map((v) => v.trozos))

  // LO QUE SE RECOGE ARRIBA SON LOS MISMOS CONCEPTOS QUE ABAJO, no otra moneda.
  //
  // Aqui hubo monedas y estaban mal: metian una segunda cosa que recoger, con
  // su propio color y su propio contador, en un juego que existe para que la
  // gente lea el vocabulario del Tronco Comun. Subirse al camion tiene que
  // pagar MAS DE LO MISMO -- mas palabras, mas rapido -- y no un premio aparte
  // que compite con ellas por la atencion.
  //
  // Los margenes son mayores que el paso: el canto por el que se aterriza y el
  // canto desde el que se salta van LIMPIOS. El hexagono mide dos metros y
  // taparia justo el sitio donde hay que mirar (es la misma leccion que ya
  // habian dejado los tableros de andamio del dique).
  for (const via of vias) {
    for (const p of via.trozos) {
      for (let dd = p.d0d + 4.5; dd < p.end - 6; dd += 6) {
        // `rig` es lo que ata la ficha a SU plataforma: si el convoy rueda, las
        // fichas del techo ruedan con el. Sin esto se quedaban clavadas en el
        // metro donde nacieron y el camion se iba por debajo dejandolas en el aire.
        items.push({ d: dd, lane: via.lane, kind: 'good', dy: deckAt(dd) + p.h, rig: p, label: palabra(z.key, true) })
      }
    }
  }
  return fin
}

// Cierra una o varias cadenas de plataformas: calcula sus metros derivados y
// marca cual pide saltar al siguiente y cual paga el bono.
function registraPlataformas(...cadenas) {
  const todas = []
  for (const trozos of cadenas) {
    for (const p of trozos) {
      p.d0d = p.d0 + p.ramp
      p.end = p.d0 + p.ramp + p.len
      p.d = p.d0 + (p.ramp + p.len) / 2
      p.span = p.ramp + p.len
    }
    trozos.forEach((p, i) => {
      const n = trozos[i + 1]
      // galones en el canto: sin ese aviso la plataforma de enfrente se ve de
      // canto y a la misma altura, o sea casi invisible, y el salto es adivinanza
      p.jump = !!(n && n.ramp === 0 && n.d0 - p.end < 16)
      p.last = !p.jump
    })
    todas.push(...trozos)
  }
  // PLATFORMS VA ORDENADA POR METRO DE NACIMIENTO, no por cadena: todos los
  // cursores que la recorren -- el suelo, el techo y la ventana de dibujo --
  // cortan en el primer d0 que se pasa de largo. Dos vias en paralelo se
  // entrelazan (rampa, rampa, remolque, remolque...), asi que hay que mezclarlas
  // antes de pegarlas o la segunda se perderia entera detras de ese corte.
  todas.sort((a, b) => a.d0 - b.d0)
  PLATFORMS.push(...todas)
}

/* ---------- Izado de grua: el gancho que te sube a por los valores de arriba ---------- */
function izado(z, ctx, d0) {
  const { items } = ctx
  const fin = d0 + FLY_LEN

  /* ---------- QUE SE LIMPIA Y QUE NO ----------

    Antes se vaciaba el corredor ENTERO, los ciento sesenta y cinco metros. Y
    eso castigaba justo a quien no coge el gancho: se quedaba corriendo por un
    pasillo vacio durante seis segundos largos, sin nada que esquivar y sin nada
    que recoger, mirando como otro se lo lleva por el aire. La recompensa de
    volar tiene que ser volar POR ENCIMA DE ALGO.

    Colgado del cable no hay peligro -- los obstaculos ni miran al que va
    volando (ver Obstacles) --, asi que lo que hay debajo puede seguir ahi. Solo
    se limpian los tramos donde la curva del vuelo pasa a la altura de las
    piezas, que es donde una se le meteria por dentro al muneco:

      - LA ENTRADA Y LA SUBIDA. Los veinte metros de antes, porque el gancho no
        puede aparecer detras de una pieza que hay que rodar -- pedir esquivar y
        agarrar en el mismo medio segundo, con una sola vida, no es dificultad
        sino encerrona --, y los veintiseis que tarda la curva en llegar arriba.
      - LA BAJADA Y EL ATERRIZAJE, por lo mismo y porque hay que posarse en
        suelo despejado.

    En medio, noventa metros a cuatro metros ochenta de altura: por debajo cabe
    el patio entero con sus obstaculos.
  */
  const SUBIDA = FLY_LEN * 0.16 + 8
  const BAJADA = FLY_LEN * 0.78 - 5
  despeja(ctx.obstacles, null, d0 - 20, d0 + SUBIDA)
  despeja(ctx.obstacles, null, d0 + BAJADA, fin + 22)
  despeja(ctx.items, null, d0 - 6, d0 + SUBIDA - 4)
  despeja(ctx.items, null, d0 + BAJADA + 4, fin + 6)

  // El gancho nace en el carril por el que arranca la fila: asi lo que se recoge
  // y lo que se va a recoger se leen como una sola cosa.
  let lane = ri(0, 2)
  items.push({ d: d0, lane, kind: 'lift', dy: deckAt(d0) })

  // Fila de conceptos colgada de la curva del vuelo, zigzagueando entre
  // carriles: volar no es gratis, hay que ir a buscarlos.
  //
  // El paso es de seis metros y medio y no de cuatro: son hexagonos de dos
  // metros con su palabra encima, no monedas. Mas juntos se tapan unos a otros
  // en perspectiva y las etiquetas se enciman, que es justo perder lo que se
  // venia a leer.
  let quedan = ri(3, 5)
  for (let dd = d0 + 12; dd < fin - 10; dd += 6.5) {
    if (quedan-- <= 0) {
      lane = pick([0, 1, 2].filter((l) => l !== lane))
      quedan = ri(3, 5)
    }
    items.push({ d: dd, lane, kind: 'good', dy: flyHeightAt(dd, d0), label: palabra(z.key, true) })
  }
  return fin
}

/* ---------- Terminal llana: usos multiples, contenedores, intermodal ---------- */
function generaLlana(z, ctx) {
  // Largo de la terminal. El minimo no es un numero bonito: una terminal llana
  // tiene que poder alojar el vuelo entero de un izado (165 m mas su carrerilla
  // y su aterrizaje) Y un convoy de camiones sin que se pisen, o cada terminal
  // acabaria teniendo una jugada grande o la otra, nunca las dos.
  const largo = ri(400, 560)
  z.end = z.start + largo
  perfil(z.end, 0)

  const desde = z.start + z.zone.lead
  const hasta = z.end - 10
  patrones(z, ctx, desde, hasta)

  // EL GANCHO DE GRUA NO PERTENECE A NINGUNA TERMINAL: lleva su propio contador
  // de metros y cae en la primera terminal llana donde quepa el vuelo entero.
  // Si le tocaba dentro de un crucero o de un astillero, donde no hay sitio,
  // espera -- por eso el metro se calcula con un maximo contra `desde` en vez
  // de descartarse el turno.
  let vuelo = null
  const dGrua = Math.max(proxGrua, desde + 30)
  if (dGrua + FLY_LEN + 24 <= hasta) {
    vuelo = [dGrua - 6, izado(z, ctx, dGrua) + 24]
    proxGrua = vuelo[1] + rf(320, 520)
  }

  // CONVOY DE CAMIONES PORTACONTENEDOR.
  //
  // No se sortea "si hay o no": lo que decide es el contador de metros, igual
  // que con la grua. Antes iba a dados y ademas se descartaba entero si el sitio
  // sorteado caia dentro del vuelo, y eso era lo que hacia que en algunas
  // partidas no apareciera un solo camion en dos kilometros: la terminal donde
  // tocaba camion era justo la terminal larga y llana donde tambien habia caido
  // el gancho, o sea siempre la misma.
  //
  // Ahora se busca el HUECO: el tramo libre mas ancho que queda a un lado o a
  // otro del vuelo. Si no cabe, el convoy espera a la terminal llana siguiente
  // en vez de perderse.
  // CASCO REFORZADO. Va suelto en un carril, sin corredor despejado ni nada:
  // no es una secuencia como el izado, es un objeto que se recoge de paso. Solo
  // se le quita de encima el obstaculo que le caiga justo al lado, porque un
  // premio que obliga a chocarse para cogerlo no es un premio.
  //
  // El metro se calcula con un maximo contra `desde`, igual que el del gancho:
  // si le tocaba dentro de un crucero o de un astillero, el casco ESPERA a la
  // primera terminal llana. Aqui hubo un fallo tonto y caro -- se adelantaba el
  // contador en una rama y se colocaba en la otra, asi que en la vuelta
  // siguiente volvia a quedar por detras y se adelantaba otra vez: en doce
  // kilometros aparecia UN casco.
  const dCasco = Math.max(proxEscudo, desde + 20)
  if (dCasco < hasta - 20) {
    const carril = ri(0, 2)
    despeja(ctx.obstacles, carril, dCasco - 12, dCasco + 6)
    despeja(ctx.items, carril, dCasco - 4, dCasco + 4)
    ctx.items.push({ d: dCasco, lane: carril, kind: 'shield', dy: deckAt(dCasco) })
    proxEscudo = dCasco + rf(780, 1050)
  }

  /* ---------- CONVOYES ----------

    HASTA TRES POR TERMINAL, y antes era uno.

    El camion (y en la intermodal, el tren) es la jugada que distingue a este
    juego, y con uno cada cuatrocientos metros largos se cruzaba de tarde en
    tarde: quien juega una partida corta -- que con una sola vida son casi todas
    -- podia no ver ninguno. Ahora el tramo libre de la terminal se parte en
    ranuras de ciento diez metros y cada una puede alojar el suyo, que es lo que
    hace que el patio se lea como un patio: con material rodante por todas
    partes y un carril de los tres ocupado casi siempre.

    Cada convoy mide sesenta o setenta metros y puede rodar hasta setenta mas,
    asi que la ranura se le pasa como LIMITE: es hasta donde puede barrer su
    carril sin meterse en la ranura del siguiente.

    `camiones` es por fin lo que su nombre dice: con cuanta gana la terminal
    llena las ranuras que le quedan despues de la primera. En el patio de
    contenedores y en la intermodal, todas; en la de graneles, la mitad -- hay
    camiones, pero no es su patio.
  */
  const RANURA = 110
  if (z.zone.camiones > 0) {
    // los tramos libres: uno solo, o los dos que deja el vuelo de la grua
    const tramos = vuelo
      ? [
          [desde + 40, Math.min(hasta, vuelo[0] - 12)],
          [Math.max(desde + 40, vuelo[1] + 12), hasta],
        ]
      : [[desde + 40, hasta]]
    const huecos = []
    for (const [a, b] of tramos) {
      const caben = Math.min(3, Math.floor((b - a) / RANURA))
      const paso = caben > 0 ? (b - a) / caben : 0
      for (let i = 0; i < caben; i++) huecos.push([a + i * paso, a + (i + 1) * paso])
    }
    let puestos = 0
    for (const h of huecos) {
      // LA ESPERA SOLO SE MIRA EN LA PRIMERA RANURA DE LA TERMINAL, y es lo
      // ultimo que estaba estrangulando esto. Entre las ranuras de un mismo
      // patio no hace falta: cada convoy vive dentro de la suya -- ahi nace y
      // hasta ahi puede rodar --, asi que dos seguidos no pueden pisarse. Lo
      // unico que hay que evitar es que el primero de un patio caiga pegado al
      // ultimo del anterior, que es justo lo que este contador guarda.
      if (puestos === 0 && h[0] < proxCamion) continue
      // el primero de la terminal siempre; los demas, segun lo camionera que sea
      if (puestos > 0 && rng() > z.zone.camiones) continue
      // Al principio de su ranura: lo que sobra por delante es lo que el convoy
      // puede rodar, y uno plantado al final nunca podria ponerse en marcha.
      const arranca = rf(h[0], h[0] + (h[1] - h[0]) * 0.25)
      proxCamion = convoy(z, ctx, arranca, ri(0, 2), h[1] - 6) + rf(8, 25)
      puestos++
    }
  }
}

/* ---------- Terminal de cruceros: muelle, travesia y cubierta ---------- */
const BOAT_LEN = 14
function generaCrucero(z, ctx) {
  const { items, boats } = ctx

  z.muelleEnd = z.start + 34
  const travesia = ri(140, 200)
  z.boatsEnd = z.muelleEnd + travesia
  z.rampEnd = z.boatsEnd + 38
  z.downStart = z.rampEnd + ri(150, 250)
  z.downEnd = z.downStart + 30
  z.end = z.downEnd + 34

  // Perfil: canto del muelle de medio metro (un escalon, no un despenadero),
  // fondo del mar durante la travesia, pasarela a cubierta y desembarco.
  perfil(z.muelleEnd - 0.6, 0)
  perfil(z.muelleEnd, SEA_FLOOR)
  perfil(z.boatsEnd - 8, SEA_FLOOR)
  perfil(z.boatsEnd, 0)
  perfil(z.rampEnd, DECK_Y)
  perfil(z.downStart, DECK_Y)
  perfil(z.downEnd, 0)
  perfil(z.end, 0)

  // Cadena de lanchas: cada una ocupa UN carril y entre una y otra hay mar
  // abierto, asi que no basta con saltar el hueco: hay que caer en el carril
  // donde esta la siguiente. El carril cambia, pero nunca dos carriles de golpe
  // -- eso pedia saltar y cruzar la pista entera en el mismo vuelo.
  let d = z.muelleEnd
  let lane = 1
  while (d + BOAT_LEN < z.boatsEnd) {
    boats.push({ d: d + BOAT_LEN / 2, len: BOAT_LEN, lane, dy: 0 })
    items.push({ d: d + 4, lane, kind: 'good', dy: 0, label: palabra(z.key, true) })
    items.push({ d: d + 9.5, lane, kind: 'good', dy: 0, label: palabra(z.key, true) })
    const salto = [lane - 1, lane, lane + 1].filter((l) => l >= 0 && l <= 2 && l !== lane)
    lane = R() < 0.25 ? lane : pick(salto)
    d += BOAT_LEN + rf(4.5, 6)
  }

  // la pasarela es respiro: se sube sin nada que esquivar, con valores en fila
  for (let k = 0; k < 4; k++) {
    const dd = z.boatsEnd + 8 + k * 7
    items.push({ d: dd, lane: 1, kind: 'good', dy: deckAt(dd), label: palabra(z.key, true) })
  }

  patrones(z, ctx, z.rampEnd + 16, z.downStart - 10)
}

/* ---------- Astillero: al fondo del dique, con andamios que se trepan ---------- */
function generaAstillero(z, ctx) {
  const { items } = ctx

  z.edgeEnd = z.start + 30
  z.floorStart = z.start + 66
  z.floorEnd = z.floorStart + ri(300, 372)
  z.gradaStart = z.floorEnd + 32
  z.end = z.gradaStart + ri(90, 150)
  z.shipFrom = z.floorStart + 14
  z.shipTo = z.floorEnd - 12

  perfil(z.edgeEnd, 0)
  perfil(z.floorStart, DOCK_Y)
  perfil(z.floorEnd, DOCK_Y)
  perfil(z.gradaStart, 0)
  perfil(z.end, 0)

  patrones(z, ctx, z.start + 4, z.edgeEnd - 6)
  patrones(z, ctx, z.floorStart + 8, z.floorEnd - 8)
  patrones(z, ctx, z.gradaStart + 8, z.end - 8)

  // Las rampas de bajada al dique y de salida se pagan con valores en fila: no
  // deberian sentirse como tiempo muerto.
  for (const [a, b] of [
    [z.edgeEnd + 6, z.floorStart - 4],
    [z.floorEnd + 6, z.gradaStart - 4],
  ]) {
    for (let dd = a; dd < b; dd += 7) {
      items.push({ d: dd, lane: 1, kind: 'good', dy: deckAt(dd), label: palabra(z.key, true) })
    }
  }

  // Cadenas de andamios pegadas al casco. Cada cadena empieza con un tablero
  // con escalera (el unico por el que se sube desde la solera) y sigue con
  // tableros sin escalera separados por un hueco de cinco a siete metros: para
  // seguir arriba hay que ir saltando. Un hueco mas largo no se puede pulsar a
  // tiempo -- el salto cubre trece metros a 25 m/s y hay que gastar el hueco
  // entero antes de aterrizar.
  let d = z.floorStart + 24
  const tope = z.floorEnd - 40
  let lanePrev = -1
  while (d < tope) {
    let lane = ri(0, 2)
    if (lane === lanePrev) lane = (lane + 1 + Math.floor(rng() * 2)) % 3
    lanePrev = lane
    const n = ri(2, 3)
    const trozos = []
    let dd = d
    for (let i = 0; i < n; i++) {
      // el ultimo tablero de la cadena puede cambiar de carril: el salto y el
      // cambio de carril se hacen a la vez, que es el momento bonito de la zona
      const carril = i === n - 1 && R() < 0.4 ? Math.max(0, Math.min(2, lane + pick([-1, 1]))) : lane
      const len = ri(20, 32)
      trozos.push({
        d0: dd,
        lane: carril,
        len,
        ramp: i === 0 ? SCAF_RAMP : 0,
        h: SCAF_H,
        kind: 'scaf',
        bonus: SCAF_BONUS,
        bonusLabel: 'ANDAMIO COMPLETO',
      })
      dd += (i === 0 ? SCAF_RAMP : 0) + len + rf(5, 7)
    }
    if (dd > tope + 20) break

    // Se limpia el carril de la cadena: las piezas del generador taparian la
    // escalera y el hueco entre tableros, y la eleccion de subir o no dejaria de
    // leerse. 16 m pasado el canto de CUALQUIER tablero, porque el que se sale
    // de uno cae al fondo del dique unos nueve metros mas alla y aterrizar
    // encima de un SPMT que ya no podia esquivar no es castigo, es un accidente.
    for (const p of trozos) {
      despeja(ctx.obstacles, p.lane, p.d0 - 10, p.d0 + p.ramp + p.len + 16)
    }

    registraPlataformas(trozos)

    // Lo que se juega ARRIBA. Va un obstaculo por cadena y con zona libre
    // alrededor: el primer tablero (el de la escalera) va vacio, porque la
    // rampa deja al corredor arriba a 25 m/s con la camara todavia subiendo, y
    // en un tablero al que se llega saltando los primeros trece metros son zona
    // de aterrizaje. En un tablero que acaba en hueco solo caben piezas de
    // RODAR: el salto que resolveria una pieza baja cubre trece metros y se
    // aterrizaria justo en el canto.
    const arriba = trozos[ri(1, trozos.length - 1)]
    if (arriba && arriba.len > 22) {
      const tipo = arriba.last ? pick(['low', 'hook']) : 'hook'
      const dObs = arriba.d0d + 14 + rf(0, Math.max(0, arriba.len - 20))
      despeja(ctx.items, arriba.lane, dObs - 4, dObs + 4)
      ctx.obstacles.push({
        d: dObs,
        type: tipo,
        lane: arriba.lane,
        zone: z.i,
        dy: deckAt(arriba.d0d + 2) + SCAF_H,
        approach: APPROACH[tipo] || 0,
        theme: 'astillero',
        label: OBSTACLE_LABELS.astillero[tipo],
      })
    }

    // Y lo que se juega DEBAJO: lineas de servicio que obligan a rodar a quien
    // decide no subirse. Van en pieza baja porque bajo el tablero hay 2.7 m de
    // galibo y una pieza alta lo atravesaria.
    for (const p of trozos) {
      if (R() < 0.55) continue
      const dObs = p.d0d + rf(4, Math.max(5, p.len - 4))
      // Debajo del tablero sigue habiendo la fila de valores que dejaron los
      // patrones de la solera -- ahi se corre igual --, y esta pieza nace
      // despues que ellos: sin despejar, la tuberia se plantaba encima de un
      // valor y el hexagono quedaba dentro de la pieza que hay que rodar.
      despeja(ctx.items, p.lane, dObs - 3, dObs + 3)
      ctx.obstacles.push({
        d: dObs,
        type: 'pipe',
        lane: p.lane,
        zone: z.i,
        dy: deckAt(dObs),
        approach: 0,
        theme: 'astillero',
        label: OBSTACLE_LABELS.astillero.pipe,
      })
    }

    d = dd + rf(28, 55)
  }

  // Arriba NO van fichas de palabra: el hexagono es tan grande que tapaba justo
  // el canto donde hay que aterrizar. Lo que paga sostenerse arriba es el bono
  // de cadena completa, que no ocupa sitio en pantalla.
}

// Genera una terminal entera y la pega al curso
function generaZona() {
  const zi = siguienteZona()
  const zone = ZONES[zi]
  const z = {
    i: CHAIN.length,
    key: zone.key,
    zone,
    start: built,
    end: built,
  }
  CHAIN.push(z)

  const ctx = { obstacles: [], items: [], boats: [] }

  // El portico va justo en el limite, salvo el primero: en el metro 0 nace
  // encima del corredor y no se ve pasar.
  const gate = { d: z.i === 0 ? 20 : z.start, zone: z.i }

  perfil(z.start, deckAt(z.start))
  if (zone.terreno === 'crucero') generaCrucero(z, ctx)
  else if (zone.terreno === 'astillero') generaAstillero(z, ctx)
  else generaLlana(z, ctx)

  gate.dy = deckAt(gate.d)
  empuja(COURSE.gates, [gate])
  empuja(COURSE.obstacles, ctx.obstacles)
  empuja(COURSE.items, ctx.items)
  empuja(COURSE.boats, ctx.boats)

  built = z.end
}

// Margen que se mantiene siempre construido por delante. Tiene que ser mayor
// que VIEW_AHEAD con holgura: lo que se genera tarde aparece de la nada dentro
// de la niebla, y ademas el escenario de World pregunta por alturas hasta medio
// segmento mas alla de lo que se ve.
const MARGEN = 700

export function ensureCourse(d) {
  let guarda = 0
  while (built < d + MARGEN && guarda++ < 12) generaZona()
}

// Carrera nueva: se vacian las listas EN SITIO (ver la nota de arriba) y se
// vuelve a sembrar el azar.
//
// CON SEMILLA SE REPITE LA MISMA PISTA, metro por metro. En el stand no se usa
// -- cada partida sortea su trazado -- pero es lo que hace posible probar el
// juego: sin poder repetir una pista no hay forma de volver a un convoy o a un
// andamio concreto para ver que sigue haciendo lo mismo (ver scripts/humo.mjs).
// El orden manda: la semilla pedida a mano gana a la de la direccion (?seed=),
// y si no hay ninguna se sortea una nueva.
export function resetCourse(semilla = 0) {
  seedActual = semilla || SEED_FIJA || (Math.floor(Math.random() * 0xffffffff) >>> 0)
  rng = mulberry32(seedActual)
  PROFILE.length = 1
  PROFILE[0] = [0, 0]
  PLATFORMS.length = 0
  CHAIN.length = 0
  COURSE.obstacles.length = 0
  COURSE.items.length = 0
  COURSE.boats.length = 0
  COURSE.gates.length = 0
  for (const k of Object.keys(bolsas)) delete bolsas[k]
  built = 0
  keyN = 0
  bolsaZonas = []
  // EL PRIMER GANCHO DE GRUA VA PRONTO, Y EL PRIMER CAMION DESDE EL METRO CERO.
  //
  // Con una sola vida, media docena de partidas se acaban antes del metro 600.
  // Si las dos jugadas que distinguen a este juego -- treparse a un camion y
  // dejarse izar por la grua -- aparecieran a los mil metros, la mayoria de la
  // gente del stand no las veria NUNCA y se llevaria la impresion de haber
  // jugado al otro Terminal Rally con menos tiempo.
  proxGrua = rf(110, 165)
  proxCamion = 0
  // El primer casco no sale de salida: los primeros metros van a trece metros
  // por segundo y ahi no hace falta. Sale cuando la velocidad ya aprieta.
  proxEscudo = rf(560, 760)
  ensureCourse(0)
}

resetCourse()
