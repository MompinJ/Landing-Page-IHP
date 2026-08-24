/**
 * ¿QUÉ BIOMA CUESTA? — «va trabado en las balsas» es una pista de las buenas:
 * señala un sitio concreto, así que se puede medir en vez de opinar.
 *
 * Recorre las cinco terminales a resolución y encuadre de TELÉFONO, y de cada
 * una saca lo que de verdad separa un bioma caro de uno barato: llamadas de
 * dibujo, triángulos, mallas vivas y —lo que se siente en la mano— el peor
 * frame y cuántos se pasan del presupuesto.
 *
 * Se mide MOVIÉNDOSE por el bioma, no plantado en una fila: lo que se sospecha
 * es coste de entrar filas nuevas en cuadro, y eso no se ve si la cámara no
 * avanza.
 *
 *   npx tsx scripts/biome-profile.ts [url]
 */
import { chromium, devices } from 'playwright';
import { BALANCE } from '../src/data/balance';
import { BIOME_SEQUENCE } from '../src/world/rows';

const BASE = process.argv[2] ?? 'http://localhost:4197/';

const browser = await chromium.launch({
  args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist', '--disable-frame-rate-limit'],
});
const ctx = await browser.newContext({ ...devices['iPhone 13'] });
const page = await ctx.newPage();
page.on('pageerror', (e) => console.error('[pageerror]', String(e)));
await page.goto(`${BASE}?debug&daily&fps=off`, { waitUntil: 'networkidle' });
await page.getByRole('button', { name: 'Jugar', exact: true }).click();
await page.waitForTimeout(1500);
await page.getByRole('button', { name: 'A jugar' }).click();
await page.waitForTimeout(2000);

const tabla: Record<string, unknown>[] = [];
for (let z = 0; z < BIOME_SEQUENCE.length; z++) {
  const desde = z * BALANCE.ZONE_LENGTH;
  const r: any = await page.evaluate(
    `(async () => {
       const dh = window.__DH;
       dh.teleport(${desde}, 0);
       await new Promise(r => setTimeout(r, 1200));   // asentar antes de medir
       dh.gl.info.autoReset = false; dh.gl.info.reset();
       let picoLlamadas = 0, picoTris = 0, picoMallas = 0;
       const t = [];
       let fila = ${desde};
       return await new Promise((resolve) => {
         let last = performance.now(); const t0 = last;
         requestAnimationFrame(function paso() {
           const now = performance.now(); t.push(now - last); last = now;
           picoLlamadas = Math.max(picoLlamadas, dh.gl.info.render.calls);
           picoTris = Math.max(picoTris, dh.gl.info.render.triangles);
           dh.gl.info.reset();
           // Avanzar de fila a ritmo de juego: es al entrar filas nuevas
           // cuando se paga sembrarlas y fusionar su geometria.
           if (t.length % 12 === 0 && fila < ${desde + BALANCE.ZONE_LENGTH - 1}) {
             dh.teleport(++fila, (t.length % 5) - 2);
             let n = 0; dh.scene.traverse(o => { if (o.isMesh) n++; });
             picoMallas = Math.max(picoMallas, n);
           }
           if (now - t0 < 5000) requestAnimationFrame(paso);
           else { dh.gl.info.autoReset = true;
                  resolve({ t: t.slice(2), picoLlamadas, picoTris, picoMallas }); }
         });
       });
     })()`,
  );
  const s = [...r.t].sort((a: number, b: number) => a - b);
  const media = s.reduce((a: number, b: number) => a + b, 0) / s.length;
  tabla.push({
    terminal: BIOME_SEQUENCE[z],
    filas: `${desde}-${desde + BALANCE.ZONE_LENGTH - 1}`,
    'llamadas (pico)': r.picoLlamadas,
    'triángulos (pico)': r.picoTris,
    'mallas (pico)': r.picoMallas,
    'ms medio': +media.toFixed(2),
    'p99 ms': +s[Math.floor(s.length * 0.99)].toFixed(1),
    'peor ms': +s[s.length - 1].toFixed(1),
    '>16.7ms': r.t.filter((x: number) => x > 16.7).length,
  });
}
console.table(tabla);
await browser.close();
