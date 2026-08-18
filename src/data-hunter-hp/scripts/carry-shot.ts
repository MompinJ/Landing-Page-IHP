/**
 * Captura del IZADO de la grúa del dique mayor en pleno viaje: el colaborador
 * se planta en el PUNTO DE EMBARQUE, avanza, y se fotografían las tres fases
 * (izando, trasladando colgado, aventado).
 *
 *   npx tsx scripts/carry-shot.ts [url]
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
await page.getByRole('button', { name: 'Iniciar misión' }).click();
await page.waitForTimeout(1200);

const pad = await page.evaluate(() => {
  const dh = (window as any).__DH;
  dh.teleport(160, 0);
  const mega = dh.rows.find((r: any) => r.docks?.some((d: any) => d.mega) && r.padCol !== undefined);
  if (!mega) return null;
  dh.teleport(mega.index - 1, mega.padCol);
  return { fila: mega.index, col: mega.padCol };
});
if (!pad) {
  console.error('ERROR: no hay dique mayor generado');
  process.exit(1);
}
console.log(`pad de embarque: fila ${pad.fila - 1}, col ${pad.col}`);
await page.waitForTimeout(2200);
await page.screenshot({ path: `${OUT}/carry-0-pad.png` });

await page.keyboard.press('ArrowUp');
await page.waitForTimeout(420); // fase de izado (0..0.51 s)
await page.screenshot({ path: `${OUT}/carry-1-izando.png` });
await page.waitForTimeout(500); // traslado colgado
await page.screenshot({ path: `${OUT}/carry-2-colgado.png` });
await page.waitForTimeout(450); // aventado
await page.screenshot({ path: `${OUT}/carry-3-aventado.png` });
await page.waitForTimeout(700);
const fin = await page.evaluate(() => {
  const dh = (window as any).__DH;
  return { row: dh.runtime.row, carrying: dh.runtime.carrying };
});
console.log('tras el viaje:', JSON.stringify(fin));
if (fin.row !== pad.fila + 1) {
  console.error(`ERROR: debía aterrizar en ${pad.fila + 1} y está en ${fin.row}`);
  process.exit(1);
}
console.log(`capturas en ${OUT}/carry-*.png`);
await browser.close();
