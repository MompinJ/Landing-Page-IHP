(() => {
  'use strict';

  // Renglones de la cuenta. Editables: concepto y precio (MXN).
  const CUENTA = [
    { concepto: 'CAFE AMERICANO 12 OZ', precio: 38 },
    { concepto: 'CAPUCHINO GRANDE', precio: 52 },
    { concepto: 'CONCHA DE VAINILLA', precio: 22 },
    { concepto: 'CHILAQUILES VERDES', precio: 95 },
    { concepto: 'JUGO DE NARANJA', precio: 45 },
    { concepto: 'TORTA DE PIERNA', precio: 78 },
    { concepto: 'AGUA MINERAL', precio: 30 }
  ];

  // Fisica del gesto: el papel aguanta CEDE_PX y despues se desliza libre.
  const CEDE_PX = 34;
  const FRICCION = 0.12;
  const UMBRAL = 0.5; // fraccion del ancho para consumar el rasgado

  const cont = document.getElementById('items');
  const totalEl = document.getElementById('total');
  const sello = document.getElementById('sello');
  const folio = document.getElementById('folio');
  const fecha = document.getElementById('fecha');
  const overlay = document.getElementById('overlay');

  let vivos = [];
  let totalMostrado = 0;
  let animTotal = null;

  const dinero = (n) => '$' + n.toFixed(2);

  const zigzag = (amp) => {
    // Dos poligonos con los mismos vertices: recto y dentado, para poder
    // transicionar el clip-path al momento en que el papel cede.
    const pasos = 20;
    const recto = [];
    const roto = [];
    for (let i = 0; i <= pasos; i++) {
      const x = (i / pasos) * 100;
      recto.push(x.toFixed(1) + '% 0%');
      roto.push(x.toFixed(1) + '% ' + (Math.random() * amp).toFixed(1) + '%');
    }
    for (let i = pasos; i >= 0; i--) {
      const x = (i / pasos) * 100;
      recto.push(x.toFixed(1) + '% 100%');
      roto.push(x.toFixed(1) + '% ' + (100 - Math.random() * amp).toFixed(1) + '%');
    }
    return {
      recto: 'polygon(' + recto.join(',') + ')',
      roto: 'polygon(' + roto.join(',') + ')'
    };
  };

  const totalActual = () => vivos.reduce((s, v) => s + v.precio, 0);

  const rodarTotal = () => {
    const objetivo = totalActual();
    const inicio = totalMostrado;
    const t0 = performance.now();
    const DUR = 480;
    if (animTotal) cancelAnimationFrame(animTotal);
    const paso = (t) => {
      const k = Math.min(1, (t - t0) / DUR);
      const suave = 1 - Math.pow(1 - k, 3);
      totalMostrado = inicio + (objetivo - inicio) * suave;
      totalEl.textContent = dinero(totalMostrado);
      if (k < 1) animTotal = requestAnimationFrame(paso);
    };
    animTotal = requestAnimationFrame(paso);
  };

  const rasgar = (item, direccion) => {
    if (item.rasgado) return;
    item.rasgado = true;
    vivos = vivos.filter((v) => v !== item);

    const { fila, strip } = item;
    strip.classList.remove('regresa');
    strip.style.clipPath = item.clips.roto;
    strip.style.setProperty('--tx', (direccion * 130) + '%');
    strip.style.setProperty('--rot', (direccion * (16 + Math.random() * 14)).toFixed(1) + 'deg');
    strip.classList.add('rasgada');

    fila.style.height = fila.offsetHeight + 'px';
    // forzar reflow para que la transicion de altura arranque desde el valor fijo
    void fila.offsetHeight;
    fila.classList.add('colapsa');

    rodarTotal();
    setTimeout(() => {
      fila.remove();
      if (vivos.length === 0) sello.hidden = false;
    }, 660);
  };

  const armarGesto = (item) => {
    const { strip } = item;
    let x0 = 0;
    let cedido = false;
    let arrastrando = false;

    const mover = (e) => {
      if (!arrastrando) return;
      const dx = e.clientX - x0;
      const abs = Math.abs(dx);
      let off;
      if (abs <= CEDE_PX) {
        off = dx * FRICCION;
        if (cedido) {
          cedido = false;
          strip.classList.remove('cedio');
          strip.style.clipPath = item.clips.recto;
        }
      } else {
        off = Math.sign(dx) * (CEDE_PX * FRICCION + (abs - CEDE_PX));
        if (!cedido) {
          cedido = true;
          strip.classList.add('cedio');
          strip.style.clipPath = item.clips.roto;
        }
      }
      const rot = off / 60;
      strip.style.transform = 'translateX(' + off + 'px) rotate(' + rot + 'deg)';
      item.offset = off;
    };

    const soltar = () => {
      if (!arrastrando) return;
      arrastrando = false;
      const ancho = strip.offsetWidth;
      if (Math.abs(item.offset) > ancho * UMBRAL) {
        strip.style.transform = 'translateX(' + item.offset + 'px)';
        rasgar(item, Math.sign(item.offset) || 1);
      } else {
        strip.classList.add('regresa');
        strip.classList.remove('cedio');
        strip.style.clipPath = item.clips.recto;
        strip.style.transform = 'translateX(0) rotate(0deg)';
        cedido = false;
      }
      item.offset = 0;
    };

    strip.addEventListener('pointerdown', (e) => {
      if (item.rasgado) return;
      arrastrando = true;
      cedido = false;
      x0 = e.clientX;
      item.offset = 0;
      strip.classList.remove('regresa');
      strip.setPointerCapture(e.pointerId);
    });
    strip.addEventListener('pointermove', mover);
    strip.addEventListener('pointerup', soltar);
    strip.addEventListener('pointercancel', soltar);

    item.fila.addEventListener('keydown', (e) => {
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        strip.style.clipPath = item.clips.roto;
        rasgar(item, Math.random() < 0.5 ? -1 : 1);
      }
    });
  };

  const imprimir = () => {
    cont.innerHTML = '';
    sello.hidden = true;
    vivos = [];

    CUENTA.forEach((linea) => {
      const fila = document.createElement('div');
      fila.className = 'fila';
      fila.tabIndex = 0;
      fila.setAttribute('role', 'listitem');
      fila.setAttribute('aria-label', linea.concepto + ', ' + dinero(linea.precio) + '. Supr para rasgar');

      const strip = document.createElement('div');
      strip.className = 'strip';
      strip.innerHTML =
        '<span class="concepto">' + linea.concepto + '</span>' +
        '<span class="precio">' + dinero(linea.precio) + '</span>';

      const clips = zigzag(14);
      strip.style.clipPath = clips.recto;

      fila.appendChild(strip);
      cont.appendChild(fila);

      const item = { ...linea, fila, strip, clips, rasgado: false, offset: 0 };
      vivos.push(item);
      armarGesto(item);
    });

    folio.textContent = 'FOLIO ' + String(Math.floor(Math.random() * 999999)).padStart(6, '0');
    rodarTotal();
  };

  const hoy = new Date();
  fecha.textContent = hoy.toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' });

  document.getElementById('btn-reset').addEventListener('click', imprimir);
  document.getElementById('btn-ayuda').addEventListener('click', () => { overlay.hidden = false; });
  document.getElementById('btn-entendido').addEventListener('click', () => { overlay.hidden = true; });

  imprimir();
})();
