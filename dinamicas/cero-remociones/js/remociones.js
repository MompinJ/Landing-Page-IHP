/* ============================================================
   DINAMICA CERO REMOCIONES — motor
   FASE RECIBO: se apilan 16 cajas (7 pilas x 4 alturas), cada
   una con su dia de salida. FASE DESPACHO: los dias corren y
   se retira cada caja en orden; cada caja que hay que quitar
   de encima es una REMOCION (-60) y la grua la reacomoda en la
   pila mas baja (sin pensar, como pasa de verdad).
   ============================================================ */

(() => {
  // ---------- configuracion ----------
  const COLS = 7, TIERS = 4;
  const DAYS = [1, 1, 1, 1, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 5, 5];
  const DCOLOR = { 1: '#ff5d45', 2: '#EE7523', 3: '#FFC627', 4: '#54BBAB', 5: '#009BDE' };
  const PT_REM = 60, PT_TIME = 1;
  const STEP_T = 0.6;              // segundos por paso del despacho

  // ---------- DOM ----------
  const $ = (id) => document.getElementById(id);
  const yard = $('yard'), trolley = $('trolley'), cable = $('cable');
  const hangbox = $('hangbox'), hangD = $('hang-d');
  const phaseEl = $('phase');
  const hudLeft = $('hud-left'), hudRem = $('hud-rem'), hudScore = $('hud-score');
  const hudStatus = $('hud-status');
  const toast = $('toast'), intro = $('intro'), finale = $('finale');

  let toastTimer = 0;
  const say = (msg) => {
    toast.hidden = false;
    toast.textContent = msg;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { toast.hidden = true; }, 2600);
  };

  // ---------- layout ----------
  let W, H, boxW, boxH, groundH, colX0;
  const layout = () => {
    W = window.innerWidth; H = window.innerHeight;
    const css = getComputedStyle(document.documentElement);
    boxW = parseFloat(css.getPropertyValue('--box-w'));
    boxH = parseFloat(css.getPropertyValue('--box-h'));
    groundH = H * 0.11 + 8;
    colX0 = W / 2 - ((COLS - 1) / 2) * boxW;
  };
  const colX = (c) => colX0 + c * boxW;

  const buildYard = () => {
    yard.innerHTML = '';
    for (let c = 0; c <= COLS; c++) {
      const g = document.createElement('i');
      g.className = 'slot-guide';
      g.style.left = `${colX(c) - boxW / 2}px`;
      g.style.bottom = `${groundH}px`;
      g.style.height = `${TIERS * boxH + 16}px`;
      yard.appendChild(g);
      if (c < COLS) {
        const l = document.createElement('span');
        l.className = 'slot-label';
        l.textContent = `P${c + 1}`;
        l.style.left = `${colX(c)}px`;
        l.style.bottom = `${groundH - 24}px`;
        yard.appendChild(l);
      }
    }
  };

  // ---------- estado ----------
  const st = {
    stacks: [], queue: [],
    col: 3, colF: 3,
    rem: 0, t: 0, placed: 0,
    falling: false,
    steps: [], stepT: 0, day: 0,
    phase: 'intro'      // intro | recibo | despacho | over
  };
  const keys = {};

  const buildQueue = () => {
    const q = DAYS.slice();
    for (let i = q.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [q[i], q[j]] = [q[j], q[i]];
    }
    return q.map((d) => ({ day: d }));
  };

  const boxAt = (c, tier) => st.stacks[c][tier];

  const mkBox = (item, c, tier) => {
    const b = document.createElement('div');
    b.className = 'cbox';
    b.style.setProperty('--c', DCOLOR[item.day]);
    b.innerHTML = `<span>D${item.day}</span>`;
    b.style.left = `${colX(c) - boxW / 2}px`;
    b.style.bottom = `${groundH + tier * boxH}px`;
    yard.appendChild(b);
    item.el = b;
    return b;
  };

  const setBoxPos = (item, c, tier) => {
    item.el.style.left = `${colX(c) - boxW / 2}px`;
    item.el.style.bottom = `${groundH + tier * boxH}px`;
  };

  // ---------- recibo ----------
  const updateHang = () => {
    const cur = st.queue[0];
    hangbox.style.visibility = cur ? 'visible' : 'hidden';
    if (cur) {
      hangbox.style.setProperty('--c', DCOLOR[cur.day]);
      hangD.textContent = `D${cur.day}`;
    }
    [1, 2].forEach((n) => {
      const el = $(`next-${n}`);
      const q = st.queue[n];
      el.style.visibility = q ? 'visible' : 'hidden';
      if (q) { el.style.setProperty('--c', DCOLOR[q.day]); el.textContent = `D${q.day}`; }
    });
  };

  const drop = () => {
    if (st.phase !== 'recibo' || st.falling || !st.queue.length) return;
    const c = st.col;
    if (st.stacks[c].length >= TIERS) { say('PILA LLENA: BUSCA OTRA'); return; }
    const item = st.queue.shift();
    st.falling = true;
    hangbox.style.visibility = 'hidden';

    const tier = st.stacks[c].length;
    const box = mkBox(item, c, tier);
    box.style.bottom = `${groundH + (TIERS + 3) * boxH}px`;
    const targetBottom = groundH + tier * boxH;
    let vy = 0, bottom = groundH + (TIERS + 3) * boxH;
    let lastT = performance.now();
    const fall = (now) => {
      const dt = Math.min((now - lastT) / 1000, 0.033);
      lastT = now;
      vy += 2300 * dt;
      bottom -= vy * dt;
      if (bottom <= targetBottom) {
        box.style.bottom = `${targetBottom}px`;
        box.classList.add('is-landing');
        st.stacks[c].push(item);
        st.placed++;
        st.falling = false;
        updateHang();
        updateHud();
        if (!st.queue.length) setTimeout(startDespacho, 900);
        return;
      }
      box.style.bottom = `${bottom}px`;
      requestAnimationFrame(fall);
    };
    requestAnimationFrame(fall);
  };

  // ---------- despacho ----------
  const shortestOther = (notCol) => {
    let best = -1, bh = 99;
    for (let c = 0; c < COLS; c++) {
      if (c === notCol) continue;
      if (st.stacks[c].length < bh) { bh = st.stacks[c].length; best = c; }
    }
    return best;
  };

  const startDespacho = () => {
    st.phase = 'despacho';
    phaseEl.textContent = 'FASE 2 // DESPACHO';
    phaseEl.classList.add('is-despacho');
    hudStatus.textContent = 'CORREN LOS DIAS: VIENEN POR CADA CAJA EN ORDEN';
    say('EMPIEZA EL DESPACHO: QUE NO HAYA NADA ENCIMA...');
    // construye la lista de pasos simulando el patio
    const sim = st.stacks.map((s) => s.slice());
    st.steps = [];
    for (let d = 1; d <= 5; d++) {
      if (sim.some((s) => s.some((it) => it.day === d))) st.steps.push({ type: 'day', d });
      for (;;) {
        // el objetivo con menos estorbos encima
        let bc = -1, bi = -1, bBlk = 99;
        sim.forEach((s, c) => {
          s.forEach((it, i) => {
            if (it.day !== d) return;
            const blk = s.length - 1 - i;
            if (blk < bBlk) { bBlk = blk; bc = c; bi = i; }
          });
        });
        if (bc < 0) break;
        // remociones de lo que estorba (de arriba hacia abajo)
        for (let i = sim[bc].length - 1; i > bi; i--) {
          const mover = sim[bc][i];
          const dest = shortestOtherSim(sim, bc);
          sim[bc].pop();
          st.steps.push({ type: 'lift', item: mover, from: bc, to: dest, tier: sim[dest].length });
          sim[dest].push(mover);
        }
        const target = sim[bc][bi];
        sim[bc].splice(bi, 1);
        st.steps.push({ type: 'out', item: target, from: bc });
      }
    }
    st.steps.push({ type: 'end' });
    st.stepT = 0.6;
  };

  const shortestOtherSim = (sim, notCol) => {
    let best = -1, bh = 99;
    for (let c = 0; c < COLS; c++) {
      if (c === notCol) continue;
      if (sim[c].length < bh) { bh = sim[c].length; best = c; }
    }
    return best;
  };

  const mkFloat = (x, y, text) => {
    const f = document.createElement('div');
    f.className = 'float';
    f.textContent = text;
    f.style.left = `${x}px`;
    f.style.top = `${y}px`;
    yard.appendChild(f);
    setTimeout(() => f.remove(), 1300);
  };

  const runStep = (step) => {
    if (step.type === 'day') {
      st.day = step.d;
      say(`DIA ${step.d}: VIENEN POR LAS D${step.d}`);
      st.stacks.forEach((s) => s.forEach((it) => {
        it.el.classList.toggle('is-target', it.day === step.d);
      }));
      return;
    }
    if (step.type === 'lift') {
      // remocion: la caja estorbosa se muda a otra pila
      st.rem++;
      const it = step.item;
      it.el.classList.add('is-move', 'is-blocker');
      const from = st.stacks[step.from];
      from.splice(from.indexOf(it), 1);
      st.stacks[step.to].push(it);
      setBoxPos(it, step.to, step.tier);
      mkFloat(colX(step.from), H - groundH - TIERS * boxH - 20, `-${PT_REM} REMOCION`);
      document.body.classList.add('shake');
      setTimeout(() => document.body.classList.remove('shake'), 420);
      setTimeout(() => it.el.classList.remove('is-blocker'), 500);
      updateHud();
      return;
    }
    if (step.type === 'out') {
      const it = step.item;
      const from = st.stacks[step.from];
      from.splice(from.indexOf(it), 1);
      it.el.classList.add('is-out');
      it.el.style.left = `${W + 60}px`;
      it.el.style.bottom = `${groundH + TIERS * boxH + 60}px`;
      setTimeout(() => it.el.remove(), 700);
      updateHud();
      return;
    }
    if (step.type === 'end') finish();
  };

  const score = () => Math.max(0, Math.round(1000 - st.rem * PT_REM - st.t * PT_TIME));

  const finish = () => {
    st.phase = 'over';
    const s = score();
    const rank = st.rem === 0 ? 'Planner de patio legendario.' :
                 s >= 740 ? 'Yard planner senior.' :
                 s >= 520 ? 'Operador con colmillo.' : 'Acomodador de tetris.';
    $('finale-kicker').textContent = st.rem === 0 ? 'CERO REMOCIONES' : 'TURNO CERRADO';
    $('finale-title').textContent = rank;
    $('finale-score').textContent = `${s} PTS`;
    $('finale-detail').textContent = `${st.rem} REMOCIONES (-${st.rem * PT_REM}) · ${Math.round(st.t)} S DE TURNO`;
    finale.hidden = false;
  };

  // ---------- HUD ----------
  const updateHud = () => {
    hudLeft.textContent = st.phase === 'despacho'
      ? st.stacks.reduce((n, s) => n + s.length, 0)
      : st.queue.length;
    hudRem.textContent = st.rem;
    hudScore.textContent = score();
  };

  // ---------- flujo ----------
  const reset = () => {
    layout();
    buildYard();
    st.stacks = Array.from({ length: COLS }, () => []);
    st.queue = buildQueue();
    st.col = 3; st.colF = 3;
    st.rem = 0; st.t = 0; st.placed = 0;
    st.falling = false;
    st.steps = []; st.day = 0;
    st.phase = 'intro';
    phaseEl.textContent = 'FASE 1 // RECIBO';
    phaseEl.classList.remove('is-despacho');
    finale.hidden = true;
    intro.hidden = false;
    updateHang();
    updateHud();
    hudStatus.textContent = 'APILA PENSANDO EN EL DIA DE SALIDA DE CADA CAJA';
  };

  const startGame = () => {
    intro.hidden = true;
    if (st.phase !== 'intro') return;
    if (st.helpResume) { st.helpResume = false; st.phase = st.resumePhase; }
    else st.phase = 'recibo';
  };

  const openHelp = () => {
    if (st.phase !== 'recibo' && st.phase !== 'despacho') return;
    st.resumePhase = st.phase;
    st.helpResume = true;
    st.phase = 'intro';
    intro.hidden = false;
  };

  // ---------- entrada ----------
  const KEYMAP = { a: 'left', arrowleft: 'left', d: 'right', arrowright: 'right' };
  document.addEventListener('keydown', (e) => {
    const k = e.key.toLowerCase();
    if (k === 'r') { reset(); return; }
    if (k === 'h') { if (intro.hidden) openHelp(); else startGame(); return; }
    if ((k === 'enter' || k === ' ') && !intro.hidden) { e.preventDefault(); startGame(); return; }
    if (k === 'enter' && st.phase === 'over' && !finale.hidden) { reset(); return; }
    if (KEYMAP[k]) { e.preventDefault(); keys[KEYMAP[k]] = true; }
    if ((k === ' ' || k === 's' || k === 'arrowdown') && !e.repeat) { e.preventDefault(); drop(); }
  });
  document.addEventListener('keyup', (e) => {
    const k = e.key.toLowerCase();
    if (KEYMAP[k]) keys[KEYMAP[k]] = false;
  });
  document.querySelectorAll('.cbtn').forEach((b) => {
    const k = b.dataset.k;
    const press = (e) => {
      e.preventDefault();
      b.classList.add('is-press');
      if (k === 'drop') drop(); else keys[k] = true;
    };
    const release = () => { b.classList.remove('is-press'); if (k !== 'drop') keys[k] = false; };
    b.addEventListener('pointerdown', press);
    b.addEventListener('pointerup', release);
    b.addEventListener('pointerleave', release);
    b.addEventListener('pointercancel', release);
  });
  $('start').addEventListener('click', startGame);
  $('help').addEventListener('click', openHelp);
  $('restart').addEventListener('click', reset);
  window.addEventListener('resize', reset);

  // ---------- loop ----------
  let trolleyX = 0;
  let last = performance.now();
  const tick = (now) => {
    requestAnimationFrame(tick);
    const dt = Math.max(0, Math.min((now - last) / 1000, 0.05));
    last = now;

    if (st.phase === 'recibo') {
      st.t += dt;
      const dir = (keys.right ? 1 : 0) - (keys.left ? 1 : 0);
      st.colF += dir * 6.5 * dt;
      st.colF = Math.max(0, Math.min(COLS - 1, st.colF));
      st.col = Math.round(st.colF);
    } else if (st.phase === 'despacho') {
      st.t += dt;
      st.stepT -= dt;
      if (st.stepT <= 0 && st.steps.length) {
        const step = st.steps.shift();
        runStep(step);
        st.stepT = step.type === 'day' ? STEP_T * 1.6 : STEP_T;
      }
    }

    const targetX = colX(st.col);
    trolleyX += (targetX - trolleyX) * Math.min(1, dt * 9);
    trolley.style.left = `${trolleyX}px`;
    cable.style.cssText = `left:${trolleyX - 1.5}px; top:104px; height:86px;`;
    hangbox.style.left = `${trolleyX}px`;
    hangbox.style.top = '190px';
    const sway = Math.max(-9, Math.min(9, (targetX - trolleyX) * 0.12));
    hangbox.style.transform = `rotate(${sway}deg)`;
  };

  reset();
  requestAnimationFrame(tick);
})();
