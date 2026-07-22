import { BASE_SPEED, GAME_DURATION } from './constants'

// Estado mutable de alta frecuencia (posiciones, velocidad) que no debe
// pasar por React: lo escriben y leen los useFrame directamente.
export const runtime = {
  targetLane: 1,
  x: 0,
  y: 0,
  vy: 0,
  jumpQueued: false,
  speed: BASE_SPEED,
  elapsed: 0,
  distance: 0,
  timeLeft: GAME_DURATION,
  shake: 0,

  reset() {
    this.targetLane = 1
    this.x = 0
    this.y = 0
    this.vy = 0
    this.jumpQueued = false
    this.speed = BASE_SPEED
    this.elapsed = 0
    this.distance = 0
    this.timeLeft = GAME_DURATION
    this.shake = 0
  },
}

// Velocidad de desplazamiento del mundo segun la fase: en intro y gameover
// el escenario sigue avanzando lento como fondo vivo del stand.
export function scrollSpeed(phase) {
  if (phase === 'playing') return runtime.speed
  if (phase === 'intro' || phase === 'gameover') return BASE_SPEED * 0.35
  return 0
}
