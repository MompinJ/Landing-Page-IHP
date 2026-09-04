import { useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { Text } from '@react-three/drei'
import fontBold from '@fontsource/montserrat/files/montserrat-latin-800-normal.woff'
import { scroll } from '../runtime'
import { VIEW_AHEAD } from '../constants'
import { COURSE, chainZone } from '../course'

// Portico que marca el limite de cada terminal. Se cruza corriendo por debajo:
// el dintel arranca a 4.6 m y el salto llega a 1.4, asi que nunca estorba. Es
// el unico elemento del curso que no puntua, solo dice "empezo otra terminal".
//
// En el juego de tiempo el dintel decia "ZONA 2 / 5", porque el recorrido tenia
// cinco y se sabia cual tocaba. Aqui no hay total que poner: lo que se cuenta
// es cuantas se llevan cruzadas, que ademas es el numero del que uno presume.
function Gate({ gate }) {
  const group = useRef()
  const zone = chainZone(gate.zone)

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
          {/* baliza en el color de la terminal */}
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
        {`TERMINAL ${gate.zone + 1}`}
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

const LIST = COURSE.gates

// En el juego de tiempo los cinco porticos se montaban de una vez y ahi se
// quedaban. Aqui no hay cinco: hay uno por terminal y las terminales no se
// acaban, asi que van por la misma ventana deslizante que todo lo demas.
export function Gates() {
  const [win, setWin] = useState([0, 0])
  const cur = useRef([0, 0])

  useFrame(() => {
    let [a, b] = cur.current
    // los cursores pueden volver a cero: el curso se rehace en cada carrera
    if (a >= LIST.length || scroll.s < (LIST[a]?.d ?? Infinity) - VIEW_AHEAD - 60) {
      a = 0
      b = 0
    }
    while (a < LIST.length && LIST[a].zw + scroll.s > 30) a++
    while (b < LIST.length && LIST[b].d <= scroll.s + VIEW_AHEAD + 60) b++
    if (a !== cur.current[0] || b !== cur.current[1]) {
      cur.current = [a, b]
      setWin([a, b])
    }
  })

  return LIST.slice(win[0], win[1]).map((gate) => <Gate key={gate.key} gate={gate} />)
}
