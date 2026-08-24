/**
 * ¿QUÉ FUNCIÓN se come el frame? Perfil de CPU real mientras se juega.
 *
 * Cuando un tirón NO coincide con carga de recursos (ver `jank-cause.ts`) es
 * trabajo de JavaScript, y ahí adivinar sale caro: el perfilador de Chrome dice
 * el nombre. Se agrega por TIEMPO PROPIO, que es el que de verdad gasta cada
 * función — el tiempo total solo dice quién llamó a quién.
 *
 * DOS MODOS, y la diferencia importa:
 *
 *   ventana ancha  → dice qué cuesta el ESTADO ESTABLE (envío de dibujo)
 *   ventana corta alrededor del tirón → dice qué cuesta EL TIRÓN
 *
 * Sin acotar, lo segundo queda enterrado bajo lo primero: veinticinco segundos
 * de frames buenos tapan cuatro frames malos por muchos milisegundos que valgan
 * cada uno.
 *
 * Y SIN `--disable-frame-rate-limit`, al revés que los bancos de coste de este
 * repo: soltando la sincronía vertical el navegador dibuja todo lo que puede y
 * el perfil sale, por construcción, 100% envío de dibujo. Un teléfono va
 * sincronizado a su pantalla, así que aquí también.
 *
 *   npx tsx scripts/cpu-profile.ts [url] [filaDesde] [filaHasta]
 */
import { chromium, devices } from 'playwright';

const BASE = process.argv[2] ?? 'http://localhost:4197/';
const DESDE = Number(process.argv[3] ?? 0);
const HASTA = Number(process.argv[4] ?? 30);

const browser = await chromium.launch({
  args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'],
});
const ctx = await browser.newContext({ ...devices['iPhone 13'] });
const page = await ctx.newPage();
page.on('pageerror', (e) => console.error('[pageerror]', String(e)));
const cdp = await ctx.newCDPSession(page);
await page.goto(`${BASE}?debug&daily&fps=off`, { waitUntil: 'networkidle' });
await page.getByRole('button', { name: 'Jugar', exact: true }).click();
await page.waitForTimeout(4000);
await page.getByRole('button', { name: 'A jugar' }).click();
await page.waitForTimeout(600);

// Se avanza HASTA la ventana que interesa antes de empezar a perfilar, jugando
// igual: el objetivo es entrar en ella con el juego en su estado normal.
if (DESDE > 0) {
  await page.evaluate(
    `new Promise((resolve) => { const dh = window.__DH; const t0 = performance.now();
       const t = setInterval(() => {
         if (dh.runtime.row >= ${DESDE} || performance.now() - t0 > 20000) { clearInterval(t); resolve(null); return; }
         window.dispatchEvent(new KeyboardEvent('keydown', { code: 'ArrowUp' }));
         setTimeout(() => window.dispatchEvent(new KeyboardEvent('keyup', { code: 'ArrowUp' })), 30);
       }, 120); })`,
  );
  await page.waitForTimeout(400);
}

await cdp.send('Profiler.enable');
await cdp.send('Profiler.setSamplingInterval', { interval: 100 }); // 0.1 ms
await cdp.send('Profiler.start');
await page.evaluate(
  `new Promise((resolve) => {
     const dh = window.__DH;
     const t0 = performance.now();
     const t = setInterval(() => {
       // Tope de tiempo además del de fila: si el corredor muere o se queda
       // encallado, la sonda tiene que terminar igual y no colgar la prueba.
       if (dh.runtime.row >= ${HASTA} || performance.now() - t0 > 25000) { clearInterval(t); resolve(null); return; }
       window.dispatchEvent(new KeyboardEvent('keydown', { code: 'ArrowUp' }));
       setTimeout(() => window.dispatchEvent(new KeyboardEvent('keyup', { code: 'ArrowUp' })), 30);
     }, 130);
   })`,
);
const { profile } = await cdp.send('Profiler.stop');

// Tiempo PROPIO por función: se cuenta una muestra a la función en la que
// estaba el hilo, no a toda su cadena de llamadas.
const porNodo = new Map<number, number>();
const dt = profile.timeDeltas ?? [];
(profile.samples ?? []).forEach((id: number, i: number) => porNodo.set(id, (porNodo.get(id) ?? 0) + (dt[i] ?? 0)));

const filas = (profile.nodes ?? [])
  .map((n: any) => {
    const f = n.callFrame;
    const archivo = (f.url || '').split('/').pop() || '';
    return {
      funcion: f.functionName || '(anónima)',
      donde: archivo ? `${archivo}:${f.lineNumber + 1}` : '(motor)',
      ms: +(((porNodo.get(n.id) ?? 0) / 1000)).toFixed(1),
    };
  })
  .filter((r: any) => r.ms > 1)
  .sort((a: any, b: any) => b.ms - a.ms)
  .slice(0, 22);

const total = [...porNodo.values()].reduce((a, b) => a + b, 0) / 1000;
console.log(`Perfil de ${total.toFixed(0)} ms jugando de la fila ${DESDE} a la ${HASTA} — tiempo PROPIO por función:\n`);
console.table(filas);
await browser.close();
