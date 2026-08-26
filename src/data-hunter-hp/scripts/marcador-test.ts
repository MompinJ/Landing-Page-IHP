/**
 * EL MARCADOR DEL CONGRESO, DE PUNTA A PUNTA — contra el Supabase de verdad.
 *
 * No es una prueba de la base de datos (esa vive en `supabase/marcadores.sql`):
 * es la del CAMINO COMPLETO, jugando en un navegador de verdad, firmando en la
 * pantalla final y comprobando que la fila aparece luego en el Top 10 de OTRA
 * pestaña — que es lo que el jugador entiende por «todos ven el mismo ranking».
 *
 * Y se comprueba lo que menos se prueba y más se sufre en un stand: que SIN RED
 * el juego no se cuelga y avisa de que la marca se quedó en el equipo.
 *
 *   npx tsx scripts/marcador-test.ts [url]
 */
import { chromium } from 'playwright';

const URL = process.argv[2] ?? 'http://localhost:5173/';
/** Nombre irrepetible por ejecución: la tabla acumula y hay que reconocer la
 *  fila propia sin borrar las de nadie. */
const NOMBRE = `T${Date.now().toString().slice(-8)}`;
const UNIDAD = 'ICAVE';

const browser = await chromium.launch();
let fallos = 0;
const comprueba = (ok: boolean, que: string) => {
  console.log(`${ok ? 'OK  ' : 'MAL '} ${que}`);
  if (!ok) fallos++;
};

// ---------------------------------------------------------------- con red
const page = await browser.newPage({ viewport: { width: 1400, height: 950 } });
page.on('pageerror', (e) => console.error('[pageerror]', String(e)));
await page.goto(URL, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(3000);
await page.getByRole('button', { name: 'Jugar', exact: true }).click();
await page.waitForTimeout(200);
await page.getByRole('button', { name: 'A jugar' }).click();
await page.waitForTimeout(1000);

// Se juega DE VERDAD unos saltos: la tabla exige que la duración cuadre con las
// filas recorridas, así que teletransportarse aquí haría fallar la prueba por
// el motivo correcto.
for (let i = 0; i < 6; i++) {
  await page.keyboard.press('ArrowUp');
  await page.waitForTimeout(260);
}
const filas = await page.evaluate(() => (window as any).__DH?.runtime?.maxRow ?? 0);
await page.evaluate(() => (window as any).__DH.store.getState().endGame());
await page.waitForTimeout(1300);

comprueba(
  await page.getByRole('button', { name: 'Elige tu unidad' }).isVisible(),
  'sin unidad elegida, el botón no deja mandar una fila que la tabla rechazaría',
);

// LO QUE SE PUEDE ELEGIR TIENE QUE SER LO QUE SE PUEDE GUARDAR: el picker sale
// de la tabla `unidades`, que es contra la que valida la clave foránea. Un
// picker desincronizado no da un texto raro, da una marca rechazada.
const ofrecidas = (await page.locator('.chip--pick').allInnerTexts()).map((t) => t.trim()).sort();
const unidadesTabla: string[] = await page.evaluate(async () => {
  // Se pregunta a la tabla por la misma vía que el juego, pero sin importar el
  // módulo: `import()` de un `.ts` desde la página lo tiene que transformar el
  // servidor de desarrollo, y eso ata la prueba a estar en modo desarrollo.
  const r = await fetch(
    'https://ifkkmlzjtdjkqmekticb.supabase.co/rest/v1/unidades?select=codigo',
    { headers: { apikey: 'sb_publishable_5VnRKtG9NF1BUWWUS85ekA_tzlmDm4H' } },
  );
  const filas = await r.json();
  return filas.map((u) => u.codigo);
});
console.log(`   unidades ofrecidas: ${ofrecidas.join(' ')}`);
comprueba(
  JSON.stringify(ofrecidas) === JSON.stringify([...unidadesTabla].sort()),
  `el picker ofrece exactamente las ${unidadesTabla.length} unidades de la tabla`,
);

await page.getByTitle(/Internacional de Contenedores/).click();
await page.locator('.name-input').fill(NOMBRE);
await page.getByRole('button', { name: 'Guardar' }).click();
await page.waitForTimeout(3500);

const kicker = await page.locator('.card-kicker--sm').last().innerText();
comprueba(/CONGRESO/i.test(kicker), `el ranking se anuncia como del congreso (dice «${kicker}»)`);
const enTabla = await page.locator('.board-name', { hasText: NOMBRE }).count();
comprueba(enTabla > 0, 'la marca recién firmada sale en el Top 10');

// UNA PARTIDA MALA TAMBIÉN CUENTA. Port Quest resta SCORE_BAD 10 por ficha roja
// y no pone suelo: quien no entiende los controles acaba en negativo, y es a
// quien más le importa salir en la tabla. La primera versión de la tabla los
// rechazaba con un `puntos >= 0` puesto sin pensar, y se llevó por delante los
// registros de Terminal Rally durante horas antes de que se viera.
const negativa: boolean = await page.evaluate(async (nombre) => {
  const clave = 'sb_publishable_5VnRKtG9NF1BUWWUS85ekA_tzlmDm4H';
  const r = await fetch('https://ifkkmlzjtdjkqmekticb.supabase.co/rest/v1/port_quest_scores', {
    method: 'POST',
    headers: {
      apikey: clave,
      Authorization: `Bearer ${clave}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
    body: JSON.stringify({ nombre, unidad: 'ICAVE', puntos: -60, fila_maxima: 40, duracion_ms: 45000 }),
  });
  return r.ok;
}, `N${NOMBRE.slice(1)}`);
comprueba(negativa, 'una partida MALA (puntos negativos) se registra igual');

// ------------------------------------------- otra pestaña: ¿lo ve todo el mundo?
const otra = await browser.newPage({ viewport: { width: 1400, height: 950 } });
await otra.goto(URL, { waitUntil: 'domcontentloaded' });
await otra.waitForTimeout(2500);
const visto = await otra.evaluate((n) => {
  const r = (window as any).__DH.store.getState().ranking as Array<{ name: string }>;
  return r.some((f) => f.name === n);
}, NOMBRE);
comprueba(visto, 'otra pestaña, que no ha jugado, ya trae esa marca al abrir');
await otra.close();

const filaOk = await page.evaluate(() => true);
comprueba(filas > 0 && filaOk, `se jugaron ${filas} filas de verdad antes de firmar`);
await page.close();

// ---------------------------------------------------------------- sin red
// El caso del stand: el wifi se cae. El juego NO puede colgarse y tiene que
// decir que la marca se quedó en el equipo.
const kiosco = await browser.newPage({ viewport: { width: 1400, height: 950 } });
await kiosco.goto(URL, { waitUntil: 'domcontentloaded' });
await kiosco.waitForTimeout(3000);
await kiosco.route('**/ifkkmlzjtdjkqmekticb.supabase.co/**', (r) => r.abort());
await kiosco.getByRole('button', { name: 'Jugar', exact: true }).click();
await kiosco.waitForTimeout(200);
await kiosco.getByRole('button', { name: 'A jugar' }).click();
await kiosco.waitForTimeout(900);
for (let i = 0; i < 3; i++) {
  await kiosco.keyboard.press('ArrowUp');
  await kiosco.waitForTimeout(260);
}
await kiosco.evaluate(() => (window as any).__DH.store.getState().endGame());
await kiosco.waitForTimeout(1300);
await kiosco.getByTitle(/Internacional de Contenedores/).click();
await kiosco.locator('.name-input').fill('SINRED');
await kiosco.getByRole('button', { name: 'Guardar' }).click();
await kiosco.waitForTimeout(2500);

comprueba(
  await kiosco.locator('.board').isVisible(),
  'sin red, la pantalla final avanza igual y enseña un ranking',
);
comprueba(
  (await kiosco.locator('.how-foot', { hasText: /No se pudo guardar/ }).count()) > 0,
  'sin red, se avisa de que la marca se quedó en este equipo',
);
comprueba(
  (await kiosco.locator('.board-name', { hasText: 'SINRED' }).count()) > 0,
  'sin red, la marca propia sigue apareciendo (ranking local)',
);
await kiosco.close();

await browser.close();
console.log(fallos === 0 ? `\nOK: marcador de punta a punta (${NOMBRE})` : `\n${fallos} fallos`);
process.exit(fallos === 0 ? 0 : 1);
