/* ============================================================
   DINAMICA ATRACA EL BUQUE — motor
   Fisica naval simplificada pero honesta: el buque tiene inercia,
   el timon solo muerde con arrancada, los remolcadores empujan de
   costado y el viento (niveles 2-3) te deriva. Hay que quedar
   dentro de la bahia, alineado y a menos de 1.5 nudos.
   ============================================================ */

(() => {
  // ---------- niveles (editables) ----------
  const LEVELS = [
    { name: 'BAHIA FRANCA', berthCx: 0.5, berthW: 300, gap: 0.34, wind: 0, windDir: 0 },
    { name: 'VIENTO DE TRAVES', berthCx: 0.66, berthW: 250, gap: 0.30, wind: 14, windDir: 0 },
    { name: 'MANIOBRA CERRADA', berthCx: 0.32, berthW: 215, gap: 0.24, wind: 19, windDir: Math.PI * 0.82 }
  ];

  const KN = 22;             // px/s por nudo
  const DOCK_KN = 1.5;       // velocidad maxima de atraque
  const CRASH_KN = 2.6;      // arriba de esto, golpe = casco
  const SHIP_L = 144, SHIP_W = 42;

  const SHIP_SVG = `
    <svg viewBox="0 0 100 40" xmlns="http://www.w3.org/2000/svg">
      <path d="M 6 11 L 64 11 Q 85 11 95.5 20 Q 85 29 64 29 L 6 29 Q 1.5 29 1.5 24 L 1.5 16 Q 1.5 11 6 11 Z"
            fill="#002E6D" stroke="#001638" stroke-width="1.6"/>
      <path d="M 9 14 L 62 14 Q 79 14 88 20 Q 79 26 62 26 L 9 26 Q 5 26 5 22.5 L 5 17.5 Q 5 14 9 14 Z"
            fill="#0d4486"/>
      <g stroke="#001638" stroke-width="0.7">
        <rect x="22" y="14.6" width="8.6" height="5" rx="0.6" fill="#EE7523"/>
        <rect x="31.6" y="14.6" width="8.6" height="5" rx="0.6" fill="#009BDE"/>
        <rect x="41.2" y="14.6" width="8.6" height="5" rx="0.6" fill="#FFC627"/>
        <rect x="50.8" y="14.6" width="8.6" height="5" rx="0.6" fill="#54BBAB"/>
        <rect x="60.4" y="14.6" width="8.6" height="5" rx="0.6" fill="#EE7523"/>
        <rect x="22" y="20.4" width="8.6" height="5" rx="0.6" fill="#54BBAB"/>
        <rect x="31.6" y="20.4" width="8.6" height="5" rx="0.6" fill="#FFC627"/>
        <rect x="41.2" y="20.4" width="8.6" height="5" rx="0.6" fill="#EE7523"/>
        <rect x="50.8" y="20.4" width="8.6" height="5" rx="0.6" fill="#009BDE"/>
        <rect x="60.4" y="20.4" width="8.6" height="5" rx="0.6" fill="#9ACAEB"/>
      </g>
      <rect x="7.5" y="13" width="11" height="14" rx="1.4" fill="#f6f8fb" stroke="#001638" stroke-width="1"/>
      <circle cx="13" cy="20" r="1.7" fill="#EE7523" stroke="#001638" stroke-width="0.7"/>
    </svg>`;

  // ---------- DOM ----------
  const $ = (id) => document.getElementById(id);
  const harbor = $('harbor');
  const gSpeed = $('g-speed'), gRudder = $('g-rudder'), gHits = $('g-hits'), gTime = $('g-time');
  const hudStatus = $('hud-status');
  const windBox = $('wind'), windArrow = $('wind-arrow');
  const toast = $('toast'), finale = $('finale');

  let toastTimer = 0;
  const say = (msg) => {
    toast.hidden = false;
    toast.textContent = msg;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { toast.hidden = true; }, 2400);
  };

  // ---------- estado ----------
  let W = 0, H = 0;
  let level = 0, totalScore = 0;
  let obstacles = [];       // rects {x,y,w,h}
  let berth = null;         // rect
  let bollards = [];
  let shipEl = null, berthEl = null;
  const st = {
    x: 0, y: 0, h: Math.PI / 2, v: 0, u: 0,
    rud: 0, rudT: 0,
    hits: 0, t: 0, dockHold: 0,
    phase: 'sail'           // sail | docked | failed
  };
  const keys = {};

  // ---------- construir nivel ----------
  const div = (cls, css) => {
    const d = document.createElement('div');
    d.className = cls;
    Object.assign(d.style, css);
    harbor.appendChild(d);
    return d;
  };

  const buildLevel = () => {
    harbor.innerHTML = '';
    obstacles = [];
    bollards = [];
    W = window.innerWidth; H = window.innerHeight;
    const L = LEVELS[level];

    // muelle (franja inferior)
    const quayTop = H * 0.86;
    div('quay', { left: '0', top: `${quayTop}px`, width: `${W}px`, height: `${H - quayTop}px` });
    obstacles.push({ x: -50, y: quayTop, w: W + 100, h: H });

    // bahia de atraque
    const bW = L.berthW, bH = 72;
    const bX = W * L.berthCx - bW / 2;
    const bY = quayTop - bH;
    berth = { x: bX, y: bY, w: bW, h: bH };
    berthEl = div('berth', { left: `${bX}px`, top: `${bY}px`, width: `${bW}px`, height: `${bH}px` });
    berthEl.innerHTML = '<span>BAHIA</span>';

    // bolardos
    for (let bx = 30; bx < W; bx += 90) {
      div('bollard', { left: `${bx}px`, top: `${quayTop + 10}px` });
      if (Math.abs(bx - (bX + bW / 2)) < bW / 2 + 40) bollards.push([bx + 6, quayTop + 16]);
    }

    // buques atracados a los lados de la bahia
    const parked = (cx, w2) => {
      const ph = 54;
      const p = div('parked', {
        left: `${cx - w2 / 2}px`, top: `${quayTop - ph - 6}px`,
        width: `${w2}px`, height: `${ph}px`
      });
      p.innerHTML = SHIP_SVG;
      obstacles.push({ x: cx - w2 / 2, y: quayTop - ph - 6, w: w2, h: ph });
    };
    if (bX - 40 > 150) parked((bX - 20) / 2 + 10, Math.min(280, bX - 60));
    if (W - (bX + bW) - 40 > 150) parked(bX + bW + 20 + (W - bX - bW - 40) / 2, Math.min(280, W - bX - bW - 60));

    // rompeolas con bocana
    const bwY = H * 0.4, bwH = 26;
    const gapW = W * L.gap;
    const gapX = W * 0.5 - gapW / 2;
    div('breakwater', { left: '-20px', top: `${bwY}px`, width: `${gapX + 20}px`, height: `${bwH}px` });
    div('breakwater', { left: `${gapX + gapW}px`, top: `${bwY}px`, width: `${W - gapX - gapW + 20}px`, height: `${bwH}px` });
    obstacles.push({ x: -20, y: bwY, w: gapX + 20, h: bwH });
    obstacles.push({ x: gapX + gapW, y: bwY, w: W - gapX - gapW + 20, h: bwH });

    // boyas de la bocana
    div('buoy buoy--green', { left: `${gapX + 14}px`, top: `${bwY + bwH / 2}px` });
    div('buoy buoy--red', { left: `${gapX + gapW - 14}px`, top: `${bwY + bwH / 2}px` });

    // buque del jugador
    shipEl = div('ship', {});
    shipEl.innerHTML = SHIP_SVG;

    // estado inicial: arriba, enfilando hacia abajo
    st.x = W * 0.5; st.y = H * 0.14;
    st.h = Math.PI / 2; st.v = 0; st.u = 0;
    st.rud = 0; st.rudT = 0;
    st.hits = 0; st.t = 0; st.dockHold = 0;
    st.phase = 'sail';

    // viento
    if (L.wind > 0) {
      windBox.hidden = false;
      windArrow.style.transform = `rotate(${(L.windDir * 180) / Math.PI}deg)`;
    } else {
      windBox.hidden = true;
    }

    hudStatus.textContent = `NIVEL ${level + 1} · ${L.name} — ENTRA POR LA BOCANA Y ATRACA EN LA BAHIA`;
    finale.hidden = true;
  };

  // ---------- resultado ----------
  const finish = (ok, dockKn) => {
    st.phase = ok ? 'docked' : 'failed';
    const L = LEVELS[level];

    if (ok) {
      // amarras hacia los bolardos cercanos
      bollards.slice(0, 4).forEach((b) => {
        const dx = b[0] - st.x, dy = b[1] - st.y;
        const len = Math.hypot(dx, dy);
        const m = div('mooring', {
          left: `${st.x}px`, top: `${st.y}px`, width: `${len}px`
        });
        m.style.setProperty('--ang', `${Math.atan2(dy, dx)}rad`);
        m.style.transform = `rotate(${Math.atan2(dy, dx)}rad)`;
      });

      const score = Math.max(0, Math.round(
        1000 - st.t * 6 - st.hits * 180 - dockKn * 220 +
        (Math.abs(normAng(st.h)) < 0.07 ? 120 : 0)
      ));
      totalScore += score;
      const rank = score >= 880 ? 'Practico mayor.' :
                   score >= 680 ? 'Capitan de altura.' :
                   score >= 420 ? 'Primer oficial.' : 'Timonel en practicas.';

      $('finale-kicker').textContent = `NIVEL ${level + 1} COMPLETADO · ${L.name}`;
      $('finale-title').textContent = rank;
      $('finale-score').textContent = `${score} PTS`;
      $('finale-detail').textContent =
        `LLEGADA ${dockKn.toFixed(1)} KN · ${st.hits} CASCOS · ${fmtTime(st.t)}` +
        (level === LEVELS.length - 1 ? ` — TOTAL DE LA MANIOBRA: ${totalScore} PTS` : '');
      $('btn-next').hidden = level >= LEVELS.length - 1;
    } else {
      $('finale-kicker').textContent = `NIVEL ${level + 1} · ${L.name}`;
      $('finale-title').textContent = 'Maniobra abortada.';
      $('finale-score').textContent = '3 CASCOS';
      $('finale-detail').textContent = 'EL PRACTICO TOMO EL CONTROL. REPITE EL NIVEL.';
      $('btn-next').hidden = true;
    }
    finale.hidden = false;
  };

  const normAng = (a) => {
    // distancia angular a la horizontal (atracar mirando a babor o estribor da igual)
    let x = a % Math.PI;
    if (x > Math.PI / 2) x -= Math.PI;
    if (x < -Math.PI / 2) x += Math.PI;
    return x;
  };
  const fmtTime = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

  // ---------- entrada ----------
  const KEYMAP = {
    a: 'left', arrowleft: 'left',
    d: 'right', arrowright: 'right',
    w: 'fwd', arrowup: 'fwd',
    s: 'rev', arrowdown: 'rev',
    q: 'tugl', e: 'tugr'
  };
  document.addEventListener('keydown', (e) => {
    const k = e.key.toLowerCase();
    if (KEYMAP[k]) { e.preventDefault(); keys[KEYMAP[k]] = true; }
    if (k === 'r') { if (st.phase !== 'sail') { buildLevel(); } else { say('INTENTO REINICIADO'); buildLevel(); } }
    if (k === 'enter' && st.phase === 'docked' && level < LEVELS.length - 1) {
      level++; buildLevel();
    }
  });
  document.addEventListener('keyup', (e) => {
    const k = e.key.toLowerCase();
    if (KEYMAP[k]) keys[KEYMAP[k]] = false;
  });

  document.querySelectorAll('.cbtn').forEach((b) => {
    const k = b.dataset.k;
    const press = (e) => { e.preventDefault(); b.classList.add('is-press'); keys[k] = true; };
    const release = () => { b.classList.remove('is-press'); keys[k] = false; };
    b.addEventListener('pointerdown', press);
    b.addEventListener('pointerup', release);
    b.addEventListener('pointerleave', release);
    b.addEventListener('pointercancel', release);
  });

  $('btn-retry').addEventListener('click', buildLevel);
  $('btn-next').addEventListener('click', () => { level++; buildLevel(); });

  window.addEventListener('resize', () => { if (st.phase === 'sail') buildLevel(); });

  // ---------- colision ----------
  const corners = () => {
    const c = Math.cos(st.h), s = Math.sin(st.h);
    const hx = c * SHIP_L / 2, hy = s * SHIP_L / 2;
    const px2 = -s * SHIP_W / 2, py2 = c * SHIP_W / 2;
    return [
      [st.x + hx + px2, st.y + hy + py2],
      [st.x + hx - px2, st.y + hy - py2],
      [st.x - hx + px2, st.y - hy + py2],
      [st.x - hx - px2, st.y - hy - py2]
    ];
  };
  const hitsObstacle = () =>
    corners().some(([cx, cy]) =>
      cx < 6 || cx > W - 6 || cy < 6 ||
      obstacles.some((r) => cx > r.x && cx < r.x + r.w && cy > r.y && cy < r.y + r.h));

  // ---------- loop ----------
  let last = performance.now();
  let wakeTimer = 0;

  const tick = (now) => {
    requestAnimationFrame(tick);
    const dt = Math.min((now - last) / 1000, 0.033);
    last = now;
    if (!shipEl) return;

    if (st.phase === 'sail') {
      st.t += dt;
      const L = LEVELS[level];

      // maquina
      if (keys.fwd) st.v = Math.min(st.v + 55 * dt, 6 * KN);
      else if (keys.rev) st.v = Math.max(st.v - 70 * dt, -2.5 * KN);
      else st.v *= Math.pow(0.55, dt);

      // timon (solo muerde con arrancada)
      st.rudT = (keys.right ? 1 : 0) - (keys.left ? 1 : 0);
      st.rud += (st.rudT - st.rud) * Math.min(1, dt * 4);
      const bite = Math.max(0.18, Math.min(Math.abs(st.v) / (6 * KN), 1));
      st.h += st.rud * 0.9 * bite * (st.v >= 0 ? 1 : -1) * dt;

      // remolcadores (empuje lateral) + chorrito visual
      const tug = (keys.tugr ? 1 : 0) - (keys.tugl ? 1 : 0);
      if (tug !== 0) {
        st.u = Math.max(-2 * KN, Math.min(2 * KN, st.u + tug * 40 * dt));
        const side = -tug;
        const jx = st.x - Math.sin(st.h) * side * 30;
        const jy = st.y + Math.cos(st.h) * side * 30;
        const j = document.createElement('i');
        j.className = 'tugjet';
        j.style.left = `${jx}px`; j.style.top = `${jy}px`;
        harbor.appendChild(j);
        setTimeout(() => j.remove(), 700);
      } else {
        st.u *= Math.pow(0.25, dt);
      }

      // viento
      const wx = Math.cos(L.windDir) * L.wind;
      const wy = Math.sin(L.windDir) * L.wind;

      const px2 = st.x, py2 = st.y;
      st.x += (Math.cos(st.h) * st.v - Math.sin(st.h) * st.u + wx) * dt;
      st.y += (Math.sin(st.h) * st.v + Math.cos(st.h) * st.u + wy) * dt;

      // colisiones
      if (hitsObstacle()) {
        const impact = Math.hypot(st.v, st.u) / KN;
        st.x = px2; st.y = py2;
        st.v *= -0.25; st.u *= -0.25;
        if (impact > CRASH_KN) {
          st.hits++;
          document.body.classList.add('shake');
          setTimeout(() => document.body.classList.remove('shake'), 500);
          say(`GOLPE A ${impact.toFixed(1)} KN — CASCO ${st.hits}/3`);
          if (st.hits >= 3) finish(false, impact);
        }
      }

      // condicion de atraque (sostenida medio segundo)
      const kn = Math.hypot(st.v, st.u) / KN;
      const inBerth = st.x > berth.x + 20 && st.x < berth.x + berth.w - 20 &&
                      st.y > berth.y + 6 && st.y < berth.y + berth.h - 26;
      const aligned = Math.abs(normAng(st.h)) < 0.21;
      const ok = inBerth && aligned && kn < DOCK_KN;
      berthEl.classList.toggle('is-good', ok);
      st.dockHold = ok ? st.dockHold + dt : 0;
      if (st.dockHold > 0.6) finish(true, kn);

      // estela
      wakeTimer -= dt;
      if (Math.abs(st.v) > 18 && wakeTimer <= 0) {
        wakeTimer = 0.1;
        const w = document.createElement('i');
        w.className = 'wake';
        w.style.left = `${st.x - Math.cos(st.h) * SHIP_L * 0.45}px`;
        w.style.top = `${st.y - Math.sin(st.h) * SHIP_L * 0.45}px`;
        harbor.appendChild(w);
        setTimeout(() => w.remove(), 1900);
      }

      // HUD
      gSpeed.textContent = kn.toFixed(1);
      const rd = Math.round(st.rud * 5);
      gRudder.textContent = rd === 0 ? '0' : (rd < 0 ? `B${-rd}` : `E${rd}`);
      gHits.textContent = `${st.hits}/3`;
      gTime.textContent = fmtTime(st.t);
    }

    shipEl.style.left = `${st.x}px`;
    shipEl.style.top = `${st.y}px`;
    shipEl.style.transform = `rotate(${(st.h * 180) / Math.PI}deg)`;
  };

  buildLevel();
  requestAnimationFrame(tick);
})();
