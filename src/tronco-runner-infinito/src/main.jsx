import { createRoot } from 'react-dom/client'
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

createRoot(document.getElementById('root')).render(<App />)
