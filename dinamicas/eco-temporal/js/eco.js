(() => {
  'use strict';

  const HORAS = 72;

  // Curvas por rama: pares [hora, valor]. Interpolacion lineal entre puntos.
  const RAMAS = {
    gamma: {
      nombre: 'PLAN GAMMA',
      metricas: {
        rendimiento: [[0, 62], [8, 58], [16, 71], [30, 79], [48, 88], [72, 93]],
        saturacion: [[0, 55], [10, 64], [20, 58], [36, 49], [56, 42], [72, 36]],
        riesgo: [[0, 30], [8, 44], [18, 34], [36, 24], [72, 14]]
      },
      eventos: [
        { t: 4, txt: 'GAMMA reasigna 2 RTG del bloque A al bloque C' },
        { t: 8, txt: 'Ajuste inicial: rendimiento cae mientras el patio se reorganiza', critico: true },
        { t: 18, txt: 'Cuello de botella previsto en bahia 4: GAMMA desvia 14 camiones internos' },
        { t: 36, txt: 'Citas de transporte reprogramadas por ventana dinamica' },
        { t: 60, txt: 'El patio opera bajo el 45% de saturacion por primera vez en la semana' },
        { t: 72, txt: 'Pico absorbido: 96% de citas cumplidas' }
      ],
      veredicto: '<strong>[EVA]</strong> El plan de GAMMA dolio las primeras 8 horas: reorganizar cuesta. Pero cerro con 93% de rendimiento y el riesgo mas bajo del mes. Nota el eco: el plan manual nunca lo alcanzo.'
    },
    manual: {
      nombre: 'PLAN MANUAL',
      metricas: {
        rendimiento: [[0, 62], [12, 66], [24, 68], [40, 64], [56, 58], [72, 55]],
        saturacion: [[0, 55], [12, 60], [24, 68], [40, 77], [56, 85], [72, 90]],
        riesgo: [[0, 30], [16, 36], [32, 45], [48, 62], [60, 71], [72, 78]]
      },
      eventos: [
        { t: 6, txt: 'Turnos reforzados segun el procedimiento de picos de 2023' },
        { t: 20, txt: 'El bloque C alcanza 80% de ocupacion; se habilita zona de derrame' },
        { t: 40, txt: 'Remociones extra: 1 de cada 5 movimientos no es productivo', critico: true },
        { t: 56, txt: 'Camiones externos esperan 90 min en puerta', critico: true },
        { t: 68, txt: 'Se pospone la descarga de un feeder por falta de patio', critico: true },
        { t: 72, txt: 'Pico contenido a costa de 12% de citas incumplidas' }
      ],
      veredicto: '<strong>[EVA]</strong> El plan manual se sintio seguro hasta la hora 30. Despues el patio se saturo y el riesgo se disparo. Conocido no siempre significa suficiente: mira el eco de GAMMA en cada barra.'
    }
  };

  const METRICAS = [
    { id: 'rendimiento', el: document.getElementById('met-rendimiento'), alertaSi: (v) => v < 50 },
    { id: 'saturacion', el: document.getElementById('met-saturacion'), alertaSi: (v) => v > 75 },
    { id: 'riesgo', el: document.getElementById('met-riesgo'), alertaSi: (v) => v > 60 }
  ];

  const riel = document.getElementById('riel');
  const perilla = document.getElementById('perilla');
  const progreso = document.getElementById('riel-progreso');
  const lectura = document.getElementById('lectura');
  const rielEventos = document.getElementById('riel-eventos');
  const bitacora = document.getElementById('bitacora');
  const veredicto = document.getElementById('veredicto');
  const btnPlay = document.getElementById('btn-play');
  const overlay = document.getElementById('overlay');

  let rama = 'gamma';
  let hora = 0;
  let arrastrando = false;
  let reproduciendo = null;

  const otra = () => (rama === 'gamma' ? 'manual' : 'gamma');

  const interpolar = (curva, t) => {
    if (t <= curva[0][0]) return curva[0][1];
    for (let i = 1; i < curva.length; i++) {
      if (t <= curva[i][0]) {
        const [t0, v0] = curva[i - 1];
        const [t1, v1] = curva[i];
        return v0 + (v1 - v0) * ((t - t0) / (t1 - t0));
      }
    }
    return curva[curva.length - 1][1];
  };

  const pintarEventos = () => {
    rielEventos.innerHTML = '';
    bitacora.innerHTML = '';
    RAMAS[rama].eventos.forEach((ev, i) => {
      const rombo = document.createElement('span');
      rombo.className = 'rombo' + (ev.critico ? ' critico' : '');
      rombo.id = 'rombo-' + i;
      rombo.style.left = (ev.t / HORAS * 100) + '%';
      rielEventos.appendChild(rombo);

      const li = document.createElement('li');
      li.className = 'evento' + (ev.critico ? ' critico' : '');
      li.id = 'evento-' + i;
      li.innerHTML = '<span class="evento__t">T+' + ev.t + 'h</span>' + ev.txt;
      bitacora.appendChild(li);
    });
  };

  const refrescar = () => {
    const pct = hora / HORAS * 100;
    perilla.style.left = pct + '%';
    progreso.style.width = pct + '%';
    lectura.textContent = 'T+' + Math.round(hora) + 'h';
    perilla.setAttribute('aria-valuenow', String(Math.round(hora)));

    METRICAS.forEach((m) => {
      const v = interpolar(RAMAS[rama].metricas[m.id], hora);
      const eco = interpolar(RAMAS[otra()].metricas[m.id], hora);
      m.el.querySelector('.metrica__nivel').style.height = v + '%';
      m.el.querySelector('.metrica__eco').style.bottom = eco + '%';
      m.el.querySelector('.metrica__valor').textContent = Math.round(v) + '%';
      m.el.classList.toggle('alerta', m.alertaSi(v));
    });

    RAMAS[rama].eventos.forEach((ev, i) => {
      const pasado = hora >= ev.t;
      document.getElementById('rombo-' + i).classList.toggle('pasado', pasado);
      document.getElementById('evento-' + i).classList.toggle('pasado', pasado);
    });

    veredicto.innerHTML = hora >= HORAS ? RAMAS[rama].veredicto :
      '<strong>[GAMMA]</strong> Proyeccion al ' + Math.round(hora / HORAS * 100) + '%. La marca ambar en cada barra es el otro plan.';
  };

  const fijarHora = (h) => {
    hora = Math.max(0, Math.min(HORAS, h));
    refrescar();
  };

  const detener = () => {
    if (!reproduciendo) return;
    cancelAnimationFrame(reproduciendo);
    reproduciendo = null;
    btnPlay.textContent = 'REPRODUCIR';
  };

  // ---------- arrastre ----------

  const horaDe = (e) => {
    const r = riel.getBoundingClientRect();
    return (e.clientX - r.left) / r.width * HORAS;
  };

  riel.addEventListener('pointerdown', (e) => {
    detener();
    arrastrando = true;
    riel.setPointerCapture(e.pointerId);
    fijarHora(horaDe(e));
  });

  riel.addEventListener('pointermove', (e) => {
    if (arrastrando) fijarHora(horaDe(e));
  });

  const soltar = () => { arrastrando = false; };
  riel.addEventListener('pointerup', soltar);
  riel.addEventListener('pointercancel', soltar);

  perilla.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') { e.preventDefault(); detener(); fijarHora(hora + 2); }
    if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') { e.preventDefault(); detener(); fijarHora(hora - 2); }
    if (e.key === 'Home') { e.preventDefault(); detener(); fijarHora(0); }
    if (e.key === 'End') { e.preventDefault(); detener(); fijarHora(HORAS); }
  });

  // ---------- reproduccion ----------

  btnPlay.addEventListener('click', () => {
    if (reproduciendo) { detener(); return; }
    if (hora >= HORAS) hora = 0;
    btnPlay.textContent = 'PAUSA';
    let previo = performance.now();
    const paso = (t) => {
      const dt = t - previo;
      previo = t;
      fijarHora(hora + dt / 1000 * 9); // 72 h en 8 s
      if (hora < HORAS) {
        reproduciendo = requestAnimationFrame(paso);
      } else {
        detener();
      }
    };
    reproduciendo = requestAnimationFrame(paso);
  });

  // ---------- ramas ----------

  const btnGamma = document.getElementById('btn-gamma');
  const btnManual = document.getElementById('btn-manual');

  const elegir = (r) => {
    rama = r;
    btnGamma.classList.toggle('activa', r === 'gamma');
    btnManual.classList.toggle('activa', r === 'manual');
    pintarEventos();
    refrescar();
  };

  btnGamma.addEventListener('click', () => elegir('gamma'));
  btnManual.addEventListener('click', () => elegir('manual'));

  document.getElementById('btn-ayuda').addEventListener('click', () => { overlay.hidden = false; });
  document.getElementById('btn-entendido').addEventListener('click', () => { overlay.hidden = true; });

  pintarEventos();
  refrescar();
})();
