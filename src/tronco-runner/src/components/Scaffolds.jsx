import { useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { runtime, scroll } from '../runtime'
import { LANES, VIEW_AHEAD } from '../constants'
import { PLATFORMS, SCAF_RAMP, SCAF_H, deckAt } from '../course'

// Andamio subible. Es geometria de juego, no decorado: su rampa y su tablero
// son exactamente lo que devuelve supportAt(), asi que se dibuja desde la misma
// lista del curso y no desde el generador de escenario.
//
// Ocupa un carril y deja 2.7 m libres por debajo, lo justo para pasar corriendo
// sin agacharse. Ahi esta la decision: subir y llevarse la fila de valores del
// tablero, o seguir por abajo.
//
// Los tableros de una cadena (p.ramp === 0) no llevan escalera: solo se llega
// a ellos saltando desde el tablero anterior, asi que en vez de rampa se
// dibuja el canto de entrada marcado y el hueco queda a la vista.
function Scaffold({ p }) {
  const group = useRef()
  const under = useRef(false)
  const base = deckAt(p.d0d + 2)
  const zw = 2 - p.d0

  useFrame(() => {
    if (!group.current) return
    group.current.position.set(LANES[p.lane], base, zw + scroll.s)

    // Si el corredor va POR DEBAJO, el andamio se vuelve translucido. Los
    // materiales NACEN con transparent=true y opacidad 1: cambiar `transparent`
    // en caliente obliga a recompilar el programa de cada material, y con dos
    // centenares de piezas eso es un tiron cada vez que se entra o se sale de
    // debajo de un tablero. La opacidad sola no recompila nada. La camara
    // va 4.3 m sobre el suelo y el tablero esta a 2.7, asi que al pasar por
    // debajo el tablero se mete entre camara y corredor y lo tapa entero: no se
    // veia ni el propio personaje, y eso es lo que hacia sentir la zona rota.
    const isUnder =
      Math.abs(LANES[p.lane] - runtime.x) < 1.6 &&
      runtime.distance > p.d0d - 4 &&
      runtime.distance < p.end + 2 &&
      runtime.deck + runtime.y < base + SCAF_H - 0.6
    if (isUnder !== under.current) {
      under.current = isUnder
      group.current.traverse((o) => {
        if (!o.material) return
        o.material.opacity = isUnder ? 0.22 : 1
        o.material.depthWrite = !isUnder
      })
    }
  })

  const deckLen = p.len
  const R = p.ramp
  const H = SCAF_H
  // z local: 0 es el pie de la rampa y el recorrido avanza hacia -z
  const steps = Math.round(SCAF_RAMP / 1.5)

  return (
    <group ref={group}>
      {/* Rampa de acceso escalonada. Cada peldano lleva su contrahuella y por
          debajo va una zanca corrida: sin eso los peldanos se veian como losas
          flotando en el aire una encima de otra. */}
      {R > 0 && [-1, 1].map((sx) => (
        <mesh
          key={`z${sx}`}
          position={[sx * 0.96, H / 2 - 0.35, -R / 2]}
          rotation={[Math.atan2(H, R), 0, 0]}
        >
          <boxGeometry args={[0.16, 0.5, Math.hypot(R, H)]} />
          <meshStandardMaterial transparent color="#c9a12e" metalness={0.4} roughness={0.6} />
        </mesh>
      ))}
      {R > 0 && Array.from({ length: steps }, (_, i) => {
        const f = (i + 0.5) / steps
        const zc = -(f * R)
        const y = H * f
        const rise = H / steps
        return (
          <group key={i}>
            <mesh position={[0, y - 0.07, zc]}>
              <boxGeometry args={[2.1, 0.14, R / steps + 0.08]} />
              <meshStandardMaterial transparent color="#9a7a4e" roughness={0.9} />
            </mesh>
            {/* contrahuella */}
            <mesh position={[0, y - rise / 2 - 0.07, zc + R / steps / 2]}>
              <boxGeometry args={[2.06, rise, 0.1]} />
              <meshStandardMaterial transparent color="#7d5f3c" roughness={0.9} />
            </mesh>
            {[-1, 1].map((sx) => (
              <mesh key={sx} position={[sx * 1.02, y + 0.55, zc]}>
                <boxGeometry args={[0.08, 1.1, 0.08]} />
                <meshStandardMaterial transparent color="#e0b32e" metalness={0.4} roughness={0.55} />
              </mesh>
            ))}
          </group>
        )
      })}
      {/* pasamanos continuo de la rampa */}
      {R > 0 &&
        [-1, 1].map((sx) => (
          <mesh key={`hr${sx}`} position={[sx * 1.02, H / 2 + 1.05, -R / 2]} rotation={[Math.atan2(H, R), 0, 0]}>
            <boxGeometry args={[0.07, 0.07, Math.hypot(R, H)]} />
            <meshStandardMaterial transparent color="#e0b32e" metalness={0.4} roughness={0.55} />
          </mesh>
        ))}
      {/* Canto de entrada de un tablero sin escalera: es donde se aterriza.
          La marca va PINTADA sobre el tablero, no en mastiles: quien salta lo
          mira desde arriba y lo lee entero, y quien pasa por el suelo no se
          come un poste naranja a la altura de los ojos (la camara va a 4.3 m y
          el tablero a 2.7, o sea justo en medio). */}
      {R === 0 && (
        <group>
          <mesh position={[0, H + 0.02, -0.05]}>
            <boxGeometry args={[2.14, 0.14, 0.3]} />
            <meshStandardMaterial transparent color="#f5c518" emissive="#8a6a00" emissiveIntensity={0.6} />
          </mesh>
          {[0, 1, 2].map((i) => (
            <mesh key={`ld${i}`} position={[0, H + 0.03, -0.9 - i * 1.2]}>
              <boxGeometry args={[1.9 - i * 0.45, 0.06, 0.5]} />
              <meshStandardMaterial transparent color="#ff9d2f" emissive="#7a3d00" emissiveIntensity={0.8} />
            </mesh>
          ))}
        </group>
      )}
      {/* Galones en el canto de salida: avisan de que ahi se salta al tablero
          siguiente en vez de bajarse. */}
      {p.jump &&
        [0, 1, 2].map((i) => (
          <mesh key={`ch${i}`} position={[0, H + 0.03, -R - deckLen + 1.2 + i * 1.3]}>
            <boxGeometry args={[0.9 + i * 0.3, 0.06, 0.45]} />
            <meshStandardMaterial transparent color="#ff9d2f" emissive="#6b3400" emissiveIntensity={0.8} />
          </mesh>
        ))}

      {/* tablero */}
      <mesh position={[0, H - 0.09, -R - deckLen / 2]}>
        <boxGeometry args={[2.1, 0.18, deckLen]} />
        <meshStandardMaterial transparent color="#9a7a4e" roughness={0.9} />
      </mesh>
      {/* juntas de los tablones, para que se lea el largo */}
      {Array.from({ length: Math.round(deckLen / 2.5) }, (_, i) => (
        <mesh key={`j${i}`} position={[0, H + 0.01, -R - 1.25 - i * 2.5]}>
          <boxGeometry args={[2.12, 0.04, 0.12]} />
          <meshStandardMaterial transparent color="#7d5f3c" roughness={0.9} />
        </mesh>
      ))}
      {/* barandal y rodapie del tablero */}
      {[-1, 1].map((sx) => (
        <group key={`d${sx}`}>
          <mesh position={[sx * 1.02, H + 0.55, -R - deckLen / 2]}>
            <boxGeometry args={[0.07, 0.07, deckLen]} />
            <meshStandardMaterial transparent color="#e0b32e" metalness={0.4} roughness={0.55} />
          </mesh>
          <mesh position={[sx * 1.02, H + 1.05, -R - deckLen / 2]}>
            <boxGeometry args={[0.07, 0.07, deckLen]} />
            <meshStandardMaterial transparent color="#e0b32e" metalness={0.4} roughness={0.55} />
          </mesh>
          <mesh position={[sx * 1.02, H + 0.15, -R - deckLen / 2]}>
            <boxGeometry args={[0.05, 0.24, deckLen]} />
            <meshStandardMaterial transparent color="#c9a12e" roughness={0.6} />
          </mesh>
        </group>
      ))}
      {/* estructura tubular: pies derechos y crucetas */}
      {Array.from({ length: Math.round(deckLen / 4) + 1 }, (_, i) => {
        const zc = -R - i * 4
        return (
          <group key={`s${i}`}>
            {[-1, 1].map((sx) => (
              <group key={sx}>
                <mesh position={[sx * 1.02, H / 2, zc]}>
                  <boxGeometry args={[0.1, H, 0.1]} />
                  <meshStandardMaterial transparent color="#e0b32e" metalness={0.4} roughness={0.55} />
                </mesh>
                <mesh position={[sx * 1.02, H + 1.1, zc]}>
                  <boxGeometry args={[0.08, 1.2, 0.08]} />
                  <meshStandardMaterial transparent color="#e0b32e" metalness={0.4} roughness={0.55} />
                </mesh>
              </group>
            ))}
            {/* Travesano de arriostrado. Va pegado al tablero y NO a media
                altura: a 1.35 m cruzaba el carril entero justo por donde pasa
                corriendo el que decide no subirse, o sea que el corredor
                atravesaba un tubo de acero cada cuatro metros. Aqui abajo tiene
                que quedar el galibo limpio. */}
            <mesh position={[0, H - 0.32, zc]} rotation={[0, 0, Math.PI / 2]}>
              <boxGeometry args={[0.08, 2.1, 0.08]} />
              <meshStandardMaterial transparent color="#c9a12e" metalness={0.4} roughness={0.6} />
            </mesh>
            {/* diagonales cortas en el canto, fuera del paso: dan la lectura de
                andamio arriostrado sin meterse en el carril */}
            {[-1, 1].map((sx) => (
              <mesh key={`br${sx}`} position={[sx * 1.02, H - 0.75, zc - 1]} rotation={[0.9, 0, 0]}>
                <boxGeometry args={[0.06, 2.4, 0.06]} />
                <meshStandardMaterial transparent color="#b09030" metalness={0.4} roughness={0.6} />
              </mesh>
            ))}
          </group>
        )
      })}
      {/* franja de borde en el canto del tablero: avisa de la caida */}
      <mesh position={[0, H + 0.02, -R - deckLen - 0.05]}>
        <boxGeometry args={[2.14, 0.14, 0.3]} />
        <meshStandardMaterial transparent color="#f5c518" emissive="#8a6a00" emissiveIntensity={0.6} />
      </mesh>
    </group>
  )
}

export function Scaffolds() {
  const [win, setWin] = useState([0, 0])
  const cur = useRef([0, 0])

  useFrame(() => {
    let [a, b] = cur.current
    if (scroll.s < (PLATFORMS[a]?.d0 ?? Infinity) - VIEW_AHEAD - 60) {
      a = 0
      b = 0
    }
    while (a < PLATFORMS.length && 2 - PLATFORMS[a].d0 - PLATFORMS[a].span + scroll.s > 24) a++
    while (b < PLATFORMS.length && PLATFORMS[b].d0 <= scroll.s + VIEW_AHEAD) b++
    if (a !== cur.current[0] || b !== cur.current[1]) {
      cur.current = [a, b]
      setWin([a, b])
    }
  })

  return PLATFORMS.slice(win[0], win[1]).map((p) => <Scaffold key={p.d0} p={p} />)
}
