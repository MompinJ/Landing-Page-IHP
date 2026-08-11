import { useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { ScrollControls, Scroll, Preload } from '@react-three/drei'

import Escena from './escena/Escena'
import Overlay from './ui/Overlay'
import Portada from './ui/Portada'
import { PAGINAS, esMovil } from './util/medidas'
import { paleta } from './contenido'

export default function App() {
  const [entrado, setEntrado] = useState(false)

  return (
    <>
      <Canvas
        className="lienzo"
        dpr={esMovil ? [1, 1.6] : [1, 2]}
        gl={{
          antialias: !esMovil,
          alpha: false,
          powerPreference: 'high-performance',
          stencil: false,
        }}
        camera={{ fov: 45, near: 0.1, far: 240, position: [0, 0, 6] }}
        linear
        flat
      >
        <color attach="background" args={[paleta.fondo]} />

        <ScrollControls pages={PAGINAS} damping={0.26} enabled={entrado} distance={1}>
          <Escena />
          <Scroll html style={{ width: '100%' }}>
            <Overlay visible={entrado} />
          </Scroll>
        </ScrollControls>

        <Preload all />
      </Canvas>

      <div className="capa capa--vineta" />
      <div className="capa capa--grano" />

      {!entrado && <Portada onEntrar={() => setEntrado(true)} />}
    </>
  )
}
