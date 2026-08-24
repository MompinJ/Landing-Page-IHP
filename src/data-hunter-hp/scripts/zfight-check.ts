/**
 * DETECTOR DE Z-FIGHTING sobre la geometría real de la escena.
 *
 * El z-fighting de estos modelos siempre nace igual: dos caras HORIZONTALES que
 * miran hacia ARRIBA, a la MISMA altura y pisando el mismo trozo de planta. Como
 * ninguna está delante de la otra, cuál se ve depende del redondeo del buffer de
 * profundidad, y al mover la cámara la zona parpadea moteada.
 *
 * Eso se puede medir sin mirar una captura: se recorren los triángulos de cada
 * malla, se quedan los que miran hacia arriba, se agrupan por altura y se
 * rasteriza su planta en una rejilla. Cualquier celda cubierta DOS veces a la
 * misma altura es un conflicto real.
 *
 *   npx tsx scripts/zfight-check.ts [url]
 */
import { chromium } from 'playwright';

const URL = process.argv[2] ?? 'http://localhost:5173/?debug&daily';

const browser = await chromium.launch({
  args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'],
});
const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
page.on('pageerror', (e) => console.error('[pageerror]', String(e)));
await page.goto(URL, { waitUntil: 'networkidle' });
await page.getByRole('button', { name: 'Jugar', exact: true }).click();
await page.waitForTimeout(250);
await page.getByRole('button', { name: 'A jugar' }).click();
await page.waitForTimeout(1500);

/** Analiza la fila donde vive `kind` y devuelve las celdas en conflicto */
async function analizar(kind: string, tipoFila: string) {
  return page.evaluate(
    `(() => {
       const dh = window.__DH;
       const fila = dh.rows.find(r => r.type === '${tipoFila}' && r.vehicles.some(v => v.kind === '${kind}'));
       if (!fila) return null;
       const v = fila.vehicles.find(x => x.kind === '${kind}');
       v.x = v.prevX = 0;
       dh.teleport(fila.index, 0);
       dh.runtime.invulnTimer = 9999;
       return { fila: fila.index };
     })()`,
  );
}

/**
 * Rasteriza las caras que miran arriba y cuenta celdas cubiertas dos veces.
 * Se pasa como cadena porque tsx inyecta el helper \`__name\` en las funciones
 * nombradas y ese helper no existe dentro de la página.
 */
const ESCANEO = `(() => {
  const dh = window.__DH;
  const CELDA = 0.025;      // resolución de la rejilla, en unidades de mundo
  const ALTURA = 0.0004;    // tolerancia para considerar dos caras "a la misma altura"
  const conflictos = [];

  dh.scene.traverse((o) => {
    if (!o.isMesh || !o.visible || !o.geometry) return;
    const pos = o.geometry.attributes.position;
    const nor = o.geometry.attributes.normal;
    if (!pos || !nor) return;
    // Solo modelos: los suelos y el mar son planos enormes que ni pelean con
    // nada ni caben en la rejilla (reventaban el mapa de celdas).
    if (!o.geometry.boundingSphere) o.geometry.computeBoundingSphere();
    if (o.geometry.boundingSphere.radius > 8) return;
    const idx = o.geometry.index;
    const total = idx ? idx.count : pos.count;
    const cubos = new Map();   // altura -> Map(celda -> veces cubierta)
    let dobles = 0, muestraX = 0, muestraZ = 0, muestraY = 0;

    for (let t = 0; t < total; t += 3) {
      const vs = [];
      let arriba = true;
      // Se mide en espacio LOCAL del modelo, no en mundo: las embarcaciones
      // cabecean y se escoran, y una malla inclinada mete caras de alturas
      // distintas en el mismo cubo de altura — falsos positivos que cambian en
      // cada fotograma. El conflicto que importa es interno al modelo y no
      // depende de dónde esté colocado.
      for (let k = 0; k < 3; k++) {
        const i = idx ? idx.getX(t + k) : t + k;
        if (nor.getY(i) < 0.99) { arriba = false; break; }
        vs.push([pos.getX(i), pos.getY(i), pos.getZ(i)]);
      }
      if (!arriba) continue;

      const y = (vs[0][1] + vs[1][1] + vs[2][1]) / 3;
      const clave = Math.round(y / ALTURA);
      let rej = cubos.get(clave);
      if (!rej) { rej = new Map(); cubos.set(clave, rej); }

      const minX = Math.min(vs[0][0], vs[1][0], vs[2][0]);
      const maxX = Math.max(vs[0][0], vs[1][0], vs[2][0]);
      const minZ = Math.min(vs[0][2], vs[1][2], vs[2][2]);
      const maxZ = Math.max(vs[0][2], vs[1][2], vs[2][2]);
      // Triángulos enormes (suelos, mar) no interesan: nunca son el problema
      if ((maxX - minX) * (maxZ - minZ) > 40) continue;

      for (let gx = Math.floor(minX / CELDA); gx <= Math.ceil(maxX / CELDA); gx++) {
        for (let gz = Math.floor(minZ / CELDA); gz <= Math.ceil(maxZ / CELDA); gz++) {
          const cx = (gx + 0.5) * CELDA, cz = (gz + 0.5) * CELDA;
          // Punto dentro del triángulo (signos de los tres productos cruzados)
          const d1 = (cx - vs[1][0]) * (vs[0][2] - vs[1][2]) - (vs[0][0] - vs[1][0]) * (cz - vs[1][2]);
          const d2 = (cx - vs[2][0]) * (vs[1][2] - vs[2][2]) - (vs[1][0] - vs[2][0]) * (cz - vs[2][2]);
          const d3 = (cx - vs[0][0]) * (vs[2][2] - vs[0][2]) - (vs[2][0] - vs[0][0]) * (cz - vs[0][2]);
          // ESTRICTAMENTE dentro. Con "dentro o en el borde", los puntos que
          // caen justo en la diagonal que comparten los dos triángulos de una
          // misma cara se contaban dos veces: ~48 falsos positivos por caja.
          if (!(d1 > 0 && d2 > 0 && d3 > 0) && !(d1 < 0 && d2 < 0 && d3 < 0)) continue;
          const id = gx + ',' + gz;
          const n = (rej.get(id) || 0) + 1;
          rej.set(id, n);
          if (n === 2) { dobles++; muestraX += cx; muestraZ += cz; muestraY += y; }
        }
      }
    }
    if (dobles > 0) {
      const bb = o.geometry.boundingBox || (o.geometry.computeBoundingBox(), o.geometry.boundingBox);
      conflictos.push({
        celdas: dobles,
        // Para identificar el modelo: tamaño de la malla y dónde pelea
        tam: [+(bb.max.x - bb.min.x).toFixed(2), +(bb.max.y - bb.min.y).toFixed(2), +(bb.max.z - bb.min.z).toFixed(2)],
        en: [+(muestraX / dobles).toFixed(2), +(muestraY / dobles).toFixed(2), +(muestraZ / dobles).toFixed(2)],
      });
    }
  });

  conflictos.sort((a, b) => b.celdas - a.celdas);
  return {
    mallasEnConflicto: conflictos.length,
    celdasTotales: conflictos.reduce((s, c) => s + c.celdas, 0),
    peores: conflictos.slice(0, 5),
  };
})()`;

for (const [kind, tipo] of [
  ['tug', 'water'],
  ['tug', 'water'],
  ['sail', 'water'],
  ['yacht', 'water'],
  ['fish', 'water'],
  ['ship', 'water'],
] as const) {
  const donde = await analizar(kind, tipo);
  if (!donde) {
    console.log(kind, '→ no hay ninguno en el mapa generado');
    continue;
  }
  await page.waitForTimeout(700);
  console.log(kind, donde, JSON.stringify(await page.evaluate(ESCANEO), null, 1));
}

await browser.close();
