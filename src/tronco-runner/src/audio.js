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
