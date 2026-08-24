/**
 * Captura de las TARJETAS (palomita / tache) con etiquetas del Instituto.
 * Siembra una fila con varias tarjetas para verlas juntas.
 *
 *   npx tsx scripts/cards-shot.ts [url]
 */
import { mkdirSync } from 'node:fs';
import { chromium } from 'playwright';

const URL = process.argv[2] ?? 'http://localhost:5173/?debug';
const OUT = 'scripts/cards-out';
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
page.on('pageerror', (e) => console.error('[pageerror]', String(e)));
await page.goto(URL, { waitUntil: 'networkidle' });
await page.getByRole('button', { name: 'Jugar', exact: true }).click();
await page.waitForTimeout(250);
await page.getByRole('button', { name: 'A jugar' }).click();
await page.waitForTimeout(1500);

const shown = await page.evaluate(() => {
  const dh = (window as any).__DH;
  dh.teleport(10, 0);
  // Las MÁS LARGAS del vocabulario de TEC, que es donde la etiqueta se aprieta
  // contra el borde de la ficha: si estas caben, cabe todo lo demás.
  const good = ['CONTRASEÑA', 'ALGORITMO', 'INTANGIBLE', 'RESPALDO', 'FIREWALL', 'METADATO'];
  const bad = ['AMENAZA', 'MALWARE', 'FRAUDE'];
  // Dos filas despejadas con tarjetas repartidas
  for (const [k, r] of [12, 14].entries()) {
    dh.rows[r] = {
      index: r, type: 'yard', theme: 'port',
      stacks: [], decor: [], vehicles: [], cranes: [],
      cards: [
        { col: -5, good: true, label: good[k * 3], collected: false },
        { col: -2, good: false, label: bad[k * 3 % bad.length], collected: false },
        { col: 1, good: true, label: good[k * 3 + 1], collected: false },
        { col: 4, good: true, label: good[k * 3 + 2], collected: false },
      ],
    };
  }
  for (const r of [11, 13, 15]) {
    dh.rows[r] = { index: r, type: 'yard', theme: 'port', stacks: [], decor: [], vehicles: [], cranes: [], cards: [] };
  }
  dh.teleport(11, 0);
  dh.runtime.invulnTimer = 9999;
  return { good, bad };
});
console.log('tarjetas sembradas:', shown);

await page.waitForTimeout(900);
await page.screenshot({ path: `${OUT}/tarjetas.png` });
console.log('captura en', `${OUT}/tarjetas.png`);
await browser.close();
