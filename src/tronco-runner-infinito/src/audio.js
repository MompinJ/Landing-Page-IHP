let ctx = null

function ac() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext
    if (!AC) return null
    ctx = new AC()
  }
  // resume() solo lo concede el navegador si viene de un gesto de usuario real.
  // Pulsar un boton del mando NO cuenta como tal en ningun navegador, asi que
  // aqui se rechaza a menudo y hay que tragarse el rechazo: sin el catch cada
  // sonido intentado con el mando dejaba una promesa sin manejar en consola.
  if (ctx.state === 'suspended') ctx.resume().catch(() => {})
  return ctx
}

// Por lo anterior, el audio se desbloquea con el primer gesto real que pase por
// la pagina, sea cual sea. En el stand basta con que quien atiende toque la
// pantalla o el teclado una vez y ya hay sonido para toda la sesion, aunque
// despues se juegue solo con mando.
if (typeof window !== 'undefined') {
  const prime = () => {
    ac()
    primeTrack()
    window.removeEventListener('pointerdown', prime)
    window.removeEventListener('keydown', prime)
  }
  window.addEventListener('pointerdown', prime)
  window.addEventListener('keydown', prime)
}

function tone(freq, delay, dur, { type = 'sine', gain = 0.14, slideTo = null } = {}) {
  const c = ac()
  if (!c) return
  const t0 = c.currentTime + delay
  const osc = c.createOscillator()
  const g = c.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(freq, t0)
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur)
  g.gain.setValueAtTime(0, t0)
  g.gain.linearRampToValueAtTime(gain, t0 + 0.012)
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur)
  osc.connect(g)
  g.connect(c.destination)
  osc.start(t0)
  osc.stop(t0 + dur + 0.05)
}

export const sfx = {
  unlock() {
    ac()
  },
  // EL TONO SUBE CON LA RACHA, y es lo mas barato que existe para que recoger
  // se sienta bien: sin mirar el marcador, el oido ya sabe que la racha esta
  // viva y cuanto lleva. Medio tono por ficha con tope de una octava; pasado
  // eso deja de ser musica y empieza a ser un pitido.
  good(paso = 0) {
    const k = Math.pow(2, Math.min(paso, 12) / 12)
    tone(660 * k, 0, 0.09, { type: 'triangle', gain: 0.16 })
    tone(990 * k, 0.07, 0.14, { type: 'triangle', gain: 0.16 })
  },
  // Recoger el casco: dos notas subiendo, distintas del pitido de ficha para
  // que no se confunda con una palabra mas.
  shield() {
    tone(392, 0, 0.14, { type: 'sine', gain: 0.17 })
    tone(587, 0.1, 0.22, { type: 'sine', gain: 0.17 })
  },
  // El casco se parte: golpe seco y grave, pero SIN la caida del sonido de
  // choque -- lo que tiene que comunicar es "te salvaste", no "se acabo".
  shieldBreak() {
    tone(300, 0, 0.1, { type: 'square', gain: 0.16 })
    tone(200, 0.06, 0.18, { type: 'square', gain: 0.12 })
  },
  // GOLPE METALICO AL PISAR LA RAMPA DEL CAMION.
  //
  // Subirse era, hasta ahora, mudo: el suelo cambiaba de altura y ya. Y es el
  // momento en el que el jugador toma la decision que distingue a este juego,
  // asi que tiene que sonar a lo que es -- una plancha de acero bajo unas botas
  // -- y no a un pitido mas. El golpe grave es el pisoton y las dos notas
  // agudas que caen son el retumbe de la chapa: sin ellas queda un "toc" de
  // madera, con ellas suena a rampa de camion.
  rampa() {
    tone(150, 0, 0.1, { type: 'square', gain: 0.13 })
    tone(1180, 0.012, 0.26, { type: 'triangle', gain: 0.07, slideTo: 720 })
    tone(1610, 0.028, 0.19, { type: 'triangle', gain: 0.045, slideTo: 1040 })
  },
  // Record batido: fanfarria corta, la unica que suena en mitad de la carrera.
  record() {
    tone(784, 0, 0.12, { type: 'triangle', gain: 0.18 })
    tone(988, 0.1, 0.12, { type: 'triangle', gain: 0.18 })
    tone(1319, 0.2, 0.3, { type: 'triangle', gain: 0.2 })
  },
  bad() {
    tone(220, 0, 0.22, { type: 'sawtooth', gain: 0.13, slideTo: 90 })
  },
  jump() {
    tone(330, 0, 0.12, { type: 'square', gain: 0.06, slideTo: 540 })
  },
  slide() {
    tone(520, 0, 0.18, { type: 'square', gain: 0.05, slideTo: 150 })
  },
  count() {
    tone(440, 0, 0.12, { type: 'triangle', gain: 0.15 })
  },
  go() {
    tone(660, 0, 0.25, { type: 'triangle', gain: 0.18 })
    tone(880, 0.1, 0.3, { type: 'triangle', gain: 0.15 })
  },
  end() {
    tone(523, 0, 0.16, { type: 'triangle', gain: 0.16 })
    tone(659, 0.14, 0.16, { type: 'triangle', gain: 0.16 })
    tone(784, 0.28, 0.16, { type: 'triangle', gain: 0.16 })
    tone(1047, 0.42, 0.4, { type: 'triangle', gain: 0.18 })
  },
}

// --- Musica de fondo -------------------------------------------------------
// La cancion dura 2:17 y la carrera 2:00, asi que arranca con la cuenta atras y
// se deja terminar sola: sigue sonando encima del marcador final y solo se
// rebobina cuando alguien lanza otra cuenta atras.
const TRACK_SRC = './audio/musica.mp3'
let track = null

function trackEl() {
  if (typeof Audio === 'undefined') return null
  if (!track) {
    track = new Audio(TRACK_SRC)
    track.preload = 'auto'
    // Debajo de los efectos: el pitido de recoger o chocar tiene que oirse por
    // encima de la cancion en un stand con ruido alrededor.
    track.volume = 0.42
  }
  return track
}

// Un archivo de audio solo se puede arrancar desde un gesto real, y la carrera
// se lanza a menudo con el mando, que no cuenta como tal. Asi que en el primer
// gesto que pase por la pagina se reproduce en mudo y se para al instante: eso
// deja el elemento "desbloqueado" y ya se le puede dar al play mas tarde por
// codigo, con sonido y sin gesto.
let wanted = false

function primeTrack() {
  const el = trackEl()
  if (!el) return
  el.muted = true
  const p = el.play()
  // El play() del desbloqueo devuelve una promesa que puede resolverse DESPUES
  // de que la carrera haya arrancado la cancion de verdad: si el primer gesto
  // de la pagina es el propio clic de "A CORRER", el pointerdown desbloquea y
  // el click lanza la cuenta atras en el mismo gesto. Por eso se comprueba
  // 'wanted' antes de parar: sin ello, el desbloqueo silenciaba la carrera.
  const settle = () => {
    if (wanted) return
    el.pause()
    el.currentTime = 0
    el.muted = false
  }
  if (p && p.then) p.then(settle).catch(() => { if (!wanted) el.muted = false })
  else settle()
}

export const music = {
  // Siempre desde el principio: cada carrera estrena cancion.
  start() {
    const el = trackEl()
    if (!el) return
    wanted = true
    el.muted = false
    el.currentTime = 0
    el.play().catch(() => {})
  },
  stop() {
    wanted = false
    if (!track) return
    track.pause()
    track.currentTime = 0
  },
}
