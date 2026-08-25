/**
 * LO QUE CUESTA EL BRIEFING — cuánto hilo principal se lleva la pantalla de
 * instrucciones mientras la escena sigue dibujándose detrás.
 *
 * Importa porque el briefing NO es una pausa: es cuando se compilan los
 * shaders y el gobernador de resolución toma sus medidas (ver
 * `ResolutionGovernor.tsx`). Cada recálculo de estilo y cada recolocación que
 * pida la tarjeta se los quita al mismo hilo que está midiendo, y a 120 fps el
 * presupuesto entero de un fotograma son 8.3 ms.
 *
 * Se mide con los contadores del navegador (CDP `Performance.getMetrics`) y se
 * compara con la versión anterior de la animación de las fichas, que caía
 * moviendo `top` en vez de `transform`. Mover `top` recoloca; mover
 * `transform` no.
 *
 *   npx tsx scripts/briefing-perf.ts [url]
 */
import { chromium } from 'playwright';

const URL = process.argv[2] ?? 'http://localhost:5173/';
const SEGUNDOS = 5;

/** La animación tal como estaba: cae moviendo `top`, o sea recolocando. */
const ANTES = `
  .brief-tile { top: auto; will-change: auto; }
  @keyframes brief-drift {
    from { top: -20px; opacity: 0; }
    15% { opacity: 1; }
    85% { opacity: 1; }
    to { top: 56px; opacity: 0; }
  }
  .anim-hop, .anim-side, .anim-back { will-change: auto; }
`;

async function medir(css: string | null) {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
  await page.goto(URL, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'Jugar', exact: true }).click();
  if (css) await page.addStyleTag({ content: css });
  await page.waitForTimeout(1200); // que se asiente

  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Performance.enable');
  const leer = async () => {
    const { metrics } = await cdp.send('Performance.getMetrics');
    return Object.fromEntries(metrics.map((m) => [m.name, m.value])) as Record<string, number>;
  };

  const a = await leer();
  await page.waitForTimeout(SEGUNDOS * 1000);
  const b = await leer();
  await browser.close();

  return {
    recolocaciones: b.LayoutCount - a.LayoutCount,
    msRecolocando: +((b.LayoutDuration - a.LayoutDuration) * 1000).toFixed(1),
    recalculos: b.RecalcStyleCount - a.RecalcStyleCount,
    msRecalculando: +((b.RecalcStyleDuration - a.RecalcStyleDuration) * 1000).toFixed(1),
    msScript: +((b.ScriptDuration - a.ScriptDuration) * 1000).toFixed(1),
  };
}

const antes = await medir(ANTES);
const ahora = await medir(null);

const fila = (n: string, m: Record<string, number>) =>
  `${n.padEnd(7)} recoloca ${String(m.recolocaciones).padStart(5)} veces (${String(m.msRecolocando).padStart(7)} ms)` +
  `   recalcula ${String(m.recalculos).padStart(5)} veces (${String(m.msRecalculando).padStart(7)} ms)`;

console.log(`${SEGUNDOS} s en el briefing, 1600x900\n`);
console.log(fila('antes', antes));
console.log(fila('ahora', ahora));

const ahorro = antes.msRecolocando + antes.msRecalculando - (ahora.msRecolocando + ahora.msRecalculando);
console.log(
  `\nse devuelven ${ahorro.toFixed(1)} ms de hilo principal en ${SEGUNDOS} s` +
    ` — ${(ahorro / SEGUNDOS / 1000 * 100).toFixed(2)}% del tiempo, y a 120 fps un fotograma entero son 8.3 ms`
);
