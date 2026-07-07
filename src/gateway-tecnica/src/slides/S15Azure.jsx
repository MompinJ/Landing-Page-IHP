import { DiagonalPanelRight, Eyebrow } from '../components/SuperGraphic.jsx'
import { C } from '../components/TechUI.jsx'

// Iconos de linea (mismo lenguaje de trazo: stroke, redondeado)
const ICON = {
  appservice: (
    <g fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round">
      <rect x="8" y="9" width="32" height="11" rx="2.5" />
      <rect x="8" y="28" width="32" height="11" rx="2.5" />
      <path d="M14 14.5 H14.2 M14 33.5 H14.2 M30 14.5 H35 M30 33.5 H35" />
    </g>
  ),
  redis: (
    <g fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round">
      <path d="M26 6 L12 27 H22 L20 42 L36 21 H26 Z" />
    </g>
  ),
  frontdoor: (
    <g fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round">
      <circle cx="24" cy="24" r="16" />
      <path d="M8 24 H40" />
      <path d="M24 8 C15 14 15 34 24 40 C33 34 33 14 24 8" />
    </g>
  ),
  postgres: (
    <g fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round">
      <ellipse cx="24" cy="13" rx="15" ry="6" />
      <path d="M9 13 V35 C9 38 16 40 24 40 C32 40 39 38 39 35 V13" />
      <path d="M9 24 C9 27 16 29 24 29 C32 29 39 27 39 24" />
    </g>
  ),
  staticweb: (
    <g fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round">
      <rect x="7" y="10" width="34" height="28" rx="2.5" />
      <path d="M7 18 H41 M11.5 14 H11.7 M15 14 H15.2 M18.5 14 H18.7" />
    </g>
  ),
  blob: (
    <g fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round">
      <rect x="8" y="10" width="32" height="28" rx="3" />
      <circle cx="17" cy="19" r="3" />
      <path d="M11 36 L21 26 L28 33 L33 28 L39 35" />
    </g>
  ),
  registry: (
    <g fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round">
      <rect x="9" y="14" width="30" height="24" rx="2" />
      <path d="M9 22 H39 M19 14 V22 M29 14 V22 M19 30 H29" />
    </g>
  ),
  keyvault: (
    <g fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round">
      <circle cx="18" cy="18" r="8" />
      <path d="M23 23 L38 38 M34 34 L39 29 M30 30 L35 35" />
    </g>
  ),
  insights: (
    <g fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round">
      <path d="M6 24 H16 L20 14 L27 34 L31 24 H42" />
    </g>
  ),
  vnet: (
    <g fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round">
      <circle cx="24" cy="11" r="5" />
      <circle cx="11" cy="37" r="5" />
      <circle cx="37" cy="37" r="5" />
      <path d="M22 15 L13 32 M26 15 L35 32 M16 37 H32" />
    </g>
  ),
}

const COL1 = [
  { key: 'appservice', name: 'Azure App Service', line: 'Aloja los microservicios backend' },
  { key: 'redis', name: 'Azure Cache for Redis', line: 'Sesiones de usuario y consultas en caché' },
  { key: 'frontdoor', name: 'Azure Front Door', line: 'CDN y puerta de entrada' },
  { key: 'postgres', name: 'Azure Database for PostgreSQL', line: 'Base de datos' },
  { key: 'staticweb', name: 'Azure Static Web Apps', line: 'Frontend (Navy Gate)' },
]

const COL2 = [
  { key: 'blob', name: 'Azure Blob Storage', line: 'Fotos, videos y documentos' },
  { key: 'registry', name: 'Azure Container Registry', line: 'Versiones del backend' },
  { key: 'keyvault', name: 'Azure Key Vault', line: 'Contraseñas y llaves' },
  { key: 'insights', name: 'App Insights + Log Analytics', line: 'Observabilidad' },
  { key: 'vnet', name: 'VNet + Managed Identity + DNS privado', line: 'Comunicación interna, cerrada y segura' },
]

function Resource({ icon, name, line, d }) {
  return (
    <div className="rs" style={{ display: 'flex', alignItems: 'center', gap: 18, '--d': d }}>
      <svg viewBox="0 0 48 48" width={46} height={46}
        style={{ color: C.AQUAD, flexShrink: 0, display: 'block' }} aria-hidden>
        {icon}
      </svg>
      <div>
        <div style={{ color: C.SEA, fontWeight: 800, fontSize: 23, letterSpacing: '-0.4px' }}>{name}</div>
        <div style={{ color: C.BODY, fontWeight: 500, fontSize: 17, marginTop: 2 }}>{line}</div>
      </div>
    </div>
  )
}

export default function S15Azure() {
  return (
    <div style={{
      width: '100%', height: '100%', background: '#ffffff',
      position: 'relative', overflow: 'hidden',
      fontFamily: "'Montserrat', Arial, sans-serif",
    }}>

      {/* Figura de marca: panel diagonal (Aqua + Sea) en la esquina inferior derecha */}
      <div className="fig-in" style={{ position: 'absolute', inset: 0, zIndex: 1 }}>
        <DiagonalPanelRight color={C.AQUA} bottomX={1210} />
      </div>
      <div className="fig-in" style={{ position: 'absolute', inset: 0, zIndex: 2, '--d': 150 }}>
        <DiagonalPanelRight color={C.SEA} bottomX={1320} />
      </div>

      {/* ----- Encabezado ----- */}
      <div style={{ position: 'absolute', left: 112, top: 116, zIndex: 5, width: 1400 }}>
        <div className="r" style={{ '--d': 120 }}>
          <Eyebrow color={C.AQUAD} size={22}>Infraestructura en la nube</Eyebrow>
        </div>
        <h1 className="r" style={{
          margin: '22px 0 0',
          color: C.SEA, fontWeight: 800, fontSize: 58, lineHeight: 1.02,
          letterSpacing: '-2px', textTransform: 'uppercase', '--d': 240,
        }}>
          Lo que se necesita en Azure.
        </h1>
        <p className="r" style={{
          margin: '18px 0 0', maxWidth: 1100,
          color: C.BODY, fontWeight: 500, fontSize: 21, lineHeight: 1.4, '--d': 360,
        }}>
          Recursos para desplegar el HUB Digital en producción.
        </p>
      </div>

      {/* ----- Listado (2 columnas) ----- */}
      <div style={{ position: 'absolute', left: 112, top: 350, zIndex: 5, display: 'flex', gap: 60 }}>
        <div style={{ width: 600, display: 'flex', flexDirection: 'column', gap: 28 }}>
          {COL1.map((r, i) => (
            <Resource key={r.key} icon={ICON[r.key]} name={r.name} line={r.line} d={440 + i * 90} />
          ))}
        </div>
        <div style={{ width: 600, display: 'flex', flexDirection: 'column', gap: 28 }}>
          {COL2.map((r, i) => (
            <Resource key={r.key} icon={ICON[r.key]} name={r.name} line={r.line} d={500 + i * 90} />
          ))}
        </div>
      </div>

    </div>
  )
}
