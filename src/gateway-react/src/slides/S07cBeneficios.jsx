import { Eyebrow } from '../components/SuperGraphic.jsx'

// Beneficios esperados, estilo editorial (sin tarjetas ni cajas): arriba
// las tres apuestas estrategicas como numero fantasma + titulo, abajo una
// fila con los cuatro beneficios operativos. Misma familia visual que el
// Gantt (S07b) y el reto (S02): tipografia, marcas skew a 30.3°, sin bordes.

const SEA    = '#002E6D'
const SKY    = '#009BDE'
const AQUA   = '#54BBAB'
const AQUAD  = '#2BA697'
const YELLOW = '#FFC627'
const BODY   = '#41607F'
const MUTE   = '#7E96B6'
const FONT   = "'Montserrat', Arial, sans-serif"

const STRATEGIC = [
  {
    num: '01',
    accent: SEA,
    title: 'Soberanía de datos',
    text: <>Control total sobre la información de capacitación y desempeño de <strong style={{ color: SEA }}>más de 5,000 colaboradores</strong>, sin depender de terceros.</>,
  },
  {
    num: '02',
    accent: SKY,
    title: 'Independencia tecnológica',
    text: <>Reducir progresivamente la dependencia de Cornerstone LMS con un sistema que evoluciona a la medida del Instituto, <strong style={{ color: SEA }}>eliminando su costo de licenciamiento</strong>.</>,
  },
  {
    num: '03',
    accent: AQUA,
    title: 'Cultura y engagement',
    text: <>Fomentar la interacción social y el reconocimiento del logro académico mediante los módulos de <strong style={{ color: SEA }}>comunidad y gamificación</strong>.</>,
  },
  {
    num: '04',
    accent: YELLOW,
    title: 'Versatilidad',
    text: <>La misma base de <strong style={{ color: SEA }}>comunidad y capacitación</strong> puede extenderse a cualquier área del grupo que la necesite.</>,
  },
]

const OPERATIVE = [
  { color: SEA, lead: 'Centralización' },
  { color: SKY, lead: 'Reportes avanzados' },
  { color: AQUA, lead: 'E-learning propio' },
  { color: YELLOW, lead: 'Experiencia unificada' },
]

function StrategicColumn({ s, i }) {
  const base = 380 + i * 150
  return (
    <div>
      <div className="r" style={{ '--d': base, display: 'flex', alignItems: 'baseline', gap: 16 }}>
        <span style={{ color: 'rgba(0,46,109,0.16)', fontWeight: 800, fontSize: 48, lineHeight: 1, flexShrink: 0 }}>
          {s.num}
        </span>
        <span style={{ color: SEA, fontWeight: 800, fontSize: 25, lineHeight: 1.15, letterSpacing: '-0.5px' }}>
          {s.title}
        </span>
      </div>

      <div className="r" style={{ '--d': base + 140, marginTop: 20, display: 'flex', gap: 14 }}>
        <span style={{
          width: 13, height: 13, flexShrink: 0, marginTop: 7,
          background: s.accent, transform: 'skewX(-30.3deg)',
        }} />
        <p style={{ margin: 0, color: BODY, fontWeight: 500, fontSize: 17, lineHeight: 1.5 }}>
          {s.text}
        </p>
      </div>
    </div>
  )
}

export default function S07cBeneficios() {
  return (
    <div style={{
      width: '100%', height: '100%',
      background: '#ffffff',
      position: 'relative', overflow: 'hidden',
      fontFamily: FONT,
    }}>

      {/* ----- Encabezado ----- */}
      <div style={{ position: 'absolute', left: 112, top: 92, zIndex: 5, width: 1500 }}>
        <div className="r" style={{ '--d': 60 }}>
          <Eyebrow color={AQUAD} size={22}>El valor · Beneficios esperados</Eyebrow>
        </div>
        <h1 className="r" style={{
          margin: '22px 0 0',
          color: SEA, fontWeight: 800,
          fontSize: 62, lineHeight: 1.0,
          letterSpacing: '-2px', textTransform: 'uppercase',
          '--d': 160,
        }}>
          Cuatro apuestas, valor tangible
        </h1>
      </div>

      {/* ----- Apuestas estrategicas ----- */}
      <div style={{
        position: 'absolute', left: 112, top: 320, width: 1679, zIndex: 5,
        display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 44,
      }}>
        {STRATEGIC.map((s, i) => <StrategicColumn key={s.num} s={s} i={i} />)}
      </div>

      {/* ----- En que se traduce (fila operativa, sin caja) ----- */}
      <div style={{ position: 'absolute', left: 112, top: 660, width: 1679, zIndex: 5 }}>
        <div className="r" style={{
          '--d': 900, fontSize: 13, fontWeight: 700, letterSpacing: '2.5px',
          textTransform: 'uppercase', color: AQUAD,
        }}>
          En la operación, esto se traduce en
        </div>
        <div className="r" style={{ '--d': 960, marginTop: 16, height: 1.5, background: 'rgba(0,46,109,0.12)' }} />

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 40, marginTop: 28 }}>
          {OPERATIVE.map((o, i) => (
            <div key={o.lead} className="r" style={{ '--d': 1040 + i * 90 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{
                  width: 12, height: 12, flexShrink: 0,
                  background: o.color, transform: 'skewX(-30.3deg)',
                }} />
                <span style={{ color: SEA, fontWeight: 800, fontSize: 19, letterSpacing: '-0.3px' }}>
                  {o.lead}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  )
}
