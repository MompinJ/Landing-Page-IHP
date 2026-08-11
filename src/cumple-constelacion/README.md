# Constelacion

Pagina de cumpleanos. Un viaje en scroll por un cielo nocturno: cuatro fotos
aparecen flotando como cartas de cristal con filo dorado y, al final, las
estrellas se unen y dibujan una constelacion junto al mensaje.

Hecho con React, Three.js (React Three Fiber) y shaders propios. Sin
post-procesado pesado: el brillo sale de mezcla aditiva, asi que corre bien
en telefono.

## Que tengo que cambiar

Casi todo esta en un solo archivo: **`src/contenido.js`**.

1. **Las fotos.** Copia tus cuatro imagenes a `public/fotos/` y apunta las
   rutas en `contenido.fotos[].src` (ruta relativa, sin diagonal al inicio).
   **El marco toma solo la proporcion del archivo**, asi que por defecto no se
   recorta nada y no hay que declarar orientacion. Si una foto necesita
   reencuadre — por ejemplo, si los protagonistas salen chiquitos en una
   esquina — se le ponen dos campos opcionales:

   ```js
   zoom: 1.42,            // >1 acerca; 1.5 = se ve la mitad del encuadre
   centro: [0.535, 0.355] // x: 0 izquierda, 1 derecha. y: 0 abajo, 1 arriba
   ```
2. **El nombre**, en `contenido.intro.nombre`.
3. **Los textos de cada foto**, en `titulo` y `texto`.
4. **El mensaje final**, en `contenido.mensaje.parrafos` (un string por
   parrafo).

El color de acento vive en `paleta` al final del mismo archivo, y hay que
cambiarlo tambien en `src/estilos.css` (variables `--oro`, `--oro-claro`,
`--oro-tenue`) si se quiere otra gama.

## Correrlo

```bash
cd src/cumple-constelacion
npm install
npm run dev      # http://localhost:5173
```

## Publicarla

Este repo se despliega estatico y **sin build step**, asi que hay que
compilar a mano y copiar el resultado antes de hacer push, igual que con
`gateway-react` y `tronco-runner`. El script lo hace todo:

```bash
src/cumple-constelacion/publicar.sh
```

Son **dos enlaces** con el mismo codigo (con la diagonal final):

| Carpeta | Que se ve |
| --- | --- |
| `para-ti-v7qybjrdrcit/` | La buena: los recuerdos se leen |
| `para-ti-8xqyvcsdgesw/` | El espejo: los recuerdos salen tachados |

El espejo es la broma: identico en todo — mismas fotos, mismos titulos,
mismo mensaje final — salvo que el texto de cada foto sale como documento
censurado. Sale de una segunda pagina de Vite (`censurado.html` +
`src/main-censurado.jsx`), que monta el mismo `<App censura />`. **Por eso un
cambio en `contenido.js` sale en las dos**: no hay contenido duplicado.

Cada barra se dibuja del ancho que le tocaria a su palabra y el texto no se
escribe en el DOM, asi que en la pagina censurada no hay nada que
seleccionar. Ojo: el texto si viaja en el bundle de JavaScript, porque
`contenido.js` es compartido. Es una broma, no un secreto.

### Esta pagina es la excepcion del hub

A proposito **no** tiene entrada en `presentations.json` ni fila en el README
raiz: no debe aparecer como tarjeta en el indice. Solo llega quien tenga la
direccion. Por eso tambien lleva `<meta name="robots" content="noindex">` y
por eso el nombre de la carpeta es una cadena aleatoria.

El `base: './'` de `vite.config.js` y el `import.meta.env.BASE_URL` de
`Fotos.jsx` son lo que permite que viva en una subcarpeta: si alguien pone
rutas absolutas (`/fotos/1.jpg`) las fotos dejan de cargar.

## Como esta armado

| Archivo | Que hace |
| --- | --- |
| `src/contenido.js` | Todo el texto y las rutas de las fotos |
| `src/util/medidas.js` | Donde se para la camara en cada pagina y cuanto mide todo en pantalla |
| `src/escena/Estrellas.jsx` | El campo de estrellas, un solo buffer con shader de parpadeo |
| `src/escena/Nebulosas.jsx` | Nubes de gas tenues repartidas por el recorrido |
| `src/escena/PolvoDorado.jsx` | Motas doradas que viajan pegadas a la camara |
| `src/escena/Fotos.jsx` | Mide cada imagen y decide tamano y posicion del marco |
| `src/escena/Foto.jsx` | El marco: esquinas redondeadas, filo dorado, halo y revelado por shader |
| `src/escena/Constelacion.jsx` | El trazo final, que se dibuja solo conforme la camara llega |
| `src/ui/Overlay.jsx` | El texto en HTML que viaja con el scroll |
| `src/ui/Portada.jsx` | La puerta de entrada mientras cargan las fotos |

### Detalles que conviene no romper

- Las fotos estan separadas 10 unidades en el eje Z y se miran desde 7. El
  rango de aparicion en `Foto.jsx` (8.6 a 15.4) tiene que caber en ese hueco;
  si se abre mas, se alcanzan a ver dos fotos a la vez.
- La escena trabaja en sRGB directo: `THREE.ColorManagement` esta apagado en
  `main.jsx` y el Canvas va en `linear` + `flat`. Los shaders asumen eso.
- Todo lo que brilla usa `AdditiveBlending` con `depthWrite` apagado. Ahi sale
  el efecto de resplandor sin pagar un bloom real.
