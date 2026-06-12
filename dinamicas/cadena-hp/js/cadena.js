/* ============================================================
   DINAMICA CADENA LOGISTICA — motor
   Fichas arrastrables (pointer events) + soporte de teclado.
   Confirmar fija las correctas y regresa las equivocadas.
   ============================================================ */

(() => {
  // ---------- iconos (SVG inline, trazo navy / acentos HP) ----------
  const I = {
    buque: '<svg viewBox="0 0 48 48"><path d="M5 30 h34 l4 5 -6 6 H10 q-5 0 -5 -5 Z" fill="#002E6D"/><rect x="9" y="24" width="7" height="6" fill="#EE7523"/><rect x="17" y="24" width="7" height="6" fill="#009BDE"/><rect x="25" y="24" width="7" height="6" fill="#FFC627"/><rect x="11" y="14" width="8" height="10" fill="#f6f8fb" stroke="#002E6D" stroke-width="2"/></svg>',
    grua: '<svg viewBox="0 0 48 48"><path d="M8 42 V12 h26 M14 42 V12 M8 18 h6" fill="none" stroke="#009BDE" stroke-width="4"/><path d="M30 12 v8" stroke="#16304f" stroke-width="2.5"/><rect x="24" y="20" width="12" height="8" fill="#EE7523" stroke="#16304f" stroke-width="2"/><rect x="4" y="40" width="40" height="4" fill="#16304f"/></svg>',
    patio: '<svg viewBox="0 0 48 48"><rect x="6" y="28" width="16" height="9" fill="#009BDE" stroke="#16304f" stroke-width="2"/><rect x="24" y="28" width="16" height="9" fill="#EE7523" stroke="#16304f" stroke-width="2"/><rect x="15" y="18" width="16" height="9" fill="#FFC627" stroke="#16304f" stroke-width="2"/><rect x="4" y="39" width="40" height="4" fill="#16304f"/></svg>',
    aduana: '<svg viewBox="0 0 48 48"><rect x="10" y="6" width="28" height="36" rx="3" fill="#fff" stroke="#002E6D" stroke-width="3"/><path d="M16 16 h16 M16 22 h16 M16 28 h10" stroke="#9ACAEB" stroke-width="3"/><circle cx="32" cy="33" r="7" fill="#54BBAB"/><path d="M29 33 l2.4 2.4 4-4.6" fill="none" stroke="#fff" stroke-width="2.5"/></svg>',
    camion: '<svg viewBox="0 0 48 48"><rect x="4" y="18" width="26" height="14" fill="#009BDE" stroke="#16304f" stroke-width="2.5"/><path d="M30 22 h9 l5 6 v4 h-14 Z" fill="#002E6D"/><circle cx="13" cy="36" r="5" fill="#16304f"/><circle cx="36" cy="36" r="5" fill="#16304f"/></svg>',
    tren: '<svg viewBox="0 0 48 48"><rect x="6" y="14" width="22" height="18" rx="4" fill="#EE7523" stroke="#16304f" stroke-width="2.5"/><rect x="30" y="20" width="13" height="12" fill="#009BDE" stroke="#16304f" stroke-width="2.5"/><rect x="10" y="18" width="8" height="7" fill="#9fd8ff"/><circle cx="14" cy="36" r="4" fill="#16304f"/><circle cx="24" cy="36" r="4" fill="#16304f"/><circle cx="37" cy="36" r="4" fill="#16304f"/><path d="M2 42 h44" stroke="#16304f" stroke-width="3"/></svg>',
    cliente: '<svg viewBox="0 0 48 48"><path d="M8 20 L24 8 40 20" fill="none" stroke="#002E6D" stroke-width="3.5"/><rect x="12" y="20" width="24" height="20" fill="#fff" stroke="#002E6D" stroke-width="3"/><rect x="20" y="28" width="8" height="12" fill="#FFC627" stroke="#002E6D" stroke-width="2"/></svg>',
    planta: '<svg viewBox="0 0 48 48"><path d="M8 40 V20 l10 7 v-7 l10 7 v-7 l12 8 v12 Z" fill="#5d7191" stroke="#16304f" stroke-width="2.5"/><rect x="12" y="10" width="5" height="12" fill="#16304f"/><rect x="13" y="30" width="6" height="6" fill="#FFC627"/><rect x="23" y="30" width="6" height="6" fill="#FFC627"/></svg>',
    gate: '<svg viewBox="0 0 48 48"><rect x="6" y="14" width="10" height="26" fill="#dfe6ec" stroke="#16304f" stroke-width="2.5"/><path d="M16 22 h28" stroke="#16304f" stroke-width="7"/><path d="M16 22 h28" stroke="#FFC627" stroke-width="5" stroke-dasharray="6 6"/><rect x="8" y="18" width="6" height="5" fill="#9fd8ff"/></svg>',
    enchufe: '<svg viewBox="0 0 48 48"><rect x="14" y="6" width="20" height="22" rx="4" fill="#eef4f9" stroke="#002E6D" stroke-width="3"/><circle cx="20" cy="14" r="2.5" fill="#002E6D"/><circle cx="28" cy="14" r="2.5" fill="#002E6D"/><rect x="21" y="19" width="6" height="5" fill="#002E6D"/><path d="M24 28 v8 q0 5 -6 5 h-6" fill="none" stroke="#54BBAB" stroke-width="3.5"/></svg>',
    lupa: '<svg viewBox="0 0 48 48"><circle cx="20" cy="20" r="11" fill="none" stroke="#002E6D" stroke-width="4"/><path d="M28 28 L40 40" stroke="#EE7523" stroke-width="5" stroke-linecap="round"/><path d="M15 19 a6 6 0 0 1 5 -5" stroke="#9ACAEB" stroke-width="2.5" fill="none"/></svg>'
  };

  // ---------- escenarios (orden correcto) ----------
  const ROUNDS = [
    {
      kicker: 'ESCENARIO 1 / IMPORTACION',
      title: 'Del buque al cliente.',
      sub: 'Un contenedor de linea blanca llega de Asia. Ordena su ruta.',
      stages: [
        { icon: 'buque', label: 'Buque atraca' },
        { icon: 'grua', label: 'Descarga con STS' },
        { icon: 'patio', label: 'Estancia en patio' },
        { icon: 'aduana', label: 'Despacho aduanal' },
        { icon: 'camion', label: 'Salida en camion' },
        { icon: 'cliente', label: 'Cliente final' }
      ]
    },
    {
      kicker: 'ESCENARIO 2 / EXPORTACION',
      title: 'De la planta al mar.',
      sub: 'Una armadora exporta autopartes. Arma el flujo de salida.',
      stages: [
        { icon: 'planta', label: 'Planta produce' },
        { icon: 'tren', label: 'Tren al puerto' },
        { icon: 'gate', label: 'Entrada por gate' },
        { icon: 'patio', label: 'Estancia en patio' },
        { icon: 'grua', label: 'Carga con STS' },
        { icon: 'buque', label: 'Buque zarpa' }
      ]
    },
    {
      kicker: 'ESCENARIO 3 / CADENA DE FRIO',
      title: 'El reefer no espera.',
      sub: 'Llega fruta refrigerada. Cada hora cuenta: ordena el flujo.',
      stages: [
        { icon: 'buque', label: 'Buque atraca' },
        { icon: 'grua', label: 'Descarga con STS' },
        { icon: 'enchufe', label: 'Conexion reefer' },
        { icon: 'lupa', label: 'Inspeccion sanitaria' },
        { icon: 'aduana', label: 'Despacho aduanal' },
        { icon: 'camion', label: 'Reparto refrigerado' }
      ]
    }
  ];

  // ---------- DOM ----------
  const $ = (id) => document.getElementById(id);
  const route = $('route'), pool = $('pool');
  const confirmBtn = $('confirm');
  const mRound = $('m-round'), mTries = $('m-tries'), mScore = $('m-score');
  const hudStatus = $('hud-status');
  const toast = $('toast'), finale = $('finale');

  let toastTimer = 0;
  const say = (msg, ms = 2300) => {
    toast.hidden = false;
    toast.textContent = msg;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { toast.hidden = true; }, ms);
  };

  // ---------- estado ----------
  let round = 0, tries = 0, score = 0, t0 = 0;
  let slots = [];        // elementos .slot
  let tiles = [];        // { el, stage (indice correcto), slot: null|idx, locked }
  let selected = -1;     // seleccion de teclado en el pool
  let phase = 'play';    // play | between | over

  const updateHud = () => {
    mRound.textContent = `${round + 1}/${ROUNDS.length}`;
    mTries.textContent = String(tries);
    mScore.textContent = String(score);
  };

  const shuffled = (n) => {
    const a = Array.from({ length: n }, (_, i) => i);
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    // que no salga ya resuelto
    if (a.every((v, i) => v === i)) [a[0], a[1]] = [a[1], a[0]];
    return a;
  };

  const buildRound = () => {
    const R = ROUNDS[round];
    $('brief-kicker').textContent = R.kicker;
    $('brief-title').textContent = R.title;
    $('brief-sub').textContent = R.sub;

    route.innerHTML = '';
    pool.innerHTML = '';
    slots = [];
    tiles = [];
    tries = 0;
    t0 = performance.now();
    selected = -1;
    phase = 'play';
    finale.hidden = true;

    R.stages.forEach((_, i) => {
      if (i > 0) {
        const a = document.createElement('span');
        a.className = 'arrow';
        a.textContent = '▸';
        route.appendChild(a);
      }
      const s = document.createElement('div');
      s.className = 'slot';
      s.dataset.n = String(i + 1);
      route.appendChild(s);
      slots.push(s);
    });

    shuffled(R.stages.length).forEach((stageIdx) => {
      const st2 = R.stages[stageIdx];
      const el = document.createElement('div');
      el.className = 'tile';
      el.innerHTML =
        `<span class="tile__icon">${I[st2.icon]}</span>` +
        `<span class="tile__label">${st2.label}</span>` +
        `<span class="tile__check">&#10003;</span>`;
      pool.appendChild(el);
      tiles.push({ el, stage: stageIdx, slot: null, locked: false });
      attachDrag(el);
    });

    updateHud();
    updateConfirm();
    hudStatus.textContent = 'ARRASTRA LAS ETAPAS A LA RUTA EN EL ORDEN CORRECTO';
  };

  const tileAt = (slotIdx) => tiles.find((t) => t.slot === slotIdx);
  const tileOf = (el) => tiles.find((t) => t.el === el);

  const placeTile = (tile, slotIdx) => {
    if (tile.locked) return;
    // si la posicion esta ocupada por una ficha libre, la regresa al pool
    const occupant = tileAt(slotIdx);
    if (occupant && occupant !== tile) {
      if (occupant.locked) return;
      occupant.slot = null;
      pool.appendChild(occupant.el);
    }
    tile.slot = slotIdx;
    slots[slotIdx].appendChild(tile.el);
    tile.el.style.position = '';
    updateConfirm();
  };

  const returnToPool = (tile) => {
    if (tile.locked) return;
    tile.slot = null;
    pool.appendChild(tile.el);
    updateConfirm();
  };

  const updateConfirm = () => {
    const full = tiles.every((t) => t.slot !== null);
    confirmBtn.disabled = !full || phase !== 'play';
  };

  // ---------- arrastre ----------
  const attachDrag = (el) => {
    el.addEventListener('pointerdown', (e) => {
      const tile = tileOf(el);
      if (!tile || tile.locked || phase !== 'play') return;
      e.preventDefault();

      const rect = el.getBoundingClientRect();
      const offX = e.clientX - rect.left;
      const offY = e.clientY - rect.top;

      el.classList.add('is-dragging');
      document.body.appendChild(el);
      const move = (ev) => {
        el.style.left = `${ev.clientX - offX}px`;
        el.style.top = `${ev.clientY - offY}px`;
        slots.forEach((s, i) => {
          const r = s.getBoundingClientRect();
          const over = ev.clientX > r.left && ev.clientX < r.right &&
                       ev.clientY > r.top && ev.clientY < r.bottom &&
                       !(tileAt(i) && tileAt(i).locked);
          s.classList.toggle('is-over', over);
        });
      };
      move(e);

      const up = (ev) => {
        document.removeEventListener('pointermove', move);
        document.removeEventListener('pointerup', up);
        el.classList.remove('is-dragging');
        el.style.left = el.style.top = '';

        let dropped = false;
        slots.forEach((s, i) => {
          const r = s.getBoundingClientRect();
          if (!dropped &&
              ev.clientX > r.left && ev.clientX < r.right &&
              ev.clientY > r.top && ev.clientY < r.bottom &&
              !(tileAt(i) && tileAt(i).locked)) {
            placeTile(tile, i);
            dropped = true;
          }
          s.classList.remove('is-over');
        });
        if (!dropped) returnToPool(tile);
      };

      document.addEventListener('pointermove', move);
      document.addEventListener('pointerup', up);
    });
  };

  // ---------- confirmar ----------
  const confirmOrder = () => {
    if (confirmBtn.disabled || phase !== 'play') return;
    tries++;
    let wrong = 0;
    tiles.forEach((tile) => {
      if (tile.locked) return;
      if (tile.stage === tile.slot) {
        tile.locked = true;
        tile.el.classList.add('is-locked');
        slots[tile.slot].classList.add('is-locked');
      } else {
        wrong++;
        tile.el.classList.add('is-wrong');
        setTimeout(() => {
          tile.el.classList.remove('is-wrong');
          returnToPool(tile);
        }, 480);
      }
    });
    updateHud();

    if (wrong === 0) {
      const secs = (performance.now() - t0) / 1000;
      const pts = Math.max(0, Math.round(600 - (tries - 1) * 150 - secs * 3));
      score += pts;
      phase = 'between';
      updateHud();
      const last = round === ROUNDS.length - 1;
      $('finale-kicker').textContent = ROUNDS[round].kicker;
      $('finale-title').textContent = last ? rankTitle() : 'Cadena completa.';
      $('finale-score').textContent = last ? `${score} PTS TOTALES` : `+${pts} PTS`;
      $('finale-detail').textContent =
        `${tries} ${tries === 1 ? 'INTENTO' : 'INTENTOS'} · ${Math.round(secs)}S` +
        (last ? ' — FIN DE LA DINAMICA' : '');
      $('btn-next').textContent = last ? 'OTRA PARTIDA [ENTER]' : 'SIGUIENTE ESCENARIO [ENTER]';
      if (last) phase = 'over';
      setTimeout(() => { finale.hidden = false; }, wrong === 0 ? 500 : 0);
    } else {
      document.body.classList.add('shake');
      setTimeout(() => document.body.classList.remove('shake'), 500);
      hudStatus.textContent = `${wrong} ${wrong === 1 ? 'ETAPA REGRESO' : 'ETAPAS REGRESARON'} AL POOL: ACOMODA DE NUEVO`;
      say('LAS VERDES YA QUEDARON FIJAS', 2000);
    }
  };

  const rankTitle = () => {
    return score >= 1500 ? 'Director de logistica.' :
           score >= 1050 ? 'Coordinador de trafico.' :
           score >= 600 ? 'Despachador con calle.' : 'El contenedor llego... de milagro.';
  };

  const next = () => {
    if (phase === 'over') { round = 0; score = 0; buildRound(); return; }
    if (phase !== 'between') return;
    round++;
    buildRound();
  };

  // ---------- teclado ----------
  document.addEventListener('keydown', (e) => {
    const k = e.key.toLowerCase();
    if (k === 'r') { buildRound(); return; }
    if (k === 'enter') {
      e.preventDefault();
      if (!finale.hidden) { next(); return; }
      confirmOrder();
      return;
    }
    if (phase !== 'play') return;

    const free = tiles.filter((t) => !t.locked && t.slot === null);
    if (!free.length) return;

    if (k === 'a' || k === 'arrowleft' || k === 'd' || k === 'arrowright') {
      e.preventDefault();
      const dir = (k === 'a' || k === 'arrowleft') ? -1 : 1;
      selected = (selected + dir + free.length) % free.length;
      tiles.forEach((t) => t.el.classList.remove('is-selected'));
      free[selected].el.classList.add('is-selected');
    }
    const n = parseInt(e.key, 10);
    if (n >= 1 && n <= slots.length) {
      e.preventDefault();
      const pick = free[Math.max(selected, 0)];
      if (pick && !(tileAt(n - 1) && tileAt(n - 1).locked)) {
        pick.el.classList.remove('is-selected');
        placeTile(pick, n - 1);
        selected = -1;
      }
    }
  });

  confirmBtn.addEventListener('click', confirmOrder);
  $('btn-next').addEventListener('click', next);

  buildRound();
})();
