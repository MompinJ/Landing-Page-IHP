export const LANES = [-2.3, 0, 2.3]
export const PLAYER_Z = 2

// NO HAY RELOJ. La carrera dura lo que aguante el corredor, asi que la
// velocidad ya no la marca el tiempo transcurrido sino los METROS recorridos:
// con reloj, dos partidas de la misma duracion iban siempre a la misma
// velocidad en el mismo segundo; aqui la unica forma de ir rapido es haber
// llegado lejos, que es lo que un infinito tiene que premiar.
export const BASE_SPEED = 13
export const MAX_SPEED = 29
// metros en los que se pasa de la velocidad de salida a la maxima
export const SPEED_RAMP = 2800
export const SEGMENT_LENGTH = 30
export const NUM_SEGMENTS = 7
// Borde frontal de la franja k=0 del escenario cuando el scroll esta a cero.
// Vive aqui y no en World porque el curso tambien lo necesita: es lo que dice
// en que metro empieza cada franja, y las terminales se alinean con ellas para
// que el paisaje cambie exactamente en el portico (ver alineaFranja).
export const SEGMENT_START = 16
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
/* ---------- Camion portacontenedor que se trepa (lo de Subway Surfers) ----------

  Altura del techo del contenedor y largo de la rampa trasera por la que se
  sube. La altura no la limita el salto (2.9 m estan muy por encima de los
  1.35 m que sube el corredor): a los camiones se sube por la rampa, igual que
  a los andamios del dique se sube por su escalera. Lo que cuesta es
  SOSTENERSE de techo en techo.
*/
export const RIG_H = 2.9
export const RIG_RAMP = 7
export const RIG_BONUS = 60

/* ---------- Racha ----------

  Toda ficha valia diez fijo, y con eso subirse al camion o dejarse izar era
  "un poco mas de lo mismo": mas fichas, mismo valor. Con multiplicador dejan de
  serlo, porque arriba la fila va limpia y SIN ROJAS -- o sea que las rutas de
  altura son donde se construye la racha, y bajarse a media fila cuesta.

  La rompe una ficha roja, no un choque: con una sola vida, un choque no rompe
  la racha, la termina junto con todo lo demas.

  Los cortes son los mismos que los de Port Quest reescalados: alli se juega a
  pasos y aqui a carrera continua, asi que ocho y dieciseis fichas seguidas son
  mas o menos los cinco y diez saltos de alla.
*/
export const STREAK_X2 = 8
export const STREAK_X3 = 16

/* ---------- Casco reforzado: el escudo de un golpe ----------

  Una vida sola es dura para quien llega de frente al stand sin haber jugado
  nunca: una mala lectura y se acabo en veinte segundos, y el que esperaba en la
  fila ve una pantalla de resultados antes de entender el juego. Este recogible
  aguanta EXACTAMENTE un choque y desaparece.

  No quita la regla, la amortigua: sigue habiendo una sola vida, lo que hay es
  una segunda oportunidad que se recoge, se ve venir y se pierde al usarla.

  Tras romperse deja un instante de invulnerabilidad, porque la pieza contra la
  que se choco sigue ahi: sin eso, el mismo contenedor cobraba el escudo y la
  vida en dos cuadros seguidos.
*/
export const SHIELD_INVULN = 1.1

/* ---------- Record personal ----------

  La marca a batir se pinta EN LA PISTA, no en una esquina del HUD. En un juego
  sin final, lo unico que da una meta es la raya de uno mismo, y una raya se ve
  llegar: los ultimos cincuenta metros antes de tu record es donde el que juega
  en el stand deja de esquivar por reflejo y empieza a jugar de verdad.
*/
export const RECORD_KEY = 'terminal-rally-infinito-record'
export const RECORD_BONUS = 100

/* ---------- Izado de grua: el gancho que te sube a por los valores de arriba ----------

  El vuelo se mide en METROS de curso, no en segundos, porque las fichas que se
  recogen en el aire van colocadas en el curso con esta misma curva: mientras
  corredor y fichas lean la misma funcion de la misma distancia, la fila cae
  exactamente en la trayectoria por rapido que vaya el mundo.
*/
export const FLY_LEN = 165
// ALTURA DEL VUELO: por encima de todo lo que hay en PISTA, por debajo de lo que
// hay COLGADO.
//
// Con siete metros el corredor se metia por dentro de los spreaders y las vigas
// que las gruas de patio tienen suspendidas sobre los carriles -- decorado, no
// obstaculos, asi que no le pegaban: simplemente lo atravesaban, que se ve peor
// que un choque. A 4.8 pasa holgado sobre el obstaculo mas alto (2.3) y sobre
// el techo de un camion (2.9), y por debajo de lo que cuelga.
export const FLY_H = 4.8

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

// Rangos. Aqui no hay techo que escalar -- el curso no se acaba --, asi que
// estan puestos contra lo que se tarda en llegar: con una sola vida, pasar de
// mil puntos pide sostener un par de kilometros limpios, y eso ya es una
// carrera de las que se cuentan en el stand.
export const RANKS = [
  { min: 1100, name: 'EMBAJADOR DEL TRONCO COMÚN' },
  { min: 650, name: 'PROMOTOR DE VALORES' },
  { min: 300, name: 'EXPLORADOR HP' },
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

