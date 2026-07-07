/* ============================================================
   DINAMICA HOMBRE AL AGUA — motor
   Misma fisica de inercia que Entrada al Dique (telegrafo por
   pasos, cana que solo muerde con arrancada). El buque deja
   estela pintada en canvas. El MOB cae por la popa, deriva con
   la corriente y pierde vitalidad. Rescate: a menos de 34 px
   (15 m) con menos de 0.4 kn, sostenido 1.6 s. Pasarle encima
   con arrancada = tragedia. 2 niveles (dia / noche).
   ============================================================ */

(() => {
  // ---------- configuracion ----------
  const SHIP_L = 130, SHIP_B = 28;
  const KN = 22;
  const LEVELS = [
    { name: 'NIVEL 1 // DIA EN CALMA', cur: { x: 5, y: 9 },  drain: 0.9, night: false },
    { name: 'NIVEL 2 // NOCHE CERRADA', cur: { x: -9, y: 13 }, drain: 1.25, night: true }
  ];
  const RESCUE_D = 34, RESCUE_KN = 0.4, RESCUE_T = 1.6;
  const RUNOVER_D = 16, RUNOVER_KN = 0.8;
  const PT_RETRY = 60;

  // ---------- DOM ----------
  const $ = (id) => document.getElementById(id);
  const scene = $('scene'), ship = $('ship'), mobEl = $('mob'), night = $('night');
  const canvas = $('sea'), ctx = canvas.getContext('2d');
  const insSpeed = $('ins-speed'), insTel = $('ins-tel'), insHdg = $('ins-hdg'), insDist = $('ins-dist');
  const hudLevel = $('hud-level'), hudScore = $('hud-score'), hudStatus = $('hud-status');
  const vidaFill = $('vida-fill');
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
    x: 0, y: 0, th: Math.PI / 2, v: 0, om: 0,
    tel: 0, rud: 0,
    mob: null, vida: 100, sailT: 0, rescueT: 0,
    wake: [], wakeT: 0, t: 0,
    phase: 'intro'      // intro | sail | play | verdict | over
  };
  const keys = {};
  let W, H, L;

  // ---------- niveles ----------
  const setupLevel = (retry) => {
    L = LEVELS[st.level];
    W = window.innerWidth; H = window.innerHeight;
    canvas.width = W; canvas.height = H;
    st.x = W * 0.16; st.y = H * 0.5;
    st.th = Math.PI / 2;                 // rumbo este (090)
    st.v = 2 * KN; st.om = 0;
    st.tel = 2; st.rud = 0;
    st.mob = null;
    st.vida = 100;
    st.sailT = 0; st.rescueT = 0;
    st.wake = []; st.wakeT = 0;
    if (!retry) st.t = 0;
    st.phase = 'sail';
    mobEl.hidden = true;
    night.hidden = !L.night;
    mobEl.classList.toggle('is-dim', L.night);
    verdict.hidden = true;
    alarm.hidden = true;
    hudStatus.textContent = 'NAVEGANDO A RUMBO... ATENTO A LA BORDA';
    say(L.name);
    updateHud();
  };

  const dropMob = () => {
    const fx = Math.sin(st.th), fy = -Math.cos(st.th);
    st.mob = { x: st.x - fx * SHIP_L / 2, y: st.y - fy * SHIP_L / 2 };
    mobEl.hidden = false;
    st.phase = 'play';
    alarm.hidden = false;
    setTimeout(() => { alarm.hidden = true; }, 1400);
    document.body.classList.add('shake');
    setTimeout(() => document.body.classList.remove('shake'), 520);
    say('¡HOMBRE AL AGUA POR LA POPA! VIRA Y VUELVE POR EL');
    hudStatus.textContent = 'RECUERDA: CANA TODA, A 60 GRADOS CAMBIA, VUELVE POR TU ESTELA';
  };

  // ---------- fisica ----------
  const telUp = () => { if (st.phase === 'play' || st.phase === 'sail') st.tel = Math.min(2, st.tel + 1); };
  const telDown = () => { if (st.phase === 'play' || st.phase === 'sail') st.tel = Math.max(-1, st.tel - 1); };

  const physics = (dt) => {
    st.v += (st.tel * KN - st.v) * Math.min(1, dt * 0.4);
    const dir = (keys.d ? 1 : 0) - (keys.a ? 1 : 0);
    if (dir) st.rud = Math.max(-1, Math.min(1, st.rud + dir * 2.2 * dt));
    else st.rud += -st.rud * Math.min(1, dt * 1.6);
    const omT = st.rud * st.v * 0.0045;
    st.om += (omT - st.om) * Math.min(1, dt * 2.5);
    st.th += st.om * dt;
    const fx = Math.sin(st.th), fy = -Math.cos(st.th);
    st.x += fx * st.v * dt;
    st.y += fy * st.v * dt;
    st.x = Math.max(30, Math.min(W - 30, st.x));
    st.y = Math.max(60, Math.min(H - 60, st.y));

    // estela
    st.wakeT += dt;
    if (st.wakeT > 0.12 && Math.abs(st.v) > 4) {
      st.wakeT = 0;
      st.wake.push({ x: st.x - fx * SHIP_L / 2, y: st.y - fy * SHIP_L / 2, age: 0 });
      if (st.wake.length > 340) st.wake.shift();
    }
    st.wake.forEach((p) => { p.age += dt; });

    if (st.phase === 'sail') {
      st.sailT += dt;
      if (st.sailT > 2.4) dropMob();
      return;
    }

    // naufrago
    const m = st.mob;
    m.x += L.cur.x * 0.5 * dt;
    m.y += L.cur.y * 0.5 * dt;
    m.x = Math.max(20, Math.min(W - 20, m.x));
    m.y = Math.max(H * 0.1, Math.min(H - 30, m.y));
    st.vida -= L.drain * dt;
    if (st.vida <= 0) { st.vida = 0; lose('HIPOTERMIA', 'El mar no espera: llegaste tarde.'); return; }

    const dist = Math.hypot(st.x - m.x, st.y - m.y);
    const kn = Math.abs(st.v) / KN;
    if (dist < RUNOVER_D && kn > RUNOVER_KN) {
      lose('LO ARROLLASTE', 'Sobre el naufrago se llega PARADO.');
      return;
    }
    if (dist < RESCUE_D && kn < RESCUE_KN) {
      st.rescueT += dt;
      hudStatus.textContent = `IZANDO AL NAUFRAGO... ${Math.min(100, Math.round(st.rescueT / RESCUE_T * 100))}%`;
      if (st.rescueT >= RESCUE_T) rescued();
    } else if (st.rescueT > 0) {
      st.rescueT = 0;
      hudStatus.textContent = 'ACERCATE DESPACIO Y SOSTEN JUNTO AL MOB';
    }
  };

  // ---------- desenlaces ----------
  const rescued = () => {
    st.phase = 'verdict';
    const pts = 150 + Math.round(350 * st.vida / 100) - st.retries * PT_RETRY;
    st.score += Math.max(50, pts);
    verdictCard.className = 'verdict__card';
    $('vd-kicker').textContent = 'RESCATADO';
    $('vd-title').textContent = st.vida > 60 ? 'De manual: rapido y parado.' : 'Con el agua al cuello.';
    $('vd-detail').innerHTML =
      `VITALIDAD AL IZARLO: ${Math.round(st.vida)}% · ${st.retries} REINTENTOS<br>+${Math.max(50, pts)} PTS`;
    $('vd-next').textContent = st.level >= LEVELS.length - 1 ? 'VER RESULTADO' : 'SIGUIENTE NIVEL';
    verdict.hidden = false;
    updateHud();
  };

  const lose = (kicker, title) => {
    st.phase = 'verdict';
    st.retries++;
    alarm.hidden = false;
    verdictCard.className = 'verdict__card is-bad';
    $('vd-kicker').textContent = kicker;
    $('vd-title').textContent = title;
    $('vd-detail').innerHTML = `REINTENTO: -${PT_RETRY} PTS AL NIVEL`;
    $('vd-next').textContent = 'REINTENTAR';
    verdict.hidden = false;
  };

  const nextStep = () => {
    verdict.hidden = true;
    alarm.hidden = true;
    if (st.retries > 0 && $('vd-next').textContent === 'REINTENTAR') { setupLevel(true); return; }
    st.level++;
    st.retries = 0;
    if (st.level >= LEVELS.length) { showFinale(); return; }
    setupLevel(false);
  };

  const showFinale = () => {
    st.phase = 'over';
    const rank = st.score >= 850 ? 'Oficial de rescate.' :
                 st.score >= 650 ? 'Guardia entrenada.' :
                 st.score >= 420 ? 'Vigia de popa.' : 'Tripulante distraido.';
    $('finale-kicker').textContent = 'GUARDIA COMPLETA';
    $('finale-title').textContent = rank;
    $('finale-score').textContent = `${st.score} PTS`;
    $('finale-detail').textContent = `${LEVELS.length} RESCATES · MAX 1000 PTS`;
    finale.hidden = false;
  };

  // ---------- render ----------
  const render = () => {
    // estela y mar
    ctx.clearRect(0, 0, W, H);
    st.wake.forEach((p) => {
      const a = Math.max(0, 1 - p.age / 26);
      if (a <= 0) return;
      ctx.fillStyle = `rgba(235, 248, 255, ${0.5 * a})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 2.6 + p.age * 0.12, 0, Math.PI * 2);
      ctx.fill();
    });
    // corriente: flechitas sutiles
    ctx.fillStyle = 'rgba(255,255,255,0.1)';
    for (let i = 0; i < 4; i++) {
      const cx = (W / 4) * i + ((st.t * 12) % (W / 4));
      ctx.fillRect(cx, H - 40, 16, 2);
    }

    ship.style.width = `${SHIP_B}px`;
    ship.style.height = `${SHIP_L}px`;
    ship.style.left = `${st.x}px`;
    ship.style.top = `${st.y}px`;
    ship.style.transform = `translate(-50%, -50%) rotate(${st.th * 180 / Math.PI}deg)`;

    if (st.mob) {
      mobEl.style.left = `${st.mob.x}px`;
      mobEl.style.top = `${st.mob.y}px`;
    }

    const kn = Math.abs(st.v) / KN;
    insSpeed.textContent = `${kn.toFixed(1)} KN`;
    insTel.textContent = st.tel === 0 ? 'PARADA' : st.tel < 0 ? 'ATRAS' : `AVANTE ${st.tel}`;
    const hdg = ((st.th * 180 / Math.PI) % 360 + 360) % 360;
    insHdg.innerHTML = `${String(Math.round(hdg)).padStart(3, '0')}&#176;`;
    insDist.textContent = st.mob ? `${Math.round(Math.hypot(st.x - st.mob.x, st.y - st.mob.y) / 2.2)} M` : '--';
    vidaFill.style.width = `${st.vida}%`;
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
    W = window.innerWidth; H = window.innerHeight;
    canvas.width = W; canvas.height = H;
    st.x = W * 0.16; st.y = H * 0.5; st.th = Math.PI / 2;
    st.v = 0; st.tel = 0; st.wake = []; st.mob = null; st.vida = 100;
    mobEl.hidden = true;
    night.hidden = true;
    intro.hidden = false;
    updateHud();
  };

  const startGame = () => {
    intro.hidden = true;
    if (st.phase !== 'intro') return;
    if (st.helpResume) { st.helpResume = false; st.phase = st.resumePhase || 'play'; }
    else setupLevel(false);
  };

  const openHelp = () => {
    if (st.phase !== 'play' && st.phase !== 'sail') return;
    st.resumePhase = st.phase;
    st.helpResume = true;
    st.phase = 'intro';
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
    if (['a', 'd'].includes(k)) { e.preventDefault(); keys[k] = true; }
    if (k === 'w' && !e.repeat) { e.preventDefault(); telUp(); }
    if (k === 's' && !e.repeat) { e.preventDefault(); telDown(); }
  });
  document.addEventListener('keyup', (e) => {
    const k = e.key.toLowerCase();
    if (['a', 'd'].includes(k)) keys[k] = false;
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
    if (st.phase === 'sail' || st.phase === 'play') {
      st.t += dt;
      physics(dt);
    }
    render();
  };

  reset();
  requestAnimationFrame(tick);
})();
