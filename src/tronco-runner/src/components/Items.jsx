import { useEffect, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { Text } from '@react-three/drei'
import fontBold from '@fontsource/montserrat/files/montserrat-latin-800-normal.woff'
import { useGame } from '../store'
import { runtime, scroll } from '../runtime'
import { sfx } from '../audio'
import { LANES, PLAYER_Z, VIEW_AHEAD, COLORS } from '../constants'
import { COURSE } from '../course'

// Los hexagonos viven en coordenadas de mundo fijas (zw); el scroll compartido
// los acerca al jugador. Posicion real en escena = zw + scroll.s
const SYMBOL = '#04122b'

// La escena esta muy iluminada (ambient + hemi + dos direccionales), asi que
// COLORS.good/bad puros salian lavados a menta y salmon. Estos tonos son mas
// profundos a proposito: con esa luz encima terminan en el verde/rojo de marca.
const FACE = { good: '#12934e', bad: '#c01f31' }

function Hexagon({ item }) {
  const group = useRef()
  const ring = useRef()
  const label = useRef()
  const local = useRef({ collected: false, scale: 1, fx: 0 })

  useFrame(({ clock }, dt0) => {
    const dt = Math.min(dt0, 0.05)
    const phase = useGame.getState().phase
    const st = local.current
    const z = item.zw + scroll.s

    if (phase === 'playing' && !st.collected && Math.abs(z - PLAYER_Z) < 0.85) {
      const dx = Math.abs(LANES[item.lane] - runtime.x)
      // la ficha se recoge respecto a la cubierta donde vive, no al suelo
      // absoluto: sobre el crucero todo esta 3.2 m mas arriba
      //
      // El limite de abajo es lo que impide cobrar desde debajo lo que esta
      // arriba: los valores de una lancha no se recogen desde el agua.
      const dh = runtime.deck + runtime.y - item.dy
      if (dx < 1.0 && dh < 1.15 && dh > -1.2) {
        st.collected = true
        st.fx = 1
        if (item.good) {
          useGame.getState().collect(item.label)
          sfx.good()
        } else {
          useGame.getState().hit(item.label)
          sfx.bad()
          runtime.shake = 0.4
        }
      }
    }

    if (st.collected) st.scale = Math.max(0, st.scale - dt * 6)
    if (st.fx > 0) st.fx = Math.max(0, st.fx - dt * 3)

    if (!group.current) return
    const t = clock.elapsedTime
    group.current.position.set(LANES[item.lane], item.dy + 1.05 + Math.sin(t * 2 + item.key) * 0.08, z)
    group.current.rotation.y = Math.sin(t * 1.5 + item.key) * 0.14
    // el grupo nunca llega a escala 0 para que el anillo del fx pueda compensar
    const gs = Math.max(st.scale, 0.001)
    group.current.scale.setScalar(gs)
    group.current.visible = (st.scale > 0.01 || st.fx > 0.01) && z > -110

    // el texto solo aparece de cerca: a 30 m es ilegible y ensucia la lectura
    // de verde/rojo, que es lo unico que el jugador necesita a esa distancia
    if (label.current) {
      // ventana corta a proposito: si varias fichas muestran etiqueta a la vez
      // los textos se enciman entre si en perspectiva
      const k = Math.max(0, Math.min(1, (z + 30) / 10))
      label.current.fillOpacity = k
      label.current.outlineOpacity = k
    }

    // anillo de onda expansiva al recoger: compensa la escala del grupo
    if (ring.current) {
      const k = 1 - st.fx
      ring.current.visible = st.fx > 0.01
      if (st.fx > 0.01) {
        ring.current.scale.setScalar((1 + k * 2.2) / gs)
        ring.current.material.opacity = st.fx * 0.9
      }
    }
  })

  const c = item.good ? FACE.good : FACE.bad
  const glow = item.good ? COLORS.good : COLORS.bad
  const long = item.label.length > 10
  return (
    // Las fichas no se ensucian: son senal de juego, no decorado. El acabado de
    // escena (SceneSweep) les pondria manchas y chorreones como al resto del
    // puerto, y a 30 m lo unico que el jugador tiene que leer aqui es verde o
    // rojo. El relieve y la sombra si les tocan.
    <group ref={group} userData={{ noDress: true }}>
      {/* bisel metalico exterior */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[1.05, 1.05, 0.14, 6]} />
        <meshStandardMaterial color="#d6dde4" metalness={0.85} roughness={0.25} />
      </mesh>
      {/* cara de color plena: a 30 m lo unico que el jugador necesita leer es
          verde o rojo, asi que la ficha va llena y el simbolo en navy encima.
          El emisivo se queda bajo a proposito: subirlo lava el color a pastel */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.97, 0.97, 0.2, 6]} />
        <meshStandardMaterial color={c} emissive={c} emissiveIntensity={0.35} roughness={0.4} />
      </mesh>
      <mesh ref={ring} rotation={[0, 0, 0]} visible={false}>
        <torusGeometry args={[1.05, 0.05, 8, 32]} />
        <meshBasicMaterial color={glow} transparent opacity={0} />
      </mesh>
      {/* simbolo: paloma o tache, en navy sobre la cara de color */}
      {item.good ? (
        <group position={[0, 0, 0.13]}>
          <mesh rotation={[0, 0, -0.8]} position={[-0.15, -0.02, 0]}>
            <boxGeometry args={[0.26, 0.13, 0.05]} />
            <meshStandardMaterial color={SYMBOL} roughness={0.5} />
          </mesh>
          <mesh rotation={[0, 0, 0.8]} position={[0.11, 0.06, 0]}>
            <boxGeometry args={[0.54, 0.13, 0.05]} />
            <meshStandardMaterial color={SYMBOL} roughness={0.5} />
          </mesh>
        </group>
      ) : (
        <group position={[0, 0, 0.13]}>
          <mesh rotation={[0, 0, 0.785]}>
            <boxGeometry args={[0.62, 0.13, 0.05]} />
            <meshStandardMaterial color={SYMBOL} roughness={0.5} />
          </mesh>
          <mesh rotation={[0, 0, -0.785]}>
            <boxGeometry args={[0.62, 0.13, 0.05]} />
            <meshStandardMaterial color={SYMBOL} roughness={0.5} />
          </mesh>
        </group>
      )}
      {/* la etiqueta va arriba de la ficha, no dentro: dentro competia con el
          simbolo y a 0.15 de alto era ilegible en movimiento */}
      <Text
        ref={label}
        font={fontBold}
        position={[0, 1.32, 0]}
        fontSize={long ? 0.24 : 0.3}
        maxWidth={2.8}
        lineHeight={1.1}
        textAlign="center"
        anchorX="center"
        anchorY="middle"
        color="#ffffff"
        outlineWidth={0.03}
        outlineColor="#04122b"
      >
        {item.label}
      </Text>
    </group>
  )
}

const LIST = COURSE.items

// Misma ventana deslizante que los obstaculos: las fichas estan escritas en el
// curso, no se reciclan.
export function Items() {
  const [win, setWin] = useState([0, 0])
  const [run, setRun] = useState(0)
  const cur = useRef([0, 0])

  useEffect(
    () =>
      useGame.subscribe((state, prev) => {
        if (state.phase === 'countdown' && prev.phase !== 'countdown') {
          cur.current = [0, 0]
          setWin([0, 0])
          setRun((r) => r + 1)
        }
      }),
    []
  )

  useFrame(() => {
    let [a, b] = cur.current
    while (a < LIST.length && LIST[a].zw + scroll.s > 14) a++
    while (b < LIST.length && LIST[b].d <= scroll.s + VIEW_AHEAD) b++
    if (a !== cur.current[0] || b !== cur.current[1]) {
      cur.current = [a, b]
      setWin([a, b])
    }
  })

  return LIST.slice(win[0], win[1]).map((item) => (
    <Hexagon key={`${run}-${item.key}`} item={item} />
  ))
}
