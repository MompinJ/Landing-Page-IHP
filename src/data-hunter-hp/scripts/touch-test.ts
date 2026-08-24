/**
 * CONTROLES DE DEDO (`hooks/useTouchControls.ts`) — con toques de verdad, no
 * con eventos de ratón: el navegador traduce el toque a `pointer*` por su
 * cuenta y esa traducción es justo lo que hay que comprobar.
 *
 * Lo que se prueba, y por qué cada cosa:
 *   1. TOQUE seco = avanzar (el control original de Crossy Road).
 *   2. Los cuatro DESLIZAMIENTOS mueven a donde dicen.
 *   3. El gesto dispara al CRUZAR EL UMBRAL, sin esperar a levantar el dedo.
 *   4. Un golpe seco de pulgar da UN paso y no seis. Es el caso que se escapó:
 *      el reanclado convertía distancia en pasos, así que un flick normal de
 *      200 px cruzaba el umbral seis veces de una sacudida.
 *   5. Un arrastre LENTO sí encadena, que es para lo que está el reanclado.
 *   6. Tocar un BOTÓN de la interfaz no mueve al jugador — sin esto, pulsar
 *      «A jugar» encolaba un paso al empezar la partida.
 *
 *   npx tsx scripts/touch-test.ts [url]
 */
import { chromium, devices } from 'playwright';
import { BALANCE } from '../src/data/balance';

/** El mismo freno que aplica `hooks/useTouchControls.ts`. Se deriva de aquí en
 *  vez de copiarse: si algún día cambia el ritmo del personaje, la prueba se
 *  entera sola. */
const REPETICION_MS = BALANCE.STEP_TIME * 1000 * 0.7;

const BASE = process.argv[2] ?? 'http://localhost:4197/';

const browser = await chromium.launch({ args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] });
const ctx = await browser.newContext({ ...devices['iPhone 13'] });
const page = await ctx.newPage();
page.on('pageerror', (e) => console.error('[pageerror]', String(e)));
const cdp = await ctx.newCDPSession(page);

const toque = (tipo: 'touchStart' | 'touchMove' | 'touchEnd', x: number, y: number) =>
  cdp.send('Input.dispatchTouchEvent', {
    type: tipo,
    touchPoints: tipo === 'touchEnd' ? [] : [{ x, y, id: 1 }],
  });

/** Deslizamiento en pasos, como lo hace un dedo: sin `touchMove` intermedios el
 *  navegador no emite `pointermove` y el gesto no existe.
 *
 *  `msPorPaso` es lo que distingue un golpe seco de un barrido, y por eso es un
 *  parámetro y no una constante: el freno de repetición del hook mira el TIEMPO
 *  entre pasos, así que una prueba que dispare los `touchMove` tan rápido como
 *  pueda el CDP no representa a ningún dedo humano. */
async function desliza(x0: number, y0: number, dx: number, dy: number, pasos = 6, msPorPaso = 0) {
  await toque('touchStart', x0, y0);
  for (let i = 1; i <= pasos; i++) {
    await toque('touchMove', x0 + (dx * i) / pasos, y0 + (dy * i) / pasos);
    if (msPorPaso) await page.waitForTimeout(msPorPaso);
  }
  await toque('touchEnd', 0, 0);
}

async function toca(x: number, y: number) {
  await toque('touchStart', x, y);
  await toque('touchEnd', 0, 0);
}

const estado = () => page.evaluate(`({ fila: window.__DH.runtime.row, col: window.__DH.runtime.col })`) as Promise<{ fila: number; col: number }>;

await page.goto(`${BASE}?debug&daily`, { waitUntil: 'networkidle' });
await page.getByRole('button', { name: 'Jugar', exact: true }).click();
await page.waitForTimeout(300);

// --- 5. El toque sobre el botón no puede contar como gesto ---
const antesDeEmpezar = await page.evaluate(`window.__DH.runtime.row`);
await page.getByRole('button', { name: 'A jugar' }).tap();
await page.waitForTimeout(900);
const trasEmpezar = await estado();

const fallos: string[] = [];
const ok: string[] = [];
const comprueba = (cond: boolean, msg: string) => (cond ? ok : fallos).push(msg);

comprueba(trasEmpezar.fila === 0, `pulsar «A jugar» no mueve al jugador (fila ${trasEmpezar.fila}, esperada 0, antes ${antesDeEmpezar})`);

const CX = 195; // centro de la pantalla del iPhone 13 emulado
const CY = 400;

// --- 1. Toque seco = avanzar ---
let a = await estado();
await toca(CX, CY);
await page.waitForTimeout(400);
let b = await estado();
comprueba(b.fila === a.fila + 1, `toque seco avanza una fila (${a.fila} → ${b.fila})`);

// --- 2. Los cuatro deslizamientos ---
for (const [nombre, dx, dy, campo, delta] of [
  ['derecha', 70, 0, 'col', 1],
  ['izquierda', -70, 0, 'col', -1],
  ['arriba', 0, -70, 'fila', 1],
  ['abajo', 0, 70, 'fila', -1],
] as const) {
  a = await estado();
  await desliza(CX, CY, dx, dy);
  await page.waitForTimeout(500);
  b = await estado();
  const esperado = a[campo] + delta;
  comprueba(b[campo] === esperado, `deslizar ${nombre} → ${campo} ${a[campo]} → ${b[campo]} (esperado ${esperado})`);
}

// --- 3. Dispara al cruzar el umbral, sin levantar el dedo ---
a = await estado();
await toque('touchStart', CX, CY);
for (let i = 1; i <= 5; i++) await toque('touchMove', CX, CY - (70 * i) / 5);
await page.waitForTimeout(300);
const conElDedoPuesto = await estado();
await toque('touchEnd', 0, 0);
await page.waitForTimeout(300);
comprueba(
  conElDedoPuesto.fila === a.fila + 1,
  `el gesto dispara con el dedo aún apoyado (fila ${a.fila} → ${conElDedoPuesto.fila})`,
);

// --- 4. Golpe seco largo: la DISTANCIA no manda ---
// 240 px son siete umbrales y medio. Antes del freno de repetición eso daban
// siete saltos de una sacudida; ahora los pasos los marca el reloj.
//
// El tope se calcula con la duración REAL del gesto en vez de fijarlo a uno:
// mandar los `touchMove` por CDP cuesta una ida y vuelta cada uno, así que este
// «golpe seco» tarda bastante más que los 80-100 ms de un pulgar de verdad y
// pedirle un solo paso sería pedirle algo que el propio banco de pruebas no
// puede reproducir. Lo que sí se comprueba, y es lo que importa, es que los
// pasos salen del TIEMPO y no de la distancia.
await page.waitForTimeout(500);
a = await estado();
const t0 = Date.now();
await desliza(CX, CY + 120, 0, -240, 12);
const duracion = Date.now() - t0;
await page.waitForTimeout(900);
b = await estado();
const tope = 1 + Math.floor(duracion / REPETICION_MS);
comprueba(
  b.fila - a.fila <= tope,
  `un golpe de 240 px (7.5 umbrales) da ${b.fila - a.fila} paso(s), no 7: en ${duracion} ms caben ${tope} por reloj`,
);

// --- 5. Arrastre lento = pasos encadenados ---
await page.waitForTimeout(400);
a = await estado();
await desliza(CX, CY + 150, 0, -300, 8, 90); // 8 tramos de 37 px, uno cada 90 ms
await page.waitForTimeout(1400);
b = await estado();
const encadenados = b.fila - a.fila;
comprueba(
  encadenados >= 3 && encadenados <= 8,
  `un arrastre lento encadena pasos sin desbocarse (fila ${a.fila} → ${b.fila}, ${encadenados} pasos; se esperan 3-8)`,
);

console.log('OK:\n - ' + ok.join('\n - '));
if (fallos.length) {
  console.error('\nFALLOS:\n - ' + fallos.join('\n - '));
  await browser.close();
  process.exit(1);
}
console.log('\nTodos los gestos responden.');
await browser.close();
