/**
 * PERFIL DE GPU: qué está costando de verdad en una escena de juego real.
 *
 * `perf-check.ts` mide fps; este mide la CAUSA — draw calls, triángulos,
 * programas de shader, materiales y geometrías vivas, y cuánto de todo eso lo
 * provoca el mapa de sombras (que redibuja la escena entera una segunda vez).
 *
 *   npx tsx scripts/gpu-profile.ts [url] [ancho] [alto]
 */
import { chromium } from 'playwright';

const URL = process.argv[2] ?? 'http://localhost:5173/?debug&daily';
const W = Number(process.argv[3] ?? 1600);
const H = Number(process.argv[4] ?? 900);

const browser = await chromium.launch({
  args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist', '--disable-frame-rate-limit'],
});
const page = await browser.newPage({ viewport: { width: W, height: H } });
page.on('pageerror', (e) => console.error('[pageerror]', String(e)));
await page.goto(URL, { waitUntil: 'networkidle' });
await page.getByRole('button', { name: 'Jugar', exact: true }).click();
await page.waitForTimeout(300);
await page.getByRole('button', { name: 'A jugar' }).click();
await page.waitForTimeout(2000);

/** Instantánea de renderer.info + inventario de la escena en una fila dada */
async function snapshot(row: number, label: string) {
  await page.evaluate((r) => (window as any).__DH.teleport(r, 0), row);
  await page.waitForTimeout(900);
  // renderer.info se resetea en CADA render() y el composer hace varias
  // pasadas por frame: sin autoReset:false solo se leería la última (el quad
  // de post-proceso), que es siempre 1 draw call.
  return page.evaluate(
    (label) =>
      new Promise((resolve) => {
        const dh = (window as any).__DH;
        dh.gl.info.autoReset = false;
        dh.gl.info.reset();
        requestAnimationFrame(() =>
          requestAnimationFrame(() => {
            const info = dh.gl.info;
            dh.gl.info.autoReset = true;
            let meshes = 0;
            let shadowCasters = 0;
            const materiales = new Set();
            const geometrias = new Set();
            dh.scene.traverse((o: any) => {
              if (!o.isMesh) return;
              meshes++;
              if (o.castShadow) shadowCasters++;
              materiales.add(o.material.uuid);
              geometrias.add(o.geometry.uuid);
            });
            resolve({
              zona: label,
              drawCalls: info.render.calls,
              triangulos: info.render.triangles,
              mallas: meshes,
              castShadow: shadowCasters,
              matUnicos: materiales.size,
              geoUnicas: geometrias.size,
              programas: info.programs?.length ?? 0,
              texturas: info.memory.textures,
              geoEnGPU: info.memory.geometries,
            });
          }),
        );
      }),
    label,
  );
}

const filas: Array<[number, string]> = [
  [12, 'LCT puerto'],
  [38, 'ECV cruceros'],
  [60, 'TNG astillero'],
  [86, 'TILH ferro'],
];

const out = [];
for (const [row, label] of filas) out.push(await snapshot(row, label));
console.table(out);

// Coste del mapa de sombras: se apagan las sombras y se vuelve a medir el frame
const conSombras = await frameTime();
await page.evaluate(() => {
  const dh = (window as any).__DH;
  dh.gl.shadowMap.enabled = false;
  dh.scene.traverse((o: any) => {
    if (o.isMesh) o.material.needsUpdate = true;
  });
});
await page.waitForTimeout(600);
const sinSombras = await frameTime();
console.table([
  { caso: 'con sombras', ...conSombras },
  { caso: 'sin sombras', ...sinSombras },
]);

async function frameTime() {
  const samples: number[] = await page.evaluate(
    `new Promise((resolve) => {
       const times = []; let last = performance.now(); const t0 = last;
       requestAnimationFrame(function step() {
         const now = performance.now();
         times.push(now - last); last = now;
         if (times.length % 20 === 0) window.__DH.teleport(window.__DH.runtime.row + 1, 0);
         if (now - t0 < 4000) requestAnimationFrame(step); else resolve(times.slice(3));
       });
     })`,
  );
  const avg = samples.reduce((a, b) => a + b, 0) / samples.length;
  const sorted = [...samples].sort((a, b) => a - b);
  return {
    fps: +(1000 / avg).toFixed(1),
    msMedio: +avg.toFixed(2),
    msP95: +sorted[Math.floor(sorted.length * 0.95)].toFixed(2),
  };
}

await browser.close();
