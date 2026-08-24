import { useEffect } from 'react';
import { BALANCE } from '../data/balance';
import { useGameStore } from '../store/useGameStore';
import { pressMove, releaseMove, SOURCE } from '../world/input';
import type { MoveDirection } from '../store/runtime';

/**
 * CONTROLES DE DEDO — deslizar y tocar, copiados de Terminal Rally
 * (`src/components/Game.jsx` → `useInputs` en el repo de la landing).
 *
 * Sin esto el juego no se podía jugar en un teléfono: había teclado y mando y
 * nada más, así que en el móvil se abría la portada, se pulsaba JUGAR y a
 * partir de ahí el muñeco no se movía. «Trabado» no siempre quiere decir pocos
 * fps; a veces quiere decir que no responde.
 *
 * LO QUE SE COPIA de Terminal Rally, que ya resolvió esto en el stand:
 *
 *  - Un gesto = una acción. Nada de joystick virtual ni de botones en pantalla
 *    comiéndose el cuadro; el dedo tapa el juego y en una pantalla de 390 px no
 *    sobra ni un centímetro.
 *  - El TOQUE seco también vale. Es el control original de Crossy Road: tocar
 *    avanza. Quien no descubre el deslizamiento juega igual, solo que recto.
 *  - Los toques sobre la interfaz NO son gestos (`sobreUI`): sin eso, pulsar
 *    «A jugar» encolaba además un paso al empezar la partida.
 *
 * Y DOS COSAS QUE AQUÍ SE HACEN DISTINTO, porque el juego es distinto:
 *
 *  1. El gesto se resuelve al CRUZAR EL UMBRAL, no al levantar el dedo.
 *     Terminal Rally puede esperar al `pointerup` porque es un corredor
 *     automático y el carril se cambia mientras el mundo corre solo. Aquí el
 *     mundo está quieto hasta que el jugador salta, así que esperar a levantar
 *     el dedo mete un retardo entero de gesto delante de CADA paso, que es
 *     precisamente la sensación de ir trabado. Se dispara en cuanto la
 *     dirección está clara.
 *  2. Tras disparar, el origen del gesto se REANCLA donde está el dedo. Así un
 *     arrastre largo encadena pasos —cuatro casillas seguidas son un barrido,
 *     no cuatro deslizamientos— y es lo que hace que el juego se sienta de
 *     teléfono y no de teclado traducido.
 */

/** Píxeles CSS que hay que recorrer para que un arrastre cuente como gesto.
 *
 *  32 y no los 40 de Terminal Rally: allí un gesto cambia de carril en un
 *  corredor que ya avanza solo, y pasarse de sensible saca al jugador de su
 *  carril sin querer. Aquí el gesto ES el paso, no hay movimiento de fondo que
 *  estropear, y cada píxel de umbral es retardo puro antes de saltar. Por
 *  debajo de ~28 empiezan a colarse los temblores del pulgar al tocar. */
const UMBRAL = 32;

/**
 * Milisegundos mínimos entre dos pasos ENCADENADOS dentro del mismo gesto.
 *
 * Sin esto, el reanclado convertía la distancia en pasos y nada más: un golpe
 * de pulgar de 200 px —que es un flick normal y corriente— cruzaba el umbral
 * seis veces y salían SEIS saltos de una sacudida. Medido con
 * `scripts/touch-test.ts`: un deslizamiento de 70 px ya daba dos.
 *
 * Lo que separa «un golpe seco» de «un barrido» no es la distancia sino el
 * TIEMPO, así que el freno va ahí. El primer paso de cada gesto sale siempre al
 * instante (el freno arranca a cero), y solo los siguientes esperan: un flick
 * dura 60-100 ms y se queda en un paso; arrastrar el dedo despacio por la
 * pantalla sigue encadenando.
 *
 * El número no es arbitrario: es el tiempo de salto del personaje con un poco
 * de holgura (`STEP_TIME` son 200 ms). Encadenar más rápido que eso solo llena
 * la cola de movimientos —que tiene tope de tres— y el jugador deja de ver el
 * efecto de lo que hace.
 */
const REPETICION_MS = BALANCE.STEP_TIME * 1000 * 0.7;

/** ¿El dedo cayó sobre la interfaz y no sobre el juego? Entonces no es un
 *  gesto: es un botón, un campo de texto o una tarjeta que se está leyendo. */
function sobreUI(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  return !!el?.closest?.('button, input, a, .overlay, .hud, .card');
}

export function useTouchControls() {
  useEffect(() => {
    /** Origen del gesto en curso. `null` = no hay dedo en el tablero. */
    let origen: { x: number; y: number; id: number } | null = null;
    /** ¿Este gesto ya movió al jugador? Decide si al levantar cuenta como toque. */
    let arrastro = false;
    /** Marca de tiempo del último paso encadenado, para el freno de repetición */
    let ultimoPaso = 0;

    /** Un paso, por el mismo árbitro que el teclado y el mando. Se pulsa y se
     *  suelta en el acto: un gesto no se mantiene, se resuelve. */
    const paso = (direction: MoveDirection) => {
      pressMove(direction, SOURCE.TOUCH);
      releaseMove(direction, SOURCE.TOUCH);
    };

    const onDown = (e: PointerEvent) => {
      if (useGameStore.getState().phase !== 'playing' || sobreUI(e.target)) return;
      // Solo el PRIMER dedo manda. Con dos pulgares apoyados —que es como se
      // sujeta un teléfono— el segundo `pointerdown` movía el origen del gesto
      // que el primero tenía a medias y el paso salía en otra dirección.
      if (origen) return;
      origen = { x: e.clientX, y: e.clientY, id: e.pointerId };
      arrastro = false;
      ultimoPaso = 0; // el primer paso del gesto nunca espera
    };

    const onMove = (e: PointerEvent) => {
      if (!origen || e.pointerId !== origen.id) return;
      if (useGameStore.getState().phase !== 'playing') return;
      const dx = e.clientX - origen.x;
      const dy = e.clientY - origen.y;
      if (Math.abs(dx) < UMBRAL && Math.abs(dy) < UMBRAL) return;

      // Freno de repetición: dentro de la ventana NO se dispara y —esto es lo
      // importante— tampoco se reancla, así que el recorrido se sigue
      // acumulando. Un flick rápido gasta sus 200 px aquí dentro y sale un solo
      // paso; un arrastre lento vuelve a cruzar el umbral con el freno ya
      // suelto y encadena.
      if (arrastro && e.timeStamp - ultimoPaso < REPETICION_MS) return;

      // Manda el eje que más se ha recorrido: un deslizamiento humano nunca es
      // recto y sin esto un gesto lateral con un poco de caída se leía como
      // diagonal y salía el paso equivocado.
      if (Math.abs(dx) > Math.abs(dy)) paso(dx > 0 ? 'right' : 'left');
      else paso(dy > 0 ? 'backward' : 'forward');

      // Reanclado: el resto del arrastre cuenta desde aquí, así que seguir
      // estirando el dedo encadena pasos.
      origen.x = e.clientX;
      origen.y = e.clientY;
      arrastro = true;
      ultimoPaso = e.timeStamp;
    };

    const onUp = (e: PointerEvent) => {
      if (!origen || e.pointerId !== origen.id) return;
      // Toque seco (el dedo no llegó a recorrer el umbral) = avanzar, que es el
      // control original de Crossy Road.
      if (!arrastro && useGameStore.getState().phase === 'playing') paso('forward');
      origen = null;
      arrastro = false;
    };

    /** El navegador se lleva el dedo (menú del sistema, notificación, gesto de
     *  borde): el gesto se descarta sin convertirlo en toque. */
    const onCancel = () => {
      origen = null;
      arrastro = false;
    };


    // `pointer*` cubre dedo, lápiz y ratón con un solo juego de manejadores, y
    // no arrastra los 300 ms de espera del `click` táctil.
    window.addEventListener('pointerdown', onDown);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onCancel);
    return () => {
      window.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onCancel);
    };
  }, []);
}
