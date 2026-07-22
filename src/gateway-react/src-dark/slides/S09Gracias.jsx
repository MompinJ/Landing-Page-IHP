import { GatewayMark, GatewayWordmark } from '../../src/components/GatewayMark.jsx'
import { SLIDE_BG, SKY, AQUA, BODY, TXT, FONT } from '../theme.js'
import logoHP from '../../assets/hutchisonports-blanco.png'
import logoInstituto from '../../assets/LogoInstitutoHP-blanco.png'

// Espejo Navy de S09Gracias: cierra con la misma imagen que la portada
// (bandas de luz diagonales, isotipo con glow) — mismo contenido.

export default function S09Gracias() {
  return (
    <div style={{
      width: '100%', height: '100%',
      background: SLIDE_BG,
      position: 'relative', overflow: 'hidden',
      fontFamily: FONT,
    }}>

      {/* Bandas de luz de la portada */}
      <div className="fig-in" style={{
        position: 'absolute', inset: 0, zIndex: 1, pointerEvents: 'none',
        background: `linear-gradient(120.3deg, transparent 55%, ${SKY}26 55%, ${SKY}26 72%, transparent 72%)`,
      }} />
      <div className="fig-in" style={{
        position: 'absolute', inset: 0, zIndex: 2, pointerEvents: 'none',
        background: `linear-gradient(120.3deg, transparent 68%, ${AQUA}2E 68%, ${AQUA}2E 80%, transparent 80%)`,
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
        <div className="r" style={{ '--d': 300, filter: `drop-shadow(0 0 34px ${AQUA}77)` }}>
          <GatewayMark size={230} color={AQUA} />
        </div>
        <h1 className="r" style={{
          margin: 0, color: TXT, fontWeight: 800,
          fontSize: 170, lineHeight: 0.95,
          letterSpacing: '-7px', textTransform: 'uppercase',
          '--d': 440,
        }}>
          Gracias
        </h1>
        <div className="r" style={{ '--d': 580, display: 'flex', alignItems: 'center', gap: 18 }}>
          <GatewayWordmark gateColor="#FFFFFF" wayColor={AQUA} fontSize={44} />
          <span style={{ color: BODY, fontWeight: 500, fontSize: 22 }}>
            · El ecosistema digital del colaborador
          </span>
        </div>
      </div>

      {/* Logos, version negativa directo sobre la tinta (como en la portada) */}
      <div className="r" style={{
        position: 'absolute', zIndex: 9,
        bottom: 68, left: 60,
        '--d': 760,
        display: 'flex', alignItems: 'center', gap: 40,
      }}>
        <img src={logoInstituto} alt="Instituto Hutchison Ports"
          style={{ height: 54, objectFit: 'contain', display: 'block' }} />
        <img src={logoHP} alt="Hutchison Ports"
          style={{ height: 86, objectFit: 'contain', display: 'block' }} />
      </div>

    </div>
  )
}
