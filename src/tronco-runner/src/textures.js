import * as THREE from 'three'
import { useTexture } from '@react-three/drei'
import { QUALITY } from './quality'

// Texturas generadas con Higgsfield (GPT Image 2), servidas desde public/tex.
export const TEX_FILES = {
  container: './tex/container-side.jpg',
  containerDoor: './tex/container-door.jpg',
  asphalt: './tex/asphalt.jpg',
  shipDeck: './tex/ship-deck.jpg',
  teak: './tex/teak-deck.jpg',
  ballast: './tex/ballast.jpg',
  water: './tex/water.jpg',
  sky: './tex/skybox.jpg',
}

const tiled = new Map()

// Devuelve un clon cacheado de la textura con el repeat pedido. Clonar es
// barato (comparte la imagen en GPU) y permite repeats distintos por mesh.
export function tiledTexture(base, key, rx, ry) {
  const id = `${key}|${rx}|${ry}`
  let t = tiled.get(id)
  if (!t) {
    t = base.clone()
    t.wrapS = t.wrapT = THREE.RepeatWrapping
    t.repeat.set(rx, ry)
    // El suelo se ve casi de canto y es lo que mas superficie ocupa: sin
    // filtrado anisotropico el asfalto y el balasto se convierten en una papilla
    // gris a diez metros. Es de lo mas barato que se puede pedir a la GPU.
    t.anisotropy = QUALITY.aniso
    t.needsUpdate = true
    tiled.set(id, t)
  }
  return t
}

export function useGameTextures() {
  const maps = useTexture({ ...TEX_FILES })
  for (const k of Object.keys(maps)) {
    maps[k].colorSpace = THREE.SRGBColorSpace
  }
  return maps
}
