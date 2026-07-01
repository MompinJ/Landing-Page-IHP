// ============================================================
// DINAMICA: El Swipe Corporativo
// Flujo: rules -> scale (bascula 10 min) -> swipe (clasificar) -> done
// Izquierda = FAVORABLE (verde) · Derecha = DESFAVORABLE (rojo)
// Contrato de navegacion con el deck + persistencia en localStorage.
// ============================================================
import { React, html, useState, useEffect, useCallback, useContext, useRef } from '../html.js';
import { CASES, FACTS, FEEDBACK } from '../catalog/swipe-data.js';
import { NavContext } from '../nav.js';

const STORE_KEY = 'nom035:swipe:v1';
const SCALE_SECONDS = 600; // 10 minutos
const PHASES = ['rules', 'scale', 'swipe', 'done'];

function fmt(s) {
  s = Math.max(0, s);
  return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
}

// ─── PERSISTENCIA ────────────────────────────────────────────────
function loadState() {
  try {
    const s = JSON.parse(localStorage.getItem(STORE_KEY) || 'null');
    if (!s || typeof s !== 'object') return {};
    const phase = PHASES.includes(s.phase) ? s.phase : 'rules';
    const results = Array.isArray(s.results) ? s.results.filter(Boolean) : [];
    let idx = Number.isInteger(s.idx) ? s.idx : 0;
    idx = Math.max(0, Math.min(idx, CASES.length));
    return {
      phase, idx, results,
      timeLeft: Number.isFinite(s.timeLeft) ? s.timeLeft : SCALE_SECONDS,
      started: !!s.started,
      paused: !!s.paused,
    };
  } catch { return {}; }
}
function saveState(s) { try { localStorage.setItem(STORE_KEY, JSON.stringify(s)); } catch { /* sin storage */ } }
function clearStoredState() { try { localStorage.removeItem(STORE_KEY); } catch { /* sin storage */ } }

// renderiza el cuerpo del caso (vinetas si la linea empieza con "• ")
function caseBody(body) {
  return (body || []).map((ln, i) => {
    const bullet = ln.startsWith('• ');
    return html`<p key=${i} class=${'swipe-p' + (bullet ? ' swipe-li' : '')}>${bullet ? ln.slice(2) : ln}</p>`;
  });
}

// ─── PANTALLA 1: REGLAS ──────────────────────────────────────────
function Rules({ onBegin, onReset, hasProgress }) {
  return html`
    <div class="swipe-rules">
      <p class="swipe-eyebrow">Dinámica · NOM-035</p>
      <h2 class="swipe-rules-ttl">El Swipe Corporativo</h2>
      <p class="swipe-rules-para">
        En equipo, clasifiquen cada situación laboral como una <b class="t-fav">condición favorable</b> o una <b class="t-des">condición desfavorable</b>. Primero discuten en equipo con el reloj; después clasificamos caso por caso deslizando cada tarjeta.
      </p>
      <div class="swipe-legend">
        <span class="swipe-legend-item"><span class="swipe-dot swipe-dot--fav"></span> Izquierda · Favorable</span>
        <span class="swipe-legend-item"><span class="swipe-dot swipe-dot--des"></span> Derecha · Desfavorable</span>
      </div>
      <button class="swipe-go swipe-rules-go" onClick=${onBegin}>Empezar dinámica</button>
      ${hasProgress ? html`<button class="sg-reset" onClick=${onReset}>Reiniciar</button>` : null}
    </div>
  `;
}

// ─── PANTALLA 2: BASCULA (timer 10 min) ──────────────────────────
function Scale({ timeLeft, started, paused, ended, fact, tilt, onStart, onPause, onAdd, onSub, onSkip, onReset }) {
  return html`
    <div class="swipe-scale">
      <button class="sg-reset swipe-scale-reset" onClick=${onReset}>Reiniciar</button>
      <p class="swipe-scale-ttl">${ended ? '¡Tiempo! Vamos a clasificar' : 'Trabajo en equipo'}</p>

      <div class="scale-stage">
        <div class="scale-beam" style=${{ '--tilt': tilt }}>
          <div class="scale-pan scale-pan--fav">FAVORABLE</div>
          <div class="scale-pan scale-pan--des">DESFAVORABLE</div>
        </div>
        <div class="scale-pillar"></div>
        <div class="scale-base"></div>
      </div>

      <div class=${'scale-fact' + (fact ? ' scale-fact--' + fact.side + ' show' : '')}>
        ${fact ? html`<span class="scale-fact-tag">Dato</span><span class="scale-fact-txt">${fact.text}</span>` : null}
      </div>

      <div class="swipe-timer">
        <span class=${'swipe-timer-num' + (ended ? ' done' : '')}>${fmt(timeLeft)}</span>
        <div class="swipe-scale-btns">
          ${ended
      ? html`<button class="swipe-go" onClick=${onSkip}>Clasificar</button>`
      : started
        ? html`
                <button class="sg-btn-sm" onClick=${onPause}>${paused ? 'Reanudar' : 'Pausar'}</button>
                <button class="sg-btn-sm" onClick=${onAdd}>+1 min</button>
                <button class="sg-btn-sm" onClick=${onSub}>-10 s</button>
                <button class="sg-btn-sm sg-btn-skip" onClick=${onSkip}>Saltar</button>`
        : html`
                <button class="swipe-go" onClick=${onStart}>Iniciar reloj (10:00)</button>
                <button class="sg-btn-sm sg-btn-skip" onClick=${onSkip}>Saltar</button>`}
        </div>
      </div>
    </div>
  `;
}

// ─── PANTALLA 3: SWIPE ───────────────────────────────────────────
function Swipe({ card, idx, total, swiping, flash, onSwipe, onReset }) {
  return html`
    <div class="swipe-stage">
      <button class="sg-reset swipe-stage-reset" onClick=${onReset}>Reiniciar</button>
      <div class="swipe-zone swipe-zone--fav"><span>FAVORABLE</span></div>
      <div class="swipe-zone swipe-zone--des"><span>DESFAVORABLE</span></div>
      <div class="swipe-counter">Caso ${Math.min(idx + 1, total)} / ${total}</div>

      ${card ? html`
        <div key=${idx} class=${'swipe-card' + (swiping ? ' swipe-card--out-' + swiping : '')}>
          <div class="swipe-card-tag">${card.title}</div>
          <div class="swipe-card-body">${caseBody(card.body)}</div>
        </div>
      ` : null}

      <div class="swipe-btns">
        <button class="swipe-btn swipe-btn--fav" onClick=${() => onSwipe('fav')}>Favorable</button>
        <button class="swipe-btn swipe-btn--des" onClick=${() => onSwipe('des')}>Desfavorable</button>
      </div>

      ${flash ? html`
        <div class=${'swipe-flash swipe-flash--' + flash}>
          <span class="swipe-flash-label">${flash === 'ok' ? '¡Correcto!' : 'Incorrecto'}</span>
        </div>
      ` : null}
    </div>
  `;
}

// ─── PANTALLA 4: CIERRE + INSPECCION ─────────────────────────────
const sideLabel = (s) => (s === 'fav' ? 'Favorable' : s === 'des' ? 'Desfavorable' : '—');

function Done({ results, inspect, onInspect, onClose, onPrev, onNext, onReset }) {
  const ok = results.filter(r => r && r.correct).length;
  const bad = results.filter(r => r && !r.correct).length;
  const c = inspect != null ? CASES[inspect] : null;
  const r = inspect != null ? results[inspect] : null;
  return html`
    <div class="swipe-done">
      <p class="swipe-eyebrow">Resultados</p>
      <h2 class="swipe-done-ttl">${ok} de ${results.length} correctas</h2>
      <div class="swipe-done-stats">
        <div class="swipe-stat swipe-stat--fav"><span class="swipe-stat-num">${ok}</span>Correctas</div>
        <div class="swipe-stat swipe-stat--des"><span class="swipe-stat-num">${bad}</span>Incorrectas</div>
      </div>

      <div class="swipe-grid">
        ${CASES.map((cs, i) => {
    const res = results[i];
    const cls = 'swipe-chip' + (res ? (res.correct ? ' swipe-chip--ok' : ' swipe-chip--bad') : '');
    return html`<button key=${cs.id} class=${cls} onClick=${() => onInspect(i)}>${i + 1}</button>`;
  })}
      </div>
      <p class="swipe-done-hint">Toca un caso para revisarlo y dar retroalimentación</p>
      <button class="sg-reset" onClick=${onReset}>Reiniciar dinámica</button>

      ${c ? html`
        <div class="swipe-inspect" onClick=${onClose}>
          <div class="swipe-inspect-card" onClick=${(e) => e.stopPropagation()}>
            <button class="swipe-nav-btn swipe-inspect-x" onClick=${onClose}>Cerrar</button>
            <div class="swipe-card-tag">${c.title}</div>
            <div class="swipe-inspect-body">${caseBody(c.body)}</div>
            <div class="swipe-inspect-verdict">
              <span class=${'swipe-tag ' + (r && r.side === 'fav' ? 'swipe-tag--fav' : 'swipe-tag--des')}>
                Tu respuesta: ${r ? sideLabel(r.side) : '—'}
              </span>
              <span class=${'swipe-tag ' + (c.side === 'fav' ? 'swipe-tag--fav' : 'swipe-tag--des')}>
                Correcta: ${sideLabel(c.side)}
              </span>
              <span class=${'swipe-verdict-badge ' + (r && r.correct ? 'is-ok' : 'is-bad')}>
                ${r && r.correct ? 'Acertaron' : 'Fallaron'}
              </span>
            </div>
            <p class="swipe-inspect-fb">${FEEDBACK[c.id]}</p>
            <div class="swipe-inspect-nav">
              <button class="swipe-nav-btn" onClick=${onPrev}>Anterior</button>
              <button class="swipe-nav-btn" onClick=${onNext}>Siguiente</button>
            </div>
          </div>
        </div>
      ` : null}
    </div>
  `;
}

// ─── ORQUESTADOR ─────────────────────────────────────────────────
export function SwipeGame() {
  const nav = useContext(NavContext);

  const bootRef = useRef();
  if (bootRef.current === undefined) bootRef.current = loadState();
  const boot = bootRef.current;

  const [phase, setPhase] = useState(boot.phase || 'rules');
  const [timeLeft, setTimeLeft] = useState(boot.timeLeft ?? SCALE_SECONDS);
  const [started, setStarted] = useState(boot.started ?? false);
  const [paused, setPaused] = useState(boot.paused ?? false);
  const [idx, setIdx] = useState(boot.idx ?? 0);
  const [results, setResults] = useState(boot.results || []);
  const [swiping, setSwiping] = useState(null); // 'fav' | 'des' | null (transitorio)
  const [flash, setFlash] = useState(null);     // 'ok' | 'bad' | null (retroalimentacion)
  const [inspect, setInspect] = useState(null); // indice del caso en revision | null

  // persistencia
  useEffect(() => {
    saveState({ phase, timeLeft, started, paused, idx, results });
  }, [phase, timeLeft, started, paused, idx, results]);

  // cuenta regresiva de la bascula (solo tras "Empezar")
  useEffect(() => {
    if (phase !== 'scale' || !started || paused || timeLeft <= 0) return;
    const id = setTimeout(() => setTimeLeft(t => t - 1), 1000);
    return () => clearTimeout(id);
  }, [phase, started, paused, timeLeft]);

  const doSwipe = useCallback((side) => {
    if (swiping || idx >= CASES.length) return;
    const correct = side === CASES[idx].side;
    setSwiping(side);
    setFlash(correct ? 'ok' : 'bad');
    setTimeout(() => {
      setResults(prev => {
        const next = prev.slice();
        next[idx] = { id: CASES[idx].id, side, correct };
        return next;
      });
      setSwiping(null);
      setFlash(null);
      setIdx(i => {
        const ni = i + 1;
        if (ni >= CASES.length) setPhase('done');
        return ni;
      });
    }, 640);
  }, [swiping, idx]);

  const resetGame = useCallback(() => {
    clearStoredState();
    setPhase('rules'); setTimeLeft(SCALE_SECONDS); setStarted(false);
    setPaused(false); setIdx(0); setResults([]); setSwiping(null);
    setFlash(null); setInspect(null);
  }, []);

  // CONTRATO con el deck. Izquierda=fav, derecha=des durante el swipe.
  useEffect(() => {
    if (!nav) return;
    return nav.claim((dir, source) => {
      // En swipe las flechas clasifican; al inspeccionar, navegan los casos.
      // En reglas/balanza/cierre el deck navega normal: el presentador puede
      // asomarse a otra slide y volver (el estado persiste).
      if (phase === 'swipe') {
        if (source !== 'key') return 'consumed';
        doSwipe(dir < 0 ? 'fav' : 'des');
        return 'consumed';
      }
      if (phase === 'done' && inspect != null) {
        if (source !== 'key') return 'consumed';
        setInspect(i => (i + (dir > 0 ? 1 : CASES.length - 1)) % CASES.length);
        return 'consumed';
      }
      return 'pass';
    });
  }, [nav, phase, doSwipe, inspect]);

  if (phase === 'rules') {
    return html`<${Rules} onBegin=${() => setPhase('scale')} onReset=${resetGame} hasProgress=${results.length > 0 || started} />`;
  }

  if (phase === 'scale') {
    const ended = started && timeLeft <= 0;
    const elapsed = SCALE_SECONDS - timeLeft;
    const fIdx = Math.floor(elapsed / 60);
    const fact = (started && !ended && fIdx >= 1) ? FACTS[Math.min(fIdx - 1, FACTS.length - 1)] : null;
    const tilt = ended ? '0deg' : fact ? (fact.side === 'fav' ? '-9deg' : '9deg') : '0deg';
    return html`<${Scale}
      timeLeft=${timeLeft} started=${started} paused=${paused} ended=${ended}
      fact=${fact} tilt=${tilt}
      onStart=${() => { setStarted(true); setPaused(false); }}
      onPause=${() => setPaused(p => !p)}
      onAdd=${() => setTimeLeft(t => t + 60)}
      onSub=${() => setTimeLeft(t => Math.max(0, t - 10))}
      onSkip=${() => setPhase('swipe')}
      onReset=${resetGame}
    />`;
  }

  if (phase === 'swipe') {
    return html`<${Swipe}
      card=${CASES[idx] || null} idx=${idx} total=${CASES.length}
      swiping=${swiping} flash=${flash} onSwipe=${doSwipe} onReset=${resetGame}
    />`;
  }

  return html`<${Done}
    results=${results} inspect=${inspect}
    onInspect=${(i) => setInspect(i)} onClose=${() => setInspect(null)}
    onPrev=${() => setInspect(i => (i + CASES.length - 1) % CASES.length)}
    onNext=${() => setInspect(i => (i + 1) % CASES.length)}
    onReset=${resetGame}
  />`;
}
