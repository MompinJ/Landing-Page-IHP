/* ============================================================
   DINAMICA TRIVIA GRUA — motor
   El camion trae un contenedor con una pregunta; el participante
   opera la grua (teclado o consola en pantalla) y lo coloca en la
   plataforma VERDADERO o FALSO. Fisica de pendulo y caida real.
   ============================================================ */

(() => {
  // ---------- preguntas (editar aqui) ----------
  const QUESTIONS = [
    { q: 'ICAVE opera en el puerto de Veracruz.', answer: true },
    { q: 'TILH es una terminal maritima en la costa de Hidalgo.', answer: false },
    { q: 'En Lazaro Cardenas operan LCT y LCMT.', answer: true },
    { q: 'TIMSA esta en el Golfo de Mexico.', answer: false },
    { q: 'Un contenedor de 40 pies equivale a 2 TEU.', answer: true },
    { q: 'EIT opera en Ensenada, Baja California.', answer: true },
    { q: 'Las gruas que cargan los buques en el muelle son las RTG.', answer: false },
    { q: 'Hutchison Ports solo tiene operaciones en Mexico.', answer: false }
  ];

  // ---------- fisica / velocidades ----------
  const G_SWING = 2400, L = 300, SWING_DAMP = 0.6;
  const TROLLEY_A = 1600, TROLLEY_V = 540, HOIST_V = 430;
  const G_FALL = 2100;
  const PALETTE = ['#009BDE', '#EE7523', '#54BBAB', '#002E6D', '#d18a26'];

  // ---------- DOM ----------
  const $ = (id) => document.getElementById(id);
  const trolleyEl = $('trolley'), spreaderEl = $('spreader');
  const cableL = $('cable-l'), cableR = $('cable-r');
  const cargoEl = $('cargo'), cargoCode = $('cargo-code');
  const qKicker = $('q-kicker'), qText = $('q-text');
  const truckEl = $('truck');
  const platTrue = $('plat-true'), platFalse = $('plat-false');
  const verdict = $('verdict'), finale = $('finale');
  const hudScore = $('hud-score'), hudStatus = $('hud-status');
  const hookBtn = $('hook-btn');

  // ---------- layout ----------
  let W, H, groundY, platTrueX, platFalseX, platW, platTop, truckBedTop, cargoW, cargoH;
  const layout = () => {
    W = window.innerWidth; H = window.innerHeight;
    groundY = H - H * 0.12;
    platW = Math.min(560, W * 0.42);
    platTrueX = W * 0.02 + platW / 2;
    platFalseX = W * 0.98 - platW / 2;
    platTop = groundY - 86;
    truckBedTop = groundY - 31;
    cargoW = cargoEl.offsetWidth; cargoH = cargoEl.offsetHeight;

    platTrue.style.left = `${platTrueX - platW / 2}px`;
    platTrue.style.width = `${platW}px`;
    platFalse.style.left = `${platFalseX - platW / 2}px`;
    platFalse.style.width = `${platW}px`;
  };
  layout();
  window.addEventListener('resize', layout);

  // ---------- estado ----------
  const st = {
    tx: 0, tv: 0,
    sy: 150,
    theta: 0, omega: 0,
    carrying: false,
    cargo: { x: 0, y: 0, vy: 0, on: 'hidden' }, // hidden|truck|hook|falling|landed
    truckX: -560,
    phase: 'arrive',     // arrive|play|drop|verdict|done
    idx: 0, score: 0
  };
  const keys = {};
  let truckTarget = null;

  const setQuestion = (i) => {
    qKicker.textContent = `PREGUNTA ${String(i + 1).padStart(2, '0')}`;
    qText.textContent = QUESTIONS[i].q;
    cargoCode.textContent = `Q-${String(i + 1).padStart(2, '0')}`;
    cargoEl.style.setProperty('--cargo-c', PALETTE[i % PALETTE.length]);
  };
  const updateHud = () => {
    hudScore.textContent =
      `ACIERTOS ${String(st.score).padStart(2, '0')} · PREGUNTA ${String(Math.min(st.idx + 1, QUESTIONS.length)).padStart(2, '0')}/${String(QUESTIONS.length).padStart(2, '0')}`;
  };

  const showVerdict = (good, msg) => {
    verdict.hidden = false;
    verdict.textContent = msg;
    verdict.className = `verdict ${good ? 'verdict--good' : 'verdict--bad'}`;
    setTimeout(() => { verdict.hidden = true; }, 1500);
  };

  // ---------- ciclo de pregunta ----------
  const bringNext = () => {
    if (st.idx >= QUESTIONS.length) { endRound(); return; }
    st.phase = 'arrive';
    setQuestion(st.idx);
    updateHud();
    hudStatus.textContent = 'LLEGA EL SIGUIENTE CONTENEDOR...';
    st.truckX = -560;
    truckTarget = W / 2 - 150;
    st.cargo.on = 'truck';
  };

  const endRound = () => {
    st.phase = 'done';
    const total = QUESTIONS.length;
    $('finale-title').textContent =
      st.score === total ? 'Operacion perfecta.' :
      st.score >= total * 0.6 ? 'Buen ojo de gruero.' : 'La grua si llego... las respuestas no tanto.';
    $('finale-sub').textContent = `ACIERTOS: ${st.score} DE ${total}`;
    finale.hidden = false;
  };

  const reset = () => {
    st.idx = 0; st.score = 0;
    st.tx = W / 2; st.tv = 0; st.sy = 150;
    st.theta = 0; st.omega = 0; st.carrying = false;
    spreaderEl.classList.remove('is-locked');
    hookBtn.classList.remove('is-locked');
    finale.hidden = true; verdict.hidden = true;
    platTrue.className = 'platform platform--true';
    platFalse.className = 'platform platform--false';
    bringNext();
  };

  // ---------- gancho ----------
  const tryHook = () => {
    if (st.phase !== 'play' && st.phase !== 'arrive') return;
    if (!st.carrying) {
      // enganchar: alineado y a la altura del contenedor
      if (st.cargo.on === 'truck' || st.cargo.on === 'landed') {
        const near = Math.abs(st.tx - st.cargo.x) < 70 &&
                     Math.abs((st.sy + 22) - st.cargo.y) < 36;
        if (near) {
          st.carrying = true;
          st.cargo.on = 'hook';
          st.theta = 0; st.omega = 0;
          spreaderEl.classList.add('is-locked');
          hookBtn.classList.add('is-locked');
          hudStatus.textContent = 'CARGA ENGANCHADA: LLEVALA A SU PLATAFORMA';
          if (truckTarget === null) { truckTarget = -560; } // el camion se va
          else { setTimeout(() => { truckTarget = -560; }, 400); }
          st.phase = 'play';
        } else {
          hudStatus.textContent = 'ALINEATE Y BAJA HASTA EL CONTENEDOR PARA ENGANCHAR';
        }
      }
    } else {
      // soltar: el contenedor cae con gravedad
      st.carrying = false;
      st.cargo.on = 'falling';
      st.cargo.vy = 0;
      spreaderEl.classList.remove('is-locked');
      hookBtn.classList.remove('is-locked');
      st.phase = 'drop';
    }
  };

  // ---------- evaluacion del aterrizaje ----------
  const supportAt = (x) => {
    if (Math.abs(x - platTrueX) < platW / 2) return { y: platTop, kind: 'true' };
    if (Math.abs(x - platFalseX) < platW / 2) return { y: platTop, kind: 'false' };
    // el camion solo es apoyo mientras esta estacionado al centro
    if (truckTarget !== null && truckTarget > 0 && Math.abs(x - (st.truckX + 150)) < 140)
      return { y: truckBedTop, kind: 'truck' };
    return { y: groundY, kind: 'ground' };
  };

  const landed = (kind) => {
    if (kind === 'true' || kind === 'false') {
      const correct = QUESTIONS[st.idx].answer === (kind === 'true');
      const plat = kind === 'true' ? platTrue : platFalse;
      st.phase = 'verdict';
      plat.classList.add(correct ? 'is-hit-good' : 'is-hit-bad');
      if (correct) {
        st.score++;
        showVerdict(true, 'CORRECTO');
        hudStatus.textContent = 'BIEN RESUELTO, GRUERO';
      } else {
        showVerdict(false, 'INCORRECTO');
        document.body.classList.add('shake');
        setTimeout(() => document.body.classList.remove('shake'), 500);
        hudStatus.textContent = `ERA ${QUESTIONS[st.idx].answer ? 'VERDADERO' : 'FALSO'}`;
      }
      updateHud();
      setTimeout(() => {
        plat.classList.remove('is-hit-good', 'is-hit-bad');
        st.cargo.on = 'hidden';
        st.idx++;
        bringNext();
      }, 1900);
    } else {
      // piso o camion: no cuenta, se puede volver a enganchar
      st.phase = 'play';
      hudStatus.textContent = 'AHI NO HAY RESPUESTA: VUELVE A ENGANCHARLO';
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

  // consola en pantalla (mantener presionado funciona)
  document.querySelectorAll('.cbtn').forEach((b) => {
    const k = b.dataset.k;
    const press = (e) => {
      e.preventDefault();
      b.classList.add('is-press');
      if (k === 'hook') tryHook();
      else keys[k] = true;
    };
    const release = () => {
      b.classList.remove('is-press');
      if (k !== 'hook') keys[k] = false;
    };
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

    // trolley
    const prevTv = st.tv;
    if (canDrive) {
      const dir = (keys.right ? 1 : 0) - (keys.left ? 1 : 0);
      st.tv += dir * TROLLEY_A * dt;
      if (!dir) st.tv *= Math.pow(0.04, dt);
      st.tv = Math.max(-TROLLEY_V, Math.min(TROLLEY_V, st.tv));
      st.tx += st.tv * dt;
      st.tx = Math.max(W * 0.07, Math.min(W * 0.93, st.tx));
    }
    const ax = (st.tv - prevTv) / Math.max(dt, 0.001);

    // spreader
    if (canDrive) {
      const dir = (keys.down ? 1 : 0) - (keys.up ? 1 : 0);
      st.sy += dir * HOIST_V * dt;
      const floorLimit = st.carrying ? groundY - cargoH - 22 : groundY - 90;
      st.sy = Math.max(122, Math.min(floorLimit, st.sy));
    }

    // camion
    if (truckTarget !== null) {
      const d = truckTarget - st.truckX;
      st.truckX += Math.max(-460, Math.min(460, d * 3)) * dt;
      if (Math.abs(d) < 10) {
        if (truckTarget > 0 && st.phase === 'arrive') {
          hudStatus.textContent = 'ENGANCHA EL CONTENEDOR Y PONLO EN SU PLATAFORMA';
        }
        if (truckTarget < 0) truckTarget = null;
      }
    }

    // pendulo
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

    // contenedor
    const c = st.cargo;
    if (c.on === 'truck') {
      c.x = st.truckX + 150;
      c.y = truckBedTop - cargoH;
    } else if (c.on === 'hook') {
      c.x = st.tx;
      c.y = st.sy + 22;
    } else if (c.on === 'falling') {
      c.vy += G_FALL * dt;
      c.y += c.vy * dt;
      // sigue derivando un poco con la inercia del balanceo
      c.x += st.omega * 30 * dt;
      const sup = supportAt(c.x + cargoW * 0); // centro
      if (c.y + cargoH >= sup.y) {
        c.y = sup.y - cargoH;
        c.vy = 0;
        c.on = 'landed';
        landed(sup.kind);
      }
    }

    // ---------- render ----------
    trolleyEl.style.transform = `translateX(${st.tx}px)`;
    spreaderEl.style.left = `${st.tx - (cargoW + 24) / 2}px`;
    spreaderEl.style.top = `${st.sy}px`;
    const cableH = Math.max(0, st.sy - 112);
    cableL.style.cssText = `left:${st.tx - 48}px; top:112px; height:${cableH}px;`;
    cableR.style.cssText = `left:${st.tx + 45}px; top:112px; height:${cableH}px;`;
    truckEl.style.transform = `translateX(${st.truckX}px)`;
    truckEl.style.top = `${groundY - 94}px`;

    const visible = c.on !== 'hidden';
    cargoEl.style.display = visible ? 'grid' : 'none';
    if (visible) {
      cargoEl.style.left = `${c.x}px`;
      cargoEl.style.top = `${c.y}px`;
      cargoEl.style.transform = `rotate(${(c.on === 'hook' ? st.theta : st.theta * 0.3) * 57.3}deg)`;
    }
  };
  requestAnimationFrame(tick);

  // ---------- arranque ----------
  st.tx = W / 2;
  reset();
})();
