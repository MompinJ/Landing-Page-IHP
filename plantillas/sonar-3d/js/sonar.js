/* ============================================================
   PLANTILLA SONAR 3D — motor de inmersion
   Descenso direccional en Z + medidor de profundidad animado,
   ping en cada transicion, nieve marina y blips del sonar.
   ============================================================ */

(() => {
  const DIVE_MS = 950;       // duracion del descenso entre slides
  const SNOW_COUNT = 70;     // particulas de nieve marina

  const deck = document.getElementById('deck');
  const slides = Array.from(deck.querySelectorAll('.slide'));
  const snowBox = document.getElementById('snow');
  const ping = document.getElementById('ping');
  const gaugeFill = document.getElementById('gauge-fill');
  const gaugeNum = document.getElementById('gauge-num');
  const gaugeZone = document.getElementById('gauge-zone');
  const counter = document.getElementById('hud-counter');
  const blipsBox = document.getElementById('sonar-blips');

  let current = 0;
  let moving = false;
  let shownDepth = 0; // valor que muestra el contador (se interpola)

  document.documentElement.style.setProperty('--dive-ms', `${DIVE_MS}ms`);

  const depths = slides.map((s) => parseInt(s.dataset.depth ?? '0', 10) || 0);
  const maxDepth = Math.max(...depths, 1);
  const pad = (n) => String(n + 1).padStart(2, '0');

  // ---------- nieve marina ----------
  for (let i = 0; i < SNOW_COUNT; i++) {
    const f = document.createElement('i');
    const size = 1 + Math.random() * 2.2;
    f.style.left = `${Math.random() * 100}%`;
    f.style.width = `${size}px`;
    f.style.height = `${size}px`;
    f.style.animationDuration = `${6 + Math.random() * 9}s`;
    f.style.animationDelay = `${-Math.random() * 12}s`;
    f.style.opacity = String(0.25 + Math.random() * 0.5);
    snowBox.appendChild(f);
  }

  // ---------- blips del sonar (uno por slide, en espiral) ----------
  const blips = slides.map((_, i) => {
    const b = document.createElement('i');
    const ang = (i / slides.length) * Math.PI * 2 - Math.PI / 2;
    const r = 18 + (i / Math.max(slides.length - 1, 1)) * 30; // % del radio
    b.style.left = `${50 + Math.cos(ang) * r}%`;
    b.style.top = `${50 + Math.sin(ang) * r}%`;
    blipsBox.appendChild(b);
    return b;
  });

  // ---------- contador de profundidad interpolado ----------
  let depthAnim = null;
  const animateDepth = (target) => {
    cancelAnimationFrame(depthAnim);
    const from = shownDepth;
    const t0 = performance.now();
    const dur = DIVE_MS + 250;
    const step = (now) => {
      const t = Math.min((now - t0) / dur, 1);
      const ease = 1 - Math.pow(1 - t, 3);
      shownDepth = Math.round(from + (target - from) * ease);
      gaugeNum.textContent = String(shownDepth);
      if (t < 1) depthAnim = requestAnimationFrame(step);
    };
    depthAnim = requestAnimationFrame(step);
  };

  const updateHud = () => {
    counter.textContent = `${pad(current)} / ${pad(slides.length - 1)}`;
    gaugeZone.textContent = slides[current].dataset.zone ?? '';
    gaugeFill.style.height = `${(depths[current] / maxDepth) * 100}%`;
    blips.forEach((b, i) => b.classList.toggle('is-here', i === current));
    animateDepth(depths[current]);
  };

  const firePing = () => {
    ping.classList.remove('is-on');
    void ping.offsetWidth; // reinicia la animacion
    ping.classList.add('is-on');
  };

  const goTo = (target) => {
    if (moving || target < 0 || target >= slides.length || target === current) return;
    moving = true;

    const out = slides[current];
    const dive = target > current; // true = descendiendo

    out.classList.remove('is-active');
    out.classList.add(dive ? 'is-leaving-up' : 'is-leaving-down');
    document.body.classList.toggle('is-diving', dive);

    current = target;
    slides[current].classList.add('is-active');
    firePing();
    updateHud();

    setTimeout(() => {
      out.classList.remove('is-leaving-up', 'is-leaving-down');
      document.body.classList.remove('is-diving');
      moving = false;
    }, DIVE_MS + 60);
  };

  // ---------- teclado ----------
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
      case 'End': e.preventDefault(); goTo(slides.length - 1); break;
    }
  });

  // ---------- swipe ----------
  let touchY = null;
  document.addEventListener('touchstart', (e) => { touchY = e.touches[0].clientY; }, { passive: true });
  document.addEventListener('touchend', (e) => {
    if (touchY === null) return;
    const dy = e.changedTouches[0].clientY - touchY;
    touchY = null;
    if (Math.abs(dy) < 45) return;
    // swipe hacia arriba = descender
    if (dy < 0) goTo(current + 1); else goTo(current - 1);
  }, { passive: true });

  // ---------- rueda ----------
  let wheelLock = 0;
  document.addEventListener('wheel', (e) => {
    const now = Date.now();
    if (now - wheelLock < DIVE_MS + 150 || Math.abs(e.deltaY) < 18) return;
    wheelLock = now;
    if (e.deltaY > 0) goTo(current + 1); else goTo(current - 1);
  }, { passive: true });

  updateHud();
})();
