import { DiagonalPanelRight, Eyebrow } from '../components/SuperGraphic.jsx'

const SEA   = '#002E6D'
const SKY    = '#009BDE'
const AQUA  = '#54BBAB'
const AQUAD = '#2BA697'
const HORIZON = '#9ACAEB'
const BODY  = '#41607F'

// Los dos frentes del problema -> mapean a las dos grandes soluciones de Gateway
const PROBLEMS = [
  {
    num: '01',
    title: 'Comunicación',
    line: 'No existe un canal oficial y eficiente para que la información llegue a todos.',
    pains: ['Los comunicados no llegan', 'La información se repite', 'Se reabren tickets ya resueltos'],
  },
  {
    num: '02',
    title: 'Aprendizaje',
    line: 'La plataforma externa se volvió rígida e ineficiente, para usuarios y administradores.',
    pains: ['Aprendizaje solo en formato SCORM', 'Recabado de datos limitado', 'Errores de sesión', 'Experiencia deficiente'],
  },
]

// Vinneta de dolor: punto diagonal a 30.3° (el angulo de marca) + texto
function Pain({ children }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
      <span style={{
        width: 15, height: 15, flexShrink: 0,
        background: AQUA, transform: 'skewX(-30.3deg)',
      }} />
      <span style={{ color: BODY, fontWeight: 500, fontSize: 22 }}>{children}</span>
    </div>
  )
}

export default function S02Reto() {
  return (
    <div style={{
      width: '100%', height: '100%',
      background: '#ffffff',
      position: 'relative', overflow: 'hidden',
      fontFamily: "'Montserrat', Arial, sans-serif",
    }}>

      {/* Figuras de marca: composicion diagonal a 30.3° en capas (lado derecho).
          Sin texto encima -> contraste seguro. De atras (mas ancha) a adelante. */}
      <div className="fig-in" style={{ position: 'absolute', inset: 0, zIndex: 1 }}>
        <DiagonalPanelRight color={HORIZON} bottomX={1120} />
      </div>
      <div className="fig-in" style={{ position: 'absolute', inset: 0, zIndex: 2, '--d': 150 }}>
        <DiagonalPanelRight color={SKY} bottomX={1320} />
      </div>
      <div className="fig-in" style={{ position: 'absolute', inset: 0, zIndex: 3, '--d': 300 }}>
        <DiagonalPanelRight color={SEA} bottomX={1520} />
      </div>

      {/* ----- Encabezado ----- */}
      <div style={{ position: 'absolute', left: 112, top: 120, zIndex: 5, width: 1000 }}>
        <div className="r" style={{ '--d': 120 }}>
          <Eyebrow color={AQUAD} size={22}>El reto</Eyebrow>
        </div>

        <h1 className="r" style={{
          margin: '24px 0 0',
          color: SEA, fontWeight: 800,
          fontSize: 92, lineHeight: 1.0,
          letterSpacing: '-3px', textTransform: 'uppercase',
          '--d': 240,
        }}>
          Lo que hoy nos frena
        </h1>
      </div>

      {/* ----- Dos frentes del problema (editorial, sin contenedores, columna izquierda) ----- */}
      <div style={{
        position: 'absolute', left: 112, top: 412, width: 1060, zIndex: 5,
        display: 'flex', gap: 70,
      }}>
        {PROBLEMS.map((p, i) => (
          <div key={p.num} className="r" style={{ flex: 1, '--d': 520 + i * 160 }}>
            {/* numero + titulo */}
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 16 }}>
              <span style={{ color: 'rgba(0,46,109,0.16)', fontWeight: 800, fontSize: 54, lineHeight: 1 }}>
                {p.num}
              </span>
              <span style={{ color: SEA, fontWeight: 800, fontSize: 42, letterSpacing: '-1px' }}>
                {p.title}
              </span>
            </div>

            <p style={{
              margin: '18px 0 26px', maxWidth: 460,
              color: BODY, fontWeight: 500,
              fontSize: 23, lineHeight: 1.45,
            }}>
              {p.line}
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 15 }}>
              {p.pains.map((c) => <Pain key={c}>{c}</Pain>)}
            </div>
          </div>
        ))}
      </div>


    </div>
  )
}
