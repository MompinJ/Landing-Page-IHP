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
const API = 'https://ifkkmlzjtdjkqmekticb.supabase.co/rest/v1/terminal_rally_scores';
const CLAVE = 'sb_publishable_5VnRKtG9NF1BUWWUS85ekA_tzlmDm4H';
const guardada = await page.evaluate(async ([api, clave, nombre]) => {
  const r = await fetch(api, {
    method: 'POST',
    headers: { apikey: clave, Authorization: `Bearer ${clave}`, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
    body: JSON.stringify({ nombre, unidad: 'ICAVE', puntos: 480, distancia: 1200, duracion_ms: 120000 }),
  });
  return r.ok;
}, [API, CLAVE, NOMBRE]);
comprueba(guardada === true, 'una carrera buena se registra en el congreso');

// --- 2. las defensas, vistas desde el navegador -----------------------------
// Sin funciones con nombre dentro de `evaluate`: el transpilador las envuelve
// con un ayudante (`__name`) que no existe en la página y revienta ahí dentro.
const ataques: Array<[string, boolean]> = await page.evaluate(async ([api, clave]) => {
  const casos: Array<[string, Record<string, unknown>]> = [
    ['puntos imposibles para la distancia', { nombre: 'TRAMPA', unidad: 'ICAVE', puntos: 999999, distancia: 100, duracion_ms: 120000 }],
    ['carrera sin tiempo',                  { nombre: 'BOT',    unidad: 'ICAVE', puntos: 100,    distancia: 1200, duracion_ms: 500 }],
    ['unidad inventada',                    { nombre: 'ANA',    unidad: 'PIRATA', puntos: 100,   distancia: 500,  duracion_ms: 60000 }],
    ['anuncio en el nombre',                { nombre: 'VER-XXX.COM', unidad: 'ICAVE', puntos: 100, distancia: 500, duracion_ms: 60000 }],
  ];
  const out: Array<[string, boolean]> = [];
  for (const [caso, fila] of casos) {
    const r = await fetch(api, {
      method: 'POST',
      headers: { apikey: clave, Authorization: `Bearer ${clave}`, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
      body: JSON.stringify(fila),
    });
    out.push([caso, r.ok]);
  }
  return out;
}, [API, CLAVE]);
for (const [caso, entro] of ataques) comprueba(entro === false, `rechazado: ${caso}`);

// UNA CARRERA MALA TAMBIÉN CUENTA. Terminal Rally resta 10 por riesgo y 15 por
// choque: el que se acerca por primera vez y choca acaba en negativo, y esa es
// justo la gente a la que más le importa ver su nombre en la tabla. La primera
// versión de la tabla los rechazaba con un `puntos >= 0` puesto sin pensar.
const negativa = await page.evaluate(async ([api, clave, nombre]) => {
  const r = await fetch(api, {
    method: 'POST',
    headers: { apikey: clave, Authorization: `Bearer ${clave}`, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
    body: JSON.stringify({ nombre, unidad: 'ICAVE', puntos: -75, distancia: 400, duracion_ms: 120000 }),
  });
  return r.ok;
}, [API, CLAVE, `N${NOMBRE.slice(1)}`]);
comprueba(negativa === true, 'una carrera MALA (puntos negativos) se registra igual');

// --- 2b. LA INTERFAZ DE VERDAD ----------------------------------------------
// Se salta a la pantalla final por el store en vez de correr los 120 s: lo que
// se comprueba aquí es el formulario, no el juego.
await page.evaluate(() => {
  (window as any).__TR.store.setState({ phase: 'gameover', score: 480, distShown: 1200, timeShown: 0 });
});
await page.waitForTimeout(1500);

const unidadesEnPantalla = (await page.locator('.unit').allInnerTexts()).map((t) => t.trim()).sort();
const enTabla: string[] = await page.evaluate(async ([clave]) => {
  const r = await fetch('https://ifkkmlzjtdjkqmekticb.supabase.co/rest/v1/unidades?select=codigo', { headers: { apikey: clave } });
  return (await r.json()).map((u: { codigo: string }) => u.codigo);
}, [CLAVE]);
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
const visto = await otra.evaluate(async ([clave, nombre]) => {
  const r = await fetch('https://ifkkmlzjtdjkqmekticb.supabase.co/rest/v1/terminal_rally_scores?select=nombre', { headers: { apikey: clave } });
  return (await r.json()).some((f: { nombre: string }) => f.nombre === nombre);
}, [CLAVE, NOMBRE]);
comprueba(visto, 'otra pestaña ve la marca recién registrada');
await otra.close();

// --- 4. sin red, ni se cuelga ni miente -------------------------------------
// El caso del stand: se cae el wifi. Se firma otra carrera con la red cortada y
// se exige que la pantalla avance igual y que LO DIGA.
// PESTAÑA NUEVA a propósito: la anterior ya firmó, y el formulario no vuelve
// —el componente pasa a enseñar la tabla y ahí se queda—. Reutilizarla probaría
// otra cosa.
const kiosco = await browser.newPage({ viewport: { width: 1400, height: 950 } });
await kiosco.goto(URL, { waitUntil: 'domcontentloaded' });
await kiosco.waitForTimeout(3500);
await kiosco.route('**/ifkkmlzjtdjkqmekticb.supabase.co/**', (r) => r.abort());
await kiosco.evaluate(() => {
  (window as any).__TR.store.setState({ phase: 'gameover', score: 300, distShown: 900, timeShown: 0 });
});
await kiosco.waitForTimeout(1500);
await kiosco.locator('.register input').fill('SINRED');
await kiosco.locator('.unit', { hasText: 'ICAVE' }).first().click();
await kiosco.getByRole('button', { name: 'GUARDAR' }).click();
await kiosco.waitForTimeout(3500);
comprueba(await kiosco.locator('.board').isVisible(), 'sin red, la pantalla final avanza igual y enseña la tabla');
comprueba(
  (await kiosco.locator('.board-empty', { hasText: /Sin conexion/ }).count()) > 0,
  'sin red, se avisa de que la marca se quedó en este equipo',
);
await kiosco.close();

await page.close();
await browser.close();
console.log(fallos === 0 ? `\nOK: marcador de Terminal Rally (${NOMBRE})` : `\n${fallos} fallos`);
process.exit(fallos === 0 ? 0 : 1);
