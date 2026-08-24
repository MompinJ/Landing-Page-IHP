/**
 * Captura de la PASARELA ALTA (TallScaffold) sobre el buque del dique mayor.
 * Saca la vista de juego y varias órbitas de cámara libre para ver el tablón.
 *
 *   npx tsx scripts/scaffold-shot.ts [url]
 */
import { mkdirSync } from 'node:fs';
import { chromium } from 'playwright';

const URL = process.argv[2] ?? 'http://localhost:5173/?debug';
const OUT = 'scripts/scaffold-out';
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({
  args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'],
});
const page = await browser.newPage({ viewport: { width: 1500, height: 900 } });
page.on('pageerror', (e) => console.error('[pageerror]', String(e)));
await page.goto(URL, { waitUntil: 'networkidle' });
await page.getByRole('button', { name: 'Jugar', exact: true }).click();
await page.waitForTimeout(250);
await page.getByRole('button', { name: 'A jugar' }).click();
await page.waitForTimeout(1500);

const donde = await page.evaluate(() => {
  const dh = (window as any).__DH;
  dh.teleport(200, 0);
  const i = dh.rows.findIndex((r: any) => r.docks?.some((d: any) => d.mega));
  if (i < 0) return null;
  const sc = dh.rows[i].scaffolds;
  dh.teleport(i - 1, sc[1].col);
  dh.runtime.invulnTimer = 9999;
  return { fila: i, scaffolds: sc, padCol: dh.rows[i].padCol, docks: dh.rows[i].docks };
});
console.log('mega dock:', JSON.stringify(donde));
await page.waitForTimeout(900);
await page.screenshot({ path: `${OUT}/juego.png` });

// HOLGURA: el punto más alto del buque tiene que quedar por DEBAJO de la cara
// inferior del tablón. Si no, las dos caras se pelean por el píxel y sale el
// parche gris sobre la pasarela (era el fallo con WALK_Y = 2.45).
const holgura = await page.evaluate(() => {
  const dh = (window as any).__DH;
  let topBuque = -Infinity;
  dh.scene.traverse((o: any) => {
    if (o.name !== 'megadock') return;
    o.geometry.computeBoundingBox();
    topBuque = Math.max(topBuque, o.geometry.boundingBox.max.y);
  });
  // La cota la da la propia fila (es BALANCE.MEGADOCK_WALK_Y), sin duplicarla
  const i = dh.rows.findIndex((r: any) => r.docks?.some((d: any) => d.mega));
  return { topBuque, walkY: dh.rows[i].scaffolds[0].y as number };
});
const PLANK = 0.08; // grosor del tablón de tallScaffoldParts
const suelo = +(holgura.walkY - PLANK).toFixed(3);
const aire = +(suelo - holgura.topBuque).toFixed(3);
console.log(`buque remata en ${holgura.topBuque}, tablón arranca en ${suelo} → aire ${aire}`);
if (!(aire > 0.05)) {
  console.error('FALLO: el buque llega a la cota del tablón — habrá z-fighting en la pasarela');
  process.exitCode = 1;
}

// PEOR CASO: pasarela forzada a la columna −3, justo sobre la caseta de cubierta
// de x = −3.2 (es la pareja que producía el parche gris en el tablón).
await page.evaluate(() => {
  const dh = (window as any).__DH;
  const i = dh.rows.findIndex((r: any) => r.docks?.some((d: any) => d.mega));
  dh.rows[i].scaffolds[0].col = -3;
  dh.teleport(i - 1, -3);
});
await page.waitForTimeout(900);
await page.screenshot({ path: `${OUT}/peor-caso.png` });

// Órbita libre alrededor de la pasarela
for (const [nombre, yaw, height, zoom] of [
  ['orbit-0', 0.25, 6.5, 150],
  ['orbit-1', 0.75, 6.5, 150],
  ['orbit-2', 1.25, 6.5, 150],
  ['cenital', 0.25, 14, 150],
  ['rasante', 0.25, 3.2, 150],
] as [string, number, number, number][]) {
  await page.evaluate(
    ([yaw, height, zoom]) => {
      const dh = (window as any).__DH;
      dh.debug.freeCam = true;
      dh.debug.yaw = Math.PI * yaw;
      dh.debug.height = height;
      dh.debug.zoom = zoom;
    },
    [yaw, height, zoom],
  );
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${OUT}/${nombre}.png` });
}

await browser.close();
console.log('capturas en', OUT);
