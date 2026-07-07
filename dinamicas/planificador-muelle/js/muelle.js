/* ============================================================
   DINAMICA PLANIFICADOR DE MUELLE — motor
   Berth planning simplificado: tablero de 6 tramos x 12 horas.
   Cada buque ocupa eslora (tramos) x estadia (horas). Reglas:
   - No atracar antes de su ETA.
   - Calado > 9 m: solo tramos 1-2 (14 m) y atraque en pleamar.
   - Reefer: la estadia debe tocar los tramos 5-6 (conexiones).
   - Sin encimar estadias.
   Puntaje: 1000 - espera total x 30 - rechazos x 25.
   NOTA: reglas simplificadas para demo; validar con un experto
   en planificacion portuaria.
   ============================================================ */

(() => {
  // ---------- configuracion ----------
  const COLS = 12, ROWS = 6, H0 = 6;      // 12 horas desde las 06:00
  const TIDE = [2, 3, 4, 8, 9, 10];       // columnas de pleamar
  const DEEP_MAX_ROW = 1;                  // tramos 1-2 dragados (filas 0-1)
  const PLUG_ROWS = [4, 5];                // tramos 5-6 con conexiones
  const DRAFT_LIMIT = 9;
  const PT = { wait: 30, reject: 25 };

  // flota: rows = eslora en tramos, cols = estadia en horas
  const SHIPS = [
    { id: 'atlas',  name: 'ATLAS',  type: 'GRANELERO',         color: '#b3422c', rows: 2, cols: 4, eta: 0, draft: 12 },
    { id: 'boreas', name: 'BOREAS', type: 'PORTACONTENEDORES', color: '#009BDE', rows: 3, cols: 3, eta: 0, draft: 8 },
    { id: 'cierzo', name: 'CIERZO', type: 'REEFER',            color: '#e9eff5', rows: 2, cols: 3, eta: 2, draft: 8, reefer: true, dark: true },
    { id: 'drago',  name: 'DRAGO',  type: 'TANQUERO',          color: '#EE7523', rows: 2, cols: 3, eta: 6, draft: 11 },
    { id: 'eolo',   name: 'EOLO',   type: 'FEEDER',            color: '#54BBAB', rows: 1, cols: 4, eta: 4, draft: 7 },
    { id: 'faro',   name: 'FARO',   type: 'CARGA GENERAL',     color: '#FFC627', rows: 2, cols: 3, eta: 5, draft: 8, dark: true },
    { id: 'gavia',  name: 'GAVIA',  type: 'REEFER',            color: '#e9eff5', rows: 2, cols: 3, eta: 8, draft: 8, reefer: true, dark: true }
  ];

  // ---------- DOM ----------
  const $ = (id) => document.getElementById(id);
  const board = $('board'), cardsEl = $('cards');
  const hudPending = $('hud-pending'), hudWait = $('hud-wait'), hudReject = $('hud-reject');
  const confirmBtn = $('confirm');
  const toast = $('toast'), intro = $('intro'), finale = $('finale');

  let toastTimer = 0;
  const say = (msg) => {
    toast.hidden = false;
    toast.textContent = msg;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { toast.hidden = true; }, 2800);
  };

  const hh = (col) => `${String(col + H0).padStart(2, '0')}:00`;

  // ---------- estado ----------
  const st = {
    placed: {},          // id -> {row, col}
    grid: [],            // [r][c] -> id | null
    selected: null,
    rejects: 0,
    phase: 'intro'
  };
  let cells = [], ghost = null;

  // ---------- tablero ----------
  const layout = () => {
    const cw = Math.max(40, Math.min(72, (window.innerWidth - 200) / COLS));
    const ch = Math.max(34, Math.min(56, (window.innerHeight - 350) / ROWS));
    document.documentElement.style.setProperty('--cw', `${cw}px`);
    document.documentElement.style.setProperty('--ch', `${ch}px`);
  };

  const buildBoard = () => {
    board.innerHTML = '';
    cells = [];
    const corner = document.createElement('div');
    corner.className = 'corner';
    corner.textContent = 'TRAMO / HORA';
    board.appendChild(corner);
    for (let c = 0; c < COLS; c++) {
      const h = document.createElement('div');
      h.className = `hcell${TIDE.includes(c) ? ' is-tide' : ''}`;
      h.textContent = hh(c);
      board.appendChild(h);
    }
    for (let r = 0; r < ROWS; r++) {
      const rh = document.createElement('div');
      rh.className = `rhead${r <= DEEP_MAX_ROW ? ' is-deep' : ''}`;
      rh.innerHTML = `<span>T${r + 1} &#183; ${r <= DEEP_MAX_ROW ? '14' : '9'} M</span>${PLUG_ROWS.includes(r) ? '<i class="plug"></i>' : ''}`;
      board.appendChild(rh);
      cells.push([]);
      for (let c = 0; c < COLS; c++) {
        const cell = document.createElement('div');
        cell.className = `cell${r <= DEEP_MAX_ROW ? ' is-deep' : ''}${TIDE.includes(c) ? ' is-tide' : ''}`;
        cell.addEventListener('pointerenter', () => hover(r, c));
        cell.addEventListener('click', () => clickCell(r, c));
        board.appendChild(cell);
        cells[r].push(cell);
      }
    }
    board.addEventListener('pointerleave', hideGhost);
    ghost = document.createElement('div');
    ghost.className = 'ghost';
    ghost.style.display = 'none';
    board.appendChild(ghost);
  };

  const buildCards = () => {
    cardsEl.innerHTML = '';
    SHIPS.forEach((ship) => {
      const card = document.createElement('div');
      card.className = 'card';
      card.style.setProperty('--c', ship.color);
      const chips = [
        ship.draft > DRAFT_LIMIT ? '<i class="chip chip--tide">SOLO PLEAMAR</i>' : '',
        ship.reefer ? '<i class="chip chip--plug">ENCHUFE 5-6</i>' : ''
      ].join('');
      card.innerHTML =
        `<b class="card__name">${ship.name}<em id="slot-${ship.id}"></em></b>` +
        `<span class="card__type">${ship.type}</span>` +
        `<span class="card__meta">ESLORA ${ship.rows} TRAMOS &#183; CALADO ${ship.draft} M</span>` +
        `<span class="card__meta">ETA ${hh(ship.eta)} &#183; ESTADIA ${ship.cols} H</span>` +
        (chips ? `<span class="card__chips">${chips}</span>` : '');
      card.addEventListener('click', () => clickCard(ship));
      ship.card = card;
      cardsEl.appendChild(card);
    });
  };

  // ---------- reglas ----------
  const validate = (ship, r, c) => {
    if (c < ship.eta) return { ok: false, msg: `${ship.name} AUN NO LLEGA: SU ETA ES ${hh(ship.eta)}` };
    if (ship.draft > DRAFT_LIMIT && r + ship.rows - 1 > DEEP_MAX_ROW)
      return { ok: false, msg: `CALADO ${ship.draft} M: SOLO TRAMOS 1-2, DRAGADOS A 14 M` };
    if (ship.draft > DRAFT_LIMIT && !TIDE.includes(c))
      return { ok: false, msg: 'CALADO PROFUNDO: SOLO PUEDE ATRACAR EN PLEAMAR (COLUMNAS AZULES)' };
    if (ship.reefer && (r + ship.rows - 1 < PLUG_ROWS[0]))
      return { ok: false, msg: 'REEFER: SU ESTADIA DEBE TOCAR LOS TRAMOS 5-6 (CONEXIONES)' };
    for (let rr = r; rr < r + ship.rows; rr++) {
      for (let cc = c; cc < c + ship.cols; cc++) {
        if (st.grid[rr][cc]) return { ok: false, msg: 'SE ENCIMA CON OTRA ESTADIA: BUSCA HUECO' };
      }
    }
    return { ok: true };
  };

  const anchor = (ship, r, c) => ({
    r: Math.min(r, ROWS - ship.rows),
    c: Math.min(c, COLS - ship.cols)
  });

  // ---------- interaccion ----------
  const hideGhost = () => { if (ghost) ghost.style.display = 'none'; };

  const hover = (r, c) => {
    if (st.phase !== 'play' || !st.selected) { hideGhost(); return; }
    const ship = st.selected;
    const a = anchor(ship, r, c);
    const v = validate(ship, a.r, a.c);
    const c0 = cells[a.r][a.c];
    ghost.style.display = 'flex';
    ghost.className = `ghost ${v.ok ? 'is-ok' : 'is-bad'}${ship.dark ? ' ghost--dark' : ''}`;
    ghost.style.setProperty('--c', ship.color);
    ghost.style.left = `${c0.offsetLeft}px`;
    ghost.style.top = `${c0.offsetTop}px`;
    ghost.style.width = `${c0.offsetWidth * ship.cols}px`;
    ghost.style.height = `${c0.offsetHeight * ship.rows}px`;
    ghost.innerHTML = `<b>${ship.name}</b><span>ATRACA ${hh(a.c)}</span>`;
  };

  const clickCard = (ship) => {
    if (st.phase !== 'play') return;
    if (st.placed[ship.id]) { lift(ship); return; }
    select(ship);
  };

  const select = (ship) => {
    st.selected = ship;
    SHIPS.forEach((s) => s.card.classList.toggle('is-selected', s === ship));
    say(`${ship.name} EN MANO: CLICK EN EL TABLERO PARA ATRACARLO`);
  };

  const deselect = () => {
    st.selected = null;
    hideGhost();
    SHIPS.forEach((s) => s.card.classList.remove('is-selected'));
  };

  const clickCell = (r, c) => {
    if (st.phase !== 'play' || !st.selected) return;
    const ship = st.selected;
    const a = anchor(ship, r, c);
    const v = validate(ship, a.r, a.c);
    if (!v.ok) {
      st.rejects++;
      say(v.msg);
      updateHud();
      return;
    }
    place(ship, a.r, a.c);
  };

  const place = (ship, r, c) => {
    st.placed[ship.id] = { row: r, col: c };
    for (let rr = r; rr < r + ship.rows; rr++)
      for (let cc = c; cc < c + ship.cols; cc++) st.grid[rr][cc] = ship.id;

    const block = document.createElement('div');
    block.className = `block is-landing${ship.dark ? ' block--dark' : ''}`;
    block.style.setProperty('--c', ship.color);
    const wait = c - ship.eta;
    block.innerHTML = `<b>${ship.name}</b><span>${hh(c)} &#183; T${r + 1}${wait ? ` &#183; ESPERA ${wait}H` : ''}</span>`;
    const c0 = cells[r][c];
    block.style.left = `${c0.offsetLeft}px`;
    block.style.top = `${c0.offsetTop}px`;
    block.style.width = `${c0.offsetWidth * ship.cols}px`;
    block.style.height = `${c0.offsetHeight * ship.rows}px`;
    block.addEventListener('click', (e) => { e.stopPropagation(); lift(ship); });
    board.appendChild(block);
    ship.block = block;

    ship.card.classList.add('is-placed');
    $(`slot-${ship.id}`).textContent = `${hh(c)} T${r + 1}`;
    deselect();
    updateHud();
  };

  const lift = (ship) => {
    const p = st.placed[ship.id];
    if (!p) return;
    delete st.placed[ship.id];
    for (let rr = p.row; rr < p.row + ship.rows; rr++)
      for (let cc = p.col; cc < p.col + ship.cols; cc++) st.grid[rr][cc] = null;
    if (ship.block) { ship.block.remove(); ship.block = null; }
    ship.card.classList.remove('is-placed');
    $(`slot-${ship.id}`).textContent = '';
    select(ship);
    updateHud();
  };

  // ---------- HUD y final ----------
  const totalWait = () =>
    SHIPS.reduce((sum, s) => sum + (st.placed[s.id] ? st.placed[s.id].col - s.eta : 0), 0);

  const updateHud = () => {
    const pending = SHIPS.filter((s) => !st.placed[s.id]).length;
    hudPending.textContent = pending;
    hudWait.textContent = `${totalWait()} H`;
    hudReject.textContent = st.rejects;
    confirmBtn.hidden = pending > 0 || st.phase !== 'play';
  };

  const confirmPlan = () => {
    if (st.phase !== 'play' || SHIPS.some((s) => !st.placed[s.id])) return;
    st.phase = 'over';
    confirmBtn.hidden = true;
    const wait = totalWait();
    const score = Math.max(0, 1000 - wait * PT.wait - st.rejects * PT.reject);
    const rank = score >= 760 ? 'Jefe de planificacion portuaria.' :
                 score >= 640 ? 'Planner senior.' :
                 score >= 450 ? 'Planner junior.' : 'Practicante de muelle.';
    $('finale-kicker').textContent = 'PLAN CONFIRMADO';
    $('finale-title').textContent = rank;
    $('finale-score').textContent = `${score} PTS`;
    $('finale-detail').textContent = `ESPERA TOTAL ${wait} H · ${st.rejects} RECHAZOS · ${SHIPS.length} BUQUES PROGRAMADOS`;
    finale.hidden = false;
  };

  const reset = () => {
    layout();
    st.placed = {};
    st.grid = Array.from({ length: ROWS }, () => Array(COLS).fill(null));
    st.selected = null;
    st.rejects = 0;
    st.phase = 'intro';
    SHIPS.forEach((s) => { s.block = null; });
    buildBoard();
    buildCards();
    finale.hidden = true;
    intro.hidden = false;
    updateHud();
  };

  const startPlan = () => {
    intro.hidden = true;
    if (st.phase === 'intro') {
      st.phase = 'play';
      say('TOMA UN BUQUE DE LA FLOTA Y ACOMODALO EN EL TABLERO');
    }
    updateHud();
  };

  const openHelp = () => {
    if (st.phase !== 'play') return;
    st.phase = 'intro';
    intro.hidden = false;
    hideGhost();
    updateHud();
  };

  // ---------- entrada ----------
  document.addEventListener('keydown', (e) => {
    const k = e.key.toLowerCase();
    if (k === 'r') reset();
    if (k === 'escape') deselect();
    if (k === 'h') { if (intro.hidden) openHelp(); else startPlan(); }
    if ((k === 'enter' || k === ' ') && !intro.hidden) { e.preventDefault(); startPlan(); return; }
    if (k === 'enter' && st.phase === 'play' && !confirmBtn.hidden) confirmPlan();
    if (k === 'enter' && st.phase === 'over' && !finale.hidden) reset();
  });
  $('start').addEventListener('click', startPlan);
  $('help').addEventListener('click', openHelp);
  $('restart').addEventListener('click', reset);
  confirmBtn.addEventListener('click', confirmPlan);

  // re-acomoda bloques al cambiar el tamano de la ventana
  window.addEventListener('resize', () => {
    layout();
    SHIPS.forEach((ship) => {
      const p = st.placed[ship.id];
      if (!p || !ship.block) return;
      const c0 = cells[p.row][p.col];
      ship.block.style.left = `${c0.offsetLeft}px`;
      ship.block.style.top = `${c0.offsetTop}px`;
      ship.block.style.width = `${c0.offsetWidth * ship.cols}px`;
      ship.block.style.height = `${c0.offsetHeight * ship.rows}px`;
    });
  });

  reset();
})();
