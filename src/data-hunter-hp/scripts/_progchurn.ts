import { chromium, devices } from 'playwright';
const BASE = process.argv[2] ?? 'http://localhost:4197/';
const b = await chromium.launch({ args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist', '--disable-frame-rate-limit'] });
const ctx = await b.newContext({ ...devices['iPhone 13'] });
const p = await ctx.newPage();
p.on('pageerror', (e) => console.error('[pageerror]', String(e)));
await p.goto(`${BASE}?debug&daily&fps=off`, { waitUntil: 'networkidle' });
await p.getByRole('button', { name: 'Jugar', exact: true }).click();
await p.waitForTimeout(4500);
await p.getByRole('button', { name: 'A jugar' }).click();
await p.waitForTimeout(500);
const r: any = await p.evaluate(`(async () => {
  const dh = window.__DH;
  const claves = () => dh.gl.info.programs.map(x => x.cacheKey);
  let prev = claves();
  const quitados = {}, puestos = {};
  for (let f = 0; f <= 65; f++) {
    dh.teleport(f, (f % 5) - 2);
    await new Promise(r => setTimeout(r, 110));
    const cur = claves();
    prev.filter(k => !cur.includes(k)).forEach(k => quitados[k] = (quitados[k]||0)+1);
    cur.filter(k => !prev.includes(k)).forEach(k => puestos[k] = (puestos[k]||0)+1);
    prev = cur;
  }
  return { quitados, puestos };
})()`);
const resume = (o: any, t: string) => {
  const e = Object.entries(o).sort((a: any, x: any) => x[1] - a[1]);
  console.log(`\n=== ${t} (${e.length} distintos) ===`);
  e.slice(0, 8).forEach(([k, n]) => console.log(`  ×${n}  ${k.slice(0, 190)}`));
};
resume(r.quitados, 'shaders DESCARTADOS en partida');
resume(r.puestos, 'shaders RE-ENLAZADOS en partida');
await b.close();
