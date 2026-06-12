/* ============================================================
   PLANTILLA GRUA SIM 3D — motor de la grua
   Un solo loop de fisica mueve trolley, spreader y pendulo.
   - AUTO: una cola de pasos ejecuta la maniobra completa
   - CABINA: el usuario controla con A/D, W/S y ESPACIO
   Ambos modos usan la misma fisica: el balanceo es real.
   ============================================================ */

(() => {
  // ---------- fisica / velocidades ----------
  const G = 2400;          // gravedad del pendulo (px/s2)
  const L = 330;           // largo virtual del pendulo (px)
  const SWING_DAMP = 0.55; // amortiguacion del balanceo
  const TROLLEY_V = 560;   // velocidad max del trolley (px/s)
  const HOIST_V = 460;     // velocidad max de izaje (px/s)
  const TRAVEL_Y = 142;    // altura de viaje del spreader
  const PALETTE = ['#1f6da8', '#b3422c', '#2e8b57', '#d18a26', '#5b6770'];

  // ---------- DOM ----------
  const $ = (id) => document.getElementById(id);
  const trolleyEl = $('trolley'), spreaderEl = $('spreader');
  const cableL = $('cable-l'), cableR = $('cable-r');
  const cargoEl = $('cargo'), placard = $('placard'), cargoCode = $('cargo-code');
  const truckEl = $('truck'), stackEl = $('stack');
  const padPick = $('pad-pick'), padRead = $('pad-read');
  const goal = $('goal'), counter = $('hud-counter'), keysHud = $('hud-keys');
  const modeBtn = $('mode-btn');

  const srcs = Array.from(document.querySelectorAll('template.slide-src'));
  const TOTAL = srcs.length;

  // ---------- estado ----------
  let idx = 0;                 // slide actual
  let manual = false;
  let busy = false;            // cola auto en ejecucion
  let queue = [];

  const st = {
    tx: 0, tv: 0,              // trolley: posicion x, velocidad
    sy: 170, svDir: 0,         // spreader: y, direccion manual
    theta: 0, omega: 0,        // pendulo
    carrying: false,
    cargoOn: 'read',           // read | truck | stackTop | hook | hidden
    truckX: -460,
    minis: 0                   // contenedores archivados
  };
  let txTarget = null, syTarget = null, truckTarget = null;
  const keys = {};

  // ---------- layout ----------
  let W, H, groundY, READ, PICK, STACK, cargoW, cargoH, readTop, truckBedTop;
  const layout = () => {
    W = window.innerWidth; H = window.innerHeight;
    groundY = H - H * 0.14;
    PICK = W * 0.17; READ = W * 0.5; STACK = W * 0.84;
    cargoW = cargoEl.offsetWidth; cargoH = cargoEl.offsetHeight;
    readTop = groundY - 56 - cargoH;
    truckBedTop = groundY - 34;

    padRead.style.left = `${READ - (cargoW + 70) / 2}px`;
    padRead.style.width = `${cargoW + 70}px`;
    padPick.style.left = `${PICK - 170}px`;
    padPick.style.width = '340px';
    stackEl.style.left = `${STACK}px`;
    if (st.tx === 0) st.tx = READ;
  };
  layout();
  window.addEventListener('resize', layout);

  const stackTopY = () => groundY - st.minis * 56;

  // ---------- contenido ----------
  const setContent = (i) => {
    placard.innerHTML = srcs[i].innerHTML;
    cargoCode.textContent = `GS-${String(i + 1).padStart(3, '0')}`;
    cargoEl.style.setProperty('--cargo-c', PALETTE[i % PALETTE.length]);
  };
  const updateHud = () => {
    counter.textContent = `SLIDE ${String(idx + 1).padStart(2, '0')} / ${String(TOTAL).padStart(2, '0')}`;
  };
  setContent(0);
  updateHud();

  const setGoal = (msg) => {
    if (!msg) { goal.hidden = true; return; }
    goal.hidden = false;
    goal.textContent = msg;
  };

  // ---------- pila ----------
  const pushMini = (color) => {
    const m = document.createElement('i');
    m.className = 'mini';
    m.style.setProperty('--mini-c', color);
    m.style.bottom = `${st.minis * 56}px`;
    stackEl.appendChild(m);
    st.minis++;
  };
  const popMini = () => {
    const last = stackEl.querySelector('.mini:last-of-type');
    if (last) last.remove();
    st.minis = Math.max(0, st.minis - 1);
  };

  // ---------- cola AUTO ----------
  const run = (steps, done) => {
    busy = true;
    queue = steps.slice();
    queue.onDone = done;
  };

  const stepTick = () => {
    if (!queue.length) {
      if (busy) { busy = false; txTarget = syTarget = truckTarget = null; queue.onDone?.(); }
      return;
    }
    const s = queue[0];
    let finished = false;
    switch (s.t) {
      case 'tx':
        txTarget = s.v;
        finished = Math.abs(st.tx - s.v) < 7 && Math.abs(st.tv) < 12;
        break;
      case 'sy':
        syTarget = s.v;
        finished = Math.abs(st.sy - s.v) < 6;
        break;
      case 'truck':
        truckTarget = s.v;
        finished = Math.abs(st.truckX - s.v) < 8;
        break;
      case 'do':
        s.fn();
        finished = true;
        break;
      case 'wait':
        s.left = (s.left ?? s.ms) - 16.7;
        finished = s.left <= 0;
        break;
    }
    if (finished) {
      if (s.t === 'tx') txTarget = null;
      if (s.t === 'sy') syTarget = null;
      if (s.t === 'truck') truckTarget = null;
      queue.shift();
    }
  };

  // enganchar / soltar (lo usan ambos modos)
  const lock = () => {
    st.carrying = true;
    st.cargoOn = 'hook';
    st.theta = 0; st.omega = 0;
    spreaderEl.classList.add('is-locked');
  };
  const release = (where) => {
    st.carrying = false;
    st.cargoOn = where;
    spreaderEl.classList.remove('is-locked');
  };

  // maniobra automatica hacia adelante
  const autoForward = () => {
    const color = PALETTE[idx % PALETTE.length];
    run([
      { t: 'sy', v: TRAVEL_Y },
      { t: 'tx', v: READ },
      { t: 'sy', v: readTop - 24 },
      { t: 'do', fn: lock },
      { t: 'sy', v: TRAVEL_Y },
      { t: 'tx', v: STACK },
      { t: 'sy', v: stackTopY() - cargoH - 24 },
      { t: 'do', fn: () => {
        release('hidden');
        pushMini(color);
        idx++;
        setContent(idx);
        updateHud();
        st.cargoOn = 'truck';            // el nuevo viene en camion
      } },
      { t: 'sy', v: TRAVEL_Y },
      { t: 'truck', v: PICK - 150 },
      { t: 'tx', v: PICK },
      { t: 'sy', v: truckBedTop - cargoH - 24 },
      { t: 'do', fn: lock },
      { t: 'sy', v: TRAVEL_Y },
      { t: 'truck', v: -460 },
      { t: 'tx', v: READ },
      { t: 'sy', v: readTop - 24 },
      { t: 'do', fn: () => release('read') },
      { t: 'sy', v: 175 }
    ]);
  };

  // maniobra automatica hacia atras (recupera de la pila)
  const autoBack = () => {
    run([
      { t: 'sy', v: TRAVEL_Y },
      { t: 'tx', v: READ },
      { t: 'sy', v: readTop - 24 },
      { t: 'do', fn: lock },
      { t: 'sy', v: TRAVEL_Y },
      { t: 'truck', v: PICK - 150 },
      { t: 'tx', v: PICK },
      { t: 'sy', v: truckBedTop - cargoH - 24 },
      { t: 'do', fn: () => release('truck') },
      { t: 'sy', v: TRAVEL_Y },
      { t: 'truck', v: -460 },           /* el contenedor se va EN el camion */
      { t: 'do', fn: () => {
        popMini();
        idx--;
        setContent(idx);
        updateHud();
        st.cargoOn = 'stackTop';
      } },
      { t: 'tx', v: STACK },
      { t: 'sy', v: stackTopY() - cargoH - 24 },
      { t: 'do', fn: lock },
      { t: 'sy', v: TRAVEL_Y },
      { t: 'tx', v: READ },
      { t: 'sy', v: readTop - 24 },
      { t: 'do', fn: () => release('read') },
      { t: 'sy', v: 175 }
    ]);
  };

  const next = () => { if (!busy && !manual && idx < TOTAL - 1) autoForward(); };
  const prev = () => { if (!busy && !manual && idx > 0) autoBack(); };

  // ---------- modo cabina ----------
  let mission = 'idle';
  const setMode = (m) => {
    if (busy) return;
    manual = m;
    document.body.classList.toggle('manual', manual);
    modeBtn.textContent = manual ? 'MODO AUTO [M]' : 'MODO CABINA [M]';
    keysHud.textContent = manual
      ? 'A/D trolley · W/S izar · ESPACIO enganchar/soltar'
      : 'flechas = maniobra automatica · M = tomar los controles';
    if (manual) {
      mission = st.cargoOn === 'read' ? 'hook-read' : 'free';
      setGoal('ENGANCHA EL CONTENEDOR: BAJA CON S Y PULSA ESPACIO');
    } else {
      setGoal(null);
    }
  };
  modeBtn.addEventListener('click', () => setMode(!manual));

  const tryLockRelease = () => {
    if (!manual) return;
    if (!st.carrying) {
      // enganchar: alineado y a la altura del contenedor
      const targets = {
        read: { x: READ, top: readTop },
        truck: { x: st.truckX + 190, top: truckBedTop - cargoH },
        stackTop: { x: STACK, top: stackTopY() - cargoH }
      };
      const tpos = targets[st.cargoOn];
      if (!tpos) return;
      if (Math.abs(st.tx - tpos.x) < 56 && Math.abs(st.sy + 24 - tpos.top) < 30) {
        lock();
        setGoal(mission === 'hook-read'
          ? 'BIEN. SUBE CON W Y LLEVALO AL ARCHIVO (DERECHA)'
          : 'CARGA ENGANCHADA. COLOCALA EN LA PLATAFORMA');
        if (mission === 'hook-read') mission = 'to-stack';
        else mission = 'to-read';
      }
    } else {
      // soltar: solo sobre un apoyo valido y a la altura correcta
      const drops = [
        { x: STACK, top: stackTopY() - cargoH, on: 'stack' },
        { x: READ, top: readTop, on: 'read' },
        { x: st.truckX + 190, top: truckBedTop - cargoH, on: 'truck', need: st.truckX > 0 }
      ];
      for (const d of drops) {
        if (d.need === false) continue;
        if (Math.abs(st.tx - d.x) < 60 && Math.abs((st.sy + 24) - d.top) < 32) {
          if (d.on === 'stack') {
            if (idx >= TOTAL - 1) { setGoal('FIN DEL DECK. PULSA M PARA VOLVER A AUTO'); release('hidden'); pushMini(PALETTE[idx % PALETTE.length]); return; }
            release('hidden');
            pushMini(PALETTE[idx % PALETTE.length]);
            idx++; setContent(idx); updateHud();
            st.cargoOn = 'truck';
            truckTarget = null;
            st.truckX = -460;
            // el camion entra solo con la siguiente slide
            run([{ t: 'truck', v: PICK - 150 }], () => {
              setGoal('RECOGE EL NUEVO CONTENEDOR DEL CAMION');
              mission = 'to-read-pick';
            });
          } else {
            release(d.on);
            if (d.on === 'read') {
              setGoal('LISTO. LEE LA SLIDE. (M = VOLVER A AUTO)');
              mission = 'hook-read';
              if (st.truckX > 0) run([{ t: 'truck', v: -460 }]);
            }
          }
          return;
        }
      }
      setGoal('AHI NO: SUELTA SOBRE UN APOYO, ALINEADO Y A LA ALTURA');
    }
  };

  // ---------- entrada ----------
  document.addEventListener('keydown', (e) => {
    const k = e.key.toLowerCase();
    if (k === 'm') { e.preventDefault(); setMode(!manual); return; }
    if (manual) {
      if (['a', 'd', 'w', 's', ' '].includes(k)) e.preventDefault();
      if (k === ' ' && !e.repeat) tryLockRelease();
      keys[k] = true;
      return;
    }
    switch (e.key) {
      case 'ArrowRight':
      case 'PageDown':
      case ' ':
        e.preventDefault(); next(); break;
      case 'ArrowLeft':
      case 'PageUp':
        e.preventDefault(); prev(); break;
    }
  });
  document.addEventListener('keyup', (e) => { keys[e.key.toLowerCase()] = false; });

  let touchX = null;
  document.addEventListener('touchstart', (e) => { touchX = e.touches[0].clientX; }, { passive: true });
  document.addEventListener('touchend', (e) => {
    if (touchX === null || manual) return;
    const dx = e.changedTouches[0].clientX - touchX;
    touchX = null;
    if (Math.abs(dx) < 45) return;
    if (dx < 0) next(); else prev();
  }, { passive: true });

  // ---------- loop ----------
  let last = performance.now();
  const tick = (now) => {
    requestAnimationFrame(tick);
    const dt = Math.min((now - last) / 1000, 0.033);
    last = now;

    stepTick();

    // --- trolley ---
    const prevTv = st.tv;
    if (manual && !busy) {
      const dir = (keys.d ? 1 : 0) - (keys.a ? 1 : 0);
      st.tv += dir * 1700 * dt;
      if (!dir) st.tv *= Math.pow(0.05, dt); // friccion fuerte al soltar
    } else if (txTarget !== null) {
      const want = Math.max(-TROLLEY_V, Math.min(TROLLEY_V, (txTarget - st.tx) * 3.4));
      st.tv += (want - st.tv) * Math.min(1, dt * 7);
    } else {
      st.tv *= Math.pow(0.02, dt);
    }
    st.tv = Math.max(-TROLLEY_V, Math.min(TROLLEY_V, st.tv));
    st.tx += st.tv * dt;
    st.tx = Math.max(W * 0.09, Math.min(W * 0.91, st.tx));
    const ax = (st.tv - prevTv) / Math.max(dt, 0.001);

    // --- spreader ---
    if (manual && !busy) {
      const dir = (keys.s ? 1 : 0) - (keys.w ? 1 : 0);
      st.sy += dir * HOIST_V * dt;
    } else if (syTarget !== null) {
      const dv = Math.max(-HOIST_V, Math.min(HOIST_V, (syTarget - st.sy) * 4));
      st.sy += dv * dt;
    }
    st.sy = Math.max(130, Math.min(groundY - 100, st.sy));

    // --- camion ---
    if (truckTarget !== null) {
      st.truckX += Math.max(-420, Math.min(420, (truckTarget - st.truckX) * 3)) * dt;
    }

    // --- pendulo ---
    if (st.carrying) {
      const alpha = -(G / L) * Math.sin(st.theta)
        - SWING_DAMP * st.omega
        - (ax / L) * Math.cos(st.theta) * 0.9;
      st.omega += alpha * dt;
      st.theta += st.omega * dt;
      st.theta = Math.max(-0.5, Math.min(0.5, st.theta));
    } else {
      st.theta *= Math.pow(0.01, dt);
      st.omega = 0;
    }

    // ---------- render ----------
    trolleyEl.style.transform = `translateX(${st.tx}px)`;
    spreaderEl.style.left = `${st.tx - (cargoW + 24) / 2}px`;
    spreaderEl.style.top = `${st.sy}px`;
    const cableH = Math.max(0, st.sy - 120);
    cableL.style.cssText = `left:${st.tx - 52}px; top:120px; height:${cableH}px;`;
    cableR.style.cssText = `left:${st.tx + 49}px; top:120px; height:${cableH}px;`;

    truckEl.style.transform = `translateX(${st.truckX}px)`;
    truckEl.style.top = `${groundY - 98}px`;

    let cx, cy, visible = true;
    switch (st.cargoOn) {
      case 'hook': cx = st.tx; cy = st.sy + 24; break;
      case 'read': cx = READ; cy = readTop; break;
      case 'stackTop': cx = STACK; cy = stackTopY() - cargoH; break;
      case 'truck': cx = st.truckX + 190; cy = truckBedTop - cargoH; break;
      default: visible = false;
    }
    cargoEl.style.display = visible ? 'grid' : 'none';
    if (visible) {
      cargoEl.style.left = `${cx}px`;
      cargoEl.style.top = `${cy}px`;
      cargoEl.style.transform = `rotate(${st.theta * 57.3}deg)`;
    }
  };
  requestAnimationFrame(tick);
})();
