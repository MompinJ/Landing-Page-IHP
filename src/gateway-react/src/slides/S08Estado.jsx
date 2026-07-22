import { Eyebrow } from '../components/SuperGraphic.jsx'

const W = 1920
const H = 1080
const SEA = '#002E6D'
const SKY = '#009BDE'
const AQUA = '#54BBAB'
const AQUAD = '#2BA697'
const HORIZON = '#9ACAEB'
const BODY = '#41607F'
const MUTE = '#7E96B6'

// Cinta diagonal continua dividida en 4 segmentos (un paso c/u).
// Color degradado de oscuro (construido) a claro (futuro) = avance.
const CELLS = [
  { pts: '0,430 579,430 381,770 0,770', bg: SEA, fg: '#fff', sub: '#B9CBE2', cx: 100, n: '01', name: 'Desarrollo', subt: 'Programación y lógica de negocio', current: true },
  { pts: '579,430 1059,430 861,770 381,770', bg: SKY, fg: '#fff', sub: '#DCEBF7', cx: 565, n: '02', name: 'Validación TI', subt: 'infraestructura y seguridad' },
  { pts: '1059,430 1539,430 1341,770 861,770', bg: HORIZON, fg: SEA, sub: '#2C4D78', cx: 1015, n: '03', name: 'Pruebas', subt: 'todo el sistema, a fondo' },
  { pts: '1539,430 1920,430 1920,770 1341,770', bg: '#DCEAF5', fg: SEA, sub: '#5C7796', cx: 1495, n: '04', name: 'Lanzamiento', subt: 'salida a la red y onboarding' },
]

// Modulos construidos / en proceso (dentro de Desarrollo)
const MODULES = [
  { name: 'Gateway', done: true },
  { name: 'Comunidad HP', done: true },
  { name: 'Reportes HP', done: true },
  { name: 'Campus HP', done: false },
]

export default function S08Estado() {
  return (
    <div style={{
      width: '100%', height: '100%',
      background: 'var(--paper)',
      position: 'relative', overflow: 'hidden',
      fontFamily: "'Montserrat', Arial, sans-serif",
    }}>

      {/* ----- Encabezado ----- */}
      <div style={{ position: 'absolute', left: 112, top: 116, zIndex: 5, width: 1300 }}>
        <div className="r" style={{ '--d': 120 }}>
          <Eyebrow color={AQUAD} size={22}>Dónde estamos</Eyebrow>
        </div>
        <h1 className="r" style={{
          margin: '22px 0 0',
          color: SEA, fontWeight: 800, fontSize: 58, lineHeight: 1.02,
          letterSpacing: '-2px', textTransform: 'uppercase', '--d': 240,
        }}>
          Construido. En camino a la red.
        </h1>
      </div>

      {/* Cinta diagonal: se revela con un barrido inclinado (.ribbon) */}
      <div className="ribbon" style={{ position: 'absolute', inset: 0, zIndex: 1 }}>
        {CELLS.map((c, i) => (
          <svg key={c.n} viewBox={`0 0 ${W} ${H}`} width="100%" height="100%"
            style={{ position: 'absolute', inset: 0, zIndex: 1 + i }} aria-hidden>
            <polygon points={c.pts} fill={c.bg} />
          </svg>
        ))}
      </div>

      {/* Texto de cada paso (centrado en su segmento) */}
      {CELLS.map((c, i) => (
        <div key={`t${c.n}`} className="r" style={{
          position: 'absolute', left: c.cx, top: 555, transform: 'translate(-50%, -50%)',
          width: 300, textAlign: 'center', zIndex: 6, '--d': 360 + i * 130,
        }}>
          <div style={{ color: c.fg, opacity: 0.55, fontWeight: 800, fontSize: 22, letterSpacing: '2px' }}>{c.n}</div>
          <div style={{ color: c.fg, fontWeight: 800, fontSize: 30, letterSpacing: '-0.5px', marginTop: 4 }}>{c.name}</div>
          <div style={{ color: c.sub, fontWeight: 500, fontSize: 18, lineHeight: 1.35, marginTop: 6 }}>{c.subt}</div>
        </div>
      ))}

      {/* marcador "estamos aqui" sobre el primer segmento */}
      <div className="r" style={{
        position: 'absolute', left: 205, top: 372, transform: 'translateX(-50%)', zIndex: 7,
        display: 'flex', flexDirection: 'column', alignItems: 'center', '--d': 320,
      }}>
        <span style={{
          background: AQUA, color: '#fff', fontWeight: 800, fontSize: 13,
          letterSpacing: '2px', textTransform: 'uppercase', padding: '6px 13px', borderRadius: 999,
        }}>
          Estamos aquí
        </span>
        <span style={{
          width: 0, height: 0, borderLeft: '7px solid transparent', borderRight: '7px solid transparent',
          borderTop: `8px solid ${AQUA}`,
        }} />
      </div>

      {/* Estado de modulos (bajo el segmento de Desarrollo) */}
      <div className="r" style={{ position: 'absolute', left: 112, top: 820, zIndex: 5, '--d': 900 }}>
        <div style={{
          color: AQUAD, fontWeight: 700, fontSize: 15, letterSpacing: '3px',
          textTransform: 'uppercase', marginBottom: 16,
        }}>
          Lo construido
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 34, flexWrap: 'wrap' }}>
          {MODULES.map((m) => (
            <div key={m.name} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <svg viewBox="0 0 24 24" width={24} height={24} style={{ display: 'block' }} aria-hidden>
                {m.done
                  ? <><circle cx="12" cy="12" r="11" fill={AQUA} /><path d="M7 12.5 L10.5 16 L17 8.5" fill="none" stroke="#fff" strokeWidth="2.3" strokeLinejoin="round" strokeLinecap="round" /></>
                  : <circle cx="12" cy="12" r="10" fill="none" stroke={SKY} strokeWidth="2.3" strokeDasharray="3.5 4" />}
              </svg>
              <span style={{ color: m.done ? SEA : MUTE, fontWeight: 700, fontSize: 19 }}>{m.name}</span>
              {!m.done && <span style={{ color: SKY, fontWeight: 600, fontSize: 14, letterSpacing: '1px', textTransform: 'uppercase' }}>en proceso</span>}
            </div>
          ))}
        </div>
        <p style={{ margin: '18px 0 0', color: MUTE, fontWeight: 500, fontSize: 18, fontStyle: 'italic' }}>
          Al terminar su desarrollo, Campus HP repetirá este mismo camino.
        </p>
      </div>


    </div>
  )
}
