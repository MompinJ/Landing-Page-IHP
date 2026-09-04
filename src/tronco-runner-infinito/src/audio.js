import { runtime } from './runtime'
import { BASE_SPEED, MAX_SPEED } from './constants'

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

/* --- Musica de fondo -------------------------------------------------------

  LA MUSICA SE TOCA, NO SE REPRODUCE.

  Aqui habia un mp3 de tres megas y tenia dos problemas. El de fondo: era una
  cancion ajena, y esto se proyecta en el stand de un congreso. Y el de forma:
  duraba 2:17 porque venia del Terminal Rally POR TIEMPO, donde la carrera
  duraba 2:00 exactas y la cancion se acababa justo con ella. Este juego no
  tiene final, asi que cualquier carrera decente pasaba de largo el final de la
  cancion y seguia en silencio -- precisamente en los metros donde mas tension
  hay, que son los ultimos.

  Se sintetiza con los mismos osciladores que los efectos: no se acaba nunca,
  no pesa un byte y no es de nadie. Y ademas hace lo que un archivo no puede,
  que es CRECER CON LA CARRERA: las capas entran segun la velocidad, y en este
  juego la velocidad es la unica medida de lo lejos que has llegado. En la
  portada suena un bajo y poco mas; a 29 m/s suena entera. Al chocar, el mundo
  frena y la musica se deshace con el, porque lee la misma velocidad.
*/

const BPM = 126
const NEGRA = 60 / BPM
const PASO = NEGRA / 4 // semicorchea: la rejilla de todo lo que suena aqui
// Segundos que se programan por delante del reloj. Cuanto mas, mas aguanta un
// temporizador que llegue tarde sin que se oiga un hueco -- y llegan tarde: el
// navegador compila un shader, pasa el recolector de basura, la pestaña se
// esconde. Medio segundo cubre de sobra esos tirones, y lo unico que cuesta es
// que la musica tarde ese medio segundo en enterarse de que se va mas rapido,
// que sobre una rampa de velocidad de 2800 m no lo nota nadie.
const HORIZONTE = 0.5

// VOLUMEN por debajo de los efectos: el pitido de recoger o el golpe de chocar
// tienen que oirse por encima de la musica en un stand con ruido alrededor. Por
// eso ademas los efectos van directos a la salida y la musica pasa por su bus.
const VOLUMEN = 0.5

// Dm - Bb - F - C. Cuatro acordes que giran sin resolver nunca, que es lo que
// tiene que hacer la musica de algo que no se acaba: una cadencia que cerrara
// pediria un final, y aqui no hay ninguno.
const D2 = 73.416
const PROGRESION = [
  { raiz: 0, triada: [0, 3, 7] }, // Dm
  { raiz: -4, triada: [0, 4, 7] }, // Bb
  { raiz: 3, triada: [0, 4, 7] }, // F
  { raiz: -2, triada: [0, 4, 7] }, // C
]

const hz = (semis) => D2 * Math.pow(2, semis / 12)

let bus = null
function musicaBus() {
  const c = ac()
  if (!c) return null
  if (!bus) {
    bus = c.createGain()
    bus.gain.value = 0 // entra con una rampa en music.start
    bus.connect(c.destination)
  }
  return bus
}

// Ruido blanco para el charles. Se genera una vez y se reaprovecha: son cuatro
// decimas de muestra y de ahi salen todos los golpes de la partida.
let ruido = null
function bufferRuido(c) {
  if (!ruido) {
    ruido = c.createBuffer(1, Math.floor(c.sampleRate * 0.4), c.sampleRate)
    const d = ruido.getChannelData(0)
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1
  }
  return ruido
}

// Una nota de la musica. Como `tone`, pero con filtro y al bus de musica.
function nota(t0, freq, dur, { type = 'sawtooth', gain = 0.1, corte = 0, q = 1 } = {}) {
  const c = ac()
  const b = musicaBus()
  if (!c || !b) return
  const osc = c.createOscillator()
  const g = c.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(freq, t0)
  g.gain.setValueAtTime(0, t0)
  g.gain.linearRampToValueAtTime(gain, t0 + 0.01)
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur)
  osc.connect(g)
  if (corte) {
    const f = c.createBiquadFilter()
    f.type = 'lowpass'
    f.frequency.setValueAtTime(corte, t0)
    f.Q.value = q
    g.connect(f)
    f.connect(b)
  } else {
    g.connect(b)
  }
  osc.start(t0)
  osc.stop(t0 + dur + 0.05)
}

// Bombo: una sinusoide que se desploma. Es lo unico de la musica sin altura
// reconocible, y por eso es lo que puede marcar el paso sin chocar con nada.
function bombo(t0) {
  const c = ac()
  const b = musicaBus()
  if (!c || !b) return
  const osc = c.createOscillator()
  const g = c.createGain()
  osc.type = 'sine'
  osc.frequency.setValueAtTime(125, t0)
  osc.frequency.exponentialRampToValueAtTime(44, t0 + 0.11)
  g.gain.setValueAtTime(0.34, t0)
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.24)
  osc.connect(g)
  g.connect(b)
  osc.start(t0)
  osc.stop(t0 + 0.3)
}

function charles(t0, gain) {
  const c = ac()
  const b = musicaBus()
  if (!c || !b) return
  const src = c.createBufferSource()
  src.buffer = bufferRuido(c)
  src.playbackRate.value = 1.7
  const f = c.createBiquadFilter()
  f.type = 'highpass'
  f.frequency.value = 7200
  const g = c.createGain()
  g.gain.setValueAtTime(gain, t0)
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.045)
  src.connect(f)
  f.connect(g)
  g.connect(b)
  src.start(t0, 0, 0.08)
}

// Cuanto de la musica suena: 0 en la portada y con la carrera frenada, 1 a la
// velocidad maxima. Se lee de runtime y no del store a proposito -- el store
// importa este modulo, y pedirselo de vuelta seria un ciclo.
function intensidad() {
  const k = (runtime.speed - BASE_SPEED) / (MAX_SPEED - BASE_SPEED)
  return Math.max(0, Math.min(1, k))
}

// Que suena en la semicorchea n. Cada capa mira la intensidad y decide si le
// toca: asi la cancion se construye sola segun se corre, sin transiciones que
// programar ni secciones que encajar.
function programa(t, n) {
  const k = intensidad()
  const acorde = PROGRESION[Math.floor(n / 16) % PROGRESION.length]
  const p = n % 16
  const raiz = acorde.raiz

  // BAJO: corcheas con salto de octava a mitad de compas. Es el suelo de todo y
  // suena siempre, tambien parado: es lo que mantiene el stand vivo entre
  // partida y partida. El filtro se abre con la velocidad, que es lo que hace
  // que la misma nota suene mas agresiva cuanto mas lejos se ha llegado.
  if (p % 2 === 0) {
    nota(t, hz(raiz + (p === 4 || p === 12 ? 12 : 0)), 0.24, {
      type: 'sawtooth',
      gain: 0.1,
      corte: 300 + 900 * k,
      q: 5,
    })
  }

  // BOMBO en 1 y 3, y un tercero antes del compas siguiente cuando ya se corre.
  if (p === 0 || p === 8 || (k > 0.45 && p === 14)) bombo(t)

  // CHARLES en las semicorcheas impares. Entra pronto porque es lo primero que
  // dice que esto ya no es la portada.
  if (k > 0.12 && p % 2 === 1) charles(t, 0.028 + 0.03 * k)

  // ARPEGIO de la triada. Es la capa que hace que suene a carrera.
  if (k > 0.3 && p % 2 === 0) {
    const grado = acorde.triada[[0, 1, 2, 1][(p / 2) % 4]]
    nota(t, hz(raiz + grado + 24), 0.17, { type: 'triangle', gain: 0.045 + 0.03 * k })
  }

  // ACORDE tenido, uno por compas. Entra en la ultima parte de la rampa de
  // velocidad: es lo que dice "esto ya es una carrera larga".
  if (k > 0.6 && p === 0) {
    for (const s of acorde.triada) {
      nota(t, hz(raiz + s + 12), NEGRA * 3.6, {
        type: 'sawtooth',
        gain: 0.02,
        corte: 900 + 1400 * k,
        q: 0.7,
      })
    }
  }

  // Y a tope de velocidad, la triada una octava mas arriba en blancas. Solo se
  // oye pasados los 2500 m, asi que es tambien un aviso de que se va lejos.
  if (k > 0.85 && p % 8 === 0) {
    nota(t, hz(raiz + acorde.triada[(n / 8) % 3] + 36), 0.4, { type: 'square', gain: 0.016 })
  }
}

let reloj = null
let paso = 0
let proximo = 0

// Programador con vista adelante: el temporizador de la pagina no es puntual,
// pero el reloj del audio si, asi que aqui solo se decide QUE suena y el cuando
// se le da al audio con su propio reloj. Sin esto la musica cojea en cuanto el
// navegador se pone a dibujar.
function bucle() {
  const c = ac()
  if (!c) return
  // Si el temporizador llego tarde -- la pestaña estuvo escondida, el navegador
  // se puso a compilar algo -- lo programado se habria quedado en el pasado y
  // saldria de golpe, todo amontonado en el mismo instante. Se resincroniza y se
  // pierde el trozo, que es infinitamente mejor que oirlo entero de una vez.
  if (proximo < c.currentTime) proximo = c.currentTime + 0.02
  while (proximo < c.currentTime + HORIZONTE) {
    programa(proximo, paso)
    proximo += PASO
    paso++
  }
}

export const music = {
  // Cada carrera empieza en el primer tiempo del primer acorde: la cuenta atras
  // y el compas arrancan juntos.
  start() {
    const c = ac()
    const b = musicaBus()
    if (!c || !b) return
    b.gain.cancelScheduledValues(c.currentTime)
    b.gain.setValueAtTime(b.gain.value, c.currentTime)
    b.gain.linearRampToValueAtTime(VOLUMEN, c.currentTime + 0.5)
    paso = 0
    proximo = c.currentTime + 0.06
    if (!reloj) reloj = setInterval(bucle, 25)
  },
  stop() {
    const c = ac()
    if (!c || !bus) return
    bus.gain.cancelScheduledValues(c.currentTime)
    bus.gain.setValueAtTime(bus.gain.value, c.currentTime)
    bus.gain.linearRampToValueAtTime(0, c.currentTime + 0.4)
    if (reloj) {
      clearInterval(reloj)
      reloj = null
    }
  },
}
