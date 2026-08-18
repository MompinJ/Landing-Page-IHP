/* ============================================================
   CORTE LIMPIO -- motor

   Las piezas salen del dique en arco parabolico, cada una con una
   palabra y una letra de boton. Se corta pulsando esa letra en el
   mando; se deja caer no pulsando nada. El acierto no esta en la
   punteria sino en decidir a tiempo.

   Todo el dibujo es procedural: no hay un solo archivo de imagen.
   ============================================================ */

(function () {
  'use strict';

  /* ============================================================
     1. CONTENIDO -- lo unico que hay que tocar para cambiar la
        ronda. El motor no sabe de que van las palabras: solo
        mira el campo ok.

        ok: true  -> CUMPLE el criterio, hay que CORTARLA
        ok: false -> NO cumple, hay que DEJARLA CAER a chatarra

        La partida dura exactamente lo que dure esta lista: cada
        palabra sale una sola vez y al resolverse la ultima se
        cierra el turno.

        OJO: las dos categorias conviene tenerlas mas o menos
        equilibradas. Si el 80% cumple, la estrategia ganadora es
        cortar todo sin leer.
     ============================================================ */

  var CRITERIO = {
    pre: 'CORTA SOLO LO QUE SEA',
    que: 'PARTE DE LA CULTURA',
    nota: 'Lo que FORMA la cultura de la organizacion se corta y se suelda al casco. Lo que es un recurso, un resultado o un factor que viene de fuera se deja caer a la tolva de chatarra.'
  };

  // GLOSARIO: cultura organizacional.
  //
  //   ok: true  -> SI forma parte de la cultura (cortar)
  //   ok: false -> NO es cultura: es un recurso, un activo o un
  //                factor externo (dejar caer)
  //
  // Las 16 primeras son las de la lamina de contenedores del
  // taller, con sus distractores incluidos; el resto sale del
  // glosario de RRHH (temas Filosofia HP, Entorno laboral y
  // Relaciones Laborales) mas los factores de fuera que hacen de
  // contraparte. Van 20 y 20 a proposito: si un lado pesa mucho
  // mas, la estrategia ganadora pasa a ser no leer.
  var GLOSARIO = [
    // --- de la lamina: SI son cultura
    { t: 'HISTORIA Y TRADICIONES', ok: true },
    { t: 'VALORES', ok: true },
    { t: 'NORMAS Y COMPORTAMIENTOS', ok: true },
    { t: 'LIDERAZGO', ok: true },
    { t: 'IDENTIDAD', ok: true },
    { t: 'COMUNICACION', ok: true },
    { t: 'DISCIPLINA', ok: true },
    { t: 'ENTORNO LABORAL', ok: true },
    { t: 'ESTRUCTURA ORGANIZACIONAL', ok: true },
    { t: 'JERARQUIA', ok: true },
    { t: 'SEGURIDAD', ok: true },
    // --- de la lamina: NO son cultura
    { t: 'DINERO', ok: false },
    { t: 'CLIENTES', ok: false },
    { t: 'PRESION EXTERNA Y COMPETENCIA', ok: false },
    { t: 'TECNOLOGIA E INNOVACION', ok: false },
    { t: 'AMISTAD', ok: false },

    // --- filosofia y cultura del grupo (glosario de RRHH)
    { t: 'CULTURA', ok: true },
    { t: 'UNITY', ok: true },
    { t: 'ETICA', ok: true },
    { t: 'RESPETO', ok: true },
    { t: 'INCLUSION', ok: true },
    { t: 'DIVERSIDAD', ok: true },
    { t: 'TALENTO', ok: true },
    { t: 'CLIMA LABORAL', ok: true },
    { t: 'COLABORACION', ok: true },

    // --- recursos, activos y factores de fuera
    { t: 'SALARIO', ok: false },
    { t: 'NOMINA', ok: false },
    { t: 'UTILIDADES', ok: false },
    { t: 'TIPO DE CAMBIO', ok: false },
    { t: 'INFLACION', ok: false },
    { t: 'IMPUESTOS', ok: false },
    { t: 'PROVEEDORES', ok: false },
    { t: 'MAQUINARIA', ok: false },
    { t: 'INFRAESTRUCTURA', ok: false },
    { t: 'SOFTWARE', ok: false },
    { t: 'MERCADO', ok: false },
    { t: 'PRESUPUESTO', ok: false },
    { t: 'TARIFAS', ok: false },
    { t: 'COMBUSTIBLE', ok: false },
    { t: 'EQUIPO DE COMPUTO', ok: false }
  ];

  /* ============================================================
     2. AJUSTES DE JUEGO
     ============================================================ */

  var W = 1280;
  var H = 720;

  var CFG = {
    // El vuelo es la ventana de decision: es lo que tarda una
    // pieza en subir y volver a bajar. Se acorta segun avanza el
    // turno, pero poco: leer una palabra y decidir cuesta mas que
    // reaccionar a una forma, asi que el tramo final no baja de
    // los dos segundos largos.
    vueloIni: 2.9,
    vueloFin: 2.3,
    // Altura del pico sobre el punto de lanzamiento. Fija: lo que
    // cambia con la dificultad es lo rapido que se recorre, no lo
    // alto que sube, para que la pieza siempre quede a la vista y
    // por debajo del HUD.
    pico: 620,
    // Separacion entre lanzamientos, incluso cuando caben varias
    // piezas en el aire. Es la palanca que mas se nota: con las
    // piezas escalonadas se leen de una en una aunque haya tres
    // arriba; con hueco corto llegan a la vez y hay que leerlas
    // todas de golpe.
    huecoIni: 1.6,
    huecoFin: 1.0,
    yLanza: 780,
    yPierde: 830,

    // puntaje
    ptsCorteBien: 100,
    ptsDejaBien: 60,
    ptsCorteMal: -80,
    ptsDejaMal: -40,
    ptsFalso: -20,
    // racha -> multiplicador (a partir de N aciertos seguidos)
    escalones: [
      { n: 12, x: 4 },
      { n: 8, x: 3 },
      { n: 4, x: 2 }
    ]
  };

  // Los cuatro botones, con el color real del mando de Xbox. El
  // color NO tiene nada que ver con si la palabra cumple: se
  // reparte al azar, y por eso puede ser vistoso sin delatar la
  // respuesta.
  var BOTONES = [
    { k: 'A', color: '#6ac72f', texto: '#0b1118' },
    { k: 'B', color: '#e5342b', texto: '#ffffff' },
    { k: 'X', color: '#2a7de1', texto: '#ffffff' },
    { k: 'Y', color: '#f0b91d', texto: '#0b1118' }
  ];

  var PARAMS = new URLSearchParams(location.search);
  var DIAG = PARAMS.has('mando');

  /* ============================================================
     3. UTILIDADES
     ============================================================ */

  function rnd(a, b) { return a + Math.random() * (b - a); }
  function rndInt(a, b) { return Math.floor(rnd(a, b + 1)); }
  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
  function mezcla(a, b, t) { return a + (b - a) * clamp(t, 0, 1); }

  function barajar(lista) {
    var a = lista.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  var $ = function (id) { return document.getElementById(id); };

  /* ============================================================
     4. SONIDO -- cuatro golpes sinteticos, sin archivos.

        Pulsar un boton del MANDO no cuenta como gesto de usuario
        para desbloquear el audio en ningun navegador, asi que una
        sesion 100% mando se quedaria muda: el desbloqueo se
        engancha al primer pointerdown o keydown real que pase por
        la pagina (basta que quien atiende toque la pantalla una
        vez) y se traga el rechazo.
     ============================================================ */

  var Audio_ = (function () {
    var ctx = null;
    var listo = false;

    function abrir() {
      if (ctx) return ctx;
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      try { ctx = new AC(); } catch (e) { return null; }
      return ctx;
    }

    function desbloquear() {
      var c = abrir();
      if (!c) return;
      if (c.state === 'suspended') c.resume().catch(function () {});
      listo = true;
    }

    window.addEventListener('pointerdown', desbloquear, { passive: true });
    window.addEventListener('keydown', desbloquear);

    function tono(freq, dur, tipo, vol, curva) {
      if (!listo) return;
      var c = abrir();
      if (!c || c.state !== 'running') return;
      var o = c.createOscillator();
      var g = c.createGain();
      o.type = tipo || 'sine';
      o.frequency.setValueAtTime(freq, c.currentTime);
      if (curva) o.frequency.exponentialRampToValueAtTime(curva, c.currentTime + dur);
      g.gain.setValueAtTime(vol || 0.14, c.currentTime);
      g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + dur);
      o.connect(g); g.connect(c.destination);
      o.start(); o.stop(c.currentTime + dur + 0.02);
    }

    function ruido(dur, vol, corte) {
      if (!listo) return;
      var c = abrir();
      if (!c || c.state !== 'running') return;
      var n = Math.floor(c.sampleRate * dur);
      var buf = c.createBuffer(1, n, c.sampleRate);
      var d = buf.getChannelData(0);
      for (var i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
      var src = c.createBufferSource();
      src.buffer = buf;
      var f = c.createBiquadFilter();
      f.type = 'highpass';
      f.frequency.value = corte || 900;
      var g = c.createGain();
      g.gain.value = vol || 0.12;
      src.connect(f); f.connect(g); g.connect(c.destination);
      src.start();
    }

    return {
      corte: function () { ruido(0.16, 0.16, 1400); tono(880, 0.1, 'triangle', 0.08, 1600); },
      bien: function () { tono(660, 0.1, 'square', 0.06, 990); },
      mal: function () { tono(180, 0.35, 'sawtooth', 0.14, 70); ruido(0.3, 0.1, 260); },
      falso: function () { tono(240, 0.12, 'square', 0.07, 150); },
      chatarra: function () { ruido(0.22, 0.09, 320); }
    };
  })();

  /* ============================================================
     5. ESTADO
     ============================================================ */

  var lienzo = $('lienzo');
  var ctx = lienzo.getContext('2d');

  var juego = {
    fase: 'portada',      // portada | cuenta | jugando | pausa | fin
    cola: [],
    total: 0,
    techo: 0,
    lanzadas: 0,
    resueltas: 0,
    piezas: [],
    mitades: [],
    chispas: [],
    humos: [],
    tajos: [],
    flotantes: [],
    proxima: 0,
    cuenta: 0,
    puntos: 0,
    racha: 0,
    mejorRacha: 0,
    mult: 1,
    sacudida: 0,
    tinte: 0,
    marca: {
      corteBien: 0, dejaBien: 0, corteMal: 0, dejaMal: 0, falsos: 0
    },
    planchas: 0          // planchas soldadas al casco (aciertos)
  };

  /* ============================================================
     6. ARRANQUE DE TURNO
     ============================================================ */

  function nuevoTurno() {
    var lista = GLOSARIO.slice();
    var limite = parseInt(PARAMS.get('piezas'), 10);
    lista = barajar(lista);
    if (limite > 0 && limite < lista.length) lista = lista.slice(0, limite);

    juego.cola = lista;
    juego.total = lista.length;
    // Techo del turno sin multiplicadores: la referencia contra la
    // que se lee el puntaje final, y se calcula de las palabras que
    // de verdad van a salir (?piezas puede recortar la lista).
    juego.techo = 0;
    for (var t = 0; t < lista.length; t++) {
      juego.techo += lista[t].ok ? CFG.ptsCorteBien : CFG.ptsDejaBien;
    }
    juego.lanzadas = 0;
    juego.resueltas = 0;
    juego.piezas.length = 0;
    juego.mitades.length = 0;
    juego.chispas.length = 0;
    juego.humos.length = 0;
    juego.tajos.length = 0;
    juego.flotantes.length = 0;
    juego.puntos = 0;
    juego.racha = 0;
    juego.mejorRacha = 0;
    juego.mult = 1;
    juego.sacudida = 0;
    juego.tinte = 0;
    juego.planchas = 0;
    juego.marca = { corteBien: 0, dejaBien: 0, corteMal: 0, dejaMal: 0, falsos: 0 };
    puntosPrev = 0;
    juego.proxima = 0;
    juego.cuenta = 1.6;
    juego.fase = 'cuenta';
    pintarHud();
  }

  /* ============================================================
     7. LANZAMIENTO

        Dos reglas gobiernan el reparto:

        - Nunca hay dos piezas vivas con la misma letra. Es lo que
          permite que una pulsacion no necesite punteria: solo
          puede referirse a una pieza.
        - La dificultad sube por numero de piezas simultaneas y
          por vuelo mas corto, nunca por ambiguedad.
     ============================================================ */

  function avance() {
    return juego.total ? juego.lanzadas / juego.total : 0;
  }

  // Tope de piezas en el aire a la vez. Se queda en TRES: con
  // cuatro se ocupan los cuatro botones y el tramo final se
  // volvia ilegible, porque cada pieza pide leer una palabra y no
  // solo reaccionar a una forma.
  function maxSimultaneas() {
    var p = avance();
    if (p < 0.25) return 1;
    if (p < 0.62) return 2;
    return 3;
  }

  function letrasLibres() {
    var usadas = {};
    for (var i = 0; i < juego.piezas.length; i++) usadas[juego.piezas[i].bt] = true;
    var libres = [];
    for (var j = 0; j < BOTONES.length; j++) if (!usadas[j]) libres.push(j);
    return libres;
  }

  function lanzar() {
    var libres = letrasLibres();
    if (!libres.length || !juego.cola.length) return;

    var dato = juego.cola.shift();
    var p = avance();
    var vuelo = mezcla(CFG.vueloIni, CFG.vueloFin, p);
    // La gravedad sale del vuelo pedido y de la altura de pico:
    // asi todas las piezas suben lo mismo (siempre legibles,
    // siempre bajo el HUD) y lo que cambia es la prisa.
    var g = 8 * CFG.pico / (vuelo * vuelo);
    var vy = -g * vuelo / 2;

    // Se lanza lejos de lo que ya esta en el aire, para que dos
    // piezas no se solapen y tapen sus propias palabras.
    var x = 0, mejor = -1;
    for (var intento = 0; intento < 8; intento++) {
      var cand = rnd(230, W - 230);
      var d = 9999;
      for (var i = 0; i < juego.piezas.length; i++) {
        d = Math.min(d, Math.abs(juego.piezas[i].x - cand));
      }
      if (d > mejor) { mejor = d; x = cand; }
      if (d > 320) break;
    }

    var vx = rnd(-90, 90);
    if (x < 380) vx = Math.abs(vx);
    if (x > W - 380) vx = -Math.abs(vx);

    juego.piezas.push({
      dato: dato,
      bt: libres[rndInt(0, libres.length - 1)],
      forma: rndInt(0, 3),
      w: anchoPieza(dato.t),
      x: x,
      y: CFG.yLanza,
      vx: vx,
      vy: vy,
      g: g,
      // La pieza NO gira 360 grados como una fruta: hay que leer
      // lo que lleva escrito, asi que solo cabecea suavemente.
      fase: rnd(0, Math.PI * 2),
      vel: rnd(1.1, 1.7),
      amp: rnd(0.05, 0.13),
      giro: 0,
      vida: 0,
      brillo: 0
    });
    juego.lanzadas++;
  }

  /* ============================================================
     8. RESOLUCION -- las cinco cosas que pueden pasar
     ============================================================ */

  function subirRacha() {
    juego.racha++;
    if (juego.racha > juego.mejorRacha) juego.mejorRacha = juego.racha;
    juego.mult = 1;
    for (var i = 0; i < CFG.escalones.length; i++) {
      if (juego.racha >= CFG.escalones[i].n) { juego.mult = CFG.escalones[i].x; break; }
    }
  }

  function romperRacha() {
    juego.racha = 0;
    juego.mult = 1;
  }

  function sumar(pts, x, y, color) {
    juego.puntos += pts;
    juego.flotantes.push({
      txt: (pts > 0 ? '+' : '') + pts,
      x: x, y: y, vida: 1, color: color
    });
  }

  function veredicto(txt, clase) {
    var el = $('aviso');
    el.textContent = txt;
    el.className = 'aviso ' + (clase || '');
    el.hidden = false;
    clearTimeout(veredicto._t);
    veredicto._t = setTimeout(function () { el.hidden = true; }, 950);
  }

  // Corte: el jugador pulso la letra de una pieza viva.
  function cortar(pieza) {
    var i = juego.piezas.indexOf(pieza);
    if (i >= 0) juego.piezas.splice(i, 1);
    juego.resueltas++;

    var ang = rnd(-0.45, 0.45);
    partir(pieza, ang);
    juego.tajos.push({ x: pieza.x, y: pieza.y, ang: ang, vida: 1, largo: 340 });
    chispear(pieza.x, pieza.y, 26, pieza.dato.ok ? '#ffd07a' : '#ff8a6a');
    Audio_.corte();

    if (pieza.dato.ok) {
      subirRacha();
      var pts = CFG.ptsCorteBien * juego.mult;
      sumar(pts, pieza.x, pieza.y, '#b6f08a');
      juego.marca.corteBien++;
      juego.planchas++;
      veredicto('CORTE LIMPIO' + (juego.mult > 1 ? '  x' + juego.mult : ''), 'bien');
      Audio_.bien();
    } else {
      romperRacha();
      sumar(CFG.ptsCorteMal, pieza.x, pieza.y, '#ff9d8a');
      juego.marca.corteMal++;
      juego.sacudida = 1;
      juego.tinte = 1;
      humear(pieza.x, pieza.y);
      veredicto('ESO NO SE CORTA: ' + pieza.dato.t, 'mal');
      Audio_.mal();
    }
    pintarHud();
    revisarFin();
  }

  // Caida: la pieza llego abajo sin que nadie la tocara.
  function caer(pieza) {
    var i = juego.piezas.indexOf(pieza);
    if (i >= 0) juego.piezas.splice(i, 1);
    juego.resueltas++;

    if (!pieza.dato.ok) {
      subirRacha();
      var pts = CFG.ptsDejaBien * juego.mult;
      sumar(pts, pieza.x, H - 120, '#b6f08a');
      juego.marca.dejaBien++;
      juego.planchas++;
      veredicto('A CHATARRA, BIEN' + (juego.mult > 1 ? '  x' + juego.mult : ''), 'bien');
      Audio_.chatarra();
    } else {
      romperRacha();
      sumar(CFG.ptsDejaMal, pieza.x, H - 120, '#ff9d8a');
      juego.marca.dejaMal++;
      veredicto('SE PERDIO: ' + pieza.dato.t, 'mal');
      Audio_.mal();
    }
    pintarHud();
    revisarFin();
  }

  // Corte en falso: se pulso un boton que no tiene pieza. Sin
  // esto, machacar los cuatro botones sin leer nada seria la
  // estrategia optima del juego.
  function falso(bt) {
    romperRacha();
    juego.marca.falsos++;
    juego.puntos += CFG.ptsFalso;
    var x = rnd(W * 0.3, W * 0.7);
    var y = rnd(H * 0.35, H * 0.6);
    juego.tajos.push({ x: x, y: y, ang: rnd(-0.4, 0.4), vida: 0.7, largo: 220 });
    chispear(x, y, 8, '#8fa4b8');
    juego.flotantes.push({ txt: '' + CFG.ptsFalso, x: x, y: y, vida: 1, color: '#ff9d8a' });
    veredicto('CORTE EN FALSO (' + BOTONES[bt].k + ')', 'mal');
    Audio_.falso();
    pintarHud();
  }

  function revisarFin() {
    if (juego.resueltas >= juego.total && !juego.cola.length && !juego.piezas.length) {
      setTimeout(cerrar, 700);
    }
  }

  /* ============================================================
     9. EFECTOS
     ============================================================ */

  function partir(pieza, ang) {
    for (var lado = -1; lado <= 1; lado += 2) {
      juego.mitades.push({
        pieza: pieza,
        lado: lado,
        corte: ang,
        x: pieza.x,
        y: pieza.y,
        vx: pieza.vx + Math.sin(ang) * 40 * -lado + rnd(-30, 30),
        vy: pieza.vy * 0.55 + Math.cos(ang) * 90 * lado,
        giro: pieza.giro,
        vgiro: rnd(-2.4, 2.4) + lado * 0.8,
        sep: 0,
        vida: 1
      });
    }
  }

  function chispear(x, y, n, color) {
    for (var i = 0; i < n; i++) {
      var a = rnd(0, Math.PI * 2);
      var v = rnd(90, 460);
      juego.chispas.push({
        x: x, y: y,
        vx: Math.cos(a) * v,
        vy: Math.sin(a) * v - 60,
        vida: rnd(0.35, 0.8),
        max: 0.8,
        color: color || '#ffc24a'
      });
    }
  }

  function humear(x, y) {
    for (var i = 0; i < 10; i++) {
      juego.humos.push({
        x: x + rnd(-30, 30),
        y: y + rnd(-20, 20),
        r: rnd(14, 30),
        vy: rnd(-50, -18),
        vx: rnd(-18, 18),
        vida: rnd(0.9, 1.6),
        max: 1.6
      });
    }
  }

  /* ============================================================
     10. ENTRADA -- mando y teclado

         El teclado usa e.code, asi que la tecla es la fisica y
         no depende de la distribucion del sistema.
     ============================================================ */

  function pulsarBoton(bt) {
    if (juego.fase !== 'jugando') return;
    marcarBotonera(bt);
    for (var i = 0; i < juego.piezas.length; i++) {
      if (juego.piezas[i].bt === bt) { cortar(juego.piezas[i]); return; }
    }
    falso(bt);
  }

  function accion(a) {
    if (a === 'A' || a === 'B' || a === 'X' || a === 'Y') {
      var bt = 'ABXY'.indexOf(a);
      if (juego.fase === 'jugando') { pulsarBoton(bt); return; }
      if (a !== 'A') return;
      // A vale como confirmar fuera de partida
      if (juego.fase === 'portada') empezar();
      else if (juego.fase === 'fin') { cerrarCapas(); empezar(); }
      else if (juego.fase === 'pausa') pausa(false);
      return;
    }
    if (a === 'START' || a === 'BACK') {
      if (juego.fase === 'jugando') pausa(true);
      else if (juego.fase === 'pausa') pausa(false);
      else if (juego.fase === 'portada') empezar();
    }
  }

  if (window.Mando) {
    window.Mando.iniciar();
    window.Mando.alPulsar(accion);
    window.Mando.alCambiarEstado(pintarMando);
  }

  window.addEventListener('keydown', function (e) {
    if (e.repeat) return;
    var c = e.code;
    if (c === 'KeyA') { e.preventDefault(); accion('A'); return; }
    if (c === 'KeyB') { e.preventDefault(); accion('B'); return; }
    if (c === 'KeyX') { e.preventDefault(); accion('X'); return; }
    if (c === 'KeyY') { e.preventDefault(); accion('Y'); return; }
    if (c === 'Space' || c === 'Enter') {
      e.preventDefault();
      if (juego.fase === 'portada') empezar();
      else if (juego.fase === 'fin') { cerrarCapas(); empezar(); }
      else if (juego.fase === 'pausa') pausa(false);
      return;
    }
    if (c === 'KeyP' || c === 'Escape') {
      if (juego.fase === 'jugando') pausa(true);
      else if (juego.fase === 'pausa') pausa(false);
      return;
    }
    if (c === 'KeyH') { alternarAyuda(); return; }
    if (c === 'KeyR') {
      if (juego.fase === 'jugando' || juego.fase === 'pausa' || juego.fase === 'fin') {
        cerrarCapas();
        empezar();
      }
    }
  });

  /* ============================================================
     11. FLUJO DE PANTALLAS
     ============================================================ */

  function empezar() {
    $('portada').hidden = true;
    $('finale').hidden = true;
    $('pausa').hidden = true;
    $('overlay').hidden = true;
    nuevoTurno();
  }

  function cerrarCapas() {
    $('portada').hidden = true;
    $('finale').hidden = true;
    $('pausa').hidden = true;
    $('overlay').hidden = true;
  }

  function pausa(si) {
    if (si) {
      juego.fase = 'pausa';
      $('pausa').hidden = false;
    } else {
      $('pausa').hidden = true;
      juego.fase = 'jugando';
    }
  }

  function alternarAyuda() {
    var ov = $('overlay');
    var abriendo = ov.hidden;
    ov.hidden = !abriendo;
    if (abriendo && juego.fase === 'jugando') pausa(true);
  }

  function cerrar() {
    juego.fase = 'fin';
    var m = juego.marca;
    var aciertos = m.corteBien + m.dejaBien;
    var fallos = m.corteMal + m.dejaMal;
    var precision = juego.total ? Math.round(aciertos / juego.total * 100) : 0;

    var techo = juego.techo;
    var rango, nota;
    if (precision >= 95) { rango = 'MAESTRO DEL DIQUE'; nota = 'Ni una pieza mal leida. El casco salio entero.'; }
    else if (precision >= 82) { rango = 'OFICIAL DE CORTE'; nota = 'Buen pulso y buena lectura. Se nota el criterio.'; }
    else if (precision >= 65) { rango = 'SOLDADOR'; nota = 'Vas bien, pero alguna pieza se coló al casco sin merecerlo.'; }
    else if (precision >= 45) { rango = 'AYUDANTE DE TALLER'; nota = 'Cortas rapido, lees despacio. Lee primero, pulsa despues.'; }
    else { rango = 'APRENDIZ'; nota = 'Mucha chatarra en el suelo. El boton no es la respuesta: la palabra si.'; }

    $('fin-titulo').textContent = rango;
    $('fin-puntos').textContent = juego.puntos;
    $('fin-kicker').textContent = 'TURNO CERRADO  ' + juego.total + ' PIEZAS  ' + precision + '% DE ACIERTO';

    var filas = [
      ['bien', 'CORTADAS BIEN (cumplian)', m.corteBien],
      ['bien', 'DEJADAS CAER BIEN (no cumplian)', m.dejaBien],
      ['sep'],
      ['mal', 'CORTADAS SIN DEBER', m.corteMal],
      ['mal', 'PERDIDAS QUE CUMPLIAN', m.dejaMal],
      ['mal', 'CORTES EN FALSO', m.falsos],
      ['sep'],
      ['', 'MEJOR RACHA', juego.mejorRacha + ' seguidas'],
      ['', 'PLANCHAS SOLDADAS AL CASCO', juego.planchas + ' / ' + juego.total],
      ['', 'TECHO DEL TURNO (sin multiplicar)', techo + ' pts']
    ];
    var html = '';
    for (var f = 0; f < filas.length; f++) {
      if (filas[f][0] === 'sep') { html += '<i class="fila-sep"></i>'; continue; }
      var cls = filas[f][0] ? 'fila-' + filas[f][0] : '';
      html += '<span class="' + cls + '">' + filas[f][1] + '</span><b class="' + cls + '">' + filas[f][2] + '</b>';
    }
    // las clases van en los dos hijos para poder colorear la fila entera
    $('fin-tabla').innerHTML = html;
    $('fin-nota').textContent = nota + ' Aciertos ' + aciertos + ' de ' + juego.total + '.';
    $('finale').hidden = false;
  }

  /* ============================================================
     12. HUD
     ============================================================ */

  var botoneraEls = [];
  (function montarBotonera() {
    var cont = $('botonera');
    for (var i = 0; i < BOTONES.length; i++) {
      var el = document.createElement('i');
      el.textContent = BOTONES[i].k;
      el.style.background = BOTONES[i].color;
      el.style.color = BOTONES[i].texto;
      cont.appendChild(el);
      botoneraEls.push(el);
    }
  })();

  function marcarBotonera(bt) {
    var el = botoneraEls[bt];
    if (!el) return;
    el.classList.add('pulsada');
    setTimeout(function () { el.classList.remove('pulsada'); }, 110);
  }

  var puntosPrev = 0;

  function pintarHud() {
    var pts = $('hud-puntos');
    if (juego.puntos !== puntosPrev) {
      // el marcador parpadea en verde o en rojo: a 3 m de un
      // proyector el numero solo no dice si acabas de ganar o de
      // perder puntos
      var sube = juego.puntos > puntosPrev;
      puntosPrev = juego.puntos;
      pts.classList.remove('sube', 'baja');
      void pts.offsetWidth;
      pts.classList.add(sube ? 'sube' : 'baja');
      clearTimeout(pintarHud._t);
      pintarHud._t = setTimeout(function () { pts.classList.remove('sube', 'baja'); }, 320);
    }
    pts.textContent = juego.puntos;
    $('hud-progreso').textContent = juego.resueltas + '/' + juego.total;
    var r = $('racha');
    if (juego.mult > 1) {
      r.hidden = false;
      $('racha-mult').textContent = 'x' + juego.mult;
      $('racha-n').textContent = juego.racha + ' SEGUIDAS';
    } else {
      r.hidden = true;
    }
  }

  function pintarMando() {
    if (!window.Mando) return;
    var d = window.Mando.diagnostico();
    var caja = $('port-mando');
    caja.className = 'portada__mando ' + d.nivel;
    $('port-mando-txt').textContent = d.texto;
  }

  function pintarDiag() {
    if (!DIAG || !window.Mando) return;
    var e = window.Mando.estado;
    $('diag').hidden = false;
    $('diag').textContent =
      'API: ' + (e.soportado ? 'si' : 'NO') +
      '   contexto seguro: ' + (e.seguro ? 'si' : 'NO') +
      '\nconectado: ' + (e.conectado ? 'si' : 'no') +
      '   mapeo: ' + (e.mapeo || '--') +
      '\nid: ' + (e.id || '--') +
      '\nbotones: ' + e.botones.slice(0, 12).map(function (v) { return v.toFixed(1); }).join(' ');
  }

  /* ============================================================
     13. DIBUJO -- fondo

         El fondo estatico se hornea una sola vez en un canvas
         aparte: es el dique con el buque, las gruas y la
         terminal al otro lado de la darsena. Encima van solo las
         cosas que cambian (la Goliath, las planchas que se van
         soldando y las chispas de soldadura).
     ============================================================ */

  var fondo = document.createElement('canvas');
  fondo.width = W;
  fondo.height = H;

  // Cotas del escenario. La linea del muelle (donde acaba la
  // terminal del fondo y empieza el dique) manda sobre todo lo
  // demas, asi que vive aqui y no repartida por el dibujo.
  var MUELLE = 330;
  var SOLERA = 596;

  function hornearFondo() {
    var c = fondo.getContext('2d');
    var i;

    // ---- cielo de turno de tarde. El escenario es de noche pero
    // el dique de un astillero esta MUY iluminado: si se pinta
    // literal, el fondo se come las piezas y no se lee nada.
    var cielo = c.createLinearGradient(0, 0, 0, MUELLE);
    cielo.addColorStop(0, '#10243a');
    cielo.addColorStop(0.55, '#24506f');
    cielo.addColorStop(1, '#47809f');
    c.fillStyle = cielo;
    c.fillRect(0, 0, W, MUELLE);

    // ultima luz del dia pegada al horizonte
    var poniente = c.createLinearGradient(0, MUELLE - 180, 0, MUELLE);
    poniente.addColorStop(0, 'rgba(255, 160, 70, 0)');
    poniente.addColorStop(1, 'rgba(255, 165, 80, 0.36)');
    c.fillStyle = poniente;
    c.fillRect(0, MUELLE - 180, W, 180);

    // ---- terminal al otro lado de la darsena, en tres planos
    // que se van aclarando: es lo que da profundidad sin dibujar
    // nada complicado
    dibujarSkyline(c, MUELLE - 8, 0.62, 'rgba(30, 62, 92, 0.55)', 40, 44);
    for (i = 0; i < 4; i++) dibujarSTS(c, 120 + i * 330, MUELLE - 6, 0.58, 'rgba(22, 46, 68, 0.85)');
    dibujarSkyline(c, MUELLE, 1, 'rgba(22, 46, 70, 0.26)', 54, 62);
    for (i = 0; i < 3; i++) dibujarSTS(c, 250 + i * 400, MUELLE, 0.86, 'rgba(13, 30, 46, 0.95)');

    // torres de iluminacion con su halo
    for (i = 0; i < 4; i++) dibujarTorreLuz(c, 60 + i * 400, MUELLE);

    // ---- dique seco: muro del fondo, muros laterales y solera
    var muro = c.createLinearGradient(0, MUELLE, 0, SOLERA);
    muro.addColorStop(0, '#31506a');
    muro.addColorStop(1, '#1c3145');
    c.fillStyle = muro;
    c.fillRect(0, MUELLE, W, SOLERA - MUELLE);

    // bandas horizontales del encofrado
    c.strokeStyle = 'rgba(255, 255, 255, 0.035)';
    c.lineWidth = 2;
    for (i = 1; i < 5; i++) {
      c.beginPath();
      c.moveTo(0, MUELLE + i * 52);
      c.lineTo(W, MUELLE + i * 52);
      c.stroke();
    }
    // borde superior iluminado del cantil
    c.strokeStyle = 'rgba(180, 215, 240, 0.35)';
    c.lineWidth = 3;
    c.beginPath();
    c.moveTo(0, MUELLE); c.lineTo(W, MUELLE);
    c.stroke();

    // los muros laterales bajan escalonados hacia la solera, que
    // es lo que hace leer el dique como un hueco y no como una
    // pared plana
    c.fillStyle = '#2b465e';
    c.strokeStyle = 'rgba(0, 0, 0, 0.35)';
    c.lineWidth = 2;
    for (i = 0; i < 6; i++) {
      var alt = SOLERA - MUELLE - i * 40;
      var anc = 150 - i * 24;
      if (anc <= 0) break;
      c.fillRect(0, MUELLE + i * 40, anc, 40);
      c.strokeRect(0, MUELLE + i * 40, anc, 40);
      c.fillRect(W - anc, MUELLE + i * 40, anc, 40);
      c.strokeRect(W - anc, MUELLE + i * 40, anc, 40);
    }
    // escalas de gato en los muros
    c.strokeStyle = 'rgba(190, 215, 235, 0.35)';
    c.lineWidth = 2;
    for (i = 0; i < 2; i++) {
      var ex = i ? W - 96 : 96;
      c.beginPath();
      c.moveTo(ex - 8, MUELLE + 6); c.lineTo(ex - 8, SOLERA - 10);
      c.moveTo(ex + 8, MUELLE + 6); c.lineTo(ex + 8, SOLERA - 10);
      for (var p = 0; p < 12; p++) {
        c.moveTo(ex - 8, MUELLE + 16 + p * 20);
        c.lineTo(ex + 8, MUELLE + 16 + p * 20);
      }
      c.stroke();
    }

    // ---- solera del dique
    var piso = c.createLinearGradient(0, SOLERA, 0, H);
    piso.addColorStop(0, '#2a4256');
    piso.addColorStop(1, '#16242f');
    c.fillStyle = piso;
    c.fillRect(0, SOLERA, W, H - SOLERA);
    c.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    c.lineWidth = 2;
    for (i = 0; i < 16; i++) {
      c.beginPath();
      c.moveTo(i * 92, SOLERA);
      c.lineTo(i * 92 - 70, H);
      c.stroke();
    }
    // canal de achique por el eje del dique
    c.strokeStyle = 'rgba(0, 0, 0, 0.5)';
    c.lineWidth = 8;
    c.beginPath();
    c.moveTo(0, SOLERA + 42); c.lineTo(W, SOLERA + 42);
    c.stroke();

    // picaderos bajo la quilla
    c.fillStyle = '#37505f';
    c.strokeStyle = 'rgba(0, 0, 0, 0.5)';
    c.lineWidth = 2;
    for (i = 0; i < 8; i++) {
      c.fillRect(CASCO.x + 20 + i * 76, CASCO.y + CASCO.h - 4, 36, 26);
      c.strokeRect(CASCO.x + 20 + i * 76, CASCO.y + CASCO.h - 4, 36, 26);
    }

    // torres de andamio pegadas al casco
    dibujarAndamio(c, CASCO.x - 78, CASCO.y - 30, 220);
    dibujarAndamio(c, CASCO.x + CASCO.w + 34, CASCO.y - 30, 220);

    // la estructura de la Goliath, que no se mueve
    dibujarGoliathFijo(c);

    // ---- mesa de corte al pie de la pantalla
    var mesa = c.createLinearGradient(0, H - 96, 0, H);
    mesa.addColorStop(0, '#3a5468');
    mesa.addColorStop(1, '#131e29');
    c.fillStyle = mesa;
    c.fillRect(0, H - 96, W, 96);
    c.save();
    c.beginPath();
    c.rect(0, H - 92, W, 92);
    c.clip();
    c.strokeStyle = 'rgba(255, 199, 39, 0.12)';
    c.lineWidth = 16;
    for (i = -10; i < 60; i++) {
      c.beginPath();
      c.moveTo(i * 38, H);
      c.lineTo(i * 38 + 90, H - 96);
      c.stroke();
    }
    c.restore();
    c.strokeStyle = 'rgba(255, 199, 39, 0.5)';
    c.lineWidth = 3;
    c.beginPath();
    c.moveTo(0, H - 96); c.lineTo(W, H - 96);
    c.stroke();
    // rotulo de la tolva
    c.fillStyle = 'rgba(255, 199, 39, 0.42)';
    c.font = '700 15px "JetBrains Mono", monospace';
    c.textAlign = 'left';
    c.textBaseline = 'alphabetic';
    c.fillText('TOLVA DE CHATARRA', 18, H - 62);
    c.textAlign = 'right';
    c.fillText('MESA DE CORTE POR PLASMA', W - 18, H - 62);
  }

  // Patio de contenedores del fondo. Se dibuja dos veces, con
  // escala y oscuridad distintas, para tener dos planos: el de
  // atras casi fundido con el cielo y el de delante recortado.
  // La caja se pinta caja a caja (no como bloque macizo) porque
  // si no se lee como una mancha negra y no como un patio.
  var TONOS_CAJA = ['#2c4c68', '#35543f', '#5b3a33', '#274363', '#454a56'];

  function dibujarSkyline(c, base, esc, sombra, paso, altoMax) {
    var cajaH = 17 * esc;
    var cajaW = paso - 5;
    for (var i = 0; i * paso < W + paso; i++) {
      var x = i * paso + 2;
      var pisos = 1 + ((i * 7 + 3) % 4);
      if (pisos * cajaH > altoMax) pisos = Math.max(1, Math.floor(altoMax / cajaH));
      for (var p = 0; p < pisos; p++) {
        var y = base - (p + 1) * cajaH - 2;
        c.fillStyle = TONOS_CAJA[(i * 3 + p) % TONOS_CAJA.length];
        c.fillRect(x, y, cajaW, cajaH - 2);
        // canto superior iluminado: es lo que separa una caja de
        // la de abajo a esta distancia
        c.fillStyle = 'rgba(255, 255, 255, 0.06)';
        c.fillRect(x, y, cajaW, 2);
      }
    }
    // velo de distancia por encima de todo el plano
    c.fillStyle = sombra;
    c.fillRect(0, base - altoMax - 20, W, altoMax + 22);
  }

  function dibujarSTS(c, x, base, esc, color) {
    c.save();
    c.translate(x, base);
    c.scale(esc, esc);
    c.fillStyle = color;
    // patas y viga de rodadura
    c.fillRect(-76, -168, 13, 168);
    c.fillRect(56, -168, 13, 168);
    c.fillRect(-76, -182, 145, 15);
    // marco superior y torre
    c.fillRect(-76, -300, 13, 120);
    c.fillRect(56, -300, 13, 120);
    c.fillRect(-76, -312, 145, 14);
    // pluma sobre el buque y contrapluma, con sus tirantes
    c.beginPath();
    c.moveTo(-70, -308);
    c.lineTo(-260, -292);
    c.lineTo(-260, -276);
    c.lineTo(-70, -290);
    c.closePath();
    c.fill();
    c.beginPath();
    c.moveTo(64, -308);
    c.lineTo(150, -262);
    c.lineTo(150, -248);
    c.lineTo(64, -290);
    c.closePath();
    c.fill();
    c.fillRect(-10, -370, 12, 62);
    c.beginPath();
    c.moveTo(-4, -368);
    c.lineTo(-250, -292);
    c.lineTo(-250, -286);
    c.lineTo(-4, -358);
    c.closePath();
    c.fill();
    // casa de maquinas
    c.fillRect(-40, -270, 40, 26);
    c.restore();
  }

  function dibujarTorreLuz(c, x, base) {
    c.save();
    c.strokeStyle = 'rgba(8, 18, 28, 0.9)';
    c.lineWidth = 4;
    c.beginPath();
    c.moveTo(x - 9, base);
    c.lineTo(x - 3, base - 200);
    c.moveTo(x + 9, base);
    c.lineTo(x + 3, base - 200);
    c.stroke();
    c.fillStyle = 'rgba(8, 18, 28, 0.9)';
    c.fillRect(x - 20, base - 214, 40, 12);
    // halo del foco
    var halo = c.createRadialGradient(x, base - 208, 2, x, base - 208, 120);
    halo.addColorStop(0, 'rgba(255, 226, 160, 0.30)');
    halo.addColorStop(1, 'rgba(255, 226, 160, 0)');
    c.fillStyle = halo;
    c.beginPath();
    c.arc(x, base - 208, 120, 0, 6.29);
    c.fill();
    c.restore();
  }

  function dibujarAndamio(c, x, y, alto) {
    var ancho = 54;
    c.save();
    c.strokeStyle = 'rgba(165, 195, 220, 0.38)';
    c.lineWidth = 3;
    for (var i = 0; i * 44 < alto; i++) {
      var yy = y + i * 44;
      c.strokeRect(x, yy, ancho, 44);
      c.beginPath();
      c.moveTo(x, yy);
      c.lineTo(x + ancho, yy + 44);
      c.stroke();
    }
    // tablones cada dos cuerpos
    c.fillStyle = 'rgba(190, 165, 120, 0.5)';
    for (var t = 0; t * 88 < alto; t++) c.fillRect(x - 8, y + t * 88, ancho + 16, 7);
    c.restore();
  }

  /* ============================================================
     14. DIBUJO -- el casco que se va soldando

         Es el marcador que no ocupa sitio: cada acierto suelda
         una plancha mas del buque que hay en el dique.
     ============================================================ */

  var CASCO = { x: 336, y: 392, w: 610, h: 178, cols: 10, filas: 5 };

  function perfilCasco(c) {
    // proa a la derecha, codaste a la izquierda
    c.beginPath();
    c.moveTo(CASCO.x, CASCO.y);
    c.lineTo(CASCO.x + CASCO.w, CASCO.y);
    c.lineTo(CASCO.x + CASCO.w + 48, CASCO.y + CASCO.h * 0.66);
    c.lineTo(CASCO.x + CASCO.w - 26, CASCO.y + CASCO.h);
    c.lineTo(CASCO.x + 34, CASCO.y + CASCO.h);
    c.lineTo(CASCO.x - 24, CASCO.y + CASCO.h * 0.52);
    c.closePath();
  }

  function dibujarCasco(c) {
    var pw = CASCO.w / CASCO.cols;
    var ph = CASCO.h / CASCO.filas;
    var total = CASCO.cols * CASCO.filas;
    var puestas = juego.total ? Math.round(juego.planchas / juego.total * total) : 0;

    c.save();
    perfilCasco(c);
    c.clip();

    // lo que aun no tiene plancha: el buque abierto, con las
    // cuadernas y los baos a la vista
    c.fillStyle = '#16283a';
    c.fillRect(CASCO.x - 40, CASCO.y - 10, CASCO.w + 120, CASCO.h + 20);
    c.strokeStyle = 'rgba(130, 170, 200, 0.30)';
    c.lineWidth = 4;
    for (var q = 0; q <= CASCO.cols; q++) {
      c.beginPath();
      c.moveTo(CASCO.x + q * pw, CASCO.y - 10);
      c.lineTo(CASCO.x + q * pw, CASCO.y + CASCO.h + 10);
      c.stroke();
    }
    c.strokeStyle = 'rgba(130, 170, 200, 0.16)';
    c.lineWidth = 2;
    for (var b = 1; b < CASCO.filas; b++) {
      c.beginPath();
      c.moveTo(CASCO.x - 40, CASCO.y + b * ph);
      c.lineTo(CASCO.x + CASCO.w + 80, CASCO.y + b * ph);
      c.stroke();
    }

    // planchas ya soldadas, de abajo a arriba: primero la obra
    // viva (roja de imprimacion) y despues el costado
    for (var i = 0; i < puestas; i++) {
      var fila = CASCO.filas - 1 - Math.floor(i / CASCO.cols);
      var col = i % CASCO.cols;
      if (fila < 0) break;
      var px = CASCO.x + col * pw;
      var py = CASCO.y + fila * ph;
      c.fillStyle = fila >= CASCO.filas - 2 ? '#9c4a37' : '#4b6d8f';
      c.fillRect(px, py, pw + 1, ph + 1);
      c.strokeStyle = 'rgba(0, 0, 0, 0.35)';
      c.lineWidth = 2;
      c.strokeRect(px + 1, py + 1, pw - 2, ph - 2);
      c.strokeStyle = 'rgba(255, 255, 255, 0.09)';
      c.lineWidth = 1;
      c.beginPath();
      c.moveTo(px + 2, py + 2);
      c.lineTo(px + pw - 2, py + 2);
      c.stroke();
    }

    // linea de flotacion y marcas de calado, sobre lo que ya
    // este pintado
    c.strokeStyle = 'rgba(255, 199, 39, 0.45)';
    c.lineWidth = 3;
    c.beginPath();
    c.moveTo(CASCO.x - 30, CASCO.y + CASCO.h * 0.6);
    c.lineTo(CASCO.x + CASCO.w + 60, CASCO.y + CASCO.h * 0.6);
    c.stroke();
    c.fillStyle = 'rgba(232, 240, 247, 0.5)';
    c.font = '700 11px "JetBrains Mono", monospace';
    c.textAlign = 'left';
    c.textBaseline = 'middle';
    for (var m = 0; m < 4; m++) {
      c.fillText(String(8 - m * 2) + 'm', CASCO.x + 8, CASCO.y + CASCO.h - 18 - m * 26);
    }
    c.restore();

    // Superestructura sobre la popa: sin ella el casco se lee
    // como un contenedor gigante y no como un buque.
    var sx = CASCO.x + 26, sy = CASCO.y - 58;
    c.fillStyle = '#37536e';
    c.strokeStyle = 'rgba(190, 218, 240, 0.45)';
    c.lineWidth = 2;
    c.fillRect(sx, sy, 132, 58);
    c.strokeRect(sx, sy, 132, 58);
    c.fillRect(sx + 20, sy - 24, 92, 24);
    c.strokeRect(sx + 20, sy - 24, 92, 24);
    // ventanas del puente, tenues
    c.fillStyle = 'rgba(255, 214, 150, 0.35)';
    for (var v = 0; v < 5; v++) c.fillRect(sx + 28 + v * 17, sy - 17, 11, 9);
    c.fillStyle = 'rgba(180, 215, 240, 0.18)';
    for (var f2 = 0; f2 < 2; f2++) {
      for (var v2 = 0; v2 < 7; v2++) c.fillRect(sx + 10 + v2 * 17, sy + 12 + f2 * 22, 11, 9);
    }
    // chimenea
    c.fillStyle = '#2a4257';
    c.fillRect(sx + 96, sy - 44, 26, 22);
    c.strokeRect(sx + 96, sy - 44, 26, 22);

    // contorno del casco, por encima de todo
    c.strokeStyle = 'rgba(170, 200, 225, 0.4)';
    c.lineWidth = 3;
    perfilCasco(c);
    c.stroke();
  }

  // grua Goliath cruzando el dique por encima
  var goliath = { x: 0, dir: 1 };

  // La grua Goliath cruza el dique de lado a lado por encima del
  // buque, que es la pieza que hace reconocible un astillero de
  // un vistazo. La estructura no se mueve nunca, asi que va
  // horneada en el fondo: por frame solo se dibuja el carro.
  var GOLIATH_Y = 236;

  function dibujarGoliathFijo(c) {
    var vy = GOLIATH_Y;
    c.save();
    c.strokeStyle = 'rgba(150, 185, 215, 0.4)';
    c.fillStyle = 'rgba(38, 62, 84, 0.97)';
    c.lineWidth = 3;

    // patas de celosia apoyadas en los dos cantiles
    for (var l = 0; l < 2; l++) {
      var px = l ? W - 118 : 78;
      c.fillRect(px, vy + 26, 22, MUELLE - vy - 26);
      c.strokeRect(px, vy + 26, 22, MUELLE - vy - 26);
      c.beginPath();
      for (var k = 0; k * 30 < MUELLE - vy - 26; k++) {
        c.moveTo(px, vy + 26 + k * 30);
        c.lineTo(px + 22, vy + 56 + k * 30);
      }
      c.stroke();
    }

    // viga cajon con su celosia
    c.fillRect(60, vy, W - 120, 26);
    c.strokeRect(60, vy, W - 120, 26);
    c.beginPath();
    for (var t = 0; t < 24; t++) {
      c.moveTo(70 + t * 48, vy);
      c.lineTo(94 + t * 48, vy + 26);
    }
    c.stroke();
    c.restore();
  }

  function dibujarGoliathCarro(c) {
    var vy = GOLIATH_Y;
    c.save();
    // carro con el gancho, que es lo unico que se mueve
    var cx = 120 + goliath.x;
    c.fillStyle = '#FFC627';
    c.fillRect(cx - 26, vy - 16, 52, 18);
    c.strokeStyle = 'rgba(200, 225, 245, 0.5)';
    c.lineWidth = 2;
    c.beginPath();
    c.moveTo(cx - 8, vy + 26); c.lineTo(cx - 8, vy + 96);
    c.moveTo(cx + 8, vy + 26); c.lineTo(cx + 8, vy + 96);
    c.stroke();
    c.fillStyle = 'rgba(210, 230, 245, 0.7)';
    c.fillRect(cx - 16, vy + 96, 32, 12);
    c.restore();
  }

  /* ============================================================
     15. DIBUJO -- las piezas

         Cuatro siluetas de astillero. Todas llevan el rotulo con
         la palabra en un recuadro claro (que es lo que hay que
         leer, asi que manda sobre el dibujo) y la insignia del
         boton en la esquina.
     ============================================================ */

  var PIEZA_W = 210;
  var PIEZA_H = 116;

  // La pieza se ensancha con la palabra que lleva: con ancho fijo,
  // "ESTRUCTURA ORGANIZACIONAL" salia a 11 px y no se leia de
  // lejos, que es justo lo que este juego pide.
  function anchoPieza(texto) {
    var n = texto.length;
    if (n <= 12) return PIEZA_W;
    if (n <= 20) return 240;
    return 288;
  }

  function siluetaPlancha(c, w, h) {
    var ch = 16;
    c.beginPath();
    c.moveTo(-w / 2 + ch, -h / 2);
    c.lineTo(w / 2 - ch, -h / 2);
    c.lineTo(w / 2, -h / 2 + ch);
    c.lineTo(w / 2, h / 2 - ch);
    c.lineTo(w / 2 - ch, h / 2);
    c.lineTo(-w / 2 + ch, h / 2);
    c.lineTo(-w / 2, h / 2 - ch);
    c.lineTo(-w / 2, -h / 2 + ch);
    c.closePath();
    c.fill();
    c.stroke();
    // remaches
    c.fillStyle = 'rgba(255, 255, 255, 0.16)';
    for (var i = 0; i < 6; i++) {
      c.beginPath();
      c.arc(-w / 2 + 20 + i * ((w - 40) / 5), -h / 2 + 11, 3, 0, 6.29);
      c.fill();
      c.beginPath();
      c.arc(-w / 2 + 20 + i * ((w - 40) / 5), h / 2 - 11, 3, 0, 6.29);
      c.fill();
    }
  }

  function siluetaContenedor(c, w, h) {
    c.beginPath();
    c.rect(-w / 2, -h / 2, w, h);
    c.fill();
    c.stroke();
    c.strokeStyle = 'rgba(255, 255, 255, 0.10)';
    c.lineWidth = 2;
    for (var i = 1; i < 14; i++) {
      c.beginPath();
      c.moveTo(-w / 2 + i * (w / 14), -h / 2 + 4);
      c.lineTo(-w / 2 + i * (w / 14), h / 2 - 4);
      c.stroke();
    }
    // esquineros
    c.fillStyle = 'rgba(255, 255, 255, 0.18)';
    c.fillRect(-w / 2, -h / 2, 12, 12);
    c.fillRect(w / 2 - 12, -h / 2, 12, 12);
    c.fillRect(-w / 2, h / 2 - 12, 12, 12);
    c.fillRect(w / 2 - 12, h / 2 - 12, 12, 12);
  }

  function siluetaViga(c, w, h) {
    var ala = 18;
    c.beginPath();
    c.rect(-w / 2, -h / 2, w, ala);
    c.rect(-w / 2, h / 2 - ala, w, ala);
    c.rect(-w * 0.16, -h / 2 + ala, w * 0.32, h - ala * 2);
    c.fill();
    c.stroke();
  }

  function siluetaBidon(c, w, h) {
    c.beginPath();
    c.rect(-w / 2, -h / 2, w, h);
    c.fill();
    c.stroke();
    c.strokeStyle = 'rgba(255, 255, 255, 0.14)';
    c.lineWidth = 4;
    for (var i = 1; i <= 2; i++) {
      c.beginPath();
      c.moveTo(-w / 2, -h / 2 + i * (h / 3));
      c.lineTo(w / 2, -h / 2 + i * (h / 3));
      c.stroke();
    }
    c.beginPath();
    c.ellipse(-w / 2, 0, 9, h / 2, 0, 0, 6.29);
    c.fill();
    c.stroke();
  }

  var SILUETAS = [siluetaPlancha, siluetaContenedor, siluetaViga, siluetaBidon];
  var TINTES = ['#456580', '#4d6350', '#65505e', '#4c6572'];

  // Cuerpo de la pieza en coordenadas locales, ya trasladado y
  // rotado por quien llama. Se usa igual para la pieza entera y
  // para cada mitad cortada (que solo cambia el recorte).
  function dibujarCuerpo(c, pieza) {
    var w = pieza.w || PIEZA_W, h = PIEZA_H;

    c.save();
    c.fillStyle = TINTES[pieza.forma];
    c.strokeStyle = 'rgba(200, 225, 245, 0.45)';
    c.lineWidth = 3;
    SILUETAS[pieza.forma](c, w, h);
    c.restore();

    // rotulo: fondo claro y texto oscuro, que es lo que se lee a
    // distancia y en proyector
    var rw = w - 26, rh = 54;
    c.fillStyle = 'rgba(233, 240, 247, 0.94)';
    c.fillRect(-rw / 2, -rh / 2, rw, rh);
    c.fillStyle = '#0b1118';
    escribirEnCaja(c, pieza.dato.t, rw - 16, rh - 10);

    // Insignia del boton, SIEMPRE centrada en el canto de abajo.
    // Que salga siempre en el mismo sitio es lo que permite
    // leerla de reojo: la vista va al rotulo, y el boton se coge
    // por la posicion sin tener que buscarlo por la pieza.
    var b = BOTONES[pieza.bt];
    c.save();
    c.translate(0, h / 2 + 4);
    c.beginPath();
    c.arc(0, 0, 27, 0, 6.29);
    c.fillStyle = 'rgba(7, 12, 19, 0.85)';
    c.fill();
    c.beginPath();
    c.arc(0, 0, 24, 0, 6.29);
    c.fillStyle = b.color;
    c.fill();
    c.lineWidth = 3;
    c.strokeStyle = 'rgba(255, 255, 255, 0.9)';
    c.stroke();
    c.fillStyle = b.texto;
    c.font = '700 27px "JetBrains Mono", monospace';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillText(b.k, 0, 1);
    c.restore();
  }

  // Ajusta el cuerpo del rotulo a la caja: prueba en una linea y
  // si no cabe parte por el espacio mas cercano al centro.
  function escribirEnCaja(c, texto, ancho, alto) {
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    var tam = 26;
    c.font = '900 ' + tam + 'px Montserrat, sans-serif';
    if (c.measureText(texto).width <= ancho) {
      c.fillText(texto, 0, 0);
      return;
    }
    var lineas = partirTexto(texto);
    tam = lineas.length > 2 ? 15 : 20;
    c.font = '900 ' + tam + 'px Montserrat, sans-serif';
    // si sigue sin caber, se encoge hasta que quepa la linea larga
    var guarda = 0;
    while (guarda++ < 12) {
      var max = 0;
      for (var i = 0; i < lineas.length; i++) max = Math.max(max, c.measureText(lineas[i]).width);
      if (max <= ancho || tam <= 11) break;
      tam -= 1;
      c.font = '900 ' + tam + 'px Montserrat, sans-serif';
    }
    var paso = tam + 3;
    var y0 = -(lineas.length - 1) * paso / 2;
    for (var j = 0; j < lineas.length; j++) c.fillText(lineas[j], 0, y0 + j * paso);

    function partirTexto(t) {
      var pal = t.split(' ');
      if (pal.length === 1) return [t];
      // corte por el espacio que deja las dos mitades mas parejas
      var mejor = 1, dif = 1e9;
      for (var k = 1; k < pal.length; k++) {
        var a = pal.slice(0, k).join(' ').length;
        var b = pal.slice(k).join(' ').length;
        if (Math.abs(a - b) < dif) { dif = Math.abs(a - b); mejor = k; }
      }
      return [pal.slice(0, mejor).join(' '), pal.slice(mejor).join(' ')];
    }
  }

  function dibujarPieza(c, pieza) {
    c.save();
    c.translate(pieza.x, pieza.y);
    c.rotate(pieza.giro);
    // sombra propia para despegarla del fondo
    c.shadowColor = 'rgba(0, 0, 0, 0.55)';
    c.shadowBlur = 18;
    c.shadowOffsetY = 8;
    dibujarCuerpo(c, pieza);
    c.restore();
  }

  // Una mitad se dibuja recortando el cuerpo entero por el
  // semiplano del corte: se rota al angulo del tajo, se recorta
  // media pieza y se vuelve a rotar para pintar el dibujo recto.
  function dibujarMitad(c, m) {
    c.save();
    c.globalAlpha = clamp(m.vida, 0, 1);
    c.translate(m.x + Math.sin(m.corte) * m.sep * -m.lado,
                m.y + Math.cos(m.corte) * m.sep * m.lado);
    c.rotate(m.giro);
    c.save();
    c.rotate(m.corte);
    c.beginPath();
    if (m.lado < 0) c.rect(-600, -600, 1200, 600);
    else c.rect(-600, 0, 1200, 600);
    c.clip();
    c.rotate(-m.corte);
    dibujarCuerpo(c, m.pieza);
    c.restore();
    // canto incandescente del corte
    c.save();
    c.rotate(m.corte);
    var mw = m.pieza.w || PIEZA_W;
    var grad = c.createLinearGradient(0, -6 * m.lado, 0, 8 * m.lado);
    grad.addColorStop(0, 'rgba(255, 190, 90, ' + (0.85 * clamp(m.vida, 0, 1)) + ')');
    grad.addColorStop(1, 'rgba(255, 120, 20, 0)');
    c.fillStyle = grad;
    c.fillRect(-mw / 2, m.lado < 0 ? -8 : 0, mw, 8);
    c.restore();
    c.restore();
  }

  /* ============================================================
     16. BUCLE
     ============================================================ */

  function actualizar(dt) {
    goliath.x += 34 * dt * goliath.dir;
    if (goliath.x > W - 260) goliath.dir = -1;
    if (goliath.x < 20) goliath.dir = 1;

    if (juego.fase === 'cuenta') {
      juego.cuenta -= dt;
      if (juego.cuenta <= 0) juego.fase = 'jugando';
    }

    if (juego.fase === 'jugando') {
      // lanzador
      juego.proxima -= dt;
      if (juego.proxima <= 0 && juego.cola.length && juego.piezas.length < maxSimultaneas()) {
        lanzar();
        juego.proxima = mezcla(CFG.huecoIni, CFG.huecoFin, avance()) * rnd(0.85, 1.2);
      }

      // piezas en vuelo
      for (var i = juego.piezas.length - 1; i >= 0; i--) {
        var p = juego.piezas[i];
        p.vida += dt;
        p.vy += p.g * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.giro = Math.sin(p.fase + p.vida * p.vel) * p.amp;
        // el rebote lateral mide el ancho REAL de la pieza: las
        // palabras largas van en piezas mas anchas y con un
        // margen fijo se salian de cuadro
        var borde = p.w / 2 + 16;
        if (p.x < borde || p.x > W - borde) p.vx *= -1;
        if (p.y > CFG.yPierde && p.vy > 0) caer(p);
      }
    }

    // mitades cortadas
    for (var m = juego.mitades.length - 1; m >= 0; m--) {
      var h = juego.mitades[m];
      h.vy += 1400 * dt;
      h.x += h.vx * dt;
      h.y += h.vy * dt;
      h.giro += h.vgiro * dt;
      h.sep += 62 * dt;
      h.vida -= dt * 0.55;
      if (h.vida <= 0 || h.y > H + 220) juego.mitades.splice(m, 1);
    }

    for (var s = juego.chispas.length - 1; s >= 0; s--) {
      var ch = juego.chispas[s];
      ch.vy += 900 * dt;
      ch.x += ch.vx * dt;
      ch.y += ch.vy * dt;
      ch.vida -= dt;
      if (ch.vida <= 0) juego.chispas.splice(s, 1);
    }

    for (var u = juego.humos.length - 1; u >= 0; u--) {
      var hu = juego.humos[u];
      hu.x += hu.vx * dt;
      hu.y += hu.vy * dt;
      hu.r += 22 * dt;
      hu.vida -= dt;
      if (hu.vida <= 0) juego.humos.splice(u, 1);
    }

    for (var t = juego.tajos.length - 1; t >= 0; t--) {
      juego.tajos[t].vida -= dt * 2.6;
      if (juego.tajos[t].vida <= 0) juego.tajos.splice(t, 1);
    }

    for (var f = juego.flotantes.length - 1; f >= 0; f--) {
      var fl = juego.flotantes[f];
      fl.y -= 46 * dt;
      fl.vida -= dt * 0.9;
      if (fl.vida <= 0) juego.flotantes.splice(f, 1);
    }

    // chispas de soldadura de ambiente en el casco
    if (juego.fase !== 'portada' && Math.random() < dt * 3.2) {
      chispear(rnd(CASCO.x, CASCO.x + CASCO.w), rnd(CASCO.y + 20, CASCO.y + CASCO.h), 3, '#ffd9a0');
    }

    juego.sacudida = Math.max(0, juego.sacudida - dt * 2.6);
    juego.tinte = Math.max(0, juego.tinte - dt * 1.6);
  }

  function dibujar() {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, W, H);

    var sx = 0, sy = 0;
    if (juego.sacudida > 0) {
      sx = rnd(-1, 1) * 14 * juego.sacudida;
      sy = rnd(-1, 1) * 14 * juego.sacudida;
    }
    ctx.translate(sx, sy);

    ctx.drawImage(fondo, 0, 0);
    dibujarCasco(ctx);
    dibujarGoliathCarro(ctx);

    // humo por detras de las piezas
    for (var u = 0; u < juego.humos.length; u++) {
      var hu = juego.humos[u];
      ctx.globalAlpha = clamp(hu.vida / hu.max, 0, 1) * 0.5;
      ctx.fillStyle = '#2a2f35';
      ctx.beginPath();
      ctx.arc(hu.x, hu.y, hu.r, 0, 6.29);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    for (var m = 0; m < juego.mitades.length; m++) dibujarMitad(ctx, juego.mitades[m]);
    for (var i = 0; i < juego.piezas.length; i++) dibujarPieza(ctx, juego.piezas[i]);

    // tajos de plasma
    for (var t = 0; t < juego.tajos.length; t++) {
      var tj = juego.tajos[t];
      ctx.save();
      ctx.translate(tj.x, tj.y);
      ctx.rotate(tj.ang);
      ctx.globalAlpha = clamp(tj.vida, 0, 1);
      var gr = ctx.createLinearGradient(-tj.largo / 2, 0, tj.largo / 2, 0);
      gr.addColorStop(0, 'rgba(255, 220, 150, 0)');
      gr.addColorStop(0.5, 'rgba(255, 240, 210, 0.95)');
      gr.addColorStop(1, 'rgba(255, 220, 150, 0)');
      ctx.fillStyle = gr;
      ctx.fillRect(-tj.largo / 2, -3, tj.largo, 6);
      ctx.restore();
    }
    ctx.globalAlpha = 1;

    // chispas
    for (var s = 0; s < juego.chispas.length; s++) {
      var ch = juego.chispas[s];
      ctx.globalAlpha = clamp(ch.vida / ch.max, 0, 1);
      ctx.strokeStyle = ch.color;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(ch.x, ch.y);
      ctx.lineTo(ch.x - ch.vx * 0.016, ch.y - ch.vy * 0.016);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;

    // puntos flotantes
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (var f = 0; f < juego.flotantes.length; f++) {
      var fl = juego.flotantes[f];
      ctx.globalAlpha = clamp(fl.vida, 0, 1);
      ctx.font = '900 40px Montserrat, sans-serif';
      ctx.lineWidth = 5;
      ctx.strokeStyle = 'rgba(7, 12, 19, 0.85)';
      ctx.strokeText(fl.txt, fl.x, fl.y);
      ctx.fillStyle = fl.color;
      ctx.fillText(fl.txt, fl.x, fl.y);
    }
    ctx.globalAlpha = 1;

    // cuenta atras antes de la primera pieza
    if (juego.fase === 'cuenta') {
      var n = Math.ceil(juego.cuenta);
      ctx.fillStyle = 'rgba(7, 12, 19, 0.55)';
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = '#FFC627';
      ctx.font = '900 150px Montserrat, sans-serif';
      ctx.fillText(n > 0 ? String(n) : 'YA', W / 2, H / 2 - 20);
      ctx.fillStyle = 'rgba(232, 238, 245, 0.8)';
      ctx.font = '700 22px "JetBrains Mono", monospace';
      ctx.fillText(CRITERIO.pre + '  ' + CRITERIO.que, W / 2, H / 2 + 70);
    }

    // tinte rojo al cortar lo que no se debia
    if (juego.tinte > 0) {
      ctx.fillStyle = 'rgba(255, 60, 40, ' + (juego.tinte * 0.16) + ')';
      ctx.fillRect(0, 0, W, H);
    }

    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }

  // Las letras con pieza viva se encienden en la botonera: es el
  // unico sitio donde el jugador ve de un golpe que botones
  // significan algo ahora mismo.
  function pintarBotonera() {
    for (var i = 0; i < botoneraEls.length; i++) {
      var viva = false;
      for (var j = 0; j < juego.piezas.length; j++) if (juego.piezas[j].bt === i) viva = true;
      botoneraEls[i].classList.toggle('viva', viva);
    }
  }

  var ultimo = performance.now();
  function bucle(ahora) {
    var dt = Math.min((ahora - ultimo) / 1000, 0.05);
    ultimo = ahora;
    if (juego.fase !== 'pausa') actualizar(dt);
    dibujar();
    pintarBotonera();
    pintarDiag();
    requestAnimationFrame(bucle);
  }

  /* ============================================================
     17. MONTAJE
     ============================================================ */

  // El canvas trabaja siempre en 1280x720 logicos y el backing
  // store se agranda con el devicePixelRatio para que el texto de
  // las piezas no salga borroso en pantallas densas. Como el
  // dibujo hace setTransform para reponer la identidad, el factor
  // no se puede dejar aplicado: se guarda aqui y se mete en el
  // propio setTransform (ver mas abajo).
  var DPR = 1;
  function reescalar() {
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    lienzo.width = W * DPR;
    lienzo.height = H * DPR;
  }

  // Se envuelve setTransform para que todo el codigo de dibujo
  // pueda seguir razonando en coordenadas de 1280x720.
  var setTransformOrig = ctx.setTransform.bind(ctx);
  ctx.setTransform = function (a, b, c2, d, e, f) {
    setTransformOrig(a * DPR, b * DPR, c2 * DPR, d * DPR, e * DPR, f * DPR);
  };

  reescalar();
  window.addEventListener('resize', reescalar);

  // criterio en las tres pantallas donde aparece
  $('hud-criterio-pre').textContent = CRITERIO.pre;
  $('hud-criterio').textContent = CRITERIO.que;
  $('port-criterio-pre').textContent = CRITERIO.pre;
  $('port-criterio').textContent = CRITERIO.que;
  $('port-criterio-nota').textContent = CRITERIO.nota;

  // ajustes de taller por URL
  var vuelo = parseFloat(PARAMS.get('vuelo'));
  if (vuelo > 0.6) {
    CFG.vueloIni = vuelo;
    CFG.vueloFin = Math.max(1.1, vuelo - 0.8);
  }

  $('btn-empezar').addEventListener('click', empezar);
  $('btn-repetir').addEventListener('click', function () { cerrarCapas(); empezar(); });
  $('btn-fin-portada').addEventListener('click', function () {
    cerrarCapas();
    juego.fase = 'portada';
    $('portada').hidden = false;
  });
  $('btn-ayuda').addEventListener('click', alternarAyuda);
  $('btn-portada-ayuda').addEventListener('click', alternarAyuda);
  $('btn-entendido').addEventListener('click', function () { $('overlay').hidden = true; });

  // El estado queda a la vista para taller y para capturas
  // automatizadas: desde fuera se puede leer que piezas hay en el
  // aire, con que letra y como va el marcador.
  window.__corte = juego;

  hornearFondo();
  nuevoTurno();
  juego.fase = 'portada';   // el turno queda armado pero no corre hasta empezar()
  pintarHud();
  pintarMando();
  requestAnimationFrame(bucle);
})();
