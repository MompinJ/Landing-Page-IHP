import { GatewayMark, GatewayWordmark } from '../../src/components/GatewayMark.jsx'
import { OrbitRing } from '../../src/components/OrbitDots.jsx'
import { SLIDE_BG, SKY, AQUA, AQUA_L, HORIZON, BODY, FONT } from '../theme.js'
import logoHP from '../../assets/hutchisonports-blanco.png'
import logoInstituto from '../../assets/LogoInstitutoHP-blanco.png'
import logoInternship from '../../assets/LogoInternShip.png'

// Espejo Navy de S01Cover: mismo contenido (logos, isotipo, wordmark), otro
// lenguaje: tinta profunda, bandas diagonales luminosas en vez de shapes
// solidos, isotipo con orbitas y glow. Instituto/HP usan su version negativa
// (blanco sobre transparente) directo sobre la tinta. InternShip solo existe
// en version color, asi que ese si va sobre placa blanca.

function LogoPlate({ children, pad = '14px 26px' }) {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.97)', borderRadius: 14, padding: pad,
      display: 'flex', alignItems: 'center',
      boxShadow: '0 14px 40px rgba(0,0,0,0.45)',
    }}>
      {children}
    </div>
  )
}

export default function S01Cover() {
  return (
    <div style={{
      width: '100%', height: '100%',
      background: SLIDE_BG,
      position: 'relative', overflow: 'hidden',
      fontFamily: FONT,
    }}>

      {/* Bandas diagonales 30.3 en la esquina superior derecha (eco de los
          shapes Horizon/Aqua de la version clara, ahora como luz) */}
      <div className="fig-in" style={{
        position: 'absolute', inset: 0, zIndex: 1, pointerEvents: 'none',
        background: `linear-gradient(120.3deg, transparent 55%, ${SKY}26 55%, ${SKY}26 72%, transparent 72%)`,
      }} />
      <div className="fig-in" style={{
        position: 'absolute', inset: 0, zIndex: 2, pointerEvents: 'none',
        background: `linear-gradient(120.3deg, transparent 68%, ${AQUA}2E 68%, ${AQUA}2E 80%, transparent 80%)`,
        '--d': 160,
      }} />

      {/* Logo InternShip 2026 — esquina superior izquierda, sobre placa */}
      <div className="r" style={{ position: 'absolute', zIndex: 7, left: 104, top: 104, '--d': 300 }}>
        <LogoPlate pad="16px 24px">
          <img src={logoInternship} alt="InternShip 2026 — Hutchison Ports TNG"
            style={{ width: 320, objectFit: 'contain', display: 'block' }} />
        </LogoPlate>
      </div>

      {/* Isotipo heroico a la derecha: orbitas + glow aqua */}
      <div style={{ position: 'absolute', left: 1430, top: 540, zIndex: 4 }}>
        <div className="rs" style={{ '--d': 500 }}>
          <OrbitRing radius={300} count={18} dotSize={4} color={AQUA_L} duration={40} reverse
            opacities={[1, 0.8, 0.55, 0.35, 0.18, 0.08]} />
          <OrbitRing radius={235} count={12} dotSize={6} color={AQUA} duration={24}
            opacities={[1, 0.75, 0.5, 0.28, 0.12]} />
          <div style={{
            position: 'absolute', top: '50%', left: '50%',
            transform: 'translate(-50%,-50%)',
            filter: `drop-shadow(0 0 42px ${AQUA}88)`,
          }}>
            <GatewayMark size={330} color={AQUA} />
          </div>
        </div>
      </div>

      {/* Body izquierda: wordmark grande en negativo */}
      <div style={{
        position: 'absolute',
        left: 112, top: '50%',
        transform: 'translateY(-50%)',
        zIndex: 6,
        display: 'flex', flexDirection: 'column', gap: 26,
      }}>
        <div className="r" style={{ lineHeight: 1, '--d': 440 }}>
          <GatewayWordmark gateColor="#FFFFFF" wayColor={AQUA} fontSize={150} />
        </div>
        <p className="r" style={{
          margin: 0, color: HORIZON, fontWeight: 600, fontSize: 27,
          letterSpacing: '0.2px', '--d': 620,
        }}>
          El ecosistema digital del colaborador
        </p>
        <div className="r" style={{ '--d': 720, height: 3, width: 190, background: AQUA, boxShadow: `0 0 14px ${AQUA}AA` }} />
      </div>

      {/* Logos institucionales abajo, version negativa directo sobre la tinta */}
      <div className="r" style={{
        position: 'absolute', zIndex: 9,
        bottom: 68, left: 60,
        '--d': 800,
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
