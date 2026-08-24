import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  // Rutas RELATIVAS: el juego no se sirve en la raiz de un dominio sino dentro
  // del hub de presentaciones (`dinamicas/data-hunter-hp/`), asi que con el
  // `base` por omision ("/") el index pedia /assets/... y no cargaba nada.
  base: './',
  build: {
    /**
     * A QUE NAVEGADORES SE COMPILA. Es la linea que arreglo el "no carga en
     * algunos telefonos", y merece explicacion porque el sintoma no apuntaba
     * a nada.
     *
     * Vite 8 compila por omision para `["chrome111","edge111","firefox114",
     * "safari16.4","ios16.4"]` — o sea, dando por hecho un iPhone actualizado
     * a marzo de 2023 como MINIMO. Con eso el paquete sale con sintaxis que un
     * telefono mas viejo no entiende: asignacion logica (`??=`, `||=`, `&&=`),
     * que es de 2021 y que React y sus dependencias usan a manos llenas —
     * medido, 80 apariciones en el paquete.
     *
     * Y esto falla de la peor manera posible. No es una funcion que se rompe:
     * es un error de SINTAXIS, o sea que el navegador ni siquiera llega a
     * ejecutar la primera linea. No hay excepcion que capturar, no hay mensaje,
     * no hay nada en la consola que el que lo sufre vaya a mirar. Solo una
     * pantalla en blanco. Por eso el sintoma era "no carga" y no "va mal".
     *
     * El suelo lo marca WebGL2, que es lo que three exige desde r163 y que
     * llego con Safari 15 (septiembre de 2021). Compilar por debajo de ahi no
     * serviria de nada — el juego no podria dibujar igualmente —, pero se baja
     * un escalon mas (ios14) a proposito: asi el paquete SI se ejecuta en esos
     * aparatos y puede enseñar el aviso de "tu navegador no puede con esto" en
     * vez de dejar la pantalla vacia (ver `src/ui/Incompatible.tsx`).
     *
     * Lo que se paga por bajar el objetivo es unos pocos kilobytes: solo se
     * transpila la sintaxis nueva, y las cosas caras de emular (async/await,
     * generadores) son de ES2017 y quedan por encima de este suelo.
     */
    target: ['es2020', 'safari14', 'ios14', 'chrome87', 'edge88', 'firefox78'],
  },
  plugins: [react()],
})
