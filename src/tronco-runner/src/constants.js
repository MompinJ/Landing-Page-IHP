export const LANES = [-2.3, 0, 2.3]
export const PLAYER_Z = 2
// 120 s recorren 2340 m: cinco zonas de 468 m, una por unidad de negocio
export const GAME_DURATION = 120
export const BASE_SPEED = 13
export const MAX_SPEED = 26
export const SEGMENT_LENGTH = 30
export const NUM_SEGMENTS = 7
// Largo de zona. Es a la vez el largo del escenario y el del tramo de curso:
// si se separan, el portico de una zona cae dentro del paisaje de la anterior.
export const THEME_METERS = 468
// metros de curso vivos por delante del corredor: mas alla la niebla lo tapa
export const VIEW_AHEAD = 135

// Obstaculos fisicos: 'low' se salta, 'high' se pasa rodando, y 'tall', 'long'
// y 'truck' solo se esquivan cambiando de carril. Donde va cada uno lo decide
// course.js. El largo en z es la ventana de colision real: un contenedor de 40
// pies cierra el carril 12 m, no un punto, asi que no se puede volver a el en
// cuanto se ve el hueco.
// 'hook' es el gancho de la grua del astillero: se pasa rodando como 'high',
// pero viene de frente y a la altura del tablero del andamio, o sea que solo
// se cruza con quien va corriendo por arriba.
// 'pipe' es la misma salida que 'high' pero en pieza baja: va DEBAJO del
// tablero de un andamio, donde solo hay 2.7 m de galibo y una pieza alta
// atravesaria el tablero.
export const OBSTACLE_LEN = {
  low: 1.9,
  high: 1.9,
  tall: 2.3,
  long: 12.2,
  truck: 6.5,
  loco: 14,
  hook: 2.6,
  pipe: 2.0,
}
// Lo que viene de frente cierra mas rapido que el resto del mundo, que es lo
// que lo hace leerse como "algo se te viene encima". La locomotora del patio
// intermodal aprieta mas que el tractocamion: es la zona final.
export const TRUCK_APPROACH = 0.35
// La locomotora entra fuerte: a 21 m/s del mundo eso son ~38 m/s de
// acercamiento. Se ve venir desde 170 m, asi que hay ~4.5 s para leerla.
export const LOCO_APPROACH = 0.8
// El gancho va colgado de un carro que corre por la viga del portico: se
// acerca solo un poco mas rapido que el mundo, lo justo para que se lea que se
// mueve mientras se decide si rodar o bajarse del andamio.
export const HOOK_APPROACH = 0.3
export const OBSTACLE_PENALTY = 15

// Salto y deslizamiento. La gravedad es alta a proposito: con un salto lento
// el jugador queda "flotando" sobre el carril y pierde el control justo cuando
// llega el siguiente obstaculo. Corto y con mucha aceleracion se siente snappy.
export const JUMP_V = 10.4
export const GRAVITY = 40
// margen de gracia: pulsar salto un pelo antes de aterrizar sigue contando
export const JUMP_BUFFER = 0.15
// deslizarse en el aire corta el salto de golpe en vez de esperar la caida
export const SLIDE_FALL = 20
// duracion de la rodada: una voltereta completa. Solo el salto puede cortarla
export const SLIDE_TIME = 0.6
// hay que levantarse antes de volver a rodar; si no, machacar la tecla abajo
// deja al corredor permanentemente hecho bola
export const SLIDE_COOLDOWN = 0.3
// altura del centro de giro: el punto medio del cuerpo, no los pies
export const ROLL_PIVOT = 0.92
// medio ancho del corredor: cuanto ocupa de alto cuando esta horizontal
export const ROLL_HALF_WIDTH = 0.32

// Muestra para la leyenda de la portada. Las palabras que se recogen de verdad
// salen del glosario por zona (words.js); aqui solo hacen falta unos ejemplos
// que enseñen de un vistazo que es verde y que es rojo.
export const LEGEND_GOOD = ['VALOR', 'CULTURA', 'LIDERAZGO', 'INCLUSIÓN', 'EXCELENCIA']

export const LEGEND_BAD = ['AMENAZA', 'DERRAME', 'ESTRÉS', 'RIESGO']

// Escalados al curso real: recogerlo todo sin chocar da 1920 puntos (180 fichas
// mas los tres bonos de andamio), asi que el rango maximo pide poco mas de la
// mitad del techo. Se recalculan cada vez que cambia el reparto de fichas: al
// quitar las de los tableros del astillero el techo bajo un 10%.
export const RANKS = [
  { min: 1080, name: 'GUARDIÁN DE LA CULTURA' },
  { min: 770, name: 'EMBAJADOR DEL TRONCO COMÚN' },
  { min: 500, name: 'PROMOTOR DE VALORES' },
  { min: 230, name: 'EXPLORADOR HP' },
  { min: -Infinity, name: 'GRUMETE DIGITAL' },
]

export const COLORS = {
  bg: '#04122b',
  navy: '#002E6D',
  sky: '#009BDE',
  neon: '#35d3ff',
  good: '#2ee06f',
  bad: '#ff4757',
  amber: '#FFC627',
}

// Unidades de negocio del grupo. Se guardan junto al nombre y el puntaje para
// poder leer el TOP 10 por terminal en el stand.
export const BUSINESS_UNITS = [
  'LCT',
  'LCMT',
  'ECV',
  'EIT',
  'HPMX',
  'HPML',
  'TNG',
  'ICAVE',
  'TILH',
  'TIMSA',
  'CCI',
]

// Clave nueva: las tablas viejas no traen unidad de negocio, asi que arrancan
// limpias en vez de mezclar registros sin terminal en el mismo TOP 10.
export const LEADERBOARD_KEY = 'terminal-rally-leaderboard'
