/* ============================================================
   PLANTILLA CARTA NAUTICA 3D — motor de derrota
   La camara navega una mesa de cartas inclinada: pan + zoom
   hacia cada waypoint, derrota que se traza en rojo y barco
   que recorre la ruta. Esc alterna la vista de toda la carta.
   ============================================================ */

(() => {
  const TILT_FOCUS = 22;   // inclinacion de la mesa al leer un waypoint (grados)
  const TILT_MAP = 54;     // inclinacion en vista de carta completa
  const ZOOM_FOCUS = 1.0;  // zoom al leer
  const SOUNDINGS = 90;    // numeritos de profundidad esparcidos

  const world = document.getElementById('world');
  const scene = document.getElementById('scene');
  const chart = document.getElementById('chart');
  const routeSvg = document.getElementById('route');
  const ship = document.getElementById('ship');
  const counter = document.getElementById('hud-counter');
  const wps = Array.from(document.querySelectorAll('.wp'));

  let current = 0;
  let mapView = false;

  const pts = wps.map((w) => ({
    x: parseFloat(w.dataset.cx ?? '0') || 0,
    y: parseFloat(w.dataset.cy ?? '0') || 0
  }));

  // coloca cada waypoint en su coordenada (el margen ya centra en X)
  wps.forEach((w, i) => {
    w.style.left = `calc(50% + ${pts[i].x}px)`;
    w.style.top = `calc(50% + ${pts[i].y}px)`;
  });

  // ---------- sondas decorativas ----------
  for (let i = 0; i < SOUNDINGS; i++) {
    const s = document.createElement('span');
    s.className = 'sound';
    s.textContent = String(Math.floor(8 + Math.random() * 180));
    s.style.left = `${4 + Math.random() * 92}%`;
    s.style.top = `${4 + Math.random() * 92}%`;
    s.style.transform = `translate(-50%, -50%) rotate(${(Math.random() - 0.5) * 14}deg)`;
    chart.appendChild(s);
  }

  // ---------- derrota (SVG) ----------
  const W = chart.offsetWidth;
  const H = chart.offsetHeight;
  routeSvg.setAttribute('viewBox', `0 0 ${W} ${H}`);

  const toSvg = (p) => ({ x: W / 2 + p.x, y: H / 2 + p.y });
  const d = pts.map((p, i) => {
    const q = toSvg(p);
    return `${i === 0 ? 'M' : 'L'} ${q.x} ${q.y}`;
  }).join(' ');

  const mk = (cls) => {
    const el = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    el.setAttribute('class', cls);
    el.setAttribute('d', d);
    routeSvg.appendChild(el);
    return el;
  };
  const base = mk('base');
  const done = mk('done');

  // circulos de marcacion en cada waypoint
  pts.forEach((p) => {
    const q = toSvg(p);
    const c = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    c.setAttribute('class', 'mark');
    c.setAttribute('cx', q.x);
    c.setAttribute('cy', q.y);
    c.setAttribute('r', 14);
    routeSvg.appendChild(c);
  });

  // longitud acumulada de la ruta hasta cada waypoint
  const cum = [0];
  for (let i = 1; i < pts.length; i++) {
    cum.push(cum[i - 1] + Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y));
  }
  const total = cum[cum.length - 1] || 1;
  done.style.strokeDasharray = String(total);
  done.style.strokeDashoffset = String(total);

  // rumbo del barco entre el waypoint actual y el siguiente trazado
  const heading = (i) => {
    const a = pts[Math.max(i - 1, 0)];
    const b = pts[Math.min(Math.max(i, 1), pts.length - 1)];
    return Math.atan2(b.y - a.y, b.x - a.x) * 180 / Math.PI + 90;
  };

  const moveShip = (i) => {
    ship.style.left = `calc(50% + ${pts[i].x}px)`;
    ship.style.top = `calc(50% + ${pts[i].y}px)`;
    ship.style.transform = `rotate(${heading(i)}deg)`;
  };

  // ---------- camara ----------
  const setTiltVar = (deg) =>
    document.documentElement.style.setProperty('--tilt', `${deg}deg`);

  const focusOn = (i) => {
    setTiltVar(TILT_FOCUS);
    world.style.transform =
      `rotateX(${TILT_FOCUS}deg) scale(${ZOOM_FOCUS}) translate(${-pts[i].x}px, ${-pts[i].y}px)`;
  };

  const mapZoom = () => {
    const xs = pts.map((p) => p.x);
    const ys = pts.map((p) => p.y);
    const spanX = Math.max(...xs) - Math.min(...xs) + 1400;
    const spanY = Math.max(...ys) - Math.min(...ys) + 1400;
    return Math.min(
      scene.offsetWidth / spanX,
      scene.offsetHeight / (spanY * Math.cos(TILT_MAP * Math.PI / 180)) * 0.9,
      1
    );
  };

  const showMap = () => {
    const xs = pts.map((p) => p.x);
    const ys = pts.map((p) => p.y);
    const cx = (Math.max(...xs) + Math.min(...xs)) / 2;
    const cy = (Math.max(...ys) + Math.min(...ys)) / 2;
    setTiltVar(TILT_MAP);
    world.style.transform =
      `rotateX(${TILT_MAP}deg) scale(${mapZoom()}) translate(${-cx}px, ${-cy}px)`;
  };

  // ---------- estado ----------
  const update = () => {
    counter.textContent = mapView
      ? 'CARTA COMPLETA'
      : `WP-${String(current + 1).padStart(2, '0')} / ${String(wps.length).padStart(2, '0')}`;
    wps.forEach((w, i) => w.classList.toggle('is-up', !mapView && i === current));
    document.body.classList.toggle('is-map', mapView);
    done.style.strokeDashoffset = String(total - cum[current]);
    moveShip(current);
  };

  const goTo = (i) => {
    current = Math.max(0, Math.min(wps.length - 1, i));
    mapView = false;
    focusOn(current);
    update();
  };

  const toggleMap = () => {
    mapView = !mapView;
    if (mapView) showMap(); else focusOn(current);
    update();
  };

  // ---------- entrada ----------
  document.addEventListener('keydown', (e) => {
    switch (e.key) {
      case 'ArrowRight':
      case 'ArrowDown':
      case 'PageDown':
      case ' ':
        e.preventDefault();
        if (mapView) toggleMap(); else goTo(current + 1);
        break;
      case 'ArrowLeft':
      case 'ArrowUp':
      case 'PageUp':
        e.preventDefault();
        if (mapView) toggleMap(); else goTo(current - 1);
        break;
      case 'Home': e.preventDefault(); goTo(0); break;
      case 'End': e.preventDefault(); goTo(wps.length - 1); break;
      case 'Escape':
      case 'o':
        e.preventDefault(); toggleMap(); break;
    }
  });

  wps.forEach((w, i) => {
    w.addEventListener('click', () => { if (mapView) goTo(i); });
  });

  let touchX = null;
  document.addEventListener('touchstart', (e) => { touchX = e.touches[0].clientX; }, { passive: true });
  document.addEventListener('touchend', (e) => {
    if (touchX === null) return;
    const dx = e.changedTouches[0].clientX - touchX;
    touchX = null;
    if (Math.abs(dx) < 45) return;
    if (dx < 0) goTo(current + 1); else goTo(current - 1);
  }, { passive: true });

  let wheelLock = 0;
  document.addEventListener('wheel', (e) => {
    const now = Date.now();
    if (now - wheelLock < 1500 || Math.abs(e.deltaY) < 18) return;
    wheelLock = now;
    if (e.deltaY > 0) goTo(current + 1); else goTo(current - 1);
  }, { passive: true });

  window.addEventListener('resize', () => { if (mapView) showMap(); });

  goTo(0);
})();
