import { DiagonalBand, Eyebrow } from '../components/SuperGraphic.jsx'
import iconReportes from '../../assets/icons/reportes-on.svg'

const SEA = '#002E6D'
const AQUA = '#54BBAB'
const AQUAD = '#2BA697'
const BODY = '#41607F'

// Iconos de linea (stroke, redondeado)
const ICON = {
  // metricas: barras
  metricas: (
    <g fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round">
      <path d="M8 39 V9 M8 39 H40" />
      <path d="M15 39 V27 M24 39 V17 M33 39 V23" />
    </g>
  ),
  // tablero: dashboard / grid
  tablero: (
    <g fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round">
      <path d="M9 10 H39 V38 H9 Z" />
      <path d="M9 21 H39 M24 21 V38" />
    </g>
  ),
  // decidir: diana
  decidir: (
    <g fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round">
      <circle cx="24" cy="24" r="15" />
      <circle cx="24" cy="24" r="8" />
      <circle cx="24" cy="24" r="1.6" fill="currentColor" />
    </g>
  ),
}

const BENEFITS = [
  { key: 'metricas', name: 'Métricas y calificaciones', line: 'todo medido' },
  { key: 'tablero', name: 'Tablero centralizado', line: 'todo en un solo lugar' },

]

function Benefit({ icon, name, line, d }) {
  return (
    <div className="rs" style={{ display: 'flex', alignItems: 'center', gap: 22, '--d': d }}>
      <svg viewBox="0 0 48 48" width={54} height={54}
        style={{ color: AQUAD, flexShrink: 0, display: 'block' }} aria-hidden>
        {icon}
      </svg>
      <div>
        <div style={{ color: SEA, fontWeight: 800, fontSize: 28, letterSpacing: '-0.4px' }}>{name}</div>
        <div style={{ color: BODY, fontWeight: 500, fontSize: 20, marginTop: 2 }}>{line}</div>
      </div>
    </div>
  )
}

export default function S07Reportes() {
  return (
    <div style={{
      width: '100%', height: '100%',
      background: '#ffffff',
      position: 'relative', overflow: 'hidden',
      fontFamily: "'Montserrat', Arial, sans-serif",
    }}>

      {/* Figura: bandas diagonales (Sea + Aqua) a la IZQUIERDA */}
      <div className="fig-in" style={{ position: 'absolute', inset: 0, zIndex: 1 }}>
        <DiagonalBand color={SEA} topX={520} width={430} lean={1} />
      </div>
      <div className="fig-in" style={{ position: 'absolute', inset: 0, zIndex: 2, '--d': 150 }}>
        <DiagonalBand color={AQUA} topX={620} width={360} lean={1} />
      </div>

      {/* ----- Contenido (derecha, sobre blanco) ----- */}
      <div style={{ position: 'absolute', left: 1010, top: 150, zIndex: 5, width: 800 }}>
        <div className="r" style={{ display: 'flex', alignItems: 'center', gap: 14, '--d': 120 }}>
          <img src={iconReportes} alt="" width={50} height={50}
            style={{ display: 'block', flexShrink: 0 }} aria-hidden />
          <Eyebrow color={AQUAD} size={22}>Reportes HP</Eyebrow>
        </div>

        <h1 className="r" style={{
          margin: '24px 0 0',
          color: SEA, fontWeight: 800, fontSize: 76, lineHeight: 1.0,
          letterSpacing: '-2.5px', textTransform: 'uppercase', '--d': 240,
        }}>
          Todo el avance,<br />en un tablero.
        </h1>

        <p className="r" style={{
          margin: '26px 0 0', maxWidth: 740,
          color: BODY, fontWeight: 500, fontSize: 24, lineHeight: 1.5, '--d': 360,
        }}>
          Métricas, calificaciones y seguimiento en un solo lugar — para decidir
          con datos, no a ciegas.
        </p>
      </div>

      {/* ----- Beneficios ----- */}
      <div style={{
        position: 'absolute', left: 1010, top: 552, width: 800, zIndex: 5,
        display: 'flex', flexDirection: 'column', gap: 34,
      }}>
        {BENEFITS.map((b, i) => (
          <Benefit key={b.key} icon={ICON[b.key]} name={b.name} line={b.line} d={520 + i * 130} />
        ))}
      </div>


    </div>
  )
}
