import { useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { esMovil } from '../util/medidas'

const vertexShader = /* glsl */ `
  attribute float aTamano;
  attribute float aFase;
  attribute float aTono;

  uniform float uTiempo;
  uniform float uPixelRatio;

  varying float vAlfa;
  varying float vTono;

  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    float distancia = -mv.z;

    // Parpadeo lento e irregular
    float parpadeo = 0.58 + 0.42 * sin(uTiempo * 0.8 + aFase);

    // Se apagan al quedar muy lejos y al pasarnos encima
    float lejos = 1.0 - smoothstep(58.0, 118.0, distancia);
    float cerca = smoothstep(0.5, 5.0, distancia);

    vAlfa = parpadeo * lejos * cerca;
    vTono = aTono;

    gl_PointSize = min(aTamano * uPixelRatio * (32.0 / max(distancia, 0.8)), 50.0 * uPixelRatio);
    gl_Position = projectionMatrix * mv;
  }
`

const fragmentShader = /* glsl */ `
  uniform vec3 uFrio;
  uniform vec3 uCalido;

  varying float vAlfa;
  varying float vTono;

  void main() {
    vec2 c = gl_PointCoord - 0.5;
    float d = length(c);
    if (d > 0.5) discard;

    float cuerpo = smoothstep(0.5, 0.0, d);
    float nucleo = pow(cuerpo, 5.0);

    float alfa = (cuerpo * 0.22 + nucleo * 0.95) * vAlfa;
    vec3 color = mix(uFrio, uCalido, vTono);

    gl_FragColor = vec4(color * (0.55 + nucleo * 0.9), alfa);
  }
`

export default function Estrellas() {
  const material = useRef()
  const cantidad = esMovil ? 2000 : 4200
  const pixelRatio = useThree((s) => s.viewport.dpr)

  const geometria = useMemo(() => {
    const posiciones = new Float32Array(cantidad * 3)
    const tamanos = new Float32Array(cantidad)
    const fases = new Float32Array(cantidad)
    const tonos = new Float32Array(cantidad)

    for (let i = 0; i < cantidad; i++) {
      // Volumen alargado: la camara lo atraviesa de punta a punta
      posiciones[i * 3 + 0] = (Math.random() - 0.5) * 78
      posiciones[i * 3 + 1] = (Math.random() - 0.5) * 62
      posiciones[i * 3 + 2] = 14 - Math.random() * 105

      // Unas pocas mucho mas grandes que el resto
      const rareza = Math.random()
      tamanos[i] = rareza > 0.958 ? 6.0 + Math.random() * 3.8 : 1.5 + Math.random() * 2.3
      fases[i] = Math.random() * Math.PI * 2
      tonos[i] = Math.pow(Math.random(), 1.7)
    }

    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(posiciones, 3))
    g.setAttribute('aTamano', new THREE.BufferAttribute(tamanos, 1))
    g.setAttribute('aFase', new THREE.BufferAttribute(fases, 1))
    g.setAttribute('aTono', new THREE.BufferAttribute(tonos, 1))
    return g
  }, [cantidad])

  const uniforms = useMemo(
    () => ({
      uTiempo: { value: 0 },
      uPixelRatio: { value: pixelRatio },
      uFrio: { value: new THREE.Color('#b9c6ea') },
      uCalido: { value: new THREE.Color('#f6d79a') },
    }),
    []
  )

  useFrame((_, delta) => {
    if (material.current) {
      material.current.uniforms.uTiempo.value += delta
      material.current.uniforms.uPixelRatio.value = pixelRatio
    }
  })

  return (
    <points geometry={geometria} frustumCulled={false}>
      <shaderMaterial
        ref={material}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  )
}
