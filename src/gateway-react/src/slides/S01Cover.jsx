import { GatewayMark, GatewayWordmark } from '../components/GatewayMark.jsx'
import logoHP from '../../assets/hutchisonports-color.png'
import logoInstituto from '../../assets/LogoInstitutoHP-azul.png'
import logoInternship from '../../assets/LogoInternShip.png'

export default function S01Cover() {
  return (
    <div style={{
      width: '100%', height: '100%',
      background: 'var(--paper)',
      position: 'relative', overflow: 'hidden',
      fontFamily: "'Montserrat', Arial, sans-serif",
    }}>

      {/* Shape 1: Horizon Blue — sky-tr */}
      <div className="fig-in" style={{
        position: 'absolute', inset: 0, zIndex: 1, pointerEvents: 'none',
        background: '#9ACAEB',
        clipPath: 'polygon(50% 0, 100% 0, 100% 42%, 48% 62%)',
      }} />

      {/* Shape 2: Aqua Green — steel-tr */}
      <div className="fig-in" style={{
        position: 'absolute', inset: 0, zIndex: 2, pointerEvents: 'none',
        background: '#54BBAB',
        clipPath: 'polygon(75% 20%, 100% 8%, 100% 48%, 75% 60%)',
        '--d': 160,
      }} />

      {/* Logo InternShip 2026 — esquina superior izquierda */}
      <img src={logoInternship} alt="InternShip 2026 — Hutchison Ports TNG"
        className="r" style={{
          position: 'absolute', zIndex: 7,
          left: 104, top: 120, width: 360,
          objectFit: 'contain', display: 'block', '--d': 300,
        }} />

      {/* Body izquierda: icono grande + titulo pequeño */}
      <div style={{
        position: 'absolute',
        left: 112, top: '50%',
        transform: 'translateY(-50%)',
        zIndex: 6,
        display: 'flex', flexDirection: 'column', gap: 20,
      }}>
        <div className="r" style={{ '--d': 440 }}>
          <GatewayMark size={320} color="#54BBAB" />
        </div>
        <div className="r" style={{ lineHeight: 1, '--d': 560 }}>
          <GatewayWordmark gateColor="#002E6D" wayColor="#54BBAB" fontSize={130} />
        </div>
      </div>

      {/* Hutchison Ports logo — top right, separado de la esquina */}
      <div className="r" style={{
        position: 'absolute', zIndex: 9,
        bottom: 68, left: 60,
        display: 'flex', alignItems: 'center', gap: 40,
        '--d': 800,
      }}>
        <img
          src={logoInstituto}
          alt="Instituto Hutchison Ports"
          style={{ height: 60, objectFit: 'contain', display: 'block' }}
        />
        <img
          src={logoHP}
          alt="Hutchison Ports"
          style={{ height: 100, objectFit: 'contain', display: 'block' }}
        />
      </div>
    </div>
  )
}
