import { createRoot } from 'react-dom/client'
import { configureTextBuilder } from 'troika-three-text'
import '@fontsource/montserrat/latin-400.css'
import '@fontsource/montserrat/latin-700.css'
import '@fontsource/montserrat/latin-800.css'
import '@fontsource/montserrat/latin-800-italic.css'
import '@fontsource/montserrat/latin-900-italic.css'
import './styles.css'
import { App } from './App'
import { useGame } from './store'
import * as curso from './course'
import * as constantes from './constants'

// GANCHO DE DEPURACION, solo con ?debug en la direccion. Es el mismo que ya
// tiene Port Quest (`__DH`) y existe por el mismo motivo: las pruebas
// automaticas necesitan poder llevar el juego a una pantalla concreta sin
// jugarse la carrera entera. Aqui hace mas falta todavia: esta carrera NO SE
// ACABA SOLA -- sin reloj, la unica forma de llegar a la pantalla final es
// chocarse, asi que una prueba que quiera ver el formulario tiene que ponerlo
// ella.
//
// Va aqui y no en `store.js` a proposito: en el modulo del store, cada copia
// que sirviera el empaquetador tendria su propia instancia y el gancho podria
// no ser la que usa la interfaz. Desde el arranque solo hay una.
if (typeof window !== 'undefined' && new URLSearchParams(location.search).has('debug')) {
  // Se expone tambien el curso: en un juego generado, media prueba consiste en
  // preguntarle al generador que puso donde -- cuantos camiones, donde cae el
  // gancho de la grua -- y eso no se puede leer de la pantalla.
  // Y las constantes: una prueba que quiera saber cuanto cierra de pista un
  // contenedor de cuarenta pies no puede llevar su propia copia del numero, que
  // es como se acaba comprobando contra un valor que el juego ya no usa.
  window.__TR = { store: useGame, curso, constantes }
}

/* TEXTO 3D DETRAS DE UNA CSP ESTRICTA -----------------------------------------

  Las etiquetas de las fichas, los porticos y los carteles de la pista los
  dibuja troika (el <Text> de drei), que por defecto compila la tipografia en un
  WEB WORKER creado a partir de un blob. Un sitio con `default-src 'self'`
  bloquea eso -- `worker-src` no suele declararse y cae en `script-src`, donde
  `blob:` no esta -- y el destrozo no es quedarse sin letras: la interfaz entera
  deja de responder. Medido contra la CSP real del sitio que lo aloja: pulsar
  JUGAR no hacia absolutamente nada.

  Aqui hubo una sonda que intentaba crear un worker de mentira para decidir. NO
  FUNCIONA, y conviene dejarlo escrito para que nadie lo reintente: Chrome
  bloquea el worker pero NO lanza ninguna excepcion, asi que la sonda decia que
  si. Y no hay forma sincrona de preguntarlo -- la violacion de CSP llega como
  evento, despues --, mientras que esto hay que decidirlo ANTES del primer
  render (troika ignora la configuracion en cuanto se le ha pedido una fuente).

  La otra salida era pedirle al sitio que abriera su CSP. No: el juego es el
  invitado, y un invitado no cambia la cerradura de la casa.

  Asi que se compone en el hilo principal SIEMPRE. Lo que cuesta esta medido y
  es al arrancar, no en carrera: troika parsea la fuente una vez y luego cachea
  cada palabra ya compuesta, y el glosario entero son 363 palabras cortas.
*/
configureTextBuilder({ useWorker: false })

createRoot(document.getElementById('root')).render(<App />)
