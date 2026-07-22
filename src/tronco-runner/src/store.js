import { create } from 'zustand'
import { GAME_DURATION } from './constants'
import { runtime } from './runtime'

export const useGame = create((set, get) => ({
  phase: 'intro', // intro | countdown | playing | paused | gameover
  score: 0,
  timeShown: GAME_DURATION,
  distShown: 0,
  goods: 0,
  bads: 0,
  lastEvent: null,

  startCountdown: () => {
    runtime.reset()
    set({
      phase: 'countdown',
      score: 0,
      timeShown: GAME_DURATION,
      distShown: 0,
      goods: 0,
      bads: 0,
      lastEvent: null,
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

  syncHud: (time, dist) => {
    const s = get()
    if (s.timeShown !== time || s.distShown !== dist) set({ timeShown: time, distShown: dist })
  },

  collect: (label) =>
    set((s) => ({
      score: s.score + 10,
      goods: s.goods + 1,
      lastEvent: { type: 'good', label, id: s.goods + s.bads + 1 },
    })),
  hit: (label) =>
    set((s) => ({
      score: s.score - 10,
      bads: s.bads + 1,
      lastEvent: { type: 'bad', label, id: s.goods + s.bads + 1 },
    })),
}))
