/* ============================================================
   DINAMICA AMARRE EL BUQUE — motor
   4 puntos de amarre x 8 bitas. Cada cabo se clasifica por su
   angulo (largo / traves / spring). En la prueba, cada cabo
   resiste segun su alineacion con la fuerza (solo jala):
     align = max(0, direccion_punto->bita . -fuerza)
   La carga se reparte proporcional a la alineacion; el cabo que
   excede su resistencia revienta (snap-back) y se recalcula en
   cascada. Sin cabos que resistan = buque al garete.
   NOTA: fisica simplificada para demo; validar con un experto
   en maniobras de amarre.
   ============================================================ */

(() => {
  // ---------- configuracion ----------
  const STRENGTH = 100;      // resistencia de cada cabo
  const MAX_LINES = 6;
  const BASE = 300, COST_LINE = 20, COST_SNAP = 60, COST_ADRIFT = 100;
  const ROUNDS = [
    { title: 'RONDA 1 // CORRIENTE DE PROA', sub: 'La corriente entra por la PROA y empuja el buque hacia POPA',
      ux: -1, uy: 0, mag: 230 },
    { title: 'RONDA 2 // VIENTO DE TIERRA 35 KT', sub: 'El viento sopla desde el muelle y separa el buque hacia el agua',
      ux: 0, uy: -1, mag: 260 },
    { title: 'RONDA 3 // TORMENTA CRUZADA', sub: 'Viento de tierra + corriente de POPA: separa el buque y lo empuja a PROA',
      ux: 0.5, uy: -0.866, mag: 300 }
  ];

  // ---------- DOM ----------
  const $ = (id) => document.getElementById(id);
  const scene = $('scene'), quay = $('quay'), ship = $('ship'), svg = $('ropes');
  const bigarrow = $('bigarrow');
  const hudRound = $('hud-round'), hudLines = $('hud-lines'), hudScore = $('hud-score');
  const hudStatus = $('hud-status');
  const fcTitle = $('fc-title'), fcSub = $('fc-sub');
  const testBtn = $('test');
  const toast = $('toast'), alarm = $('alarm');
  const verdict = $('verdict'), intro = $('intro'), finale = $('finale');

  let toastTimer = 0;
  const say = (msg) => {
    toast.hidden = false;
    toast.textContent = msg;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { toast.hidden = true; }, 2800);
  };

  const NS = 'http://www.w3.org/2000/svg';
  const svgEl = (tag, attrs) => {
    const el = document.createElementNS(NS, tag);
    Object.entries(attrs || {}).forEach(([k, v]) => el.setAttribute(k, v));
    return el;
  };

  // ---------- estado ----------
  const st = {
    round: 0, score: 0,
    lines: [], sel: null,
    snapsRound: 0, verdictKind: '',
    phase: 'intro'
  };
  let points = [], bitas = [], preview = null;

  // ---------- escenario ----------
  const layout = () => {
    const W = window.innerWidth, H = window.innerHeight;
    const quayTop = H * 0.68;
    quay.style.top = `${quayTop}px`;

    const sw = Math.min(680, W * 0.56);
    const sh = Math.min(120, H * 0.17);
    const sx = (W - sw) / 2, sy = quayTop - sh - 30;
    ship.style.left = `${sx}px`;
    ship.style.top = `${sy}px`;
    ship.style.width = `${sw}px`;
    ship.style.height = `${sh}px`;

    // puntos de amarre en el costado del muelle
    document.querySelectorAll('.mpoint').forEach((el) => el.remove());
    points = [
      { f: 0.08, tag: 'POPA' },
      { f: 0.32, tag: 'SPRING' },
      { f: 0.62, tag: 'SPRING' },
      { f: 0.93, tag: 'PROA' }
    ].map((p, i) => {
      const el = document.createElement('div');
      el.className = 'mpoint';
      el.dataset.tag = p.tag;
      const x = sx + sw * p.f, y = sy + sh - 3;
      el.style.left = `${x}px`;
      el.style.top = `${y}px`;
      el.addEventListener('click', (e) => { e.stopPropagation(); clickPoint(i); });
      scene.appendChild(el);
      return { x, y, i, tag: p.tag, half: i >= 2 ? 'fwd' : 'aft', el };
    });

    // bitas a lo largo del muelle
    document.querySelectorAll('.bita').forEach((el) => el.remove());
    bitas = [];
    const span = Math.min(W - 70, sw + 520);
    const bx0 = W / 2 - span / 2, by = quayTop + 36;
    for (let i = 0; i < 8; i++) {
      const x = bx0 + (span / 7) * i;
      const el = document.createElement('div');
      el.className = 'bita';
      el.style.left = `${x}px`;
      el.style.top = `${by}px`;
      el.innerHTML = `<span class="bita__tag">B${i + 1}</span>`;
      el.addEventListener('click', (e) => { e.stopPropagation(); clickBita(i); });
      el.addEventListener('pointerenter', () => previewLine(i));
      el.addEventListener('pointerleave', clearPreview);
      scene.appendChild(el);
      bitas.push({ x, y: by, i, el });
    }
  };

  // ---------- cabos ----------
  const classify = (p, b) => {
    const dx = b.x - p.x, dy = b.y - p.y;
    const len = Math.hypot(dx, dy) || 1;
    if (Math.abs(dx) / len < 0.45) return 'TRAVES';
    if (dx > 0) return p.half === 'fwd' ? 'LARGO PROA' : 'SPRING POPA';
    return p.half === 'fwd' ? 'SPRING PROA' : 'LARGO POPA';
  };

  const addLine = (pi, bi) => {
    if (st.lines.length >= MAX_LINES) { say(`MAXIMO ${MAX_LINES} CABOS: CLICK SOBRE UN CABO PARA QUITARLO`); return; }
    if (st.lines.some((l) => l.pi === pi && l.bi === bi)) { say('ESE CABO YA ESTA TENDIDO'); return; }
    const p = points[pi], b = bitas[bi];
    const label = classify(p, b);
    const g = svgEl('g');
    const hit = svgEl('line', { x1: p.x, y1: p.y, x2: b.x, y2: b.y, class: 'hit' });
    const rope = svgEl('line', { x1: p.x, y1: p.y, x2: b.x, y2: b.y, class: 'rope' });
    const text = svgEl('text', { x: (p.x + b.x) / 2 + 6, y: (p.y + b.y) / 2 - 6 });
    text.textContent = label;
    g.append(hit, rope, text);
    svg.appendChild(g);
    const line = { pi, bi, p, b, label, g, rope };
    g.addEventListener('click', (e) => { e.stopPropagation(); removeLine(line); });
    st.lines.push(line);
    updateHud();
  };

  const removeLine = (line) => {
    if (st.phase !== 'rig') return;
    st.lines = st.lines.filter((l) => l !== line);
    line.g.remove();
    updateHud();
  };

  const clearLines = () => {
    st.lines.forEach((l) => l.g.remove());
    st.lines = [];
    updateHud();
  };

  const previewLine = (bi) => {
    clearPreview();
    if (st.phase !== 'rig' || st.sel === null) return;
    const p = points[st.sel], b = bitas[bi];
    bitas[bi].el.classList.add('is-hot');
    preview = svgEl('g');
    const l = svgEl('line', { x1: p.x, y1: p.y, x2: b.x, y2: b.y, class: 'preview' });
    const t = svgEl('text', { x: (p.x + b.x) / 2 + 6, y: (p.y + b.y) / 2 - 6 });
    t.textContent = classify(p, b);
    preview.append(l, t);
    svg.appendChild(preview);
  };

  const clearPreview = () => {
    bitas.forEach((b) => b.el.classList.remove('is-hot'));
    if (preview) { preview.remove(); preview = null; }
  };

  // ---------- seleccion ----------
  const clickPoint = (i) => {
    if (st.phase !== 'rig') return;
    st.sel = st.sel === i ? null : i;
    points.forEach((p, j) => p.el.classList.toggle('is-sel', j === st.sel));
    if (st.sel !== null) say(`${points[i].tag} EN MANO: AHORA CLICK EN UNA BITA`);
  };

  const clickBita = (i) => {
    if (st.phase !== 'rig') return;
    if (st.sel === null) { say('PRIMERO ELIGE UN PUNTO DEL BUQUE'); return; }
    addLine(st.sel, i);
    clearPreview();
    deselect();
  };

  const deselect = () => {
    st.sel = null;
    points.forEach((p) => p.el.classList.remove('is-sel'));
    clearPreview();
  };

  // ---------- fisica ----------
  const alignOf = (l, R) => {
    const dx = l.b.x - l.p.x, dy = l.b.y - l.p.y;
    const len = Math.hypot(dx, dy) || 1;
    return Math.max(0, (dx / len) * -R.ux + (dy / len) * -R.uy);
  };

  const tint = (l, load) => {
    l.rope.style.stroke =
      load > STRENGTH ? '#ff5d45' :
      load > 82 ? '#ff9d6b' :
      load > 55 ? '#ffd76e' : '#8fe6a8';
  };

  const snapCones = (l) => {
    const ang = Math.atan2(l.b.y - l.p.y, l.b.x - l.p.x) * 180 / Math.PI;
    [[l.p, ang], [l.b, ang + 180]].forEach(([pt, rot]) => {
      const c = document.createElement('div');
      c.className = 'snapcone';
      c.style.left = `${pt.x}px`;
      c.style.top = `${pt.y - 28}px`;
      c.style.transform = `rotate(${rot}deg)`;
      scene.appendChild(c);
      setTimeout(() => c.remove(), 1700);
    });
  };

  const snapLine = (line) => {
    line.g.classList.add('is-snap');
    snapCones(line);
    st.snapsRound++;
    st.lines = st.lines.filter((l) => l !== line);
    document.body.classList.add('shake');
    setTimeout(() => document.body.classList.remove('shake'), 520);
    say(`REVENTO EL ${line.label}: NUNCA TE PARES EN LA LINEA DEL CABO (SNAP-BACK)`);
    setTimeout(() => line.g.remove(), 700);
    updateHud();
  };

  const showArrow = (R) => {
    const sx = parseFloat(ship.style.left), sy = parseFloat(ship.style.top);
    const sw = parseFloat(ship.style.width), sh = parseFloat(ship.style.height);
    bigarrow.hidden = false;
    bigarrow.style.left = `${sx + sw / 2 - 46}px`;
    bigarrow.style.top = `${sy + sh / 2 - 20}px`;
    bigarrow.style.transform = `rotate(${Math.atan2(R.uy, R.ux) * 180 / Math.PI}deg)`;
  };

  const runTest = () => {
    if (st.phase !== 'rig') return;
    if (!st.lines.length) { say('SIN CABOS NO HAY AMARRE: TIENDE AL MENOS UNO'); return; }
    st.phase = 'test';
    testBtn.disabled = true;
    deselect();
    const R = ROUNDS[st.round];
    const used = st.lines.length;
    showArrow(R);

    // simula la cascada
    const seq = [];
    let active = [...st.lines];
    for (;;) {
      const aligns = active.map((l) => alignOf(l, R));
      const sum = aligns.reduce((a, b) => a + b, 0);
      if (sum < 0.08) { seq.push({ type: 'adrift' }); break; }
      const loads = aligns.map((a) => (R.mag * a) / sum);
      let worst = -1, wl = STRENGTH;
      loads.forEach((ld, i) => { if (ld > wl) { wl = ld; worst = i; } });
      if (worst < 0) { seq.push({ type: 'hold' }); break; }
      seq.push({ type: 'snap', line: active[worst] });
      active.splice(worst, 1);
    }

    // colorea las cargas iniciales
    const aligns0 = st.lines.map((l) => alignOf(l, R));
    const sum0 = aligns0.reduce((a, b) => a + b, 0) || 1;
    st.lines.forEach((l, i) => tint(l, (R.mag * aligns0[i]) / sum0));

    // reproduce
    let t = 1000;
    seq.forEach((ev) => {
      if (ev.type === 'snap') { setTimeout(() => snapLine(ev.line), t); t += 750; }
      else if (ev.type === 'adrift') setTimeout(() => adrift(), t + 400);
      else setTimeout(() => hold(used), t + 400);
    });
  };

  const adrift = () => {
    const R = ROUNDS[st.round];
    ship.style.transform = `translate(${R.ux * 90}px, ${R.uy * 90}px) rotate(${R.uy ? -4 : 3}deg)`;
    alarm.hidden = false;
    st.score -= COST_ADRIFT;
    st.verdictKind = 'adrift';
    setTimeout(() => {
      $('vd-kicker').textContent = 'AL GARETE';
      $('vd-title').textContent = 'El amarre no aguanto.';
      $('vd-detail').innerHTML =
        `REVENTARON ${st.snapsRound} CABOS Y NADA RESISTIO LA FUERZA.<br>` +
        `-${COST_ADRIFT} PTS · REACOMODA Y REINTENTA`;
      $('vd-next').textContent = 'REINTENTAR';
      verdict.hidden = false;
      st.phase = 'verdict';
      updateHud();
    }, 1500);
  };

  const hold = (used) => {
    const R = ROUNDS[st.round];
    const roundScore = Math.max(0, BASE - used * COST_LINE - st.snapsRound * COST_SNAP);
    st.score += roundScore;
    st.verdictKind = 'hold';
    // meneo de victoria
    ship.style.transform = `translate(${R.ux * 8}px, ${R.uy * 8}px)`;
    setTimeout(() => { ship.style.transform = ''; }, 700);
    $('vd-kicker').textContent = 'RONDA SUPERADA';
    $('vd-title').textContent =
      st.snapsRound === 0 && used <= 4 ? 'Amarre de libro.' :
      st.snapsRound === 0 ? 'Aguanto firme.' : 'Aguanto... de milagro.';
    $('vd-detail').innerHTML =
      `${used} CABOS (-${used * COST_LINE}) · ${st.snapsRound} REVENTADOS (-${st.snapsRound * COST_SNAP})<br>` +
      `+${roundScore} PTS ESTA RONDA`;
    $('vd-next').textContent = st.round >= ROUNDS.length - 1 ? 'VER RESULTADO' : 'SIGUIENTE RONDA';
    verdict.hidden = false;
    st.phase = 'verdict';
    updateHud();
  };

  const nextStep = () => {
    verdict.hidden = true;
    alarm.hidden = true;
    bigarrow.hidden = true;
    ship.style.transform = '';
    if (st.verdictKind === 'adrift') {
      st.lines.forEach((l) => { l.rope.style.stroke = ''; });
      st.phase = 'rig';
      testBtn.disabled = false;
      updateHud();
      return;
    }
    st.round++;
    if (st.round >= ROUNDS.length) { showFinale(); return; }
    setupRound();
  };

  const showFinale = () => {
    st.phase = 'over';
    const rank = st.score >= 660 ? 'Contramaestre mayor.' :
                 st.score >= 540 ? 'Cabo de mar con oficio.' :
                 st.score >= 380 ? 'Marinero de cubierta.' : 'Grumete de bitas.';
    $('finale-kicker').textContent = 'MANIOBRA COMPLETA';
    $('finale-title').textContent = rank;
    $('finale-score').textContent = `${st.score} PTS`;
    $('finale-detail').textContent = `${ROUNDS.length} PRONOSTICOS RESISTIDOS · MAX ${BASE * ROUNDS.length} PTS`;
    finale.hidden = false;
  };

  // ---------- rondas ----------
  const setupRound = () => {
    clearLines();
    st.snapsRound = 0;
    st.phase = 'rig';
    testBtn.disabled = false;
    ship.style.transform = '';
    const R = ROUNDS[st.round];
    fcTitle.textContent = R.title;
    fcSub.textContent = R.sub;
    hudStatus.textContent = 'TIENDE TUS CABOS Y PRUEBA EL AMARRE';
    updateHud();
  };

  const updateHud = () => {
    hudRound.textContent = `${Math.min(st.round + 1, ROUNDS.length)}/${ROUNDS.length}`;
    hudLines.textContent = `${st.lines.length}/${MAX_LINES}`;
    hudScore.textContent = st.score;
  };

  const reset = () => {
    layout();
    clearLines();
    st.round = 0; st.score = 0; st.snapsRound = 0;
    st.sel = null; st.verdictKind = '';
    st.phase = 'intro';
    verdict.hidden = true;
    finale.hidden = true;
    alarm.hidden = true;
    bigarrow.hidden = true;
    ship.style.transform = '';
    intro.hidden = false;
    const R = ROUNDS[0];
    fcTitle.textContent = R.title;
    fcSub.textContent = R.sub;
    updateHud();
  };

  const startGame = () => {
    intro.hidden = true;
    if (st.phase === 'intro') {
      st.phase = 'rig';
      testBtn.disabled = false;
      say('PRONOSTICO EN PANTALLA: TIENDE CABOS QUE SE OPONGAN A LA FUERZA');
    }
  };

  const openHelp = () => {
    if (st.phase !== 'rig') return;
    st.phase = 'intro';
    deselect();
    intro.hidden = false;
  };

  // ---------- entrada ----------
  document.addEventListener('keydown', (e) => {
    const k = e.key.toLowerCase();
    if (k === 'r') reset();
    if (k === 'escape') deselect();
    if (k === 'h') { if (intro.hidden) openHelp(); else startGame(); }
    if ((k === 'enter' || k === ' ') && !intro.hidden) { e.preventDefault(); startGame(); return; }
    if (k === 'enter' && !verdict.hidden) nextStep();
    if (k === 'enter' && st.phase === 'over' && !finale.hidden) reset();
  });
  scene.addEventListener('click', deselect);
  testBtn.addEventListener('click', runTest);
  $('vd-next').addEventListener('click', nextStep);
  $('start').addEventListener('click', startGame);
  $('help').addEventListener('click', openHelp);
  $('restart').addEventListener('click', reset);
  window.addEventListener('resize', reset);

  reset();
})();
