// ============================================================
// DATOS: Dinámica "Auditoría Sorpresa" (Obligaciones NOM-035)
// OBLIG_PATRON / OBLIG_TRABAJADOR: las tiras recortables.
// CASES: micro-caso + lado responsable + tira correcta (answer) + por qué.
// ============================================================

export const OBLIG_PATRON = [
  { id: 'p1', t: 'Establecer y difundir política de prevención de riesgos psicosociales.' },
  { id: 'p2', t: 'Identificar los factores de riesgo psicosocial.' },
  { id: 'p3', t: 'Evaluar el entorno organizacional.' },
  { id: 'p4', t: 'Implementar medidas de prevención.' },
  { id: 'p5', t: 'Establecer medidas para controlar los factores de riesgo psicosocial.' },
  { id: 'p6', t: 'Identificar eventos traumáticos severos.' },
  { id: 'p7', t: 'Realizar evaluaciones médicas y psicológicas.' },
  { id: 'p8', t: 'Difundir información sobre la NOM-035.' },
  { id: 'p9', t: 'Proporcionar capacitación.' },
];

export const OBLIG_TRABAJADOR = [
  { id: 't1', t: 'Seguir las medidas de prevención.' },
  { id: 't2', t: 'Respetar a compañeros y evitar conflictos.' },
  { id: 't3', t: 'Abstenerse de realizar actos de violencia laboral.' },
  { id: 't4', t: 'Participar en evaluaciones relacionadas con la NOM-035.' },
  { id: 't5', t: 'Informar riesgos y actos contra el entorno laboral saludable.' },
  { id: 't6', t: 'Denunciar actos de violencia laboral.' },
  { id: 't7', t: 'Informar eventos traumáticos severos.' },
  { id: 't8', t: 'Asistir a capacitaciones.' },
  { id: 't9', t: 'Participar activamente en cualquier evento relacionado a la NOM-035.' },
];

// mapa id -> tira (para el reveal)
export const OBLIG = Object.fromEntries(
  [...OBLIG_PATRON.map(o => [o.id, { ...o, side: 'patron' }]),
  ...OBLIG_TRABAJADOR.map(o => [o.id, { ...o, side: 'trabajador' }])]
);

export const CASES = [
  {
    id: 1, answer: 'p1',
    text: 'La terminal tiene una política de prevención de riesgos psicosociales firmada por la dirección, pero vive en un PDF que nadie abrió: los operadores de patio ni saben que existe.',
    why: 'No basta con tener la política; el patrón debe establecerla y difundirla. Una política que nadie conoce no previene nada.',
  },
  {
    id: 2, answer: 't8',
    text: 'La empresa organizó un taller sobre manejo de conflictos, pero el departamento de mantenimiento decidió no ir porque "tenían mucho trabajo".',
    why: 'Aquí la empresa sí cumplió al capacitar; el incumplimiento es del trabajador, que debe asistir y participar.',
  },
  {
    id: 3, answers: ['p3', 't4'],
    text: 'El cuestionario para evaluar el entorno organizacional no se volvió a aplicar este año; y de la vez pasada, la mitad de los operadores nunca lo contestaron.',
    why: 'Responsabilidad compartida: el patrón debe evaluar el entorno organizacional aplicando el cuestionario, y el trabajador debe participar y contestarlo. Si cualquiera de los dos falla, no hay diagnóstico.',
  },
  {
    id: 4, answer: 't3',
    text: 'Dos operadores tienen un conflicto y uno comienza a esparcir rumores y burlas sobre el otro frente a todo el equipo.',
    why: 'El trabajador debe abstenerse de actos de violencia laboral y respetar a sus compañeros. La conducta es responsabilidad de quien la ejerce.',
  },
  {
    id: 5, answer: 'p7',
    text: 'Tras un accidente grave en el patio, la empresa no revisó ni ofreció apoyo psicológico a los trabajadores que lo presenciaron.',
    why: 'Ante un evento traumático severo, el patrón debe identificarlo y realizar las evaluaciones médicas y psicológicas necesarias.',
  },
  {
    id: 6, answer: 't5',
    text: 'Un trabajador nota que cierta zona genera mucho estrés y riesgo, pero no lo comenta ni lo reporta a nadie.',
    why: 'El trabajador debe informar los riesgos y actos que dañan el entorno laboral saludable; callar impide corregir a tiempo.',
  },
  {
    id: 7, answer: 'p4',
    text: 'La evaluación del entorno detectó que el turno nocturno del patio vive con sobrecarga y fatiga alta. Un año después, no se implementó ni una sola medida para reducirla.',
    why: 'El patrón no solo debe detectar los riesgos: está obligado a implementar medidas de prevención. Diagnosticar sin actuar deja el riesgo intacto.',
  },
  {
    id: 8, answer: 't6',
    text: 'Un jefe de turno humilla y grita a un operador frente a todos, seguido. Varios compañeros lo presencian, pero nadie lo denuncia por miedo a represalias.',
    why: 'El trabajador debe denunciar los actos de violencia laboral que presencia. Callar por miedo permite que el hostigamiento continúe.',
  },
];
