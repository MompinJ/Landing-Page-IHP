// ============================================================
// CATALOGO: repertorio de transiciones entre slides.
// id -> motor en CSS (.fx-wipe / .fx-cv / .slide.fx-out)
// ============================================================

export const TRANSITIONS = [
  { id: 'split', name: 'Cortina HP',       ms: 1300, swap: 0.46 }, // isotipo bandera
  { id: 'wipe',  name: 'Barrido diagonal', ms: 1400, swap: 0.50 },
  { id: 'fade',  name: 'Fundido suave',    ms: 900,  swap: 0.00 },
];

// Repertorio de entradas de elementos (clases CSS que disparan animacion):
//   'r'      -> texto/logo: sube + fade
//   'rs'     -> figura: aparece (fade + micro-escala)
//   'fig-in' -> figura: desliza desde un lado (--figx) + fade
//   'sg'     -> super grafico: se "dibuja" (crece su ancho)
export const ENTRANCES = ['r', 'rs', 'fig-in', 'sg'];
