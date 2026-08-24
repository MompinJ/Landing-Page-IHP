/** Banco MOVIL por software (SwiftShader = peor caso, proxy de GPU de telefono).
 *  Compara niveles a resolucion de telefono en vertical.
 *  npx tsx scripts/mobile-bench.ts [url] [niveles,coma] */
import { chromium, devices } from 'playwright';

const BASE = process.argv[2] ?? 'http://localhost:4189/';
const NIVELES = (process.argv[3] ?? 'ultra,alto,rapido').split(',');

const browser = await chromium.launch({ args: ['--disable-gpu', '--disable-frame-rate-limit'] });
for (const nivel of NIVELES) {
  const ctx = await browser.newContext({ ...devices['iPhone 13'] });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => console.error('[pageerror]', String(e)));
  await page.goto(`${BASE}?debug&daily&q=${nivel}`, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'Jugar', exact: true }).click();
  await page.waitForTimeout(400);
  await page.getByRole('button', { name: 'A jugar' }).click();
  await page.waitForTimeout(3000);
  const r: any = await page.evaluate(
    `new Promise((resolve) => {
       const dh = window.__DH; dh.gl.info.autoReset = false; dh.gl.info.reset();
       const t = []; let last = performance.now(); const t0 = last;
       requestAnimationFrame(function step() {
         const now = performance.now(); t.push(now - last); last = now;
         if (t.length % 8 === 0) dh.teleport(dh.runtime.row + 1, ((t.length/8)%5)-2);
         if (now - t0 < 8000) requestAnimationFrame(step);
         else { const i = dh.gl.info; dh.gl.info.autoReset = true;
           resolve({ t: t.slice(2), calls: i.render.calls, tris: i.render.triangles,
                     px: dh.gl.domElement.width * dh.gl.domElement.height,
                     buffer: dh.gl.domElement.width + 'x' + dh.gl.domElement.height }); }
       });
     })`,
  );
  const s = [...r.t].sort((a: number, b: number) => a - b);
  const media = s.reduce((a: number, b: number) => a + b, 0) / s.length;
  const p95 = s[Math.floor(s.length * 0.95)];
  console.log(
    `${nivel.padEnd(7)} ${(1000 / media).toFixed(1).padStart(6)} fps  medio ${media.toFixed(1).padStart(6)} ms  p95 ${p95.toFixed(1).padStart(6)} ms  ` +
      `llamadas ${String(r.calls).padStart(4)}  tris ${String(r.tris).padStart(6)}  buffer ${r.buffer} (${(r.px / 1000).toFixed(0)} kpx)`,
  );
  await ctx.close();
}
await browser.close();
