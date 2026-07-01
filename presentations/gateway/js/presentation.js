/* ============================================================
   Gateway by Hutchison Ports - motor de presentacion
   Vanilla JS: navegacion teclado / swipe / rueda / dots,
   barra de progreso, count-up y tema de chrome por slide.
   ============================================================ */
(function () {
  'use strict';

  var slides = Array.prototype.slice.call(document.querySelectorAll('.slide'));
  var total = slides.length;
  var current = 0;
  var animating = false;

  var progressEl = document.querySelector('.progress');
  var counterCur = document.querySelector('.counter b');
  var counterTot = document.querySelector('.counter .tot');
  var dotsWrap = document.querySelector('.nav .dots');
  var body = document.body;

  /* --- construir dots --- */
  var dots = [];
  for (var i = 0; i < total; i++) {
    var d = document.createElement('button');
    d.className = 'dot';
    d.setAttribute('aria-label', 'Ir a la diapositiva ' + (i + 1));
    (function (idx) {
      d.addEventListener('click', function () { goTo(idx); });
    })(i);
    dotsWrap.appendChild(d);
    dots.push(d);
  }

  if (counterTot) counterTot.textContent = String(total);

  /* --- count-up --- */
  function runCountUps(slide) {
    var nums = slide.querySelectorAll('[data-count]');
    nums.forEach(function (el) {
      var target = parseFloat(el.getAttribute('data-count'));
      var suffix = el.getAttribute('data-suffix') || '';
      var prefix = el.getAttribute('data-prefix') || '';
      var decimals = (String(target).split('.')[1] || '').length;
      var dur = 1500;
      var start = null;
      function tick(ts) {
        if (start === null) start = ts;
        var p = Math.min((ts - start) / dur, 1);
        var eased = 1 - Math.pow(1 - p, 3);
        var val = target * eased;
        el.textContent = prefix + val.toFixed(decimals) + suffix;
        if (p < 1) requestAnimationFrame(tick);
        else el.textContent = prefix + target.toFixed(decimals) + suffix;
      }
      el.textContent = prefix + '0' + suffix;
      requestAnimationFrame(tick);
    });
  }

  /* --- render --- */
  function render() {
    slides.forEach(function (s, idx) {
      s.classList.toggle('active', idx === current);
    });
    dots.forEach(function (d, idx) {
      d.classList.toggle('on', idx === current);
    });

    var pct = total > 1 ? (current / (total - 1)) * 100 : 100;
    if (progressEl) progressEl.style.width = pct + '%';
    if (counterCur) counterCur.textContent = String(current + 1);

    var active = slides[current];
    var dark = active.classList.contains('slide--dark') || active.classList.contains('slide--navy');
    body.classList.toggle('on-dark', dark);

    var chromeLogo = document.getElementById('chromeLogo');
    if (chromeLogo) {
      chromeLogo.src = dark ? 'assets/hports.webp' : 'assets/hutchisonports.webp';
    }

    runCountUps(active);
    if (history.replaceState) history.replaceState(null, '', '#' + (current + 1));
  }

  function goTo(idx) {
    if (idx < 0 || idx >= total || idx === current || animating) return;
    animating = true;
    current = idx;
    render();
    setTimeout(function () { animating = false; }, 650);
  }
  function next() { goTo(current + 1); }
  function prev() { goTo(current - 1); }

  /* --- teclado --- */
  document.addEventListener('keydown', function (e) {
    switch (e.key) {
      case 'ArrowRight':
      case 'PageDown':
      case ' ':
        e.preventDefault(); next(); break;
      case 'ArrowLeft':
      case 'PageUp':
        e.preventDefault(); prev(); break;
      case 'Home':
        e.preventDefault(); goTo(0); break;
      case 'End':
        e.preventDefault(); goTo(total - 1); break;
    }
  });

  /* --- rueda (con debounce) --- */
  var wheelLock = false;
  window.addEventListener('wheel', function (e) {
    if (Math.abs(e.deltaY) < 18) return;
    if (wheelLock) return;
    wheelLock = true;
    if (e.deltaY > 0) next(); else prev();
    setTimeout(function () { wheelLock = false; }, 700);
  }, { passive: true });

  /* --- swipe tactil --- */
  var touchX = 0, touchY = 0;
  window.addEventListener('touchstart', function (e) {
    touchX = e.changedTouches[0].clientX;
    touchY = e.changedTouches[0].clientY;
  }, { passive: true });
  window.addEventListener('touchend', function (e) {
    var dx = e.changedTouches[0].clientX - touchX;
    var dy = e.changedTouches[0].clientY - touchY;
    if (Math.abs(dx) > 55 && Math.abs(dx) > Math.abs(dy)) {
      if (dx < 0) next(); else prev();
    }
  }, { passive: true });

  /* --- flechas nav --- */
  var aPrev = document.querySelector('.arrow.prev');
  var aNext = document.querySelector('.arrow.next');
  if (aPrev) aPrev.addEventListener('click', prev);
  if (aNext) aNext.addEventListener('click', next);

  /* --- deep-link inicial --- */
  var startHash = parseInt((location.hash || '').replace('#', ''), 10);
  if (!isNaN(startHash) && startHash >= 1 && startHash <= total) {
    current = startHash - 1;
  }

  render();
})();
