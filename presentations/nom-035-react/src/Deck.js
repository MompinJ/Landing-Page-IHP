// ============================================================
// MOTOR del deck: estado (slide actual), navegacion (teclado/rueda/
// touch/hash), transiciones (cortina/barrido/fundido) y entrada.
// Las slides son DATOS; aqui solo se orquesta.
// ============================================================
import { React, html, useState, useEffect, useRef, useCallback, useMemo } from './html.js';
import { TRANSITIONS } from './catalog/transitions.js';
import { SLIDE_CLASS, SlideBody } from './components/slides.js';
import { NavContext } from './nav.js';

function SlideView({ slide, extra }) {
  const cls = `slide ${SLIDE_CLASS[slide.type] || ''} is-active ${extra || ''}`;
  return html`<section class=${cls}><${SlideBody} slide=${slide} /></section>`;
}

export function Deck({ deck }) {
  const initial = (() => {
    const h = parseInt((location.hash || '').replace('#', ''), 10);
    return Number.isInteger(h) && h >= 0 && h < deck.length ? h : 0;
  })();

  const [cur, setCur] = useState(initial);
  const [prev, setPrev] = useState(null);       // slide saliente (solo fundido)

  const moving = useRef(false);
  const wipe = useRef(null), wipe2 = useRef(null), cvW = useRef(null), cvA = useRef(null), cvB = useRef(null);
  const wave = useRef(null);
  const fxMs = useRef(TRANSITIONS[0].ms);       // ms de la ultima transicion (lock de rueda)
  const lastFx = useRef(null);                  // id de la ultima transicion (evita repetir)
  const curRef = useRef(cur);
  curRef.current = cur;

  // mantener el # de la URL en la slide actual: al recargar (F5) no se vuelve
  // al inicio. replaceState para no ensuciar el historial del navegador.
  useEffect(() => {
    history.replaceState(null, '', '#' + cur);
  }, [cur]);

  // contrato de navegacion: una slide interactiva puede "reclamar" el control.
  // mientras este activa, el deck no navega solo; le pregunta a su handler.
  const navRef = useRef(null);
  const nav = useMemo(() => ({
    claim(fn) { navRef.current = fn; return () => { if (navRef.current === fn) navRef.current = null; }; },
  }), []);

  const setMs = (ms) => document.documentElement.style.setProperty('--ms', `${ms}ms`);
  const restart = (el, cls) => { if (!el) return; el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); };

  // elige una transicion al azar en cada cambio, sin repetir la anterior
  const pickFx = () => {
    let p = TRANSITIONS[Math.floor(Math.random() * TRANSITIONS.length)];
    if (TRANSITIONS.length > 1) {
      while (p.id === lastFx.current) p = TRANSITIONS[Math.floor(Math.random() * TRANSITIONS.length)];
    }
    lastFx.current = p.id;
    return p;
  };

  const goTo = useCallback((target) => {
    const from = curRef.current;
    if (moving.current || target < 0 || target >= deck.length || target === from) return;
    moving.current = true;
    const p = pickFx();
    fxMs.current = p.ms;
    setMs(p.ms);

    if (p.id === 'fade') {
      setPrev(from);
      setCur(target);
      setTimeout(() => { setPrev(null); moving.current = false; }, p.ms);
      return;
    }

    if (p.id === 'wipe') { restart(wipe2.current, 'run'); restart(wipe.current, 'run'); }
    else if (p.id === 'wave') restart(wave.current, 'run');
    else { restart(cvW.current, 'run'); restart(cvA.current, 'run'); restart(cvB.current, 'run'); }

    setTimeout(() => setCur(target), p.ms * p.swap);
    setTimeout(() => {
      [wipe.current, wipe2.current, cvW.current, cvA.current, cvB.current, wave.current].forEach((el) => el && el.classList.remove('run'));
      moving.current = false;
    }, p.ms + 60);
  }, [deck.length]);

  // toda intencion de avanzar/retroceder pasa por aqui. Si la slide activa
  // reclamo el control y "consume" el gesto, el deck se queda donde esta.
  const requestNav = useCallback((dir, source) => {
    const fn = navRef.current;
    if (fn && fn(dir, source) === 'consumed') return;
    goTo(curRef.current + dir);
  }, [goTo]);

  // teclado
  useEffect(() => {
    const onKey = (e) => {
      switch (e.key) {
        case 'ArrowRight': case 'ArrowDown': case 'PageDown': case ' ':
          e.preventDefault(); requestNav(1, 'key'); break;
        case 'ArrowLeft': case 'ArrowUp': case 'PageUp':
          e.preventDefault(); requestNav(-1, 'key'); break;
        case 'Home': e.preventDefault(); goTo(0); break;
        case 'End': e.preventDefault(); goTo(deck.length - 1); break;
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [goTo, requestNav, deck.length]);

  // rueda
  useEffect(() => {
    let lock = 0;
    const onWheel = (e) => {
      const now = Date.now();
      const ms = fxMs.current;
      if (now - lock < ms + 250 || Math.abs(e.deltaY) < 18) return;
      lock = now;
      requestNav(e.deltaY > 0 ? 1 : -1, 'wheel');
    };
    document.addEventListener('wheel', onWheel, { passive: true });
    return () => document.removeEventListener('wheel', onWheel);
  }, [requestNav]);

  // touch
  useEffect(() => {
    let x = null;
    const start = (e) => { x = e.touches[0].clientX; };
    const end = (e) => {
      if (x === null) return;
      const dx = e.changedTouches[0].clientX - x; x = null;
      if (Math.abs(dx) < 45) return;
      requestNav(dx < 0 ? 1 : -1, 'touch');
    };
    document.addEventListener('touchstart', start, { passive: true });
    document.addEventListener('touchend', end, { passive: true });
    return () => { document.removeEventListener('touchstart', start); document.removeEventListener('touchend', end); };
  }, [requestNav]);

  return html`
    <${NavContext.Provider} value=${nav}>
      <div class="fx" aria-hidden="true">
        <div class="fx-wipe2" ref=${wipe2}></div>
        <div class="fx-wipe" ref=${wipe}></div>
        <div class="fx-cv fx-cv--white" ref=${cvW}></div>
        <div class="fx-cv fx-cv--sky" ref=${cvA}></div>
        <div class="fx-cv fx-cv--navy" ref=${cvB}></div>
        <div class="fx-wave" ref=${wave}>
          <div class="fx-wave__l fx-wave__l--back"></div>
          <div class="fx-wave__l fx-wave__l--mid"></div>
          <div class="fx-wave__l fx-wave__l--front"></div>
          <div class="fx-wave__foam"></div>
        </div>
      </div>
      <main class="deck">
        ${prev != null ? html`<${SlideView} key=${'p' + prev} slide=${deck[prev]} extra="fx-out" />` : null}
        <${SlideView} key=${cur} slide=${deck[cur]} extra="enter" />
      </main>
    <//>
  `;
}
