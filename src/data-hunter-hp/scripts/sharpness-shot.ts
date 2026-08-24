/**
 * ¿CÓMO SE VE, de verdad, en el teléfono?
 *
 * Captura el MISMO instante de juego con distintas combinaciones de resolución
 * y suavizado, a la densidad real de un móvil (×3). La captura sale del mismo
 * escalado que hace el navegador, así que lo que se ve aquí es lo que se ve en
 * la mano — que es lo que no se puede juzgar desde un banco de fps.
 *
 *   npx tsx scripts/sharpness-shot.ts [url]
 */
import { chromium, devices } from 'playwright';

const BASE = process.argv[2] ?? 'http://localhost:4197/';
const OUT = 'scripts/mobile-out';

/** [etiqueta, escala de dibujo, MSAA] */
const CASOS: [string, number, boolean][] = [
  ['060-sinmsaa', 0.6, false],
  ['100-sinmsaa', 1.0, false],
  ['100-msaa', 1.0, true],
  ['150-msaa', 1.5, true],
  ['200-msaa', 2.0, true],
];

const browser = await chromium.launch({ args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] });

for (const [etiqueta, escala, msaa] of CASOS) {
  const ctx = await browser.newContext({ ...devices['iPhone 13'] }); // 390×664 @ ×3
  const page = await ctx.newPage();
  page.on('pageerror', (e) => console.error('[pageerror]', String(e)));
  await page.goto(`${BASE}?debug&daily&q=movil&escala=${escala}&msaa=${msaa ? 1 : 0}&fps=off`, {
    waitUntil: 'networkidle',
  });
  await page.getByRole('button', { name: 'Jugar', exact: true }).click();
  await page.waitForTimeout(400);
  await page.getByRole('button', { name: 'A jugar' }).click();
  await page.waitForTimeout(1800);
  // Mismo sitio del mapa en todos los casos: si cada uno cae en una fila
  // distinta se estaría comparando el dibujo con el contenido.
  await page.evaluate(`window.__DH.teleport(70, 0)`);
  await page.waitForTimeout(1400);

  const info: any = await page.evaluate(
    `({ buffer: window.__DH.gl.domElement.width + 'x' + window.__DH.gl.domElement.height,
        dpr: window.__DH.gl.getPixelRatio(),
        msaa: window.__DH.gl.getContextAttributes().antialias })`,
  );
  await page.screenshot({ path: `${OUT}/nitidez-${etiqueta}.png` });
  // Recorte de una zona con muchos cantos diagonales, que es donde se ve el
  // escalonado: ahí se juzga, no en el conjunto.
  await page.screenshot({ path: `${OUT}/nitidez-${etiqueta}-detalle.png`, clip: { x: 60, y: 240, width: 260, height: 200 } });
  const px = Number(info.buffer.split('x')[0]) * Number(info.buffer.split('x')[1]);
  console.log(`${etiqueta.padEnd(13)} buffer ${info.buffer.padEnd(10)} (${(px / 1000).toFixed(0)} kpx)  dpr ${info.dpr}  msaa ${info.msaa}`);
  await ctx.close();
}
await browser.close();
