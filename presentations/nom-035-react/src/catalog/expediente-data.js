// ============================================================
// DATOS: Dinámica "El Expediente NOM-035" (Identificación de factores)
// FACTORS: los 6 factores de riesgo psicosocial. color = marcatextos.
// CASES: cada caso = segmentos de texto; un segmento con f:<id> es la
//   frase que revela ese factor (se subraya con su color al descubrirlo).
// TIPS: pista de auditor por factor (ciclo del pizarrón).
// ============================================================

export const FACTORS = [
  { id: 1, name: 'Condiciones del ambiente de trabajo', color: '#F2C230' },
  { id: 2, name: 'Carga de trabajo excesiva', color: '#4FB8E0' },
  { id: 3, name: 'Falta de control sobre el trabajo', color: '#66C07A' },
  { id: 4, name: 'Liderazgo negativo', color: '#E2574C' },
  { id: 5, name: 'Relaciones laborales negativas', color: '#B588D9' },
  { id: 6, name: 'Violencia laboral', color: '#EE9A3A' },
];

export const TIPS = {
  1: 'Ruido, iluminación, temperatura, químicos o riesgos físicos que dañan al trabajador.',
  2: 'Exigencias cuantitativas o ritmos que superan lo que se puede hacer en el tiempo dado.',
  3: 'El trabajador no puede decidir cómo, cuándo o en qué orden hace su tarea, aunque esté capacitado.',
  4: 'Trato hostil, gritos, falta de claridad o nulo reconocimiento por parte del jefe.',
  5: 'Conflictos, aislamiento o falta de apoyo entre compañeros.',
  6: 'Hostigamiento, acoso, malos tratos o exclusión intencional.',
};

// s = segmento de texto; { t } normal, { t, f } frase que revela el factor f.
export const CASES = [
  {
    id: 1, name: 'JUAN', code: 'EXP-01',
    segments: [
      { t: 'Un trabajador con más de 20 años de experiencia, ha notado ' },
      { t: 'un aumento significativo en su carga de trabajo en los últimos meses, se siente constantemente presionado para cumplir con cuotas de producción cada vez más altas', f: 2 },
      { t: ', lo que le genera un estrés considerable, además ha observado ' },
      { t: 'un aumento en los conflictos con sus compañeros de trabajo', f: 5 },
      { t: ' debido a ' },
      { t: 'la competencia por los turnos y la asignación de tareas', f: 3 },
      { t: '.' },
    ],
  },
  {
    id: 2, name: 'MARÍA', code: 'EXP-02',
    segments: [
      { t: 'Es supervisora de turno en una terminal. Recientemente ' },
      { t: 'ha asumido nuevas responsabilidades, lo que ha aumentado su carga de trabajo', f: 2 },
      { t: ' y ' },
      { t: 'la presión por tomar decisiones rápidas', f: 3 },
      { t: '; se siente abrumada por ' },
      { t: 'la responsabilidad de garantizar la seguridad de su equipo y el cumplimiento de los plazos de entrega', f: 3 },
      { t: '.' },
    ],
  },
  {
    id: 3, name: 'PEDRO', code: 'EXP-03',
    segments: [
      { t: 'Trabaja en el departamento de Mantenimiento de una terminal, a menudo ' },
      { t: 'se siente aislado de sus compañeros de trabajo debido a la naturaleza de sus tareas', f: 5 },
      { t: ', además, trabaja en ' },
      { t: 'condiciones ambientales difíciles con exposiciones a ruidos fuertes y vibraciones', f: 1 },
      { t: '; ha expresado sentirse desmotivado y con poca valoración por parte de sus superiores.' },
    ],
  },
];

// factores presentes por caso (derivado de los segmentos, en orden)
export function caseFactors(c) {
  const seen = [];
  for (const s of c.segments) if (s.f && !seen.includes(s.f)) seen.push(s.f);
  return seen;
}
