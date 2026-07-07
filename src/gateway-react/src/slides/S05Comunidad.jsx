import { DiagonalBand, Eyebrow } from '../components/SuperGraphic.jsx'
import iconComunidad from '../../assets/icons/comunidad-on.svg'

const W = 1920
const H = 1080
const SEA = '#002E6D'
const ORANGE = '#EE7523'
const YELLOW = '#FFC627'
const BODY = '#41607F'

// Iconos de linea (mismo lenguaje de trazo: stroke, redondeado)
const ICON = {
  // canal oficial: megafono
  canal: (
    <g fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round">
      <path d="M9 20 L27 13 V35 L9 28 Z" />
      <path d="M14 29 V37 H19 V31" />
      <path d="M32 18 A9 9 0 0 1 32 30" />
    </g>
  ),
  // muro / publicaciones: feed
  muro: (
    <g fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round">
      <path d="M9 10 H39 V38 H9 Z" />
      <path d="M15 19 H33 M15 25 H33 M15 31 H26" />
    </g>
  ),
  // dinamicas / gamificacion: trofeo
  dinamicas: (
    <g fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round">
      <path d="M16 10 H32 V19 A8 8 0 0 1 16 19 Z" />
      <path d="M16 12 H10 V15 A5 5 0 0 0 16 19" />
      <path d="M32 12 H38 V15 A5 5 0 0 1 32 19" />
      <path d="M24 27 V32 M18 38 H30 M21 38 V34 H27 V38" />
    </g>
  ),
}

const BENEFITS = [
  { key: 'canal', name: 'Muro y publicaciones', line: 'lo que se publica, llega a todos' },
  { key: 'muro', name: 'Noticias y eventos', line: 'la información en un solo lugar' },
  { key: 'dinamicas', name: 'Dinámicas', line: 'participación que engancha' },
]

function Benefit({ icon, name, line, d }) {
  return (
    <div className="rs" style={{ display: 'flex', alignItems: 'center', gap: 22, '--d': d }}>
      <svg viewBox="0 0 48 48" width={54} height={54}
        style={{ color: ORANGE, flexShrink: 0, display: 'block' }} aria-hidden>
        {icon}
      </svg>
      <div>
        <div style={{ color: SEA, fontWeight: 800, fontSize: 28, letterSpacing: '-0.4px' }}>{name}</div>
        <div style={{ color: BODY, fontWeight: 500, fontSize: 20, marginTop: 2 }}>{line}</div>
      </div>
    </div>
  )
}

export default function S05Comunidad() {
  return (
    <div style={{
      width: '100%', height: '100%',
      background: '#ffffff',
      position: 'relative', overflow: 'hidden',
      fontFamily: "'Montserrat', Arial, sans-serif",
    }}>

      {/* Figura: super graphic calido = triangulo amarillo + banda naranja encima */}
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="100%"
        className="fig-in" style={{ position: 'absolute', inset: 0, zIndex: 1 }} aria-hidden>
        <polygon points="1920,200 1920,1080 1406,1080" fill={YELLOW} />
      </svg>
      <div className="fig-in" style={{ position: 'absolute', inset: 0, zIndex: 2, '--d': 150 }}>
        <DiagonalBand color={ORANGE} topX={1620} width={300} lean={1} />
      </div>

      {/* ----- Contenido (izquierda, sobre blanco) ----- */}
      <div style={{ position: 'absolute', left: 112, top: 150, zIndex: 5, width: 980 }}>
        <div className="r" style={{ display: 'flex', alignItems: 'center', gap: 14, '--d': 120 }}>
          <img src={iconComunidad} alt="" width={50} height={50}
            style={{ display: 'block', flexShrink: 0 }} aria-hidden />
          <Eyebrow color={ORANGE} size={22}>Comunidad HP</Eyebrow>
        </div>

        <h1 className="r" style={{
          margin: '24px 0 0',
          color: SEA, fontWeight: 800, fontSize: 80, lineHeight: 1.0,
          letterSpacing: '-2.5px', textTransform: 'uppercase', '--d': 240,
        }}>
          Un punto<br />para todo el grupo.
        </h1>

        <p className="r" style={{
          margin: '26px 0 0', maxWidth: 760,
          color: BODY, fontWeight: 500, fontSize: 24, lineHeight: 1.5, '--d': 360,
        }}>
          El canal oficial de comunicación interna para formar una sola comunidad en todo el grupo.
        </p>
      </div>

      {/* ----- Beneficios ----- */}
      <div style={{
        position: 'absolute', left: 112, top: 540, width: 900, zIndex: 5,
        display: 'flex', flexDirection: 'column', gap: 34,
      }}>
        {BENEFITS.map((b, i) => (
          <Benefit key={b.key} icon={ICON[b.key]} name={b.name} line={b.line} d={520 + i * 130} />
        ))}
      </div>


    </div>
  )
}
