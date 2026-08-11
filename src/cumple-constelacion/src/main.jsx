import React from 'react'
import ReactDOM from 'react-dom/client'
import * as THREE from 'three'

import App from './App'
import './estilos.css'

// Todos los shaders de esta escena estan escritos pensando en valores sRGB
// directos. Al desactivar la gestion de color, three deja de convertir
// texturas y colores por su cuenta y lo que se escribe es lo que se ve.
THREE.ColorManagement.enabled = false

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
