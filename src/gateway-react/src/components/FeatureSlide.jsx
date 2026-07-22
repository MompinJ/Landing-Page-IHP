import { useEffect, useRef, useState } from 'react'
import { DiagonalPanelRight } from './SuperGraphic.jsx'
import emojiLove from '../../assets/ports-emojis/love.webp'
import emojiLaugh from '../../assets/ports-emojis/laugh.webp'
import emojiWow from '../../assets/ports-emojis/wow.webp'
import emojiCare from '../../assets/ports-emojis/care.webp'
import emojiSalute from '../../assets/ports-emojis/salute.webp'

// Plantilla compartida para el recorrido modulo-por-modulo de la plataforma
// (Comunidad HP / Campus HP / Reportes HP / Repositorio de mejora continua):
// panel diagonal a la derecha con un video B-roll que se reproduce solo al
// entrar a la slide (muted + loop, para que corra de fondo mientras se narra
// en vivo); contenido a la izquierda (modulo, feature, descripcion, acciones).
// Si el clip todavia no existe, se muestra un placeholder con la ruta
// esperada.
//
// `cameo` = un ports-emoji chiquito de sticker en la esquina del video, como
// hilo visual recurrente a lo largo de todo el recorrido (a partir de "El muro").

const SEA  = '#002E6D'
const BODY = '#41607F'
const FONT = "'Montserrat', Arial, sans-serif"

const PANEL_BOTTOM_X = 560   // panel mas ancho para alojar un video mas grande sin cruzar la diagonal

const CAMEO_EMOJI = { love: emojiLove, laugh: emojiLaugh, wow: emojiWow, care: emojiCare, salute: emojiSalute }

// Item de accion con jerarquia lead (negrita, Sea) + detalle (Body): usar
// como <Action lead="Publicar">titulo, contenido e imagen</Action> dentro de
// la prop `actions` de FeatureSlide.
export function Action({ lead, children }) {
  return (
    <>
      <strong style={{ color: SEA, fontWeight: 800 }}>{lead}</strong>
      {' — '}
      <span style={{ color: BODY, fontWeight: 500 }}>{children}</span>
    </>
  )
}

function Bullet({ color, children }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
      <span style={{
        width: 12, height: 12, flexShrink: 0,
        background: color, transform: 'skewX(-30.3deg)',
      }} />
      <span style={{ color: SEA, fontWeight: 600, fontSize: 20 }}>{children}</span>
    </div>
  )
}

export function FeatureSlide({ moduleTitle, accent, subtitle, description, actions, videoSrc, cameo, children }) {
  const ref = useRef(null)
  const [missing, setMissing] = useState(false)

  useEffect(() => {
    const v = ref.current
    if (!v) return
    const p = v.play()
    if (p && p.catch) p.catch(() => {})
  }, [missing])

  return (
    <div style={{
      width: '100%', height: '100%', background: 'var(--paper)',
      position: 'relative', overflow: 'hidden', fontFamily: FONT,
    }}>

      {/* Figura de marca: panel diagonal en el color del modulo */}
      <div className="fig-in" style={{ position: 'absolute', inset: 0, zIndex: 1 }}>
        <DiagonalPanelRight color={accent} bottomX={PANEL_BOTTOM_X} />
      </div>

      {/* Video: autoplay muted + loop, listo para narrar encima */}
      <div className="r" style={{
        position: 'absolute', left: 1000, top: 340, width: 850, height: 478,
        zIndex: 3, borderRadius: 10, overflow: 'hidden', '--d': 420,
      }}>
        {missing ? (
          <div style={{
            width: '100%', height: '100%', background: 'rgba(0,20,40,0.5)',
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', gap: 10,
            color: 'rgba(255,255,255,0.9)', textAlign: 'center', padding: 20,
          }}>
            <span style={{ fontWeight: 800, fontSize: 15, letterSpacing: '2.5px', textTransform: 'uppercase' }}>
              Video
            </span>
            <span style={{ fontWeight: 500, fontSize: 13, lineHeight: 1.6 }}>
              Coloca el clip en<br />
              <code style={{
                fontFamily: 'monospace', background: 'rgba(255,255,255,0.16)',
                padding: '2px 8px', borderRadius: 4,
              }}>
                {videoSrc.replace('./videos/', 'public/videos/')}
              </code>
            </span>
          </div>
        ) : (
          <video ref={ref} src={videoSrc} muted loop playsInline autoPlay
            onError={() => setMissing(true)}
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
        )}
      </div>

      {/* Cameo: ports-emoji chiquito tipo sticker, en la esquina del video */}
      {cameo && CAMEO_EMOJI[cameo] && (
        <div className="r" style={{
          position: 'absolute', left: 1786, top: 288, zIndex: 4, '--d': 940,
          width: 88, height: 88, borderRadius: '50%', background: '#fff',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 10px 26px rgba(0,20,40,0.3)', transform: 'rotate(-9deg)',
        }}>
          <img src={CAMEO_EMOJI[cameo]} alt="" width={62} height={62}
            style={{ width: 62, height: 62, display: 'block' }} />
        </div>
      )}

      {/* Contenido (izquierda, sobre blanco) */}
      <div style={{
        position: 'absolute', left: 112, top: '50%',
        transform: 'translateY(-50%)', zIndex: 5, width: 980,
      }}>
        <h1 className="r" style={{
          margin: 0, color: SEA, fontWeight: 800, fontSize: 62, lineHeight: 1.0,
          letterSpacing: '-2px', textTransform: 'uppercase', '--d': 100,
        }}>
          {moduleTitle}
        </h1>

        {subtitle && (
          <p className="r" style={{
            margin: '18px 0 0', color: SEA, fontWeight: 700, fontSize: 28,
            letterSpacing: '-0.3px', '--d': 200,
          }}>
            {subtitle}
          </p>
        )}

        {description && (
          <p className="r" style={{
            margin: '20px 0 0', maxWidth: 620, color: BODY, fontWeight: 500,
            fontSize: 20, lineHeight: 1.55, '--d': 280,
          }}>
            {description}
          </p>
        )}

        {actions?.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 26 }}>
            {actions.map((a, i) => (
              <div key={i} className="r" style={{ '--d': 360 + i * 90 }}>
                <Bullet color={accent}>{a}</Bullet>
              </div>
            ))}
          </div>
        )}

        {children}
      </div>

    </div>
  )
}
