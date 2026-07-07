import { DiagonalBand, Eyebrow } from '../components/SuperGraphic.jsx'
import iconCampus from '../../assets/icons/campus-on.svg'

const SEA = '#002E6D'
const SKY = '#009BDE'
const HORIZON = '#9ACAEB'
const INK = '#B9CBE2'   // texto de cuerpo sobre oscuro

// Iconos de linea (stroke, redondeado)
const ICON = {
  // formato: birrete
  formato: (
    <g fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round">
      <path d="M24 12 L42 20 L24 28 L6 20 Z" />
      <path d="M13 23 V31 C13 31 24 36 35 31 V23" />
      <path d="M42 20 V30" />
    </g>
  ),
  // a la medida: controles / sliders
  medida: (
    <g fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round">
      <path d="M10 15 H38 M10 24 H38 M10 33 H38" />
      <circle cx="18" cy="15" r="3.2" />
      <circle cx="30" cy="24" r="3.2" />
      <circle cx="16" cy="33" r="3.2" />
    </g>
  ),
  // experiencia y datos: tendencia + check
  datos: (
    <g fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round">
      <path d="M8 32 L18 23 L26 28 L40 14" />
      <path d="M33 14 H40 V21" />
      <path d="M8 38 H40" />
    </g>
  ),
}

const BENEFITS = [
  { key: 'formato', name: 'Presencial, virtual o híbrida', line: 'formación adaptada' },
  { key: 'medida', name: 'A la medida', line: 'moldeado al flujo del Instituto' },
  { key: 'datos', name: 'Mejor experiencia y datos', line: 'sin errores de sesión, con seguimiento' },
]

function Benefit({ icon, name, line, d }) {
  return (
    <div className="rs" style={{ display: 'flex', alignItems: 'center', gap: 22, '--d': d }}>
      <svg viewBox="0 0 48 48" width={54} height={54}
        style={{ color: HORIZON, flexShrink: 0, display: 'block' }} aria-hidden>
        {icon}
      </svg>
      <div>
        <div style={{ color: '#ffffff', fontWeight: 800, fontSize: 28, letterSpacing: '-0.4px' }}>{name}</div>
        <div style={{ color: INK, fontWeight: 500, fontSize: 20, marginTop: 2 }}>{line}</div>
      </div>
    </div>
  )
}

export default function S06Campus() {
  return (
    <div style={{
      width: '100%', height: '100%',
      background: SEA,
      position: 'relative', overflow: 'hidden',
      fontFamily: "'Montserrat', Arial, sans-serif",
    }}>

      {/* Figura: bandas diagonales (Horizon + Sky) sobre el fondo oscuro */}
      <div className="fig-in" style={{ position: 'absolute', inset: 0, zIndex: 1 }}>
        <DiagonalBand color={HORIZON} topX={1480} width={420} lean={1} />
      </div>
      <div className="fig-in" style={{ position: 'absolute', inset: 0, zIndex: 2, '--d': 150 }}>
        <DiagonalBand color={SKY} topX={1560} width={340} lean={1} />
      </div>

      {/* ----- Contenido (izquierda, sobre el oscuro) ----- */}
      <div style={{ position: 'absolute', left: 112, top: 150, zIndex: 5, width: 940 }}>
        <div className="r" style={{ display: 'flex', alignItems: 'center', gap: 14, '--d': 120 }}>
          <img src={iconCampus} alt="" width={50} height={50}
            style={{ display: 'block', flexShrink: 0 }} aria-hidden />
          <Eyebrow color={HORIZON} size={22}>Campus HP</Eyebrow>
        </div>

        <h1 className="r" style={{
          margin: '24px 0 0',
          color: '#ffffff', fontWeight: 800, fontSize: 78, lineHeight: 1.0,
          letterSpacing: '-2.5px', textTransform: 'uppercase', '--d': 240,
        }}>
          Un campus a la<br />medida del Instituto.
        </h1>

        <p className="r" style={{
          margin: '26px 0 0', maxWidth: 740,
          color: INK, fontWeight: 500, fontSize: 24, lineHeight: 1.5, '--d': 360,
        }}>
          Un entorno de aprendizaje propio y flexible
        </p>
      </div>

      {/* ----- Beneficios ----- */}
      <div style={{
        position: 'absolute', left: 112, top: 552, width: 880, zIndex: 5,
        display: 'flex', flexDirection: 'column', gap: 34,
      }}>
        {BENEFITS.map((b, i) => (
          <Benefit key={b.key} icon={ICON[b.key]} name={b.name} line={b.line} d={520 + i * 130} />
        ))}
      </div>


    </div>
  )
}
