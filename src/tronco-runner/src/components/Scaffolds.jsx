import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { runtime, scroll } from '../runtime'
import { LANES, VIEW_AHEAD } from '../constants'
import { PLATFORMS, SCAF_RAMP, SCAF_H, deckAt } from '../course'
import { mergeParts } from '../merge'
import { bakedDetail } from '../detail'
import { QUALITY } from '../quality'

// Andamio subible. Es geometria de juego, no decorado: su rampa y su tablero
// son exactamente lo que devuelve supportAt(), asi que se dibuja desde la misma
// lista del curso y no desde el generador de escenario.
//
// Ocupa un carril y deja 2.7 m libres por debajo, lo justo para pasar corriendo
// sin agacharse. Ahi esta la decision: subir y llevarse la fila de valores del
// tablero, o seguir por abajo.
//
// Los tableros de una cadena (p.ramp === 0) no llevan escalera: solo se llega
// a ellos saltando desde el tablero anterior, asi que en vez de rampa se
// dibuja el canto de entrada marcado y el hueco queda a la vista.
//
// Las piezas se declaran en una lista y se fusionan por material (merge.js).
// Un andamio son mas de ochenta piezas y en el astillero hay varios a la vez:
// sueltos eran centenares de llamadas de dibujo por cuadro, que es de donde
// venia el tiron de esa zona. Fusionados son tres o cuatro.
const TUBE = { metalness: 0.4, roughness: 0.55 }
const TUBE_DARK = { metalness: 0.4, roughness: 0.6 }
const PLANK = { roughness: 0.9 }

function buildScaffold(p) {
  const out = []
  const box = (pos, size, color, extra = {}) => out.push({ geo: 'box', pos, size, color, ...extra })

  const deckLen = p.len
  const R = p.ramp
  const H = SCAF_H
  // z local: 0 es el pie de la rampa y el recorrido avanza hacia -z
  const steps = Math.round(SCAF_RAMP / 1.5)
  const slope = Math.atan2(H, R)
  const diag = Math.hypot(R, H)

  if (R > 0) {
    // Rampa de acceso escalonada. Cada peldano lleva su contrahuella y por
    // debajo va una zanca corrida: sin eso los peldanos se veian como losas
    // flotando en el aire una encima de otra.
    for (const sx of [-1, 1]) {
      box([sx * 0.96, H / 2 - 0.35, -R / 2], [0.16, 0.5, diag], '#c9a12e', { ...TUBE_DARK, rot: [slope, 0, 0] })
      box([sx * 1.02, H / 2 + 1.05, -R / 2], [0.07, 0.07, diag], '#e0b32e', { ...TUBE, rot: [slope, 0, 0] })
    }
    for (let i = 0; i < steps; i++) {
      const f = (i + 0.5) / steps
      const zc = -(f * R)
      const y = H * f
      const rise = H / steps
      box([0, y - 0.07, zc], [2.1, 0.14, R / steps + 0.08], '#9a7a4e', PLANK)
      box([0, y - rise / 2 - 0.07, zc + R / steps / 2], [2.06, rise, 0.1], '#7d5f3c', PLANK)
      for (const sx of [-1, 1]) box([sx * 1.02, y + 0.55, zc], [0.08, 1.1, 0.08], '#e0b32e', TUBE)
    }
  } else {
    // Canto de entrada de un tablero sin escalera: es donde se aterriza. La
    // marca va PINTADA sobre el tablero, no en mastiles: quien salta lo mira
    // desde arriba y lo lee entero, y quien pasa por el suelo no se come un
    // poste naranja a la altura de los ojos (la camara va a 4.3 m y el tablero
    // a 2.7, o sea justo en medio).
    box([0, H + 0.02, -0.05], [2.14, 0.14, 0.3], '#f5c518', { emissive: '#8a6a00', emissiveIntensity: 0.6 })
    for (let i = 0; i < 3; i++) {
      box([0, H + 0.03, -0.9 - i * 1.2], [1.9 - i * 0.45, 0.06, 0.5], '#ff9d2f', {
        emissive: '#7a3d00',
        emissiveIntensity: 0.8,
      })
    }
  }

  // Galones en el canto de salida: avisan de que ahi se salta al tablero
  // siguiente en vez de bajarse.
  if (p.jump) {
    for (let i = 0; i < 3; i++) {
      box([0, H + 0.03, -R - deckLen + 1.2 + i * 1.3], [0.9 + i * 0.3, 0.06, 0.45], '#ff9d2f', {
        emissive: '#7a3d00',
        emissiveIntensity: 0.8,
      })
    }
  }

  // tablero y juntas de los tablones, para que se lea el largo
  box([0, H - 0.09, -R - deckLen / 2], [2.1, 0.18, deckLen], '#9a7a4e', PLANK)
  for (let i = 0; i < Math.round(deckLen / 2.5); i++) {
    box([0, H + 0.01, -R - 1.25 - i * 2.5], [2.12, 0.04, 0.12], '#7d5f3c', PLANK)
  }

  // barandal y rodapie del tablero
  for (const sx of [-1, 1]) {
    box([sx * 1.02, H + 0.55, -R - deckLen / 2], [0.07, 0.07, deckLen], '#e0b32e', TUBE)
    box([sx * 1.02, H + 1.05, -R - deckLen / 2], [0.07, 0.07, deckLen], '#e0b32e', TUBE)
    box([sx * 1.02, H + 0.15, -R - deckLen / 2], [0.05, 0.24, deckLen], '#c9a12e', { roughness: 0.6 })
  }

  // estructura tubular: pies derechos y crucetas
  for (let i = 0; i < Math.round(deckLen / 4) + 1; i++) {
    const zc = -R - i * 4
    for (const sx of [-1, 1]) {
      box([sx * 1.02, H / 2, zc], [0.1, H, 0.1], '#e0b32e', TUBE)
      box([sx * 1.02, H + 1.1, zc], [0.08, 1.2, 0.08], '#e0b32e', TUBE)
      // diagonales cortas en el canto, fuera del paso: dan la lectura de
      // andamio arriostrado sin meterse en el carril
      box([sx * 1.02, H - 0.75, zc - 1], [0.06, 2.4, 0.06], '#b09030', { ...TUBE_DARK, rot: [0.9, 0, 0] })
    }
    // Travesano de arriostrado. Va pegado al tablero y NO a media altura: a
    // 1.35 m cruzaba el carril entero justo por donde pasa corriendo el que
    // decide no subirse, o sea que el corredor atravesaba un tubo de acero cada
    // cuatro metros. Aqui abajo tiene que quedar el galibo limpio.
    box([0, H - 0.32, zc], [0.08, 2.1, 0.08], '#c9a12e', { ...TUBE_DARK, rot: [0, 0, Math.PI / 2] })
  }

  // franja de borde en el canto del tablero: avisa de la caida
  box([0, H + 0.02, -R - deckLen - 0.05], [2.14, 0.14, 0.3], '#f5c518', {
    emissive: '#8a6a00',
    emissiveIntensity: 0.6,
  })

  return out
}

const DONE = { sh: 1 }

function ScaffoldMesh({ part }) {
  const p = part.p
  const d = bakedDetail()
  return (
    // sh: 1 lo marca como acabado para el barrido de escena: el material ya
    // viene con sus mapas y no hay que colgarle los de las piezas sueltas
    <mesh geometry={part.geometry} castShadow={QUALITY.shadows} receiveShadow={QUALITY.shadows} userData={DONE}>
      <meshStandardMaterial
        transparent
        vertexColors
        map={d.wear}
        normalMap={d.normal}
        roughnessMap={d.rough}
        emissive={p.emissive || '#000000'}
        emissiveIntensity={p.emissiveIntensity || 0}
        metalness={p.metalness || 0.1}
        roughness={p.roughness ?? 0.85}
        envMapIntensity={1.15}
      />
    </mesh>
  )
}

function Scaffold({ p }) {
  const group = useRef()
  const under = useRef(false)
  const base = deckAt(p.d0d + 2)
  const zw = 2 - p.d0
  const parts = useMemo(() => mergeParts(buildScaffold(p)), [p])
  useEffect(() => () => parts.forEach((x) => x.geometry.dispose()), [parts])

  useFrame(() => {
    if (!group.current) return
    group.current.position.set(LANES[p.lane], base, zw + scroll.s)

    // Si el corredor va POR DEBAJO, el andamio se vuelve translucido. Los
    // materiales NACEN con transparent=true y opacidad 1: cambiar `transparent`
    // en caliente obliga a recompilar el programa de cada material, y eso es un
    // tiron cada vez que se entra o se sale de debajo de un tablero. La opacidad
    // sola no recompila nada. La camara va 4.3 m sobre el suelo y el tablero
    // esta a 2.7, asi que al pasar por debajo el tablero se mete entre camara y
    // corredor y lo tapa entero: no se veia ni el propio personaje, y eso es lo
    // que hacia sentir la zona rota.
    const isUnder =
      Math.abs(LANES[p.lane] - runtime.x) < 1.6 &&
      runtime.distance > p.d0d - 4 &&
      runtime.distance < p.end + 2 &&
      runtime.deck + runtime.y < base + SCAF_H - 0.6
    if (isUnder !== under.current) {
      under.current = isUnder
      group.current.traverse((o) => {
        if (!o.material) return
        o.material.opacity = isUnder ? 0.22 : 1
        o.material.depthWrite = !isUnder
      })
    }
  })

  return (
    <group ref={group}>
      {parts.map((part) => (
        <ScaffoldMesh key={part.key} part={part} />
      ))}
    </group>
  )
}

export function Scaffolds() {
  const [win, setWin] = useState([0, 0])
  const cur = useRef([0, 0])

  useFrame(() => {
    let [a, b] = cur.current
    if (scroll.s < (PLATFORMS[a]?.d0 ?? Infinity) - VIEW_AHEAD - 60) {
      a = 0
      b = 0
    }
    while (a < PLATFORMS.length && 2 - PLATFORMS[a].d0 - PLATFORMS[a].span + scroll.s > 24) a++
    while (b < PLATFORMS.length && PLATFORMS[b].d0 <= scroll.s + VIEW_AHEAD) b++
    if (a !== cur.current[0] || b !== cur.current[1]) {
      cur.current = [a, b]
      setWin([a, b])
    }
  })

  return PLATFORMS.slice(win[0], win[1]).map((p) => <Scaffold key={p.d0} p={p} />)
}
