/**
 * DETECTOR DE Z-FIGHTING GENERAL — el complemento de `zfight-check.ts`.
 *
 * Aquel solo mira caras que apuntan hacia ARRIBA y solo compara triángulos
 * DENTRO de una misma malla. Se le escapan los dos casos que más se ven:
 *
 *   - caras VERTICALES a ras (costados, regalas, frontales de caseta)
 *   - caras de MALLAS DISTINTAS que caen en el mismo plano (el casco fusionado
 *     contra la malla de acentos brillantes, o el barco contra el pontón)
 *
 * Este recoge TODOS los triángulos del entorno del barco en espacio de MUNDO,
 * los agrupa por plano (normal + distancia al origen) y rasteriza cada grupo en
 * el plano para contar solapes. Cualquier celda cubierta dos veces por caras que
 * miran al mismo lado es un parpadeo real.
 *
 *   npx tsx scripts/zfight-deep.ts [kind]     # kind: fish, tug, sail, yacht, ship
 */
import { chromium } from 'playwright';

const KIND = process.argv[2] ?? 'fish';

const browser = await chromium.launch({ args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
page.on('pageerror', (e) => console.error('[pageerror]', String(e)));
await page.goto('http://localhost:5173/?debug&daily', { waitUntil: 'networkidle' });
await page.getByRole('button', { name: 'Iniciar misión' }).click();
await page.waitForTimeout(1500);

const donde = await page.evaluate(`(() => {
  const dh = window.__DH;
  const fila = dh.rows.find((r, i) => i > 26 && r.type === 'water' && r.vehicles.some(v => v.kind === '${KIND}'));
  if (!fila) return null;
  const v = fila.vehicles.find(x => x.kind === '${KIND}');
  fila.vehicles.length = 0; fila.vehicles.push(v);
  v.x = v.prevX = 0; v.speed = 0.0001; v.direction = 1;
  dh.teleport(fila.index, 0);
  dh.runtime.invulnTimer = 9999;
  return { fila: fila.index };
})()`);
if (!donde) { console.log(KIND, '→ no hay ninguno en el mapa'); await browser.close(); process.exit(0); }
console.log(KIND, donde);
await page.waitForTimeout(900);

const out = await page.evaluate(`(() => {
  const dh = window.__DH;
  const CELDA = 0.02;
  /** Radio alrededor del barco: solo interesa su entorno inmediato */
  const R = 4.5;
  const centro = { x: 0, z: -dh.runtime.row * 1.1 };

  // 1) Recoger triángulos del entorno, en MUNDO
  const tris = [];
  dh.scene.updateMatrixWorld(true);
  dh.scene.traverse((o) => {
    if (!o.isMesh || !o.visible || !o.geometry) return;
    const mat = Array.isArray(o.material) ? o.material[0] : o.material;
    // Las transparentes no escriben profundidad: no pueden pelear
    if (!mat || mat.transparent) return;
    const pos = o.geometry.attributes.position;
    if (!pos) return;
    if (!o.geometry.boundingSphere) o.geometry.computeBoundingSphere();
    const bs = o.geometry.boundingSphere;
    const c = bs.center.clone().applyMatrix4(o.matrixWorld);
    if (Math.hypot(c.x - centro.x, c.z - centro.z) > R + bs.radius) return;
    const bb = o.geometry.boundingBox || (o.geometry.computeBoundingBox(), o.geometry.boundingBox);
    const etiqueta = [bb.max.x - bb.min.x, bb.max.y - bb.min.y, bb.max.z - bb.min.z]
      .map((n) => n.toFixed(2)).join('x');
    const idx = o.geometry.index;
    const total = idx ? idx.count : pos.count;
    const m = o.matrixWorld.elements;
    const tw = (i) => {
      const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
      return [
        m[0] * x + m[4] * y + m[8] * z + m[12],
        m[1] * x + m[5] * y + m[9] * z + m[13],
        m[2] * x + m[6] * y + m[10] * z + m[14],
      ];
    };
    for (let t = 0; t < total; t += 3) {
      const a = tw(idx ? idx.getX(t) : t);
      const b = tw(idx ? idx.getX(t + 1) : t + 1);
      const c2 = tw(idx ? idx.getX(t + 2) : t + 2);
      const cx = (a[0] + b[0] + c2[0]) / 3, cz = (a[2] + b[2] + c2[2]) / 3;
      if (Math.hypot(cx - centro.x, cz - centro.z) > R) continue;
      // Normal
      const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2];
      const vx = c2[0] - a[0], vy = c2[1] - a[1], vz = c2[2] - a[2];
      let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
      const L = Math.hypot(nx, ny, nz);
      if (L < 1e-9) continue;
      nx /= L; ny /= L; nz /= L;
      tris.push({ a, b, c: c2, n: [nx, ny, nz], d: nx * a[0] + ny * a[1] + nz * a[2], et: etiqueta });
    }
  });

  // 2) Agrupar por PLANO: misma normal (mismo lado) y misma distancia
  const grupos = new Map();
  for (const t of tris) {
    const k = [Math.round(t.n[0] * 40), Math.round(t.n[1] * 40), Math.round(t.n[2] * 40), Math.round(t.d / 0.0006)].join(',');
    let g = grupos.get(k); if (!g) { g = []; grupos.set(k, g); }
    g.push(t);
  }

  // 3) Rasterizar cada grupo en su plano y contar celdas cubiertas dos veces
  const conflictos = [];
  for (const [, g] of grupos) {
    if (g.length < 2) continue;
    const n = g[0].n;
    // Base 2D del plano: ejes perpendicular al eje dominante de la normal
    const ax = Math.abs(n[0]) > Math.abs(n[1]) && Math.abs(n[0]) > Math.abs(n[2]) ? 0 : Math.abs(n[1]) > Math.abs(n[2]) ? 1 : 2;
    const e1 = ax === 0 ? 1 : 0;
    const e2 = ax === 2 ? 1 : 2;
    const rej = new Map();
    let dobles = 0, sx = 0, sy = 0, sz = 0;
    const fuentes = new Map();
    for (const t of g) {
      const p = [t.a, t.b, t.c].map((v) => [v[e1], v[e2]]);
      const minU = Math.min(p[0][0], p[1][0], p[2][0]), maxU = Math.max(p[0][0], p[1][0], p[2][0]);
      const minV = Math.min(p[0][1], p[1][1], p[2][1]), maxV = Math.max(p[0][1], p[1][1], p[2][1]);
      if ((maxU - minU) * (maxV - minV) > 40) continue;
      for (let gu = Math.floor(minU / CELDA); gu <= Math.ceil(maxU / CELDA); gu++) {
        for (let gv = Math.floor(minV / CELDA); gv <= Math.ceil(maxV / CELDA); gv++) {
          const cu = (gu + 0.5) * CELDA, cv = (gv + 0.5) * CELDA;
          const d1 = (cu - p[1][0]) * (p[0][1] - p[1][1]) - (p[0][0] - p[1][0]) * (cv - p[1][1]);
          const d2 = (cu - p[2][0]) * (p[1][1] - p[2][1]) - (p[1][0] - p[2][0]) * (cv - p[2][1]);
          const d3 = (cu - p[0][0]) * (p[2][1] - p[0][1]) - (p[2][0] - p[0][0]) * (cv - p[0][1]);
          if (!(d1 > 0 && d2 > 0 && d3 > 0) && !(d1 < 0 && d2 < 0 && d3 < 0)) continue;
          const id = gu + ',' + gv;
          const prev = rej.get(id);
          if (prev === undefined) { rej.set(id, t.et); continue; }
          if (prev === t.et + '#') continue;  // ya contada
          rej.set(id, t.et + '#');
          dobles++;
          sx += (t.a[0] + t.b[0] + t.c[0]) / 3; sy += (t.a[1] + t.b[1] + t.c[1]) / 3; sz += (t.a[2] + t.b[2] + t.c[2]) / 3;
          fuentes.set(prev.replace('#', '') + ' | ' + t.et, (fuentes.get(prev.replace('#', '') + ' | ' + t.et) || 0) + 1);
        }
      }
    }
    if (dobles > 4) {
      conflictos.push({
        celdas: dobles,
        normal: n.map((v) => +v.toFixed(2)),
        en: [+(sx / dobles).toFixed(3), +(sy / dobles).toFixed(3), +(sz / dobles).toFixed(3)],
        entre: [...fuentes.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3),
      });
    }
  }
  conflictos.sort((a, b) => b.celdas - a.celdas);
  return { totalTris: tris.length, conflictos: conflictos.slice(0, 10) };
})()`);

console.log('triángulos analizados:', (out as any).totalTris);
for (const c of (out as any).conflictos) {
  console.log(`${String(c.celdas).padStart(5)} celdas  normal ${JSON.stringify(c.normal)}  en ${JSON.stringify(c.en)}`);
  for (const [par, n] of c.entre) console.log(`        ${n}  ${par}`);
}
await browser.close();
