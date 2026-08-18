/**
 * Smoke test visual con WebKit (motor de Safari): carga el build, inicia
 * partida, juega unos segundos con teclado y verifica que no haya errores de
 * consola. Guarda screenshots para inspección.
 *
 *   npx vite preview --port 4189 &   # servir el build
 *   npx tsx scripts/smoke.ts [outDir]
 */
import { webkit } from 'playwright';

const URL = process.env.SMOKE_URL ?? 'http://localhost:4189/';
const OUT = process.argv[2] ?? 'scripts/smoke-out';

const browser = await webkit.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });

const errors: string[] = [];
page.on('console', (msg) => {
  if (msg.type() === 'error') errors.push(msg.text());
});
page.on('pageerror', (err) => errors.push(String(err)));

await page.goto(URL, { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);
await page.screenshot({ path: `${OUT}/1-menu.png` });

await page.getByRole('button', { name: 'Iniciar misión' }).click();
await page.waitForTimeout(2500);
await page.screenshot({ path: `${OUT}/2-gameplay.png` });

// jugar estilo Crossy Road: avanzar y esquivar
for (const key of [
  'ArrowUp', 'ArrowUp', 'ArrowLeft', 'ArrowUp', 'ArrowUp', 'ArrowRight',
  'ArrowUp', 'ArrowUp', 'ArrowUp', 'ArrowLeft', 'ArrowUp', 'ArrowUp',
]) {
  await page.keyboard.press(key);
  await page.waitForTimeout(450);
}
await page.screenshot({ path: `${OUT}/3-gameplay-later.png` });

// Sprint largo hacia adelante para cruzar a la zona de cruceros (fila ~26)
for (let i = 0; i < 42; i++) {
  await page.keyboard.press('ArrowUp');
  await page.waitForTimeout(240);
  if (i % 6 === 5) {
    await page.keyboard.press(Math.random() < 0.5 ? 'ArrowLeft' : 'ArrowRight');
    await page.waitForTimeout(240);
  }
}
await page.waitForTimeout(800);
await page.screenshot({ path: `${OUT}/4-cruise-zone.png` });

// El bot puede morir antes de terminar el recorrido — es un resultado válido
try {
  const hud = {
    score: await page.locator('.hud-score .hud-value').textContent({ timeout: 3000 }),
    vidas: await page.locator('.hud-timer .hud-value').textContent({ timeout: 3000 }),
    combo: await page.locator('.hud-combo .hud-value').textContent({ timeout: 3000 }),
  };
  console.log('HUD:', hud);
} catch {
  console.log('GAME OVER alcanzado — pantalla final visible');
  await page.screenshot({ path: `${OUT}/5-gameover.png` });
}

await browser.close();

if (errors.length) {
  console.error('ERRORES DE CONSOLA:\n' + errors.join('\n'));
  process.exit(1);
}
console.log('OK: sin errores de consola en WebKit');
