import { FeatureSlide, Action } from '../components/FeatureSlide.jsx'
import emojiLove from '../../assets/ports-emojis/love.webp'
import emojiLaugh from '../../assets/ports-emojis/laugh.webp'
import emojiWow from '../../assets/ports-emojis/wow.webp'
import emojiCare from '../../assets/ports-emojis/care.webp'
import emojiSalute from '../../assets/ports-emojis/salute.webp'

const SEA = '#002E6D'
const SKY = '#009BDE'
const MUTE = '#7E96B6'

// Reacciones reales del muro (Frontend Gateway / ports-emoji): 5 emojis
// animados de marca, propios de Ports (no genericos).
const REACTIONS = [
  { name: 'love', src: emojiLove, label: 'Me encanta' },
  { name: 'laugh', src: emojiLaugh, label: 'Me divierte' },
  { name: 'wow', src: emojiWow, label: 'Me asombra' },
  { name: 'care', src: emojiCare, label: 'Me Enhutchisoniza' },
  { name: 'salute', src: emojiSalute, label: 'Enterado' },
]

const ACTIONS = [
  <Action lead="Publicar">texto, fotos, video y tags</Action>,
  <Action lead="Reaccionar">5 emojis de marca propia</Action>,
  <Action lead="Comentar">con su propio "me encanta"</Action>,
  <Action lead="Modo Reels">fotos y video vertical, inmersivo</Action>,
  <Action lead="Reportar">contenido inapropiado o spam</Action>,
]

export default function S05bMuro() {
  return (
    <FeatureSlide
      moduleTitle="Comunidad HP"
      accent={SKY}
      subtitle="El muro"
      description="El feed social corporativo de Comunidad HP, donde los colaboradores publican, comentan y reaccionan en tiempo real."
      actions={ACTIONS}
      videoSrc="./videos/comunidad-muro.mp4"
      cameo="salute"
    >
      <div className="r" style={{ '--d': 900, marginTop: 26 }}>
        <div style={{ display: 'flex', gap: 20, alignItems: 'flex-end' }}>
          {REACTIONS.map((r) => (
            <img key={r.name} src={r.src} alt={r.label} title={r.label}
              width={92} height={92}
              style={{ width: 92, height: 92, display: 'block', flexShrink: 0 }} />
          ))}
        </div>
        <span style={{
          display: 'block', marginTop: 10, color: MUTE, fontWeight: 600, fontSize: 13,
          letterSpacing: '0.3px',
        }}>
          Reacciones de marca — <span style={{ color: SEA, fontWeight: 700 }}>diseño propio de Ports</span>
        </span>
      </div>
    </FeatureSlide>
  )
}
