/* ============================================================
   DINAMICA TRAFICO VTS — motor
   Radar cenital: fondeadero a la derecha, darsena con muelles a
   la izquierda y un canal de UN SOLO SENTIDO en medio. El
   jugador autoriza cada movimiento con click. Reglas:
   - Sentidos opuestos en el canal = abordaje (fin de la guardia).
   - Poca distancia en el mismo sentido = incidente de alcance.
   - El tanquero exige canal exclusivo.
   - Los buques fondeados pierden paciencia y se van; los
     atracados listos generan demora si nadie los despacha.
   NOTA: reglas simplificadas para demo; validar con un experto
   en operaciones portuarias.
   ============================================================ */

(() => {
  // ---------- configuracion ----------
  const TYPES = {
    cont: { tag: 'CONT', name: 'PORTACONTENEDORES', speed: 105, color: '#5ee1a0', unload: 10, wait: 80 },
    reef: { tag: 'REEF', name: 'REEFER URGENTE',    speed: 130, color: '#8fe8ff', unload: 7,  wait: 38 },
    gran: { tag: 'GRAN', name: 'GRANELERO',         speed: 62,  color: '#e0cd74', unload: 13, wait: 85 },
    tanq: { tag: 'TANQ', name: 'TANQUERO IMO',      speed: 55,  color: '#ff9d6b', unload: 12, wait: 85, exclusive: true }
  };
  // buques ya atracados y listos para zarpar al iniciar la guardia
  const INITIAL = ['cont', 'gran', 'tanq'];
  // llegadas al fondeadero (segundos de guardia)
  const ARRIVALS = [
    { t: 3, type: 'cont' }, { t: 12, type: 'reef' }, { t: 20, type: 'gran' },
    { t: 30, type: 'cont' }, { t: 40, type: 'tanq' }, { t: 52, type: 'reef' },
    { t: 62, type: 'cont' }, { t: 74, type: 'gran' }, { t: 86, type: 'reef' },
    { t: 96, type: 'cont' }
  ];
  const TOTAL = INITIAL.length + ARRIVALS.length;
  const BERTHS = 4, SPOTS = 6;
  const GAP_SLOW = 95, GAP_STRIKE = 70, HIT_DIST = 48;
  const PT = { entry: 60, exit: 60, punct: 40, alcance: -60, grave: -120, divert: -150, demur: -15 };
  const DEMUR_GRACE = 25, DEMUR_EVERY = 6;
  const STRIKES_MAX = 3;

  // ---------- DOM ----------
  const $ = (id) => document.getElementById(id);
  const scene = $('scene'), layer = $('ships');
  const chanEl = $('chan'), lamps = $('lamps');
  const hudClock = $('hud-clock'), hudSailed = $('hud-sailed'), hudScore = $('hud-score');
  const hudStatus = $('hud-status');
  const toast = $('toast'), alarm = $('alarm'), finale = $('finale');
  const intro = $('intro');

  let toastTimer = 0;
  const say = (msg) => {
    toast.hidden = false;
    toast.textContent = msg;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { toast.hidden = true; }, 2600);
  };

  // ---------- layout ----------
  let W, H, L;
  const layout = () => {
    W = window.innerWidth; H = window.innerHeight;
    const chy = H * 0.54;
    const spread = Math.min(150, H * 0.19);
    L = {
      chy,
      chx1: W * 0.26, chx2: W * 0.76,
      chh: Math.min(52, H * 0.08),
      quayW: W * 0.17,
      bx: W * 0.115,
      bys: [-1.5, -0.5, 0.5, 1.5].map((k) => chy + k * Math.min(112, H * 0.15)),
      spots: [],
      seaOut: { x: W + 160, y: chy }
    };
    const ax1 = W * 0.865, ax2 = W * 0.945;
    [-spread - 60, -70, spread + 50].forEach((dy) => {
      L.spots.push({ x: ax1, y: chy + dy });
      L.spots.push({ x: ax2, y: chy + dy + 35 });
    });
  };

  const el = (cls, parent) => {
    const d = document.createElement('div');
    d.className = cls;
    (parent || scene).appendChild(d);
    return d;
  };

  const buildScene = () => {
    scene.innerHTML = '';
    layer.innerHTML = '';
    const quay = el('quay');
    quay.style.width = `${L.quayW}px`;

    for (let b = 0; b < BERTHS; b++) {
      const s = el('berth');
      s.style.left = `${L.bx}px`;
      s.style.top = `${L.bys[b]}px`;
      s.innerHTML = `<span class="berth__tag">M${b + 1}</span>`;
    }
    L.spots.forEach((p, i) => {
      const s = el('aspot');
      s.style.left = `${p.x}px`;
      s.style.top = `${p.y}px`;
      s.innerHTML = `<span class="aspot__tag">F${i + 1}</span>`;
    });
    [-1, 1].forEach((side) => {
      const l = el('bline');
      l.style.left = `${L.chx1}px`;
      l.style.width = `${L.chx2 - L.chx1}px`;
      l.style.top = `${L.chy + side * L.chh}px`;
    });
    const lab = (text, x, y) => {
      const z = el('zlabel');
      z.textContent = text;
      z.style.left = `${x}px`;
      z.style.top = `${y}px`;
    };
    lab('DARSENA', L.quayW / 2, 64);
    lab('CANAL DE NAVEGACION · UN SOLO SENTIDO', (L.chx1 + L.chx2) / 2, L.chy - L.chh - 24);
    lab('FONDEADERO', W * 0.905, 64);
  };

  // ---------- estado ----------
  let st, uid = 0;

  const mkShip = (type, x, y) => {
    const cfg = TYPES[type];
    const d = document.createElement('div');
    d.className = 'vship';
    d.style.setProperty('--c', cfg.color);
    d.innerHTML = `<i class="vship__bar"><b></b></i><i class="vship__hull"></i><span class="vship__tag">${cfg.tag}</span>`;
    layer.appendChild(d);
    const s = {
      id: uid++, type, cfg, el: d,
      hull: d.querySelector('.vship__hull'),
      bar: d.querySelector('.vship__bar'),
      fill: d.querySelector('.vship__bar b'),
      x, y, rot: 180,
      state: 'arrive', path: [],
      speedCap: Infinity, curSpeed: 0,
      patience: cfg.wait, punct: 1,
      unloadT: 0, readyT: 0, demurT: 0,
      berth: -1, spot: -1
    };
    d.addEventListener('pointerdown', (e) => { e.preventDefault(); authorize(s); });
    return s;
  };

  const mkFloat = (x, y, text, bad) => {
    const f = document.createElement('div');
    f.className = `float${bad ? ' float--bad' : ''}`;
    f.textContent = text;
    f.style.left = `${x}px`;
    f.style.top = `${y - 26}px`;
    layer.appendChild(f);
    setTimeout(() => f.remove(), 1400);
  };

  const score = (pts, x, y) => {
    st.score += pts;
    mkFloat(x, y, `${pts > 0 ? '+' : ''}${pts}`, pts < 0);
  };

  const reset = () => {
    layout();
    buildScene();
    st = {
      ships: [], pending: ARRIVALS.map((a) => ({ ...a })),
      berths: Array(BERTHS).fill(null), spots: Array(SPOTS).fill(null),
      t: 0, score: 0, sailed: 0, diverted: 0, strikes: 0,
      pairs: new Set(), graves: new Set(),
      demurToastT: -99, phase: 'intro'
    };
    INITIAL.forEach((type, b) => {
      const s = mkShip(type, L.bx, L.bys[b]);
      s.state = 'ready';
      s.berth = b;
      s.rot = 0;
      st.berths[b] = s;
      st.ships.push(s);
    });
    finale.hidden = true;
    alarm.hidden = true;
    intro.hidden = false;
    hudStatus.textContent = 'CLICK SOBRE UN BUQUE PARA AUTORIZARLO · UN SOLO SENTIDO EN EL CANAL';
  };

  const startShift = () => {
    intro.hidden = true;
    if (st.phase === 'intro') {
      st.phase = 'play';
      if (st.t < 0.1) say(`INICIA LA GUARDIA: DESPACHA LOS ${TOTAL} MOVIMIENTOS SIN INCIDENTES`);
    }
  };

  const openHelp = () => {
    if (st.phase !== 'play') return;
    st.phase = 'intro';
    intro.hidden = false;
  };

  // ---------- autorizaciones ----------
  const authorize = (s) => {
    if (st.phase !== 'play') return;
    if (s.state === 'anchored') {
      const b = st.berths.findIndex((v) => !v);
      if (b < 0) { say('NO HAY MUELLE LIBRE: DESPACHA UNA SALIDA PRIMERO'); return; }
      st.berths[b] = s;
      s.berth = b;
      if (s.spot >= 0) { st.spots[s.spot] = null; s.spot = -1; }
      s.punct = Math.max(0, s.patience / s.cfg.wait);
      s.state = 'in';
      s.path = [
        { x: L.chx2 + 55, y: L.chy },
        { x: L.chx1 - 45, y: L.chy },
        { x: L.bx + 50, y: L.bys[b] },
        { x: L.bx, y: L.bys[b] }
      ];
    } else if (s.state === 'ready') {
      st.berths[s.berth] = null;
      s.berth = -1;
      s.state = 'out';
      s.path = [
        { x: L.bx + 60, y: s.y },
        { x: L.chx1 - 45, y: L.chy },
        { x: L.chx2 + 55, y: L.chy },
        L.seaOut
      ];
    }
  };

  // ---------- incidentes ----------
  const addStrikes = (n) => {
    st.strikes += n;
    if (st.strikes >= STRIKES_MAX && st.phase === 'play') {
      lose('EXPEDIENTE LLENO', 'Tres incidentes: te retiran la guardia.');
    }
  };

  const flash = (s) => {
    s.el.classList.remove('is-flash');
    void s.el.offsetWidth;
    s.el.classList.add('is-flash');
  };

  const collision = (a, b) => {
    st.phase = 'over';
    const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
    const boom = document.createElement('div');
    boom.className = 'boom';
    boom.style.left = `${mx}px`;
    boom.style.top = `${my}px`;
    layer.appendChild(boom);
    alarm.hidden = false;
    document.body.classList.add('shake');
    setTimeout(() => document.body.classList.remove('shake'), 520);
    setTimeout(() => {
      $('finale-kicker').textContent = 'ABORDAJE EN EL CANAL';
      $('finale-title').textContent = 'Dos sentidos a la vez.';
      $('finale-score').textContent = `${st.score} PTS`;
      $('finale-detail').textContent = detailLine();
      finale.hidden = false;
    }, 1600);
  };

  const lose = (kicker, title) => {
    st.phase = 'over';
    alarm.hidden = false;
    setTimeout(() => {
      $('finale-kicker').textContent = kicker;
      $('finale-title').textContent = title;
      $('finale-score').textContent = `${st.score} PTS`;
      $('finale-detail').textContent = detailLine();
      finale.hidden = false;
    }, 1200);
  };

  const fmtTime = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
  const detailLine = () =>
    `${st.sailed} DE ${TOTAL} ZARPES · ${st.diverted} DESVIADOS · ${st.strikes} STRIKES · ${fmtTime(st.t)}`;

  const win = () => {
    st.phase = 'over';
    const rank = st.score >= 1750 ? 'Jefe de trafico maritimo.' :
                 st.score >= 1450 ? 'Oficial VTS de primera.' :
                 st.score >= 1050 ? 'Controlador con oficio.' : 'Aprendiz de radar.';
    $('finale-kicker').textContent = 'GUARDIA COMPLETA';
    $('finale-title').textContent = rank;
    $('finale-score').textContent = `${st.score} PTS`;
    $('finale-detail').textContent = detailLine();
    finale.hidden = false;
  };

  // ---------- simulacion ----------
  const inChannel = (s) =>
    (s.state === 'in' || s.state === 'out') &&
    s.x > L.chx1 && s.x < L.chx2 && Math.abs(s.y - L.chy) < L.chh + 12;
  const dirOf = (s) => (s.state === 'in' ? -1 : 1);

  const spawn = () => {
    for (const a of st.pending) {
      if (a.t > st.t) continue;
      const spot = st.spots.findIndex((v) => !v);
      if (spot < 0) { a.t += 4; continue; }
      const p = L.spots[spot];
      const s = mkShip(a.type, W + 90, p.y);
      s.spot = spot;
      s.path = [{ x: p.x, y: p.y }];
      st.spots[spot] = s;
      st.ships.push(s);
      a.done = true;
    }
    st.pending = st.pending.filter((a) => !a.done);
  };

  const checkEnd = () => {
    if (st.phase === 'play' && st.sailed + st.diverted >= TOTAL) setTimeout(win, 700);
  };

  const arriveEnd = (s) => {
    if (s.state === 'arrive') {
      s.state = 'anchored';
    } else if (s.state === 'in') {
      s.state = 'unloading';
      s.unloadT = s.cfg.unload;
      s.rot = 0;
      score(PT.entry + Math.round(PT.punct * s.punct), s.x, s.y);
    } else if (s.state === 'out') {
      s.state = 'gone';
      s.el.remove();
      st.sailed++;
      score(PT.exit, W - 90, L.chy - 30);
      checkEnd();
    } else if (s.state === 'divert') {
      s.state = 'gone';
      s.el.remove();
      st.diverted++;
      checkEnd();
    }
  };

  const move = (s, dt) => {
    if (!s.path.length) return;
    const sp = Math.min(s.cfg.speed, s.speedCap);
    s.curSpeed = sp;
    let step = sp * dt;
    while (step > 0 && s.path.length) {
      const t = s.path[0];
      const dx = t.x - s.x, dy = t.y - s.y;
      const dist = Math.hypot(dx, dy);
      if (dist <= step) {
        s.x = t.x; s.y = t.y;
        step -= dist;
        s.path.shift();
        if (!s.path.length) arriveEnd(s);
      } else {
        s.x += (dx / dist) * step;
        s.y += (dy / dist) * step;
        s.rot = Math.atan2(dy, dx) * 180 / Math.PI;
        step = 0;
      }
    }
  };

  const channelSafety = () => {
    const chs = st.ships.filter(inChannel);

    // abordaje: sentidos opuestos que se encuentran
    for (let i = 0; i < chs.length; i++) {
      for (let j = i + 1; j < chs.length; j++) {
        const a = chs[i], b = chs[j];
        if (dirOf(a) !== dirOf(b) && Math.abs(a.x - b.x) < HIT_DIST) {
          collision(a, b);
          return;
        }
      }
    }

    // alcance: mismo sentido, poca distancia
    st.ships.forEach((s) => { s.speedCap = Infinity; });
    [-1, 1].forEach((dir) => {
      const lane = chs.filter((s) => dirOf(s) === dir)
        .sort((a, b) => dir === -1 ? a.x - b.x : b.x - a.x); // primero el que va adelante
      for (let i = 1; i < lane.length; i++) {
        const ahead = lane[i - 1], back = lane[i];
        const gap = Math.abs(back.x - ahead.x);
        if (gap < GAP_SLOW) back.speedCap = Math.min(back.speedCap, ahead.curSpeed * 0.92);
        if (gap < GAP_STRIKE) {
          const key = `a${ahead.id}${ahead.state}-${back.id}${back.state}`;
          if (!st.pairs.has(key)) {
            st.pairs.add(key);
            flash(ahead); flash(back);
            score(PT.alcance, back.x, back.y);
            addStrikes(1);
            say('ALCANCE EN EL CANAL: GUARDA DISTANCIA ENTRE BUQUES (-60)');
          }
        }
      }
    });

    // tanquero: canal exclusivo
    if (chs.length > 1) {
      chs.filter((s) => s.cfg.exclusive).forEach((t) => {
        const key = `x${t.id}-${t.state}`;
        if (!st.graves.has(key)) {
          st.graves.add(key);
          flash(t);
          score(PT.grave, t.x, t.y);
          addStrikes(2);
          say('EL TANQUERO IMO EXIGE CANAL EXCLUSIVO (-120, DOBLE STRIKE)');
        }
      });
    }

    // indicador de canal
    const dirs = new Set(chs.map(dirOf));
    if (!dirs.size) { chanEl.textContent = 'CANAL LIBRE'; chanEl.className = 'chan'; }
    else if (dirs.size === 2) { chanEl.textContent = 'CONFLICTO EN CANAL'; chanEl.className = 'chan is-conflict'; }
    else {
      chanEl.textContent = dirs.has(-1) ? 'CANAL: ENTRADA' : 'CANAL: SALIDA';
      chanEl.className = 'chan is-busy';
    }
  };

  const update = (dt) => {
    st.t += dt;
    spawn();

    st.ships.forEach((s) => {
      if (s.state === 'gone') return;

      if (s.state === 'anchored') {
        s.patience -= dt;
        if (s.patience <= 0) {
          if (s.spot >= 0) { st.spots[s.spot] = null; s.spot = -1; }
          s.state = 'divert';
          s.el.classList.add('is-divert');
          s.path = [{ x: W + 170, y: s.y + 110 }];
          score(PT.divert, s.x, s.y);
          say(`EL ${s.cfg.tag} SE CANSO DE ESPERAR: SE VA A OTRO PUERTO (-150)`);
        }
      } else if (s.state === 'unloading') {
        s.unloadT -= dt;
        if (s.unloadT <= 0) {
          s.state = 'ready';
          s.readyT = 0;
          say(`${s.cfg.name} EN M${s.berth + 1}: LISTO PARA ZARPAR`);
        }
      } else if (s.state === 'ready') {
        s.readyT += dt;
        if (s.readyT > DEMUR_GRACE) {
          s.demurT += dt;
          if (s.demurT >= DEMUR_EVERY) {
            s.demurT = 0;
            score(PT.demur, s.x, s.y);
            if (st.t - st.demurToastT > 6) {
              st.demurToastT = st.t;
              say('DEMORA EN MUELLE: HAY BUQUES LISTOS SIN DESPACHAR (-15)');
            }
          }
        }
      }

      move(s, dt);
    });

    st.ships = st.ships.filter((s) => s.state !== 'gone');
    channelSafety();
  };

  // ---------- render ----------
  const render = () => {
    st.ships.forEach((s) => {
      s.el.style.left = `${s.x}px`;
      s.el.style.top = `${s.y}px`;
      s.hull.style.transform = `rotate(${s.rot}deg)`;

      const actionable = s.state === 'anchored' || s.state === 'ready';
      s.el.classList.toggle('is-actionable', actionable && st.phase === 'play');
      s.el.classList.toggle('is-ready', s.state === 'ready' && st.phase === 'play');

      let ratio = -1;
      if (s.state === 'anchored') ratio = s.patience / s.cfg.wait;
      if (s.state === 'unloading') ratio = 1 - s.unloadT / s.cfg.unload;
      s.bar.style.visibility = ratio >= 0 ? 'visible' : 'hidden';
      if (ratio >= 0) {
        s.fill.style.width = `${Math.max(0, Math.min(1, ratio)) * 100}%`;
        s.bar.classList.toggle('is-low', s.state === 'anchored' && ratio < 0.35);
      }
    });

    hudClock.textContent = fmtTime(st.t);
    hudSailed.textContent = `${st.sailed}/${TOTAL}`;
    hudScore.textContent = st.score;
    [...lamps.children].forEach((l, i) => l.classList.toggle('is-on', i < st.strikes));
  };

  // ---------- entrada ----------
  document.addEventListener('keydown', (e) => {
    const k = e.key.toLowerCase();
    if (k === 'r') reset();
    if (k === 'h') { if (intro.hidden) openHelp(); else startShift(); }
    if ((k === 'enter' || k === ' ') && !intro.hidden) { e.preventDefault(); startShift(); return; }
    if (k === 'enter' && st.phase === 'over' && !finale.hidden) reset();
  });
  $('restart').addEventListener('click', reset);
  $('start').addEventListener('click', startShift);
  $('help').addEventListener('click', openHelp);
  window.addEventListener('resize', reset);

  // ---------- loop ----------
  let last = performance.now();
  const tick = (now) => {
    requestAnimationFrame(tick);
    const dt = Math.max(0, Math.min((now - last) / 1000, 0.05));
    last = now;
    if (st.phase === 'play') update(dt);
    render();
  };

  reset();
  requestAnimationFrame(tick);
})();
