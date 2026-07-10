(() => {
  'use strict';

  const dial = document.getElementById('dial');
  const aguja = document.getElementById('aguja');
  const lector = document.getElementById('lector-num');
  const misionEl = document.getElementById('mision');
  const manija = document.getElementById('manija');
  const puerta = document.getElementById('puerta');
  const pista = document.getElementById('pista');
  const pernos = Array.from(document.querySelectorAll('.perno'));
  const lamparas = [0, 1, 2].map((i) => document.getElementById('lamp-' + i));
  const overlay = document.getElementById('overlay');

  // giro en sentido horario = numeros ascendentes bajo la aguja
  const PASO_GRADOS = 3.6;
  const QUIETO_MS = 550;
  const TOLERANCIA_ERROR = 25; // unidades giradas al reves antes de avisar

  const FLECHAS = { der: '↻︎', izq: '↺︎' };
  const DIRECCIONES = ['der', 'izq', 'der'];

  let combo = [];
  let paso = 0;
  let fase = 'dial'; // dial | manija | abierta
  let rot = 0;
  let ultimoEntero = 0;
  let ultimaDir = 0; // 1 = horario (der), -1 = antihorario (izq)
  let malAcumulado = 0;
  let timerQuieto = null;
  let arrastrando = false;
  let anguloPrevio = 0;

  const mod100 = (n) => ((n % 100) + 100) % 100;
  const valor = () => mod100(rot / PASO_GRADOS);

  const nuevaCombo = () => {
    const nums = [];
    while (nums.length < 3) {
      const n = Math.floor(Math.random() * 100);
      if (nums.every((m) => Math.min(mod100(n - m), mod100(m - n)) >= 10)) nums.push(n);
    }
    return nums;
  };

  const pintarMision = () => {
    misionEl.innerHTML = combo.map((n, i) =>
      '<span class="paso" id="paso-' + i + '">' +
      '<span class="paso__flecha">' + FLECHAS[DIRECCIONES[i]] + '</span>' +
      String(n).padStart(2, '0') +
      '</span>'
    ).join('');
    actualizarPasos();
  };

  const actualizarPasos = () => {
    combo.forEach((_, i) => {
      const el = document.getElementById('paso-' + i);
      el.classList.toggle('hecho', i < paso);
      el.classList.toggle('actual', i === paso && fase === 'dial');
    });
  };

  const construirDial = () => {
    dial.innerHTML = '';
    const radio = dial.clientWidth / 2;
    for (let n = 0; n < 100; n++) {
      const ang = -n * PASO_GRADOS; // horario = ascendente
      const tick = document.createElement('span');
      tick.className = 'tick' + (n % 10 === 0 ? ' tick--diez' : '');
      const largo = n % 10 === 0 ? 16 : 10;
      tick.style.transform =
        'translate(-50%, -50%) rotate(' + ang + 'deg) translateY(' + (-(radio - 10 - largo / 2)) + 'px)';
      dial.appendChild(tick);
      if (n % 10 === 0) {
        const num = document.createElement('span');
        num.className = 'dial__num';
        num.textContent = n;
        num.style.transform =
          'translate(-50%, -50%) rotate(' + ang + 'deg) translateY(' + (-(radio - 44)) + 'px)';
        dial.appendChild(num);
      }
    }
    const centro = document.createElement('span');
    centro.className = 'dial__centro';
    dial.appendChild(centro);
  };

  const render = () => {
    dial.style.transform = 'rotate(' + rot + 'deg)';
    const v = Math.round(valor()) % 100;
    lector.textContent = String(v).padStart(2, '0');
    dial.setAttribute('aria-valuenow', String(v));
    const entero = Math.floor(valor());
    if (entero !== ultimoEntero) {
      ultimoEntero = entero;
      aguja.classList.remove('tic');
      void aguja.offsetWidth;
      aguja.classList.add('tic');
    }
  };

  const avisarDireccion = () => {
    const chip = document.getElementById('paso-' + paso);
    if (!chip || chip.classList.contains('error')) return;
    chip.classList.add('error');
    setTimeout(() => chip.classList.remove('error'), 900);
  };

  const programarQuieto = () => {
    clearTimeout(timerQuieto);
    if (fase !== 'dial') return;
    const objetivo = combo[paso];
    const dirNecesaria = DIRECCIONES[paso] === 'der' ? 1 : -1;
    if (Math.round(valor()) % 100 !== objetivo || ultimaDir !== dirNecesaria) return;
    timerQuieto = setTimeout(fijarSeguro, QUIETO_MS);
  };

  const fijarSeguro = () => {
    lamparas[paso].classList.add('on');
    dial.classList.remove('clunk');
    void dial.offsetWidth;
    dial.classList.add('clunk');
    paso++;
    malAcumulado = 0;
    if (paso >= 3) {
      fase = 'manija';
      dial.classList.add('bloqueado');
      manija.hidden = false;
      setTimeout(() => manija.classList.add('lista'), 30);
      pista.textContent = 'Seguros abiertos: gira la manija';
    } else {
      pista.textContent = 'Seguro ' + paso + ' de 3 abierto, sigue con el ' + (paso + 1);
    }
    actualizarPasos();
  };

  const girar = (deltaGrados) => {
    if (fase !== 'dial') return;
    rot += deltaGrados;
    const dir = Math.sign(deltaGrados);
    if (dir !== 0) {
      ultimaDir = dir;
      const dirNecesaria = DIRECCIONES[paso] === 'der' ? 1 : -1;
      if (dir !== dirNecesaria) {
        malAcumulado += Math.abs(deltaGrados) / PASO_GRADOS;
        if (malAcumulado > TOLERANCIA_ERROR) {
          malAcumulado = 0;
          avisarDireccion();
        }
      } else {
        malAcumulado = Math.max(0, malAcumulado - Math.abs(deltaGrados) / PASO_GRADOS);
      }
    }
    render();
    programarQuieto();
  };

  // ---------- pointer ----------

  const anguloDe = (e) => {
    const r = dial.getBoundingClientRect();
    return Math.atan2(e.clientY - (r.top + r.height / 2), e.clientX - (r.left + r.width / 2)) * 180 / Math.PI;
  };

  dial.addEventListener('pointerdown', (e) => {
    if (fase !== 'dial') return;
    arrastrando = true;
    anguloPrevio = anguloDe(e);
    dial.setPointerCapture(e.pointerId);
  });

  dial.addEventListener('pointermove', (e) => {
    if (!arrastrando) return;
    const a = anguloDe(e);
    let delta = a - anguloPrevio;
    if (delta > 180) delta -= 360;
    if (delta < -180) delta += 360;
    anguloPrevio = a;
    girar(delta);
  });

  const soltar = () => { arrastrando = false; };
  dial.addEventListener('pointerup', soltar);
  dial.addEventListener('pointercancel', soltar);

  dial.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
      e.preventDefault();
      girar(PASO_GRADOS);
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
      e.preventDefault();
      girar(-PASO_GRADOS);
    }
  });

  // ---------- manija y puerta ----------

  const abrir = () => {
    if (fase !== 'manija') return;
    fase = 'abierta';
    manija.classList.add('girada');
    pista.textContent = 'Abriendo...';
    setTimeout(() => {
      pernos.forEach((p, i) => setTimeout(() => p.classList.add('retraido'), i * 130));
    }, 550);
    setTimeout(() => {
      puerta.classList.add('abierta');
      pista.textContent = 'Boveda abierta';
    }, 1100);
  };

  manija.addEventListener('click', abrir);
  manija.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); abrir(); }
  });

  const reiniciar = () => {
    clearTimeout(timerQuieto);
    combo = nuevaCombo();
    paso = 0;
    fase = 'dial';
    rot = 0;
    ultimaDir = 0;
    malAcumulado = 0;
    puerta.classList.remove('abierta');
    manija.classList.remove('lista', 'girada');
    manija.hidden = true;
    dial.classList.remove('bloqueado');
    lamparas.forEach((l) => l.classList.remove('on'));
    pernos.forEach((p) => p.classList.remove('retraido'));
    pista.textContent = 'Gira el dial en la direccion indicada y detente en el numero';
    pintarMision();
    render();
    dial.focus({ preventScroll: true });
  };

  document.getElementById('btn-reiniciar').addEventListener('click', reiniciar);
  document.getElementById('btn-ayuda').addEventListener('click', () => { overlay.hidden = false; });
  document.getElementById('btn-entendido').addEventListener('click', () => {
    overlay.hidden = true;
    dial.focus({ preventScroll: true });
  });

  window.addEventListener('resize', construirDial);

  construirDial();
  reiniciar();
})();
