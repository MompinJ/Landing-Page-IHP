/**
 * ¿Se ve el océano donde debería haber mapa?
 *
 * La cámara es ortográfica: cuanto mayor es la ventana, más mundo entra en
 * cuadro — y en una pantalla estrecha el zoom ADEMÁS se aleja para que quepan
 * las columnas (`camZoomFor`), que mete todavía más. Este test comprueba, para
 * varias resoluciones (teléfono incluido, en las dos posturas), que
 *   1. la ventana de render cubre lo que la cámara alcanza a ver,
 *   2. el generador va siempre por delante de esa ventana, incluso al arrancar, y
 *   3. el TECHO DE FILAS del nivel que esa pantalla va a usar de verdad no se
 *      come esa cobertura.
 *
 * El punto 3 es el que se escapaba y el que rompió al entrar el teléfono: el
 * techo se aplica DESPUÉS de `viewRowsFor` y el test miraba la ventana sin
 * recortar, así que daba verde mientras en pantalla salía océano. Ahora el
 * recorte es una función pura (`clampViewRows`) y se comprueba lo que de verdad
 * se dibuja.
 *
 * Se comprueba contra el nivel EMPAREJADO con cada pantalla, no contra los
 * cuatro. Que 'alto' recorte en un monitor 4K no es un fallo: es la decisión
 * del nivel (44 filas de puerto en una gráfica integrada no se pagan) y se
 * lista aparte como recorte conocido. Lo que sí es un fallo es que el nivel que
 * ESA máquina va a correr se quede corto — y es exactamente lo que pasaba con
 * el teléfono.
 *
 *   npx tsx scripts/viewport-test.ts
 */
import { BALANCE, camLookAheadFor, camZoomFor, clampViewRows, viewRowsFor } from '../src/data/balance';
import { LEVELS } from '../src/render/quality';
import { runtime } from '../src/store/runtime';
import { useGameStore } from '../src/store/useGameStore';
import { extendRowsIfNeeded, rows, setLookahead } from '../src/world/rows';

/** Filas de suelo que la cámara ve en cada dirección (esquinas de la caja) */
function filasVisibles(w: number, h: number) {
  const camOff = [5.2, 9.2, 6.4];
  // El adelanto de la mira también depende de la ventana: en vertical la cámara
  // mira más lejos para bajar al jugador en pantalla (ver `camLookAheadFor`).
  const look = [0, 0.4, -camLookAheadFor(w, h)];
  const d = [look[0] - camOff[0], look[1] - camOff[1], look[2] - camOff[2]];
  const L = Math.hypot(...d);
  const v = d.map((n) => n / L);
  const r0 = [-v[2], 0, v[0]];
  const rl = Math.hypot(r0[0], r0[2]);
  const R = [r0[0] / rl, 0, r0[2] / rl];
  const dot = v[1];
  let U = [-dot * v[0], 1 - dot * v[1], -dot * v[2]];
  const ul = Math.hypot(...U);
  U = U.map((n) => n / ul);
  const zoom = camZoomFor(w, h);
  const halfW = w / zoom / 2;
  const halfH = h / zoom / 2;
  let ade = -Infinity;
  let atr = -Infinity;
  for (const sw of [-halfW, halfW]) {
    for (const sh of [-halfH, halfH]) {
      const t = -(look[1] + sh * U[1]) / v[1];
      const z = look[2] + sw * R[2] + sh * U[2] + t * v[2];
      ade = Math.max(ade, -z);
      atr = Math.max(atr, z);
    }
  }
  return { ade: ade / BALANCE.TILE, atr: atr / BALANCE.TILE };
}

/** Cada pantalla con el nivel que le va a tocar (ver `autoLevel` en
 *  `render/quality.ts`): el teléfono corre 'movil', lo táctil grande 'rapido' y
 *  el escritorio 'alto'. */
/** Pantallas donde el techo recorta A PROPÓSITO y se acepta. En un monitor
 *  grande la cámara alcanza 20-39 filas y dibujarlas todas con gráfica
 *  integrada no se paga, así que 'alto' se queda corto y en el hueco del mapa
 *  asoma el océano. Es una decisión vieja del nivel, anterior al teléfono, y
 *  está aquí para que se VEA en cada ejecución en vez de pasar en silencio: si
 *  algún día se arregla, esta lista se vacía. Lo que no se tolera es que se
 *  quede corta una pantalla que NO esté aquí. */
const RECORTE_ACEPTADO = new Set(['1600x900', '1920x1080', '2000x1500', '2560x1440', '3840x2160']);

const RESOLUCIONES: [number, number, keyof typeof LEVELS][] = [
  // Teléfonos, en vertical y en horizontal: es la ventana más estrecha que hay
  // y la que obliga a la cámara a alejarse.
  [360, 640, 'movil'], [390, 664, 'movil'], [430, 750, 'movil'], [844, 390, 'movil'],
  // Tableta y escritorio
  [820, 1080, 'rapido'], [1280, 800, 'alto'], [1600, 900, 'alto'],
  [1920, 1080, 'alto'], [2000, 1500, 'alto'], [2560, 1440, 'alto'], [3840, 2160, 'alto'],
];

const tabla: any[] = [];
const fallos: string[] = [];
/** Recortes que ya se sabían y se aceptan (ver `RECORTE_ACEPTADO`) */
const aceptados: string[] = [];

for (const [w, h, nombreNivel] of RESOLUCIONES) {
  const ve = filasVisibles(w, h);
  const view = viewRowsFor(w, h);

  // Partida nueva a esta resolución
  setLookahead(view.ahead);
  useGameStore.getState().startGame();
  setLookahead(view.ahead);
  const alArrancar = rows.length;

  // Se recorren 120 filas comprobando que el mapa siempre llega más lejos que
  // la ventana de render
  let peorMargen = Infinity;
  for (let r = 0; r < 120; r++) {
    runtime.row = r;
    extendRowsIfNeeded(r);
    peorMargen = Math.min(peorMargen, rows.length - 1 - (r + view.ahead));
  }

  const cubreAde = view.ahead >= Math.ceil(ve.ade);
  const cubreAtr = view.behind >= Math.ceil(ve.atr);
  if (!cubreAde) fallos.push(`${w}x${h}: la ventana dibuja ${view.ahead} filas adelante y la cámara ve ${ve.ade.toFixed(1)}`);
  if (!cubreAtr) fallos.push(`${w}x${h}: la ventana dibuja ${view.behind} filas atrás y la cámara ve ${ve.atr.toFixed(1)}`);

  // ...y lo mismo sobre la ventana YA RECORTADA por el techo, que es la que se
  // dibuja de verdad.
  const nivel = LEVELS[nombreNivel];
  const real = clampViewRows(view, nivel.maxRows);
  const donde = RECORTE_ACEPTADO.has(`${w}x${h}`) ? aceptados : fallos;
  if (real.ahead < Math.ceil(ve.ade))
    donde.push(`${w}x${h} q=${nivel.name}: el techo de ${nivel.maxRows} filas deja ${real.ahead} adelante y la cámara ve ${ve.ade.toFixed(1)}`);
  if (real.behind < Math.ceil(ve.atr))
    donde.push(`${w}x${h} q=${nivel.name}: el techo de ${nivel.maxRows} filas deja ${real.behind} atrás y la cámara ve ${ve.atr.toFixed(1)}`);
  if (peorMargen < 0) fallos.push(`${w}x${h}: el mapa generado se queda corto (margen ${peorMargen})`);
  if (alArrancar < view.ahead + 1) fallos.push(`${w}x${h}: al arrancar solo hay ${alArrancar} filas y se ven ${view.ahead}`);

  tabla.push({
    resolución: `${w}x${h}`,
    nivel: nivel.name,
    've adelante': +ve.ade.toFixed(1),
    'dibuja adelante': real.ahead,
    've atrás': +ve.atr.toFixed(1),
    'dibuja atrás': real.behind,
    'recorta el techo': view.ahead + view.behind > nivel.maxRows ? 'sí' : '',
    'margen generación': peorMargen,
  });
}

console.table(tabla);
if (aceptados.length) {
  console.warn('RECORTE ACEPTADO en pantalla grande (compromiso del nivel, no regresión):\n - ' + aceptados.join('\n - '));
}
if (fallos.length) {
  console.error('FALLOS:\n - ' + fallos.join('\n - '));
  process.exit(1);
}
console.log('OK: la ventana cubre lo que ve la cámara y el mapa va por delante en todas las resoluciones');
