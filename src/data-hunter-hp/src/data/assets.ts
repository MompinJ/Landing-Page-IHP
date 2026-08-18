/**
 * URLs de los assets estaticos de `public/`.
 *
 * NUNCA se referencian con ruta absoluta (`/textures/...`). El juego no se
 * sirve en la raiz de un dominio: vive dentro del hub de presentaciones, en
 * `dinamicas/data-hunter-hp/`, y ahi una ruta absoluta apunta a la raiz del
 * sitio — el index cargaba (sus rutas las reescribe Vite con `base: './'`) pero
 * las texturas que se piden en tiempo de ejecucion daban 404 y la escena se
 * quedaba colgada en el <Suspense>, sin menu y sin un error visible.
 *
 * `BASE_URL` es el `base` del build, asi que la misma linea vale para el dev
 * server, para el hub y para cualquier subcarpeta futura.
 */
const base = import.meta.env.BASE_URL;

/** Textura corrugada compartida por todas las cajas de contenedor */
export const TEX_CONTAINER = `${base}textures/container.png`;
