/**
 * Capturas de la MISMA escena en los tres niveles gráficos, para comparar lo
 * que se pierde (y lo que no) al quitar la cadena de postproceso.
 *
 * Lo que hay que mirar: que 'alto' no se vea APAGADO respecto a 'ultra'. Sin
 * bloom la escena perdía luz de conjunto, no solo el halo de los emisivos, y
 * eso se compensa con la exposición del mapeo filmico (`QUALITY.exposure`),
 * que es gratis. Si 'alto' sale oscuro, se sube ahí y no se devuelve el bloom.
 *
 *   npx vite preview --port 4189 &
 *   npx tsx scripts/quality-shot.ts [url] [fila]
 */
import { mkdirSync } from 'node:fs';
import { chromium } from 'playwright';

const BASE = process.argv[2] ?? 'http://localhost:4189/';
const ROW = Number(process.argv[3] ?? 22);
const OUT = 'scripts/ui-out';
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({
  args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'],
});

/**
 * Luminancia media de una captura. Se mide sobre el PNG y NO leyendo el canvas
 * de la página: un canvas WebGL sin `preserveDrawingBuffer` se vacía en cuanto
 * el navegador compone el frame, así que `drawImage` sobre él devuelve negro
 * (medido: luminancia 0 en los tres niveles, que es lo que delató el error).
 */
async function brillo(page: import('playwright').Page, png: Buffer): Promise<number> {
  return page.evaluate(
    ([datos]) =>
      new Promise<number>((resolve) => {
        const img = new Image();
        img.onload = () => {
          const off = document.createElement('canvas');
          off.width = 240;
          off.height = 135;
          const ctx = off.getContext('2d')!;
          ctx.drawImage(img, 0, 0, off.width, off.height);
          const d = ctx.getImageData(0, 0, off.width, off.height).data;
          let sum = 0;
          for (let i = 0; i < d.length; i += 4) {
            sum += 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2];
          }
          resolve(sum / (d.length / 4));
        };
        img.src = datos as string;
      }),
    [`data:image/png;base64,${png.toString('base64')}`],
  );
}

const filas: Array<{ nivel: string; luminancia: number }> = [];

for (const nivel of ['ultra', 'alto', 'rapido']) {
  // `daily` fija el mapa del día: los tres niveles dibujan EXACTAMENTE la misma
  // escena, así que cualquier diferencia de brillo es del pipeline y no del azar.
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  page.on('pageerror', (e) => console.error('[pageerror]', String(e)));
  await page.goto(`${BASE}?debug&daily&q=${nivel}`, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'Jugar', exact: true }).click();
  await page.waitForTimeout(250);
  await page.getByRole('button', { name: 'A jugar' }).click();
  await page.waitForTimeout(1500);
  await page.evaluate((r) => (window as any).__DH.teleport(r, 0), ROW);
  await page.waitForTimeout(1200);

  const png = await page.screenshot({ path: `${OUT}/q-${nivel}.png` });
  const lum = await brillo(page, png);
  filas.push({ nivel, luminancia: +lum.toFixed(1) });
  await page.close();
}

await browser.close();

console.table(
  Object.fromEntries(
    filas.map((f) => [
      f.nivel,
      { 'luminancia media': f.luminancia, 'vs ultra': `${((f.luminancia / filas[0].luminancia - 1) * 100).toFixed(1)}%` },
    ]),
  ),
);

// 'alto' no puede verse más apagado que 'ultra' — es el nivel que ve casi todo
// el mundo. Un poco por encima es correcto: sin halos, la escena aguanta algo
// más de exposición sin lavarse.
const ultra = filas[0].luminancia;
const alto = filas[1].luminancia;
const desvio = (alto / ultra - 1) * 100;
if (desvio < -3) {
  console.error(`ERROR: 'alto' se ve APAGADO respecto a 'ultra' (${desvio.toFixed(1)}%) — subir QUALITY.exposure`);
  process.exit(1);
}
if (desvio > 25) {
  console.error(`ERROR: 'alto' se ve LAVADO respecto a 'ultra' (+${desvio.toFixed(1)}%) — bajar QUALITY.exposure`);
  process.exit(1);
}
console.log(`OK: 'alto' mantiene el brillo de 'ultra' (${desvio >= 0 ? '+' : ''}${desvio.toFixed(1)}%) sin cadena de efectos`);
