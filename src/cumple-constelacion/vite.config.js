import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

import { resolve } from 'path'

// Dos paginas con el mismo codigo: la normal y el espejo censurado.
// Asi un cambio de contenido en contenido.js sale en las dos.
export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    assetsInlineLimit: 0,
    rollupOptions: {
      input: {
        index: resolve(__dirname, 'index.html'),
        censurado: resolve(__dirname, 'censurado.html'),
      },
    },
  },
})
