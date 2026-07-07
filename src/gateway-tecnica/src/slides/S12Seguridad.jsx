import { DiagonalPanelRight, Eyebrow } from '../components/SuperGraphic.jsx'
import { C, Row, Footnote } from '../components/TechUI.jsx'

const ICON = {
  auth: (
    <g fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round">
      <rect x="11" y="21" width="26" height="19" rx="3" />
      <path d="M16 21 V15 A8 8 0 0 1 32 15 V21" />
      <path d="M24 28 V33" />
    </g>
  ),
  authz: (
    <g fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round">
      <path d="M24 7 L39 13 V23 C39 32 32 38 24 41 C16 38 9 32 9 23 V13 Z" />
      <path d="M17 23 L22 28 L31 18" />
    </g>
  ),
  ataques: (
    <g fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round">
      <path d="M24 6 L40 12 V22 C40 31 33 38 24 42 C15 38 8 31 8 22 V12 Z" />
      <path d="M24 16 V25 M24 30 V30.2" />
    </g>
  ),
}

const GROUPS = [
  {
    key: 'auth', color: C.SKY, name: 'Autenticación — ¿quién eres?',
    line: 'Token JWT firmado (RS256) con par de llaves pública/privada; los microservicios validan sin login propio.',
  },
  {
    key: 'authz', color: C.AQUAD, name: 'Autorización — ¿qué puedes hacer?',
    line: 'Roles (SYSADMIN, ADMIN, USUARIO) y permisos granulares viajan dentro del token; cada servicio decide.',
  },
  {
    key: 'ataques', color: C.ORANGE, name: 'Protección contra ataques',
    line: 'Límite de intentos, anti-adivinación de usuarios, BCrypt, cabeceras seguras (HSTS/CSP), CORS y HTTPS.',
  },
]

export default function S12Seguridad() {
  return (
    <div style={{
      width: '100%', height: '100%', background: '#ffffff',
      position: 'relative', overflow: 'hidden',
      fontFamily: "'Montserrat', Arial, sans-serif",
    }}>

      {/* Figura de marca: panel diagonal Sea (con acento aqua) + escudo en negativo */}
      <div className="fig-in" style={{ position: 'absolute', inset: 0, zIndex: 1 }}>
        <DiagonalPanelRight color={C.AQUA} bottomX={1180} />
      </div>
      <div className="fig-in" style={{ position: 'absolute', inset: 0, zIndex: 2, '--d': 150 }}>
        <DiagonalPanelRight color={C.SEA} bottomX={1290} />
      </div>

      {/* ----- Encabezado ----- */}
      <div style={{ position: 'absolute', left: 112, top: 120, zIndex: 5, width: 1150 }}>
        <div className="r" style={{ '--d': 120 }}>
          <Eyebrow color={C.AQUAD} size={22}>Seguridad</Eyebrow>
        </div>
        <h1 className="r" style={{
          margin: '22px 0 0',
          color: C.SEA, fontWeight: 800, fontSize: 64, lineHeight: 1.0,
          letterSpacing: '-2.4px', textTransform: 'uppercase', '--d': 240,
        }}>
          Un único guardián:<br />el Gateway.
        </h1>
      </div>

      {/* ----- Frentes de seguridad ----- */}
      <div style={{
        position: 'absolute', left: 112, top: 410, width: 1130, zIndex: 5,
        display: 'flex', flexDirection: 'column', gap: 32,
      }}>
        {GROUPS.map((g, i) => (
          <Row key={g.key} icon={ICON[g.key]} name={g.name} line={g.line} color={g.color} d={420 + i * 130} />
        ))}
      </div>

      {/* ----- En el frontend ----- */}
      <div className="r" style={{ position: 'absolute', left: 112, top: 838, zIndex: 5, '--d': 920 }}>
        <Footnote label="En el frontend" color={C.SKY} maxWidth={1080}>
          El token de acceso vive solo en memoria y el de renovación viaja en una cookie httpOnly, inaccesible para JavaScript.
        </Footnote>
      </div>

    </div>
  )
}
