/* ============================================================
   MANDO -- lectura de control de Xbox (y compatibles)

   Version vanilla del modulo que ya usa Terminal Rally. La
   Gamepad API no emite eventos de boton: hay que sondear, y aqui
   vive el unico rAF que lo hace. Lo que publica son acciones con
   nombre (A, B, X, Y, START, BACK, ARRIBA...), no indices.

   Las cuatro reglas que hacen que el mismo codigo valga en
   Chrome, Edge, Firefox y Safari sobre Windows, macOS y Linux:

     1. navigator.getGamepads() se vuelve a pedir CADA frame y no
        se guarda nunca el objeto Gamepad entre frames: en Chrome
        es una instantanea inmutable, asi que cachearla deja los
        botones congelados. Es el fallo de portabilidad clasico
        (funciona en Firefox, no en Chrome).
     2. La cruceta se lee de las dos formas a la vez: botones
        12-15 (mapeo estandar) y eje sombrero 9, que es como la
        expone Firefox sobre Linux. Se combinan con OR, asi que
        no hay que detectar navegador.
     3. Un boton puede llegar como objeto GamepadButton o como
        numero suelto segun la implementacion; pulsado() acepta
        las dos formas.
     4. Si el mando no reporta mapping 'standard' se sigue
        intentando con los mismos indices y queda anotado, que es
        lo unico que permite distinguir "no hay mando" de "hay
        mando con otro mapeo" sin tener la maquina delante.

   Y el modo de fallo que mas confunde: la Gamepad API EXIGE
   CONTEXTO SEGURO. localhost y https van; una IP de LAN por http
   plano NO, y ahi el navegador devuelve lista vacia sin dar
   ningun error. Por eso se detecta y se dice con todas sus
   letras en la portada.
   ============================================================ */

(function (global) {
  'use strict';

  // Indices del mapeo 'standard' del W3C, que es lo que reportan
  // los mandos de Xbox en todos los navegadores modernos.
  var BTN = {
    A: 0, B: 1, X: 2, Y: 3,
    LB: 4, RB: 5, LT: 6, RT: 7,
    VIEW: 8, START: 9,
    DUP: 12, DDOWN: 13, DLEFT: 14, DRIGHT: 15
  };

  var ACCIONES = ['A', 'B', 'X', 'Y', 'START', 'BACK', 'ARRIBA', 'ABAJO', 'IZQ', 'DER'];

  // Umbrales del stick con histeresis: para activar hay que pasar
  // MUERTA, para soltar hay que bajar de VIVA. Sin esa banda un
  // stick con drift en el borde dispara y suelta varias veces por
  // segundo.
  var MUERTA = 0.55;
  var VIVA = 0.32;

  var estado = {
    soportado: typeof navigator !== 'undefined' && typeof navigator.getGamepads === 'function',
    seguro: typeof window === 'undefined' || window.isSecureContext !== false,
    conectado: false,
    id: '',
    mapeo: '',
    // Por privacidad los navegadores no exponen el mando hasta
    // que se pulsa un boton en el. Hasta entonces esto es true y
    // la portada lo explica en vez de parecer rota.
    esperando: true,
    botones: [],
    ejes: []
  };

  var oyentesAccion = [];
  var oyentesEstado = [];

  function pulsado(b) {
    if (b == null) return false;
    if (typeof b === 'object') return b.pressed === true || b.value > 0.5;
    return b > 0.5;
  }

  // Firefox sobre Linux expone la cruceta como un unico eje
  // "sombrero" con ocho direcciones repartidas en [-1, 1] y un
  // valor fuera de rango en reposo. -1 arriba, y de ahi en
  // sentido horario en pasos de 2/7.
  var SOMBRERO = [
    ['ARRIBA'], ['ARRIBA', 'DER'], ['DER'], ['ABAJO', 'DER'],
    ['ABAJO'], ['ABAJO', 'IZQ'], ['IZQ'], ['ARRIBA', 'IZQ']
  ];

  function dirsSombrero(v) {
    if (v == null || v > 1.05 || v < -1.05) return null;
    var i = Math.round((v + 1) / (2 / 7));
    return SOMBRERO[i] || null;
  }

  var stick = { x: 0, y: 0 };

  function retener(v, actual) {
    if (v >= MUERTA) return 1;
    if (v <= -MUERTA) return -1;
    if (Math.abs(v) < VIVA) return 0;
    return actual;
  }

  function leer(gp) {
    var b = gp.buttons || [];
    var ax = gp.axes || [];
    var a = {};
    for (var i = 0; i < ACCIONES.length; i++) a[ACCIONES[i]] = false;

    a.A = pulsado(b[BTN.A]);
    a.B = pulsado(b[BTN.B]);
    a.X = pulsado(b[BTN.X]);
    a.Y = pulsado(b[BTN.Y]);
    a.START = pulsado(b[BTN.START]);
    a.BACK = pulsado(b[BTN.VIEW]);

    // cruceta como botones (mapeo estandar)
    if (pulsado(b[BTN.DUP])) a.ARRIBA = true;
    if (pulsado(b[BTN.DDOWN])) a.ABAJO = true;
    if (pulsado(b[BTN.DLEFT])) a.IZQ = true;
    if (pulsado(b[BTN.DRIGHT])) a.DER = true;

    // cruceta como eje sombrero; se suma a lo anterior, no lo sustituye
    var s = dirsSombrero(ax[9]);
    if (s) for (var j = 0; j < s.length; j++) a[s[j]] = true;

    // stick izquierdo con zona muerta e histeresis
    stick.x = retener(ax[0] || 0, stick.x);
    stick.y = retener(ax[1] || 0, stick.y);
    if (stick.x < 0) a.IZQ = true;
    if (stick.x > 0) a.DER = true;
    if (stick.y < 0) a.ARRIBA = true;
    if (stick.y > 0) a.ABAJO = true;

    return a;
  }

  // Estado de flanco por accion. En este juego NUNCA se repite al
  // mantener: una pieza, una pulsacion. Dejar el pulgar apoyado en
  // A no puede cortar la siguiente plancha que salga con esa letra.
  var flanco = {};
  for (var k = 0; k < ACCIONES.length; k++) flanco[ACCIONES[k]] = false;

  function soltarFlancos() {
    for (var i = 0; i < ACCIONES.length; i++) flanco[ACCIONES[i]] = false;
    stick.x = 0;
    stick.y = 0;
  }

  function elegirMando() {
    // Regla 1: lista nueva cada frame, sin guardar nada.
    var mandos = navigator.getGamepads ? navigator.getGamepads() : [];
    var mejor = null;
    for (var i = 0; i < mandos.length; i++) {
      var p = mandos[i];
      if (!p || !p.connected) continue;
      // se prefiere el que reporta mapeo estandar; si ninguno, el primero
      if (!mejor || (p.mapping === 'standard' && mejor.mapping !== 'standard')) mejor = p;
    }
    return mejor;
  }

  function emitirAccion(accion) {
    var copia = oyentesAccion.slice();
    for (var i = 0; i < copia.length; i++) copia[i](accion);
  }

  function emitirEstado() {
    var copia = oyentesEstado.slice();
    for (var i = 0; i < copia.length; i++) copia[i](estado);
  }

  function sincronizar(gp) {
    var antesConectado = estado.conectado;
    var antesId = estado.id;
    if (gp) {
      estado.conectado = true;
      estado.esperando = false;
      estado.id = gp.id || '';
      estado.mapeo = gp.mapping || '';
    } else {
      estado.conectado = false;
      estado.id = '';
      estado.mapeo = '';
    }
    if (estado.conectado !== antesConectado || estado.id !== antesId) {
      if (!gp) {
        // al desconectarse hay que soltar los flancos o queda un
        // boton pegado; y el navegador vuelve a exigir una
        // pulsacion para revelar el mando
        soltarFlancos();
        estado.esperando = true;
      }
      emitirEstado();
    }
  }

  function sondear() {
    var gp = elegirMando();
    sincronizar(gp);
    if (!gp) return;

    estado.botones = [];
    var bs = gp.buttons || [];
    for (var i = 0; i < bs.length; i++) {
      estado.botones.push(typeof bs[i] === 'object' ? bs[i].value : bs[i]);
    }
    estado.ejes = (gp.axes || []).slice();

    var a = leer(gp);
    for (var j = 0; j < ACCIONES.length; j++) {
      var nombre = ACCIONES[j];
      if (!a[nombre]) {
        flanco[nombre] = false;
        continue;
      }
      if (!flanco[nombre]) {
        flanco[nombre] = true;
        emitirAccion(nombre);
      }
    }
  }

  var arrancado = false;

  var Mando = {
    estado: estado,

    iniciar: function () {
      if (arrancado || !estado.soportado) return;
      arrancado = true;

      // gamepadconnected llega antes de la primera pulsacion en
      // unos navegadores y despues en otros, asi que solo sirve
      // para quitar cuanto antes el aviso de "pulsa un boton". La
      // deteccion de verdad la hace el sondeo.
      window.addEventListener('gamepadconnected', function () {
        estado.esperando = false;
      });
      window.addEventListener('gamepaddisconnected', function () {
        soltarFlancos();
        estado.esperando = true;
      });

      var tic = function () {
        sondear();
        requestAnimationFrame(tic);
      };
      requestAnimationFrame(tic);
    },

    // Suscripcion a pulsaciones. Solo flancos, nunca repeticion.
    alPulsar: function (fn) {
      oyentesAccion.push(fn);
    },

    // Suscripcion a conexion / desconexion. Solo dispara cuando
    // cambia de verdad, nunca por frame.
    alCambiarEstado: function (fn) {
      oyentesEstado.push(fn);
    },

    // Texto para la portada: distingue los cuatro casos que
    // importan (sin API, contexto inseguro, esperando pulsacion,
    // conectado) porque los tres primeros se ven igual desde
    // fuera y se diagnostican distinto.
    diagnostico: function () {
      if (!estado.soportado) return { nivel: 'mal', texto: 'ESTE NAVEGADOR NO TIENE GAMEPAD API -- JUEGA CON EL TECLADO' };
      if (!estado.seguro) return { nivel: 'mal', texto: 'SIN CONTEXTO SEGURO: EL NAVEGADOR NO ENTREGA MANDOS POR http. ABRE POR localhost O POR https' };
      if (estado.conectado) {
        // el id trae cola de fabricante ("(STANDARD GAMEPAD Vendor:
        // 045e Product: 02fd)") que no aporta y ademas se corta a
        // media palabra
        var nombre = (estado.id || 'sin nombre').replace(/\s*\(.*$/, '').trim();
        return { nivel: 'bien', texto: 'MANDO CONECTADO -- ' + nombre.slice(0, 44).toUpperCase() };
      }
      return { nivel: 'espera', texto: 'PULSA UN BOTON DEL MANDO PARA QUE EL NAVEGADOR LO DETECTE' };
    }
  };

  global.Mando = Mando;
})(window);
