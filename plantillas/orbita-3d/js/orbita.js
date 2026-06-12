/* ============================================================
   PLANTILLA ORBITA 3D — motor del anillo
   Las slides se reparten en un cilindro; un loop de animacion
   interpola el angulo (con inercia al arrastrar) y al soltar
   ajusta a la slide mas cercana.
   ============================================================ */

(() => {
  const FRICTION = 0.94;     // 0-1: cuanto conserva la inercia al soltar
  const SNAP = 0.09;         // velocidad de iman hacia la slide objetivo
  const DRAG_SENS = 0.28;    // grados de giro por pixel arrastrado

  const stage = document.getElementById('stage');
  const ring = document.getElementById('ring');
  const slides = Array.from(ring.querySelectorAll('.slide'));
  const counter = document.getElementById('hud-counter');
  const dotsBox = document.getElementById('dots');

  const N = slides.length;
  const STEP = 360 / N;

  let angle = 0;             // angulo actual del anillo
  let target = 0;            // angulo objetivo (multiplo de STEP)
  let velocity = 0;          // inercia del arrastre
  let dragging = false;
  let radius = 0;

  const mod = (n, m) => ((n % m) + m) % m;
  const pad = (n) => String(n).padStart(2, '0');

  // indice de la slide que mira al frente segun el angulo
  const frontIndex = () => mod(Math.round(-angle / STEP), N);

  const layout = () => {
    // radio para que las slides no se traslapen: r = (w/2) / tan(pi/N)
    const w = ring.offsetWidth;
    radius = Math.round((w / 2) / Math.tan(Math.PI / N)) + 60;
    slides.forEach((s, i) => {
      s.style.transform = `rotateY(${i * STEP}deg) translateZ(${radius}px)`;
    });
  };

  const dots = slides.map((_, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.setAttribute('aria-label', `Ir a slide ${i + 1}`);
    b.addEventListener('click', () => goTo(i));
    dotsBox.appendChild(b);
    return b;
  });

  const updateHud = () => {
    const f = frontIndex();
    counter.textContent = `${pad(f + 1)} / ${pad(N)}`;
    dots.forEach((d, i) => d.classList.toggle('is-on', i === f));
    slides.forEach((s, i) => {
      s.classList.toggle('is-front', i === f);
      s.classList.toggle('is-far', i !== f);
    });
  };

  const goTo = (i) => {
    // gira por el camino corto hasta dejar la slide i al frente
    const desired = -i * STEP;
    let delta = desired - mod(target, 360);
    if (delta > 180) delta -= 360;
    if (delta < -180) delta += 360;
    target += delta;
    velocity = 0;
  };

  const nextSlide = () => { target -= STEP; velocity = 0; };
  const prevSlide = () => { target += STEP; velocity = 0; };

  // ---------- loop de animacion ----------
  let lastFront = -1;
  const tick = () => {
    if (dragging) {
      // mientras arrastra, el angulo lo escribe el handler de move
    } else if (Math.abs(velocity) > 0.05) {
      // inercia post-arrastre
      angle += velocity;
      velocity *= FRICTION;
      target = Math.round(angle / STEP) * STEP; // el iman seguira desde aqui
    } else {
      // iman hacia el objetivo
      angle += (target - angle) * SNAP;
    }

    ring.style.transform = `translateZ(${-radius}px) rotateY(${angle}deg)`;

    const f = frontIndex();
    if (f !== lastFront) { lastFront = f; updateHud(); }

    requestAnimationFrame(tick);
  };

  // ---------- arrastre (pointer events: mouse + tactil) ----------
  let pointerX = 0;
  let lastDX = 0;

  stage.addEventListener('pointerdown', (e) => {
    dragging = true;
    pointerX = e.clientX;
    lastDX = 0;
    velocity = 0;
    stage.classList.add('is-dragging');
    stage.setPointerCapture(e.pointerId);
  });

  stage.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    lastDX = (e.clientX - pointerX) * DRAG_SENS;
    angle += lastDX;
    pointerX = e.clientX;
  });

  const endDrag = () => {
    if (!dragging) return;
    dragging = false;
    stage.classList.remove('is-dragging');
    velocity = lastDX;
    target = Math.round(angle / STEP) * STEP;
  };
  stage.addEventListener('pointerup', endDrag);
  stage.addEventListener('pointercancel', endDrag);

  // click en una slide lateral la trae al frente
  slides.forEach((s, i) => {
    s.addEventListener('click', () => {
      if (i !== frontIndex() && Math.abs(velocity) < 1) goTo(i);
    });
  });

  // ---------- teclado ----------
  document.addEventListener('keydown', (e) => {
    switch (e.key) {
      case 'ArrowRight':
      case 'ArrowDown':
      case 'PageDown':
      case ' ':
        e.preventDefault(); nextSlide(); break;
      case 'ArrowLeft':
      case 'ArrowUp':
      case 'PageUp':
        e.preventDefault(); prevSlide(); break;
      case 'Home':
        e.preventDefault(); goTo(0); break;
      case 'End':
        e.preventDefault(); goTo(N - 1); break;
    }
  });

  // ---------- rueda ----------
  let wheelLock = 0;
  document.addEventListener('wheel', (e) => {
    const now = Date.now();
    if (now - wheelLock < 450 || Math.abs(e.deltaY) < 18) return;
    wheelLock = now;
    if (e.deltaY > 0) nextSlide(); else prevSlide();
  }, { passive: true });

  window.addEventListener('resize', layout);

  layout();
  updateHud();
  tick();
})();
