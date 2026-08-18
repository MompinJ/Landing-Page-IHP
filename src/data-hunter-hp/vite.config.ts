import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  // Rutas RELATIVAS: el juego no se sirve en la raiz de un dominio sino dentro
  // del hub de presentaciones (`dinamicas/data-hunter-hp/`), asi que con el
  // `base` por omision ("/") el index pedia /assets/... y no cargaba nada.
  base: './',
  plugins: [react()],
})
