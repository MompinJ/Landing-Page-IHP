/* ============================================================
   PLANTILLA HP CORPORATIVO 3D — motor
   - Barrido diagonal a 30.3 con colores de la paleta rotando
   - Parallax por capas (data-depth) que sigue al mouse
   - Contadores animados (data-count) al activarse la slide
   ============================================================ */

(() => {
  const WIPE_MS = 1100;   // duracion del barrido
  // colores que rota el barrido (paleta oficial)
  const WIPE_COLORS = ['#009BDE', '#FFC627', '#54BBAB', '#002E6D', '#EE7523'];

  const wipe = document.getElementById('wipe');
  const slides = Array.from(document.querySelectorAll('.slide'));
  const counter = document.getElementById('hud-counter');

  let current = 0;
  let moving = false;
  let wipeIdx = 0;

  document.documentElement.style.setProperty('--wipe-ms', `${WIPE_MS}ms`);

  const pad = (n) => String(n + 1).padStart(2, '0');

  const updateHud = () => {
    counter.textContent = `${pad(current)} / ${pad(slides.length - 1)}`;
  };

  // ---------- contadores animados ----------
  const runCounters = (slide) => {
    slide.querySelectorAll('[data-count]').forEach((el) => {
      const target = parseFloat(el.dataset.count) || 0;
      const decimals = parseInt(el.dataset.decimals ?? '0', 10);
      const t0 = performance.now();
      const dur = 1400;
      const step = (now) => {
        const t = Math.min((now - t0) / dur, 1);
        const ease = 1 - Math.pow(1 - t, 3);
        el.textContent = (target * ease).toFixed(decimals);
        if (t < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    });
  };

  // ---------- navegacion con barrido ----------
  const goTo = (target) => {
    if (moving || target < 0 || target >= slides.length || target === current) return;
    moving = true;

    wipe.style.setProperty('--wipe-color', WIPE_COLORS[wipeIdx % WIPE_COLORS.length]);
    wipeIdx++;

    wipe.classList.remove('run');
    void wipe.offsetWidth;
    wipe.classList.add('run');

    // el intercambio ocurre cuando el barrido cubre la pantalla (~45%)
    setTimeout(() => {
      slides[current].classList.remove('is-active', 'enter');
      current = target;
      slides[current].classList.add('is-active', 'enter');
      runCounters(slides[current]);
      updateHud();
    }, WIPE_MS * 0.45);

    setTimeout(() => {
      wipe.classList.remove('run');
      moving = false;
    }, WIPE_MS + 60);
  };

  // ---------- parallax de formas ----------
  let mx = 0, my = 0, px = 0, py = 0;
  document.addEventListener('pointermove', (e) => {
    mx = (e.clientX / window.innerWidth) - 0.5;
    my = (e.clientY / window.innerHeight) - 0.5;
  });
  const drift = () => {
    requestAnimationFrame(drift);
    px += (mx - px) * 0.06;
    py += (my - py) * 0.06;
    slides[current].querySelectorAll('[data-depth]').forEach((el) => {
      const d = parseFloat(el.dataset.depth) || 0;
      el.style.setProperty('--px', `${(-px * d).toFixed(2)}px`);
      el.style.setProperty('--py', `${(-py * d).toFixed(2)}px`);
    });
  };
  drift();

  // ---------- entrada ----------
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
    if (now - wheelLock < WIPE_MS + 250 || Math.abs(e.deltaY) < 18) return;
    wheelLock = now;
    if (e.deltaY > 0) goTo(current + 1); else goTo(current - 1);
  }, { passive: true });

  updateHud();
})();
