import { difficultyForRow } from '../data/balance';
import { registraSonda } from '../debug/debug';
import { runtime } from '../store/runtime';
import { useGameStore } from '../store/useGameStore';
import type { ZoneTheme } from '../world/rows';
import { sharedContext } from './sfx';

/**
 * MÚSICA DEL JUEGO — sintetizada, sin un solo archivo de audio.
 *
 * POR QUÉ NO ES UN MP3. Los efectos de sonido ya se sintetizan enteros
 * (`sfx.ts`) por una razón que vale igual para la música: el stand tiene que
 * funcionar sin red. Y hay una segunda, más reciente: el paquete pesa metro y
 * medio y acabamos de arreglar que no cargaba en teléfonos flojos — meterle dos
 * o tres megas de pista deshace parte de ese arreglo justo donde más duele.
 * Esto ocupa unos cuantos kilobytes de código.
 *
 * Y hay una tercera razón, que es la buena: sintetizada, la música puede SABER
 * lo que está pasando. No es un bucle que suena por debajo — cambia de color al
 * entrar en cada terminal, aprieta con la dificultad y se aparta cuando el
 * jugador se muere. Eso con una pista grabada solo se consigue cruzando de
 * fundido entre cinco archivos.
 *
 * CÓMO SE MANTIENE A TIEMPO. No se apoya en el bucle de dibujo: si el ritmo
 * dependiera de los fotogramas, un tirón se oiría. Se usa el reparto clásico de
 * WebAudio — un temporizador basto (`INTERVALO_PLAN`) que mira por delante y va
 * dejando las notas AGENDADAS en el reloj del audio, que es de precisión de
 * muestra y corre en otro hilo. El temporizador puede llegar tarde y la música
 * no se entera.
 */

/* ------------------------------------------------------------- el planificador */

/** Cada cuánto se despierta el planificador (ms) */
const INTERVALO_PLAN = 25;
/** Cuánto se agenda por delante (s). Tiene que cubrir de sobra el intervalo de
 *  arriba para que un temporizador que llegue tarde no deje un hueco. */
const HORIZONTE = 0.12;

/* --------------------------------------------------------------- las terminales */

/**
 * UNA PALETA POR TERMINAL. Todas comparten la misma tónica (re) y cambian de
 * MODO, no de tono: así el cambio se nota —cambia el color— pero nunca chirría,
 * que es lo que pasaría si cada terminal fuese a su aire y la transición
 * cayera en mitad de un compás.
 *
 * Los grados van en semitonos desde la tónica. Cada terminal suena a lo que es:
 */
interface Paleta {
  /** Grados de la escala, en semitonos sobre la tónica */
  escala: number[];
  /** Timbre del arpegio */
  arpegio: OscillatorType;
  /** Timbre del bajo */
  bajo: OscillatorType;
  /** Cuánto pesa la percusión (0 = nada) */
  percusion: number;
  /** Desplazamiento de la tónica del bajo, en semitonos */
  transporte: number;
}

export const PALETAS: Record<ZoneTheme, Paleta> = {
  // TEC, contenedores: la terminal de casa. Pentatónica menor, cuadrada y
  // motora — es el sonido de referencia contra el que suenan las otras cuatro.
  port: { escala: [0, 3, 5, 7, 10], arpegio: 'square', bajo: 'sawtooth', percusion: 1, transporte: 0 },
  // TUM, universal: aquí el SUELO SE MUEVE. Modo dórico, que es el menor con la
  // sexta subida: suena inestable sin llegar a sonar mal, como ir sobre una
  // banda transportadora.
  multi: { escala: [0, 2, 3, 5, 7, 9, 10], arpegio: 'triangle', bajo: 'sawtooth', percusion: 0.85, transporte: 0 },
  // ECV, cruceros: se acaba el suelo y se abre el mar. Pentatónica MAYOR y
  // triángulos: lo único luminoso de las cinco, y casi sin percusión — el
  // hueco que deja es justo lo que hace que se sienta abierto.
  cruise: { escala: [0, 2, 4, 7, 9], arpegio: 'triangle', bajo: 'triangle', percusion: 0.35, transporte: 0 },
  // TNG, astillero: acero y diques. Frigio (segunda bemol), que es el modo más
  // oscuro que se puede usar sin salirse de tono, y el bajo una octava abajo.
  shipyard: { escala: [0, 1, 3, 5, 7, 8, 10], arpegio: 'sawtooth', bajo: 'sawtooth', percusion: 1.15, transporte: -12 },
  // TILH, intermodal: trenes. Menor natural y percusión seca y marcada — es la
  // terminal donde el ritmo ES la mecánica (el semáforo se lee a tiempo).
  rail: { escala: [0, 2, 3, 5, 7, 8, 10], arpegio: 'square', bajo: 'square', percusion: 1.25, transporte: 0 },
};

/** Re2 — la tónica de todo. Grave a propósito: el juego es un puerto de noche. */
const TONICA = 73.42;

/** Frecuencia de un grado de la escala, en la octava que se pida */
function nota(paleta: Paleta, grado: number, octava: number): number {
  const n = paleta.escala.length;
  // Los grados por encima de la escala siguen subiendo por octavas en vez de
  // quedarse dando vueltas en la misma: es lo que deja que el arpegio suba.
  const vuelta = Math.floor(grado / n);
  const semitonos = paleta.escala[((grado % n) + n) % n] + 12 * (octava + vuelta);
  return TONICA * Math.pow(2, semitonos / 12);
}

/* -------------------------------------------------------------------- el estado */

let bus: GainNode | null = null;
let temporizador: ReturnType<typeof setInterval> | null = null;
/** Momento (en el reloj del audio) del siguiente paso de la rejilla */
let siguientePaso = 0;
/** Contador de pasos de semicorchea desde que arrancó */
let paso = 0;
/** Notas agendadas — lo leen las pruebas para saber que de verdad suena algo */
let notasAgendadas = 0;
let silenciada = leerSilenciada();

/** Preferencia de sonido, recordada entre partidas. En un stand la máquina se
 *  queda encendida todo el día: si alguien lo silencia, tiene que seguir
 *  silenciado en la siguiente partida sin volver a tocar nada. */
function leerSilenciada(): boolean {
  try {
    return localStorage.getItem('pq:musica') === 'off';
  } catch {
    return false; // navegador con el almacenamiento capado: que suene
  }
}

export function musicaSilenciada(): boolean {
  return silenciada;
}

export function alternarMusica(): boolean {
  silenciada = !silenciada;
  try {
    localStorage.setItem('pq:musica', silenciada ? 'off' : 'on');
  } catch {
    // sin almacenamiento la preferencia dura lo que dure la pestaña, y ya está
  }
  return silenciada;
}

/**
 * Estado interno, para `scripts/music-test.ts`. La música no se puede
 * comprobar oyéndola desde un script, así que se comprueba por sus efectos:
 * cuántas notas se han agendado (¿suena?), a qué volumen está el bus (¿se
 * aparta al morir?) y si está silenciada.
 */
export function estadoMusica() {
  return { notas: notasAgendadas, volumen: bus ? bus.gain.value : 0, silenciada, sonando: !!temporizador };
}
registraSonda('notasSonadas', () => notasAgendadas);
registraSonda('volumenMusica', () => (bus ? bus.gain.value : 0));

// Acceso directo para `scripts/music-test.ts`. Va aparte del puente de
// depuración (`__DH`) a propósito: ese solo existe con `?debug`, y una de las
// cosas que hay que comprobar es que la música NO suena antes del primer gesto
// del usuario — o sea, en una carga limpia, sin banderas.
if (typeof window !== 'undefined') {
  (window as unknown as { __PQ_MUSICA?: () => unknown }).__PQ_MUSICA = estadoMusica;
}

/* --------------------------------------------------------------------- las voces */

/** Una nota con envolvente. Es el ladrillo del que están hechas las cuatro voces. */
function voz(
  audio: AudioContext,
  destino: AudioNode,
  t0: number,
  freq: number,
  dur: number,
  tipo: OscillatorType,
  volumen: number,
  ataque = 0.008,
) {
  const osc = audio.createOscillator();
  const amp = audio.createGain();
  osc.type = tipo;
  osc.frequency.setValueAtTime(freq, t0);
  amp.gain.setValueAtTime(0.0001, t0);
  amp.gain.linearRampToValueAtTime(volumen, t0 + ataque);
  amp.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(amp).connect(destino);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
  notasAgendadas++;
}

/** Percusión: el bombo es un seno que se desploma, el charles ruido filtrado */
function golpe(audio: AudioContext, destino: AudioNode, t0: number, volumen: number) {
  const osc = audio.createOscillator();
  const amp = audio.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(120, t0);
  osc.frequency.exponentialRampToValueAtTime(45, t0 + 0.11);
  amp.gain.setValueAtTime(volumen, t0);
  amp.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.16);
  osc.connect(amp).connect(destino);
  osc.start(t0);
  osc.stop(t0 + 0.2);
  notasAgendadas++;
}

let bufferRuido: AudioBuffer | null = null;

function charles(audio: AudioContext, destino: AudioNode, t0: number, volumen: number) {
  // El ruido se genera UNA vez y se reutiliza: rellenar medio segundo de
  // aleatorios en cada semicorchea sí se notaría en el hilo principal.
  if (!bufferRuido) {
    const n = Math.floor(audio.sampleRate * 0.2);
    bufferRuido = audio.createBuffer(1, n, audio.sampleRate);
    const d = bufferRuido.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
  }
  const src = audio.createBufferSource();
  src.buffer = bufferRuido;
  const filtro = audio.createBiquadFilter();
  filtro.type = 'highpass';
  filtro.frequency.value = 6500;
  const amp = audio.createGain();
  amp.gain.setValueAtTime(volumen, t0);
  amp.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.05);
  src.connect(filtro).connect(amp).connect(destino);
  src.start(t0);
  src.stop(t0 + 0.08);
  notasAgendadas++;
}

/* ------------------------------------------------------------------ la partitura */

/** Qué le pide el juego a la música ahora mismo */
function situacion() {
  const s = useGameStore.getState();
  const jugando = s.phase === 'playing';
  const paleta = PALETAS[s.currentUnit] ?? PALETAS.port;
  // La dificultad ya está normalizada de 0 a 1 y es exactamente la curva con la
  // que el juego aprieta: reutilizarla es lo que hace que la música y la
  // partida suban a la vez en vez de cada una por su cuenta.
  const tension = jugando ? difficultyForRow(s.currentRow) : 0;
  return { jugando, paleta, tension, muriendo: runtime.dying > 0 };
}

/** Agenda todo lo que suena en un paso de semicorchea */
function agendaPaso(audio: AudioContext, destino: AudioNode, t: number, n: number) {
  const { jugando, paleta, tension, muriendo } = situacion();

  // EN EL REMATE DE MUERTE solo queda el colchón: el silencio repentino de la
  // percusión es lo que hace que el golpe se oiga como un final y no como un
  // tropiezo (ver `world/death.ts`).
  const enMenu = !jugando;
  const percusion = muriendo ? 0 : paleta.percusion * (enMenu ? 0 : 1);

  const compas = Math.floor(n / 16) % 4;
  const enCompas = n % 16;

  /* COLCHÓN — dos triángulos desafinados por quintas, sosteniendo el acorde del
     compás. Es la cama de "puerto de noche" y suena siempre, también en el
     menú: es lo que hace que la portada no esté muda. */
  if (enCompas === 0) {
    const raiz = [0, 5, 3, 4][compas]; // un giro sencillo que no cansa
    const dur = 16 * duracionPaso(tension);
    voz(audio, destino, t, nota(paleta, raiz, 1), dur, 'triangle', 0.032, 0.4);
    voz(audio, destino, t, nota(paleta, raiz + 2, 1) * 1.004, dur, 'triangle', 0.026, 0.5);
  }

  /* PORTADA Y BRIEFING. Aquí no hay partida que acompañar, así que no entran ni
     bajo ni percusión — pero el colchón SOLO deja la portada prácticamente
     muda: un acorde cada tres segundos no se lee como «música tranquila», se
     lee como que el sonido está roto. Medido: dos notas en el primer segundo y
     medio.

     Se le añade una campana suelta a mitad de compás, muy floja y dos octavas
     arriba. Es lo mínimo que hace falta para que se entienda que hay música
     sonando y que el juego no se ha quedado colgado, y lo bastante espaciado
     para que aguante las ocho horas que dura un día de stand. */
  if (enMenu) {
    if (enCompas === 6 || enCompas === 11) {
      const grado = [0, 4, 2, 5][compas] + (enCompas === 11 ? 2 : 0);
      voz(audio, destino, t, nota(paleta, grado, 3), duracionPaso(0) * 5, 'triangle', 0.022, 0.03);
    }
    return;
  }

  /* BAJO — la raíz en los tiempos fuertes y la quinta en el 3 y medio. Es lo
     que da el pulso de marcha sin necesidad de percusión. */
  if (enCompas % 8 === 0 || enCompas === 14) {
    const raiz = [0, 5, 3, 4][compas];
    const grado = enCompas === 14 ? raiz + 4 : raiz;
    const f = nota(paleta, grado, 0) * Math.pow(2, paleta.transporte / 12);
    voz(audio, destino, t, f, duracionPaso(tension) * 6, paleta.bajo, 0.10);
  }

  /* PERCUSIÓN — el bombo marca, el charles solo aparece cuando la partida ya
     aprieta. Que la batería ENTRE a mitad de partida es información: el jugador
     nota que la cosa se ha puesto seria antes de verlo en pantalla. */
  if (percusion > 0) {
    if (enCompas % 8 === 0) golpe(audio, destino, t, 0.22 * percusion);
    if (tension > 0.28 && enCompas % 4 === 2) charles(audio, destino, t, 0.05 * percusion);
    if (tension > 0.62 && enCompas % 2 === 1) charles(audio, destino, t, 0.028 * percusion);
  }

  /* ARPEGIO — la voz que se mueve. Sube y baja por la escala, y la densidad va
     con la tensión: a media asta va en corcheas y al final en semicorcheas. */
  const denso = tension > 0.45 ? 2 : 4;
  if (!muriendo && enCompas % denso === 0) {
    const patron = [0, 2, 4, 2, 5, 4, 2, 1];
    const grado = patron[(n / denso) % patron.length] + [0, 5, 3, 4][compas];
    const octava = tension > 0.75 && enCompas % 8 === 4 ? 3 : 2;
    voz(audio, destino, t, nota(paleta, grado, octava), duracionPaso(tension) * 2.2, paleta.arpegio, 0.045);
  }
}

/** Lo que dura una semicorchea, en segundos. El tempo va de 84 a 116 con la
 *  tensión: lo justo para que se note que acelera sin que se vuelva ridículo. */
export function duracionPaso(tension: number): number {
  const bpm = 84 + tension * 32;
  return 60 / bpm / 4;
}

/* ------------------------------------------------------------------- el arranque */

/**
 * Arranca la música. Hay que llamarlo desde un GESTO del usuario: los
 * navegadores no dejan sonar nada antes, y con razón.
 *
 * Es idempotente — llamarlo otra vez no monta un segundo planificador, que
 * sonaría a la misma música tocada por dos orquestas medio compás desfasadas.
 */
export function startMusic() {
  if (temporizador) return;
  const audio = sharedContext();
  if (!audio) return;

  bus = audio.createGain();
  bus.gain.value = 0;
  bus.connect(audio.destination);

  siguientePaso = audio.currentTime + 0.1;
  paso = 0;

  temporizador = setInterval(() => {
    const a = sharedContext();
    if (!a || !bus) return;

    // VOLUMEN, suavizado. Se recalcula en cada vuelta porque depende de cosas
    // que cambian solas: el silencio manual, la fase y el remate de muerte. La
    // rampa evita el chasquido que da cambiar una ganancia de golpe.
    const { jugando, muriendo } = situacion();
    const objetivo = silenciada ? 0 : muriendo ? 0.1 : jugando ? 0.5 : 0.32;
    bus.gain.setTargetAtTime(objetivo, a.currentTime, muriendo ? 0.06 : 0.25);

    // Silenciada NO se para el planificador: se le baja el volumen. Parar y
    // rearrancar perdería la cuenta del compás y al volver entraría a
    // destiempo.
    while (siguientePaso < a.currentTime + HORIZONTE) {
      if (!silenciada) agendaPaso(a, bus, siguientePaso, paso);
      siguientePaso += duracionPaso(situacion().tension);
      paso++;
    }
  }, INTERVALO_PLAN);
}

/** Para la música y suelta el planificador. Solo hace falta al desmontar. */
export function stopMusic() {
  if (temporizador) clearInterval(temporizador);
  temporizador = null;
  if (bus) {
    const a = sharedContext();
    if (a) bus.gain.setTargetAtTime(0, a.currentTime, 0.1);
  }
}
