import { DiagonalBand, Eyebrow } from '../components/SuperGraphic.jsx'
import { C, Row, Footnote } from '../components/TechUI.jsx'

const ICON = {
  backend: (
    <g fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round">
      <rect x="8" y="9" width="32" height="11" rx="2.5" />
      <rect x="8" y="28" width="32" height="11" rx="2.5" />
      <path d="M14 14.5 H14.2 M14 33.5 H14.2" />
    </g>
  ),
  frontend: (
    <g fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round">
      <rect x="7" y="10" width="34" height="24" rx="2.5" />
      <path d="M7 17 H41 M18 40 H30 M24 34 V40" />
    </g>
  ),
  datos: (
    <g fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round">
      <ellipse cx="24" cy="13" rx="15" ry="6" />
      <path d="M9 13 V35 C9 38 16 40 24 40 C32 40 39 38 39 35 V13" />
      <path d="M9 24 C9 27 16 29 24 29 C32 29 39 27 39 24" />
    </g>
  ),
}

const GROUPS = [
  {
    key: 'backend', color: C.SKY, name: 'Backend',
    line: 'Java 21 + Spring Boot 3.4 — el Gateway reactivo (WebFlux); Reportes en Node.js 22 + Fastify con worker.',
  },
  {
    key: 'frontend', color: C.AQUAD, name: 'Frontend — Navy Gate',
    line: 'React 18 + TypeScript, empaquetado con Vite y estilos con Tailwind; carga por módulos (lazy loading).',
  },
  {
    key: 'datos', color: C.ORANGE, name: 'Datos e infraestructura',
    line: 'PostgreSQL 15, Redis 7, Docker y Azure en producción.',
  },
]

export default function S11Stack() {
  return (
    <div style={{
      width: '100%', height: '100%', background: '#ffffff',
      position: 'relative', overflow: 'hidden',
      fontFamily: "'Montserrat', Arial, sans-serif",
    }}>

      {/* Figura de marca: bandas diagonales (Sea + Sky) a la izquierda */}
      <div className="fig-in" style={{ position: 'absolute', inset: 0, zIndex: 1 }}>
        <DiagonalBand color={C.SEA} topX={250} width={440} lean={1} />
      </div>
      <div className="fig-in" style={{ position: 'absolute', inset: 0, zIndex: 2, '--d': 150 }}>
        <DiagonalBand color={C.SKY} topX={360} width={360} lean={1} />
      </div>

      {/* ----- Encabezado ----- */}
      <div style={{ position: 'absolute', left: 760, top: 130, zIndex: 5, width: 1048 }}>
        <div className="r" style={{ '--d': 120 }}>
          <Eyebrow color={C.AQUAD} size={22}>Tecnologías</Eyebrow>
        </div>
        <h1 className="r" style={{
          margin: '22px 0 0',
          color: C.SEA, fontWeight: 800, fontSize: 70, lineHeight: 1.0,
          letterSpacing: '-2.6px', textTransform: 'uppercase', '--d': 240,
        }}>
          Estándares de<br />la industria.
        </h1>
      </div>

      {/* ----- Grupos ----- */}
      <div style={{
        position: 'absolute', left: 760, top: 462, width: 1048, zIndex: 5,
        display: 'flex', flexDirection: 'column', gap: 32,
      }}>
        {GROUPS.map((g, i) => (
          <Row key={g.key} icon={ICON[g.key]} name={g.name} line={g.line} color={g.color} d={420 + i * 130} />
        ))}
      </div>

      {/* ----- Punto clave ----- */}
      <div className="r" style={{ position: 'absolute', left: 760, top: 858, zIndex: 5, '--d': 880 }}>
        <Footnote label="Punto clave" color={C.AQUAD} maxWidth={980}>
          Estándares de mercado, no tecnología propietaria ni exótica — mantenimiento, contratación y soporte más simples.
        </Footnote>
      </div>

    </div>
  )
}
