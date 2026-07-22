import { Eyebrow } from '../../src/components/SuperGraphic.jsx'
import { SLIDE_BG, AQUA, TXT, BODY, LINE_S, FONT } from '../theme.js'

// Espejo Navy de S02Contexto: mismo contenido editorial, sobre tinta.

function Bullet({ children, delay }) {
  return (
    <p className="r" style={{
      '--d': delay, margin: 0,
      color: TXT, fontWeight: 700, fontSize: 34, lineHeight: 1.3, letterSpacing: '-0.5px',
    }}>
      {children}
    </p>
  )
}

const BLOCKS = [
  {
    key: 'hoy',
    items: [
      'Aprendizaje personalizado para cada colaborador.',
      'Menos carga administrativa, procesos más ágiles.',
    ],
  },
  {
    key: 'horizonte',
    items: [
      'Mayor cobertura y participación de los colaboradores.',
      'Competencias críticas desarrolladas más rápido.',
    ],
  },
]

function Block({ b, i }) {
  const base = 620 + i * 100
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 34 }}>
      {b.items.map((it, k) => (
        <Bullet key={it} delay={base + k * 90}>{it}</Bullet>
      ))}
    </div>
  )
}

export default function S02Contexto() {
  return (
    <div style={{
      width: '100%', height: '100%',
      background: SLIDE_BG,
      position: 'relative', overflow: 'hidden',
      fontFamily: FONT,
    }}>

      {/* ----- Encabezado ----- */}
      <div style={{ position: 'absolute', left: 112, top: 92, zIndex: 5, width: 1696 }}>
        <div className="r" style={{ '--d': 60 }}>
          <Eyebrow color={AQUA} size={22}>Contexto · Instituto Hutchison Ports</Eyebrow>
        </div>
        <h1 className="r" style={{
          margin: '18px 0 0',
          color: TXT, fontWeight: 800,
          fontSize: 50, lineHeight: 1.05,
          letterSpacing: '-1.6px', textTransform: 'uppercase',
          '--d': 160,
        }}>
          El porqué del Instituto
        </h1>
      </div>

      {/* ----- Cuerpo ----- */}
      <div style={{ position: 'absolute', left: 112, top: 262, width: 1696, zIndex: 5 }}>
        <p className="r" style={{
          '--d': 280, margin: 0, maxWidth: 1550,
          color: TXT, fontWeight: 700, fontSize: 28, lineHeight: 1.3, letterSpacing: '-0.3px',
        }}>
          El Instituto Hutchison Ports surge de la necesidad de homologar la cultura organizacional.
        </p>

        <p className="r" style={{
          '--d': 380, margin: '20px 0 0', maxWidth: 1550,
          color: BODY, fontWeight: 500, fontSize: 24, lineHeight: 1.5,
        }}>
          Además, busca recolectar todo el <strong style={{ color: TXT }}>conocimiento</strong> y{' '}
          <strong style={{ color: TXT }}>experiencia</strong> que los colaboradores han adquirido a lo
          largo de su <strong style={{ color: TXT }}>trayectoria</strong> laboral, para formar a las siguientes{' '}
          <strong style={{ color: TXT }}>generaciones</strong> y que estas puedan afrontar
          los retos actuales y futuros de la industria. Es por esto que el Instituto requiere contar con{' '}
          <strong style={{ color: TXT }}>herramientas</strong> tecnológicas que permitan ofrecer{' '}
          <strong style={{ color: TXT }}>experiencias</strong> de aprendizaje más eficientes y accesibles.
        </p>

        {/* ----- Puntos: hoy / hacia donde vamos ----- */}
        <div className="r" style={{ '--d': 560, marginTop: 30, height: 1.5, width: 1550, background: LINE_S }} />

        <div style={{
          marginTop: 30, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 90, width: 1550,
        }}>
          {BLOCKS.map((b, i) => <Block key={b.key} b={b} i={i} />)}
        </div>


      </div>

    </div>
  )
}
