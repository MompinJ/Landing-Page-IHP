import { BALANCE } from '../data/balance';
import { runtime } from '../store/runtime';
import { useGameStore } from '../store/useGameStore';

/**
 * REMATE DE MUERTE — el compás entre perder la última vida y la pantalla final,
 * copiado de Crossy Road.
 *
 * QUÉ ARREGLA. Antes no había compás: se perdía el último corazón y la tarjeta
 * de resultados aparecía encima EN EL MISMO FRAME. El jugador nunca llegaba a
 * ver qué lo había matado — el camión seguía su camino y la pantalla ya era
 * otra. En Crossy Road eso es media mecánica: el mundo se para en seco, la
 * cámara se cierra sobre lo que ha pasado y solo entonces entra el marcador.
 *
 * Son tres tiempos:
 *
 *   1. CONGELADO (`DEATH_FREEZE`) — el mundo se para. Es el fotograma congelado
 *      de los juegos de pelea: hace que el ojo vuelva al sitio del impacto en
 *      vez de irse detrás del vehículo.
 *   2. CÁMARA LENTA (`DEATH_SLOWMO`) — el mundo sigue a un quinto de velocidad,
 *      así que el camión termina de pasarte por encima y se ve. La cámara
 *      aprovecha para acercarse (ver `CameraRig`).
 *   3. y al acabar, la pantalla final.
 *
 * POR QUÉ VIVE AQUÍ Y NO EN EL COMPONENTE. La primera versión contaba el
 * tiempo dentro de `GameLoop`, y con eso `npm run sim` dejó de terminar: la
 * simulación headless no monta componentes, así que nadie descontaba el compás
 * y la partida se quedaba para siempre en «jugando». Este fichero es lógica
 * pura —sin React, sin three— y lo llaman los dos, que es justo el reparto que
 * el resto del mundo (`playerLogic`, `traffic`) ya sigue.
 */

/** Arranca el remate. Idempotente: dos golpes en el mismo frame no lo reinician. */
export function startDying() {
  if (runtime.dying > 0) return;
  runtime.dying = BALANCE.DEATH_BEAT;
  runtime.deathSquash = 1;
}

/**
 * Descuenta el remate con el tiempo REAL del frame y devuelve a qué velocidad
 * tiene que correr el mundo: 0 mientras está congelado, `DEATH_SLOWMO` en la
 * cámara lenta y 1 cuando no se está muriendo nadie.
 *
 * Devolver la escala en vez de aplicarla es lo que permite que el mismo código
 * valga para el juego y para la simulación: cada uno multiplica su propio dt.
 */
export function updateDying(dt: number): number {
  if (runtime.dying <= 0) return 1;

  runtime.dying = Math.max(0, runtime.dying - dt);
  const transcurrido = BALANCE.DEATH_BEAT - runtime.dying;

  // Calcomanía en los primeros 0.2 s: rápido, porque es un golpe. El volumen se
  // conserva a ojo — lo que pierde de alto lo gana de ancho (lo dibuja `Player`).
  runtime.deathSquash = 1 - (1 - BALANCE.DEATH_SQUASH) * Math.min(1, transcurrido / 0.2);

  if (runtime.dying === 0) {
    useGameStore.getState().endGame();
    return 1;
  }
  return transcurrido > BALANCE.DEATH_FREEZE ? BALANCE.DEATH_SLOWMO : 0;
}
