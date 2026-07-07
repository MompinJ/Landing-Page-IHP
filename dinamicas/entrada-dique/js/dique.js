/* ============================================================
   DINAMICA ENTRADA AL DIQUE — motor
   Fisica cenital simplificada:
   - v (arrancada) persigue al telegrafo con inercia.
   - La cana genera giro proporcional a la velocidad (parado no
     gobierna); el remolcador de proa (Q/E) gira y desplaza.
   - El viento es deriva lateral en coordenadas de mundo.
   Chocar con muros o cruzar el umbral pasado de velocidad =
   averia (3 = casco abierto). Para asentar: dentro del dique,
   centrado, desvio < 4 grados y casi parado, sostenido 1.3 s.
   NOTA: fisica simplificada para demo; validar con un experto
   en maniobras de dique.
   ============================================================ */

(() => {
  // ---------- configuracion ----------
  const SHIP_L = 150, SHIP_B = 32;
  const KN = 22;                       // px/s que valen 1 nudo
  const DOCK_LEN = 210, DOCK_TOP = 64;
  const LEVELS = [
    { name: 'NIVEL 1 // DIQUE ANCHO, DIA EN CALMA', dockW: 66, wind: 0,   startX: 0,    startAng: 0,  limit: 1.2 },
    { name: 'NIVEL 2 // VIENTO DE TRAVES',          dockW: 56, wind: 10,  startX: -140, startAng: 0,  limit: 1.1 },
    { name: 'NIVEL 3 // DIQUE ESTRECHO',            dockW: 46, wind: -13, startX: 150,  startAng: 14, limit: 1.0 }
  ];
  const BASE = 400, COST_T = 1.5, COST_HIT = 70, COST_RETRY = 60;
  const MAX_HITS = 3, SETTLE_T = 1.3;

  // ---------- DOM ----------
  const $ = (id) => document.getElementById(id);
  const scene = $('scene'), dockLayer = $('dock-layer'), ship = $('ship');
  const insSpeed = $('ins-speed'), insTel = $('ins-tel'), insRudder = $('ins-rudder'), insDev = $('ins-dev');
  const insWind = $('ins-wind'), windArrow = $('wind-arrow');
  const hudLevel = $('hud-level'), hudScore = $('hud-score'), hudStatus = $('hud-status');
  const lamps = $('lamps');
  const toast = $('toast'), alarm = $('alarm');
  const verdict = $('verdict'), verdictCard = $('verdict-card');
  const intro = $('intro'), finale = $('finale');

  let toastTimer = 0;
  const say = (msg) => {
    toast.hidden = false;
    toast.textContent = msg;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { toast.hidden = true; }, 2800);
  };

  // ---------- estado ----------
  const st = {
    level: 0, score: 0, retries: 0,
    x: 0, y: 0, th: 0, v: 0, u: 0, uw: 0, om: 0,
    tel: 0, rud: 0,
    hits: 0, t: 0, settle: 0,
    prevBow: 1e9, hitCd: 0,
    phase: 'intro'      // intro | play | docked | verdict | over
  };
  const keys = {};
  let W, H, axis, sillY, L; // L = nivel actual

  // ---------- escenario ----------
  const el = (cls, parent) => {
    const d = document.createElement('div');
    d.className = cls;
    (parent || dockLayer).appendChild(d);
    return d;
  };
  const place = (d, x, y, w, h) => {
    d.style.left = `${x}px`;
    d.style.top = `${y}px`;
    d.style.width = `${w}px`;
    d.style.height = `${h}px`;
  };

  const buildDock = () => {
    dockLayer.innerHTML = '';
    W = window.innerWidth; H = window.innerHeight;
    axis = W / 2;
    sillY = DOCK_TOP + DOCK_LEN;
    const x1 = axis - L.dockW / 2, x2 = axis + L.dockW / 2;

    place(el('land'), 0, 0, x1, sillY);
    place(el('land'), x2, 0, W - x2, sillY);
    place(el('land land--head'), x1, 0, L.dockW, DOCK_TOP);
    place(el('dock-water'), x1, DOCK_TOP, L.dockW, DOCK_LEN);
    place(el('dock-dry'), x1, DOCK_TOP, L.dockW, DOCK_LEN);

    for (let y = DOCK_TOP + 14; y < sillY - 8; y += 20) {
      const p = el('picadero');
      p.style.left = `${axis}px`;
      p.style.top = `${y}px`;
    }
    const slot = el('ghost-slot');
    slot.style.left = `${axis}px`;
    slot.style.top = `${targetY()}px`;
    slot.style.width = `${SHIP_B + 12}px`;
    slot.style.height = `${SHIP_L + 16}px`;

    const gate = el('gate');
    place(gate, x1 - 4, sillY - 5, L.dockW + 8, 10);

    const sm = el('sill-mark');
    place(sm, x1, sillY, L.dockW, 0);

    const g = el('guide');
    place(g, axis, sillY + 6, 0, H - sillY - 120);
  };

  const targetY = () => DOCK_TOP + SHIP_L / 2 + 12;

  // ---------- niveles ----------
  const setupLevel = (retry) => {
    L = LEVELS[st.level];
    scene.classList.remove('is-docked', 'is-drained');
    buildDock();
    st.x = axis + L.startX;
    st.y = H - 130;
    st.th = L.startAng * Math.PI / 180;
    st.v = 0; st.u = 0; st.uw = 0; st.om = 0;
    st.tel = 0; st.rud = 0;
    st.hits = 0; st.settle = 0;
    st.prevBow = 1e9; st.hitCd = 0;
    if (!retry) st.t = 0;
    st.phase = 'play';
    verdict.hidden = true;
    alarm.hidden = true;
    insWind.hidden = !L.wind;
    if (L.wind) windArrow.style.transform = `rotate(${L.wind > 0 ? 0 : 180}deg)`;
    hudStatus.textContent = 'RUMBO AL DIQUE: LA CANA SOLO MUERDE CON ARRANCADA';
    say(L.name);
    updateHud();
  };

  // ---------- averias ----------
  const spark = (x, y) => {
    const s = document.createElement('div');
    s.className = 'spark';
    s.style.left = `${x}px`;
    s.style.top = `${y}px`;
    scene.appendChild(s);
    setTimeout(() => s.remove(), 800);
  };

  const damage = (x, y, msg) => {
    if (st.hitCd > 0) return;
    st.hitCd = 1;
    st.hits++;
    spark(x, y);
    document.body.classList.add('shake');
    setTimeout(() => document.body.classList.remove('shake'), 520);
    say(msg);
    updateHud();
    if (st.hits >= MAX_HITS) fail();
  };

  const fail = () => {
    st.phase = 'verdict';
    st.retries++;
    alarm.hidden = false;
    verdictCard.className = 'verdict__card is-bad';
    $('vd-kicker').textContent = 'CASCO ABIERTO';
    $('vd-title').textContent = 'El dique te mastico.';
    $('vd-detail').innerHTML = `TRES AVERIAS EN LA MANIOBRA.<br>REINTENTO: -${COST_RETRY} PTS AL NIVEL`;
    $('vd-next').textContent = 'REINTENTAR';
    verdict.hidden = false;
  };

  const docked = () => {
    st.phase = 'docked';
    st.tel = 0;
    scene.classList.add('is-docked');
    hudStatus.textContent = 'COMPUERTA CERRADA: ACHICANDO EL DIQUE...';
    setTimeout(() => scene.classList.add('is-drained'), 1300);
    setTimeout(() => {
      const pts = Math.max(40, Math.round(BASE - st.t * COST_T - st.hits * COST_HIT - st.retries * COST_RETRY));
      st.score += pts;
      st.phase = 'verdict';
      verdictCard.className = 'verdict__card';
      $('vd-kicker').textContent = 'BUQUE EN SECO';
      $('vd-title').textContent = st.hits === 0 && st.retries === 0 ? 'Varada de cirujano.' : 'Quedo asentado.';
      $('vd-detail').innerHTML =
        `${fmtTime(st.t)} · ${st.hits} AVERIAS · ${st.retries} REINTENTOS<br>+${pts} PTS ESTE NIVEL`;
      $('vd-next').textContent = st.level >= LEVELS.length - 1 ? 'VER RESULTADO' : 'SIGUIENTE NIVEL';
      verdict.hidden = false;
      updateHud();
    }, 3400);
  };

  const nextStep = () => {
    verdict.hidden = true;
    alarm.hidden = true;
    if (st.hits >= MAX_HITS) { setupLevel(true); return; }
    st.level++;
    st.retries = 0;
    if (st.level >= LEVELS.length) { showFinale(); return; }
    setupLevel(false);
  };

  const showFinale = () => {
    st.phase = 'over';
    const rank = st.score >= 1020 ? 'Capitan de diques.' :
                 st.score >= 820 ? 'Practico de astillero.' :
                 st.score >= 560 ? 'Timonel con pulso.' : 'Remachador de casco.';
    $('finale-kicker').textContent = 'VARADA COMPLETA';
    $('finale-title').textContent = rank;
    $('finale-score').textContent = `${st.score} PTS`;
    $('finale-detail').textContent = `${LEVELS.length} ENTRADAS AL DIQUE · MAX ${BASE * LEVELS.length} PTS`;
    finale.hidden = false;
  };

  const fmtTime = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

  // ---------- fisica ----------
  const telUp = () => { if (st.phase === 'play') st.tel = Math.min(2, st.tel + 1); };
  const telDown = () => { if (st.phase === 'play') st.tel = Math.max(-1, st.tel - 1); };

  const shipPoints = () => {
    const fx = Math.sin(st.th), fy = -Math.cos(st.th);
    const rx = Math.cos(st.th), ry = Math.sin(st.th);
    const hl = SHIP_L / 2, hb = SHIP_B / 2;
    return [
      [st.x + fx * hl, st.y + fy * hl],                                   // proa
      [st.x + fx * hl * 0.7 - rx * hb, st.y + fy * hl * 0.7 - ry * hb],
      [st.x + fx * hl * 0.7 + rx * hb, st.y + fy * hl * 0.7 + ry * hb],
      [st.x - rx * hb, st.y - ry * hb],
      [st.x + rx * hb, st.y + ry * hb],
      [st.x - fx * hl - rx * hb * 0.8, st.y - fy * hl - ry * hb * 0.8],
      [st.x - fx * hl + rx * hb * 0.8, st.y - fy * hl + ry * hb * 0.8]
    ];
  };

  const physics = (dt) => {
    // maquina y cana
    st.v += (st.tel * KN - st.v) * Math.min(1, dt * 0.4);
    const dir = (keys.d ? 1 : 0) - (keys.a ? 1 : 0);
    if (dir) st.rud = Math.max(-1, Math.min(1, st.rud + dir * 2.2 * dt));
    else st.rud += -st.rud * Math.min(1, dt * 1.6);
    const tug = (keys.e ? 1 : 0) - (keys.q ? 1 : 0);
    const omT = st.rud * st.v * 0.0045 + tug * 0.14;
    st.om += (omT - st.om) * Math.min(1, dt * 2.5);
    st.th += st.om * dt;
    // deriva del remolcador y viento
    st.u += (tug * 9 - st.u * 1.4) * dt;
    st.uw += ((L.wind || 0) - st.uw * 0.8) * dt;
    // avance
    const fx = Math.sin(st.th), fy = -Math.cos(st.th);
    const rx = Math.cos(st.th), ry = Math.sin(st.th);
    st.x += (fx * st.v + rx * st.u + st.uw) * dt;
    st.y += (fy * st.v + ry * st.u) * dt;
    // limites de pantalla
    st.x = Math.max(SHIP_B, Math.min(W - SHIP_B, st.x));
    st.y = Math.max(-20, Math.min(H - 60, st.y));

    // colisiones con la obra
    const x1 = axis - L.dockW / 2, x2 = axis + L.dockW / 2;
    st.hitCd = Math.max(0, st.hitCd - dt);
    for (const [px, py] of shipPoints()) {
      if (py < sillY && px < x1) {          // muro izquierdo
        st.x += (x1 - px) + 1.5;
        st.v *= 0.4; st.u *= 0.3; st.om *= 0.5;
        damage(px, py, 'AVERIA: ROZASTE EL MURO DEL DIQUE');
        break;
      }
      if (py < sillY && px > x2) {          // muro derecho
        st.x -= (px - x2) + 1.5;
        st.v *= 0.4; st.u *= 0.3; st.om *= 0.5;
        damage(px, py, 'AVERIA: ROZASTE EL MURO DEL DIQUE');
        break;
      }
      if (py < DOCK_TOP && px >= x1 && px <= x2) {  // cabecera
        st.y += (DOCK_TOP - py) + 1.5;
        st.v *= -0.25; st.om *= 0.4;
        damage(px, py, 'AVERIA: GOLPEASTE LA CABECERA DEL DIQUE');
        break;
      }
    }

    // umbral: limite de velocidad
    const bow = st.y + fy * SHIP_L / 2;
    if (st.prevBow > sillY && bow <= sillY && st.x > x1 && st.x < x2) {
      const knSill = Math.abs(st.v) / KN;
      if (knSill > L.limit) damage(st.x, sillY, `CRUZASTE EL UMBRAL A ${knSill.toFixed(1)} KN (LIMITE ${L.limit})`);
      else say('UMBRAL CRUZADO: DESPACIO Y AL CENTRO DE LOS PICADEROS');
    }
    st.prevBow = bow;

    // asentar
    const devDeg = Math.abs(normDeg(st.th * 180 / Math.PI));
    const kn = Math.abs(st.v) / KN;
    const inside = shipPoints().every(([px, py]) =>
      px > x1 + 2 && px < x2 - 2 && py > DOCK_TOP + 2 && py < sillY - 2);
    const centered = Math.abs(st.x - axis) < 7 && Math.abs(st.y - targetY()) < 16;
    if (inside && centered && devDeg < 4 && kn < 0.22) {
      st.settle += dt;
      hudStatus.textContent = `ASENTANDO SOBRE PICADEROS... ${Math.min(100, Math.round(st.settle / SETTLE_T * 100))}%`;
      if (st.settle >= SETTLE_T) docked();
    } else if (st.settle > 0) {
      st.settle = 0;
      hudStatus.textContent = 'RUMBO AL DIQUE: LA CANA SOLO MUERDE CON ARRANCADA';
    }
  };

  const normDeg = (d) => {
    let a = d % 360;
    if (a > 180) a -= 360;
    if (a < -180) a += 360;
    return a;
  };

  // ---------- render ----------
  const render = () => {
    ship.style.width = `${SHIP_B}px`;
    ship.style.height = `${SHIP_L}px`;
    ship.style.left = `${st.x}px`;
    ship.style.top = `${st.y}px`;
    ship.style.transform = `translate(-50%, -50%) rotate(${st.th * 180 / Math.PI}deg)`;

    const kn = Math.abs(st.v) / KN;
    insSpeed.textContent = `${kn.toFixed(1)} KN`;
    insSpeed.classList.toggle('is-warn', st.phase === 'play' && kn > L.limit && st.y < sillY + 190);
    insTel.textContent = st.tel === 0 ? 'PARADA' : st.tel < 0 ? 'ATRAS' : `AVANTE ${st.tel}`;
    insRudder.innerHTML = `${Math.abs(Math.round(st.rud * 30))}&#176;${st.rud < -0.03 ? ' BR' : st.rud > 0.03 ? ' ER' : ''}`;
    const dev = normDeg(st.th * 180 / Math.PI);
    insDev.innerHTML = `${Math.abs(dev).toFixed(0)}&#176;`;
    insDev.classList.toggle('is-warn', Math.abs(dev) > 20);
    [...lamps.children].forEach((l, i) => l.classList.toggle('is-on', i < st.hits));
    hudLevel.textContent = `${Math.min(st.level + 1, LEVELS.length)}/${LEVELS.length}`;
    hudScore.textContent = st.score;
  };

  const updateHud = render;

  // ---------- flujo ----------
  const reset = () => {
    st.level = 0; st.score = 0; st.retries = 0;
    st.phase = 'intro';
    finale.hidden = true;
    verdict.hidden = true;
    alarm.hidden = true;
    L = LEVELS[0];
    scene.classList.remove('is-docked', 'is-drained');
    buildDock();
    st.x = axis; st.y = H - 130; st.th = 0;
    st.v = 0; st.u = 0; st.uw = 0; st.om = 0; st.tel = 0; st.rud = 0;
    st.hits = 0; st.t = 0; st.settle = 0;
    intro.hidden = false;
    insWind.hidden = true;
    updateHud();
  };

  const startGame = () => {
    intro.hidden = true;
    if (st.phase !== 'intro') return;
    if (st.helpResume) { st.helpResume = false; st.phase = 'play'; }
    else setupLevel(false);
  };

  const openHelp = () => {
    if (st.phase !== 'play') return;
    st.phase = 'intro';
    st.helpResume = true;
    intro.hidden = false;
  };

  // ---------- entrada ----------
  document.addEventListener('keydown', (e) => {
    const k = e.key.toLowerCase();
    if (k === 'r') { reset(); return; }
    if (k === 'h') { if (intro.hidden) openHelp(); else startGame(); return; }
    if ((k === 'enter' || k === ' ') && !intro.hidden) { e.preventDefault(); startGame(); return; }
    if (k === 'enter' && !verdict.hidden) { nextStep(); return; }
    if (k === 'enter' && st.phase === 'over' && !finale.hidden) { reset(); return; }
    if (['a', 'd', 'q', 'e'].includes(k)) { e.preventDefault(); keys[k] = true; }
    if (k === 'w' && !e.repeat) { e.preventDefault(); telUp(); }
    if (k === 's' && !e.repeat) { e.preventDefault(); telDown(); }
  });
  document.addEventListener('keyup', (e) => {
    const k = e.key.toLowerCase();
    if (['a', 'd', 'q', 'e'].includes(k)) keys[k] = false;
  });

  document.querySelectorAll('.cbtn').forEach((b) => {
    const k = b.dataset.k;
    const press = (e) => {
      e.preventDefault();
      b.classList.add('is-press');
      if (k === 'w') telUp();
      else if (k === 's') telDown();
      else keys[k] = true;
    };
    const release = () => { b.classList.remove('is-press'); if (k !== 'w' && k !== 's') keys[k] = false; };
    b.addEventListener('pointerdown', press);
    b.addEventListener('pointerup', release);
    b.addEventListener('pointerleave', release);
    b.addEventListener('pointercancel', release);
  });

  $('start').addEventListener('click', startGame);
  $('help').addEventListener('click', openHelp);
  $('vd-next').addEventListener('click', nextStep);
  $('restart').addEventListener('click', reset);
  window.addEventListener('resize', reset);

  // ---------- loop ----------
  let last = performance.now();
  const tick = (now) => {
    requestAnimationFrame(tick);
    const dt = Math.max(0, Math.min((now - last) / 1000, 0.05));
    last = now;
    if (st.phase === 'play') {
      st.t += dt;
      physics(dt);
    } else if (st.phase === 'docked') {
      // el buque se acomoda solo en los picaderos
      st.x += (axis - st.x) * Math.min(1, dt * 2);
      st.y += (targetY() - st.y) * Math.min(1, dt * 2);
      st.th += (0 - st.th) * Math.min(1, dt * 2);
      st.v = 0; st.u = 0;
    }
    render();
  };

  reset();
  requestAnimationFrame(tick);
})();
