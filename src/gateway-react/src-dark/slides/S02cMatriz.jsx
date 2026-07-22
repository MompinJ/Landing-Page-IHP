import { Eyebrow } from '../../src/components/SuperGraphic.jsx'
import { SLIDE_BG, SKY, AQUA, AQUA_D, ORANGE, TXT, BODY, FONT } from '../theme.js'

// Espejo Navy de S02cMatriz: misma matriz 4W+2H, con filas glass sobre tinta,
// chips Sky (4W) / Aqua (2H) y la columna de frecuencia en naranja.

const COLS    = '336px 260px 260px 260px 260px 260px'
const COL_GAP = 12
const ROW_H   = 82

const HEADERS = [
  { label: '¿Qué sucede?',           w: true },
  { label: '¿A quién le sucede?',    w: true },
  { label: '¿Cuándo sucede?',        w: true },
  { label: '¿Dónde sucede?',         w: true },
  { label: '¿Cómo sucede?',          w: false },
  { label: '¿Cuántas veces?',        w: false },
]

const ROWS = [
  {
    que: 'Se duplica y rehace el mismo soporte para cada grupo',
    quien: 'Docentes, expertos de contenido y coordinadores',
    cuando: 'Con cada curso o grupo nuevo',
    donde: 'Área de capacitación / Instituto',
    como: 'Dudas ya planteadas y resueltas se repiten en cada curso',
    cuantas: 'Cada grupo / sesión',
  },
  {
    que: 'Flujo ineficiente de la información digital',
    quien: '1,543 colaboradores y administradores de canales',
    cuando: 'En cada envío y atención de tickets',
    donde: 'Correos administradores y canales de atención',
    como: 'Enrutamiento de tickets dividido entre correos',
    cuantas: '7,540 errores de envío · 4,547 tickets',
    figura: true,
  },
  {
    que: 'Talento y conocimiento técnico estancado y aislado',
    quien: 'Quienes necesitan ese conocimiento (manuales ICAVE, TNG)',
    cuando: 'Al requerir información de otra unidad',
    donde: 'Local en cada unidad de negocio',
    como: 'El conocimiento se queda local, sin aprovecharse por todos',
    cuantas: 'Permanente (estructural)',
  },
  {
    que: 'Tiempos muertos esperando validaciones y respuestas',
    quien: 'Alumnos y docentes',
    cuando: 'Entre solicitud y entrega de cada trámite',
    donde: 'En el Instituto',
    como: 'Validaciones y comunicaciones manuales, no inmediatas',
    cuantas: 'Cada inscripción, entrega y evaluación',
  },
  {
    que: 'Pasos administrativos redundantes',
    quien: 'Personal administrativo y coordinadores',
    cuando: 'Al inicio y cierre de cada curso',
    donde: 'Gestión académica del Instituto',
    como: 'Captura manual repetida y reportes armados a mano',
    cuantas: 'Cada curso / grupo',
  },
  {
    que: 'Errores por información desactualizada; recaptura de datos',
    quien: 'Alumnos, docentes y administradores',
    cuando: 'Al detectar datos o contenido inconsistente',
    donde: 'Registros y materiales de los cursos',
    como: 'Sin fuente única de verdad: se repite o corrige el trabajo',
    cuantas: 'Cada vez que se detecta un error',
  },
  {
    que: 'Personas buscando información en múltiples sistemas',
    quien: 'Todos los usuarios',
    cuando: 'Cada vez que necesitan un dato',
    donde: 'Múltiples sistemas y ubicaciones separadas',
    como: 'Búsqueda manual en herramientas no integradas',
    cuantas: 'Varias veces al día',
  },
]

const CHIP_CLIP = 'polygon(12px 0, 100% 0, calc(100% - 12px) 100%, 0 100%)'

function GroupBand({ children, color, bg, delay }) {
  return (
    <div className="r" style={{
      '--d': delay,
      height: 30, background: bg, clipPath: CHIP_CLIP,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color, fontWeight: 700, fontSize: 14, letterSpacing: '2.5px',
      textTransform: 'uppercase',
    }}>
      {children}
    </div>
  )
}

// Encabezado de columna: chip solido (Sky para las 4W, Aqua para las 2H)
// con texto tinta — los chips son la luz de la slide.
function HeaderChip({ label, w, delay }) {
  return (
    <div className="r" style={{
      '--d': delay,
      height: 46, background: w ? SKY : AQUA_D, clipPath: CHIP_CLIP,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: '#04122B', fontWeight: 700, fontSize: 17, letterSpacing: '-0.2px',
    }}>
      {label}
    </div>
  )
}

function Cell({ children, style }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', justifyContent: 'center',
      padding: '6px 14px',
      color: BODY, fontWeight: 500, fontSize: 16, lineHeight: 1.26,
      ...style,
    }}>
      <span>{children}</span>
    </div>
  )
}

function Row({ r, i }) {
  const num = String(i + 1).padStart(2, '0')
  return (
    <div className="r" style={{
      '--d': 520 + i * 100,
      display: 'grid', gridTemplateColumns: COLS, columnGap: COL_GAP,
      height: ROW_H,
      background: 'rgba(154,202,235,0.05)',
      border: '1.5px solid rgba(154,202,235,0.16)', borderRadius: 12,
      overflow: 'hidden',
    }}>
      {/* Que sucede: la celda lider, numerada */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 13,
        padding: '6px 14px 6px 16px',
        background: 'rgba(154,202,235,0.06)',
        borderRight: '1.5px solid rgba(154,202,235,0.12)',
      }}>
        <span style={{ color: 'rgba(154,202,235,0.28)', fontWeight: 800, fontSize: 26, lineHeight: 1, flexShrink: 0 }}>
          {num}
        </span>
        <span style={{ color: TXT, fontWeight: 700, fontSize: 17, lineHeight: 1.2, letterSpacing: '-0.2px' }}>
          {r.que}
        </span>
      </div>

      <Cell>{r.quien}</Cell>
      <Cell>{r.cuando}</Cell>
      <Cell>{r.donde}</Cell>
      <Cell>{r.como}</Cell>

      {/* Cuantas veces: frecuencia del dolor, con tinte naranja */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '6px 14px 6px 16px',
        background: 'rgba(238,117,35,0.12)',
        borderLeft: '1.5px solid rgba(238,117,35,0.45)',
      }}>
        <span style={{
          width: 11, height: 11, flexShrink: 0,
          background: ORANGE, transform: 'skewX(-30.3deg)',
        }} />
        <span style={{
          color: TXT, fontWeight: r.figura ? 800 : 700,
          fontSize: 16, lineHeight: 1.24,
        }}>
          {r.cuantas}
        </span>
      </div>
    </div>
  )
}

export default function S02cMatriz() {
  const w4 = 336 + 260 * 3 + COL_GAP * 3
  const w2 = 260 * 2 + COL_GAP

  return (
    <div style={{
      width: '100%', height: '100%',
      background: SLIDE_BG,
      position: 'relative', overflow: 'hidden',
      fontFamily: FONT,
    }}>

      {/* Rejilla tecnica sutil, continuidad con el diagrama de flujo */}
      <svg viewBox="0 0 1920 1080" width="100%" height="100%"
        style={{ position: 'absolute', inset: 0, zIndex: 1, display: 'block' }} aria-hidden>
        <defs>
          <pattern id="s02c-grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M40 0 H0 V40" fill="none" stroke="rgba(154,202,235,0.06)" strokeWidth="1" />
          </pattern>
        </defs>
        <g className="rf" style={{ '--d': 0 }}>
          <rect x="0" y="235" width="1920" height="845" fill="url(#s02c-grid)" />
        </g>
      </svg>

      {/* ----- Encabezado ----- */}
      <div style={{ position: 'absolute', left: 112, top: 92, zIndex: 5, width: 1500 }}>
        <div className="r" style={{ '--d': 60 }}>
          <Eyebrow color={AQUA} size={22}>El reto · Matriz 4W + 2H</Eyebrow>
        </div>
        <h1 className="r" style={{
          margin: '22px 0 0',
          color: TXT, fontWeight: 800,
          fontSize: 62, lineHeight: 1.0,
          letterSpacing: '-2px', textTransform: 'uppercase',
          '--d': 160,
        }}>
          Siete dolores, seis preguntas
        </h1>
      </div>

      {/* ----- Matriz ----- */}
      <div style={{ position: 'absolute', left: 112, top: 250, width: 1696, zIndex: 5 }}>

        {/* Bandas de grupo: 4W / 2H */}
        <div style={{ display: 'grid', gridTemplateColumns: `${w4}px ${w2}px`, columnGap: COL_GAP }}>
          <GroupBand color={SKY} bg="rgba(0,155,222,0.14)" delay={240}>
            4W · El problema y su contexto
          </GroupBand>
          <GroupBand color={AQUA} bg="rgba(43,166,151,0.18)" delay={300}>
            2H · Mecánica y frecuencia
          </GroupBand>
        </div>

        {/* Encabezados de columna */}
        <div style={{
          display: 'grid', gridTemplateColumns: COLS, columnGap: COL_GAP,
          marginTop: 8,
        }}>
          {HEADERS.map((h, i) => (
            <HeaderChip key={h.label} label={h.label} w={h.w} delay={340 + i * 40} />
          ))}
        </div>

        {/* Filas: un dolor por fila */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 10 }}>
          {ROWS.map((r, i) => <Row key={r.que} r={r} i={i} />)}
        </div>
      </div>

    </div>
  )
}
