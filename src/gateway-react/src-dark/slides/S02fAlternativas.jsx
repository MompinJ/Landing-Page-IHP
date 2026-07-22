import { Eyebrow } from '../../src/components/SuperGraphic.jsx'
import { SLIDE_BG, SKY, AQUA, ORANGE, TXT, BODY, MUTE, LINE_S, FONT } from '../theme.js'

// Espejo Navy de S02fAlternativas: mismas dos alternativas (HUMAND y
// Cornerstone) y el vacio de mercado, en editorial sobre tinta.

function Mini({ children, color = MUTE }) {
  return (
    <div style={{
      fontSize: 14, fontWeight: 700, letterSpacing: '2.5px',
      textTransform: 'uppercase', color,
    }}>
      {children}
    </div>
  )
}

function Bullet({ color, children }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
      <span style={{
        width: 12, height: 12, flexShrink: 0,
        background: color, transform: 'skewX(-30.3deg)',
        boxShadow: `0 0 8px ${color}66`,
      }} />
      <span style={{ color: TXT, fontWeight: 600, fontSize: 19 }}>{children}</span>
    </div>
  )
}

const OPTIONS = [
  {
    key: 'humand',
    accent: SKY,
    tag: 'Comunicación y comunidad',
    name: 'HUMAND',
    what: 'Red social corporativa que ya usa el grupo, orientada a intranet, RH y comunicación — no a capacitación.',
    strengths: [
      'Ya usada por el grupo',
      'Módulos de comunicación y RH',
    ],
    gaps: [
      'No es un LMS: no arma cursos ni sigue SCORM',
      'No mide ni certifica aprendizaje',
    ],
  },
  {
    key: 'cornerstone',
    accent: AQUA,
    tag: 'Capacitación · el que usamos hoy',
    name: 'Cornerstone',
    what: 'LMS corporativo global que usamos hoy — genérico, sin adaptar a la operación portuaria.',
    strengths: [
      'Soporta SCORM y AICC',
      'Reportes básicos por curso',
    ],
    gaps: [
      'Sin comunidad ni red social',
      'Costo de licencia; no pensado para el sector portuario',
    ],
  },
]

function OptionColumn({ o, i }) {
  const base = 380 + i * 150
  return (
    <div>
      <div className="r" style={{ '--d': base }}>
        <Eyebrow color={o.accent} size={16}>{o.tag}</Eyebrow>
      </div>
      <p className="r" style={{
        '--d': base + 80, margin: '14px 0 0',
        color: TXT, fontWeight: 800, fontSize: 35, letterSpacing: '-0.6px',
      }}>
        {o.name}
      </p>
      <p className="r" style={{
        '--d': base + 160, margin: '10px 0 0', maxWidth: 620,
        color: BODY, fontWeight: 500, fontSize: 20, lineHeight: 1.5,
      }}>
        {o.what}
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 26 }}>
        {o.strengths.map((s, k) => (
          <div key={s} className="r" style={{ '--d': base + 260 + k * 90 }}>
            <Bullet color={o.accent}>{s}</Bullet>
          </div>
        ))}
      </div>

      <div className="r" style={{ '--d': base + 420, marginTop: 28 }}>
        <Mini color={ORANGE}>Lo que no resuelve</Mini>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 14 }}>
        {o.gaps.map((g, k) => (
          <div key={g} className="r" style={{ '--d': base + 480 + k * 90 }}>
            <Bullet color={ORANGE}>{g}</Bullet>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function S02fAlternativas() {
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
          <Eyebrow color={AQUA} size={22}>Antes de la solución · Alternativas evaluadas</Eyebrow>
        </div>
        <h1 className="r" style={{
          margin: '22px 0 0',
          color: TXT, fontWeight: 800,
          fontSize: 62, lineHeight: 1.0,
          letterSpacing: '-2px', textTransform: 'uppercase',
          '--d': 160,
        }}>
          Dos alternativas, ningún encaje
        </h1>
        <p className="r" style={{
          '--d': 240, margin: '18px 0 0', maxWidth: 1300,
          color: BODY, fontWeight: 500, fontSize: 20, lineHeight: 1.5,
        }}>
          Antes de construir un entorno propio, revisamos lo que ya usa el grupo y lo que ya existe en el mercado.
        </p>
      </div>

      {/* ----- Columnas ----- */}
      <div style={{
        position: 'absolute', left: 112, top: 340, width: 1696, zIndex: 5,
        display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 96,
      }}>
        {OPTIONS.map((o, i) => <OptionColumn key={o.key} o={o} i={i} />)}
      </div>

      {/* ----- Conclusion: el vacio de mercado ----- */}
      <div style={{ position: 'absolute', left: 112, top: 950, width: 1696, zIndex: 5 }}>
        <div className="r" style={{ '--d': 1000, height: 1.5, background: LINE_S }} />
        <p className="r" style={{
          '--d': 1060, margin: '24px 0 0', maxWidth: 1500,
          color: TXT, fontWeight: 700, fontSize: 24, lineHeight: 1.4,
        }}>
          Ni las que ya usamos, ni las que existen en el mercado, unen capacitación y comunidad adaptadas al mundo portuario y naval.
        </p>
      </div>

    </div>
  )
}
