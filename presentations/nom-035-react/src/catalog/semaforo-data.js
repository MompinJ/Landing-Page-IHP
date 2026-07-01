// ============================================================
// DATOS: Dinámica "El Semáforo"
// Las imagenes (assets/Tarjetas-Dinamica-Semaforo/) ya traen el
// escenario rotulado. correctColor / justification son la clave de
// respuesta del facilitador (PLACEHOLDER hasta tener la oficial).
// correctColor: 'verde' | 'amarillo' | 'rojo'
// pos: top/left en % de la mesa, r = inclinacion, z = apilado, scl = escala.
// ============================================================

const IMG = 'assets/Tarjetas-Dinamica-Semaforo';

export const CARDS = [
  {
    id: 1, title: 'Tarjeta 1', image: `${IMG}/Tarjeta%201.jpeg`,
    description: 'Durante una maniobra complicada, el supervisor escucha las recomendaciones del equipo antes de tomar una decisión.',
    correctColor: 'verde',
    justification: '[PLACEHOLDER] Verde: el liderazgo participativo y la escucha activa favorecen el bienestar psicosocial.',
    pos: { top: '4%', left: '2%', r: '-9deg', z: 2, scl: 0.92 },
  },
  {
    id: 2, title: 'Tarjeta 2', image: `${IMG}/Tarjeta%202.jpeg`,
    description: 'Un trabajador lleva varias semanas cubriendo turnos adicionales porque falta personal.',
    correctColor: 'rojo',
    justification: '[PLACEHOLDER] Rojo: la carga de trabajo sostenida por falta de personal es un factor de riesgo activo.',
    pos: { top: '1%', left: '26%', r: '5deg', z: 4, scl: 0.90 },
  },
  {
    id: 3, title: 'Tarjeta 3', image: `${IMG}/Tarjeta%203.jpeg`,
    description: 'Durante una reunión de trabajo, el supervisor toma decisiones sin considerar las opiniones o sugerencias del equipo.',
    correctColor: 'rojo',
    justification: '[PLACEHOLDER] Rojo: la falta de participación en decisiones que afectan al equipo es un riesgo psicosocial.',
    pos: { top: '6%', left: '50%', r: '-4deg', z: 3, scl: 0.95 },
  },
  {
    id: 4, title: 'Tarjeta 4', image: `${IMG}/Tarjeta%204.jpeg`,
    description: 'El equipo tiene reuniones breves para aclarar dudas antes de iniciar actividades.',
    correctColor: 'verde',
    justification: '[PLACEHOLDER] Verde: la comunicación clara y oportuna reduce la incertidumbre y favorece el clima laboral.',
    pos: { top: '2%', left: '72%', r: '9deg', z: 5, scl: 0.93 },
  },
  {
    id: 5, title: 'Tarjeta 5', image: `${IMG}/Tarjeta%205.png`,
    description: 'Escenario laboral de la Tarjeta 5.',
    correctColor: 'amarillo',
    justification: '[PLACEHOLDER] Amarillo: condición a monitorear que puede mejorar con intervención oportuna.',
    pos: { top: '27%', left: '13%', r: '7deg', z: 6, scl: 0.97 },
  },
  {
    id: 6, title: 'Tarjeta 6', image: `${IMG}/Tarjeta%206.jpeg`,
    description: 'Dos compañeros tuvieron una diferencia de opinión, pero la resolvieron respetuosamente.',
    correctColor: 'verde',
    justification: '[PLACEHOLDER] Verde: el manejo respetuoso de diferencias indica un entorno sano de relaciones.',
    pos: { top: '34%', left: '37%', r: '-7deg', z: 8, scl: 0.96 },
  },
  {
    id: 7, title: 'Tarjeta 7', image: `${IMG}/Tarjeta%207.jpeg`,
    description: 'Un trabajador no se siente parte del grupo porque cuando expresa su opinión no es tomada en cuenta.',
    correctColor: 'rojo',
    justification: '[PLACEHOLDER] Rojo: la falta de pertenencia y de reconocimiento de la voz del trabajador es un riesgo.',
    pos: { top: '25%', left: '59%', r: '3deg', z: 7, scl: 1.0 },
  },
  {
    id: 8, title: 'Tarjeta 8', image: `${IMG}/Tarjeta%208.jpeg`,
    description: 'Un operador lleva meses sin recibir retroalimentación sobre su desempeño y no sabe si va bien.',
    correctColor: 'amarillo',
    justification: '[PLACEHOLDER] Amarillo: la ausencia de retroalimentación conviene atenderse antes de que escale.',
    pos: { top: '32%', left: '74%', r: '-10deg', z: 9, scl: 0.95 },
  },
  {
    id: 9, title: 'Tarjeta 9', image: `${IMG}/Tarjeta%209.jpeg`,
    description: 'Un trabajador recibe una nueva responsabilidad, pero no le explican claramente qué se espera de él ni quién puede apoyarlo.',
    correctColor: 'rojo',
    justification: '[PLACEHOLDER] Rojo: la falta de definición de funciones genera ambigüedad de rol, un riesgo psicosocial.',
    pos: { top: '57%', left: '5%', r: '-3deg', z: 10, scl: 1.0 },
  },
  {
    id: 10, title: 'Tarjeta 10', image: `${IMG}/Tarjeta%2010.jpeg`,
    description: 'El equipo logra terminar una actividad compleja, pero nadie reconoce el esfuerzo realizado.',
    correctColor: 'amarillo',
    justification: '[PLACEHOLDER] Amarillo: la falta de reconocimiento conviene corregirse para sostener la motivación.',
    pos: { top: '61%', left: '29%', r: '8deg', z: 12, scl: 1.02 },
  },
  {
    id: 11, title: 'Tarjeta 11', image: `${IMG}/Tarjeta%2011.jpeg`,
    description: 'Cuando surge un problema operativo, los compañeros colaboran para encontrar una solución sin buscar culpables.',
    correctColor: 'verde',
    justification: '[PLACEHOLDER] Verde: la colaboración orientada a soluciones refleja un clima de confianza y apoyo.',
    pos: { top: '55%', left: '51%', r: '-8deg', z: 11, scl: 1.0 },
  },
  {
    id: 12, title: 'Tarjeta 12', image: `${IMG}/Tarjeta%2012.jpeg`,
    description: 'El área tiene rotación constante de personal y nadie explica por qué salen los compañeros.',
    correctColor: 'rojo',
    justification: '[PLACEHOLDER] Rojo: la rotación alta sin explicación suele señalar factores de riesgo no atendidos.',
    pos: { top: '60%', left: '73%', r: '4deg', z: 13, scl: 0.98 },
  },
];

// Pistas del carrusel. image: null = solo texto; poner ruta para mostrar foto de ayuda.
export const HINTS = [
  { tag: 'Frecuencia',  text: '¿La situación es recurrente o es un hecho aislado?',           image: null },
  { tag: 'Verde',       text: 'Verde — el entorno favorece el bienestar y la productividad.',   image: null },
  { tag: 'Amarillo',    text: 'Amarillo — condición a monitorear que puede mejorar pronto.',    image: null },
  { tag: 'Rojo',        text: 'Rojo — factor de riesgo que requiere acción inmediata.',         image: null },
  { tag: 'Alcance',     text: '¿Afecta a un solo trabajador o a todo el equipo?',               image: null },
  { tag: 'Contexto',    text: 'El contexto y la frecuencia son clave para clasificar.',         image: null },
];
