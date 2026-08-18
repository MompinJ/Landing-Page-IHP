import React from 'react'
import ReactDOM from 'react-dom/client'
import * as THREE from 'three'

import App from './App'
import './estilos.css'

// Entrada de la version espejo: identica a la normal salvo que los
// recuerdos de cada foto salen tachados. Ver main.jsx para el porque
// de apagar la gestion de color.
THREE.ColorManagement.enabled = false

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App censura />
  </React.StrictMode>
)
