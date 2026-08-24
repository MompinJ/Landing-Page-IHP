/** Capturas de todas las pantallas a tamano de telefono (vertical y horizontal).
 *  npx tsx scripts/mobile-shots.ts [url] */
import { chromium, devices } from 'playwright';

const BASE = process.argv[2] ?? 'http://localhost:4189/';
const OUT = 'scripts/mobile-out';
const browser = await chromium.launch({ args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] });

for (const [modo, vp] of [['vert', { width: 390, height: 664 }], ['horiz', { width: 844, height: 390 }]] as const) {
  const ctx = await browser.newContext({ ...devices['iPhone 13'], viewport: vp, isMobile: true, hasTouch: true });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => console.error('[pageerror]', String(e)));
  await page.goto(`${BASE}?debug&daily`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(700);

  const fuera = async (etiqueta: string) => {
    const o = await page.evaluate(() => {
      const out: string[] = [];
      document.querySelectorAll<HTMLElement>('.overlay *, .hud *').forEach((el) => {
        const r = el.getBoundingClientRect();
        if (r.width === 0 || r.height === 0) return;
        if (r.right > innerWidth + 1 || r.left < -1 || r.bottom > innerHeight + 1 || r.top < -1)
          out.push(`${(el.className || el.tagName).toString().slice(0, 34)} @${Math.round(r.left)},${Math.round(r.top)} ${Math.round(r.width)}x${Math.round(r.height)}`);
      });
      return out.slice(0, 8);
    });
    console.log(`  [${etiqueta}] fuera de pantalla: ${o.length || 'ninguno'}`);
    o.forEach((x) => console.log('      ', x));
  };

  console.log(`--- ${modo} ${vp.width}x${vp.height} ---`);
  await page.screenshot({ path: `${OUT}/${modo}-1-menu.png` }); await fuera('menu');
  await page.getByRole('button', { name: 'Jugar', exact: true }).click();
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${OUT}/${modo}-2-briefing.png` }); await fuera('briefing');
  await page.getByRole('button', { name: 'A jugar' }).click();
  await page.waitForTimeout(2500);
  await page.screenshot({ path: `${OUT}/${modo}-3-juego.png` }); await fuera('juego');
  await page.evaluate(`window.__DH.teleport(70, 0)`);
  await page.waitForTimeout(1200);
  await page.screenshot({ path: `${OUT}/${modo}-4-lejos.png` });
  await page.evaluate(`window.__DH.store.getState().endGame()`);
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${OUT}/${modo}-5-final.png` }); await fuera('final');
  await ctx.close();
}
await browser.close();
