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
    id: 1, answer: 'p8',
    text: 'Hace un mes instalaron nueva maquinaria ruidosa, pero nadie le ha explicado a los operadores cómo afecta su estrés ni se ha dado entrenamiento sobre la NOM-035.',
    why: 'El patrón debe difundir información y capacitar sobre la NOM-035. Si no la difunde, el trabajador no puede cumplir su parte. (También aplica "Proporcionar capacitación").',
  },
  {
    id: 2, answer: 't8',
    text: 'La empresa organizó un taller sobre manejo de conflictos, pero el departamento de mantenimiento decidió no ir porque "tenían mucho trabajo".',
    why: 'Aquí la empresa sí cumplió al capacitar; el incumplimiento es del trabajador, que debe asistir y participar.',
  },
  {
    id: 3, answer: 'p3',
    text: 'Nunca se ha aplicado ningún cuestionario ni revisión para conocer cómo está el ambiente de trabajo en la terminal.',
    why: 'El patrón está obligado a identificar los factores y evaluar el entorno organizacional. Sin evaluación no hay diagnóstico.',
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
];
