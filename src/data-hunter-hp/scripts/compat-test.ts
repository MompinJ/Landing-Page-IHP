/**
 * ¿CARGA, Y SI NO CARGA LO DICE?
 *
 * El fallo que trajo esta prueba fue «no carga en algunos navegadores o
 * teléfonos», y lo peor no era el fallo sino la forma de fallar: pantalla en
 * blanco, sin mensaje, sin nada que contar más allá de «no carga». La causa era
 * el objetivo de compilación — Vite 8 compila por omisión para iOS 16.4, así
 * que un teléfono más viejo no podía ni PARSEAR el paquete.
 *
 * Se comprueban dos cosas distintas, y las dos hacen falta:
 *
 *   1. QUE CARGUE donde tiene que cargar: que el paquete no lleve sintaxis por
 *      encima del suelo declarado en `vite.config.ts`. Esto se mira sobre el
 *      fichero construido y no en un navegador, porque el navegador que hay
 *      aquí es moderno y no se quejaría — que es exactamente por lo que el
 *      fallo llegó a producción.
 *   2. QUE SE EXPLIQUE cuando no puede: las tres redes, cada una para un caso
 *      que las otras no cubren.
 *
 *   npx vite preview --outDir dist --port 4211 &
 *   npx tsx scripts/compat-test.ts [url]
 */
import { readdirSync, readFileSync } from 'node:fs';
import { chromium, devices, type Browser } from 'playwright';

const BASE = process.argv[2] ?? 'http://localhost:4211/';
const fallos: string[] = [];
const ok: string[] = [];
const check = (c: boolean, m: string) => (c ? ok : fallos).push(m);

/* ---------------------------------------------------- 1. sintaxis del paquete */

/**
 * Sintaxis que NO puede aparecer en el paquete con el suelo declarado
 * (es2020 / safari14 / ios14). Se busca por texto y no parseando: lo que hay
 * que cazar es una regresión concreta y conocida, y para eso una lista explícita
 * dice más que un error de parser genérico.
 */
const PROHIBIDO: [string, RegExp, string][] = [
  ['asignación lógica ??=', /\?\?=/, 'ES2021 · Safari 14 no lo entiende'],
  ['asignación lógica ||=', /\|\|=/, 'ES2021 · Safari 14 no lo entiende'],
  ['asignación lógica &&=', /&&=/, 'ES2021 · Safari 14 no lo entiende'],
  ['bloque estático de clase', /\bstatic\s*\{/, 'ES2022 · Safari 16.4'],
  // La almohadilla hay que mirarla con cuidado: el paquete lleva DENTRO los
  // shaders de three como texto, y ahí `#if` / `#endif` / `#define` son
  // directivas de GLSL, no campos privados de JavaScript. Sin descartarlas, la
  // prueba daba tres fallos que no existían.
  [
    'campo privado #x',
    /[{;]\s*#(?!if\b|endif\b|else\b|elif\b|ifdef\b|ifndef\b|define\b|undef\b|include\b|pragma\b|extension\b|version\b|line\b|error\b)[A-Za-z_]\w*\s*[=;(]/,
    'ES2022 · Safari 14.1',
  ],
];

const dir = 'dist/assets';
const paquetes = readdirSync(dir).filter((f) => f.endsWith('.js'));
check(paquetes.length > 0, `hay paquete construido que revisar (${paquetes.length} ficheros)`);
for (const f of paquetes) {
  const codigo = readFileSync(`${dir}/${f}`, 'utf8');
  for (const [nombre, re, porque] of PROHIBIDO) {
    const m = codigo.match(new RegExp(re.source, 'g'));
    check(!m, `${f}: sin ${nombre} (${porque})${m ? ` — ${m.length} apariciones` : ''}`);
  }
}

/* -------------------------------------------------------- 2. las tres redes */

const abre = async (browser: Browser, ruta: (p: import('playwright').Page) => Promise<void> = async () => {}) => {
  const ctx = await browser.newContext({ ...devices['iPhone 13'] });
  const page = await ctx.newPage();
  await ruta(page);
  await page.goto(BASE, { waitUntil: 'domcontentloaded' });
  return { ctx, page };
};

const normal = await chromium.launch({ args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] });

// (a) carga buena: el aviso de arranque se quita solo
{
  const { ctx, page } = await abre(normal);
  await page.waitForTimeout(2500);
  const queda = await page.locator('#arranque').count();
  const hayMenu = await page.getByRole('button', { name: 'Jugar', exact: true }).count();
  check(queda === 0, 'con el juego cargado, el aviso de arranque desaparece');
  check(hayMenu > 0, 'con el juego cargado, sale la portada');
  await ctx.close();
}

// (b) el paquete no se puede parsear: es EL caso que se sufrió
{
  const { ctx, page } = await abre(normal, async (p) => {
    await p.route('**/assets/index-*.js', (r) =>
      // Sintaxis inventada: el navegador descarta el fichero entero sin
      // ejecutar una sola línea, igual que hacía con la asignación lógica.
      r.fulfill({ status: 200, contentType: 'application/javascript', body: 'const 1 = ;;;' }),
    );
  });
  await page.waitForTimeout(2000);
  const txt = (await page.locator('#arranque').innerText().catch(() => '')) || '';
  check(/no se pudo cargar/i.test(txt), `si el paquete no se puede leer, se explica ("${txt.split('\n').join(' ').slice(0, 60)}…")`);
  await ctx.close();
}

// (c) sin WebGL2: el navegador va, pero no sabe dibujar en 3D
{
  const sinGL = await chromium.launch({ args: ['--disable-webgl', '--disable-webgl2'] });
  const { ctx, page } = await abre(sinGL);
  await page.waitForTimeout(2500);
  const cuerpo = await page.locator('body').innerText();
  check(/no puede con el 3d|no se pudo cargar/i.test(cuerpo), `sin WebGL2 se avisa en vez de dejar la pantalla en blanco ("${cuerpo.split('\n').join(' ').slice(0, 60)}…")`);
  await ctx.close();
  await sinGL.close();
}

await normal.close();

console.log('OK:\n - ' + ok.join('\n - '));
if (fallos.length) {
  console.error('\nFALLOS:\n - ' + fallos.join('\n - '));
  process.exit(1);
}
console.log('\nCarga donde debe, y donde no puede lo dice.');
