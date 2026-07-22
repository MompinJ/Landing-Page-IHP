import { DiagonalBand, Eyebrow } from '../../src/components/SuperGraphic.jsx'
import { SLIDE_BG, SKY, AQUA, HORIZON, TXT, BODY, MUTE, FONT } from '../theme.js'

// Espejo Navy de S02Reto: mismos dos frentes, sobre tinta. Los slivers
// diagonales solidos se vuelven bandas de luz al borde derecho.

const DIM = MUTE   // texto del estado "hoy" (apagado a proposito)

const FRONTS = [
  {
    num: '01',
    front: 'Comunicación',
    accent: SKY,
    problem: 'No hay un canal oficial y eficiente.',
    today: [
      'No hay comunidad entre unidades de negocio',
      'La educación no se fomenta bien',
      'Faltan espacios para difundir y expresarse',
    ],
  },
  {
    num: '02',
    front: 'Aprendizaje',
    accent: AQUA,
    problem: 'No hay un entorno propio y moldeable.',
    today: [
      'Una sola forma de aprender',
      'Aprendizaje lento y difícil de medir',
      'No se puede repasar lo ya visto',
    ],
  },
]

function Bullet({ color, children }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
      <span style={{
        width: 13, height: 13, flexShrink: 0,
        background: color, transform: 'skewX(-30.3deg)',
      }} />
      <span style={{ color: DIM, fontWeight: 500, fontSize: 23 }}>{children}</span>
    </div>
  )
}

function Front({ f, i }) {
  const base = 460 + i * 130
  return (
    <div style={{ flex: 1, maxWidth: 700 }}>
      {/* numero + frente */}
      <div className="r" style={{ display: 'flex', alignItems: 'baseline', gap: 16, '--d': base }}>
        <span style={{ color: 'rgba(154,202,235,0.18)', fontWeight: 800, fontSize: 52, lineHeight: 1 }}>
          {f.num}
        </span>
        <span style={{ color: TXT, fontWeight: 800, fontSize: 40, letterSpacing: '-1px' }}>
          {f.front}
        </span>
      </div>

      {/* PROBLEMA: la carencia de raiz */}
      <div className="r" style={{ marginTop: 24, maxWidth: 640, '--d': base + 100 }}>
        <Eyebrow color={f.accent} size={16}>El problema</Eyebrow>
        <p style={{ margin: '12px 0 0', minHeight: 62, color: TXT, fontWeight: 700, fontSize: 29, lineHeight: 1.32, letterSpacing: '-0.5px' }}>
          {f.problem}
        </p>
      </div>

      {/* HOY: como se ve ese problema */}
      <div className="r" style={{ marginTop: 26, '--d': base + 220 }}>
        <Eyebrow color={MUTE} size={16}>Hoy se ve así</Eyebrow>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 16 }}>
          {f.today.map((t) => <Bullet key={t} color={MUTE}>{t}</Bullet>)}
        </div>
      </div>
    </div>
  )
}

export default function S02Reto() {
  return (
    <div style={{
      width: '100%', height: '100%',
      background: SLIDE_BG,
      position: 'relative', overflow: 'hidden',
      fontFamily: FONT,
    }}>

      {/* Bandas de luz diagonales al borde derecho (eco de los slivers claros) */}
      <div className="fig-in" style={{ position: 'absolute', inset: 0, zIndex: 1, opacity: 0.22 }}>
        <DiagonalBand color={HORIZON} topX={2110} width={260} />
      </div>
      <div className="fig-in" style={{ position: 'absolute', inset: 0, zIndex: 2, opacity: 0.5, '--d': 150 }}>
        <DiagonalBand color={SKY} topX={2330} width={120} />
      </div>

      {/* ----- Encabezado ----- */}
      <div style={{ position: 'absolute', left: 112, top: 104, zIndex: 5, width: 1400 }}>
        <div className="r" style={{ '--d': 120 }}>
          <Eyebrow color={AQUA} size={22}>El reto · La problemática</Eyebrow>
        </div>
        <h1 className="r" style={{
          margin: '22px 0 0',
          color: TXT, fontWeight: 800,
          fontSize: 76, lineHeight: 1.0,
          letterSpacing: '-2.5px', textTransform: 'uppercase',
          '--d': 240,
        }}>
          2 frentes
        </h1>
      </div>

      {/* ----- Dos frentes: problema -> respuesta ----- */}
      <div style={{
        position: 'absolute', left: 112, top: 340, width: 1540, zIndex: 5,
        display: 'flex', gap: 84,
      }}>
        {FRONTS.map((f, i) => <Front key={f.num} f={f} i={i} />)}
      </div>

    </div>
  )
}
