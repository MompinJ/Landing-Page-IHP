/**
 * Primer plano de las ESTELAS de la flota: comprueba que la espuma se difumina
 * y que no corta el casco por popa.
 *
 *   npx tsx scripts/wake-shot.ts [etiqueta]
 */
import { mkdirSync } from 'node:fs';
import { chromium } from 'playwright';

const tag = process.argv[2] ?? 'estela';
const OUT = 'scripts/wake-out';
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1600, height: 900 }, deviceScaleFactor: 2 });
page.on('pageerror', (e) => console.error('[pageerror]', String(e)));
page.on('console', (m) => m.type() === 'error' && console.error('[console]', m.text()));
await page.goto('http://localhost:5173/?debug&daily', { waitUntil: 'networkidle' });
await page.getByRole('button', { name: 'Iniciar misión' }).click();
await page.waitForTimeout(1500);

// Fila de agua con flota pequeña, con los barcos centrados y quietos
const info = await page.evaluate(`(() => {
  const dh = window.__DH;
  const fila = dh.rows.find((r, i) => i > 26 && r.type === 'water' && r.vehicles.some(v => ['tug','yacht','fish','sail'].includes(v.kind)));
  if (!fila) return null;
  fila.vehicles.forEach((v, i) => { v.x = v.prevX = (i - (fila.vehicles.length - 1) / 2) * 4.5; });
  dh.teleport(fila.index, 0);
  dh.runtime.invulnTimer = 9999;
  return { fila: fila.index, barcos: fila.vehicles.map(v => v.kind + '@' + v.speed.toFixed(2)) };
})()`);
console.log(info);
await page.waitForTimeout(900);
await page.screenshot({ path: `${OUT}/${tag}-flota.png` });
await page.screenshot({ path: `${OUT}/${tag}-zoom.png`, clip: { x: 830, y: 470, width: 500, height: 300 } });
await browser.close();
console.log('capturas en', OUT);
