/**
 * MAPA DE PARPADEO — mide el z-fighting tal y como se ve, no en la geometría.
 *
 * Congela el bucle de render, dibuja el fotograma a mano, mueve el barco una
 * FRACCIÓN DE PÍXEL (lo que hace de por sí navegando) y vuelve a dibujar. Los
 * píxeles que cambian de color DE GOLPE entre los dos fotogramas son caras que
 * se están disputando el píxel: eso es exactamente lo que se ve parpadear.
 *
 * Deja dos PNG: el fotograma y la máscara en magenta sobre él.
 *
 *   npx tsx scripts/flicker-map.ts [kind]
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { chromium } from 'playwright';

const KIND = process.argv[2] ?? 'fish';
const OUT = 'scripts/flicker-out';
mkdirSync(OUT, { recursive: true });

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
console.log(KIND, donde);
await page.waitForTimeout(1200);

const res = await page.evaluate(`(() => {
  const dh = window.__DH;
  const gl = dh.gl, scene = dh.scene, cam = dh.camera;
  const ctx = gl.getContext();
  const w = gl.domElement.width, h = gl.domElement.height;

  // El grupo del barco: la malla alargada que está EN LA FILA DEL JUGADOR y más
  // cerca de x=0. Sin atarlo a la fila, el primer casco que encaja por tamaño
  // acaba siendo un camión de otro bioma, fuera de cámara.
  const zFila = -dh.runtime.row * 1.1;
  let grupo = null, mejor = 1e9, tam = null;
  scene.updateMatrixWorld(true);
  scene.traverse((o) => {
    if (!o.isMesh || !o.visible || !o.geometry) return;
    if (!o.geometry.boundingBox) o.geometry.computeBoundingBox();
    const bb = o.geometry.boundingBox;
    const lx = bb.max.x - bb.min.x, lz = bb.max.z - bb.min.z;
    if (lx < 3 || lx > 10 || lz < 0.9 || lz > 2.0) return;
    const p = new o.position.constructor();
    o.getWorldPosition(p);
    if (Math.abs(p.z - zFila) > 0.6) return;
    if (Math.abs(p.x) < mejor) {
      mejor = Math.abs(p.x); grupo = o.parent;
      tam = [+lx.toFixed(2), +(bb.max.y - bb.min.y).toFixed(2), +lz.toFixed(2)];
    }
  });
  if (!grupo) return { error: 'no encuentro el barco' };

  const leer = () => {
    scene.updateMatrixWorld(true);
    // El EffectComposer deja su render target activo: sin esto el dibujo se va
    // a esa textura y readPixels sigue leyendo el último fotograma compuesto
    gl.setRenderTarget(null);
    gl.render(scene, cam);
    const buf = new Uint8Array(w * h * 4);
    ctx.readPixels(0, 0, w, h, ctx.RGBA, ctx.UNSIGNED_BYTE, buf);
    return buf;
  };

  // BARRIDO del cabeceo real: el barco no está quieto ni un fotograma, y es
  // justo ese vaivén el que hace que dos caras a la misma profundidad se turnen
  // el píxel. Se recorre el ciclo entero (ver FloatingBoat en models.tsx).
  const N = 18;
  const bx = grupo.position.x, by = grupo.position.y, bz = grupo.rotation.z;
  const cuadros = [];
  for (let k = 0; k < N; k++) {
    // MONÓTONO a propósito: si el barco fuera y viniera (como en el cabeceo
    // real), cada borde cruzaría el píxel de ida y de vuelta y saldría marcado
    // sin tener ningún conflicto. Avanzando siempre en el mismo sentido, una
    // silueta cruza el píxel UNA vez y solo alterna lo que se pelea el z.
    grupo.position.x = bx + (k / N) * 0.09;
    cuadros.push(leer());
  }
  grupo.position.x = bx; grupo.position.y = by; grupo.rotation.z = bz;
  const a = cuadros[0];

  // Un borde que se desplaza cruza un píxel UNA vez: cambia y se queda. Dos
  // caras disputándose la profundidad lo hacen parpadear una y otra vez, así
  // que lo que delata el z-fighting es el número de SALTOS, no el salto.
  const marca = new Uint8Array(w * h);
  let n = 0, minX = w, maxX = 0, minY = h, maxY = 0;
  /** Control de que el barrido llega de verdad al render */
  let movidos = 0;
  for (let i = 0; i < w * h; i++) {
    const o = i * 4;
    const m = cuadros[Math.floor(N / 2)];
    if (Math.abs(a[o] - m[o]) + Math.abs(a[o + 1] - m[o + 1]) + Math.abs(a[o + 2] - m[o + 2]) > 12) movidos++;
    let saltos = 0;
    for (let k = 1; k < N; k++) {
      const p = cuadros[k - 1], q = cuadros[k];
      const d = Math.max(Math.abs(p[o] - q[o]), Math.abs(p[o + 1] - q[o + 1]), Math.abs(p[o + 2] - q[o + 2]));
      if (d > 40) saltos++;
    }
    if (saltos < 4) continue;
    marca[i] = 1; n++;
    const x = i % w, y = Math.floor(i / w);
    if (x < minX) minX = x; if (x > maxX) maxX = x;
    if (y < minY) minY = y; if (y > maxY) maxY = y;
  }

  // Sobreimprimir la máscara en magenta sobre el fotograma (readPixels viene
  // del revés respecto al canvas 2D)
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
  const c2 = cv.getContext('2d');
  const img = c2.createImageData(w, h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const src = ((h - 1 - y) * w + x) * 4, dst = (y * w + x) * 4;
      const m = marca[(h - 1 - y) * w + x];
      img.data[dst] = m ? 255 : a[src];
      img.data[dst + 1] = m ? 0 : a[src + 1];
      img.data[dst + 2] = m ? 255 : a[src + 2];
      img.data[dst + 3] = 255;
    }
  }
  c2.putImageData(img, 0, 0);
  const plano = document.createElement('canvas'); plano.width = w; plano.height = h;
  const c3 = plano.getContext('2d');
  const img2 = c3.createImageData(w, h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const src = ((h - 1 - y) * w + x) * 4, dst = (y * w + x) * 4;
    img2.data[dst] = a[src]; img2.data[dst + 1] = a[src + 1]; img2.data[dst + 2] = a[src + 2]; img2.data[dst + 3] = 255;
  }
  c3.putImageData(img2, 0, 0);
  return { tam, pixeles: n, movidos, caja: [minX, minY, maxX, maxY], w, h, mascara: cv.toDataURL(), base: plano.toDataURL() };
})()`);

const r = res as Record<string, unknown>;
if (r.error) { console.log(r.error); await browser.close(); process.exit(1); }
console.log('barco', r.tam, '| píxeles que parpadean:', r.pixeles, '| píxeles que se movieron:', r.movidos, 'en la caja', r.caja, 'de', r.w + 'x' + r.h);
for (const [k, f] of [['mascara', 'mascara'], ['base', 'fotograma']] as const) {
  writeFileSync(`${OUT}/${KIND}-${f}.png`, Buffer.from(String(r[k]).split(',')[1], 'base64'));
}
console.log('capturas en', OUT);
await browser.close();
