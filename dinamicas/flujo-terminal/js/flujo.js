/* ============================================================
   VISUAL FLUJO DE TERMINAL 3D — motor
   Ciclo de descarga animado: BUQUE -> STS -> TRACTOR -> RTG -> PILA
   Todo CSS 3D. Dos tractores en circuito, pilas que crecen y
   reinicio automatico al vaciar la cubierta.
   ============================================================ */

(() => {
  // ---------- ritmo y escala ----------
  const SPEED = 1.0;            // multiplicador global de velocidad
  const CW = 90, CH = 38, CD = 44;   // contenedor (ancho, alto, fondo)
  const PALETTE = ['#EE7523', '#009BDE', '#FFC627', '#54BBAB', '#b3422c', '#5b6770'];

  // posiciones clave del layout
  const SHIP_X = [-190, -90, 10];     // columnas de la cubierta
  const SHIP_Z = [-492, -444];        // filas de la cubierta
  const DECK_Y = -120;                // altura de cubierta
  const ROAD_Z = 140;                 // carril de tractores en muelle
  const LANE_X = 470;                 // avenida muelle -> patio
  const RTG_LANE_Z = 395;             // carril de camion bajo la RTG
  const BAY_X = [560, 650, 740, 830]; // bahias del bloque
  const ROW_Z = [470, 545];           // filas de estiba
  const PARK = [[-420, ROAD_Z], [-540, ROAD_Z]]; // descanso de tractores

  const STS_CARRY = -252, RTG_CARRY = -212;
  const TRACTOR_BED = -26;            // altura de la cama del tractor

  // ---------- helpers DOM 3D ----------
  const world = document.getElementById('world');
  const $ = (id) => document.getElementById(id);

  const group = (parent) => {
    const g = document.createElement('div');
    parent.appendChild(g);
    return g;
  };

  const shade = (hex, f) => {
    const n = parseInt(hex.slice(1), 16);
    const c = (v) => Math.max(0, Math.min(255, Math.round(v * f)));
    return `rgb(${c(n >> 16)}, ${c((n >> 8) & 255)}, ${c(n & 255)})`;
  };

  // caja con base en yBase: (x,z) centro, w ancho, h alto, d fondo
  const makeBox = (parent, x, z, w, h, d, color, yBase = 0) => {
    const g = group(parent);
    g.style.transform = `translate3d(${x}px, ${yBase}px, ${z}px)`;
    const face = (fw, fh, t, f) => {
      const el = document.createElement('i');
      el.style.cssText = `width:${fw}px;height:${fh}px;left:${-fw / 2}px;top:${-fh}px;transform:${t};background:${shade(color, f)};`;
      g.appendChild(el);
    };
    face(w, h, `translateZ(${d / 2}px)`, 1.0);
    face(w, h, `translateZ(${-d / 2}px) rotateY(180deg)`, 0.72);
    face(d, h, `rotateY(90deg) translateZ(${w / 2}px)`, 0.86);
    face(d, h, `rotateY(-90deg) translateZ(${w / 2}px)`, 0.78);
    const top = document.createElement('i');
    top.style.cssText = `width:${w}px;height:${d}px;left:${-w / 2}px;top:${-h - d / 2}px;transform:translateY(${d / 2}px) rotateX(90deg);background:${shade(color, 1.14)};`;
    g.appendChild(top);
    return g;
  };

  // ---------- tween engine (con pausa global) ----------
  let paused = false;
  const tweens = [];
  const easeIO = (t) => t * t * (3 - 2 * t);
  const tween = (o, p, to, ms, ease = easeIO) => new Promise((res) => {
    tweens.push({ o, p, from: o[p], to, t: 0, ms: ms / SPEED, ease, res });
  });
  const sleep = (ms) => tween({ v: 0 }, 'v', 1, ms, (t) => t);

  // ---------- escena estatica ----------
  const sea = document.createElement('div');
  sea.className = 'sea-plane';
  world.appendChild(sea);
  const dock = document.createElement('div');
  dock.className = 'dock-plane';
  world.appendChild(dock);

  // buque (grupo con vaiven; los contenedores a bordo NO van aqui
  // para que el agarre de la grua sea estable)
  const shipG = group(world);
  shipG.className = 'ship-bob';
  makeBox(shipG, -50, -470, 760, 95, 150, '#27486b', -28);   // casco
  makeBox(shipG, -50, -470, 790, 18, 168, '#9aa7b5', -122);  // borda/cubierta
  makeBox(shipG, 290, -470, 110, 150, 120, '#e8edf2', -140); // puente
  makeBox(shipG, 290, -470, 36, 26, 36, '#c23b2e', -290);    // chimenea
  makeBox(world, -50, -560, 700, 8, 10, '#16304f', -116);    // barandal lado mar

  // bolardos y defensas del cantil
  for (let bx = -500; bx <= 1000; bx += 180) {
    makeBox(world, bx, -195, 26, 16, 26, '#2c3a4d');
  }

  // bloque de patio: marcas de bahia
  BAY_X.forEach((bx) => ROW_Z.forEach((rz) => {
    const m = document.createElement('i');
    m.style.cssText = `width:${CW + 14}px;height:${CD + 14}px;left:${bx - (CW + 14) / 2}px;top:${-(CD + 14) / 2}px;transform:translate3d(0px, -1px, ${rz}px) rotateX(90deg);background:transparent;border:3px dashed rgba(0,46,109,0.35);`;
    world.appendChild(m);
  }));

  // pilas decorativas al fondo del patio
  for (let i = 0; i < 6; i++) {
    const bx = 540 + i * 95;
    makeBox(world, bx, 700, CW, CH, CD, PALETTE[i % PALETTE.length]);
    if (i % 2 === 0) makeBox(world, bx, 700, CW, CH, CD, PALETTE[(i + 3) % PALETTE.length], -CH);
  }

  // ---------- grua STS ----------
  const sts = { x: SHIP_X[1], tz: ROAD_Z, sy: STS_CARRY };
  const stsG = group(world);
  makeBox(stsG, -70, -40, 30, 330, 30, '#0b78c2');           // patas lado mar
  makeBox(stsG, 70, -40, 30, 330, 30, '#0b78c2');
  makeBox(stsG, -70, 190, 30, 330, 30, '#085a91');           // patas lado tierra
  makeBox(stsG, 70, 190, 30, 330, 30, '#085a91');
  makeBox(stsG, 0, 75, 170, 26, 300, '#0b78c2', -330);       // portal
  makeBox(stsG, 0, -180, 46, 24, 820, '#0b78c2', -356);      // pluma sobre el buque
  makeBox(stsG, 0, 210, 60, 60, 60, '#085a91', -380);        // maquinaria
  const stsTrolleyG = group(stsG);                            // viaja en z
  makeBox(stsTrolleyG, 0, 0, 64, 22, 70, '#EE7523', 4);      // trolley
  const stsCables = [-30, 30].map((cx) => {
    const c = document.createElement('i');
    c.style.cssText = `width:3px;left:${cx}px;top:0;background:#16304f;transform:translateZ(0px);`;
    stsTrolleyG.appendChild(c);
    return c;
  });
  const stsSpreaderG = group(stsTrolleyG);
  makeBox(stsSpreaderG, 0, 0, CW + 10, 10, CD + 6, '#FFC627', 0);

  // ---------- RTG ----------
  const rtg = { x: BAY_X[1], tz: RTG_LANE_Z, sy: RTG_CARRY };
  const rtgG = group(world);
  makeBox(rtgG, -60, 358, 22, 270, 22, '#0b78c2');
  makeBox(rtgG, 60, 358, 22, 270, 22, '#0b78c2');
  makeBox(rtgG, -60, 600, 22, 270, 22, '#0b78c2');
  makeBox(rtgG, 60, 600, 22, 270, 22, '#0b78c2');
  makeBox(rtgG, -60, 479, 16, 14, 250, '#085a91', -270);     // vigas laterales
  makeBox(rtgG, 60, 479, 16, 14, 250, '#085a91', -270);
  makeBox(rtgG, 0, 358, 140, 18, 22, '#085a91', -252);       // travesanos
  makeBox(rtgG, 0, 600, 140, 18, 22, '#085a91', -252);
  [[-60, 358], [60, 358], [-60, 600], [60, 600]].forEach(([wx, wz]) =>
    makeBox(rtgG, wx, wz, 30, 30, 18, '#1d2837'));
  const rtgTrolleyG = group(rtgG);
  makeBox(rtgTrolleyG, 0, 0, 70, 18, 60, '#EE7523', 4);
  const rtgCables = [-26, 26].map((cx) => {
    const c = document.createElement('i');
    c.style.cssText = `width:3px;left:${cx}px;top:0;background:#16304f;`;
    rtgTrolleyG.appendChild(c);
    return c;
  });
  const rtgSpreaderG = group(rtgTrolleyG);
  makeBox(rtgSpreaderG, 0, 0, CW + 10, 10, CD + 6, '#FFC627', 0);

  // ---------- tractores ----------
  const makeTractor = (px, pz) => {
    const g = group(world);
    makeBox(g, -12, 0, 96, 10, 48, '#38465c', -16);          // cama
    makeBox(g, 48, 0, 32, 36, 46, '#002E6D', -10);           // cabina
    makeBox(g, 56, 0, 14, 12, 34, '#9fd8ff', -34);           // parabrisas
    [[-40, -20], [-40, 20], [36, -20], [36, 20]].forEach(([wx, wz]) =>
      makeBox(g, wx, wz, 16, 16, 10, '#10151f'));
    return { g, x: px, z: pz, rot: 0, free: true, cont: null };
  };
  const tractors = [makeTractor(...PARK[0]), makeTractor(...PARK[1])];

  // ---------- contenedores ----------
  const conts = [];
  let jobIdx = 0;
  SHIP_Z.forEach((sz, zi) => SHIP_X.forEach((sx, xi) => {
    for (let tier = 0; tier < 2; tier++) {
      const g = group(world);
      makeBox(g, 0, 0, CW, CH, CD, PALETTE[(xi + zi * 3 + tier) % PALETTE.length]);
      conts.push({ g, x: sx, y: DECK_Y - tier * CH, z: sz, rot: 0, stage: 'ship', shipPos: [sx, DECK_Y - tier * CH, sz], tier });
    }
  }));
  // se descargan primero los de arriba
  const QUEUE = [...conts].sort((a, b) => b.tier - a.tier);

  // celdas de estiba (se llenan por niveles)
  const CELLS = [];
  for (let tier = 0; tier < 2; tier++)
    ROW_Z.forEach((rz) => BAY_X.forEach((bx) => CELLS.push({ x: bx, z: rz, tier })));

  // ---------- contadores de etapa ----------
  const stages = { ship: conts.length, sts: 0, tractor: 0, rtg: 0, yard: 0 };
  let turno = 1, done = 0;
  const setStage = (c, s) => {
    stages[c.stage]--;
    c.stage = s;
    stages[s]++;
    ['ship', 'sts', 'tractor', 'rtg', 'yard'].forEach((k) => {
      $(`n-${k}`).textContent = String(stages[k]);
      document.querySelector(`.step[data-stage="${k}"]`)
        .classList.toggle('is-active', k !== 'ship' && k !== 'yard' && stages[k] > 0);
    });
    $('hud-mov').textContent =
      `MOV ${String(Math.min(done + 1, conts.length)).padStart(2, '0')}/${String(conts.length).padStart(2, '0')} · TURNO ${turno}`;
  };
  setStage(conts[0], 'ship'); // refresca HUD sin alterar conteos

  // ---------- circuito del tractor ----------
  const drive = async (tr, points, speed = 175) => {
    for (const [px, pz] of points) {
      const dx = px - tr.x, dz = pz - tr.z;
      const dist = Math.hypot(dx, dz);
      if (dist < 2) continue;
      const facing = -Math.atan2(dz, dx) * 180 / Math.PI;
      let target = facing;
      while (target - tr.rot > 180) target -= 360;
      while (target - tr.rot < -180) target += 360;
      await tween(tr, 'rot', target, 280);
      await Promise.all([
        tween(tr, 'x', px, (dist / speed) * 1000, (t) => t),
        tween(tr, 'z', pz, (dist / speed) * 1000, (t) => t)
      ]);
    }
  };

  // ---------- orquestacion ----------
  const rtgQueue = [];

  const stsCycle = async (cont, tr) => {
    setStage(cont, 'ship'); // refresca HUD
    $('hud-status').textContent = 'STS POSICIONANDO SOBRE EL BUQUE';
    // la grua viaja a la columna y el tractor llega al carril
    await Promise.all([
      tween(sts, 'x', cont.shipPos[0], 1500),
      drive(tr, [[cont.shipPos[0], ROAD_Z]])
    ]);
    await tween(sts, 'tz', cont.shipPos[2], 1300);
    await tween(sts, 'sy', cont.shipPos[1] - CH, 1100);       // bajar al tope
    cont.owner = 'sts';
    setStage(cont, 'sts');
    $('hud-status').textContent = 'IZANDO DESDE LA CUBIERTA';
    await tween(sts, 'sy', STS_CARRY, 1100);
    await tween(sts, 'tz', ROAD_Z, 1500);
    $('hud-status').textContent = 'BAJANDO AL TRACTOR';
    await tween(sts, 'sy', TRACTOR_BED - CH, 1100);
    cont.owner = 'tractor';
    cont.trRef = tr;
    tr.cont = cont;
    setStage(cont, 'tractor');
    await tween(sts, 'sy', STS_CARRY, 900);
  };

  const tractorJob = async (tr, cont, cell) => {
    $('hud-status').textContent = 'TRACTOR EN RUTA AL BLOQUE';
    await drive(tr, [[LANE_X, ROAD_Z], [LANE_X, RTG_LANE_Z], [cell.x, RTG_LANE_Z]]);
    await new Promise((res) => rtgQueue.push({ tr, cont, cell, res }));
    // descargado: regresa a descansar
    await drive(tr, [[LANE_X, RTG_LANE_Z], [LANE_X, ROAD_Z], PARK[tractors.indexOf(tr)]]);
    tr.free = true;
  };

  const rtgLoop = async () => {
    while (done < conts.length) {
      while (!rtgQueue.length) await sleep(120);
      const { tr, cont, cell, res } = rtgQueue.shift();
      await Promise.all([
        tween(rtg, 'x', cell.x, 1400),
        tween(rtg, 'tz', RTG_LANE_Z, 1000)
      ]);
      await tween(rtg, 'sy', TRACTOR_BED - CH, 1000);
      cont.owner = 'rtg';
      setStage(cont, 'rtg');
      tr.cont = null;
      res(); // el tractor puede irse
      $('hud-status').textContent = 'RTG ESTIBANDO EN EL BLOQUE';
      await tween(rtg, 'sy', RTG_CARRY, 900);
      await tween(rtg, 'tz', cell.z, 1100);
      const topY = -(cell.tier + 1) * CH;
      await tween(rtg, 'sy', topY, 1000);
      cont.owner = null;
      cont.x = cell.x; cont.y = -cell.tier * CH; cont.z = cell.z; cont.rot = 0;
      setStage(cont, 'yard');
      done++;
      await tween(rtg, 'sy', RTG_CARRY, 800);
    }
  };

  const stsLoop = async () => {
    for (const cont of QUEUE) {
      // espera un tractor libre
      let tr;
      while (!(tr = tractors.find((t) => t.free))) await sleep(150);
      tr.free = false;
      const cell = CELLS[jobIdx++];
      await stsCycle(cont, tr);
      tractorJob(tr, cont, cell); // sin await: el ciclo se traslapa
    }
  };

  const runShift = async () => {
    await Promise.all([stsLoop(), rtgLoop()]);
    // turno completo
    $('hud-status').textContent = 'CUBIERTA VACIA';
    $('cycle-sub').textContent = `${conts.length} MOVIMIENTOS · EL BUQUE ZARPA Y LLEGA EL SIGUIENTE`;
    $('cycle-banner').hidden = false;
    await sleep(3600);
    $('cycle-banner').hidden = true;
    // reinicio: los contenedores vuelven a la cubierta
    conts.forEach((c) => {
      [c.x, c.y, c.z] = c.shipPos;
      c.rot = 0; c.owner = null;
      stages[c.stage]--; c.stage = 'ship'; stages.ship++;
    });
    done = 0; jobIdx = 0; turno++;
    setStage(conts[0], 'ship');
    runShift();
  };

  // ---------- camara cinematica ----------
  // calibracion: ancla (cx,cz) hacia el mar y pitch moderado;
  // pitch alto con ancla en tierra voltea la camara bajo el plano
  const VIEWS = [
    { yaw: -26, pitch: 28, zoom: -560, cx: 360, cz: -40 },   // general
    { yaw: -42, pitch: 22, zoom: 120, cx: -60, cz: -200 },    // muelle / STS
    { yaw: 10, pitch: 30, zoom: -60, cx: 260, cz: 60 },       // circuito
    { yaw: 30, pitch: 28, zoom: 0, cx: 660, cz: 200 }         // patio / RTG
  ];
  const cam = { ...VIEWS[0] };
  let view = 0, viewTimer = 0, manualHold = 0;
  let yawOff = 0, pitchOff = 0, wantYaw = 0, wantPitch = 0, dragging = false;

  let px2 = 0, py2 = 0;
  document.addEventListener('pointerdown', (e) => {
    dragging = true;
    px2 = e.clientX; py2 = e.clientY;
    document.body.classList.add('is-orbiting');
    manualHold = 7;
  });
  document.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    wantYaw = Math.max(-80, Math.min(80, wantYaw + (e.clientX - px2) * 0.22));
    wantPitch = Math.max(-26, Math.min(30, wantPitch - (e.clientY - py2) * 0.12));
    px2 = e.clientX; py2 = e.clientY;
    manualHold = 7;
  });
  ['pointerup', 'pointercancel'].forEach((ev) =>
    document.addEventListener(ev, () => {
      dragging = false;
      document.body.classList.remove('is-orbiting');
    }));

  document.addEventListener('keydown', (e) => {
    const k = e.key;
    if (k >= '1' && k <= '4') { view = +k - 1; viewTimer = 0; manualHold = 14; }
    if (k === ' ') {
      e.preventDefault();
      paused = !paused;
      document.body.classList.toggle('is-paused', paused);
      $('hud-status').textContent = paused ? 'EN PAUSA' : 'OPERANDO';
    }
    if (k.toLowerCase() === 'r') location.reload();
  });

  // ---------- render ----------
  const render = (dt) => {
    // tweens
    for (let i = tweens.length - 1; i >= 0; i--) {
      const tw = tweens[i];
      tw.t += dt * 1000;
      const k = Math.min(tw.t / tw.ms, 1);
      tw.o[tw.p] = tw.from + (tw.to - tw.from) * tw.ease(k);
      if (k >= 1) { tweens.splice(i, 1); tw.res(); }
    }

    // STS
    stsG.style.transform = `translate3d(${sts.x}px, 0px, 0px)`;
    stsTrolleyG.style.transform = `translate3d(0px, -300px, ${sts.tz}px)`;
    const stsLen = sts.sy + 300;
    stsCables.forEach((c) => { c.style.height = `${Math.max(6, stsLen)}px`; });
    stsSpreaderG.style.transform = `translate3d(0px, ${stsLen}px, 0px)`;

    // RTG
    rtgG.style.transform = `translate3d(${rtg.x}px, 0px, 0px)`;
    rtgTrolleyG.style.transform = `translate3d(0px, -250px, ${rtg.tz}px)`;
    const rtgLen = rtg.sy + 250;
    rtgCables.forEach((c) => { c.style.height = `${Math.max(6, rtgLen)}px`; });
    rtgSpreaderG.style.transform = `translate3d(0px, ${rtgLen}px, 0px)`;

    // tractores
    tractors.forEach((tr) => {
      tr.g.style.transform = `translate3d(${tr.x}px, 0px, ${tr.z}px) rotateY(${tr.rot}deg)`;
    });

    // contenedores
    conts.forEach((c) => {
      if (c.owner === 'sts') {
        c.x = sts.x; c.z = sts.tz; c.y = sts.sy + CH; c.rot = 0;
      } else if (c.owner === 'rtg') {
        c.x = rtg.x; c.z = rtg.tz; c.y = rtg.sy + CH; c.rot = 0;
      } else if (c.owner === 'tractor' && c.trRef) {
        c.x = c.trRef.x - 12 * Math.cos(c.trRef.rot * Math.PI / 180);
        c.z = c.trRef.z + 12 * Math.sin(c.trRef.rot * Math.PI / 180);
        c.y = TRACTOR_BED; c.rot = c.trRef.rot;
      }
      c.g.style.transform = `translate3d(${c.x}px, ${c.y}px, ${c.z}px) rotateY(${c.rot}deg)`;
    });

    // camara
    viewTimer += dt;
    if (manualHold > 0) manualHold -= dt;
    else if (viewTimer > 13) { viewTimer = 0; view = (view + 1) % VIEWS.length; }
    if (!dragging && manualHold <= 0) { wantYaw *= 0.97; wantPitch *= 0.97; }
    yawOff += (wantYaw - yawOff) * Math.min(1, dt * 6);
    pitchOff += (wantPitch - pitchOff) * Math.min(1, dt * 6);

    const v = VIEWS[view];
    cam.yaw += (v.yaw - cam.yaw) * Math.min(1, dt * 1.6);
    cam.pitch += (v.pitch - cam.pitch) * Math.min(1, dt * 1.6);
    cam.zoom += (v.zoom - cam.zoom) * Math.min(1, dt * 1.6);
    cam.cx += (v.cx - cam.cx) * Math.min(1, dt * 1.6);
    cam.cz += (v.cz - cam.cz) * Math.min(1, dt * 1.6);

    const pitch = Math.max(8, Math.min(30, cam.pitch + pitchOff));
    world.style.transform =
      `scale(0.5) translateZ(${cam.zoom}px) rotateX(${pitch}deg) rotateY(${cam.yaw + yawOff}deg) ` +
      `translate3d(${-cam.cx}px, 520px, ${-cam.cz}px)`;
  };

  let last = performance.now();
  const frame = (now) => {
    requestAnimationFrame(frame);
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    render(paused ? 0 : dt);
  };

  render(0); // primer cuadro sincrono: la camara queda encuadrada de inmediato
  requestAnimationFrame(frame);
  runShift();
})();
