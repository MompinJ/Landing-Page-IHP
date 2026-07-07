import { useEffect, useRef, useState } from 'react'

const PHI = Math.PI * 2 * 0.618033988  // angulo de oro para fases organicas

function samplePath(pathEl, n) {
  const len = pathEl.getTotalLength()
  return Array.from({ length: n }, (_, i) => {
    const pt = pathEl.getPointAtLength(n === 1 ? 0 : (i / (n - 1)) * len)
    return { x: pt.x, y: pt.y }
  })
}

export function GatewayDotMark({
  displaySize = 480,
  color       = '#54BBAB',
  colorInner  = 'rgba(84,187,171,0.55)',
  style,
}) {
  const hiddenRef = useRef(null)
  const dotsRef   = useRef([])
  const rafRef    = useRef(null)
  const t0Ref     = useRef(null)
  const [t, setT] = useState(0)

  // Radio del dot en viewBox units, fijo a ~5px en pantalla
  const dotR = 5 / (displaySize / 96)

  // Amplitud del float en viewBox units, fijo a ~8px en pantalla
  const baseAmp = 8 / (displaySize / 96)

  useEffect(() => {
    const svg = hiddenRef.current
    if (!svg) return
    const paths = svg.querySelectorAll('path')

    const segments = [
      { el: paths[0], n: 34, c: color      },
      { el: paths[1], n: 22, c: colorInner },
      { el: paths[2], n: 12, c: color      },
      { el: paths[3], n: 9,  c: color      },
    ]

    const dots = []
    segments.forEach(({ el, n, c }) => {
      samplePath(el, n).forEach(({ x, y }) => {
        const idx = dots.length
        const phi = idx * PHI
        dots.push({
          x0: x, y0: y, c,
          phX: phi,
          phY: phi + 1.1,
          frX: 0.5 + (idx % 7) * 0.08,
          frY: 0.4 + (idx % 5) * 0.09,
          aX:  1.0 + (idx % 3) * 0.4,   // multiplicador sobre baseAmp
          aY:  1.0 + (idx % 4) * 0.35,
        })
      })
    })
    dotsRef.current = dots

    t0Ref.current = performance.now()
    const loop = (now) => {
      setT((now - t0Ref.current) / 1000)
      rafRef.current = requestAnimationFrame(loop)
    }
    rafRef.current = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(rafRef.current)
  }, [])

  const dots = dotsRef.current
  const ramp = Math.min(1, t / 1.5)

  return (
    <div style={{ position: 'relative', width: displaySize, height: displaySize, ...style }}>
      {/* SVG oculto para geometria */}
      <svg
        ref={hiddenRef}
        viewBox="0 0 96 96"
        width={displaySize} height={displaySize}
        style={{ position: 'absolute', opacity: 0, pointerEvents: 'none' }}
        aria-hidden
      >
        <path d="M22 80 V52 A26 26 0 0 1 74 52 V80" fill="none" stroke="#000" />
        <path d="M34 80 V55 A14 14 0 0 1 62 55 V80" fill="none" stroke="#000" />
        <path d="M48 80 V37"                         fill="none" stroke="#000" />
        <path d="M40.5 47 L48 37 L55.5 47"          fill="none" stroke="#000" />
      </svg>

      {/* SVG visible con dots animados */}
      <svg
        viewBox="0 0 96 96"
        width={displaySize} height={displaySize}
        style={{ position: 'absolute', top: 0, left: 0, overflow: 'visible' }}
      >
        {dots.map((d, i) => (
          <circle
            key={i}
            r={dotR}
            fill={d.c}
            cx={d.x0 + Math.sin(t * d.frX + d.phX) * d.aX * baseAmp * ramp}
            cy={d.y0 + Math.cos(t * d.frY + d.phY) * d.aY * baseAmp * ramp}
          />
        ))}
      </svg>
    </div>
  )
}
