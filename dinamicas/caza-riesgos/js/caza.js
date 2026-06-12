/* ============================================================
   DINAMICA CAZA DE RIESGOS — motor
   Detecta los <g class="hz"> del SVG, cronometra la ronda,
   marca hallazgos y fallos, y revela lo que falto al final.
   ============================================================ */

(() => {
  // ---------- configuracion ----------
  const ROUND_S = 90;        // segundos de ronda
  const HIT = 100;           // puntos por riesgo hallado
  const MISS = -25;          // puntos por clic fallido
  const TIME_BONUS = 5;      // puntos por segundo restante (si hallas todo)
  const MISS_COOLDOWN = 350; // ms entre penalizaciones (anti spam)

  const NS = 'http://www.w3.org/2000/svg';
  const $ = (id) => document.getElementById(id);
  const svg = $('scene');
  const hzs = Array.from(svg.querySelectorAll('.hz'));
  const TOTAL = hzs.length;

  const mFound = $('m-found'), mScore = $('m-score'), mTime = $('m-time');
  const timerFill = $('timer-fill');
  const panelList = $('panel-list');
  const hudStatus = $('hud-status');
  const toast = $('toast'), finale = $('finale');

  let toastTimer = 0;
  const say = (msg, bad = false, ms = 2600) => {
    toast.hidden = false;
    toast.textContent = msg;
    toast.classList.toggle('toast--bad', bad);
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { toast.hidden = true; }, ms);
  };

  // ---------- estado ----------
  let found, score, tLeft, playing, lastMiss, marks;

  // panel: una entrada por riesgo, oculta hasta hallarla (o revelarla)
  const items = hzs.map((g) => {
    const li = document.createElement('li');
    li.textContent = 'Por descubrir...';
    panelList.appendChild(li);
    return li;
  });

  const centerOf = (g) => {
    const b = g.getBBox();
    return [b.x + b.width / 2, b.y + b.height / 2];
  };

  const svgEl = (tag, attrs) => {
    const e = document.createElementNS(NS, tag);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    return e;
  };

  const updateHud = () => {
    mFound.textContent = `${found.size}/${TOTAL}`;
    mScore.textContent = String(score);
    mTime.textContent = `${Math.ceil(tLeft)}s`;
    const p = Math.max(0, tLeft / ROUND_S);
    timerFill.style.width = `${p * 100}%`;
    timerFill.style.background = p < 0.2 ? '#c23b2e' : p < 0.45 ? '#EE7523' : '#54BBAB';
  };

  // ---------- hallazgos ----------
  const foundHz = (g, idx, x, y) => {
    found.add(idx);
    g.classList.add('is-found');
    items[idx].classList.add('is-found');
    items[idx].textContent = g.dataset.label;
    score += HIT;

    const m = svgEl('g', { class: 'mark-found' });
    m.appendChild(svgEl('circle', { cx: x, cy: y, r: 30, 'transform-origin': `${x} ${y}` }));
    m.appendChild(svgEl('path', { d: `M ${x - 11} ${y} l 8 9 14 -17` }));
    svg.appendChild(m);
    marks.push(m);

    say(`${g.dataset.label.toUpperCase()}: ${g.dataset.why}`);
    updateHud();

    if (found.size === TOTAL) endRound(true);
  };

  const missClick = (x, y) => {
    const now = performance.now();
    if (now - lastMiss < MISS_COOLDOWN) return;
    lastMiss = now;
    score += MISS;

    const m = svgEl('g', { class: 'mark-miss' });
    m.appendChild(svgEl('path', { d: `M ${x - 10} ${y - 10} l 20 20 M ${x + 10} ${y - 10} l -20 20` }));
    svg.appendChild(m);
    marks.push(m);
    setTimeout(() => m.remove(), 650);

    hudStatus.textContent = 'AHI NO HAY RIESGO (-25)';
    updateHud();
  };

  // coordenadas de pantalla -> coordenadas del viewBox
  const toSvgPoint = (e) => {
    const pt = svg.createSVGPoint();
    pt.x = e.clientX; pt.y = e.clientY;
    return pt.matrixTransform(svg.getScreenCTM().inverse());
  };

  svg.addEventListener('pointerdown', (e) => {
    if (!playing) return;
    const p = toSvgPoint(e);
    const g = e.target.closest('.hz');
    if (g && !g.classList.contains('is-found')) {
      foundHz(g, hzs.indexOf(g), p.x, p.y);
    } else {
      missClick(p.x, p.y);
    }
  });

  // ---------- fin de ronda ----------
  const endRound = (complete) => {
    playing = false;
    let bonus = 0;

    if (complete) {
      bonus = Math.round(tLeft) * TIME_BONUS;
      score += bonus;
    } else {
      // revela los que faltaron
      hzs.forEach((g, i) => {
        if (found.has(i)) return;
        items[i].classList.add('is-missed');
        items[i].textContent = g.dataset.label;
        const [cx, cy] = centerOf(g);
        const m = svgEl('g', { class: 'mark-missed' });
        m.appendChild(svgEl('circle', { cx, cy, r: 40 }));
        svg.appendChild(m);
        marks.push(m);
      });
    }
    updateHud();

    const pct = Math.round((found.size / TOTAL) * 100);
    const rank = found.size === TOTAL && score >= TOTAL * HIT ? 'Ojo de halcon HSE.' :
                 pct >= 80 ? 'Supervisor de seguridad.' :
                 pct >= 50 ? 'Observador en formacion.' : 'Urge el curso de refresco.';

    $('finale-kicker').textContent = complete ? 'PATIO ASEGURADO' : 'SE ACABO EL TIEMPO';
    $('finale-title').textContent = rank;
    $('finale-score').textContent = `${Math.max(0, score)} PTS`;
    $('finale-detail').textContent =
      `${found.size}/${TOTAL} RIESGOS HALLADOS` +
      (complete ? ` · BONO DE TIEMPO +${bonus}` : ' · LOS ROJOS SE TE FUERON');

    setTimeout(() => { finale.hidden = false; }, complete ? 700 : 2300);
  };

  const reset = () => {
    found = new Set();
    score = 0;
    tLeft = ROUND_S;
    playing = true;
    lastMiss = 0;
    (marks ?? []).forEach((m) => m.remove());
    marks = [];
    hzs.forEach((g) => g.classList.remove('is-found'));
    items.forEach((li) => {
      li.classList.remove('is-found', 'is-missed');
      li.textContent = 'Por descubrir...';
    });
    finale.hidden = true;
    toast.hidden = true;
    hudStatus.textContent = 'ENCUENTRA LOS RIESGOS: CLIC SOBRE CADA UNO';
    updateHud();
  };

  document.addEventListener('keydown', (e) => {
    const k = e.key.toLowerCase();
    if (k === 'r') reset();
    if (k === 'enter' && !finale.hidden) reset();
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
    if (tLeft <= 0) { tLeft = 0; updateHud(); endRound(false); return; }
    updateHud();
  };

  reset();
  requestAnimationFrame(tick);
})();
