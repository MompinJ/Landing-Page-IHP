import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Text } from '@react-three/drei'
import fontBold from '@fontsource/montserrat/files/montserrat-latin-800-normal.woff'
import { useGame } from '../store'
import { runtime, scroll } from '../runtime'
import { deckAt } from '../course'
import { COLORS } from '../constants'

// LA MARCA A BATIR, PINTADA EN LA PISTA.
//
// En un juego sin final, lo unico que da una meta es la raya de uno mismo. Y
// tiene que estar EN EL SUELO y no en una esquina del HUD: una raya se ve
// llegar, y los ultimos cincuenta metros antes de tu record son donde el que
// juega en el stand deja de esquivar por reflejo y empieza a jugar de verdad.
// Un numero en una esquina no produce eso; una linea que se acerca, si.
//
// Se pinta cruzando los tres carriles porque no se esquiva ni se recoge: se
// cruza, y punto. Por eso tampoco lleva colision ni sombra.
//
// La distancia se congela al arrancar la carrera (runtime.record) en vez de
// releerse cada cuadro: al superarla, el valor guardado en el equipo cambia, y
// con una lectura viva la raya se moveria bajo los pies justo en el momento en
// que se esta cruzando.

const ANCHO = 13

export function RecordLine() {
  const group = useRef()
  const marca = useRef(0)

  useFrame(() => {
    const g = group.current
    if (!g) return
    const d = runtime.record
    // sin marca previa no hay nada que pintar: la primera carrera del equipo no
    // tiene contra que competir y una raya en el metro cero seria un estorbo
    if (!d) {
      g.visible = false
      return
    }
    if (marca.current !== d) {
      marca.current = d
      g.position.y = deckAt(d) + 0.02
    }
    const z = 2 - d + scroll.s
    g.position.z = z
    g.visible = z > -170 && z < 26

    // Cruzarla paga bono y lo canta. Se comprueba aqui, contra la misma
    // distancia con la que se dibuja, para que el aviso caiga exactamente
    // cuando la raya pasa por debajo del corredor y no un par de metros antes.
    if (
      !runtime.recordHecho &&
      runtime.distance >= d &&
      d > 0 &&
      useGame.getState().phase === 'playing'
    ) {
      runtime.recordHecho = true
      useGame.getState().bateRecord()
    }
  })

  return (
    <group ref={group} visible={false} userData={{ noShadow: true, noDress: true }}>
      {/* la raya: dos bandas y el hueco, como una linea de meta de verdad */}
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[ANCHO, 1.1]} />
        <meshStandardMaterial
          color={COLORS.amber}
          emissive={COLORS.amber}
          emissiveIntensity={1.1}
          transparent
          opacity={0.9}
        />
      </mesh>
      {/* postes a los lados con su baliza: es lo que la hace visible de lejos,
          cuando la raya del suelo todavia se ve de canto y no se distingue */}
      {[-5.6, 5.6].map((x) => (
        <group key={x} position={[x, 0, 0]}>
          <mesh position={[0, 1.5, 0]}>
            <boxGeometry args={[0.16, 3, 0.16]} />
            <meshStandardMaterial color="#dfe6ec" roughness={0.5} metalness={0.3} />
          </mesh>
          <mesh position={[0, 3.15, 0]}>
            <sphereGeometry args={[0.17, 10, 10]} />
            <meshStandardMaterial color={COLORS.amber} emissive={COLORS.amber} emissiveIntensity={2.8} />
          </mesh>
        </group>
      ))}
      {/* Sin rotar: las piezas se acercan desde -z hacia la camara, o sea que
          la cara que mira al jugador es la de +z, que es la que sale por
          defecto. Con media vuelta el rotulo se leia del reves. */}
      <Text
        font={fontBold}
        position={[0, 2.6, 0]}
        fontSize={0.62}
        letterSpacing={0.14}
        anchorX="center"
        anchorY="middle"
        color={COLORS.amber}
        outlineWidth={0.05}
        outlineColor="#04122b"
      >
        TU RÉCORD
      </Text>
    </group>
  )
}
