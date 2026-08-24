/**
 * Captura del DIQUE VERTICAL: localiza una cabeza de dique en el astillero,
 * teletransporta al colaborador a la fila anterior y captura el encuadre para
 * revisar el foso a lo largo, el buque apeado y la cadena de andamios.
 *
 *   npx tsx scripts/vdock-shot.ts [url]
 */
import { mkdirSync } from 'node:fs';
import { chromium } from 'playwright';

const URL = process.argv[2] ?? 'http://localhost:5199/?debug';
const OUT = 'scripts/dock-out';
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

const info = await page.evaluate(() => {
  const dh = (window as any).__DH;
  dh.teleport(200, 0);
  const cabezas: any[] = [];
  for (const r of dh.rows) {
    for (const d of r.docks ?? []) {
      if (d.len && !d.mega) cabezas.push({ fila: r.index, col: d.col, tiles: d.tiles, len: d.len, bridge: d.bridge, ship: d.ship });
    }
  }
  return cabezas;
});
console.log('cabezas de dique vertical:', JSON.stringify(info.slice(0, 6), null, 1));
if (!info.length) {
  console.error('ERROR: no hay diques verticales generados');
  process.exit(1);
}

// Encuadrar el primero con buque (o el primero a secas): el jugador se planta
// en la fila anterior a la cabeza, pegado al dique, y se deja asentar la cámara
const target = info.find((d: any) => d.ship && d.len >= 3) ?? info[0];
await page.evaluate((t) => {
  const dh = (window as any).__DH;
  dh.teleport(t.fila - 1, Math.max(-8, Math.min(8, t.col - 1)));
}, target);
await page.waitForTimeout(2500);
await page.screenshot({ path: `${OUT}/vdock.png` });

// CRUCE REAL por la cadena de andamios: el jugador se planta en la columna de
// la pasarela, una fila antes, y sube saltando de andamio en andamio. Es la
// prueba de que el dique es jugable y no solo bonito.
await page.evaluate((t) => {
  const dh = (window as any).__DH;
  dh.teleport(t.fila - 1, t.bridge);
}, target);
await page.waitForTimeout(1200);
await page.screenshot({ path: `${OUT}/vdock-cruce-0.png` });
for (let i = 0; i < target.len; i++) {
  await page.keyboard.press('ArrowUp');
  await page.waitForTimeout(320);
}
await page.waitForTimeout(900);
await page.screenshot({ path: `${OUT}/vdock-cruce-1.png` });
const cruce = await page.evaluate(() => {
  const dh = (window as any).__DH;
  return { row: dh.runtime.row, col: dh.runtime.col, y: +dh.runtime.y.toFixed(2) };
});
console.log('tras cruzar la cadena:', JSON.stringify(cruce), '(esperado fila', target.fila + target.len - 1, ')');
if (cruce.row < target.fila + target.len - 1) {
  console.error('ERROR: el jugador se quedó atascado en la cadena de andamios');
  process.exit(1);
}

// Última captura con la cámara libre de debug, orbitada y con zoom
await page.keyboard.press('KeyC');
await page.keyboard.press('Equal');
await page.keyboard.press('BracketRight');
await page.keyboard.press('BracketRight');
await page.waitForTimeout(800);
await page.screenshot({ path: `${OUT}/vdock-close.png` });
console.log(`captura: ${OUT}/vdock.png · dique fila ${target.fila} len ${target.len} ship ${target.ship}`);
await browser.close();
