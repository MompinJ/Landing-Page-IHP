import { useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { menosMovimiento } from '../util/medidas'

const vertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const fragmentShader = /* glsl */ `
  uniform sampler2D uMapa;
  uniform vec2 uPlano;
  uniform vec2 uMarco;
  uniform float uRadio;
  uniform float uAspectoImagen;
  uniform float uZoom;
  uniform vec2 uCentro;
  uniform float uEntrada;
  uniform float uSalida;
  uniform float uTiempo;
  uniform vec3 uOro;
  uniform vec3 uOroClaro;

  varying vec2 vUv;

  // Distancia con signo a un rectangulo de esquinas redondeadas
  float sdCaja(vec2 p, vec2 b, float r) {
    vec2 q = abs(p) - b + r;
    return min(max(q.x, q.y), 0.0) + length(max(q, 0.0)) - r;
  }

  float ruido(vec2 p) {
    return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
  }

  void main() {
    // Coordenadas en unidades de mundo, centradas en la foto
    vec2 p = (vUv - 0.5) * uPlano;
    float d = sdCaja(p, uMarco * 0.5, uRadio);

    float aa = max(fwidth(d) * 1.1, 0.0015);
    float dentro = 1.0 - smoothstep(-aa, aa, d);

    // Coordenadas normalizadas sobre la foto, con recorte tipo cover.
    // Si el marco ya trae la proporcion de la imagen, escala queda en 1
    // y no se recorta nada; uZoom y uCentro son el reencuadre manual.
    vec2 uvFoto = p / uMarco + 0.5;
    float aspectoMarco = uMarco.x / uMarco.y;
    vec2 escala = aspectoMarco > uAspectoImagen
      ? vec2(1.0, uAspectoImagen / aspectoMarco)
      : vec2(aspectoMarco / uAspectoImagen, 1.0);
    vec2 uvCover = (uvFoto - 0.5) * escala / uZoom + uCentro;

    vec3 color = texture2D(uMapa, clamp(uvCover, 0.001, 0.999)).rgb;

    // Vineta interior: hunde las orillas para que la foto respire
    float vineta = 1.0 - smoothstep(0.34, 0.98, length((uvFoto - 0.5) * vec2(1.0, 1.08)) * 1.34);
    color *= mix(0.80, 1.0, vineta);

    // Barrido de luz muy suave, como un cristal inclinandose
    float banda = sin((uvFoto.x * 1.35 + uvFoto.y * 0.75) * 3.14159 - uTiempo * 0.32);
    color += pow(max(banda, 0.0), 26.0) * 0.06;

    // Grano finisimo para que no se vea plano
    color += (ruido(gl_FragCoord.xy) - 0.5) * 0.030;

    // Filo dorado y halo exterior
    float filo = 1.0 - smoothstep(0.0, 0.014, abs(d));
    float halo = exp(-max(d, 0.0) * 8.5) * step(-0.001, d);

    color = mix(color, uOroClaro, filo * 0.85);

    // Aparicion: la foto se revela de abajo hacia arriba
    float corte = uEntrada * 1.3 - 0.15;
    float mascara = smoothstep(corte + 0.12, corte - 0.05, uvFoto.y);
    float linea = exp(-pow((uvFoto.y - corte) / 0.022, 2.0)) * (1.0 - smoothstep(0.90, 1.0, uEntrada));

    color += uOroClaro * linea * 0.9;

    float alfa = dentro * mascara * uSalida;
    alfa = max(alfa, halo * 0.30 * uEntrada * uSalida);
    color = mix(uOro * 0.9, color, dentro);

    if (alfa < 0.002) discard;
    gl_FragColor = vec4(color, alfa);
  }
`

export default function Foto({
  textura,
  aspectoImagen,
  ancho,
  alto,
  posicion,
  indice,
  zoom = 1,
  centro = [0.5, 0.5],
}) {
  const malla = useRef()
  const material = useRef()
  const camara = useThree((s) => s.camera)
  const puntero = useThree((s) => s.pointer)

  // El plano lleva un margen extra para que quepa el halo exterior
  const margen = 0.55
  const planoAncho = ancho + margen * 2
  const planoAlto = alto + margen * 2

  const uniforms = useMemo(
    () => ({
      uMapa: { value: textura },
      uPlano: { value: new THREE.Vector2(planoAncho, planoAlto) },
      uMarco: { value: new THREE.Vector2(ancho, alto) },
      uRadio: { value: Math.min(ancho, alto) * 0.045 },
      uAspectoImagen: { value: aspectoImagen },
      uZoom: { value: zoom },
      uCentro: { value: new THREE.Vector2(centro[0], centro[1]) },
      uEntrada: { value: 0 },
      uSalida: { value: 0 },
      uTiempo: { value: indice * 3.1 },
      uOro: { value: new THREE.Color('#8a6f3c') },
      uOroClaro: { value: new THREE.Color('#fff3d6') },
    }),
    []
  )

  // Mantiene los uniformes al dia si cambia el tamano de la ventana
  useMemo(() => {
    uniforms.uPlano.value.set(planoAncho, planoAlto)
    uniforms.uMarco.value.set(ancho, alto)
    uniforms.uRadio.value = Math.min(ancho, alto) * 0.045
    uniforms.uAspectoImagen.value = aspectoImagen
    uniforms.uZoom.value = zoom
    uniforms.uCentro.value.set(centro[0], centro[1])
  }, [ancho, alto, aspectoImagen, zoom, centro[0], centro[1]])

  useFrame((estado, delta) => {
    if (!malla.current || !material.current) return

    const u = material.current.uniforms
    u.uTiempo.value += delta

    // La distancia a la camara decide cuando aparece y cuando se va.
    // Las fotos estan separadas 10 unidades y se miran desde 7, asi que el
    // rango de aparicion tiene que caber dentro de ese hueco: si empieza
    // antes de 15.5 se alcanzan a ver dos fotos a la vez.
    const distancia = camara.position.z - malla.current.position.z
    u.uEntrada.value = 1 - THREE.MathUtils.smoothstep(distancia, 8.6, 15.4)
    u.uSalida.value = THREE.MathUtils.smoothstep(distancia, 1.4, 4.6)

    if (menosMovimiento) return

    // Flotacion lenta y ligerisima inclinacion hacia el puntero
    const t = estado.clock.elapsedTime + indice * 2.4
    malla.current.position.y = posicion[1] + Math.sin(t * 0.42) * 0.085
    malla.current.rotation.x = THREE.MathUtils.lerp(
      malla.current.rotation.x,
      Math.sin(t * 0.31) * 0.03 + puntero.y * 0.05,
      0.05
    )
    malla.current.rotation.y = THREE.MathUtils.lerp(
      malla.current.rotation.y,
      Math.cos(t * 0.27) * 0.04 + puntero.x * 0.07,
      0.05
    )
  })

  return (
    <mesh ref={malla} position={posicion} renderOrder={2}>
      <planeGeometry args={[planoAncho, planoAlto, 1, 1]} />
      <shaderMaterial
        ref={material}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        toneMapped={false}
      />
    </mesh>
  )
}
