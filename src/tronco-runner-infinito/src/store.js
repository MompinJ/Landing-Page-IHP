import { create } from 'zustand'
import { RECORD_BONUS, RECORD_KEY, SHIELD_INVULN, STREAK_X2, STREAK_X3 } from './constants'
import { runtime, DEBUG } from './runtime'
import { resetCourse } from './course'
import { music, sfx } from './audio'

// Marca a batir. Vive en el equipo del stand, que es donde tiene sentido: la
// gracia es "supera al que jugo antes que tu en esta maquina".
export function leeRecord() {
  try {
    return Number(localStorage.getItem(RECORD_KEY)) || 0
  } catch {
    return 0
  }
}

function guardaRecord(metros) {
  try {
    if (metros > leeRecord()) localStorage.setItem(RECORD_KEY, String(Math.floor(metros)))
  } catch {
    // en modo privado no se puede escribir; el juego sigue igual
  }
}

// Multiplicador de racha. Es una funcion y no un contador aparte para que no
// puedan desincronizarse: la racha es el unico dato, el multiplicador se deduce.
function multDe(racha) {
  if (racha >= STREAK_X3) return 3
  if (racha >= STREAK_X2) return 2
  return 1
}

// UNA SOLA VIDA.
//
// Es la regla que sostiene todo lo demas de este juego. Sin reloj no hay final,
// asi que el final tiene que ponerlo el corredor: se corre hasta el primer
// golpe. Por eso chocar ya no resta quince puntos como en el Terminal Rally por
// tiempo -- restar no significa nada cuando la carrera se acaba ahi mismo -- y
// por eso las fichas rojas SI siguen restando sin matar: son el castigo que
// tiene sentido cuando queda partida por delante.
//
// El golpe no corta a negro de golpe: pasa por la fase 'crashed', donde el
// mundo frena hasta pararse y se ve lo que paso. Cortar en el fotograma del
// impacto deja al jugador sin saber contra que choco, y en un stand eso es lo
// primero que pregunta.

export const useGame = create((set, get) => ({
  phase: 'intro', // intro | countdown | playing | crashed | paused | gameover
  score: 0,
  distShown: 0,
  goods: 0,
  bads: 0,
  bonuses: 0,
  lastEvent: null,
  zone: 0,
  // contra que se acabo la carrera: sale en la pantalla final
  causa: null,
  // racha viva, la mejor de la carrera y el multiplicador que sale de la viva
  racha: 0,
  mejorRacha: 0,
  mult: 1,
  // casco reforzado en la mochila (espejo de runtime.shield para que lo pinte
  // el HUD; quien decide sigue siendo runtime, que es quien lo consulta en
  // mitad de un choque)
  escudo: false,
  // metros a batir y si ya se batieron: lo lee el cartel de la pista
  record: 0,
  recordHecho: false,

  startCountdown: () => {
    runtime.reset()
    // La cancion acompana toda la carrera y se la deja acabar sola despues; si
    // alguien vuelve a lanzar la cuenta atras antes de tiempo, empieza de cero.
    music.start()
    // CURSO NUEVO EN CADA PARTIDA. Va ANTES del set: al entrar en 'countdown'
    // los obstaculos y las fichas remontan su ventana y ahi ya leen la lista.
    resetCourse()
    // La marca a batir se congela al arrancar: si se releyera cada cuadro, al
    // superarla la raya pintada en la pista se moveria bajo los pies.
    const record = leeRecord()
    runtime.record = record
    set({
      phase: 'countdown',
      score: 0,
      distShown: 0,
      goods: 0,
      bads: 0,
      bonuses: 0,
      lastEvent: null,
      zone: 0,
      causa: null,
      racha: 0,
      mejorRacha: 0,
      mult: 1,
      escudo: false,
      record,
      recordHecho: false,
    })
  },
  play: () => set({ phase: 'playing' }),
  pause: () => {
    if (get().phase === 'playing') set({ phase: 'paused' })
  },
  resume: () => {
    if (get().phase === 'paused') set({ phase: 'playing' })
  },
  end: () => set({ phase: 'gameover' }),
  goIntro: () => set({ phase: 'intro' }),

  // se llama cada frame; solo escribe cuando de verdad se cruzo un limite
  setZone: (zone) => {
    if (get().zone !== zone) set({ zone })
  },

  syncHud: (dist) => {
    if (get().distShown !== dist) set({ distShown: dist })
  },

  collect: (label) =>
    set((s) => {
      const racha = s.racha + 1
      const mult = multDe(racha)
      return {
        score: s.score + 10 * mult,
        goods: s.goods + 1,
        racha,
        mejorRacha: Math.max(s.mejorRacha, racha),
        mult,
        lastEvent: { type: 'good', label, delta: 10 * mult, mult, id: s.goods + s.bads + s.bonuses + 1 },
      }
    }),
  // La roja rompe la racha ademas de restar. Es lo que convierte "no tocarla"
  // en una decision con peso: a x3 una roja no cuesta diez puntos, cuesta el x3.
  hit: (label) =>
    set((s) => ({
      score: s.score - 10,
      bads: s.bads + 1,
      racha: 0,
      mult: 1,
      lastEvent: { type: 'bad', label, delta: -10, id: s.goods + s.bads + s.bonuses + 1 },
    })),

  // Casco reforzado recogido. El estado que manda es runtime.shield (lo
  // consulta el choque); esto es su reflejo para el HUD.
  tomaEscudo: () => {
    runtime.shield = true
    set({ escudo: true })
  },

  // Record batido en mitad de la carrera. No termina nada ni cambia de fase:
  // suena, paga bono y deja el cartel puesto un momento.
  bateRecord: () =>
    set((s) => {
      if (s.recordHecho) return s
      sfx.record()
      return {
        recordHecho: true,
        score: s.score + RECORD_BONUS,
        bonuses: s.bonuses + 1,
        lastEvent: {
          type: 'good',
          label: 'RÉCORD PERSONAL',
          delta: RECORD_BONUS,
          id: s.goods + s.bads + s.bonuses + 1,
        },
      }
    }),
  // Premio sin objeto en pantalla: completar una cadena de andamios o un convoy
  // de camiones enteros. No cuenta como valor recogido, solo suma y avisa.
  bonus: (label, delta) =>
    set((s) => ({
      score: s.score + delta,
      bonuses: s.bonuses + 1,
      lastEvent: { type: 'good', label, delta, id: s.goods + s.bads + s.bonuses + 1 },
    })),

  // Fin de la carrera. Solo cuenta el primero: durante el frenado la pieza que
  // te golpeo sigue viva y podria volver a cantar el choque.
  //
  // AQUI SE GASTA EL CASCO, y tiene que ser aqui: el choque llega desde tres
  // sitios distintos -- una pieza de pista, el costado de un camion y el agua
  // de la travesia -- y si cada uno mirara el escudo por su cuenta, tarde o
  // temprano uno se olvidaria y ese seria el que mata con el casco puesto.
  crash: (label) => {
    if (get().phase !== 'playing' || runtime.invuln > 0) return
    if (runtime.shield) {
      runtime.shield = false
      runtime.invuln = SHIELD_INVULN
      runtime.shake = 0.6
      runtime.stagger = 0.5
      sfx.shieldBreak()
      set((s) => ({
        escudo: false,
        racha: 0,
        mult: 1,
        lastEvent: { type: 'bad', label: `CASCO ROTO · ${label}`, delta: 0, id: s.goods + s.bads + s.bonuses + 1 },
      }))
      return
    }
    runtime.dead = 0
    guardaRecord(runtime.distance)
    set((s) => ({
      phase: 'crashed',
      causa: label,
      lastEvent: { type: 'bad', label, delta: 0, id: s.goods + s.bads + s.bonuses + 1 },
    }))
  },
}))

// Mismo criterio que window.__rt: en depuracion, sin el store a mano no hay
// forma de saber desde una prueba sin pantalla que golpeo al corredor ni en que
// metro paso.
if (DEBUG) window.__game = useGame
