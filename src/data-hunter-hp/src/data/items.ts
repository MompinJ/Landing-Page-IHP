import type { ZoneTheme } from '../world/rows';

/**
 * Vocabulario de las tarjetas — la lista curada de "Palabras del juego",
 * 349 términos repartidos POR TERMINAL.
 *
 * Cada unidad de negocio tiene sus propios temas, y esa asignación es la que
 * manda: cruzar TEC te pregunta por ciberseguridad y tecnología, ECV por
 * nomenclatura naval y bienestar, TNG por filosofía HP y seguridad operativa.
 * Antes el vocabulario era común a las cinco y el mensaje que te tocaba
 * dependía del azar del mapa; ahora la terminal que cruzas es la que habla.
 *
 * Van AGRUPADOS por tema a propósito: si un temario cambia, se corrige su
 * bloque y ya. El juego los consume en plano (`goodItemsFor`/`badItemsFor`).
 */
export interface BloqueTematico {
  tema: string;
  /** Conceptos de VALOR — tarjeta verde, suman y encadenan combo */
  buenas?: readonly string[];
  /** Conceptos de RIESGO — tarjeta roja, penalizan y cortan el combo */
  malas?: readonly string[];
}

export interface TerminalVocabulario {
  /** Bioma del mapa al que pertenece (ver BIOME_SEQUENCE) */
  terminal: ZoneTheme;
  /** Siglas y nombre, para leer la tabla de un vistazo */
  etiqueta: string;
  bloques: readonly BloqueTematico[];
}

export const TERMINAL_ITEMS: readonly TerminalVocabulario[] = [
  {
    terminal: 'port',
    etiqueta: 'Terminal de Contenedores',
    bloques: [
      {
        tema: 'Ciberseguridad',
        buenas: [
          'ACTIVO', 'ADJUNTO', 'ALERTA', 'ALGORITMO', 'ARCO', 'AVISO', 'BLOQUEAR', 'BORRAR',
          'CIFRAR', 'CONTRASEÑA', 'COPIA', 'CORREO', 'DEFENSA', 'DENUNCIA', 'DIGITAL',
          'DOBLE', 'ENLACE', 'EVITAR', 'FILTRAR', 'FIREWALL', 'GESTOR', 'INTANGIBLE',
          'INTERNET', 'METADATO', 'RESPALDO', 'ROBUSTO', 'SEÑAL', 'SITIO', 'SOFTWARE',
          'TANGIBLE', 'ÚNICA'
        ],
      },
      {
        tema: 'Tecnologia',
        buenas: [
          'ANÁLISIS', 'CONSUMO', 'CRÍTICO', 'DRONES', 'MODERNO', 'ÓPTIMO', 'SENSOR'
        ],
      },
      {
        tema: 'Riesgo ciber',
        malas: [
          'AMENAZA', 'ATAQUE', 'FRAUDE', 'MALWARE', 'RANSOM', 'DELITO', 'ERROR', 'OCULTO',
          'FALLAS'
        ],
      },
    ],
  },
  {
    terminal: 'multi',
    etiqueta: 'Terminal Multipropósito',
    bloques: [
      {
        tema: 'Operaciones',
        buenas: [
          'ACTOR', 'ADUANA', 'AGENTE', 'APILAR', 'AUTORIDAD', 'BUQUE', 'CAMIÓN', 'CARGO',
          'CÓDIGO', 'CONEXIÓN', 'CONTAINER', 'DIMENSIÓN', 'ENTREGA', 'EQUIPO', 'ESTADÍA',
          'ESTIBA', 'FÉRREO', 'FRENTE', 'GRANEL', 'GRÚAS', 'INDICADOR', 'MANEJO',
          'MARÍTIMO', 'MERCANCÍA', 'MUELLE', 'NAVIERA', 'OPERADOR', 'OPERAR', 'ÓRGANO',
          'PATIO', 'PLANEAR', 'PROCESO', 'PUERTO', 'RECEPCIÓN', 'REEFER', 'SEGURO',
          'SISTEMA', 'TANK', 'TERMINAL', 'TRACTOR', 'VAGÓN', 'VOLUMEN'
        ],
      },
      {
        tema: 'SIGA',
        buenas: [
          'ACCIÓN', 'CALIDAD', 'CAMBIO', 'CAUSA', 'COSTO', 'ENFOQUE', 'ESBELTO', 'ETAPA',
          'EVENTO', 'EXCELENCIA', 'GRÁFICO', 'INDUSTRIA', 'MEJORA', 'MÉTODO', 'SIGMA'
        ],
      },
      {
        tema: 'Procesos de RRHH',
        buenas: [
          'BENCHMARK', 'CAPACITAR', 'COLABORAR', 'CONSULTA', 'CONTRATAR', 'CRITERIO',
          'EVALUAR', 'EXPERTO', 'FUENTES', 'FUNCIÓN', 'HUMANO', 'INDUCIR', 'LABORES',
          'LICENCIA', 'MEDIR', 'MERCADO', 'PAGOS', 'PERFIL', 'PUESTO', 'RENDIR', 'REPORTE',
          'RESPETO', 'RETOS', 'ROTACIÓN', 'SEGUIMIENTO', 'SELECCIONAR'
        ],
      },
      {
        tema: 'Relaciones Laborales',
        buenas: [
          'ARTÍCULO', 'BUZÓN', 'CLIMA', 'COLECTIVO', 'CONDICIÓN', 'CONTRATO', 'CONVENIO',
          'CRECER', 'DERECHO', 'DINÁMICA', 'DIVERSIDAD', 'EMPLEADOR', 'EMPRESA', 'ENCUESTA',
          'ENTORNO', 'EQUIDAD', 'ESTATUTO', 'ÉTICA', 'GESTIÓN', 'GUÍA', 'IMPACTO',
          'JORNADA', 'LABORAL', 'LEYES', 'MARCO', 'MÍNIMO', 'MOTIVAR', 'NOMBRAR', 'NÓMINA',
          'NORMAS', 'PERMISO', 'PERSONAL', 'POLÍTICA', 'PRESTACIÓN', 'PROSPERAR', 'REGLA',
          'RELACIÓN', 'RETENER', 'SALARIO', 'SUBSIDIO', 'TAREA', 'TRABAJO', 'TRATADO',
          'VACACIÓN'
        ],
      },
      {
        tema: 'Riesgo operativo',
        malas: [
          'DESALOJO', 'DESVÍO', 'DEFECTO', 'DAÑOS', 'DERRAME', 'TÓXICO', 'QUÍMICO', 'FUEGO',
          'INMINENTE', 'GRAVE', 'PELIGRO', 'DESASTRE'
        ],
      },
    ],
  },
  {
    terminal: 'cruise',
    etiqueta: 'Terminal de Cruceros',
    bloques: [
      {
        tema: 'Nomenclatura naval',
        buenas: [
          'MANGA', 'PUNTAL', 'CALADO', 'ESLORA', 'ATRAQUE', 'PROA', 'POPA', 'BABOR',
          'ESTRIBOR', 'AMARRE', 'BITÁCORA', 'DESESTIBA', 'DRAGADO', 'CABOTAJE', 'QUILLA',
          'BOYA', 'FONDEO', 'TRINCAJE', 'REMOLQUE', 'PILOTAJE', 'NORAY', 'FRANCOBORDO',
          'MAMPARO'
        ],
      },
      {
        tema: 'Programas de Bienestar',
        buenas: [
          'AMBIENTE', 'ÁNIMO', 'AUDICIÓN', 'BALANCE', 'BRINDAR', 'COMIDA', 'CONTRIBUIR',
          'CUERPO', 'CUIDAR', 'CULTIVAR', 'DESCANSO', 'EJERCICIO', 'EMOCIONAL', 'EMPATÍA',
          'ERGONOMÍA', 'ESCUCHA', 'ÉXITO', 'HÁBITO', 'HIDRATAR', 'HIGIENE', 'HORARIO',
          'HUMANIDAD', 'IMPULSO', 'INSPECCIÓN', 'LÍMITE', 'MEJORAR', 'NUTRIR', 'PLACER',
          'POSTURA', 'PRIORIZAR', 'PROMOVER', 'RELAJAR', 'RETORNO', 'SALUDABLE', 'TRATO',
          'VISUAL'
        ],
      },
      {
        tema: 'Entorno laboral',
        buenas: [
          'APOYO', 'ATRAER', 'BIENESTAR', 'EMPLEO', 'EQUILIBRIO', 'FAMILIA', 'FÍSICO',
          'FORMAR', 'MENTAL', 'MUTUO', 'PATRÓN', 'POSITIVO', 'ROLES', 'ROTAR', 'SUEÑO'
        ],
      },
      {
        tema: 'Riesgo personal',
        malas: [
          'ESTRÉS', 'ANSIEDAD', 'ENFERMEDAD', 'AUSENCIA', 'CONFLICTO'
        ],
      },
    ],
  },
  {
    terminal: 'shipyard',
    etiqueta: 'Astillero Naval',
    bloques: [
      {
        tema: 'Filosofia HP',
        buenas: [
          'APRENDER', 'CULTURA', 'DESAFÍO', 'GRUPO', 'HISTORIA', 'INCLUSIÓN', 'LIDERAZGO',
          'NEGOCIO', 'NORMA', 'SOCIO', 'TALENTO', 'UNITY', 'VALOR'
        ],
      },
      {
        tema: 'Seguridad en las operaciones',
        buenas: [
          'ALTURA', 'ASTILLERO', 'AUXILIO', 'AYUDA', 'BRIGADA', 'CENTRO', 'CONTROL',
          'CRUCERO', 'MANIOBRA', 'NAVAL', 'PEATÓN', 'PÓRTICO', 'POSIBLE', 'PREVENIR',
          'PREVIOS', 'PROBABLE', 'REDUCIR', 'SALUD', 'SIMULACRO', 'TALLER', 'VIALIDAD'
        ],
      },
      {
        tema: 'Brigadas',
        buenas: [
          'FASES', 'LÍDER', 'MEDIDA', 'MONITOR', 'NIVEL', 'OFICIAL', 'RESCATE', 'TÉCNICO'
        ],
      },
      {
        tema: 'Riesgo de seguridad',
        malas: [
          'INCENDIO', 'RIESGO', 'SANCIÓN'
        ],
      },
    ],
  },
  {
    terminal: 'rail',
    etiqueta: 'Terminal Intermodal',
    bloques: [
      {
        tema: 'Sostenibilidad',
        buenas: [
          'ACUERDO', 'CICLO', 'CIRCULAR', 'COMUNIDAD', 'ECONOMÍA', 'EFICIENTE', 'ENERGÍA',
          'EÓLICA', 'ESTÁNDAR', 'FACTOR', 'FLOTAS', 'FLUJO', 'FUTURO', 'HÍBRIDO', 'LIMPIO',
          'MEDIO', 'PILAR', 'RECURSO', 'REGENERAR', 'SOCIAL', 'SOLAR', 'SOSTENIBLE'
        ],
      },
      {
        tema: 'Desarrollo de nuevos productos',
        buenas: [
          'ÁCIDO', 'CLIENTE', 'CREATIVO', 'DISEÑO', 'IDEAS', 'MONETIZAR', 'POTENCIAL',
          'PROYECTO', 'PRUEBA', 'RENTABLE', 'SERVICIO', 'SINERGIA', 'VIABLE'
        ],
      },
      {
        tema: 'Riesgo ambiental',
        malas: [
          'EMISIÓN', 'FÓSIL', 'DIÉSEL', 'RUIDO'
        ],
      },
    ],
  },
];

/** Índice terminal → conceptos, precalculado: `spawnCards` lo consulta por
 *  cada tarjeta y no debe recorrer la tabla entera cada vez. */
const POR_TERMINAL = new Map<ZoneTheme, { buenas: string[]; malas: string[] }>(
  TERMINAL_ITEMS.map((t) => [
    t.terminal,
    {
      buenas: t.bloques.flatMap((b) => b.buenas ?? []),
      malas: t.bloques.flatMap((b) => b.malas ?? []),
    },
  ]),
);

/** Los conceptos correctos de TODAS las terminales, en plano */
export const GOOD_ITEMS: readonly string[] = TERMINAL_ITEMS.flatMap((t) =>
  t.bloques.flatMap((b) => b.buenas ?? []),
);

/** Los conceptos de riesgo de TODAS las terminales, en plano */
export const BAD_ITEMS: readonly string[] = TERMINAL_ITEMS.flatMap((t) =>
  t.bloques.flatMap((b) => b.malas ?? []),
);

/** Conceptos de VALOR de una terminal. Si el bioma no tuviera vocabulario
 *  propio se cae al común: una tarjeta sin texto sería un hueco en el mapa. */
export function goodItemsFor(terminal: ZoneTheme): readonly string[] {
  const v = POR_TERMINAL.get(terminal)?.buenas;
  return v && v.length ? v : GOOD_ITEMS;
}

/** Conceptos de RIESGO de una terminal (mismo criterio de respaldo) */
export function badItemsFor(terminal: ZoneTheme): readonly string[] {
  const v = POR_TERMINAL.get(terminal)?.malas;
  return v && v.length ? v : BAD_ITEMS;
}

/**
 * Conceptos de PROTECCIÓN: recogerlos activa un escudo que absorbe el próximo
 * golpe. Son los que protegen de verdad en cada terminal — la defensa y el
 * respaldo en ciberseguridad, la brigada y el simulacro en seguridad operativa.
 * Tienen que existir en `GOOD_ITEMS` (hay un test que lo comprueba): si se
 * renombra uno, la mecánica dejaría de dispararse en silencio.
 */
export const SHIELD_ITEMS: readonly string[] = [
  'DEFENSA',
  'RESPALDO',
  'CIFRAR',
  'FIREWALL',
  'BLOQUEAR',
  'PREVENIR',
  'BRIGADA',
  'AUXILIO',
  'RESCATE',
  'SIMULACRO',
];

/** ¿Este concepto activa escudo? */
export function isShieldItem(label: string): boolean {
  return SHIELD_ITEMS.includes(label);
}

export type BadItem = (typeof BAD_ITEMS)[number];
