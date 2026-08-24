/**
 * TIRONES (no fps medios). «Va trabado» casi nunca significa «va a 20 fps de
 * media»: significa que cada pocos segundos hay un frame de 100 ms que se
 * COME el movimiento. Un juego a 600 fps de media con un tirón de 150 ms cada
 * cuatro segundos se siente peor que uno clavado a 60.
 *
 * Y los fps medios ESCONDEN eso: 300 frames de 1.6 ms con dos de 200 ms dan una
 * media de 2.9 ms, que parece perfecta.
 *
 * Aquí se juega de verdad (avanzando fila a fila, no teletransportando) y se
 * mide la DISTRIBUCIÓN: mediana, p99, el peor frame y cuántos pasan del
 * presupuesto de 120 fps (8.3 ms) y de 60 fps (16.7 ms).
 *
 * Los tres sospechosos habituales en WebGL, por orden:
 *  1. COMPILACIÓN DE SHADERS: cada material nuevo que entra en cuadro por
 *     primera vez congela el hilo mientras se compila y enlaza su programa.
 *  2. GENERACIÓN DE MAPA: `extendRowsIfNeeded` siembra un lote de filas enteras
 *     en el hilo principal.
 *  3. FUSIÓN DE GEOMETRÍA perezosa: la primera vez que aparece un modelo se
 *     construye su geometría fusionada.
 *
 *   npx vite preview --port 4189 &
 *   npx tsx scripts/jank-test.ts [url] [nivel]
 */
import { chromium } from 'playwright';

const BASE = process.argv[2] ?? 'http://localhost:4189/';
const NIVEL = process.argv[3] ?? 'alto';
/** Segundos que el jugador pasa leyendo el briefing. Es el hueco del que
 *  dispone el precalentado (`Warmup.tsx`), así que la prueba lo parametriza:
 *  con 0.25 s se mide el peor caso (alguien que lo salta a ciegas) y con 4 s
 *  el caso real de quien lee las instrucciones. */
const BRIEFING = Number(process.argv[4] ?? 0.25);

const browser = await chromium.launch({
  args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist', '--disable-frame-rate-limit'],
});
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
page.on('pageerror', (e) => console.error('[pageerror]', String(e)));
await page.goto(`${BASE}?debug&daily&q=${NIVEL}`, { waitUntil: 'networkidle' });
await page.getByRole('button', { name: 'Jugar', exact: true }).click();
await page.waitForTimeout(BRIEFING * 1000);
await page.getByRole('button', { name: 'A jugar' }).click();

// SIN calentamiento largo a propósito: los tirones de compilación de shaders
// ocurren al principio y al cruzar a un bioma nuevo, que es justo cuando el
// jugador los sufre. Descartar los primeros segundos los escondería.
await page.waitForTimeout(600);

// ¿Llegó a hacer algo el precalentado? Si la caché de variantes está casi vacía
// al empezar a jugar, es que no le dio tiempo — y entonces lo que hay que medir
// es eso y no los frames.
const precalentado = await page.evaluate(
  `({
     variantes: window.__DH.mergedCacheSize(),
     programas: window.__DH.gl.info.programs.length,
     claves: window.__DH.gl.info.programs.map((p) => p.cacheKey),
   })`,
);
console.log(
  `\nal empezar a jugar: ${(precalentado as any).variantes} variantes de geometría ` +
    `y ${(precalentado as any).programas} programas ya en caché`,
);

const datos: { times: number[]; filas: number[]; programas: number[]; geometrias: number[] } = await page.evaluate(
  `new Promise((resolve) => {
     const dh = window.__DH;
     const times = [];
     const filas = [];
     const programas = [];
     const geometrias = [];
     let last = performance.now();
     requestAnimationFrame(function step() {
       const now = performance.now();
       times.push(now - last);
       filas.push(dh.runtime.row);
       // Para saber QUE causa el tiron: si el contador de programas salta justo
       // en el frame lento, es compilacion de shaders; si salta el de
       // geometrias, es fusion perezosa; si no salta ninguno, es otra cosa.
       programas.push(dh.gl.info.programs ? dh.gl.info.programs.length : 0);
       geometrias.push(dh.gl.info.memory.geometries);
       last = now;
       // El avance va POR FRAMES, no por reloj: con el limite de vsync quitado
       // el navegador da ~700 fps, asi que un paso cada 280 ms recorria seis
       // filas en toda la prueba — ni cruzaba a otro bioma ni disparaba el
       // generador de mapa, que son justo los dos momentos donde se sospecha
       // que hay tiron.
       if (times.length % 10 === 0 && dh.runtime.moveQueue.length === 0 && !dh.runtime.stepping) {
         dh.runtime.moveQueue.push('forward');
       }
       if (times.length < 4000) requestAnimationFrame(step);
       else resolve({ times, filas, programas, geometrias });
     });
   })`,
);

// Qué shaders se compilaron DURANTE la partida: son los que el precalentado no
// llegó a tocar, y nombrarlos es la única forma de saber qué falta montar.
const despues: { claves: string[]; variantes: number } = await page.evaluate(
  `({ claves: window.__DH.gl.info.programs.map((p) => p.cacheKey), variantes: window.__DH.mergedCacheSize() })`,
);
const antes = new Set((precalentado as any).claves as string[]);
const nuevos = despues.claves.filter((k) => !antes.has(k));

await browser.close();

if (nuevos.length) {
  console.log(`\nshaders compilados DURANTE la partida (${nuevos.length}) — esto es lo que falta precalentar:`);
  for (const k of nuevos) console.log('  · ' + k.slice(0, 150));
} else {
  console.log('\nningún shader nuevo durante la partida: el precalentado los cubre todos');
}
console.log(
  `variantes de geometría: ${(precalentado as any).variantes} antes → ${despues.variantes} después ` +
    `(${despues.variantes - (precalentado as any).variantes} nuevas en partida)`,
);

const t = datos.times.slice(2);
const orden = [...t].sort((a, b) => a - b);
const pct = (p: number) => orden[Math.floor(orden.length * p)];
const mediana = pct(0.5);
const p99 = pct(0.99);
const peor = orden[orden.length - 1];
const sobre120 = t.filter((x) => x > 1000 / 120).length;
const sobre60 = t.filter((x) => x > 1000 / 60).length;
const filasRecorridas = datos.filas[datos.filas.length - 1] - datos.filas[0];

console.log(`\nnivel ${NIVEL} · briefing ${BRIEFING}s · ${t.length} frames · ${filasRecorridas} filas recorridas jugando\n`);
console.table({
  mediana: { ms: +mediana.toFixed(2), fps: +(1000 / mediana).toFixed(0) },
  p99: { ms: +p99.toFixed(2), fps: +(1000 / p99).toFixed(0) },
  'peor frame': { ms: +peor.toFixed(2), fps: +(1000 / peor).toFixed(0) },
});
console.log(
  `frames por encima del presupuesto de 120 fps (8.3 ms): ${sobre120} ` +
    `(${((sobre120 / t.length) * 100).toFixed(1)}%)\n` +
    `frames por encima del de 60 fps (16.7 ms): ${sobre60} ` +
    `(${((sobre60 / t.length) * 100).toFixed(1)}%)`,
);

// Los tirones gordos, con la fila en la que cayeron: si se agrupan en las
// fronteras de bioma, son shaders; si caen cada ~24 filas, es el generador.
const tirones = t
  .map((ms, i) => ({
    ms,
    fila: datos.filas[i + 2],
    // cuánto CRECIERON los contadores en ese mismo frame
    programas: datos.programas[i + 2] - datos.programas[i + 1],
    geometrias: datos.geometrias[i + 2] - datos.geometrias[i + 1],
  }))
  .sort((a, b) => b.ms - a.ms)
  .slice(0, 10);
{
  console.log(`\nlos 10 frames más lentos (y qué creció en ese mismo frame):`);
  console.table(
    tirones.map((x) => ({
      'ms': +x.ms.toFixed(1),
      'en la fila': x.fila,
      'shaders compilados': x.programas,
      'geometrías nuevas': x.geometrias,
    })),
  );
  const porShader = tirones.filter((x) => x.programas > 0).length;
  console.log(
    `\n${porShader} de los 10 peores coinciden con compilación de shaders` +
      ` · programas totales al final: ${datos.programas[datos.programas.length - 1]}`,
  );
}
