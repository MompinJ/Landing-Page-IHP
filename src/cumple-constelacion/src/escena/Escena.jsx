import { Suspense } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { useScroll } from '@react-three/drei'
import * as THREE from 'three'

import Estrellas from './Estrellas'
import Nebulosas from './Nebulosas'
import PolvoDorado from './PolvoDorado'
import Fotos from './Fotos'
import Constelacion from './Constelacion'
import { camaraZ, menosMovimiento } from '../util/medidas'

// Mueve la camara a lo largo del scroll y le da una deriva minima
// para que la escena nunca se sienta congelada.
function Camara() {
  const scroll = useScroll()
  const camara = useThree((s) => s.camera)
  const puntero = useThree((s) => s.pointer)

  useFrame((estado) => {
    const t = estado.clock.elapsedTime

    camara.position.z = camaraZ(scroll.offset)

    if (menosMovimiento) {
      camara.position.x = 0
      camara.position.y = 0
      return
    }

    const derivaX = Math.sin(t * 0.13) * 0.22
    const derivaY = Math.cos(t * 0.17) * 0.16

    camara.position.x = THREE.MathUtils.lerp(camara.position.x, derivaX + puntero.x * 0.32, 0.035)
    camara.position.y = THREE.MathUtils.lerp(camara.position.y, derivaY + puntero.y * 0.2, 0.035)
    camara.rotation.z = THREE.MathUtils.lerp(camara.rotation.z, Math.sin(t * 0.09) * 0.012, 0.03)
  })

  return null
}

export default function Escena() {
  return (
    <>
      <Camara />
      <Nebulosas />
      <Estrellas />
      <PolvoDorado />
      <Constelacion />
      <Suspense fallback={null}>
        <Fotos />
      </Suspense>
    </>
  )
}
