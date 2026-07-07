/* ============================================================
   DINAMICA PLAN DE ESTIBA — motor
   Cubierta cenital de 8 bahias x 5 filas. Cada contenedor trae
   marcas (RF, rombo IMO, DRY) y solo puede estibarse en su zona.
   El equilibrio se calcula en dos ejes:
   - escora  = suma de (peso x distancia a crujia)          [filas]
   - asiento = suma de (peso x distancia a cuaderna maestra) [bahias]
   Pasarse de los limites termina la operacion.
   NOTA: reglas de zona simplificadas para demo; validar con un
   experto en planificacion antes de usar como material formal.
   ============================================================ */

(() => {
  // ---------- configuracion ----------
  const BAYS = 8;              // columnas (popa -> proa)
  const ROWS = 5;              // filas (babor -> estribor)
  const HEEL_LIMIT = 8;        // grados de escora para perder
  const TRIM_LIMIT = 6;        // grados de asiento para perder
  const HEEL_K = 0.045;        // grados por (tonelada x fila)
  const TRIM_K = 0.03;         // grados por (tonelada x bahia)
  // zona de cada bahia: rf reefer / st estandar / fl clase 3 / im peligrosos
  const ZONES = ['rf', 'rf', 'st', 'st', 'st', 'fl', 'im', 'im'];
  // mezcla de la cola: [tipo, cantidad]
  const QUEUE_MIX = [['rf', 5], ['st', 6], ['fl', 3], ['im', 4]];
  const WEIGHTS = [8, 12, 16, 20, 24, 28];
  const IMO_CLASSES = ['2.2', '5.1', '6.1', '8', '9'];
  const RF_TEMPS = ['-25C', '-22C', '-18C', '+4C'];
  const BOX_COLORS = ['#009BDE', '#54BBAB', '#EE7523', '#FFC627', '#b3422c', '#2a5f8a'];

  const ZONE_META = {
    rf: { label: 'REEFER 01-02', color: '#9ACAEB' },
    st: { label: 'ESTANDAR 03-05', color: '#cfe3f2' },
    fl: { label: 'INFL 06', color: '#EE7523' },
    im: { label: 'PELIGROSOS 07-08', color: '#FFC627' }
  };
  const RULES = {
    rf: 'EL REEFER NECESITA ENCHUFE: BAHIAS 01-02, JUNTO A LA ACOMODACION',
    st: 'CARGA SECA ESTANDAR: BAHIAS 03-05, DEJA LIBRES LAS ZONAS ESPECIALES',
    fl: 'CLASE 3 ES INFLAMABLE: SOLO BAHIA 06, AISLADA DE CHISPAS Y CALOR',
    im: 'MERCANCIA PELIGROSA IMO: A PROA, BAHIAS 07-08, LEJOS DE LA ACOMODACION'
  };

  // ---------- DOM ----------
  const $ = (id) => document.getElementById(id);
  const ship = $('ship'), deck = $('deck');
  const cargoBox = $('cargo-box');
  const heelDeg = $('heel-deg'), heelNeedle = $('heel-needle');
  const trimDeg = $('trim-deg'), trimNeedle = $('trim-needle');
  const hudStatus = $('hud-status');
  const toast = $('toast'), alarm = $('alarm'), finale = $('finale');
  const heelMeter = heelDeg.closest('.meter'), trimMeter = trimDeg.closest('.meter');
  const floodHeel = $('flood-heel'), floodTrim = $('flood-trim');
  const tonEls = {
    babor: $('ton-babor'), estribor: $('ton-estribor'),
    popa: $('ton-popa'), proa: $('ton-proa')
  };

  let toastTimer = 0;
  const say = (msg) => {
    toast.hidden = false;
    toast.textContent = msg;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { toast.hidden = true; }, 2600);
  };

  // ---------- contenedores ----------
  const rand = (arr) => arr[Math.floor(Math.random() * arr.length)];

  const makeItem = (type) => {
    const it = { type, w: rand(WEIGHTS), color: rand(BOX_COLORS) };
    if (type === 'rf') { it.color = '#e9eff5'; it.temp = rand(RF_TEMPS); }
    if (type === 'fl') it.cls = '3';
    if (type === 'im') it.cls = rand(IMO_CLASSES);
    return it;
  };

  const buildQueue = () => {
    const q = [];
    QUEUE_MIX.forEach(([type, n]) => { for (let i = 0; i < n; i++) q.push(makeItem(type)); });
    for (let i = q.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [q[i], q[j]] = [q[j], q[i]];
    }
    return q;
  };

  const markHTML = (it) => {
    if (it.type === 'rf') return `<span class="cmark cmark--rf">RF ${it.temp}</span>`;
    if (it.type === 'st') return `<span class="cmark cmark--st">DRY</span>`;
    return `<span class="cmark cmark--dia"><b>${it.cls}</b></span>`;
  };
  const boxHTML = (it) => `<b class="cbox__w">${it.w}t</b>${markHTML(it)}`;
  const wClass = (it) => it.w >= 24 ? ' cbox--heavy' : it.w <= 12 ? ' cbox--light' : '';
  const miniText = (it) =>
    it.type === 'rf' ? 'RF' : it.type === 'st' ? 'DRY' : it.cls;

  // ---------- cubierta ----------
  let cw, ch, cells;
  const layout = () => {
    const css = getComputedStyle(document.documentElement);
    cw = parseFloat(css.getPropertyValue('--cell-w'));
    ch = parseFloat(css.getPropertyValue('--cell-h'));
  };

  const buildDeck = () => {
    deck.innerHTML = '';
    cells = [];
    for (let r = 0; r < ROWS; r++) {
      cells.push([]);
      for (let c = 0; c < BAYS; c++) {
        const cell = document.createElement('div');
        const zone = ZONES[c];
        cell.className = `cell cell--${zone}`;
        if (c > 0 && ZONES[c - 1] !== zone) cell.classList.add('cell--zstart');
        if (zone !== 'st') {
          const m = document.createElement('i');
          m.className = `zmark zmark--${zone}`;
          cell.appendChild(m);
        }
        cell.addEventListener('pointerenter', () => setCursor(r, c));
        cell.addEventListener('click', () => { setCursor(r, c); place(r, c); });
        deck.appendChild(cell);
        cells[r].push({ el: cell, item: null });
      }
    }
    // etiquetas de zona (agrupa bahias contiguas) y numeros de bahia
    let start = 0;
    for (let c = 1; c <= BAYS; c++) {
      if (c === BAYS || ZONES[c] !== ZONES[start]) {
        const meta = ZONE_META[ZONES[start]];
        const lab = document.createElement('span');
        lab.className = 'zone-label';
        lab.textContent = meta.label;
        lab.style.left = `${start * cw}px`;
        lab.style.width = `${(c - start) * cw}px`;
        lab.style.setProperty('--zc', meta.color);
        deck.appendChild(lab);
        start = c;
      }
    }
    for (let c = 0; c < BAYS; c++) {
      const n = document.createElement('span');
      n.className = 'bay-num';
      n.textContent = String(c + 1).padStart(2, '0');
      n.style.left = `${c * cw}px`;
      n.style.width = `${cw}px`;
      deck.appendChild(n);
    }
  };

  // ---------- estado ----------
  const st = {
    queue: [],
    heel: 0, trim: 0,
    heelShow: 0, trimShow: 0,
    rotShow: 0, lostRot: 0,
    tons: { babor: 0, estribor: 0, popa: 0, proa: 0 },
    placed: 0, errors: 0, t: 0,
    phase: 'play'            // play | over
  };
  const cur = { r: 2, c: 3 };
  const TOTAL = QUEUE_MIX.reduce((s, [, n]) => s + n, 0);

  const reset = () => {
    layout();
    buildDeck();
    st.queue = buildQueue();
    st.heel = 0; st.trim = 0; st.heelShow = 0; st.trimShow = 0;
    st.rotShow = 0; st.lostRot = 0;
    st.placed = 0; st.errors = 0; st.t = 0;
    st.phase = 'play';
    cur.r = 2; cur.c = 3;
    finale.hidden = true;
    alarm.hidden = true;
    alarm.classList.add('alarm--soft');
    ship.classList.remove('is-danger');
    floodHeel.style.opacity = '0';
    floodTrim.style.opacity = '0';
    heelMeter.classList.remove('is-warn');
    trimMeter.classList.remove('is-warn');
    recompute();
    updateCargo();
    setCursor(cur.r, cur.c);
    hudStatus.textContent = `ESTIBA ${TOTAL} CONTENEDORES: CADA UNO EN SU ZONA Y EN EQUILIBRIO`;
  };

  const updateCargo = () => {
    const it = st.queue[0];
    if (!it) {
      cargoBox.style.visibility = 'hidden';
    } else {
      cargoBox.style.visibility = 'visible';
      cargoBox.style.setProperty('--c', it.color);
      cargoBox.className = `cargo__box${it.type === 'rf' ? ' cbox--rf' : ''}${wClass(it)}`;
      cargoBox.innerHTML = boxHTML(it);
    }
    [1, 2].forEach((n) => {
      const el = $(`next-${n}`);
      const q = st.queue[n];
      el.style.visibility = q ? 'visible' : 'hidden';
      if (q) {
        el.style.setProperty('--c', q.color);
        el.classList.toggle('is-rf', q.type === 'rf');
        el.textContent = miniText(q);
      }
    });
  };

  // ---------- cursor ----------
  const setCursor = (r, c) => {
    if (st.phase !== 'play') return;
    cells[cur.r][cur.c].el.classList.remove('is-cursor');
    cur.r = Math.max(0, Math.min(ROWS - 1, r));
    cur.c = Math.max(0, Math.min(BAYS - 1, c));
    const cell = cells[cur.r][cur.c].el;
    cell.classList.add('is-cursor');
    const it = st.queue[0];
    if (it) cell.style.setProperty('--gc', it.color);
  };

  // ---------- equilibrio ----------
  const recompute = () => {
    let heelM = 0, trimM = 0;
    const tons = { babor: 0, estribor: 0, popa: 0, proa: 0 };
    cells.forEach((row, r) => row.forEach((cell, c) => {
      if (!cell.item) return;
      const w = cell.item.w;
      heelM += w * (r - (ROWS - 1) / 2);      // - babor / + estribor
      trimM += w * (c - (BAYS - 1) / 2);      // - apopado / + aproado
      if (r < 2) tons.babor += w; else if (r > 2) tons.estribor += w;
      if (c < BAYS / 2) tons.popa += w; else tons.proa += w;
    }));
    st.heel = heelM * HEEL_K;
    st.trim = trimM * TRIM_K;
    st.tons = tons;
    updateTons();
  };

  const updateTons = () => {
    const t = st.tons;
    tonEls.babor.textContent = `BABOR ${t.babor}t`;
    tonEls.estribor.textContent = `${t.estribor}t ESTRIBOR`;
    tonEls.popa.textContent = `POPA ${t.popa}t`;
    tonEls.proa.textContent = `${t.proa}t PROA`;
    const heelR = Math.abs(st.heel) / HEEL_LIMIT, trimR = Math.abs(st.trim) / TRIM_LIMIT;
    tonEls.babor.classList.toggle('is-heavy', heelR > 0.35 && st.heel < 0);
    tonEls.estribor.classList.toggle('is-heavy', heelR > 0.35 && st.heel > 0);
    tonEls.popa.classList.toggle('is-heavy', trimR > 0.35 && st.trim < 0);
    tonEls.proa.classList.toggle('is-heavy', trimR > 0.35 && st.trim > 0);
  };

  // agua entrando por el borde que se hunde; crece con el peligro
  const flood = (el, ratio, dirPos, dirNeg) => {
    const a = Math.min(1, Math.max(0, (Math.abs(ratio) - 0.35) / 0.6));
    if (a <= 0.02) { el.style.opacity = '0'; return; }
    const cov = (4 + a * 20).toFixed(1);
    const blue = (0.8 * a).toFixed(2), foam = (0.55 * a).toFixed(2);
    el.style.opacity = '1';
    el.style.background =
      `linear-gradient(${ratio > 0 ? dirPos : dirNeg}, ` +
      `rgba(46, 118, 168, ${blue}) ${cov}%, ` +
      `rgba(255, 255, 255, ${foam}) ${cov}%, ` +
      `rgba(255, 255, 255, ${foam}) calc(${cov}% + 3px), ` +
      `transparent calc(${cov}% + 3px))`;
  };

  const fmtTime = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

  const detailLine = () =>
    `ESCORA ${Math.abs(st.heel).toFixed(1)}° · ASIENTO ${Math.abs(st.trim).toFixed(1)}° · ` +
    `${st.errors} ERRORES DE ZONA · ${fmtTime(st.t)}`;

  const lose = (kicker, title) => {
    st.phase = 'over';
    st.lostRot = (Math.abs(st.heel) > Math.abs(st.trim) ? Math.sign(st.heel) : Math.sign(st.trim)) * 13 || 13;
    ship.classList.remove('is-danger');
    alarm.classList.remove('alarm--soft');
    alarm.hidden = false;
    document.body.classList.add('shake');
    setTimeout(() => document.body.classList.remove('shake'), 520);
    setTimeout(() => {
      $('finale-kicker').textContent = kicker;
      $('finale-title').textContent = title;
      $('finale-score').textContent = `${st.placed} DE ${TOTAL} ESTIBADOS`;
      $('finale-detail').textContent = detailLine();
      finale.hidden = false;
    }, 1500);
  };

  const win = () => {
    st.phase = 'over';
    alarm.hidden = true;
    ship.classList.remove('is-danger');
    const balance = Math.abs(st.heel) + Math.abs(st.trim);
    const score = Math.max(0, Math.round(1000 - balance * 40 - st.errors * 35 - st.t * 1.5));
    const rank = score >= 850 ? 'Primer oficial de carga.' :
                 score >= 650 ? 'Planner de buque.' :
                 score >= 400 ? 'Chequeador con oficio.' : 'Grumete con ganas.';
    $('finale-kicker').textContent = 'PLAN COMPLETO';
    $('finale-title').textContent = rank;
    $('finale-score').textContent = `${score} PTS`;
    $('finale-detail').textContent = detailLine();
    finale.hidden = false;
  };

  // ---------- estibar ----------
  const place = (r, c) => {
    if (st.phase !== 'play' || !st.queue.length) return;
    const cell = cells[r][c];
    if (cell.item) { say('CELDA OCUPADA: BUSCA OTRA'); return; }

    const it = st.queue[0];
    if (ZONES[c] !== it.type) {
      st.errors++;
      cell.el.classList.remove('is-bad');
      void cell.el.offsetWidth;              // reinicia la animacion
      cell.el.classList.add('is-bad');
      say(RULES[it.type]);
      return;
    }

    st.queue.shift();
    cell.item = it;
    const box = document.createElement('div');
    box.className = `cbox is-landing${it.type === 'rf' ? ' cbox--rf' : ''}${wClass(it)}`;
    box.style.setProperty('--c', it.color);
    box.innerHTML = boxHTML(it);
    cell.el.appendChild(box);
    st.placed++;

    recompute();
    updateCargo();
    setCursor(cur.r, cur.c);

    if (Math.abs(st.heel) > HEEL_LIMIT) {
      lose('ESCORA CRITICA', 'La carga se corrio por la banda.');
      return;
    }
    if (Math.abs(st.trim) > TRIM_LIMIT) {
      lose('ASIENTO CRITICO', st.trim > 0 ? 'Va metiendo la proa.' : 'Va sentado de popa.');
      return;
    }
    if (Math.abs(st.heel) > HEEL_LIMIT * 0.62) say('CUIDADO CON LA ESCORA: COMPENSA A LA OTRA BANDA');
    else if (Math.abs(st.trim) > TRIM_LIMIT * 0.62) say('CUIDADO CON EL ASIENTO: COMPENSA PROA-POPA');

    if (!st.queue.length) setTimeout(win, 800);
  };

  // ---------- entrada ----------
  document.addEventListener('keydown', (e) => {
    const k = e.key.toLowerCase();
    if (k === 'arrowleft' || k === 'a') { e.preventDefault(); setCursor(cur.r, cur.c - 1); }
    if (k === 'arrowright' || k === 'd') { e.preventDefault(); setCursor(cur.r, cur.c + 1); }
    if (k === 'arrowup' || k === 'w') { e.preventDefault(); setCursor(cur.r - 1, cur.c); }
    if (k === 'arrowdown' || k === 's') { e.preventDefault(); setCursor(cur.r + 1, cur.c); }
    if ((k === ' ' || k === 'enter') && !e.repeat) {
      e.preventDefault();
      if (st.phase === 'over' && !finale.hidden) { reset(); return; }
      place(cur.r, cur.c);
    }
    if (k === 'r') reset();
  });
  $('restart').addEventListener('click', reset);
  window.addEventListener('resize', reset);

  // ---------- loop ----------
  let last = performance.now();
  const tick = (now) => {
    requestAnimationFrame(tick);
    const dt = Math.min((now - last) / 1000, 0.033);
    last = now;

    if (st.phase === 'play') st.t += dt;

    st.heelShow += (st.heel - st.heelShow) * Math.min(1, dt * 3);
    st.trimShow += (st.trim - st.trimShow) * Math.min(1, dt * 3);

    // el buque se ladea y se desliza hacia el lado pesado; tiembla en peligro
    const heelR = st.heelShow / HEEL_LIMIT, trimR = st.trimShow / TRIM_LIMIT;
    const maxR = Math.max(Math.abs(heelR), Math.abs(trimR));
    const danger = st.phase === 'play' && maxR > 0.7;
    const wobble = danger ? Math.sin(now * 0.018) * (maxR - 0.7) * 10 : 0;
    const targetRot = st.phase === 'over' && st.lostRot ? st.lostRot : st.heelShow * 0.6;
    st.rotShow += (targetRot - st.rotShow) * Math.min(1, dt * (st.lostRot ? 1.6 : 3));
    const scale = Math.min(1, (window.innerWidth * 0.94) / ship.offsetWidth,
                              (window.innerHeight * 0.56) / ship.offsetHeight);
    const tx = st.trimShow * 5, ty = st.heelShow * 5;
    ship.style.transform =
      `translate(calc(-50% + ${tx.toFixed(1)}px), calc(-50% + ${ty.toFixed(1)}px)) ` +
      `scale(${scale}) rotate(${(st.rotShow + wobble).toFixed(2)}deg)`;

    // agua sobre cubierta y alarma continua cuando vamos mal
    flood(floodHeel, heelR, 'to top', 'to bottom');
    flood(floodTrim, trimR, 'to left', 'to right');
    ship.classList.toggle('is-danger', danger);
    if (st.phase === 'play') alarm.hidden = !danger;

    // instrumentos
    const heelAbs = Math.abs(st.heelShow), trimAbs = Math.abs(st.trimShow);
    heelDeg.innerHTML = `${heelAbs.toFixed(1)}&#176;${st.heelShow < -0.05 ? ' BABOR' : st.heelShow > 0.05 ? ' ESTRIBOR' : ''}`;
    trimDeg.innerHTML = `${trimAbs.toFixed(1)}&#176;${st.trimShow < -0.05 ? ' APOPADO' : st.trimShow > 0.05 ? ' APROADO' : ''}`;
    heelNeedle.style.left = `${50 + Math.max(-50, Math.min(50, (st.heelShow / HEEL_LIMIT) * 38))}%`;
    trimNeedle.style.left = `${50 + Math.max(-50, Math.min(50, (st.trimShow / TRIM_LIMIT) * 38))}%`;
    heelMeter.classList.toggle('is-warn', heelAbs > HEEL_LIMIT * 0.62);
    trimMeter.classList.toggle('is-warn', trimAbs > TRIM_LIMIT * 0.62);
  };

  reset();
  requestAnimationFrame(tick);
})();
