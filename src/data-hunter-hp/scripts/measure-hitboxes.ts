/**
 * Mide la CAJA REAL DIBUJADA de cada obstáculo que resta vida (camión, AGV,
 * montacargas, tren, patas de la grúa RTG) directamente sobre las mallas de la
 * escena, y la compara con la hitbox que evalúa `traffic.ts`.
 *
 * Sirve de contraste objetivo para el Problema 2: si la hitbox es más ancha que
 * el modelo, el jugador recibe golpes que "claramente esquivó".
 *
 *   npx tsx scripts/measure-hitboxes.ts [url]
 */
import { mkdirSync } from 'node:fs';
import { chromium } from 'playwright';

const URL = process.argv[2] ?? 'http://localhost:5173/?debug';
const TILE = 1.1;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
page.on('pageerror', (e) => console.error('[pageerror]', String(e)));
await page.goto(URL, { waitUntil: 'networkidle' });
await page.getByRole('button', { name: 'Jugar', exact: true }).click();
await page.waitForTimeout(250);
await page.getByRole('button', { name: 'A jugar' }).click();
await page.waitForTimeout(1500);

const CASES = [
  { kind: 'truck', tiles: 5, type: 'road', theme: 'port' },
  { kind: 'agv', tiles: 3, type: 'road', theme: 'port' },
  { kind: 'forklift', tiles: 2, type: 'road', theme: 'shipyard' },
  { kind: 'train', tiles: 10, type: 'rail', theme: 'rail' },
  { kind: 'hopper', tiles: 4, type: 'road', theme: 'multi' },
  { kind: 'loader', tiles: 3, type: 'road', theme: 'multi' },
] as const;

const out: any[] = [];

for (const [i, c] of CASES.entries()) {
  const row = 14 + i * 2;
  const measured = await page.evaluate(
    ([row, kind, tiles, type, theme]: any) => {
      const dh = (window as any).__DH;
      dh.teleport(row - 3, 0);
      // Aislar la fila: las vecinas se vacían para que sus mallas no contaminen
      for (let r = row - 2; r <= row + 2; r++) {
        dh.rows[r] = { index: r, type: 'yard', theme: 'port', stacks: [], decor: [], cards: [], cranes: [], vehicles: [] };
      }
      dh.rows[row] = {
        index: row, type, theme,
        stacks: [], decor: [], cards: [], cranes: [],
        vehicles: [{ x: 0, tiles, speed: 0, direction: 1, kind, colorIndex: 0 }],
      };
      dh.teleport(row - 2, 0);
      return new Promise((res) =>
        setTimeout(() => {
          const rz = -row * 1.1;
          let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity, n = 0;
          dh.scene.traverse((o: any) => {
            if (!o.isMesh || !o.geometry || !o.visible) return;
            if (!o.geometry.boundingBox) o.geometry.computeBoundingBox();
            const bb = o.geometry.boundingBox.clone().applyMatrix4(o.matrixWorld);
            // Descartar suelos/decorado: cajas enormes o fuera de la fila
            if (bb.max.x - bb.min.x > 12 || bb.max.z - bb.min.z > 4) return;
            const cz = (bb.min.z + bb.max.z) / 2;
            const cx = (bb.min.x + bb.max.x) / 2;
            if (Math.abs(cz - rz) > 0.7 || Math.abs(cx) > 8) return;
            if (bb.max.y < 0.02) return; // suelo
            if (bb.min.y > 2) return; // gaviotas y estructuras aéreas
            x0 = Math.min(x0, bb.min.x); x1 = Math.max(x1, bb.max.x);
            z0 = Math.min(z0, bb.min.z - rz); z1 = Math.max(z1, bb.max.z - rz);
            n++;
          });
          res({ meshes: n, halfX: +Math.max(-x0, x1).toFixed(2), halfZ: +Math.max(-z0, z1).toFixed(2) });
        }, 500),
      );
    },
    [row, c.kind, c.tiles, c.type, c.theme] as any,
  );

  const m = measured as any;
  const hitbox = (c.tiles * TILE) / 2 + 0.22; // halfLen + HIT_MARGIN actual
  out.push({
    obstáculo: c.kind,
    dibujado: m.halfX,
    hitboxActual: +hitbox.toFixed(2),
    exceso: +(hitbox - m.halfX).toFixed(2),
    dibujadoZ: m.halfZ,
    mallas: m.meshes,
  });
}

// Patas de la grúa RTG
const crane = await page.evaluate(() => {
  const dh = (window as any).__DH;
  const row = 24;
  dh.teleport(row - 3, 0);
  for (let r = row - 2; r <= row + 2; r++) {
    dh.rows[r] = { index: r, type: 'yard', theme: 'port', stacks: [], decor: [], cards: [], cranes: [], vehicles: [] };
  }
  dh.rows[row] = { index: row, type: 'crane', theme: 'port', stacks: [], decor: [], cards: [],
    vehicles: [], cranes: [{ x: 0, speed: 0, direction: 1 }] };
  dh.teleport(row - 1, 0);
  return new Promise((res) =>
    setTimeout(() => {
      const rz = -row * 1.1;
      const LEG = 1.65;
      let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
      // Se mide VÉRTICE a vértice, no por caja de malla: desde que los modelos
      // se fusionan (src/render/boxes.ts) la RTG entera es una sola malla, y su
      // caja envolvente abarca de pata a pata. Filtrando vértices se sigue
      // aislando la estructura baja de UNA pata, que es lo que atropella.
      dh.scene.traverse((o: any) => {
        if (!o.isMesh || !o.geometry || !o.visible) return;
        const pos = o.geometry.attributes?.position;
        if (!pos) return;
        const e = o.matrixWorld.elements; // columna-mayor, sin depender de THREE
        for (let i = 0; i < pos.count; i++) {
          const px = pos.getX(i), py = pos.getY(i), pz = pos.getZ(i);
          const wx = e[0] * px + e[4] * py + e[8] * pz + e[12];
          const wy = e[1] * px + e[5] * py + e[9] * pz + e[13];
          const wz = e[2] * px + e[6] * py + e[10] * pz + e[14];
          // Solo la estructura BAJA de la pata derecha: altura < 1 m y dentro
          // del entorno de la pata
          if (Math.abs(wz - rz) > 1 || Math.abs(wx - LEG) > 0.8 || wy > 1) continue;
          x0 = Math.min(x0, wx - LEG); x1 = Math.max(x1, wx - LEG);
          z0 = Math.min(z0, wz - rz); z1 = Math.max(z1, wz - rz);
        }
      });
      res({ halfX: +Math.max(-x0, x1).toFixed(2), halfZ: +Math.max(-z0, z1).toFixed(2) });
    }, 500),
  );
});

const cr = crane as any;
out.push({
  obstáculo: 'pata RTG',
  dibujado: cr.halfX,
  hitboxActual: 0.48, // CRANE_LEG_RADIUS
  exceso: +(0.48 - cr.halfX).toFixed(2),
  dibujadoZ: cr.halfZ,
  mallas: '-',
});

console.table(out);

// Captura del visor de hitboxes (tecla H) sobre camión + grúa, para comprobar
// a ojo que las cajas encajan con los modelos.
mkdirSync('scripts/hitbox-out', { recursive: true });
await page.evaluate(() => {
  const dh = (window as any).__DH;
  dh.teleport(28, 0);
  for (let r = 29; r <= 33; r++) {
    dh.rows[r] = { index: r, type: 'yard', theme: 'port', stacks: [], decor: [], cards: [], cranes: [], vehicles: [] };
  }
  dh.rows[30] = { index: 30, type: 'road', theme: 'port', stacks: [], decor: [], cards: [], cranes: [],
    vehicles: [{ x: -1.2, prevX: -1.2, tiles: 5, speed: 0, direction: 1, kind: 'truck', colorIndex: 0 }] };
  dh.rows[32] = { index: 32, type: 'crane', theme: 'port', stacks: [], decor: [], cards: [], vehicles: [],
    cranes: [{ x: 0.6, prevX: 0.6, speed: 0, direction: 1 }] };
  dh.teleport(29, 0);
  dh.runtime.invulnTimer = 9999;
  dh.debug.hitboxes = true;
});
await page.waitForTimeout(700);
await page.screenshot({ path: 'scripts/hitbox-out/hitboxes.png' });
console.log('captura del visor: scripts/hitbox-out/hitboxes.png');

await browser.close();
