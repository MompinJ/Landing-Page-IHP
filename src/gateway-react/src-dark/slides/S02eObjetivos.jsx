import { Eyebrow } from '../../src/components/SuperGraphic.jsx'
import { SLIDE_BG, SEA_L, SKY, AQUA, AQUA_D, TXT, BODY, PANEL, FONT } from '../theme.js'

// Espejo Navy de S02eObjetivos: los 4 objetivos planteados al inicio del
// periodo de practicas (6 meses), uno por pieza del ecosistema. Sin estado de
// cumplimiento a proposito: eso se revela al final del deck (S07dCumplimiento).

const GOALS = [
  {
    num: '01',
    accent: SEA_L,
    module: 'Gateway',
    kicker: 'La puerta única',
    text: 'Construir un punto de entrada único: un solo inicio de sesión que integre comunidad, capacitación y reportes.',
  },
  {
    num: '02',
    accent: SKY,
    module: 'Comunidad HP',
    kicker: 'De punta a punta',
    text: 'Desarrollar el módulo completo de comunidad y comunicación: muro, noticias, eventos, formularios, dinámicas y soporte.',
  },
  {
    num: '03',
    accent: AQUA,
    module: 'Campus HP',
    kicker: 'Las bases',
    text: 'Diseñar el entorno académico propio del Instituto y mapear su frontend.',
  },
  {
    num: '04',
    accent: AQUA_D,
    module: 'Reportes HP',
    kicker: 'Integración',
    text: 'Readaptar el proyecto existente de reportes para vivir dentro del ecosistema Gateway.',
  },
]

function GoalCard({ g, i }) {
  const base = 420 + i * 140
  return (
    <div className="r" style={{
      '--d': base,
      background: PANEL,
      border: '1.5px solid rgba(154,202,235,0.18)', borderRadius: 14,
      position: 'relative', overflow: 'hidden',
      padding: '30px 30px 28px',
      boxShadow: `0 0 46px ${g.accent}14`,
    }}>
      {/* filo superior con el color del modulo, cortado a la marca */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 8,
        background: g.accent,
        clipPath: 'polygon(0 0, 100% 0, 100% 100%, 16px 100%)',
        boxShadow: `0 0 16px ${g.accent}88`,
      }} />

      <div className="r" style={{ '--d': base + 90, display: 'flex', alignItems: 'baseline', gap: 12 }}>
        <span style={{ color: 'rgba(154,202,235,0.22)', fontWeight: 800, fontSize: 42, lineHeight: 1, flexShrink: 0 }}>
          {g.num}
        </span>
        <span style={{ color: TXT, fontWeight: 800, fontSize: 27, letterSpacing: '-0.5px', whiteSpace: 'nowrap' }}>
          {g.module}
        </span>
      </div>

      <div className="r" style={{ '--d': base + 150, marginTop: 14 }}>
        <Eyebrow color={g.accent} size={14.5}>{g.kicker}</Eyebrow>
      </div>

      <p className="r" style={{
        '--d': base + 210, margin: '14px 0 0', minHeight: 155,
        color: BODY, fontWeight: 500, fontSize: 18.5, lineHeight: 1.5,
      }}>
        {g.text}
      </p>
    </div>
  )
}

export default function S02eObjetivos() {
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
          <Eyebrow color={AQUA} size={22}>Del reto a la solución · Objetivos del periodo (6 meses)</Eyebrow>
        </div>
        <h1 className="r" style={{
          margin: '22px 0 0',
          color: TXT, fontWeight: 800,
          fontSize: 62, lineHeight: 1.0,
          letterSpacing: '-2px', textTransform: 'uppercase',
          '--d': 160,
        }}>
          Cuatro objetivos, seis meses
        </h1>
        <p className="r" style={{
          '--d': 260, margin: '18px 0 0', maxWidth: 1300,
          color: BODY, fontWeight: 500, fontSize: 20, lineHeight: 1.5,
        }}>
          Lo que me propuse al arrancar las prácticas — al cierre del deck, el corte de qué se cumplió.
        </p>
      </div>

      {/* ----- Tarjetas de objetivo ----- */}
      <div style={{
        position: 'absolute', left: 112, top: 380, width: 1696, zIndex: 5,
        display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 36,
      }}>
        {GOALS.map((g, i) => <GoalCard key={g.num} g={g} i={i} />)}
      </div>

    </div>
  )
}
