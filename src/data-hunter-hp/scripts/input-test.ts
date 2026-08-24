/**
 * Test de MOVIMIENTO 1 A 1 (Problema 3): cada pulsación debe producir
 * exactamente un paso, en las 4 direcciones, tanto con toques sueltos como
 * manteniendo la tecla pulsada.
 *
 *   npx tsx scripts/input-test.ts [url]
 */
import { chromium } from 'playwright';

const URL = process.argv[2] ?? 'http://localhost:5173/?debug';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
page.on('pageerror', (e) => console.error('[pageerror]', String(e)));
await page.goto(URL, { waitUntil: 'networkidle' });
await page.getByRole('button', { name: 'Jugar', exact: true }).click();
await page.waitForTimeout(250);
await page.getByRole('button', { name: 'A jugar' }).click();
await page.waitForTimeout(1200);

const reset = () =>
  page.evaluate(() => {
    const dh = (window as any).__DH;
    // Terreno despejado: sin bloqueos ni tráfico, para que ningún salto se
    // descarte por causas ajenas al input.
    for (let r = 0; r <= 16; r++) {
      dh.rows[r] = { index: r, type: 'yard', theme: 'port', stacks: [], decor: [], cards: [], cranes: [], vehicles: [] };
    }
    dh.teleport(6, 0);
    dh.runtime.stunTimer = 0;
    dh.runtime.invulnTimer = 9999; // el test mide input, no colisiones
    dh.debug.stats.queued = 0;
    dh.debug.stats.rejected = 0;
    dh.debug.stats.steps = 0;
  });
const stats = () => page.evaluate(() => ({ ...(window as any).__DH.debug.stats }));

const results: any[] = [];

// 1) Toques sueltos. RECULAR SÍ EXISTE, con correa: se puede volver hasta
//    BACK_STEPS_MAX casillas por detrás del récord (y al pasarse baja la grúa o
//    la grúa a soltarte un contenedor encima — ver `world/snatch.ts` y
//    `scripts/back-test.ts`). Este
//    test esperaba 0 pasos de la época en que retroceder estaba prohibido a
//    secas, así que marcaba en rojo la mecánica que el briefing enseña como
//    movimiento número 3. Desde una fila despejada, un toque atrás = un paso.
const TECLAS: [string, number][] = [
  ['ArrowUp', 1], ['ArrowLeft', 1], ['ArrowRight', 1],
  ['KeyW', 1], ['KeyA', 1], ['KeyD', 1], ['Space', 1],
  ['ArrowDown', 1], ['KeyS', 1],
];
for (const [key, esperado] of TECLAS) {
  await reset();
  await page.keyboard.press(key);
  await page.waitForTimeout(500);
  const s = await stats();
  results.push({ caso: `tap ${key}`, esperado, encolados: s.queued, pasos: s.steps });
}

// 2) Tecla MANTENIDA 1.2 s → el navegador repite keydown; debe seguir siendo 1
for (const key of ['ArrowUp', 'ArrowLeft']) {
  await reset();
  await page.keyboard.down(key);
  await page.waitForTimeout(1200);
  await page.keyboard.up(key);
  await page.waitForTimeout(400);
  const s = await stats();
  results.push({ caso: `mantener ${key} 1.2s`, esperado: 1, encolados: s.queued, pasos: s.steps });
}

// 3) Cinco toques seguidos → exactamente cinco pasos
await reset();
for (let i = 0; i < 5; i++) {
  await page.keyboard.press('ArrowUp');
  await page.waitForTimeout(300);
}
await page.waitForTimeout(400);
{
  const s = await stats();
  results.push({ caso: '5 toques ArrowUp', esperado: 5, encolados: s.queued, pasos: s.steps });
}

// 4) `keydown` reemitido SIN `keyup` y con repeat=false (encoders arcade,
//    teclas remapeadas): el bloqueo hasta soltar debe absorberlo.
await reset();
await page.evaluate(() => {
  for (let i = 0; i < 6; i++) {
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'ArrowUp', bubbles: true }));
  }
});
await page.waitForTimeout(600);
{
  const s = await stats();
  results.push({ caso: '6x keydown sin keyup', esperado: 1, encolados: s.queued, pasos: s.steps });
}
// Se suelta la tecla: si no, el candado seguiría (con razón) cerrado
await page.evaluate(() => window.dispatchEvent(new KeyboardEvent('keyup', { code: 'ArrowUp', bubbles: true })));

// 5) Mando virtual: mismas comprobaciones y, sobre todo, TECLADO + MANDO a la
//    vez (los encoders arcade de doble modo emiten ambos por una sola empujada)
await page.evaluate(() => {
  const pad: any = {
    connected: true, index: 0, id: 'test', mapping: 'standard',
    axes: [0, 0],
    buttons: Array.from({ length: 17 }, () => ({ pressed: false, value: 0 })),
  };
  (window as any).__pad = pad;
  navigator.getGamepads = () => [pad] as any;
});
const pad = (fn: string) => page.evaluate(fn);

// 5a) D-Pad arriba mantenido 1 s
await reset();
await pad('(window).__pad.buttons[12].pressed = true');
await page.waitForTimeout(1000);
await pad('(window).__pad.buttons[12].pressed = false');
await page.waitForTimeout(400);
{
  const s = await stats();
  results.push({ caso: 'mando: D-Pad ↑ 1s', esperado: 1, encolados: s.queued, pasos: s.steps });
}

// 5b) Teclado + mando a la vez → UN paso
await reset();
await pad('(window).__pad.buttons[12].pressed = true');
await page.waitForTimeout(60);
await page.keyboard.down('ArrowUp');
await page.waitForTimeout(500);
await page.keyboard.up('ArrowUp');
await pad('(window).__pad.buttons[12].pressed = false');
await page.waitForTimeout(400);
{
  const s = await stats();
  results.push({ caso: 'teclado + mando a la vez', esperado: 1, encolados: s.queued, pasos: s.steps });
}

// 5c) Mantener ↑ y además pulsar A (ambos son 'avanzar') → UN paso
await reset();
await pad('(window).__pad.buttons[12].pressed = true');
await page.waitForTimeout(120);
await pad('(window).__pad.buttons[0].pressed = true');
await page.waitForTimeout(200);
await pad('(window).__pad.buttons[12].pressed = false'); // soltar D-Pad, A sigue
await page.waitForTimeout(300);
await pad('(window).__pad.buttons[0].pressed = false');
await page.waitForTimeout(400);
{
  const s = await stats();
  results.push({ caso: 'mando: ↑ + A simultáneos', esperado: 1, encolados: s.queued, pasos: s.steps });
}

// 5d) Soltar y volver a pulsar → el bloqueo se libera y admite un paso más
await reset();
for (let i = 0; i < 3; i++) {
  await pad('(window).__pad.buttons[12].pressed = true');
  await page.waitForTimeout(150);
  await pad('(window).__pad.buttons[12].pressed = false');
  await page.waitForTimeout(200);
}
await page.waitForTimeout(300);
{
  const s = await stats();
  results.push({ caso: 'mando: 3 pulsaciones ↑', esperado: 3, encolados: s.queued, pasos: s.steps });
}

console.table(results);
// `encolados` siempre debe ser 1 por pulsación (eso mide el 1:1); `pasos` puede
// ser 0 si la lógica descarta ese destino (casilla bloqueada, fuera de correa).
const fails = results.filter((r) => r.pasos !== r.esperado);
if (fails.length) {
  console.error(`FALLOS: ${fails.length}/${results.length} casos no son 1 input = 1 paso`);
  await browser.close();
  process.exit(1);
}
console.log('OK: 1 pulsación = 1 paso en todos los casos');
await browser.close();
