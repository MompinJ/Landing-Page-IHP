/* ============================================================
   DINAMICA CIRCULO DE BORNEO — motor
   Carta SVG. 3 buques por fondear: click coloca el ancla con
   los grilletes elegidos. Radio = base + grilletes x paso.
   Reglas: el circulo no puede encimarse con otros circulos,
   el cable, el bajo ni la orilla; y la cadena debe alcanzar el
   minimo de la profundidad (si no: GARREO en la prueba).
   PROBAR BORNEO: el viento rola 360 y todos giran; los cortos
   de cadena garrean a favor del viento y provocan incidentes.
   NOTA: simplificado para demo; validar con un experto.
   ============================================================ */

(() => {
  // ---------- configuracion ----------
  const R_BASE = 40, R_STEP = 21;         // radio = base + g * paso
  const G_MIN = 3, G_MAX = 6;
  const SHIP_R = 13;                       // tamano del blip
  const PT_OK = 300, PT_INC = 150, PT_REJ = 25;
  const SWEEP_T = 7;                       // segundos de prueba
  const GARREO_DRIFT = 150;                // px que ara un ancla corta

  // ---------- DOM ----------
  const $ = (id) => document.getElementById(id);
  const svg = $('chart');
  const probe = $('probe');
  const hudShip = $('hud-ship'), hudG = $('hud-g'), hudScore = $('hud-score');
  const hudStatus = $('hud-status');
  const testBtn = $('test');
  const toast = $('toast'), alarm = $('alarm');
  const intro = $('intro'), finale = $('finale');

  let toastTimer = 0;
  const say = (msg) => {
    toast.hidden = false;
    toast.textContent = msg;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { toast.hidden = true; }, 2800);
  };

  const NS = 'http://www.w3.org/2000/svg';
  const mk = (tag, attrs, parent) => {
    const e = document.createElementNS(NS, tag);
    Object.entries(attrs || {}).forEach(([k, v]) => e.setAttribute(k, v));
    (parent || svg).appendChild(e);
    return e;
  };

  // ---------- carta ----------
  let W, H, ZONES, CABLE, BAJO, SHORE_H, FIXED;

  const depthAt = (y) => {
    for (const z of ZONES) if (y < z.y2) return z.d;
    return ZONES[ZONES.length - 1].d;
  };
  const minG = (d) => (d <= 8 ? 3 : d <= 12 ? 4 : 5);
  const radius = (g) => R_BASE + g * R_STEP;

  const buildChart = () => {
    svg.innerHTML = '';
    W = window.innerWidth; H = window.innerHeight;
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    SHORE_H = H * 0.14;
    ZONES = [
      { y2: H * 0.42, d: 8,  c: '#bcd9e8' },
      { y2: H * 0.68, d: 12, c: '#a4cbdf' },
      { y2: H + 1,    d: 16, c: '#8cbdd6' }
    ];
    // bandas de profundidad
    let y0 = SHORE_H;
    ZONES.forEach((z) => {
      mk('rect', { x: 0, y: y0, width: W, height: z.y2 - y0, fill: z.c });
      const t = mk('text', { x: 22, y: y0 + 26, class: 'depth-label' });
      t.textContent = `${z.d} M · MIN ${minG(z.d)} GRILLETES`;
      y0 = z.y2;
    });
    // orilla
    mk('rect', { x: 0, y: 0, width: W, height: SHORE_H, fill: '#c9b98a' });
    mk('rect', { x: 0, y: SHORE_H - 6, width: W, height: 6, fill: '#a3945f' });
    const shoreT = mk('text', { x: W / 2 - 40, y: SHORE_H / 2 + 4, class: 'depth-label' });
    shoreT.textContent = 'TIERRA';

    // cable submarino (franja horizontal abajo)
    CABLE = { y: H * 0.86, h: 16 };
    mk('rect', { x: 0, y: CABLE.y - CABLE.h / 2, width: W, height: CABLE.h, fill: 'rgba(238,117,35,0.2)' });
    mk('line', { x1: 0, y1: CABLE.y, x2: W, y2: CABLE.y, stroke: '#EE7523', 'stroke-width': 2.5, 'stroke-dasharray': '16 8' });
    const ct = mk('text', { x: W - 250, y: CABLE.y - 12, class: 'depth-label' });
    ct.textContent = 'CABLE SUBMARINO';

    // bajo rocoso
    BAJO = { x: W * 0.26, y: H * 0.52, r: 52 };
    mk('circle', { cx: BAJO.x, cy: BAJO.y, r: BAJO.r, fill: 'rgba(163,148,95,0.5)', stroke: '#a3945f', 'stroke-width': 2, 'stroke-dasharray': '5 5' });
    const bt = mk('text', { x: BAJO.x - 20, y: BAJO.y + 4, class: 'depth-label' });
    bt.textContent = 'BAJO';

    // buques ya fondeados (fijos)
    FIXED = [
      { x: W * 0.72, y: H * 0.36, g: 4 },
      { x: W * 0.48, y: H * 0.74, g: 5 }
    ];
    FIXED.forEach((f) => {
      f.r = radius(f.g);
      mk('circle', { cx: f.x, cy: f.y, r: f.r, class: 'swing is-fixed' });
      mk('circle', { cx: f.x, cy: f.y, r: 4, class: 'anchor-dot' });
      f.chain = mk('line', { x1: f.x, y1: f.y, x2: f.x, y2: f.y + f.r, class: 'chain' });
      f.blip = mk('circle', { cx: f.x, cy: f.y + f.r, r: SHIP_R, class: 'vship' });
      const t = mk('text', { x: f.x + 8, y: f.y - 8, class: 'tag' });
      t.textContent = 'FONDEADO';
    });

    // capa del fantasma
    st.ghost = mk('g', { class: 'ghost' });
    st.gCircle = mk('circle', { cx: -999, cy: -999, r: radius(4) }, st.ghost);
    st.gDot = mk('circle', { cx: -999, cy: -999, r: 4, class: 'anchor-dot' }, st.ghost);
  };

  // ---------- estado ----------
  const st = {
    placed: [], g: 4, rejects: 0, score: 0,
    sweep: 0, incidents: [],
    phase: 'intro'      // intro | place | test | over
  };

  // ---------- validacion ----------
  const overlapCircle = (x, y, r, c) => Math.hypot(x - c.x, y - c.y) < r + c.r;
  const validate = (x, y, g) => {
    const r = radius(g);
    if (y < SHORE_H + 10) return { ok: false, msg: 'EL ANCLA VA EN EL AGUA, NO EN LA PLAYA' };
    if (y - r < SHORE_H + SHIP_R) return { ok: false, msg: 'TU CIRCULO PISA LA ORILLA: ALEJATE O ACORTA CADENA' };
    if (Math.abs(y - CABLE.y) < r + CABLE.h / 2 + SHIP_R) return { ok: false, msg: 'TU CIRCULO PISA EL CABLE SUBMARINO' };
    if (overlapCircle(x, y, r + SHIP_R, { x: BAJO.x, y: BAJO.y, r: BAJO.r })) return { ok: false, msg: 'TU CIRCULO PISA EL BAJO ROCOSO' };
    for (const f of FIXED) if (overlapCircle(x, y, r, f)) return { ok: false, msg: 'TE ENCIMAS CON UN BUQUE YA FONDEADO' };
    for (const p of st.placed) if (overlapCircle(x, y, r, p)) return { ok: false, msg: 'TE ENCIMAS CON TU PROPIO FONDEO' };
    return { ok: true };
  };

  // ---------- colocar ----------
  const moveGhost = (x, y) => {
    if (st.phase !== 'place') return;
    const d = depthAt(y);
    const need = minG(d);
    probe.textContent = `PROF ${d} M · MINIMO ${need} GRILLETES (LLEVAS ${st.g})`;
    probe.classList.toggle('is-short', st.g < need);
    const v = validate(x, y, st.g);
    st.ghost.classList.toggle('is-bad', !v.ok);
    st.gCircle.setAttribute('cx', x); st.gCircle.setAttribute('cy', y);
    st.gCircle.setAttribute('r', radius(st.g));
    st.gDot.setAttribute('cx', x); st.gDot.setAttribute('cy', y);
  };

  const dropAnchor = (x, y) => {
    if (st.phase !== 'place') return;
    const v = validate(x, y, st.g);
    if (!v.ok) { st.rejects++; say(v.msg); updateHud(); return; }
    const d = depthAt(y);
    const p = { x, y, g: st.g, r: radius(st.g), need: minG(d), depth: d };
    p.garreo = p.g < p.need;
    p.circle = mk('circle', { cx: x, cy: y, r: p.r, class: `swing${p.garreo ? ' is-garreo' : ''}` });
    mk('circle', { cx: x, cy: y, r: 4, class: 'anchor-dot' });
    p.chain = mk('line', { x1: x, y1: y, x2: x, y2: y + p.r, class: 'chain' });
    p.blip = mk('circle', { cx: x, cy: y + p.r, r: SHIP_R, class: 'vship' });
    p.tag = mk('text', { x: x + 8, y: y - 8, class: 'tag' });
    p.tag.textContent = `B${st.placed.length + 1} · ${p.g}G`;
    st.placed.push(p);
    say(p.garreo
      ? `B${st.placed.length} FONDEADO CON ${p.g}G EN ${d} M... POCA CADENA`
      : `B${st.placed.length} FONDEADO: ${p.g} GRILLETES EN ${d} M`);
    if (st.placed.length >= 3) {
      st.ghost.style.display = 'none';
      testBtn.hidden = false;
      hudStatus.textContent = 'TODOS FONDEADOS: PRUEBA COMO BORNEAN';
    }
    updateHud();
  };

  // ---------- prueba ----------
  const runTest = () => {
    if (st.phase !== 'place' || st.placed.length < 3) return;
    st.phase = 'test';
    testBtn.hidden = true;
    st.sweep = 0;
    st.incidents = [];
    st.pairsHit = new Set();
    const rose = document.createElement('div');
    rose.className = 'windrose';
    rose.id = 'windrose';
    rose.innerHTML = 'VIENTO <i id="wind-i"></i> ROLANDO';
    document.body.appendChild(rose);
  };

  const allShips = () => FIXED.concat(st.placed);

  const testFrame = (dt) => {
    st.sweep += dt / SWEEP_T;
    const th = st.sweep * Math.PI * 2 - Math.PI / 2;    // arranca soplando al sur
    const ux = Math.cos(th), uy = Math.sin(th);
    const wi = document.getElementById('wind-i');
    if (wi) wi.style.transform = `rotate(${th * 180 / Math.PI}deg)`;

    allShips().forEach((s) => {
      // garreo: el ancla ara a favor del viento a mitad de la prueba
      if (s.garreo && st.sweep > 0.3) {
        s.x += ux * (GARREO_DRIFT / (SWEEP_T * 0.7)) * dt;
        s.y += uy * (GARREO_DRIFT / (SWEEP_T * 0.7)) * dt;
        s.circle.setAttribute('cx', s.x); s.circle.setAttribute('cy', s.y);
      }
      s.bx = s.x + ux * s.r;
      s.by = s.y + uy * s.r;
      s.blip.setAttribute('cx', s.bx); s.blip.setAttribute('cy', s.by);
      s.chain.setAttribute('x2', s.bx); s.chain.setAttribute('y2', s.by);
    });

    // incidentes
    const ships = allShips();
    for (let i = 0; i < ships.length; i++) {
      for (let j = i + 1; j < ships.length; j++) {
        const a = ships[i], b = ships[j];
        const key = `${i}-${j}`;
        if (!st.pairsHit.has(key) && Math.hypot(a.bx - b.bx, a.by - b.by) < SHIP_R * 2.4) {
          st.pairsHit.add(key);
          incident(a, b, 'ABORDAJE AL BORNEAR: DOS BUQUES SE TOCARON');
        }
      }
    }
    st.placed.forEach((p, idx) => {
      const key = `z${idx}`;
      if (st.pairsHit.has(key)) return;
      if (p.by < SHORE_H + SHIP_R) { st.pairsHit.add(key); incident(p, null, `B${idx + 1} TERMINO EN LA PLAYA`); }
      else if (Math.abs(p.by - CABLE.y) < CABLE.h / 2 + SHIP_R) { st.pairsHit.add(key); incident(p, null, `B${idx + 1} ARANDO SOBRE EL CABLE SUBMARINO`); }
      else if (Math.hypot(p.bx - BAJO.x, p.by - BAJO.y) < BAJO.r) { st.pairsHit.add(key); incident(p, null, `B${idx + 1} TOCO EL BAJO`); }
    });

    if (st.sweep >= 1) finish();
  };

  const incident = (a, b, msg) => {
    st.incidents.push(msg);
    a.blip.classList.add('is-hit');
    if (b) b.blip.classList.add('is-hit');
    alarm.hidden = false;
    setTimeout(() => { alarm.hidden = true; }, 900);
    say(`${msg} (-${PT_INC})`);
  };

  const finish = () => {
    st.phase = 'over';
    const rose = document.getElementById('windrose');
    if (rose) rose.remove();
    const garreos = st.placed.filter((p) => p.garreo).length;
    const safe = 3 - Math.min(3, st.incidents.length + 0) - 0;
    const pts = Math.max(0,
      st.placed.length * PT_OK - st.incidents.length * PT_INC - st.rejects * PT_REJ - garreos * 50);
    st.score = pts;
    const rank = st.incidents.length === 0 && garreos === 0 ? 'Capitan de puerto viejo.' :
                 pts >= 600 ? 'Oficial de fondeo.' :
                 pts >= 350 ? 'Ancla con suerte.' : 'Garreando por la vida.';
    $('finale-kicker').textContent = st.incidents.length ? 'BORNEO CON SUSTOS' : 'FONDEO SEGURO';
    $('finale-title').textContent = rank;
    $('finale-score').textContent = `${pts} PTS`;
    $('finale-detail').innerHTML =
      `${st.incidents.length} INCIDENTES · ${garreos} GARREOS · ${st.rejects} INTENTOS INVALIDOS` +
      (st.incidents.length ? `<br>${st.incidents.join('<br>')}` : '');
    finale.hidden = false;
    void safe;
    updateHud();
  };

  // ---------- HUD ----------
  const updateHud = () => {
    hudShip.textContent = `${Math.min(st.placed.length + 1, 3)}/3`;
    hudG.textContent = st.g;
    hudScore.textContent = st.score;
  };

  const setG = (g) => {
    st.g = Math.max(G_MIN, Math.min(G_MAX, g));
    updateHud();
  };

  // ---------- flujo ----------
  const reset = () => {
    st.placed = [];
    st.g = 4; st.rejects = 0; st.score = 0;
    st.sweep = 0; st.incidents = [];
    st.phase = 'intro';
    buildChart();
    st.ghost.style.display = '';
    testBtn.hidden = true;
    finale.hidden = true;
    alarm.hidden = true;
    const rose = document.getElementById('windrose');
    if (rose) rose.remove();
    intro.hidden = false;
    probe.textContent = 'PROF -- M · MINIMO -- GRILLETES';
    hudStatus.textContent = 'ELIGE DONDE SOLTAR EL ANCLA Y CUANTA CADENA LARGAR';
    updateHud();
  };

  const startGame = () => {
    intro.hidden = true;
    if (st.phase !== 'intro') return;
    if (st.helpResume) { st.helpResume = false; st.phase = 'place'; }
    else st.phase = 'place';
  };

  const openHelp = () => {
    if (st.phase !== 'place') return;
    st.phase = 'intro';
    st.helpResume = true;
    intro.hidden = false;
  };

  // ---------- entrada ----------
  svg.addEventListener('pointermove', (e) => moveGhost(e.clientX, e.clientY));
  svg.addEventListener('click', (e) => dropAnchor(e.clientX, e.clientY));
  svg.addEventListener('wheel', (e) => { e.preventDefault(); setG(st.g + (e.deltaY < 0 ? 1 : -1)); }, { passive: false });
  $('g-plus').addEventListener('click', () => setG(st.g + 1));
  $('g-minus').addEventListener('click', () => setG(st.g - 1));
  document.addEventListener('keydown', (e) => {
    const k = e.key.toLowerCase();
    if (k === 'r') { reset(); return; }
    if (k === 'h') { if (intro.hidden) openHelp(); else startGame(); return; }
    if ((k === 'enter' || k === ' ') && !intro.hidden) { e.preventDefault(); startGame(); return; }
    if (k === 'enter' && st.phase === 'over' && !finale.hidden) { reset(); return; }
    if (k === '+' || k === '=') setG(st.g + 1);
    if (k === '-') setG(st.g - 1);
  });
  testBtn.addEventListener('click', runTest);
  $('start').addEventListener('click', startGame);
  $('help').addEventListener('click', openHelp);
  $('restart').addEventListener('click', reset);
  window.addEventListener('resize', reset);

  // ---------- loop ----------
  let last = performance.now();
  const tick = (now) => {
    requestAnimationFrame(tick);
    const dt = Math.max(0, Math.min((now - last) / 1000, 0.05));
    last = now;
    if (st.phase === 'test') testFrame(dt);
  };

  reset();
  requestAnimationFrame(tick);
})();
