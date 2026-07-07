import { Eyebrow } from '../components/SuperGraphic.jsx'
import logoHP from '../../assets/hutchisonports-color.png'
import logoInstituto from '../../assets/LogoInstitutoHP-azul.png'

// Cronograma del proyecto (Gantt): 5 fases estilo PDCA de febrero a julio.
// Cada fase lleva su chip de color de marca, su objetivo condensado y su
// entregable; las actividades son barras con corte diagonal 30.3 que crecen
// al entrar (clase .sg). Una linea punteada naranja marca "hoy".

const SEA    = '#002E6D'
const SKY    = '#009BDE'
const AQUA   = '#54BBAB'
const AQUAD  = '#2BA697'
const YELLOW = '#FFC627'
const ORANGE = '#EE7523'
const BODY   = '#41607F'
const MUTE   = '#7E96B6'
const FONT   = "'Montserrat', Arial, sans-serif"

// ----- Geometria -----
const LABEL_W = 412            // columna de actividades
const CHART_W = 1696           // ancho total del bloque
const TL_W    = CHART_W - LABEL_W
const N_COLS  = 23             // semanas: FEB S2 ... JUL S4
const COL_W   = TL_W / N_COLS
const ROW_H   = 22
const PH_H    = 28
const HEAD_H  = 38

// Meses y cuantas semanas abarca cada uno (arranca en FEB S2)
const MONTHS = [
  { name: 'Febrero', weeks: 3, s0: 2 },
  { name: 'Marzo',   weeks: 4, s0: 1 },
  { name: 'Abril',   weeks: 4, s0: 1 },
  { name: 'Mayo',    weeks: 4, s0: 1 },
  { name: 'Junio',   weeks: 4, s0: 1 },
  { name: 'Julio',   weeks: 4, s0: 1 },
]

// Columna donde va la linea de "hoy" (JUL S1 = col 19). null para ocultarla.
const TODAY_COL = 19

// Fases con actividades: s / e = columna inicial y final (inclusive)
const PHASES = [
  {
    name: 'Documentación de soporte', color: SEA,
    objetivo: 'Literatura de respaldo: actividades, mejora continua y riesgos',
    entregable: 'Documentación inicial técnica y operativa',
    acts: [
      { t: 'Análisis de riesgos', s: 0, e: 0 },
      { t: 'Analizar plataformas similares', s: 0, e: 1 },
      { t: 'Documentación de ADRs iniciales', s: 1, e: 2 },
      { t: 'Investigación de microservicios', s: 2, e: 2 },
      { t: 'Reporte compatible con el Agente IA', s: 2, e: 2 },
    ],
  },
  {
    name: 'Hacer', color: SKY,
    objetivo: 'Construir el entorno y la experiencia de usuario para salir al público',
    entregable: 'Servicio desplegado en Azure, abierto al público',
    acts: [
      { t: 'Creación de los repositorios', s: 2, e: 3 },
      { t: 'Crear mock-up inicial', s: 3, e: 3 },
      { t: 'Definición de lógica de negocio inicial', s: 3, e: 4 },
      { t: 'Levantar el entorno local', s: 3, e: 4 },
      { t: 'Inicialización del código', s: 4, e: 5 },
      { t: 'Creación del frontend', s: 3, e: 17 },
      { t: 'Creación del API Gateway', s: 5, e: 10 },
      { t: 'Codificar permisos y roles', s: 8, e: 10 },
      { t: 'Seguridad del backend', s: 9, e: 11 },
      { t: 'Seguridad del frontend', s: 10, e: 12 },
      { t: 'Comunicación con Smart Reports', s: 10, e: 12 },
      { t: 'Creación de Comunidad HP', s: 10, e: 17 },
    ],
  },
  {
    name: 'Corroborar', color: AQUA,
    objetivo: 'Verificar lo entregado como un MVP',
    entregable: 'Funcionalidad corroborada en la nube',
    acts: [
      { t: 'Pruebas, validación funcional y correcciones', s: 17, e: 19 },
      { t: 'Verificar alcance y ambiente de usuario', s: 19, e: 19 },
      { t: 'Pruebas a personal limitado', s: 18, e: 22 },
    ],
  },
  {
    name: 'Verificar', color: YELLOW,
    objetivo: 'Comprobar el funcionamiento total del sistema',
    entregable: 'Eficacia del sistema verificada',
    acts: [
      { t: 'Ejecución de pruebas automatizadas', s: 20, e: 20 },
      { t: 'Comparación de indicadores (gestión y errores)', s: 20, e: 20 },
    ],
  },
  {
    name: 'Actuar', color: ORANGE,
    objetivo: 'Lecciones aprendidas, mejora continua y mantenimiento',
    entregable: 'Documentación final',
    acts: [
      { t: 'Revisión del ciclo completo del proyecto', s: 20, e: 20 },
      { t: 'Plan de mantenimiento y respaldo', s: 20, e: 20 },
      { t: 'Roadmap de mejoras e integraciones', s: 20, e: 21 },
      { t: 'Capacitación final a usuarios', s: 21, e: 21 },
      { t: 'Reporte final', s: 22, e: 22 },
    ],
  },
]

// Corte diagonal de las barras y chips (familia visual de la marca)
const BAR_CLIP  = 'polygon(9px 0, 100% 0, calc(100% - 9px) 100%, 0 100%)'
const CHIP_CLIP = 'polygon(8px 0, 100% 0, calc(100% - 8px) 100%, 0 100%)'

function PhaseHeader({ p, delay }) {
  const darkText = p.color === YELLOW
  return (
    <div className="r" style={{
      '--d': delay,
      height: PH_H, display: 'flex', alignItems: 'center', gap: 16,
      marginTop: 3,
    }}>
      <div style={{
        background: p.color, color: darkText ? SEA : '#fff',
        fontWeight: 800, fontSize: 13, letterSpacing: '1px',
        textTransform: 'uppercase', padding: '4px 18px', clipPath: CHIP_CLIP,
        flexShrink: 0,
      }}>
        {p.name}
      </div>
      <span style={{ color: MUTE, fontWeight: 500, fontSize: 12.5, flex: 1 }}>
        {p.objetivo}
      </span>
      <span style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        <span style={{
          width: 9, height: 9, background: p.color,
          transform: 'skewX(-30.3deg)', display: 'inline-block',
        }} />
        <span style={{ color: SEA, fontWeight: 700, fontSize: 12.5 }}>
          {p.entregable}
        </span>
      </span>
    </div>
  )
}

function ActivityRow({ act, color, delay }) {
  const left  = act.s * COL_W
  const width = (act.e - act.s + 1) * COL_W - 5
  return (
    <div style={{
      height: ROW_H, display: 'flex', alignItems: 'center',
      borderBottom: '1px solid rgba(0,46,109,0.05)',
    }}>
      <div className="r" style={{
        '--d': delay,
        width: LABEL_W, paddingRight: 18, flexShrink: 0,
        textAlign: 'right', color: BODY, fontWeight: 500, fontSize: 13,
        whiteSpace: 'nowrap', overflow: 'hidden',
      }}>
        {act.t}
      </div>
      <div style={{ position: 'relative', flex: 1, height: '100%' }}>
        <div className="sg" style={{
          '--d': delay + 140,
          position: 'absolute', left, top: (ROW_H - 15) / 2,
          width, height: 15,
          background: color, clipPath: BAR_CLIP,
        }} />
      </div>
    </div>
  )
}

export default function S07bCronograma() {
  // Delays escalonados con un contador global de renglones
  let row = 0
  const rowDelay = () => 380 + (row++) * 34

  // Posiciones x acumuladas de los meses
  let acc = 0
  const monthX = MONTHS.map((m) => { const x = acc; acc += m.weeks; return x })

  return (
    <div style={{
      width: '100%', height: '100%',
      background: '#ffffff',
      position: 'relative', overflow: 'hidden',
      fontFamily: FONT,
    }}>

      {/* ----- Encabezado ----- */}
      <div style={{ position: 'absolute', left: 112, top: 74, zIndex: 5, width: 1500 }}>
        <div className="r" style={{ '--d': 60 }}>
          <Eyebrow color={AQUAD} size={20}>El plan · Cronograma 2026</Eyebrow>
        </div>
        <h1 className="r" style={{
          margin: '16px 0 0',
          color: SEA, fontWeight: 800,
          fontSize: 54, lineHeight: 1.0,
          letterSpacing: '-1.8px', textTransform: 'uppercase',
          '--d': 160,
        }}>
          Cinco fases, seis meses
        </h1>
      </div>

      {/* ----- Gantt ----- */}
      <div style={{ position: 'absolute', left: 112, top: 206, width: CHART_W, zIndex: 4 }}>

        {/* Cabecera de meses + semanas (solo zona de timeline) */}
        <div className="r" style={{ '--d': 240, position: 'relative', marginLeft: LABEL_W, height: HEAD_H }}>
          {MONTHS.map((m, i) => (
            <div key={m.name} style={{
              position: 'absolute', left: monthX[i] * COL_W, width: m.weeks * COL_W,
              top: 0, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: SEA, fontWeight: 700, fontSize: 13.5, letterSpacing: '1.5px',
              textTransform: 'uppercase',
            }}>
              {m.name}
            </div>
          ))}
          {Array.from({ length: N_COLS }, (_, c) => {
            const m = MONTHS.findIndex((_, i) => c >= monthX[i] && c < monthX[i] + MONTHS[i].weeks)
            const sNum = MONTHS[m].s0 + (c - monthX[m])
            return (
              <div key={c} style={{
                position: 'absolute', left: c * COL_W, width: COL_W, top: 22, height: 16,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: MUTE, fontWeight: 600, fontSize: 9.5,
              }}>
                S{sNum}
              </div>
            )
          })}
        </div>

        {/* Overlay de rejilla: rayas de mes alternadas + lineas de semana + hoy */}
        <div className="rf" style={{
          '--d': 300,
          position: 'absolute', left: LABEL_W, top: HEAD_H, right: 0,
          height: PHASES.reduce((h, p) => h + PH_H + 3 + p.acts.length * ROW_H, 0),
          pointerEvents: 'none',
        }}>
          {MONTHS.map((m, i) => i % 2 === 1 && (
            <div key={m.name} style={{
              position: 'absolute', left: monthX[i] * COL_W, width: m.weeks * COL_W,
              top: 0, bottom: 0, background: 'rgba(0,46,109,0.035)',
            }} />
          ))}
          {Array.from({ length: N_COLS + 1 }, (_, c) => {
            const isMonth = MONTHS.some((_, i) => monthX[i] === c) || c === N_COLS
            return (
              <div key={c} style={{
                position: 'absolute', left: c * COL_W, top: 0, bottom: 0,
                borderLeft: `1px solid rgba(0,46,109,${isMonth ? 0.14 : 0.055})`,
              }} />
            )
          })}
          {TODAY_COL != null && (
            <div style={{
              position: 'absolute', left: (TODAY_COL + 0.5) * COL_W, top: -6, bottom: -20,
              borderLeft: `2px dashed ${ORANGE}`,
            }}>
              <span style={{
                position: 'absolute', bottom: 0, left: 6,
                color: ORANGE, fontWeight: 800, fontSize: 10.5, letterSpacing: '1.5px',
              }}>
                HOY
              </span>
            </div>
          )}
        </div>

        {/* Fases y actividades */}
        {PHASES.map((p) => (
          <div key={p.name}>
            <PhaseHeader p={p} delay={rowDelay()} />
            {p.acts.map((a) => (
              <ActivityRow key={a.t} act={a} color={p.color} delay={rowDelay()} />
            ))}
          </div>
        ))}
      </div>

      {/* ----- Logos (mini, abajo a la derecha) ----- */}
      <div className="r" style={{
        position: 'absolute', zIndex: 6, bottom: 12, right: 104,
        display: 'flex', alignItems: 'center', gap: 22, '--d': 1700,
      }}>
        <img src={logoInstituto} alt="Instituto Hutchison Ports"
          style={{ height: 28, objectFit: 'contain', display: 'block' }} />
        <img src={logoHP} alt="Hutchison Ports"
          style={{ height: 52, objectFit: 'contain', display: 'block' }} />
      </div>

    </div>
  )
}
