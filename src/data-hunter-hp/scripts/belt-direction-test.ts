/**
 * ¿HACIA DÓNDE SE VE CORRER LA BANDA?
 *
 * Las tres cosas que dicen el sentido de una banda transportadora tienen que
 * coincidir, y son independientes entre sí:
 *
 *   1. el ARRASTRE  — `updateConveyor`: `runtime.x += speed * direction * dt`
 *   2. los GALONES  — el dibujo de la textura, volteado con `repeat.x < 0`
 *   3. la GOMA      — la animación de `offset.x`
 *
 * Aquí se comprueba la (3) contra las otras dos.
 *
 * POR QUÉ NO SE MIDE SOBRE PÍXELES. La primera versión capturaba dos
 * fotogramas y correlacionaba una línea de píxeles. No sirve, y conviene que
 * quede escrito: el dibujo de la banda tiene DOS periodicidades —los galones,
 * uno por casilla (~58 px), y las costillas de la goma, ocho por casilla
 * (~7 px)—, así que la correlación tiene alias en las dos escalas. Según se
 * filtrara o no la frecuencia alta, la MISMA compilación daba «se mueve hacia
 * +x» o «hacia -x». Una medida que cambia de respuesta según el filtro no
 * prueba nada.
 *
 * Lo que sí es exacto: leer del propio material `offset.x` y `repeat.x` en dos
 * instantes. Con `vUv = uv * repeat + offset`, una marca del dibujo aparece
 * donde `u = (c - offset) / repeat`, así que su velocidad en el espacio de la
 * malla es `-(Δoffset/Δt) / repeat`. La malla NO cambia con el sentido, o sea
 * que el paso de `u` a mundo es una constante desconocida pero COMÚN a los dos
 * sentidos — y por eso basta con exigir que las dos velocidades tengan signo
 * OPUESTO y módulo parecido. No hace falta saber esa constante ni acertar con
 * la orientación de las UV del cubo.
 *
 * El fallo que motivó la prueba: `offset.x -= direction * speed * dt` junto a
 * `repeat.x = TILES_ACROSS * direction` hace que el `direction` se CANCELE
 * —queda `speed / (TILE * TILES_ACROSS)` en los dos casos—, así que la goma
 * corría siempre hacia el mismo lado mientras los galones y el empujón sí se
 * volteaban.
 *
 *   npx vite preview --port 4189 &
 *   npx tsx scripts/belt-direction-test.ts [url]
 */
import { chromium } from 'playwright';
import { BALANCE } from '../src/data/balance';

const BASE = process.argv[2] ?? 'http://localhost:4189/';
/** Ventana de medida del desplazamiento del dibujo */
const DT_MS = 400;

const browser = await chromium.launch({
  args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'],
});

interface Medida {
  fila: number;
  direction: number;
  speed: number;
  /** Velocidad del dibujo en el espacio de la malla (unidades de u por segundo) */
  vGoma: number;
}

/** Busca la textura de la goma de una fila por su Z: es la única malla de ahí
 *  con la textura repetida a lo ancho (el bastidor va sin mapa). */
const BUSCA_GOMA = (fila: number) => `(() => {
  const dh = window.__DH;
  const z = -${fila} * ${BALANCE.TILE};
  let hallada = null;
  dh.scene.traverse((o) => {
    if (hallada || !o.isMesh) return;
    const m = o.material && o.material.map;
    if (!m || Math.abs(m.repeat.x) < 2) return;
    o.updateWorldMatrix(true, false);
    if (Math.abs(o.matrixWorld.elements[14] - z) < 0.3) hallada = m;
  });
  return hallada
    ? { offset: hallada.offset.x, repeat: hallada.repeat.x, t: performance.now() }
    : { error: 'no se encontró la goma de la fila ${fila}' };
})()`;

const medidas: Medida[] = [];

for (const buscado of [1, -1] as const) {
  const page = await browser.newPage({ viewport: { width: 1400, height: 860 } });
  page.on('pageerror', (e) => console.error('[pageerror]', String(e)));
  await page.goto(`${BASE}?debug&daily&q=alto&fps=off`, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'Jugar', exact: true }).click();
  await page.waitForTimeout(250);
  await page.getByRole('button', { name: 'A jugar' }).click();
  await page.waitForTimeout(1500);

  // Se coloca al colaborador JUNTO a la banda, no encima: si lo arrastrara se
  // movería la cámara, y para esta medida no hace ninguna falta.
  const fila = await page.evaluate(
    `(() => {
      const dh = window.__DH;
      for (let i = 12; i < dh.rows.length; i++) {
        const r = dh.rows[i];
        if (r && r.type === 'belt' && r.belt && r.belt.direction === ${buscado}) {
          dh.teleport(i - 1, 0);
          return { fila: i, speed: r.belt.speed };
        }
      }
      return null;
    })()`,
  );
  if (!fila) {
    console.error(`ERROR: no hay banda con sentido ${buscado} en el mapa del día`);
    process.exit(1);
  }
  const { fila: idx, speed } = fila as { fila: number; speed: number };
  await page.waitForTimeout(700);

  const a = (await page.evaluate(BUSCA_GOMA(idx))) as Record<string, number> & { error?: string };
  if (a.error) {
    console.error('ERROR: ' + a.error);
    process.exit(1);
  }
  await page.waitForTimeout(DT_MS);
  const b = (await page.evaluate(BUSCA_GOMA(idx))) as Record<string, number> & { error?: string };
  await page.close();
  if (b.error) {
    console.error('ERROR: ' + b.error);
    process.exit(1);
  }

  const dt = (b.t - a.t) / 1000;
  const vGoma = -((b.offset - a.offset) / dt) / a.repeat;
  medidas.push({ fila: idx, direction: buscado, speed, vGoma });

  console.log(
    `  fila ${idx} · sentido ${buscado > 0 ? '+1' : '-1'} · ${speed.toFixed(2)} u/s · ` +
      `repeat ${a.repeat.toFixed(0)} · offset ${a.offset.toFixed(4)} → ${b.offset.toFixed(4)} en ${dt.toFixed(2)} s\n` +
      `    velocidad del dibujo: ${vGoma >= 0 ? '+' : ''}${vGoma.toFixed(5)} u/s`,
  );
}

await browser.close();

const [uno, otro] = medidas;
const fallos: string[] = [];

// 1) Los dos sentidos tienen que mover el dibujo hacia lados OPUESTOS.
if (Math.sign(uno.vGoma) === Math.sign(otro.vGoma)) {
  fallos.push(
    `la goma corre hacia EL MISMO lado en los dos sentidos ` +
      `(${uno.vGoma.toFixed(5)} y ${otro.vGoma.toFixed(5)} u/s): los galones y el arrastre se voltean ` +
      `con \`direction\` pero la animación de \`offset\` no, así que en uno de los dos sentidos el ` +
      `jugador ve la banda correr al revés de como lo empuja`,
  );
}

// 2) ...y a un módulo parecido: es la misma banda a velocidades casi iguales.
const rel =
  Math.abs(Math.abs(uno.vGoma) - Math.abs(otro.vGoma)) /
  Math.max(Math.abs(uno.vGoma), Math.abs(otro.vGoma));
if (rel > 0.35) {
  fallos.push(`los módulos no se parecen (${uno.vGoma.toFixed(5)} vs ${otro.vGoma.toFixed(5)} u/s)`);
}

// 3) Y el dibujo no puede estar quieto.
for (const m of medidas) {
  if (Math.abs(m.vGoma) < 1e-7) fallos.push(`la goma de la fila ${m.fila} no se mueve`);
}

if (fallos.length) {
  console.error('\nFALLOS:\n - ' + fallos.join('\n - '));
  process.exit(1);
}
console.log('\nOK: la goma corre hacia lados opuestos en los dos sentidos, como los galones y el arrastre');
