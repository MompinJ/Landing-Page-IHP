/**
 * EL MARCADOR DE TERMINAL RALLY — contra el Supabase real.
 *
 * NO se juega la carrera entera aquí, y es a propósito. Dura GAME_DURATION =
 * 120 s de reloj DE JUEGO, y en un navegador sin pantalla el dibujo va tan
 * despacio que ese reloj avanza a un tercio del real: la primera versión de
 * esta prueba corría dos minutos y medio de pared para consumir cuarenta y seis
 * segundos de carrera, y se quedaba a mitad. Una prueba que tarda cinco minutos
 * es una prueba que nadie vuelve a lanzar.
 *
 * Así que se separa lo que se comprueba de cómo de largo es el juego:
 *
 *   1. EL CAMINO A LA BASE DE DATOS, ejercitando el módulo real del juego
 *      (`marcador.js`) dentro de la página, no una copia del test.
 *   2. QUE LAS DEFENSAS SIGUEN PUESTAS desde el navegador: una marca imposible
 *      tiene que rebotar aunque venga con la clave buena.
 *   3. QUE LA TABLA SE COMPARTE: otra pestaña ve lo que acaba de entrar.
 *
 * Lo que sí se juega de verdad —y por eso existe `_tr-explora`— es la medición
 * de puntos por metro con la que se calibró el techo de la tabla.
 *
 *   npx tsx scripts/rally-marcador-test.ts [url]
 */
import { chromium } from 'playwright';

const URL = process.argv[2] ?? 'http://localhost:5199/?debug';
const NOMBRE = `R${Date.now().toString().slice(-8)}`;

const browser = await chromium.launch();
let fallos = 0;
const comprueba = (ok: boolean, que: string) => {
  console.log(`${ok ? 'OK  ' : 'MAL '} ${que}`);
  if (!ok) fallos++;
};

const page = await browser.newPage({ viewport: { width: 1400, height: 950 } });
page.on('pageerror', (e) => console.error('[pageerror]', String(e)));
await page.goto(URL, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(3500);

comprueba((await page.locator('button', { hasText: 'JUGAR' }).count()) > 0, 'la portada carga sin errores');

// --- 1. guardar una carrera plausible, con el módulo del propio juego --------
const guardada = await page.evaluate(async (nombre) => {
  const m = await import('/src/marcador.js');
  return m.guardaMarca({
    nombre,
    unidad: 'ICAVE',
    puntos: 480,       // ~0.4 puntos/metro: por encima de lo que da un bot,
    distancia: 1200,   // por debajo del techo de 2/metro. Una buena carrera.
    duracionMs: 120000,
  });
}, NOMBRE);
comprueba(guardada === true, 'una carrera buena se registra en el congreso');

// --- 2. las defensas, vistas desde el navegador -----------------------------
const ataques = await page.evaluate(async () => {
  const m = await import('/src/marcador.js');
  const casos = [
    ['puntos imposibles para la distancia', { nombre: 'TRAMPA', unidad: 'ICAVE', puntos: 999999, distancia: 100, duracionMs: 120000 }],
    ['carrera sin tiempo',                  { nombre: 'BOT',    unidad: 'ICAVE', puntos: 100,    distancia: 1200, duracionMs: 500 }],
    ['unidad inventada',                    { nombre: 'ANA',    unidad: 'PIRATA', puntos: 100,   distancia: 500,  duracionMs: 60000 }],
    ['anuncio en el nombre',                { nombre: 'VER-XXX.COM', unidad: 'ICAVE', puntos: 100, distancia: 500, duracionMs: 60000 }],
  ] as const;
  const out: Array<[string, boolean]> = [];
  for (const [caso, fila] of casos) out.push([caso, await m.guardaMarca(fila as never)]);
  return out;
});
for (const [caso, entro] of ataques) comprueba(entro === false, `rechazado: ${caso}`);

// --- 2b. LA INTERFAZ DE VERDAD ----------------------------------------------
// Se salta a la pantalla final por el store en vez de correr los 120 s: lo que
// se comprueba aquí es el formulario, no el juego.
await page.evaluate(() => {
  (window as any).__TR.store.setState({ phase: 'gameover', score: 480, distShown: 1200, timeShown: 0 });
});
await page.waitForTimeout(1500);

const unidadesEnPantalla = (await page.locator('.unit').allInnerTexts()).map((t) => t.trim()).sort();
const enTabla = await page.evaluate(async () => {
  const m = await import('/src/marcador.js');
  return (await m.leeUnidades()) ?? [];
});
console.log(`   unidades ofrecidas: ${unidadesEnPantalla.join(' ')}`);
comprueba(
  JSON.stringify(unidadesEnPantalla) === JSON.stringify([...enTabla].sort()),
  `el picker ofrece exactamente las ${enTabla.length} unidades de la tabla`,
);

const NOMBRE_UI = `U${Date.now().toString().slice(-8)}`;
await page.locator('.register input').fill(NOMBRE_UI);
await page.locator('.unit', { hasText: 'ICAVE' }).first().click();
await page.getByRole('button', { name: 'GUARDAR' }).click();
await page.waitForTimeout(4000);
comprueba(
  (await page.locator('.board-empty', { hasText: /Sin conexion/ }).count()) === 0,
  'firmando desde la interfaz, la marca llega al congreso',
);
comprueba(
  (await page.locator('.board').innerText()).includes(NOMBRE_UI),
  'firmando desde la interfaz, la marca sale en la tabla',
);

// --- 3. ¿lo ve todo el mundo? -----------------------------------------------
const otra = await browser.newPage({ viewport: { width: 1400, height: 950 } });
await otra.goto(URL, { waitUntil: 'domcontentloaded' });
await otra.waitForTimeout(3000);
const visto = await otra.evaluate(async (nombre) => {
  const m = await import('/src/marcador.js');
  const filas = await m.leeTabla();
  return Array.isArray(filas) && filas.some((f: { name: string }) => f.name === nombre);
}, NOMBRE);
comprueba(visto, 'otra pestaña ve la marca recién registrada');
await otra.close();

// --- 4. sin red, ni se cuelga ni miente -------------------------------------
await page.route('**/ifkkmlzjtdjkqmekticb.supabase.co/**', (r) => r.abort());
const sinRed = await page.evaluate(async () => {
  const m = await import('/src/marcador.js');
  return { guardar: await m.guardaMarca({ nombre: 'SINRED', unidad: 'ICAVE', puntos: 10, distancia: 100, duracionMs: 60000 }), leer: await m.leeTabla() };
});
comprueba(sinRed.guardar === false, 'sin red, guardar devuelve fallo en vez de colgarse');
comprueba(sinRed.leer === null, 'sin red, leer devuelve «no lo sé» y no una tabla vacía falsa');

await page.close();
await browser.close();
console.log(fallos === 0 ? `\nOK: marcador de Terminal Rally (${NOMBRE})` : `\n${fallos} fallos`);
process.exit(fallos === 0 ? 0 : 1);
