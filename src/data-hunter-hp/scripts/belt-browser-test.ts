/**
 * La recogida al pasar por encima, comprobada EN EL JUEGO DE VERDAD y no solo
 * en la lógica pura: el barrido (`sweepPickup`) va colgado del bucle de
 * <Player/>, así que un test headless prueba la función pero no que esté
 * enchufada al frame. Aquí se abre el juego, se deja al colaborador en una
 * banda transportadora y NO SE PULSA NADA: la banda tiene que llevarlo por
 * encima de la ficha y cobrarla sola.
 *
 *   npx vite preview --port 4189 &
 *   npx tsx scripts/belt-browser-test.ts [url]
 */
import { chromium } from 'playwright';

const URL = process.argv[2] ?? 'http://localhost:4189/?debug&daily';

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });

const errores: string[] = [];
page.on('console', (m) => {
  if (m.type() === 'error') errores.push(m.text());
});
page.on('pageerror', (e) => errores.push(String(e)));

await page.goto(URL, { waitUntil: 'networkidle' });
await page.getByRole('button', { name: 'Jugar', exact: true }).click();
await page.getByRole('button', { name: 'A jugar' }).click();
await page.waitForTimeout(900);

/** Busca una banda con ficha verde y deja al colaborador en el borde contra el
 *  que empuja, para que el arrastre lo lleve por encima de ella. */
const preparado = await page.evaluate(() => {
  const dh = (window as any).__DH;
  const MIN = -8;
  const MAX = 8;
  // Solo bandas POCO PROFUNDAS. Buscando en todo el mapa, a veces salía una de
  // la fila 111: allí la rampa de dificultad ya aprieta, el colaborador comía
  // un golpe del tráfico vecino y el empujón lo sacaba de la fila antes de
  // llegar a la ficha — el test fallaba por algo que no estaba midiendo.
  for (const row of dh.rows.slice(0, 60)) {
    if (row.type !== 'belt' || !row.belt) continue;
    const card = row.cards.find((c: any) => !c.collected && c.good);
    if (!card) continue;
    const desde = row.belt.direction === 1 ? MIN : MAX;
    if (row.belt.direction === 1 ? card.col <= desde : card.col >= desde) continue;
    // `teleport` ya deja la X, la Z y sus 'anteriores' en la casilla, así que
    // no hay que retocar la posición a mano (hacerlo desincronizaba `prevX` y
    // devolvía el barrido fantasma de `hitTest`).
    dh.teleport(row.index, desde);
    return {
      row: row.index,
      col: card.col,
      dir: row.belt.direction,
      label: card.label,
      // Lo que la banda tarda en llevarlo desde el borde hasta la ficha. Se
      // devuelve para no esperar un tiempo fijo: con el ramp de dificultad la
      // banda cambia de velocidad, y cruzar el tablero entero rondaba los 11 s
      // contra una espera de 12 — el test caía por los pelos según la fila.
      segundos: (Math.abs(card.col - desde) * 1.1) / row.belt.speed,
    };
  }
  return null;
});

if (!preparado) {
  console.error('ERROR: no se encontró banda con ficha verde en el mapa generado');
  process.exit(1);
}

const antes = await page.evaluate(() => (window as any).__DH.store.getState().goodCollected);
const vidasAntes = await page.evaluate(() => (window as any).__DH.store.getState().lives);

// TRAZA. Si el colaborador acaba fuera de la banda hay que poder decir CUÁNDO
// y con qué estado se fue, en vez de deducirlo: se muestrea a 10 Hz desde la
// propia página (barato) y solo se imprime si algo falla.
await page.evaluate(`(() => {
  const dh = window.__DH;
  window.__traza = [];
  window.__trazaId = setInterval(() => {
    window.__traza.push({
      t: +(dh.runtime.elapsed).toFixed(2),
      row: dh.runtime.row,
      x: +dh.runtime.x.toFixed(2),
      vidas: dh.store.getState().lives,
      arrastra: dh.runtime.dragging,
      retirada: dh.runtime.snatching,
    });
  }, 100);
})()`);

// Ni una tecla: solo el suelo moviéndose. La espera se calcula del recorrido
// real y se le da un 60% de margen, en vez de un número fijo a ojo.
const espera = Math.ceil(preparado.segundos * 1.6 * 1000) + 1500;
await page.waitForTimeout(espera);

await page.evaluate(`clearInterval(window.__trazaId)`);
const traza = (await page.evaluate(`window.__traza`)) as Array<Record<string, unknown>>;
const despues = await page.evaluate(() => {
  const dh = (window as any).__DH;
  const s = dh.store.getState();
  return {
    good: s.goodCollected,
    score: s.score,
    lives: s.lives,
    phase: s.phase,
    // Estado que explica un fallo sin tener que adivinarlo: dónde acabó, si
    // seguía en la fila de la banda, si la banda lo estaba arrastrando y si
    // algo lo tenía bloqueado (aturdido, saltando, bajo la grúa).
    x: dh.runtime.x,
    row: dh.runtime.row,
    dragging: dh.runtime.dragging,
    stepping: dh.runtime.stepping,
    snatching: dh.runtime.snatching,
    stun: dh.runtime.stunTimer,
  };
});

const recogida = await page.evaluate((info) => {
  const dh = (window as any).__DH;
  const row = dh.rows[info.row];
  return row.cards.find((c: any) => c.col === info.col)?.collected ?? false;
}, preparado);

await page.screenshot({ path: 'scripts/ui-out/belt-pickup.png' });
await browser.close();

console.log(
  `  banda fila ${preparado.row} · sentido ${preparado.dir} · ficha "${preparado.label}" en col ${preparado.col} · ` +
    `${preparado.segundos.toFixed(1)} s de arrastre (esperados ${(espera / 1000).toFixed(1)} s)`,
);
console.log(`  sin pulsar ninguna tecla: verdes ${antes} → ${despues.good} · marcador ${despues.score}`);

const fallos: string[] = [];
if (despues.row !== preparado.row) {
  // Se comprueba aparte porque es un fallo DEL MONTAJE, no de la mecánica: si
  // al colaborador lo sacaron de la banda, esta corrida no ha medido nada.
  fallos.push(
    `el colaborador salió de la banda (fila ${despues.row}, esperada ${preparado.row}, ` +
      `vidas ${vidasAntes} → ${despues.lives}): la prueba no llegó a medir la recogida`,
  );
} else if (!recogida) {
  fallos.push(
    `la banda arrastró al colaborador por encima de la ficha y NO la recogió — ` +
      `acabó en x=${despues.x.toFixed(2)} (la ficha está en x=${(preparado.col * 1.1).toFixed(2)}), ` +
      `fase ${despues.phase}, arrastrando=${despues.dragging}, saltando=${despues.stepping}, ` +
      `retirada=${despues.snatching}, aturdido=${despues.stun.toFixed(2)}, vidas=${despues.lives}`,
  );
}
if (despues.good <= antes) fallos.push('el contador de conceptos no subió');
if (errores.length) fallos.push(`errores de consola: ${errores.join(' | ')}`);

if (fallos.length) {
  // El momento en que se salió de la fila, con lo que pasaba alrededor
  const salida = traza.findIndex((p) => p.row !== preparado.row);
  const ventana = salida < 0 ? traza.slice(-6) : traza.slice(Math.max(0, salida - 4), salida + 3);
  console.error('\ntraza alrededor de la salida:');
  console.table(ventana);
  console.error('FALLOS:\n - ' + fallos.join('\n - '));
  process.exit(1);
}
console.log('OK: en el juego real, lo que la banda te pasa por debajo se recoge solo');
