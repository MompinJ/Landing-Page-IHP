import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { QUALITY } from '../quality'

export const PERF = new URLSearchParams(window.location.search).has('perf')

// Contador de rendimiento (?perf). Escribe directo en el DOM y no por estado de
// React: un panel que provoque un render por cuadro falsea justo lo que mide.
//
// Las llamadas de dibujo se leen ANTES de que el bucle las reinicie, asi que el
// numero incluye la pasada de sombra y las de postproceso, que es exactamente
// lo que hay que vigilar aqui.
export function Perf() {
  const gl = useThree((s) => s.gl)
  const box = useRef(null)
  const acc = useRef({ n: 0, t: 0, worst: 0 })

  useEffect(() => {
    const el = document.createElement('div')
    el.className = 'perf'
    document.body.appendChild(el)
    box.current = el
    return () => el.remove()
  }, [])

  useFrame((_, dt) => {
    const a = acc.current
    a.n++
    a.t += dt
    a.worst = Math.max(a.worst, dt)
    if (a.t < 0.5 || !box.current) return
    const fps = a.n / a.t
    const info = gl.info
    box.current.textContent =
      `${fps.toFixed(0)} fps  ${((a.t / a.n) * 1000).toFixed(1)} ms  (peor ${(a.worst * 1000).toFixed(0)})\n` +
      `calls ${info.render.calls}  tris ${(info.render.triangles / 1000).toFixed(0)}k\n` +
      `programas ${info.programs.length}  geo ${info.memory.geometries}  tex ${info.memory.textures}\n` +
      `nivel ${QUALITY.name}  dpr ${gl.getPixelRatio().toFixed(2)}`
    a.n = 0
    a.t = 0
    a.worst = 0
  })

  return null
}
