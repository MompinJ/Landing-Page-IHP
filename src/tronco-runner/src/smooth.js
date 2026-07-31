// Suavizados para la camara y el corredor.
//
// Los dos son INDEPENDIENTES DE LOS FPS, y eso no es un detalle: la forma
// `x += (destino - x) * dt * k` que habia antes avanza una fraccion distinta
// del camino segun cuanto dure el cuadro, asi que a 60 fps el movimiento es
// suave y a 30 da tirones aunque el juego siga respondiendo igual de rapido.
// Esa es una de las cosas que se sienten como "lag" en las zonas cargadas: no
// es que la entrada llegue tarde, es que la camara se mueve a trompicones.

// Persecucion exponencial: se acerca al destino un tanto por ciento fijo por
// SEGUNDO, no por cuadro. Vale para lo que solo tiene que seguir sin caracter
// propio (la altura del suelo, el agachado, el campo de vision).
export function approach(cur, target, rate, dt) {
  return cur + (target - cur) * (1 - Math.exp(-rate * dt))
}

// Amortiguador critico. A diferencia del exponencial, que arranca a velocidad
// maxima y va frenando, este ACELERA al empezar y frena al llegar: es la
// diferencia entre una camara que da un tiron al cambiar de carril y una que
// acompana el movimiento.
//
// La formula es la aproximacion racional de siempre (la de SmoothDamp): no se
// va a las nubes aunque un cuadro dure mucho, cosa que un integrador de Euler
// con un muelle rigido si hace, y justo en los cuadros lentos, que es cuando
// mas se nota.
//
// vel es un objeto { v } porque la velocidad tiene que sobrevivir entre
// cuadros: es lo que guarda la inercia del movimiento.
export function smoothDamp(cur, target, vel, smoothTime, dt) {
  const omega = 2 / smoothTime
  const x = omega * dt
  const exp = 1 / (1 + x + 0.48 * x * x + 0.235 * x * x * x)
  const change = cur - target
  const temp = (vel.v + omega * change) * dt
  vel.v = (vel.v - omega * temp) * exp
  return target + (change + temp) * exp
}
