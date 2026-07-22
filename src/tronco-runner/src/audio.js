let ctx = null

function ac() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext
    if (!AC) return null
    ctx = new AC()
  }
  if (ctx.state === 'suspended') ctx.resume()
  return ctx
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
  good() {
    tone(660, 0, 0.09, { type: 'triangle', gain: 0.16 })
    tone(990, 0.07, 0.14, { type: 'triangle', gain: 0.16 })
  },
  bad() {
    tone(220, 0, 0.22, { type: 'sawtooth', gain: 0.13, slideTo: 90 })
  },
  jump() {
    tone(330, 0, 0.12, { type: 'square', gain: 0.06, slideTo: 540 })
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
