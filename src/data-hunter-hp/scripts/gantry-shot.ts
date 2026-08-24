/**
 * Capturas del ASTILLERO (TNG): comprueba las filas de GRÚA PÓRTICO (carga que
 * barre el taller), los ANDAMIOS de refugio y las PASARELAS que cruzan los
 * diques. Verifica además que subirse a un andamio salva de la grúa.
 *
 *   npx tsx scripts/gantry-shot.ts [url]
 */
import { mkdirSync } from 'node:fs';
import { chromium } from 'playwright';

const URL = process.argv[2] ?? 'http://localhost:5173/?debug';
const OUT = 'scripts/gantry-out';
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

// Inventario de lo que generó el astillero (filas 52..77)
const inventario = await page.evaluate(() => {
  const dh = (window as any).__DH;
  const filas = dh.rows.filter((r: any) => r.theme === 'shipyard');
  return {
    filas: filas.length,
    gantry: filas.filter((r: any) => r.type === 'gantry').length,
    rtg: filas.filter((r: any) => r.type === 'crane').length,
    conDique: filas.filter((r: any) => r.docks?.length).length,
    andamios: filas.reduce((n: number, r: any) => n + (r.scaffolds?.length ?? 0), 0),
  };
});
console.log('astillero:', inventario);

// Capturas sobre la primera fila de grúa pórtico y sobre un dique con pasarela
const gantryRow = await page.evaluate(() => {
  const dh = (window as any).__DH;
  const i = dh.rows.findIndex((r: any) => r.type === 'gantry');
  if (i < 0) return null;
  dh.teleport(i - 1, dh.rows[i].scaffolds[0]?.col ?? 0);
  dh.runtime.invulnTimer = 9999;
  return { row: i, scaffolds: dh.rows[i].scaffolds.map((s: any) => s.col) };
});
console.log('fila de grúa pórtico:', gantryRow);
await page.waitForTimeout(900);
await page.screenshot({ path: `${OUT}/portico.png` });

// Subirse al andamio y comprobar que la grúa pasa por debajo sin golpear
const refugio = await page.evaluate(async () => {
  const dh = (window as any).__DH;
  const i = dh.rows.findIndex((r: any) => r.type === 'gantry');
  const col = dh.rows[i].scaffolds[0].col;
  dh.teleport(i, col);
  dh.runtime.invulnTimer = 0;
  const vidas0 = dh.store.getState().lives;
  const puntos0 = dh.store.getState().score;
  // Colocar la carga justo encima del andamio
  dh.rows[i].cranes[0].x = col * 1.1;
  dh.rows[i].cranes[0].prevX = col * 1.1;
  await new Promise((r) => setTimeout(r, 1200));
  return {
    fila: i,
    col,
    golpeado: dh.store.getState().lives !== vidas0 || dh.store.getState().score < puntos0,
    filaJugador: dh.runtime.row,
  };
});
console.log('refugio en andamio:', refugio);
await page.screenshot({ path: `${OUT}/andamio.png` });

// Misma prueba a ras de suelo: ahí SÍ debe atropellar
const suelo = await page.evaluate(async () => {
  const dh = (window as any).__DH;
  const i = dh.rows.findIndex((r: any) => r.type === 'gantry');
  const scaffolds = dh.rows[i].scaffolds.map((s: any) => s.col);
  let col = 0;
  while (scaffolds.includes(col)) col++;
  dh.teleport(i, col);
  dh.runtime.invulnTimer = 0;
  const puntos0 = dh.store.getState().score;
  dh.rows[i].cranes[0].x = col * 1.1;
  dh.rows[i].cranes[0].prevX = col * 1.1;
  await new Promise((r) => setTimeout(r, 800));
  return { col, golpeado: dh.store.getState().score < puntos0 };
});
console.log('a ras de suelo:', suelo);

// Dique con pasarela
const dique = await page.evaluate(() => {
  const dh = (window as any).__DH;
  const i = dh.rows.findIndex((r: any) => r.docks?.length && r.index > 52);
  if (i < 0) return null;
  const d = dh.rows[i].docks[0];
  dh.teleport(i, d.bridge);
  dh.runtime.invulnTimer = 9999;
  return { row: i, dock: d };
});
console.log('dique con pasarela:', dique);
await page.waitForTimeout(900);
await page.screenshot({ path: `${OUT}/dique-pasarela.png` });

await browser.close();
console.log('capturas en', OUT);
