/**
 * Comparativa de RENDIMIENTO del volumen de vista (Problema 1): con `near`
 * negativo entra en el frustum geometría que antes se recortaba, así que hay
 * que confirmar que no cuesta frames.
 *
 * Alterna near/far sobre la MISMA sesión y mide tiempos de frame reales.
 *
 *   npx tsx scripts/perf-check.ts [url]
 */
import { chromium } from 'playwright';

const URL = process.argv[2] ?? 'http://localhost:4189/?debug&daily';
const W = Number(process.argv[3] ?? 1600);
const H = Number(process.argv[4] ?? 900);
const SECONDS = 6;

// Headless con GPU real: por defecto Chromium cae a SwiftShader (software) y
// mide ~4 fps, donde cualquier diferencia de geometría queda enterrada.
const browser = await chromium.launch({
  args: [
    '--use-angle=metal',
    '--enable-gpu',
    '--use-gl=angle',
    '--enable-unsafe-webgpu',
    '--ignore-gpu-blocklist',
    '--disable-frame-rate-limit',
  ],
});
const page = await browser.newPage({ viewport: { width: W, height: H } });
page.on('pageerror', (e) => console.error('[pageerror]', String(e)));
await page.goto(URL, { waitUntil: 'networkidle' });
await page.getByRole('button', { name: 'Iniciar misión' }).click();
await page.waitForTimeout(2000);

/** Mide tiempos de frame mientras el jugador avanza por el mapa */
async function measure(near: number, far: number, label: string) {
  await page.evaluate(([n, f]) => {
    const cam = (window as any).__DH.camera;
    cam.near = n;
    cam.far = f;
    cam.updateProjectionMatrix();
    (window as any).__DH.teleport(14, 0);
  }, [near, far]);
  await page.waitForTimeout(800); // descartar el calentamiento

  // Se pasa como cadena: tsx/esbuild inyecta un helper `__name` en las
  // funciones nombradas y ese helper no existe dentro de la página.
  const samples: number[] = await page.evaluate(
    `new Promise((resolve) => {
       const times = [];
       let last = performance.now();
       const t0 = last;
       requestAnimationFrame(function step() {
         const now = performance.now();
         times.push(now - last);
         last = now;
         // avanzar de fila a ritmo de juego real (~3 filas/s), no cada frame
         if (times.length % 20 === 0) {
           const dh = window.__DH;
           dh.teleport(dh.runtime.row + 1, ((times.length / 20) % 5) - 2);
         }
         if (now - t0 < ${SECONDS * 1000}) requestAnimationFrame(step);
         else resolve(times.slice(2));
       });
     })`,
  );

  const sorted = [...samples].sort((a, b) => a - b);
  const pct = (p: number) => sorted[Math.floor(sorted.length * p)];
  const avg = samples.reduce((a, b) => a + b, 0) / samples.length;
  return {
    caso: label,
    frames: samples.length,
    fpsMedio: +(1000 / avg).toFixed(1),
    msMedio: +avg.toFixed(2),
    msP95: +pct(0.95).toFixed(2),
    msPeor: +sorted[sorted.length - 1].toFixed(2),
  };
}

const results = [];
for (const ronda of [1, 2, 3]) results.push(await measure(-50, 200, `${W}x${H} · ronda ${ronda}`));

console.table(results);
await browser.close();
