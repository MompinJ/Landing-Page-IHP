// ============================================================
// DATOS: Dinamica "El Swipe Corporativo"
// CASES: situaciones a clasificar. side = clave de respuesta del
//   facilitador: 'fav' (condicion favorable) | 'des' (desfavorable).
//   body: lineas del caso; una linea que empieza con "• " es vineta.
// FACTS: datos breves de la fase Bascula, uno por minuto. side inclina
//   el balancin: 'fav' (izquierda) | 'des' (derecha).
// ============================================================

export const CASES = [
  {
    id: 1, title: 'Situación Laboral 1', side: 'des',
    body: [
      'En el turno nocturno de una Unidad de Negocio se están realizando maniobras con:',
      '• Iluminación insuficiente, lo que dificulta la visibilidad al operar maquinaria pesada como grúas y montacargas.',
      '• Derrames frecuentes de aceite y residuos industriales en las zonas de tránsito, sin que se realice una limpieza oportuna.',
      '• Fuertes olores químicos provenientes de contenedores mal sellados, generando molestias físicas como mareos y dolor de cabeza.',
      '• Estructuras metálicas deterioradas, generando riesgo de golpes o accidentes.',
      'A pesar de los reportes, el supervisor indica continuar operaciones.',
      'Como resultado, el personal presenta estrés, fatiga y sensación de inseguridad, generando tensión y menor desempeño.',
    ],
  },
  {
    id: 2, title: 'Situación Laboral 2', side: 'des',
    body: [
      'Durante varias semanas, el equipo ha tenido que trabajar a un ritmo muy alto.',
      'El supervisor asigna múltiples tareas urgentes al mismo tiempo y no hay pausas suficientes.',
      'Los trabajadores comienzan a:',
      '• sentirse agotados',
      '• cometer errores',
      '• frustrarse',
    ],
  },
  {
    id: 3, title: 'Situación Laboral 3', side: 'des',
    body: [
      'En una terminal portuaria, el personal sindicalizado recibe instrucciones constantes y cambiantes de diferentes personas sobre cómo ejecutar sus tareas.',
      '• No pueden decidir el orden ni ritmo de trabajo.',
      '• Se modifican indicaciones sin explicación.',
      '• No se les permite opinar ni proponer mejoras.',
      '• Cualquier ajuste por seguridad es rechazado.',
      'Como consecuencia, los trabajadores muestran confusión, frustración, desmotivación y estrés, además de cometer errores por falta de claridad.',
    ],
  },
  {
    id: 4, title: 'Situación Laboral 4', side: 'fav',
    body: [
      'En una terminal portuaria, durante el turno matutino, el personal inicia operaciones con una breve plática:',
      '• El supervisor explica de forma clara las tareas, roles y riesgos de la jornada.',
      '• Se verifica que todos cuenten con EPP completo y en buen estado.',
      '• Entre compañeros existe apoyo y trato respetuoso, especialmente en maniobras críticas.',
      'Durante la jornada, un trabajador detecta un riesgo y lo comunica; el equipo ajusta la operación sin conflictos ni presión.',
      'Como resultado, el personal trabaja con confianza, seguridad y colaboración, manteniendo un ambiente positivo y eficiente.',
    ],
  },
  {
    id: 5, title: 'Situación Laboral 5', side: 'des',
    body: [
      'Un supervisor constantemente actúa impositivamente, levanta la voz, presiona al equipo, señala errores frente a todos y nunca reconoce el buen desempeño.',
      'Como consecuencia, el personal evita hablar, trabaja con miedo y desmotivación, y se logra sentir una constante tensión en el ambiente.',
    ],
  },
  {
    id: 6, title: 'Situación Laboral 6', side: 'des',
    body: [
      'En un área hay conflictos constantes entre compañeros.',
      'No se apoyan y hay discusiones frecuentes.',
      'Esto ha traído como resultado:',
      '• Ambiente tenso y de desconfianza.',
      '• Errores que nadie asume, señalando culpables.',
      '• Falta de colaboración.',
      '• División del área.',
      '• Baja productividad.',
    ],
  },
  {
    id: 7, title: 'Situación Laboral 7', side: 'fav',
    body: [
      'Durante la jornada, ante una situación operativa compleja, el equipo colabora y resuelve de forma segura y eficiente.',
      'El supervisor:',
      '• Explica de forma respetuosa y precisa las actividades y responsabilidades.',
      '• Escucha al equipo.',
      '• Reconoce el buen desempeño y brinda retroalimentación oportuna.',
      'Como resultado, el personal muestra confianza, motivación y sentido de equipo, manteniendo un ambiente laboral positivo y productivo.',
    ],
  },
  {
    id: 8, title: 'Situación Laboral 8', side: 'des',
    body: [
      'En un equipo de trabajo de personal sindicalizado, algunos trabajadores comienzan a ejercer presión sobre un compañero:',
      '• Se burlan constantemente de su desempeño.',
      '• Le asignan las tareas más pesadas de forma intencional.',
      '• Difunden comentarios como: "No sirve para este trabajo".',
      '• Lo excluyen de la comunicación operativa.',
      'Además, cuando el trabajador intenta integrarse o pedir apoyo, es ignorado por los compañeros. Como consecuencia, presenta estrés, inseguridad y desmotivación, mientras el ambiente se vuelve tenso y poco colaborativo.',
    ],
  },
];

// Retroalimentacion del facilitador por caso (el "por que" segun NOM-035).
export const FEEDBACK = {
  1: 'Desfavorable: condiciones físicas peligrosas (iluminación, derrames, químicos, estructuras) que se reportan pero no se corrigen. Es un factor de riesgo del entorno de trabajo.',
  2: 'Desfavorable: cargas de trabajo excesivas y sin pausas suficientes. La sobrecarga sostenida es un factor de riesgo psicosocial.',
  3: 'Desfavorable: nula participación y falta de control sobre el propio trabajo, con indicaciones cambiantes. Afecta la organización del trabajo.',
  4: 'Favorable: liderazgo claro, EPP en regla, apoyo entre compañeros y comunicación de riesgos. Condiciones que promueven el bienestar.',
  5: 'Desfavorable: liderazgo impositivo, gritos y falta de reconocimiento. Es un estilo de liderazgo negativo y un factor de riesgo.',
  6: 'Desfavorable: malas relaciones, conflictos y falta de apoyo social en el trabajo. Deteriora el ambiente y la productividad.',
  7: 'Favorable: liderazgo positivo, escucha, reconocimiento y trabajo en equipo. Condición que favorece la salud psicosocial.',
  8: 'Desfavorable: hostigamiento, exclusión y malos tratos hacia un compañero. Es violencia laboral, un factor de riesgo grave.',
};

export const FACTS = [
  { side: 'fav', text: 'El reconocimiento oportuno reduce la rotación de personal hasta en 31%.' },
  { side: 'des', text: 'La ambigüedad de rol es una de las causas #1 de conflicto interno.' },
  { side: 'fav', text: 'Comunicar con claridad tareas y riesgos disminuye los accidentes.' },
  { side: 'des', text: 'La carga de trabajo sin pausas eleva el estrés y los errores operativos.' },
  { side: 'fav', text: 'El apoyo entre compañeros mejora el clima y la productividad.' },
  { side: 'des', text: 'El liderazgo impositivo genera miedo y silencia los reportes de seguridad.' },
  { side: 'fav', text: 'Escuchar y dar retroalimentación aumenta la motivación del equipo.' },
  { side: 'des', text: 'El hostigamiento y la exclusión deterioran la salud psicosocial.' },
  { side: 'fav', text: 'Permitir proponer mejoras de seguridad fortalece la confianza.' },
];
