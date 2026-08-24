/**
 * ¿QUÉ pasa EN el frame que se atasca?
 *
 * «Va trabado en las balsas» no se arregla mirando medias: hay que cazar el
 * frame malo y ver qué cambió justo en él. Cada frame se anota el tiempo y los
 * cuatro contadores que pueden explicar un congelón en WebGL, y de los frames
 * lentos se reporta CUÁL de ellos se movió:
 *
 *   programas   un shader nuevo compilando y enlazando en mitad de la partida
 *   geometrías  una geometría nueva subiendo a la GPU
 *   variantes   una fusión de cajas nueva construyéndose (render/boxes.ts)
 *   texturas    una textura nueva subiendo a la GPU
 *
 * Si un tirón no coincide con ninguno, no es carga de recursos y hay que
 * buscarlo en otro sitio (siembra de filas, reconciliación de React).
 *
 * SE JUEGA DE VERDAD, con pulsaciones de teclado, y no con `teleport()`. La
 * primera versión de esta sonda teletransportaba, y eso MIENTE hacia arriba:
 * `teleport` llama a `extendRowsIfNeeded(fila + 20)`, o sea que siembra lotes
 * de filas enteros de golpe que en una partida real se reparten a lo largo de
 * veinte saltos. Los picos de 180 ms que salían eran en buena parte de la
 * propia sonda.
 *
 *   npx tsx scripts/jank-cause.ts [url] [filaInicial] [filaFinal] [msBriefing]
 */
import { chromium, devices } from 'playwright';

const BASE = process.argv[2] ?? 'http://localhost:4197/';
const DESDE = Number(process.argv[3] ?? 0);
const HASTA = Number(process.argv[4] ?? 65);
const BRIEFING = Number(process.argv[5] ?? 4000);

const browser = await chromium.launch({
  args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist', '--disable-frame-rate-limit'],
});
const ctx = await browser.newContext({ ...devices['iPhone 13'] });
const page = await ctx.newPage();
page.on('pageerror', (e) => console.error('[pageerror]', String(e)));
await page.goto(`${BASE}?debug&daily&fps=off`, { waitUntil: 'networkidle' });
await page.getByRole('button', { name: 'Jugar', exact: true }).click();
await page.waitForTimeout(BRIEFING); // el hueco que usa <Warmup>
const precalentado: any = await page.evaluate(
  `({ variantes: window.__DH.mergedCacheSize(), programas: window.__DH.gl.info.programs.length })`,
);
await page.getByRole('button', { name: 'A jugar' }).click();
await page.waitForTimeout(400);

const r: any = await page.evaluate(
  `(async () => {
     const dh = window.__DH;
     const lee = () => ({
       programas: dh.gl.info.programs.length,
       geometrias: dh.gl.info.memory.geometries,
       texturas: dh.gl.info.memory.textures,
       variantes: dh.mergedCacheSize(),
     });
     let prev = lee(), fila = ${DESDE};
     if (${DESDE} > 0) dh.teleport(${DESDE}, 0);
     await new Promise(r => setTimeout(r, 800));
     prev = lee();
     const lentos = [], todos = [];
     return await new Promise((resolve) => {
       let last = performance.now();
       requestAnimationFrame(function paso() {
         const now = performance.now(), dt = now - last; last = now;
         todos.push(dt);
         const cur = lee();
         if (dt > 16.7) lentos.push({
           fila, ms: +dt.toFixed(1),
           programas: cur.programas - prev.programas,
           geometrias: cur.geometrias - prev.geometrias,
           texturas: cur.texturas - prev.texturas,
           variantes: cur.variantes - prev.variantes,
         });
         prev = cur;
         // Un paso cada 10 frames, con una pulsación de verdad: el juego avanza
         // solo, sembrando filas al ritmo al que las sembraría jugando.
         if (todos.length % 10 === 0) {
           const codigo = (fila % 7 === 3) ? 'ArrowLeft' : (fila % 7 === 5) ? 'ArrowRight' : 'ArrowUp';
           window.dispatchEvent(new KeyboardEvent('keydown', { code: codigo }));
           setTimeout(() => window.dispatchEvent(new KeyboardEvent('keyup', { code: codigo })), 30);
           fila = dh.runtime.row;
         }
         if (dh.runtime.row < ${HASTA} && todos.length < 12000) requestAnimationFrame(paso);
         else resolve({ lentos, total: todos.length, ...lee() });
       });
     });
   })()`,
);

console.log(`Tras el briefing (${BRIEFING} ms): ${precalentado.variantes} variantes fusionadas, ${precalentado.programas} programas`);
console.log(`Al acabar el recorrido: ${r.variantes} variantes, ${r.programas} programas, ${r.geometrias} geometrías, ${r.texturas} texturas`);
console.log(`Frames: ${r.total} · lentos (>16.7 ms): ${r.lentos.length}\n`);
if (r.lentos.length) {
  console.table(r.lentos.slice(0, 25));
  const sinCausa = r.lentos.filter((l: any) => !l.programas && !l.geometrias && !l.texturas && !l.variantes);
  console.log(`\nTirones que NO coinciden con carga de recursos: ${sinCausa.length} de ${r.lentos.length}`);
}
await browser.close();
