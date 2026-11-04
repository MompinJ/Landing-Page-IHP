import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { viteSingleFile } from "vite-plugin-singlefile";

// El build genera un solo HTML autocontenido (fuentes e imagenes incluidas)
// que se abre con doble clic, sin servidor y sin internet.
export default defineConfig({
  plugins: [react(), viteSingleFile()],
  base: "./",
  build: { assetsInlineLimit: 100000000, chunkSizeWarningLimit: 5000 },
});
