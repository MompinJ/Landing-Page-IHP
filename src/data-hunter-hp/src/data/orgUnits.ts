/**
 * UNIDADES DE NEGOCIO del congreso — las que el jugador elige al firmar su
 * marcador, y la etiqueta que sale en el Top 10.
 *
 * OJO: esta lista es la que hay que confirmar con comunicación interna antes
 * del evento (siglas y nombres tal como se usan en el Grupo). Es el ÚNICO
 * sitio donde vive: añadir, quitar o renombrar una unidad es tocar una línea.
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

export const ORG_UNITS: readonly OrgUnit[] = [
  { code: 'HPM', name: 'Corporativo Hutchison Ports México' },
  { code: 'EIT', name: 'Ensenada International Terminal' },
  { code: 'ECV', name: 'Ensenada Cruiseport Village' },
  { code: 'LCT', name: 'Lázaro Cárdenas Terminal Portuaria de Contenedores' },
  { code: 'LCMT', name: 'Lázaro Cárdenas Multipurpose Terminal' },
  { code: 'TIMSA', name: 'Terminal Internacional de Manzanillo' },
  { code: 'ICAVE', name: 'Internacional de Contenedores Asociados de Veracruz' },
  { code: 'TNG', name: 'Talleres Navales del Golfo' },
  { code: 'TILH', name: 'Terminal Intermodal Logística de Hidalgo' },
  // El nombre largo de CCI está pendiente de confirmar con comunicación
  // interna; mientras tanto el tooltip repite las siglas.
  { code: 'CCI', name: 'CCI' },
  { code: 'INVITADO', name: 'Invitado o empresa externa' },
];
