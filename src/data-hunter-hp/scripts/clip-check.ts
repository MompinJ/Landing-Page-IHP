/**
 * Comprobación de RECORTE de geometría (Problema 1) — A/B determinista.
 *
 * En una misma sesión y sobre el MISMO fotograma alterna el plano `near` de la
 * cámara ortográfica entre el valor viejo (0.1) y el nuevo, mide cuántas mallas
 * visibles EN PANTALLA cruzan el plano, y guarda las dos capturas.
 *
 *   npx tsx scripts/clip-check.ts [url]
 */
import { mkdirSync } from 'node:fs';
import { chromium } from 'playwright';

const URL = process.argv[2] ?? 'http://localhost:5173/?debug&daily';
const OUT = 'scripts/clip-out';
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
page.on('pageerror', (e) => console.error('[pageerror]', String(e)));
page.on('console', (m) => m.type() === 'error' && console.error('[console]', m.text()));
await page.goto(URL, { waitUntil: 'networkidle' });
await page.getByRole('button', { name: 'Jugar', exact: true }).click();
await page.waitForTimeout(250);
await page.getByRole('button', { name: 'A jugar' }).click();
await page.waitForTimeout(1500);

// Grúa RTG fija en la fila 22, junto a la STS monumental de la fila 20
await page.evaluate(() => {
  const dh = (window as any).__DH;
  dh.teleport(20, 0);
  dh.rows[22] = {
    index: 22, type: 'crane', theme: 'port',
    stacks: [], decor: dh.rows[22]?.decor ?? [], vehicles: [], cards: [],
    cranes: [{ x: 2.2, speed: 0, direction: 1 }],
  };
});

/** Mallas visibles que cruzan `near` y solapan la caja ortográfica en pantalla */
async function probe(near: number, far: number) {
  return page.evaluate(
    ([near, far]) => {
      const dh = (window as any).__DH;
      const cam = dh.camera;
      cam.near = near;
      cam.far = far;
      cam.updateProjectionMatrix();
      cam.updateMatrixWorld();
      const inv = cam.matrixWorldInverse;
      const halfW = (cam.right - cam.left) / 2 / cam.zoom;
      const halfH = (cam.top - cam.bottom) / 2 / cam.zoom;
      let clipped = 0;
      let worst = Infinity;
      dh.scene.traverse((o: any) => {
        if (!o.isMesh || !o.geometry || !o.visible) return;
        if (!o.geometry.boundingBox) o.geometry.computeBoundingBox();
        const bb = o.geometry.boundingBox.clone().applyMatrix4(o.matrixWorld);
        const V = o.position.constructor as any;
        // AABB del mesh en espacio de cámara → solape con la caja de pantalla
        let lo = Infinity, xa = Infinity, xb = -Infinity, ya = Infinity, yb = -Infinity;
        for (let i = 0; i < 8; i++) {
          const p = new V(i & 1 ? bb.max.x : bb.min.x, i & 2 ? bb.max.y : bb.min.y, i & 4 ? bb.max.z : bb.min.z)
            .applyMatrix4(inv);
          lo = Math.min(lo, -p.z);
          xa = Math.min(xa, p.x); xb = Math.max(xb, p.x);
          ya = Math.min(ya, p.y); yb = Math.max(yb, p.y);
        }
        const onScreen = xb >= -halfW && xa <= halfW && yb >= -halfH && ya <= halfH;
        if (onScreen && lo < cam.near) { clipped++; worst = Math.min(worst, lo); }
      });
      return { near: cam.near, far: cam.far, clipped, worst: Number.isFinite(worst) ? +worst.toFixed(2) : null };
    },
    [near, far],
  );
}

const rows: any[] = [];
for (const [row, col] of [[20, 0], [22, 0], [24, -4], [26, -8], [30, 4]] as const) {
  await page.evaluate(([r, c]) => {
    const dh = (window as any).__DH;
    dh.teleport(r, c);
    dh.runtime.invulnTimer = 999;
  }, [row, col]);
  await page.waitForTimeout(350);
  // Congelar el mundo: el A/B debe ser el MISMO fotograma
  await page.evaluate(() => {
    for (const r of (window as any).__DH.rows) {
      for (const v of r.vehicles) v.speed = 0;
      for (const c of r.cranes) c.speed = 0;
    }
  });
  await page.waitForTimeout(150);

  const antes = await probe(0.1, 100);
  await page.screenshot({ path: `${OUT}/r${row}c${col}-antes.png` });
  const despues = await probe(-50, 200);
  await page.screenshot({ path: `${OUT}/r${row}c${col}-despues.png` });

  rows.push({ pos: `fila ${row} col ${col}`, antes: antes.clipped, antesPeor: antes.worst, despues: despues.clipped });
}

console.table(rows);
await browser.close();
