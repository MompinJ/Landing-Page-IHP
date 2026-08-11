import { useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { CONSTELACION_Z, camaraZ, esMovil } from '../util/medidas'

// Nodos de la constelacion en coordenadas normalizadas (-1 a 1).
const NODOS = [
  [-1.0, 0.08],
  [-0.62, 0.5],
  [-0.2, 0.14],
  [0.12, 0.64],
  [0.48, 0.2],
  [0.94, 0.52],
  [0.56, -0.2],
  [0.04, -0.52],
  [-0.52, -0.34],
]

// Orden en que se traza. El ultimo es el trazo interior.
const TRAZO = [
  [0, 1],
  [1, 2],
  [2, 3],
  [3, 4],
  [4, 5],
  [5, 6],
  [6, 7],
  [7, 8],
  [8, 0],
  [2, 7],
]

const lineaVertex = /* glsl */ `
  attribute float aT;
  varying float vT;
  void main() {
    vT = aT;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const lineaFragment = /* glsl */ `
  uniform float uAvance;
  uniform vec3 uColor;
  varying float vT;

  void main() {
    if (vT > uAvance) discard;
    float cabeza = smoothstep(0.05, 0.0, uAvance - vT);
    float alfa = 0.42 + cabeza * 0.58;
    gl_FragColor = vec4(uColor * (1.0 + cabeza * 2.2), alfa);
  }
`

const nodoVertex = /* glsl */ `
  attribute float aT;
  attribute float aTamano;

  uniform float uTiempo;
  uniform float uAvance;
  uniform float uPixelRatio;

  varying float vAlfa;
  varying float vNacimiento;

  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    float distancia = -mv.z;

    // Chispazo al encenderse y luego latido tranquilo
    float encendido = smoothstep(0.0, 0.09, uAvance - aT);
    float chispa = smoothstep(0.16, 0.0, uAvance - aT) * encendido;
    float latido = 0.75 + 0.25 * sin(uTiempo * 1.3 + aT * 22.0);

    vNacimiento = chispa;
    vAlfa = encendido * latido;

    float extra = 1.0 + chispa * 1.8;
    gl_PointSize = min(aTamano * extra * uPixelRatio * (26.0 / max(distancia, 0.8)), 90.0 * uPixelRatio);
    gl_Position = projectionMatrix * mv;
  }
`

const nodoFragment = /* glsl */ `
  uniform vec3 uColor;
  uniform vec3 uColorClaro;

  varying float vAlfa;
  varying float vNacimiento;

  void main() {
    vec2 c = gl_PointCoord - 0.5;
    float d = length(c);
    if (d > 0.5) discard;

    float cuerpo = smoothstep(0.5, 0.0, d);
    float nucleo = pow(cuerpo, 6.0);

    // Cruz de destello, como una estrella brillante fotografiada
    float cruz = pow(max(0.0, 1.0 - abs(c.x) * 14.0), 3.0) * smoothstep(0.5, 0.0, abs(c.y) * 2.0)
               + pow(max(0.0, 1.0 - abs(c.y) * 14.0), 3.0) * smoothstep(0.5, 0.0, abs(c.x) * 2.0);

    float alfa = (cuerpo * 0.16 + nucleo * 0.95 + cruz * 0.28) * vAlfa;
    vec3 color = mix(uColor, uColorClaro, nucleo * 0.7 + vNacimiento * 0.5);

    gl_FragColor = vec4(color * (0.8 + nucleo * 1.2), alfa);
  }
`

export default function Constelacion() {
  const grupo = useRef()
  const matLinea = useRef()
  const matNodo = useRef()
  const camara = useThree((s) => s.camera)
  const tamano = useThree((s) => s.size)
  const pixelRatio = useThree((s) => s.viewport.dpr)

  const distanciaFinal = camaraZ(1) - CONSTELACION_Z

  // Escala para que la constelacion quepa con holgura en pantalla
  const { escala, desplazamientoY } = useMemo(() => {
    const altoVisible = 2 * distanciaFinal * Math.tan((camara.fov * Math.PI) / 360)
    const anchoVisible = altoVisible * (tamano.width / tamano.height)

    const anchoObjetivo = esMovil ? anchoVisible * 0.82 : anchoVisible * 0.4
    const altoObjetivo = esMovil ? altoVisible * 0.26 : altoVisible * 0.34

    // Los nodos ocupan 2 unidades de ancho y ~1.16 de alto en el espacio normalizado
    const e = Math.min(anchoObjetivo / 2, altoObjetivo / 1.16)

    // Se coloca arriba para dejarle la parte baja de la pantalla al mensaje
    return { escala: e, desplazamientoY: altoVisible * (esMovil ? 0.22 : 0.19) }
  }, [camara.fov, tamano.width, tamano.height, distanciaFinal])

  const { geoLineas, geoNodos } = useMemo(() => {
    const punto = (i) => new THREE.Vector2(NODOS[i][0], NODOS[i][1])

    // Longitud acumulada para que el trazo avance a velocidad constante
    const largos = TRAZO.map(([a, b]) => punto(a).distanceTo(punto(b)))
    const total = largos.reduce((s, l) => s + l, 0)

    const posiciones = new Float32Array(TRAZO.length * 2 * 3)
    const tes = new Float32Array(TRAZO.length * 2)
    const nacimiento = new Array(NODOS.length).fill(1)

    let acumulado = 0
    TRAZO.forEach(([a, b], i) => {
      const t0 = acumulado / total
      acumulado += largos[i]
      const t1 = acumulado / total

      posiciones.set([NODOS[a][0], NODOS[a][1], 0], i * 6)
      posiciones.set([NODOS[b][0], NODOS[b][1], 0], i * 6 + 3)
      tes[i * 2] = t0
      tes[i * 2 + 1] = t1

      nacimiento[a] = Math.min(nacimiento[a], t0)
      nacimiento[b] = Math.min(nacimiento[b], t1)
    })

    const gl = new THREE.BufferGeometry()
    gl.setAttribute('position', new THREE.BufferAttribute(posiciones, 3))
    gl.setAttribute('aT', new THREE.BufferAttribute(tes, 1))

    // Nodos principales mas algunas estrellas sueltas de acompanamiento
    const sueltas = 26
    const totalNodos = NODOS.length + sueltas
    const posNodos = new Float32Array(totalNodos * 3)
    const tNodos = new Float32Array(totalNodos)
    const tamNodos = new Float32Array(totalNodos)

    NODOS.forEach(([x, y], i) => {
      posNodos.set([x, y, 0], i * 3)
      tNodos[i] = nacimiento[i]
      tamNodos[i] = 7.5
    })

    for (let i = 0; i < sueltas; i++) {
      const j = NODOS.length + i
      const angulo = Math.random() * Math.PI * 2
      const radio = 0.35 + Math.random() * 1.15
      posNodos.set([Math.cos(angulo) * radio * 1.25, Math.sin(angulo) * radio * 0.75, -0.05 - Math.random() * 0.4], j * 3)
      tNodos[j] = Math.random() * 0.9
      tamNodos[j] = 1.4 + Math.random() * 2.2
    }

    const gn = new THREE.BufferGeometry()
    gn.setAttribute('position', new THREE.BufferAttribute(posNodos, 3))
    gn.setAttribute('aT', new THREE.BufferAttribute(tNodos, 1))
    gn.setAttribute('aTamano', new THREE.BufferAttribute(tamNodos, 1))

    return { geoLineas: gl, geoNodos: gn }
  }, [])

  const uniformsLinea = useMemo(
    () => ({
      uAvance: { value: 0 },
      uColor: { value: new THREE.Color('#c9a45a') },
    }),
    []
  )

  const uniformsNodo = useMemo(
    () => ({
      uAvance: { value: 0 },
      uTiempo: { value: 0 },
      uPixelRatio: { value: pixelRatio },
      uColor: { value: new THREE.Color('#e8c36a') },
      uColorClaro: { value: new THREE.Color('#fff8e6') },
    }),
    []
  )

  useFrame((_, delta) => {
    const distancia = camara.position.z - CONSTELACION_Z
    // Se dibuja sola conforme la camara se acerca en el ultimo tramo
    const avance = 1 - THREE.MathUtils.smoothstep(distancia, distanciaFinal + 2.2, distanciaFinal + 15)

    if (matLinea.current) matLinea.current.uniforms.uAvance.value = avance
    if (matNodo.current) {
      matNodo.current.uniforms.uAvance.value = avance
      matNodo.current.uniforms.uTiempo.value += delta
      matNodo.current.uniforms.uPixelRatio.value = pixelRatio
    }
  })

  return (
    <group ref={grupo} position={[0, desplazamientoY, CONSTELACION_Z]} scale={escala}>
      <lineSegments geometry={geoLineas} frustumCulled={false}>
        <shaderMaterial
          ref={matLinea}
          vertexShader={lineaVertex}
          fragmentShader={lineaFragment}
          uniforms={uniformsLinea}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </lineSegments>

      <points geometry={geoNodos} frustumCulled={false}>
        <shaderMaterial
          ref={matNodo}
          vertexShader={nodoVertex}
          fragmentShader={nodoFragment}
          uniforms={uniformsNodo}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </points>
    </group>
  )
}
