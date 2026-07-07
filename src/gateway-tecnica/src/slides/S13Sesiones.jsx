import { DiagonalBand, Eyebrow } from '../components/SuperGraphic.jsx'
import { C, Row, Footnote } from '../components/TechUI.jsx'

const ICON = {
  acceso: (
    <g fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round">
      <circle cx="17" cy="24" r="8" />
      <path d="M25 24 H40 M34 24 V31 M40 24 V32" />
      <circle cx="17" cy="24" r="2.2" fill="currentColor" stroke="none" />
    </g>
  ),
  renovacion: (
    <g fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round">
      <path d="M38 16 A16 16 0 1 0 40 28" />
      <path d="M38 8 V16 H30" />
    </g>
  ),
  rotacion: (
    <g fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round">
      <path d="M24 6 L39 12 V23 C39 32 32 38 24 42 C16 38 9 32 9 23 V12 Z" />
      <path d="M24 17 V24 L29 28" />
    </g>
  ),
  cierre: (
    <g fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round">
      <path d="M24 8 V24" />
      <path d="M15 13 A14 14 0 1 0 33 13" />
    </g>
  ),
}

const ITEMS = [
  {
    key: 'acceso', color: C.SKY,
    name: <>Token de acceso <span style={{ color: C.SKY, fontWeight: 800 }}>· ~15 min</span></>,
    line: 'Acompaña cada petición. Corto a propósito: si se roba, expira rápido.',
  },
  {
    key: 'renovacion', color: C.AQUAD,
    name: <>Token de renovación <span style={{ color: C.AQUAD, fontWeight: 800 }}>· ~7 días</span></>,
    line: 'Permite obtener nuevos tokens sin volver a escribir la contraseña.',
  },
  {
    key: 'rotacion', color: C.AQUAD, name: 'Rotación y detección de robo',
    line: 'Al renovar, el token anterior se invalida; reutilizarlo revoca toda la familia de sesión.',
  },
  {
    key: 'cierre', color: C.SKY, name: 'Renovación automática y logout global',
    line: 'Se renueva sola en segundo plano; el cierre global cierra sesión en todos los dispositivos.',
  },
]

export default function S13Sesiones() {
  return (
    <div style={{
      width: '100%', height: '100%', background: '#ffffff',
      position: 'relative', overflow: 'hidden',
      fontFamily: "'Montserrat', Arial, sans-serif",
    }}>

      {/* Figura de marca: bandas diagonales (Sea + Aqua) a la izquierda */}
      <div className="fig-in" style={{ position: 'absolute', inset: 0, zIndex: 1 }}>
        <DiagonalBand color={C.SEA} topX={250} width={440} lean={1} />
      </div>
      <div className="fig-in" style={{ position: 'absolute', inset: 0, zIndex: 2, '--d': 150 }}>
        <DiagonalBand color={C.AQUA} topX={360} width={360} lean={1} />
      </div>

      {/* ----- Encabezado ----- */}
      <div style={{ position: 'absolute', left: 760, top: 130, zIndex: 5, width: 1048 }}>
        <div className="r" style={{ '--d': 120 }}>
          <Eyebrow color={C.AQUAD} size={22}>Manejo de sesiones</Eyebrow>
        </div>
        <h1 className="r" style={{
          margin: '22px 0 0',
          color: C.SEA, fontWeight: 800, fontSize: 66, lineHeight: 1.0,
          letterSpacing: '-2.4px', textTransform: 'uppercase', '--d': 240,
        }}>
          Sesiones seguras<br />por diseño.
        </h1>
      </div>

      {/* ----- Items ----- */}
      <div style={{
        position: 'absolute', left: 760, top: 430, width: 1048, zIndex: 5,
        display: 'flex', flexDirection: 'column', gap: 26,
      }}>
        {ITEMS.map((it, i) => (
          <Row key={it.key} icon={ICON[it.key]} name={it.name} line={it.line} color={it.color} d={420 + i * 110} />
        ))}
      </div>

      {/* ----- Nota operativa para TI ----- */}
      <div className="r" style={{ position: 'absolute', left: 760, top: 882, zIndex: 5, '--d': 900 }}>
        <Footnote label="Nota operativa" color="#C79413" maxWidth={1000}>
          Redis funciona sin persistencia: un reinicio cierra las sesiones activas. Es esperado y documentado, no un error.
        </Footnote>
      </div>

    </div>
  )
}
