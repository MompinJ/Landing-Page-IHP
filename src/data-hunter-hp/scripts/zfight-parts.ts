/**
 * ¿QUÉ DOS PIEZAS se disputan el píxel? — el paso que le falta al mapa de
 * parpadeo.
 *
 * Pinta cada caja del modelo (`mergedBoxes` las concatena en orden, 24 vértices
 * cada una) de un color distinto, dibuja el fotograma en dos fases del cabeceo
 * y mira qué par de colores se turna en los píxeles que parpadean. El índice que
 * saca es el de la lista de piezas de `xxxParts()` en models.tsx.
 *
 *   npx tsx scripts/zfight-parts.ts [kind]
 */
import { chromium } from 'playwright';

const KIND = process.argv[2] ?? 'fish';

const browser = await chromium.launch({ args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
page.on('pageerror', (e) => console.error('[pageerror]', String(e)));
await page.goto('http://localhost:5173/?debug&daily', { waitUntil: 'networkidle' });
await page.getByRole('button', { name: 'Jugar', exact: true }).click();
await page.waitForTimeout(250);
await page.getByRole('button', { name: 'A jugar' }).click();
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
if (!donde) { console.log(KIND, '→ no hay ninguno'); await browser.close(); process.exit(0); }
await page.waitForTimeout(1200);

const out = await page.evaluate(`(() => {
  const dh = window.__DH;
  const gl = dh.gl, scene = dh.scene, cam = dh.camera;
  const ctx = gl.getContext();
  const w = gl.domElement.width, h = gl.domElement.height;
  const zFila = -dh.runtime.row * 1.1;

  scene.updateMatrixWorld(true);
  let malla = null, mejor = 1e9;
  scene.traverse((o) => {
    if (!o.isMesh || !o.visible || !o.geometry) return;
    if (!o.geometry.boundingBox) o.geometry.computeBoundingBox();
    const bb = o.geometry.boundingBox;
    const lx = bb.max.x - bb.min.x, lz = bb.max.z - bb.min.z;
    if (lx < 3 || lx > 10 || lz < 0.9 || lz > 2.0) return;
    const p = new o.position.constructor(); o.getWorldPosition(p);
    if (Math.abs(p.z - zFila) > 0.6) return;
    if (Math.abs(p.x) < mejor) { mejor = Math.abs(p.x); malla = o; }
  });
  if (!malla) return { error: 'no encuentro el barco' };

  // Material plano con color por vértice (el de los acentos que brillan)
  let basico = null;
  scene.traverse((o) => {
    const m = o.isMesh && (Array.isArray(o.material) ? o.material[0] : o.material);
    if (!basico && m && m.type === 'MeshBasicMaterial' && m.vertexColors) basico = m;
  });
  if (!basico) return { error: 'no hay material basico con vertexColors' };

  const geo = malla.geometry;
  const nv = geo.attributes.position.count;
  const piezas = Math.round(nv / 24);
  if (piezas * 24 !== nv) return { error: 'la malla no son solo cajas: ' + nv + ' vertices' };

  // Una paleta bien separada, una entrada por pieza
  const PAL = [];
  for (let i = 0; i < piezas; i++) {
    PAL.push([((i % 4) + 1) / 4, ((Math.floor(i / 4) % 4) + 1) / 4, ((Math.floor(i / 16) % 4) + 1) / 4]);
  }
  const colOrig = geo.attributes.color.array.slice();
  for (let v = 0; v < nv; v++) {
    const c = PAL[Math.floor(v / 24)];
    geo.attributes.color.array[v * 3] = c[0];
    geo.attributes.color.array[v * 3 + 1] = c[1];
    geo.attributes.color.array[v * 3 + 2] = c[2];
  }
  geo.attributes.color.needsUpdate = true;
  const matOrig = malla.material;
  const mat = basico.clone();
  mat.color.setRGB(1, 1, 1); mat.fog = false; mat.toneMapped = false;
  malla.material = mat;

  const leer = () => {
    scene.updateMatrixWorld(true);
    gl.setRenderTarget(null);
    gl.render(scene, cam);
    const b = new Uint8Array(w * h * 4);
    ctx.readPixels(0, 0, w, h, ctx.RGBA, ctx.UNSIGNED_BYTE, b);
    return b;
  };

  const g = malla.parent;
  const bx = g.position.x, by = g.position.y, bz = g.rotation.z;
  const N = 18;
  const cuadros = [];
  for (let k = 0; k < N; k++) {
    // MONÓTONO a propósito: si el barco fuera y viniera (como en el cabeceo
    // real), cada borde cruzaría el píxel de ida y de vuelta y saldría marcado
    // sin tener ningún conflicto. Avanzando siempre en el mismo sentido, una
    // silueta cruza el píxel UNA vez y solo alterna lo que se pelea el z.
    g.position.x = bx + (k / N) * 0.09;
    cuadros.push(leer());
  }
  g.position.x = bx; g.position.y = by; g.rotation.z = bz;

  // Referencia: el color con el que sale cada pieza ya codificada a sRGB
  const aSRGB = (c) => Math.round(255 * (c <= 0.0031308 ? c * 12.92 : 1.055 * Math.pow(c, 1 / 2.4) - 0.055));
  const ref = PAL.map((c) => c.map(aSRGB));
  const cual = (buf, o) => {
    let mejorI = -1, mejorD = 26;
    for (let i = 0; i < ref.length; i++) {
      const d = Math.abs(buf[o] - ref[i][0]) + Math.abs(buf[o + 1] - ref[i][1]) + Math.abs(buf[o + 2] - ref[i][2]);
      if (d < mejorD) { mejorD = d; mejorI = i; }
    }
    return mejorI;
  };

  // Píxeles donde dos piezas se TURNAN ida y vuelta. Una silueta que se desplaza
  // cruza el píxel una vez (un solo cambio); el z-fighting lo hace saltar una y
  // otra vez, así que lo que delata es el número de CAMBIOS, no cuántas piezas
  // se ven.
  const pares = new Map();
  for (let i = 0; i < w * h; i++) {
    const o = i * 4;
    const serie = [];
    for (let k = 0; k < N; k++) serie.push(cual(cuadros[k], o));
    let cambios = 0;
    const cuenta = new Map();
    for (let k = 1; k < N; k++) {
      if (serie[k] === serie[k - 1] || serie[k] < 0 || serie[k - 1] < 0) continue;
      cambios++;
      const p = [serie[k - 1], serie[k]].sort((a, b) => a - b).join('+');
      cuenta.set(p, (cuenta.get(p) || 0) + 1);
    }
    if (cambios < 3) continue;
    for (const [p, c] of cuenta) if (c >= 2) pares.set(p, (pares.get(p) || 0) + 1);
  }

  geo.attributes.color.array.set(colOrig);
  geo.attributes.color.needsUpdate = true;
  malla.material = matOrig;

  return { piezas, pares: [...pares.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12) };
})()`);

const r = out as Record<string, unknown>;
if (r.error) { console.log(r.error); await browser.close(); process.exit(1); }
console.log(KIND, '—', r.piezas, 'cajas en la malla');
console.log('pares de piezas que se turnan el píxel (índice en xxxParts()):');
for (const [par, n] of r.pares as [string, number][]) console.log(`  ${String(n).padStart(5)} px   piezas ${par}`);
await browser.close();
