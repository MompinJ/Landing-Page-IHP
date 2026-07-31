import { Suspense, useEffect, useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { useTexture } from '@react-three/drei'
import * as THREE from 'three'
import { useGame } from '../store'
import { runtime, scroll, scrollSpeed } from '../runtime'
import { zoneIndexAt, deckAt, seaLevelAt } from '../course'
import { Boats } from './Boats'
import { Scaffolds } from './Scaffolds'
import { sfx } from '../audio'
import {
  BASE_SPEED,
  MAX_SPEED,
  GAME_DURATION,
  PLAYER_Z,
  COLORS,
  LANES,
  JUMP_BUFFER,
} from '../constants'
import { TEX_FILES } from '../textures'
import { World } from './World'
import { Player } from './Player'
import { Items } from './Items'
import { Obstacles } from './Obstacles'
import { Gates } from './Gates'

const FOG_COLOR = '#2b3352'

function Loop() {
  useFrame((_, dt0) => {
    const dt = Math.min(dt0, 0.05)
    // el curso avanza siempre: en intro y gameover el escenario sigue corriendo
    // de fondo, por eso el scroll no vive dentro del if de 'playing'
    scroll.s += scrollSpeed(useGame.getState().phase) * dt
    const phase = useGame.getState().phase
    if (phase !== 'playing') {
      // Fuera de partida el mundo sigue corriendo de fondo y nadie calcula el
      // soporte, asi que aqui basta el perfil. Durante la partida NO se toca:
      // el suelo lo decide Player, que es quien sabe por que carril va.
      //
      // En pausa tampoco: la partida sigue viva y el corredor puede estar sobre
      // el tablero de un andamio. Pisar aqui su suelo lo dejaba caido al fondo
      // del dique al pausar, y al reanudar aparecia abajo.
      if (phase !== 'paused') runtime.deck = deckAt(scroll.s)
      return
    }
    runtime.elapsed += dt
    runtime.speed = BASE_SPEED + (MAX_SPEED - BASE_SPEED) * Math.min(1, runtime.elapsed / GAME_DURATION)
    runtime.distance += runtime.speed * dt
    runtime.timeLeft = Math.max(0, GAME_DURATION - runtime.elapsed)
    useGame.getState().syncHud(Math.ceil(runtime.timeLeft), Math.floor(runtime.distance))
    useGame.getState().setZone(zoneIndexAt(runtime.distance))
    if (runtime.timeLeft <= 0) {
      sfx.end()
      useGame.getState().end()
    }
  })
  return null
}

const FOV_BASE = 58
const FOV_MAX = 67

function CameraRig() {
  const tilt = useRef(0)
  const dip = useRef(0)
  const ground = useRef(0)

  useFrame((state, dt0) => {
    const dt = Math.min(dt0, 0.05)
    const cam = state.camera
    // El suelo puede cambiar de golpe: al salirse del tablero de un andamio
    // baja 2.7 m en un frame. La camara lo sigue amortiguado para que sea una
    // caida y no un corte; el salto conserva su propio amortiguado aparte.
    ground.current += (runtime.deck - ground.current) * Math.min(1, dt * 7)
    const tx = runtime.x * 0.45
    cam.position.x += (tx - cam.position.x) * Math.min(1, dt * 6)
    // al deslizarse la camara baja y se acerca: el suelo pasa mas cerca del
    // ojo y el agachado se siente rapido en vez de solo verse
    dip.current += ((runtime.slide > 0 ? 1 : 0) - dip.current) * Math.min(1, dt * 9)
    // la camara sigue el salto amortiguada: da peso sin marear
    cam.position.y = 4.3 + ground.current + runtime.y * 0.28 - dip.current * 0.85
    cam.position.z = PLAYER_Z + 6.5 - dip.current * 0.7
    // el FOV se abre con la velocidad: es lo que hace que 26 m/s se sientan
    // rapidos y no solo se vean rapidos
    const k = (runtime.speed - BASE_SPEED) / (MAX_SPEED - BASE_SPEED)
    const fov = FOV_BASE + (FOV_MAX - FOV_BASE) * Math.max(0, Math.min(1, k))
    if (Math.abs(cam.fov - fov) > 0.02) {
      cam.fov += (fov - cam.fov) * Math.min(1, dt * 2.5)
      cam.updateProjectionMatrix()
    }
    if (runtime.shake > 0) {
      runtime.shake = Math.max(0, runtime.shake - dt)
      cam.position.x += (Math.random() - 0.5) * 0.22 * runtime.shake
      cam.position.y += (Math.random() - 0.5) * 0.22 * runtime.shake
    }
    cam.lookAt(runtime.x * 0.4, 1.3 + ground.current - dip.current * 0.35, PLAYER_Z - 9)
    // Alabeo al cambiar de carril. Se calcula sobre lo que le falta al corredor
    // para llegar al carril destino, asi que nace y muere con el movimiento.
    // Va despues de lookAt porque lookAt reescribe la rotacion entera.
    const lead = LANES[runtime.targetLane] - runtime.x
    tilt.current += (lead * -0.075 - tilt.current) * Math.min(1, dt * 9)
    cam.rotation.z += tilt.current
  })
  return null
}

// Domo con el panorama de puerto al atardecer generado con Higgsfield.
// Esfera completa: el horizonte de la imagen (~55% de altura) cae cerca del
// nivel del ojo. La costura del wrap queda detras de la camara (rotacion PI).
function SkyDome() {
  const sky = useTexture(TEX_FILES.sky)
  sky.colorSpace = THREE.SRGBColorSpace
  return (
    <mesh rotation={[0, Math.PI, 0]}>
      <sphereGeometry args={[220, 48, 32]} />
      <meshBasicMaterial map={sky} side={THREE.BackSide} fog={false} />
    </mesh>
  )
}

// Mar cercano animado bajo el nivel del muelle; disco para quedar siempre
// dentro del domo. A lo lejos se funde con el agua del propio panorama.
function FarSea() {
  const water = useTexture(TEX_FILES.water)
  const ref = useRef()
  water.colorSpace = THREE.SRGBColorSpace
  water.wrapS = water.wrapT = THREE.RepeatWrapping
  water.repeat.set(36, 36)
  useFrame((_, dt) => {
    water.offset.x += dt * 0.008
    water.offset.y += dt * 0.004
    // La altura del mar la decide el curso (seaLevelAt): en la travesia del
    // crucero el mar ES el suelo y sube al nivel del casco de las lanchas; en el
    // resto es fondo lejano y se queda por debajo del terreno.
    //
    // Va contra deckAt(), nunca contra runtime.deck: runtime.deck es el suelo
    // bajo los pies del corredor, asi que al subirse a un andamio del dique seco
    // el mar subia con el hasta tapar la solera, y parecia que el dique se
    // inundaba al subir y se secaba al bajar.
    if (ref.current) ref.current.position.y = seaLevelAt(scroll.s)
  })
  return (
    <mesh ref={ref} rotation={[-Math.PI / 2, 0, 0]} position={[0, -2.6, 0]}>
      <circleGeometry args={[200, 48]} />
      <meshStandardMaterial map={water} color="#5d8aa8" emissive="#1d3a52" emissiveIntensity={0.45} roughness={0.5} metalness={0.1} />
    </mesh>
  )
}

function move(dir) {
  if (useGame.getState().phase !== 'playing') return
  runtime.targetLane = Math.max(0, Math.min(2, runtime.targetLane + dir))
}

function jump() {
  if (useGame.getState().phase !== 'playing') return
  runtime.jumpBuf = JUMP_BUFFER
}

function slide() {
  if (useGame.getState().phase !== 'playing') return
  runtime.slideBuf = JUMP_BUFFER
}

function useInputs() {
  useEffect(() => {
    const onKey = (e) => {
      // el auto-repeat del teclado disparaba varios cambios de carril con una
      // sola pulsacion sostenida; aqui cada tecla vale un carril
      if (e.repeat) return
      const { phase, pause, resume } = useGame.getState()
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') move(-1)
      else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') move(1)
      else if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W' || e.key === ' ') {
        e.preventDefault()
        jump()
      } else if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') {
        e.preventDefault()
        slide()
      } else if (e.key === 'h' || e.key === 'H' || e.key === '?') {
        if (phase === 'playing') pause()
        else if (phase === 'paused') resume()
      }
    }

    // un tap sobre el HUD (boton de ayuda, chips) no debe contar como gesto
    const onUI = (e) => !!(e.target?.closest && e.target.closest('button, input, .overlay, .hud'))

    let start = null
    const onDown = (e) => {
      if (useGame.getState().phase !== 'playing' || onUI(e)) return
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
      else if (dy > 40) slide()
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
      camera={{ fov: 58, position: [0, 4.3, PLAYER_Z + 6.5], near: 0.1, far: 300 }}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
    >
      <color attach="background" args={[FOG_COLOR]} />
      <fog attach="fog" args={[FOG_COLOR, 42, 150]} />
      {/* atardecer: rim calido al frente + relleno fuerte desde la camara
          para que las caras visibles no queden a contraluz */}
      <ambientLight intensity={0.75} color="#b8c4d8" />
      <hemisphereLight args={['#93aacb', '#2c3548', 1.5]} />
      <directionalLight position={[-6, 11, -18]} intensity={1.6} color="#ffcf9e" />
      <directionalLight position={[6, 10, 16]} intensity={1.7} color="#ffe2c2" />
      <Loop />
      <CameraRig />
      <Suspense fallback={null}>
        <SkyDome />
        <FarSea />
        <World />
        <Boats />
        <Scaffolds />
        <Gates />
        <Obstacles />
      </Suspense>
      <Player />
      <Items />
    </Canvas>
  )
}
