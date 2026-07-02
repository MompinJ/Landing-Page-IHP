// ============================================================
// DATOS: Dinámica "El Semáforo"
// Las imagenes (assets/Tarjetas-Dinamica-Semaforo/) ya traen el
// escenario rotulado. correctColor / justification son la clave de
// respuesta del facilitador, redactada con criterios de la NOM-035.
// correctColor: 'verde' | 'amarillo' | 'rojo'
// pos: top/left en % de la mesa, r = inclinacion, z = apilado, scl = escala.
// ============================================================

const IMG = 'assets/Tarjetas-Dinamica-Semaforo';

export const CARDS = [
  {
    id: 1, title: 'Tarjeta 1', image: `${IMG}/Tarjeta%201.jpeg`,
    description: 'Durante una maniobra complicada, el supervisor escucha las recomendaciones del equipo antes de tomar una decisión.',
    correctColor: 'verde',
    justification: 'Verde: el liderazgo participativo y la escucha activa refuerzan el sentido de control y pertenencia del equipo. Es un entorno organizacional favorable, justo lo que la NOM-035 busca promover.',
    pos: { top: '4%', left: '2%', r: '-9deg', z: 2, scl: 0.92 },
  },
  {
    id: 2, title: 'Tarjeta 2', image: `${IMG}/Tarjeta%202.jpeg`,
    description: 'Un trabajador lleva varias semanas cubriendo turnos adicionales porque falta personal.',
    correctColor: 'rojo',
    justification: 'Rojo: la carga de trabajo excesiva y sostenida por falta de personal rebasa la capacidad del trabajador y no permite su recuperación. Es un factor de riesgo psicosocial que la NOM-035 obliga a identificar y controlar.',
    pos: { top: '1%', left: '26%', r: '5deg', z: 4, scl: 0.90 },
  },
  {
    id: 3, title: 'Tarjeta 3', image: `${IMG}/Tarjeta%203.jpeg`,
    description: 'Durante una reunión de trabajo, el supervisor toma decisiones sin considerar las opiniones o sugerencias del equipo.',
    correctColor: 'rojo',
    justification: 'Rojo: decidir sin considerar al equipo refleja falta de control sobre el trabajo y un liderazgo deficiente. El trabajador no puede influir en decisiones que le afectan, un factor de riesgo psicosocial reconocido por la NOM-035.',
    pos: { top: '6%', left: '50%', r: '-4deg', z: 3, scl: 0.95 },
  },
  {
    id: 4, title: 'Tarjeta 4', image: `${IMG}/Tarjeta%204.jpeg`,
    description: 'El equipo tiene reuniones breves para aclarar dudas antes de iniciar actividades.',
    correctColor: 'verde',
    justification: 'Verde: la comunicación clara y oportuna reduce la ambigüedad de rol y la incertidumbre antes de operar. Es una práctica que sostiene un entorno organizacional saludable.',
    pos: { top: '2%', left: '72%', r: '9deg', z: 5, scl: 0.93 },
  },
  {
    id: 5, title: 'Tarjeta 5', image: `${IMG}/Tarjeta%205.png`,
    description: 'Durante el turno, el supervisor cambia las instrucciones de la maniobra varias veces y sin explicar el motivo; el equipo ya no sabe cuál versión seguir.',
    correctColor: 'amarillo',
    justification: 'Amarillo: los cambios constantes de instrucciones sin explicación generan falta de control y ambigüedad de rol. Es una condición a vigilar y corregir con comunicación oportuna antes de que se vuelva un factor de riesgo activo.',
    pos: { top: '27%', left: '13%', r: '7deg', z: 6, scl: 0.97 },
  },
  {
    id: 6, title: 'Tarjeta 6', image: `${IMG}/Tarjeta%206.jpeg`,
    description: 'Dos compañeros tuvieron una diferencia de opinión, pero la resolvieron respetuosamente.',
    correctColor: 'verde',
    justification: 'Verde: resolver diferencias con respeto refleja relaciones laborales positivas y buen trabajo en equipo. El apoyo social entre compañeros es un elemento protector que promueve la NOM-035.',
    pos: { top: '34%', left: '37%', r: '-7deg', z: 8, scl: 0.96 },
  },
  {
    id: 7, title: 'Tarjeta 7', image: `${IMG}/Tarjeta%207.jpeg`,
    description: 'Un trabajador no se siente parte del grupo porque cuando expresa su opinión no es tomada en cuenta.',
    correctColor: 'rojo',
    justification: 'Rojo: no sentirse parte del grupo y que su voz no se tome en cuenta indica relaciones laborales negativas y falta de apoyo social, un factor de riesgo psicosocial que afecta el bienestar del trabajador.',
    pos: { top: '25%', left: '59%', r: '3deg', z: 7, scl: 1.0 },
  },
  {
    id: 8, title: 'Tarjeta 8', image: `${IMG}/Tarjeta%208.jpeg`,
    description: 'Un operador lleva meses sin recibir retroalimentación sobre su desempeño y no sabe si va bien.',
    correctColor: 'amarillo',
    justification: 'Amarillo: la ausencia de retroalimentación es una deficiencia de liderazgo que conviene atender antes de que desgaste la motivación y el sentido de logro. Es una condición a vigilar y mejorar.',
    pos: { top: '32%', left: '74%', r: '-10deg', z: 9, scl: 0.95 },
  },
  {
    id: 9, title: 'Tarjeta 9', image: `${IMG}/Tarjeta%209.jpeg`,
    description: 'Un trabajador recibe una nueva responsabilidad, pero no le explican claramente qué se espera de él ni quién puede apoyarlo.',
    correctColor: 'rojo',
    justification: 'Rojo: asignar responsabilidades sin definir qué se espera ni quién apoya genera ambigüedad de rol y falta de control sobre el trabajo, un factor de riesgo psicosocial que la NOM-035 pide prevenir.',
    pos: { top: '57%', left: '5%', r: '-3deg', z: 10, scl: 1.0 },
  },
  {
    id: 10, title: 'Tarjeta 10', image: `${IMG}/Tarjeta%2010.jpeg`,
    description: 'El equipo logra terminar una actividad compleja, pero nadie reconoce el esfuerzo realizado.',
    correctColor: 'amarillo',
    justification: 'Amarillo: la falta de reconocimiento no daña de inmediato, pero desgasta la motivación con el tiempo. Es una condición a corregir para sostener un entorno laboral saludable.',
    pos: { top: '61%', left: '29%', r: '8deg', z: 12, scl: 1.02 },
  },
  {
    id: 11, title: 'Tarjeta 11', image: `${IMG}/Tarjeta%2011.jpeg`,
    description: 'Cuando surge un problema operativo, los compañeros colaboran para encontrar una solución sin buscar culpables.',
    correctColor: 'verde',
    justification: 'Verde: colaborar para resolver problemas sin buscar culpables refleja apoyo social y un clima de confianza. Es un entorno organizacional favorable según la NOM-035.',
    pos: { top: '55%', left: '51%', r: '-8deg', z: 11, scl: 1.0 },
  },
  {
    id: 12, title: 'Tarjeta 12', image: `${IMG}/Tarjeta%2012.jpeg`,
    description: 'El área tiene rotación constante de personal y nadie explica por qué salen los compañeros.',
    correctColor: 'rojo',
    justification: 'Rojo: la rotación alta y sin explicación suele ser señal de factores de riesgo psicosocial no atendidos (carga de trabajo, liderazgo o relaciones laborales). Requiere análisis y acción conforme a la NOM-035.',
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
