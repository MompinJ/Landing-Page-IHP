import { memo, useEffect, useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGame } from '../store'
import { runtime, scrollSpeed } from '../runtime'
import { SEGMENT_LENGTH as L, NUM_SEGMENTS, THEMES, THEME_METERS, LANES, COLORS } from '../constants'

const START = 16 // borde frontal del segmento k=0 cuando scroll=0

function mulberry32(a) {
  return function () {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const themeFor = (k) => THEMES[Math.floor((k * L) / THEME_METERS) % THEMES.length]

const CONTAINER_COLORS = ['#0b3d91', '#009BDE', '#1d6e5e', '#8a3324', '#4f5b66', '#b58900', '#7a1f3d']

function buildProps(theme, seed) {
  const rnd = mulberry32(seed * 9301 + 49297)
  const out = []
  const box = (pos, size, color, extra = {}) => out.push({ geo: 'box', pos, size, color, ...extra })
  const cyl = (pos, args, color, extra = {}) => out.push({ geo: 'cyl', pos, args, color, ...extra })

  const laneLines = (edgeColor = '#0d5c8c') => {
    box([-1.15, 0.02, 0], [0.07, 0.02, L], COLORS.neon, { emissive: COLORS.neon, emissiveIntensity: 1.6 })
    box([1.15, 0.02, 0], [0.07, 0.02, L], COLORS.neon, { emissive: COLORS.neon, emissiveIntensity: 1.6 })
    box([-3.5, 0.015, 0], [0.1, 0.02, L], '#0d2b4a', { emissive: edgeColor, emissiveIntensity: 0.8 })
    box([3.5, 0.015, 0], [0.1, 0.02, L], '#0d2b4a', { emissive: edgeColor, emissiveIntensity: 0.8 })
  }

  if (theme === 'patio') {
    box([0, -0.11, 0], [11, 0.22, L], '#151d2c')
    laneLines()
    for (let z = -L / 2 + 3; z <= L / 2 - 3; z += 6) {
      for (const sx of [-1, 1]) {
        if (rnd() < 0.85) {
          const x = sx * (5.9 + rnd() * 1.8)
          const h = 1 + Math.floor(rnd() * 3)
          for (let i = 0; i < h; i++) {
            box([x + (rnd() - 0.5) * 0.3, 0.57 + i * 1.14, z], [2.4, 1.1, 5.4], CONTAINER_COLORS[Math.floor(rnd() * CONTAINER_COLORS.length)])
          }
        }
      }
    }
    if (seed % 2 === 0) {
      const z = (rnd() - 0.5) * L * 0.6
      box([-6.8, 4.5, z], [0.6, 9, 0.6], '#c8d2da')
      box([6.8, 4.5, z], [0.6, 9, 0.6], '#c8d2da')
      box([0, 9.2, z], [14.6, 0.6, 0.8], '#c8d2da')
      box([0, 8.4, z], [1.4, 0.9, 1.1], COLORS.sky, { emissive: COLORS.sky, emissiveIntensity: 0.5 })
    }
    for (const sx of [-1, 1]) {
      const z = sx * L * 0.32
      cyl([sx * 4.4, 2.5, z], [0.07, 0.09, 5, 6], '#3d4854')
      box([sx * 4.4, 5.05, z], [0.5, 0.22, 0.5], '#ffd98a', { emissive: '#ffd98a', emissiveIntensity: 2 })
    }
  } else if (theme === 'barco') {
    box([0, -0.11, 0], [16, 0.22, L], '#1c3048')
    laneLines('#0a4a80')
    for (let z = -L / 2 + 1.5; z <= L / 2 - 1.5; z += 3) {
      box([-4.1, 0.55, z], [0.08, 1.1, 0.08], '#c9d4dd')
      box([4.1, 0.55, z], [0.08, 1.1, 0.08], '#c9d4dd')
    }
    box([-4.1, 1.12, 0], [0.06, 0.06, L], '#e2ecf3', { emissive: '#9fd8ff', emissiveIntensity: 0.4 })
    box([4.1, 1.12, 0], [0.06, 0.06, L], '#e2ecf3', { emissive: '#9fd8ff', emissiveIntensity: 0.4 })
    for (let z = -L / 2 + 4; z <= L / 2 - 4; z += 7) {
      if (rnd() < 0.75) {
        const sx = rnd() < 0.5 ? -1 : 1
        const h = 1 + Math.floor(rnd() * 2)
        for (let i = 0; i < h; i++) {
          box([sx * 6.4, 0.57 + i * 1.14, z], [2.2, 1.1, 5.2], CONTAINER_COLORS[Math.floor(rnd() * CONTAINER_COLORS.length)])
        }
      }
    }
    box([-14.5, -0.6, 0], [13, 0.15, L], '#062c52', { emissive: '#0a4a80', emissiveIntensity: 0.35 })
    box([14.5, -0.6, 0], [13, 0.15, L], '#062c52', { emissive: '#0a4a80', emissiveIntensity: 0.35 })
    if (seed % 3 === 2) {
      const z = (rnd() - 0.5) * L * 0.5
      cyl([6.2, 3.2, z], [1, 1.3, 4.5, 12], '#c0392b')
      cyl([6.2, 5.5, z], [1.02, 1.02, 0.5, 12], '#2c2c34')
    }
  } else if (theme === 'vias') {
    box([0, -0.11, 0], [11, 0.22, L], '#20242a')
    for (let z = -L / 2 + 0.7; z <= L / 2 - 0.7; z += 1.4) {
      box([0, 0.02, z], [8, 0.06, 0.26], '#3f3226')
    }
    for (const c of LANES) {
      box([c - 0.5, 0.1, 0], [0.09, 0.1, L], '#8f9aa4', { metalness: 0.9, roughness: 0.3 })
      box([c + 0.5, 0.1, 0], [0.09, 0.1, L], '#8f9aa4', { metalness: 0.9, roughness: 0.3 })
    }
    box([-3.5, 0.015, 0], [0.1, 0.02, L], '#0d2b4a', { emissive: '#0d5c8c', emissiveIntensity: 0.8 })
    box([3.5, 0.015, 0], [0.1, 0.02, L], '#0d2b4a', { emissive: '#0d5c8c', emissiveIntensity: 0.8 })
    for (let z = -L / 2 + 5; z <= L / 2 - 5; z += 10) {
      const sx = rnd() < 0.5 ? -1 : 1
      box([sx * 4.4, 1.5, z], [0.12, 3, 0.12], '#55606b')
      const green = rnd() < 0.6
      out.push({
        geo: 'sph',
        pos: [sx * 4.4, 3.15, z],
        args: [0.15, 10, 10],
        color: green ? COLORS.good : COLORS.bad,
        emissive: green ? COLORS.good : COLORS.bad,
        emissiveIntensity: 2,
      })
    }
    for (let z = -L / 2 + 6; z <= L / 2 - 6; z += 12) {
      if (rnd() < 0.6) {
        const sx = rnd() < 0.5 ? -1 : 1
        box([sx * 6.9, 1.5, z], [2.6, 2.2, 9], '#6e3b28')
        cyl([sx * 6.1, 0.35, z - 3], [0.35, 0.35, 0.25, 10], '#191c20', { rot: [0, 0, Math.PI / 2] })
        cyl([sx * 6.1, 0.35, z + 3], [0.35, 0.35, 0.25, 10], '#191c20', { rot: [0, 0, Math.PI / 2] })
      }
    }
  } else {
    // crucero
    box([0, -0.11, 0], [13, 0.22, L], '#dfe7ee', { roughness: 0.6 })
    laneLines('#0aa8d6')
    for (let z = -L / 2 + 1.5; z <= L / 2 - 1.5; z += 3) {
      box([-4.6, 0.55, z], [0.08, 1.1, 0.08], '#ffffff')
      box([4.6, 0.55, z], [0.08, 1.1, 0.08], '#ffffff')
    }
    box([-4.6, 1.12, 0], [0.06, 0.06, L], '#ffffff')
    box([4.6, 1.12, 0], [0.06, 0.06, L], '#ffffff')
    box([-4.6, 3.1, 0], [0.05, 0.05, L], '#ffd98a', { emissive: '#ffd98a', emissiveIntensity: 1.2 })
    box([4.6, 3.1, 0], [0.05, 0.05, L], '#ffd98a', { emissive: '#ffd98a', emissiveIntensity: 1.2 })
    for (let z = -L / 2 + 4; z <= L / 2 - 4; z += 8) {
      for (const sx of [-1, 1]) {
        box([sx * 5.8, 1.05, z], [0.1, 2.1, 0.1], '#ffffff')
        cyl([sx * 5.8, 2.15, z], [0.55, 0.55, 2.4, 10], '#e67e22', { rot: [Math.PI / 2, 0, 0] })
      }
    }
    if (seed % 2 === 1) {
      const z = (rnd() - 0.5) * L * 0.5
      cyl([5.6, 3.5, z], [1.1, 1.4, 5, 14], '#c0392b')
      cyl([5.6, 6.1, z], [1.12, 1.12, 0.5, 14], '#2c2c34')
    }
    if (seed % 3 === 0) {
      box([0, 0.02, (rnd() - 0.5) * L * 0.5], [1.7, 0.05, 4], '#0aa8d6', { emissive: '#0aa8d6', emissiveIntensity: 0.7 })
    }
  }
  return out
}

const Segment = memo(function Segment({ theme, seed }) {
  const props = useMemo(() => buildProps(theme, seed), [theme, seed])
  return (
    <group>
      {props.map((p, i) => (
        <mesh key={i} position={p.pos} rotation={p.rot || [0, 0, 0]}>
          {p.geo === 'box' ? (
            <boxGeometry args={p.size} />
          ) : p.geo === 'cyl' ? (
            <cylinderGeometry args={p.args} />
          ) : (
            <sphereGeometry args={p.args} />
          )}
          <meshStandardMaterial
            color={p.color}
            emissive={p.emissive || '#000000'}
            emissiveIntensity={p.emissiveIntensity || 0}
            metalness={p.metalness || 0.1}
            roughness={p.roughness ?? 0.85}
          />
        </mesh>
      ))}
    </group>
  )
})

const initialSlots = () => Array.from({ length: NUM_SEGMENTS }, (_, i) => ({ slot: i, k: i }))

export function World() {
  const [slots, setSlots] = useState(initialSlots)
  const refs = useRef([])
  const sRef = useRef(0)

  useEffect(
    () =>
      useGame.subscribe((state, prev) => {
        if (state.phase === 'countdown' && prev.phase !== 'countdown') {
          sRef.current = 0
          setSlots(initialSlots())
        }
      }),
    []
  )

  useFrame((_, dt0) => {
    const dt = Math.min(dt0, 0.05)
    const phase = useGame.getState().phase
    sRef.current += scrollSpeed(phase) * dt
    const s = sRef.current
    let recycled = null
    slots.forEach((seg, i) => {
      const front = START + s - seg.k * L
      const g = refs.current[i]
      if (g) g.position.z = front - L / 2
      if (front - L > START + 2) recycled = i
    })
    if (recycled !== null) {
      setSlots((prev) => prev.map((seg, i) => (i === recycled ? { ...seg, k: seg.k + NUM_SEGMENTS } : seg)))
    }
  })

  return slots.map((seg, i) => (
    <group key={seg.slot} ref={(el) => (refs.current[i] = el)}>
      <Segment theme={themeFor(seg.k)} seed={seg.k} />
    </group>
  ))
}
