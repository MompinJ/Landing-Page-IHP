// MARCADOR DEL CONGRESO - Supabase.
//
// Sin backend propio: Supabase publica una API REST sobre la tabla y el juego
// habla directamente con ella. Port Quest y Terminal Rally comparten proyecto
// pero NO tabla: son dos marcadores distintos y asi nadie los mezcla por error
// en una consulta.
//
// LA CLAVE VA AQUI A LA VISTA Y ESTA BIEN QUE ASI SEA. Es la clave publishable
// de Supabase, disenada para viajar en el navegador; quien la copie no puede
// hacer mas de lo que puede hacer cualquiera abriendo el juego. Lo que impide
// el destrozo no es esconderla -en un sitio estatico no hay donde- sino lo que
// hay del otro lado: RLS concede LEER e INSERTAR y nada mas, asi que no se
// puede editar ni borrar lo de otro; y unas restricciones en la propia tabla
// rechazan cualquier marca que no pueda haber ocurrido (mas puntos que metros
// recorridos, o una carrera de 2000 m resuelta en un segundo). Ver
// supabase/marcadores.sql en el repo de Port Quest, que es donde vive esa
// defensa y lo explica entero.
//
// NADA DE ESTO PUEDE BLOQUEAR EL KIOSCO. Si el wifi del stand falla, guardar
// falla en silencio y la tabla local sigue funcionando: el corredor nunca ve
// una pantalla colgada esperando a una red que no esta.

const URL_BASE = 'https://ifkkmlzjtdjkqmekticb.supabase.co'
const CLAVE = 'sb_publishable_5VnRKtG9NF1BUWWUS85ekA_tzlmDm4H'
const TABLA = 'terminal_rally_scores'

// Ni una peticion puede dejar la pantalla final esperando mas que esto
const TIEMPO_LIMITE = 6000

const CABECERAS = {
  apikey: CLAVE,
  Authorization: `Bearer ${CLAVE}`,
  'Content-Type': 'application/json',
}

function conLimite(ms) {
  const ctrl = new AbortController()
  setTimeout(() => ctrl.abort(), ms)
  return ctrl.signal
}

// TREINTA caracteres, no doce.
//
// Con doce no cabia un nombre y un apellido -"MARIA FERNANDEZ" son quince- y en
// un congreso donde la tabla se lee para reconocer a alguien, un nombre cortado
// a la mitad es peor que uno largo. Treinta da de sobra para nombre y apellido
// sin abrir la puerta a que alguien escriba un parrafo en el marcador.
//
// Se exporta porque el teclado en pantalla y el `maxLength` del campo tienen que
// usar EXACTAMENTE este numero: estuvieron un tiempo con su propia copia del
// doce, que es la clase de pareja que se desincroniza en cuanto uno cambia.
export const MAX_NOMBRE = 30

// Nombre admisible para la tabla: mayusculas, digitos, espacio y guion,
// empezando por letra o numero.
//
// Se valida AQUI ademas de en la base de datos, y no por desconfianza del
// servidor sino al reves: la restriccion de la tabla es la que manda, y esto
// solo evita que un nombre imposible viaje para volver rechazado.
export function limpiaNombre(nombre) {
  return nombre
    .toUpperCase()
    .replace(/[^A-ZÑÁÉÍÓÚÜ0-9 -]/g, '')
    .replace(/^[^A-ZÑÁÉÍÓÚÜ0-9]+/, '')
    .slice(0, MAX_NOMBRE)
    .trim()
}

// Guarda una carrera. Devuelve true si quedo registrada en el congreso.
export async function guardaMarca({ nombre, unidad, puntos, distancia, duracionMs }) {
  try {
    const r = await fetch(`${URL_BASE}/rest/v1/${TABLA}`, {
      method: 'POST',
      headers: { ...CABECERAS, Prefer: 'return=minimal' },
      body: JSON.stringify({
        nombre,
        unidad,
        puntos,
        distancia: Math.max(0, Math.round(distancia)),
        duracion_ms: Math.max(0, Math.round(duracionMs)),
      }),
      signal: conLimite(TIEMPO_LIMITE),
    })
    return r.ok
  } catch {
    return false // sin red: se queda la tabla local
  }
}

// La tabla del congreso. `null` si no se pudo consultar - y null NO es lo mismo
// que lista vacia: vacia significa "todavia no ha corrido nadie" y hay que
// ensenarla, null significa "no lo se" y toca caer a la tabla local.
//
// Salen TODOS los corredores y no un top recortado, que es como funciona esta
// tabla desde siempre: en el stand la gracia es buscarse en la lista y ver a
// los companeros. El tope de 500 es solo para que una jornada larga no acabe
// trayendose miles de filas a una tarjeta con scroll.
export async function leeTabla() {
  const consulta = 'select=id,nombre,unidad,puntos&order=puntos.desc,creado_en.asc&limit=500'
  try {
    const r = await fetch(`${URL_BASE}/rest/v1/${TABLA}?${consulta}`, {
      headers: CABECERAS,
      signal: conLimite(TIEMPO_LIMITE),
    })
    if (!r.ok) return null
    const filas = await r.json()
    // La tabla de la interfaz lleva `name` y `unit` desde antes de que hubiera
    // base de datos; se traduce aqui para no tocar el componente.
    return filas.map((f) => ({ id: f.id, name: f.nombre, unit: f.unidad, score: f.puntos }))
  } catch {
    return null
  }
}

// El catalogo de unidades, desde la base de datos.
//
// Se lee en vez de traerlo escrito en el juego para que los dos juegos del
// stand ofrezcan LO MISMO sin redesplegar dos repositorios: corregir una sigla
// es editar una fila en Supabase. Y no es cosmetico -- la tabla de marcadores
// valida la unidad con clave foranea contra esta misma lista, asi que un picker
// desincronizado no es un texto raro, es una marca rechazada.
//
// null si no se pudo consultar: el juego cae a BUSINESS_UNITS, que es la copia
// de seguridad para cuando el wifi del stand no esta.
export async function leeUnidades() {
  try {
    const r = await fetch(`${URL_BASE}/rest/v1/unidades?select=codigo&order=codigo.asc`, {
      headers: CABECERAS,
      signal: conLimite(TIEMPO_LIMITE),
    })
    if (!r.ok) return null
    return (await r.json()).map((f) => f.codigo)
  } catch {
    return null
  }
}
