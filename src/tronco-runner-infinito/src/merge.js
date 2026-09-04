import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { roundedBox } from './geo'

// Fusion de piezas en una malla por familia de material.
//
// El escenario esta hecho de piezas pequenas: una franja de 30 m son unas
// ciento cincuenta, y un andamio pasa de ochenta. Dibujadas una a una el juego
// pedia mas de mil llamadas de dibujo por cuadro con setenta mil triangulos, o
// sea que no faltaba GPU: sobraban llamadas.
//
// La clave para poder fusionar es sacar el COLOR del material y meterlo en los
// vertices. A partir de ahi, doscientas piezas de colores distintos comparten
// un solo material y se dibujan de una vez.
//
// Lo que se mueve por su cuenta (obstaculos, fichas) no pasa por aqui.

// El grano de superficie se hornea en un segundo juego de coordenadas (uv1) con
// la escala de cada pieza, porque en una malla fusionada ya no hay un tamano
// unico del que deducirlo. 0.3 m por baldosa.
const GRAIN = 0.3

const mat4 = new THREE.Matrix4()
const eul = new THREE.Euler()
const vec = new THREE.Vector3()
const quat = new THREE.Quaternion()
const ONE = new THREE.Vector3(1, 1, 1)

function bakeUv1(g, meters) {
  const uv = g.getAttribute('uv')
  if (!uv) return
  const k = Math.max(1, meters / GRAIN)
  const out = new Float32Array(uv.count * 2)
  for (let i = 0; i < uv.count; i++) {
    out[i * 2] = uv.getX(i) * k
    out[i * 2 + 1] = uv.getY(i) * k
  }
  g.setAttribute('uv1', new THREE.BufferAttribute(out, 2))
}

function bakeColor(g, hex) {
  const c = new THREE.Color(hex)
  const n = g.getAttribute('position').count
  const out = new Float32Array(n * 3)
  for (let i = 0; i < n; i++) {
    out[i * 3] = c.r
    out[i * 3 + 1] = c.g
    out[i * 3 + 2] = c.b
  }
  g.setAttribute('color', new THREE.BufferAttribute(out, 3))
}

// Clave de material. El color NO entra (va a los vertices) y la rugosidad y el
// metalizado se redondean: dos piezas que se diferencian en dos centesimas de
// rugosidad no merecen dos mallas separadas.
//
// `flat` SI entra, porque es otro material de verdad: las siluetas del fondo se
// dibujan sin mapas ninguno (ver SegmentMesh). Es lo que hace que cerrar el
// cielo salga barato -- son las piezas que mas pixeles ocupan de todo el
// escenario, y en una grafica integrada lo que cuesta es el pixel, no la pieza.
export function matKey(p) {
  const q = (v) => Math.round(v * 20) / 20
  return [
    p.flat ? 'flat' : '-',
    p.silueta ? 'sil' : '-',
    p.tex || '-',
    p.repeat ? p.repeat.join('x') : '-',
    p.emissive || '-',
    q(p.emissiveIntensity || 0),
    q(p.metalness ?? 0.1),
    q(p.roughness ?? 0.85),
  ].join('|')
}

function geomFor(p) {
  if (p.geo === 'box') {
    // Bisel solo en lo que no lleva textura: la caja redondeada reparte las UV
    // de otra forma y el corrugado del contenedor saldria curvado en los cantos.
    // Y tampoco en el fondo: a cuarenta metros un canto matado de cinco
    // centimetros no se ve, y en cambio multiplica los triangulos de las piezas
    // mas grandes del escenario.
    const bevel = p.tex || p.flat || p.silueta ? null : roundedBox(p.size)
    return bevel ? bevel.clone() : new THREE.BoxGeometry(...p.size)
  }
  if (p.geo === 'cyl') return new THREE.CylinderGeometry(...p.args)
  return new THREE.SphereGeometry(...p.args)
}

// Devuelve [{ key, p, geometry }]: una entrada por familia de material, con la
// geometria ya fusionada y en coordenadas locales del grupo.
export function mergeParts(props) {
  const groups = new Map()

  for (const p of props) {
    const key = matKey(p)
    let g = groups.get(key)
    if (!g) {
      g = { p, geos: [] }
      groups.set(key, g)
    }
    // Todas sin indice antes de fusionar. La caja con el canto matado nace no
    // indexada y las demas si, y mergeGeometries no mezcla las dos cosas:
    // devuelve null y el grupo entero desaparece de la pantalla sin avisar. Ya
    // paso, y lo que se veia era un puerto con la mitad de las piezas.
    const raw = geomFor(p)
    const geo = raw.index ? raw.toNonIndexed() : raw
    if (geo !== raw) raw.dispose()
    geo.computeBoundingBox()
    const bb = geo.boundingBox
    bakeUv1(geo, Math.max(bb.max.x - bb.min.x, bb.max.y - bb.min.y, bb.max.z - bb.min.z))
    bakeColor(geo, p.color)
    geo.applyMatrix4(
      mat4.compose(vec.fromArray(p.pos), quat.setFromEuler(eul.fromArray(p.rot || [0, 0, 0])), ONE)
    )
    g.geos.push(geo)
  }

  const out = []
  for (const [key, g] of groups) {
    const merged = mergeGeometries(g.geos, false)
    // las piezas sueltas ya no hacen falta: lo que se dibuja es la fusion
    for (const geo of g.geos) geo.dispose()
    if (merged) out.push({ key, p: g.p, geometry: merged })
  }
  return out
}
