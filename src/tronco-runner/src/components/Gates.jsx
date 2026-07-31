import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Text } from '@react-three/drei'
import fontBold from '@fontsource/montserrat/files/montserrat-latin-800-normal.woff'
import { scroll } from '../runtime'
import { COURSE, ZONES } from '../course'

// Portico que marca el limite de cada zona. Se cruza corriendo por debajo: el
// dintel arranca a 4.6 m y el salto llega a 1.4, asi que nunca estorba. Es el
// unico elemento del curso que no puntua, solo dice "empezo otro tramo".
function Gate({ gate }) {
  const group = useRef()
  const zone = ZONES[gate.zone]

  useFrame(() => {
    if (!group.current) return
    const z = gate.zw + scroll.s
    group.current.position.set(0, gate.dy, z)
    // fuera de la niebla no vale la pena dibujarlo ni pagar el texto
    group.current.visible = z > -170 && z < 24
  })

  return (
    <group ref={group}>
      {[-4.6, 4.6].map((x) => (
        <group key={x} position={[x, 0, 0]}>
          <mesh position={[0, 3.1, 0]}>
            <boxGeometry args={[0.6, 6.2, 0.6]} />
            <meshStandardMaterial color="#dfe6ec" roughness={0.45} metalness={0.3} />
          </mesh>
          <mesh position={[0, 0.22, 0]}>
            <boxGeometry args={[1.1, 0.44, 1.1]} />
            <meshStandardMaterial color="#39424a" roughness={0.6} />
          </mesh>
          {/* baliza en el color de la zona */}
          <mesh position={[0, 6.4, 0]}>
            <sphereGeometry args={[0.16, 10, 10]} />
            <meshStandardMaterial color={zone.accent} emissive={zone.accent} emissiveIntensity={2.6} />
          </mesh>
        </group>
      ))}

      {/* dintel: la banda de color es lo que se lee de lejos, el texto solo de cerca */}
      <mesh position={[0, 5.35, 0]}>
        <boxGeometry args={[9.8, 1.6, 0.75]} />
        <meshStandardMaterial color="#0b2a4a" roughness={0.7} />
      </mesh>
      <mesh position={[0, 4.5, 0.02]}>
        <boxGeometry args={[9.8, 0.22, 0.8]} />
        <meshStandardMaterial color={zone.accent} emissive={zone.accent} emissiveIntensity={1.5} />
      </mesh>

      <Text
        font={fontBold}
        position={[0, 5.72, 0.42]}
        fontSize={0.3}
        letterSpacing={0.16}
        anchorX="center"
        anchorY="middle"
        color={zone.accent}
      >
        {`ZONA ${gate.zone + 1} / ${ZONES.length}`}
      </Text>
      <Text
        font={fontBold}
        position={[0, 5.13, 0.42]}
        fontSize={0.58}
        maxWidth={9.2}
        letterSpacing={0.02}
        anchorX="center"
        anchorY="middle"
        color="#ffffff"
      >
        {/* nombre corto: el completo no cabe en un dintel de 9.8 m sin partirse */}
        {zone.short}
      </Text>
    </group>
  )
}

export function Gates() {
  return COURSE.gates.map((gate) => <Gate key={gate.key} gate={gate} />)
}
