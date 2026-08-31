import { Suspense, useEffect, useMemo, useRef } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { useTexture } from '@react-three/drei'
import * as THREE from 'three'
import { useGame } from '../store'
import { escribiendo, useGamepadAction } from '../useGamepad'
import { runtime, scroll, scrollSpeed, SKIP } from '../runtime'
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
import { QUALITY, DPR } from '../quality'
import { detailFor, sharedWater, tickWater } from '../detail'
import { approach, smoothDamp } from '../smooth'
import { World } from './World'
import { Player } from './Player'
import { Items } from './Items'
import { Obstacles } from './Obstacles'
import { Gates } from './Gates'
import { Fx } from './Fx'
import { Perf, PerfStart, PERF } from './Perf'

// Bruma. El azul frio de antes recortaba las siluetas lejanas contra un cielo
// naranja: se veia que el fondo estaba pegado. Un tono templado, a medio camino
// entre el naranja del horizonte y el gris del cenit, funde el puerto lejano
// con el atardecer, que es lo que hace una foto de verdad a esa hora.
const FOG_COLOR = '#4a4059'

function Loop() {
  const gl = useThree((s) => s.gl)
  // con ?skip= se esta depurando: el renderer a mano permite leer llamadas de
  // dibujo y triangulos por zona desde una prueba headless
  const dbgScene = useThree((s) => s.scene)
  if (SKIP) {
    window.__gl = gl
    // con ?skip= tambien se expone la escena: sin ella, comprobar desde una
    // captura headless que material acabo teniendo una pieza es imposible
    window.__scene = dbgScene
  }
  useFrame((_, dt0) => {
    const dt = Math.min(dt0, 0.05)
    // el curso avanza siempre: en intro y gameover el escenario sigue corriendo
    // de fondo, por eso el scroll no vive dentro del if de 'playing'
    scroll.s += scrollSpeed(useGame.getState().phase) * dt
    // el oleaje de todas las laminas de agua avanza aqui, con un solo reloj
    tickWater(dt)
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

// Tiempos de la camara, en segundos. Se piensan en tiempo y no en "rate"
// porque asi se leen: el paneo tarda 0.28 s en plantarse en el carril nuevo.
const PAN_TIME = 0.22
const ROLL_TIME = 0.3
// Grados de alabeo por cada metro por segundo que se desplaza la camara de
// lado. El alabeo sale de la VELOCIDAD de la camara, no de lo que le falta al
// corredor: asi nace y muere con el propio movimiento en vez de saltar al
// pulsar y quedarse colgado mientras el corredor termina de llegar.
const ROLL_PER_SPEED = 0.03
const ROLL_MAX = 0.06

function CameraRig() {
  const tilt = useRef(0)
  const tiltV = useRef({ v: 0 })
  const panV = useRef({ v: 0 })
  const dip = useRef(0)
  const ground = useRef(0)

  useFrame((state, dt0) => {
    const dt = Math.min(dt0, 0.05)
    const cam = state.camera
    // con ?skip= la camara queda a mano para comprobar el paneo desde fuera
    if (SKIP) window.__camera = cam
    // El suelo puede cambiar de golpe: al salirse del tablero de un andamio
    // baja 2.7 m en un frame. La camara lo sigue amortiguado para que sea una
    // caida y no un corte; el salto conserva su propio amortiguado aparte.
    ground.current = approach(ground.current, runtime.deck, 7, dt)
    // Paneo lateral con muelle amortiguado en vez de persecucion exponencial.
    // La exponencial arranca a velocidad maxima: el cambio de carril empezaba
    // con un tiron seco y luego se arrastraba. El muelle acelera y frena, que
    // es como se mueve una camara de verdad.
    cam.position.x = smoothDamp(cam.position.x, runtime.x * 0.45, panV.current, PAN_TIME, dt)
    // al deslizarse la camara baja y se acerca: el suelo pasa mas cerca del
    // ojo y el agachado se siente rapido en vez de solo verse
    dip.current = approach(dip.current, runtime.slide > 0 ? 1 : 0, 9, dt)
    // la camara sigue el salto amortiguada: da peso sin marear
    cam.position.y = 4.3 + ground.current + runtime.y * 0.28 - dip.current * 0.85
    cam.position.z = PLAYER_Z + 6.5 - dip.current * 0.7
    // el FOV se abre con la velocidad: es lo que hace que 26 m/s se sientan
    // rapidos y no solo se vean rapidos
    const k = (runtime.speed - BASE_SPEED) / (MAX_SPEED - BASE_SPEED)
    const fov = FOV_BASE + (FOV_MAX - FOV_BASE) * Math.max(0, Math.min(1, k))
    if (Math.abs(cam.fov - fov) > 0.02) {
      cam.fov = approach(cam.fov, fov, 2.5, dt)
      cam.updateProjectionMatrix()
    }
    if (runtime.shake > 0) {
      runtime.shake = Math.max(0, runtime.shake - dt)
      cam.position.x += (Math.random() - 0.5) * 0.22 * runtime.shake
      cam.position.y += (Math.random() - 0.5) * 0.22 * runtime.shake
    }
    cam.lookAt(runtime.x * 0.4, 1.3 + ground.current - dip.current * 0.35, PLAYER_Z - 9)
    // Alabeo al cambiar de carril. Va despues de lookAt porque lookAt reescribe
    // la rotacion entera. El objetivo sale de lo rapido que se esta moviendo la
    // camara de lado (panV), no de lo que le falta al corredor: con lo segundo
    // el alabeo aparecia de golpe al pulsar, cuando la camara todavia no se
    // habia movido, y se quedaba puesto hasta el final del desplazamiento.
    const want = Math.max(-ROLL_MAX, Math.min(ROLL_MAX, -panV.current.v * ROLL_PER_SPEED))
    tilt.current = smoothDamp(tilt.current, want, tiltV.current, ROLL_TIME, dt)
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
    // El domo NO entra en el juego de sombras: es una esfera de 220 m que
    // envuelve la escena entera, asi que si proyectara dejaria todo a oscuras.
    <mesh rotation={[0, Math.PI, 0]} userData={{ noShadow: true }}>
      <sphereGeometry args={[220, 48, 32]} />
      <meshBasicMaterial map={sky} side={THREE.BackSide} fog={false} />
    </mesh>
  )
}

// Iluminacion basada en imagen: el mismo panorama del domo, convolucionado con
// PMREM, se cuelga como scene.environment. Es lo que hace que el acero y el
// agua reflejen el atardecer en vez de ser color plano, y lo que rellena las
// sombras con luz de cielo en vez de con un ambient gris.
//
// La rotacion tiene que ser la MISMA que la del domo (PI), si no el reflejo del
// sol cae por un lado y el sol pintado esta en el otro.
function Ibl() {
  const gl = useThree((s) => s.gl)
  const scene = useThree((s) => s.scene)
  const sky = useTexture(TEX_FILES.sky)

  useEffect(() => {
    const src = sky.clone()
    src.mapping = THREE.EquirectangularReflectionMapping
    src.colorSpace = THREE.SRGBColorSpace
    src.needsUpdate = true
    const pmrem = new THREE.PMREMGenerator(gl)
    const rt = pmrem.fromEquirectangular(src)
    scene.environment = rt.texture
    // Al 100% el panorama naranja tinta el puerto entero y se pierde de que
    // esta hecha cada cosa; a 0.6 el entorno da reflejo y direccion, y el color
    // propio de los materiales sigue leyendose.
    scene.environmentIntensity = 0.75
    scene.environmentRotation = new THREE.Euler(0, Math.PI, 0)
    pmrem.dispose()
    src.dispose()
    return () => {
      scene.environment = null
      rt.dispose()
    }
  }, [gl, scene, sky])

  return null
}

// Acabado de escena: quien proyecta sombra, quien la recibe y que microrrelieve
// lleva cada material se decide aqui, barriendo el grafo, y no malla por malla.
// El escenario, los obstaculos y el corredor suman mas de cuatrocientas mallas
// escritas a mano, y ademas nacen y mueren solas al reciclarse las franjas, asi
// que un flag en el JSX habria que ponerlo en cuatrocientos sitios y aun asi se
// escaparian las nuevas.
//
// Cada malla se toca UNA vez (userData.sh la marca) y el barrido corre cada
// pocos frames, no cada frame: recorrer el grafo entero es barato pero no
// gratis, y las mallas nuevas pueden esperar cuatro cuadros a 100 m de la
// camara. Excepciones: las esferas emisivas son balizas y semaforos, o sea
// lamparas, y una lampara que proyecta sombra de si misma se ve mal ademas de
// costar; userData.noShadow deja la puerta abierta a excluir cualquier otra.
function SceneSweep() {
  const scene = useThree((s) => s.scene)
  const tick = useRef(0)

  useFrame(() => {
    if (tick.current++ % 5 !== 0) return
    scene.traverse((o) => {
      if (!o.isMesh || o.userData.sh) return
      o.userData.sh = 1
      const lamp = o.geometry?.type === 'SphereGeometry' && (o.material?.emissiveIntensity || 0) >= 1
      // Los vetos se heredan del grupo: una ficha o un bote lo declaran una vez
      // y no malla por malla. Son cuatro saltos de padre y se miran una sola vez
      // en la vida de cada malla.
      let noShadow = false
      let noCast = false
      let noDress = false
      for (let a = o; a; a = a.parent) {
        if (a.userData.noShadow) noShadow = true
        if (a.userData.noCast) noCast = true
        if (a.userData.noDress) noDress = true
      }
      if (QUALITY.shadows) {
        // El tamano manda: el puerto esta lleno de tornillos, barandillas,
        // travesanos y balizas, y meterlos en la pasada de sombra duplicaba las
        // llamadas de dibujo para producir sombras que no se ven. Solo proyecta
        // lo que tiene silueta propia, y solo recibe lo que tiene superficie
        // donde se note (el suelo, un contenedor, un casco).
        const m = sizeOf(o)
        o.castShadow = !lamp && !noShadow && !noCast && m >= QUALITY.shadowMin
        o.receiveShadow = !noShadow && m >= QUALITY.receiveMin
      }
      if (!lamp && !noDress) dressMaterial(o)
    })
  })

  return null
}

// Lado mayor de una pieza en metros, sin contar la escala del grupo (todo el
// escenario va a escala 1). Se calcula una sola vez por malla y se guarda,
// porque lo piden tanto el filtro de sombras como el microrrelieve.
function sizeOf(mesh) {
  if (mesh.userData.m === undefined) {
    if (!mesh.geometry.boundingBox) mesh.geometry.computeBoundingBox()
    const bb = mesh.geometry.boundingBox
    mesh.userData.m = Math.max(bb.max.x - bb.min.x, bb.max.y - bb.min.y, bb.max.z - bb.min.z)
  }
  return mesh.userData.m
}

// Cuelga el microrrelieve de un material: relieve de normales y variacion de
// rugosidad, a escala de la pieza. El material se marca para no repetir, porque
// tocar un material obliga a recompilar su programa.
function dressMaterial(mesh) {
  const m = mesh.material
  if (!m || Array.isArray(m) || !m.isMeshStandardMaterial || m.userData.det) return
  m.userData.det = 1

  // Tamano real de la pieza en metros: de ahi sale cada cuantos metros repite
  // el grano. Sin esto una nave de 20 m y un tornillo tendrian el mismo grano.
  const meters = sizeOf(mesh)
  const d = detailFor(meters)

  if (!m.normalMap && QUALITY.normalMap) {
    m.normalMap = d.normal
    // el relieve se nota mas en lo pulido (chapa pintada, casco) que en lo mate
    let k = 0.3 + (1 - Math.min(1, m.roughness ?? 0.85)) * 0.45
    // Y se rebaja en las piezas grandes. Una caja reparte UV de 0 a 1 por cara,
    // asi que en un casco de 30 x 3 m el grano sale estirado diez veces mas en
    // un eje que en el otro y se lee como tejido de arpillera. Con el relieve
    // bajo, el mismo estirado solo se nota como acabado.
    k *= Math.max(0.3, Math.min(1, 1.25 - meters * 0.035))
    m.normalScale = new THREE.Vector2(k, k)
  }
  // Cada mapa es una lectura de textura mas POR PIXEL dibujado, y en una GPU
  // integrada eso es lo que decide los fps, no el numero de piezas. Por eso en
  // los niveles bajos el material adelgaza.
  if (!m.roughnessMap && QUALITY.roughMap) m.roughnessMap = d.rough
  // Suciedad solo donde no hay textura propia y solo en lo que no es luz: una
  // baliza o un hexagono de valor son senal, y una senal sucia no se lee.
  if (!m.map && (m.emissiveIntensity || 0) < 1) m.map = d.wear
  // El entorno es la unica fuente de reflejo del juego: subirlo un punto sobre
  // uno es lo que hace que el acero parezca acero bajo el atardecer.
  m.envMapIntensity = 1.15
  m.needsUpdate = true
}

// Sol con sombra proyectada. La camara de sombra es ortografica y sigue al
// corredor: cubrir los 2340 m del curso con un solo mapa daria texels de metro
// y medio, asi que lo que se hace es pasear una caja de ~34 m con el.
//
// El objetivo se ancla en pasos enteros de texel (SNAP): sin eso la sombra
// hierve al moverse, porque cada frame los mismos bordes caen en otro texel.
function Sun() {
  const light = useRef()
  const target = useRef()
  const span = QUALITY.shadowSpan

  useFrame(() => {
    if (!light.current || !target.current) return
    // el target se engancha aqui y no por prop: en el primer render la ref
    // todavia es null y three se quedaria apuntando a su Object3D por defecto
    if (light.current.target !== target.current) light.current.target = target.current
    const texel = (span * 2) / QUALITY.shadowMap
    const snap = (v) => Math.round(v / texel) * texel
    const tx = snap(runtime.x * 0.4)
    const ty = snap(runtime.deck)
    const tz = snap(PLAYER_Z - 26)
    target.current.position.set(tx, ty, tz)
    target.current.updateMatrixWorld()
    // el sol vive relativo al objetivo: la direccion de la luz no cambia nunca,
    // solo se traslada, que es justo lo que necesita una sombra estable
    // Sol BAJO (unos 27 grados): es un atardecer, y una luz cenital con un
    // cielo naranja se nota falsa enseguida. Mas bajo aun estiraria las sombras
    // fuera de la caja del mapa y aparecerian cortadas por la mitad.
    light.current.position.set(tx - 28, ty + 26, tz - 32)
  })

  return (
    <>
      <object3D ref={target} />
      <directionalLight
        ref={light}
        castShadow={QUALITY.shadows}
        intensity={2.9}
        color="#ffd2a1"
        shadow-mapSize-width={QUALITY.shadowMap}
        shadow-mapSize-height={QUALITY.shadowMap}
        shadow-camera-left={-span}
        shadow-camera-right={span}
        shadow-camera-top={span}
        shadow-camera-bottom={-span}
        shadow-camera-near={1}
        shadow-camera-far={130}
        shadow-bias={-0.0004}
        shadow-normalBias={0.035}
      />
    </>
  )
}

// Mar cercano animado bajo el nivel del muelle; disco para quedar siempre
// dentro del domo. A lo lejos se funde con el agua del propio panorama.
function FarSea() {
  const ref = useRef()
  // El agua no lleva textura de color: un mar es un espejo rugoso, y lo que se
  // ve en el es el cielo. Con el panorama del atardecer colgado de la escena,
  // basta con dar relieve de ola y rugosidad baja para que el sol se derrame
  // sobre la lamina; la foto de agua que habia aqui antes competia con ese
  // reflejo y aplanaba el mar a color liso.
  // el disco mide 400 m de diametro: 55 repeticiones son ondas de ~7 m, que es
  // lo que hace falta para que el reflejo del sol se rompa en escamas
  const wave = useMemo(() => sharedWater(55, 55), [])
  useFrame(() => {
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
    // El disco de mar recibe sombra (el casco del crucero se apoya en ella)
    // pero no proyecta: mide 200 m de radio y llenaria el mapa de sombras.
    <mesh ref={ref} rotation={[-Math.PI / 2, 0, 0]} position={[0, -2.6, 0]} userData={{ noCast: true, noDress: true }}>
      <circleGeometry args={[200, 64]} />
      <meshStandardMaterial
        color="#1b4257"
        roughness={0.13}
        metalness={0.02}
        envMapIntensity={2.1}
        normalMap={wave}
        normalScale={new THREE.Vector2(0.85, 0.85)}
      />
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
      // ESCRIBIENDO NO SE JUEGA.
      //
      // Sin esta linea, el `preventDefault` de mas abajo se comia la W, la S y
      // el ESPACIO del nombre en la pantalla final: se tecleaba "SUSANA WEST" y
      // quedaba "UANA ET". Y la H abria la ayuda a media palabra, asi que un
      // JOHN te sacaba de la pantalla. No se veia en las pruebas porque
      // rellenaban el campo con `fill()`, que asigna el valor sin teclear.
      //
      // El filtro va ANTES que nada, incluido el `preventDefault`: el problema
      // no era que el juego reaccionara -- `move`, `jump` y `slide` ya
      // comprueban la fase y no hacian nada --, era que la tecla no llegaba al
      // campo. Port Quest tuvo este mismo fallo y lo arreglo igual (ver la nota
      // de `escribiendo` en su `useKeyboardControls`).
      if (escribiendo(e.target)) return
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

  // Mando. Las acciones llegan ya resueltas desde gamepad.js, asi que aqui no
  // hay indices de boton ni ejes: solo la misma traduccion a move/jump/slide
  // que hace el teclado.
  useGamepadAction((action, repeat) => {
    const { phase, pause, resume } = useGame.getState()
    // START alterna pausa y es lo unico que actua fuera de partida; el resto de
    // fases las gobiernan los menus, que escuchan por su cuenta.
    if (action === 'pause') {
      if (phase === 'playing') pause()
      else if (phase === 'paused') resume()
      return
    }
    if (phase !== 'playing') return
    // mantener la cruceta repite, y en un juego de tres carriles eso vaciaria
    // el carril de un golpe: en partida solo cuenta el flanco, igual que el
    // e.repeat del teclado
    if (repeat) return
    if (action === 'left') move(-1)
    else if (action === 'right') move(1)
    // A y arriba saltan; B, X y abajo ruedan
    else if (action === 'up' || action === 'confirm') jump()
    else if (action === 'down' || action === 'back') slide()
  })
}

export function Game() {
  useInputs()
  return (
    <Canvas
      dpr={DPR}
      shadows={
        QUALITY.shadows ? { type: QUALITY.softShadows ? THREE.PCFSoftShadowMap : THREE.PCFShadowMap } : false
      }
      camera={{ fov: 58, position: [0, 4.3, PLAYER_Z + 6.5], near: 0.1, far: 300 }}
      // El antialias del canvas solo se enciende cuando NO hay cadena de
      // efectos: con cadena la imagen no sale por el buffer por defecto sino
      // por los efectos, que terminan en SMAA, y el MSAA se pagaria para nada.
      gl={{ antialias: QUALITY.msaa, powerPreference: 'high-performance' }}
      onCreated={({ gl }) => {
        // Rango dinamico de pelicula. Sin esto los blancos del casco y de los
        // reflejos del atardecer se recortan en plano y todo se lee a plastico;
        // con ACES el sol quema con transicion y las sombras conservan color.
        gl.toneMapping = THREE.ACESFilmicToneMapping
        gl.toneMappingExposure = 1.15
      }}
    >
      <color attach="background" args={[FOG_COLOR]} />
      <fog attach="fog" args={[FOG_COLOR, 55, 185]} />
      {/* Atardecer: el relleno lo pone el mapa de entorno (Ibl), asi que aqui
          solo queda el sol con sombra, un hemisferico corto de cielo/suelo y un
          rebote tibio desde la camara para que las caras visibles no queden a
          contraluz. Subir el ambiente aplana justo lo que las sombras aportan. */}
      <hemisphereLight args={['#7fa6e0', '#33405a', 1.05]} />
      <directionalLight position={[6, 10, 16]} intensity={0.45} color="#ffe2c2" />
      {PERF && <PerfStart />}
      <Loop />
      <CameraRig />
      <SceneSweep />
      <Suspense fallback={null}>
        <Ibl />
        <Sun />
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
      <Fx />
      {PERF && <Perf />}
    </Canvas>
  )
}
