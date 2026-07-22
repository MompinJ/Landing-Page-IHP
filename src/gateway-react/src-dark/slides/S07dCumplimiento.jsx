import { Eyebrow } from '../../src/components/SuperGraphic.jsx'
import { SLIDE_BG, SEA_L, SKY, AQUA, AQUA_D, HORIZON, YELLOW, TXT, BODY, FONT } from '../theme.js'

// El corte de caja: retoma los 4 objetivos de S02eObjetivos y, ahora si,
// declara el estado de cada uno al cierre del periodo de practicas.
// Honestidad primero: lo cumplido, lo que quedo en curso y lo pendiente.

const CHIP_CLIP = 'polygon(10px 0, 100% 0, calc(100% - 10px) 100%, 0 100%)'

const ROWS = [
  {
    num: '01',
    accent: SEA_L,
    module: 'Gateway',
    goal: 'Un punto de entrada único a los tres módulos',
    status: 'Cumplido · por liberar',
    solid: true,
    statusColor: AQUA,
    note: 'El portal está en funcionamiento: un solo inicio de sesión abre Comunidad, Campus y Reportes. Pendiente su liberación en la red.',
  },
  {
    num: '02',
    accent: SKY,
    module: 'Comunidad HP',
    goal: 'El módulo completo de comunidad y comunicación',
    status: 'Cumplido · por liberar',
    solid: true,
    statusColor: SKY,
    note: 'Front y back terminados. Pendiente: adaptación a la infraestructura de TI y liberación en la red.',
  },
  {
    num: '03',
    accent: AQUA,
    module: 'Campus HP',
    goal: 'Diseñar el entorno académico y mapear su frontend',
    status: 'En curso',
    solid: false,
    statusColor: HORIZON,
    note: 'El diseño avanza y gran parte del frontend ya está mapeado.',
  },
  {
    num: '04',
    accent: AQUA_D,
    module: 'Reportes HP',
    goal: 'Readaptar el proyecto existente al ecosistema',
    status: 'En readaptación',
    solid: false,
    statusColor: YELLOW,
    note: 'Integrando al ecosistema el proyecto desarrollado el año anterior — continuidad, no partir de cero.',
  },
]

function StatusChip({ status, color, solid }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      background: solid ? color : 'transparent',
      border: solid ? 'none' : `2px solid ${color}`,
      color: solid ? '#04122B' : color,
      fontWeight: 800, fontSize: 16, letterSpacing: '0.5px', textTransform: 'uppercase',
      padding: solid ? '10px 24px' : '8px 22px',
      clipPath: CHIP_CLIP,
      whiteSpace: 'nowrap',
      boxShadow: solid ? `0 0 22px ${color}55` : 'none',
    }}>
      {status}
    </span>
  )
}

function Row({ r, i }) {
  const base = 380 + i * 150
  return (
    <div className="r" style={{
      '--d': base,
      display: 'grid', gridTemplateColumns: '70px 330px 300px 1fr',
      alignItems: 'center', columnGap: 30,
      padding: '26px 34px',
      background: 'rgba(154,202,235,0.05)',
      border: '1.5px solid rgba(154,202,235,0.16)', borderRadius: 14,
      borderLeft: `4px solid ${r.accent}`,
    }}>
      <span style={{ color: '#9ACAEB', fontWeight: 800, fontSize: 44, lineHeight: 1 }}>
        {r.num}
      </span>

      <div>
        <div style={{ color: TXT, fontWeight: 800, fontSize: 26, letterSpacing: '-0.5px' }}>
          {r.module}
        </div>
        <div style={{ marginTop: 6, color: BODY, fontWeight: 500, fontSize: 16.5, lineHeight: 1.35 }}>
          {r.goal}
        </div>
      </div>

      <div className="r" style={{ '--d': base + 160 }}>
        <StatusChip status={r.status} color={r.statusColor} solid={r.solid} />
      </div>

      <p style={{ margin: 0, color: BODY, fontWeight: 500, fontSize: 17.5, lineHeight: 1.45 }}>
        {r.note}
      </p>
    </div>
  )
}

export default function S07dCumplimiento() {
  return (
    <div style={{
      width: '100%', height: '100%',
      background: SLIDE_BG,
      position: 'relative', overflow: 'hidden',
      fontFamily: FONT,
    }}>

      {/* ----- Encabezado ----- */}
      <div style={{ position: 'absolute', left: 112, top: 92, zIndex: 5, width: 1696 }}>
        <div className="r" style={{ '--d': 60 }}>
          <Eyebrow color={AQUA} size={22}>Cierre · Cumplimiento de objetivos</Eyebrow>
        </div>
        <h1 className="r" style={{
          margin: '22px 0 0',
          color: TXT, fontWeight: 800,
          fontSize: 62, lineHeight: 1.0,
          letterSpacing: '-2px', textTransform: 'uppercase',
          '--d': 160,
        }}>
          El corte a los seis meses
        </h1>
      </div>

      {/* ----- Filas de objetivo + estado ----- */}
      <div style={{
        position: 'absolute', left: 112, top: 310, width: 1696, zIndex: 5,
        display: 'flex', flexDirection: 'column', gap: 20,
      }}>
        {ROWS.map((r, i) => <Row key={r.num} r={r} i={i} />)}
      </div>

    </div>
  )
}
