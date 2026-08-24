/**
 * EL REMATE DE MUERTE — el compás entre perder la última vida y la pantalla
 * final, copiado de Crossy Road.
 *
 * Antes no había compás: se perdía el corazón y la tarjeta de resultados
 * aparecía encima EN EL MISMO FRAME, así que el jugador nunca llegaba a ver qué
 * lo había matado. Lo que se comprueba aquí es justo eso — que pasa algo entre
 * medias, que dura lo que tiene que durar y que mientras tanto el juego no
 * sigue jugándose:
 *
 *   1. la pantalla final NO sale en el mismo frame;
 *   2. el mundo se congela primero y luego va a cámara lenta;
 *   3. la cámara se acerca;
 *   4. el cuerpo queda de calcomanía;
 *   5. no se admiten movimientos durante el remate;
 *   6. y al terminar, aparece la pantalla final.
 *
 *   npx tsx scripts/death-test.ts [url]
 */
import { chromium, devices } from 'playwright';
import { BALANCE } from '../src/data/balance';

const BASE = process.argv[2] ?? 'http://localhost:4197/';

const browser = await chromium.launch({ args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] });
const ctx = await browser.newContext({ ...devices['iPhone 13'] });
const page = await ctx.newPage();
page.on('pageerror', (e) => console.error('[pageerror]', String(e)));
await page.goto(`${BASE}?debug&daily&fps=off`, { waitUntil: 'networkidle' });
await page.getByRole('button', { name: 'Jugar', exact: true }).click();
await page.waitForTimeout(2500);
await page.getByRole('button', { name: 'A jugar' }).click();
await page.waitForTimeout(900);

const r: any = await page.evaluate(
  `(async () => {
     const dh = window.__DH;
     const st = dh.store.getState();
     const muestra = () => ({
       t: performance.now(), fase: dh.store.getState().phase, muriendo: +dh.runtime.dying.toFixed(3),
       aplastado: +dh.runtime.deathSquash.toFixed(3), zoom: +dh.camera.zoom.toFixed(1),
       fila: dh.runtime.row, coche: dh.runtime.x,
     });
     const antes = muestra();
     const zoomBase = dh.camera.zoom;
     // Vaciar las vidas de golpe: el último golpe es el que arranca el remate
     for (let i = 0; i < 5; i++) st.hitObstacle('prueba');
     const justoDespues = muestra();
     const linea = [];
     const t0 = performance.now();
     // Se intenta avanzar durante el remate: no debe moverse
     const filaAlMorir = dh.runtime.row;
     let movio = false;
     while (performance.now() - t0 < 2200) {
       window.dispatchEvent(new KeyboardEvent('keydown', { code: 'ArrowUp' }));
       window.dispatchEvent(new KeyboardEvent('keyup', { code: 'ArrowUp' }));
       await new Promise(r => requestAnimationFrame(r));
       const m = muestra();
       linea.push(m);
       if (dh.runtime.row !== filaAlMorir) movio = true;
       if (m.fase === 'gameover') break;
     }
     return { antes, justoDespues, linea, movio, zoomBase, duracion: performance.now() - t0 };
   })()`,
);

const fallos: string[] = [];
const ok: string[] = [];
const check = (c: boolean, m: string) => (c ? ok : fallos).push(m);

check(r.justoDespues.fase === 'playing', `la pantalla final NO aparece en el frame del golpe (fase: ${r.justoDespues.fase})`);
check(
  Math.abs(r.justoDespues.muriendo - BALANCE.DEATH_BEAT) < 0.01,
  `el remate arranca con ${r.justoDespues.muriendo}s (esperado ${BALANCE.DEATH_BEAT})`,
);

const final = r.linea[r.linea.length - 1];
check(final.fase === 'gameover', `al terminar el remate sale la pantalla final (fase: ${final.fase})`);
check(
  r.duracion > BALANCE.DEATH_BEAT * 900 && r.duracion < BALANCE.DEATH_BEAT * 1600,
  `el remate dura ${Math.round(r.duracion)} ms (se esperan ~${BALANCE.DEATH_BEAT * 1000})`,
);

// Congelado: durante DEATH_FREEZE el mundo no se mueve
const congelado = r.linea.filter((m: any) => BALANCE.DEATH_BEAT - m.muriendo < BALANCE.DEATH_FREEZE);
const coches = new Set(congelado.map((m: any) => m.coche.toFixed(4)));
check(congelado.length > 0 && coches.size === 1, `el mundo se congela en el golpe (${congelado.length} frames, ${coches.size} posiciones distintas)`);

const zoomMax = Math.max(...r.linea.map((m: any) => m.zoom));
check(zoomMax > r.zoomBase * 1.2, `la cámara se acerca: zoom ${r.zoomBase.toFixed(1)} → ${zoomMax.toFixed(1)}`);

const aplastadoMin = Math.min(...r.linea.map((m: any) => m.aplastado));
check(aplastadoMin <= BALANCE.DEATH_SQUASH + 0.02, `el cuerpo queda de calcomanía (${aplastadoMin} ≤ ${BALANCE.DEATH_SQUASH})`);
check(!r.movio, 'pulsar durante el remate no mueve al jugador');

console.log('OK:\n - ' + ok.join('\n - '));
if (fallos.length) {
  console.error('\nFALLOS:\n - ' + fallos.join('\n - '));
  await browser.close();
  process.exit(1);
}
console.log('\nEl remate de muerte se comporta.');
await browser.close();
