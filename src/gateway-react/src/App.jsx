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

// Tarjeta del carrusel del indice: miniatura con la slide real renderizada a
// escala (clase .thumb en index.css la muestra completa, sin animar) + numero
// y titulo. La de video (s08) no se monta en miniatura para no autoreproducirla.
function IndexCard({ sl, i, isCurrent, isFocused, cardRef, onSelect }) {
  const Comp = sl.component
  return (
    <button ref={cardRef}
      className={`index-card${isCurrent ? ' current' : ''}${isFocused ? ' focused' : ''}`}
      style={{ '--d': `${i * 35}ms` }}
      onClick={onSelect}>
      <div className="index-thumb">
        {sl.id === 's08' ? (
          <div className="index-thumb-fallback" aria-hidden="true">▶</div>
        ) : (
          <div className="index-thumb-stage">
            {/* fuera del grid del .deck, .slide no recibe tamano por grid-area:
                se fija explicito para que el 100%/100% interno de la slide resuelva */}
            <section className="slide is-active enter thumb" style={{ width: 1920, height: 1080 }}>
              <Comp />
            </section>
          </div>
        )}
      </div>
      <div className="index-card-label">
        <span className="index-num">{String(i + 1).padStart(2, '0')}</span>
        <span className="index-title">{sl.title}</span>
      </div>
    </button>
  )
}

export default function App() {
  const { s, x, y } = useScale()
  const count = slides.length

  const [cur, setCur]       = useState(initialSlide)
  const [prev, setPrev]     = useState(null)   // slide saliente (fundido / portal)
  const [portal, setPortal] = useState(false)  // transicion especial Gateway
  const [menu, setMenu]     = useState(false)  // indice de navegacion (boton oculto)
  const [focus, setFocus]   = useState(0)      // tarjeta resaltada dentro del carrusel del indice

  const menuRef = useRef(false)
  menuRef.current = menu

  const focusRef = useRef(focus)
  focusRef.current = focus

  const cardRefs = useRef([])

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

  // Abre el indice con el carrusel enfocado en la slide actual
  const openMenu = useCallback(() => {
    setFocus(curRef.current)
    setMenu(true)
  }, [])

  // Centra la tarjeta enfocada del carrusel al abrir el indice o moverse con flechas
  useEffect(() => {
    if (!menu) return
    cardRefs.current[focus]?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' })
  }, [menu, focus])

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
      // Con el indice abierto, las flechas mueven el foco del carrusel y
      // Enter/Espacio saltan a esa slide; Esc / i cierran sin navegar.
      if (menuRef.current) {
        switch (e.key) {
          case 'Escape': case 'i': case 'I':
            e.preventDefault(); setMenu(false); break
          case 'ArrowRight':
            e.preventDefault(); setFocus((f) => Math.min(f + 1, count - 1)); break
          case 'ArrowLeft':
            e.preventDefault(); setFocus((f) => Math.max(f - 1, 0)); break
          case 'Enter': case ' ':
            e.preventDefault(); setMenu(false); goTo(focusRef.current); break
          default: break
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
        case 'i': case 'I': openMenu(); break
        default: break
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [goTo, count, openMenu])

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
        onClick={openMenu} />

      {/* Indice de navegacion: carrusel con vista previa en vivo de cada slide */}
      {menu && (
        <div className="index-overlay" onClick={() => setMenu(false)}>
          <div className="index-panel" onClick={(e) => e.stopPropagation()}>
            <div className="index-head">
              <span className="index-eyebrow">Índice</span>
              <span className="index-count">{focus + 1} / {count}</span>
            </div>

            <div className="index-carousel-wrap">
              <button className="index-nav-btn" aria-label="Anterior"
                onClick={() => setFocus((f) => Math.max(f - 1, 0))}>‹</button>

              <div className="index-carousel">
                {slides.map((sl, i) => (
                  <IndexCard key={sl.id} sl={sl} i={i}
                    isCurrent={i === cur} isFocused={i === focus}
                    cardRef={(el) => { cardRefs.current[i] = el }}
                    onSelect={() => { setMenu(false); goTo(i) }} />
                ))}
              </div>

              <button className="index-nav-btn" aria-label="Siguiente"
                onClick={() => setFocus((f) => Math.min(f + 1, count - 1))}>›</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
