import { DiagonalPanelRight, Eyebrow } from '../components/SuperGraphic.jsx'
import { GatewayWordmark } from '../components/GatewayMark.jsx'
import { GatewayHero } from '../components/GatewayHero.jsx'

const SEA   = '#002E6D'
const AQUA  = '#54BBAB'
const AQUAD = '#2BA697'
const AQUAL = '#6FCBBC'
const BODY  = '#41607F'

// Los modulos que Gateway reune en un solo acceso
const PILLARS = [
  { name: 'Capacitación', desc: 'presencial, virtual o híbrida' },
  { name: 'Comunidad',    desc: 'un solo canal para todos' },
  { name: 'Reportes',     desc: 'tu progreso, centralizado' },
  { name: 'Dudas',        desc: 'atendidas más fácilmente' },
]

// Pilar: vinneta diagonal a 30.3° (angulo de marca) + nombre + descriptor
function Pillar({ name, desc, d }) {
  return (
    <div className="r" style={{ display: 'flex', alignItems: 'center', gap: 16, '--d': d }}>
      <span style={{
        width: 16, height: 16, flexShrink: 0,
        background: AQUA, transform: 'skewX(-30.3deg)',
      }} />
      <span style={{ color: SEA, fontWeight: 800, fontSize: 28, letterSpacing: '-0.3px' }}>
        {name}
      </span>
      <span style={{ color: BODY, fontWeight: 500, fontSize: 22 }}>
        — {desc}
      </span>
    </div>
  )
}

export default function S03Solucion() {
  return (
    <div style={{
      width: '100%', height: '100%',
      background: '#ffffff',
      position: 'relative', overflow: 'hidden',
      fontFamily: "'Montserrat', Arial, sans-serif",
    }}>

      {/* Figura de marca: panel diagonal Sea Blue (con borde aqua) que aloja el
          isotipo en negativo. Sin texto encima -> contraste seguro. */}
      <div className="fig-in" style={{ position: 'absolute', inset: 0, zIndex: 1 }}>
        <DiagonalPanelRight color={AQUA} bottomX={840} />
      </div>
      <div className="fig-in" style={{ position: 'absolute', inset: 0, zIndex: 2, '--d': 150 }}>
        <DiagonalPanelRight color={SEA} bottomX={950} />
      </div>

      {/* Isotipo heroico (negativo) — auto-dibujo + orbita, centrado en el panel */}
      <div style={{ position: 'absolute', left: 1640, top: 540, zIndex: 3 }}>
        <GatewayHero
          markSize={230}
          innerRadius={170}
          outerRadius={220}
          markColor="#ffffff"
          innerColor={AQUA}
          outerColor={AQUAL}
          markStroke={2.3}
          showHalo={false}
          animDelay={0.7}
        />
      </div>

      {/* ----- Mensaje (sobre blanco) ----- */}
      <div style={{
        position: 'absolute', left: 112, top: '50%',
        transform: 'translateY(-50%)', zIndex: 5, width: 980,
      }}>
        <div className="r" style={{ '--d': 120 }}>
          <Eyebrow color={AQUAD} size={22}>La solución</Eyebrow>
        </div>

        <div className="r" style={{ marginTop: 22, '--d': 240 }}>
          <GatewayWordmark gateColor={SEA} wayColor={AQUA} fontSize={116} />
        </div>

        <h2 className="r" style={{
          margin: '24px 0 0',
          color: SEA, fontWeight: 800, fontSize: 40,
          lineHeight: 1.1, letterSpacing: '-0.8px',
          '--d': 360,
        }}>
          Una sola puerta a todo el Instituto.
        </h2>

        <p className="r" style={{
          margin: '22px 0 30px', maxWidth: 760,
          color: BODY, fontWeight: 500, fontSize: 24, lineHeight: 1.5,
          '--d': 460,
        }}>
          Un único inicio de sesión que reúne, en un solo lugar:
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {PILLARS.map((p, i) => (
            <Pillar key={p.name} name={p.name} desc={p.desc} d={580 + i * 120} />
          ))}
        </div>
      </div>


    </div>
  )
}
