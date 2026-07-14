import { Eyebrow } from '../components/SuperGraphic.jsx'
import logoHP from '../../assets/hutchisonports-color.png'
import logoInstituto from '../../assets/LogoInstitutoHP-azul.png'

// Versatilidad / vision a futuro: Gateway es una plataforma hecha en casa
// por el equipo del Instituto, lo que le permite crecer hacia cualquier area
// que necesite una herramienta digital enfocada en su comunidad. Estilo
// editorial (sin tarjetas ni cajas): icono + texto por columna, y un cierre
// "hecho en casa" con chips solidos de corte diagonal. Misma familia visual
// que el reto (S02) y el Gantt (S07b).

const SEA    = '#002E6D'
const SKY    = '#009BDE'
const AQUA   = '#54BBAB'
const AQUAD  = '#2BA697'
const YELLOW = '#FFC627'
const BODY   = '#41607F'
const MUTE   = '#7E96B6'
const FONT   = "'Montserrat', Arial, sans-serif"

const ICON = {
  rrhh: (
    <g fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round">
      <circle cx="17" cy="16" r="5.5" />
      <path d="M6 38 C6 29 10.5 25 17 25 C23.5 25 28 29 28 38" />
      <circle cx="33" cy="18" r="4.4" />
      <path d="M30 26 C37 26 42 30 42 38" />
    </g>
  ),
  sig: (
    <g fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round">
      <path d="M6 16 H18 L22 20 H42 V38 H6 Z" />
      <path d="M24 33 V22 M19 27 L24 22 L29 27" />
    </g>
  ),
  mas: (
    <g fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round">
      <circle cx="24" cy="24" r="16" strokeDasharray="3 5.5" />
      <path d="M24 17 V31 M17 24 H31" />
    </g>
  ),
}

const AREAS = [
  {
    num: '01',
    accent: SKY,
    icon: 'rrhh',
    org: 'RRHH',
    expansion: 'Recursos Humanos',
    title: 'Seguimiento y fomento al colaborador',
    text: <>Indicadores de desarrollo y desempeño, reconocimientos y campañas de bienestar que <strong style={{ color: SEA }}>fomenten el compromiso</strong> de cada colaborador.</>,
  },
  {
    num: '02',
    accent: AQUA,
    icon: 'sig',
    org: 'SIG',
    expansion: 'Sistema Integrado de Gestión',
    title: 'Difusión y resguardo documental',
    text: <>Un repositorio único para <strong style={{ color: SEA }}>políticas, procedimientos y normativas</strong>, con difusión dirigida a quien corresponde.</>,
  },
  {
    num: '03',
    accent: YELLOW,
    icon: 'mas',
    org: '+ Áreas',
    expansion: 'Seguridad · Calidad · Comunicación',
    title: 'Herramientas a la medida',
    text: <>Cualquier área con una necesidad especializada enfocada en su comunidad, <strong style={{ color: SEA }}>integrada al mismo acceso</strong>.</>,
  },
]

const CHIP_CLIP = 'polygon(12px 0, 100% 0, calc(100% - 12px) 100%, 0 100%)'

const HECHO_EN_CASA = [
  { color: SEA, text: 'Equipo propio del Instituto' },
  { color: SKY, text: 'Sin licencias adicionales' },
  { color: AQUA, text: 'Integraciones a la medida' },
]

function AreaColumn({ a, i }) {
  const base = 380 + i * 150
  return (
    <div>
      <div className="r" style={{ '--d': base, display: 'flex', alignItems: 'center', gap: 16 }}>
        <svg viewBox="0 0 48 48" width={42} height={42}
          style={{ color: a.accent, flexShrink: 0, display: 'block' }} aria-hidden>
          {ICON[a.icon]}
        </svg>
        <div>
          <div style={{ color: SEA, fontWeight: 800, fontSize: 25, letterSpacing: '-0.5px', lineHeight: 1 }}>
            {a.org}
          </div>
          <div style={{ color: MUTE, fontWeight: 600, fontSize: 12.5, marginTop: 4 }}>
            {a.expansion}
          </div>
        </div>
      </div>

      <h3 className="r" style={{
        '--d': base + 90, margin: '20px 0 0',
        color: SEA, fontWeight: 700, fontSize: 19, lineHeight: 1.25, letterSpacing: '-0.3px',
      }}>
        {a.title}
      </h3>

      <div className="r" style={{ '--d': base + 200, marginTop: 14, display: 'flex', gap: 14 }}>
        <span style={{
          width: 12, height: 12, flexShrink: 0, marginTop: 6,
          background: a.accent, transform: 'skewX(-30.3deg)',
        }} />
        <p style={{ margin: 0, color: BODY, fontWeight: 500, fontSize: 15.5, lineHeight: 1.5 }}>
          {a.text}
        </p>
      </div>
    </div>
  )
}

export default function S07dVersatilidad() {
  return (
    <div style={{
      width: '100%', height: '100%',
      background: '#ffffff',
      position: 'relative', overflow: 'hidden',
      fontFamily: FONT,
    }}>

      {/* ----- Encabezado ----- */}
      <div style={{ position: 'absolute', left: 112, top: 92, zIndex: 5, width: 1500 }}>
        <div className="r" style={{ '--d': 60 }}>
          <Eyebrow color={AQUAD} size={22}>El futuro · Versatilidad</Eyebrow>
        </div>
        <h1 className="r" style={{
          margin: '22px 0 0',
          color: SEA, fontWeight: 800,
          fontSize: 58, lineHeight: 1.0,
          letterSpacing: '-2px', textTransform: 'uppercase',
          '--d': 160,
        }}>
          Hecho en casa, listo para crecer
        </h1>
        <p className="r" style={{
          margin: '20px 0 0', maxWidth: 1150,
          color: BODY, fontWeight: 500, fontSize: 19, lineHeight: 1.5,
          '--d': 240,
        }}>
          Al ser una plataforma propia, Gateway puede extenderse hacia cualquier área del Instituto que
          necesite una herramienta digital enfocada en su comunidad — sin licencias ni dependencia de terceros.
        </p>
      </div>

      {/* ----- Areas candidatas ----- */}
      <div style={{
        position: 'absolute', left: 112, top: 340, width: 1679, zIndex: 5,
        display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 56,
      }}>
        {AREAS.map((a, i) => <AreaColumn key={a.num} a={a} i={i} />)}
      </div>

      {/* ----- Hecho en casa (chips solidos, sin caja) ----- */}
      <div style={{ position: 'absolute', left: 112, top: 720, width: 1679, zIndex: 5 }}>
        <div className="r" style={{ '--d': 950 }}>
          <Eyebrow color={AQUAD} size={15}>Hecho en casa</Eyebrow>
        </div>
        <div className="r" style={{ '--d': 1010, marginTop: 14, height: 1.5, background: 'rgba(0,46,109,0.12)' }} />

        <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', marginTop: 24 }}>
          {HECHO_EN_CASA.map((h, i) => (
            <div key={h.text} className="r" style={{ '--d': 1080 + i * 90 }}>
              <span style={{
                display: 'inline-flex', alignItems: 'center',
                background: h.color, color: '#fff',
                fontWeight: 700, fontSize: 16.5, letterSpacing: '-0.2px',
                padding: '11px 24px 11px 26px', clipPath: CHIP_CLIP,
              }}>
                {h.text}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ----- Logos (compactos abajo a la derecha) ----- */}
      <div className="r" style={{
        position: 'absolute', zIndex: 6, bottom: 22, right: 104,
        display: 'flex', alignItems: 'center', gap: 26, '--d': 1300,
      }}>
        <img src={logoInstituto} alt="Instituto Hutchison Ports"
          style={{ height: 34, objectFit: 'contain', display: 'block' }} />
        <img src={logoHP} alt="Hutchison Ports"
          style={{ height: 64, objectFit: 'contain', display: 'block' }} />
      </div>

    </div>
  )
}
