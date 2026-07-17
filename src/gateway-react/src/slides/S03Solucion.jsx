import { DiagonalPanelRight, Eyebrow } from '../components/SuperGraphic.jsx'
import { GatewayWordmark } from '../components/GatewayMark.jsx'
import { GatewayHero } from '../components/GatewayHero.jsx'

const SEA   = '#002E6D'
const SKY   = '#009BDE'
const AQUA  = '#54BBAB'
const AQUAD = '#2BA697'
const AQUAL = '#6FCBBC'

const LINE = 'rgba(0,46,109,0.38)'

// Los tres modulos a los que Gateway redirige (punto de entrada unico)
const MODULES = [
  { name: 'Reportes HP', color: AQUAD },
  { name: 'Comunidad HP', color: SKY },
  { name: 'Campus HP', color: AQUA },
]

// Diagrama: Gateway (arriba, el wordmark) se ramifica hacia sus tres modulos.
// Coordenadas x (127 / 380 / 633) = centros de las 3 columnas de un grid de
// 760px; el tronco baja del wordmark y se reparte en las tres ramas.
function GatewayDiagram() {
  return (
    <div className="r" style={{ '--d': 480, marginTop: 34, width: 760 }}>
      <svg viewBox="0 0 760 72" width={760} height={72} aria-hidden style={{ display: 'block' }}>
        <defs>
          <marker id="s03-arw" viewBox="0 0 10 10" refX="8.5" refY="5"
            markerWidth="7" markerHeight="7" orient="auto-start-reverse">
            <path d="M0,0 L10,5 L0,10 z" fill={LINE} />
          </marker>
        </defs>
        <path className="flow" style={{ '--d': 540 }} pathLength={1}
          d="M 380 0 L 380 26" fill="none" stroke={LINE} strokeWidth={2.5} strokeLinecap="round" />
        <path className="flow" style={{ '--d': 620 }} pathLength={1}
          d="M 127 26 L 633 26" fill="none" stroke={LINE} strokeWidth={2.5} strokeLinecap="round" />
        {[127, 380, 633].map((cx) => (
          <path key={cx} className="flow" style={{ '--d': 680 }} pathLength={1}
            d={`M ${cx} 26 L ${cx} 58`} fill="none" stroke={LINE} strokeWidth={2.5}
            strokeLinecap="round" markerEnd="url(#s03-arw)" />
        ))}
      </svg>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)' }}>
        {MODULES.map((m, i) => (
          <div key={m.name} className="r" style={{ '--d': 800 + i * 90, display: 'flex', justifyContent: 'center' }}>
            <span style={{
              display: 'inline-flex', alignItems: 'center',
              background: m.color, color: '#fff',
              fontWeight: 800, fontSize: 17, letterSpacing: '-0.2px',
              padding: '10px 20px 10px 24px',
              clipPath: 'polygon(11px 0, 100% 0, calc(100% - 11px) 100%, 0 100%)',
              whiteSpace: 'nowrap',
            }}>
              {m.name}
            </span>
          </div>
        ))}
      </div>
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

        <div className="r" style={{ marginTop: 22, display: 'flex', justifyContent: 'center', '--d': 240 }}>
          <GatewayWordmark gateColor={SEA} wayColor={AQUA} fontSize={116} />
        </div>

        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <GatewayDiagram />
        </div>

        <h2 className="r" style={{
          margin: '34px 0 0', textAlign: 'center',
          color: SEA, fontWeight: 800, fontSize: 40,
          lineHeight: 1.1, letterSpacing: '-0.8px',
          '--d': 900,
        }}>
          Una sola puerta a todo el Instituto.
        </h2>
      </div>


    </div>
  )
}
