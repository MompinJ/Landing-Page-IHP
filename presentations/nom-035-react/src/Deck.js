// ============================================================
// MOTOR del deck: estado (slide actual), navegacion (teclado/rueda/
// touch/hash), transiciones (cortina/barrido/fundido) y entrada.
// Las slides son DATOS; aqui solo se orquesta.
// ============================================================
import { React, html, useState, useEffect, useRef, useCallback, useMemo } from './html.js';
import { TRANSITIONS } from './catalog/transitions.js';
import { SLIDE_CLASS, SlideBody } from './components/slides.js';
import { NavContext } from './nav.js';

// --- STAGE: canvas fijo 1920x1080 escalado (modo "cover") para verse
// identico en cualquier resolucion/proporcion de proyector -----------
const STAGE_W = 1920, STAGE_H = 1080;

function useStageScale() {
  const [t, setT] = useState({ s: 1, x: 0, y: 0 });
  useEffect(() => {
    const calc = () => {
      const w = window.innerWidth, h = window.innerHeight;
      const s = Math.max(w / STAGE_W, h / STAGE_H);
      setT({ s, x: (w - STAGE_W * s) / 2, y: (h - STAGE_H * s) / 2 });
    };
    calc();
    window.addEventListener('resize', calc);
    return () => window.removeEventListener('resize', calc);
  }, []);
  return t;
}

function SlideView({ slide, extra }) {
  const cls = `slide ${SLIDE_CLASS[slide.type] || ''} is-active ${extra || ''}`;
  return html`<section class=${cls}><${SlideBody} slide=${slide} /></section>`;
}

// --- etiqueta corta de cada slide para el indice ---------------------
function flattenText(x) {
  if (x == null) return '';
  if (typeof x === 'string') return x;
  if (Array.isArray(x)) return x.map(flattenText).join(' ');
  if (typeof x === 'object') return typeof x.t === 'string' ? x.t : '';
  return '';
}

// tipos sin titulo: de donde sacar el nombre (string o funcion del slide)
const LABEL_FALLBACK = {
  swipe: 'Interludio',
  expediente: 'Expediente',
  auditoria: 'Escaneo',
  'nom-quadrants': 'Quiénes están obligados',
  'nom-quad-cond': (s) => flattenText(s.inseguras),
  'nom-quad-def': (s) => flattenText(s.rebasa && s.rebasa.h),
  'nom-bands': (s) => flattenText(s.a && s.a.h),
};

// tipos que son dinamicas interactivas (no slides normales)
const DYNAMIC_TYPES = new Set(['semaforo', 'swipe', 'expediente', 'auditoria']);

// agrupa las slides por seccion: cada slide con `section` abre un grupo
// nuevo y las siguientes sin `section` se le suman.
function buildGroups(deck) {
  const groups = [];
  let grp = null;
  deck.forEach((slide, i) => {
    if (slide.section || !grp) {
      grp = { title: slide.section || 'Slides', items: [] };
      groups.push(grp);
    }
    grp.items.push({ slide, i });
  });
  return groups;
}

function slideLabel(slide, i) {
  let t = slide.label
    || flattenText(slide.title)
    || flattenText(slide.kicker)
    || flattenText(slide.lead)
    || (Array.isArray(slide.text) ? slide.text[0] : '')
    || flattenText(slide.body);
  if (!t) {
    const fb = LABEL_FALLBACK[slide.type];
    t = typeof fb === 'function' ? fb(slide) : (fb || '');
  }
  t = String(t).replace(/\s+/g, ' ').trim();
  if (!t) return `Slide ${i + 1}`;
  return t.length > 46 ? t.slice(0, 45).trimEnd() + '…' : t;
}

export function Deck({ deck }) {
  const initial = (() => {
    const h = parseInt((location.hash || '').replace('#', ''), 10);
    return Number.isInteger(h) && h >= 0 && h < deck.length ? h : 0;
  })();

  const [cur, setCur] = useState(initial);
  const [prev, setPrev] = useState(null);       // slide saliente (solo fundido)
  const [menuOpen, setMenuOpen] = useState(false);  // indice de slides abierto

  const { s: stageS, x: stageX, y: stageY } = useStageScale();

  const menuRef = useRef(false);
  menuRef.current = menuOpen;

  const groups = useMemo(() => buildGroups(deck), [deck]);

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

  // salto directo desde el indice
  const jumpTo = useCallback((i) => { setMenuOpen(false); goTo(i); }, [goTo]);

  // teclado
  useEffect(() => {
    const onKey = (e) => {
      // con el indice abierto: Esc cierra y las teclas de navegacion se ignoran
      if (menuRef.current) {
        if (e.key === 'Escape') { e.preventDefault(); setMenuOpen(false); }
        else if (['ArrowRight', 'ArrowLeft', 'ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', ' ', 'Home', 'End'].includes(e.key)) e.preventDefault();
        return;
      }
      switch (e.key) {
        case 'ArrowRight': case 'ArrowDown': case 'PageDown': case ' ':
          e.preventDefault(); requestNav(1, 'key'); break;
        case 'ArrowLeft': case 'ArrowUp': case 'PageUp':
          e.preventDefault(); requestNav(-1, 'key'); break;
        case 'Home': e.preventDefault(); goTo(0); break;
        case 'End': e.preventDefault(); goTo(deck.length - 1); break;
        case 'i': case 'I': e.preventDefault(); setMenuOpen(true); break;
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [goTo, requestNav, deck.length]);

  // rueda
  useEffect(() => {
    let lock = 0;
    const onWheel = (e) => {
      if (menuRef.current) return;
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
    const start = (e) => { if (menuRef.current) return; x = e.touches[0].clientX; };
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
      <div class="stage-outer">
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
        <div class="stage" style=${{ transform: `translate(${stageX}px, ${stageY}px) scale(${stageS})` }}>
          <main class="deck">
            ${prev != null ? html`<${SlideView} key=${'p' + prev} slide=${deck[prev]} extra="fx-out" />` : null}
            <${SlideView} key=${cur} slide=${deck[cur]} extra="enter" />
          </main>
        </div>
      </div>

      <button class="idx-btn" onClick=${() => setMenuOpen(true)} title="Índice de slides (I)" aria-label="Abrir índice de slides">
        <span class="idx-btn-bars" aria-hidden="true"><i></i><i></i><i></i></span>
        <span class="idx-btn-num">${cur + 1}<em>/${deck.length}</em></span>
      </button>

      ${menuOpen ? html`
        <div class="idx-overlay" onClick=${() => setMenuOpen(false)}>
          <div class="idx-panel" onClick=${(e) => e.stopPropagation()} role="dialog" aria-label="Índice de slides">
            <div class="idx-head">
              <span class="idx-title">Índice</span>
              <button class="idx-close" onClick=${() => setMenuOpen(false)} aria-label="Cerrar índice">×</button>
            </div>
            <div class="idx-list">
              ${groups.map((g, gi) => html`
                <div class="idx-group" key=${gi}>
                  <div class="idx-group-ttl">${g.title}</div>
                  <ul class="idx-sublist">
                    ${g.items.map(({ slide, i }) => {
    const dyn = DYNAMIC_TYPES.has(slide.type);
    return html`
                      <li key=${i}>
                        <button
                          class=${'idx-item' + (i === cur ? ' is-current' : '') + (dyn ? ' is-dyn' : '')}
                          onClick=${() => jumpTo(i)}
                        >
                          <span class="idx-item-num">${String(i + 1).padStart(2, '0')}</span>
                          <span class="idx-item-lbl">${slideLabel(slide, i)}</span>
                          ${dyn ? html`<span class="idx-tag">Dinámica</span>` : null}
                        </button>
                      </li>
                    `;
  })}
                  </ul>
                </div>
              `)}
            </div>
          </div>
        </div>
      ` : null}
    <//>
  `;
}
