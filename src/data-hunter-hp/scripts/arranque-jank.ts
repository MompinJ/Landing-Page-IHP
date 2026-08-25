/**
 * EL TIRÓN DEL ARRANQUE — qué corre DENTRO del frame que se atasca al pasar
 * del briefing a la partida.
 *
 * `jank-test.ts` dice que hay tres frames malos y dónde caen (filas 0-3);
 * `jank-cause.ts` descarta la compilación de shaders. Lo que faltaba es el
 * NOMBRE de lo que se come esos milisegundos, y ninguno de los dos podía
 * darlo: `cpu-profile.ts` arranca el perfilador DESPUÉS de pulsar «A jugar» y
 * después de avanzar hasta la ventana que mira, o sea que el frame más caro de
 * la partida —el primero— le queda siempre fuera de plano.
 *
 * Aquí el perfilador se enciende ANTES de pulsar y se apaga cinco filas
 * después. Y no se agrega el perfil entero, que volvería a enterrar el tirón
 * bajo los frames buenos: se reconstruye la línea de tiempo muestra a muestra,
 * se buscan las RÁFAGAS de trabajo seguido de más de `UMBRAL` ms —que es lo
 * que en pantalla se ve como un congelón— y se reparte el tiempo propio por
 * función DENTRO de cada ráfaga.
 *
 *   npx vite preview --port 4189 &
 *   npx tsx scripts/arranque-jank.ts [url] [filas] [umbralMs]
 */
import { chromium } from 'playwright';

const BASE = process.argv[2] ?? 'http://localhost:4189/';
const FILAS = Number(process.argv[3] ?? 5);
/** Un frame de 60 Hz son 16.7 ms: por encima de 20 ya es un salto visible. */
const UMBRAL = Number(process.argv[4] ?? 20);

const browser = await chromium.launch({
  args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'],
});
const page = await browser.newPage({ viewport: { width: 1500, height: 950 } });
page.on('pageerror', (e) => console.error('[pageerror]', String(e)));
const cdp = await page.context().newCDPSession(page);

await page.goto(`${BASE}?debug&fps=off`, { waitUntil: 'networkidle' });
await page.getByRole('button', { name: 'Jugar', exact: true }).click();
await page.waitForTimeout(4000); // el briefing, que es donde precalienta

await cdp.send('Profiler.enable');
// 0.5 ms. Con 0.1 ms —lo que usan los otros perfiles de este repo, que miran
// ventanas de dos segundos— el perfil de veinte segundos de arranque salía tan
// grande que no terminaba de transferirse por CDP. Medio milisegundo sigue
// siendo diez veces más fino que el frame que se persigue.
await cdp.send('Profiler.setSamplingInterval', { interval: 500 });
await cdp.send('Profiler.start');

await page.getByRole('button', { name: 'A jugar' }).click();
await page.evaluate(
  `new Promise((resolve) => {
     const dh = window.__DH;
     const t0 = performance.now();
     const t = setInterval(() => {
       if (dh.runtime.row >= ${FILAS} || performance.now() - t0 > 6000) { clearInterval(t); resolve(null); return; }
       window.dispatchEvent(new KeyboardEvent('keydown', { code: 'ArrowUp' }));
       setTimeout(() => window.dispatchEvent(new KeyboardEvent('keyup', { code: 'ArrowUp' })), 30);
     }, 260);
   })`,
);
const { profile } = await cdp.send('Profiler.stop');
await browser.close();

const nodos = new Map<number, { funcion: string; donde: string }>();
for (const n of profile.nodes ?? []) {
  const f = n.callFrame;
  const archivo = (f.url || '').split('/').pop() || '';
  nodos.set(n.id, {
    funcion: f.functionName || '(anónima)',
    donde: archivo ? `${archivo}:${f.lineNumber + 1}` : '(motor)',
  });
}

/**
 * RÁFAGA = tramo seguido de muestras en las que el hilo NO estaba ocioso. El
 * perfilador marca el reposo con `(idle)` / `(program)`, así que la frontera
 * entre un frame y el siguiente es justo ese hueco: sin cortar por ahí, todo
 * el arranque parecería un solo bloque de trabajo.
 */
/* `(program)` NO cuenta como reposo, aunque lo parezca: es código nativo del
   motor —subida de texturas, recolección de basura, trabajo del driver— y es
   justo donde se esconde un congelón que no es JavaScript. Metiéndolo en el
   saco del ocio, la primera versión de esta sonda partía cada tirón en trozos
   y reportaba «0 ráfagas» sobre los mismos frames de 78 ms que `jank-test`
   sí ve. Solo `(idle)` es de verdad no hacer nada. */
const OCIO = new Set(['(idle)', '(root)']);
type Rafaga = { ms: number; porFuncion: Map<string, number> };
const rafagas: Rafaga[] = [];
let actual: Rafaga | null = null;

const dt = profile.timeDeltas ?? [];
(profile.samples ?? []).forEach((id: number, i: number) => {
  const us = dt[i] ?? 0;
  const n = nodos.get(id);
  const ocioso = !n || OCIO.has(n.funcion);
  if (ocioso) {
    if (actual && actual.ms >= UMBRAL) rafagas.push(actual);
    actual = null;
    return;
  }
  actual ??= { ms: 0, porFuncion: new Map() };
  actual.ms += us / 1000;
  const clave = `${n.funcion} · ${n.donde}`;
  actual.porFuncion.set(clave, (actual.porFuncion.get(clave) ?? 0) + us / 1000);
});
if (actual && (actual as Rafaga).ms >= UMBRAL) rafagas.push(actual);

rafagas.sort((a, b) => b.ms - a.ms);
console.log(
  `\n${rafagas.length} ráfagas de más de ${UMBRAL} ms entre pulsar «A jugar» y la fila ${FILAS}\n`,
);
for (const [i, r] of rafagas.slice(0, 4).entries()) {
  console.log(`── ráfaga ${i + 1}: ${r.ms.toFixed(1)} ms ───────────────────────`);
  console.table(
    [...r.porFuncion.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([k, ms]) => ({ funcion: k.split(' · ')[0], donde: k.split(' · ')[1], ms: +ms.toFixed(1) })),
  );
}
