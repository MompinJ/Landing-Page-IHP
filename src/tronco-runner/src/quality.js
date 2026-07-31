// Nivel grafico. El stand puede tocarle a cualquier maquina, asi que el juego
// se dibuja en tres niveles y el nivel se puede forzar con ?q=ultra|alto|rapido
// (util para comparar capturas y para el portatil de respaldo).
//
// Lo que cambia entre niveles es SOLO lo caro: resolucion de sombra, oclusion
// ambiental y numero de pasadas de postproceso. La iluminacion, los materiales
// y el mapa de entorno son los mismos en los tres, para que el juego se vea
// igual de "correcto" en todos y solo pierda finura.
const LEVELS = {
  ultra: {
    name: 'ultra',
    dpr: [1, 2],
    shadows: true,
    shadowMap: 2048,
    // radio en metros que cubre el mapa de sombras alrededor del corredor:
    // cuanto mas chico, mas nitida la sombra por texel
    shadowSpan: 34,
    aniso: 16,
    ao: true,
    bloom: true,
    bevel: true,
  },
  alto: {
    name: 'alto',
    dpr: [1, 1.6],
    shadows: true,
    shadowMap: 1024,
    shadowSpan: 30,
    aniso: 8,
    ao: false,
    bloom: true,
    bevel: true,
  },
  rapido: {
    name: 'rapido',
    dpr: [1, 1.25],
    shadows: false,
    shadowMap: 512,
    shadowSpan: 30,
    aniso: 4,
    ao: false,
    bloom: false,
    bevel: false,
  },
}

// Deteccion barata: no hay forma fiable de saber que GPU hay, asi que se mira
// lo unico que el navegador cuenta sin mentir (nucleos y si es tactil) y se
// tira por lo conservador. El que quiera mas sube el nivel con ?q=.
function autoLevel() {
  const cores = navigator.hardwareConcurrency || 4
  const touch = matchMedia('(pointer: coarse)').matches
  if (touch || cores <= 4) return 'rapido'
  if (cores <= 8) return 'alto'
  return 'ultra'
}

const asked = new URLSearchParams(window.location.search).get('q')
export const QUALITY = LEVELS[asked] || LEVELS[autoLevel()]
