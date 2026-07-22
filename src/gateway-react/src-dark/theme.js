// Tema Navy Edition: paleta Hutchison Ports sobre fondo oscuro.
// Los acentos de marca no cambian; cambia el papel (tinta profunda) y los
// tonos de texto/lineas, pensados para salas con luces apagadas.

export const SEA     = '#002E6D'
export const SEA_L   = '#0A4D9E'   // sea iluminado, para paneles solidos
export const SKY     = '#009BDE'
export const AQUA    = '#54BBAB'
export const AQUA_D  = '#2BA697'
export const AQUA_L  = '#6FCBBC'
export const HORIZON = '#9ACAEB'
export const YELLOW  = '#FFC627'
export const ORANGE  = '#EE7523'

export const INK     = '#041226'   // papel oscuro (fondo de toda slide)
export const INK_2   = '#072448'   // tinta iluminada (paneles, gradientes)

export const TXT     = '#F4F9FE'   // titulos
export const BODY    = '#A6C1DC'   // texto de cuerpo
export const MUTE    = '#5F7C9E'   // texto apagado

export const LINE    = 'rgba(154,202,235,0.25)'  // lineas / bordes
export const LINE_S  = 'rgba(154,202,235,0.12)'  // lineas mas sutiles
export const PANEL   = 'rgba(154,202,235,0.06)'  // relleno de panel glass
export const PANEL_2 = 'rgba(154,202,235,0.10)'  // panel glass resaltado

export const FONT = "'Montserrat', Arial, sans-serif"

// Fondo canonico de slide: tinta profunda con un resplandor Sea arriba-derecha
// (la "marea" del deck) para que ninguna slide sea un negro plano.
export const SLIDE_BG =
  `radial-gradient(1200px 800px at 78% 12%, rgba(10,77,158,0.32), transparent 60%),` +
  `radial-gradient(900px 700px at 10% 95%, rgba(0,155,222,0.10), transparent 55%),` +
  `linear-gradient(160deg, #061A38 0%, #041226 55%, #030D1E 100%)`
