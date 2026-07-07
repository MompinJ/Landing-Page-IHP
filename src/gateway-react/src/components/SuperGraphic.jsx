// Super-graficos Hutchison Ports — triangulos angulo 30.3°
// En aplicaciones 16:9 el angulo se mide desde la VERTICAL,
// lo que da 59.7° desde la horizontal y un triangle run horizontal de ~630px.
// Los shapes cubren 1/3 a 2/3 del slide — nunca son bandas delgadas.

const W = 1920
const H = 1080

// Diagonal desde (x0,y0) hasta (x1,y1): la linea diagonal que divide el slide.
// Angulo 30.3° desde vertical = 59.7° desde horizontal => tan(59.7°)=1.716
// Run horizontal para la altura completa: 1080/1.716 ≈ 630px

// TriangleFillRight: rellena el lado derecho del slide.
// La diagonal entra por la esquina top-left del triangulo y sale por bottom-right.
//   A = (W - RUN, 0)   →  top-left del triangulo (en el borde superior)
//   B = (W,       0)   →  top-right
//   C = (W,       H)   →  bottom-right
// El triangulo ocupa el ~40% derecho del slide.
const RUN = 630  // pixels horizontales que ocupa el triangulo en el borde superior

export function TriangleFillRight({ color, style }) {
  // Vertices: top-left del shape, top-right, bottom-right
  const pts = `${W - RUN},0  ${W},0  ${W},${H}`
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="100%"
      style={{ position: 'absolute', inset: 0, display: 'block', ...style }}
      aria-hidden>
      <polygon points={pts} fill={color} />
    </svg>
  )
}

// TriangleFillBottomRight: rellena esquina inferior-derecha.
// La diagonal va desde la esquina top-right hasta un punto en el borde inferior.
//   A = (W,     0)   → top-right
//   B = (W,     H)   → bottom-right
//   C = (W-RUN*2, H) → punto en borde inferior (mas amplio que el de arriba)
export function TriangleFillBottomRight({ color, style }) {
  const baseX = Math.max(0, W - RUN * 2.5)
  const pts = `${W},0  ${W},${H}  ${baseX},${H}`
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="100%"
      style={{ position: 'absolute', inset: 0, display: 'block', ...style }}
      aria-hidden>
      <polygon points={pts} fill={color} />
    </svg>
  )
}

// TriangleCoverRight: version mas grande para portadas — ocupa ~60% del slide
// La diagonal va desde (W*0.38, H) bottom hasta (W, 0) top-right
// Vertices: bottom-left del shape (en borde inferior), top-right, bottom-right
export function TriangleCoverRight({ color, style }) {
  const startX = Math.round(W * 0.40)
  const pts = `${startX},${H}  ${W},0  ${W},${H}`
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="100%"
      style={{ position: 'absolute', inset: 0, display: 'block', ...style }}
      aria-hidden>
      <polygon points={pts} fill={color} />
    </svg>
  )
}

// TriangleCoverTop: triangulo desde el borde superior — ocupa todo el top-right
// Vertices: punto en borde superior, top-right, bottom-right
export function TriangleCoverTop({ color, style }) {
  const startX = Math.round(W * 0.38)
  const pts = `${startX},0  ${W},0  ${W},${H}`
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="100%"
      style={{ position: 'absolute', inset: 0, display: 'block', ...style }}
      aria-hidden>
      <polygon points={pts} fill={color} />
    </svg>
  )
}

// DiagonalSplit: divide el slide con la diagonal (sin triangulo, como fondo)
// Util para slides tipo chapter-cover (izquierda color A, derecha color B)
export function DiagonalSplit({ colorLeft, colorRight, style }) {
  const startX = Math.round(W * 0.42)
  const endX   = Math.round(W * 0.62)
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="100%"
      style={{ position: 'absolute', inset: 0, display: 'block', ...style }}
      aria-hidden>
      {/* Left polygon */}
      <polygon points={`0,0  ${endX},0  ${startX},${H}  0,${H}`} fill={colorLeft} />
      {/* Right polygon */}
      <polygon points={`${endX},0  ${W},0  ${W},${H}  ${startX},${H}`} fill={colorRight} />
    </svg>
  )
}

// DiagonalPanelRight: panel solido anclado al borde derecho con el borde
// izquierdo en diagonal ascendente a 30.3° (sube de izq-abajo a der-arriba).
// Es el patron canonico "Sea shape" para fondos de slide de contenido.
//   bottomX = x del vertice inferior-izquierdo (controla cuanto cubre el panel)
//   El vertice superior-izquierdo se calcula sumando RUN => angulo exacto 30.3°.
export function DiagonalPanelRight({ color, bottomX = 1180, style }) {
  const topX = bottomX + RUN
  const pts = `${topX},0  ${W},0  ${W},${H}  ${bottomX},${H}`
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="100%"
      style={{ position: 'absolute', inset: 0, display: 'block', ...style }}
      aria-hidden>
      <polygon points={pts} fill={color} />
    </svg>
  )
}

// DiagonalBand: paralelogramo inclinado a 30.3° que cruza el slide (de
// abajo-izquierda a arriba-derecha). Es el "super graphic" canonico de
// Hutchison Ports. Los dos bordes laterales son paralelos y steep (30.3°).
//   topX  = x del vertice superior-izquierdo
//   width = grosor horizontal de la banda
//   lean  = 1 asciende "/" (abajo a la izquierda) · -1 desciende "\" (abajo a la derecha)
export function DiagonalBand({ color, topX = 1400, width = 360, lean = 1, style }) {
  const off = RUN * lean
  const TLx = topX
  const TRx = topX + width
  const BRx = topX + width - off
  const BLx = topX - off
  const pts = `${TLx},0  ${TRx},0  ${BRx},${H}  ${BLx},${H}`
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="100%"
      style={{ position: 'absolute', inset: 0, display: 'block', ...style }}
      aria-hidden>
      <polygon points={pts} fill={color} />
    </svg>
  )
}

// Eyebrow: punto circular + label uppercase con tracking
export function Eyebrow({ children, color = '#2BA697', size = 22, style }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      fontFamily: "'Montserrat', Arial, sans-serif",
      fontWeight: 700, fontSize: size,
      letterSpacing: '3.5px', textTransform: 'uppercase',
      color, ...style,
    }}>
      <span style={{
        width: 9, height: 9, borderRadius: '50%',
        background: color, flexShrink: 0, display: 'inline-block',
      }} />
      {children}
    </div>
  )
}
