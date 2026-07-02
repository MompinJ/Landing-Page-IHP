// ============================================================
// DINAMICA: El Semaforo
// State machine: rules -> board -> analysis -> voting -> reveal -> board
// ============================================================
import { React, html, useState, useEffect, useCallback, useContext, useRef } from '../html.js';
import { CARDS, HINTS } from '../catalog/semaforo-data.js';
import { Shape, Cobrand } from './primitives.js';
import { NavContext } from '../nav.js';

const COLORS = {
  verde: { bg: '#27AE60', label: 'VERDE', text: '#fff' },
  amarillo: { bg: '#E9C84A', label: 'AMARILLO', text: '#1a1a1a' },
  rojo: { bg: '#EB5757', label: 'ROJO', text: '#fff' },
};

const DESCS = {
  verde: 'Condición que favorece el bienestar psicosocial',
  amarillo: 'Condición a vigilar o que puede mejorar',
  rojo: 'Factor de riesgo psicosocial activo',
};

function fmt(s) {
  return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
}

// ─── PERSISTENCIA (localStorage) ─────────────────────────────────
// El avance sobrevive a salidas accidentales del deck y a un refresh.
// Se sanea contra el catalogo actual por si las CARDS cambiaron.
const STORE_KEY = 'nom035:semaforo:v1';
const SCREENS = ['rules', 'board', 'analysis', 'voting', 'reveal'];

function loadState() {
  try {
    const s = JSON.parse(localStorage.getItem(STORE_KEY) || 'null');
    if (!s || typeof s !== 'object') return {};
    // las claves de objeto son strings; los ids de CARDS son numeros -> comparar como string
    const valid = new Set(CARDS.map(c => String(c.id)));
    const done = {};
    if (s.done) for (const k of Object.keys(s.done)) if (valid.has(String(k))) done[k] = s.done[k];
    let selId = (s.selId != null && valid.has(String(s.selId))) ? s.selId : null;
    let screen = SCREENS.includes(s.screen) ? s.screen : 'rules';
    if (['analysis', 'voting', 'reveal'].includes(screen) && selId == null) screen = 'board';
    return {
      screen, selId, done,
      time: Number.isFinite(s.time) ? s.time : 30,
      paused: !!s.paused,
      started: !!s.started,
      hintIdx: Number.isInteger(s.hintIdx) ? s.hintIdx : 0,
    };
  } catch { return {}; }
}
function saveState(s) { try { localStorage.setItem(STORE_KEY, JSON.stringify(s)); } catch { /* sin storage */ } }
function clearStoredState() { try { localStorage.removeItem(STORE_KEY); } catch { /* sin storage */ } }

// ─── PANTALLA 1: REGLAS ──────────────────────────────────────────
function Rules({ onReset, hasProgress }) {
  return html`
    <div class="sg-rules">
      <${Shape} shape="sky-tl"   fill="horizon" z=${1} delay=${0}   anim="fig-in" figx="-13%" />
      <${Shape} shape="steel-bl" fill="sky"     z=${2} delay=${160} anim="fig-in" figx="-13%" />
      <${Cobrand} hp="color" inst="azul" />
      <div class="sg-rules-body">
        <p class="sg-rules-eyebrow">Dinamica · NOM-035</p>
        <h2 class="sg-rules-ttl">El Semaforo</h2>
        <p class="sg-rules-para">
          En equipos, analicen cada caso de la mesa y voten en simultaneo con su paleta
          si el escenario es verde, amarillo o rojo. Despues de votar, revisamos juntos
          la respuesta correcta segun la NOM-035.
        </p>
        <div class="sg-colors">
          ${Object.entries(COLORS).map(([key, c]) => html`
            <div key=${key} class="sg-color-item" style=${{ '--sgc': c.bg }}>
              <div class="sg-color-accent"></div>
              <span class="sg-color-lbl" style=${{ color: c.bg }}>${c.label}</span>
              <p class="sg-color-txt">${DESCS[key]}</p>
            </div>
          `)}
        </div>
        ${hasProgress ? html`
          <p class="sg-rules-hint"><button class="sg-reset" onClick=${onReset}>Reiniciar dinamica</button></p>
        ` : null}
      </div>
    </div>
  `;
}

// ─── PANTALLA 2: TABLERO ─────────────────────────────────────────
function Board({ completed, onSelect, onReset }) {
  const [lifting, setLifting] = useState(null);
  const done = Object.keys(completed).length;

  const pick = (id) => {
    if (lifting != null) return;       // ya hay una tarjeta levantandose
    setLifting(id);
    setTimeout(() => onSelect(id), 470); // deja correr la animacion antes de cambiar de pantalla
  };

  return html`
    <div class=${'sg-board' + (lifting != null ? ' sg-board--busy' : '')}>
      <div class="sg-board-hdr">
        <span class="sg-board-ttl">La Mesa</span>
        <span class="sg-board-prog">${done} / ${CARDS.length} analizados</span>
        ${done > 0 ? html`<button class="sg-reset" onClick=${onReset}>Reiniciar</button>` : null}
      </div>
      ${CARDS.map(card => {
    const col = completed[card.id];
    const lift = lifting === card.id;
    const cls = 'sg-card'
      + (col ? ' sg-card--done' : ' sg-card--open')
      + (lift ? ' sg-card--lifting' : '');
    return html`
          <div
            key=${card.id}
            class=${cls}
            style=${{
        top: card.pos.top, left: card.pos.left,
        '--rot': card.pos.r, '--scl': card.pos.scl ?? 1, '--z': card.pos.z ?? 1,
        '--donec': col ? COLORS[col].bg : 'transparent',
      }}
            onClick=${() => !col && pick(card.id)}
          >
            ${card.image
        ? html`<img class="sg-card-img" src=${card.image} alt=${card.title} draggable=${false} />`
        : html`<div class="sg-card-ph"><span>${card.title}</span></div>`
      }
            ${col ? html`
              <div class="sg-card-stamp" style=${{ background: COLORS[col].bg, color: COLORS[col].text }}>
                ${COLORS[col].label}
              </div>
            ` : null}
          </div>
        `;
  })}
      ${done === CARDS.length ? html`
        <div class="sg-board-done">Dinamica completada — todos los casos resueltos</div>
      ` : null}
    </div>
  `;
}

// ─── PANTALLA 3: ANALISIS ────────────────────────────────────────
const TIMER_BASE = 30; // segundos de partida del contador

function Analysis({ card, timeLeft, paused, started, hintIdx, onStart, onPause, onAdd, onSkip }) {
  const pct = Math.max(0, Math.min(100, (timeLeft / TIMER_BASE) * 100));
  const urgent = started && timeLeft > 0 && timeLeft <= 10;
  const hint = HINTS[hintIdx];
  return html`
    <div class="sg-analysis">
      <div class="sg-ana-stage">
        ${card.image
      ? html`<img class="sg-ana-img" src=${card.image} alt=${card.title} draggable=${false} />`
      : html`<div class="sg-ana-ph">
              <span>${card.title}</span>
              <small>imagen del escenario aqui</small>
            </div>`
    }
      </div>

      <div class="sg-ana-right">
        <div class="sg-timer">
          <div class=${'sg-timer-ring' + (urgent ? ' urg' : '') + (started ? '' : ' idle')} style=${{ '--p': pct }}>
            <div class="sg-timer-core">
              <span class="sg-timer-num">${fmt(timeLeft)}</span>
              ${started ? null : html`<span class="sg-timer-cap">por clasificar</span>`}
            </div>
          </div>

          ${started
      ? html`<div class="sg-timer-btns">
              <button class="sg-btn-sm" onClick=${onPause}>${paused ? 'Reanudar' : 'Pausar'}</button>
              <button class="sg-btn-sm" onClick=${onAdd}>+10s</button>
              <button class="sg-btn-sm sg-btn-skip" onClick=${onSkip}>Saltar</button>
            </div>`
      : html`<div class="sg-timer-btns">
              <button class="sg-btn-primary sg-btn-start" onClick=${onStart}>Empezar contador</button>
              <button class="sg-btn-sm sg-btn-skip" onClick=${onSkip}>Saltar</button>
            </div>`}
        </div>

        <div class="sg-hints">
          <p class="sg-hint-tag">${hint.tag}</p>
          <div key=${hintIdx} class="sg-hint-body">
            <p class="sg-hint-txt">${hint.text}</p>
          </div>
          <div class="sg-hint-dots">
            ${HINTS.map((_, i) => html`<span key=${i} class=${'sg-dot' + (i === hintIdx ? ' on' : '')}></span>`)}
          </div>
        </div>
      </div>
    </div>
  `;
}

// ─── PANTALLA 4: VOTACION ────────────────────────────────────────
const LIGHT_ORDER = ['rojo', 'amarillo', 'verde']; // orden real del semaforo (arriba->abajo)

function Voting({ card, onReveal }) {
  return html`
    <div class="sg-voting">
      <p class="sg-voting-intro">Es hora de decidir</p>

      <div class="sg-semaforo">
        <div class="sg-semaforo-cap"></div>
        ${LIGHT_ORDER.map((key, i) => {
    const c = COLORS[key];
    return html`
            <div key=${key} class=${'sg-lamp sg-lamp--' + key} style=${{ '--lc': c.bg, '--i': i }}>
              <span class="sg-lamp-lbl" style=${{ color: c.text }}>${c.label}</span>
            </div>
          `;
  })}
      </div>

      <p class="sg-voting-sub">Cada equipo levanta su paleta</p>
      <button class="sg-btn-reveal-big" onClick=${onReveal}>Revelar respuesta</button>
    </div>
  `;
}

// ─── PANTALLA 5: REVELACION ──────────────────────────────────────
function Reveal({ card, onReturn }) {
  const c = COLORS[card.correctColor];
  return html`
    <div class="sg-reveal" style=${{ '--rc': c.bg, '--tc': c.text }}>
      <div class="sg-rev-stage">
        ${card.image
      ? html`<img class="sg-rev-img" src=${card.image} alt=${card.title} draggable=${false} />`
      : html`<div class="sg-rev-ph"><span>${card.title}</span></div>`
    }
      </div>

      <div class="sg-rev-panel">
        <div class="sg-rev-lamp"></div>
        <p class="sg-rev-kicker">Respuesta correcta</p>
        <p class="sg-rev-verdict">${c.label}</p>
        <p class="sg-rev-desc">${DESCS[card.correctColor]}</p>
        <p class="sg-rev-just">${card.justification}</p>
        <button class="sg-rev-next" onClick=${onReturn}>Siguiente caso</button>
      </div>
    </div>
  `;
}

// ─── ORQUESTADOR ─────────────────────────────────────────────────
export function SemaforoGame() {
  const nav = useContext(NavContext);

  // hidratacion: se lee storage una sola vez por montaje (al re-entrar reanuda).
  const bootRef = useRef();
  if (bootRef.current === undefined) bootRef.current = loadState();
  const boot = bootRef.current;

  const [screen, setScreen] = useState(boot.screen || 'rules');
  const [selId, setSelId] = useState(boot.selId ?? null);
  const [done, setDone] = useState(boot.done || {});
  const [time, setTime] = useState(boot.time ?? TIMER_BASE);
  const [paused, setPaused] = useState(boot.paused ?? false);
  const [started, setStarted] = useState(boot.started ?? false);
  const [hintIdx, setHintIdx] = useState(boot.hintIdx ?? 0);

  const card = CARDS.find(c => c.id === selId) || null;

  // persiste el avance ante cualquier cambio (salida accidental / refresh).
  useEffect(() => {
    saveState({ screen, selId, done, time, paused, started, hintIdx });
  }, [screen, selId, done, time, paused, started, hintIdx]);

  const resetGame = useCallback(() => {
    clearStoredState();
    setSelId(null); setDone({}); setTime(TIMER_BASE); setPaused(false); setStarted(false); setHintIdx(0);
    setScreen('rules');
  }, []);

  // countdown: solo corre tras pulsar "Empezar" (tiempo de gracia para leer el caso)
  useEffect(() => {
    if (screen !== 'analysis' || !started || paused) return;
    if (time <= 0) { setScreen('voting'); return; }
    const id = setTimeout(() => setTime(t => t - 1), 1000);
    return () => clearTimeout(id);
  }, [screen, started, paused, time]);

  // hint auto-advance
  useEffect(() => {
    if (screen !== 'analysis') return;
    const id = setInterval(() => setHintIdx(i => (i + 1) % HINTS.length), 5000);
    return () => clearInterval(id);
  }, [screen]);

  const selectCard = useCallback((id) => {
    setSelId(id); setTime(TIMER_BASE); setPaused(false); setStarted(false); setHintIdx(0);
    setScreen('analysis');
  }, []);

  const returnToBoard = useCallback(() => {
    if (selId && card) setDone(prev => ({ ...prev, [selId]: card.correctColor }));
    setSelId(null);
    setScreen('board');
  }, [selId, card]);

  // CONTRATO con el deck: la dinamica reclama la navegacion mientras esta montada.
  // Solo se "sale" del deck en los bordes (reglas y tablero); dentro de un caso
  // las flechas avanzan/retroceden el caso y la rueda/swipe se ignoran.
  useEffect(() => {
    if (!nav) return;
    return nav.claim((dir, source) => {
      if (source !== 'key') return 'consumed';        // rueda/swipe nunca mueven el deck aqui
      if (screen === 'rules') {
        if (dir > 0) { setScreen('board'); return 'consumed'; }
        return 'pass';                                // izquierda: salir a la slide anterior
      }
      if (screen === 'board') {
        if (dir > 0) return 'pass';                   // derecha: continuar la presentacion
        setScreen('rules'); return 'consumed';        // izquierda: volver a reglas (conserva avance)
      }
      if (screen === 'analysis') { setScreen(dir > 0 ? 'voting' : 'board');    return 'consumed'; }
      if (screen === 'voting')   { setScreen(dir > 0 ? 'reveal' : 'analysis'); return 'consumed'; }
      if (screen === 'reveal')   { dir > 0 ? returnToBoard() : setScreen('voting'); return 'consumed'; }
      return 'consumed';
    });
  }, [nav, screen, returnToBoard]);

  if (screen === 'rules') return html`<${Rules} onReset=${resetGame} hasProgress=${Object.keys(done).length > 0} />`;
  if (screen === 'board') return html`<${Board} completed=${done} onSelect=${selectCard} onReset=${resetGame} />`;
  if (screen === 'analysis') return html`<${Analysis}
    card=${card} timeLeft=${time} paused=${paused} started=${started} hintIdx=${hintIdx}
    onStart=${() => { setStarted(true); setPaused(false); }}
    onPause=${() => setPaused(p => !p)}
    onAdd=${() => setTime(t => t + 10)}
    onSkip=${() => setScreen('voting')}
  />`;
  if (screen === 'voting') return html`<${Voting} card=${card} onReveal=${() => setScreen('reveal')} />`;
  if (screen === 'reveal') return html`<${Reveal} card=${card} onReturn=${returnToBoard} />`;
  return null;
}
