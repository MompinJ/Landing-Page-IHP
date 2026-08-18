import { create } from 'zustand'
import { GAME_DURATION, OBSTACLE_PENALTY } from './constants'
import { runtime, SKIP } from './runtime'
import { assignLabels } from './course'

export const useGame = create((set, get) => ({
  phase: 'intro', // intro | countdown | playing | paused | gameover
  score: 0,
  timeShown: GAME_DURATION,
  distShown: 0,
  goods: 0,
  bads: 0,
  crashes: 0,
  bonuses: 0,
  lastEvent: null,
  zone: 0,

  startCountdown: () => {
    runtime.reset()
    // Palabras nuevas en cada carrera. Va ANTES del set: al entrar en
    // 'countdown' Items remonta todos los hexagonos y ahi lee la etiqueta.
    assignLabels()
    set({
      phase: 'countdown',
      score: 0,
      timeShown: GAME_DURATION,
      distShown: 0,
      goods: 0,
      bads: 0,
      crashes: 0,
      bonuses: 0,
      lastEvent: null,
      zone: 0,
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

  syncHud: (time, dist) => {
    const s = get()
    if (s.timeShown !== time || s.distShown !== dist) set({ timeShown: time, distShown: dist })
  },

  collect: (label) =>
    set((s) => ({
      score: s.score + 10,
      goods: s.goods + 1,
      lastEvent: { type: 'good', label, delta: 10, id: s.goods + s.bads + s.crashes + s.bonuses + 1 },
    })),
  hit: (label) =>
    set((s) => ({
      score: s.score - 10,
      bads: s.bads + 1,
      lastEvent: { type: 'bad', label, delta: -10, id: s.goods + s.bads + s.crashes + s.bonuses + 1 },
    })),
  // Premio sin objeto en pantalla: lo usa el bono por completar una cadena de
  // andamios. No cuenta como valor recogido, solo suma y saca el mensaje.
  bonus: (label, delta) =>
    set((s) => ({
      score: s.score + delta,
      bonuses: s.bonuses + 1,
      lastEvent: { type: 'good', label, delta, id: s.goods + s.bads + s.crashes + s.bonuses + 1 },
    })),
  crash: (label) =>
    set((s) => ({
      score: s.score - OBSTACLE_PENALTY,
      crashes: s.crashes + 1,
      lastEvent: { type: 'bad', label, delta: -OBSTACLE_PENALTY, id: s.goods + s.bads + s.crashes + s.bonuses + 1 },
    })),
}))

// Mismo criterio que window.__rt: con ?skip= se esta depurando el curso, y sin
// el store a mano no hay forma de saber desde una prueba headless que golpeo al
// corredor ni en que metro.
if (SKIP) window.__game = useGame
