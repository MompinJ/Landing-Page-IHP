import { useEffect } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Stars } from '@react-three/drei'
import { useGame } from '../store'
import { runtime } from '../runtime'
import { sfx } from '../audio'
import { BASE_SPEED, MAX_SPEED, GAME_DURATION, PLAYER_Z, COLORS } from '../constants'
import { World } from './World'
import { Player } from './Player'
import { Items } from './Items'

function Loop() {
  useFrame((_, dt0) => {
    if (useGame.getState().phase !== 'playing') return
    const dt = Math.min(dt0, 0.05)
    runtime.elapsed += dt
    runtime.speed = BASE_SPEED + (MAX_SPEED - BASE_SPEED) * Math.min(1, runtime.elapsed / GAME_DURATION)
    runtime.distance += runtime.speed * dt
    runtime.timeLeft = Math.max(0, GAME_DURATION - runtime.elapsed)
    useGame.getState().syncHud(Math.ceil(runtime.timeLeft), Math.floor(runtime.distance))
    if (runtime.timeLeft <= 0) {
      sfx.end()
      useGame.getState().end()
    }
  })
  return null
}

function CameraRig() {
  useFrame((state, dt0) => {
    const dt = Math.min(dt0, 0.05)
    const cam = state.camera
    const tx = runtime.x * 0.45
    cam.position.x += (tx - cam.position.x) * Math.min(1, dt * 6)
    cam.position.y = 4.3
    cam.position.z = PLAYER_Z + 6.5
    if (runtime.shake > 0) {
      runtime.shake = Math.max(0, runtime.shake - dt)
      cam.position.x += (Math.random() - 0.5) * 0.22 * runtime.shake
      cam.position.y += (Math.random() - 0.5) * 0.22 * runtime.shake
    }
    cam.lookAt(runtime.x * 0.4, 1.3, PLAYER_Z - 9)
  })
  return null
}

function move(dir) {
  if (useGame.getState().phase !== 'playing') return
  runtime.targetLane = Math.max(0, Math.min(2, runtime.targetLane + dir))
}

function jump() {
  if (useGame.getState().phase !== 'playing') return
  runtime.jumpQueued = true
}

function useInputs() {
  useEffect(() => {
    const onKey = (e) => {
      const { phase, pause, resume } = useGame.getState()
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') move(-1)
      else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') move(1)
      else if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W' || e.key === ' ') {
        e.preventDefault()
        jump()
      } else if (e.key === 'h' || e.key === 'H' || e.key === '?') {
        if (phase === 'playing') pause()
        else if (phase === 'paused') resume()
      }
    }

    let start = null
    const onDown = (e) => {
      if (useGame.getState().phase !== 'playing') return
      start = { x: e.clientX, y: e.clientY }
    }
    const onUp = (e) => {
      if (!start || useGame.getState().phase !== 'playing') {
        start = null
        return
      }
      const dx = e.clientX - start.x
      const dy = e.clientY - start.y
      if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) move(dx > 0 ? 1 : -1)
      else if (dy < -40) jump()
      else move(e.clientX < window.innerWidth / 2 ? -1 : 1)
      start = null
    }

    window.addEventListener('keydown', onKey)
    window.addEventListener('pointerdown', onDown)
    window.addEventListener('pointerup', onUp)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('pointerdown', onDown)
      window.removeEventListener('pointerup', onUp)
    }
  }, [])
}

export function Game() {
  useInputs()
  return (
    <Canvas
      dpr={[1, 1.75]}
      camera={{ fov: 58, position: [0, 4.3, PLAYER_Z + 6.5], near: 0.1, far: 260 }}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
    >
      <color attach="background" args={[COLORS.bg]} />
      <fog attach="fog" args={[COLORS.bg, 30, 105]} />
      <ambientLight intensity={0.4} color="#7da4d8" />
      <hemisphereLight args={['#5f8fc4', '#122036', 1.5]} />
      <directionalLight position={[6, 12, 4]} intensity={2.4} color="#cfe8ff" />
      <Stars radius={220} depth={60} count={1500} factor={4} fade speed={0.6} />
      <Loop />
      <CameraRig />
      <World />
      <Player />
      <Items />
    </Canvas>
  )
}
