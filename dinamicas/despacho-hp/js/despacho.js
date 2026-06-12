/* ============================================================
   DINAMICA DESPACHO DE PATIO — motor
   Contenedores llegan por la banda hasta la junta; el jugador
   lee las marcas y los despacha con WASD/flechas o la botonera.
   Acierto suma con combo; error resta y explica; el ritmo sube.
   ============================================================ */

(() => {
  // ---------- configuracion ----------
  const TOTAL = 18;            // contenedores del turno
  const WAIT_START = 4.0;      // segundos en la junta (primer contenedor)
  const WAIT_MIN = 1.7;        // tiempo minimo al final del turno
  const TRAVEL_START = 1.5;    // segundos de viaje por la banda
  const TRAVEL_MIN = 0.7;
  const HIT = 100, MISS = -150;

  // tipos: clave de zona correcta + generador de rotulo
  const TYPES = [
    { kind: 'std', weight: 38, colors: ['#009BDE', '#54BBAB', '#b3422c', '#d18a26', '#5b6770'],
      tag: () => 'CARGA SECA', why: '' },
    { kind: 'reefer', weight: 26, colors: ['#eef4f9'],
      tag: () => `REEFER ${-(18 + Math.floor(Math.random() * 7))}C`,
      why: 'UN REEFER FUERA DE SU ZONA PIERDE LA CADENA DE FRIO' },
    { kind: 'imo', weight: 24, colors: ['#EE7523'],
      tag: () => `IMO ${[1, 3, 5.1, 8, 9][Math.floor(Math.random() * 5)]}`,
      why: 'LA MERCANCIA PELIGROSA VA SEGREGADA EN ZONA IMO' },
    { kind: 'rej', weight: 12, colors: ['#7d8a99'],
      tag: () => 'AVERIA', why: 'UN CONTENEDOR DANADO VA A INSPECCION, NO AL PATIO' }
  ];
  const ZONE_NAME = { reefer: 'ZONA REEFER', imo: 'ZONA IMO', std: 'PILA ESTANDAR', rej: 'RECHAZO' };

  // ---------- DOM ----------
  const $ = (id) => document.getElementById(id);
  const yard = $('yard'), belt = $('belt'), junction = $('junction');
  const ringFg = $('ring-fg');
  const mScore = $('m-score'), mCombo = $('m-combo'), mLeft = $('m-left');
  const hudStatus = $('hud-status');
  const toast = $('toast'), finale = $('finale');
  const zones = {
    reefer: $('zone-reefer'), imo: $('zone-imo'),
    std: $('zone-std'), rej: $('zone-rej')
  };
  const stacks = {
    reefer: $('stack-reefer'), imo: $('stack-imo'),
    std: $('stack-std'), rej: $('stack-rej')
  };
  const RING_LEN = 163.4;

  let toastTimer = 0;
  const say = (msg, ms = 2300) => {
    toast.hidden = false;
    toast.textContent = msg;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { toast.hidden = true; }, ms);
  };

  // ---------- layout ----------
  let W, H, JX, JY;
  const layout = () => {
    W = window.innerWidth; H = window.innerHeight;
    JX = W * 0.42; JY = H * 0.5;
    belt.style.width = `${JX - 40}px`;
    junction.style.left = `${JX}px`;
    junction.style.top = `${JY}px`;
  };
  layout();
  window.addEventListener('resize', layout);

  // destinos en pantalla para la animacion de despacho
  const zoneTarget = (kind) => {
    const r = zones[kind].getBoundingClientRect();
    return [r.left + r.width / 2, r.top + r.height / 2];
  };

  // ---------- estado ----------
  const st = {
    idx: 0, score: 0, combo: 1, best: 0, hits: 0,
    phase: 'idle',         // travel | wait | resolve | over
    box: null, type: null,
    x: 0, t: 0, wait: 0, travel: 0
  };
  const counts = { reefer: 0, imo: 0, std: 0, rej: 0 };

  const pickType = () => {
    const total = TYPES.reduce((s, t) => s + t.weight, 0);
    let r = Math.random() * total;
    for (const t of TYPES) { r -= t.weight; if (r <= 0) return t; }
    return TYPES[0];
  };

  const updateHud = () => {
    mScore.textContent = String(st.score);
    mCombo.textContent = `x${st.combo}`;
    mLeft.textContent = String(TOTAL - st.idx);
  };

  // ---------- ciclo ----------
  const spawn = () => {
    if (st.idx >= TOTAL) { endShift(); return; }
    const p = st.idx / (TOTAL - 1);
    st.travel = TRAVEL_START - (TRAVEL_START - TRAVEL_MIN) * p;
    st.wait = WAIT_START - (WAIT_START - WAIT_MIN) * p;

    st.type = pickType();
    const color = st.type.colors[Math.floor(Math.random() * st.type.colors.length)];
    const box = document.createElement('div');
    box.className = `box box--${st.type.kind}`;
    box.style.setProperty('--c', color);
    const code = `HPMU ${100000 + Math.floor(Math.random() * 899999)}`;
    box.innerHTML = `<span class="box__code">${code}</span><span class="box__tag">${st.type.tag()}</span>`;
    box.style.left = '-160px';
    box.style.top = `${JY}px`;
    yard.appendChild(box);

    st.box = box;
    st.x = -160;
    st.t = 0;
    st.phase = 'travel';
    updateHud();
  };

  const resolve = (kind, timeout = false) => {
    // se puede despachar en viaje (anticipado) o en la junta
    if (st.phase !== 'wait' && st.phase !== 'travel') return;
    if (timeout && st.phase !== 'wait') return;
    st.phase = 'resolve';
    const correct = !timeout && kind === st.type.kind;
    const box = st.box;
    const targetKind = timeout ? st.type.kind : kind;
    const [tx, ty] = zoneTarget(targetKind);

    // anima el contenedor hacia la zona elegida (o se queda si expiro)
    if (!timeout) {
      box.style.transition = 'left 0.45s cubic-bezier(0.3, 0, 0.4, 1), top 0.45s cubic-bezier(0.3, 0, 0.4, 1), transform 0.45s ease';
      box.style.left = `${tx}px`;
      box.style.top = `${ty}px`;
      box.style.transform = 'scale(0.45)';
    } else {
      box.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
      box.style.opacity = '0';
      box.style.transform = 'scale(0.7)';
    }

    if (correct) {
      st.score += HIT * st.combo;
      st.hits++;
      st.combo = Math.min(st.combo + 1, 5);
      st.best = Math.max(st.best, st.combo);
      zones[kind].classList.add('is-good');
      document.body.classList.add('flash-good');
      hudStatus.textContent = `BIEN: ${ZONE_NAME[kind]}`;
    } else {
      st.score += MISS;
      st.combo = 1;
      if (!timeout) zones[kind].classList.add('is-bad');
      document.body.classList.add('shake', 'flash-bad');
      hudStatus.textContent = timeout
        ? `SE VENCIO LA JUNTA: ERA ${ZONE_NAME[st.type.kind]}`
        : `ERA ${ZONE_NAME[st.type.kind]}`;
      if (st.type.why) say(st.type.why, 2600);
    }

    setTimeout(() => {
      document.body.classList.remove('shake', 'flash-good', 'flash-bad');
      Object.values(zones).forEach((z) => z.classList.remove('is-good', 'is-bad'));
    }, 520);

    setTimeout(() => {
      // el contenedor queda apilado en la zona donde realmente acabo
      const finalKind = correct || timeout ? st.type.kind : kind;
      const miniColor =
        st.type.kind === 'reefer' ? '#eef4f9' :
        st.type.kind === 'imo' ? '#EE7523' :
        st.type.kind === 'rej' ? '#7d8a99' :
        (box.style.getPropertyValue('--c') || '#009BDE');
      box.remove();
      const mini = document.createElement('i');
      mini.style.setProperty('--c', miniColor);
      stacks[finalKind].appendChild(mini);
      counts[finalKind]++;
      st.idx++;
      updateHud();
      setTimeout(spawn, 260);
    }, 470);
  };

  const endShift = () => {
    st.phase = 'over';
    const acc = Math.round((st.hits / TOTAL) * 100);
    const rank = acc === 100 ? 'Jefe de patio legendario.' :
                 acc >= 80 ? 'Checador estrella.' :
                 acc >= 55 ? 'Operador de patio.' : 'Hoy invita el supervisor.';
    $('finale-kicker').textContent = 'TURNO TERMINADO';
    $('finale-title').textContent = rank;
    $('finale-score').textContent = `${Math.max(0, st.score)} PTS`;
    $('finale-detail').textContent =
      `${st.hits}/${TOTAL} BIEN DESPACHADOS (${acc} POR CIENTO) · MEJOR COMBO x${st.best}`;
    finale.hidden = false;
  };

  const reset = () => {
    if (st.box) st.box.remove();
    Object.values(stacks).forEach((s) => { s.innerHTML = ''; });
    Object.keys(counts).forEach((k) => { counts[k] = 0; });
    st.idx = 0; st.score = 0; st.combo = 1; st.best = 1; st.hits = 0;
    finale.hidden = true;
    hudStatus.textContent = 'LEE LAS MARCAS Y DESPACHA ANTES DE QUE EXPIRE LA JUNTA';
    updateHud();
    spawn();
  };

  // ---------- entrada ----------
  const DIRMAP = {
    w: 'reefer', arrowup: 'reefer',
    s: 'imo', arrowdown: 'imo',
    d: 'std', arrowright: 'std',
    a: 'rej', arrowleft: 'rej'
  };
  document.addEventListener('keydown', (e) => {
    const k = e.key.toLowerCase();
    if (DIRMAP[k]) { e.preventDefault(); if (!e.repeat) resolve(DIRMAP[k]); }
    if (k === 'r') reset();
    if (k === 'enter' && st.phase === 'over') reset();
  });

  const BTNMAP = { up: 'reefer', down: 'imo', right: 'std', left: 'rej' };
  document.querySelectorAll('.cbtn').forEach((b) => {
    b.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      b.classList.add('is-press');
      resolve(BTNMAP[b.dataset.k]);
    });
    ['pointerup', 'pointerleave', 'pointercancel'].forEach((ev) =>
      b.addEventListener(ev, () => b.classList.remove('is-press')));
  });
  $('restart').addEventListener('click', reset);

  // ---------- loop ----------
  let last = performance.now();
  const tick = (now) => {
    requestAnimationFrame(tick);
    const dt = Math.min((now - last) / 1000, 0.033);
    last = now;
    if (!st.box) return;

    if (st.phase === 'travel') {
      st.t += dt;
      const p = Math.min(st.t / st.travel, 1);
      const ease = 1 - Math.pow(1 - p, 2.4);
      st.x = -160 + (JX + 160) * ease;
      st.box.style.left = `${st.x}px`;
      ringFg.style.strokeDashoffset = '0';
      if (p >= 1) { st.phase = 'wait'; st.t = 0; }
    } else if (st.phase === 'wait') {
      st.t += dt;
      const left = Math.max(0, 1 - st.t / st.wait);
      ringFg.style.strokeDashoffset = String(RING_LEN * (1 - left));
      ringFg.style.stroke = left < 0.3 ? '#c23b2e' : left < 0.6 ? '#EE7523' : '#FFC627';
      if (st.t >= st.wait) resolve(null, true);
    }
  };

  reset();
  requestAnimationFrame(tick);
})();
