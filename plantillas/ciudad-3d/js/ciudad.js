/* ============================================================
   PLANTILLA CIUDAD 3D — generador de avenida + camara libre
   - La ciudad (suelo, torres, ventanas, neones) se genera aqui
   - La camara vuela entre espectaculares y el usuario puede
     ARRASTRAR para mirar alrededor en cualquier momento
   ============================================================ */

(() => {
  // ---------- configuracion rapida ----------
  const SPACING = 1500;        // distancia entre espectaculares (px)
  const TOWERS_PER_BLOCK = 7;  // edificios generados por cuadra
  const WARM = '#ffd97a';      // ventanas calidas
  const COOL = '#6fd5ff';      // ventanas frias
  const NEONS = ['#22d3ee', '#f472b6', '#a3e635', '#fbbf24'];

  const world = document.getElementById('world');
  const bbs = Array.from(document.querySelectorAll('.bb'));
  const counter = document.getElementById('hud-counter');

  let current = 0;

  // ---------- suelo ----------
  const ground = document.createElement('div');
  ground.className = 'ground';
  world.prepend(ground);

  // ---------- torres ----------
  const rnd = (a, b) => a + Math.random() * (b - a);

  const makeTower = (x, z) => {
    const w = rnd(150, 330);
    const d = rnd(140, 300);
    const h = rnd(320, 980);
    const lit = Math.random() > 0.18;
    const color = Math.random() > 0.45 ? WARM : COOL;
    const alpha = lit ? rnd(0.5, 0.9) : 0.08;
    const winImg =
      `repeating-linear-gradient(0deg, rgba(5,6,15,0.92) 0 14px, transparent 14px 34px),` +
      `repeating-linear-gradient(90deg, ${color}${Math.round(alpha * 255).toString(16).padStart(2, '0')} 0 12px, rgba(5,6,15,0.9) 12px 30px)`;

    const b = document.createElement('div');
    b.className = 'bldg';
    b.style.transform = `translate3d(${x}px, 0px, ${z}px)`;

    const face = (fw, transform) => {
      const f = document.createElement('i');
      f.style.width = `${fw}px`;
      f.style.height = `${h}px`;
      f.style.left = `${-fw / 2}px`;
      f.style.transform = transform;
      f.style.setProperty('--win-img', winImg);
      b.appendChild(f);
      return f;
    };

    const front = face(w, `translateZ(${d / 2}px)`);
    face(w, `translateZ(${-d / 2}px) rotateY(180deg)`);
    face(d, `rotateY(90deg) translateZ(${w / 2}px)`);
    face(d, `rotateY(-90deg) translateZ(${w / 2}px)`);

    // neon en algunos frentes
    if (Math.random() > 0.6) {
      const n = document.createElement('div');
      n.className = 'neon';
      const nc = NEONS[Math.floor(Math.random() * NEONS.length)];
      n.style.setProperty('--neon-glow', nc);
      n.style.width = `${w * rnd(0.4, 0.8)}px`;
      n.style.height = '5px';
      n.style.left = `${w * 0.1}px`;
      n.style.top = `${rnd(30, h * 0.35)}px`;
      front.appendChild(n);
    }

    world.appendChild(b);
  };

  // genera torres a ambos lados de la avenida, por cuadra
  for (let i = 0; i <= bbs.length; i++) {
    for (let t = 0; t < TOWERS_PER_BLOCK; t++) {
      const side = Math.random() > 0.5 ? 1 : -1;
      makeTower(
        side * rnd(740, 1700),
        400 - i * SPACING - rnd(0, SPACING)
      );
    }
  }

  // ---------- espectaculares ----------
  const poses = bbs.map((bb, i) => {
    const side = i % 2 === 0 ? 1 : -1;
    const x = side * 640;
    const z = -i * SPACING;
    bb.style.left = '0';
    bb.style.top = '0';
    bb.style.marginLeft = '-380px';
    bb.style.marginTop = '-280px';
    bb.style.transform = `translate3d(${x}px, -640px, ${z}px) rotateY(${side * -16}deg)`;
    return { x, z, side };
  });

  // ---------- camara ----------
  const cam = { x: 0, y: -430, z: poses[0].z + 980, yaw: 0, pitch: 0 };
  const tgt = { x: 0, y: -430, z: poses[0].z + 980, yaw: 0 };
  let lookYaw = 0, lookPitch = 0;       // offset del arrastre
  let wantYaw = 0, wantPitch = 0;
  let dragging = false;

  const aimAt = (i) => {
    const p = poses[i];
    tgt.x = p.side * 130;
    tgt.z = p.z + 980;
    tgt.yaw = p.side * 11; // mirar levemente hacia el espectacular
  };

  const pad = (n) => String(n + 1).padStart(2, '0');
  const updateHud = () => {
    counter.textContent = `CUADRA ${pad(current)} / ${pad(bbs.length - 1)}`;
    bbs.forEach((b, i) => b.classList.toggle('is-active', i === current));
  };

  const goTo = (i) => {
    current = Math.max(0, Math.min(bbs.length - 1, i));
    aimAt(current);
    updateHud();
  };

  // ---------- loop ----------
  const render = () => {
    requestAnimationFrame(render);

    // si no esta arrastrando, la mirada regresa sola al rumbo
    if (!dragging) { wantYaw *= 0.94; wantPitch *= 0.94; }
    lookYaw += (wantYaw - lookYaw) * 0.12;
    lookPitch += (wantPitch - lookPitch) * 0.12;

    cam.x += (tgt.x - cam.x) * 0.045;
    cam.z += (tgt.z - cam.z) * 0.045;
    cam.yaw += (tgt.yaw - cam.yaw) * 0.045;

    const yaw = cam.yaw + lookYaw;
    const pitch = -3 + lookPitch; // horizonte levemente abajo

    world.style.transform =
      `rotateX(${pitch}deg) rotateY(${yaw}deg) ` +
      `translate3d(${-cam.x}px, ${-cam.y}px, ${-cam.z}px)`;
  };
  render();

  // ---------- arrastre para mirar ----------
  let px = 0, py = 0;
  document.addEventListener('pointerdown', (e) => {
    dragging = true;
    px = e.clientX; py = e.clientY;
    document.body.classList.add('is-looking');
  });
  document.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    wantYaw = Math.max(-40, Math.min(40, wantYaw + (e.clientX - px) * 0.14));
    wantPitch = Math.max(-14, Math.min(18, wantPitch + (e.clientY - py) * 0.08));
    px = e.clientX; py = e.clientY;
  });
  const endDrag = () => {
    dragging = false;
    document.body.classList.remove('is-looking');
  };
  document.addEventListener('pointerup', endDrag);
  document.addEventListener('pointercancel', endDrag);

  // ---------- navegacion ----------
  document.addEventListener('keydown', (e) => {
    switch (e.key) {
      case 'ArrowRight':
      case 'ArrowDown':
      case 'PageDown':
      case ' ':
        e.preventDefault(); goTo(current + 1); break;
      case 'ArrowLeft':
      case 'ArrowUp':
      case 'PageUp':
        e.preventDefault(); goTo(current - 1); break;
      case 'Home': e.preventDefault(); goTo(0); break;
      case 'End': e.preventDefault(); goTo(bbs.length - 1); break;
    }
  });

  let wheelLock = 0;
  document.addEventListener('wheel', (e) => {
    const now = Date.now();
    if (now - wheelLock < 900 || Math.abs(e.deltaY) < 18) return;
    wheelLock = now;
    if (e.deltaY > 0) goTo(current + 1); else goTo(current - 1);
  }, { passive: true });

  goTo(0);
})();
