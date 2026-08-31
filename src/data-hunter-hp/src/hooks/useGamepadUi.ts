import { useCallback, useEffect, useRef, useSyncExternalStore } from 'react';
import {
  estadoMando,
  onAccionMando,
  onEstadoMando,
  type AccionMando,
} from '../world/gamepadUi';

/**
 * NAVEGAR LA INTERFAZ CON LA CRUCETA — copiado de Terminal Rally, donde ya
 * resolvió el mismo problema: en el stand se juega con mando, y la pantalla
 * final pide escribir un nombre. Sin esto hay que soltar el mando y buscar el
 * teclado, que con gente esperando turno es tanto como no firmar el marcador.
 */

/** Se suscribe a las acciones del mando. El callback va en una ref para poder
 *  pasarlo en línea sin volver a suscribirse en cada render. */
export function useAccionMando(fn: (a: AccionMando) => void, activo = true) {
  const ref = useRef(fn);
  ref.current = fn;
  useEffect(() => {
    if (!activo) return;
    return onAccionMando((a) => ref.current(a));
  }, [activo]);
}

/** `true` cuando hay un mando vivo. Cambia poquísimas veces, así que va por
 *  suscripción y no por sondeo: el resto de la interfaz no se re-dibuja. */
export function useMandoConectado(): boolean {
  return useSyncExternalStore(
    onEstadoMando,
    () => estadoMando.conectado,
    () => false,
  );
}

/** Las teclas que mueven el cursor de los menús, por POSICIÓN física (`e.code`)
 *  y no por la letra que imprimen: así la W sigue estando encima de la S en un
 *  teclado que no sea el latino, que es como se juega con WASD en todas
 *  partes. Es el mismo criterio que `useKeyboardControls` usa para el juego. */
const TECLAS_REJILLA: Record<string, AccionMando> = {
  ArrowUp: 'up',
  KeyW: 'up',
  ArrowDown: 'down',
  KeyS: 'down',
  ArrowLeft: 'left',
  KeyA: 'left',
  ArrowRight: 'right',
  KeyD: 'right',
};

/** ¿El foco está en un campo de texto? Entonces las teclas son ESCRITURA, no
 *  navegación (ver la nota gemela en `useKeyboardControls`). */
function escribiendo(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  if (!el || !el.tagName) return false;
  return (
    el.tagName === 'INPUT' ||
    el.tagName === 'TEXTAREA' ||
    el.tagName === 'SELECT' ||
    el.isContentEditable
  );
}

/**
 * REJILLA DE MENÚ.
 *
 * La rejilla SE LEE DEL PROPIO DOM: cada control navegable lleva `data-gp-row`
 * con su número de fila, y dentro de la fila manda el orden del documento. Así
 * el marcado y la navegación no se pueden desincronizar, y un panel que cambia
 * de contenido —al guardar el nombre desaparece el teclado entero y aparece el
 * Top 10— no tiene que avisar de nada.
 *
 * El cursor se pinta con una clase directamente sobre el elemento y no con
 * estado de React: mover el cursor no tiene por qué re-dibujar el panel.
 */
export function useRejillaMando(ref: React.RefObject<HTMLElement | null>, activo = true) {
  const pos = useRef({ fila: 0, col: 0 });
  /** El foco REAL solo se toma cuando alguien mueve el mando. Al montar solo se
   *  pinta el cursor, para no robarle el campo de nombre a quien está
   *  escribiendo con el teclado físico. */
  const tocado = useRef(false);

  const filas = useCallback((): HTMLElement[][] => {
    const raiz = ref.current;
    if (!raiz) return [];
    const out: HTMLElement[][] = [];
    for (const el of raiz.querySelectorAll<HTMLElement>('[data-gp-row]')) {
      if ((el as HTMLButtonElement).disabled) continue;
      const r = Number(el.dataset.gpRow);
      if (!Number.isFinite(r)) continue;
      (out[r] ||= []).push(el);
    }
    return out.filter(Boolean);
  }, [ref]);

  const pinta = useCallback(
    (enfocar: boolean) => {
      const rejilla = filas();
      const raiz = ref.current;
      if (!raiz) return;
      for (const el of raiz.querySelectorAll('.gp-cursor')) el.classList.remove('gp-cursor');
      if (!rejilla.length) return;
      const p = pos.current;
      const fila = Math.max(0, Math.min(rejilla.length - 1, p.fila));
      // Si la rejilla encogió por debajo del cursor (al guardar desaparecen el
      // teclado y las unidades de golpe), la fila en la que estaba ya no existe
      // y la columna que traía no significa nada en la fila nueva: se vuelve a
      // la primera, que es siempre la acción principal. Sin esto, guardar
      // dejaba el cursor sobre INICIO en vez de sobre JUGAR OTRA VEZ.
      if (fila !== p.fila) p.col = 0;
      p.fila = fila;
      p.col = Math.max(0, Math.min(rejilla[p.fila].length - 1, p.col));
      const el = rejilla[p.fila][p.col];
      el.classList.add('gp-cursor');
      // Sin `preventScroll` a propósito: la tarjeta tiene scroll propio y al
      // bajar por el teclado en pantalla tiene que arrastrarlo.
      if (enfocar) el.focus();
    },
    [ref, filas],
  );

  useEffect(() => {
    if (!activo) return;
    tocado.current = false;
    pos.current = { fila: 0, col: 0 };
    pinta(false);
  }, [activo, pinta]);

  const mueve = useCallback(
    (accion: AccionMando) => {
      const rejilla = filas();
      if (!rejilla.length) return;
      const p = pos.current;
      if (accion === 'up') p.fila -= 1;
      else if (accion === 'down') p.fila += 1;
      else if (accion === 'left') p.col -= 1;
      else if (accion === 'right') p.col += 1;
      else if (accion === 'confirm') {
        const el = rejilla[Math.max(0, Math.min(rejilla.length - 1, p.fila))]?.[p.col];
        el?.click();
        return;
      } else return;

      // Las filas se recorren en vertical con memoria de columna, pero cada una
      // tiene su propio ancho (el teclado son siete teclas y el pie de botones
      // dos), así que la columna se recorta AL ENTRAR en la fila nueva.
      p.fila = Math.max(0, Math.min(rejilla.length - 1, p.fila));
      p.col = Math.max(0, Math.min(rejilla[p.fila].length - 1, p.col));
      tocado.current = true;
      pinta(true);
    },
    [filas, pinta],
  );

  useAccionMando(mueve, activo);

  /*
    LA MISMA REJILLA, CON EL TECLADO.

    WASD y las flechas mueven el cursor igual que la cruceta. En el stand se
    juega con mando, pero quien prueba el juego desde un portátil —o el que se
    queda sin pilas a media jornada— se encontraba una pantalla final donde no
    había forma de llegar a un botón más que con el ratón. Y desde que el modal
    de reseña sale solo, eso es peor: te aparece algo delante y el teclado no lo
    toca.

    NO HACE FALTA MAPEAR CONFIRMAR: al moverse, `pinta(true)` le da el foco de
    verdad al elemento, así que Enter y Espacio ya lo activan por su cuenta —son
    botones nativos—. Duplicarlo aquí solo serviría para que una pulsación
    contara dos veces.

    Y SE CALLA MIENTRAS SE ESCRIBE, por lo mismo que `useKeyboardControls`: sin
    ese filtro, la W del nombre movía el cursor y le robaba el foco al campo a
    mitad de palabra.
  */
  useEffect(() => {
    if (!activo) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (escribiendo(e.target)) return;
      const accion = TECLAS_REJILLA[e.code];
      if (!accion) return;
      // Sin esto, ArrowDown mueve el cursor Y ademas desplaza la tarjeta, que
      // tiene scroll propio: pegaba un salto por cada pulsación.
      e.preventDefault();
      mueve(accion);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [activo, mueve]);

  // El contenido del panel cambia SIN desmontarlo (al guardar el nombre
  // desaparece el teclado y aparece el Top 10). Repintar tras cada render
  // mantiene el cursor dentro de la rejilla nueva y recupera el foco si el
  // elemento que lo tenía acaba de irse. Solo se re-enfoca si ya se venía
  // navegando con el mando.
  useEffect(() => {
    if (activo) pinta(tocado.current);
  });
}
