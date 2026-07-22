import { Eyebrow } from '../../src/components/SuperGraphic.jsx'
import { SLIDE_BG, SKY, AQUA, ORANGE, TXT, BODY, FONT } from '../theme.js'

// Espejo Navy de S02bComunicacion: mismo diagrama de flujo del caos de
// comunicacion (nodos, rutas, cifras), recableado a paneles glass sobre tinta
// con lineas Horizon y puntos de flujo Sky luminosos.

const NODE_LINE = 'rgba(154,202,235,0.45)'
const LINE      = 'rgba(154,202,235,0.32)'
const NODE_FILL = 'rgba(7,36,72,0.85)'

// --- Generadores de ruta (bezier suave, orientacion horizontal / vertical) ---
const H = (x1, y1, x2, y2, k = 0.5) =>
  `M ${x1} ${y1} C ${x1 + (x2 - x1) * k} ${y1} ${x2 - (x2 - x1) * k} ${y2} ${x2} ${y2}`
const V = (x1, y1, x2, y2, k = 0.5) =>
  `M ${x1} ${y1} C ${x1} ${y1 + (y2 - y1) * k} ${x2} ${y2 - (y2 - y1) * k} ${x2} ${y2}`

const CONN = [
  { id: 'c1',  d: H(292.5, 560, 346, 560),        delay: 250,  dur: 1.3 },
  { id: 'c2',  d: H(570, 560, 680, 300, 0.55),    delay: 560,  dur: 2.4 },
  { id: 'c3',  d: H(570, 560, 680, 420, 0.55),    delay: 620,  dur: 2.2 },
  { id: 'c4',  d: H(570, 560, 726, 540, 0.5),     delay: 680,  dur: 1.8 },
  { id: 'c5',  d: H(570, 560, 695, 662, 0.55),    delay: 740,  dur: 2.4 },
  { id: 'c6',  d: H(570, 560, 658, 855, 0.5),     delay: 800,  dur: 2.9 },
  { id: 'c7',  d: H(996, 300, 1181, 515, 0.5),    delay: 1020, dur: 2.4 },
  { id: 'c8',  d: H(996, 420, 1181, 535, 0.5),    delay: 1060, dur: 2.2 },
  { id: 'c9',  d: H(950, 540, 1181, 555, 0.5),    delay: 1100, dur: 2.0 },
  { id: 'c10', d: H(981, 662, 1181, 585, 0.5),    delay: 1140, dur: 2.2 },
  { id: 'c11', d: H(882, 855, 931, 855),          delay: 1080, dur: 1.1 },
  { id: 'c12', d: V(1201, 855, 1300, 638, 0.55),  delay: 1260, dur: 2.4 },
  { id: 'c13', d: V(1431, 515, 1445, 452, 0.6),   delay: 1520, dur: 1.4 },
  { id: 'c14', d: V(1431, 605, 1445, 668, 0.6),   delay: 1560, dur: 1.4 },
  { id: 'c15', d: V(1659, 452, 1722, 514, 0.5),   delay: 1760, dur: 1.4 },
  { id: 'c16', d: V(1659, 668, 1722, 606, 0.5),   delay: 1800, dur: 1.4 },
]

// Texto centrado multilinea dentro de una figura SVG.
function ML({ cx, cy, lines, size, weight = 600, fill = TXT }) {
  const lh = size * 1.15
  const start = cy - (lines.length - 1) * lh / 2
  return (
    <text textAnchor="middle" fontFamily={FONT} fontSize={size} fontWeight={weight} fill={fill}>
      {lines.map((ln, i) => (
        <tspan key={i} x={cx} y={start + i * lh} dominantBaseline="central">{ln}</tspan>
      ))}
    </text>
  )
}

// Nodo-proceso: panel glass redondeado.
function RNode({ x, y, w, h, lines, size = 21, delay, stroke = NODE_LINE, strokeW = 2, fill = NODE_FILL, textFill = TXT, rx = 14 }) {
  return (
    <g className="r" style={{ '--d': delay }}>
      <rect x={x - w / 2} y={y - h / 2} width={w} height={h} rx={rx}
        fill={fill} stroke={stroke} strokeWidth={strokeW} />
      <ML cx={x} cy={y} lines={lines} size={size} fill={textFill} />
    </g>
  )
}

// Nodo-decision / resultado: rombo a la manera de un flujo clasico.
function Diamond({ x, y, hw, hh, lines, size = 22, delay, stroke = NODE_LINE, strokeW = 2, fill = NODE_FILL, textFill = TXT }) {
  const pts = `${x},${y - hh} ${x + hw},${y} ${x},${y + hh} ${x - hw},${y}`
  return (
    <g className="r" style={{ '--d': delay }}>
      <polygon points={pts} fill={fill} stroke={stroke} strokeWidth={strokeW} />
      <ML cx={x} cy={y} lines={lines} size={size} fill={textFill} weight={700} />
    </g>
  )
}

// Etiqueta de canal (Correo / Llamada / Chat) sobre la ruta.
function Tag({ cx, cy, text, delay }) {
  const w = text.length * 9.6 + 24
  return (
    <g className="rf" style={{ '--d': delay }}>
      <rect x={cx - w / 2} y={cy - 15} width={w} height={30} rx={15}
        fill="rgba(7,36,72,0.9)" stroke={LINE} strokeWidth={1} />
      <text x={cx} y={cy} textAnchor="middle" dominantBaseline="central"
        fontFamily={FONT} fontSize={17} fontWeight={600} fill={BODY}>{text}</text>
    </g>
  )
}

// Nodo de consecuencia: cifra grande (dolor) + descriptor.
function CostNode({ x, y, value, label, delay }) {
  const w = 230, h = 100
  return (
    <g className="r" style={{ '--d': delay }}>
      <rect x={x - w / 2} y={y - h / 2} width={w} height={h} rx={14}
        fill="rgba(238,117,35,0.12)" stroke="rgba(238,117,35,0.65)" strokeWidth={2} />
      <text x={x} y={y - 12} textAnchor="middle" dominantBaseline="central"
        fontFamily={FONT} fontSize={40} fontWeight={800} fill={ORANGE}>{value}</text>
      <text x={x} y={y + 22} textAnchor="middle" dominantBaseline="central"
        fontFamily={FONT} fontSize={18} fontWeight={600} fill={BODY}>{label}</text>
    </g>
  )
}

export default function S02bComunicacion() {
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
          <Eyebrow color={AQUA} size={22}>El reto · Soporte al usuario</Eyebrow>
        </div>
        <h1 className="r" style={{
          margin: '22px 0 0',
          color: TXT, fontWeight: 800,
          fontSize: 62, lineHeight: 1.0,
          letterSpacing: '-2px', textTransform: 'uppercase',
          '--d': 160,
        }}>
          Múltiples vías, un cuello de botella
        </h1>
      </div>

      {/* ----- Lienzo del diagrama ----- */}
      <svg viewBox="0 0 1920 1080" width="100%" height="100%"
        style={{ position: 'absolute', inset: 0, zIndex: 2, display: 'block' }} aria-hidden>
        <defs>
          <pattern id="s02b-grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M40 0 H0 V40" fill="none" stroke="rgba(154,202,235,0.06)" strokeWidth="1" />
          </pattern>
          <marker id="s02b-arw" viewBox="0 0 10 10" refX="8.5" refY="5"
            markerWidth="7" markerHeight="7" orient="auto-start-reverse">
            <path d="M0,0 L10,5 L0,10 z" fill="rgba(154,202,235,0.55)" />
          </marker>
        </defs>

        {/* rejilla tecnica sutil */}
        <g className="rf" style={{ '--d': 0 }}>
          <rect x="0" y="235" width="1920" height="845" fill="url(#s02b-grid)" />
        </g>

        {/* --- Conectores: ruta que se traza + punto de flujo viajando --- */}
        {CONN.map((c) => (
          <g className="rf" style={{ '--d': c.delay }} key={c.id}>
            <path id={c.id} className="flow" style={{ '--d': c.delay }} d={c.d} pathLength={1}
              fill="none" stroke={LINE} strokeWidth={2.5} strokeLinecap="round"
              markerEnd="url(#s02b-arw)" />
            <circle r={4.5} fill={SKY} style={{ filter: 'drop-shadow(0 0 5px rgba(0,155,222,0.9))' }}>
              <animateMotion dur={`${c.dur}s`} begin={`${c.delay + 600}ms`} repeatCount="indefinite">
                <mpath href={`#${c.id}`} />
              </animateMotion>
            </circle>
          </g>
        ))}

        {/* --- Etiquetas de canal --- */}
        <Tag cx={632} cy={402} text="Correo"   delay={640} />
        <Tag cx={632} cy={472} text="Correo"   delay={700} />
        <Tag cx={650} cy={536} text="Llamada"  delay={760} />
        <Tag cx={636} cy={602} text="Chat"     delay={820} />
        <Tag cx={614} cy={706} text="Correo"   delay={880} />
        <Tag cx={1232} cy={762} text="Triangulación de info" delay={1340} />

        {/* --- Nodos --- */}
        {/* Origen */}
        <RNode x={185} y={560} w={235} h={116} rx={58} delay={140}
          stroke={AQUA} strokeW={2.5} textFill={TXT}
          lines={['Usuario con duda o', 'problema de acceso']} size={21} />

        {/* Decision */}
        <Diamond x={458} y={560} hw={112} hh={92} delay={340}
          lines={['¿A dónde me', 'comunico?']} size={22} />

        {/* Destinos */}
        <RNode x={838} y={300} w={336} h={70} delay={660}
          lines={['negrete.liliane@tnghph.com.mx']} size={19} />
        <RNode x={838} y={420} w={336} h={70} delay={720}
          lines={['instituto@hutchisonports.com.mx']} size={19} />
        <RNode x={838} y={540} w={240} h={70} delay={780}
          lines={['Ext. 2569 (TNG)']} size={22} />
        <RNode x={838} y={662} w={300} h={70} delay={840}
          lines={['Mensaje vía MS Teams']} size={21} />
        <RNode x={770} y={855} w={240} h={70} delay={960}
          lines={['Recursos Humanos']} size={21} />
        <RNode x={1066} y={855} w={290} h={70} delay={1180}
          lines={['No es el depto. adecuado']} size={19} textFill={BODY} />

        {/* Convergencia: sobrecarga */}
        <RNode x={1306} y={560} w={270} h={156} delay={1300}
          stroke={ORANGE} strokeW={3} fill="rgba(238,117,35,0.10)"
          lines={['Sobrecarga al equipo', 'administrador']} size={22} />

        {/* Consecuencias */}
        <CostNode x={1552} y={452} value="4,547" label="tickets generados" delay={1560} />
        <CostNode x={1552} y={668} value="165 h" label="de retrabajo" delay={1600} />

        {/* Resultado final */}
        <Diamond x={1790} y={560} hw={126} hh={102} delay={1860}
          fill={ORANGE} stroke={ORANGE} textFill="#fff" size={17}
          lines={['Desplazamiento', 'digital', 'ineficiente']} />
      </svg>

    </div>
  )
}
