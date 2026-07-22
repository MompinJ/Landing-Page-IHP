import { useEffect, useRef, useState } from 'react'
import { DiagonalBand } from '../../src/components/SuperGraphic.jsx'
import { SLIDE_BG, TXT, BODY, MUTE, FONT } from '../theme.js'
import emojiLove from '../../assets/ports-emojis/love.webp'
import emojiLaugh from '../../assets/ports-emojis/laugh.webp'
import emojiWow from '../../assets/ports-emojis/wow.webp'
import emojiCare from '../../assets/ports-emojis/care.webp'
import emojiSalute from '../../assets/ports-emojis/salute.webp'

// Espejo Navy de components/FeatureSlide.jsx, con el VIDEO como protagonista:
// ocupa casi todo el ancho util (1330x748) y el texto pasa a segundo plano en
// un carril lateral compacto (titulo arriba-izquierda, descripcion y acciones
// pequenas y discretas). Mismo contenido, videos y cameo que la version clara.

const CAMEO_EMOJI = { love: emojiLove, laugh: emojiLaugh, wow: emojiWow, care: emojiCare, salute: emojiSalute }

// Video: 16:9 grande anclado a la derecha
const VID_X = 480
const VID_Y = 190
const VID_W = 1330
const VID_H = 748

// Item de accion: lead en el acento del modulo + detalle apagado (2do plano).
export function Action({ lead, children }) {
  return (
    <>
      <strong style={{ color: 'var(--fs-accent)', fontWeight: 700 }}>{lead}</strong>
      {' — '}
      <span style={{ color: MUTE, fontWeight: 500 }}>{children}</span>
    </>
  )
}

function Bullet({ color, children }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
      <span style={{
        width: 10, height: 10, flexShrink: 0, marginTop: 7,
        background: color, transform: 'skewX(-30.3deg)',
      }} />
      <span style={{ color: BODY, fontWeight: 500, fontSize: 16.5, lineHeight: 1.45 }}>{children}</span>
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
      width: '100%', height: '100%', background: SLIDE_BG,
      position: 'relative', overflow: 'hidden', fontFamily: FONT,
      '--fs-accent': accent,
    }}>

      {/* Figura de marca: banda diagonal del acento tras el video + filo 30.3 */}
      <div className="fig-in" style={{ position: 'absolute', inset: 0, zIndex: 1, opacity: 0.14 }}>
        <DiagonalBand color={accent} topX={1430} width={430} />
      </div>
      <div className="fig-in" style={{ position: 'absolute', inset: 0, zIndex: 1, '--d': 150 }}>
        <DiagonalBand color={accent} topX={1410} width={5} />
      </div>

      {/* ----- Encabezado: chip del modulo + feature ----- */}
      <div style={{ position: 'absolute', left: 112, top: 84, zIndex: 5, width: 1500 }}>
        {subtitle && (
          <div className="r" style={{ '--d': 40, marginBottom: 16 }}>
            <span style={{
              display: 'inline-flex', alignItems: 'center',
              background: accent, color: '#04122B',
              fontWeight: 800, fontSize: 15, letterSpacing: '2.5px', textTransform: 'uppercase',
              padding: '7px 20px 7px 24px',
              clipPath: 'polygon(12px 0, 100% 0, calc(100% - 12px) 100%, 0 100%)',
              boxShadow: `0 0 22px ${accent}55`,
            }}>
              {moduleTitle}
            </span>
          </div>
        )}
        <h1 className="r" style={{
          margin: 0, color: TXT, fontWeight: 800, fontSize: 56, lineHeight: 1.0,
          letterSpacing: '-1.6px', textTransform: 'uppercase', '--d': 100,
        }}>
          {subtitle || moduleTitle}
        </h1>
      </div>

      {/* ----- Video protagonista ----- */}
      <div className="r" style={{
        position: 'absolute', left: VID_X, top: VID_Y, width: VID_W, height: VID_H,
        zIndex: 3, borderRadius: 14, overflow: 'hidden', '--d': 320,
        border: `1.5px solid ${accent}55`,
        boxShadow: `0 0 80px ${accent}2E, 0 34px 70px rgba(0,0,0,0.55)`,
        background: 'rgba(2,10,24,0.6)',
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

      {/* Cameo: ports-emoji tipo sticker en la esquina del video */}
      {cameo && CAMEO_EMOJI[cameo] && (
        <div className="r" style={{
          position: 'absolute', left: VID_X + VID_W - 44, top: VID_Y - 44, zIndex: 4, '--d': 940,
          width: 88, height: 88, borderRadius: '50%',
          background: 'rgba(255,255,255,0.96)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: `0 10px 26px rgba(0,0,0,0.45), 0 0 24px ${accent}40`,
          transform: 'rotate(-9deg)',
        }}>
          <img src={CAMEO_EMOJI[cameo]} alt="" width={62} height={62}
            style={{ width: 62, height: 62, display: 'block' }} />
        </div>
      )}

      {/* ----- Carril lateral (2do plano): descripcion + acciones compactas ----- */}
      <div style={{
        position: 'absolute', left: 112, top: 300, width: 350, zIndex: 5,
      }}>
        {description && (
          <p className="r" style={{
            margin: 0, color: BODY, fontWeight: 500,
            fontSize: 18, lineHeight: 1.55, '--d': 280,
          }}>
            {description}
          </p>
        )}

        {actions?.length > 0 && (
          <>
            <div className="r" style={{
              '--d': 360, marginTop: 24, height: 1.5, width: 74,
              background: accent, boxShadow: `0 0 10px ${accent}88`,
            }} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 11, marginTop: 20 }}>
              {actions.map((a, i) => (
                <div key={i} className="r" style={{ '--d': 420 + i * 80 }}>
                  <Bullet color={accent}>{a}</Bullet>
                </div>
              ))}
            </div>
          </>
        )}

        {children}
      </div>

    </div>
  )
}
