/* ============================================================
   PLANTILLA PROFUNDIDAD 3D — mini motor estilo impress.js
   Cada slide declara su posicion con data-attributes; la camara
   (el transform inverso del lienzo) vuela hasta encuadrarla.
   ============================================================ */

(() => {
  const FLY_MS = 1100;        // duracion del vuelo entre slides
  const OVERVIEW_MARGIN = 1.25; // aire alrededor del mapa en vista general

  const viewport = document.getElementById('viewport');
  const canvas = document.getElementById('canvas3d');
  const slides = Array.from(canvas.querySelectorAll('.slide'));
  const counter = document.getElementById('hud-counter');

  let current = 0;
  let overview = false;

  canvas.style.setProperty('--fly-ms', `${FLY_MS}ms`);

  const num = (el, name, fallback = 0) =>
    parseFloat(el.dataset[name] ?? fallback) || 0;

  // lee la pose declarada de una slide
  const poseOf = (el) => ({
    x: num(el, 'x'),
    y: num(el, 'y'),
    z: num(el, 'z'),
    rx: num(el, 'rotateX'),
    ry: num(el, 'rotateY'),
    rz: num(el, 'rotate') + num(el, 'rotateZ'),
    s: parseFloat(el.dataset.scale ?? 1) || 1
  });

  const poses = slides.map(poseOf);

  // coloca cada slide en el lienzo segun su pose
  slides.forEach((el, i) => {
    const p = poses[i];
    el.style.transform =
      `translate3d(${p.x}px, ${p.y}px, ${p.z}px) ` +
      `rotateX(${p.rx}deg) rotateY(${p.ry}deg) rotateZ(${p.rz}deg) ` +
      `scale(${p.s})`;
  });

  // la camara es el transform INVERSO de la pose objetivo
  const flyTo = (p) => {
    canvas.style.transform =
      `scale(${1 / p.s}) ` +
      `rotateZ(${-p.rz}deg) rotateY(${-p.ry}deg) rotateX(${-p.rx}deg) ` +
      `translate3d(${-p.x}px, ${-p.y}px, ${-p.z}px)`;
  };

  // pose virtual que encuadra TODAS las slides (vista general)
  const overviewPose = () => {
    const w = slides[0].offsetWidth;
    const h = slides[0].offsetHeight;
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    poses.forEach((p) => {
      minX = Math.min(minX, p.x - (w * p.s) / 2);
      maxX = Math.max(maxX, p.x + (w * p.s) / 2);
      minY = Math.min(minY, p.y - (h * p.s) / 2);
      maxY = Math.max(maxY, p.y + (h * p.s) / 2);
    });
    const spanX = (maxX - minX) * OVERVIEW_MARGIN;
    const spanY = (maxY - minY) * OVERVIEW_MARGIN;
    const scale = Math.max(spanX / window.innerWidth, spanY / window.innerHeight, 1);
    return {
      x: (minX + maxX) / 2,
      y: (minY + maxY) / 2,
      z: 0, rx: 0, ry: 0, rz: 0,
      s: scale
    };
  };

  const updateHud = () => {
    const pad = (n) => String(n).padStart(2, '0');
    counter.textContent = overview
      ? 'MAPA'
      : `${pad(current + 1)} / ${pad(slides.length)}`;
    slides.forEach((el, i) => el.classList.toggle('is-active', overview || i === current));
  };

  const goTo = (i) => {
    current = Math.max(0, Math.min(slides.length - 1, i));
    overview = false;
    viewport.classList.remove('is-overview');
    flyTo(poses[current]);
    updateHud();
  };

  const toggleOverview = () => {
    overview = !overview;
    viewport.classList.toggle('is-overview', overview);
    if (overview) flyTo(overviewPose());
    else flyTo(poses[current]);
    updateHud();
  };

  // ---------- teclado ----------
  document.addEventListener('keydown', (e) => {
    switch (e.key) {
      case 'ArrowRight':
      case 'ArrowDown':
      case 'PageDown':
      case ' ':
        e.preventDefault();
        if (overview) toggleOverview();
        else goTo(current + 1);
        break;
      case 'ArrowLeft':
      case 'ArrowUp':
      case 'PageUp':
        e.preventDefault();
        if (overview) toggleOverview();
        else goTo(current - 1);
        break;
      case 'Home': e.preventDefault(); goTo(0); break;
      case 'End': e.preventDefault(); goTo(slides.length - 1); break;
      case 'Escape':
      case 'o':
        e.preventDefault(); toggleOverview(); break;
    }
  });

  // en vista general, click sobre una slide viaja a ella
  slides.forEach((el, i) => {
    el.addEventListener('click', () => { if (overview) goTo(i); });
  });

  // ---------- swipe tactil ----------
  let touchX = null;
  document.addEventListener('touchstart', (e) => { touchX = e.touches[0].clientX; }, { passive: true });
  document.addEventListener('touchend', (e) => {
    if (touchX === null) return;
    const dx = e.changedTouches[0].clientX - touchX;
    touchX = null;
    if (Math.abs(dx) < 45) return;
    if (dx < 0) goTo(current + 1); else goTo(current - 1);
  }, { passive: true });

  // ---------- rueda ----------
  let wheelLock = 0;
  document.addEventListener('wheel', (e) => {
    const now = Date.now();
    if (now - wheelLock < FLY_MS || Math.abs(e.deltaY) < 18) return;
    wheelLock = now;
    if (e.deltaY > 0) goTo(current + 1); else goTo(current - 1);
  }, { passive: true });

  window.addEventListener('resize', () => {
    if (overview) flyTo(overviewPose());
  });

  goTo(0);
})();
