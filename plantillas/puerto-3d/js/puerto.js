/* ============================================================
   PLANTILLA PUERTO 3D — constructor del diorama + camara orbital
   Todo el puerto son cajas CSS 3D con sombreado por cara.
   El usuario orbita arrastrando; la camara regresa sola a la
   estacion activa.
   ============================================================ */

(() => {
  // ---------- vistas de camara por slide ----------
  // { orbit (grados), pitch (grados), zoom (px hacia la camara), cx, cz (centro) }
  const VIEWS = [
    { orbit: -24, pitch: 14, zoom: -200, cx: 0, cz: -420 },    // buque
    { orbit: 28, pitch: 18, zoom: 60, cx: -350, cz: 80 },      // muelle
    { orbit: 6, pitch: 12, zoom: 320, cx: 330, cz: -120 },     // grua
    { orbit: 44, pitch: 46, zoom: -120, cx: 250, cz: 420 },    // patio (cenital)
    { orbit: -38, pitch: 16, zoom: 140, cx: 1280, cz: 360 }    // gate
  ];
  const NAMES = ['BUQUE', 'MUELLE', 'GRUA', 'PATIO', 'GATE'];

  const C = {
    hull: '#27486b', deck: '#9aa7b5', bridge: '#e8edf2',
    crane: '#0b78c2', craneDark: '#085a91', steel: '#2c3a4d',
    boxes: ['#b3422c', '#1f6da8', '#2e8b57', '#d18a26', '#5b6770', '#7a4ba0']
  };

  const world = document.getElementById('world');
  const panels = Array.from(document.querySelectorAll('.panel'));
  const hudStation = document.getElementById('hud-station');
  const hudCounter = document.getElementById('hud-counter');

  let current = 0;

  // ---------- helpers de geometria ----------
  const shade = (hex, f) => {
    const n = parseInt(hex.slice(1), 16);
    const ch = (v) => Math.max(0, Math.min(255, Math.round(v * f)));
    return `rgb(${ch(n >> 16)}, ${ch((n >> 8) & 255)}, ${ch(n & 255)})`;
  };

  // caja con base en el suelo: (x, z) centro, h alto, w ancho (x), d fondo (z)
  const makeBox = (parent, x, z, w, h, d, color, yBase = 0) => {
    const g = document.createElement('div');
    g.style.position = 'absolute';
    g.style.transform = `translate3d(${x}px, ${yBase}px, ${z}px)`;

    const face = (fw, fh, transform, f) => {
      const el = document.createElement('i');
      el.style.width = `${fw}px`;
      el.style.height = `${fh}px`;
      el.style.left = `${-fw / 2}px`;
      el.style.top = `${-fh}px`;
      el.style.transform = transform;
      el.style.background = shade(color, f);
      g.appendChild(el);
    };

    face(w, h, `translateZ(${d / 2}px)`, 1.0);                     // frente
    face(w, h, `translateZ(${-d / 2}px) rotateY(180deg)`, 0.72);   // atras
    face(d, h, `rotateY(90deg) translateZ(${w / 2}px)`, 0.86);     // derecha
    face(d, h, `rotateY(-90deg) translateZ(${w / 2}px)`, 0.78);    // izquierda

    // techo
    const top = document.createElement('i');
    top.style.width = `${w}px`;
    top.style.height = `${d}px`;
    top.style.left = `${-w / 2}px`;
    top.style.top = `${-h - d / 2}px`;
    top.style.transform = `translateY(${d / 2}px) rotateX(90deg)`;
    top.style.background = shade(color, 1.14);
    g.appendChild(top);

    parent.appendChild(g);
    return g;
  };

  // ---------- planos base ----------
  const sea = document.createElement('div');
  sea.className = 'sea-plane';
  world.appendChild(sea);

  const dock = document.createElement('div');
  dock.className = 'dock-plane';
  world.appendChild(dock);

  // ---------- buque (se mece) ----------
  const ship = document.createElement('div');
  ship.className = 'ship-bob';
  ship.style.position = 'absolute';
  ship.style.transform = 'translate3d(0,0,0)';
  world.appendChild(ship);

  makeBox(ship, -100, -480, 1700, 150, 330, C.hull, -10);          // casco
  makeBox(ship, -100, -480, 1740, 26, 360, C.deck, -160);          // cubierta
  makeBox(ship, 620, -480, 200, 230, 250, C.bridge, -186);         // puente
  makeBox(ship, 620, -480, 60, 40, 60, '#c23b2e', -416);           // chimenea
  // contenedores sobre cubierta
  for (let r = 0; r < 5; r++) {
    for (let c = 0; c < 2; c++) {
      const col = C.boxes[(r + c) % C.boxes.length];
      makeBox(ship, -650 + r * 230, -560 + c * 150, 200, 62, 120, col, -186);
      if ((r + c) % 2 === 0) {
        makeBox(ship, -650 + r * 230, -560 + c * 150, 200, 62, 120,
          C.boxes[(r + c + 3) % C.boxes.length], -248);
      }
    }
  }

  // ---------- gruas STS (trolley y gancho trabajan solos) ----------
  const makeCrane = (x, runDelay) => {
    const g = document.createElement('div');
    g.style.position = 'absolute';
    g.style.transform = `translate3d(${x}px, 0, 0)`;
    world.appendChild(g);

    makeBox(g, -130, 150, 46, 640, 46, C.crane);                   // pata mar izq
    makeBox(g, 130, 150, 46, 640, 46, C.crane);                    // pata mar der
    makeBox(g, -130, 420, 46, 640, 46, C.craneDark);               // pata tierra izq
    makeBox(g, 130, 420, 46, 640, 46, C.craneDark);                // pata tierra der
    makeBox(g, 0, 285, 320, 40, 360, C.crane, -640);               // portal
    makeBox(g, 0, -150, 60, 34, 1150, C.crane, -700);              // pluma sobre el mar
    makeBox(g, 0, 285, 90, 90, 90, C.craneDark, -734);             // cabina/maquinaria

    // trolley que recorre la pluma
    const trolley = document.createElement('div');
    trolley.className = 'trolley-run';
    trolley.style.position = 'absolute';
    trolley.style.animationDelay = runDelay;
    g.appendChild(trolley);
    makeBox(trolley, 0, 0, 80, 30, 90, '#e07b20', -666);

    // gancho + contenedor colgando
    const hook = document.createElement('div');
    hook.className = 'hook-work';
    hook.style.position = 'absolute';
    hook.style.animationDelay = runDelay;
    trolley.appendChild(hook);
    const cable = document.createElement('i');
    cable.style.width = '3px';
    cable.style.height = '170px';
    cable.style.left = '-1.5px';
    cable.style.top = '-636px';
    cable.style.background = '#222c38';
    hook.appendChild(cable);
    makeBox(hook, 0, 0, 150, 52, 90, C.boxes[Math.floor(Math.random() * C.boxes.length)], -414);

    return g;
  };
  makeCrane(-420, '0s');
  makeCrane(320, '-4.5s');

  // ---------- patio de contenedores ----------
  for (let gx = 0; gx < 9; gx++) {
    for (let gz = 0; gz < 3; gz++) {
      if (Math.random() < 0.18) continue;
      const levels = 1 + Math.floor(Math.random() * 3);
      for (let l = 0; l < levels; l++) {
        makeBox(world, -1250 + gx * 290, 380 + gz * 165, 240, 58, 120,
          C.boxes[Math.floor(Math.random() * C.boxes.length)], -l * 58);
      }
    }
  }

  // ---------- gate ----------
  makeBox(world, 1500, 360, 220, 150, 160, '#dfe6ec');             // caseta
  makeBox(world, 1500, 360, 240, 16, 180, '#c23b2e', -150);        // techo
  makeBox(world, 1340, 480, 16, 90, 16, C.steel);                  // poste barrera
  const arm = makeBox(world, 1240, 480, 200, 12, 10, '#f0c52a', -78); // pluma barrera
  arm.style.transformOrigin = '100px 0 0';

  // ---------- camara orbital ----------
  const cam = { orbit: VIEWS[0].orbit, pitch: VIEWS[0].pitch, zoom: VIEWS[0].zoom, cx: VIEWS[0].cx, cz: VIEWS[0].cz };
  let orbitOff = 0, pitchOff = 0;        // offsets del arrastre
  let wantOrbit = 0, wantPitch = 0;
  let dragging = false;

  const render = () => {
    requestAnimationFrame(render);
    const v = VIEWS[Math.min(current, VIEWS.length - 1)];

    if (!dragging) { wantOrbit *= 0.96; wantPitch *= 0.96; }
    orbitOff += (wantOrbit - orbitOff) * 0.1;
    pitchOff += (wantPitch - pitchOff) * 0.1;

    cam.orbit += (v.orbit - cam.orbit) * 0.04;
    cam.pitch += (v.pitch - cam.pitch) * 0.04;
    cam.zoom += (v.zoom - cam.zoom) * 0.04;
    cam.cx += (v.cx - cam.cx) * 0.04;
    cam.cz += (v.cz - cam.cz) * 0.04;

    const pitch = Math.max(6, Math.min(64, cam.pitch + pitchOff));

    // el scale exterior convierte la escena 1:1 en un diorama de mesa
    world.style.transform =
      `scale(0.5) translateZ(${cam.zoom}px) rotateX(${pitch}deg) rotateY(${cam.orbit + orbitOff}deg) ` +
      `translate3d(${-cam.cx}px, 170px, ${-cam.cz}px)`;
  };
  render();

  // ---------- arrastre orbital ----------
  let px = 0, py = 0;
  document.addEventListener('pointerdown', (e) => {
    dragging = true;
    px = e.clientX; py = e.clientY;
    document.body.classList.add('is-orbiting');
  });
  document.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    wantOrbit = Math.max(-70, Math.min(70, wantOrbit + (e.clientX - px) * 0.22));
    wantPitch = Math.max(-30, Math.min(30, wantPitch - (e.clientY - py) * 0.14));
    px = e.clientX; py = e.clientY;
  });
  const endDrag = () => {
    dragging = false;
    document.body.classList.remove('is-orbiting');
  };
  document.addEventListener('pointerup', endDrag);
  document.addEventListener('pointercancel', endDrag);

  // ---------- navegacion ----------
  const pad = (n) => String(n + 1).padStart(2, '0');
  const updateHud = () => {
    hudStation.textContent = `EST. ${pad(current)} — ${NAMES[current] ?? ''}`;
    hudCounter.textContent = `${pad(current)} / ${pad(panels.length - 1)}`;
    panels.forEach((p, i) => p.classList.toggle('is-active', i === current));
  };

  const goTo = (i) => {
    current = Math.max(0, Math.min(panels.length - 1, i));
    updateHud();
  };

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
      case 'End': e.preventDefault(); goTo(panels.length - 1); break;
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
