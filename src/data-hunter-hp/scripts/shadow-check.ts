/**
 * COMPARATIVA DE SOMBRAS: captura la MISMA vista con distintos ajustes de la
 * luz direccional para ver cuál elimina el acné (manchas sobre las caras) y el
 * peter-panning (sombra despegada de la base del objeto).
 *
 *   npx tsx scripts/shadow-check.ts [url]
 */
import { mkdirSync } from 'node:fs';
import { chromium } from 'playwright';

const URL = process.argv[2] ?? 'http://localhost:5173/?debug&daily';
const OUT = 'scripts/shadow-out';
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({
  args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'],
});
const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
page.on('pageerror', (e) => console.error('[pageerror]', String(e)));
await page.goto(URL, { waitUntil: 'networkidle' });
await page.getByRole('button', { name: 'Iniciar misión' }).click();
await page.waitForTimeout(1500);

/** Fila del puerto con grúa RTG y pilas de contenedor: donde se ven los fallos */
await page.evaluate(() => {
  const dh = (window as any).__DH;
  const row = 20;
  for (let r = row - 2; r <= row + 3; r++) {
    dh.rows[r] = { index: r, type: 'yard', theme: 'port', decor: [], cards: [], cranes: [], vehicles: [],
      stacks: [-5, -2, 3, 6].map((col, i) => ({ col, height: 1 + (i % 3), colorIndex: i })) };
  }
  dh.rows[row] = { index: row, type: 'crane', theme: 'port', stacks: [], decor: [], cards: [],
    vehicles: [], cranes: [{ x: 0, prevX: 0, speed: 0, direction: 1 }] };
  dh.teleport(row - 2, 0);
  dh.runtime.invulnTimer = 9999;
});
await page.waitForTimeout(700);

/** Aplica ajustes a la luz direccional y captura */
async function shot(name: string, cfg: Record<string, number>) {
  const applied = await page.evaluate((cfg) => {
    const dh = (window as any).__DH;
    let light: any = null;
    dh.scene.traverse((o: any) => {
      if (o.isDirectionalLight && o.castShadow) light = o;
    });
    if (!light) return null;
    const s = light.shadow;
    if (cfg.mapSize && s.mapSize.x !== cfg.mapSize) {
      s.mapSize.set(cfg.mapSize, cfg.mapSize);
      s.map?.dispose();
      s.map = null;
    }
    s.bias = cfg.bias;
    s.normalBias = cfg.normalBias;
    s.camera.near = cfg.near;
    s.camera.far = cfg.far;
    s.camera.left = -cfg.half;
    s.camera.right = cfg.half;
    s.camera.top = cfg.half;
    s.camera.bottom = -cfg.half;
    s.camera.updateProjectionMatrix();
    s.needsUpdate = true;
    return { mapSize: s.mapSize.x, bias: s.bias, normalBias: s.normalBias, near: s.camera.near, far: s.camera.far };
  }, cfg);
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${OUT}/${name}.png` });
  console.log(name, applied);
}

// (0) tal cual lo configura el juego, sin tocar nada
await page.screenshot({ path: `${OUT}/0-defecto.png` });
console.log(
  '0-defecto',
  await page.evaluate(() => {
    const dh = (window as any).__DH;
    let s: any = null;
    dh.scene.traverse((o: any) => {
      if (o.isDirectionalLight && o.castShadow) s = o.shadow;
    });
    return s && { mapSize: s.mapSize.x, bias: s.bias, normalBias: s.normalBias, near: s.camera.near, far: s.camera.far };
  }),
);

// (a) el ajuste anterior, con `bias` negativo: sombra despegada de la base
await shot('a-actual', { mapSize: 1024, bias: -0.0012, normalBias: 0, near: 0.5, far: 500, half: 12 });
// (b) sin bias negativo, con normalBias (quita acné sin despegar la sombra)
await shot('b-normalbias', { mapSize: 1024, bias: 0, normalBias: 0.04, near: 0.5, far: 500, half: 12 });
// (c) + rango de profundidad ceñido (precisión del depth map)
await shot('c-rango', { mapSize: 1024, bias: 0, normalBias: 0.04, near: 1, far: 34, half: 12 });
// (d) + mapa de 2048
await shot('d-2048', { mapSize: 2048, bias: 0, normalBias: 0.04, near: 1, far: 34, half: 12 });

await browser.close();
console.log('capturas en', OUT);
