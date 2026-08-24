/**
 * ¿DE DÓNDE SALEN LAS LLAMADAS DE DIBUJO?
 *
 * `gpu-profile.ts` dice CUÁNTAS hay (660–970 por frame). Este dice QUIÉNES son,
 * que es lo único que permite atacarlas.
 *
 * Importa porque en WebGL cada llamada de dibujo cuesta trabajo de CPU en el
 * hilo de JS (validar estado, enlazar buffers, cruzar al proceso de GPU), y ese
 * coste NO lo arregla tener buena tarjeta. Es la explicación de por qué un
 * juego nativo mucho más pesado puede ir mejor que este: no compite en
 * triángulos, compite en llamadas, y un motor nativo hace 3.000 sin despeinarse
 * mientras que en WebGL 900 ya se notan.
 *
 * Se recorre la escena agrupando las mallas VISIBLES por su etiqueta, y se
 * cuenta aparte cuántas de ellas proyectan sombra — porque esas se dibujan DOS
 * veces por frame (una en el mapa de sombras y otra en la escena).
 *
 *   npx vite preview --port 4189 &
 *   npx tsx scripts/drawcall-audit.ts [url] [fila]
 */
import { chromium } from 'playwright';

const BASE = process.argv[2] ?? 'http://localhost:4189/';
const ROW = Number(process.argv[3] ?? 22);
/** Nivel gráfico y tamaño de ventana. Por omisión el del stand; con `movil` se
 *  mide lo que de verdad envía un teléfono, que ve menos mundo y no dibuja
 *  sombras — o sea otro reparto completamente distinto. */
const NIVEL = process.argv[4] ?? 'alto';
const ANCHO = Number(process.argv[5] ?? 1600);
const ALTO = Number(process.argv[6] ?? 900);

const browser = await chromium.launch({
  args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'],
});
const page = await browser.newPage({ viewport: { width: ANCHO, height: ALTO } });
page.on('pageerror', (e) => console.error('[pageerror]', String(e)));
await page.goto(`${BASE}?debug&daily&fps=off&q=${NIVEL}`, { waitUntil: 'networkidle' });
await page.getByRole('button', { name: 'Jugar', exact: true }).click();
await page.waitForTimeout(250);
await page.getByRole('button', { name: 'A jugar' }).click();
await page.waitForTimeout(1800);
await page.evaluate((r) => (window as any).__DH.teleport(r, 0), ROW);
await page.waitForTimeout(1200);

const informe = await page.evaluate(`(() => {
  const dh = window.__DH;
  const cam = dh.camera;

  // Solo lo que de verdad entra en cuadro. El frustum se extrae A MANO de la
  // matriz proyeccion*vista (three no expone su THREE en la pagina, y tampoco
  // registra que objetos descarto): son los seis planos de Gribb-Hartmann.
  cam.updateMatrixWorld();
  const p = cam.projectionMatrix.elements, v = cam.matrixWorldInverse.elements;
  // m = proyeccion * vista, en el orden por columnas de three
  const m = new Array(16);
  for (let c = 0; c < 4; c++) for (let r2 = 0; r2 < 4; r2++) {
    let sum = 0;
    for (let k = 0; k < 4; k++) sum += p[k * 4 + r2] * v[c * 4 + k];
    m[c * 4 + r2] = sum;
  }
  const e = (col, row) => m[col * 4 + row];
  const planos = [
    [e(0,3)+e(0,0), e(1,3)+e(1,0), e(2,3)+e(2,0), e(3,3)+e(3,0)],
    [e(0,3)-e(0,0), e(1,3)-e(1,0), e(2,3)-e(2,0), e(3,3)-e(3,0)],
    [e(0,3)+e(0,1), e(1,3)+e(1,1), e(2,3)+e(2,1), e(3,3)+e(3,1)],
    [e(0,3)-e(0,1), e(1,3)-e(1,1), e(2,3)-e(2,1), e(3,3)-e(3,1)],
    [e(0,3)+e(0,2), e(1,3)+e(1,2), e(2,3)+e(2,2), e(3,3)+e(3,2)],
    [e(0,3)-e(0,2), e(1,3)-e(1,2), e(2,3)-e(2,2), e(3,3)-e(3,2)],
  ].map(([a,b,c2,d]) => { const n = Math.hypot(a,b,c2) || 1; return [a/n,b/n,c2/n,d/n]; });

  const dentro = (o) => {
    const g = o.geometry;
    if (!g) return true;
    if (!g.boundingSphere) g.computeBoundingSphere();
    const bs = g.boundingSphere;
    if (!bs) return true;
    // centro a mundo
    const mw = o.matrixWorld.elements;
    const cx = bs.center.x, cy = bs.center.y, cz = bs.center.z;
    const wx = mw[0]*cx + mw[4]*cy + mw[8]*cz + mw[12];
    const wy = mw[1]*cx + mw[5]*cy + mw[9]*cz + mw[13];
    const wz = mw[2]*cx + mw[6]*cy + mw[10]*cz + mw[14];
    // radio escalado por el mayor factor de escala
    const s = Math.sqrt(Math.max(
      mw[0]*mw[0]+mw[1]*mw[1]+mw[2]*mw[2],
      mw[4]*mw[4]+mw[5]*mw[5]+mw[6]*mw[6],
      mw[8]*mw[8]+mw[9]*mw[9]+mw[10]*mw[10]));
    const r3 = bs.radius * s;
    for (const [a,b,c2,d] of planos) if (a*wx + b*wy + c2*wz + d < -r3) return false;
    return true;
  };

  const grupos = {};
  let visibles = 0, sombra = 0, triangulos = 0;

  dh.scene.traverse((o) => {
    if (!o.isMesh || !o.visible) return;
    let p = o.parent, oculto = false;
    while (p) { if (!p.visible) { oculto = true; break; } p = p.parent; }
    if (oculto) return;
    if (!dentro(o)) return;

    visibles++;
    if (o.castShadow) sombra++;
    const idx = o.geometry?.index;
    const pos = o.geometry?.attributes?.position;
    const tris = idx ? idx.count / 3 : pos ? pos.count / 3 : 0;
    triangulos += tris;

    // Etiqueta: el nombre propio, si no el del padre, si no el tipo de material
    // Las mallas no llevan nombre, asi que agrupar por material dejaba dos
    // cubos gigantes que no dicen nada. La GEOMETRIA si distingue: cada modelo
    // fusionado tiene la suya (render/boxes.ts la cachea por variante), asi que
    // el numero de vertices separa un contenedor de una grua de una ficha.
    const geo = o.geometry;
    const verts = geo?.attributes?.position?.count ?? 0;
    const conMapa = o.material && !Array.isArray(o.material) && o.material.map ? '+tex' : '';
    // Sin plantillas de texto: este bloque viaja DENTRO de una, y una comilla
    // invertida aqui la cierra antes de tiempo.
    const tipo = (o.material && o.material.type ? o.material.type : '?')
      .replace('Mesh', '').replace('Material', '');
    const etiqueta = o.name || (o.parent && o.parent.name) || (tipo + conMapa + ':' + verts + 'v');
    const g = grupos[etiqueta] || (grupos[etiqueta] = { mallas: 0, sombra: 0, tri: 0 });
    g.mallas++;
    if (o.castShadow) g.sombra++;
    g.tri += tris;
  });

  return {
    visibles, sombra, triangulos: Math.round(triangulos),
    llamadas: dh.gl.info.render.calls,
    grupos: Object.entries(grupos)
      .map(([k, v]) => ({ etiqueta: k, ...v }))
      .sort((a, b) => b.mallas - a.mallas)
      .slice(0, 18),
  };
})()`);

await browser.close();

const r = informe as any;
console.log(
  `\nmallas visibles en cuadro: ${r.visibles} · de ellas proyectan sombra: ${r.sombra}\n` +
    `triángulos: ${(r.triangulos / 1000).toFixed(0)}k · llamadas de dibujo del último frame: ${r.llamadas}\n` +
    `\nLa pasada de sombras dibuja OTRA VEZ las ${r.sombra} que la proyectan:\n` +
    `  coste aproximado = ${r.visibles} + ${r.sombra} = ${r.visibles + r.sombra} envíos por frame\n`,
);

console.table(
  Object.fromEntries(
    r.grupos.map((g: any) => [
      g.etiqueta,
      { mallas: g.mallas, 'proyectan sombra': g.sombra, 'triángulos': Math.round(g.tri) },
    ]),
  ),
);

const top = r.grupos[0];
console.log(
  `\nel grupo que más pesa es "${top.etiqueta}" con ${top.mallas} mallas ` +
    `(${((top.mallas / r.visibles) * 100).toFixed(0)}% de lo visible)`,
);
