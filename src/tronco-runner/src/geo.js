import { RoundedBoxGeometry } from 'three-stdlib'
import { QUALITY } from './quality'

// Cajas con el canto matado. Nada real tiene una arista perfecta: una viga
// pintada, un chasis o un contenedor tienen unos milimetros de radio, y ese
// radio es lo que engancha una linea de luz en el borde. Sin el, una caja solo
// se distingue de otra por el color plano de cada cara, que es exactamente el
// aspecto de maqueta que se quiere quitar.
//
// La geometria se COMPARTE entre todas las piezas de la misma medida: el
// escenario repite las mismas vigas cientos de veces, asi que la cache ahorra
// tambien subidas a la GPU.
const cache = new Map()
// Tope de seguridad: si un escenario pidiera mil medidas distintas, a partir de
// aqui se sirve caja recta y no se llena la memoria de geometrias de un solo uso.
const MAX = 420

export function roundedBox(size) {
  if (!QUALITY.bevel) return null
  // se cuantiza a 5 cm: dos vigas que se diferencian en un milimetro pueden
  // compartir geometria sin que nadie lo note
  const q = size.map((v) => Math.max(0.02, Math.round(v * 20) / 20))
  const key = q.join('|')
  const hit = cache.get(key)
  if (hit) return hit
  if (cache.size >= MAX) return null

  const min = Math.min(q[0], q[1], q[2])
  // el radio nunca puede llegar a la mitad del lado mas corto: en una chapa de
  // 4 cm de grueso un radio de 2 cm la convertiria en un cilindro
  const r = Math.min(0.05, min * 0.24)
  if (r < 0.006) return null
  const g = new RoundedBoxGeometry(q[0], q[1], q[2], 1, r)
  cache.set(key, g)
  return g
}
