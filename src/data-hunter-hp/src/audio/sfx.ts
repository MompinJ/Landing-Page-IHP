/**
 * SFX 100% sintetizados con WebAudio — cero archivos binarios, funciona
 * offline en el stand. Cada sonido son osciladores con envolvente corta.
 */
let ctx: AudioContext | null = null;

function ac(): AudioContext | null {
  if (typeof AudioContext === 'undefined') return null; // entorno sin WebAudio
  if (!ctx) ctx = new AudioContext();
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

/** Llamar en el primer gesto del usuario (click de "Iniciar misión") */
export function unlockAudio() {
  ac();
}

interface ToneOpts {
  type?: OscillatorType;
  gain?: number;
  delay?: number;
  /** Glide de frecuencia hacia este valor al final de la nota */
  slideTo?: number;
}

function tone(freq: number, dur: number, opts: ToneOpts = {}) {
  const { type = 'sine', gain = 0.16, delay = 0, slideTo } = opts;
  const audio = ac();
  if (!audio) return;
  const t0 = audio.currentTime + delay;
  const osc = audio.createOscillator();
  const amp = audio.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
  amp.gain.setValueAtTime(0, t0);
  amp.gain.linearRampToValueAtTime(gain, t0 + 0.012);
  amp.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(amp).connect(audio.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.05);
}

function noise(dur: number, gain = 0.18, delay = 0) {
  const audio = ac();
  if (!audio) return;
  const t0 = audio.currentTime + delay;
  const buffer = audio.createBuffer(1, audio.sampleRate * dur, audio.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
  const src = audio.createBufferSource();
  src.buffer = buffer;
  const amp = audio.createGain();
  amp.gain.setValueAtTime(gain, t0);
  const filter = audio.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 900;
  src.connect(filter).connect(amp).connect(audio.destination);
  src.start(t0);
}

/** Recolección positiva — arpegio ascendente; sube de tono con el multiplicador */
export function playGood(multiplier: 1 | 2 | 3 = 1) {
  const base = 523.25 * (1 + (multiplier - 1) * 0.25); // C5 → más agudo con combo
  tone(base, 0.12, { type: 'triangle', gain: 0.14 });
  tone(base * 1.26, 0.12, { type: 'triangle', gain: 0.13, delay: 0.07 });
  tone(base * 1.5, 0.2, { type: 'triangle', gain: 0.12, delay: 0.14 });
}

/** Tarjeta negativa — zumbido glitch descendente */
export function playBad() {
  tone(320, 0.28, { type: 'sawtooth', gain: 0.1, slideTo: 110 });
  tone(326, 0.28, { type: 'square', gain: 0.06, slideTo: 108 });
}

/** Impacto con obstáculo — golpe grave + estallido de ruido */
export function playImpact() {
  tone(110, 0.3, { type: 'sine', gain: 0.3, slideTo: 42 });
  noise(0.22, 0.16);
}


/** Campana de paso a nivel ESPACIAL: paneo por posición del tren y volumen
 *  por distancia (audio 3D ligero sin PositionalAudio). */
export function playTrainBell(pan: number, volume: number) {
  const audio = ac();
  if (!audio) return;
  const t0 = audio.currentTime;
  const osc = audio.createOscillator();
  const amp = audio.createGain();
  const panner = audio.createStereoPanner ? audio.createStereoPanner() : null;
  osc.type = 'square';
  osc.frequency.setValueAtTime(1180, t0);
  amp.gain.setValueAtTime(0, t0);
  amp.gain.linearRampToValueAtTime(Math.min(0.12, volume), t0 + 0.005);
  amp.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.18);
  if (panner) {
    panner.pan.value = Math.max(-1, Math.min(1, pan));
    osc.connect(amp).connect(panner).connect(audio.destination);
  } else osc.connect(amp).connect(audio.destination);
  osc.start(t0);
  osc.stop(t0 + 0.25);
}
