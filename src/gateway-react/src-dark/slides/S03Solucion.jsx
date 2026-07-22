import { DiagonalBand, Eyebrow } from '../../src/components/SuperGraphic.jsx'
import { GatewayWordmark } from '../../src/components/GatewayMark.jsx'
import { GatewayHero } from '../../src/components/GatewayHero.jsx'
import { SLIDE_BG, SKY, AQUA, AQUA_D, HORIZON, TXT, FONT } from '../theme.js'

// Espejo Navy de S03Solucion: mismo contenido y el mismo portal (el isotipo
// queda en las mismas coordenadas para que el zoom del portal calce). El panel
// diagonal solido se vuelve banda de luz aqua + isotipo con glow.

const LINE = 'rgba(154,202,235,0.4)'

const MODULES = [
  { name: 'Reportes HP', color: AQUA_D },
  { name: 'Comunidad HP', color: SKY },
  { name: 'Campus HP', color: AQUA },
]

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
              background: m.color, color: '#04122B',
              fontWeight: 800, fontSize: 18, letterSpacing: '-0.2px',
              padding: '10px 20px 10px 24px',
              clipPath: 'polygon(11px 0, 100% 0, calc(100% - 11px) 100%, 0 100%)',
              whiteSpace: 'nowrap',
              boxShadow: `0 0 22px ${m.color}55`,
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
      background: SLIDE_BG,
      position: 'relative', overflow: 'hidden',
      fontFamily: FONT,
    }}>

      {/* Banda de luz aqua a la derecha (eco del panel diagonal solido) */}
      <div className="fig-in" style={{ position: 'absolute', inset: 0, zIndex: 1, opacity: 0.14 }}>
        <DiagonalBand color={AQUA} topX={1520} width={520} />
      </div>
      <div className="fig-in" style={{ position: 'absolute', inset: 0, zIndex: 2, '--d': 150 }}>
        <DiagonalBand color={AQUA} topX={1500} width={5} />
      </div>

      {/* Isotipo heroico — auto-dibujo + orbita, MISMA posicion que la version
          clara (el portal hace zoom sobre este punto: 1640px 600px) */}
      <div style={{ position: 'absolute', left: 1640, top: 540, zIndex: 3, filter: `drop-shadow(0 0 36px ${AQUA}66)` }}>
        <GatewayHero
          markSize={230}
          innerRadius={170}
          outerRadius={220}
          markColor="#ffffff"
          innerColor="#FFFFFF"
          outerColor={HORIZON}
          markStroke={2.3}
          showHalo={false}
          animDelay={0.7}
        />
      </div>

      {/* ----- Mensaje ----- */}
      <div style={{
        position: 'absolute', left: 112, top: '50%',
        transform: 'translateY(-50%)', zIndex: 5, width: 980,
      }}>
        <div className="r" style={{ '--d': 120 }}>
          <Eyebrow color={AQUA} size={22}>La solución</Eyebrow>
        </div>

        <div className="r" style={{ marginTop: 22, display: 'flex', justifyContent: 'center', '--d': 240 }}>
          <GatewayWordmark gateColor="#FFFFFF" wayColor={AQUA} fontSize={116} />
        </div>

        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <GatewayDiagram />
        </div>

        <h2 className="r" style={{
          margin: '34px 0 0', textAlign: 'center',
          color: TXT, fontWeight: 800, fontSize: 44,
          lineHeight: 1.1, letterSpacing: '-0.8px',
          '--d': 900,
        }}>
          Una sola puerta a todo el Instituto.
        </h2>
      </div>

    </div>
  )
}
