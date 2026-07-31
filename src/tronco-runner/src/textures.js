import * as THREE from 'three'
import { useTexture } from '@react-three/drei'

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
    t.anisotropy = 4
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
