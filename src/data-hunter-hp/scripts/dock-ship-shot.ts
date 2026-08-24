/**
 * Captura del DIQUE CON BUQUE MEDIANO: comprueba que cae hacia el centro del
 * tablero, que tapa el paso de verdad (sin pasarela) y que queda hueco a los
 * dos costados para rodearlo.
 *
 *   npx tsx scripts/dock-ship-shot.ts [url]
 */
import { mkdirSync } from 'node:fs';
import { chromium } from 'playwright';

const URL = process.argv[2] ?? 'http://localhost:5173/?debug';
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

// Inventario: cuántos diques con buque salen y dónde caen
const inventario = await page.evaluate(() => {
  const dh = (window as any).__DH;
  dh.teleport(200, 0); // fuerza generación de bastantes filas
  const conBuque: any[] = [];
  const conPasarela: any[] = [];
  for (const r of dh.rows) {
    for (const d of r.docks ?? []) (d.ship ? conBuque : conPasarela).push({ fila: r.index, col: d.col, tiles: d.tiles });
  }
  const huecos = conBuque.map((d) => Math.min(d.col - -8, 8 - (d.col + d.tiles - 1)));
  return {
    conBuque: conBuque.length,
    conPasarela: conPasarela.length,
    centroMedio: +(conBuque.reduce((s, d) => s + d.col + (d.tiles - 1) / 2, 0) / conBuque.length).toFixed(2),
    huecoMinimo: Math.min(...huecos),
  };
});
console.log('diques generados:', inventario);

// Colocar al jugador justo delante de una fila con dique-buque
const donde = await page.evaluate(() => {
  const dh = (window as any).__DH;
  const i = dh.rows.findIndex((r: any) => r.docks?.some((d: any) => d.ship));
  if (i < 0) return null;
  const d = dh.rows[i].docks.find((x: any) => x.ship);
  dh.teleport(i - 1, d.col + Math.floor(d.tiles / 2));
  dh.runtime.invulnTimer = 9999;
  return { fila: i, dock: d };
});
console.log('fila capturada:', donde);
await page.waitForTimeout(900);
await page.screenshot({ path: `${OUT}/dique-buque.png` });

// El dique debe BLOQUEAR todas sus casillas (ninguna pasarela)
const bloqueo = await page.evaluate(() => {
  const dh = (window as any).__DH;
  const i = dh.rows.findIndex((r: any) => r.docks?.some((d: any) => d.ship));
  const d = dh.rows[i].docks.find((x: any) => x.ship);
  const cols = Array.from({ length: d.tiles }, (_, k) => d.col + k);
  return {
    fila: i,
    cols,
    bloqueadas: cols.filter((c) => dh.rows[i].docks.some((x: any) => c >= x.col && c < x.col + x.tiles && c !== x.bridge)),
    alturaDePisado: cols.map((c) => (dh.rows[i].scaffolds ?? []).some((s: any) => s.col === c)),
  };
});
console.log('bloqueo:', bloqueo);

await browser.close();
console.log('captura en', OUT);
