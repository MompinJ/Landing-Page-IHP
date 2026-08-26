/**
 * UNIDADES DE NEGOCIO del congreso — las que el jugador elige al firmar su
 * marcador, y la etiqueta que sale en el Top 10.
 *
 * ESTA LISTA YA NO MANDA: manda la tabla `unidades` de Supabase, que la leen
 * los dos juegos del stand al abrir (ver `services/scoreService.ts`). Corregir
 * una sigla es editarla allí una vez y que cambie en Port Quest y en Terminal
 * Rally a la vez, en vez de en dos repositorios distintos con dos despliegues.
 *
 * Lo de aquí es la RED DE SEGURIDAD: si el wifi del stand falla, el jugador
 * tiene que poder elegir su unidad igual. Se mantiene igual a la tabla; si
 * alguna vez se separan, la que decide es la tabla, porque es contra ella
 * contra la que valida la clave foránea al guardar.
 *
 * No confundir con `data/units.ts`, que describe las cinco terminales del
 * MAPA (los biomas que se cruzan jugando).
 */
export interface OrgUnit {
  /** Siglas — es lo que se ve en la ficha del ranking */
  code: string;
  /** Nombre completo, para el tooltip */
  name: string;
}

/* Sin `HPM`: la tabla se quedó con HPMX y HPML, que son las dos que se usan
   dentro del Grupo. Dejarla aquí sería ofrecer una sigla que la clave foránea
   rechaza al guardar. */
export const ORG_UNITS: readonly OrgUnit[] = [
  { code: 'HPMX', name: 'Hutchison Ports México' },
  { code: 'HPML', name: 'Hutchison Ports (corporativo)' },
  { code: 'EIT', name: 'Ensenada International Terminal' },
  { code: 'ECV', name: 'Ensenada Cruiseport Village' },
  { code: 'LCT', name: 'Lázaro Cárdenas Terminal Portuaria de Contenedores' },
  { code: 'LCMT', name: 'Lázaro Cárdenas Multipurpose Terminal' },
  { code: 'TIMSA', name: 'Terminal Internacional de Manzanillo' },
  { code: 'ICAVE', name: 'Internacional de Contenedores Asociados de Veracruz' },
  { code: 'TNG', name: 'Talleres Navales del Golfo' },
  { code: 'TILH', name: 'Terminal Intermodal Logística de Hidalgo' },
  { code: 'CCI', name: 'CCI' },
  { code: 'INVITADO', name: 'Invitado o empresa externa' },
];
