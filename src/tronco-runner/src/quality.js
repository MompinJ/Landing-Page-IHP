// Nivel grafico. El stand puede tocarle a cualquier maquina, asi que el juego
// se dibuja en tres niveles y el nivel se puede forzar con ?q=ultra|alto|rapido.
//
// Los tres niveles NO son el mismo dibujo con menos calidad: son tuberias
// distintas. Medido en una Intel HD integrada, con el reparto que da ?perf:
// js 0.6 ms contra dibujo 42 ms. O sea que no sobraban piezas ni triangulos
// (224 llamadas, 56k triangulos), sobraba trabajo POR PIXEL. En una GPU asi lo
// caro es, por este orden:
//
// 1. Las pasadas de postproceso a pantalla completa. Cada una vuelve a tocar
//    todos los pixeles. Por eso en 'alto' no hay cadena de efectos: el mapeo
//    filmico lo hace el propio material, que sale gratis.
// 2. El numero de texturas por pixel del material. Cada mapa (color, relieve,
//    rugosidad, entorno) es una lectura mas por pixel dibujado.
// 3. La resolucion. Es cuadratica: dibujar al 75% es la mitad de pixeles.
// 4. La sombra: la pasada de mapa, y sobre todo cuantas muestras se leen por
//    pixel al mirar si esta en sombra (PCF suave lee cuatro veces mas).
const LEVELS = {
  ultra: {
    name: 'ultra',
    scale: 1,
    maxDpr: 1.5,
    fx: true, // cadena de efectos: oclusion ambiental, destello, ACES, SMAA
    msaa: false, // el suavizado lo hace SMAA dentro de la cadena
    ao: true,
    aoSamples: 8,
    bloom: true,
    shadows: true,
    softShadows: true,
    shadowMap: 2048,
    shadowSpan: 26,
    shadowMin: 0.7,
    receiveMin: 1.2,
    roughMap: true,
    normalMap: true,
    aniso: 8,
    bevel: true,
    bevelMin: 0.4,
  },
  alto: {
    name: 'alto',
    scale: 1,
    maxDpr: 1,
    fx: false,
    msaa: true,
    ao: false,
    aoSamples: 0,
    bloom: false,
    shadows: true,
    softShadows: false,
    shadowMap: 1024,
    shadowSpan: 24,
    shadowMin: 1.2,
    receiveMin: 2,
    // se queda el relieve, que es lo que hace que las superficies no parezcan
    // plastico, y se va la rugosidad, que es la que menos se nota de las dos
    roughMap: false,
    normalMap: true,
    aniso: 4,
    bevel: true,
    bevelMin: 0.8,
  },
  rapido: {
    name: 'rapido',
    // dibuja al 75% y la pagina lo estira: es la palanca mas bruta que hay y
    // en un runner a 26 m/s casi no se nota
    scale: 0.75,
    maxDpr: 1,
    fx: false,
    msaa: false,
    ao: false,
    aoSamples: 0,
    bloom: false,
    shadows: false,
    softShadows: false,
    shadowMap: 512,
    shadowSpan: 24,
    shadowMin: 99,
    receiveMin: 99,
    roughMap: false,
    normalMap: false,
    aniso: 2,
    bevel: false,
    bevelMin: 99,
  },
}

// Deteccion barata: no hay forma fiable de saber que GPU hay antes de crear el
// contexto, asi que se mira lo unico que el navegador cuenta sin mentir
// (nucleos y si es tactil) y se tira por lo conservador. El defecto es 'alto'
// incluso en maquinas grandes: el numero de nucleos no dice NADA de la GPU, y
// el caso real que hay que cubrir es justo ese, un equipo con muchos hilos y
// grafica integrada. Ultra se pide a mano.
function autoLevel() {
  const cores = navigator.hardwareConcurrency || 4
  const touch = matchMedia('(pointer: coarse)').matches
  if (touch || cores <= 4) return 'rapido'
  return 'alto'
}

const asked = new URLSearchParams(window.location.search).get('q')
export const QUALITY = LEVELS[asked] || LEVELS[autoLevel()]

// Resolucion de dibujo. Se pasa como dpr al canvas: three dibuja a ese factor y
// el navegador estira el resultado al tamano de la pagina.
export const DPR = [Math.min(1, QUALITY.scale), Math.min(QUALITY.maxDpr, QUALITY.scale * (window.devicePixelRatio || 1))]
