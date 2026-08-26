import { createRoot } from 'react-dom/client'
import '@fontsource/montserrat/latin-400.css'
import '@fontsource/montserrat/latin-700.css'
import '@fontsource/montserrat/latin-800.css'
import '@fontsource/montserrat/latin-800-italic.css'
import '@fontsource/montserrat/latin-900-italic.css'
import './styles.css'
import { App } from './App'
import { useGame } from './store'

// GANCHO DE DEPURACION, solo con ?debug en la direccion. Es el mismo que ya
// tiene Port Quest (`__DH`) y existe por el mismo motivo: las pruebas
// automaticas necesitan poder llevar el juego a una pantalla concreta sin
// jugarse la carrera entera. Aqui hace mas falta todavia -- una carrera dura
// GAME_DURATION = 120 s de reloj de juego, y en un navegador sin pantalla ese
// reloj avanza a un tercio del real, o sea seis minutos de espera para llegar
// al formulario del final.
//
// Va aqui y no en `store.js` a proposito: en el modulo del store, cada copia
// que sirviera el empaquetador tendria su propia instancia y el gancho podria
// no ser la que usa la interfaz. Desde el arranque solo hay una.
if (typeof window !== 'undefined' && new URLSearchParams(location.search).has('debug')) {
  window.__TR = { store: useGame }
}

createRoot(document.getElementById('root')).render(<App />)
