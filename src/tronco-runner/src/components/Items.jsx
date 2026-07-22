import { useEffect, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { Text } from '@react-three/drei'
import fontBold from '@fontsource/montserrat/files/montserrat-latin-800-normal.woff'
import { useGame } from '../store'
import { runtime, scrollSpeed } from '../runtime'
import { sfx } from '../audio'
import { LANES, PLAYER_Z, GOOD_ITEMS, BAD_ITEMS, ITEM_POOL, COLORS } from '../constants'

// Los hexagonos viven en coordenadas de mundo fijas (zw); un scroll compartido
// los acerca al jugador. Posicion real en escena = zw + scroll.s
const scroll = { s: 0 }
let uid = 0

function rollConfig() {
  const good = Math.random() < 0.55
  const list = good ? GOOD_ITEMS : BAD_ITEMS
  return {
    key: uid++,
    good,
    label: list[Math.floor(Math.random() * list.length)],
    lane: Math.floor(Math.random() * 3),
  }
}

const initialItems = () =>
  Array.from({ length: ITEM_POOL }, (_, i) => ({
    ...rollConfig(),
    zw: -24 - i * 10.5 - Math.random() * 4,
  }))

function Hexagon({ item, onRespawn }) {
  const group = useRef()
  const local = useRef({ collected: false, scale: 1 })

  useEffect(() => {
    local.current = { collected: false, scale: 1 }
  }, [item])

  useFrame(({ clock }, dt0) => {
    const dt = Math.min(dt0, 0.05)
    const phase = useGame.getState().phase
    const st = local.current
    const z = item.zw + scroll.s

    if (phase === 'playing' && !st.collected && Math.abs(z - PLAYER_Z) < 0.85) {
      const dx = Math.abs(LANES[item.lane] - runtime.x)
      if (dx < 1.0 && runtime.y < 1.15) {
        st.collected = true
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
    if (z > 14) onRespawn(item.key)

    if (!group.current) return
    const t = clock.elapsedTime
    group.current.position.set(LANES[item.lane], 1.05 + Math.sin(t * 2 + item.key) * 0.08, z)
    group.current.rotation.y = Math.sin(t * 1.5 + item.key) * 0.14
    group.current.scale.setScalar(st.scale)
    group.current.visible = st.scale > 0.01 && z > -110
  })

  const c = item.good ? COLORS.good : COLORS.bad
  const long = item.label.length > 10
  return (
    <group ref={group}>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.85, 0.85, 0.16, 6]} />
        <meshStandardMaterial color={c} emissive={c} emissiveIntensity={0.9} roughness={0.4} />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, 0.02]}>
        <cylinderGeometry args={[0.68, 0.68, 0.18, 6]} />
        <meshStandardMaterial color="#071c33" roughness={0.5} />
      </mesh>
      {/* simbolo: paloma o tache */}
      {item.good ? (
        <group position={[0, 0.28, 0.13]}>
          <mesh rotation={[0, 0, -0.8]} position={[0.09, 0.02, 0]}>
            <boxGeometry args={[0.3, 0.07, 0.04]} />
            <meshStandardMaterial color={c} emissive={c} emissiveIntensity={1.4} />
          </mesh>
          <mesh rotation={[0, 0, 0.7]} position={[-0.09, -0.03, 0]}>
            <boxGeometry args={[0.16, 0.07, 0.04]} />
            <meshStandardMaterial color={c} emissive={c} emissiveIntensity={1.4} />
          </mesh>
        </group>
      ) : (
        <group position={[0, 0.28, 0.13]}>
          <mesh rotation={[0, 0, 0.785]}>
            <boxGeometry args={[0.32, 0.07, 0.04]} />
            <meshStandardMaterial color={c} emissive={c} emissiveIntensity={1.4} />
          </mesh>
          <mesh rotation={[0, 0, -0.785]}>
            <boxGeometry args={[0.32, 0.07, 0.04]} />
            <meshStandardMaterial color={c} emissive={c} emissiveIntensity={1.4} />
          </mesh>
        </group>
      )}
      <Text
        font={fontBold}
        position={[0, -0.13, 0.13]}
        fontSize={long ? 0.125 : 0.15}
        maxWidth={1.15}
        textAlign="center"
        anchorX="center"
        anchorY="middle"
        color="#ffffff"
        outlineWidth={0.008}
        outlineColor="#04122b"
      >
        {item.label}
      </Text>
    </group>
  )
}

export function Items() {
  const [items, setItems] = useState(initialItems)

  useEffect(
    () =>
      useGame.subscribe((state, prev) => {
        if (state.phase === 'countdown' && prev.phase !== 'countdown') {
          scroll.s = 0
          setItems(initialItems())
        }
      }),
    []
  )

  useFrame((_, dt0) => {
    const dt = Math.min(dt0, 0.05)
    scroll.s += scrollSpeed(useGame.getState().phase) * dt
  })

  const respawn = (key) => {
    setItems((prev) => {
      const minZw = Math.min(...prev.map((it) => it.zw))
      return prev.map((it) =>
        it.key === key ? { ...rollConfig(), zw: minZw - 9 - Math.random() * 6 } : it
      )
    })
  }

  return items.map((item) => <Hexagon key={item.key} item={item} onRespawn={respawn} />)
}
