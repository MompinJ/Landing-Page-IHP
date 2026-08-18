/**
 * Prueba de humo del CARTEL DE TERMINAL: avanza a saltos hasta cruzar la
 * frontera de zona y comprueba que el cartel anuncia la terminal nueva.
 *
 *   npx tsx scripts/sign-test.ts [url]
 */
import { chromium } from 'playwright';

const URL = process.argv[2] ?? 'http://localhost:5173/?debug';

const browser = await chromium.launch({
  args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'],
});
const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
page.on('pageerror', (e) => console.error('[pageerror]', String(e)));
await page.goto(URL, { waitUntil: 'networkidle' });
await page.getByRole('button', { name: 'Iniciar misión' }).click();
await page.waitForTimeout(800);

const vistos: string[] = [];
for (let i = 0; i < 80; i++) {
  await page.keyboard.press('ArrowUp');
  await page.waitForTimeout(230);
  const info = await page.evaluate(() => {
    const s = (window as any).__DH.store.getState();
    return { row: s.currentRow, unit: s.currentUnit, seq: s.enteredUnit?.seq, phase: s.phase };
  });
  const marca = `${info.seq}:${info.unit}`;
  if (!vistos.includes(marca)) {
    vistos.push(marca);
    const cartel = await page.locator('.term-sign').innerText().catch(() => '(sin cartel)');
    console.log(`fila ${info.row} → ${marca} | ${JSON.stringify(cartel)}`);
  }
  // Se acabaron las vidas antes de cruzar: la partida se reinicia y se sigue,
  // que lo que se mide aquí es el cartel, no la habilidad del bot.
  if (info.phase === 'gameover') {
    console.log(`(sin vidas en la fila ${info.row} — reiniciando)`);
    await page.evaluate(() => (window as any).__DH.store.getState().startGame());
    await page.waitForTimeout(500);
  }
}

console.log('carteles disparados:', vistos.length, vistos.join(', '));
console.log('estado final:', await page.evaluate(() => {
  const s = (window as any).__DH.store.getState();
  return { row: s.currentRow, maxRow: s.maxRow, lives: s.lives, phase: s.phase };
}));
await browser.close();
