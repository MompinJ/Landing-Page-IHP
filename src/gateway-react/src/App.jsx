import { useState, useEffect, useCallback, useRef } from 'react'
import { slides } from './slides/index.jsx'
import { TRANSITIONS } from '../transitions.js'

const PORTAL_MS = 2000
const DEFAULT_TRANSITION = 'fade'

const W = 1920
const H = 1080

// Slide inicial desde el hash de la URL (#1..#N): recargar no regresa al inicio.
const initialSlide = (() => {
  const n = parseInt(window.location.hash.slice(1), 10)
  return Number.isFinite(n) && n >= 1 && n <= slides.length ? n - 1 : 0
})()

function useScale() {
  const [tf, setTf] = useState({ s: 1, x: 0, y: 0 })

  useEffect(() => {
    function recalc() {
      const vw = window.innerWidth
      const vh = window.innerHeight
      // Fill the screen: use max scale (may crop 1-2% on unusual ratios)
      const s = Math.max(vw / W, vh / H)
      const x = (vw - W * s) / 2
      const y = (vh - H * s) / 2
      setTf({ s, x, y })
    }
    recalc()
    window.addEventListener('resize', recalc)
    return () => window.removeEventListener('resize', recalc)
  }, [])

  return tf
}

// Transicion del borde entre dos slides: se define en la slide de menor indice
// del par (campo `transition`). El "portal" es especial (solo hacia adelante).
function edgeTransitionId(from, target) {
  if (target === from + 1 && slides[from].portalExit) return 'portal'
  const lower = Math.min(from, target)
  return slides[lower].transition || DEFAULT_TRANSITION
}

// Slide envuelta en <section class="slide ..."> para el sistema de entradas/fx
function SlideView({ entry, extra, style }) {
  const Comp = entry.component
  const cls = `slide is-active ${extra || ''}`
  return (
    <section className={cls} style={style}>
      <Comp />
    </section>
  )
}

export default function App() {
  const { s, x, y } = useScale()
  const count = slides.length

  const [cur, setCur]       = useState(initialSlide)
  const [prev, setPrev]     = useState(null)   // slide saliente (fundido / portal)
  const [portal, setPortal] = useState(false)  // transicion especial Gateway
  const [menu, setMenu]     = useState(false)  // indice de navegacion (boton oculto)

  const menuRef = useRef(false)
  menuRef.current = menu

  // Persistir la slide actual en el hash (sin ensuciar el historial)
  useEffect(() => {
    window.history.replaceState(null, '', `#${cur + 1}`)
  }, [cur])

  const moving  = useRef(false)
  const wipe    = useRef(null)
  const cvW     = useRef(null)
  const cvA     = useRef(null)
  const cvB     = useRef(null)
  const curRef  = useRef(cur)
  curRef.current = cur

  const setMs   = (ms) => document.documentElement.style.setProperty('--ms', `${ms}ms`)
  const restart = (el, cls) => { if (!el) return; el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls) }

  const goTo = useCallback((target) => {
    const from = curRef.current
    if (moving.current || target < 0 || target >= count || target === from) return

    const tid = edgeTransitionId(from, target)

    // Transicion especial "portal": la slide saliente hace zoom sobre su isotipo
    if (tid === 'portal') {
      moving.current = true
      setPortal(true)
      setPrev(from)
      setCur(target)
      setTimeout(() => { setPrev(null); setPortal(false); moving.current = false }, PORTAL_MS)
      return
    }

    moving.current = true
    const p = TRANSITIONS.find((t) => t.id === tid) || TRANSITIONS.find((t) => t.id === DEFAULT_TRANSITION)
    setMs(p.ms)

    // color de la transicion (barrido / capa oscura de la cortina), por slide
    const col = slides[Math.min(from, target)].transitionColor
    if (col) document.documentElement.style.setProperty('--fx-color', col)
    else document.documentElement.style.removeProperty('--fx-color')

    if (p.id === 'fade') {
      setPrev(from)
      setCur(target)
      setTimeout(() => { setPrev(null); moving.current = false }, p.ms)
      return
    }

    if (p.id === 'wipe') restart(wipe.current, 'run')
    else { restart(cvW.current, 'run'); restart(cvA.current, 'run'); restart(cvB.current, 'run') }

    setTimeout(() => setCur(target), p.ms * p.swap)
    setTimeout(() => {
      [wipe.current, cvW.current, cvA.current, cvB.current].forEach((el) => el && el.classList.remove('run'))
      moving.current = false
    }, p.ms + 60)
  }, [count])

  // teclado
  useEffect(() => {
    const onKey = (e) => {
      // Si el foco esta en el video de la demo, el teclado controla el video
      if (e.target && e.target.tagName === 'VIDEO') return
      // Con el indice abierto solo se cierra (Esc / i); no se navega detras
      if (menuRef.current) {
        if (e.key === 'Escape' || e.key === 'i' || e.key === 'I') {
          e.preventDefault(); setMenu(false)
        }
        return
      }
      switch (e.key) {
        case 'ArrowRight': case 'ArrowDown': case 'PageDown': case ' ':
          e.preventDefault(); goTo(curRef.current + 1); break
        case 'ArrowLeft': case 'ArrowUp': case 'PageUp':
          e.preventDefault(); goTo(curRef.current - 1); break
        case 'Home': e.preventDefault(); goTo(0); break
        case 'End':  e.preventDefault(); goTo(count - 1); break
        case 'i': case 'I': setMenu(true); break
        default: break
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [goTo, count])

  // rueda
  useEffect(() => {
    let lock = 0
    const onWheel = (e) => {
      if (menuRef.current) return
      const now = Date.now()
      if (now - lock < 1700 || Math.abs(e.deltaY) < 18) return
      lock = now
      goTo(e.deltaY > 0 ? curRef.current + 1 : curRef.current - 1)
    }
    window.addEventListener('wheel', onWheel, { passive: true })
    return () => window.removeEventListener('wheel', onWheel)
  }, [goTo])

  // touch
  useEffect(() => {
    let tx = null
    const start = (e) => { tx = e.touches[0].clientX }
    const end = (e) => {
      if (menuRef.current || tx === null) return
      const dx = e.changedTouches[0].clientX - tx; tx = null
      if (Math.abs(dx) < 45) return
      goTo(dx < 0 ? curRef.current + 1 : curRef.current - 1)
    }
    window.addEventListener('touchstart', start, { passive: true })
    window.addEventListener('touchend', end, { passive: true })
    return () => { window.removeEventListener('touchstart', start); window.removeEventListener('touchend', end) }
  }, [goTo])

  // Auto-avance: cuando un video de demo termina, la slide dispara este
  // evento y el deck pasa solo a la siguiente.
  useEffect(() => {
    const onEnded = () => goTo(curRef.current + 1)
    window.addEventListener('gw-video-ended', onEnded)
    return () => window.removeEventListener('gw-video-ended', onEnded)
  }, [goTo])

  return (
    <div className="stage-outer">
      <div
        className="stage"
        style={{ transform: `translate(${x}px,${y}px) scale(${s})` }}
      >
        <main className="deck">
          {prev != null && (
            <SlideView
              key={portal ? prev : 'p' + prev}
              entry={slides[prev]}
              extra={portal ? 'enter fx-portal' : 'fx-out'}
              style={portal ? {
                transformOrigin: slides[prev].portalOrigin || '50% 50%',
                '--pdx': slides[prev].portalDx || '0px',
                '--pdy': slides[prev].portalDy || '0px',
              } : undefined}
            />
          )}
          <SlideView key={cur} entry={slides[cur]} extra="enter" />
        </main>

        {/* Overlays de transicion */}
        <div className="fx" aria-hidden="true">
          <div className="fx-wipe" ref={wipe} />
          <div className="fx-cv fx-cv--white" ref={cvW} />
          <div className="fx-cv fx-cv--sky"   ref={cvA} />
          <div className="fx-cv fx-cv--navy"  ref={cvB} />
        </div>
      </div>

      <nav className="nav-dots" aria-label="slides">
        {slides.map((sl, i) => (
          <button
            key={i}
            className={`nav-dot${i === cur ? ' active' : ''}`}
            onClick={() => goTo(i)}
            aria-label={sl.title}
          />
        ))}
      </nav>

      <div
        className="progress"
        style={{ width: `${((cur + 1) / count) * 100}%` }}
      />

      {/* Boton oculto (esquina superior izquierda) que abre el indice */}
      <button className="index-btn" aria-label="Índice de slides"
        onClick={() => setMenu(true)} />

      {/* Indice de navegacion */}
      {menu && (
        <div className="index-overlay" onClick={() => setMenu(false)}>
          <div className="index-panel" onClick={(e) => e.stopPropagation()}>
            <div className="index-head">
              <span className="index-eyebrow">Índice</span>
              <span className="index-count">{cur + 1} / {count}</span>
            </div>
            <div className="index-grid">
              {slides.map((sl, i) => (
                <button key={sl.id}
                  className={`index-item${i === cur ? ' current' : ''}`}
                  style={{ '--d': `${i * 35}ms` }}
                  onClick={() => { setMenu(false); goTo(i) }}>
                  <span className="index-num">{String(i + 1).padStart(2, '0')}</span>
                  <span className="index-title">{sl.title}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
