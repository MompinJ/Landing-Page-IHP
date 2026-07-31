import { BASE_SPEED, GAME_DURATION } from './constants'

// Debug: ?skip=500 arranca la partida en el metro 500. Vive aqui y no en World
// porque tiene que mover el escenario y el curso a la vez; si solo saltara el
// escenario, los obstaculos de la zona 3 se inspeccionarian sobre el patio.
export const SKIP = Number(new URLSearchParams(window.location.search).get('skip')) || 0

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
  // altura del suelo bajo los pies: 0 en casi todo el juego, 3.2 sobre la
  // cubierta del crucero. La calcula Game.Loop con deckAt() y la suman el
  // corredor y la camara; el salto (y) sigue midiendose desde aqui.
  deck: 0,
  slide: 0, // segundos que queda de rodada
  slideCd: 0, // espera antes de poder rodar otra vez
  speed: BASE_SPEED,
  elapsed: 0,
  distance: 0,
  timeLeft: GAME_DURATION,
  shake: 0,
  stagger: 0, // segundos de tambaleo tras un choque, lo consume Player
  wet: false, // yendo por el agua en la travesia del crucero

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
    this.timeLeft = GAME_DURATION
    this.shake = 0
    this.stagger = 0
    this.wet = false
    scroll.s = SKIP
  },
}

// Con ?skip= se esta inspeccionando el curso, asi que ahi se deja el estado a
// mano desde la consola: es lo unico con lo que se puede saber a que altura y
// en que carril va el corredor en una captura headless.
if (SKIP) window.__rt = runtime

// Metros recorridos del curso. Fichas, obstaculos y porticos viven en
// coordenadas de mundo fijas y se acercan restando esto, asi que tiene que ser
// un unico valor: si cada uno integrara su propio dt acabarian desfasados.
// Lo avanza Game.Loop, que corre siempre (tambien en intro y gameover).
export const scroll = { s: 0 }

// Velocidad de desplazamiento del mundo segun la fase: en intro y gameover
// el escenario sigue avanzando lento como fondo vivo del stand.
export function scrollSpeed(phase) {
  if (phase === 'playing') return runtime.speed
  if (phase === 'intro' || phase === 'gameover') return BASE_SPEED * 0.35
  return 0
}
