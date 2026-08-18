import { useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { esMovil } from '../util/medidas'

const vertexShader = /* glsl */ `
  attribute float aTamano;
  attribute float aFase;
  attribute float aVelocidad;

  uniform float uTiempo;
  uniform float uPixelRatio;
  uniform float uAlto;

  varying float vAlfa;

  void main() {
    vec3 p = position;

    // Sube despacio y se reinicia abajo: motas suspendidas en el aire
    float recorrido = mod(p.y + uTiempo * aVelocidad, uAlto) ;
    p.y = recorrido - uAlto * 0.5;

    // Deriva lateral suave, distinta para cada mota
    p.x += sin(uTiempo * 0.28 + aFase) * 0.9;
    p.z += cos(uTiempo * 0.21 + aFase * 1.7) * 0.7;

    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    float distancia = -mv.z;

    float destello = 0.35 + 0.65 * pow(abs(sin(uTiempo * 1.35 + aFase)), 2.5);
    float cerca = smoothstep(0.6, 3.2, distancia);
    float lejos = 1.0 - smoothstep(9.0, 20.0, distancia);

    vAlfa = destello * cerca * lejos;

    gl_PointSize = min(aTamano * uPixelRatio * (20.0 / max(distancia, 0.8)), 30.0 * uPixelRatio);
    gl_Position = projectionMatrix * mv;
  }
`

const fragmentShader = /* glsl */ `
  uniform vec3 uColor;
  varying float vAlfa;

  void main() {
    vec2 c = gl_PointCoord - 0.5;
    float d = length(c);
    if (d > 0.5) discard;

    float cuerpo = smoothstep(0.5, 0.0, d);
    float nucleo = pow(cuerpo, 3.5);

    gl_FragColor = vec4(uColor * (0.7 + nucleo), (cuerpo * 0.18 + nucleo * 0.8) * vAlfa);
  }
`

// Motas doradas que acompanan a la camara durante todo el viaje.
export default function PolvoDorado() {
  const grupo = useRef()
  const material = useRef()
  const camara = useThree((s) => s.camera)
  const pixelRatio = useThree((s) => s.viewport.dpr)

  const cantidad = esMovil ? 260 : 900
  const ALTO = 22

  const geometria = useMemo(() => {
    const posiciones = new Float32Array(cantidad * 3)
    const tamanos = new Float32Array(cantidad)
    const fases = new Float32Array(cantidad)
    const velocidades = new Float32Array(cantidad)

    for (let i = 0; i < cantidad; i++) {
      posiciones[i * 3 + 0] = (Math.random() - 0.5) * 26
      posiciones[i * 3 + 1] = Math.random() * ALTO
      posiciones[i * 3 + 2] = -Math.random() * 16 + 2
      tamanos[i] = 1.4 + Math.random() * 3.6
      fases[i] = Math.random() * Math.PI * 2
      velocidades[i] = 0.22 + Math.random() * 0.55
    }

    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(posiciones, 3))
    g.setAttribute('aTamano', new THREE.BufferAttribute(tamanos, 1))
    g.setAttribute('aFase', new THREE.BufferAttribute(fases, 1))
    g.setAttribute('aVelocidad', new THREE.BufferAttribute(velocidades, 1))
    return g
  }, [cantidad])

  const uniforms = useMemo(
    () => ({
      uTiempo: { value: 0 },
      uPixelRatio: { value: pixelRatio },
      uAlto: { value: ALTO },
      uColor: { value: new THREE.Color('#e8c36a') },
    }),
    []
  )

  useFrame((_, delta) => {
    if (material.current) {
      material.current.uniforms.uTiempo.value += delta
      material.current.uniforms.uPixelRatio.value = pixelRatio
    }
    // El polvo viaja con la camara para que nunca se acabe
    if (grupo.current) grupo.current.position.z = camara.position.z
  })

  return (
    <group ref={grupo}>
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
    </group>
  )
}
