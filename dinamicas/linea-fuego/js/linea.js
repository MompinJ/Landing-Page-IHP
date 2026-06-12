/* ============================================================
   DINAMICA LINEA DE FUEGO — motor
   Recorre las rondas (<g class="round">), cronometra cada una,
   evalua el clic en los .spot y revela las zonas .danger.
   ============================================================ */

(() => {
  const ROUND_S = 10;       // segundos por maniobra
  const HIT = 100;          // base por acierto
  const TIME_BONUS = 10;    // puntos por segundo restante
  const REVEAL_MS = 3400;   // pausa para ver las zonas y la regla

  const $ = (id) => document.getElementById(id);
  const rounds = Array.from(document.querySelectorAll('.round'));
  const TOTAL = rounds.length;
  const promptEl = $('prompt');
  const timerFill = $('timer-fill');
  const mRound = $('m-round'), mScore = $('m-score'), mStreak = $('m-streak');
  const hudStatus = $('hud-status');
  const verdict = $('verdict'), finale = $('finale');

  let idx = 0, score = 0, streak = 0, best = 0, hits = 0;
  let tLeft = ROUND_S, playing = false;

  const updateHud = () => {
    mRound.textContent = `${Math.min(idx + 1, TOTAL)}/${TOTAL}`;
    mScore.textContent = String(score);
    mStreak.textContent = String(streak);
  };

  const showVerdict = (good, title, why) => {
    verdict.hidden = false;
    verdict.className = `verdict ${good ? 'verdict--good' : 'verdict--bad'}`;
    verdict.innerHTML = `<h3>${title}</h3><p>${why}</p>`;
  };

  // ---------- flujo de rondas ----------
  const startRound = () => {
    if (idx >= TOTAL) { endGame(); return; }
    rounds.forEach((r, i) => {
      r.hidden = i !== idx;
      r.classList.remove('is-revealed');
      r.querySelectorAll('.spot').forEach((s) =>
        s.classList.remove('is-good', 'is-bad', 'is-answer'));
    });
    promptEl.textContent = rounds[idx].dataset.prompt;
    verdict.hidden = true;
    tLeft = ROUND_S;
    playing = true;
    hudStatus.textContent = 'ELIGE LA POSICION SEGURA';
    updateHud();
  };

  const resolve = (spot, timeout = false) => {
    if (!playing) return;
    playing = false;
    const round = rounds[idx];
    round.classList.add('is-revealed');

    const safeSpot = round.querySelector('.spot[data-safe="true"]');
    const good = !timeout && spot.dataset.safe === 'true';

    if (good) {
      const bonus = Math.round(tLeft) * TIME_BONUS;
      score += HIT + bonus;
      hits++;
      streak++;
      best = Math.max(best, streak);
      spot.classList.add('is-good');
      showVerdict(true, `POSICION SEGURA (+${HIT + bonus})`, round.dataset.why);
      hudStatus.textContent = 'FUERA DE LA LINEA DE FUEGO';
    } else {
      streak = 0;
      if (spot) spot.classList.add('is-bad');
      safeSpot.classList.add('is-answer');
      showVerdict(false, timeout ? 'TE QUEDASTE EN LA ZONA' : 'ESTABAS EN LA LINEA DE FUEGO', round.dataset.why);
      document.body.classList.add('shake');
      setTimeout(() => document.body.classList.remove('shake'), 450);
      hudStatus.textContent = `LA SEGURA ERA LA ${safeSpot.dataset.k}`;
    }
    updateHud();

    setTimeout(() => { idx++; startRound(); }, REVEAL_MS);
  };

  const endGame = () => {
    const pct = Math.round((hits / TOTAL) * 100);
    const rank = hits === TOTAL ? 'Instinto de superviviente.' :
                 pct >= 66 ? 'Sabes donde pararte.' :
                 pct >= 40 ? 'A medio camino de la zona segura.' : 'Hoy no entras al patio sin escolta.';
    $('finale-kicker').textContent = 'RONDAS COMPLETAS';
    $('finale-title').textContent = rank;
    $('finale-score').textContent = `${score} PTS`;
    $('finale-detail').textContent = `${hits}/${TOTAL} POSICIONES SEGURAS · MEJOR RACHA ${best}`;
    finale.hidden = false;
  };

  const reset = () => {
    idx = 0; score = 0; streak = 0; best = 0; hits = 0;
    finale.hidden = true;
    startRound();
  };

  // ---------- entrada ----------
  rounds.forEach((r) => {
    r.querySelectorAll('.spot').forEach((s) => {
      s.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        resolve(s);
      });
    });
  });

  document.addEventListener('keydown', (e) => {
    const k = e.key.toLowerCase();
    if (k === 'r') { reset(); return; }
    if (k === 'enter' && !finale.hidden) { reset(); return; }
    if (!playing) return;
    const map = { a: 'A', b: 'B', c: 'C', d: 'D', 1: 'A', 2: 'B', 3: 'C', 4: 'D' };
    if (map[k]) {
      const spot = rounds[idx].querySelector(`.spot[data-k="${map[k]}"]`);
      if (spot) resolve(spot);
    }
  });
  $('restart').addEventListener('click', reset);

  // ---------- reloj ----------
  let last = performance.now();
  const tick = (now) => {
    requestAnimationFrame(tick);
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    if (!playing) return;
    tLeft -= dt;
    const p = Math.max(0, tLeft / ROUND_S);
    timerFill.style.width = `${p * 100}%`;
    timerFill.style.background = p < 0.25 ? '#c23b2e' : p < 0.5 ? '#EE7523' : '#FFC627';
    if (tLeft <= 0) resolve(null, true);
  };

  reset();
  requestAnimationFrame(tick);
})();
