/**
 * ¿CUÁNTO CUESTAN LAS SOMBRAS, Y CUÁNTO SE PIERDE AL QUITARLAS?
 *
 * La pregunta era «quitar las sombras no estará tan mal, ¿no?». En el TELÉFONO
 * no cambia nada — 'movil' y 'rapido' ya las tienen apagadas —, así que lo que
 * hay que medir es el stand, que es donde siguen encendidas ('alto').
 *
 * Se mide lo que de verdad cuestan: el mapa de sombras REDIBUJA la escena
 * entera una segunda vez, así que cada malla que proyecta sombra se envía dos
 * veces por frame. Y se capturan las dos imágenes para poder decidir mirando,
 * que es como se decide esto.
 *
 *   npx tsx scripts/shadow-cost.ts [url] [fila]
 */
import { chromium } from 'playwright';

const BASE = process.argv[2] ?? 'http://localhost:4214/';
const FILA = Number(process.argv[3] ?? 20);

const browser = await chromium.launch({
  args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist', '--disable-frame-rate-limit'],
});

async function medir(sombras: boolean) {
  const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
  page.on('pageerror', (e) => console.error('[pageerror]', String(e)));
  await page.goto(`${BASE}?debug&daily&fps=off&q=alto&sombras=${sombras ? 1 : 0}`, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'Jugar', exact: true }).click();
  await page.waitForTimeout(1500);
  await page.getByRole('button', { name: 'A jugar' }).click();
  await page.waitForTimeout(1500);
  await page.evaluate(`window.__DH.teleport(${FILA}, 0)`);
  await page.waitForTimeout(1200);

  const r: any = await page.evaluate(
    `new Promise((resolve) => {
       const dh = window.__DH;
       dh.gl.info.autoReset = false; dh.gl.info.reset();
       const t = []; let last = performance.now(); const t0 = last; let llamadas = 0;
       requestAnimationFrame(function paso() {
         const now = performance.now(); t.push(now - last); last = now;
         llamadas = Math.max(llamadas, dh.gl.info.render.calls);
         dh.gl.info.reset();
         if (now - t0 < 4000) requestAnimationFrame(paso);
         else { dh.gl.info.autoReset = true;
                resolve({ t: t.slice(3), llamadas, sombras: dh.gl.shadowMap.enabled }); }
       });
     })`,
  );
  await page.screenshot({ path: `scripts/mobile-out/sombras-${sombras ? 'si' : 'no'}.png` });
  const s = [...r.t].sort((a: number, b: number) => a - b);
  const media = s.reduce((a: number, b: number) => a + b, 0) / s.length;
  await page.close();
  return { llamadas: r.llamadas, media, activas: r.sombras };
}

const con = await medir(true);
const sin = await medir(false);
await browser.close();

console.log(`Stand (1600×900, nivel 'alto'), fila ${FILA}:\n`);
console.table([
  { '': 'con sombras', 'llamadas/frame': con.llamadas, 'ms/frame': +con.media.toFixed(2), 'activas': con.activas },
  { '': 'sin sombras', 'llamadas/frame': sin.llamadas, 'ms/frame': +sin.media.toFixed(2), 'activas': sin.activas },
]);
console.log(
  `\nQuitarlas: ${(100 - (sin.llamadas / con.llamadas) * 100).toFixed(0)}% menos llamadas, ` +
    `${(100 - (sin.media / con.media) * 100).toFixed(0)}% menos tiempo de frame.`,
);
console.log('Capturas: scripts/mobile-out/sombras-si.png y sombras-no.png');
