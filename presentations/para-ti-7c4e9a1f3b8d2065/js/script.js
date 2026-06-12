/* ============================================================
   Carta — interacciones vanilla (sin libs)
   - Reveal al hacer scroll (IntersectionObserver)
   - Cielo de corazones flotantes + estrellas titilantes
   - Parallax ligero del fondo (requestAnimationFrame)
   ============================================================ */
(() => {
  'use strict';

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ── 1. Reveal de secciones ── */
  const revealEls = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window && !reduceMotion) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.16, rootMargin: '0px 0px -8% 0px' });
    revealEls.forEach((el) => io.observe(el));
  } else {
    // Sin soporte o con motion reducido: mostrar todo de una vez
    revealEls.forEach((el) => el.classList.add('is-visible'));
  }

  /* ── 1b. Easter eggs: estrellas que revelan una foto ── */
  const lightbox = document.getElementById('lightbox');
  if (lightbox) {
    const lbImg = document.getElementById('lb-img');
    const lbCap = document.getElementById('lb-cap');
    const lbClose = document.getElementById('lb-close');
    let lastFocus = null;

    const openLB = (btn) => {
      lastFocus = btn;
      lbImg.src = btn.getAttribute('data-img') || '';
      lbImg.alt = btn.getAttribute('data-cap') || '';
      const cap = btn.getAttribute('data-cap') || '';
      lbCap.textContent = cap;
      lbCap.style.display = cap.trim() ? '' : 'none';
      lightbox.classList.add('open');
      document.body.style.overflow = 'hidden';
      lbClose.focus();
    };
    const closeLB = () => {
      lightbox.classList.remove('open');
      document.body.style.overflow = '';
      if (lastFocus) lastFocus.focus();
    };

    document.querySelectorAll('.secret').forEach((btn) => {
      btn.addEventListener('click', () => openLB(btn));
    });
    lbClose.addEventListener('click', closeLB);
    // cerrar al tocar fuera de la foto
    lightbox.addEventListener('click', (e) => {
      if (e.target === lightbox) closeLB();
    });
    // cerrar con Escape
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && lightbox.classList.contains('open')) closeLB();
    });
  }

  if (reduceMotion) return; // no generamos el cielo si el usuario prefiere menos movimiento

  /* ── 2. Cielo: corazones + estrellas ── */
  const sky = document.getElementById('sky');
  if (!sky) return;

  const HEARTS = ['❤', '❥', '♡', '✿', '✧']; // ❤ ❥ ♡ ✿ ✧
  const rand = (min, max) => Math.random() * (max - min) + min;

  const makeHeart = () => {
    const el = document.createElement('span');
    el.className = 'heart';
    el.textContent = HEARTS[Math.floor(Math.random() * HEARTS.length)];
    el.style.left = rand(0, 100) + 'vw';
    el.style.fontSize = rand(10, 26) + 'px';
    const dur = rand(14, 26);
    el.style.animationDuration = dur + 's';
    el.style.animationDelay = '-' + rand(0, dur) + 's';
    el.style.opacity = rand(0.3, 0.7).toFixed(2);
    sky.appendChild(el);
  };

  const makeStar = () => {
    const el = document.createElement('span');
    el.className = 'star';
    el.style.left = rand(0, 100) + 'vw';
    el.style.top = rand(0, 100) + 'vh';
    const s = rand(2, 4);
    el.style.width = s + 'px';
    el.style.height = s + 'px';
    const dur = rand(2.5, 6);
    el.style.animationDuration = dur + 's';
    el.style.animationDelay = '-' + rand(0, dur) + 's';
    sky.appendChild(el);
  };

  // Densidad adaptada al tamano de pantalla
  const area = window.innerWidth * window.innerHeight;
  const heartCount = Math.min(28, Math.round(area / 48000));
  const starCount = Math.min(60, Math.round(area / 22000));

  for (let i = 0; i < heartCount; i++) makeHeart();
  for (let i = 0; i < starCount; i++) makeStar();

  /* ── 3. Parallax ligero del fondo aurora ── */
  const aurora = document.querySelector('.bg-aurora');
  if (aurora) {
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const y = window.scrollY * 0.04;
        aurora.style.transform = 'translateY(' + y + 'px)';
        ticking = false;
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
  }
})();
