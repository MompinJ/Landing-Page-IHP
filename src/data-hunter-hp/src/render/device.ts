/**
 * QUÉ APARATO HAY DELANTE — una sola fuente de verdad.
 *
 * Tres cosas del juego dependen de esto y antes cada una lo adivinaba por su
 * cuenta (o no lo miraba en absoluto):
 *
 *  1. El NIVEL GRÁFICO (`render/quality.ts`): un teléfono no puede pagar lo
 *     mismo que el equipo del stand.
 *  2. El ENCUADRE de la cámara (`data/balance.ts` → `camZoomFor`): con el zoom
 *     fijo de 58, una pantalla de 390 px de ancho veía SEIS casillas a lo
 *     ancho. No es que se viera pequeño: es que no se veía a dónde esquivar.
 *  3. Los CONTROLES que se explican en el briefing: enseñar la cruceta de un
 *     Xbox a quien juega con el pulgar es enseñarle el mando de otro.
 *
 * Lo que se mira, y por qué solo eso:
 *
 *  - `pointer: coarse` — lo único que el navegador contesta sin mentir sobre si
 *    el dedo es el puntero principal. La cadena de usuario (`userAgent`) lleva
 *    veinte años siendo una lista de mentiras deliberadas y no se usa.
 *  - EL LADO CORTO de la ventana. Es lo que separa un teléfono de una tableta y
 *    NO cambia al girar el aparato, así que la decisión es estable: un iPhone
 *    da 390 tanto en vertical (390×844) como en horizontal (844×390), y un iPad
 *    da 820 en las dos. Medir el ancho a secas clasificaría el mismo teléfono
 *    de dos maneras según cómo lo sostengan.
 *
 * Se puede forzar todo por URL, que es como se prueba sin tener el aparato
 * delante: `?tactil=1` enciende los controles de dedo en un portátil,
 * `?tactil=0` los apaga en un táctil.
 */

function params(): URLSearchParams {
  if (typeof window === 'undefined') return new URLSearchParams();
  return new URLSearchParams(window.location.search);
}

/** Bandera de URL de tres estados: `null` = no se pidió nada */
function pedido(nombre: string): boolean | null {
  const v = params().get(nombre);
  if (v === null) return null;
  return v !== '0' && v !== 'off' && v !== 'no';
}

/** Lado corto de la ventana en píxeles CSS — invariante al giro del aparato */
function ladoCorto(): number {
  if (typeof window === 'undefined') return 1920;
  return Math.min(window.innerWidth, window.innerHeight);
}

function detectaTactil(): boolean {
  if (typeof window === 'undefined') return false;
  if (typeof matchMedia !== 'undefined' && matchMedia('(pointer: coarse)').matches) return true;
  // Respaldo para navegadores sin `pointer: coarse` fiable (Android antiguos):
  // si el aparato declara puntos de contacto Y no hay ratón fino, es táctil.
  return navigator.maxTouchPoints > 0 && !matchMedia('(pointer: fine)').matches;
}

/** ¿El dedo es el puntero principal? Decide si se enseñan los gestos. */
export const TOUCH: boolean = pedido('tactil') ?? detectaTactil();

/**
 * ¿Es un TELÉFONO? (táctil + lado corto de móvil). Se separa de `TOUCH` a
 * propósito: una tableta o un portátil con pantalla táctil se juegan con el
 * dedo igual, pero tienen pantalla y GPU de sobra y no hay que castigarles el
 * dibujo ni comprimirles la interfaz.
 *
 * 540 px de corte: por debajo están todos los teléfonos en uso (el más ancho
 * anda por 430) y por encima la tableta más pequeña (768).
 */
export const PHONE: boolean = TOUCH && ladoCorto() <= 540;
