/* ============================================================
   DINAMICA REGALO O SOBORNO — motor
   Misma fisica de grua que la trivia (pendulo + caida), pero
   con TRES plataformas: aceptar / declarar / declinar.
   El veredicto SIEMPRE explica la politica.
   ============================================================ */

(() => {
  // ---------- dilemas (editar aqui) ----------
  // answer: 'ok' = aceptar · 'declare' = declarar al comite · 'no' = declinar
  const DILEMAS = [
    { q: 'En una expo, un proveedor te regala una pluma con su logo.',
      answer: 'ok', why: 'Los articulos promocionales de valor minimo son cortesia aceptable.' },
    { q: 'Un contratista que participa en una licitacion EN CURSO te invita a cenar.',
      answer: 'no', why: 'Durante una licitacion no se aceptan cortesias de los participantes.' },
    { q: 'Un cliente de anos te manda una botella de vino de buen precio en fin de ano.',
      answer: 'declare', why: 'Regalo de valor moderado sin licitacion de por medio: se declara y el comite decide.' },
    { q: 'Un gestor ofrece "agilizar" un tramite aduanal con un pago extra en efectivo.',
      answer: 'no', why: 'Eso es un pago de facilitacion: es soborno. Se rechaza y ademas se reporta.' },
    { q: 'La empresa de tu primo quiere darse de alta como proveedor de tu area.',
      answer: 'declare', why: 'Conflicto de interes: se declara y te apartas de esa decision.' },
    { q: 'Un fabricante ofrece pagarte curso, viaje y hotel para conocer su equipo.',
      answer: 'declare', why: 'Viajes y hospitalidad de terceros se declaran antes de aceptar.' },
    { q: 'Un companero te pide registrar su salida una hora despues de que se fue.',
      answer: 'no', why: 'Alterar registros es fraude, aunque parezca un favor pequeno.' },
    { q: 'Un transportista ofrece patrocinar la posada del area "para que los tengan en mente".',
      answer: 'no', why: 'Un beneficio a cambio de preferencia es quid pro quo: se declina.' }
  ];

  // ---------- fisica ----------
  const G_SWING = 2400, L = 300, SWING_DAMP = 0.6;
  const TROLLEY_A = 1600, TROLLEY_V = 560, HOIST_V = 430;
  const G_FALL = 2100;
  const HIT = 100, MISS = -50;
  const PALETTE = ['#002E6D', '#009BDE', '#54BBAB', '#5b6770', '#d18a26'];

  // ---------- DOM ----------
  const $ = (id) => document.getElementById(id);
  const trolleyEl = $('trolley'), spreaderEl = $('spreader');
  const cableL = $('cable-l'), cableR = $('cable-r');
  const cargoEl = $('cargo'), cargoCode = $('cargo-code');
  const qKicker = $('q-kicker'), qText = $('q-text');
  const truckEl = $('truck');
  const plats = { ok: $('plat-ok'), declare: $('plat-declare'), no: $('plat-no') };
  const verdict = $('verdict'), finale = $('finale');
  const hudScore = $('hud-score'), hudStatus = $('hud-status');
  const hookBtn = $('hook-btn');

  // ---------- layout ----------
  let W, H, groundY, platTop, truckBedTop, cargoW, cargoH;
  const PLAT_X = { ok: 0.40, declare: 0.635, no: 0.865 };
  let platW = 0;
  const layout = () => {
    W = window.innerWidth; H = window.innerHeight;
    groundY = H - H * 0.11;
    platTop = groundY - 84;
    truckBedTop = groundY - 30;
    cargoW = cargoEl.offsetWidth; cargoH = cargoEl.offsetHeight;
    platW = Math.min(300, W * 0.20);
    for (const k in plats) {
      plats[k].style.left = `${W * PLAT_X[k] - platW / 2}px`;
      plats[k].style.width = `${platW}px`;
    }
  };
  layout();
  window.addEventListener('resize', layout);

  // ---------- estado ----------
  const st = {
    tx: 0, tv: 0, sy: 150,
    theta: 0, omega: 0,
    carrying: false,
    cargo: { x: 0, y: 0, vy: 0, on: 'hidden' },
    truckX: -540,
    phase: 'arrive', idx: 0, score: 0
  };
  const keys = {};
  let truckTarget = null;

  const setDilema = (i) => {
    qKicker.textContent = `DILEMA ${String(i + 1).padStart(2, '0')}`;
    qText.textContent = DILEMAS[i].q;
    cargoCode.textContent = `DIL-${String(i + 1).padStart(2, '0')}`;
    cargoEl.style.setProperty('--cargo-c', PALETTE[i % PALETTE.length]);
  };
  // marcador: aciertos y dilema actual
  let hits = 0;
  const refreshScore = () => {
    hudScore.textContent =
      `ACIERTOS ${String(hits).padStart(2, '0')} · DILEMA ${String(Math.min(st.idx + 1, DILEMAS.length)).padStart(2, '0')}/${String(DILEMAS.length).padStart(2, '0')}`;
  };

  const showVerdict = (good, title, why) => {
    verdict.hidden = false;
    verdict.className = `verdict ${good ? 'verdict--good' : 'verdict--bad'}`;
    verdict.innerHTML = `<h3>${title}</h3><p>${why}</p>`;
    setTimeout(() => { verdict.hidden = true; }, 2600);
  };

  // ---------- ciclo ----------
  const bringNext = () => {
    if (st.idx >= DILEMAS.length) { endRound(); return; }
    st.phase = 'arrive';
    setDilema(st.idx);
    refreshScore();
    hudStatus.textContent = 'LLEGA EL SIGUIENTE DILEMA...';
    st.truckX = -540;
    truckTarget = W * 0.16 - 145;
    st.cargo.on = 'truck';
  };

  const endRound = () => {
    st.phase = 'done';
    const total = DILEMAS.length;
    $('finale-title').textContent =
      hits === total ? 'Consejero de integridad.' :
      hits >= total * 0.7 ? 'Criterio solido.' :
      hits >= total * 0.4 ? 'Revisa la politica de regalos.' : 'Llamale a Cumplimiento... de urgencia.';
    $('finale-score').textContent = `${Math.max(0, st.score)} PTS`;
    $('finale-detail').textContent = `${hits}/${total} DILEMAS BIEN RESUELTOS`;
    finale.hidden = false;
  };

  const reset = () => {
    st.idx = 0; st.score = 0; hits = 0;
    st.tx = W / 2; st.tv = 0; st.sy = 150;
    st.theta = 0; st.omega = 0; st.carrying = false;
    spreaderEl.classList.remove('is-locked');
    hookBtn.classList.remove('is-locked');
    finale.hidden = true; verdict.hidden = true;
    Object.values(plats).forEach((p) => p.classList.remove('is-hit-good', 'is-hit-bad', 'is-answer'));
    bringNext();
  };

  // ---------- gancho ----------
  const tryHook = () => {
    if (st.phase !== 'play' && st.phase !== 'arrive') return;
    if (!st.carrying) {
      if (st.cargo.on === 'truck' || st.cargo.on === 'landed') {
        const near = Math.abs(st.tx - st.cargo.x) < 70 &&
                     Math.abs((st.sy + 22) - st.cargo.y) < 36;
        if (near) {
          st.carrying = true;
          st.cargo.on = 'hook';
          st.theta = 0; st.omega = 0;
          spreaderEl.classList.add('is-locked');
          hookBtn.classList.add('is-locked');
          hudStatus.textContent = 'DECIDE: ACEPTAR, DECLARAR O DECLINAR';
          setTimeout(() => { truckTarget = -540; }, 350);
          st.phase = 'play';
        } else {
          hudStatus.textContent = 'ALINEATE Y BAJA HASTA EL CONTENEDOR PARA ENGANCHAR';
        }
      }
    } else {
      st.carrying = false;
      st.cargo.on = 'falling';
      st.cargo.vy = 0;
      spreaderEl.classList.remove('is-locked');
      hookBtn.classList.remove('is-locked');
      st.phase = 'drop';
    }
  };

  // ---------- aterrizaje ----------
  const supportAt = (x) => {
    for (const k in plats) {
      if (Math.abs(x - W * PLAT_X[k]) < platW / 2) return { y: platTop, kind: k };
    }
    if (truckTarget !== null && truckTarget > 0 && Math.abs(x - (st.truckX + 145)) < 135)
      return { y: truckBedTop, kind: 'truck' };
    return { y: groundY, kind: 'ground' };
  };

  const landed = (kind) => {
    if (kind === 'ok' || kind === 'declare' || kind === 'no') {
      const d = DILEMAS[st.idx];
      const correct = d.answer === kind;
      st.phase = 'verdict';
      plats[kind].classList.add(correct ? 'is-hit-good' : 'is-hit-bad');
      if (correct) {
        st.score += HIT;
        hits++;
        showVerdict(true, 'BIEN RESUELTO', d.why);
        hudStatus.textContent = 'CRITERIO DE INTEGRIDAD: CORRECTO';
      } else {
        st.score += MISS;
        plats[d.answer].classList.add('is-answer');
        showVerdict(false, 'LA POLITICA DICE OTRA COSA', d.why);
        document.body.classList.add('shake');
        setTimeout(() => document.body.classList.remove('shake'), 500);
        hudStatus.textContent = `LA RESPUESTA ERA: ${d.answer === 'ok' ? 'ACEPTAR' : d.answer === 'declare' ? 'DECLARAR' : 'DECLINAR'}`;
      }
      refreshScore();
      setTimeout(() => {
        Object.values(plats).forEach((p) => p.classList.remove('is-hit-good', 'is-hit-bad', 'is-answer'));
        st.cargo.on = 'hidden';
        st.idx++;
        bringNext();
      }, 2700);
    } else {
      st.phase = 'play';
      hudStatus.textContent = 'AHI NO HAY DECISION: VUELVE A ENGANCHARLO';
    }
  };

  // ---------- entrada ----------
  const KEYMAP = {
    a: 'left', arrowleft: 'left',
    d: 'right', arrowright: 'right',
    w: 'up', arrowup: 'up',
    s: 'down', arrowdown: 'down'
  };
  document.addEventListener('keydown', (e) => {
    const k = e.key.toLowerCase();
    if (KEYMAP[k] || k === ' ') e.preventDefault();
    if (KEYMAP[k]) keys[KEYMAP[k]] = true;
    if (k === ' ' && !e.repeat) tryHook();
    if (k === 'r') reset();
    if (k === 'enter' && st.phase === 'done') reset();
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
      if (k === 'hook') tryHook(); else keys[k] = true;
    };
    const release = () => { b.classList.remove('is-press'); if (k !== 'hook') keys[k] = false; };
    b.addEventListener('pointerdown', press);
    b.addEventListener('pointerup', release);
    b.addEventListener('pointerleave', release);
    b.addEventListener('pointercancel', release);
  });
  $('restart').addEventListener('click', reset);

  // ---------- loop ----------
  let last = performance.now();
  const tick = (now) => {
    requestAnimationFrame(tick);
    const dt = Math.min((now - last) / 1000, 0.033);
    last = now;

    const canDrive = st.phase === 'play' || st.phase === 'arrive' || st.phase === 'drop';

    const prevTv = st.tv;
    if (canDrive) {
      const dir = (keys.right ? 1 : 0) - (keys.left ? 1 : 0);
      st.tv += dir * TROLLEY_A * dt;
      if (!dir) st.tv *= Math.pow(0.04, dt);
      st.tv = Math.max(-TROLLEY_V, Math.min(TROLLEY_V, st.tv));
      st.tx += st.tv * dt;
      st.tx = Math.max(W * 0.07, Math.min(W * 0.94, st.tx));
    }
    const ax = (st.tv - prevTv) / Math.max(dt, 0.001);

    if (canDrive) {
      const dir = (keys.down ? 1 : 0) - (keys.up ? 1 : 0);
      st.sy += dir * HOIST_V * dt;
      const floorLimit = st.carrying ? groundY - cargoH - 22 : groundY - 88;
      st.sy = Math.max(118, Math.min(floorLimit, st.sy));
    }

    if (truckTarget !== null) {
      const d = truckTarget - st.truckX;
      st.truckX += Math.max(-460, Math.min(460, d * 3)) * dt;
      if (Math.abs(d) < 10) {
        if (truckTarget > 0 && st.phase === 'arrive') {
          hudStatus.textContent = 'ENGANCHA EL DILEMA Y PONLO EN SU PLATAFORMA';
        }
        if (truckTarget < 0) truckTarget = null;
      }
    }

    if (st.carrying) {
      const alpha = -(G_SWING / L) * Math.sin(st.theta)
        - SWING_DAMP * st.omega
        - (ax / L) * Math.cos(st.theta) * 0.9;
      st.omega += alpha * dt;
      st.theta += st.omega * dt;
      st.theta = Math.max(-0.45, Math.min(0.45, st.theta));
    } else {
      st.theta *= Math.pow(0.01, dt);
      st.omega = 0;
    }

    const c = st.cargo;
    if (c.on === 'truck') {
      c.x = st.truckX + 145;
      c.y = truckBedTop - cargoH;
    } else if (c.on === 'hook') {
      c.x = st.tx;
      c.y = st.sy + 22;
    } else if (c.on === 'falling') {
      c.vy += G_FALL * dt;
      c.y += c.vy * dt;
      c.x += st.omega * 30 * dt;
      const sup = supportAt(c.x);
      if (c.y + cargoH >= sup.y) {
        c.y = sup.y - cargoH;
        c.vy = 0;
        c.on = 'landed';
        landed(sup.kind);
      }
    }

    // render
    trolleyEl.style.transform = `translateX(${st.tx}px)`;
    spreaderEl.style.left = `${st.tx - (cargoW + 24) / 2}px`;
    spreaderEl.style.top = `${st.sy}px`;
    const cableH = Math.max(0, st.sy - 110);
    cableL.style.cssText = `left:${st.tx - 48}px; top:110px; height:${cableH}px;`;
    cableR.style.cssText = `left:${st.tx + 45}px; top:110px; height:${cableH}px;`;
    truckEl.style.transform = `translateX(${st.truckX}px)`;
    truckEl.style.top = `${groundY - 92}px`;

    const visible = c.on !== 'hidden';
    cargoEl.style.display = visible ? 'grid' : 'none';
    if (visible) {
      cargoEl.style.left = `${c.x}px`;
      cargoEl.style.top = `${c.y}px`;
      cargoEl.style.transform = `rotate(${(c.on === 'hook' ? st.theta : st.theta * 0.3) * 57.3}deg)`;
    }
  };

  st.tx = window.innerWidth / 2;
  reset();
  requestAnimationFrame(tick);
})();
