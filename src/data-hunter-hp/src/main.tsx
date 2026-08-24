import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { initDebug } from './debug/debug'

initDebug()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// Ya hay algo en pantalla: fuera el aviso de arranque del HTML. Si esta línea
// no llega a ejecutarse —paquete que el navegador no entiende, descarga que
// falla— el aviso se queda y explica qué pasa, que es justo su razón de ser
// (ver el bloque `#arranque` en index.html).
;(window as unknown as { __portQuestArrancado?: () => void }).__portQuestArrancado?.()
