(() => {
  const ink = document.getElementById('ink');
  const ictx = ink.getContext('2d');
  const overlay = document.getElementById('overlay');
  const octx = overlay.getContext('2d');

  const intro = document.getElementById('intro');
  const modal = document.getElementById('modal');
  const finale = document.getElementById('finale');
  const btnHelp = document.getElementById('btn-help');
  const btnStart = document.getElementById('btn-start');
  const modalOk = document.getElementById('modal-ok');
  const finaleReset = document.getElementById('finale-reset');
  const cue = document.getElementById('hud-cue');

  const FACTORS = [
    { name: 'Condiciones del ambiente de trabajo', color: '#F2C230', desc: 'Ruido, iluminacion, temperatura, quimicos o riesgos fisicos que danan al trabajador.' },
    { name: 'Carga de trabajo excesiva', color: '#4FB8E0', desc: 'Exigencias cuantitativas o ritmos que superan lo que se puede hacer en el tiempo dado.' },
    { name: 'Falta de control sobre el trabajo', color: '#66C07A', desc: 'El trabajador no puede decidir como, cuando o en que orden hace su tarea, aunque este capacitado.' },
    { name: 'Liderazgo negativo', color: '#E2574C', desc: 'Trato hostil, gritos, falta de claridad o nulo reconocimiento por parte del jefe.' },
    { name: 'Relaciones laborales negativas', color: '#B588D9', desc: 'Conflictos, aislamiento o falta de apoyo entre companeros.' },
    { name: 'Violencia laboral', color: '#EE9A3A', desc: 'Hostigamiento, acoso, malos tratos o exclusion intencional.' }
  ];
  const META = { name: 'Bienestar Laboral', color: '#54BBAB', desc: 'Reconocer estas 6 senales a tiempo es el primer paso para un ambiente de trabajo sano.' };

  // 8 puntos (0=inicio, 1-6=factores, 7=meta) en coordenadas relativas al viewport
  const ROUTE = [
    { x: 0.06, y: 0.74 }, { x: 0.20, y: 0.34 }, { x: 0.34, y: 0.72 }, { x: 0.48, y: 0.30 },
    { x: 0.62, y: 0.72 }, { x: 0.76, y: 0.30 }, { x: 0.88, y: 0.66 }, { x: 0.94, y: 0.20 }
  ];
  const TIME_LIMIT_MS = 9000;
  const TOLERANCE_PX = 70;
  const START_R = 70;
  const ARRIVE_R = 64;

  const st = {
    phase: 'intro', // intro | play | done
    turnStatus: 'waiting', // waiting | active | reveal
    segment: 0,
    activePointerId: null,
    startTime: 0,
    lastPoint: null,
    devSum: 0,
    devCount: 0,
    revealedUpTo: 0,
    turnsTaken: 0,
    scores: []
  };

  let guides = [];

  const px = (pt) => ({ x: pt.x * innerWidth, y: pt.y * innerHeight });
  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

  const bezierPoint = (A, B, C, t) => {
    const mt = 1 - t;
    return { x: mt * mt * A.x + 2 * mt * t * C.x + t * t * B.x, y: mt * mt * A.y + 2 * mt * t * C.y + t * t * B.y };
  };

  const buildGuide = (A, B, bend) => {
    const mid = { x: (A.x + B.x) / 2, y: (A.y + B.y) / 2 };
    const dx = B.x - A.x, dy = B.y - A.y;
    const len = Math.hypot(dx, dy) || 1;
    const ctrl = { x: mid.x + (-dy / len) * bend, y: mid.y + (dx / len) * bend };
    const pts = [];
    for (let i = 0; i <= 48; i++) pts.push(bezierPoint(A, B, ctrl, i / 48));
    return pts;
  };

  const nearestDist = (pts, p) => {
    let best = Infinity;
    for (const q of pts) { const d = dist(p, q); if (d < best) best = d; }
    return best;
  };

  const computeGuides = () => {
    const bend = Math.min(innerWidth, innerHeight) * 0.12;
    guides = [];
    for (let i = 0; i < ROUTE.length - 1; i++) {
      guides.push(buildGuide(px(ROUTE[i]), px(ROUTE[i + 1]), bend * (i % 2 === 0 ? 1 : -1)));
    }
  };

  const checkpointInfo = (idx) => {
    if (idx >= 1 && idx <= 6) return FACTORS[idx - 1];
    if (idx === 7) return META;
    return null;
  };
  const checkpointColor = (idx) => (idx === 0 ? '#ffffff' : (checkpointInfo(idx)?.color ?? '#ffffff'));
  const currentColor = () => checkpointColor(st.segment + 1);

  const resizeCanvas = (c, context) => {
    const dpr = window.devicePixelRatio || 1;
    c.width = innerWidth * dpr;
    c.height = innerHeight * dpr;
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
  };
  const resizeAll = () => {
    resizeCanvas(ink, ictx);
    resizeCanvas(overlay, octx);
    computeGuides();
  };

  const widthFor = (evt) => 2 + (evt.pressure > 0 ? evt.pressure : 0.5) * 5;

  const drawStroke = (a, b, color, w) => {
    ictx.strokeStyle = color;
    ictx.lineCap = 'round';
    ictx.lineJoin = 'round';
    ictx.lineWidth = w;
    ictx.beginPath();
    ictx.moveTo(a.x, a.y);
    ictx.lineTo(b.x, b.y);
    ictx.stroke();
  };

  const showCue = (text, warn) => {
    cue.textContent = text;
    cue.classList.toggle('is-warn', !!warn);
  };

  const flashHint = () => {
    showCue('Toca justo el punto que parpadea para iniciar tu turno', true);
    setTimeout(() => { if (st.turnStatus === 'waiting') showCue('Toca el punto que parpadea para iniciar tu turno'); }, 900);
  };

  const updateHud = () => {
    document.getElementById('hud-segment').textContent = `${Math.min(st.segment + 1, 7)} / 7`;
    document.getElementById('hud-turns').textContent = st.turnsTaken;
    const avg = st.scores.length ? Math.round(st.scores.reduce((a, b) => a + b, 0) / st.scores.length) : 0;
    document.getElementById('hud-avg').textContent = st.scores.length ? `${avg}%` : '--';
    document.querySelectorAll('#factor-list li').forEach((li) => {
      li.classList.toggle('is-done', Number(li.dataset.idx) <= st.revealedUpTo);
    });
  };

  const beginTurn = (evt, pos) => {
    st.turnStatus = 'active';
    st.activePointerId = evt.pointerId;
    ink.setPointerCapture(evt.pointerId);
    st.startTime = performance.now();
    st.lastPoint = pos;
    st.devSum = 0;
    st.devCount = 0;
    st.turnsTaken += 1;
    updateHud();
    showCue('Sigue la guia hasta el siguiente punto...');
  };

  const accumulateDeviation = (pos) => {
    const d = nearestDist(guides[st.segment], pos);
    st.devSum += d;
    st.devCount += 1;
  };

  const endTurn = (reason) => {
    if (st.turnStatus !== 'active') return;
    st.turnStatus = 'reveal';
    if (st.activePointerId != null) { try { ink.releasePointerCapture(st.activePointerId); } catch (e) { /* ya liberado */ } }
    st.activePointerId = null;

    const avgDev = st.devCount ? st.devSum / st.devCount : TOLERANCE_PX;
    const score = Math.max(0, Math.min(100, Math.round(100 * (1 - avgDev / TOLERANCE_PX))));
    st.scores.push(score);

    const idx = st.segment + 1;
    const info = checkpointInfo(idx);
    document.getElementById('modal-kicker').textContent = reason === 'success' ? 'LLEGASTE' : 'SE ACABO EL TIEMPO';
    document.getElementById('modal-badge').style.setProperty('--badge-color', info.color);
    document.getElementById('modal-title').textContent = info.name;
    document.getElementById('modal-desc').textContent = info.desc;
    document.getElementById('modal-score').textContent = `${score}%`;
    document.getElementById('modal-ok').textContent = idx < 7 ? 'SIGUIENTE RELEVO [ENTER]' : 'VER RESULTADO FINAL [ENTER]';
    modal.hidden = false;
    showCue('Toca SIGUIENTE para continuar el relevo');
  };

  const advanceSegment = () => {
    if (modal.hidden) return;
    modal.hidden = true;
    st.revealedUpTo = st.segment + 1;
    st.segment += 1;
    updateHud();
    if (st.segment >= ROUTE.length - 1) {
      finishRelay();
    } else {
      st.turnStatus = 'waiting';
      showCue('Toca el punto que parpadea para iniciar tu turno');
    }
  };

  const finishRelay = () => {
    st.phase = 'done';
    const avg = st.scores.length ? Math.round(st.scores.reduce((a, b) => a + b, 0) / st.scores.length) : 0;
    document.getElementById('finale-turns').textContent = st.turnsTaken;
    document.getElementById('finale-avg').textContent = `${avg}%`;
    finale.hidden = false;
  };

  const resetAll = () => {
    st.phase = 'intro';
    st.turnStatus = 'waiting';
    st.segment = 0;
    st.activePointerId = null;
    st.lastPoint = null;
    st.devSum = 0;
    st.devCount = 0;
    st.revealedUpTo = 0;
    st.turnsTaken = 0;
    st.scores = [];
    ictx.clearRect(0, 0, innerWidth, innerHeight);
    modal.hidden = true;
    finale.hidden = true;
    intro.hidden = false;
    showCue('Toca el punto que parpadea para iniciar tu turno');
    updateHud();
  };

  const startRelay = () => {
    intro.hidden = true;
    st.phase = 'play';
    st.turnStatus = 'waiting';
  };

  const openHelp = () => {
    if (st.phase !== 'play' || st.turnStatus === 'active') return;
    st.phase = 'intro';
    intro.hidden = false;
  };

  ink.addEventListener('pointerdown', (evt) => {
    if (st.phase !== 'play') return;
    const pos = { x: evt.clientX, y: evt.clientY };

    if (st.turnStatus === 'waiting') {
      if (dist(pos, px(ROUTE[st.segment])) <= START_R) beginTurn(evt, pos);
      else flashHint();
      return;
    }
    if (st.turnStatus === 'active' && st.activePointerId === null) {
      st.activePointerId = evt.pointerId;
      ink.setPointerCapture(evt.pointerId);
      if (st.lastPoint) drawStroke(st.lastPoint, pos, currentColor(), widthFor(evt));
      st.lastPoint = pos;
    }
  });

  ink.addEventListener('pointermove', (evt) => {
    if (st.turnStatus !== 'active' || evt.pointerId !== st.activePointerId) return;
    const raw = typeof evt.getCoalescedEvents === 'function' ? evt.getCoalescedEvents() : [];
    const chain = raw.length ? raw : [evt];
    for (const p of chain) {
      const pos = { x: p.clientX, y: p.clientY };
      drawStroke(st.lastPoint, pos, currentColor(), widthFor(p));
      accumulateDeviation(pos);
      st.lastPoint = pos;
      if (dist(pos, px(ROUTE[st.segment + 1])) <= ARRIVE_R) { endTurn('success'); break; }
    }
  });

  const onLift = (evt) => { if (evt.pointerId === st.activePointerId) st.activePointerId = null; };
  ink.addEventListener('pointerup', onLift);
  ink.addEventListener('pointercancel', onLift);

  const drawOverlay = () => {
    octx.clearRect(0, 0, innerWidth, innerHeight);
    if (st.phase !== 'play' || st.segment >= guides.length) return;

    const g = guides[st.segment];
    octx.setLineDash([10, 10]);
    octx.strokeStyle = 'rgba(255,255,255,0.32)';
    octx.lineWidth = 3;
    octx.beginPath();
    g.forEach((p, i) => (i ? octx.lineTo(p.x, p.y) : octx.moveTo(p.x, p.y)));
    octx.stroke();
    octx.setLineDash([]);

    for (let idx = 0; idx <= 7; idx++) {
      const p = px(ROUTE[idx]);
      const revealed = idx <= st.revealedUpTo;
      const isStart = idx === st.segment && st.turnStatus === 'waiting';
      const isTarget = idx === st.segment + 1 && st.turnStatus === 'active';
      const color = revealed || idx === 0 ? checkpointColor(idx) : 'rgba(255,255,255,0.25)';

      octx.beginPath();
      octx.arc(p.x, p.y, isStart ? 16 : 11, 0, Math.PI * 2);
      octx.fillStyle = color;
      octx.fill();

      if (isStart) {
        const pulse = 22 + 8 * Math.sin(performance.now() / 180);
        octx.beginPath();
        octx.arc(p.x, p.y, pulse, 0, Math.PI * 2);
        octx.strokeStyle = '#ffffff';
        octx.lineWidth = 3;
        octx.stroke();
      }
      if (isTarget) {
        const pulse = 18 + 6 * Math.sin(performance.now() / 220);
        octx.beginPath();
        octx.arc(p.x, p.y, pulse, 0, Math.PI * 2);
        octx.strokeStyle = 'rgba(255,255,255,0.55)';
        octx.lineWidth = 2;
        octx.stroke();

        const elapsed = performance.now() - st.startTime;
        const frac = Math.min(1, elapsed / TIME_LIMIT_MS);
        octx.beginPath();
        octx.arc(p.x, p.y, 30, -Math.PI / 2, -Math.PI / 2 + frac * Math.PI * 2);
        octx.strokeStyle = frac > 0.8 ? '#ff5d45' : '#ffffff';
        octx.lineWidth = 4;
        octx.stroke();
      }
    }
  };

  const tick = () => {
    drawOverlay();
    if (st.phase === 'play' && st.turnStatus === 'active') {
      if (performance.now() - st.startTime >= TIME_LIMIT_MS) endTurn('timeout');
    }
    requestAnimationFrame(tick);
  };

  btnHelp.addEventListener('click', openHelp);
  btnStart.addEventListener('click', startRelay);
  modalOk.addEventListener('click', advanceSegment);
  finaleReset.addEventListener('click', resetAll);

  window.addEventListener('keydown', (evt) => {
    const k = evt.key.toLowerCase();
    if (k === 'h') { if (intro.hidden) openHelp(); else if (st.phase === 'intro' && st.turnsTaken === 0) startRelay(); }
    if (k === 'enter' || evt.key === ' ') {
      if (!intro.hidden) { evt.preventDefault(); startRelay(); }
      else if (!modal.hidden) { evt.preventDefault(); advanceSegment(); }
      else if (!finale.hidden) { evt.preventDefault(); resetAll(); }
    }
    if (k === 'r') resetAll();
  });

  window.addEventListener('resize', resizeAll);

  resizeAll();
  updateHud();
  tick();
})();
