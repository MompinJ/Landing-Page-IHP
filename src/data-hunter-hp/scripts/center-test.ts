/**
 * ¿ESTÁ EL PERSONAJE EN EL CENTRO, EN CUALQUIER PANTALLA?
 *
 * Es lo que se pidió —encuadre de Crossy Road— y es una promesa que se puede
 * medir sin ambigüedad: se proyecta la posición real del jugador con la cámara
 * real y se mira dónde cae en el cuadro. Antes NO caía en el centro y era fácil
 * no darse cuenta de por qué: la mira iba por delante del jugador, y como el
 * desplazamiento de la cámara es diagonal, adelantarla no lo bajaba en vertical
 * sino en diagonal — en un móvil en vertical se quedaba al 37% del ancho.
 *
 * Se recorre un abanico de pantallas a propósito absurdo (de un móvil pequeño a
 * 4K, pasando por una tira 21:9 y un cuadrado) porque «que se adapte a
 * cualquier tipo de pantalla» solo significa algo si se prueba en las raras.
 *
 * Y no basta con centrar: si para centrar hubiera que acercar tanto la cámara
 * que no se viera a dónde esquivar, el encuadre sería bonito e injugable. Por
 * eso se comprueban a la vez las tres cosas — centrado, columnas a la vista y
 * filas por delante.
 *
 *   npx tsx scripts/center-test.ts [url]
 */
import { chromium } from 'playwright';
import { BALANCE } from '../src/data/balance';

const BASE = process.argv[2] ?? 'http://localhost:4197/';

/** Pantallas: móviles, tabletas, escritorio y algunas deliberadamente raras */
const PANTALLAS: [string, number, number][] = [
  ['móvil pequeño', 320, 568],
  ['móvil vertical', 390, 664],
  ['móvil alto 20:9', 412, 915],
  ['móvil grande', 430, 932],
  ['móvil horizontal', 844, 390],
  ['tableta vertical', 820, 1180],
  ['tableta horizontal', 1180, 820],
  ['cuadrado', 700, 700],
  ['tira 21:9', 1720, 720],
  ['portátil', 1440, 900],
  ['escritorio', 1920, 1080],
  ['4K', 3840, 2160],
];

/** Cuánto se tolera que se desvíe del centro, como fracción del lado. El 2% de
 *  una pantalla de 390 px son 8 px: por debajo de eso nadie ve un descentrado. */
const TOLERANCIA = 0.02;
/** Mínimos de jugabilidad: hay que ver a dónde esquivar y qué viene. */
const COLUMNAS_MIN = 9;
const FILAS_ADELANTE_MIN = 5;

const browser = await chromium.launch({ args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] });
const fallos: string[] = [];
const tabla: Record<string, unknown>[] = [];

for (const [nombre, w, h] of PANTALLAS) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h } });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => console.error('[pageerror]', String(e)));
  await page.goto(`${BASE}?debug&daily&fps=off`, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'Jugar', exact: true }).click();
  await page.waitForTimeout(300);
  await page.getByRole('button', { name: 'A jugar' }).click();
  await page.waitForTimeout(1200);
  // Unas filas dentro del mapa y descolocado de la columna central: si el
  // centrado dependiera de dónde está el jugador, aquí se vería.
  await page.evaluate(`window.__DH.teleport(24, 3)`);
  await page.waitForTimeout(900);

  const m: any = await page.evaluate(`(() => {
    const dh = window.__DH, cam = dh.camera;
    // Se proyecta a mano con las matrices de la propia cámara (columna mayor,
    // que es como three las guarda) en vez de pedirle un Vector3 al puente de
    // depuración: así la prueba mide EL ENCUADRE REAL que está en pantalla y no
    // depende de que el puente exponga nada más.
    const mul = (m, v) => [0, 1, 2, 3].map((f) =>
      m[f] * v[0] + m[4 + f] * v[1] + m[8 + f] * v[2] + m[12 + f] * v[3]);
    const proyecta = (x, y, z) => {
      const ojo = mul(cam.matrixWorldInverse.elements, [x, y, z, 1]);
      const c = mul(cam.projectionMatrix.elements, ojo);
      return [(c[0] / c[3] + 1) / 2, (1 - c[1] / c[3]) / 2]; // 0..1 desde arriba-izquierda
    };
    const px = dh.runtime.x, pz = dh.runtime.z;
    const centro = proyecta(px, 0.4, pz);
    // Cuánto ocupa en pantalla una columna y una fila, para traducir el cuadro
    // a unidades de juego
    const unaColumna = Math.abs(proyecta(px + ${BALANCE.TILE}, 0.4, pz)[0] - centro[0]);
    const unaFila = Math.abs(proyecta(px, 0.4, pz - ${BALANCE.TILE})[1] - centro[1]);
    return { centro, unaColumna, unaFila };
  })()`);

  const [cx, cy] = m.centro;
  const desvioX = cx - 0.5;
  const desvioY = cy - 0.5;
  const columnas = 1 / m.unaColumna; // ancho completo del cuadro, en columnas
  const filasAdelante = 0.5 / m.unaFila; // del centro hacia arriba

  if (Math.abs(desvioX) > TOLERANCIA)
    fallos.push(`${nombre} (${w}x${h}): descentrado en horizontal, cae al ${(cx * 100).toFixed(1)}% del ancho`);
  if (Math.abs(desvioY) > TOLERANCIA)
    fallos.push(`${nombre} (${w}x${h}): descentrado en vertical, cae al ${(cy * 100).toFixed(1)}% del alto`);
  if (columnas < COLUMNAS_MIN)
    fallos.push(`${nombre} (${w}x${h}): solo ${columnas.toFixed(1)} columnas a la vista (mínimo ${COLUMNAS_MIN}): no se ve a dónde esquivar`);
  if (filasAdelante < FILAS_ADELANTE_MIN)
    fallos.push(`${nombre} (${w}x${h}): solo ${filasAdelante.toFixed(1)} filas por delante (mínimo ${FILAS_ADELANTE_MIN}): no se ve qué viene`);

  tabla.push({
    pantalla: `${nombre} ${w}x${h}`,
    'jugador en X': `${(cx * 100).toFixed(1)}%`,
    'jugador en Y': `${(cy * 100).toFixed(1)}%`,
    columnas: +columnas.toFixed(1),
    'filas adelante': +filasAdelante.toFixed(1),
  });
  await ctx.close();
}
await browser.close();

console.table(tabla);
if (fallos.length) {
  console.error('FALLOS:\n - ' + fallos.join('\n - '));
  process.exit(1);
}
console.log('El personaje queda en el centro y se ve lo suficiente, en las doce pantallas.');
