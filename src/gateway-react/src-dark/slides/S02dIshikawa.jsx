import { Eyebrow } from '../../src/components/SuperGraphic.jsx'
import { SLIDE_BG, SKY, AQUA, ORANGE, TXT, BODY, FONT } from '../theme.js'

// Espejo Navy de S02dIshikawa: misma espina de pescado 6M, con lineas
// Horizon luminosas, chips Sky y la cabeza naranja (el color del dolor).

const SPINE_LINE = 'rgba(154,202,235,0.6)'
const BONE_LINE  = 'rgba(154,202,235,0.45)'
const TICK_LINE  = 'rgba(154,202,235,0.32)'

// Geometria identica a la version clara (angulo de marca 30.3).
const ANG     = 1.711
const SPINE_Y = 640
const TOP_Y   = 310
const BOT_Y   = 980
const CHIP_W  = 236
const CHIP_H  = 50
const SLANT   = 14

const ROWS_TOP = [400, 490, 580]
const ROWS_BOT = [710, 800, 890]

const BONES = [
  { cat: 'Mano de obra', xj: 640, side: 'top', causes: [
    { lines: ['Sobrecarga', 'administrativa'], bold: true },
    { lines: ['Roles poco', 'definidos'] },
    { lines: ['Dependencia de', 'procesos manuales'] },
  ]},
  { cat: 'Maquinaria', xj: 1030, side: 'top', causes: [
    { lines: ['Sin plataforma / LMS', 'centralizado'] },
    { lines: ['Limitados a', 'solo SCORM'], bold: true },
  ]},
  { cat: 'Medición', xj: 1420, side: 'top', causes: [
    { lines: ['Sin indicadores', 'de aprendizaje'], bold: true },
    { lines: ['Asistencia y progreso', 'registrados a mano'] },
  ]},
  { cat: 'Métodos', xj: 830, side: 'bot', causes: [
    { lines: ['Inscripción y', 'registro manual'] },
    { lines: ['Capacitación', 'duplicada por grupo'] },
    { lines: ['Comunicación', 'informal y dispersa'], bold: true },
  ]},
  { cat: 'Materiales', xj: 1230, side: 'bot', causes: [
    { lines: ['Contenido desactualizado', 'e inconsistente'], bold: true },
  ]},
]

const HEAD = { x: 1470, y: 545, w: 350, h: 200, slant: 56 }

const boneX = (xj, y) => xj - Math.abs(SPINE_Y - y) / ANG

// Chip de categoria: paralelogramo Sky (en la version clara era Sea).
function CatChip({ cx, cy, label, delay }) {
  const x0 = cx - CHIP_W / 2, x1 = cx + CHIP_W / 2
  const y0 = cy - CHIP_H / 2, y1 = cy + CHIP_H / 2
  const pts = `${x0 + SLANT},${y0} ${x1},${y0} ${x1 - SLANT},${y1} ${x0},${y1}`
  return (
    <g className="r" style={{ '--d': delay }}>
      <polygon points={pts} fill={SKY} />
      <text x={cx} y={cy} textAnchor="middle" dominantBaseline="central"
        fontFamily={FONT} fontSize={19} fontWeight={800} fill="#04122B"
        letterSpacing="1.5" style={{ textTransform: 'uppercase' }}>
        {label.toUpperCase()}
      </text>
    </g>
  )
}

// Causa: tick horizontal hacia el hueso + punto Sky + texto a la izquierda.
function Cause({ bx, y, lines, bold, delay }) {
  return (
    <g className="rf" style={{ '--d': delay }}>
      <line x1={bx} y1={y} x2={bx - 26} y2={y} stroke={TICK_LINE} strokeWidth={1.5} />
      <circle cx={bx} cy={y} r={3.5} fill={SKY} />
      <text textAnchor="end" fontFamily={FONT} fontSize={17}
        fontWeight={bold ? 800 : 600} fill={bold ? TXT : BODY}>
        {lines.map((ln, i) => (
          <tspan key={i} x={bx - 34} y={y + (i - (lines.length - 1) / 2) * 21}
            dominantBaseline="central">{ln}</tspan>
        ))}
      </text>
    </g>
  )
}

export default function S02dIshikawa() {
  const h = HEAD
  const headPts = `${h.x + h.slant},${h.y} ${h.x + h.w},${h.y} ${h.x + h.w - h.slant},${h.y + h.h} ${h.x},${h.y + h.h}`
  const headCx = h.x + h.w / 2
  const spineEnd = h.x + h.slant / 2 - 12

  return (
    <div style={{
      width: '100%', height: '100%',
      background: SLIDE_BG,
      position: 'relative', overflow: 'hidden',
      fontFamily: FONT,
    }}>

      {/* ----- Encabezado ----- */}
      <div style={{ position: 'absolute', left: 112, top: 92, zIndex: 5, width: 1500 }}>
        <div className="r" style={{ '--d': 60 }}>
          <Eyebrow color={AQUA} size={22}>El reto · Diagrama de Ishikawa</Eyebrow>
        </div>
        <h1 className="r" style={{
          margin: '22px 0 0',
          color: TXT, fontWeight: 800,
          fontSize: 62, lineHeight: 1.0,
          letterSpacing: '-2px', textTransform: 'uppercase',
          '--d': 160,
        }}>
          Una misma raíz
        </h1>
      </div>

      {/* ----- Lienzo del diagrama ----- */}
      <svg viewBox="0 0 1920 1080" width="100%" height="100%"
        style={{ position: 'absolute', inset: 0, zIndex: 2, display: 'block' }} aria-hidden>
        <defs>
          <pattern id="s02d-grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M40 0 H0 V40" fill="none" stroke="rgba(154,202,235,0.06)" strokeWidth="1" />
          </pattern>
          <marker id="s02d-arw" viewBox="0 0 10 10" refX="8.5" refY="5"
            markerWidth="8" markerHeight="8" orient="auto-start-reverse">
            <path d="M0,0 L10,5 L0,10 z" fill={SPINE_LINE} />
          </marker>
        </defs>

        {/* rejilla tecnica sutil */}
        <g className="rf" style={{ '--d': 0 }}>
          <rect x="0" y="235" width="1920" height="845" fill="url(#s02d-grid)" />
        </g>

        {/* --- Espina central: se traza hacia la cabeza --- */}
        <g className="rf" style={{ '--d': 260 }}>
          <path id="s02d-spine" className="flow" style={{ '--d': 260 }}
            d={`M 150 ${SPINE_Y} L ${spineEnd} ${SPINE_Y}`} pathLength={1}
            fill="none" stroke={SPINE_LINE} strokeWidth={3}
            strokeLinecap="round" markerEnd="url(#s02d-arw)" />
          {[2300, 3500].map((b) => (
            <circle key={b} r={5} fill={SKY} style={{ filter: 'drop-shadow(0 0 6px rgba(0,155,222,0.9))' }}>
              <animateMotion dur="2.6s" begin={`${b}ms`} repeatCount="indefinite">
                <mpath href="#s02d-spine" />
              </animateMotion>
            </circle>
          ))}
        </g>

        {/* --- Huesos: chip de categoria + linea que fluye a la espina --- */}
        {BONES.map((b, i) => {
          const top   = b.side === 'top'
          const chipY = top ? TOP_Y : BOT_Y
          const y0    = top ? chipY + CHIP_H / 2 + 3 : chipY - CHIP_H / 2 - 3
          const x0    = boneX(b.xj, y0)
          const rows  = top ? ROWS_TOP : ROWS_BOT
          const cd    = 420 + i * 90
          const bd    = cd + 120
          return (
            <g key={b.cat}>
              <CatChip cx={x0} cy={chipY} label={b.cat} delay={cd} />

              <g className="rf" style={{ '--d': bd }}>
                <path id={`s02d-b${i}`} className="flow" style={{ '--d': bd }}
                  d={`M ${x0} ${y0} L ${b.xj} ${SPINE_Y}`} pathLength={1}
                  fill="none" stroke={BONE_LINE} strokeWidth={2.5} strokeLinecap="round" />
                <circle r={4.5} fill={SKY} style={{ filter: 'drop-shadow(0 0 5px rgba(0,155,222,0.9))' }}>
                  <animateMotion dur="1.5s" begin={`${bd + 700}ms`} repeatCount="indefinite">
                    <mpath href={`#s02d-b${i}`} />
                  </animateMotion>
                </circle>
              </g>

              {b.causes.map((c, k) => (
                <Cause key={k} bx={boneX(b.xj, rows[k])} y={rows[k]} lines={c.lines} bold={c.bold}
                  delay={760 + i * 90 + k * 110} />
              ))}
            </g>
          )
        })}

        {/* --- Cabeza: el problema, en naranja (nodo de dolor) --- */}
        <g className="r" style={{ '--d': 1650 }}>
          <polygon points={headPts} fill={ORANGE} />
          <text x={headCx} y={h.y + 42} textAnchor="middle" dominantBaseline="central"
            fontFamily={FONT} fontSize={15} fontWeight={700} fill="rgba(255,255,255,0.85)"
            letterSpacing="3">
            EL PROBLEMA
          </text>
          <text textAnchor="middle" fontFamily={FONT} fontSize={20} fontWeight={800} fill="#fff">
            {['Formación y', 'comunicación interna', 'fragmentada, manual', 'y sin trazabilidad'].map((ln, i) => (
              <tspan key={i} x={headCx} y={h.y + 88 + i * 27} dominantBaseline="central">{ln}</tspan>
            ))}
          </text>
        </g>
      </svg>

    </div>
  )
}
