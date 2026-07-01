// ============================================================
// DINAMICA: El Expediente NOM-035 (Identificacion de factores)
// Flujo: rules (pizarron) -> case (expediente x3, marcatextos) -> matrix
// Estetica detectivesca: corcho, chinchetas, maquina de escribir, sello.
// Contrato de navegacion con el deck + persistencia en localStorage.
// ============================================================
import { React, html, useState, useEffect, useCallback, useContext, useRef } from '../html.js';
import { FACTORS, TIPS, CASES, caseFactors } from '../catalog/expediente-data.js';
import { NavContext } from '../nav.js';

const STORE_KEY = 'nom035:expediente:v1';
const TIMER = 600; // 10 min
const PHASES = ['rules', 'case', 'matrix'];
const FC = Object.fromEntries(FACTORS.map(f => [f.id, f]));

function fmt(s) { s = Math.max(0, s); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); }

// ─── PERSISTENCIA ────────────────────────────────────────────────
function loadState() {
  try {
    const s = JSON.parse(localStorage.getItem(STORE_KEY) || 'null');
    if (!s || typeof s !== 'object') return {};
    const phase = PHASES.includes(s.phase) ? s.phase : 'rules';
    const found = (s.found && typeof s.found === 'object') ? s.found : {};
    let idx = Number.isInteger(s.idx) ? s.idx : 0;
    idx = Math.max(0, Math.min(idx, CASES.length - 1));
    return {
      phase, idx, found,
      timeLeft: Number.isFinite(s.timeLeft) ? s.timeLeft : TIMER,
      started: !!s.started, paused: !!s.paused,
    };
  } catch { return {}; }
}
function saveState(s) { try { localStorage.setItem(STORE_KEY, JSON.stringify(s)); } catch { /* sin storage */ } }
function clearStoredState() { try { localStorage.removeItem(STORE_KEY); } catch { /* sin storage */ } }

// panel de 6 factores (compartido). mode: 'list' (pizarron) | 'evidence' (caso)
function FactorPanel({ mode, foundIds, presentIds, tip, shake, onReveal }) {
  return html`
    <div class="exp-factors">
      ${FACTORS.map(f => {
    const found = foundIds && foundIds.includes(f.id);
    const cls = 'exp-fac'
      + (found ? ' is-found' : '')
      + (mode === 'list' && tip === f.id ? ' is-tip' : '')
      + (shake === f.id ? ' is-shake' : '');
    const st = found ? { '--fc': f.color, borderColor: f.color } : (mode === 'list' && tip === f.id ? { '--fc': f.color } : null);
    return html`
          <div key=${f.id} class=${cls} style=${st}
            onClick=${mode === 'evidence' ? () => onReveal(f.id) : null}>
            <span class="exp-fac-n">${f.id}</span>
            <span class="exp-fac-name">${f.name}</span>
            ${found ? html`<span class="exp-fac-check">✓</span>` : null}
          </div>
        `;
  })}
    </div>
  `;
}

// ─── PANTALLA 1: PIZARRON / REGLAS ───────────────────────────────
function Rules({ timeLeft, started, paused, ended, tip, onStart, onPause, onAdd, onSub, onOpen, onReset, hasProgress }) {
  return html`
    <div class="exp-rules exp-board">
      <button class="sg-reset exp-reset" onClick=${onReset}>Reiniciar</button>
      <div class="exp-rules-left">
        <p class="exp-kicker">Dinámica · NOM-035</p>
        <h2 class="exp-ttl">El Expediente</h2>
        <p class="exp-rules-para">
          En equipo, lean sus 3 tarjetas (casos) y anoten qué factores de riesgo
          detectan. Al terminar el tiempo abrimos los expedientes y los revisamos juntos.
        </p>
        <div class="exp-timer">
          <span class=${'exp-timer-num' + (ended ? ' done' : '')}>${fmt(timeLeft)}</span>
          <div class="exp-timer-btns">
            ${ended
      ? html`<button class="exp-go" onClick=${onOpen}>Abrir expediente</button>`
      : started
        ? html`
                  <button class="sg-btn-sm" onClick=${onPause}>${paused ? 'Reanudar' : 'Pausar'}</button>
                  <button class="sg-btn-sm" onClick=${onAdd}>+1 min</button>
                  <button class="sg-btn-sm" onClick=${onSub}>-10 s</button>
                  <button class="exp-go" onClick=${onOpen}>Abrir</button>`
        : html`
                  <button class="exp-go" onClick=${onStart}>Empezar (10:00)</button>
                  <button class="sg-btn-sm" onClick=${onOpen}>Saltar</button>`}
          </div>
        </div>
        ${hasProgress ? html`<p class="exp-progress-note">Hay avance guardado.</p>` : null}
      </div>
      <div class="exp-rules-right">
        <p class="exp-panel-ttl">Factores de riesgo psicosocial</p>
        <${FactorPanel} mode="list" tip=${tip} />
        <div class=${'exp-tip' + (tip > 0 ? ' show' : '')}>
          ${tip > 0 ? html`<span class="exp-tip-tag">Tip de auditor</span><span class="exp-tip-txt">${TIPS[tip]}</span>` : null}
        </div>
      </div>
    </div>
  `;
}

// ─── PANTALLA 2: EXPEDIENTE DEL CASO ─────────────────────────────
function CaseView({ c, idx, total, foundIds, presentIds, closed, shake, onReveal, onReset }) {
  return html`
    <div class="exp-case exp-board">
      <button class="sg-reset exp-reset" onClick=${onReset}>Reiniciar</button>
      <div class="exp-file">
        <div class="exp-file-tab">${c.code} · CASO ${idx + 1}/${total}</div>
        <div class="exp-file-head">
          <span class="exp-file-name">${c.name}</span>
          <span class="exp-file-sub">Declaración del caso</span>
        </div>
        <p class="exp-file-body">
          ${c.segments.map((s, i) => {
    if (s.f && foundIds.includes(s.f)) {
      return html`<mark key=${i} class="exp-mark" style=${{ '--fc': FC[s.f].color }}>${s.t}</mark>`;
    }
    return html`<span key=${i}>${s.t}</span>`;
  })}
        </p>
        ${closed ? html`<div class="exp-stamp">CASO CERRADO</div>` : null}
      </div>
      <div class="exp-case-side">
        <p class="exp-panel-ttl">Evidencia · factores</p>
        <${FactorPanel} mode="evidence" foundIds=${foundIds} presentIds=${presentIds} shake=${shake} onReveal=${onReveal} />
        <p class="exp-detected">Factores detectados: ${foundIds.length}/${presentIds.length}</p>
      </div>
    </div>
  `;
}

// ─── PANTALLA 3: MATRIZ FINAL ────────────────────────────────────
function Matrix({ onReset }) {
  return html`
    <div class="exp-matrix exp-board">
      <button class="sg-reset exp-reset" onClick=${onReset}>Reiniciar</button>
      <h2 class="exp-matrix-ttl">Matriz de coincidencias</h2>
      <table class="exp-table">
        <thead>
          <tr>
            <th class="exp-th-case">Caso</th>
            ${FACTORS.map(f => html`<th key=${f.id} style=${{ '--fc': f.color }}><span>${f.id}</span></th>`)}
          </tr>
        </thead>
        <tbody>
          ${CASES.map(c => {
    const pf = caseFactors(c);
    return html`
              <tr key=${c.id}>
                <td class="exp-td-case">${c.name}</td>
                ${FACTORS.map(f => html`
                  <td key=${f.id} class=${pf.includes(f.id) ? 'is-hit' : ''} style=${pf.includes(f.id) ? { '--fc': f.color } : null}>
                    ${pf.includes(f.id) ? '✓' : ''}
                  </td>
                `)}
              </tr>
            `;
  })}
        </tbody>
      </table>
      <div class="exp-legend">
        ${FACTORS.map(f => html`<span key=${f.id} class="exp-legend-i"><i style=${{ background: f.color }}></i>${f.id}. ${f.name}</span>`)}
      </div>
    </div>
  `;
}

// ─── ORQUESTADOR ─────────────────────────────────────────────────
export function ExpedienteGame() {
  const nav = useContext(NavContext);
  const bootRef = useRef();
  if (bootRef.current === undefined) bootRef.current = loadState();
  const boot = bootRef.current;

  const [phase, setPhase] = useState(boot.phase || 'rules');
  const [timeLeft, setTimeLeft] = useState(boot.timeLeft ?? TIMER);
  const [started, setStarted] = useState(boot.started ?? false);
  const [paused, setPaused] = useState(boot.paused ?? false);
  const [idx, setIdx] = useState(boot.idx ?? 0);
  const [found, setFound] = useState(boot.found || {});
  const [shake, setShake] = useState(null); // factor id (transitorio)

  useEffect(() => {
    saveState({ phase, timeLeft, started, paused, idx, found });
  }, [phase, timeLeft, started, paused, idx, found]);

  // cuenta regresiva del pizarron
  useEffect(() => {
    if (phase !== 'rules' || !started || paused || timeLeft <= 0) return;
    const id = setTimeout(() => setTimeLeft(t => t - 1), 1000);
    return () => clearTimeout(id);
  }, [phase, started, paused, timeLeft]);

  const c = CASES[idx];
  const presentIds = caseFactors(c);
  const foundIds = found[c.id] || [];
  const closed = foundIds.length > 0 && foundIds.length === presentIds.length;

  const reveal = useCallback((fid) => {
    const cur = CASES[idx];
    const present = caseFactors(cur).includes(fid);
    if (!present) { setShake(fid); setTimeout(() => setShake(s => (s === fid ? null : s)), 480); return; }
    setFound(prev => {
      const arr = prev[cur.id] || [];
      if (arr.includes(fid)) return prev;
      return { ...prev, [cur.id]: [...arr, fid] };
    });
  }, [idx]);

  const resetGame = useCallback(() => {
    clearStoredState();
    setPhase('rules'); setTimeLeft(TIMER); setStarted(false); setPaused(false);
    setIdx(0); setFound({}); setShake(null);
  }, []);

  // CONTRATO con el deck. En 'case' las flechas navegan entre casos.
  useEffect(() => {
    if (!nav) return;
    return nav.claim((dir, source) => {
      if (phase === 'case') {
        if (source !== 'key') return 'consumed';
        if (dir > 0) { if (idx < CASES.length - 1) setIdx(idx + 1); else setPhase('matrix'); }
        else { if (idx > 0) setIdx(idx - 1); else setPhase('rules'); }
        return 'consumed';
      }
      if (phase === 'matrix') {
        if (source !== 'key') return 'consumed';
        if (dir < 0) { setPhase('case'); setIdx(CASES.length - 1); return 'consumed'; }
        return 'pass';
      }
      return 'pass'; // rules: navegacion normal del deck; se entra con el boton
    });
  }, [nav, phase, idx]);

  if (phase === 'rules') {
    const ended = started && timeLeft <= 0;
    const elapsed = TIMER - timeLeft;
    const tip = (started && !ended) ? FACTORS[(Math.floor(elapsed / 30)) % FACTORS.length].id : -1;
    return html`<${Rules}
      timeLeft=${timeLeft} started=${started} paused=${paused} ended=${ended} tip=${tip}
      onStart=${() => { setStarted(true); setPaused(false); }}
      onPause=${() => setPaused(p => !p)}
      onAdd=${() => setTimeLeft(t => t + 60)}
      onSub=${() => setTimeLeft(t => Math.max(0, t - 10))}
      onOpen=${() => setPhase('case')}
      onReset=${resetGame}
      hasProgress=${Object.keys(found).length > 0}
    />`;
  }

  if (phase === 'case') {
    return html`<${CaseView}
      c=${c} idx=${idx} total=${CASES.length}
      foundIds=${foundIds} presentIds=${presentIds} closed=${closed} shake=${shake}
      onReveal=${reveal} onReset=${resetGame}
    />`;
  }

  return html`<${Matrix} onReset=${resetGame} />`;
}
