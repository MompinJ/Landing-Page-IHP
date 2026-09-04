import { useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { scroll } from '../runtime'
import { LANES, VIEW_AHEAD } from '../constants'
import { COURSE } from '../course'

// Las lanchas de la travesia son suelo, no decorado: sus posiciones salen del
// curso, las mismas que definen donde hay agua. Por eso no se dibujan en World
// (que se genera por franjas y con azar) sino aqui, contra la lista del curso.
function Boat({ boat }) {
  const group = useRef()
  const { len } = boat

  useFrame(({ clock }) => {
    if (!group.current) return
    const z = boat.zw + scroll.s
    // cabeceo suave: sin el, las lanchas parecen plataformas clavadas al mar
    const t = clock.elapsedTime + boat.key * 1.7
    group.current.position.set(LANES[boat.lane], Math.sin(t * 0.9) * 0.07, z)
    group.current.rotation.x = Math.sin(t * 0.75) * 0.016
    group.current.rotation.z = Math.sin(t * 0.6 + 1) * 0.022
  })

  const half = len / 2
  return (
    <group ref={group}>
      {/* casco: la cubierta queda en y=0 para que el corredor pise el cero */}
      <mesh position={[0, -0.5, 0]}>
        <boxGeometry args={[2.15, 1.0, len]} />
        <meshStandardMaterial color="#f2f5f7" roughness={0.45} metalness={0.1} />
      </mesh>
      {/* proa en punta */}
      <mesh position={[0, -0.5, -half - 0.5]} rotation={[0, Math.PI / 4, 0]}>
        <boxGeometry args={[1.52, 1.0, 1.52]} />
        <meshStandardMaterial color="#f2f5f7" roughness={0.45} metalness={0.1} />
      </mesh>
      {/* franja de flotacion y obra viva */}
      <mesh position={[0, -0.86, 0]}>
        <boxGeometry args={[2.18, 0.22, len + 0.4]} />
        <meshStandardMaterial color="#123a6b" roughness={0.5} />
      </mesh>
      {/* cubierta de teca */}
      <mesh position={[0, 0.01, 0]}>
        <boxGeometry args={[1.95, 0.06, len - 0.4]} />
        <meshStandardMaterial color="#9a7a4e" roughness={0.75} />
      </mesh>
      {/* regala a los costados: marca el borde por el que no se puede salir */}
      {[-1, 1].map((sx) => (
        <mesh key={sx} position={[sx * 1.02, 0.16, 0]}>
          <boxGeometry args={[0.16, 0.3, len]} />
          <meshStandardMaterial color="#e6ebef" roughness={0.5} />
        </mesh>
      ))}
      {/* consola y parabrisas hacia proa, fuera del paso del corredor */}
      <mesh position={[0, 0.42, -half + 2.0]}>
        <boxGeometry args={[1.5, 0.8, 0.9]} />
        <meshStandardMaterial color="#e6ebef" roughness={0.5} />
      </mesh>
      <mesh position={[0, 0.95, -half + 1.62]} rotation={[-0.25, 0, 0]}>
        <boxGeometry args={[1.35, 0.55, 0.05]} />
        <meshStandardMaterial color="#16324f" roughness={0.2} metalness={0.5} />
      </mesh>
      {/* defensas y luz de navegacion */}
      {[-1, 1].map((sx) =>
        [-half + 3.5, 0, half - 3.5].map((dz) => (
          <mesh key={`${sx}${dz}`} position={[sx * 1.12, -0.18, dz]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.17, 0.17, 0.34, 8]} />
            <meshStandardMaterial color="#20242a" roughness={0.9} />
          </mesh>
        ))
      )}
      <mesh position={[0, 1.35, -half + 2.0]}>
        <sphereGeometry args={[0.1, 8, 8]} />
        <meshStandardMaterial color="#dff3ff" emissive="#bfe9ff" emissiveIntensity={2.4} />
      </mesh>
      {/* estela: separa visualmente el casco del mar */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.95, half + 1.6]}>
        <planeGeometry args={[2.6, 3.4]} />
        <meshBasicMaterial color="#dff3ff" transparent opacity={0.35} />
      </mesh>
    </group>
  )
}

const LIST = COURSE.boats

export function Boats() {
  const [win, setWin] = useState([0, 0])
  const cur = useRef([0, 0])

  useFrame(() => {
    let [a, b] = cur.current
    // los cursores nunca retroceden, asi que al reiniciar hay que devolverlos:
    // el scroll vuelve a 0 y la primera lancha esta otra vez por delante
    if (scroll.s < (LIST[a]?.d ?? Infinity) - VIEW_AHEAD - 40) {
      a = 0
      b = 0
    }
    while (a < LIST.length && LIST[a].zw + scroll.s > 20) a++
    while (b < LIST.length && LIST[b].d <= scroll.s + VIEW_AHEAD) b++
    if (a !== cur.current[0] || b !== cur.current[1]) {
      cur.current = [a, b]
      setWin([a, b])
    }
  })

  return LIST.slice(win[0], win[1]).map((boat) => <Boat key={boat.key} boat={boat} />)
}
