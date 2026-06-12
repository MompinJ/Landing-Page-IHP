/* ============================================================
   DINAMICA ESTIBA EL BUQUE — motor
   Corte transversal con 7 bahias. Cada contenedor pesa distinto
   y la escora es la suma de momentos (peso x distancia a cruija).
   Pasarse del limite = volcadura.
   ============================================================ */

(() => {
  // ---------- configuracion ----------
  const COLS = 7;            // bahias (impar: la central es la cruija)
  const TIERS = 4;           // altura maxima de la pila
  const TOTAL = 16;          // contenedores a estibar
  const HEEL_LIMIT = 8;      // grados de escora para volcar
  const HEEL_K = 0.062;      // grados por (tonelada x bahia)
  // pesos disponibles: [toneladas, color]
  const WEIGHTS = [
    [6, '#9ACAEB'], [10, '#54BBAB'], [16, '#009BDE'],
    [22, '#FFC627'], [28, '#EE7523'], [32, '#b3422c']
  ];

  // ---------- DOM ----------
  const $ = (id) => document.getElementById(id);
  const vessel = $('vessel'), trolley = $('trolley'), cable = $('cable');
  const hangbox = $('hangbox'), hangW = $('hang-w');
  const clinoDeg = $('clino-deg'), clinoNeedle = $('clino-needle');
  const hudStatus = $('hud-status');
  const toast = $('toast'), finale = $('finale');

  let toastTimer = 0;
  const say = (msg) => {
    toast.hidden = false;
    toast.textContent = msg;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { toast.hidden = true; }, 2200);
  };

  // ---------- layout ----------
  let W, H, boxW, boxH, deckY, colX0;
  const layout = () => {
    W = window.innerWidth; H = window.innerHeight;
    boxW = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--box-w'));
    boxH = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--box-h'));
    colX0 = -((COLS - 1) / 2) * boxW; // offset de la bahia 0 respecto a cruija
  };

  // arma el casco y las guias dentro de .vessel
  const buildVessel = () => {
    vessel.innerHTML = '';
    const beamW = COLS * boxW + 70;
    const hullH = 120;
    const hull = document.createElement('div');
    hull.className = 'hull';
    hull.style.width = `${beamW}px`;
    hull.style.height = `${hullH}px`;
    vessel.appendChild(hull);
    deckY = hullH; // los contenedores apilan desde el borde superior del casco

    const names = ['B3', 'B2', 'B1', 'CR', 'E1', 'E2', 'E3'];
    for (let c = 0; c <= COLS; c++) {
      const g = document.createElement('i');
      g.className = 'bay-guide';
      g.style.left = `${colX0 + (c - 0.5) * boxW}px`;
      g.style.height = `${TIERS * boxH + 16}px`;
      g.style.bottom = `${deckY}px`;
      vessel.appendChild(g);
      if (c < COLS) {
        const l = document.createElement('span');
        l.className = 'bay-label';
        l.textContent = names[c] ?? `#${c}`;
        l.style.left = `${colX0 + c * boxW}px`;
        l.style.bottom = `${deckY - 26}px`;
        vessel.appendChild(l);
      }
    }
  };

  // ---------- estado ----------
  const st = {
    col: 3,                 // bahia bajo el spreader
    stacks: [],             // [col] = array de pesos
    queue: [],              // contenedores por estibar
    heel: 0, heelShow: 0,
    placed: 0, t: 0,
    falling: false,
    phase: 'play'           // play | over
  };
  const keys = {};

  const randW = () => WEIGHTS[Math.floor(Math.random() * WEIGHTS.length)];

  const reset = () => {
    layout();
    buildVessel();
    st.col = 3;
    st.stacks = Array.from({ length: COLS }, () => []);
    st.queue = Array.from({ length: TOTAL }, randW);
    st.heel = 0; st.heelShow = 0;
    st.placed = 0; st.t = 0;
    st.falling = false;
    st.phase = 'play';
    vessel.className = 'vessel';
    finale.hidden = true;
    updateHang();
    hudStatus.textContent = `ESTIBA ${TOTAL} CONTENEDORES SIN PASAR DE ${HEEL_LIMIT} GRADOS`;
  };

  const updateHang = () => {
    const cur = st.queue[0];
    if (!cur) { hangbox.style.visibility = 'hidden'; }
    else {
      hangbox.style.visibility = 'visible';
      hangbox.style.setProperty('--c', cur[1]);
      hangW.textContent = `${cur[0]}t`;
    }
    [1, 2].forEach((n) => {
      const el = $(`next-${n}`);
      const q = st.queue[n];
      el.style.visibility = q ? 'visible' : 'hidden';
      if (q) { el.style.setProperty('--c', q[1]); el.textContent = `${q[0]}t`; }
    });
  };

  // ---------- escora ----------
  const recomputeHeel = () => {
    let moment = 0;
    st.stacks.forEach((stack, c) => {
      const arm = c - (COLS - 1) / 2; // bahias desde cruija (- babor, + estribor)
      stack.forEach((w) => { moment += w * arm; });
    });
    st.heel = moment * HEEL_K;
  };

  const capsize = () => {
    st.phase = 'over';
    const side = st.heel > 0 ? 1 : -1;
    vessel.classList.add(side > 0 ? 'capsize-r' : 'capsize-l');
    vessel.style.transform = `translateX(-50%) rotate(${side * 32}deg) translateY(60px)`;
    document.body.classList.add('shake');
    setTimeout(() => document.body.classList.remove('shake'), 520);
    setTimeout(() => {
      $('finale-kicker').textContent = 'VOLCADURA';
      $('finale-title').textContent = 'Se fue por la borda.';
      $('finale-score').textContent = `ESCORA ${Math.abs(st.heel).toFixed(1)} GRADOS`;
      $('finale-detail').textContent = `ESTIBASTE ${st.placed} DE ${TOTAL} ANTES DEL DESASTRE`;
      finale.hidden = false;
    }, 1500);
  };

  const win = () => {
    st.phase = 'over';
    const heelAbs = Math.abs(st.heel);
    const score = Math.max(0, Math.round(1000 - heelAbs * 90 - st.t * 4));
    const rank = score >= 850 ? 'Jefe de planificacion.' :
                 score >= 650 ? 'Primer oficial de carga.' :
                 score >= 400 ? 'Estibador con oficio.' : 'Chalan con futuro.';
    $('finale-kicker').textContent = 'ESTIBA COMPLETA';
    $('finale-title').textContent = rank;
    $('finale-score').textContent = `${score} PTS`;
    $('finale-detail').textContent =
      `ESCORA FINAL ${heelAbs.toFixed(1)} GRADOS · ${fmtTime(st.t)}`;
    finale.hidden = false;
  };

  const fmtTime = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

  // ---------- soltar ----------
  const drop = () => {
    if (st.phase !== 'play' || st.falling || !st.queue.length) return;
    const col = st.col;
    if (st.stacks[col].length >= TIERS) { say('BAHIA LLENA: BUSCA OTRA'); return; }

    const [w, color] = st.queue.shift();
    st.falling = true;
    hangbox.style.visibility = 'hidden';

    // caja que cae dentro del marco del buque (la escora la acompana)
    const tier = st.stacks[col].length;
    const box = document.createElement('div');
    box.className = 'slotbox';
    box.style.setProperty('--c', color);
    box.innerHTML = `<span>${w}t</span>`;
    box.style.left = `${colX0 + col * boxW - boxW / 2}px`;
    box.style.bottom = `${deckY + (TIERS + 3) * boxH}px`; // arranca arriba
    vessel.appendChild(box);

    const targetBottom = deckY + tier * boxH;
    let vy = 0, bottom = deckY + (TIERS + 3) * boxH;
    let lastT = performance.now();
    const fall = (now) => {
      const dt = Math.min((now - lastT) / 1000, 0.033);
      lastT = now;
      vy += 2300 * dt;
      bottom -= vy * dt;
      if (bottom <= targetBottom) {
        box.style.bottom = `${targetBottom}px`;
        box.classList.add('is-landing');
        st.stacks[col].push(w);
        st.placed++;
        recomputeHeel();
        st.falling = false;
        updateHang();
        if (Math.abs(st.heel) > HEEL_LIMIT) { capsize(); return; }
        if (Math.abs(st.heel) > HEEL_LIMIT * 0.62) say('CUIDADO CON LA ESCORA');
        if (!st.queue.length) setTimeout(win, 900);
        return;
      }
      box.style.bottom = `${bottom}px`;
      requestAnimationFrame(fall);
    };
    requestAnimationFrame(fall);
  };

  // ---------- entrada ----------
  const KEYMAP = { a: 'left', arrowleft: 'left', d: 'right', arrowright: 'right' };
  document.addEventListener('keydown', (e) => {
    const k = e.key.toLowerCase();
    if (KEYMAP[k]) { e.preventDefault(); keys[KEYMAP[k]] = true; }
    if ((k === ' ' || k === 's' || k === 'arrowdown') && !e.repeat) { e.preventDefault(); drop(); }
    if (k === 'r') reset();
    if (k === 'enter' && st.phase === 'over') reset();
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
  $('restart').addEventListener('click', reset);
  window.addEventListener('resize', reset);

  // ---------- loop ----------
  let trolleyX = 0, colF = 3;
  let last = performance.now();
  const tick = (now) => {
    requestAnimationFrame(tick);
    const dt = Math.min((now - last) / 1000, 0.033);
    last = now;

    if (st.phase === 'play') {
      st.t += dt;

      // mover bahia objetivo (continuo, con repeticion suave)
      const dir = (keys.right ? 1 : 0) - (keys.left ? 1 : 0);
      colF += dir * 6.5 * dt;
      colF = Math.max(0, Math.min(COLS - 1, colF));
      st.col = Math.round(colF);
    }

    // posicion del trolley sobre la bahia (en coordenadas de pantalla)
    const targetX = W / 2 + colX0 + st.col * boxW;
    trolleyX += (targetX - trolleyX) * Math.min(1, dt * 9);
    trolley.style.left = `${trolleyX}px`;
    cable.style.cssText = `left:${trolleyX - 1.5}px; top:104px; height:86px;`;
    hangbox.style.left = `${trolleyX}px`;
    hangbox.style.top = '190px';
    // balanceo sutil del contenedor colgado
    const sway = Math.max(-9, Math.min(9, (targetX - trolleyX) * 0.12));
    hangbox.style.transform = `rotate(${sway}deg)`;

    // escora suave del buque
    if (st.phase === 'play') {
      st.heelShow += (st.heel - st.heelShow) * Math.min(1, dt * 3);
      vessel.style.transform = `translateX(-50%) rotate(${st.heelShow}deg)`;
    }

    // clinometro
    clinoDeg.innerHTML = `${Math.abs(st.heelShow).toFixed(1)}&#176; ${st.heelShow < -0.05 ? 'BABOR' : st.heelShow > 0.05 ? 'ESTRIBOR' : ''}`;
    const pct = 50 + Math.max(-50, Math.min(50, (st.heelShow / HEEL_LIMIT) * 38));
    clinoNeedle.style.left = `${pct}%`;
  };

  reset();
  requestAnimationFrame(tick);
})();
