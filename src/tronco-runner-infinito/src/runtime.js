import { BASE_SPEED } from './constants'

// Debug: ?skip=500 arranca la partida en el metro 500. Vive aqui y no en World
// porque tiene que mover el escenario y el curso a la vez; si solo saltara el
// escenario, los obstaculos de la tercera terminal se inspeccionarian sobre el
// patio de la primera.
const PARAMS = new URLSearchParams(window.location.search)
export const SKIP = Number(PARAMS.get('skip')) || 0
// ?debug tambien abre la puerta: la prueba de humo necesita leer el estado vivo
// (altura, carril, si va colgado de la grua) sin tener que saltar a un metro
// concreto, que es lo que significa ?skip.
export const DEBUG = SKIP > 0 || PARAMS.has('debug')

// Estado mutable de alta frecuencia (posiciones, velocidad) que no debe
// pasar por React: lo escriben y leen los useFrame directamente.
export const runtime = {
  targetLane: 1,
  x: 0,
  y: 0,
  vy: 0,
  // buffers de intencion en segundos, no booleanos: asi una pulsacion hecha
  // medio frame antes de aterrizar no se pierde
  jumpBuf: 0,
  slideBuf: 0,
  // altura del suelo bajo los pies: 0 en el patio, 3.2 sobre la cubierta del
  // crucero, 2.9 sobre el techo de un camion. La calcula el corredor, que es
  // quien sabe por que carril va; el salto (y) se mide desde aqui.
  deck: 0,
  slide: 0, // segundos que queda de rodada
  slideCd: 0, // espera antes de poder rodar otra vez
  speed: BASE_SPEED,
  elapsed: 0,
  distance: 0,
  shake: 0,
  stagger: 0, // segundos de tambaleo tras un choque, lo consume Player
  wet: false, // yendo por el agua en la travesia del crucero

  // IZADO DE GRUA. Mientras `flying` esta puesto, el corredor va colgado del
  // cabestrante: la altura la manda la curva del vuelo, no la gravedad, y nada
  // de lo que hay en pista le puede pegar. `flyFrom` es el metro en el que
  // engancho, y de ahi sale la altura -- ver flyHeightAt en course.js.
  flying: false,
  flyFrom: 0,
  // segundos que lleva muerto: la partida no corta de golpe, el mundo frena
  dead: 0,

  // CASCO REFORZADO. Vive aqui y no en el store porque lo consulta el propio
  // choque, que llega desde tres sitios distintos (una pieza, un camion, el
  // agua) y en mitad de un useFrame. `invuln` son los segundos de gracia
  // despues de partirse: sin ellos, la pieza contra la que se choco seguia ahi
  // y cobraba el casco y la vida en dos cuadros seguidos.
  shield: false,
  invuln: 0,

  // Marca a batir, en metros, leida del equipo al empezar la carrera. Se
  // congela al arrancar para que la raya pintada en la pista no se mueva bajo
  // los pies del corredor al superarla.
  record: 0,
  recordHecho: false,

  reset() {
    this.targetLane = 1
    this.x = 0
    this.y = 0
    this.vy = 0
    this.jumpBuf = 0
    this.slideBuf = 0
    this.deck = 0
    this.slide = 0
    this.slideCd = 0
    this.speed = BASE_SPEED
    this.elapsed = 0
    this.distance = SKIP
    this.shake = 0
    this.stagger = 0
    this.wet = false
    this.flying = false
    this.flyFrom = 0
    this.dead = 0
    this.shield = false
    this.invuln = 0
    this.recordHecho = false
    scroll.s = SKIP
  },
}

// En depuracion el estado vivo queda a mano desde la consola: es lo unico con
// lo que se puede saber a que altura y en que carril va el corredor desde una
// prueba sin pantalla.
if (DEBUG) window.__rt = runtime

// Metros recorridos del curso. Fichas, obstaculos y porticos viven en
// coordenadas de mundo fijas y se acercan restando esto, asi que tiene que ser
// un unico valor: si cada uno integrara su propio dt acabarian desfasados.
// Lo avanza Game.Loop, que corre siempre (tambien en intro y gameover).
export const scroll = { s: 0 }

// Velocidad de desplazamiento del mundo segun la fase: en intro y gameover
// el escenario sigue avanzando lento como fondo vivo del stand. En 'crashed'
// la manda el propio frenado del choque, que la va bajando a cero.
export function scrollSpeed(phase) {
  if (phase === 'playing' || phase === 'crashed') return runtime.speed
  if (phase === 'intro' || phase === 'gameover') return BASE_SPEED * 0.35
  return 0
}
