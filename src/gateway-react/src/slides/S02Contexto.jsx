import { Eyebrow } from '../components/SuperGraphic.jsx'

// Contexto: que es el Instituto y por que importa, breve, antes de entrar a
// la problematica (S02a en adelante). Dos columnas editoriales (sin cajas):
// izquierda = que es (mision + identidad compartida); derecha = por que
// importa (el problema que resuelve + la escala, ~5,000 colaboradores).

const SEA   = '#002E6D'
const AQUAD = '#2BA697'
const BODY  = '#41607F'
const FONT  = "'Montserrat', Arial, sans-serif"

function Mini({ children, color = AQUAD, delay }) {
  return (
    <div className="r" style={{
      '--d': delay,
      fontSize: 13, fontWeight: 700, letterSpacing: '2.5px',
      textTransform: 'uppercase', color,
    }}>
      {children}
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
          margin: '22px 0 0',
          color: SEA, fontWeight: 800,
          fontSize: 58, lineHeight: 1.05,
          letterSpacing: '-1.8px', textTransform: 'uppercase',
          '--d': 160,
        }}>
          Un mismo apellido, un mismo estándar
        </h1>
      </div>

      {/* ----- Columnas ----- */}
      <div style={{
        position: 'absolute', left: 112, top: 340, width: 1696, zIndex: 5,
        display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 96,
      }}>

        {/* Columna A: que es */}
        <div>
          <Mini delay={280}>Qué es</Mini>
          <p className="r" style={{
            '--d': 340, margin: '14px 0 0', maxWidth: 640,
            color: BODY, fontWeight: 500, fontSize: 20, lineHeight: 1.55,
          }}>
            La herramienta que unifica la formación y la cultura del grupo: un
            mismo estándar de conocimiento y una identidad compartida en todas
            las Unidades de Negocio.
          </p>

          <p className="r" style={{
            '--d': 460, margin: '26px 0 0', maxWidth: 640,
            color: SEA, fontWeight: 700, fontSize: 24, lineHeight: 1.35, letterSpacing: '-0.3px',
          }}>
            Todos compartimos un mismo apellido: la familia Hutchison Ports.
          </p>
        </div>

        {/* Columna B: por que importa */}
        <div>
          <Mini delay={340}>Por qué importa</Mini>
          <p className="r" style={{
            '--d': 400, margin: '14px 0 0', maxWidth: 640,
            color: BODY, fontWeight: 500, fontSize: 20, lineHeight: 1.55,
          }}>
            Sin un estándar común, el talento y el conocimiento técnico se
            quedan aislados en cada terminal. El Instituto lo convierte en
            una sola referencia de calidad para todo el grupo.
          </p>

          <div className="r" style={{
            '--d': 560, marginTop: 30, display: 'flex', alignItems: 'center', gap: 20,
          }}>
            <span style={{
              color: AQUAD, fontWeight: 800, fontSize: 68,
              lineHeight: 1, letterSpacing: '-2.5px', flexShrink: 0,
            }}>
              ~5,000
            </span>
            <span style={{ color: BODY, fontWeight: 600, fontSize: 16.5, lineHeight: 1.3, maxWidth: 280 }}>
              colaboradores bajo un mismo tronco común formativo
            </span>
          </div>
        </div>
      </div>

    </div>
  )
}
