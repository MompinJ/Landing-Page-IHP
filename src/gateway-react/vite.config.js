import { resolve } from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  // Rutas relativas: la presentacion se publica bajo /presentations/gateway-react/
  base: './',
  plugins: [react()],
  build: {
    rollupOptions: {
      input: {
        // index.html = version clara original; dark.html = espejo Navy Edition
        main: resolve(import.meta.dirname, 'index.html'),
        dark: resolve(import.meta.dirname, 'dark.html'),
      },
    },
  },
})
