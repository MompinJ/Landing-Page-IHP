/**
 * ¿DECIDE EL APARATO? (`components/ResolutionGovernor.tsx`)
 *
 * La promesa del gobernador es que la resolución la elige el teléfono
 * midiéndose, no un número escrito a mano. Eso solo se puede comprobar de una
 * forma: correr el MISMO build en dos máquinas de potencia muy distinta y ver
 * que acaban en sitios distintos.
 *
 *   rápido  → GPU real (Metal). Tiene que QUEDARSE ARRIBA, en el techo: si
 *             bajara en un aparato sobrado estaríamos regalando calidad, que es
 *             justo el fallo que este componente viene a arreglar.
 *
 * SIN `--disable-frame-rate-limit`, a diferencia del resto de bancos de este
 * repo, y no es un olvido. Los otros miden coste y para eso hay que soltar la
 * sincronía vertical y dejar que la máquina corra. Este mide una DECISIÓN que
 * se toma a partir de los fps, y un teléfono va siempre sincronizado a su
 * pantalla: soltando el límite, Chromium daba 700 fps y un refresco medido de
 * 1108, o sea un mundo que no existe en ninguna mano. Con el límite puesto, las
 * dos máquinas se parecen a lo que son — una que llega a la sincronía y otra
 * que no.
 *   lento   → dibujo por software. Tiene que BAJAR hacia el suelo, y sobre todo
 *             tiene que acabar quieto: un gobernador que oscila da más tirones
 *             que el problema que resuelve.
 *
 * Se mide DURANTE EL BRIEFING además de en partida, porque esa es la promesa
 * concreta: que para cuando el jugador pulsa «A jugar» la resolución ya se ha
 * asentado y no le cambia debajo.
 *
 *   npx tsx scripts/governor-test.ts [url]
 */
import { chromium, devices, type Browser } from 'playwright';

const BASE = process.argv[2] ?? 'http://localhost:4197/';

async function mide(browser: Browser, etiqueta: string, frenoCpu = 1) {
  const ctx = await browser.newContext({ ...devices['iPhone 13'] });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => console.error('[pageerror]', String(e)));
  // El dibujo por software a secas se queda en 46 fps, que roza la banda y no
  // decide nada. Frenando además la CPU se baja a ~39 y el caso «este aparato
  // no llega» queda inequívoco, que es el que hay que probar.
  if (frenoCpu > 1) await (await ctx.newCDPSession(page)).send('Emulation.setCPUThrottlingRate', { rate: frenoCpu });
  await page.goto(`${BASE}?debug&daily&fps=off`, { waitUntil: 'networkidle' });

  const dpr = () => page.evaluate(`window.__DH.gl.getPixelRatio()`) as Promise<number>;
  const arranque = await dpr();

  // El briefing: el hueco en el que el gobernador tiene que asentarse
  await page.getByRole('button', { name: 'Jugar', exact: true }).click();
  await page.waitForTimeout(6000);
  const trasBriefing = await dpr();

  await page.getByRole('button', { name: 'A jugar' }).click();
  await page.waitForTimeout(1000);

  // En partida: se juega de verdad y se vigila que no siga bailando
  const muestras: number[] = [];
  for (let i = 0; i < 12; i++) {
    await page.evaluate(`window.__DH.teleport(window.__DH.runtime.row + 1, (${i} % 5) - 2)`);
    await page.waitForTimeout(700);
    muestras.push(await dpr());
  }
  const finales = muestras.slice(6); // ya asentado
  const cambios = new Set(finales.map((v) => v.toFixed(2))).size;
  await ctx.close();
  return { etiqueta, arranque, trasBriefing, final: muestras[muestras.length - 1], cambios, muestras };
}

const rapido = await chromium.launch({
  args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'],
});
const r = await mide(rapido, 'GPU real');
await rapido.close();

const lento = await chromium.launch({ args: ['--disable-gpu'] });
const l = await mide(lento, 'por software', 6);
await lento.close();

for (const m of [r, l]) {
  console.log(
    `${m.etiqueta.padEnd(13)} arranca ${m.arranque.toFixed(2)} · tras briefing ${m.trasBriefing.toFixed(2)} · ` +
      `en partida ${m.final.toFixed(2)}  [${m.muestras.map((v) => v.toFixed(2)).join(' ')}]`,
  );
}

const fallos: string[] = [];
if (r.final < r.arranque - 0.01)
  fallos.push(`con GPU real la resolución BAJÓ (${r.arranque.toFixed(2)} → ${r.final.toFixed(2)}): se está regalando calidad en un aparato sobrado`);
if (l.final >= l.arranque - 0.01)
  fallos.push(`por software la resolución NO bajó (${l.arranque.toFixed(2)} → ${l.final.toFixed(2)}): el gobernador no está midiendo nada`);
// Ya asentado tiene que estar QUIETO del todo: un solo valor. La guardia de
// reversiones existe precisamente para que una maquina en la frontera deje de
// buscar el punto exacto, y si aqui salen dos valores es que no se plantó.
if (l.cambios > 1) fallos.push(`por software sigue moviéndose ya asentado (${l.cambios} valores distintos): la imagen respiraría`);
if (r.cambios > 1) fallos.push(`con GPU real la resolución no está quieta (${r.cambios} valores distintos)`);

if (fallos.length) {
  console.error('\nFALLOS:\n - ' + fallos.join('\n - '));
  process.exit(1);
}
console.log('\nEl aparato decide: el rápido se queda arriba, el lento baja y se queda quieto.');
