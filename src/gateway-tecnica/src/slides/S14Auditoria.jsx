import { DiagonalPanelRight, Eyebrow } from '../components/SuperGraphic.jsx'
import { C, Row, Footnote } from '../components/TechUI.jsx'

const ICON = {
  seguridad: (
    <g fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round">
      <path d="M24 6 L40 12 V22 C40 31 33 38 24 42 C15 38 8 31 8 22 V12 Z" />
      <path d="M24 17 V25 M24 30 V30.2" />
    </g>
  ),
  negocio: (
    <g fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round">
      <path d="M14 11 H20 A4 4 0 0 1 28 11 H34 V14 H14 Z" />
      <path d="M14 12 H10 V41 H38 V12 H34" />
      <path d="M18 23 H30 M18 30 H30 M18 36 H26" />
    </g>
  ),
}

const LEVELS = [
  {
    key: 'seguridad', color: C.SKY, name: 'Eventos de seguridad — en el Gateway',
    line: 'Logins exitosos y fallidos con su motivo, bloqueos y reutilización de token; con usuario, IP, navegador y fecha.',
  },
  {
    key: 'negocio', color: C.AQUAD, name: 'Auditoría de negocio — en Comunidad-HP',
    line: 'Una tabla por módulo: actor, acción y el antes/después en JSON. Registra lo importante y omite likes y jugadas.',
  },
]

export default function S14Auditoria() {
  return (
    <div style={{
      width: '100%', height: '100%', background: '#ffffff',
      position: 'relative', overflow: 'hidden',
      fontFamily: "'Montserrat', Arial, sans-serif",
    }}>

      {/* Figura de marca: panel diagonal Aqua + Sea a la derecha */}
      <div className="fig-in" style={{ position: 'absolute', inset: 0, zIndex: 1 }}>
        <DiagonalPanelRight color={C.SEA} bottomX={1180} />
      </div>
      <div className="fig-in" style={{ position: 'absolute', inset: 0, zIndex: 2, '--d': 150 }}>
        <DiagonalPanelRight color={C.AQUA} bottomX={1290} />
      </div>

      {/* ----- Encabezado ----- */}
      <div style={{ position: 'absolute', left: 112, top: 120, zIndex: 5, width: 1150 }}>
        <div className="r" style={{ '--d': 120 }}>
          <Eyebrow color={C.AQUAD} size={22}>Auditoría</Eyebrow>
        </div>
        <h1 className="r" style={{
          margin: '22px 0 0',
          color: C.SEA, fontWeight: 800, fontSize: 64, lineHeight: 1.0,
          letterSpacing: '-2.4px', textTransform: 'uppercase', '--d': 240,
        }}>
          Quién hizo qué<br />y cuándo.
        </h1>
        <p className="r" style={{
          margin: '24px 0 0', maxWidth: 1040,
          color: C.BODY, fontWeight: 500, fontSize: 23, lineHeight: 1.5, '--d': 360,
        }}>
          El sistema registra los accesos y las acciones de negocio en dos niveles, tolerante a fallos:
        </p>
      </div>

      {/* ----- Niveles ----- */}
      <div style={{
        position: 'absolute', left: 112, top: 560, width: 1130, zIndex: 5,
        display: 'flex', flexDirection: 'column', gap: 36,
      }}>
        {LEVELS.map((l, i) => (
          <Row key={l.key} icon={ICON[l.key]} name={l.name} line={l.line} color={l.color} d={460 + i * 140} />
        ))}
      </div>

      {/* ----- Trazabilidad extremo a extremo ----- */}
      <div className="r" style={{ position: 'absolute', left: 112, top: 860, zIndex: 5, '--d': 920 }}>
        <Footnote label="Extremo a extremo" color={C.AQUAD} maxWidth={1080}>
          Un traceId (estándar W3C) acompaña cada petición del Gateway a cada servicio; logs en JSON, integrados con OpenTelemetry.
        </Footnote>
      </div>

    </div>
  )
}
