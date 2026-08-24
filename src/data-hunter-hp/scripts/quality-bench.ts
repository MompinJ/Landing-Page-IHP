/**
 * BANCO DE LOS TRES NIVELES GRÁFICOS (`render/quality.ts`).
 *
 * Mide lo que de verdad importa para el stand: cuántos PÍXELES por segundo
 * tiene que mover la GPU en cada nivel, y cuántas pasadas a pantalla completa
 * se pagan por frame. En una máquina con GPU decente los tres niveles dan
 * cientos de fps y no se distinguen — por eso el número que se compara NO es
 * el fps bruto sino el COSTE, que es lo que se traslada a la gráfica integrada
 * del stand.
 *
 * Para forzar el escenario malo se mide además con la GPU deshabilitada
 * (SwiftShader, dibujo por software), que es el peor caso real: es exactamente
 * lo que le pasa a un navegador sin aceleración por hardware.
 *
 *   npx vite preview --port 4189 &
 *   npx tsx scripts/quality-bench.ts [url]
 */
import { chromium, type Browser } from 'playwright';

const BASE = process.argv[2] ?? 'http://localhost:4189/';
const W = 1600;
const H = 900;
const NIVELES = ['ultra', 'alto', 'rapido'] as const;

interface Medida {
  nivel: string;
  fps: number;
  msMedio: number;
  msP95: number;
  llamadas: number;
  dpr: number;
  pixeles: number;
}

async function medir(browser: Browser, nivel: string): Promise<Medida> {
  const page = await browser.newPage({ viewport: { width: W, height: H } });
  page.on('pageerror', (e) => console.error('[pageerror]', String(e)));
  await page.goto(`${BASE}?debug&daily&q=${nivel}`, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'Jugar', exact: true }).click();
  await page.waitForTimeout(250);
  await page.getByRole('button', { name: 'A jugar' }).click();
  await page.waitForTimeout(2200); // compilar shaders y calentar

  const datos: { times: number[]; calls: number; dpr: number } = await page.evaluate(
    `new Promise((resolve) => {
       const dh = window.__DH;
       dh.gl.info.autoReset = false;
       dh.gl.info.reset();
       const times = [];
       let last = performance.now();
       requestAnimationFrame(function step() {
         const now = performance.now();
         times.push(now - last);
         last = now;
         // avanzar por el mapa a ritmo de juego, no quedarse en una fila
         if (times.length % 18 === 0) dh.teleport(dh.runtime.row + 1, ((times.length / 18) % 5) - 2);
         if (times.length < 320) requestAnimationFrame(step);
         else {
           const calls = dh.gl.info.render.calls;
           dh.gl.info.autoReset = true;
           resolve({ times, calls, dpr: dh.gl.getPixelRatio() });
         }
       });
     })`,
  );

  await page.close();

  const t = datos.times.slice(20).sort((a, b) => a - b); // descartar arranque
  const medio = t.reduce((a, b) => a + b, 0) / t.length;
  return {
    nivel,
    fps: +(1000 / medio).toFixed(1),
    msMedio: +medio.toFixed(2),
    msP95: +t[Math.floor(t.length * 0.95)].toFixed(2),
    llamadas: datos.calls,
    dpr: +datos.dpr.toFixed(2),
    // Píxeles del framebuffer: es la magnitud que decide el coste por píxel, y
    // sube con el CUADRADO del dpr.
    pixeles: Math.round(W * datos.dpr * (H * datos.dpr)),
  };
}

/** GPU real (Metal) y, aparte, el peor caso: dibujo por software */
async function tanda(label: string, args: string[]) {
  const browser = await chromium.launch({ args });
  const filas: Medida[] = [];
  for (const n of NIVELES) filas.push(await medir(browser, n));
  await browser.close();

  console.log(`\n=== ${label} ===`);
  console.table(
    Object.fromEntries(
      filas.map((f) => [
        f.nivel,
        {
          fps: f.fps,
          'ms medio': f.msMedio,
          'ms p95': f.msP95,
          llamadas: f.llamadas,
          dpr: f.dpr,
          'Mpx por frame': +(f.pixeles / 1e6).toFixed(2),
        },
      ]),
    ),
  );
  return filas;
}

await tanda('GPU real (Metal)', [
  '--use-angle=metal',
  '--enable-gpu',
  '--ignore-gpu-blocklist',
  '--disable-frame-rate-limit',
]);

// El escenario del stand: navegador SIN aceleración por hardware. Aquí es donde
// los tres niveles se separan de verdad y donde se ve si la optimización sirve.
const software = await tanda('dibujo por SOFTWARE (peor caso real)', [
  '--disable-gpu',
  '--disable-frame-rate-limit',
]);

const [ultra, alto, rapido] = software;
console.log(
  `\nen el peor caso: ultra ${ultra.fps} fps → alto ${alto.fps} fps ` +
    `(×${(alto.fps / ultra.fps).toFixed(2)}) → rapido ${rapido.fps} fps ` +
    `(×${(rapido.fps / ultra.fps).toFixed(2)})`,
);

const fallos: string[] = [];
if (alto.fps <= ultra.fps) fallos.push(`'alto' no mejora a 'ultra' (${alto.fps} vs ${ultra.fps} fps)`);
if (rapido.fps <= alto.fps) fallos.push(`'rapido' no mejora a 'alto' (${rapido.fps} vs ${alto.fps} fps)`);
if (rapido.pixeles >= ultra.pixeles) fallos.push('la resolución de dibujo no baja en los niveles rápidos');

if (fallos.length) {
  console.error('\nFALLOS:\n - ' + fallos.join('\n - '));
  process.exit(1);
}
console.log('OK: cada nivel cuesta menos que el anterior, también sin GPU');
