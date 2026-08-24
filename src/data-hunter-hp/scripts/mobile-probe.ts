/** Sonda MOVIL: telefono emulado + CPU frenada (x N) jugando de verdad.
 *  npx tsx scripts/mobile-probe.ts [url] [throttle] [q] */
import { chromium, devices } from 'playwright';

const BASE = process.argv[2] ?? 'http://localhost:4189/';
const THROTTLE = Number(process.argv[3] ?? 6);
const Q = process.argv[4] ?? '';
const browser = await chromium.launch({
  args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist', '--disable-frame-rate-limit'],
});
const ctx = await browser.newContext({ ...devices['iPhone 13'] });
const page = await ctx.newPage();
page.on('pageerror', (e) => console.error('[pageerror]', String(e)));
const cdp = await ctx.newCDPSession(page);
await cdp.send('Emulation.setCPUThrottlingRate', { rate: THROTTLE });
await page.goto(`${BASE}?debug&daily${Q ? `&q=${Q}` : ''}`, { waitUntil: 'networkidle' });

console.log(`--- iPhone 13 emulado, CPU x${THROTTLE}, q=${Q || 'auto'} ---`);
console.log('viewport', page.viewportSize(), 'dpr', await page.evaluate(() => window.devicePixelRatio));

const overflow = await page.evaluate(() => {
  const out: string[] = [];
  document.querySelectorAll<HTMLElement>('body *').forEach((el) => {
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) return;
    if (r.right > innerWidth + 1 || r.left < -1 || r.bottom > innerHeight + 1)
      out.push(`${(el.className || el.tagName).toString().slice(0, 40)} ${Math.round(r.left)},${Math.round(r.top)} ${Math.round(r.width)}x${Math.round(r.height)}`);
  });
  return out.slice(0, 10);
});
console.log('portada fuera de pantalla:', overflow.length ? overflow : 'ninguno');

await page.getByRole('button', { name: 'Jugar', exact: true }).click();
await page.waitForTimeout(1200);
await page.getByRole('button', { name: 'A jugar' }).click();
await page.waitForTimeout(600);

const info: any = await page.evaluate(
  `new Promise((resolve) => {
     const dh = window.__DH; dh.gl.info.autoReset = false; dh.gl.info.reset();
     requestAnimationFrame(() => requestAnimationFrame(() => {
       const i = dh.gl.info; dh.gl.info.autoReset = true;
       let meshes = 0; dh.scene.traverse((o) => { if (o.isMesh) meshes++; });
       resolve({ calls: i.render.calls, tris: i.render.triangles, programas: i.programs.length,
                 geoms: i.memory.geometries, texs: i.memory.textures, meshes,
                 dpr: dh.gl.getPixelRatio(), buffer: dh.gl.domElement.width + 'x' + dh.gl.domElement.height,
                 sombras: dh.gl.shadowMap.enabled });
     }));
   })`,
);
console.log('frame:', info);

// Se juega de verdad: pasos a ritmo humano (~2.5 filas/s) via teclado sintetico
const times: number[] = await page.evaluate(
  `new Promise((resolve) => {
     const t = []; let last = performance.now(); const t0 = last;
     const paso = setInterval(() => {
       window.dispatchEvent(new KeyboardEvent('keydown', { code: 'ArrowUp' }));
       setTimeout(() => window.dispatchEvent(new KeyboardEvent('keyup', { code: 'ArrowUp' })), 40);
     }, 400);
     requestAnimationFrame(function step() {
       const now = performance.now(); t.push(now - last); last = now;
       if (now - t0 < 14000) requestAnimationFrame(step);
       else { clearInterval(paso); resolve(t.slice(3)); }
     });
   })`,
);
const s = [...times].sort((a, b) => a - b);
const pc = (q: number) => s[Math.min(s.length - 1, Math.floor(s.length * q))].toFixed(1);
const media = s.reduce((a, b) => a + b, 0) / s.length;
console.log(`frames n=${s.length} media=${media.toFixed(1)}ms (~${(1000 / media).toFixed(0)} fps) p50=${pc(0.5)} p90=${pc(0.9)} p99=${pc(0.99)} peor=${s[s.length - 1].toFixed(1)}`);
console.log(`>16.7ms: ${times.filter((x) => x > 16.7).length}  >33ms: ${times.filter((x) => x > 33).length}  >100ms: ${times.filter((x) => x > 100).length}`);
console.log('fila final:', await page.evaluate(`window.__DH.runtime.row`));
await page.screenshot({ path: 'scripts/mobile-out/play.png' });
await browser.close();
