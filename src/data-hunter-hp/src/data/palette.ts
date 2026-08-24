/**
 * Paleta institucional Hutchison Ports — único punto de verdad de color.
 * Todo material de Three.js y estilo de UI debe leer de aquí.
 */
export const PALETTE = {
  /** Azul HP dominante (token institucional seaBlue100) — estructuras, uniforme, marcos */
  hpNavy: '#002E6D',
  /** Azul acción HP (token skyBlue100) — CTAs, acentos UI */
  hpSky: '#009BDE',
  /** Naranja energético institucional (sunsetOrange100) — alertas suaves */
  sunsetOrange: '#EE7523',
  /** Azul profundo para cielo/fondo de escena */
  deepSea: '#061a2e',
  /** Gris acero — grúas, contenedores, metal */
  steel: '#8A9BA8',
  /** Blanco técnico — cascos, terminales smart */
  white: '#F5F7FA',
  /** Cyan smart-port — HUD y acentos Digital Twin */
  cyan: '#00E5FF',
  /** Naranja seguridad — chaleco reflejante, conos, barreras */
  safetyOrange: '#FF6600',
  /** Glow positivo — conceptos correctos */
  glowGood: '#00FF66',
  /** Glow negativo — peligro, ciberamenaza */
  glowBad: '#FF0033',
  /** Asfalto de las vías de tráfico (más claro que el fondo para leerse como suelo) */
  asphalt: '#26334A',
  /** Línea de carril */
  laneLine: '#4A6A8C',
} as const;

export type PaletteKey = keyof typeof PALETTE;
