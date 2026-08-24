/**
 * Captura de la PANTALLA FINAL con el pasaporte de terminales: una toma con
 * las cinco selladas y otra con solo dos, que es el caso normal de una partida
 * de stand (y donde antes el contador prometía un recorrido que no se hizo).
 *
 *   npx tsx scripts/gameover-shot.ts [url]
 */
import { mkdirSync } from 'node:fs';
import { chromium } from 'playwright';

const URL = process.argv[2] ?? 'http://localhost:5173/?debug';
const OUT = 'scripts/dock-out';
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({
  args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'],
});
const page = await browser.newPage({ viewport: { width: 1500, height: 950 } });
page.on('pageerror', (e) => console.error('[pageerror]', String(e)));
await page.goto(URL, { waitUntil: 'networkidle' });
await page.getByRole('button', { name: 'Jugar', exact: true }).click();
await page.waitForTimeout(250);
await page.getByRole('button', { name: 'A jugar' }).click();
await page.waitForTimeout(1200);

async function capturar(unidades: string[], nombre: string) {
  await page.evaluate((us) => {
    const dh = (window as any).__DH;
    const s = dh.store.getState();
    s.startGame();
    for (const u of us) dh.store.getState().stampUnit(u);
    dh.store.getState().endGame();
  }, unidades);
  await page.waitForTimeout(900);
  await page.screenshot({ path: `${OUT}/${nombre}.png` });
  const texto = await page.locator('.passport').innerText();
  console.log(`${nombre}: ${JSON.stringify(texto)}`);
}

await capturar(['port', 'multi', 'cruise', 'shipyard', 'rail'], 'gameover-pasaporte-completo');
await capturar(['port', 'multi'], 'gameover-pasaporte-parcial');

console.log(`capturas en ${OUT}/gameover-*.png`);
await browser.close();
