import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

/**
 * FUSIÓN DE GEOMETRÍA — la optimización que sostiene el rendimiento del juego.
 *
 * Los modelos son low-poly de cajas: un crucero son ~90 `<mesh>`, un andamio 21.
 * Medido con `scripts/gpu-profile.ts`, la escena llegaba a 2.300 mallas y 3.400
 * draw calls por frame... para solo 88.000 triángulos. Es decir: el juego NO era
 * pesado de geometría, era pesado de LLAMADAS. Cada caja arrastraba su propio
 * buffer en GPU, su propio material y su propia llamada de dibujo (y otra más en
 * la pasada de sombras).
 *
 * La solución estándar: fusionar de antemano las partes ESTÁTICAS de cada modelo
 * en UNA geometría, guardando el color de cada caja en el atributo `color` de
 * sus vértices. Así todo el modelo se pinta con una sola llamada y un material
 * compartido, sin perder el aspecto de colores planos.
 *
 * Qué NO se fusiona (y por qué):
 *  - partes animadas por separado (ruedas que giran, balizas que parpadean)
 *  - partes con textura propia (contenedores, casco del crucero)
 *  - partes transparentes, que necesitan su propio orden de dibujo
 */

export interface BoxPart {
  /** Tamaño de la caja [x, y, z]. Se ignora si se da `cone`. */
  size?: [number, number, number];
  /** Cono [radio, alto, lados] — para las piezas que no son cajas (sombrillas) */
  cone?: [number, number, number];
  /** Centro de la pieza en el espacio del modelo */
  pos?: [number, number, number];
  /** Rotación en radianes, aplicada antes de trasladar */
  rot?: [number, number, number];
  /** Color plano de la pieza — va al atributo de vértice */
  color: string;
  /** Mapeo de UV a ESCALA DE MUNDO (ver `applyWorldUV`) */
  uvWorld?: WorldUV;
}

/**
 * Mapeo de UV a escala de MUNDO para las piezas texturizadas.
 *
 * Una `BoxGeometry` estira la textura entera (0..1) en CADA cara: la misma
 * imagen sale con un tamaño distinto en cada cara y en cada caja, según lo que
 * midan. En las casetas del crucero eso convertía las portillas redondas en
 * rayas verticales de tres anchos diferentes, y encima pintaba la hilera de
 * ventanas en el tejado. Con `uvWorld` la textura se repite cada `tile`
 * unidades de mundo, así que la ventana mide lo mismo en todas partes.
 */
export interface WorldUV {
  /** [ancho, alto] del mosaico, en unidades de mundo */
  tile: [number, number];
  /** Altura de mundo desde la que se cuenta la fase vertical: alinea el patrón
   *  entre piezas apiladas (una caseta sobre otra sigue la misma retícula). */
  originY?: number;
  /** UV FIJO para las caras de arriba y abajo — apunta a una zona lisa de la
   *  textura, porque un tejado no lleva ventanas. */
  cap?: [number, number];
}

/**
 * Reescribe el atributo `uv` de una caja de 1 segmento. El orden de caras de
 * `BoxGeometry` es +X, -X, +Y, -Y, +Z, -Z, con 4 vértices cada una; en las
 * cuatro caras verticales v=0 es el borde de abajo y v=1 el de arriba.
 */
function applyWorldUV(g: THREE.BufferGeometry, size: [number, number, number], pos: [number, number, number] | undefined, uvw: WorldUV) {
  const uv = g.attributes.uv as THREE.BufferAttribute;
  const [tileU, tileV] = uvw.tile;
  const [w, h, d] = size;
  /** Fase vertical: dónde cae la base de esta caja dentro de la retícula */
  const baseY = (pos?.[1] ?? 0) - h / 2;
  const phase = (baseY - (uvw.originY ?? 0)) / tileV;
  const cap = uvw.cap;

  for (let i = 0; i < uv.count; i++) {
    const face = Math.floor(i / 4);
    if (face === 2 || face === 3) {
      // Tejado y suelo: un único texel liso (derivada cero, sin mipmap raro)
      if (cap) uv.setXY(i, cap[0], cap[1]);
      continue;
    }
    // Caras ±X: el ancho lo da la MANGA (z); caras ±Z: la ESLORA (x)
    const faceW = face === 0 || face === 1 ? d : w;
    // Centrado por cara: el patrón queda simétrico en cada costado
    uv.setXY(i, (uv.getX(i) - 0.5) * (faceW / tileU) + 0.5, uv.getY(i) * (h / tileV) + phase);
  }
  uv.needsUpdate = true;
}

/** Geometrías ya fusionadas, por clave de modelo. Un crucero de manga 1.8 y otro
 *  de manga 2.9 son claves distintas; dos iguales comparten la misma geometría. */
const cache = new Map<string, THREE.BufferGeometry>();

/** Cuántas variantes de geometría se han fusionado ya. Lo usa el precalentado
 *  (`Warmup.tsx`) para saber si sigue descubriendo variantes nuevas o si ya ha
 *  saturado, y `scripts/jank-test.ts` para medirlo. */
export function mergedCacheSize(): number {
  return cache.size;
}

/** Reutiliza el color convertido a espacio lineal (lo que espera el atributo) */
const tmpColor = new THREE.Color();

/**
 * Devuelve la geometría fusionada de `parts`, construyéndola solo la primera vez
 * que se pide esa `key`. `build` es perezoso a propósito: si la clave ya está en
 * caché no se llega a montar ni una sola caja.
 */
export function mergedBoxes(key: string, build: () => BoxPart[]): THREE.BufferGeometry {
  const hit = cache.get(key);
  if (hit) return hit;

  const geos: THREE.BufferGeometry[] = [];
  for (const part of build()) {
    const g = part.cone
      ? (new THREE.ConeGeometry(part.cone[0], part.cone[1], part.cone[2]) as THREE.BufferGeometry)
      : new THREE.BoxGeometry(part.size![0], part.size![1], part.size![2]);
    // Las UV se calculan ANTES de rotar/trasladar: son del espacio de la caja
    if (part.uvWorld && part.size) applyWorldUV(g, part.size, part.pos, part.uvWorld);
    // Orden Z→Y→X a propósito: cada `rotateN` premultiplica, así que aplicarlas
    // en ese orden compone Rx·Ry·Rz, que es exactamente lo que hace un
    // `rotation={[x, y, z]}` de three (Euler 'XYZ'). Al revés, las piezas con
    // dos o tres ejes (hojas de palmera, palas de hélice) quedarían torcidas.
    if (part.rot) {
      if (part.rot[2]) g.rotateZ(part.rot[2]);
      if (part.rot[1]) g.rotateY(part.rot[1]);
      if (part.rot[0]) g.rotateX(part.rot[0]);
    }
    if (part.pos) g.translate(part.pos[0], part.pos[1], part.pos[2]);

    // `THREE.Color` ya entrega componentes en espacio lineal (ColorManagement),
    // que es justo lo que el shader espera del atributo de color.
    tmpColor.set(part.color);
    const count = g.attributes.position.count;
    const colors = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      colors[i * 3] = tmpColor.r;
      colors[i * 3 + 1] = tmpColor.g;
      colors[i * 3 + 2] = tmpColor.b;
    }
    g.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geos.push(g);
  }

  const merged = mergeGeometries(geos, false);
  for (const g of geos) g.dispose();
  if (!merged) throw new Error(`No se pudo fusionar la geometría "${key}"`);
  cache.set(key, merged);
  return merged;
}

/**
 * Material único de todo lo fusionado opaco. Los modelos tenían rugosidades
 * entre 0.45 y 0.95 caja a caja; a esta escala de cámara la diferencia no se
 * lee, y un material compartido evita recompilar y reenlazar por cada pieza.
 */
export const MERGED_STD = new THREE.MeshStandardMaterial({
  vertexColors: true,
  roughness: 0.72,
  metalness: 0.12,
});

/**
 * Material de los acentos que deben ENCENDER el bloom (franjas de seguridad,
 * balizas, neones). Sin luz: el color del vértice sale tal cual y supera el
 * umbral de luminancia del pipeline, igual que hacían los `emissive` sueltos.
 */
export const MERGED_GLOW = new THREE.MeshBasicMaterial({
  vertexColors: true,
  toneMapped: false,
});
