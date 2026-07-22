import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGame } from '../store'
import { runtime } from '../runtime'
import { sfx } from '../audio'
import { LANES, PLAYER_Z, COLORS } from '../constants'

export function Player() {
  const group = useRef()
  const legL = useRef()
  const legR = useRef()
  const armL = useRef()
  const armR = useRef()

  useFrame((state, dt0) => {
    const dt = Math.min(dt0, 0.05)
    const phase = useGame.getState().phase
    const active = phase === 'playing'

    if (active) {
      const targetX = LANES[runtime.targetLane]
      runtime.x += (targetX - runtime.x) * Math.min(1, dt * 11)
      if (runtime.jumpQueued && runtime.y <= 0.001) {
        runtime.vy = 8.8
        sfx.jump()
      }
      runtime.jumpQueued = false
      if (runtime.y > 0 || runtime.vy > 0) {
        runtime.y += runtime.vy * dt
        runtime.vy -= 26 * dt
        if (runtime.y <= 0) {
          runtime.y = 0
          runtime.vy = 0
        }
      }
    }

    const t = state.clock.elapsedTime
    const running = active || phase === 'countdown' || phase === 'intro' || phase === 'gameover'
    const freq = 13
    const sw = running ? Math.sin(t * freq) : Math.sin(t * 3) * 0.3
    const bob = runtime.y > 0 ? 0 : Math.abs(Math.sin(t * freq)) * 0.09

    if (!group.current) return
    group.current.position.set(runtime.x, runtime.y + bob, PLAYER_Z)
    group.current.rotation.z = (LANES[runtime.targetLane] - runtime.x) * -0.06

    legL.current.rotation.x = sw * 0.9
    legR.current.rotation.x = -sw * 0.9
    armL.current.rotation.x = -sw * 0.8
    armR.current.rotation.x = sw * 0.8
    if (runtime.y > 0) {
      legL.current.rotation.x = 0.6
      legR.current.rotation.x = -0.4
    }
  })

  return (
    <group ref={group}>
      {/* torso: overol azul marino con franja reflejante */}
      <mesh position={[0, 1.05, 0]}>
        <boxGeometry args={[0.55, 0.65, 0.32]} />
        <meshStandardMaterial color="#0a3a8c" />
      </mesh>
      <mesh position={[0, 1.18, 0]}>
        <boxGeometry args={[0.57, 0.1, 0.34]} />
        <meshStandardMaterial color={COLORS.amber} emissive={COLORS.amber} emissiveIntensity={0.5} />
      </mesh>
      <mesh position={[0, 0.95, 0]}>
        <boxGeometry args={[0.57, 0.1, 0.34]} />
        <meshStandardMaterial color={COLORS.sky} emissive={COLORS.sky} emissiveIntensity={0.4} />
      </mesh>
      {/* cabeza y casco */}
      <mesh position={[0, 1.62, 0]}>
        <sphereGeometry args={[0.19, 16, 16]} />
        <meshStandardMaterial color="#e8b98c" />
      </mesh>
      <mesh position={[0, 1.7, 0]}>
        <sphereGeometry args={[0.215, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color="#ffffff" />
      </mesh>
      <mesh position={[0, 1.7, 0]}>
        <cylinderGeometry args={[0.26, 0.26, 0.035, 16]} />
        <meshStandardMaterial color="#ffffff" />
      </mesh>
      {/* brazos */}
      <group ref={armL} position={[-0.37, 1.32, 0]}>
        <mesh position={[0, -0.26, 0]}>
          <boxGeometry args={[0.14, 0.52, 0.14]} />
          <meshStandardMaterial color="#0a3a8c" />
        </mesh>
        <mesh position={[0, -0.54, 0]}>
          <sphereGeometry args={[0.08, 10, 10]} />
          <meshStandardMaterial color="#e8b98c" />
        </mesh>
      </group>
      <group ref={armR} position={[0.37, 1.32, 0]}>
        <mesh position={[0, -0.26, 0]}>
          <boxGeometry args={[0.14, 0.52, 0.14]} />
          <meshStandardMaterial color="#0a3a8c" />
        </mesh>
        <mesh position={[0, -0.54, 0]}>
          <sphereGeometry args={[0.08, 10, 10]} />
          <meshStandardMaterial color="#e8b98c" />
        </mesh>
      </group>
      {/* piernas */}
      <group ref={legL} position={[-0.14, 0.72, 0]}>
        <mesh position={[0, -0.34, 0]}>
          <boxGeometry args={[0.16, 0.68, 0.16]} />
          <meshStandardMaterial color="#12203a" />
        </mesh>
        <mesh position={[0, -0.7, 0.04]}>
          <boxGeometry args={[0.17, 0.1, 0.26]} />
          <meshStandardMaterial color="#2c2c34" />
        </mesh>
      </group>
      <group ref={legR} position={[0.14, 0.72, 0]}>
        <mesh position={[0, -0.34, 0]}>
          <boxGeometry args={[0.16, 0.68, 0.16]} />
          <meshStandardMaterial color="#12203a" />
        </mesh>
        <mesh position={[0, -0.7, 0.04]}>
          <boxGeometry args={[0.17, 0.1, 0.26]} />
          <meshStandardMaterial color="#2c2c34" />
        </mesh>
      </group>
    </group>
  )
}
