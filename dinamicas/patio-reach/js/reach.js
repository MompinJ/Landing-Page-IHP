/* ============================================================
   DINAMICA PATIO REACH - motor

   Patio de contenedores de 20 x 14 casillas en pixel art, vista
   3/4 (el suelo se ve a plomo y todo lo que tiene altura se dibuja
   de frente, como en los RPG de cuadricula). El participante ES la
   reachstacker RS-04.

   CONDUCIR es vehicular, no de personaje: avanzar y retroceder en
   el rumbo actual, girar 90 grados en sitio. Hay que encarar antes
   de maniobrar.

   EL BRAZO tiene dos ejes, como la maquina real:
   - ALCANCE  corto / medio / largo: a que casilla llega el
              spreader, una, dos o tres por delante
   - ALTURA   nivel 0 a 3 de la pila
   Atados por la curva de carga (MAX_ALTURA): cuanto mas alargas,
   menos alto llegas. Por eso a veces conviene reposicionar la
   maquina en vez de estirar el brazo.

   EL TURNO son ordenes de trabajo con reloj y puntaje (TURNOS).
   Cada orden pide llevar un contenedor concreto a una zona. Se
   cobra por entrega, por como llega la caja y por lo limpio que se
   opero.

   CONTENEDORES ESPECIALES (TIPOS)
   - REEFER      va enchufado: solo se posa en casilla con toma
   - IMO         segregado de otros IMO, y no se le apila encima
   - OVERWEIGHT  solo al nivel 0, y frena mas la maquina

   CLIMA por turno: lluvia (piso resbaladizo, maniobras largas),
   niebla y noche (visibilidad recortada alrededor de la maquina y
   de los focos).

   COMO SE DIBUJA
   El canvas tiene 480 x 336 pixeles NATIVOS (20 x 14 casillas de
   24 px) y el CSS lo estira a un multiplo entero con
   image-rendering: pixelated. Todo se pinta con fillRect sobre
   coordenadas enteras: nada de paths, para que no haya bordes
   suavizados. El suelo se hornea UNA vez y todo lo que levanta del
   piso es una entidad que se ordena por profundidad cada cuadro.

   EL BOOM Y EL SPREADER NO VAN EN EL SPRITE DEL CUERPO: se pintan
   aparte, en coordenadas de mundo (casilla objetivo + altura), asi
   el mismo codigo sirve para los cuatro rumbos y puede variar con
   el alcance y la altura.

   PERSONALIZAR
   - MAPA         trazado del patio, un caracter por casilla
   - TILES        que significa cada caracter y si es solido
   - TURNOS       cajas, ordenes, clima y tiempo de cada turno
   - MAX_ALTURA   la curva de carga
   - maquina*     dibujo de la maquina, rumbo por rumbo
   ============================================================ */

(() => {
  'use strict';

  // ---------- configuracion ----------
  const TILE = 24;                 // lado de la casilla en pixeles nativos
  const T_AVANCE = 0.26;           // segundos por casilla hacia adelante
  const T_REVERSA = 0.42;          // la marcha atras es notablemente mas lenta
  const T_GIRO = 0.22;             // segundos por cuarto de vuelta
  const T_TOPE = 0.24;             // duracion del topetazo contra un obstaculo
  const T_BRAZO = 0.2;             // segundos por escalon de boom o de altura
  const ESPERA_GOLPE = 0.8;        // no recontar el mismo golpe antes de esto
  const LASTRE = 1.5;              // con carga, todo tarda esto de mas
  const LASTRE_OW = 1.9;           // y con un overweight, aun mas

  const PILA_MAX = 3;              // contenedores apilables por casilla
  const MAX_ALTURA = [3, 2, 1];    // la curva de carga: corto, medio, largo
  const ALCANCES = ['CORTO', 'MEDIO', 'LARGO'];

  // Danos a la carga, en puntos de integridad
  const DANO_GOLPE = 16;
  const DANO_CAIDA = 15;           // por nivel de caida al soltar mal
  const DANO_IZADO = 4;            // por maniobra circulando a nivel 1
  const DANO_ZARANDEO = 6;
  const ZARANDEO_MAX = 5;          // maniobras seguidas que aguanta la caja

  // Puntaje
  const PT_ENTREGA = 100;          // base por orden cumplida
  const PT_GOLPE = 12;             // resta por topetazo
  const PT_SEGUNDO = 2;            // bonus por segundo que sobra al terminar

  // ---------- tiles del mundo ----------
  const TILES = {
    '.': { nombre: 'PISO LIBRE',            solido: false },
    'T': { nombre: 'VIA DE CAMION',         solido: false, via: true },
    'r': { nombre: 'VIA DE TREN',           solido: false, riel: true },
    '=': { nombre: 'RAYADO DE SEGREGACION', solido: false },
    'A': { nombre: 'PATIO A',               solido: false, zona: 'A' },
    'B': { nombre: 'PATIO B',               solido: false, zona: 'B' },
    'E': { nombre: 'LINEA DE TOMAS',        solido: false, zona: 'E', toma: true },
    'M': { nombre: 'PIE DE GRUA',           solido: false, zona: 'M' },
    'V': { nombre: 'PATIO DE VACIOS',       solido: false, zona: 'V' },
    'I': { nombre: 'CELDA DE PELIGROSOS',   solido: false, zona: 'I' },
    'G': { nombre: 'GATE DE CAMIONES',      solido: false, zona: 'G' },
    'W': { nombre: 'BASCULA',               solido: false, zona: 'W' },
    '~': { nombre: 'AGUA',                  solido: true,  agua: true },
    'q': { nombre: 'CANTIL DEL MUELLE',     solido: true },
    'b': { nombre: 'BOLARDO',               solido: true },
    'S': { nombre: 'CASCO DEL BUQUE',       solido: true },
    'd': { nombre: 'CUBIERTA DEL BUQUE',    solido: true },
    'L': { nombre: 'PATA DE LA GRUA STS',   solido: true },
    'p': { nombre: 'RACK DE TUBERIA',       solido: true },
    'K': { nombre: 'NAVE DE TALLER',        solido: true },
    '#': { nombre: 'VALLA',                 solido: true },
    'H': { nombre: 'CASETA',                solido: true },
    'o': { nombre: 'CONO',                  solido: true },
    'P': { nombre: 'POSTE DE LUZ',          solido: true }
  };

  const ZONAS = {
    A: 'PATIO A', B: 'PATIO B', E: 'LINEA DE TOMAS', M: 'PIE DE GRUA',
    V: 'PATIO DE VACIOS', I: 'CELDA DE PELIGROSOS', G: 'GATE', W: 'BASCULA'
  };

  const TIPOS = {
    normal: { sigla: 'GP',  nombre: 'ESTANDAR' },
    reefer: { sigla: 'RF',  nombre: 'REEFER' },
    imo:    { sigla: 'IMO', nombre: 'PELIGROSO' },
    pesado: { sigla: 'OW',  nombre: 'OVERWEIGHT' }
  };

  // ---------- los turnos ----------
  // Cada turno trae SU trazado de terminal, no solo otra carga: el
  // mundo mide 40 x 28 casillas y la camara sigue a la maquina.
  // Cada caja lleva matricula para que las ordenes puedan nombrarla
  // sin ambiguedad; el resto es el estorbo que hay que sortear.
  const TURNOS = [
    {
      nombre: 'TURNO 1', clima: 'dia', segundos: 200,
      lema: 'Dia claro en el patio. Tres movimientos limpios para agarrar el ritmo y aprenderte la terminal.',
      inicio: { col: 19, fil: 21 },
      mapa: [
        '~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~',
        '~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~',
        'qqqqbqqqqqqqbqqqqqqqbqqqqqqqbqqqqqqqbqqq',
        'MMMMMMMMMMMMMMMMMMMMMMMM................',
        'MMMMMMMMMMMMMMMMMMMMMMMM.......P........',
        '........................................',
        '#TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT#',
        '#TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT#',
        '#......................................#',
        '#..AAAAAA....BBBBBB....EEEE............#',
        '#..AAAAAA....BBBBBB....EEEE............#',
        '#..AAAAAA....BBBBBB....EEEE............#',
        '#..======....======....................#',
        '#..AAAAAA....BBBBBB....................#',
        '#..AAAAAA....BBBBBB....................#',
        '#..AAAAAA....BBBBBB....................#',
        '#..======....======....................#',
        '#...o........o..........o..............#',
        '#......................................#',
        '#..VVVVV...KKKK......WWW...............#',
        '#..VVVVV...KKKK......WWW...............#',
        '#......................................#',
        '#rrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrr#',
        '#rrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrr#',
        '#......................................#',
        '#.HHH..................GGGGGG..........#',
        '#......................................#',
        '########################################',
      ],
      cajas: [
        { m: 'MSKU-201', col: 3,  fil: 9,  color: 'rojo',  tipo: 'normal' },
        { m: 'TGHU-118', col: 4,  fil: 9,  color: 'azul',  tipo: 'normal' },
        { m: 'CAIU-733', col: 6,  fil: 10, color: 'verde', tipo: 'normal' },
        { m: 'HLXU-940', col: 14, fil: 9,  color: 'gris',  tipo: 'normal' },
        { m: 'OOLU-355', col: 17, fil: 14, color: 'azul',  tipo: 'normal' },
        { m: 'MEDU-090', col: 5,  fil: 14, color: 'gris',  tipo: 'normal' },
        { m: 'SUDU-410', col: 4,  fil: 19, color: 'verde', tipo: 'normal' }
      ],
      ordenes: [
        { m: 'MSKU-201', zona: 'B' },
        { m: 'CAIU-733', zona: 'B' },
        { m: 'HLXU-940', zona: 'A' }
      ],
      trafico: [
        { tipo: 'camion', fil: 6, dir: 1,  x0: -3, v: 4.5, cada: 7 },
        { tipo: 'camion', fil: 7, dir: -1, x0: 42, v: 4,   cada: 9, retraso: 3 }
      ]
    },
    {
      nombre: 'TURNO 2', clima: 'lluvia', segundos: 240,
      lema: 'Buque atracado y lloviendo. Hay que alimentar el pie de grua para que la STS embarque, y el piso resbala.',
      inicio: { col: 20, fil: 19 },
      mapa: [
        '~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~',
        '~~~SSSSSSSSSSSSSSSSSSSSSSSSSSSSSS~~~~~~~',
        '~~~SddddddddddddddddddddddddddddS~~~~~~~',
        '~~~SddddddddddddddddddddddddddddS~~~~~~~',
        '~~~SSSSSSSSSSSSSSSSSSSSSSSSSSSSSS~~~~~~~',
        'qqbqqqqqqqbqqqqqqqbqqqqqqqbqqqqqqqbqqqqq',
        'LMMMMMMMMMMMMMMMMMMMMMMMMMMMMMM.....L...',
        'LMMMMMMMMMMMMMMMMMMMMMMMMMMMMMM.....L...',
        '........P......................P........',
        '#......................................#',
        '#TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT#',
        '#TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT#',
        '#......................................#',
        '#...AAAAAA...BBBBBB...EEEE.............#',
        '#...AAAAAA...BBBBBB...EEEE.............#',
        '#...AAAAAA...BBBBBB...EEEE.............#',
        '#...======...======....................#',
        '#......................................#',
        '#..o..........o...........o............#',
        '#......................................#',
        '#..VVVVVV....IIII......................#',
        '#..VVVVVV....IIII......................#',
        '#......................................#',
        '#..KKKKK..............WWW..............#',
        '#..KKKKK...............................#',
        '#......................................#',
        '#.HHH....................GGGGGG........#',
        '########################################',
      ],
      cajas: [
        { m: 'MSKU-412', col: 5,  fil: 13, color: 'rojo',  tipo: 'normal' },
        { m: 'TGHU-501', col: 5,  fil: 13, color: 'azul',  tipo: 'normal' },
        { m: 'CAIU-088', col: 7,  fil: 14, color: 'verde', tipo: 'normal' },
        { m: 'SUDU-677', col: 14, fil: 13, color: 'gris',  tipo: 'normal' },
        { m: 'HLXU-122', col: 14, fil: 13, color: 'rojo',  tipo: 'normal' },
        { m: 'OOLU-909', col: 14, fil: 13, color: 'azul',  tipo: 'normal' },
        { m: 'MEDU-343', col: 17, fil: 15, color: 'verde', tipo: 'normal' },
        { m: 'CRXU-201', col: 23, fil: 13, color: 'aqua',  tipo: 'reefer' }
      ],
      ordenes: [
        { m: 'OOLU-909', zona: 'M' },
        { m: 'SUDU-677', zona: 'M' },
        { m: 'CAIU-088', zona: 'M' }
      ],
      trafico: [
        { tipo: 'camion', fil: 10,  dir: 1,  x0: -3, v: 4,   cada: 6 },
        { tipo: 'camion', fil: 11, dir: -1, x0: 42, v: 4.5, cada: 8, retraso: 2 },
        { tipo: 'sts',    col: 8,  fil: 6,  v: 1.2, ida: 4, vuelta: 26 }
      ]
    },
    {
      nombre: 'TURNO 3', clima: 'niebla', segundos: 260,
      lema: 'Niebla en la zona intermodal: solo ves lo que tienes cerca, pasa el tren y entra carga especial con sus reglas.',
      inicio: { col: 20, fil: 24 },
      mapa: [
        '~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~',
        'qqqqqqbqqqqqqqqqbqqqqqqqqqbqqqqqqqbqqqqq',
        'MMMMMMMMMMMMMMMM........................',
        '............P..............P............',
        '#......................................#',
        '#TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT#',
        '#TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT#',
        '#......................................#',
        '#.rrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrr.#',
        '#.rrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrr.#',
        '#......................................#',
        '#..VVVVVVVV....VVVVVVVV................#',
        '#..VVVVVVVV....VVVVVVVV................#',
        '#..========....========................#',
        '#......................................#',
        '#..........p......p....................#',
        '#..AAAAA...BBBBB...EEEE................#',
        '#..AAAAA...BBBBB...EEEE................#',
        '#..AAAAA...BBBBB.......................#',
        '#......................................#',
        '#..o............o.........o............#',
        '#......................................#',
        '#..WWWW.....KKKKKK.....................#',
        '#..WWWW.....KKKKKK.....................#',
        '#......................................#',
        '#.HHH................GGGGGG............#',
        '#......................................#',
        '########################################',
      ],
      cajas: [
        { m: 'CRXU-777', col: 4,  fil: 16, color: 'aqua',  tipo: 'reefer' },
        { m: 'MSKU-018', col: 5,  fil: 17, color: 'rojo',  tipo: 'normal' },
        { m: 'IMOU-666', col: 12, fil: 16, color: 'naranja', tipo: 'imo' },
        { m: 'TGHU-240', col: 13, fil: 17, color: 'azul',  tipo: 'normal' },
        { m: 'HLXU-881', col: 6,  fil: 11, color: 'gris',  tipo: 'normal' },
        { m: 'CAIU-455', col: 18, fil: 12, color: 'verde', tipo: 'normal' },
        { m: 'OOLU-512', col: 7,  fil: 11, color: 'azul',  tipo: 'normal' }
      ],
      ordenes: [
        { m: 'CRXU-777', zona: 'E' },
        { m: 'IMOU-666', zona: 'V' },
        { m: 'HLXU-881', zona: 'B' }
      ],
      trafico: [
        { tipo: 'camion', fil: 5, dir: 1,  x0: -3, v: 4.5, cada: 8 },
        { tipo: 'tren',   fil: 8, dir: 1,  x0: -12, v: 6,  cada: 16, largo: 9 },
        { tipo: 'camion', fil: 6, dir: -1, x0: 42, v: 4,   cada: 11, retraso: 4 }
      ]
    },
    {
      nombre: 'TURNO 4', clima: 'noche', segundos: 300,
      lema: 'Turno de noche con la terminal entera abierta: buque, tren y gate. Solo alumbran tus faros y los postes.',
      inicio: { col: 20, fil: 25 },
      mapa: [
        '~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~',
        '~SSSSSSSSSSSSSSSSSSSSSSSSSS~~~~~~~~~~~~~',
        '~SddddddddddddddddddddddddS~~~~~~~~~~~~~',
        '~SddddddddddddddddddddddddS~~~~~~~~~~~~~',
        '~SSSSSSSSSSSSSSSSSSSSSSSSSS~~~~~~~~~~~~~',
        'qqqbqqqqqqqbqqqqqqqbqqqqqqqbqqqqqqqbqqqq',
        'LMMMMMMMMMMMMMMMMMMMMMMMMMM......L......',
        'LMMMMMMMMMMMMMMMMMMMMMMMMMM......L......',
        '......P..........................P......',
        '#TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT#',
        '#TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT#',
        '#......................................#',
        '#..AAAAA..BBBBB..EEEE..IIII............#',
        '#..AAAAA..BBBBB..EEEE..IIII............#',
        '#..AAAAA..BBBBB..EEEE..IIII............#',
        '#..=====..=====........................#',
        '#......................................#',
        '#.rrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrr.#',
        '#.rrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrr.#',
        '#......................................#',
        '#..o.........p........o........p.......#',
        '#......................................#',
        '#..VVVVVV...VVVVVV.....WWW.............#',
        '#..VVVVVV...VVVVVV.....WWW.............#',
        '#......................................#',
        '#..KKKKKK............o.................#',
        '#.HHH..................GGGGGGGG........#',
        '########################################',
      ],
      cajas: [
        { m: 'CRXU-310', col: 4,  fil: 12, color: 'aqua',  tipo: 'reefer' },
        { m: 'OWLU-900', col: 12, fil: 12, color: 'morado', tipo: 'pesado' },
        { m: 'IMOU-121', col: 11, fil: 13, color: 'naranja', tipo: 'imo' },
        { m: 'IMOU-122', col: 25, fil: 14, color: 'naranja', tipo: 'imo' },
        { m: 'MSKU-505', col: 5,  fil: 13, color: 'rojo',  tipo: 'normal' },
        { m: 'TGHU-660', col: 13, fil: 14, color: 'azul',  tipo: 'normal' },
        { m: 'CAIU-771', col: 6,  fil: 22, color: 'verde', tipo: 'normal' },
        { m: 'MEDU-888', col: 14, fil: 22, color: 'gris',  tipo: 'normal' }
      ],
      ordenes: [
        { m: 'OWLU-900', zona: 'M' },
        { m: 'CRXU-310', zona: 'E' },
        { m: 'IMOU-121', zona: 'I' },
        { m: 'MSKU-505', zona: 'M' }
      ],
      trafico: [
        { tipo: 'camion', fil: 9,  dir: 1,  x0: -3, v: 4.5, cada: 6 },
        { tipo: 'camion', fil: 10, dir: -1, x0: 42, v: 5,   cada: 7, retraso: 3 },
        { tipo: 'tren',   fil: 17, dir: -1, x0: 50, v: 6.5, cada: 18, largo: 10 },
        { tipo: 'sts',    col: 10, fil: 6,  v: 1.4, ida: 3, vuelta: 24 }
      ]
    }
  ];

  const RUMBO_INICIAL = 0;

  // El mundo es GRANDE y el canvas es solo una ventana sobre el: la
  // vista mide 20 x 14 casillas y la terminal 40 x 28, asi que la
  // camara sigue a la maquina. Manteniendo la vista del tamano de
  // antes, el pixel se sigue viendo al triple en proyector.
  const VISTA_C = 20, VISTA_F = 14;
  const VISTA_W = VISTA_C * TILE, VISTA_H = VISTA_F * TILE;
  const CAM_MUELLE = 6;            // que tan rapido persigue la camara

  // Para taller y pruebas: ?turno=3 arranca directo en ese turno (util
  // para ensenar solo el de noche) y ?seg=30 acorta el reloj.
  const PARAMS = new URLSearchParams(location.search);
  const TURNO_INICIAL = Math.max(0, Math.min(TURNOS.length - 1, (Number(PARAMS.get('turno')) || 1) - 1));
  const SEG_FORZADO = Number(PARAMS.get('seg')) || 0;

  // 0 norte, 1 este, 2 sur, 3 oeste. El orden importa: girar a la
  // derecha es +1 y a la izquierda es +3 (modulo 4).
  const RUMBOS = [
    { dc: 0,  df: -1, letra: 'N' },
    { dc: 1,  df: 0,  letra: 'E' },
    { dc: 0,  df: 1,  letra: 'S' },
    { dc: -1, df: 0,  letra: 'O' }
  ];

  // Caracteres especiales por codigo, para dejar el fuente en ASCII
  const FLECHAS = [0x25B2, 0x25B6, 0x25BC, 0x25C0].map((n) => String.fromCharCode(n));
  const PUNTO = String.fromCharCode(0xB7);
  const FLECHA = String.fromCharCode(0x2192);

  // El trazado cambia con el turno, asi que las medidas del mundo son
  // variables y se recalculan al arrancar cada uno.
  let mapa = TURNOS[0].mapa;
  let COLS = mapa[0].length;
  let FILAS = mapa.length;
  let MUNDO_W = COLS * TILE;
  let MUNDO_H = FILAS * TILE;

  // ---------- paleta ----------
  const COL = {
    asfalto:    '#3a4048',
    asfaltoAlt: '#464d56',
    asfaltoOsc: '#2e343b',
    via:        '#2f353c',
    viaAlt:     '#383f47',
    pintura:    '#c9d2da',
    zonaA:      '#54BBAB',
    zonaB:      '#009BDE',
    zonaE:      '#c9a227',
    zonaM:      '#e8734a',   // pie de grua, el color de la faena de muelle
    zonaV:      '#7f8a96',   // vacios
    zonaI:      '#ffd23d',   // peligrosos
    zonaG:      '#9d7be0',   // gate
    zonaW:      '#54BBAB',   // bascula
    agua:       '#1d3d51',
    aguaAlt:    '#274d63',
    aguaOsc:    '#152c3c',
    espuma:     '#5f93ad',
    rayado:     '#FFC627',
    rayadoPiso: '#9c7d1c',
    rayadoOsc:  '#272d34',
    charco:     '#27333c',
    charcoAlt:  '#35454f',
    rejilla:    'rgba(255, 255, 255, 0.05)',
    sombra:     'rgba(0, 0, 0, 0.34)'
  };

  const M = {
    k:  '#0b0f14', y:  '#f0b91d', yA: '#ffd451', yO: '#b0840d',
    n:  '#39424c', nA: '#525d69', w:  '#bfe4f7', wA: '#e6f6ff',
    g:  '#6f7883', gA: '#949daa', gO: '#464e58',
    t:  '#15181c', tL: '#2b3138', h:  '#8d949c', hO: '#5c636b',
    r:  '#ff5a3c', rA: '#ffd0c4', a:  '#ffab2e', faro: '#fff3cf'
  };

  const COLORES_CAJA = {
    rojo:    { nombre: 'ROJO',    base: '#a8483d', alto: '#c96054', bajo: '#7a3129' },
    azul:    { nombre: 'AZUL',    base: '#2f6a9e', alto: '#4287c1', bajo: '#204a70' },
    verde:   { nombre: 'VERDE',   base: '#3d7a5f', alto: '#519a78', bajo: '#2a5843' },
    gris:    { nombre: 'GRIS',    base: '#7b838c', alto: '#99a1aa', bajo: '#575e66' },
    aqua:    { nombre: 'AQUA',    base: '#3d8f92', alto: '#4fb0b3', bajo: '#2a6669' },
    naranja: { nombre: 'NARANJA', base: '#b96a26', alto: '#d98736', bajo: '#8a4d18' },
    morado:  { nombre: 'MORADO',  base: '#6b4a86', alto: '#8763a4', bajo: '#4d3462' }
  };

  // ---------- primitivas de pixel ----------
  const rc = (g, x, y, w, h, c) => { g.fillStyle = c; g.fillRect(x | 0, y | 0, w | 0, h | 0); };

  const caja = (g, x, y, w, h, relleno, alto) => {
    rc(g, x, y, w, h, M.k);
    rc(g, x + 1, y + 1, w - 2, h - 2, relleno);
    if (alto) rc(g, x + 1, y + 1, w - 2, 2, alto);
  };

  const disco = (g, cx, cy, r, c) => {
    g.fillStyle = c;
    for (let dy = -r; dy <= r; dy++) {
      const w = Math.floor(Math.sqrt(r * r - dy * dy));
      g.fillRect(cx - w, cy + dy, 2 * w + 1, 1);
    }
  };

  // Segmento grueso entre dos puntos, en cualquier direccion. Recorre
  // el eje dominante y pinta perpendicular; hacerlo siempre por
  // columnas verticales deja una raya de un pixel en los trayectos
  // verticales, que es justo lo que hace falta aqui para el boom.
  const tubo = (g, x0, y0, x1, y1, grosor, relleno, alto) => {
    const dx = x1 - x0, dy = y1 - y0;
    const n = Math.max(Math.abs(dx), Math.abs(dy), 1);
    const vert = Math.abs(dy) >= Math.abs(dx);
    const m = Math.floor(grosor / 2);
    for (let i = 0; i <= n; i++) {
      const x = Math.round(x0 + dx * i / n);
      const y = Math.round(y0 + dy * i / n);
      if (vert) {
        rc(g, x - m - 1, y, grosor + 2, 1, M.k);
        rc(g, x - m, y, grosor, 1, relleno);
        if (alto) rc(g, x - m, y, 2, 1, alto);
      } else {
        rc(g, x, y - m - 1, 1, grosor + 2, M.k);
        rc(g, x, y - m, 1, grosor, relleno);
        if (alto) rc(g, x, y - m, 1, 2, alto);
      }
    }
  };

  const rueda = (g, cx, cy, r, lejana) => {
    if (lejana) { disco(g, cx, cy, r, M.k); disco(g, cx, cy, r - 1, M.tL); return; }
    disco(g, cx, cy, r, M.k);
    disco(g, cx, cy, r - 1, M.t);
    disco(g, cx, cy, Math.max(2, r - 4), M.k);
    disco(g, cx, cy, Math.max(1, r - 5), M.h);
    rc(g, cx - 1, cy - 1, 2, 2, M.hO);
    for (let dy = -r + 2; dy <= r - 2; dy += 3) {
      const w = Math.floor(Math.sqrt((r - 1) * (r - 1) - dy * dy));
      rc(g, cx - w, cy + dy, 2, 1, M.tL);
      rc(g, cx + w - 1, cy + dy, 2, 1, M.tL);
    }
  };

  const llanta = (g, x, y, w, h) => {
    rc(g, x + 1, y, w - 2, h, M.k);
    rc(g, x, y + 2, w, h - 4, M.k);
    rc(g, x + 2, y + 1, w - 4, h - 2, M.t);
    rc(g, x + 1, y + 3, w - 2, h - 6, M.t);
    for (let i = 4; i < h - 4; i += 3) rc(g, x + 2, y + i, w - 4, 1, M.tL);
    rc(g, x + 3, y + Math.round(h / 2) - 2, w - 6, 4, M.hO);
  };

  // ---------- el cuerpo de la maquina, rumbo por rumbo ----------
  const MAQ_W = 76, MAQ_H = 60;
  const ANCLA = { x: 36, y: 51 };

  const maquinaPerfil = (g) => {
    rc(g, 6, 49, 43, 3, COL.sombra);
    rueda(g, 35, 39, 9, true); rueda(g, 17, 41, 7, true);
    disco(g, 13, 19, 7, M.k); disco(g, 13, 19, 6, M.g); disco(g, 13, 19, 2, M.gO);
    caja(g, 5, 29, 42, 15, M.y, M.yA);                   // chasis
    rc(g, 6, 36, 40, 1, M.yO);
    for (let i = 0; i < 6; i++) rc(g, 9 + i * 6, 40, 3, 1, M.yO);
    caja(g, 2, 19, 15, 14, M.y, M.yA);                   // contrapeso con rejilla
    for (let i = 0; i < 5; i++) rc(g, 4, 22 + i * 2, 11, 1, M.n);
    caja(g, 16, 22, 11, 11, M.y, M.yA);                  // capo del motor
    for (let i = 0; i < 4; i++) rc(g, 18 + i * 2, 25, 1, 6, M.n);
    rc(g, 24, 13, 2, 10, M.n); rc(g, 24, 12, 2, 1, M.k); // tubo de escape
    caja(g, 27, 15, 16, 18, M.y, M.yA);                  // cabina, marco grueso
    caja(g, 29, 17, 12, 11, M.w, M.wA);
    rc(g, 35, 17, 1, 11, M.k); rc(g, 29, 22, 12, 1, M.k);
    rc(g, 28, 29, 14, 1, M.yO);
    rc(g, 32, 14, 5, 2, M.n);                            // pie de la baliza
    rc(g, 25, 35, 4, 1, M.n); rc(g, 25, 38, 4, 1, M.n);  // escalerilla
    rueda(g, 34, 40, 10, false); rueda(g, 16, 42, 8, false);
    disco(g, 46, 34, 2, M.r);                            // faro redondo
  };

  // De frente y de espaldas la maquina va SIMETRICA y centrada, y
  // mide 28 px: un poco MAS que su casilla de 24, porque tiene que
  // verse mas grande que la carga. Lo que evita que se monte con los
  // vecinos no es encogerla, es que el contenedor solo ocupa 18 px
  // de su casilla (CAJA_W). Los faros van POR ENCIMA de las ruedas.
  const maquinaFrente = (g) => {
    rc(g, 23, 48, 26, 4, COL.sombra);
    rc(g, 34, 6, 5, 2, M.n);                             // pie de la baliza
    caja(g, 27, 8, 18, 19, M.y, M.yA);                   // cabina, al centro
    caja(g, 29, 10, 14, 11, M.w, M.wA);
    rc(g, 36, 10, 1, 11, M.k);                           // montante central
    rc(g, 29, 22, 14, 1, M.yO);
    rc(g, 24, 14, 3, 10, M.n); rc(g, 24, 13, 3, 1, M.k); // tubo de escape
    caja(g, 25, 25, 22, 9, M.y, M.yA);                   // capo con rejilla
    for (let i = 0; i < 3; i++) rc(g, 27 + i * 3, 28, 2, 4, M.n);
    for (let i = 0; i < 3; i++) rc(g, 38 + i * 3, 28, 2, 4, M.n);
    caja(g, 24, 32, 24, 16, M.y, M.yA);                  // frente del chasis
    rc(g, 25, 40, 22, 1, M.yO);
    caja(g, 24, 34, 7, 5, M.faro, '#fffdf2');            // faros, sobre la rueda
    caja(g, 41, 34, 7, 5, M.faro, '#fffdf2');
    llanta(g, 22, 39, 8, 14); llanta(g, 42, 39, 8, 14);
  };

  const maquinaEspalda = (g) => {
    rc(g, 23, 48, 26, 4, COL.sombra);
    rc(g, 34, 13, 5, 2, M.n);                            // pie de la baliza
    caja(g, 27, 15, 18, 19, M.y, M.yA);                  // cabina, al centro
    caja(g, 29, 17, 14, 11, M.w, M.wA);
    rc(g, 36, 17, 1, 11, M.k);                           // montante central
    rc(g, 29, 29, 14, 1, M.yO);
    rc(g, 45, 20, 3, 10, M.n); rc(g, 45, 19, 3, 1, M.k); // tubo de escape
    caja(g, 25, 30, 22, 9, M.y, M.yA);                   // cubierta del motor
    for (let i = 0; i < 3; i++) rc(g, 27 + i * 3, 33, 2, 4, M.n);
    for (let i = 0; i < 3; i++) rc(g, 38 + i * 3, 33, 2, 4, M.n);
    caja(g, 24, 35, 24, 16, M.y, M.yA);                  // contrapeso, de cola
    for (let i = 0; i < 3; i++) rc(g, 27, 43 + i * 2, 18, 1, M.n);
    caja(g, 24, 36, 7, 5, M.r, M.rA);                    // luces traseras
    caja(g, 41, 36, 7, 5, M.r, M.rA);
    llanta(g, 22, 41, 8, 13); llanta(g, 42, 41, 8, 13);
  };

  // Donde va la baliza, donde el escape y de donde nace el boom
  const LUCES = [
    { baliza: [35, 8],  escape: [46, 18], pivote: [36, 32] },  // N, de espaldas
    { baliza: [33, 9],  escape: [24, 10], pivote: [13, 19] },  // E, de perfil
    { baliza: [35, 1],  escape: [25, 12], pivote: [36, 10] },  // S, de frente
    { baliza: [40, 9],  escape: [50, 10], pivote: [63, 19] }   // O, perfil espejado
  ];

  // ---------- objetos del patio, tambien en 3/4 ----------
  const CAJA_W = 18;
  const CAJA_OFF = Math.round((TILE - CAJA_W) / 2);
  const ALTO_CAJA = 20;
  const ALTO_NIVEL = 14;           // lo que sube en pantalla cada nivel de pila

  // Una caja abollada pierde saturacion y se le marcan los golpes.
  const tonoDanado = (hex, k) => {
    const n = parseInt(hex.slice(1), 16);
    const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
    const gris = (r * 0.4 + g * 0.45 + b * 0.15);
    const m = (v) => Math.round(v + (gris - v) * k * 0.75) | 0;
    return 'rgb(' + m(r) + ',' + m(g) + ',' + m(b) + ')';
  };

  const dibujarContenedor = (g, x0, base, cj, marcada) => {
    const c = COLORES_CAJA[cj.color];
    const d = 1 - Math.max(0, Math.min(1, cj.integridad / 100));
    const base1 = tonoDanado(c.base, d);
    const alto1 = tonoDanado(c.alto, d);
    const bajo1 = tonoDanado(c.bajo, d);
    const x = x0 + CAJA_OFF;
    const y = base - ALTO_CAJA;
    rc(g, x + 1, base - 2, CAJA_W - 2, 3, COL.sombra);
    caja(g, x, y, CAJA_W, 8, alto1, null);               // cara superior
    caja(g, x, y + 7, CAJA_W, 14, base1, null);          // cara frontal
    for (let i = 2; i < CAJA_W - 2; i += 3) rc(g, x + i, y + 9, 1, 10, bajo1);
    rc(g, x + 1, y + 8, CAJA_W - 2, 1, alto1);
    rc(g, x + 1, y + 1, 3, 6, bajo1); rc(g, x + CAJA_W - 4, y + 1, 3, 6, bajo1);
    rc(g, x + 1, y + 17, 3, 3, bajo1); rc(g, x + CAJA_W - 4, y + 17, 3, 3, bajo1);

    // el tipo se lee de un vistazo por su marca, no por el color
    if (cj.tipo === 'reefer') {
      rc(g, x + 3, y + 11, CAJA_W - 6, 6, '#dfe8ee');    // panel de la maquina
      for (let i = 0; i < 4; i++) rc(g, x + 5 + i * 2, y + 12, 1, 4, '#6d7a84');
      rc(g, x + CAJA_W - 6, y + 12, 2, 2, '#5ad0ff');    // piloto de frio
    } else if (cj.tipo === 'imo') {
      // rombo de mercancia peligrosa
      for (let i = 0; i < 5; i++) {
        rc(g, x + 8 - i, y + 11 + i, 1 + i * 2, 1, '#ffd23d');
        rc(g, x + 8 - (4 - i), y + 16 + i, 1 + (4 - i) * 2, 1, '#ffd23d');
      }
      rc(g, x + 8, y + 14, 2, 2, M.k);
    } else if (cj.tipo === 'pesado') {
      for (let py = 0; py < 5; py++) {
        for (let px = 0; px < CAJA_W - 6; px++) {
          if (((px + py) % 6) < 3) rc(g, x + 3 + px, y + 12 + py, 1, 1, '#ffd23d');
        }
      }
    }

    // abolladuras: mas golpes, mas marcas, siempre en el mismo sitio
    const marcas = Math.floor(d * 7);
    for (let i = 0; i < marcas; i++) {
      const mx = 2 + ((i * 7 + 3) % (CAJA_W - 5));
      const my = 10 + ((i * 5 + 2) % 9);
      rc(g, x + mx, y + my, 2, 2, M.k);
      rc(g, x + mx + 1, y + my - 1, 1, 1, bajo1);
    }

    // la caja que pide la orden en curso lleva galon parpadeante
    if (marcada) {
      rc(g, x - 1, y - 1, CAJA_W + 2, 1, COL.rayado);
      rc(g, x - 1, base, CAJA_W + 2, 1, COL.rayado);
      rc(g, x - 1, y - 1, 1, ALTO_CAJA + 2, COL.rayado);
      rc(g, x + CAJA_W, y - 1, 1, ALTO_CAJA + 2, COL.rayado);
    }
  };

  const dibujarCono = (g, x, base) => {
    rc(g, x + 7, base - 2, 10, 3, COL.sombra);
    rc(g, x + 11, base - 15, 2, 3, '#ff7a3c');
    rc(g, x + 10, base - 12, 4, 3, '#f2f5f8');
    rc(g, x + 9, base - 9, 6, 3, '#ff7a3c');
    rc(g, x + 8, base - 6, 8, 3, '#ff7a3c');
    rc(g, x + 6, base - 3, 12, 3, '#23282e');
    rc(g, x + 6, base, 12, 1, M.k);
  };

  const dibujarPoste = (g, x, base) => {
    rc(g, x + 9, base - 2, 7, 3, COL.sombra);
    caja(g, x + 10, base - 34, 4, 6, '#ffe08a', '#fff6d8');   // luminaria
    rc(g, x + 11, base - 28, 2, 25, '#5a636d');               // mastil
    rc(g, x + 11, base - 28, 1, 25, M.k);
    caja(g, x + 8, base - 5, 8, 5, '#2b323a', '#3f4750');     // base
  };

  const dibujarCaseta = (g, x, base, vecinos) => {
    const y = base - 30;
    rc(g, x + 1, base - 2, TILE - 2, 3, COL.sombra);
    rc(g, x, y, TILE, 10, '#5b6570');
    rc(g, x, y, TILE, 2, '#78848f');
    rc(g, x, y + 10, TILE, 22, '#c6ced6');
    rc(g, x, y + 10, TILE, 1, '#e2e8ee');
    if (!vecinos.izq) rc(g, x, y, 1, 32, '#7c848d');
    if (!vecinos.der) rc(g, x + TILE - 1, y, 1, 32, '#7c848d');
    rc(g, x, y + 31, TILE, 1, M.k);
    caja(g, x + 4, y + 15, 7, 8, '#3d5a6b', '#527588');
    caja(g, x + 14, y + 15, 7, 8, '#3d5a6b', '#527588');
  };

  // ---------- lo nautico ----------
  const dibujarBolardo = (g, x, base) => {
    rc(g, x + 8, base - 2, 9, 3, COL.sombra);
    caja(g, x + 9, base - 11, 7, 5, '#4a525c', '#69737e');    // cabeza
    caja(g, x + 10, base - 7, 5, 6, '#39424c', '#525d69');    // fuste
    caja(g, x + 7, base - 2, 11, 3, '#2b323a', '#414a54');    // base
  };

  const dibujarPataSTS = (g, x, base) => {
    rc(g, x + 4, base - 2, 16, 3, COL.sombra);
    caja(g, x + 5, base - 34, 6, 34, '#5a636d', '#7d8791');
    caja(g, x + 14, base - 34, 6, 34, '#5a636d', '#7d8791');
    for (let i = 4; i < 30; i += 7) rc(g, x + 11, base - 34 + i, 3, 2, '#4a525c');
    caja(g, x + 3, base - 6, 19, 6, '#39424c', '#525d69');    // zapata
    rc(g, x + 6, base - 40, 4, 6, M.a);                        // baliza
  };

  const dibujarTuberia = (g, x, base) => {
    rc(g, x + 2, base - 2, 20, 3, COL.sombra);
    for (let i = 0; i < 3; i++) {
      caja(g, x + 3, base - 6 - i * 5, 18, 5, '#6b7078', '#878d96');
      rc(g, x + 4, base - 5 - i * 5, 2, 3, '#4a4f56');
      rc(g, x + 18, base - 5 - i * 5, 2, 3, '#4a4f56');
    }
  };

  const dibujarNave = (g, x, base, vecinos) => {
    const y = base - 34;
    rc(g, x + 1, base - 2, TILE - 2, 3, COL.sombra);
    rc(g, x, y, TILE, 12, '#3f4a54');                          // techo a dos aguas
    for (let i = 0; i < TILE; i += 4) rc(g, x + i, y, 2, 12, '#485460');
    rc(g, x, y, TILE, 2, '#5c6b78');
    rc(g, x, y + 12, TILE, 24, '#8c949c');                     // muro
    rc(g, x, y + 12, TILE, 1, '#a8b0b8');
    if (!vecinos.izq) rc(g, x, y, 1, 36, '#666e76');
    if (!vecinos.der) rc(g, x + TILE - 1, y, 1, 36, '#666e76');
    rc(g, x, y + 35, TILE, 1, M.k);
    if (!vecinos.izq) { caja(g, x + 4, y + 20, 10, 15, '#2b323a', '#3f4750'); }  // porton
    else { for (let i = 2; i < TILE - 2; i += 5) rc(g, x + i, y + 18, 3, 6, '#5c6570'); }
  };

  // El buque: la fila de arriba es la banda de estribor, que se ve de
  // canto y casi plana; la de abajo es el costado de babor, el que da
  // al muelle, con su linea de flotacion y la obra viva. Dibujar las
  // dos igual dejaba el buque como dos franjas rojas gemelas.
  const dibujarCasco = (g, x, base, vecinos, tipo) => {
    if (tipo === 'lejos') {
      const y = base - 14;
      rc(g, x, y, TILE, 14, '#243440');                        // banda lejana
      rc(g, x, y, TILE, 3, '#3a4e5d');
      rc(g, x, y + 11, TILE, 3, '#1a252e');
      for (let i = 3; i < TILE; i += 7) rc(g, x + i, y + 4, 2, 5, '#1c2a34');
      return;
    }
    const y = base - 22;
    rc(g, x, y, TILE, 9, '#2b3a45');                           // amurada
    rc(g, x, y, TILE, 2, '#43596b');
    for (let i = 2; i < TILE; i += 6) rc(g, x + i, y + 3, 1, 5, '#1f2c35');
    rc(g, x, y + 9, TILE, 3, '#8c3a30');                       // linea de flotacion
    rc(g, x, y + 9, TILE, 1, '#c25c4f');
    rc(g, x, y + 12, TILE, 10, '#6e2a22');                     // obra viva
    for (let i = 0; i < TILE; i += 4) rc(g, x + i, y + 14, 1, 7, '#5c221b');
    rc(g, x, y + 20, TILE, 2, '#3f1712');
    if (!vecinos.izq) rc(g, x, y, 2, 22, '#1a252e');
    if (!vecinos.der) rc(g, x + TILE - 2, y, 2, 22, '#1a252e');
    if (tipo === 'popa') {
      caja(g, x + 3, y - 22, 18, 24, '#c6ced6', '#e2e8ee');    // superestructura
      caja(g, x + 5, y - 17, 6, 5, '#3d5a6b', '#527588');
      caja(g, x + 13, y - 17, 6, 5, '#3d5a6b', '#527588');
      rc(g, x + 5, y - 9, 14, 1, '#8f99a3');
      rc(g, x + 8, y - 32, 7, 12, '#8c3a30');                  // chimenea
      rc(g, x + 8, y - 32, 7, 3, '#2b323a');
      rc(g, x + 17, y - 30, 2, 10, '#8c949c');                 // mastil
    }
  };

  const dibujarCubierta = (g, x, base, i) => {
    const y = base - 30;
    rc(g, x, y, TILE, 30, '#39434d');                          // cubierta
    rc(g, x, y, TILE, 2, '#4d5964');
    // dos contenedores estibados a bordo, con su matricula insinuada
    const paleta = ['azul', 'rojo', 'verde', 'gris'];
    const c1 = COLORES_CAJA[paleta[i % 4]];
    const c2 = COLORES_CAJA[paleta[(i + 2) % 4]];
    caja(g, x + 2, y - 12, TILE - 4, 13, c1.base, c1.alto);
    for (let k = 3; k < TILE - 5; k += 3) rc(g, x + k, y - 9, 1, 8, c1.bajo);
    caja(g, x + 2, y + 1, TILE - 4, 13, c2.base, c2.alto);
    for (let k = 3; k < TILE - 5; k += 3) rc(g, x + k, y + 4, 1, 8, c2.bajo);
  };

  const dibujarValla = (g, x, base) => {
    const y = base - 14;
    rc(g, x, y, TILE, 5, '#525c67');
    rc(g, x, y, TILE, 1, '#6b7580');
    rc(g, x, y + 5, TILE, 10, '#39414a');
    for (let py = 0; py < 8; py++) {
      for (let px = 0; px < TILE; px++) {
        if (((px + py) % 12) < 6) rc(g, x + px, y + 6 + py, 1, 1, COL.rayado);
      }
    }
    rc(g, x, y + 14, TILE, 1, '#1d2228');
  };

  // ---------- horneado ----------
  const lienzo = (w, h) => {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    const g = c.getContext('2d');
    g.imageSmoothingEnabled = false;
    return { c, g };
  };

  const cocer = (w, h, pintar) => {
    const l = lienzo(w, h);
    pintar(l.g);
    return l.c;
  };

  const espejar = (src) => {
    const l = lienzo(src.width, src.height);
    l.g.translate(src.width, 0);
    l.g.scale(-1, 1);
    l.g.drawImage(src, 0, 0);
    return l.c;
  };

  const SPR = {};
  const cocerTodo = () => {
    const perfil = cocer(MAQ_W, MAQ_H, maquinaPerfil);
    SPR.maquina = [
      cocer(MAQ_W, MAQ_H, maquinaEspalda),
      perfil,
      cocer(MAQ_W, MAQ_H, maquinaFrente),
      espejar(perfil)
    ];
    SPR.cono = cocer(TILE, 18, (g) => dibujarCono(g, 0, 15));
    SPR.poste = cocer(TILE, 38, (g) => dibujarPoste(g, 0, 35));
    SPR.valla = cocer(TILE, 18, (g) => dibujarValla(g, 0, 15));
    SPR.bolardo = cocer(TILE, 14, (g) => dibujarBolardo(g, 0, 11));
    SPR.pata = cocer(TILE, 44, (g) => dibujarPataSTS(g, 0, 41));
    SPR.tuberia = cocer(TILE, 22, (g) => dibujarTuberia(g, 0, 19));
    SPR.caseta = {};
    SPR.nave = {};
    SPR.casco = {};
    [0, 1, 2, 3].forEach((n) => {
      const v = { izq: !!(n & 1), der: !!(n & 2) };
      SPR.caseta[n] = cocer(TILE, 34, (g) => dibujarCaseta(g, 0, 31, v));
      SPR.nave[n] = cocer(TILE, 38, (g) => dibujarNave(g, 0, 35, v));
      SPR.casco['cerca' + n] = cocer(TILE, 24, (g) => dibujarCasco(g, 0, 22, v, 'cerca'));
      SPR.casco['popa' + n] = cocer(TILE, 62, (g) => dibujarCasco(g, 0, 60, v, 'popa'));
      SPR.casco['lejos' + n] = cocer(TILE, 16, (g) => dibujarCasco(g, 0, 14, v, 'lejos'));
    });
    SPR.cubierta = [0, 1, 2, 3].map((i) => cocer(TILE, 34, (g) => dibujarCubierta(g, 0, 31, i)));
  };

  // ---------- DOM ----------
  const $ = (id) => document.getElementById(id);
  const escena = $('escena');
  const canvas = $('patio');
  const ctx = canvas.getContext('2d');
  const toast = $('toast');

  const REDUCIDO = matchMedia('(prefers-reduced-motion: reduce)').matches;

  let toastTimer = 0;
  const decir = (msg, mal) => {
    toast.hidden = false;
    toast.textContent = msg;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { toast.hidden = true; }, 2400);
  };

  // ---------- estado ----------
  const st = {
    turno: 0,
    fase: 'juego',         // 'juego' | 'cierre'
    reloj: 0, resta: 0,
    col: 0, fil: 0, rumbo: RUMBO_INICIAL,
    desdeCol: 0, desdeFil: 0,
    accion: null,
    t: 0, dur: 0,
    giroDesde: RUMBO_INICIAL,
    cmdTope: null,
    alcance: 0, altura: 0,
    alcanceVis: 0, alturaVis: 0,
    carga: null,
    pasos: 0, golpes: 0,
    entregas: 0, puntos: 0,
    tGolpe: 99, sacudida: 0,
    zarandeo: 0, quieto: 99,
    patina: 0,             // lo que queda de derrape con lluvia
    cierra: 0,             // cuenta atras para el cierre tras la ultima entrega
    cam: { x: 0, y: 0, c0: 0, c1: 0, f0: 0, f1: 0 },
    trafico: [],
    humo: [], gotas: [],
    buffer: null
  };

  const CMDS = ['avanzar', 'reversa', 'izq', 'der'];
  const activos = { avanzar: false, reversa: false, izq: false, der: false };

  const turnoActual = () => TURNOS[st.turno];
  const clima = () => turnoActual().clima;

  // ---------- pilas de contenedores ----------
  const pilas = new Map();
  const llave = (c, f) => c + ',' + f;
  const pilaEn = (c, f) => pilas.get(llave(c, f)) || null;
  const alturaPila = (c, f) => { const p = pilaEn(c, f); return p ? p.length : 0; };

  let ordenes = [];

  const sembrarTurno = () => {
    pilas.clear();
    turnoActual().cajas.forEach((c) => {
      const k = llave(c.col, c.fil);
      const p = pilas.get(k) || [];
      p.push({ m: c.m, color: c.color, tipo: c.tipo, integridad: 100 });
      pilas.set(k, p);
    });
    ordenes = turnoActual().ordenes.map((o) => ({ m: o.m, zona: o.zona, hecha: false }));
  };

  const ordenActiva = () => ordenes.find((o) => !o.hecha) || null;

  // Donde esta ahora mismo una matricula: en una pila o en el spreader
  const buscarCaja = (m) => {
    if (st.carga && st.carga.m === m) return { enSpreader: true, caja: st.carga };
    let hallado = null;
    pilas.forEach((p, k) => {
      const i = p.findIndex((c) => c.m === m);
      if (i < 0) return;
      const cf = k.split(',');
      hallado = { col: Number(cf[0]), fil: Number(cf[1]), nivel: i, caja: p[i] };
    });
    return hallado;
  };

  // ---------- consultas del mapa ----------
  const dentro = (c, f) => c >= 0 && c < COLS && f >= 0 && f < FILAS;
  const charEn = (c, f) => (dentro(c, f) ? mapa[f][c] : '#');
  const tileEn = (c, f) => TILES[charEn(c, f)] || TILES['#'];
  const transitable = (c, f) =>
    dentro(c, f) && !tileEn(c, f).solido && alturaPila(c, f) === 0 && !trafficoEn(c, f);

  const objetivo = () => {
    const r = RUMBOS[st.rumbo];
    const d = st.alcance + 1;
    return { col: st.col + r.dc * d, fil: st.fil + r.df * d };
  };

  const describir = (c, f) => {
    if (!dentro(c, f)) return 'FUERA DEL PATIO';
    if (trafficoEn(c, f)) return 'VEHICULO EN MARCHA';
    const p = pilaEn(c, f);
    if (p && p.length) {
      const arr = p[p.length - 1];
      return 'PILA DE ' + p.length + ' ' + PUNTO + ' ' + arr.m;
    }
    return tileEn(c, f).nombre;
  };

  const posTexto = () => {
    const bahia = String(st.col + 1).padStart(2, '0');
    const carril = String.fromCharCode(65 + st.fil);
    return 'BAHIA ' + bahia + ' ' + PUNTO + ' CARRIL ' + carril;
  };

  // Todo lo que levanta del piso es entidad y se ordena por
  // profundidad. Los del mapa no cambian dentro de un turno, asi que
  // se listan al arrancarlo.
  const CON_ALTURA = '#HoPbLpKSd';
  let OBJETOS = [];
  const listarObjetos = () => {
    OBJETOS = [];
    for (let f = 0; f < FILAS; f++) {
      for (let c = 0; c < COLS; c++) {
        const ch = mapa[f][c];
        if (CON_ALTURA.indexOf(ch) >= 0) OBJETOS.push({ col: c, fil: f, ch });
      }
    }
  };

  // ---------- horneado del suelo ----------
  const ruido = (a, b) => {
    const n = Math.sin(a * 127.1 + b * 311.7) * 43758.5453;
    return n - Math.floor(n);
  };

  const pintarAsfalto = (g, px, py, c, f, base, alt, osc) => {
    g.fillStyle = base;
    g.fillRect(px, py, TILE, TILE);
    for (let i = 0; i < 18; i++) {
      const rx = Math.floor(ruido(c * 31.7 + i * 2.3, f * 17.1) * TILE);
      const ry = Math.floor(ruido(f * 13.3 + i * 3.7, c * 41.9) * TILE);
      const v = ruido(c + i * 7.1, f + i * 3.3);
      g.fillStyle = v > 0.5 ? alt : osc;
      g.fillRect(px + rx, py + ry, v > 0.88 ? 2 : 1, 1);
    }
  };

  const pintarRayado = (g, px, py, c, f) => {
    pintarAsfalto(g, px, py, c, f, COL.rayadoOsc, COL.asfaltoAlt, COL.asfaltoOsc);
    g.fillStyle = COL.rayadoPiso;
    for (let y = 0; y < TILE; y++) {
      for (let x = 0; x < TILE; x++) {
        if (((x + y + c * TILE) % 8) < 4) g.fillRect(px + x, py + y, 1, 1);
      }
    }
  };

  // La darsena: agua profunda con reflejo y crestas. Se hornea, asi
  // que el oleaje que se mueve va aparte en dibujarOleaje.
  const pintarAgua = (g, px, py, c, f) => {
    // bandas anchas y suaves: rayar linea a linea dejaba el agua como
    // estatica de television
    for (let y = 0; y < TILE; y += 2) {
      const v = ruido(c * 2.3 + y * 0.31, f * 4.7);
      g.fillStyle = v > 0.62 ? COL.aguaAlt : (v > 0.28 ? COL.agua : COL.aguaOsc);
      g.fillRect(px, py + y, TILE, 2);
    }
    for (let i = 0; i < 2; i++) {
      const rx = Math.floor(ruido(c * 17.7 + i, f * 23.1) * (TILE - 8));
      const ry = Math.floor(ruido(f * 13.9 + i, c * 31.3) * TILE);
      rc(g, px + rx, py + ry, 5 + i * 2, 1, COL.espuma);
    }
  };

  // El cantil: el canto de hormigon donde muere el muelle, con su
  // defensa de caucho colgando sobre el agua.
  const pintarCantil = (g, px, py, c, f) => {
    pintarAgua(g, px, py, c, f);
    rc(g, px, py + 6, TILE, TILE - 6, '#8f9aa4');
    rc(g, px, py + 6, TILE, 2, '#b3bcc4');
    rc(g, px, py + 4, TILE, 2, '#5c6570');
    for (let x = 2; x < TILE; x += 8) rc(g, px + x, py + 10, 5, 4, '#2b323a');
    rc(g, px, py + TILE - 2, TILE, 2, '#6d7783');
  };

  const pintarRiel = (g, px, py, c, f) => {
    pintarAsfalto(g, px, py, c, f, '#3b3a36', '#47453f', '#2b2a27');
    for (let x = 0; x < TILE; x += 6) rc(g, px + x, py + 5, 4, 14, '#5a5348');  // traviesas
    rc(g, px, py + 7, TILE, 2, '#9aa3ab');                                       // rieles
    rc(g, px, py + 15, TILE, 2, '#9aa3ab');
    rc(g, px, py + 7, TILE, 1, '#c3ccd4');
    rc(g, px, py + 15, TILE, 1, '#c3ccd4');
  };

  const pintarVia = (g, px, py, c, f) => {
    pintarAsfalto(g, px, py, c, f, COL.via, COL.viaAlt, '#1d2228');
    g.fillStyle = COL.pintura;
    if (charEn(c, f - 1) !== 'T') g.fillRect(px, py + 1, TILE, 1);
    if (charEn(c, f + 1) !== 'T') g.fillRect(px, py + TILE - 2, TILE, 1);
    if (charEn(c, f + 1) === 'T') {
      for (let x = 0; x < TILE; x++) {
        if ((x + c * TILE) % 10 < 5) g.fillRect(px + x, py + TILE - 1, 1, 1);
      }
    }
  };

  // Cada zona lleva su color y su marca de piso, para reconocerla sin
  // leer el panel: escuadras de cajon en el patio, tomas en la linea
  // de reefers, rayas de embarque en el pie de grua, y asi.
  const PINTA_ZONA = {
    A: COL.zonaA, B: COL.zonaB, E: COL.zonaE, M: COL.zonaM,
    V: COL.zonaV, I: COL.zonaI, G: COL.zonaG, W: COL.zonaW
  };

  const pintarSlot = (g, px, py, c, f, zona) => {
    pintarAsfalto(g, px, py, c, f, COL.asfalto, COL.asfaltoAlt, COL.asfaltoOsc);
    const tono = PINTA_ZONA[zona];

    // El pie de grua es una franja larguisima pegada al cantil, no un
    // cajon: marcarle escuadras a cada casilla llenaba la pantalla de
    // ruido naranja. Lleva dos lineas continuas de embarque y punto.
    if (zona === 'M') {
      rc(g, px, py + 5, TILE, 2, tono);
      rc(g, px, py + TILE - 7, TILE, 2, tono);
      if (c % 4 === 0) {
        rc(g, px + 9, py + 9, 6, 6, 'rgba(0,0,0,0.3)');
        rc(g, px + 10, py + 10, 4, 4, tono);
      }
      return;
    }

    g.fillStyle = tono;
    const L = 7, m = 2;
    const x0 = px + m, x1 = px + TILE - m - 1;
    const y0 = py + m, y1 = py + TILE - m - 1;
    g.fillRect(x0, y0, L, 1);          g.fillRect(x0, y0, 1, L);
    g.fillRect(x1 - L + 1, y0, L, 1);  g.fillRect(x1, y0, 1, L);
    g.fillRect(x0, y1, L, 1);          g.fillRect(x0, y1 - L + 1, 1, L);
    g.fillRect(x1 - L + 1, y1, L, 1);  g.fillRect(x1, y1 - L + 1, 1, L);

    if (zona === 'E') {                       // caja de conexion del reefer
      rc(g, px + 10, py + 10, 4, 5, '#2b323a');
      rc(g, px + 11, py + 11, 2, 2, '#ffd23d');
    } else if (zona === 'I') {                // rombo de peligrosos
      for (let i = 0; i < 4; i++) {
        rc(g, px + 11 - i, py + 8 + i, 1 + i * 2, 1, tono);
        rc(g, px + 11 - (3 - i), py + 12 + i, 1 + (3 - i) * 2, 1, tono);
      }
    } else if (zona === 'V') {                // aspa de vacios
      for (let i = 0; i < 8; i++) {
        rc(g, px + 8 + i, py + 8 + i, 1, 1, tono);
        rc(g, px + 15 - i, py + 8 + i, 1, 1, tono);
      }
    } else if (zona === 'W') {                // plataforma de la bascula
      rc(g, px + 3, py + 8, TILE - 6, 1, tono);
      rc(g, px + 3, py + 15, TILE - 6, 1, tono);
      rc(g, px + 3, py + 8, 1, 8, tono);
      rc(g, px + TILE - 4, py + 8, 1, 8, tono);
    } else if (zona === 'G') {                // damero del gate
      for (let x = 0; x < TILE; x += 4) {
        rc(g, px + x, py + 9, 2, 2, tono);
        rc(g, px + x + 2, py + 13, 2, 2, tono);
      }
    }
  };

  let suelo = null;
  const hornearSuelo = () => {
    const l = lienzo(MUNDO_W, MUNDO_H);
    const g = l.g;
    for (let f = 0; f < FILAS; f++) {
      for (let c = 0; c < COLS; c++) {
        const px = c * TILE, py = f * TILE;
        const ch = mapa[f][c];
        const t = TILES[ch];
        if (ch === 'T') pintarVia(g, px, py, c, f);
        else if (ch === 'r') pintarRiel(g, px, py, c, f);
        else if (ch === '=') pintarRayado(g, px, py, c, f);
        else if (ch === '~') pintarAgua(g, px, py, c, f);
        else if (ch === 'q' || ch === 'b') pintarCantil(g, px, py, c, f);
        else if (ch === 'S' || ch === 'd') pintarAgua(g, px, py, c, f);
        else if (t && t.zona) pintarSlot(g, px, py, c, f, t.zona);
        else pintarAsfalto(g, px, py, c, f, COL.asfalto, COL.asfaltoAlt, COL.asfaltoOsc);
      }
    }
    // la rejilla solo sobre tierra: en el agua no hay casillas que ver
    g.fillStyle = COL.rejilla;
    for (let f = 0; f < FILAS; f++) {
      for (let c = 0; c < COLS; c++) {
        if ('~Sdqb'.indexOf(mapa[f][c]) >= 0) continue;
        g.fillRect(c * TILE, f * TILE, 1, TILE);
        g.fillRect(c * TILE, f * TILE, TILE, 1);
      }
    }
    suelo = l.c;
  };

  // ---------- render ----------
  const suave = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);

  const apoyoMaquina = () => {
    let fc = st.col, ff = st.fil;
    if (st.accion === 'avanzar' || st.accion === 'reversa') {
      const e = suave(st.t / st.dur);
      fc = st.desdeCol + (st.col - st.desdeCol) * e;
      ff = st.desdeFil + (st.fil - st.desdeFil) * e;
    }
    let cx = fc * TILE + TILE / 2;
    let cy = ff * TILE + TILE - 2;
    if (st.accion === 'tope') {
      const r = RUMBOS[st.rumbo];
      const s = st.cmdTope === 'reversa' ? -1 : 1;
      const p = Math.sin((st.t / st.dur) * Math.PI) * (REDUCIDO ? 1 : 4);
      cx += r.dc * p * s;
      cy += r.df * p * s;
    }
    return { cx, cy };
  };

  const rumboVisible = () => {
    if (st.accion === 'giro' && st.t / st.dur < 0.5) return st.giroDesde;
    return st.rumbo;
  };

  // ---------- camara ----------
  // Persigue a la maquina con amortiguacion y se frena en los bordes
  // del mundo, para no ensenar el vacio de fuera del mapa.
  const camaraObjetivo = () => {
    const a = apoyoMaquina();
    return {
      x: Math.max(0, Math.min(Math.max(0, MUNDO_W - VISTA_W), a.cx - VISTA_W / 2)),
      y: Math.max(0, Math.min(Math.max(0, MUNDO_H - VISTA_H), a.cy - VISTA_H / 2 - 8))
    };
  };

  const recortarVista = () => {
    st.cam.c0 = Math.floor(st.cam.x / TILE);
    st.cam.c1 = Math.ceil((st.cam.x + VISTA_W) / TILE);
    st.cam.f0 = Math.floor(st.cam.y / TILE);
    st.cam.f1 = Math.ceil((st.cam.y + VISTA_H) / TILE);
  };

  const seguirCamara = (dt) => {
    const o = camaraObjetivo();
    const k = Math.min(1, dt * CAM_MUELLE);
    st.cam.x += (o.x - st.cam.x) * k;
    st.cam.y += (o.y - st.cam.y) * k;
    recortarVista();
  };

  const plantarCamara = () => {
    const o = camaraObjetivo();
    st.cam.x = o.x;
    st.cam.y = o.y;
    recortarVista();
  };

  const dibujarMaquina = (g) => {
    const a = apoyoMaquina();
    const rumbo = rumboVisible();
    const spr = SPR.maquina[rumbo];
    const x = Math.round(a.cx - ANCLA.x);
    const y = Math.round(a.cy - ANCLA.y);
    g.drawImage(spr, x, y);

    const b = LUCES[rumbo].baliza;
    const giro = (st.reloj * 2.4) % 1;
    const brillo = REDUCIDO ? 0.8 : 0.45 + Math.abs(Math.sin(giro * Math.PI)) * 0.55;
    g.globalAlpha = brillo;
    g.fillStyle = M.a;
    g.fillRect(x + b[0], y + b[1], 3, 5);
    g.globalAlpha = brillo * 0.45;
    g.fillRect(x + b[0] - 2, y + b[1] + 1, 7, 3);
    g.fillRect(x + b[0] - 1, y + b[1] - 1, 5, 7);
    g.globalAlpha = 1;
  };

  const puntaBrazo = () => {
    const a = apoyoMaquina();
    const r = RUMBOS[rumboVisible()];
    const d = (st.alcanceVis + 1) * TILE;
    return {
      x: a.cx + r.dc * d,
      y: a.cy + r.df * d - st.alturaVis * ALTO_NIVEL - ALTO_CAJA
    };
  };

  // Boom que se aleja del ojo: estrecha con la distancia. Hace falta
  // para norte y sur, donde el brazo apunta hacia dentro de la
  // pantalla; ahi un tubo de grosor constante queda como una columna
  // gris que tapa media maquina.
  const boomEscorzado = (g, xc, yc, xl, yl, wc, wl) => {
    const n = Math.max(Math.abs(xl - xc), Math.abs(yl - yc), 1);
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      const x = Math.round(xc + (xl - xc) * t);
      const y = Math.round(yc + (yl - yc) * t);
      const w = Math.max(2, Math.round(wc + (wl - wc) * t));
      const px = x - Math.floor(w / 2);
      rc(g, px - 1, y, w + 2, 1, M.k);
      rc(g, px, y, w, 1, (i % 9 === 4) ? M.gO : M.g);
      rc(g, px, y, 2, 1, M.gA);
    }
  };

  const pivoteBrazo = () => {
    const a = apoyoMaquina();
    const piv = LUCES[rumboVisible()].pivote;
    return {
      x: Math.round(a.cx - ANCLA.x + piv[0]),
      y: Math.round(a.cy - ANCLA.y + piv[1])
    };
  };

  const dibujarBoom = (g) => {
    const v = pivoteBrazo();
    const p = puntaBrazo();
    const sx = Math.round(p.x), sy = Math.round(p.y) - 4;

    if (RUMBOS[rumboVisible()].dc === 0) {
      if (v.y > sy) boomEscorzado(g, v.x, v.y, sx, sy, 7, 4);
      else boomEscorzado(g, sx, sy, v.x, v.y, 7, 4);
      return;
    }
    const mx = Math.round(v.x + (sx - v.x) * 0.55);
    const my = Math.round(v.y + (sy - v.y) * 0.55);
    tubo(g, v.x, v.y, mx, my, 8, M.g, M.gA);
    tubo(g, mx, my, sx, sy, 6, M.g, M.gA);
    disco(g, v.x, v.y, 4, M.k); disco(g, v.x, v.y, 3, M.gO);
  };

  const dibujarSpreader = (g) => {
    const p = puntaBrazo();
    const sy = Math.round(p.y);
    if (st.carga) {
      dibujarContenedor(g, Math.round(p.x - TILE / 2), Math.round(p.y + ALTO_CAJA), st.carga, false);
    }
    const ancho = CAJA_W + 4;
    const x = Math.round(p.x - ancho / 2);
    caja(g, x, sy - 6, ancho, 7, M.n, M.nA);
    rc(g, x + 2, sy + 1, 3, 3, M.n);
    rc(g, x + ancho - 5, sy + 1, 3, 3, M.n);
  };

  const dibujarHumo = (g) => {
    st.humo.forEach((p) => {
      const v = p.vida / p.total;
      g.globalAlpha = v * 0.5;
      g.fillStyle = v > 0.6 ? '#8d949c' : '#5c636b';
      const r = Math.round(1 + (1 - v) * 3);
      g.fillRect(Math.round(p.x - r), Math.round(p.y - r), r * 2, r * 2);
    });
    g.globalAlpha = 1;
  };

  const dibujarFaros = (g) => {
    const r = RUMBOS[st.rumbo];
    const c = st.col + r.dc, f = st.fil + r.df;
    if (!dentro(c, f)) return;
    const fuerte = st.accion === 'avanzar';
    const noche = clima() === 'noche';
    g.globalAlpha = noche ? 0.3 : (fuerte ? 0.18 : 0.1);
    g.fillStyle = M.faro;
    g.fillRect(c * TILE + 4, f * TILE + 4, TILE - 8, TILE - 8);
    g.globalAlpha = 1;
  };

  const dibujarReversa = (g) => {
    if (st.accion !== 'reversa') return;
    if (!REDUCIDO && Math.floor(st.t * 9) % 2) return;
    const r = RUMBOS[(st.rumbo + 2) % 4];
    const c = st.col + r.dc, f = st.fil + r.df;
    if (!dentro(c, f)) return;
    g.globalAlpha = 0.22;
    g.fillStyle = M.r;
    g.fillRect(c * TILE, f * TILE, TILE, TILE);
    g.globalAlpha = 1;
  };

  // La casilla a la que apunta el spreader. Aqua listo, ambar aun no.
  const dibujarZona = (g) => {
    const o = objetivo();
    if (!dentro(o.col, o.fil)) return;
    const px = o.col * TILE, py = o.fil * TILE;
    const ok = st.carga ? puedeSoltar() : puedeEnganchar();
    // Un relleno tenue ademas de las escuadras: los cajones del patio
    // ya llevan escuadras pintadas en el suelo y sin el relleno la
    // zona de alcance se confundia con ellas.
    const tono = ok ? '#7bf0b4' : COL.rayado;
    g.globalAlpha = 0.14;
    g.fillStyle = tono;
    g.fillRect(px + 1, py + 1, TILE - 2, TILE - 2);
    g.globalAlpha = REDUCIDO ? 0.9 : 0.78 + Math.sin(st.reloj * 4) * 0.2;
    g.fillStyle = tono;
    const L = 8, G = 2;
    const x0 = px + 1, x1 = px + TILE - 1 - G;
    const y0 = py + 1, y1 = py + TILE - 1 - G;
    g.fillRect(x0, y0, L, G);          g.fillRect(x0, y0, G, L);
    g.fillRect(x1 - L + G, y0, L, G);  g.fillRect(x1, y0, G, L);
    g.fillRect(x0, y1, L, G);          g.fillRect(x0, y1 - L + G, G, L);
    g.fillRect(x1 - L + G, y1, L, G);  g.fillRect(x1, y1 - L + G, G, L);
    g.globalAlpha = 1;
  };

  // Zona de destino de la orden en curso, para no tener que buscarla
  const dibujarDestino = (g) => {
    const o = ordenActiva();
    if (!o) return;
    const pulso = REDUCIDO ? 0.11 : 0.08 + Math.sin(st.reloj * 2.6) * 0.06;
    g.globalAlpha = pulso;
    g.fillStyle = PINTA_ZONA[o.zona] || COL.rayado;
    for (let f = Math.max(0, st.cam.f0); f <= Math.min(FILAS - 1, st.cam.f1); f++) {
      for (let c = Math.max(0, st.cam.c0); c <= Math.min(COLS - 1, st.cam.c1); c++) {
        if ((tileEn(c, f).zona || '') !== o.zona) continue;
        g.fillRect(c * TILE + 1, f * TILE + 1, TILE - 2, TILE - 2);
      }
    }
    g.globalAlpha = 1;
  };

  // El agua viva: crestas que corren sobre la darsena. El fondo esta
  // horneado, esto es solo lo que se mueve.
  const dibujarOleaje = (g) => {
    if (REDUCIDO) return;
    const t = st.reloj;
    for (let f = Math.max(0, st.cam.f0); f <= Math.min(FILAS - 1, st.cam.f1); f++) {
      for (let c = Math.max(0, st.cam.c0); c <= Math.min(COLS - 1, st.cam.c1); c++) {
        if (charEn(c, f) !== '~') continue;
        const px = c * TILE, py = f * TILE;
        for (let i = 0; i < 2; i++) {
          const fase = ruido(c * 5.1 + i * 3.7, f * 7.9);
          const y = Math.floor(((fase + t * 0.05) % 1) * TILE);
          const x = Math.floor(ruido(f * 11.3 + i, c * 4.3) * (TILE - 8));
          g.globalAlpha = 0.16 + fase * 0.14;
          rc(g, px + x, py + y, 6 + (i % 2) * 2, 1, COL.espuma);
        }
      }
    }
    g.globalAlpha = 1;
  };

  // Los modulos contiguos del mismo tipo comparten borde para que se
  // lean como una sola construccion y no como cajas sueltas.
  const vecinos = (o, ch) =>
    (charEn(o.col - 1, o.fil) === ch ? 1 : 0) | (charEn(o.col + 1, o.fil) === ch ? 2 : 0);

  const dibujarObjeto = (g, o) => {
    const x = o.col * TILE, base = o.fil * TILE + TILE - 2;
    switch (o.ch) {
      case '#': g.drawImage(SPR.valla, x, base - 15); break;
      case 'o': g.drawImage(SPR.cono, x, base - 15); break;
      case 'P': g.drawImage(SPR.poste, x, base - 35); break;
      case 'b': g.drawImage(SPR.bolardo, x, base - 11); break;
      case 'L': g.drawImage(SPR.pata, x, base - 41); break;
      case 'p': g.drawImage(SPR.tuberia, x, base - 19); break;
      case 'H': g.drawImage(SPR.caseta[vecinos(o, 'H')], x, base - 31); break;
      case 'K': g.drawImage(SPR.nave[vecinos(o, 'K')], x, base - 35); break;
      case 'd': g.drawImage(SPR.cubierta[o.col % 4], x, base - 31); break;
      case 'S': {
        const arriba = charEn(o.col, o.fil + 1) === 'd' || charEn(o.col, o.fil + 1) === 'S';
        const n = (charEn(o.col - 1, o.fil) === 'S' || charEn(o.col - 1, o.fil) === 'd' ? 1 : 0) |
                  (charEn(o.col + 1, o.fil) === 'S' || charEn(o.col + 1, o.fil) === 'd' ? 2 : 0);
        if (arriba) { g.drawImage(SPR.casco['lejos' + n], x, base - 14); break; }
        // la superestructura va en la popa, el extremo de estribor
        const popa = charEn(o.col + 1, o.fil) !== 'S' && charEn(o.col + 1, o.fil) !== 'd';
        if (popa) g.drawImage(SPR.casco['popa' + n], x, base - 60);
        else g.drawImage(SPR.casco['cerca' + n], x, base - 22);
        break;
      }
    }
  };

  const dibujarPila = (g, c, f, p) => {
    const o = ordenActiva();
    const x = c * TILE, base = f * TILE + TILE - 2;
    const parpadeo = REDUCIDO || Math.floor(st.reloj * 2.4) % 2 === 0;
    for (let i = 0; i < p.length; i++) {
      const marcada = !!o && p[i].m === o.m && parpadeo;
      dibujarContenedor(g, x, base - i * ALTO_NIVEL, p[i], marcada);
    }
  };

  // ---------- trafico ----------
  // La terminal tiene vida propia: camiones por la via, trenes por los
  // rieles y la grua STS trabajando el buque. No son decorado -- su
  // huella ocupa casillas de verdad, no se puede entrar donde estan y
  // si te alcanzan es golpe.
  const VEHICULOS = {
    camion: { largo: 2, alto: 20, nombre: 'CAMION' },
    tren:   { largo: 9, alto: 18, nombre: 'CONVOY' },
    sts:    { largo: 3, alto: 44, nombre: 'GRUA STS' }
  };

  const sembrarTrafico = () => {
    st.trafico = (turnoActual().trafico || []).map((v) => ({
      tipo: v.tipo, fil: v.fil, col: v.col,
      dir: v.dir || 1, v: v.v, cada: v.cada || 8,
      largo: v.largo || VEHICULOS[v.tipo].largo,
      x0: v.x0, ida: v.ida, vuelta: v.vuelta,
      x: v.x0, espera: v.retraso || 0, vivo: !v.retraso, alto: 0
    }));
  };

  // Casillas que ocupa un vehiculo ahora mismo
  const huella = (v) => {
    if (v.tipo === 'sts') return [];   // la STS va por encima, no estorba
    const a = Math.floor(Math.min(v.x, v.x + v.largo - 1));
    const b = Math.ceil(Math.max(v.x, v.x + v.largo - 1));
    return [a, b];
  };

  const trafficoEn = (c, f) => st.trafico.some((v) => {
    if (!v.vivo || v.tipo === 'sts' || v.fil !== f) return false;
    const h = huella(v);
    return c >= h[0] && c <= h[1];
  });

  const moverTrafico = (dt) => {
    st.trafico.forEach((v) => {
      if (v.tipo === 'sts') {
        // la grua recorre el muelle de un extremo al otro, sin fin
        v.x = v.x === undefined ? v.ida : v.x;
        v.x += v.v * v.dir * dt;
        if (v.x > v.vuelta) { v.x = v.vuelta; v.dir = -1; }
        if (v.x < v.ida) { v.x = v.ida; v.dir = 1; }
        v.vivo = true;
        return;
      }
      if (!v.vivo) {
        v.espera -= dt;
        if (v.espera <= 0) { v.vivo = true; v.x = v.x0; }
        return;
      }
      v.x += v.v * v.dir * dt;
      const fuera = v.dir > 0 ? v.x > COLS + 2 : v.x < -v.largo - 2;
      if (fuera) { v.vivo = false; v.espera = v.cada; return; }

      // atropello: si alcanza la casilla de la maquina, golpe serio
      const h = huella(v);
      if (v.fil === st.fil && st.col >= h[0] && st.col <= h[1] && st.tGolpe >= ESPERA_GOLPE) {
        st.golpes += 2;
        st.tGolpe = 0;
        st.sacudida = 0.8;
        st.puntos = Math.max(0, st.puntos - PT_GOLPE * 2);
        if (st.carga) danarCarga(DANO_GOLPE, 'TE LLEVO EL ' + VEHICULOS[v.tipo].nombre);
        else decir('TE LLEVO EL ' + VEHICULOS[v.tipo].nombre + ' ' + PUNTO + ' NO TE PARES EN LA VIA', true);
        // el atropello pasa fuera de una maniobra, asi que hay que
        // refrescar el panel a mano o el marcador se queda colgado
        refrescar();
      }
    });
  };

  const dibujarCamion = (g, x, base, dir) => {
    const w = TILE * 2;
    rc(g, x + 2, base - 2, w - 4, 3, COL.sombra);
    const cab = dir > 0 ? x + w - 15 : x + 2;
    caja(g, x + 2, base - 16, w - 4, 14, '#4a5560', '#5d6a76');   // caja
    for (let i = 3; i < w - 6; i += 4) rc(g, x + 2 + i, base - 13, 1, 8, '#39424c');
    caja(g, cab, base - 20, 13, 18, '#2f6a9e', '#4287c1');        // tractor
    caja(g, cab + 2, base - 18, 9, 6, M.w, M.wA);
    rc(g, x + 5, base - 3, 5, 4, M.t); rc(g, x + w - 10, base - 3, 5, 4, M.t);
    rc(g, dir > 0 ? x + w - 4 : x + 1, base - 10, 3, 3, dir > 0 ? M.faro : M.r);
  };

  const dibujarTren = (g, x, base, largo) => {
    const w = TILE * largo;
    rc(g, x + 2, base - 2, w - 4, 3, COL.sombra);
    // locomotora al frente y una fila de plataformas con cajas
    caja(g, x + 2, base - 20, 26, 18, '#7a2f2f', '#a04141');
    caja(g, x + 6, base - 17, 12, 7, M.w, M.wA);
    for (let i = 30; i < w - 6; i += 26) {
      caja(g, x + i, base - 8, 24, 6, '#39424c', '#525d69');      // plataforma
      const c = COLORES_CAJA[['azul', 'verde', 'gris', 'rojo'][(i / 26) % 4 | 0]];
      caja(g, x + i + 2, base - 22, 20, 15, c.base, c.alto);
      rc(g, x + i + 4, base - 2, 4, 3, M.t);
      rc(g, x + i + 17, base - 2, 4, 3, M.t);
    }
  };

  // La STS cabalga el muelle: patas a los lados, viga arriba y el
  // carro con el spreader colgando sobre el buque.
  const dibujarSTS = (g, v) => {
    const cx = Math.round(v.x * TILE + TILE / 2);
    const base = v.fil * TILE + TILE + 6;
    const alto = 44;
    rc(g, cx - 30, base - 2, 60, 3, COL.sombra);
    rc(g, cx - 26, base - alto, 5, alto, '#5a636d');              // patas
    rc(g, cx + 21, base - alto, 5, alto, '#5a636d');
    rc(g, cx - 26, base - alto, 5, 3, '#7d8791');
    rc(g, cx + 21, base - alto, 5, 3, '#7d8791');
    caja(g, cx - 34, base - alto - 8, 76, 9, '#6f7883', '#949daa'); // viga
    caja(g, cx - 8, base - alto - 6, 16, 7, M.y, M.yA);            // carro
    rc(g, cx - 1, base - alto + 1, 2, 16, '#39424c');              // cables
    caja(g, cx - 11, base - alto + 16, 22, 6, M.n, M.nA);          // spreader
    rc(g, cx - 30, base - 12, 8, 4, M.a);                          // baliza de pata
  };

  const dibujarVehiculo = (g, v) => {
    if (v.tipo === 'sts') { dibujarSTS(g, v); return; }
    const x = Math.round(v.x * TILE);
    const base = v.fil * TILE + TILE - 2;
    if (v.tipo === 'tren') dibujarTren(g, x, base, v.largo);
    else dibujarCamion(g, x, base, v.dir);
  };

  // ---------- clima ----------
  const dibujarLluvia = (g) => {
    if (REDUCIDO || !st.gotas.length) return;
    g.save();
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.globalAlpha = 0.3;
    st.gotas.forEach((p) => rc(g, p.x, p.y, 1, 3, '#9fc6dd'));
    g.globalAlpha = 1;
    g.restore();
  };

  // Niebla y noche recortan lo que se ve: se pinta un velo sobre todo
  // el patio y se le abren huecos donde hay luz.
  //
  // El velo va OSCURO en los dos casos, tambien en la niebla. Con un
  // velo blanco -- que seria lo realista -- sobre un patio de asfalto
  // oscuro el efecto se lee al reves: lo tapado queda mas claro que
  // lo despejado y parece que la maquina esta en una sombra. Lo que
  // hay que comunicar es "de aqui para alla no ves", y eso lo dice
  // mejor un velo oscuro; la niebla se distingue de la noche por el
  // tinte frio, por ser menos densa y por la bruma de encima.
  // El velo se pinta del tamano de la VISTA, no del mundo: con una
  // terminal de 40 x 28 casillas, rehacer el velo entero cada cuadro
  // seria pintar cuatro veces mas de lo que se ve.
  let velo = null;
  const dibujarVelo = (g) => {
    const c = clima();
    if (c !== 'niebla' && c !== 'noche') return;
    if (!velo) velo = lienzo(VISTA_W, VISTA_H);
    const vg = velo.g;
    vg.globalCompositeOperation = 'source-over';
    vg.fillStyle = c === 'noche' ? 'rgba(4, 7, 12, 0.9)' : 'rgba(41, 56, 68, 0.82)';
    vg.clearRect(0, 0, VISTA_W, VISTA_H);
    vg.fillRect(0, 0, VISTA_W, VISTA_H);

    vg.globalCompositeOperation = 'destination-out';
    // borde muy difuminado: un canto duro se lee como un foco de
    // teatro en vez de como el limite de lo que alcanzas a ver
    const hueco = (cx, cy, r) => {
      const grad = vg.createRadialGradient(cx, cy, 0, cx, cy, r);
      grad.addColorStop(0, 'rgba(0,0,0,1)');
      grad.addColorStop(0.35, 'rgba(0,0,0,0.92)');
      grad.addColorStop(0.7, 'rgba(0,0,0,0.45)');
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      vg.fillStyle = grad;
      vg.fillRect(cx - r, cy - r, r * 2, r * 2);
    };

    // los huecos van en coordenadas de pantalla: mundo menos camara
    const cx0 = Math.round(st.cam.x), cy0 = Math.round(st.cam.y);
    const a = apoyoMaquina();
    hueco(a.cx - cx0, a.cy - cy0 - 14, c === 'noche' ? 54 : 74);
    // los faros alargan el cono hacia donde encara la maquina
    const r = RUMBOS[st.rumbo];
    hueco(a.cx - cx0 + r.dc * TILE * 1.7, a.cy - cy0 - 14 + r.df * TILE * 1.7,
          c === 'noche' ? 42 : 50);
    // y los postes de luz y las patas de la STS alumbran su rincon
    OBJETOS.forEach((o) => {
      if (o.ch !== 'P' && o.ch !== 'L') return;
      if (!enVista(o.col, o.fil, 4)) return;
      hueco(o.col * TILE + TILE / 2 - cx0, o.fil * TILE + TILE / 2 - 20 - cy0, 58);
    });

    vg.globalCompositeOperation = 'source-over';
    // se dibuja sin la traslacion de camara, porque ya esta en
    // coordenadas de pantalla
    g.save();
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.drawImage(velo.c, 0, 0);
    if (c === 'niebla') {
      g.globalAlpha = 0.12;
      g.fillStyle = '#b9c8d2';
      g.fillRect(0, 0, VISTA_W, VISTA_H);
      g.globalAlpha = 1;
    }
    g.restore();
  };

  // Lo que se ve ahora mismo, en casillas. Todo lo que quede fuera no
  // se dibuja: con un mundo de 40 x 28 pintar la terminal entera cada
  // cuadro seria tirar la mitad del trabajo.
  const enVista = (c, f, margen) => {
    const m = margen || 2;
    return c >= st.cam.c0 - m && c <= st.cam.c1 + m &&
           f >= st.cam.f0 - m && f <= st.cam.f1 + m;
  };

  const render = () => {
    ctx.imageSmoothingEnabled = false;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, VISTA_W, VISTA_H);

    // la camara se resta con enteros: a medio pixel el pixel art vibra
    let dx = -Math.round(st.cam.x), dy = -Math.round(st.cam.y);
    if (st.sacudida > 0 && !REDUCIDO) {
      const s = st.sacudida;
      dx += Math.round(Math.sin(st.reloj * 90) * s * 12);
      dy += Math.round(Math.cos(st.reloj * 74) * s * 8);
    }
    ctx.translate(dx, dy);

    ctx.drawImage(suelo, 0, 0);
    dibujarOleaje(ctx);
    dibujarDestino(ctx);
    dibujarFaros(ctx);
    dibujarReversa(ctx);

    // Orden por profundidad: lo que apoya mas abajo en pantalla esta
    // mas cerca del ojo y tapa a lo que apoya mas arriba.
    const a = apoyoMaquina();
    const cosas = [];
    OBJETOS.forEach((o) => {
      if (!enVista(o.col, o.fil)) return;
      cosas.push({ y: o.fil * TILE + TILE - 2, pintar: () => dibujarObjeto(ctx, o) });
    });
    pilas.forEach((p, k) => {
      if (!p.length) return;
      const cf = k.split(',');
      const c = Number(cf[0]), f = Number(cf[1]);
      if (!enVista(c, f)) return;
      cosas.push({ y: f * TILE + TILE - 2, pintar: () => dibujarPila(ctx, c, f, p) });
    });
    st.trafico.forEach((v) => {
      if (!v.vivo) return;
      cosas.push({ y: v.fil * TILE + TILE - 2 + 0.1, pintar: () => dibujarVehiculo(ctx, v) });
    });

    // De perfil el boom pasa por ENCIMA del chasis y hay que verlo;
    // de frente y de espaldas apunta hacia dentro de la pantalla y
    // tiene que quedar DETRAS del cuerpo y de la pila a la que va.
    const o = objetivo();
    const yObj = o.fil * TILE + TILE - 2;
    const yBoom = RUMBOS[rumboVisible()].dc === 0
      ? Math.min(a.cy, yObj) - 0.5
      : a.cy + 0.25;
    cosas.push({ y: yBoom, pintar: () => dibujarBoom(ctx) });
    cosas.push({ y: a.cy, pintar: () => dibujarMaquina(ctx) });
    cosas.push({ y: yObj + 0.5, pintar: () => dibujarSpreader(ctx) });
    cosas.sort((p, q) => p.y - q.y);
    cosas.forEach((c) => c.pintar());

    dibujarHumo(ctx);
    dibujarVelo(ctx);
    dibujarLluvia(ctx);
    dibujarZona(ctx);
  };

  // ---------- reglas del brazo ----------
  const alturaMax = () => MAX_ALTURA[st.alcance];

  const puedeEnganchar = () => {
    if (st.carga) return false;
    const o = objetivo();
    if (!dentro(o.col, o.fil)) return false;
    const n = alturaPila(o.col, o.fil);
    return n > 0 && st.altura === n - 1;
  };

  // Reglas de colocacion de la carga especial. Devuelve null si se
  // puede, o el motivo por el que no.
  const vetoColocar = (col, fil, nivel, cj) => {
    if (cj.tipo === 'reefer' && !tileEn(col, fil).toma) {
      return 'EL REEFER VA ENCHUFADO ' + PUNTO + ' LLEVALO A LA LINEA DE TOMAS';
    }
    if (cj.tipo === 'pesado' && nivel > 0) {
      return 'UN OVERWEIGHT SOLO VA AL NIVEL 0';
    }
    if (cj.tipo === 'imo') {
      const vec = [[1, 0], [-1, 0], [0, 1], [0, -1]];
      const choca = vec.some((v) => {
        const p = pilaEn(col + v[0], fil + v[1]);
        return !!p && p.some((x) => x.tipo === 'imo');
      });
      if (choca) return 'DOS IMO NO VAN PEGADOS ' + PUNTO + ' HAY QUE SEGREGARLOS';
    }
    if (nivel > 0) {
      const p = pilaEn(col, fil);
      if (p && p[nivel - 1] && p[nivel - 1].tipo === 'imo') {
        return 'SOBRE UN IMO NO SE APILA NADA';
      }
    }
    return null;
  };

  const puedeSoltar = () => {
    if (!st.carga) return false;
    const o = objetivo();
    if (!dentro(o.col, o.fil)) return false;
    if (tileEn(o.col, o.fil).solido) return false;
    const n = alturaPila(o.col, o.fil);
    if (n >= PILA_MAX || st.altura < n) return false;
    return !vetoColocar(o.col, o.fil, n, st.carga);
  };

  const caidaAlSoltar = () => {
    const o = objetivo();
    return Math.max(0, st.altura - alturaPila(o.col, o.fil));
  };

  const danarCarga = (puntos, motivo) => {
    if (!st.carga) return;
    st.carga.integridad = Math.max(0, st.carga.integridad - puntos);
    decir(motivo + ' ' + PUNTO + ' CARGA AL ' + st.carga.integridad + '%', true);
  };

  // ---------- minimapa ----------
  // Con la camara siguiendo a la maquina hace falta un plano: si no,
  // en una terminal de 40 x 28 no hay forma de saber donde queda la
  // zona a la que te mandan.
  const MINI_COL = {
    '~': '#16303f', q: '#5c6570', b: '#8f9aa4', S: '#2b3a45', d: '#3d5566',
    L: '#7d8791', p: '#5c6570', K: '#6b747d', H: '#8c949c', '#': '#39414a',
    o: '#b3562a', P: '#6d7783', T: '#2a3037', r: '#4a4740', '=': '#5a4a12',
    A: '#2e5f57', B: '#1a5878', E: '#6b571a', M: '#7a3d26',
    V: '#454d55', I: '#7a651c', G: '#4e3d73', W: '#2e5f57', '.': '#2c3138'
  };

  let miniFondo = null;
  const hornearMini = () => {
    const l = lienzo(COLS * 4, FILAS * 4);
    const g = l.g;
    for (let f = 0; f < FILAS; f++) {
      for (let c = 0; c < COLS; c++) {
        g.fillStyle = MINI_COL[mapa[f][c]] || '#2c3138';
        g.fillRect(c * 4, f * 4, 4, 4);
      }
    }
    miniFondo = l.c;
  };

  const pintarMini = () => {
    const cv = $('minimapa');
    if (!cv || !miniFondo) return;
    if (cv.width !== COLS * 4 || cv.height !== FILAS * 4) {
      cv.width = COLS * 4;
      cv.height = FILAS * 4;
    }
    const g = cv.getContext('2d');
    g.imageSmoothingEnabled = false;
    g.clearRect(0, 0, cv.width, cv.height);
    g.drawImage(miniFondo, 0, 0);

    // la zona a la que va la orden en curso, latiendo
    const o = ordenActiva();
    if (o) {
      g.globalAlpha = REDUCIDO ? 0.7 : 0.45 + Math.sin(st.reloj * 3) * 0.3;
      g.fillStyle = PINTA_ZONA[o.zona] || COL.rayado;
      for (let f = 0; f < FILAS; f++) {
        for (let c = 0; c < COLS; c++) {
          if ((tileEn(c, f).zona || '') === o.zona) g.fillRect(c * 4, f * 4, 4, 4);
        }
      }
      g.globalAlpha = 1;
    }

    // las pilas, y en blanco la caja que pide la orden
    pilas.forEach((p, k) => {
      if (!p.length) return;
      const cf = k.split(',');
      const marcada = !!o && p.some((x) => x.m === o.m);
      g.fillStyle = marcada ? '#ffffff' : COLORES_CAJA[p[p.length - 1].color].base;
      g.fillRect(Number(cf[0]) * 4, Number(cf[1]) * 4, 4, 4);
    });

    // el trafico, para ver si viene algo antes de cruzar
    g.fillStyle = '#ff8b5e';
    st.trafico.forEach((v) => {
      if (!v.vivo || v.tipo === 'sts') return;
      const h = huella(v);
      g.fillRect(Math.max(0, h[0]) * 4, v.fil * 4, (h[1] - h[0] + 1) * 4, 4);
    });

    // la maquina y el recuadro de lo que estas viendo
    g.fillStyle = M.y;
    g.fillRect(st.col * 4 - 1, st.fil * 4 - 1, 6, 6);
    g.strokeStyle = 'rgba(255,255,255,0.55)';
    g.lineWidth = 1;
    g.strokeRect(Math.round(st.cam.x / TILE * 4) + 0.5, Math.round(st.cam.y / TILE * 4) + 0.5,
      VISTA_C * 4 - 1, VISTA_F * 4 - 1);
  };

  // ---------- instrumentos ----------
  const pintarNiveles = (cont, n, activo, tope) => {
    while (cont.children.length < n) cont.appendChild(document.createElement('i'));
    while (cont.children.length > n) cont.removeChild(cont.lastChild);
    for (let i = 0; i < n; i++) {
      const el = cont.children[i];
      el.style.height = Math.round(35 + (i / Math.max(1, n - 1)) * 65) + '%';
      el.className = '';
      if (tope !== undefined && i > tope) el.classList.add('is-veto');
      else if (i === activo) el.classList.add('is-tope');
      else if (i < activo) el.classList.add('is-on');
    }
  };

  const ESTADOS = [
    { min: 85, txt: 'INTACTO' },
    { min: 60, txt: 'RASPADO' },
    { min: 30, txt: 'ABOLLADO' },
    { min: 1,  txt: 'MUY DANADO' },
    { min: -1, txt: 'INSERVIBLE' }
  ];

  const CLIMAS = {
    dia:    'DIA CLARO',
    lluvia: 'LLUVIA ' + PUNTO + ' PISO MOJADO',
    niebla: 'NIEBLA CERRADA',
    noche:  'TURNO DE NOCHE'
  };

  const mmss = (s) => {
    const m = Math.floor(Math.max(0, s) / 60);
    const r = Math.floor(Math.max(0, s) % 60);
    return m + ':' + String(r).padStart(2, '0');
  };

  const pintarOrdenes = () => {
    const lista = $('ordenes-lista');
    lista.replaceChildren();
    const act = ordenActiva();
    ordenes.forEach((o) => {
      const li = document.createElement('li');
      if (o.hecha) li.className = 'is-hecha';
      else if (o === act) li.className = 'is-activa';
      const donde = buscarCaja(o.m);
      let pista = '';
      if (!o.hecha) {
        if (donde && donde.enSpreader) pista = ' (la llevas)';
        else if (donde && donde.nivel > 0) pista = ' (nivel ' + donde.nivel + ')';
      }
      const cj = donde && donde.caja;
      const tono = cj ? COLORES_CAJA[cj.color].base : '#4a525c';
      const sigla = cj && cj.tipo !== 'normal' ? ' ' + TIPOS[cj.tipo].sigla : '';
      li.innerHTML = '<i style="background:' + tono + '"></i>' +
        '<span><b>' + o.m + '</b>' + sigla + ' ' + FLECHA + ' <em>' + ZONAS[o.zona] + '</em>' + pista + '</span>';
      lista.appendChild(li);
    });
  };

  const refrescar = () => {
    const r = RUMBOS[st.rumbo];
    const o = objetivo();
    $('lec-pos').textContent = posTexto();
    $('lec-rumbo').textContent = r.letra;
    $('lec-alcance').textContent = describir(o.col, o.fil);
    $('lec-golpes').textContent = String(st.golpes);
    $('brujula').textContent = FLECHAS[st.rumbo];

    $('panel-sub').textContent = 'REACHSTACKER ' + PUNTO + ' ' + turnoActual().nombre;
    $('turno-clima').textContent = CLIMAS[clima()];
    const rel = $('turno-reloj');
    rel.textContent = mmss(st.resta);
    rel.className = 'turno__reloj' + (st.resta <= 15 ? ' is-mal' : (st.resta <= 45 ? ' is-poco' : ''));
    $('mk-puntos').textContent = String(st.puntos);
    $('mk-entregas').textContent = st.entregas + '/' + ordenes.length;

    pintarNiveles($('niv-alcance'), 3, st.alcance);
    pintarNiveles($('niv-altura'), PILA_MAX + 1, st.altura, alturaMax());
    $('txt-alcance').textContent = ALCANCES[st.alcance] + ' ' + PUNTO + ' ' + (st.alcance + 1) +
      (st.alcance ? ' CASILLAS' : ' CASILLA');
    $('txt-altura').textContent = 'NIVEL ' + st.altura + ' ' + PUNTO +
      (st.altura === 0 ? ' SUELO' : ' MAX ' + alturaMax());

    let aviso = 'MAS ALCANCE ES MENOS ALTURA';
    let mal = false;
    if (st.carga && st.altura >= 2) { aviso = 'BAJA LA CARGA PARA PODER CIRCULAR'; mal = true; }
    else if (st.carga && st.altura === 1) { aviso = 'CIRCULAR IZADO CASTIGA LA CARGA'; mal = true; }
    else if (st.altura > alturaMax()) { aviso = 'RECOGE EL BOOM PARA SUBIR MAS'; mal = true; }
    const av = $('brazo-aviso');
    av.textContent = aviso;
    av.classList.toggle('is-mal', mal);

    const listo = st.carga ? puedeSoltar() : puedeEnganchar();
    $('txt-twist').textContent = st.carga ? 'SOLTAR' : 'ENGANCHAR';
    $('btn-twist').classList.toggle('is-cargado', !!st.carga);
    $('btn-twist').disabled = !listo && !st.carga;

    const cq = $('carga-que'), cb = $('carga-barra'), ce = $('carga-estado');
    if (st.carga) {
      const c = st.carga;
      cq.textContent = c.m + ' ' + PUNTO + ' ' + TIPOS[c.tipo].sigla;
      cb.style.width = c.integridad + '%';
      cb.className = c.integridad > 60 ? '' : (c.integridad > 30 ? 'is-medio' : 'is-mal');
      ce.textContent = TIPOS[c.tipo].nombre + ' ' + PUNTO + ' ' +
        ESTADOS.find((x) => c.integridad >= x.min).txt + ' ' + c.integridad + '%';
    } else {
      cq.textContent = 'SIN CARGA';
      cb.style.width = '100%';
      cb.className = '';
      ce.textContent = 'EL SPREADER VA VACIO';
    }

    pintarOrdenes();
  };

  // ---------- acciones del brazo ----------
  const mover = (eje, paso) => {
    if (st.fase !== 'juego') return;
    if (eje === 'alcance') {
      const n = st.alcance + paso;
      if (n < 0 || n > 2) return;
      if (st.carga && st.altura > MAX_ALTURA[n]) {
        decir('CON LA CARGA AHI ARRIBA EL BOOM NO SE ALARGA', true);
        return;
      }
      st.alcance = n;
      if (st.altura > alturaMax()) st.altura = alturaMax();
    } else {
      const n = st.altura + paso;
      if (n < 0 || n > PILA_MAX) return;
      if (n > alturaMax()) {
        decir('A ESE ALCANCE NO SUBE MAS ' + PUNTO + ' RECOGE EL BOOM', true);
        return;
      }
      st.altura = n;
    }
    refrescar();
  };

  // Al posar una caja se revisa si con eso queda cumplida la orden
  const revisarOrden = (col, fil, cj) => {
    const o = ordenes.find((x) => !x.hecha && x.m === cj.m);
    if (!o) return;
    if ((tileEn(col, fil).zona || '') !== o.zona) return;
    o.hecha = true;
    st.entregas++;
    // se cobra por entrega y por como llega la caja
    const gana = Math.round(PT_ENTREGA * (cj.integridad / 100));
    st.puntos += gana;
    decir('ENTREGADA ' + cj.m + ' ' + PUNTO + ' +' + gana + ' PUNTOS');
    // el cierre espera medio segundo para que se lea el aviso, pero
    // por el reloj del juego y no por un setTimeout: asi no depende
    // de que el navegador respete el timer
    if (ordenes.every((x) => x.hecha)) st.cierra = 0.6;
  };

  const twist = () => {
    if (st.fase !== 'juego') return;
    const o = objetivo();
    if (!st.carga) {
      if (!dentro(o.col, o.fil)) { decir('AHI NO HAY NADA QUE ENGANCHAR', true); return; }
      const p = pilaEn(o.col, o.fil);
      if (!p || !p.length) { decir('AHI NO HAY NADA QUE ENGANCHAR', true); return; }
      if (st.altura !== p.length - 1) {
        decir('PON EL SPREADER AL NIVEL ' + (p.length - 1) + ' PARA ENGANCHAR', true);
        return;
      }
      st.carga = p.pop();
      if (!p.length) pilas.delete(llave(o.col, o.fil));
      st.zarandeo = 0;
      decir('ENGANCHADO ' + PUNTO + ' ' + st.carga.m);
      refrescar();
      return;
    }
    if (!dentro(o.col, o.fil) || tileEn(o.col, o.fil).solido) {
      decir('AHI NO SE PUEDE POSAR', true); return;
    }
    const n = alturaPila(o.col, o.fil);
    if (n >= PILA_MAX) { decir('ESA PILA YA VA EN ' + PILA_MAX, true); return; }
    if (st.altura < n) { decir('SUBE AL NIVEL ' + n + ' PARA POSARLA ENCIMA', true); return; }
    const veto = vetoColocar(o.col, o.fil, n, st.carga);
    if (veto) { decir(veto, true); return; }

    const caida = caidaAlSoltar();
    if (caida > 0) danarCarga(DANO_CAIDA * caida, 'SOLTADA DESDE ' + caida + ' NIVEL' + (caida > 1 ? 'ES' : '') + ' MAS ARRIBA');
    const cj = st.carga;
    const p = pilaEn(o.col, o.fil) || [];
    p.push(cj);
    pilas.set(llave(o.col, o.fil), p);
    st.carga = null;
    st.altura = Math.min(st.altura, alturaMax());
    if (!caida) decir('POSADA ' + PUNTO + ' NIVEL ' + n + ' DE LA PILA');
    revisarOrden(o.col, o.fil, cj);
    refrescar();
  };

  // ---------- movimiento ----------
  const soltarHumo = (fuerte) => {
    if (REDUCIDO) return;
    const a = apoyoMaquina();
    const e = LUCES[rumboVisible()].escape;
    const x = a.cx - ANCLA.x + e[0], y = a.cy - ANCLA.y + e[1];
    const n = fuerte ? 6 : 4;
    for (let i = 0; i < n; i++) {
      st.humo.push({
        x: x + (Math.random() - 0.5) * 3,
        y: y - i * 1.4,
        vx: (Math.random() - 0.5) * 5,
        vy: -7 - Math.random() * 6,
        vida: 0.5 + Math.random() * 0.35,
        total: 0.85
      });
    }
  };

  const topetazo = (c, f, cmd) => {
    st.accion = 'tope';
    st.cmdTope = cmd;
    st.t = 0;
    st.dur = T_TOPE;
    if (st.tGolpe >= ESPERA_GOLPE) {
      st.golpes += st.carga ? 2 : 1;
      st.tGolpe = 0;
      st.sacudida = 0.5;
      st.puntos = Math.max(0, st.puntos - PT_GOLPE * (st.carga ? 2 : 1));
      if (st.carga) danarCarga(DANO_GOLPE, 'GOLPE CONTRA ' + describir(c, f));
      else decir('TOPETAZO CONTRA ' + describir(c, f), true);
    }
    refrescar();
  };

  const lastreActual = () => {
    if (!st.carga) return 1;
    return st.carga.tipo === 'pesado' ? LASTRE_OW : LASTRE;
  };

  const iniciar = (cmd) => {
    if (st.fase !== 'juego') return;
    // con la carga en alto la maquina no arranca: a nivel 2 o mas es
    // riesgo de vuelco, y en obra sencillamente no se hace
    if (st.carga && st.altura >= 2) {
      decir('BAJA LA CARGA A NIVEL 0 O 1 PARA CIRCULAR', true);
      return;
    }

    const mojado = clima() === 'lluvia' ? 1.25 : 1;

    if (cmd === 'izq' || cmd === 'der') {
      st.giroDesde = st.rumbo;
      st.rumbo = (st.rumbo + (cmd === 'izq' ? 3 : 1)) % 4;
      st.accion = 'giro';
      st.t = 0;
      st.dur = T_GIRO * lastreActual() * mojado;
      st.pasos++;
      tributoDeCarga();
      refrescar();
      return;
    }
    const r = RUMBOS[st.rumbo];
    const s = cmd === 'avanzar' ? 1 : -1;
    const nc = st.col + r.dc * s;
    const nf = st.fil + r.df * s;
    if (!transitable(nc, nf)) { topetazo(nc, nf, cmd); return; }
    st.desdeCol = st.col;
    st.desdeFil = st.fil;
    st.col = nc;
    st.fil = nf;
    st.accion = cmd;
    st.t = 0;
    st.dur = (cmd === 'avanzar' ? T_AVANCE : T_REVERSA) * lastreActual() * mojado;
    st.pasos++;
    soltarHumo(cmd === 'reversa');
    tributoDeCarga();
    // con el piso mojado la maquina no se detiene en seco: si la
    // casilla siguiente esta libre, se va de mas
    if (clima() === 'lluvia' && cmd === 'avanzar' && Math.random() < 0.22) {
      const dc = nc + r.dc, df = nf + r.df;
      if (transitable(dc, df)) {
        st.patina = 1;
        st.buffer = 'avanzar';
        decir('PISO MOJADO ' + PUNTO + ' SE FUE DE LARGO', true);
      }
    }
    refrescar();
  };

  // Lo que le cuesta a la caja cada maniobra: ir izada castiga
  // siempre, y encadenar maniobras a tirones la zangolotea.
  const tributoDeCarga = () => {
    st.quieto = 0;
    if (!st.carga) { st.zarandeo = 0; return; }
    if (st.altura >= 1) danarCarga(DANO_IZADO, 'PASEADA IZADA');
    st.zarandeo++;
    if (st.zarandeo >= ZARANDEO_MAX) {
      st.zarandeo = 0;
      danarCarga(DANO_ZARANDEO, 'ZANGOLOTEO');
    }
  };

  const sostenido = () => CMDS.find((c) => activos[c]) || null;

  const ordenar = (cmd) => {
    if (st.accion) { st.buffer = cmd; return; }
    iniciar(cmd);
  };

  // ---------- cierre de turno ----------
  const RANGOS = [
    { min: 0.9, txt: 'OPERADOR DE PRIMERA' },
    { min: 0.7, txt: 'TURNO SOLIDO' },
    { min: 0.5, txt: 'PASABLE, CON ROCES' },
    { min: 0,   txt: 'HAY QUE PULIRLO' }
  ];

  const cerrarTurno = () => {
    if (st.fase === 'cierre') return;
    st.fase = 'cierre';
    const t = turnoActual();
    const todas = ordenes.every((x) => x.hecha);
    const bonus = todas ? Math.round(st.resta) * PT_SEGUNDO : 0;
    st.puntos += bonus;
    const techo = ordenes.length * PT_ENTREGA + t.segundos * PT_SEGUNDO * 0.4;
    const rango = RANGOS.find((r) => st.puntos / techo >= r.min);

    $('finale').hidden = false;
    $('finale').querySelector('.finale__caja').classList.toggle('is-mal', !todas);
    $('fin-kicker').textContent = todas ? t.nombre + ' COMPLETADO' : 'SE ACABO EL TIEMPO';
    $('fin-titulo').textContent = todas ? rango.txt : 'TURNO INCOMPLETO';
    $('fin-score').textContent = st.puntos + ' PTS';

    const filas = [
      ['ENTREGAS', st.entregas + ' de ' + ordenes.length, 'is-suma'],
      ['MANIOBRAS', String(st.pasos), ''],
      ['GOLPES', st.golpes ? st.golpes + '  (-' + (st.golpes * PT_GOLPE) + ')' : 'ninguno', st.golpes ? 'is-resta' : 'is-suma'],
      ['TIEMPO QUE SOBRO', mmss(st.resta) + (bonus ? '  (+' + bonus + ')' : ''), bonus ? 'is-suma' : '']
    ];
    const tabla = $('fin-tabla');
    tabla.replaceChildren();
    filas.forEach((f) => {
      const d = document.createElement('div');
      if (f[2]) d.className = f[2];
      d.innerHTML = '<span>' + f[0] + '</span><b>' + f[1] + '</b>';
      tabla.appendChild(d);
    });

    const hay = st.turno < TURNOS.length - 1;
    $('btn-seguir').hidden = !(todas && hay);
    $('fin-nota').textContent = todas
      ? (hay ? TURNOS[st.turno + 1].lema : 'Ese era el ultimo turno del dia. Puedes repetirlo para mejorar la marca.')
      : 'Las ordenes que quedaron sin entregar no se cobran. Repite el turno y planifica mejor la ruta.';
  };

  const arrancarTurno = (n) => {
    st.turno = Math.max(0, Math.min(TURNOS.length - 1, n));
    const t = turnoActual();
    // cada turno trae su trazado, asi que hay que rehacer el mundo
    mapa = t.mapa;
    COLS = mapa[0].length;
    FILAS = mapa.length;
    MUNDO_W = COLS * TILE;
    MUNDO_H = FILAS * TILE;
    listarObjetos();
    hornearSuelo();
    hornearMini();
    st.fase = 'juego';
    st.resta = SEG_FORZADO || t.segundos;
    st.col = t.inicio.col; st.fil = t.inicio.fil; st.rumbo = RUMBO_INICIAL;
    st.desdeCol = st.col; st.desdeFil = st.fil;
    st.accion = null; st.t = 0; st.dur = 0; st.buffer = null;
    st.alcance = 0; st.altura = 0; st.alcanceVis = 0; st.alturaVis = 0;
    st.carga = null; st.zarandeo = 0; st.quieto = 99; st.patina = 0; st.cierra = 0;
    st.pasos = 0; st.golpes = 0; st.tGolpe = 99; st.sacudida = 0;
    st.entregas = 0; st.puntos = 0;
    st.humo.length = 0;
    CMDS.forEach((c) => { activos[c] = false; });
    sembrarTurno();
    sembrarTrafico();
    plantarCamara();
    $('finale').hidden = true;
    decir(t.nombre + ' ' + PUNTO + ' ' + CLIMAS[t.clima]);
    refrescar();
  };

  // ---------- tiempo ----------
  const avanzarTiempo = (dt) => {
    st.reloj += dt;
    st.tGolpe += dt;
    if (st.sacudida > 0) st.sacudida = Math.max(0, st.sacudida - dt * 3.4);
    if (st.patina > 0) st.patina = Math.max(0, st.patina - dt * 2);

    if (st.fase === 'juego') {
      if (st.cierra > 0) {
        st.cierra -= dt;
        if (st.cierra <= 0) { st.cierra = 0; cerrarTurno(); }
      } else {
        st.resta -= dt;
        if (st.resta <= 0) { st.resta = 0; cerrarTurno(); }
      }
    }

    if (st.fase === 'juego') moverTrafico(dt);
    seguirCamara(dt);

    // el brazo persigue su posicion logica en vez de saltar a ella
    const k = Math.min(1, dt / T_BRAZO);
    st.alcanceVis += (st.alcance - st.alcanceVis) * k;
    st.alturaVis += (st.altura - st.alturaVis) * k;

    for (let i = st.humo.length - 1; i >= 0; i--) {
      const p = st.humo[i];
      p.vida -= dt;
      if (p.vida <= 0) { st.humo.splice(i, 1); continue; }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy *= 0.94;
    }

    if (clima() === 'lluvia' && !REDUCIDO) {
      while (st.gotas.length < 90) {
        st.gotas.push({ x: Math.random() * VISTA_W, y: Math.random() * VISTA_H, v: 150 + Math.random() * 120 });
      }
      st.gotas.forEach((p) => {
        p.y += p.v * dt;
        p.x += 22 * dt;
        if (p.y > VISTA_H) { p.y = -4; p.x = Math.random() * VISTA_W; }
      });
    } else if (st.gotas.length) st.gotas.length = 0;

    if (!st.accion) {
      // parar un momento asienta la carga y borra el zarandeo
      st.quieto += dt;
      if (st.zarandeo > 0 && st.quieto > 1.2) st.zarandeo = 0;
      return;
    }
    st.t += dt;
    if (st.t < st.dur) return;
    st.accion = null;
    st.desdeCol = st.col;
    st.desdeFil = st.fil;
    const sig = st.buffer || sostenido();
    st.buffer = null;
    if (sig) iniciar(sig);
    else refrescar();
  };

  // ---------- escala del canvas ----------
  const escalar = () => {
    const r = escena.getBoundingClientRect();
    // Apilado la escena se ajusta al canvas, asi que medir su alto
    // seria medir el resultado anterior y la escala se iria abajo a
    // cada resize. Ahi el presupuesto sale de la ventana.
    const apilado = window.innerWidth <= 980;
    const dispW = r.width - 36;
    const dispH = (apilado ? window.innerHeight * 0.62 : r.height) - 36;
    const e = Math.max(1, Math.floor(Math.min(dispW / VISTA_W, dispH / VISTA_H)));
    canvas.style.width = (VISTA_W * e) + 'px';
    canvas.style.height = (VISTA_H * e) + 'px';
  };

  // ---------- entrada ----------
  const TECLAS = {
    arrowup: 'avanzar', w: 'avanzar',
    arrowdown: 'reversa', s: 'reversa',
    arrowleft: 'izq', a: 'izq',
    arrowright: 'der', d: 'der'
  };

  const abrirAyuda = () => { $('overlay').hidden = false; };
  const cerrarAyuda = () => { $('overlay').hidden = true; };

  document.addEventListener('keydown', (e) => {
    const k = e.key.toLowerCase();
    if (k === 'escape') { cerrarAyuda(); return; }
    if (k === 'h') { if ($('overlay').hidden) abrirAyuda(); else cerrarAyuda(); return; }
    if (!$('overlay').hidden) {
      if (k === 'enter' || k === ' ') { e.preventDefault(); cerrarAyuda(); }
      return;
    }
    if (k === 'r') { arrancarTurno(st.turno); return; }
    if (st.fase === 'cierre') {
      if (k === 'enter' && !$('btn-seguir').hidden) arrancarTurno(st.turno + 1);
      return;
    }
    if (k === ' ') { e.preventDefault(); if (!e.repeat) twist(); return; }
    if (k === 'q') { e.preventDefault(); if (!e.repeat) mover('altura', -1); return; }
    if (k === 'e') { e.preventDefault(); if (!e.repeat) mover('altura', 1); return; }
    if (k === 'z') { e.preventDefault(); if (!e.repeat) mover('alcance', -1); return; }
    if (k === 'x') { e.preventDefault(); if (!e.repeat) mover('alcance', 1); return; }
    const cmd = TECLAS[k];
    if (!cmd) return;
    e.preventDefault();
    activos[cmd] = true;
    if (!e.repeat) ordenar(cmd);
  });

  document.addEventListener('keyup', (e) => {
    const cmd = TECLAS[e.key.toLowerCase()];
    if (cmd) activos[cmd] = false;
  });

  // La ventana puede perder el foco con una tecla sostenida y el
  // keyup nunca llega: soltar todo evita que la maquina se quede
  // caminando sola.
  window.addEventListener('blur', () => { CMDS.forEach((c) => { activos[c] = false; }); });

  document.querySelectorAll('.cbtn').forEach((b) => {
    const cmd = b.dataset.cmd;
    const pulsar = (e) => {
      e.preventDefault();
      b.classList.add('is-press');
      activos[cmd] = true;
      ordenar(cmd);
    };
    const soltar = () => {
      b.classList.remove('is-press');
      activos[cmd] = false;
    };
    b.addEventListener('pointerdown', pulsar);
    b.addEventListener('pointerup', soltar);
    b.addEventListener('pointerleave', soltar);
    b.addEventListener('pointercancel', soltar);
  });

  const EJES = {
    recoger: ['alcance', -1], alargar: ['alcance', 1],
    arriar:  ['altura', -1],  izar:    ['altura', 1]
  };

  document.querySelectorAll('.ebtn').forEach((b) => {
    const par = EJES[b.dataset.cmd];
    const pulsar = (e) => { e.preventDefault(); b.classList.add('is-press'); mover(par[0], par[1]); };
    const soltar = () => b.classList.remove('is-press');
    b.addEventListener('pointerdown', pulsar);
    b.addEventListener('pointerup', soltar);
    b.addEventListener('pointerleave', soltar);
    b.addEventListener('pointercancel', soltar);
  });

  const btnTwist = $('btn-twist');
  btnTwist.addEventListener('pointerdown', (e) => { e.preventDefault(); btnTwist.classList.add('is-press'); twist(); });
  ['pointerup', 'pointerleave', 'pointercancel'].forEach((ev) =>
    btnTwist.addEventListener(ev, () => btnTwist.classList.remove('is-press')));

  $('btn-entendido').addEventListener('click', cerrarAyuda);
  $('btn-ayuda').addEventListener('click', abrirAyuda);
  $('btn-reiniciar').addEventListener('click', () => arrancarTurno(st.turno));
  $('btn-repetir').addEventListener('click', () => arrancarTurno(st.turno));
  $('btn-seguir').addEventListener('click', () => arrancarTurno(st.turno + 1));
  window.addEventListener('resize', escalar);

  // ---------- loop ----------
  let last = performance.now();
  const tick = (now) => {
    requestAnimationFrame(tick);
    const dt = Math.max(0, Math.min((now - last) / 1000, 0.05));
    last = now;
    avanzarTiempo(dt);
    render();
    pintarMini();
  };

  // ---------- arranque ----------
  cocerTodo();
  arrancarTurno(TURNO_INICIAL);
  escalar();
  requestAnimationFrame(tick);
})();
