import { Eyebrow } from '../components/SuperGraphic.jsx'

// Contexto: el porque del Instituto (homologar cultura, capitalizar el
// conocimiento de los colaboradores, la tecnologia como medio) y que hace
// posible esa tecnologia hoy / hacia donde nos lleva, antes de entrar a la
// problematica (S02a en adelante). Prosa arriba (lead + cuerpo), dos
// columnas de puntos al centro, cierre destacado con regla.

const SEA   = '#002E6D'
const SKY   = '#009BDE'
const AQUAD = '#2BA697'
const BODY  = '#41607F'
const FONT  = "'Montserrat', Arial, sans-serif"

function Bullet({ color, children, delay }) {
  return (
    <div className="r" style={{ '--d': delay, display: 'flex', alignItems: 'flex-start', gap: 12 }}>
      <span style={{
        width: 10, height: 10, marginTop: 5, flexShrink: 0,
        background: color, transform: 'skewX(-30.3deg)',
      }} />
      <span style={{ color: SEA, fontWeight: 600, fontSize: 15, lineHeight: 1.35 }}>{children}</span>
    </div>
  )
}

const BLOCKS = [
  {
    key: 'hoy',
    accent: AQUAD,
    items: [
      'Personalizar el aprendizaje según las necesidades de cada colaborador.',
      'Reducir tiempos administrativos y optimizar procesos.',
      'Incrementar el alcance y la disponibilidad de los programas de formación.',
      'Mantener los contenidos actualizados y alineados con las necesidades del negocio.',
    ],
  },
  {
    key: 'horizonte',
    accent: SKY,
    items: [
      'Una mayor cobertura y participación de los colaboradores.',
      'El desarrollo acelerado de competencias críticas para el negocio.',
      'La estandarización del conocimiento entre las diferentes unidades de negocio.',
      'La consolidación del Instituto como un referente en formación, innovación y transformación digital.',
    ],
  },
]

function Block({ b, i }) {
  const base = 620 + i * 100
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
      {b.items.map((it, k) => (
        <Bullet key={it} color={b.accent} delay={base + k * 70}>{it}</Bullet>
      ))}
    </div>
  )
}

export default function S02Contexto() {
  return (
    <div style={{
      width: '100%', height: '100%',
      background: '#ffffff',
      position: 'relative', overflow: 'hidden',
      fontFamily: FONT,
    }}>

      {/* ----- Encabezado ----- */}
      <div style={{ position: 'absolute', left: 112, top: 92, zIndex: 5, width: 1696 }}>
        <div className="r" style={{ '--d': 60 }}>
          <Eyebrow color={AQUAD} size={22}>Contexto · Instituto Hutchison Ports</Eyebrow>
        </div>
        <h1 className="r" style={{
          margin: '18px 0 0',
          color: SEA, fontWeight: 800,
          fontSize: 50, lineHeight: 1.05,
          letterSpacing: '-1.6px', textTransform: 'uppercase',
          '--d': 160,
        }}>
          El porqué del Instituto
        </h1>
      </div>

      {/* ----- Cuerpo ----- */}
      <div style={{ position: 'absolute', left: 112, top: 262, width: 1696, zIndex: 5 }}>
        <p className="r" style={{
          '--d': 280, margin: 0, maxWidth: 1550,
          color: SEA, fontWeight: 700, fontSize: 25, lineHeight: 1.3, letterSpacing: '-0.3px',
        }}>
          El Instituto Hutchison Ports surge de la necesidad de homologar la cultura organizacional.
        </p>

        <p className="r" style={{
          '--d': 380, margin: '20px 0 0', maxWidth: 1550,
          color: BODY, fontWeight: 500, fontSize: 16.5, lineHeight: 1.5,
        }}>
          Además, busca recolectar todo el <strong style={{ color: SEA }}>conocimiento</strong> y{' '}
          <strong style={{ color: SEA }}>experiencia</strong> que los colaboradores han adquirido a lo
          largo de su <strong style={{ color: SEA }}>trayectoria</strong> laboral, para formar a las siguientes{' '}
          <strong style={{ color: SEA }}>generaciones</strong> y que estas puedan afrontar
          los retos actuales y futuros de la industria. Es por esto que el Instituto requiere contar con{' '}
          <strong style={{ color: SEA }}>herramientas</strong> tecnológicas que permitan ofrecer{' '}
          <strong style={{ color: SEA }}>experiencias</strong> de aprendizaje más eficientes y accesibles.
        </p>

        {/* ----- Puntos: hoy / hacia donde vamos ----- */}
        <div className="r" style={{ '--d': 560, marginTop: 30, height: 1.5, width: 1550, background: 'rgba(0,46,109,0.12)' }} />

        <div style={{
          marginTop: 30, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 90, width: 1550,
        }}>
          {BLOCKS.map((b, i) => <Block key={b.key} b={b} i={i} />)}
        </div>

        <div className="r" style={{ '--d': 1040, marginTop: 26, height: 1.5, width: 1550, background: 'rgba(0,46,109,0.12)' }} />

        <p className="r" style={{
          '--d': 1100, margin: '20px 0 0', maxWidth: 1550,
          color: SEA, fontWeight: 700, fontSize: 18.5, lineHeight: 1.4,
        }}>
          Invertir en el fortalecimiento del Instituto no es únicamente invertir en capacitación: es invertir en
          el desarrollo de las personas, en la competitividad de la organización y en la construcción de una
          cultura de aprendizaje continuo que impulse el crecimiento sostenible del negocio.
        </p>
      </div>

    </div>
  )
}
