import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { QUALITY } from '../quality'

export const PERF = new URLSearchParams(window.location.search).has('perf')

// Marca de inicio de cuadro. Se monta ANTES que nada dentro del canvas, asi que
// su useFrame corre el primero y deja la hora justo antes de que empiece el
// trabajo del juego; Perf, que va el ultimo, cierra la cuenta.
const mark = { t: 0 }

export function PerfStart() {
  useFrame(() => {
    mark.t = performance.now()
  })
  return null
}

// Nombre real de la GPU. Es el primer dato que hay que mirar cuando el juego va
// lento: si aqui pone SwiftShader, llvmpipe o Software, el navegador no esta
// usando la tarjeta y no hay optimizacion que arregle eso, se arregla en
// chrome://gpu o con los drivers.
function gpuName(gl) {
  try {
    const ctx = gl.getContext()
    const dbg = ctx.getExtension('WEBGL_debug_renderer_info')
    const name = dbg ? ctx.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : ctx.getParameter(ctx.RENDERER)
    return String(name).slice(0, 46)
  } catch {
    return '?'
  }
}

// Contador de rendimiento (?perf). Escribe directo en el DOM y no por estado de
// React: un panel que provoque un render por cuadro falsea justo lo que mide.
export function Perf() {
  const gl = useThree((s) => s.gl)
  const box = useRef(null)
  const acc = useRef({ n: 0, t: 0, worst: 0, js: 0 })

  useEffect(() => {
    const el = document.createElement('div')
    el.className = 'perf'
    document.body.appendChild(el)
    box.current = el
    // Los contadores se reinician solos en CADA render interno, y con
    // postproceso el ultimo es el cuadro a pantalla completa: por eso el panel
    // decia "calls 1, tris 0k". Apagando el automatico se suman todas las
    // pasadas (sombra, escena y efectos) y se reinicia una vez por cuadro.
    gl.info.autoReset = false
    return () => {
      gl.info.autoReset = true
      el.remove()
    }
  }, [gl])

  useFrame((_, dt) => {
    const a = acc.current
    // Reparto del cuadro: lo que tarda nuestro codigo (fisica, curso, camara,
    // reciclaje de franjas) frente a lo que tarda dibujar. Si manda "dibujo",
    // sobran pasadas o pixeles; si manda "js", sobra trabajo por cuadro.
    a.js += performance.now() - mark.t
    a.n++
    a.t += dt
    a.worst = Math.max(a.worst, dt)

    if (a.t >= 0.5 && box.current) {
      const fps = a.n / a.t
      const ms = (a.t / a.n) * 1000
      const js = a.js / a.n
      const info = gl.info
      box.current.textContent =
        `${fps.toFixed(0)} fps  ${ms.toFixed(1)} ms  (peor ${(a.worst * 1000).toFixed(0)})\n` +
        `js ${js.toFixed(1)} ms   dibujo ${Math.max(0, ms - js).toFixed(1)} ms\n` +
        // los contadores se reinician al final de CADA cuadro, asi que aqui hay
        // uno solo: no se promedia, se muestra el ultimo
        `calls ${info.render.calls}  tris ${Math.round(info.render.triangles / 1000)}k\n` +
        `programas ${info.programs.length}  geo ${info.memory.geometries}  tex ${info.memory.textures}\n` +
        `nivel ${QUALITY.name}  dpr ${gl.getPixelRatio().toFixed(2)}\n` +
        `gpu ${gpuName(gl)}`
      a.n = 0
      a.t = 0
      a.worst = 0
      a.js = 0
    }

    // el reinicio va al final: lo que se cuenta es el cuadro entero, incluidas
    // la pasada de sombra y las de postproceso, que es lo que hay que vigilar
    gl.info.reset()
  })

  return null
}
