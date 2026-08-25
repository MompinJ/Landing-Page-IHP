/**
 * FIRMAR CON EL MANDO — que el teclado en pantalla de la tarjeta final salga
 * cuando hay mando, y que la cruceta escriba de verdad.
 *
 * Playwright no tiene mandos, así que se INYECTA uno: `navigator.getGamepads`
 * se sustituye por un mando falso cuyo estado se maneja desde el test
 * (`window.__PAD`). Es la misma superficie que usa el juego —sondeo por rAF de
 * un snapshot de botones— así que lo que se prueba es el código de verdad y no
 * un atajo.
 *
 *   npx tsx scripts/firma-mando-test.ts [url]
 */
import { mkdirSync } from 'node:fs';
import { chromium } from 'playwright';

const URL = process.argv[2] ?? 'http://localhost:5173/';
const OUT = 'scripts/briefing-out';
mkdirSync(OUT, { recursive: true });

/** Índices del mapeo "standard": A=0, B=1, Start=9, cruceta 12-15 */
const BOTON = { A: 0, B: 1, START: 9, ARRIBA: 12, ABAJO: 13, IZQ: 14, DER: 15 };

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1500, height: 980 } });
page.on('pageerror', (e) => console.error('[pageerror]', String(e)));

await page.addInitScript(() => {
  const botones = Array.from({ length: 17 }, () => ({ pressed: false, touched: false, value: 0 }));
  const pad = {
    id: 'mando falso (standard)',
    index: 0,
    connected: true,
    mapping: 'standard',
    axes: [0, 0, 0, 0],
    buttons: botones,
    timestamp: 0,
  };
  (window as unknown as { __PAD: typeof botones }).__PAD = botones;
  navigator.getGamepads = () => [pad as unknown as Gamepad];
});

await page.goto(URL, { waitUntil: 'networkidle' });
await page.waitForTimeout(600);

/** Un toque: se pulsa, se sostiene un par de fotogramas y se suelta. El juego
 *  detecta flancos, así que sin la soltada la siguiente pulsación no cuenta. */
async function toca(indice: number) {
  await page.evaluate((i) => ((window as any).__PAD[i].pressed = true), indice);
  await page.waitForTimeout(70);
  await page.evaluate((i) => ((window as any).__PAD[i].pressed = false), indice);
  await page.waitForTimeout(70);
}

// Portada → briefing → partida, todo con el mando (A)
await toca(BOTON.A);
await page.waitForTimeout(400);
await toca(BOTON.A);
await page.waitForTimeout(1200);

// Muerte inmediata para llegar a la tarjeta final
await page.evaluate(() => (window as any).__DH.store.getState().endGame());
await page.waitForTimeout(1400); // la guardia anti-machaqueo es de 1 s

const hayTeclado = await page.locator('.keys').count();
console.log(`teclado en pantalla con mando conectado: ${hayTeclado > 0 ? 'sí' : 'NO'}`);

// Se escribe "DAVID" moviendo el cursor por la rejilla. Fila 0 = A..G.
const RUTA: Record<string, { fila: number; col: number }> = {
  D: { fila: 0, col: 3 },
  A: { fila: 0, col: 0 },
  V: { fila: 3, col: 0 },
  I: { fila: 1, col: 1 },
};
let fila = 0;
let col = 0;
async function vaA(destino: { fila: number; col: number }) {
  while (fila < destino.fila) { await toca(BOTON.ABAJO); fila++; }
  while (fila > destino.fila) { await toca(BOTON.ARRIBA); fila--; }
  // Al cambiar de fila la columna se recorta al ancho de la nueva; aquí todas
  // las filas de letras miden lo mismo, así que basta con moverse.
  while (col < destino.col) { await toca(BOTON.DER); col++; }
  while (col > destino.col) { await toca(BOTON.IZQ); col--; }
  await toca(BOTON.A);
}
for (const letra of ['D', 'A', 'V', 'I', 'D']) await vaA(RUTA[letra]);

const escrito = await page.locator('.name-input').inputValue();
console.log(`escrito con la cruceta: ${JSON.stringify(escrito)}`);

// B borra una letra
await toca(BOTON.B);
await page.waitForTimeout(120);
const trasBorrar = await page.locator('.name-input').inputValue();
console.log(`tras pulsar B: ${JSON.stringify(trasBorrar)}`);

await page.screenshot({ path: `${OUT}/firma-mando.png` });

const ok = hayTeclado > 0 && escrito === 'DAVID' && trasBorrar === 'DAVI';
console.log(ok ? '\nOK: se firma con el mando' : '\nMAL: revisar');
await browser.close();
process.exit(ok ? 0 : 1);
