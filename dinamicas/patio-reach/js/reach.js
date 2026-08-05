/* ============================================================
   DINAMICA PATIO REACH - motor

   Patio de contenedores de 20 x 14 casillas en pixel art, vista
   3/4 (el suelo se ve a plomo y todo lo que tiene altura se dibuja
   de frente, como en los RPG de cuadricula). El participante ES la
   reachstacker RS-04.

   CONDUCIR es vehicular, no de personaje:
   - avanzar   una casilla en el rumbo actual
   - reversa   una casilla hacia atras, sin girar y mas lento
   - girar     90 grados en sitio, sin desplazarse

   EL BRAZO tiene dos ejes, como la maquina real:
   - ALCANCE  corto / medio / largo: a que casilla llega el
              spreader, una, dos o tres por delante
   - ALTURA   nivel 0 a 3 de la pila
   Con una curva de carga real: cuanto mas alargas, menos alto
   llegas (ver MAX_ALTURA). Por eso a veces hay que reposicionar la
   maquina en vez de estirar el brazo.

   COMO SE DIBUJA
   El canvas tiene 480 x 336 pixeles NATIVOS (20 x 14 casillas de
   24 px) y el CSS lo estira a un multiplo entero con
   image-rendering: pixelated. Todo se pinta con fillRect sobre
   coordenadas enteras: nada de paths, para que no haya bordes
   suavizados.

   El suelo se hornea UNA vez y todo lo que levanta del piso es una
   entidad que se ordena por profundidad cada cuadro.

   EL BOOM Y EL SPREADER NO VAN EN EL SPRITE DEL CUERPO: se pintan
   aparte, en coordenadas de mundo (casilla objetivo + altura), asi
   el mismo codigo sirve para los cuatro rumbos y puede variar con
   el alcance y la altura. El cuerpo son cuatro dibujos, uno por
   rumbo, porque en 3/4 un rumbo no se saca rotando otro; solo el
   oeste es el espejo del este.

   PERSONALIZAR
   - MAPA         trazado del patio, un caracter por casilla
   - TILES        que significa cada caracter y si es solido
   - CARGA        pilas de contenedores del arranque
   - MAX_ALTURA   la curva de carga (altura maxima por alcance)
   - maquina*     dibujo de la maquina, rumbo por rumbo
   - T_AVANCE / T_REVERSA / T_GIRO   ritmo de la maquina
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

  const PILA_MAX = 3;              // contenedores apilables por casilla
  const MAX_ALTURA = [3, 2, 1];    // la curva de carga: corto, medio, largo
  const ALCANCES = ['CORTO', 'MEDIO', 'LARGO'];

  // Danos a la carga, en puntos de integridad
  const DANO_GOLPE = 16;           // chocar llevando el contenedor
  const DANO_CAIDA = 15;           // por nivel de caida al soltar mal
  const DANO_IZADO = 4;            // por maniobra circulando a nivel 1
  const DANO_ZARANDEO = 6;         // al pasarse de maniobras encadenadas
  const ZARANDEO_MAX = 5;          // maniobras seguidas que aguanta la caja

  const MAPA = [
    '####################',
    '#TTTTTTTTTTTTTTTTTT#',
    '#TTTTTTTTTTTTTTTTTT#',
    '#..................#',
    '#.AAAA......BBBB...#',
    '#.AAAA......BBBB...#',
    '#.AAAA......BBBB...#',
    '#.====......====...#',
    '#..................#',
    '#....o........o....#',
    '#...~~~............#',
    '#..................#',
    '#.HHH.........P....#',
    '####################'
  ];

  const TILES = {
    '.': { nombre: 'PISO LIBRE',            solido: false },
    'T': { nombre: 'VIA DE CAMION',         solido: false },
    '=': { nombre: 'RAYADO DE SEGREGACION', solido: false },
    'A': { nombre: 'PATIO A',               solido: false, zona: 'A' },
    'B': { nombre: 'PATIO B',               solido: false, zona: 'B' },
    '~': { nombre: 'ENCHARCAMIENTO',        solido: false },
    '#': { nombre: 'VALLA',                 solido: true },
    'H': { nombre: 'CASETA',                solido: true },
    'o': { nombre: 'CONO',                  solido: true },
    'P': { nombre: 'POSTE DE LUZ',          solido: true }
  };

  // Pilas del arranque. El primer color es el de abajo. Hay pilas de
  // dos y de tres a proposito, para que haya que jugar con la altura
  // y con la curva de carga desde el primer minuto.
  const CARGA = [
    { col: 2,  fil: 4,  cajas: ['rojo', 'azul'] },
    { col: 3,  fil: 4,  cajas: ['azul'] },
    { col: 5,  fil: 4,  cajas: ['verde', 'gris', 'rojo'] },
    { col: 2,  fil: 6,  cajas: ['gris'] },
    { col: 4,  fil: 6,  cajas: ['rojo', 'verde'] },
    { col: 12, fil: 4,  cajas: ['azul'] },
    { col: 14, fil: 4,  cajas: ['gris', 'rojo'] },
    { col: 15, fil: 4,  cajas: ['rojo'] },
    { col: 13, fil: 6,  cajas: ['verde'] },
    { col: 15, fil: 6,  cajas: ['azul', 'gris'] },
    { col: 7,  fil: 3,  cajas: ['gris'] },
    { col: 17, fil: 10, cajas: ['verde'] }
  ];

  const INICIO = { col: 9, fil: 11, rumbo: 0 };

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

  const COLS = MAPA[0].length;
  const FILAS = MAPA.length;
  const MUNDO_W = COLS * TILE;
  const MUNDO_H = FILAS * TILE;

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
    rayado:     '#FFC627',   // el vivo, solo para la valla y la zona de alcance
    rayadoPiso: '#9c7d1c',   // pintura de piso, ya gastada por el trafico
    rayadoOsc:  '#272d34',
    charco:     '#27333c',
    charcoAlt:  '#35454f',
    rejilla:    'rgba(255, 255, 255, 0.05)',
    sombra:     'rgba(0, 0, 0, 0.34)'
  };

  // Paleta de la maquina. La variante elegida es INDUSTRIAL: escala
  // de maquina real con detalle de chapa encima.
  const M = {
    k:  '#0b0f14',   // contorno
    y:  '#f0b91d',   // amarillo
    yA: '#ffd451',   // cara superior iluminada
    yO: '#b0840d',   // junta de chapa en sombra
    n:  '#39424c',   // metal oscuro
    nA: '#525d69',
    w:  '#bfe4f7',   // vidrio
    wA: '#e6f6ff',
    g:  '#6f7883',   // gris del boom
    gA: '#949daa',
    gO: '#464e58',
    t:  '#15181c',   // llanta
    tL: '#2b3138',   // dibujo de la llanta
    h:  '#8d949c',   // rin
    hO: '#5c636b',
    r:  '#ff5a3c',   // luces traseras
    rA: '#ffd0c4',
    a:  '#ffab2e',   // baliza ambar
    faro: '#fff3cf'
  };

  const COLORES_CAJA = {
    rojo:  { nombre: 'ROJO',  base: '#a8483d', alto: '#c96054', bajo: '#7a3129' },
    azul:  { nombre: 'AZUL',  base: '#2f6a9e', alto: '#4287c1', bajo: '#204a70' },
    verde: { nombre: 'VERDE', base: '#3d7a5f', alto: '#519a78', bajo: '#2a5843' },
    gris:  { nombre: 'GRIS',  base: '#7b838c', alto: '#99a1aa', bajo: '#575e66' }
  };

  // ---------- primitivas de pixel ----------
  const rc = (g, x, y, w, h, c) => { g.fillStyle = c; g.fillRect(x | 0, y | 0, w | 0, h | 0); };

  // Caja con contorno y banda clara arriba. Esa banda insinua la
  // cara superior de la pieza y es la que vende la vista 3/4.
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

  // Rueda de perfil. La lejana va plana y oscura: es el truco que
  // hace que se lea el ancho de la maquina en vista 3/4.
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

  // Rueda vista de frente o de espaldas: es la banda de rodadura de
  // canto. Con las esquinas comidas, si no se lee como oruga de
  // tanque en vez de neumatico.
  const llanta = (g, x, y, w, h) => {
    rc(g, x + 1, y, w - 2, h, M.k);
    rc(g, x, y + 2, w, h - 4, M.k);
    rc(g, x + 2, y + 1, w - 4, h - 2, M.t);
    rc(g, x + 1, y + 3, w - 2, h - 6, M.t);
    for (let i = 4; i < h - 4; i += 3) rc(g, x + 2, y + i, w - 4, 1, M.tL);
    rc(g, x + 3, y + Math.round(h / 2) - 2, w - 6, 4, M.hO);
  };

  // ---------- el cuerpo de la maquina, rumbo por rumbo ----------
  // Lienzo comun y punto de apoyo en el suelo, para que los cuatro
  // dibujos se anclen igual sobre la casilla. El boom y el spreader
  // NO van aqui: se pintan aparte, en coordenadas de mundo.
  const MAQ_W = 76, MAQ_H = 60;
  const ANCLA = { x: 36, y: 51 };

  // ESTE: el perfil, la vista donde la maquina es inconfundible.
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

  // De frente y de espaldas la maquina va SIMETRICA y centrada: la
  // cabina al eje. En la maquina real la cabina va montada al costado
  // izquierdo, pero dibujarla descentrada a esta escala deja el
  // sprite chueco.
  //
  // De canto mide 28 px: un poco MAS que su casilla de 24, porque la
  // maquina tiene que verse mas grande que la carga. Lo que evita que
  // se monte con los vecinos no es encogerla, es que el contenedor
  // solo ocupa 18 px de su casilla (ver CAJA_W): entre los 3 px de
  // aire del contenedor y los 2 px que sobresale la maquina siempre
  // queda holgura. Los faros van POR ENCIMA de las ruedas, no al
  // lado, para no gastar ancho.

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

  // Donde va la baliza, donde el escape y de donde nace el boom, en
  // coordenadas de sprite, para cada rumbo. Se dibujan por cuadro.
  const LUCES = [
    { baliza: [35, 8],  escape: [46, 18], pivote: [36, 32] },  // N, de espaldas
    { baliza: [33, 9],  escape: [24, 10], pivote: [13, 19] },  // E, de perfil
    { baliza: [35, 1],  escape: [25, 12], pivote: [36, 10] },  // S, de frente
    { baliza: [40, 9],  escape: [50, 10], pivote: [63, 19] }   // O, perfil espejado
  ];

  // ---------- objetos del patio, tambien en 3/4 ----------
  // El contenedor NO llena su casilla: deja aire a los lados. Es lo
  // que permite que la maquina sea mas ancha que la carga -- que es
  // como es de verdad, una reachstacker mide cuatro metros de ancho
  // y un contenedor dos y medio -- sin que se monten entre ellos.
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

  const dibujarContenedor = (g, x0, base, color, integridad) => {
    const c = COLORES_CAJA[color];
    const d = 1 - Math.max(0, Math.min(1, (integridad === undefined ? 100 : integridad) / 100));
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
    // abolladuras: mas golpes, mas marcas, siempre en el mismo sitio
    const marcas = Math.floor(d * 7);
    for (let i = 0; i < marcas; i++) {
      const mx = 2 + ((i * 7 + 3) % (CAJA_W - 5));
      const my = 10 + ((i * 5 + 2) % 9);
      rc(g, x + mx, y + my, 2, 2, M.k);
      rc(g, x + mx + 1, y + my - 1, 1, 1, bajo1);
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
    rc(g, x, y, TILE, 10, '#5b6570');                    // techo
    rc(g, x, y, TILE, 2, '#78848f');
    rc(g, x, y + 10, TILE, 22, '#c6ced6');               // muro
    rc(g, x, y + 10, TILE, 1, '#e2e8ee');
    if (!vecinos.izq) rc(g, x, y, 1, 32, '#7c848d');
    if (!vecinos.der) rc(g, x + TILE - 1, y, 1, 32, '#7c848d');
    rc(g, x, y + 31, TILE, 1, M.k);
    caja(g, x + 4, y + 15, 7, 8, '#3d5a6b', '#527588');  // ventanas
    caja(g, x + 14, y + 15, 7, 8, '#3d5a6b', '#527588');
  };

  const dibujarValla = (g, x, base) => {
    const y = base - 14;
    rc(g, x, y, TILE, 5, '#525c67');                     // canto superior
    rc(g, x, y, TILE, 1, '#6b7580');
    rc(g, x, y + 5, TILE, 10, '#39414a');                // cara frontal
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

  // El oeste es el este espejado: para un vehiculo es legitimo y
  // ahorra un dibujo entero.
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
    SPR.caseta = {};
    [0, 1, 2, 3].forEach((n) => {
      SPR.caseta[n] = cocer(TILE, 34, (g) =>
        dibujarCaseta(g, 0, 31, { izq: !!(n & 1), der: !!(n & 2) }));
    });
  };

  // ---------- DOM ----------
  const $ = (id) => document.getElementById(id);
  const escena = $('escena');
  const canvas = $('patio');
  const ctx = canvas.getContext('2d');
  const toast = $('toast');
  const brujula = $('brujula');
  const lecPos = $('lec-pos');
  const lecRumbo = $('lec-rumbo');
  const lecAlcance = $('lec-alcance');
  const lecPasos = $('lec-pasos');
  const lecGolpes = $('lec-golpes');
  const nivAlcance = $('niv-alcance');
  const nivAltura = $('niv-altura');
  const txtAlcance = $('txt-alcance');
  const txtAltura = $('txt-altura');
  const brazoAviso = $('brazo-aviso');
  const btnTwist = $('btn-twist');
  const txtTwist = $('txt-twist');
  const cargaQue = $('carga-que');
  const cargaBarra = $('carga-barra');
  const cargaEstado = $('carga-estado');

  const REDUCIDO = matchMedia('(prefers-reduced-motion: reduce)').matches;

  let toastTimer = 0;
  const decir = (msg, mal) => {
    toast.hidden = false;
    toast.textContent = msg;
    toast.classList.toggle('is-ok', !mal);
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { toast.hidden = true; }, 2400);
  };

  // ---------- estado ----------
  const st = {
    col: INICIO.col, fil: INICIO.fil, rumbo: INICIO.rumbo,
    desdeCol: INICIO.col, desdeFil: INICIO.fil,
    accion: null,          // null | 'avanzar' | 'reversa' | 'giro' | 'tope'
    t: 0, dur: 0,
    giroDesde: INICIO.rumbo,
    cmdTope: null,
    alcance: 0,            // 0 corto, 1 medio, 2 largo
    altura: 0,             // 0..3, nivel de pila donde trabaja el spreader
    alcanceVis: 0,         // los mismos, interpolados para el dibujo
    alturaVis: 0,
    carga: null,           // { color, integridad } o null
    pasos: 0, golpes: 0,
    tGolpe: 99,
    sacudida: 0,
    zarandeo: 0,           // maniobras encadenadas con carga
    quieto: 99,            // segundos sin maniobrar: asientan la carga
    humo: [],
    reloj: 0,
    buffer: null
  };

  const CMDS = ['avanzar', 'reversa', 'izq', 'der'];
  const activos = { avanzar: false, reversa: false, izq: false, der: false };

  // ---------- pilas de contenedores ----------
  const pilas = new Map();
  const llave = (c, f) => c + ',' + f;
  const pilaEn = (c, f) => pilas.get(llave(c, f)) || null;

  const sembrarPilas = () => {
    pilas.clear();
    CARGA.forEach((p) => {
      pilas.set(llave(p.col, p.fil), p.cajas.map((color) => ({ color, integridad: 100 })));
    });
  };

  const alturaPila = (c, f) => { const p = pilaEn(c, f); return p ? p.length : 0; };

  // ---------- consultas del mapa ----------
  const dentro = (c, f) => c >= 0 && c < COLS && f >= 0 && f < FILAS;
  const charEn = (c, f) => (dentro(c, f) ? MAPA[f][c] : '#');
  const tileEn = (c, f) => TILES[charEn(c, f)] || TILES['#'];

  const transitable = (c, f) => dentro(c, f) && !tileEn(c, f).solido && alturaPila(c, f) === 0;

  // Casilla a la que apunta el spreader ahora mismo
  const objetivo = () => {
    const r = RUMBOS[st.rumbo];
    const d = st.alcance + 1;
    return { col: st.col + r.dc * d, fil: st.fil + r.df * d };
  };

  const describir = (c, f) => {
    if (!dentro(c, f)) return 'FUERA DEL PATIO';
    const p = pilaEn(c, f);
    if (p && p.length) {
      const arriba = p[p.length - 1];
      return 'PILA DE ' + p.length + ' ' + PUNTO + ' ' + COLORES_CAJA[arriba.color].nombre + ' ARRIBA';
    }
    return tileEn(c, f).nombre;
  };

  // Nomenclatura de patio: la columna es la bahia y la fila el carril.
  const posTexto = () => {
    const bahia = String(st.col + 1).padStart(2, '0');
    const carril = String.fromCharCode(65 + st.fil);
    return 'BAHIA ' + bahia + ' ' + PUNTO + ' CARRIL ' + carril;
  };

  // Todo lo que levanta del piso es entidad y se ordena por
  // profundidad. Los del mapa no cambian nunca, asi que se listan
  // una sola vez al arrancar.
  const OBJETOS = [];
  const listarObjetos = () => {
    for (let f = 0; f < FILAS; f++) {
      for (let c = 0; c < COLS; c++) {
        const ch = MAPA[f][c];
        if (ch === '#' || ch === 'H' || ch === 'o' || ch === 'P') OBJETOS.push({ col: c, fil: f, ch });
      }
    }
  };

  // ---------- horneado del suelo (solo lo plano) ----------
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

  // El charco mira a sus vecinos: si la casilla de al lado tambien
  // es agua no lleva borde, y los tres modulos se leen como un solo
  // encharcamiento en vez de tres burbujas.
  const pintarCharco = (g, px, py, c, f) => {
    pintarAsfalto(g, px, py, c, f, COL.asfalto, COL.asfaltoAlt, COL.asfaltoOsc);
    const esAgua = (cc, ff) => charEn(cc, ff) === '~';
    for (let y = 0; y < TILE; y++) {
      for (let x = 0; x < TILE; x++) {
        let d = TILE;
        if (!esAgua(c - 1, f)) d = Math.min(d, x);
        if (!esAgua(c + 1, f)) d = Math.min(d, TILE - 1 - x);
        if (!esAgua(c, f - 1)) d = Math.min(d, y);
        if (!esAgua(c, f + 1)) d = Math.min(d, TILE - 1 - y);
        const borde = 3 + Math.floor(ruido(c * 7.3 + x, f * 11.9 + y) * 3);
        if (d < borde) continue;
        g.fillStyle = d < borde + 2 ? COL.charcoAlt : COL.charco;
        g.fillRect(px + x, py + y, 1, 1);
      }
    }
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

  const pintarSlot = (g, px, py, c, f, zona) => {
    pintarAsfalto(g, px, py, c, f, COL.asfalto, COL.asfaltoAlt, COL.asfaltoOsc);
    g.fillStyle = zona === 'A' ? COL.zonaA : COL.zonaB;
    const L = 7, m = 2;
    const x0 = px + m, x1 = px + TILE - m - 1;
    const y0 = py + m, y1 = py + TILE - m - 1;
    g.fillRect(x0, y0, L, 1);          g.fillRect(x0, y0, 1, L);
    g.fillRect(x1 - L + 1, y0, L, 1);  g.fillRect(x1, y0, 1, L);
    g.fillRect(x0, y1, L, 1);          g.fillRect(x0, y1 - L + 1, 1, L);
    g.fillRect(x1 - L + 1, y1, L, 1);  g.fillRect(x1, y1 - L + 1, 1, L);
  };

  let suelo = null;
  const hornearSuelo = () => {
    const l = lienzo(MUNDO_W, MUNDO_H);
    const g = l.g;
    for (let f = 0; f < FILAS; f++) {
      for (let c = 0; c < COLS; c++) {
        const px = c * TILE, py = f * TILE;
        const ch = MAPA[f][c];
        if (ch === 'T') pintarVia(g, px, py, c, f);
        else if (ch === '=') pintarRayado(g, px, py, c, f);
        else if (ch === '~') pintarCharco(g, px, py, c, f);
        else if (ch === 'A' || ch === 'B') pintarSlot(g, px, py, c, f, ch);
        else pintarAsfalto(g, px, py, c, f, COL.asfalto, COL.asfaltoAlt, COL.asfaltoOsc);
      }
    }
    g.fillStyle = COL.rejilla;
    for (let c = 1; c < COLS; c++) g.fillRect(c * TILE, 0, 1, MUNDO_H);
    for (let f = 1; f < FILAS; f++) g.fillRect(0, f * TILE, MUNDO_W, 1);
    suelo = l.c;
  };

  // ---------- render ----------
  const suave = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);

  // El apoyo de la maquina en el suelo, en pixeles nativos. En 3/4
  // lo que ordena la profundidad es ese apoyo, no el centro.
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

  const dibujarMaquina = (g) => {
    const a = apoyoMaquina();
    const rumbo = rumboVisible();
    const spr = SPR.maquina[rumbo];
    const x = Math.round(a.cx - ANCLA.x);
    const y = Math.round(a.cy - ANCLA.y);
    g.drawImage(spr, x, y);

    // baliza ambar: siempre girando, tambien con la maquina parada
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

  // Donde apoya el spreader en pantalla, ya con alcance y altura
  // interpolados. Devuelve la TAPA de una caja que estuviera en ese
  // nivel: sobre ahi se posa el spreader para enganchar, y de ahi
  // cuelga la caja cuando la lleva. Va en coordenadas de mundo, asi
  // que el mismo calculo sirve para los cuatro rumbos.
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
  // para los rumbos norte y sur, donde el brazo apunta hacia dentro
  // de la pantalla; pintarlo ahi como un tubo de grosor constante lo
  // deja como una columna gris que tapa media maquina.
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

  // El boom va DETRAS del cuerpo: se dibuja antes que la maquina y
  // ella lo tapa donde toca, que es como se ve de verdad. Si se
  // pintara encima, en las vistas de frente y espaldas cruzaria la
  // cabina de arriba abajo.
  const dibujarBoom = (g) => {
    const v = pivoteBrazo();
    const p = puntaBrazo();
    const sx = Math.round(p.x), sy = Math.round(p.y) - 4;

    if (RUMBOS[rumboVisible()].dc === 0) {
      // norte o sur: el brazo se hunde en la pantalla, va escorzado y
      // lo mas cercano al ojo es el extremo que queda mas abajo
      if (v.y > sy) boomEscorzado(g, v.x, v.y, sx, sy, 7, 4);
      else boomEscorzado(g, sx, sy, v.x, v.y, 7, 4);
      return;
    }
    // de perfil si se ve entero, en dos secciones telescopicas
    const mx = Math.round(v.x + (sx - v.x) * 0.55);
    const my = Math.round(v.y + (sy - v.y) * 0.55);
    tubo(g, v.x, v.y, mx, my, 8, M.g, M.gA);
    tubo(g, mx, my, sx, sy, 6, M.g, M.gA);
    disco(g, v.x, v.y, 4, M.k); disco(g, v.x, v.y, 3, M.gO);
  };

  // El spreader y su caja viven en la casilla objetivo, asi que se
  // ordenan por profundidad con las pilas, no con la maquina.
  const dibujarSpreader = (g) => {
    const p = puntaBrazo();
    const sy = Math.round(p.y);
    if (st.carga) {
      dibujarContenedor(g, Math.round(p.x - TILE / 2), Math.round(p.y + ALTO_CAJA),
        st.carga.color, st.carga.integridad);
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
    g.globalAlpha = fuerte ? 0.18 : 0.1;
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

  // La casilla a la que apunta el spreader. El color dice si ahi se
  // puede hacer algo ahora mismo: aqua listo, ambar todavia no.
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

  const dibujarObjeto = (g, o) => {
    const x = o.col * TILE, base = o.fil * TILE + TILE - 2;
    if (o.ch === '#') g.drawImage(SPR.valla, x, base - 15);
    else if (o.ch === 'o') g.drawImage(SPR.cono, x, base - 15);
    else if (o.ch === 'P') g.drawImage(SPR.poste, x, base - 35);
    else if (o.ch === 'H') {
      const n = (charEn(o.col - 1, o.fil) === 'H' ? 1 : 0) | (charEn(o.col + 1, o.fil) === 'H' ? 2 : 0);
      g.drawImage(SPR.caseta[n], x, base - 31);
    }
  };

  const dibujarPila = (g, c, f, p) => {
    const x = c * TILE, base = f * TILE + TILE - 2;
    for (let i = 0; i < p.length; i++) {
      dibujarContenedor(g, x, base - i * ALTO_NIVEL, p[i].color, p[i].integridad);
    }
  };

  const render = () => {
    ctx.imageSmoothingEnabled = false;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, MUNDO_W, MUNDO_H);

    if (st.sacudida > 0 && !REDUCIDO) {
      const s = st.sacudida;
      ctx.translate(Math.round(Math.sin(st.reloj * 90) * s * 12), Math.round(Math.cos(st.reloj * 74) * s * 8));
    }

    ctx.drawImage(suelo, 0, 0);
    dibujarFaros(ctx);
    dibujarReversa(ctx);

    // Orden por profundidad: lo que apoya mas abajo en pantalla esta
    // mas cerca del ojo y tapa a lo que apoya mas arriba.
    const a = apoyoMaquina();
    const cosas = [];
    OBJETOS.forEach((o) => cosas.push({ y: o.fil * TILE + TILE - 2, pintar: () => dibujarObjeto(ctx, o) }));
    pilas.forEach((p, k) => {
      if (!p.length) return;
      const cf = k.split(',');
      const c = Number(cf[0]), f = Number(cf[1]);
      cosas.push({ y: f * TILE + TILE - 2, pintar: () => dibujarPila(ctx, c, f, p) });
    });
    // De perfil el boom pasa por ENCIMA del chasis y hay que verlo;
    // de frente y de espaldas apunta hacia dentro de la pantalla y
    // tiene que quedar DETRAS del cuerpo y de la pila a la que va,
    // o cruza la cabina de arriba abajo.
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

  const puedeSoltar = () => {
    if (!st.carga) return false;
    const o = objetivo();
    if (!dentro(o.col, o.fil)) return false;
    if (tileEn(o.col, o.fil).solido) return false;
    const n = alturaPila(o.col, o.fil);
    return n < PILA_MAX && st.altura >= n;
  };

  // Cuanto castiga soltar desde mas arriba del hueco que toca
  const caidaAlSoltar = () => {
    const o = objetivo();
    return Math.max(0, st.altura - alturaPila(o.col, o.fil));
  };

  const danarCarga = (puntos, motivo) => {
    if (!st.carga) return;
    st.carga.integridad = Math.max(0, st.carga.integridad - puntos);
    decir(motivo + ' ' + PUNTO + ' CARGA AL ' + st.carga.integridad + '%', true);
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

  const refrescar = () => {
    const r = RUMBOS[st.rumbo];
    const o = objetivo();
    lecPos.textContent = posTexto();
    lecRumbo.textContent = st.accion === 'reversa' ? r.letra + ' / ATRAS' : r.letra;
    lecAlcance.textContent = describir(o.col, o.fil);
    lecPasos.textContent = String(st.pasos);
    lecGolpes.textContent = String(st.golpes);
    brujula.textContent = FLECHAS[st.rumbo];

    pintarNiveles(nivAlcance, 3, st.alcance);
    pintarNiveles(nivAltura, PILA_MAX + 1, st.altura, alturaMax());
    txtAlcance.textContent = ALCANCES[st.alcance] + ' ' + PUNTO + ' ' + (st.alcance + 1) +
      (st.alcance ? ' CASILLAS' : ' CASILLA');
    txtAltura.textContent = 'NIVEL ' + st.altura + ' ' + PUNTO +
      (st.altura === 0 ? ' SUELO' : ' MAX ' + alturaMax());

    // el aviso del brazo cuenta lo que bloquea ahora mismo
    let aviso = 'MAS ALCANCE ES MENOS ALTURA';
    let mal = false;
    if (st.carga && st.altura >= 2) { aviso = 'BAJA LA CARGA PARA PODER CIRCULAR'; mal = true; }
    else if (st.carga && st.altura === 1) { aviso = 'CIRCULAR IZADO CASTIGA LA CARGA'; mal = true; }
    else if (st.altura > alturaMax()) { aviso = 'RECOGE EL BOOM PARA SUBIR MAS'; mal = true; }
    brazoAviso.textContent = aviso;
    brazoAviso.classList.toggle('is-mal', mal);

    const listo = st.carga ? puedeSoltar() : puedeEnganchar();
    txtTwist.textContent = st.carga ? 'SOLTAR' : 'ENGANCHAR';
    btnTwist.classList.toggle('is-cargado', !!st.carga);
    btnTwist.disabled = !listo && !st.carga;

    if (st.carga) {
      const c = st.carga;
      cargaQue.textContent = 'CONTENEDOR ' + COLORES_CAJA[c.color].nombre;
      cargaBarra.style.width = c.integridad + '%';
      cargaBarra.className = c.integridad > 60 ? '' : (c.integridad > 30 ? 'is-medio' : 'is-mal');
      const e = ESTADOS.find((x) => c.integridad >= x.min);
      cargaEstado.textContent = e.txt + ' ' + PUNTO + ' ' + c.integridad + '%';
    } else {
      cargaQue.textContent = 'SIN CARGA';
      cargaBarra.style.width = '100%';
      cargaBarra.className = '';
      cargaEstado.textContent = 'EL SPREADER VA VACIO';
    }
  };

  // ---------- acciones del brazo ----------
  const mover = (eje, paso) => {
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

  const twist = () => {
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
      decir('ENGANCHADO ' + PUNTO + ' CONTENEDOR ' + COLORES_CAJA[st.carga.color].nombre);
      refrescar();
      return;
    }
    // soltar
    if (!dentro(o.col, o.fil) || tileEn(o.col, o.fil).solido) {
      decir('AHI NO SE PUEDE POSAR', true); return;
    }
    const n = alturaPila(o.col, o.fil);
    if (n >= PILA_MAX) { decir('ESA PILA YA VA EN ' + PILA_MAX, true); return; }
    if (st.altura < n) { decir('SUBE AL NIVEL ' + n + ' PARA POSARLA ENCIMA', true); return; }
    const caida = caidaAlSoltar();
    if (caida > 0) danarCarga(DANO_CAIDA * caida, 'SOLTADA DESDE ' + caida + ' NIVEL' + (caida > 1 ? 'ES' : '') + ' MAS ARRIBA');
    const p = pilaEn(o.col, o.fil) || [];
    p.push(st.carga);
    pilas.set(llave(o.col, o.fil), p);
    st.carga = null;
    st.altura = Math.min(st.altura, alturaMax());
    if (!caida) decir('POSADA ' + PUNTO + ' NIVEL ' + n + ' DE LA PILA');
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
      if (st.carga) danarCarga(DANO_GOLPE, 'GOLPE CONTRA ' + describir(c, f));
      else decir('TOPETAZO CONTRA ' + describir(c, f), true);
    }
    refrescar();
  };

  const iniciar = (cmd) => {
    // con la carga en alto la maquina no arranca: a nivel 2 o mas es
    // riesgo de vuelco, y en obra sencillamente no se hace
    if (st.carga && st.altura >= 2) {
      decir('BAJA LA CARGA A NIVEL 0 O 1 PARA CIRCULAR', true);
      return;
    }

    if (cmd === 'izq' || cmd === 'der') {
      st.giroDesde = st.rumbo;
      st.rumbo = (st.rumbo + (cmd === 'izq' ? 3 : 1)) % 4;
      st.accion = 'giro';
      st.t = 0;
      st.dur = T_GIRO * (st.carga ? LASTRE : 1);
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
    st.dur = (cmd === 'avanzar' ? T_AVANCE : T_REVERSA) * (st.carga ? LASTRE : 1);
    st.pasos++;
    soltarHumo(cmd === 'reversa');
    tributoDeCarga();
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

  // Solo se acepta orden nueva con la maquina quieta. Si llega en
  // plena maniobra se guarda una y se dispara al terminar: eso es
  // lo que hace que mantener la tecla encadene casillas sin saltos.
  const ordenar = (cmd) => {
    if (st.accion) { st.buffer = cmd; return; }
    iniciar(cmd);
  };

  const avanzarTiempo = (dt) => {
    st.reloj += dt;
    st.tGolpe += dt;
    if (st.sacudida > 0) st.sacudida = Math.max(0, st.sacudida - dt * 3.4);

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
    const e = Math.max(1, Math.floor(Math.min(dispW / MUNDO_W, dispH / MUNDO_H)));
    canvas.style.width = (MUNDO_W * e) + 'px';
    canvas.style.height = (MUNDO_H * e) + 'px';
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

  const reiniciar = () => {
    st.col = INICIO.col; st.fil = INICIO.fil; st.rumbo = INICIO.rumbo;
    st.desdeCol = INICIO.col; st.desdeFil = INICIO.fil;
    st.accion = null; st.t = 0; st.dur = 0; st.buffer = null;
    st.alcance = 0; st.altura = 0; st.alcanceVis = 0; st.alturaVis = 0;
    st.carga = null; st.zarandeo = 0; st.quieto = 99;
    st.pasos = 0; st.golpes = 0; st.tGolpe = 99; st.sacudida = 0;
    st.humo.length = 0;
    CMDS.forEach((c) => { activos[c] = false; });
    sembrarPilas();
    decir('TURNO REINICIADO');
    refrescar();
  };

  document.addEventListener('keydown', (e) => {
    const k = e.key.toLowerCase();
    if (k === 'escape') { cerrarAyuda(); return; }
    if (k === 'h') { if ($('overlay').hidden) abrirAyuda(); else cerrarAyuda(); return; }
    if (!$('overlay').hidden) {
      if (k === 'enter' || k === ' ') { e.preventDefault(); cerrarAyuda(); }
      return;
    }
    if (k === 'r') { reiniciar(); return; }
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

  btnTwist.addEventListener('pointerdown', (e) => { e.preventDefault(); btnTwist.classList.add('is-press'); twist(); });
  ['pointerup', 'pointerleave', 'pointercancel'].forEach((ev) =>
    btnTwist.addEventListener(ev, () => btnTwist.classList.remove('is-press')));

  $('btn-entendido').addEventListener('click', cerrarAyuda);
  $('btn-ayuda').addEventListener('click', abrirAyuda);
  $('btn-reiniciar').addEventListener('click', reiniciar);
  window.addEventListener('resize', escalar);

  // ---------- loop ----------
  let last = performance.now();
  const tick = (now) => {
    requestAnimationFrame(tick);
    const dt = Math.max(0, Math.min((now - last) / 1000, 0.05));
    last = now;
    avanzarTiempo(dt);
    render();
  };

  // ---------- arranque ----------
  cocerTodo();
  listarObjetos();
  sembrarPilas();
  hornearSuelo();
  escalar();
  refrescar();
  requestAnimationFrame(tick);
})();
