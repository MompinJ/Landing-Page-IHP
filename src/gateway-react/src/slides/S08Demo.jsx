import { useEffect, useRef, useState } from 'react'
import { Eyebrow } from '../components/SuperGraphic.jsx'

// Video de demostracion a pantalla completa. El archivo vive en
// public/videos/demo.mp4 (se sirve como ./videos/demo.mp4). Al entrar a la
// slide se reproduce solo; cuando termina dispara 'gw-video-ended' y el
// deck avanza automaticamente a la slide de gracias. Si el archivo no
// existe se muestra un placeholder de marca indicando donde colocarlo.

const SEA  = '#002E6D'
const SKY  = '#009BDE'
const AQUA = '#2BA697'
const FONT = "'Montserrat', Arial, sans-serif"

const VIDEO_SRC = './videos/demo.mp4'

export default function S08Demo() {
  const ref = useRef(null)
  const [missing, setMissing] = useState(false)

  useEffect(() => {
    const v = ref.current
    if (!v) return
    const p = v.play()
    if (p && p.catch) p.catch(() => {
      // autoplay con audio bloqueado: reintenta en silencio (el audio se
      // puede activar desde los controles)
      v.muted = true
      const p2 = v.play()
      if (p2 && p2.catch) p2.catch(() => {})
    })
  }, [missing])

  return (
    <div style={{
      width: '100%', height: '100%',
      background: '#000',
      position: 'relative', overflow: 'hidden',
      fontFamily: FONT,
    }}>

      {missing ? (
        /* ----- Placeholder: falta el archivo del video ----- */
        <div style={{
          position: 'absolute', inset: 0, background: SEA,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', gap: 26,
        }}>
          <div className="r" style={{ '--d': 100 }}>
            <Eyebrow color={AQUA} size={20}>El producto · Demo</Eyebrow>
          </div>
          <h1 className="r" style={{
            margin: 0, color: '#fff', fontWeight: 800,
            fontSize: 64, letterSpacing: '-2px', textTransform: 'uppercase',
            '--d': 220,
          }}>
            Gateway en acción
          </h1>
          <p className="r" style={{
            margin: 0, color: 'rgba(255,255,255,0.75)',
            fontWeight: 500, fontSize: 20, textAlign: 'center', lineHeight: 1.6,
            '--d': 340,
          }}>
            Coloca el video de demostración en<br />
            <code style={{
              fontFamily: 'monospace', fontSize: 19, color: '#fff',
              background: 'rgba(255,255,255,0.12)', padding: '3px 12px', borderRadius: 6,
            }}>
              public/videos/demo.mp4
            </code>
          </p>
        </div>
      ) : (
        /* ----- Video a pantalla completa ----- */
        <video
          ref={ref}
          src={VIDEO_SRC}
          controls
          playsInline
          onError={() => setMissing(true)}
          onEnded={() => window.dispatchEvent(new Event('gw-video-ended'))}
          style={{
            position: 'absolute', inset: 0,
            width: '100%', height: '100%',
            objectFit: 'contain', display: 'block',
          }}
        />
      )}

      {/* Rotulo de entrada: aparece y se desvanece para dejar limpio el video */}
      {!missing && (
        <div className="demo-overlay" style={{
          position: 'absolute', top: 0, left: 0, right: 0,
          padding: '56px 112px 90px',
          background: 'linear-gradient(180deg, rgba(0,10,28,0.78) 0%, rgba(0,10,28,0) 100%)',
          pointerEvents: 'none',
        }}>
          <Eyebrow color={SKY} size={18}>El producto · Demo</Eyebrow>
          <h1 style={{
            margin: '14px 0 0', color: '#fff', fontWeight: 800,
            fontSize: 52, lineHeight: 1.0, letterSpacing: '-1.5px',
            textTransform: 'uppercase',
          }}>
            Gateway en acción
          </h1>
        </div>
      )}

    </div>
  )
}
