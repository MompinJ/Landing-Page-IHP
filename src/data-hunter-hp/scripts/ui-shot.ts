/**
 * Capturas de las TRES pantallas de interfaz: portada, cartel de entrada a
 * terminal y pantalla final. Sirve para revisar que las tres comparten el
 * mismo lenguaje gráfico (barra azul, bisel, cursivas a dos tonos).
 *
 *   npx tsx scripts/ui-shot.ts [url]
 */
import { mkdirSync } from 'node:fs';
import { chromium } from 'playwright';

const URL = process.argv[2] ?? 'http://localhost:5173/?debug';
const OUT = 'scripts/ui-out';
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({
  args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'],
});
const page = await browser.newPage({ viewport: { width: 1500, height: 950 } });
page.on('pageerror', (e) => console.error('[pageerror]', String(e)));
await page.goto(URL, { waitUntil: 'networkidle' });

await page.waitForTimeout(600);
await page.screenshot({ path: `${OUT}/1-portada.png` });

// Cartel de arranque (la terminal donde aparece el jugador)
await page.getByRole('button', { name: 'Iniciar misión' }).click();
await page.waitForTimeout(700);
await page.screenshot({ path: `${OUT}/2-cartel-inicio.png` });
console.log('cartel inicio:', JSON.stringify(await page.locator('.term-sign').innerText()));

// Cartel de una terminal nueva, con sello
await page.evaluate(() => {
  const dh = (window as any).__DH;
  dh.store.getState().enterUnit('cruise', 2);
});
await page.waitForTimeout(700);
await page.screenshot({ path: `${OUT}/3-cartel-cruceros.png` });
console.log('cartel cruceros:', JSON.stringify(await page.locator('.term-sign').innerText()));

// Pantalla final con ranking
await page.evaluate(() => {
  const dh = (window as any).__DH;
  const s = dh.store.getState();
  for (const u of ['port', 'multi', 'cruise']) dh.store.getState().stampUnit(u);
  for (let i = 0; i < 12; i++) dh.store.getState().collectGood(`CONCEPTO${i}`);
  dh.store.getState().hitBad('AMENAZA');
  dh.store.getState().hitObstacle();
  dh.store.getState().endGame();
  void s;
});
await page.waitForTimeout(600);
await page.screenshot({ path: `${OUT}/4-final-form.png` });

// Se escribe TECLA A TECLA a propósito: el nombre lleva W/A/S/D y espacio, que
// son las teclas de control del juego. Si el manejador global se las traga,
// aquí se ve.
await page.getByRole('button', { name: 'TNG' }).click();
await page.locator('.name-input').click();
await page.keyboard.type('DAVID WSA');
console.log('escrito:', JSON.stringify(await page.locator('.name-input').inputValue()));
await page.screenshot({ path: `${OUT}/4b-final-unidad.png` });
await page.getByRole('button', { name: 'Guardar' }).click();
await page.waitForTimeout(700);
await page.screenshot({ path: `${OUT}/5-final-ranking.png` });
console.log('ranking:', JSON.stringify(await page.locator('.board').innerText()));

console.log(`capturas en ${OUT}/`);
await browser.close();
