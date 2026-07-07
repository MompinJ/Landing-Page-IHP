import { Eyebrow } from '../components/SuperGraphic.jsx'
import logoHP from '../../assets/hutchisonports-color.png'
import logoInstituto from '../../assets/LogoInstitutoHP-azul.png'

// Diagrama de flujo del caos de comunicacion: un usuario con una duda dispara
// multiples vias (correos, llamada, chat, RH) que triangulan y sobrecargan al
// equipo administrador -> 4,547 tickets y 165 h de retrabajo -> desplazamiento
// digital ineficiente. Todo en lenguaje HP: paneles planos, paleta de marca,
// rutas que se trazan y puntos de "flujo" viajando de origen a destino.

const SEA     = '#002E6D'
const SKY     = '#009BDE'
const AQUAD   = '#2BA697'
const ORANGE  = '#EE7523'
const BODY    = '#41607F'
const FONT    = "'Montserrat', Arial, sans-serif"

const NODE_LINE = 'rgba(0,46,109,0.42)'
const LINE      = 'rgba(0,46,109,0.30)'

// --- Generadores de ruta (bezier suave, orientacion horizontal / vertical) ---
const H = (x1, y1, x2, y2, k = 0.5) =>
  `M ${x1} ${y1} C ${x1 + (x2 - x1) * k} ${y1} ${x2 - (x2 - x1) * k} ${y2} ${x2} ${y2}`
const V = (x1, y1, x2, y2, k = 0.5) =>
  `M ${x1} ${y1} C ${x1} ${y1 + (y2 - y1) * k} ${x2} ${y2 - (y2 - y1) * k} ${x2} ${y2}`

// Conectores: id (para el mpath del punto), ruta, retraso de entrada y duracion
// del recorrido del punto (mayor = ruta mas larga, para velocidad pareja).
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
function ML({ cx, cy, lines, size, weight = 600, fill = SEA }) {
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

// Nodo-proceso: panel plano redondeado (sin sombra).
function RNode({ x, y, w, h, lines, size = 19, delay, stroke = NODE_LINE, strokeW = 2, fill = '#fff', textFill = SEA, rx = 14 }) {
  return (
    <g className="r" style={{ '--d': delay }}>
      <rect x={x - w / 2} y={y - h / 2} width={w} height={h} rx={rx}
        fill={fill} stroke={stroke} strokeWidth={strokeW} />
      <ML cx={x} cy={y} lines={lines} size={size} fill={textFill} />
    </g>
  )
}

// Nodo-decision / resultado: rombo a la manera de un flujo clasico.
function Diamond({ x, y, hw, hh, lines, size = 20, delay, stroke = NODE_LINE, strokeW = 2, fill = '#fff', textFill = SEA }) {
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
  const w = text.length * 8.6 + 22
  return (
    <g className="rf" style={{ '--d': delay }}>
      <rect x={cx - w / 2} y={cy - 15} width={w} height={30} rx={15}
        fill="#fff" stroke={LINE} strokeWidth={1} />
      <text x={cx} y={cy} textAnchor="middle" dominantBaseline="central"
        fontFamily={FONT} fontSize={15} fontWeight={600} fill={BODY}>{text}</text>
    </g>
  )
}

// Nodo de consecuencia: cifra grande (dolor) + descriptor.
function CostNode({ x, y, value, label, delay }) {
  const w = 214, h = 96
  return (
    <g className="r" style={{ '--d': delay }}>
      <rect x={x - w / 2} y={y - h / 2} width={w} height={h} rx={14}
        fill="rgba(238,117,35,0.06)" stroke="rgba(238,117,35,0.55)" strokeWidth={2} />
      <text x={x} y={y - 12} textAnchor="middle" dominantBaseline="central"
        fontFamily={FONT} fontSize={38} fontWeight={800} fill={ORANGE}>{value}</text>
      <text x={x} y={y + 22} textAnchor="middle" dominantBaseline="central"
        fontFamily={FONT} fontSize={16} fontWeight={600} fill={BODY}>{label}</text>
    </g>
  )
}

export default function S02bComunicacion() {
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
          <Eyebrow color={AQUAD} size={22}>El reto · Soporte al usuario</Eyebrow>
        </div>
        <h1 className="r" style={{
          margin: '22px 0 0',
          color: SEA, fontWeight: 800,
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
            <path d="M40 0 H0 V40" fill="none" stroke="rgba(0,46,109,0.05)" strokeWidth="1" />
          </pattern>
          <marker id="s02b-arw" viewBox="0 0 10 10" refX="8.5" refY="5"
            markerWidth="7" markerHeight="7" orient="auto-start-reverse">
            <path d="M0,0 L10,5 L0,10 z" fill="rgba(0,46,109,0.5)" />
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
            <circle r={4.5} fill={SKY}>
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
        <RNode x={185} y={560} w={215} h={116} rx={58} delay={140}
          stroke={AQUAD} strokeW={2.5} textFill={SEA}
          lines={['Usuario con duda o', 'problema de acceso']} size={19} />

        {/* Decision */}
        <Diamond x={458} y={560} hw={112} hh={92} delay={340}
          lines={['¿A dónde me', 'comunico?']} size={20} />

        {/* Destinos */}
        <RNode x={838} y={300} w={316} h={70} delay={660}
          lines={['negrete.liliane@tnghph.com.mx']} size={18} />
        <RNode x={838} y={420} w={316} h={70} delay={720}
          lines={['instituto@hutchisonports.com.mx']} size={18} />
        <RNode x={838} y={540} w={224} h={70} delay={780}
          lines={['Ext. 2569 (TNG)']} size={20} />
        <RNode x={838} y={662} w={286} h={70} delay={840}
          lines={['Mensaje vía MS Teams']} size={19} />
        <RNode x={770} y={855} w={224} h={70} delay={960}
          lines={['Recursos Humanos']} size={19} />
        <RNode x={1066} y={855} w={270} h={70} delay={1180}
          lines={['No es el depto. adecuado']} size={18} textFill={BODY} />

        {/* Convergencia: sobrecarga */}
        <RNode x={1306} y={560} w={250} h={156} delay={1300}
          stroke={ORANGE} strokeW={3} fill="rgba(238,117,35,0.05)"
          lines={['Sobrecarga al equipo', 'administrador']} size={22} />

        {/* Consecuencias */}
        <CostNode x={1552} y={452} value="4,547" label="tickets generados" delay={1560} />
        <CostNode x={1552} y={668} value="165 h" label="de retrabajo" delay={1600} />

        {/* Resultado final */}
        <Diamond x={1790} y={560} hw={118} hh={102} delay={1860}
          fill={ORANGE} stroke={ORANGE} textFill="#fff" size={16}
          lines={['Desplazamiento', 'digital', 'ineficiente']} />
      </svg>

      {/* ----- Logos (esquina inferior derecha, area libre bajo el rombo) ----- */}
      <div className="r" style={{
        position: 'absolute', zIndex: 6, bottom: 48, right: 104,
        display: 'flex', alignItems: 'center', gap: 30, '--d': 2000,
      }}>
        <img src={logoInstituto} alt="Instituto Hutchison Ports"
          style={{ height: 40, objectFit: 'contain', display: 'block' }} />
        <img src={logoHP} alt="Hutchison Ports"
          style={{ height: 78, objectFit: 'contain', display: 'block' }} />
      </div>

    </div>
  )
}
