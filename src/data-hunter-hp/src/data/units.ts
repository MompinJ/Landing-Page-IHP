import { PALETTE } from './palette';
import type { ZoneTheme } from '../world/rows';

/**
 * CATÁLOGO DE TERMINALES — punto único de verdad de cómo se llama cada una en
 * pantalla (arco de entrada, sello del pasaporte, resumen final). Antes cada
 * nombre estaba suelto en un comentario o en una textura.
 *
 * SOLO EL NOMBRE DE LA TERMINAL. Ni siglas (TEC, TUM, TNG, TILH…) ni razones
 * sociales: el que juega en el stand viene de una unidad de negocio y conoce
 * las suyas, no las de los demás, así que unas siglas ajenas no le dicen dónde
 * está — y el nombre sí. Por lo mismo, `detail` cuenta lo que SE HACE en la
 * terminal, que es lo que el jugador acaba de ver cruzándola, y no dónde está
 * ni cómo se llama la empresa que la opera.
 */
export interface UnitInfo {
  /** Nombre de la terminal, tal cual va a pantalla */
  name: string;
  /** Qué se hace ahí, una línea */
  detail: string;
  /** Color del sello en el pasaporte */
  accent: string;
}

export const UNITS: Record<ZoneTheme, UnitInfo> = {
  port: {
    name: 'Terminal de Contenedores',
    detail: 'Patios, grúas STS y RTG',
    accent: PALETTE.hpSky,
  },
  multi: {
    name: 'Terminal Multipropósito',
    detail: 'Carga general, granel y Ro-Ro',
    accent: PALETTE.sunsetOrange,
  },
  cruise: {
    name: 'Terminal de Cruceros',
    detail: 'Muelle de pasaje y turismo',
    accent: PALETTE.cyan,
  },
  shipyard: {
    name: 'Astillero Naval',
    detail: 'Diques, gradas y talleres',
    accent: PALETTE.safetyOrange,
  },
  rail: {
    name: 'Terminal Intermodal',
    detail: 'Vías, trenes y patio de maniobras',
    accent: PALETTE.glowGood,
  },
};
