// ============================================================
// CATALOGO: paleta + repertorio de figuras validas (clip-path)
// Pensado 16:9, angulo de marca 30.3. Un editor elegiria de aqui.
// ============================================================

export const PALETTE = {
  sky:     '#009BDE',  // Ports Sky Blue
  sea:     '#002E6D',  // Ports Sea Blue
  horizon: '#9ACAEB',  // Ports Horizon Blue
  aqua:    '#54BBAB',  // Ports Aqua Green
  sunray:  '#FFC627',  // Ports Sunray Yellow
  sunset:  '#EE7523',  // Ports Sunset Orange
  steel:   '#AEBCC8',  // gris azulado auxiliar
  band:    '#3E86C6',  // azul medio (banda portada)
  paper:   '#ffffff',
};

// Siluetas con nombre (clip-path). Tambien se acepta un clip-path crudo.
export const SHAPES = {
  // mision (derecha)
  'sky-tr':   'polygon(50% 0, 100% 0, 100% 42%, 48% 62%)',
  'steel-tr': 'polygon(75% 20%, 100% 8%, 100% 48%, 75% 60%)',
  // contenido-izquierda: formas que abren el area blanca a la derecha
  'sky-tl':   'polygon(0 0, 64% 0, 58% 28%, 0 62%)',
  'steel-bl': 'polygon(0 62%, 58% 28%, 42% 100%, 0 100%)',
  // contenido-derecha: espejo horizontal de las anteriores
  'cnt-tr':   'polygon(100% 0, 36% 0, 42% 28%, 100% 62%)',
  'cnt-br':   'polygon(100% 62%, 42% 28%, 58% 100%, 100% 100%)',
  // divisor (cuelgan de arriba-derecha)
  'aqua-hang': 'polygon(45% 0, 100% 0, 100% 18%, 45% 75%)',
  'sky-hang':  'polygon(58% 0, 100% 0, 100% 53%, 58% 97%)',
  // portada (comparte el filo de la foto)
  'band-portada': 'polygon(47% 0, 75% 0, 57.14% 100%, 29.14% 100%)',
  // intro NOM-035: bandera amarilla (izq) + paralelogramo azul que la cruza
  'nom-yellow': 'polygon(2.5% 5%, 55.6% 5%, 23% 88%, 2.5% 88%)',
  'nom-blue':   'polygon(34% 17%, 59% 17%, 43% 83%, 18% 83%)',
  // objetivo: cuña blanca que abre la esquina superior izquierda sobre el amarillo
  'nom2-white': 'polygon(0 0, 62% 0, 0 88%)',
  // que es: cuña blanca en la esquina inferior derecha (mismo angulo, espejo)
  'nom3-white': 'polygon(100% 30%, 100% 100%, 52% 100%)',
  // pregunta: cuña azul (horizon) en la esquina superior izquierda
  'nom4-blue': 'polygon(0 0, 72% 0, 0 82%)',
  // factores: cuña blanca en la esquina inferior derecha sobre fondo azul
  'nom5-white': 'polygon(100% 55%, 100% 100%, 47% 100%)',
  // factor N: paralelogramo amarillo a la derecha (se sale por derecha/abajo)
  'nom6-yellow': 'polygon(56% 18%, 118% 18%, 100% 112%, 38% 112%)',
  // pregunta factor: cuña blanca en la esquina superior izquierda sobre azul
  'nom7-white': 'polygon(0 0, 50% 0, 0 40%)',
  // factor: franja amarilla diagonal (banda) a la derecha, con blanco a los lados
  'nom8-yellow-band': 'polygon(62% 0, 92% 0, 74% 100%, 44% 100%)',
  // caracteristicas clave: cuña blanca superior izquierda (mas grande)
  'nom9-white': 'polygon(0 0, 62% 0, 0 45%)',
  // responsabilidad: dos paralelogramos arriba-derecha (aqua + navy)
  'resp-aqua': 'polygon(46% 0, 78% 0, 60% 48%, 28% 48%)',
  'resp-navy': 'polygon(74% 6%, 116% 6%, 99% 48%, 57% 48%)',
  // dos bandas diagonales (ignorar / comparaciones) sobre blanco
  'k2-horizon': 'polygon(0 0, 66% 0, 0 82%)',
  'k2-sky': 'polygon(70% 0, 108% 0, 70% 100%, 32% 100%)',
  // cierre GRACIAS: banda aqua diagonal (paralelogramo) a la derecha
  'nom10-band': 'polygon(57% 0, 100% 0, 80% 100%, 38% 100%)',
  // cuadrantes diagonales (obligados a cumplir): teselan el lienzo en 4
  'q-blue':   'polygon(0 0, 55% 0, 52.6% 30%, 0 74%)',
  'q-gray':   'polygon(0 74%, 52.6% 30%, 47% 100%, 0 100%)',
  'q-teal':   'polygon(55% 0, 100% 0, 100% 52%, 48.3% 84%)',
  'q-yellow': 'polygon(48.3% 84%, 100% 52%, 100% 100%, 47% 100%)',
};

export const resolveClip = (s) => SHAPES[s] || s;
export const resolveColor = (c) => PALETTE[c] || c;
