import { GatewayMark, GatewayWordmark } from '../components/GatewayMark.jsx'
import logoHP from '../../assets/hutchisonports-color.png'
import logoInstituto from '../../assets/LogoInstitutoHP-azul.png'

// Cierre: gracias. Espejo de la portada (mismas formas Horizon/Aqua y el
// isotipo Gateway) para que el deck abra y cierre con la misma imagen.

const SEA  = '#002E6D'
const AQUA = '#54BBAB'
const BODY = '#41607F'
const FONT = "'Montserrat', Arial, sans-serif"

export default function S09Gracias() {
  return (
    <div style={{
      width: '100%', height: '100%',
      background: '#ffffff',
      position: 'relative', overflow: 'hidden',
      fontFamily: FONT,
    }}>

      {/* Shapes de la portada: Horizon + Aqua */}
      <div className="fig-in" style={{
        position: 'absolute', inset: 0, zIndex: 1, pointerEvents: 'none',
        background: '#9ACAEB',
        clipPath: 'polygon(50% 0, 100% 0, 100% 42%, 48% 62%)',
      }} />
      <div className="fig-in" style={{
        position: 'absolute', inset: 0, zIndex: 2, pointerEvents: 'none',
        background: AQUA,
        clipPath: 'polygon(75% 20%, 100% 8%, 100% 48%, 75% 60%)',
        '--d': 160,
      }} />

      {/* Cuerpo: isotipo + gracias */}
      <div style={{
        position: 'absolute',
        left: 112, top: '50%',
        transform: 'translateY(-50%)',
        zIndex: 6,
        display: 'flex', flexDirection: 'column', gap: 26,
      }}>
        <div className="r" style={{ '--d': 300 }}>
          <GatewayMark size={230} color={AQUA} />
        </div>
        <h1 className="r" style={{
          margin: 0, color: SEA, fontWeight: 800,
          fontSize: 170, lineHeight: 0.95,
          letterSpacing: '-7px', textTransform: 'uppercase',
          '--d': 440,
        }}>
          Gracias
        </h1>
        <div className="r" style={{ '--d': 580, display: 'flex', alignItems: 'center', gap: 18 }}>
          <GatewayWordmark gateColor={SEA} wayColor={AQUA} fontSize={44} />
          <span style={{ color: BODY, fontWeight: 500, fontSize: 22 }}>
            · El ecosistema digital del colaborador
          </span>
        </div>
      </div>

      {/* Logos, como en la portada */}
      <div className="r" style={{
        position: 'absolute', zIndex: 9,
        bottom: 68, left: 60,
        display: 'flex', alignItems: 'center', gap: 40,
        '--d': 760,
      }}>
        <img src={logoInstituto} alt="Instituto Hutchison Ports"
          style={{ height: 60, objectFit: 'contain', display: 'block' }} />
        <img src={logoHP} alt="Hutchison Ports"
          style={{ height: 100, objectFit: 'contain', display: 'block' }} />
      </div>

    </div>
  )
}
