// Logo Gateway en version heroica: isotipo grande con anillos orbitando.
import { OrbitRing } from './OrbitDots.jsx'

// Isotipo con animacion de auto-dibujo (stroke-dashoffset)
function AnimatedMark({ size, color, delay, stroke = 5.5 }) {
  const strokeW = (size / 96) * stroke
  const strokeA = (size / 96) * stroke * 0.73

  const pathStyle = (extraDelay) => ({
    strokeDasharray:  600,
    strokeDashoffset: 0,
    animation:        `draw-mark 1.4s cubic-bezier(0.4,0,0.2,1) ${delay + extraDelay}s both`,
  })

  return (
    <svg
      viewBox="0 0 96 96"
      width={size} height={size}
      style={{ display: 'block', overflow: 'visible' }}
    >
      <g fill="none" stroke={color} strokeWidth={strokeW}
         strokeLinejoin="round" strokeLinecap="round">
        <path
          d="M22 80 V52 A26 26 0 0 1 74 52 V80"
          style={pathStyle(0)}
        />
        <path
          d="M34 80 V55 A14 14 0 0 1 62 55 V80"
          strokeOpacity="0.5"
          style={pathStyle(0.18)}
        />
        <g className="gw-arrow">
          <path
            d="M48 80 V37 M40.5 47 L48 37 L55.5 47"
            strokeWidth={strokeA}
            style={pathStyle(0.32)}
          />
        </g>
      </g>
    </svg>
  )
}

export function GatewayHero({
  markSize     = 220,
  innerRadius  = 165,
  outerRadius  = 215,
  markColor    = '#54BBAB',
  innerColor   = '#54BBAB',
  outerColor   = '#6FCBBC',
  markStroke   = 5.5,
  showHalo     = true,
  animDelay    = 0.3,
  style,
}) {
  return (
    <div style={{ position: 'relative', ...style }}>
      {/* Anillo exterior — contra-reloj, mas lento */}
      <OrbitRing
        radius={outerRadius}
        count={16}
        dotSize={4}
        color={outerColor}
        duration={38}
        reverse
        opacities={[1, 0.8, 0.55, 0.35, 0.18, 0.08]}
      />

      {/* Anillo interior — a favor del reloj */}
      <OrbitRing
        radius={innerRadius}
        count={10}
        dotSize={6}
        color={innerColor}
        duration={22}
        opacities={[1, 0.75, 0.5, 0.28, 0.12]}
      />

      {/* Halo de pulso detras del isotipo */}
      {showHalo && (
        <div style={{
          position:  'absolute',
          width:     markSize * 0.95,
          height:    markSize * 0.95,
          borderRadius: '50%',
          border:    `1.5px solid ${markColor}`,
          top:       '50%',
          left:      '50%',
          animation: 'pulse-ring 3.2s ease-in-out infinite',
          opacity:   0.35,
        }} />
      )}

      {/* Isotipo centrado — con auto-dibujo */}
      <div style={{
        position:  'absolute',
        top:       '50%',
        left:      '50%',
        transform: 'translate(-50%, -50%)',
      }}>
        <AnimatedMark size={markSize} color={markColor} delay={animDelay} stroke={markStroke} />
      </div>
    </div>
  )
}
