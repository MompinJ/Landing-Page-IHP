import { DiagonalBand, Eyebrow } from '../components/SuperGraphic.jsx'
import { GatewayMark } from '../components/GatewayMark.jsx'
import iconCampus from '../../assets/icons/campus-on.svg'
import iconComunidad from '../../assets/icons/comunidad-on.svg'
import iconReportes from '../../assets/icons/reportes-on.svg'

const SEA = '#002E6D'
const SKY = '#009BDE'
const AQUA = '#54BBAB'
const AQUAD = '#2BA697'
const AQUAL = '#6FCBBC'
const BODY = '#41607F'

// Iconos de linea (mismo lenguaje de trazo que el isotipo: stroke, redondeado)
const ICON = {
  capacitacion: (
    <g fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round">
      <path d="M24 12 L42 20 L24 28 L6 20 Z" />
      <path d="M13 23 V31 C13 31 24 36 35 31 V23" />
      <path d="M42 20 V30" />
    </g>
  ),
  comunidad: (
    <g fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round">
      <circle cx="18" cy="17" r="5" />
      <path d="M8 36 C8 29 12 26 18 26 C24 26 28 29 28 36" />
      <circle cx="32" cy="19" r="4" />
      <path d="M30 27 C36 27 40 30 40 36" />
    </g>
  ),
  reportes: (
    <g fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round">
      <path d="M7 39 V9" />
      <path d="M7 39 H41" />
      <path d="M15 39 V26" />
      <path d="M24 39 V16" />
      <path d="M33 39 V22" />
    </g>
  ),
  mas: (
    <g fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round">
      <circle cx="24" cy="24" r="16" strokeDasharray="3 5.5" />
      <path d="M24 17 V31 M17 24 H31" />
    </g>
  ),
}

const MODULES = [
  { key: 'capacitacion', name: 'Campus HP', line: 'E-learning propio a las necesidades', soft: false, img: iconCampus },
  { key: 'comunidad', name: 'Comunidad HP', line: 'Red social propia para el grupo', soft: false, img: iconComunidad },
  { key: 'reportes', name: 'Reportes', line: 'Métricas y calificaciones a considerar', soft: false, img: iconReportes },
  { key: 'mas', name: 'Más…', line: '', soft: true },
]

function Module({ icon, img, name, line, soft, d }) {
  return (
    <div className="rs" style={{ display: 'flex', alignItems: 'center', gap: 22, '--d': d }}>
      {img ? (
        <img src={img} alt="" width={56} height={56}
          style={{ flexShrink: 0, display: 'block' }} aria-hidden />
      ) : (
        <svg viewBox="0 0 48 48" width={52} height={52}
          style={{ color: soft ? AQUAL : AQUAD, flexShrink: 0, display: 'block' }} aria-hidden>
          {icon}
        </svg>
      )}
      <div>
        <div style={{ color: soft ? '#7FA0B8' : SEA, fontWeight: 800, fontSize: 29, letterSpacing: '-0.4px' }}>{name}</div>
        <div style={{ color: BODY, fontWeight: 500, fontSize: 19, marginTop: 2 }}>{line}</div>
      </div>
    </div>
  )
}

export default function S04Plataforma() {
  return (
    <div style={{
      width: '100%', height: '100%',
      background: '#ffffff',
      position: 'relative', overflow: 'hidden',
      fontFamily: "'Montserrat', Arial, sans-serif",
    }}>

      {/* Figura: super graphic = banda diagonal a 30.3° a la IZQUIERDA, en capas
          (Sky Blue de acento + Sea Blue que aloja la puerta). */}
      <div className="fig-in" style={{ position: 'absolute', inset: 0, zIndex: 1 }}>
        <DiagonalBand color={SKY} topX={230} width={440} lean={1} />
      </div>
      <div className="fig-in" style={{ position: 'absolute', inset: 0, zIndex: 2, '--d': 150 }}>
        <DiagonalBand color={SEA} topX={300} width={380} lean={1} />
      </div>

      {/* La puerta: isotipo en negativo sobre la banda + etiqueta de acceso unico */}
      <div style={{
        position: 'absolute', left: 188, top: 520, zIndex: 3,
        transform: 'translate(-50%, -50%)', textAlign: 'center',
      }}>
        <div className="rs" style={{ display: 'flex', justifyContent: 'center', '--d': 440 }}>
          <GatewayMark size={176} color="#ffffff" strokeWidth={2.6} />
        </div>
        <div className="r" style={{
          marginTop: 22, color: '#ffffff', fontWeight: 800, fontSize: 19,
          letterSpacing: '3px', textTransform: 'uppercase', '--d': 580,
        }}>
          Un solo acceso
        </div>
      </div>

      {/* ----- Encabezado (derecha) ----- */}
      <div style={{ position: 'absolute', left: 760, top: 120, zIndex: 5, width: 1048 }}>
        <div className="r" style={{ '--d': 120 }}>
          <Eyebrow color={AQUAD} size={22}>La plataforma</Eyebrow>
        </div>
        <h1 className="r" style={{
          margin: '24px 0 0',
          color: SEA, fontWeight: 800, fontSize: 78, lineHeight: 1.0,
          letterSpacing: '-2.5px', textTransform: 'uppercase', '--d': 240,
        }}>
          Todo en un<br />mismo lugar.
        </h1>
      </div>

      {/* ----- Modulos (lista, columna derecha) ----- */}
      <div style={{
        position: 'absolute', left: 760, top: 452, width: 940, zIndex: 5,
        display: 'flex', flexDirection: 'column', gap: 34,
      }}>
        {MODULES.map((m, i) => (
          <Module key={m.key} icon={ICON[m.key]} img={m.img} name={m.name} line={m.line} soft={m.soft} d={520 + i * 130} />
        ))}
      </div>


    </div>
  )
}
