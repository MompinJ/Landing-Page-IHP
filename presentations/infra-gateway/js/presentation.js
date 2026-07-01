(function () {
  const deck = document.getElementById('deck');
  const slides = Array.from(document.querySelectorAll('.slide'));
  const navContainer = document.getElementById('slide-nav-dots');
  const progressFill = document.querySelector('.progress-bar__fill');
  const counterEl = document.querySelector('.slide-counter');
  const total = slides.length;

  if (!deck || total === 0) return;

  const slideTitles = [
    'Portada',
    'La idea en simple',
    'El mapa en simple',
    'App Service: el local de las apps',
    'Front Door: la entrada',
    'PostgreSQL: el archivero',
    'Redis: la memoria rapida',
    'Storage: la bodega de archivos',
    'Static Web App: el sitio web',
    'El soporte invisible',
    'Resumen de costos',
    'Como crece',
    'Cierre',
  ];

  let dots = [];
  let currentIndex = 0;

  if (navContainer) {
    slides.forEach(function (_, i) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'slide-nav__dot' + (i === 0 ? ' slide-nav__dot--active' : '');
      btn.dataset.slide = String(i);
      btn.setAttribute('aria-label', 'Diapositiva ' + (i + 1) + ': ' + (slideTitles[i] || ''));
      if (i === 0) btn.setAttribute('aria-current', 'true');
      navContainer.appendChild(btn);
    });
    dots = Array.from(navContainer.querySelectorAll('.slide-nav__dot'));
  }

  function getActiveIndex() {
    const viewportMid = deck.scrollTop + deck.clientHeight / 2;
    let closest = 0;
    let minDist = Infinity;
    slides.forEach(function (slide, i) {
      const slideMid = slide.offsetTop + slide.offsetHeight / 2;
      const dist = Math.abs(viewportMid - slideMid);
      if (dist < minDist) { minDist = dist; closest = i; }
    });
    return closest;
  }

  function goTo(index) {
    const clamped = Math.max(0, Math.min(index, total - 1));
    currentIndex = clamped;
    slides[clamped].scrollIntoView({ behavior: 'smooth', block: 'start' });
    updateUI();
  }

  function updateUI() {
    dots.forEach(function (dot, i) {
      dot.classList.toggle('slide-nav__dot--active', i === currentIndex);
      if (i === currentIndex) dot.setAttribute('aria-current', 'true');
      else dot.removeAttribute('aria-current');
    });
    if (progressFill) progressFill.style.width = ((currentIndex + 1) / total) * 100 + '%';
    if (counterEl) {
      counterEl.textContent =
        String(currentIndex + 1).padStart(2, '0') + ' / ' + String(total).padStart(2, '0');
    }
  }

  dots.forEach(function (dot, i) {
    dot.addEventListener('click', function () { goTo(i); });
  });

  deck.addEventListener('scroll', function () {
    const idx = getActiveIndex();
    if (idx !== currentIndex) { currentIndex = idx; updateUI(); }
  }, { passive: true });

  document.addEventListener('keydown', function (e) {
    const keysNext = ['ArrowDown', 'ArrowRight', 'PageDown', ' '];
    const keysPrev = ['ArrowUp', 'ArrowLeft', 'PageUp'];
    if (keysNext.includes(e.key)) { e.preventDefault(); goTo(currentIndex + 1); }
    else if (keysPrev.includes(e.key)) { e.preventDefault(); goTo(currentIndex - 1); }
    else if (e.key === 'Home') { e.preventDefault(); goTo(0); }
    else if (e.key === 'End') { e.preventDefault(); goTo(total - 1); }
  });

  updateUI();
})();
