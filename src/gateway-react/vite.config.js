import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  // Rutas relativas: la presentacion se publica bajo /presentations/gateway-react/
  base: './',
  plugins: [react()],
})
