/**
 * Capturas de las CUATRO pantallas de interfaz: portada, briefing (las
 * instrucciones, que son el paso previo a la partida y no viven en el menú),
 * cartel de entrada a terminal y pantalla final. Sirve para revisar que todas
 * comparten el mismo lenguaje gráfico (bisel, cursivas a dos tonos).
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

// BRIEFING: la portada ya no arranca la partida, abre las instrucciones
await page.getByRole('button', { name: 'Jugar', exact: true }).click();
await page.waitForTimeout(500);
await page.screenshot({ path: `${OUT}/2-briefing.png` });
const brief = await page.locator('.howto').innerText();
console.log('briefing:', brief.split('\n').length, 'renglones');
if (!(await page.locator('.hex-good').isVisible())) throw new Error('el briefing no dibuja la ficha verde');

// Cartel de arranque (la terminal donde aparece el jugador)
await page.getByRole('button', { name: 'A jugar' }).click();
await page.waitForTimeout(700);
await page.screenshot({ path: `${OUT}/3-cartel-inicio.png` });
console.log('cartel inicio:', JSON.stringify(await page.locator('.term-sign').innerText()));

// Cartel de una terminal nueva, con sello
await page.evaluate(() => {
  const dh = (window as any).__DH;
  dh.store.getState().enterUnit('cruise', 2);
});
await page.waitForTimeout(700);
await page.screenshot({ path: `${OUT}/4-cartel-cruceros.png` });
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
await page.screenshot({ path: `${OUT}/5-final-form.png` });

// Se escribe TECLA A TECLA a propósito: el nombre lleva W/A/S/D y espacio, que
// son las teclas de control del juego. Si el manejador global se las traga,
// aquí se ve.
await page.getByRole('button', { name: 'TNG' }).click();
await page.locator('.name-input').click();
await page.keyboard.type('DAVID WSA');
console.log('escrito:', JSON.stringify(await page.locator('.name-input').inputValue()));
await page.screenshot({ path: `${OUT}/5b-final-unidad.png` });
await page.getByRole('button', { name: 'Guardar' }).click();
await page.waitForTimeout(700);
await page.screenshot({ path: `${OUT}/6-final-ranking.png` });
console.log('ranking:', JSON.stringify(await page.locator('.board').innerText()));

console.log(`capturas en ${OUT}/`);
await browser.close();
