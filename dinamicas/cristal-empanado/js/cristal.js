(() => {
  'use strict';

  // Ajustes del vaho
  const REFOG_ALPHA = 0.0011; // niebla que regresa por frame (~45 s para cubrir)
  const BRUJA_RADIO = 30;     // radio del dedo que limpia (px CSS)
  const GOTA_PROB = 0.03;     // probabilidad de gota por estampada de brocha
  const MAX_GOTAS = 40;

  const cristal = document.getElementById('cristal');
  const canvas = document.getElementById('vaho');
  const ctx = canvas.getContext('2d');
  const overlay = document.getElementById('overlay');

  let ancho = 0;
  let alto = 0;
  let gotas = [];
  let alientos = [];
  let limpiando = false;
  let previo = null;
  let ultimoPunto = null;
  let noisePattern = null;
  let tPrevio = performance.now();

  // ---------- textura de ruido para que el vaho no sea plano ----------

  const crearRuido = () => {
    const tile = document.createElement('canvas');
    tile.width = 128;
    tile.height = 128;
    const tctx = tile.getContext('2d');
    const img = tctx.createImageData(128, 128);
    for (let i = 0; i < img.data.length; i += 4) {
      const g = 200 + Math.random() * 45;
      img.data[i] = g;
      img.data[i + 1] = g + 6;
      img.data[i + 2] = g + 12;
      img.data[i + 3] = Math.random() * 46;
    }
    tctx.putImageData(img, 0, 0);
    noisePattern = ctx.createPattern(tile, 'repeat');
  };

  const capaVaho = (alpha, conRuido) => {
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = 'rgba(204, 216, 226, ' + alpha + ')';
    ctx.fillRect(0, 0, ancho, alto);
    if (conRuido && noisePattern) {
      ctx.globalAlpha = Math.min(1, alpha * 3);
      ctx.fillStyle = noisePattern;
      ctx.fillRect(0, 0, ancho, alto);
      ctx.globalAlpha = 1;
    }
  };

  const empanarTodo = () => {
    ctx.clearRect(0, 0, ancho, alto);
    capaVaho(0.93, false);
    capaVaho(0.4, true);
    capaVaho(0.3, true);
  };

  const redimensionar = () => {
    const r = cristal.getBoundingClientRect();
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    ancho = r.width;
    alto = r.height;
    canvas.width = Math.round(ancho * dpr);
    canvas.height = Math.round(alto * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    crearRuido();
    empanarTodo();
  };

  // ---------- brocha (destination-out = quitar vaho) ----------

  const estampar = (x, y, radio, alpha) => {
    ctx.globalCompositeOperation = 'destination-out';
    const g = ctx.createRadialGradient(x, y, 0, x, y, radio);
    g.addColorStop(0, 'rgba(0,0,0,' + alpha + ')');
    g.addColorStop(0.65, 'rgba(0,0,0,' + alpha * 0.55 + ')');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, radio, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
  };

  const limpiarTramo = (a, b) => {
    const dist = Math.hypot(b.x - a.x, b.y - a.y);
    const pasos = Math.max(1, Math.ceil(dist / (BRUJA_RADIO * 0.45)));
    for (let i = 0; i <= pasos; i++) {
      const x = a.x + (b.x - a.x) * (i / pasos);
      const y = a.y + (b.y - a.y) * (i / pasos);
      estampar(x, y, BRUJA_RADIO, 0.9);
      if (gotas.length < MAX_GOTAS && Math.random() < GOTA_PROB) {
        gotas.push({
          x: x + (Math.random() - 0.5) * BRUJA_RADIO,
          y: y + BRUJA_RADIO * 0.4,
          vy: 20 + Math.random() * 30,
          r: 1.6 + Math.random() * 1.8,
          recorrido: 0,
          max: 90 + Math.random() * 200,
          fase: Math.random() * Math.PI * 2
        });
      }
    }
  };

  // ---------- aliento (source-over = agregar vaho) ----------

  const soplar = () => {
    const p = ultimoPunto || { x: ancho / 2, y: alto / 2 };
    alientos.push({
      x: Math.min(Math.max(p.x, 90), ancho - 90),
      y: Math.min(Math.max(p.y, 80), alto - 80),
      t: 0,
      dur: 650,
      radio: Math.min(180, ancho * 0.3)
    });
  };

  const pintarAliento = (a, dt) => {
    a.t += dt;
    const k = Math.min(1, a.t / a.dur);
    const radio = a.radio * (0.25 + 0.75 * k);
    ctx.globalCompositeOperation = 'source-over';
    const g = ctx.createRadialGradient(a.x, a.y, 0, a.x, a.y, radio);
    const alpha = 0.16 * (1 - k * 0.5);
    g.addColorStop(0, 'rgba(210, 222, 232, ' + alpha + ')');
    g.addColorStop(0.7, 'rgba(210, 222, 232, ' + alpha * 0.6 + ')');
    g.addColorStop(1, 'rgba(210, 222, 232, 0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(a.x, a.y, radio, 0, Math.PI * 2);
    ctx.fill();
    return k < 1;
  };

  // ---------- gotas que escurren ----------

  const moverGotas = (dt) => {
    const s = dt / 1000;
    gotas = gotas.filter((g) => {
      g.vy = Math.min(140, g.vy + 220 * s);
      const dy = g.vy * s;
      g.y += dy;
      g.recorrido += dy;
      g.x += Math.sin(g.y / 26 + g.fase) * 0.35;
      const apagado = Math.max(0.15, 1 - g.recorrido / g.max);
      estampar(g.x, g.y, g.r + 1.2, 0.5 * apagado);
      return g.y < alto + 8 && g.recorrido < g.max;
    });
  };

  // ---------- ciclo ----------

  const ciclo = (t) => {
    const dt = Math.min(64, t - tPrevio);
    tPrevio = t;

    capaVaho(REFOG_ALPHA * (dt / 16.7), false);
    if (Math.random() < 0.02) capaVaho(0.004, true);

    alientos = alientos.filter((a) => pintarAliento(a, dt));
    moverGotas(dt);

    requestAnimationFrame(ciclo);
  };

  // ---------- eventos ----------

  const puntoDe = (e) => {
    const r = canvas.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };

  canvas.addEventListener('pointerdown', (e) => {
    limpiando = true;
    previo = puntoDe(e);
    ultimoPunto = previo;
    estampar(previo.x, previo.y, BRUJA_RADIO, 0.9);
    canvas.setPointerCapture(e.pointerId);
  });

  canvas.addEventListener('pointermove', (e) => {
    if (!limpiando) return;
    const p = puntoDe(e);
    limpiarTramo(previo, p);
    previo = p;
    ultimoPunto = p;
  });

  const soltarPointer = () => { limpiando = false; previo = null; };
  canvas.addEventListener('pointerup', soltarPointer);
  canvas.addEventListener('pointercancel', soltarPointer);

  document.getElementById('btn-aliento').addEventListener('click', soplar);
  document.addEventListener('keydown', (e) => {
    if ((e.key === 'b' || e.key === 'B') && overlay.hidden) soplar();
  });

  document.getElementById('btn-ayuda').addEventListener('click', () => { overlay.hidden = false; });
  document.getElementById('btn-entendido').addEventListener('click', () => { overlay.hidden = true; });

  window.addEventListener('resize', redimensionar);

  redimensionar();
  requestAnimationFrame(ciclo);
})();
