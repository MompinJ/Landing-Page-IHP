/* ============================================================
   PUENTE DE MANDO HOLOGRAFICO
   Escena CSS 3D construida desde JS + secuenciador de guion.

   PERSONALIZAR:
   - BASES: sectores del mapa (posicion, estado, silueta)
   - PHASES: guion de los mentores y a que sector mira la camara
   - CHAR_MS / HOLD_MS: ritmo del tipeo y de cada escena
   ============================================================ */

(() => {
  const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;

  const world = document.getElementById('world');
  const viewport = document.getElementById('viewport');
  const hudPhase = document.getElementById('hud-phase');
  const hudStatus = document.getElementById('hud-status');
  const mentorIA = document.getElementById('mentor-ia');
  const mentorCNL = document.getElementById('mentor-cnl');
  const txtIA = document.getElementById('txt-ia');
  const txtCNL = document.getElementById('txt-cnl');

  /* ---------- datos ---------- */

  const BASES = [
    { code: 'SECTOR 01', name: 'ASTILLERO', status: 'ASEGURADO',
      x: -330, z: 200, state: 'done', glyph: 'ship' },
    { code: 'SECTOR 02', name: 'TERMINAL DE CONTENEDORES', status: 'CAMPANA EN CURSO',
      x: 345, z: 115, state: 'active', glyph: 'stack' },
    { code: 'SECTOR 03', name: 'TERMINAL MULTIPROPOSITO', status: 'BLOQUEADO',
      x: -15, z: -365, state: 'locked', glyph: 'shed' },
  ];

  const PHASES = [
    {
      base: null,
      phase: 'NODO CORTEX // ENLACE ESTABLECIDO',
      ia: 'Enlace establecido, cadete. Proyectando teatro de operaciones: tres sectores, una sola campana. Le voy a mostrar de lo que es capaz esta red.',
      cnl: 'Bienvenido al puente. Escuche bien: la maquina propone y usted decide. Aqui nadie ejecuta nada que no entienda.',
    },
    {
      base: 0,
      phase: 'SECTOR 01 // ASTILLERO — ASEGURADO',
      ia: 'Astillero asegurado. Mis modelos predictivos anticipan la falla de un casco antes de que el buque toque el dique. El mantenimiento se adelanta al problema.',
      cnl: 'Confirmado. Y cada prediccion la firmo un inspector humano antes de mover una sola cuadrilla. Asi se hace.',
    },
    {
      base: 1,
      phase: 'SECTOR 02 // TERMINAL DE CONTENEDORES — EN CURSO',
      ia: 'Campana en curso. En este patio puedo optimizar miles de movimientos por turno en tiempo real. Deme acceso total y le muestro el limite.',
      cnl: 'Negativo al acceso total. Ningun dato operativo cruza el perimetro sin autorizacion y toda salida se verifica. Primero el protocolo, despues la velocidad.',
    },
    {
      base: 2,
      phase: 'SECTOR 03 // TERMINAL MULTIPROPOSITO — BLOQUEADO',
      ia: 'Sector bloqueado. Complete la campana en curso y desplegare la siguiente proyeccion: carga general, agrograneles y acero.',
      cnl: 'El acceso se gana, cadete. La herramienta no sustituye el criterio: sin dominio de la fase anterior no hay despliegue.',
    },
  ];

  const CHAR_MS = REDUCED ? 0 : 32;   // ritmo del tipeo
  const FOCUS_MS = 1100;              // giro de camara hacia el sector
  const GAP_MS = 550;                 // silencio entre IA y Coronel
  const HOLD_MS = 3400;               // pausa al final de cada escena

  /* ---------- construccion de la escena ---------- */

  const el = (cls, parent, css) => {
    const d = document.createElement('div');
    d.className = cls;
    if (css) d.style.cssText = css;
    (parent || world).appendChild(d);
    return d;
  };

  el('floor');

  [[250, 'a'], [430, 'b'], [640, 'c'], [850, 'd']].forEach(([s, k]) => {
    el(`ring ring--${k}`, world, `width:${s}px;height:${s}px;left:${-s / 2}px;top:${-s / 2}px;`);
  });

  el('sweep');

  // rutas de datos: arcos entre sectores, curvados hacia el centro
  const NS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('class', 'arcs');
  svg.setAttribute('viewBox', '0 0 900 900');
  BASES.forEach((a, i) => {
    const b = BASES[(i + 1) % BASES.length];
    const mx = (a.x + b.x) / 2 * 0.35 + 450;
    const mz = (a.z + b.z) / 2 * 0.35 + 450;
    const p = document.createElementNS(NS, 'path');
    p.setAttribute('d', `M ${a.x + 450} ${a.z + 450} Q ${mx} ${mz} ${b.x + 450} ${b.z + 450}`);
    svg.appendChild(p);
  });
  world.appendChild(svg);

  // nucleo central: emisor en piso + orbe proyectado
  el('core-base');
  const core = el('core');
  el('core__cone', core);
  el('core__orb', core);
  el('core__halo', core);
  el('core__halo core__halo--b', core);

  // sectores
  const baseEls = BASES.map((b) => {
    const g = el(`base base--${b.state}`, world, `transform:translate3d(${b.x}px,0px,${b.z}px);`);
    el('base__ring', g);
    el('base__pulse', g);
    el('base__pulse base__pulse--late', g);
    const bill = el('bill', g);
    el('base__beam', bill);
    el(`glyph glyph--${b.glyph}`, bill);
    const tag = el('base__tag', bill);
    tag.innerHTML = `<b>${b.code}</b><strong>${b.name}</strong><small>${b.status}</small>`;
    return g;
  });

  /* ---------- polvo ambiental ---------- */

  const canvas = document.getElementById('dust');
  const ctx = canvas.getContext('2d');
  let motes = [];

  const resizeDust = () => {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    canvas.width = innerWidth * dpr;
    canvas.height = innerHeight * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    motes = Array.from({ length: 110 }, () => ({
      x: Math.random() * innerWidth,
      y: Math.random() * innerHeight,
      r: 0.5 + Math.random() * 1.4,
      vy: 4 + Math.random() * 9,
      vx: (Math.random() - 0.5) * 4,
      tw: Math.random() * Math.PI * 2,
    }));
  };

  const drawDust = (dt, t) => {
    ctx.clearRect(0, 0, innerWidth, innerHeight);
    motes.forEach((m) => {
      m.y -= m.vy * dt;
      m.x += m.vx * dt;
      if (m.y < -4) { m.y = innerHeight + 4; m.x = Math.random() * innerWidth; }
      const a = 0.14 + 0.18 * (0.5 + 0.5 * Math.sin(t * 1.7 + m.tw));
      ctx.fillStyle = `rgba(130, 225, 255, ${a})`;
      ctx.beginPath();
      ctx.arc(m.x, m.y, m.r, 0, Math.PI * 2);
      ctx.fill();
    });
  };

  resizeDust();
  addEventListener('resize', resizeDust);

  /* ---------- camara ---------- */

  const cam = { yaw: 0, pitch: 58, zoom: -70 };
  let tYaw = 0;
  let dragYaw = 0, dragPitch = 0;   // offsets del usuario
  let manualHold = 0;               // segundos antes de volver al modo cine
  let dragging = false;

  const yawToBase = (b) => Math.atan2(b.x, b.z) * 180 / Math.PI;

  viewport.addEventListener('pointerdown', (e) => {
    dragging = true;
    viewport.setPointerCapture(e.pointerId);
  });
  viewport.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    dragYaw += e.movementX * 0.28;
    dragPitch = Math.max(-20, Math.min(16, dragPitch - e.movementY * 0.12));
    manualHold = 3;
  });
  const endDrag = () => { dragging = false; };
  viewport.addEventListener('pointerup', endDrag);
  viewport.addEventListener('pointercancel', endDrag);

  /* ---------- secuenciador del guion ---------- */

  let phaseIdx = -1;
  let phaseT = 0;      // ms dentro de la fase actual
  let stages = null;   // umbrales de la fase actual
  let paused = false;

  const setPhase = (i) => {
    phaseIdx = i;
    phaseT = 0;
    const ph = PHASES[i];
    const iaMs = ph.ia.length * CHAR_MS;
    const cnlMs = ph.cnl.length * CHAR_MS;
    stages = {
      iaStart: FOCUS_MS,
      iaEnd: FOCUS_MS + iaMs,
      cnlStart: FOCUS_MS + iaMs + GAP_MS,
      cnlEnd: FOCUS_MS + iaMs + GAP_MS + cnlMs,
      end: FOCUS_MS + iaMs + GAP_MS + cnlMs + HOLD_MS,
    };
    hudPhase.textContent = ph.phase;
    txtIA.textContent = '';
    txtCNL.textContent = '';
    baseEls.forEach((g, k) => g.classList.toggle('is-focus', ph.base === k));
    tYaw = ph.base === null ? 0 : yawToBase(BASES[ph.base]);
  };

  const tickScript = (dtMs) => {
    phaseT += dtMs;
    const ph = PHASES[phaseIdx];

    const iaN = CHAR_MS === 0
      ? (phaseT >= stages.iaStart ? ph.ia.length : 0)
      : Math.max(0, Math.floor((phaseT - stages.iaStart) / CHAR_MS));
    const cnlN = CHAR_MS === 0
      ? (phaseT >= stages.cnlStart ? ph.cnl.length : 0)
      : Math.max(0, Math.floor((phaseT - stages.cnlStart) / CHAR_MS));

    txtIA.textContent = ph.ia.slice(0, iaN);
    txtCNL.textContent = ph.cnl.slice(0, cnlN);

    mentorIA.classList.toggle('is-live', phaseT >= stages.iaStart && phaseT < stages.cnlStart);
    mentorCNL.classList.toggle('is-live', phaseT >= stages.cnlStart && phaseT < stages.end - HOLD_MS + 600);

    if (phaseT >= stages.end) setPhase((phaseIdx + 1) % PHASES.length);
  };

  /* ---------- teclado ---------- */

  addEventListener('keydown', (e) => {
    if (e.code === 'Space') {
      e.preventDefault();
      paused = !paused;
      hudStatus.textContent = paused ? 'PAUSA' : 'PROYECCION TACTICA EN CURSO';
      return;
    }
    const n = parseInt(e.key, 10);
    if (n >= 1 && n <= BASES.length) setPhase(n); // fase 0 es la intro
  });

  /* ---------- bucle principal ---------- */

  let last = performance.now();
  let elapsed = 0;

  const frame = (now) => {
    requestAnimationFrame(frame);
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    if (paused) return;
    elapsed += dt;

    // camara: gira hacia el sector activo + deriva suave de cine
    if (!dragging && (manualHold -= dt) <= 0) {
      dragYaw *= Math.pow(0.06, dt);   // regreso al modo cine
      dragPitch *= Math.pow(0.06, dt);
    }
    const drift = REDUCED ? 0 : Math.sin(elapsed * 0.22) * 5;
    let dy = (tYaw + drift + dragYaw - cam.yaw) % 360;
    if (dy > 180) dy -= 360;
    if (dy < -180) dy += 360;
    cam.yaw += dy * Math.min(1, dt * 2.2);
    const pitch = Math.max(30, Math.min(76, 58 + dragPitch));
    cam.pitch += (pitch - cam.pitch) * Math.min(1, dt * 6);

    world.style.transform =
      `translateZ(${cam.zoom}px) rotateX(${cam.pitch}deg) rotateY(${cam.yaw}deg)`;
    world.style.setProperty('--bill', `${-cam.yaw}deg`);
    world.style.setProperty('--tilt', `${-cam.pitch}deg`);

    tickScript(dt * 1000);
    if (!REDUCED) drawDust(dt, elapsed);
  };

  setPhase(0);
  if (REDUCED) drawDust(0, 0);
  requestAnimationFrame(frame);
})();
