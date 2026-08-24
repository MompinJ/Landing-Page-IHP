/**
 * Capturas de la TERMINAL DE CRUCEROS (ECV): comprueba que los cruceros
 * decorativos ya no se amontonan y que el jugador puede ir montado en uno.
 *
 *   npx tsx scripts/cruise-shot.ts [url]
 */
import { mkdirSync } from 'node:fs';
import { chromium } from 'playwright';

const URL = process.argv[2] ?? 'http://localhost:5173/?debug';
const OUT = 'scripts/cruise-out';
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
page.on('pageerror', (e) => console.error('[pageerror]', String(e)));
page.on('console', (m) => m.type() === 'error' && console.error('[console]', m.text()));
await page.goto(URL, { waitUntil: 'networkidle' });
await page.getByRole('button', { name: 'Jugar', exact: true }).click();
await page.waitForTimeout(250);
await page.getByRole('button', { name: 'A jugar' }).click();
await page.waitForTimeout(1500);

// El bioma 'cruise' ocupa las filas 26..51
for (const row of [28, 32, 36, 40]) {
  await page.evaluate((r) => {
    const dh = (window as any).__DH;
    dh.teleport(r, 0);
    dh.runtime.invulnTimer = 9999;
  }, row);
  await page.waitForTimeout(700);
  await page.screenshot({ path: `${OUT}/fila-${row}.png` });
}

// Buscar una fila con crucero abordable y colocar al jugador ENCIMA
const boarded = await page.evaluate(() => {
  const dh = (window as any).__DH;
  const idx = dh.rows.findIndex(
    (r: any, i: number) => i > 26 && r.type === 'water' && r.vehicles.some((v: any) => v.kind === 'ship'),
  );
  if (idx < 0) return null;
  const ship = dh.rows[idx].vehicles.find((v: any) => v.kind === 'ship');
  ship.x = ship.prevX = 0; // crucero centrado
  dh.teleport(idx, 0);
  dh.runtime.invulnTimer = 9999;
  return { row: idx, ships: dh.rows[idx].vehicles.length };
});
console.log('fila con crucero abordable:', boarded);
await page.waitForTimeout(900);
await page.screenshot({ path: `${OUT}/montado-en-crucero.png` });

const riding = await page.evaluate(() => ({
  riding: (window as any).__DH.runtime.riding,
  rideY: (window as any).__DH.runtime.rideY,
  vidas: (window as any).__DH.store.getState().lives,
}));
console.log('estado:', riding);

await browser.close();
console.log('capturas en', OUT);
