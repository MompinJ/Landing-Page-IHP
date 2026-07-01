// ============================================================
// DINAMICA: Auditoria Sorpresa (Obligaciones NOM-035)
// Flujo: brief (terminal) -> case (alerta + reloj) -> reveal -> closing
// Estetica: terminal / centro de control / investigacion de incidentes.
// Contrato de navegacion con el deck + persistencia en localStorage.
// ============================================================
import { React, html, useState, useEffect, useCallback, useContext, useRef } from '../html.js';
import { CASES, OBLIG } from '../catalog/auditoria-data.js';
import { NavContext } from '../nav.js';

const STORE_KEY = 'nom035:auditoria:v1';
const CASE_SECS = 20;
const PHASES = ['brief', 'case', 'closing'];
const sideLabel = (s) => (s === 'patron' ? 'Obligación del Patrón' : 'Obligación del Trabajador');

function loadState() {
  try {
    const s = JSON.parse(localStorage.getItem(STORE_KEY) || 'null');
    if (!s || typeof s !== 'object') return {};
    const phase = PHASES.includes(s.phase) ? s.phase : 'brief';
    let idx = Number.isInteger(s.idx) ? s.idx : 0;
    idx = Math.max(0, Math.min(idx, CASES.length - 1));
    return {
      phase, idx, revealed: !!s.revealed, paused: !!s.paused,
      timeLeft: Number.isFinite(s.timeLeft) ? s.timeLeft : CASE_SECS,
    };
  } catch { return {}; }
}
function saveState(s) { try { localStorage.setItem(STORE_KEY, JSON.stringify(s)); } catch { /* sin storage */ } }
function clearStoredState() { try { localStorage.removeItem(STORE_KEY); } catch { /* sin storage */ } }

// ─── PANTALLA 1: PREPARACION (terminal) ──────────────────────────
function Brief({ onStart, onReset, hasProgress }) {
  return html`
    <div class="aud-screen aud-brief">
      <button class="sg-reset aud-reset" onClick=${onReset}>Reiniciar</button>
      <div class="aud-terminal">
        <p class="aud-line">${'> PREPARANDO AUDITORÍA DE LA NOM-035'}<span class="aud-blink">_</span></p>
        <p class="aud-line aud-dim">${'> DESPLIEGUEN SUS MANUALES'}</p>
        <p class="aud-line aud-dim">${'> Recorten y extiendan sus tiras (Patrón y Trabajador) sobre la mesa.'}</p>
        <p class="aud-brief-info">
          En pantalla aparecerá un reporte de incidente. Encuentren la tira exacta
          con la regla que se rompió y levántenla antes que los demás. Puede ser
          responsabilidad de la empresa o del trabajador.
        </p>
        <button class="aud-go" onClick=${onStart}>▶ Iniciar auditoría</button>
        ${hasProgress ? html`<p class="aud-note">Auditoría en curso guardada.</p>` : null}
      </div>
    </div>
  `;
}

// ─── PANTALLA 2/3: CASO + REVEAL ─────────────────────────────────
function CaseView({ c, idx, total, timeLeft, revealed, ob, onReveal, onNext, onReset, last }) {
  const urgent = !revealed && timeLeft <= 6;
  return html`
    <div class=${'aud-screen aud-case' + (revealed ? ' is-revealed' : '')}>
      <button class="sg-reset aud-reset" onClick=${onReset}>Reiniciar</button>
      <div class="aud-case-hd">
        <span class="aud-incident">▲ INCIDENTE</span>
        <span class="aud-caseno">CASO ${idx + 1} / ${total}</span>
      </div>

      <div class="aud-body">
        <div class="aud-report">
          <p class="aud-report-txt">${c.text}</p>
        </div>

        ${revealed ? html`
          <div class="aud-verdict">
            <div class="aud-stamp">INCUMPLIMIENTO<br/>CONFIRMADO</div>
            <div class=${'aud-strip aud-strip--' + ob.side}>
              <span class="aud-strip-side">${sideLabel(ob.side)}</span>
              <span class="aud-strip-txt">${ob.t}</span>
            </div>
            <p class="aud-why">${c.why}</p>
          </div>
        ` : null}
      </div>

      <div class="aud-foot">
        ${revealed
      ? html`<button class="aud-go" onClick=${onNext}>${last ? 'Cerrar auditoría' : 'Siguiente caso ▶'}</button>`
      : html`
            <span class=${'aud-timer' + (urgent ? ' urg' : '')}>00:${String(Math.max(0, timeLeft)).padStart(2, '0')}</span>
            <button class="aud-go aud-reveal" onClick=${onReveal}>Revelar incumplimiento</button>`}
      </div>
    </div>
  `;
}

// ─── PANTALLA 4: CIERRE ──────────────────────────────────────────
function Closing({ onReset }) {
  return html`
    <div class="aud-screen aud-closing">
      <button class="sg-reset aud-reset" onClick=${onReset}>Reiniciar</button>
      <p class="aud-close-kicker">Auditoría finalizada</p>
      <div class="aud-balance">
        <div class="aud-balance-side aud-balance--patron"><span>PATRÓN</span></div>
        <div class="aud-balance-eq">=</div>
        <div class="aud-balance-side aud-balance--trab"><span>TRABAJADOR</span></div>
      </div>
      <h2 class="aud-close-ttl">Responsabilidad compartida</h2>
      <p class="aud-close-txt">
        La NOM-035 no es solo que la empresa cumpla, ni solo que el trabajador cumpla.
        Si la empresa capacita pero no asisten, el sistema falla. Si el trabajador reporta
        pero la empresa no evalúa, el sistema falla.
      </p>
    </div>
  `;
}

// ─── ORQUESTADOR ─────────────────────────────────────────────────
export function AuditoriaGame() {
  const nav = useContext(NavContext);
  const bootRef = useRef();
  if (bootRef.current === undefined) bootRef.current = loadState();
  const boot = bootRef.current;

  const [phase, setPhase] = useState(boot.phase || 'brief');
  const [idx, setIdx] = useState(boot.idx ?? 0);
  const [revealed, setRevealed] = useState(boot.revealed ?? false);
  const [timeLeft, setTimeLeft] = useState(boot.timeLeft ?? CASE_SECS);
  const [paused, setPaused] = useState(boot.paused ?? false);

  useEffect(() => {
    saveState({ phase, idx, revealed, timeLeft, paused });
  }, [phase, idx, revealed, timeLeft, paused]);

  // reloj rapido del caso
  useEffect(() => {
    if (phase !== 'case' || revealed || paused || timeLeft <= 0) return;
    const id = setTimeout(() => setTimeLeft(t => t - 1), 1000);
    return () => clearTimeout(id);
  }, [phase, revealed, paused, timeLeft]);

  const startAudit = useCallback(() => { setPhase('case'); setIdx(0); setRevealed(false); setTimeLeft(CASE_SECS); }, []);
  const reveal = useCallback(() => setRevealed(true), []);
  const nextCase = useCallback(() => {
    setIdx(i => {
      if (i < CASES.length - 1) { setRevealed(false); setTimeLeft(CASE_SECS); return i + 1; }
      setPhase('closing'); return i;
    });
  }, []);
  const resetGame = useCallback(() => {
    clearStoredState();
    setPhase('brief'); setIdx(0); setRevealed(false); setTimeLeft(CASE_SECS); setPaused(false);
  }, []);

  // CONTRATO con el deck
  useEffect(() => {
    if (!nav) return;
    return nav.claim((dir, source) => {
      if (phase === 'case') {
        if (source !== 'key') return 'consumed';
        if (dir > 0) { if (!revealed) reveal(); else nextCase(); }
        else { if (revealed) setRevealed(false); else if (idx > 0) { setIdx(idx - 1); setRevealed(false); setTimeLeft(CASE_SECS); } else setPhase('brief'); }
        return 'consumed';
      }
      if (phase === 'closing') {
        if (source !== 'key') return 'consumed';
        if (dir < 0) { setPhase('case'); setIdx(CASES.length - 1); setRevealed(true); return 'consumed'; }
        return 'pass';
      }
      return 'pass'; // brief: navegacion del deck; se entra con el boton
    });
  }, [nav, phase, idx, revealed, reveal, nextCase]);

  if (phase === 'brief') {
    return html`<${Brief} onStart=${startAudit} onReset=${resetGame} hasProgress=${idx > 0 || revealed} />`;
  }
  if (phase === 'case') {
    const c = CASES[idx];
    return html`<${CaseView}
      c=${c} idx=${idx} total=${CASES.length} timeLeft=${timeLeft} revealed=${revealed}
      ob=${OBLIG[c.answer]} last=${idx === CASES.length - 1}
      onReveal=${reveal} onNext=${nextCase} onReset=${resetGame}
    />`;
  }
  return html`<${Closing} onReset=${resetGame} />`;
}
