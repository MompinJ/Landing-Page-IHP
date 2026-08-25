/**
 * EL MANDO COMO CURSOR — el canal por el que la cruceta mueve la interfaz, no
 * al corredor.
 *
 * Jugando, el mando habla con `world/input.ts` y cada pulsación es un salto.
 * En la pantalla final no hay a dónde saltar y la misma cruceta tiene que
 * servir para otra cosa: recorrer botones y escribir un nombre letra a letra,
 * que es lo único que en el stand no se puede hacer sin soltar el mando —y
 * soltarlo, con gente esperando turno, es lo que hace que nadie firme su
 * marcador.
 *
 * Va por SUSCRIPCIÓN y no por sondeo desde cada componente: la Gamepad API no
 * emite eventos, así que el sondeo lo hace una sola vez `useGamepadControls`
 * (que ya tiene su bucle de rAF montado) y lo que llega aquí son acciones ya
 * masticadas. Un componente que quiera el cursor se suscribe y no toca el
 * `navigator.getGamepads()` para nada.
 */

/** Lo que la interfaz entiende. No hay 'saltar': aquí no se juega. */
export type AccionMando = 'up' | 'down' | 'left' | 'right' | 'confirm' | 'back';

/** Hay un mando vivo. Lo lee `useGamepadConnected` para decidir si el teclado
 *  en pantalla hace falta: sin mando estorba, porque el campo de texto de
 *  siempre es más rápido. */
export const estadoMando = { conectado: false };

const oyentesAccion = new Set<(a: AccionMando) => void>();
const oyentesEstado = new Set<() => void>();

export function onAccionMando(fn: (a: AccionMando) => void): () => void {
  oyentesAccion.add(fn);
  return () => oyentesAccion.delete(fn);
}

export function onEstadoMando(fn: () => void): () => void {
  oyentesEstado.add(fn);
  return () => oyentesEstado.delete(fn);
}

export function emiteAccion(a: AccionMando) {
  for (const fn of oyentesAccion) fn(a);
}

export function marcaConectado(conectado: boolean) {
  if (estadoMando.conectado === conectado) return;
  estadoMando.conectado = conectado;
  for (const fn of oyentesEstado) fn();
}

/**
 * REPETICIÓN AL MANTENER. Sin esto, cruzar un teclado de siete letras son siete
 * pulsaciones sueltas y escribir un nombre de ocho letras se vuelve una tarea.
 * Los números son los de un menú de consola: la primera se cuenta al instante,
 * y si el dedo sigue ahí medio segundo después empieza a correr.
 */
const RETARDO = 420;
const INTERVALO = 110;

type Direccion = 'up' | 'down' | 'left' | 'right';

/**
 * Traduce el estado CONTINUO de la cruceta en acciones DISCRETAS con
 * repetición. `siguiente` guarda, por dirección, el instante en que toca la
 * próxima; a 0 significa que está suelta.
 */
export function repiteDireccion(
  siguiente: Record<Direccion, number>,
  pulsada: Record<Direccion, boolean>,
  ahora: number,
) {
  for (const d of ['up', 'down', 'left', 'right'] as Direccion[]) {
    if (!pulsada[d]) {
      siguiente[d] = 0;
      continue;
    }
    if (siguiente[d] === 0) {
      emiteAccion(d);
      siguiente[d] = ahora + RETARDO;
    } else if (ahora >= siguiente[d]) {
      emiteAccion(d);
      siguiente[d] = ahora + INTERVALO;
    }
  }
}
