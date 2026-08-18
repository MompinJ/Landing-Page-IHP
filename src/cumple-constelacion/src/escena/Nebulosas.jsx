import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { esMovil } from '../util/medidas'

const vertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const fragmentShader = /* glsl */ `
  uniform vec3 uColor;
  uniform float uIntensidad;
  uniform float uTiempo;
  uniform float uSemilla;

  varying vec2 vUv;

  void main() {
    vec2 p = vUv - 0.5;

    // Deformacion lenta para que la nube no se vea como un circulo perfecto
    float a = atan(p.y, p.x);
    float r = length(p);
    r *= 1.0 + 0.22 * sin(a * 3.0 + uTiempo * 0.11 + uSemilla)
             + 0.14 * sin(a * 5.0 - uTiempo * 0.07 + uSemilla * 2.0);

    float caida = smoothstep(0.5, 0.02, r);
    float densidad = pow(caida, 2.6);

    gl_FragColor = vec4(uColor, densidad * uIntensidad);
  }
`

// Nubes de gas muy tenues repartidas por el recorrido.
// Son planos sueltos con degradado, mucho mas baratos que un volumen real.
export default function Nebulosas() {
  const grupo = useRef()

  const nubes = useMemo(() => {
    const paleta = ['#2a3a7a', '#4a2a6a', '#6a3f5a', '#3a2f7a', '#7a5a2a']
    const cantidad = esMovil ? 5 : 8
    const lista = []

    for (let i = 0; i < cantidad; i++) {
      const avance = i / cantidad
      lista.push({
        posicion: [
          (Math.random() - 0.5) * 30,
          (Math.random() - 0.5) * 22,
          8 - avance * 96 - Math.random() * 8,
        ],
        tamano: 26 + Math.random() * 34,
        color: paleta[i % paleta.length],
        intensidad: 0.13 + Math.random() * 0.1,
        semilla: Math.random() * 10,
        giro: (Math.random() - 0.5) * 0.02,
      })
    }
    return lista
  }, [])

  const materiales = useRef([])

  useFrame((_, delta) => {
    materiales.current.forEach((m, i) => {
      if (!m) return
      m.uniforms.uTiempo.value += delta
      const malla = grupo.current?.children[i]
      if (malla) malla.rotation.z += nubes[i].giro * delta
    })
  })

  return (
    <group ref={grupo}>
      {nubes.map((nube, i) => (
        <mesh key={i} position={nube.posicion} renderOrder={-1}>
          <planeGeometry args={[nube.tamano, nube.tamano * 0.72, 1, 1]} />
          <shaderMaterial
            ref={(m) => (materiales.current[i] = m)}
            vertexShader={vertexShader}
            fragmentShader={fragmentShader}
            uniforms={{
              uColor: { value: new THREE.Color(nube.color) },
              uIntensidad: { value: nube.intensidad },
              uTiempo: { value: nube.semilla * 3 },
              uSemilla: { value: nube.semilla },
            }}
            transparent
            depthWrite={false}
            depthTest={false}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
      ))}
    </group>
  )
}
