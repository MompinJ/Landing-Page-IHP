/**
 * MARCADOR DEL CONGRESO — Supabase.
 *
 * Sin backend propio: Supabase publica una API REST sobre la tabla y el juego
 * habla directamente con ella. Los dos juegos del stand (este y Terminal Rally)
 * comparten proyecto pero NO tabla: son dos marcadores distintos y así nadie
 * los mezcla por error en una consulta.
 *
 * LA CLAVE VA AQUÍ A LA VISTA Y ESTÁ BIEN QUE ASÍ SEA. Es la clave
 * «publishable» de Supabase, diseñada para viajar en el navegador; quien la
 * copie no puede hacer más de lo que puede hacer cualquiera abriendo el juego.
 * Lo que impide el destrozo no es esconderla —en un sitio estático no hay dónde—
 * sino lo que hay del otro lado: RLS concede LEER e INSERTAR y nada más, así que
 * no se puede editar ni borrar lo de otro; y unas restricciones en la propia
 * tabla rechazan cualquier marcador que no pueda haber ocurrido (más puntos que
 * filas cruzadas, o una partida de 200 filas resuelta en un segundo). Ver
 * `supabase/marcadores.sql`, que es donde vive esa defensa y lo explica entero.
 *
 * NADA DE ESTO PUEDE BLOQUEAR EL KIOSCO. Si el wifi del stand falla, guardar
 * falla en silencio y el ranking local sigue funcionando: el jugador nunca ve
 * una pantalla colgada esperando a una red que no está.
 */

const URL_BASE = 'https://ifkkmlzjtdjkqmekticb.supabase.co';
const CLAVE = 'sb_publishable_5VnRKtG9NF1BUWWUS85ekA_tzlmDm4H';
const TABLA = 'port_quest_scores';

/** Ni una petición puede dejar la pantalla final esperando más que esto */
const TIEMPO_LIMITE = 6000;

const CABECERAS = {
  apikey: CLAVE,
  Authorization: `Bearer ${CLAVE}`,
  'Content-Type': 'application/json',
};

/** Una fila del marcador, tal cual la devuelve la tabla */
export interface FilaMarcador {
  nombre: string;
  unidad: string;
  puntos: number;
  creado_en: string;
}

/** Lo que se manda al guardar. Los campos de más no son adorno: `fila_maxima` y
 *  `duracion_ms` son los que la tabla cruza para saber si la partida es
 *  posible. */
export interface ScoreNuevo {
  nombre: string;
  unidad: string;
  puntos: number;
  fila_maxima: number;
  duracion_ms: number;
  precision_pct: number;
  terminales: string[];
}

function conLimite(ms: number): AbortSignal {
  const ctrl = new AbortController();
  setTimeout(() => ctrl.abort(), ms);
  return ctrl.signal;
}

/**
 * Guarda una partida. Devuelve `true` si quedó registrada.
 *
 * Se espera al resultado (no es «dispara y olvida») porque de él depende lo
 * siguiente que ve el jugador: si entró, el Top 10 que se le enseña es el de
 * verdad; si no, el local. Enseñarle un Top 10 del servidor sin su partida
 * dentro sería peor que no enseñarle ninguno.
 */
export async function guardaScore(fila: ScoreNuevo): Promise<boolean> {
  try {
    const r = await fetch(`${URL_BASE}/rest/v1/${TABLA}`, {
      method: 'POST',
      headers: { ...CABECERAS, Prefer: 'return=minimal' },
      body: JSON.stringify(fila),
      signal: conLimite(TIEMPO_LIMITE),
    });
    return r.ok;
  } catch {
    return false; // sin red: se queda el ranking local
  }
}

/**
 * El Top 10 del congreso. `null` si no se pudo consultar — y `null` no es lo
 * mismo que lista vacía: vacía significa «nadie ha jugado aún» y hay que
 * enseñarla, `null` significa «no lo sé» y toca caer al ranking local.
 */
export async function leeTop10(): Promise<FilaMarcador[] | null> {
  const consulta = 'select=nombre,unidad,puntos,creado_en&order=puntos.desc,creado_en.asc&limit=10';
  try {
    const r = await fetch(`${URL_BASE}/rest/v1/${TABLA}?${consulta}`, {
      headers: CABECERAS,
      signal: conLimite(TIEMPO_LIMITE),
    });
    if (!r.ok) return null;
    return (await r.json()) as FilaMarcador[];
  } catch {
    return null;
  }
}

/**
 * TREINTA caracteres, no doce.
 *
 * Con doce no cabía un nombre y un apellido —«MARIA FERNANDEZ» son quince— y en
 * un congreso donde la tabla se lee para reconocer a alguien, un nombre cortado
 * a la mitad es peor que uno largo. Treinta da de sobra para nombre y apellido
 * sin abrir la puerta a que alguien escriba un párrafo en el marcador.
 *
 * Se exporta porque el teclado en pantalla y el `maxLength` del campo tienen
 * que usar EXACTAMENTE este número: estuvieron un tiempo con su propia copia
 * del doce, que es la clase de pareja que se desincroniza en cuanto uno cambia.
 */
export const MAX_NOMBRE = 30;

/**
 * Nombre admisible para la tabla: mayúsculas, dígitos, espacio y guion,
 * empezando por letra o número.
 *
 * Se valida AQUÍ además de en la base de datos, y no por desconfianza del
 * servidor sino al revés: la restricción de la tabla es la que manda, y esto
 * solo evita que un nombre imposible viaje para volver rechazado. Si las dos
 * reglas se separan algún día, la que decide sigue siendo la de la tabla.
 */
export function limpiaNombre(nombre: string): string {
  return nombre
    .toUpperCase()
    .replace(/[^A-ZÑÁÉÍÓÚÜ0-9 -]/g, '')
    .replace(/^[^A-ZÑÁÉÍÓÚÜ0-9]+/, '')
    .slice(0, MAX_NOMBRE)
    .trim();
}

/** Una unidad de negocio tal como vive en la tabla `unidades` */
export interface Unidad {
  codigo: string;
  nombre: string;
}

/**
 * El catálogo de unidades, desde la base de datos.
 *
 * Se lee en vez de traerlo escrito en el juego para que los dos juegos del
 * stand ofrezcan LO MISMO sin tener que redesplegar dos repositorios: corregir
 * una sigla es editar una fila en Supabase. Y no es cosmético — la tabla de
 * marcadores valida la unidad con clave foránea contra esta misma lista, así
 * que un picker desincronizado no es un texto raro, es una marca rechazada.
 *
 * `null` si no se pudo consultar: el juego cae a `ORG_UNITS`, que es la copia
 * de seguridad para cuando el wifi del stand no está.
 */
export async function leeUnidades(): Promise<Unidad[] | null> {
  try {
    const r = await fetch(`${URL_BASE}/rest/v1/unidades?select=codigo,nombre&order=codigo.asc`, {
      headers: CABECERAS,
      signal: conLimite(TIEMPO_LIMITE),
    });
    if (!r.ok) return null;
    return (await r.json()) as Unidad[];
  } catch {
    return null;
  }
}

/* ============================== RESEÑAS ==============================
 *
 * Las estrellas y el comentario de la pantalla final. Viven en una tabla APARTE
 * y COMPARTIDA con Terminal Rally —al revés que los marcadores, que son dos
 * tablas separadas a propósito—. No es una incoherencia: los marcadores son dos
 * competiciones distintas y mezclarlas en una consulta sería un error, pero la
 * reseña es la MISMA pregunta hecha en dos sitios y al cerrar el congreso lo
 * que se va a querer es leerlas juntas. La columna `juego` separa cuando hace
 * falta, que es cuando cada juego enseña las suyas. Ver `supabase/marcadores.sql`.
 *
 * Y GUARDAR UNA RESEÑA NO PUEDE ROMPER NADA, igual que guardar una marca: si
 * falla, falla en silencio y la pantalla sigue. Nadie se queda sin poder volver
 * a jugar porque el wifi del stand se cayó mientras opinaba.
 */

const TABLA_RESENAS = 'resenas';
const JUEGO = 'port_quest';

/** Una reseña tal como la devuelve la tabla */
export interface Resena {
  id: number;
  estrellas: number;
  comentario: string | null;
  nombre: string | null;
  unidad: string | null;
}

/** Lo que se manda al calificar. `nombre` y `unidad` son los que esa misma
 *  persona acaba de firmar en el marcador: no se vuelven a pedir. */
export interface ResenaNueva {
  estrellas: number;
  comentario: string;
  nombre: string;
  unidad: string;
}

/**
 * CIENTO CUARENTA, no más.
 *
 * Da para una frase entera y no para un párrafo que reviente la tarjeta, que es
 * la que hay que mirar: el comentario se pinta en la pantalla final, en una
 * lista donde caben varios. Se exporta porque el `maxLength` del campo tiene
 * que decir EXACTAMENTE lo mismo que la restricción de la tabla.
 */
export const MAX_COMENTARIO = 140;

/**
 * Comentario admisible para la tabla.
 *
 * A diferencia del nombre, aquí SÍ se respetan las minúsculas: el nombre va en
 * versales porque es una tabla de marcador, pero un comentario en mayúsculas se
 * lee como un grito.
 *
 * Lo que se quita no son groserías —caben, y ninguna expresión regular lo va a
 * evitar—. Se cierra lo mecánico: emojis, caracteres invisibles y, al no
 * admitir ni dos puntos ni barra, las direcciones web, que es lo que convierte
 * una reseña en un anuncio. La restricción de la tabla es la que manda; esto
 * solo evita que un comentario imposible viaje para volver rechazado.
 */
export function limpiaComentario(texto: string): string {
  return texto
    .replace(/[^A-Za-zÁÉÍÓÚÜÑáéíóúüñ0-9 .,;!¡¿?'"()-]/g, '')
    .replace(/\s+/g, ' ')
    .slice(0, MAX_COMENTARIO)
    .trim();
}

/**
 * Guarda una reseña. Devuelve `true` si quedó registrada.
 *
 * `nombre` y `unidad` van vacíos si la firma no llegó a completarse, y la tabla
 * los admite nulos por eso: la calificación vale igual sin saber de quién es.
 */
export async function guardaResena(r: ResenaNueva): Promise<boolean> {
  const limpio = limpiaComentario(r.comentario);
  try {
    const res = await fetch(`${URL_BASE}/rest/v1/${TABLA_RESENAS}`, {
      method: 'POST',
      headers: { ...CABECERAS, Prefer: 'return=minimal' },
      body: JSON.stringify({
        juego: JUEGO,
        estrellas: r.estrellas,
        // Cadena vacía NO: la tabla exige que el comentario, si está, diga
        // algo. Se manda null y la fila queda como lo que es, una calificación
        // sin comentario.
        comentario: limpio || null,
        nombre: limpiaNombre(r.nombre) || null,
        unidad: r.unidad || null,
      }),
      signal: conLimite(TIEMPO_LIMITE),
    });
    return res.ok;
  } catch {
    return false; // sin red: la reseña se pierde, la pantalla no
  }
}

/**
 * Las reseñas de ESTE juego, la más reciente primero. `null` si no se pudo
 * consultar — y `null` no es lista vacía: vacía significa «todavía no ha
 * opinado nadie» y se enseña, `null` significa «no lo sé» y se calla.
 *
 * Se traen las cincuenta últimas y no todas: al contrario que el marcador,
 * donde la gracia es buscarse en la lista, aquí nadie va a bajar hasta la
 * reseña doscientos.
 */
export async function leeResenas(): Promise<Resena[] | null> {
  const cols = 'id,estrellas,comentario,nombre,unidad';
  const consulta = `select=${cols}&juego=eq.${JUEGO}&order=creado_en.desc&limit=50`;
  try {
    const r = await fetch(`${URL_BASE}/rest/v1/${TABLA_RESENAS}?${consulta}`, {
      headers: CABECERAS,
      signal: conLimite(TIEMPO_LIMITE),
    });
    if (!r.ok) return null;
    return (await r.json()) as Resena[];
  } catch {
    return null;
  }
}
