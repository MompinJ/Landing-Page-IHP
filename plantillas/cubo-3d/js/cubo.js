/* ============================================================
   PLANTILLA CUBO 3D — motor de rotacion
   Soporta N slides: solo dos caras existen a la vez (la actual
   y la entrante); al terminar el giro se resetea el cubo sin
   transicion. Asi el "cubo" nunca se queda sin caras.
   ============================================================ */

(() => {
  const SPIN_MS = 900; // duracion del giro (sincronizada con CSS via custom property)

  const cube = document.getElementById('cube');
  const scene = document.getElementById('scene');
  const slides = Array.from(cube.querySelectorAll('.slide'));
  const hudFill = document.getElementById('hud-fill');
  const hudNow = document.getElementById('hud-now');
  const hudTotal = document.getElementById('hud-total');

  let current = 0;
  let spinning = false;

  cube.style.setProperty('--spin-ms', `${SPIN_MS}ms`);

  // mitad del ancho real del slide = radio del cubo
  const radius = () => scene.offsetWidth / 2;

  const pad = (n) => String(n + 1).padStart(2, '0');

  const updateHud = () => {
    hudNow.textContent = pad(current);
    hudTotal.textContent = String(slides.length).padStart(2, '0');
    hudFill.style.width = `${((current + 1) / slides.length) * 100}%`;
  };

  // coloca una slide en una cara del cubo (angulo en grados sobre el eje Y)
  const place = (slide, deg) => {
    slide.classList.add('is-active');
    slide.style.transform = `rotateY(${deg}deg) translateZ(${radius()}px)`;
  };

  const clear = (slide) => {
    slide.classList.remove('is-active');
    slide.style.transform = '';
  };

  // estado de reposo: solo la slide actual, de frente, sin giro acumulado
  const rest = () => {
    cube.classList.remove('is-spinning');
    cube.style.transform = `translateZ(${-radius()}px)`;
    slides.forEach(clear);
    place(slides[current], 0);
  };

  const go = (target) => {
    if (spinning) return;
    if (target < 0 || target >= slides.length || target === current) return;

    const dir = target > current ? 1 : -1; // 1 = avanzar (gira a la izquierda)
    spinning = true;

    // la entrante se monta en la cara lateral correspondiente
    place(slides[target], dir * 90);

    // forzar reflow para que el navegador registre la posicion inicial
    void cube.offsetWidth;

    cube.classList.add('is-spinning');
    cube.style.transform = `translateZ(${-radius()}px) rotateY(${dir * -90}deg)`;

    const finish = () => {
      cube.removeEventListener('transitionend', finish);
      clearTimeout(fallback);
      current = target;
      rest();
      updateHud();
      spinning = false;
    };

    // transitionend puede no disparar si la pestana pierde foco: timeout de respaldo
    const fallback = setTimeout(finish, SPIN_MS + 120);
    cube.addEventListener('transitionend', finish);
  };

  const next = () => go(current + 1);
  const prev = () => go(current - 1);

  // ---------- teclado ----------
  document.addEventListener('keydown', (e) => {
    switch (e.key) {
      case 'ArrowRight':
      case 'ArrowDown':
      case 'PageDown':
      case ' ':
        e.preventDefault(); next(); break;
      case 'ArrowLeft':
      case 'ArrowUp':
      case 'PageUp':
        e.preventDefault(); prev(); break;
      case 'Home':
        e.preventDefault(); go(0); break;
      case 'End':
        e.preventDefault(); go(slides.length - 1); break;
    }
  });

  // ---------- swipe tactil ----------
  let touchX = null;
  document.addEventListener('touchstart', (e) => { touchX = e.touches[0].clientX; }, { passive: true });
  document.addEventListener('touchend', (e) => {
    if (touchX === null) return;
    const dx = e.changedTouches[0].clientX - touchX;
    touchX = null;
    if (Math.abs(dx) < 45) return;
    if (dx < 0) next(); else prev();
  }, { passive: true });

  // ---------- rueda del mouse ----------
  let wheelLock = 0;
  document.addEventListener('wheel', (e) => {
    const now = Date.now();
    if (now - wheelLock < SPIN_MS + 200) return;
    if (Math.abs(e.deltaY) < 18) return;
    wheelLock = now;
    if (e.deltaY > 0) next(); else prev();
  }, { passive: true });

  // recolocar al redimensionar (el radio depende del ancho)
  window.addEventListener('resize', () => { if (!spinning) rest(); });

  rest();
  updateHud();
})();
