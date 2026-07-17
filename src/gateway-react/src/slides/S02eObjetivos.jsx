import { Eyebrow } from '../components/SuperGraphic.jsx'

// Objetivos SMART: dos tarjetas-objetivo que cierran el capitulo del reto.
// Cada tarjeta ancla la vista en su meta numerica y recorre el objetivo,
// su proposito y para cuando. Arriba a la derecha, la leyenda S-M-A-R-T
// deletrea la metodologia.

const SEA   = '#002E6D'
const SKY   = '#009BDE'
const AQUA  = '#54BBAB'
const AQUAD = '#2BA697'
const BODY  = '#41607F'
const MUTE  = '#7E96B6'
const FONT  = "'Montserrat', Arial, sans-serif"

const SMART = [
  { l: 'S', word: 'Específico' },
  { l: 'M', word: 'Medible' },
  { l: 'A', word: 'Alcanzable' },
  { l: 'R', word: 'Relevante' },
  { l: 'T', word: 'Temporal' },
]

const GOALS = [
  {
    num: '01',
    accent: AQUA,
    title: 'Diseñar un entorno adaptado a las necesidades académicas del Instituto',
    purpose: 'Un entorno propio y moldeable a los cursos',
    value: '20%',
    meta: 'de módulos nuevos y experimentales migrados al inicio',
    cuando: 'Durante la fase de desarrollo',
  },
  {
    num: '02',
    accent: SKY,
    title: 'Lanzar la primera versión de un entorno de comunicación y comunidad',
    purpose: 'Fomentar la comunicación y la comunidad del grupo',
    value: '30%',
    meta: 'de adopción del nuevo entorno de comunicación',
    cuando: 'Primer trimestre de implementación',
  },
]

// Etiqueta pequena de seccion dentro de la tarjeta.
function Mini({ children, color = MUTE }) {
  return (
    <div style={{
      fontSize: 12.5, fontWeight: 700, letterSpacing: '2px',
      textTransform: 'uppercase', color,
    }}>
      {children}
    </div>
  )
}

function GoalCard({ g, i }) {
  const base = 480 + i * 160
  return (
    <div className="r" style={{
      '--d': base,
      width: 533,
      background: '#fff',
      border: '1.5px solid rgba(0,46,109,0.16)', borderRadius: 14,
      position: 'relative', overflow: 'hidden',
      padding: '34px 36px 30px',
    }}>
      {/* filo superior con el color del objetivo, cortado a la marca */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 9,
        background: g.accent,
        clipPath: 'polygon(0 0, 100% 0, 100% 100%, 16px 100%)',
      }} />

      <div className="r" style={{ '--d': base + 100 }}>
        <Eyebrow color={g.accent} size={15}>Objetivo {g.num}</Eyebrow>
      </div>

      {/* objetivo + proposito */}
      <div className="r" style={{ '--d': base + 160, marginTop: 12 }}>
        <p style={{
          margin: 0, minHeight: 88,
          color: SEA, fontWeight: 700, fontSize: 23, lineHeight: 1.24,
          letterSpacing: '-0.4px',
        }}>
          {g.title}
        </p>
        <p style={{ margin: '4px 0 0', minHeight: 24, color: BODY, fontWeight: 500, fontSize: 15.5 }}>
          {g.purpose}
        </p>
      </div>

      {/* la meta: numero grande + descriptor */}
      <div className="r" style={{
        '--d': base + 260,
        marginTop: 20, display: 'flex', alignItems: 'center', gap: 20, minHeight: 96,
      }}>
        <span style={{
          color: g.accent, fontWeight: 800, fontSize: 84,
          lineHeight: 1, letterSpacing: '-3px', flexShrink: 0,
        }}>
          {g.value}
        </span>
        <span style={{ color: BODY, fontWeight: 600, fontSize: 16.5, lineHeight: 1.3 }}>
          {g.meta}
        </span>
      </div>

      <div style={{ height: 1.5, background: 'rgba(0,46,109,0.10)', margin: '18px 0' }} />

      {/* para cuando */}
      <div className="r" style={{ '--d': base + 340 }}>
        <Mini>Para cuándo</Mini>
        <p style={{ margin: '8px 0 0', color: SEA, fontWeight: 600, fontSize: 15.5 }}>
          {g.cuando}
        </p>
      </div>
    </div>
  )
}

export default function S02eObjetivos() {
  return (
    <div style={{
      width: '100%', height: '100%',
      background: '#ffffff',
      position: 'relative', overflow: 'hidden',
      fontFamily: FONT,
    }}>

      {/* ----- Encabezado ----- */}
      <div style={{ position: 'absolute', left: 112, top: 92, zIndex: 5, width: 1200 }}>
        <div className="r" style={{ '--d': 60 }}>
          <Eyebrow color={AQUAD} size={22}>Del reto a la solución · Objetivos SMART</Eyebrow>
        </div>
        <h1 className="r" style={{
          margin: '22px 0 0',
          color: SEA, fontWeight: 800,
          fontSize: 62, lineHeight: 1.0,
          letterSpacing: '-2px', textTransform: 'uppercase',
          '--d': 160,
        }}>
          Dos metas, un mismo rumbo
        </h1>
      </div>

      {/* ----- Leyenda SMART (que significa cada letra) ----- */}
      <div style={{
        position: 'absolute', right: 112, top: 112, zIndex: 5,
        display: 'flex', gap: 18,
      }}>
        {SMART.map((s, i) => (
          <div key={s.l} className="r" style={{ '--d': 280 + i * 70, textAlign: 'center' }}>
            <div style={{
              width: 50, height: 50,
              border: '2px solid rgba(0,46,109,0.22)', borderRadius: 10,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: SEA, fontWeight: 800, fontSize: 24,
            }}>
              {s.l}
            </div>
            <div style={{
              marginTop: 7, fontSize: 11, fontWeight: 700,
              letterSpacing: '0.5px', textTransform: 'uppercase', color: MUTE,
            }}>
              {s.word}
            </div>
          </div>
        ))}
      </div>

      {/* ----- Tarjetas de objetivo ----- */}
      <div style={{
        position: 'absolute', left: 112, top: 310, width: 1696, zIndex: 5,
        display: 'flex', justifyContent: 'center', gap: 40,
      }}>
        {GOALS.map((g, i) => <GoalCard key={g.num} g={g} i={i} />)}
      </div>

    </div>
  )
}
