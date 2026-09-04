import { useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { useGame } from '../store'
import { runtime } from '../runtime'
import { BASE_SPEED, MAX_SPEED } from '../constants'
import { QUALITY } from '../quality'

// LINEAS DE VELOCIDAD.
//
// La velocidad de este juego no la marca el reloj sino los METROS: se sale a 13
// m/s y se llega a 29, pero por el camino la subida es tan lenta que nadie la
// nota mientras la vive. El FOV ya se abria con ella, y no basta: abrir el
// angulo cambia el encuadre, y el que esta jugando no compara encuadres, mira
// el carril. Hacia falta algo que se meta en el carril.
//
// Son rayas rectas de camara, no del mundo: viven en el espacio de la camara y
// se acercan por su eje, asi que apuntan solas al punto de fuga sin girarlas ni
// una vez -- un segmento paralelo al eje z se proyecta como una linea que sale
// del centro. De ahi tambien sale la unica regla que las hace legibles: cuanto
// mas ABIERTAS en pantalla, mas se ven. Lejos caen cerca del centro, o sea
// encima de la pista y justo donde hay que leer los obstaculos, y ahi se
// quedan casi apagadas; se encienden segun barren hacia los bordes, que es
// donde no estorban y donde la velocidad se siente.
//
// Y no salen nunca en los primeros metros. Aparecer de salida las convertiria
// en decorado fijo; lo que tienen que decir es "esto ya no va como al
// principio", asi que empiezan pasado un tercio de la rampa de velocidad y de
// ahi hasta el tope.

// A partir de que parte de la rampa de velocidad empiezan a verse
const DESDE = 0.34
// Metros por delante del ojo donde nacen y donde se reciclan, ya rebasado
const Z0 = -46
const ZFIN = 2
// Lo que se apartan del eje de la camara: por dentro de 2.6 m taparian al
// propio corredor, que va a metro y medio del ojo
const RADIO = [2.6, 10]
const LARGO = [3.5, 10]
// Corren algo mas rapido que el mundo. A la misma velocidad exacta se leen como
// una pieza mas del puerto que pasa de largo; un pelo por encima es lo que las
// separa del escenario y las convierte en aire.
const ADELANTO = 1.25

const rf = (a, b) => a + Math.random() * (b - a)

function siembra(l, nueva) {
  const a = Math.random() * Math.PI * 2
  const r = rf(RADIO[0], RADIO[1])
  l.x = Math.cos(a) * r
  l.y = Math.sin(a) * r
  l.r = r
  l.len = rf(LARGO[0], LARGO[1])
  l.brillo = rf(0.45, 1)
  // Al arrancar se reparten por todo el corredor; ya en marcha, cada una vuelve
  // al fondo. Si todas nacieran al fondo, la primera vez saldrian en bloque.
  l.z = nueva ? rf(Z0, ZFIN) : Z0 - rf(0, 8)
  return l
}

export function SpeedLines() {
  const mesh = useRef()
  const camera = useThree((s) => s.camera)
  // En el nivel rapido son menos: cada raya es transparente y se dibuja encima
  // de lo que ya hay, y el pixel pintado dos veces es justo lo que ahoga a una
  // grafica integrada (ver quality.js).
  const n = QUALITY.fx ? 34 : 20
  const lineas = useMemo(() => Array.from({ length: n }, () => siembra({}, true)), [n])
  const dummy = useMemo(() => new THREE.Object3D(), [])
  const tinta = useMemo(() => new THREE.Color(), [])

  useFrame((_, dt0) => {
    const dt = Math.min(dt0, 0.05)
    const m = mesh.current
    if (!m) return

    const phase = useGame.getState().phase
    const k = (runtime.speed - BASE_SPEED) / (MAX_SPEED - BASE_SPEED)
    // en 'crashed' la velocidad se desploma sola, asi que las rayas se apagan
    // con el frenado sin que haya que decirles nada
    const corriendo = phase === 'playing' || phase === 'crashed'
    const fuerza = corriendo ? Math.max(0, Math.min(1, (k - DESDE) / (1 - DESDE))) : 0
    m.visible = fuerza > 0.01
    if (!m.visible) return

    // La malla se planta en la camara cada cuadro en vez de colgarse de ella:
    // asi las posiciones de las instancias SON coordenadas de camara y no hay
    // que rehacerlas cuando el ojo pana, sube o se alabea.
    m.position.copy(camera.position)
    m.quaternion.copy(camera.quaternion)

    const v = runtime.speed * ADELANTO
    for (let i = 0; i < lineas.length; i++) {
      const l = lineas[i]
      l.z += v * dt
      if (l.z > ZFIN) siembra(l, false)
      dummy.position.set(l.x, l.y, l.z)
      dummy.scale.set(1, 1, l.len)
      dummy.updateMatrix()
      m.setMatrixAt(i, dummy.matrix)
      // Cuanto se ha abierto en pantalla: el radio dividido por lo lejos que
      // esta. Es la mitad de la idea de arriba y sale de una division.
      const abierta = Math.min(1, l.r / (Math.abs(l.z) * 0.62 + 0.001))
      const a = fuerza * l.brillo * abierta * abierta
      // Mezcla aditiva: la intensidad del color ES la opacidad, y asi las rayas
      // suman luz sobre el atardecer en vez de recortar una silueta gris.
      tinta.setRGB(a * 0.72, a * 0.86, a)
      m.setColorAt(i, tinta)
    }
    m.instanceMatrix.needsUpdate = true
    if (m.instanceColor) m.instanceColor.needsUpdate = true
  })

  return (
    // Sin recorte por volumen: las instancias van en coordenadas de camara, asi
    // que la caja que three calcula para ellas no significa nada.
    <instancedMesh
      ref={mesh}
      // con nombre: es como la prueba sin pantalla la encuentra en la escena
      // para comprobar que se enciende con la velocidad y se apaga en pausa
      name="rayas"
      args={[undefined, undefined, n]}
      frustumCulled={false}
      visible={false}
      userData={{ noShadow: true, noDress: true }}
    >
      <boxGeometry args={[0.055, 0.055, 1]} />
      <meshBasicMaterial
        color="#ffffff"
        transparent
        blending={THREE.AdditiveBlending}
        depthWrite={false}
        toneMapped={false}
        fog={false}
      />
    </instancedMesh>
  )
}
