import { Eyebrow } from '../../src/components/SuperGraphic.jsx'
import { GatewayMark } from '../../src/components/GatewayMark.jsx'
import { SLIDE_BG, AQUA, TXT, BODY, MUTE, FONT } from '../theme.js'

// Espejo Navy de S07eCierre: mismo mensaje de cierre, editorial sobre tinta.

export default function S07eCierre() {
  return (
    <div style={{
      width: '100%', height: '100%',
      background: SLIDE_BG,
      position: 'relative', overflow: 'hidden',
      fontFamily: FONT,
    }}>

      <div style={{
        position: 'absolute', left: 112, top: '50%',
        transform: 'translateY(-50%)', zIndex: 5, width: 1550,
      }}>
        <div className="r" style={{ '--d': 60 }}>
          <Eyebrow color={AQUA} size={22}>Cierre · Por qué importa</Eyebrow>
        </div>

        <p className="r" style={{
          '--d': 160, margin: '26px 0 0', maxWidth: 1300,
          color: MUTE, fontWeight: 600, fontSize: 26, lineHeight: 1.45,
        }}>
          No hablamos solo de implementar una plataforma o actualizar un sistema.
        </p>

        <p className="r" style={{
          '--d': 280, margin: '20px 0 0', maxWidth: 1350,
          color: BODY, fontWeight: 700, fontSize: 34, lineHeight: 1.35, letterSpacing: '-0.5px',
        }}>
          Hablamos de dejar de ver la capacitación como un requisito aislado — para convertirla en una comunidad digital.
        </p>

        <div className="r" style={{ '--d': 420, marginTop: 36, height: 1.5, width: 120, background: AQUA, boxShadow: `0 0 12px ${AQUA}AA` }} />

        <p className="r" style={{
          '--d': 480, margin: '34px 0 0', maxWidth: 1450,
          color: TXT, fontWeight: 800, fontSize: 46, lineHeight: 1.28, letterSpacing: '-1.2px',
        }}>
          El mejor ecosistema no es el que tiene más módulos obligatorios.
          <br />
          Es el que el talento realmente quiere usar.
        </p>

        <div className="r" style={{ '--d': 700, marginTop: 46, display: 'flex', alignItems: 'center', gap: 16 }}>
          <GatewayMark size={34} color={AQUA} />
          <span style={{ color: BODY, fontWeight: 600, fontSize: 20 }}>
            Instituto Hutchison Ports · el ecosistema digital del colaborador
          </span>
        </div>
      </div>

    </div>
  )
}
