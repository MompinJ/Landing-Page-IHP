import * as THREE from 'three'
import { QUALITY } from './quality'

// Microrrelieve de superficie. El escenario esta hecho de cajas de color plano,
// y lo que delata a un render no es la forma sino que el acero, el hormigon y
// el asfalto devuelvan la luz como si fueran plastico pulido. Aqui se fabrica
// UN mapa de normales y UNO de rugosidad de ruido, y se cuelgan de todos los
// materiales de la escena.
//
// Se generan en un canvas al arrancar en vez de traerse como imagen: son 256x256
// (menos de 5 ms) y asi no hay un asset mas que servir, ni que decidir su
// resolucion, ni riesgo de que falte en el despliegue estatico.

const SIZE = 256

function valueNoise(w, cells, seedInc) {
  // ruido de valor por rejilla con interpolacion suave: da manchas continuas
  // sin las costuras de un ruido puramente aleatorio por pixel
  const g = new Float32Array((cells + 1) * (cells + 1))
  let s = 1337 + seedInc
  const rnd = () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff
    return s / 0x7fffffff
  }
  for (let i = 0; i < g.length; i++) g[i] = rnd()
  // la ultima fila y columna copian la primera: sin esto el mapa no repite
  for (let i = 0; i <= cells; i++) {
    g[i * (cells + 1) + cells] = g[i * (cells + 1)]
    g[cells * (cells + 1) + i] = g[i]
  }
  const smooth = (t) => t * t * (3 - 2 * t)
  const out = new Float32Array(w * w)
  for (let y = 0; y < w; y++) {
    for (let x = 0; x < w; x++) {
      const fx = (x / w) * cells
      const fy = (y / w) * cells
      const x0 = Math.floor(fx)
      const y0 = Math.floor(fy)
      const tx = smooth(fx - x0)
      const ty = smooth(fy - y0)
      const a = g[y0 * (cells + 1) + x0]
      const b = g[y0 * (cells + 1) + x0 + 1]
      const c = g[(y0 + 1) * (cells + 1) + x0]
      const d = g[(y0 + 1) * (cells + 1) + x0 + 1]
      out[y * w + x] = (a + (b - a) * tx) * (1 - ty) + (c + (d - c) * tx) * ty
    }
  }
  return out
}

// Altura = varias octavas: la gruesa son abolladuras y parches de pintura, la
// fina es el grano de la chapa y el arido del hormigon.
function heightField() {
  // Octavas altas y con celdas primas entre si: la octava gruesa es la que
  // canta el mosaico (se ve el mismo boton repetido cada dos metros), y el
  // relieve que se quiere aqui es de chapa y arido, no de duna.
  const o1 = valueNoise(SIZE, 23, 0)
  const o2 = valueNoise(SIZE, 47, 91)
  const o3 = valueNoise(SIZE, 97, 733)
  const h = new Float32Array(SIZE * SIZE)
  // el peso se carga en la octava fina: el grano fino se lee como material, y
  // la octava gruesa repetida veinte veces sobre un casco se lee como arpillera
  for (let i = 0; i < h.length; i++) h[i] = o1[i] * 0.18 + o2[i] * 0.3 + o3[i] * 0.52
  return h
}

function toTexture(data) {
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = SIZE
  const img = new ImageData(data, SIZE, SIZE)
  canvas.getContext('2d').putImageData(img, 0, 0)
  const t = new THREE.CanvasTexture(canvas)
  t.wrapS = t.wrapT = THREE.RepeatWrapping
  // normales y rugosidad son datos, no color: si se marcan como sRGB three les
  // aplica la curva y el relieve sale con el doble de fuerza en las zonas bajas
  t.colorSpace = THREE.NoColorSpace
  t.needsUpdate = true
  return t
}

// Normales de oleaje: la misma idea que el grano de superficie pero al reves,
// octavas GRUESAS y mucha pendiente. El mar no necesita microrrelieve (a esa
// escala se ve liso), necesita ondas de metros que partan el reflejo del sol.
let waves = null

export function waveMap() {
  if (waves) return waves
  const o1 = valueNoise(SIZE, 3, 5)
  const o2 = valueNoise(SIZE, 7, 55)
  const o3 = valueNoise(SIZE, 17, 555)
  const h = new Float32Array(SIZE * SIZE)
  for (let i = 0; i < h.length; i++) h[i] = o1[i] * 0.5 + o2[i] * 0.33 + o3[i] * 0.17
  const px = new Uint8ClampedArray(SIZE * SIZE * 4)
  const at = (x, y) => h[((y + SIZE) % SIZE) * SIZE + ((x + SIZE) % SIZE)]
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const dx = (at(x + 1, y) - at(x - 1, y)) * 9
      const dy = (at(x, y + 1) - at(x, y - 1)) * 9
      const len = Math.hypot(dx, dy, 1)
      const i = (y * SIZE + x) * 4
      px[i] = ((-dx / len) * 0.5 + 0.5) * 255
      px[i + 1] = ((-dy / len) * 0.5 + 0.5) * 255
      px[i + 2] = (1 / len) * 0.5 * 255 + 127
      px[i + 3] = 255
    }
  }
  waves = toTexture(px)
  return waves
}

// Laminas de agua del juego (el disco de mar lejano y la lamina de la travesia
// del crucero). Comparten el mismo oleaje y el mismo reloj: si cada una moviera
// su textura por su cuenta, en la costura entre las dos se veria una corriendo
// contra la otra. Las registra sharedWater y las avanza tickWater desde el
// bucle principal.
const sheets = []

export function sharedWater(rx, ry) {
  const t = waveMap().clone()
  t.wrapS = t.wrapT = THREE.RepeatWrapping
  t.repeat.set(rx, ry)
  t.anisotropy = QUALITY.aniso
  t.needsUpdate = true
  sheets.push(t)
  return t
}

export function tickWater(dt) {
  for (const t of sheets) {
    // dos velocidades distintas en x e y: con la misma se lee como una foto
    // deslizandose, y con dos como oleaje
    t.offset.x += dt * 0.004
    t.offset.y += dt * 0.011
  }
}

let cached = null

export function detailMaps() {
  if (cached) return cached
  const h = heightField()
  const px = new Uint8ClampedArray(SIZE * SIZE * 4)
  const rx = new Uint8ClampedArray(SIZE * SIZE * 4)
  const at = (x, y) => h[((y + SIZE) % SIZE) * SIZE + ((x + SIZE) % SIZE)]
  const STRENGTH = 1.6
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      // pendiente por diferencias centrales; el modulo de at() hace que el mapa
      // siga repitiendo sin costura tambien en los bordes
      const dx = (at(x + 1, y) - at(x - 1, y)) * STRENGTH
      const dy = (at(x, y + 1) - at(x, y - 1)) * STRENGTH
      const len = Math.hypot(dx, dy, 1)
      const i = (y * SIZE + x) * 4
      px[i] = ((-dx / len) * 0.5 + 0.5) * 255
      px[i + 1] = ((-dy / len) * 0.5 + 0.5) * 255
      px[i + 2] = (1 / len) * 0.5 * 255 + 127
      px[i + 3] = 255
      // rugosidad alrededor de 1.0 con +-18%: multiplica al valor del material,
      // asi que lo que hace es romper el brillo uniforme, no fijar el acabado
      const r = (0.82 + h[y * SIZE + x] * 0.36) * 255
      rx[i] = rx[i + 1] = rx[i + 2] = r
      rx[i + 3] = 255
    }
  }
  const wear = toTexture(grungeField())
  // la suciedad SI es color: va en sRGB, al reves que el relieve y la rugosidad
  wear.colorSpace = THREE.SRGBColorSpace
  cached = { normal: toTexture(px), rough: toTexture(rx), wear }
  return cached
}

// Capa de uso: manchas y chorreones. Va como `map` en los materiales que no
// tienen textura propia, y como el material multiplica mapa por color, un mapa
// casi blanco no cambia el color de la pieza, solo lo ensucia. Es lo que separa
// una chapa pintada de verdad (que lleva veinte anos de sal y grua encima) de
// un color plano de render.
//
// La mancha es ISOTROPA a proposito, aunque la suciedad real chorree hacia
// abajo. Una caja reparte UV de 0 a 1 en cada cara, asi que un casco de 30 x 3 m
// estira la textura cien veces mas en un eje que en el otro: cualquier rasgo
// con direccion (un chorreon) sale convertido en bandas horizontales, y eso fue
// exactamente lo que aparecio en el casco del astillero. Sin direccion, el
// estirado solo se lee como manchas mas anchas.
function grungeField() {
  const blotch = valueNoise(SIZE, 7, 17)
  const grain = valueNoise(SIZE, 31, 404)
  const spot = valueNoise(SIZE, 13, 88)
  const px = new Uint8ClampedArray(SIZE * SIZE * 4)
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const i = y * SIZE + x
      // Amplitudes cortas a proposito. La suciedad tiene que notarse al mirar
      // una pieza de cerca y desaparecer al mirar la escena: con contraste alto
      // el mosaico canta y todo el puerto se ve de mimbre.
      let v = 0.96 + (blotch[i] - 0.5) * 0.1 + (grain[i] - 0.5) * 0.05
      // las manchas oscuras son escasas y aisladas: es donde se acumula la
      // roña, no un patron continuo
      if (spot[i] > 0.8) v -= (spot[i] - 0.8) * 0.45
      const c = Math.max(0.7, Math.min(1.04, v)) * 255
      px[i * 4] = c
      px[i * 4 + 1] = c * 0.995
      px[i * 4 + 2] = c * 0.985
      px[i * 4 + 3] = 255
    }
  }
  return px
}

// Version para la geometria FUSIONADA del escenario. Ahi no vale una textura
// por tamano de pieza: en una malla que junta doscientas piezas de medidas
// distintas no hay un solo "cada cuantos metros repite". Lo que se hace es al
// reves: al fusionar se hornea en un segundo juego de coordenadas (uv1) la
// escala de cada pieza, y estas texturas leen ESE juego con repeticion fija.
// Asi el grano mide lo mismo en metros en un tornillo y en una nave.
let baked = null

export function bakedDetail() {
  if (baked) return baked
  const base = detailMaps()
  const mk = (src, rep) => {
    const t = src.clone()
    t.wrapS = t.wrapT = THREE.RepeatWrapping
    t.channel = 1 // lee uv1, no uv: uv sigue siendo la del mapa de color
    t.repeat.set(rep, rep)
    t.anisotropy = QUALITY.aniso
    t.needsUpdate = true
    return t
  }
  // la suciedad va a un cuarto de la frecuencia del grano: manchas de metro
  // largo, no de treinta centimetros
  baked = { normal: mk(base.normal, 1), rough: mk(base.rough, 1), wear: mk(base.wear, 0.25) }
  return baked
}

// Un clon por escala de repeticion. El mapa se quiere ver SIEMPRE del mismo
// tamano en metros (un tramo de medio metro), asi que la repeticion depende de
// lo grande que sea la pieza: si no, el grano de un contenedor de seis metros y
// el de un tornillo saldrian iguales de gordos.
const clones = new Map()

export function detailFor(meters) {
  // se cuantiza a potencias de dos para que el numero de clones sea pequeno:
  // sin esto habria una textura por pieza y se perderia el sentido de la cache
  const k = Math.max(-2, Math.min(6, Math.round(Math.log2(Math.max(0.12, meters)))))
  let m = clones.get(k)
  if (!m) {
    const base = detailMaps()
    // grano de 30 cm: por debajo se pierde con el filtrado, y por encima el
    // mosaico empieza a leerse como dibujo en vez de como acabado
    const rep = Math.max(1, Math.round(2 ** k / 0.3))
    m = {}
    for (const key of ['normal', 'rough', 'wear']) {
      const t = base[key].clone()
      t.wrapS = t.wrapT = THREE.RepeatWrapping
      // la suciedad va muy por debajo de la frecuencia del grano: las manchas
      // son de varios metros, y a mas frecuencia el mosaico canta
      const r = key === 'wear' ? Math.max(1, rep / 4) : rep
      t.repeat.set(r, r)
      t.anisotropy = QUALITY.aniso
      t.needsUpdate = true
      m[key] = t
    }
    clones.set(k, m)
  }
  return m
}
