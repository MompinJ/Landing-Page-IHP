import { PALETTE } from './palette';
import type { ZoneTheme } from '../world/rows';

/**
 * CATÁLOGO DE UNIDADES DE NEGOCIO — punto único de verdad de cómo se llama
 * cada terminal en pantalla (arco de entrada, sello del pasaporte, resumen
 * final). Antes cada nombre estaba suelto en un comentario o en una textura.
 *
 * OJO: las siglas y las sedes son lo que hay que revisar con comunicación
 * interna antes del congreso. El resto del juego lee de aquí, así que
 * corregir un nombre es tocar UNA línea.
 */
export interface UnitInfo {
  /** Siglas con las que se conoce la unidad dentro del Grupo */
  code: string;
  /** Nombre completo para pantalla */
  name: string;
  /** Sede o especialidad, una línea */
  detail: string;
  /** Color del sello en el pasaporte */
  accent: string;
}

export const UNITS: Record<ZoneTheme, UnitInfo> = {
  port: {
    code: 'TEC',
    name: 'Terminal de Contenedores',
    detail: 'Patios, grúas STS y RTG',
    accent: PALETTE.hpSky,
  },
  multi: {
    code: 'TUM',
    name: 'Terminal Universal',
    detail: 'Carga general y granel',
    accent: PALETTE.sunsetOrange,
  },
  cruise: {
    code: 'ECV',
    name: 'Terminal de Cruceros',
    detail: 'Ensenada Cruiseport Village',
    accent: PALETTE.cyan,
  },
  shipyard: {
    code: 'TNG',
    name: 'Astillero Naval',
    detail: 'Talleres Navales del Golfo',
    accent: PALETTE.safetyOrange,
  },
  rail: {
    code: 'TILH',
    name: 'Terminal Intermodal',
    detail: 'Tula, Hidalgo',
    accent: PALETTE.glowGood,
  },
};
