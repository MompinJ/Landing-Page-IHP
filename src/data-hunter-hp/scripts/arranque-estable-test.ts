/**
 * QUE LA PORTADA ARRANQUE, VEINTE VECES SEGUIDAS.
 *
 * Existe por un fallo que se escapó a todo lo demás: un bucle infinito de
 * renders que tumbaba el juego ANTES de pintar la portada, y que salía una de
 * cada tres cargas. Ni el typecheck, ni el lint, ni el build, ni las pruebas de
 * marcador lo veían — todas cargan la página una vez, y dos de cada tres veces
 * la página carga bien.
 *
 * La causa: `view.ahead` puede ser NaN mientras el lienzo no se ha medido, y
 * React compara dependencias con `Object.is`, donde NaN no es igual a NaN. Un
 * `setState` sin guarda dentro de ese efecto se convierte en bucle. Depende de
 * si el lienzo ya midió, o sea del reparto de tiempos: intermitente por
 * naturaleza. Lo único que lo caza es repetir.
 *
 * Se carga con tamaños distintos a propósito, incluida una ventana muy pequeña:
 * es donde más fácil es que el primer fotograma llegue sin medidas.
 *
 *   npx tsx scripts/arranque-estable-test.ts [url] [vueltas]
 */
import { chromium } from 'playwright';

const URL = process.argv[2] ?? 'http://localhost:4189/';
const VUELTAS = Number(process.argv[3] ?? 20);
const TAMANOS = [
  { width: 1600, height: 900 },
  { width: 1280, height: 720 },
  { width: 390, height: 664 },
  { width: 844, height: 390 },
];

const browser = await chromium.launch();
let fallos = 0;

for (let i = 0; i < VUELTAS; i++) {
  const v = TAMANOS[i % TAMANOS.length];
  const page = await browser.newPage({ viewport: v });
  const errores: string[] = [];
  page.on('pageerror', (e) => errores.push(String(e).split('\n')[0]));
  page.on('console', (m) => m.type() === 'error' && errores.push(m.text().split('\n')[0]));
  await page.goto(URL, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3500);
  const jugar = await page.getByRole('button', { name: 'Jugar', exact: true }).count();
  const ok = jugar > 0 && errores.length === 0;
  if (!ok) {
    fallos++;
    console.log(`  MAL vuelta ${i + 1} (${v.width}x${v.height}): ${errores[0] ?? 'no salió el botón de jugar'}`);
  }
  await page.close();
}

await browser.close();
console.log(
  fallos === 0
    ? `\nOK: ${VUELTAS} arranques seguidos sin un solo error`
    : `\n${fallos} de ${VUELTAS} arranques fallaron`,
);
process.exit(fallos === 0 ? 0 : 1);
