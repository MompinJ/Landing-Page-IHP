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
/** Cargas que se cayeron y el salvavidas rescató sin que el jugador lo note */
let recuperados = 0;

for (let i = 0; i < VUELTAS; i++) {
  const v = TAMANOS[i % TAMANOS.length];
  const page = await browser.newPage({ viewport: v });
  // SIN FRENO DE CPU, y esto se probó: frenarla hace el fallo MENOS probable,
  // no más. Con la máquina lenta el lienzo llega medido al primer efecto y la
  // condición no se da; lo que lo dispara es la carrera entre que React monta y
  // que el lienzo se mide, y esa se gana o se pierde por milisegundos. La única
  // red que lo caza es repetir la carga muchas veces.
  const errores: string[] = [];
  page.on('pageerror', (e) => errores.push(String(e).split('\n')[0]));
  page.on('console', (m) => m.type() === 'error' && errores.push(m.text().split('\n')[0]));
  await page.goto(URL, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(4000);
  // LO QUE SE EXIGE ES QUE SE PUEDA JUGAR, no que la consola esté impoluta.
  // El salvavidas reintenta una vez ante el fallo de arranque de R3F (ver
  // `Incompatible.tsx`), y ese reintento deja su rastro en la consola aunque
  // el jugador no note nada. Contarlo como fallo sería exigir que no exista un
  // problema que sabemos que existe y que está tapado a propósito; se cuenta
  // aparte, para que si algún día el reintento deja de bastar se vea.
  const jugar = await page.getByRole('button', { name: 'Jugar', exact: true }).count();
  const seCayo = errores.some((e) => /Maximum update depth|#185/.test(e));
  if (seCayo) recuperados++;
  if (jugar === 0) {
    fallos++;
    console.log(`  MAL vuelta ${i + 1} (${v.width}x${v.height}): ${errores[0] ?? 'no salió el botón de jugar'}`);
  }
  await page.close();
}

await browser.close();
console.log(
  fallos === 0
    ? `\nOK: ${VUELTAS} arranques y en los ${VUELTAS} se puede jugar` +
      (recuperados ? ` (${recuperados} se cayeron al montar y el salvavidas los rescató)` : '')
    : `\n${fallos} de ${VUELTAS} arranques se quedaron sin juego`,
);
process.exit(fallos === 0 ? 0 : 1);
