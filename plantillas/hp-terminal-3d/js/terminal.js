/* ============================================================
   PLANTILLA HP TERMINAL 3D — motor de la grua
   Iza el contenedor actual, mueve el trolley y baja el nuevo.
   Los contenedores rotan la paleta oficial Hutchison Ports.
   ============================================================ */

(() => {
  const LIFT_MS = 1050;   // izaje del contenedor saliente
  const DROP_MS = 1400;   // descenso del entrante
  // orden de colores de los contenedores (paleta oficial)
  const PALETTE = ['#002E6D', '#009BDE', '#FFC627', '#54BBAB', '#EE7523'];
  // color de texto del rotulo segun fondo (claro u oscuro)
  const DARK_TEXT = { '#FFC627': true, '#54BBAB': false, '#009BDE': false, '#002E6D': false, '#EE7523': false };

  const slides = Array.from(document.querySelectorAll('.slide'));
  const trolley = document.getElementById('trolley');
  const counter = document.getElementById('hud-counter');

  let current = 0;
  let moving = false;

  // asigna a cada contenedor su color de la paleta
  slides.forEach((s, i) => {
    const c = PALETTE[i % PALETTE.length];
    s.style.setProperty('--c', c);
    if (DARK_TEXT[c]) {
      s.querySelectorAll('.box-code, .box-weight, .side-code').forEach((el) => {
        el.style.color = 'rgba(0, 30, 70, 0.75)';
      });
    }
  });

  const pad = (n) => String(n + 1).padStart(2, '0');
  const updateHud = () => {
    counter.textContent = `MOV ${pad(current)} / ${pad(slides.length - 1)}`;
  };

  // mitades de la caja en px para las caras 3D (calc con min() dentro
  // de translateZ no es confiable en todos los navegadores)
  const setDims = () => {
    const box = document.querySelector('.box');
    if (!box) return;
    const root = document.documentElement;
    const bd = parseFloat(getComputedStyle(root).getPropertyValue('--bd')) || 96;
    root.style.setProperty('--half-w', `${box.offsetWidth / 2}px`);
    root.style.setProperty('--half-h', `${box.offsetHeight / 2}px`);
    root.style.setProperty('--half-d', `${bd / 2}px`);
  };
  setDims();
  window.addEventListener('resize', setDims);

  const goTo = (target) => {
    if (moving || target < 0 || target >= slides.length || target === current) return;
    moving = true;

    const out = slides[current];
    out.classList.remove('is-active');
    out.classList.add('is-leaving');

    // el trolley se reacomoda mientras el contenedor sube
    trolley.classList.add('shift');
    setTimeout(() => trolley.classList.remove('shift'), LIFT_MS);

    // el saliente termina TODO su izaje antes de soltarlo
    setTimeout(() => {
      current = target;
      slides[current].classList.add('is-active');
      updateHud();
    }, LIFT_MS);
    setTimeout(() => { out.classList.remove('is-leaving'); }, LIFT_MS + 120);

    setTimeout(() => { moving = false; }, LIFT_MS + DROP_MS * 0.8);
  };

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
    if (now - wheelLock < LIFT_MS + DROP_MS || Math.abs(e.deltaY) < 18) return;
    wheelLock = now;
    if (e.deltaY > 0) goTo(current + 1); else goTo(current - 1);
  }, { passive: true });

  updateHud();
})();
