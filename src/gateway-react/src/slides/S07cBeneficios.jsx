import { Eyebrow } from '../components/SuperGraphic.jsx'
import logoHP from '../../assets/hutchisonports-color.png'
import logoInstituto from '../../assets/LogoInstitutoHP-azul.png'

// Beneficios esperados en dos alturas: arriba las tres apuestas estrategicas
// (soberania, independencia, cultura) como tarjetas con filo de color, y
// abajo una banda con los cuatro beneficios operativos concretos. Misma
// familia visual que las tarjetas de objetivos SMART.

const SEA    = '#002E6D'
const SKY    = '#009BDE'
const AQUA   = '#54BBAB'
const AQUAD  = '#2BA697'
const YELLOW = '#FFC627'
const BODY   = '#41607F'
const MUTE   = '#7E96B6'
const FONT   = "'Montserrat', Arial, sans-serif"

const STRATEGIC = [
  {
    num: '01',
    accent: SEA,
    title: 'Soberanía de datos',
    text: <>Control total sobre la información de capacitación y desempeño de <strong style={{ color: SEA }}>más de 5,000 colaboradores</strong>, sin depender de terceros.</>,
  },
  {
    num: '02',
    accent: SKY,
    title: 'Independencia tecnológica',
    text: <>Reducir progresivamente la dependencia de Cornerstone LMS con un sistema que evoluciona a la medida del Instituto, <strong style={{ color: SEA }}>eliminando su costo de licenciamiento</strong>.</>,
  },
  {
    num: '03',
    accent: AQUA,
    title: 'Cultura y engagement',
    text: <>Fomentar la interacción social y el reconocimiento del logro académico mediante los módulos de <strong style={{ color: SEA }}>comunidad y gamificación</strong>.</>,
  },
]

const OPERATIVE = [
  {
    color: SEA,
    lead: 'Centralización',
    text: <>Un solo punto de entrada para <strong style={{ color: SEA }}>~4,000 operativos</strong>, <strong style={{ color: SEA }}>~700 mandos medios</strong> y <strong style={{ color: SEA }}>~300 directivos</strong> de las <strong style={{ color: SEA }}>11 unidades de negocio</strong> portuarias en México.</>,
  },
  {
    color: SKY,
    lead: 'Reportes avanzados',
    text: <>Analítica de capacitación que supera la plataforma actual, con <strong style={{ color: SEA }}>Smart Reports v3 ya integrado</strong>.</>,
  },
  {
    color: AQUA,
    lead: 'E-learning propio',
    text: <>A mediano plazo: modalidades híbridas, en línea y presenciales que sustituyen los módulos externos.</>,
  },
  {
    color: YELLOW,
    lead: 'Experiencia unificada',
    text: <>Identidad institucional Hutchison Ports de punta a punta, en toda la plataforma.</>,
  },
]

function StrategicCard({ s, i }) {
  const base = 420 + i * 150
  return (
    <div className="r" style={{
      '--d': base,
      width: 533, height: 316,
      background: '#fff',
      border: '1.5px solid rgba(0,46,109,0.16)', borderRadius: 14,
      position: 'relative', overflow: 'hidden',
      padding: '36px 36px 30px',
    }}>
      {/* filo superior con el color de la apuesta, cortado a la marca */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 9,
        background: s.accent,
        clipPath: 'polygon(0 0, 100% 0, 100% 100%, 16px 100%)',
      }} />

      <div className="r" style={{ '--d': base + 100, display: 'flex', alignItems: 'baseline', gap: 16 }}>
        <span style={{ color: 'rgba(0,46,109,0.16)', fontWeight: 800, fontSize: 50, lineHeight: 1 }}>
          {s.num}
        </span>
        <span style={{ color: SEA, fontWeight: 800, fontSize: 27, letterSpacing: '-0.6px' }}>
          {s.title}
        </span>
      </div>

      <div className="r" style={{ '--d': base + 200, marginTop: 22, display: 'flex', gap: 14 }}>
        <span style={{
          width: 13, height: 13, flexShrink: 0, marginTop: 7,
          background: s.accent, transform: 'skewX(-30.3deg)',
        }} />
        <p style={{ margin: 0, color: BODY, fontWeight: 500, fontSize: 17.5, lineHeight: 1.5 }}>
          {s.text}
        </p>
      </div>
    </div>
  )
}

export default function S07cBeneficios() {
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
          <Eyebrow color={AQUAD} size={22}>El valor · Beneficios esperados</Eyebrow>
        </div>
        <h1 className="r" style={{
          margin: '22px 0 0',
          color: SEA, fontWeight: 800,
          fontSize: 62, lineHeight: 1.0,
          letterSpacing: '-2px', textTransform: 'uppercase',
          '--d': 160,
        }}>
          Tres apuestas, valor tangible
        </h1>
      </div>

      {/* ----- Apuestas estrategicas ----- */}
      <div style={{
        position: 'absolute', left: 112, top: 280, zIndex: 5,
        display: 'flex', gap: 40,
      }}>
        {STRATEGIC.map((s, i) => <StrategicCard key={s.num} s={s} i={i} />)}
      </div>

      {/* ----- Banda operativa: en que se traduce ----- */}
      <div className="r" style={{
        '--d': 900,
        position: 'absolute', left: 112, top: 646, width: 1679, zIndex: 5,
        background: 'rgba(0,46,109,0.04)', borderRadius: 14,
        padding: '30px 36px 32px',
      }}>
        <div style={{
          fontSize: 13, fontWeight: 700, letterSpacing: '2.5px',
          textTransform: 'uppercase', color: AQUAD,
        }}>
          En la operación, esto se traduce en
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 36, marginTop: 22 }}>
          {OPERATIVE.map((o, i) => (
            <div key={o.lead} className="r" style={{ '--d': 1000 + i * 90 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{
                  width: 12, height: 12, flexShrink: 0,
                  background: o.color, transform: 'skewX(-30.3deg)',
                }} />
                <span style={{ color: SEA, fontWeight: 800, fontSize: 19, letterSpacing: '-0.3px' }}>
                  {o.lead}
                </span>
              </div>
              <p style={{ margin: '12px 0 0', color: BODY, fontWeight: 500, fontSize: 15, lineHeight: 1.45 }}>
                {o.text}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* ----- Logos (compactos abajo a la derecha) ----- */}
      <div className="r" style={{
        position: 'absolute', zIndex: 6, bottom: 22, right: 104,
        display: 'flex', alignItems: 'center', gap: 26, '--d': 1500,
      }}>
        <img src={logoInstituto} alt="Instituto Hutchison Ports"
          style={{ height: 34, objectFit: 'contain', display: 'block' }} />
        <img src={logoHP} alt="Hutchison Ports"
          style={{ height: 64, objectFit: 'contain', display: 'block' }} />
      </div>

    </div>
  )
}
