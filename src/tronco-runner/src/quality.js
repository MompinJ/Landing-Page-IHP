// Nivel grafico. El stand puede tocarle a cualquier maquina, asi que el juego
// se dibuja en tres niveles y el nivel se puede forzar con ?q=ultra|alto|rapido
// (util para comparar capturas y para el portatil de respaldo).
//
// Lo que cambia entre niveles es SOLO lo caro: resolucion a la que se dibuja,
// mapa de sombras, oclusion ambiental y numero de pasadas de postproceso. La
// iluminacion, los materiales y el mapa de entorno son los mismos en los tres,
// para que el juego se vea igual de "correcto" en todos y solo pierda finura.
//
// Numeros que importan y por que:
// - dpr: es CUADRATICO. Pasar de 2 a 1.5 dibuja la mitad de pixeles. En un
//   portatil 4K la diferencia entre 1 y 2 son ocho millones de pixeles por
//   cuadro, y con postproceso cada pasada los vuelve a tocar.
// - shadowMin: talla minima en metros para proyectar sombra. El escenario esta
//   lleno de tornillos, barandillas y balizas; meterlos en el mapa de sombras
//   duplica las llamadas de dibujo y no se ve ni una de esas sombras.
// - shadowSpan: radio en metros que cubre el mapa. Cuanto mas chico, menos
//   piezas entran en la pasada Y mas nitida sale la sombra por texel.
const LEVELS = {
  ultra: {
    name: 'ultra',
    dpr: [1, 1.5],
    shadows: true,
    shadowMap: 2048,
    shadowSpan: 26,
    shadowMin: 0.7,
    receiveMin: 1.2,
    aniso: 8,
    ao: true,
    aoSamples: 8,
    bloom: true,
    bevel: true,
    bevelMin: 0.4,
  },
  alto: {
    name: 'alto',
    dpr: [1, 1.25],
    shadows: true,
    shadowMap: 1024,
    shadowSpan: 24,
    shadowMin: 1.2,
    receiveMin: 2,
    aniso: 4,
    ao: false,
    aoSamples: 0,
    bloom: true,
    bevel: true,
    bevelMin: 0.8,
  },
  rapido: {
    name: 'rapido',
    dpr: [1, 1],
    shadows: false,
    shadowMap: 512,
    shadowSpan: 24,
    shadowMin: 99,
    receiveMin: 99,
    aniso: 2,
    ao: false,
    aoSamples: 0,
    bloom: false,
    bevel: false,
    bevelMin: 99,
  },
}

// Deteccion barata: no hay forma fiable de saber que GPU hay, asi que se mira
// lo unico que el navegador cuenta sin mentir (nucleos y si es tactil) y se
// tira por lo conservador. El que quiera mas sube el nivel con ?q=.
//
// El defecto es 'alto' incluso en maquinas grandes: el numero de nucleos no
// dice nada de la GPU, y un portatil de trabajo con dieciseis hilos y grafica
// integrada se arrastraba en 'ultra'. Ultra se pide a mano.
function autoLevel() {
  const cores = navigator.hardwareConcurrency || 4
  const touch = matchMedia('(pointer: coarse)').matches
  if (touch || cores <= 4) return 'rapido'
  return 'alto'
}

const asked = new URLSearchParams(window.location.search).get('q')
export const QUALITY = LEVELS[asked] || LEVELS[autoLevel()]
