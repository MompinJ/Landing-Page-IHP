/* ============================================================
   PLANTILLA ALTAMAR 3D — motor de travesia
   - Oleaje: 3 capas de ondas sinusoidales en canvas, con una
     "marejada" (SURGE) que se dispara en cada transicion.
   - Cielo: fases del dia repartidas entre las slides; dos capas
     DOM crossfadean el degradado y el sol/luna viaja en arco.
   - Bitacora: lat/lon ficticias que avanzan con la travesia.
   ============================================================ */

(() => {
  // ---------- configuracion rapida ----------
  const SWELL = 14;          // amplitud base del oleaje (px)
  const SURGE = 46;          // amplitud extra durante la transicion
  const WAVE_SPEED = 0.9;    // velocidad de crucero de las olas

  // fases del dia: [cieloArriba, cieloAbajo, colorAstro, esAstroLuna]
  const SKY = [
    ['#2a3f63', '#f4a868', '#ffd9a0', false],  // amanecer
    ['#4a7fb5', '#bfdcec', '#fff3c4', false],  // manana
    ['#3a76c4', '#9cc8e8', '#fffbe8', false],  // mediodia
    ['#34335f', '#e86f4d', '#ffc46b', false],  // atardecer
    ['#070d1f', '#1d2c4f', '#e8ecf4', true]    // noche
  ];

  const slides = Array.from(document.querySelectorAll('.slide'));
  const skyA = document.getElementById('sky-a');
  const skyB = document.getElementById('sky-b');
  const orb = document.getElementById('orb');
  const sea = document.getElementById('sea');
  const ctx = sea.getContext('2d');
  const hudPos = document.getElementById('hud-pos');
  const counter = document.getElementById('hud-counter');

  let current = 0;
  let moving = false;
  let surge = 0;            // 0..1, marejada activa
  let frontIsA = true;      // que capa de cielo esta visible

  const pad = (n) => String(n + 1).padStart(2, '0');

  // fase del cielo para una slide (se reparten linealmente)
  const phaseFor = (i) => {
    if (slides.length < 2) return SKY[0];
    const t = i / (slides.length - 1);
    return SKY[Math.min(Math.floor(t * SKY.length), SKY.length - 1)];
  };

  const paintSky = (layer, phase) => {
    layer.style.background = `linear-gradient(180deg, ${phase[0]}, ${phase[1]} 78%)`;
  };

  const placeOrb = (i, phase) => {
    // el astro recorre un arco de izquierda a derecha durante la travesia
    const t = slides.length < 2 ? 0 : i / (slides.length - 1);
    const x = 12 + t * 76;                      // % horizontal
    const y = 38 - Math.sin(t * Math.PI) * 26;  // arco: alto al mediodia
    orb.style.left = `calc(${x}% - 45px)`;
    orb.style.top = `${y}%`;
    orb.style.background = phase[3]
      ? `radial-gradient(circle at 38% 35%, #ffffff, ${phase[2]} 60%, #b9c2d8)`
      : `radial-gradient(circle at 40% 38%, #fffdf2, ${phase[2]})`;
    orb.style.boxShadow = phase[3]
      ? `0 0 50px rgba(232, 236, 244, 0.5)`
      : `0 0 80px ${phase[2]}, 0 0 160px rgba(255, 220, 150, 0.35)`;
  };

  const setSky = (i, instant = false) => {
    const phase = phaseFor(i);
    const front = frontIsA ? skyA : skyB;
    const back = frontIsA ? skyB : skyA;
    if (instant) {
      paintSky(front, phase);
      placeOrb(i, phase);
      return;
    }
    paintSky(back, phase);
    back.style.opacity = '1';
    front.style.opacity = '0';
    frontIsA = !frontIsA;
    placeOrb(i, phase);
  };

  // ---------- bitacora (posicion ficticia que avanza) ----------
  const fmtPos = (i) => {
    const lat = 19.2 + i * 0.43;
    const lon = 96.13 + i * 0.61;
    const dms = (v) => `${Math.floor(v)}°${String(Math.round((v % 1) * 60)).padStart(2, '0')}'`;
    return `LAT ${dms(lat)}N · LON ${dms(lon)}W`;
  };

  const updateHud = () => {
    counter.textContent = `SINGLADURA ${pad(current)} / ${pad(slides.length - 1)}`;
    hudPos.textContent = fmtPos(current);
  };

  // ---------- navegacion ----------
  const goTo = (target) => {
    if (moving || target < 0 || target >= slides.length || target === current) return;
    moving = true;

    const out = slides[current];
    const inn = slides[target];
    const back = target < current;

    out.classList.remove('is-active');
    out.classList.add(back ? 'is-leaving-back' : 'is-leaving');
    if (back) {
      // la entrante viene desde sotavento (izquierda)
      inn.classList.add('is-entering-back');
      void inn.offsetWidth;
    }
    inn.classList.add('is-active');
    inn.classList.remove('is-entering-back');

    current = target;
    surge = 1; // se embravece el mar
    setSky(current);
    updateHud();

    setTimeout(() => {
      out.classList.remove('is-leaving', 'is-leaving-back');
      moving = false;
    }, 1050);
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
    if (now - wheelLock < 1150 || Math.abs(e.deltaY) < 18) return;
    wheelLock = now;
    if (e.deltaY > 0) goTo(current + 1); else goTo(current - 1);
  }, { passive: true });

  // ---------- oleaje en canvas ----------
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  let W = 0, H = 0;

  const resize = () => {
    W = sea.clientWidth;
    H = sea.clientHeight;
    sea.width = Math.round(W * dpr);
    sea.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };
  resize();
  window.addEventListener('resize', resize);

  // capas de mar: [opacidad, longitudOnda, fase, velocidad, alturaBase]
  const LAYERS = [
    ['rgba(18, 54, 92, 0.55)', 0.011, 0.0, 0.7, 0.30],
    ['rgba(10, 38, 70, 0.75)', 0.016, 2.1, 1.0, 0.45],
    ['rgba(5, 24, 48, 0.95)', 0.022, 4.2, 1.4, 0.62]
  ];

  let t = 0;
  const drawSea = () => {
    requestAnimationFrame(drawSea);
    t += 0.016 * WAVE_SPEED;
    surge *= 0.965; // la marejada amaina sola

    ctx.clearRect(0, 0, W, H);
    const amp = SWELL + surge * SURGE;

    LAYERS.forEach(([color, k, ph, sp, base], li) => {
      ctx.beginPath();
      ctx.moveTo(0, H);
      const yBase = H * base;
      for (let x = 0; x <= W; x += 6) {
        const y = yBase
          + Math.sin(x * k + t * sp + ph) * amp * (0.6 + li * 0.25)
          + Math.sin(x * k * 2.7 + t * sp * 1.6 + ph) * amp * 0.22;
        ctx.lineTo(x, y);
      }
      ctx.lineTo(W, H);
      ctx.closePath();
      ctx.fillStyle = color;
      ctx.fill();

      // espuma: linea clara sobre la cresta de la capa frontal
      if (li === LAYERS.length - 1) {
        ctx.beginPath();
        for (let x = 0; x <= W; x += 6) {
          const y = yBase
            + Math.sin(x * k + t * sp + ph) * amp * (0.6 + li * 0.25)
            + Math.sin(x * k * 2.7 + t * sp * 1.6 + ph) * amp * 0.22;
          if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.strokeStyle = `rgba(252, 251, 246, ${0.18 + surge * 0.4})`;
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
    });
  };

  // ---------- arranque ----------
  skyA.style.opacity = '1';
  skyB.style.opacity = '0';
  setSky(0, true);
  updateHud();
  drawSea();
})();
