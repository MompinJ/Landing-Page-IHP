/**
 * EL BRIEFING CABE EN LA PANTALLA — comprobación de que las instrucciones no
 * se salen por abajo y de que quien se lleva el scroll es la columna, no la
 * tarjeta.
 *
 * Lo que se mide en cada tamaño de pantalla:
 *
 *   - la TARJETA cabe entera (alto ≤ alto del hueco): si no cabe, el botón
 *     «A jugar» se va fuera de cuadro, que es el único fallo que rompe el
 *     stand — nadie encuentra cómo empezar;
 *   - el OVERLAY no se desplaza (`scrollHeight === clientHeight`): el scroll
 *     tiene que caer dentro y no arrastrar la tarjeta entera;
 *   - la columna `.howto` SÍ se desplaza cuando hay más texto del que cabe, y
 *     llega hasta el final.
 *
 *   npx tsx scripts/briefing-fit.ts [url]
 */
import { mkdirSync } from 'node:fs';
import { chromium } from 'playwright';

const URL = process.argv[2] ?? 'http://localhost:5173/';
const OUT = 'scripts/briefing-out';
mkdirSync(OUT, { recursive: true });

/** Los tamaños que de verdad se van a ver: el equipo del stand, un portátil de
 *  los bajos, el teléfono en vertical y el teléfono tumbado, que es el peor
 *  caso de todos porque el alto es lo que falta. */
const PANTALLAS = [
  { nombre: 'stand-1600x900', width: 1600, height: 900 },
  { nombre: 'portatil-1280x720', width: 1280, height: 720 },
  { nombre: 'portatil-bajo-1280x620', width: 1280, height: 620 },
  { nombre: 'movil-390x664', width: 390, height: 664, movil: true },
  { nombre: 'movil-tumbado-844x390', width: 844, height: 390, movil: true },
];

const browser = await chromium.launch();
let fallos = 0;

for (const p of PANTALLAS) {
  const page = await browser.newPage({
    viewport: { width: p.width, height: p.height },
    ...(p.movil ? { hasTouch: true, isMobile: true } : {}),
  });
  page.on('pageerror', (e) => console.error('[pageerror]', String(e)));
  await page.goto(URL, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'Jugar', exact: true }).click();
  await page.waitForTimeout(600);

  const m = await page.evaluate(() => {
    const overlay = document.querySelector('.overlay') as HTMLElement;
    const card = document.querySelector('.card') as HTMLElement;
    const howto = document.querySelector('.howto') as HTMLElement;
    const btn = document.querySelector('.brief-btns') as HTMLElement;
    const cs = getComputedStyle(overlay);
    const hueco =
      overlay.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
    return {
      hueco: Math.round(hueco),
      tarjeta: Math.round(card.getBoundingClientRect().height),
      overlayDesborda: overlay.scrollHeight - overlay.clientHeight,
      howtoAlto: Math.round(howto.clientHeight),
      howtoContenido: Math.round(howto.scrollHeight),
      botonAbajo: Math.round(btn.getBoundingClientRect().bottom),
      alto: window.innerHeight,
    };
  });

  // El scroll de la columna llega hasta el final
  await page.evaluate(() => {
    const h = document.querySelector('.howto') as HTMLElement;
    h.scrollTop = h.scrollHeight;
  });
  await page.waitForTimeout(200);
  const abajo = await page.evaluate(() => {
    const h = document.querySelector('.howto') as HTMLElement;
    return Math.round(h.scrollHeight - h.scrollTop - h.clientHeight);
  });

  const cabe = m.tarjeta <= m.hueco + 1;
  const botonDentro = m.botonAbajo <= m.alto;
  const sinDesborde = m.overlayDesborda <= 1;
  const ok = cabe && botonDentro && sinDesborde && abajo <= 1;
  if (!ok) fallos++;

  console.log(
    `${ok ? 'OK  ' : 'MAL '} ${p.nombre.padEnd(20)} tarjeta ${m.tarjeta}/${m.hueco} px` +
      `  columna ${m.howtoAlto} de ${m.howtoContenido} px` +
      `  overlay +${m.overlayDesborda}  botón a ${m.botonAbajo}/${m.alto}` +
      `  resto tras bajar ${abajo}`
  );

  await page.evaluate(() => ((document.querySelector('.howto') as HTMLElement).scrollTop = 0));
  await page.screenshot({ path: `${OUT}/${p.nombre}.png` });
  await page.close();
}

await browser.close();
console.log(fallos === 0 ? '\ncabe en las cinco' : `\n${fallos} pantallas con problema`);
process.exit(fallos === 0 ? 0 : 1);
