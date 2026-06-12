# Plantillas de presentaciones 3D

Cuatro plantillas listas para duplicar. Todas son HTML/CSS/JS vanilla, sin build, y comparten el mismo esquema de navegacion (flechas, espacio, PgUp/PgDn, Home/End, swipe tactil y rueda del mouse).

| Plantilla | Tecnica 3D | Estetica | Ideal para |
|---|---|---|---|
| `cubo-3d` | Cubo CSS 3D que rota en cada transicion | "Obsidiana": oscuro, cian electrico | Pitch tecnico, demos de producto |
| `orbita-3d` | Carrusel cilindrico con arrastre e inercia | "Aurora": violeta nocturno, glassmorphism | Charlas creativas, portafolios |
| `profundidad-3d` | Lienzo infinito estilo impress.js (camara que vuela) | "Editorial": papel, serif, tinta | Narrativa, storytelling, clases |
| `galaxia-3d` | Campo de estrellas WebGL (Three.js) con warp | "Void": espacio profundo, glass | Keynotes, lanzamientos |
| `sonar-3d` | Descenso en Z con medidor de profundidad animado | "Abisal": CRT submarino, verde sonar | Deep-dives tecnicos, investigaciones |
| `altamar-3d` | Oleaje canvas vivo + cielo que viaja del alba a la noche | "Travesia": vela, serif, laton | Narrativas de proyecto, retrospectivas |
| `carta-nautica-3d` | Mesa de derrota inclinada, ruta que se traza en vivo | "Derrota": papel de carta, tinta, rojo | Roadmaps, planes con etapas |
| `hp-corporativo-3d` | Barrido diagonal a 30.3 + parallax por capas | Marca Hutchison Ports (manual v4.1) | Decks corporativos HP |
| `hp-terminal-3d` | Grua portico que iza/baja contenedores 3D | Patio HP: paleta oficial, acero, AGV | Operaciones, proyectos de terminal |
| `hp-red-global-3d` | Globo de puntos WebGL que gira a cada puerto | Red global HP sobre blanco | Estrategia, expansion, red |
| `ciudad-3d` | Avenida nocturna CSS 3D; arrastra para mirar | Neones, torres, espectaculares LED | Lanzamientos, marca, hype |
| `puerto-3d` | Diorama de puerto orbitable; gruas trabajando solas | Dia de operacion, maqueta | Operaciones, recorridos de proyecto |
| `grua-sim-3d` | Simulador: opera la grua con A/D, W/S y ESPACIO | Amanecer industrial, acero, safety | Demos memorables, talleres |

## Como usar una plantilla

1. Copia la carpeta de la plantilla a `presentations/<tu-slug>/`:

   ```bash
   cp -r plantillas/cubo-3d presentations/mi-presentacion
   ```

2. Edita `presentations/<tu-slug>/index.html`: cada `<section class="slide">` es una slide. Agrega, quita o reordena las que necesites.

3. Ajusta colores y tipografia en `css/styles.css` (todas las plantillas concentran su identidad en las variables de `:root`).

4. Registra la presentacion en `presentations.json` (ver README raiz).

## Notas por plantilla

- **cubo-3d** — soporta cualquier numero de slides (el cubo se "recicla": solo existen la cara actual y la entrante). Velocidad del giro en `SPIN_MS` (`js/cubo.js`).
- **orbita-3d** — el anillo se recalcula segun el numero de slides; entre 5 y 10 se ve mejor. Se puede arrastrar con mouse/tactil y tiene inercia (`FRICTION` en `js/orbita.js`).
- **profundidad-3d** — cada slide declara su posicion con `data-x/y/z`, `data-rotate`, `data-rotate-x/y` y `data-scale`. `Esc` muestra el mapa completo y se puede hacer click en cualquier slide para volar a ella.
- **galaxia-3d** — unica con dependencia externa: Three.js via CDN (jsdelivr). Si no hay internet el fondo cae a un degradado CSS y la presentacion sigue funcionando. Cantidad de estrellas en `STAR_COUNT` (`js/galaxia.js`).
- **sonar-3d** — cada slide declara `data-depth` (metros) y `data-zone`; el medidor lateral y el contador se animan en cada cambio. El sonar de la esquina dibuja un blip por slide. Velocidad del descenso en `DIVE_MS` (`js/sonar.js`).
- **altamar-3d** — el cielo se reparte entre las slides (amanecer al inicio, noche al final): fases en el arreglo `SKY` de `js/altamar.js`. El oleaje es canvas 2D y se embravece en cada transicion (`SWELL` / `SURGE`).
- **carta-nautica-3d** — cada slide declara `data-cx` / `data-cy` (px, origen en el centro de la carta). La derrota SVG, el barco y la vista de mapa (`Esc`) se recalculan solos al mover waypoints. Inclinacion de la mesa en `TILT_FOCUS` / `TILT_MAP` (`js/carta.js`).

### Serie Hutchison Ports (basadas en el manual de identidad v4.1)

Las tres respetan el sistema de marca: angulo dinamico de 30.3 grados siempre ascendente, formas Sky/Horizon/Sea planas (sin sombras ni transparencias), Montserrat con titulares Black en mayusculas terminados en punto, body copy en Ports Sea Blue y la paleta oficial (Sky `#009BDE`, Sea `#002E6D`, Horizon `#9ACAEB`, Aqua `#54BBAB`, Sunray `#FFC627`, Sunset `#EE7523`).

- **hp-corporativo-3d** — cada slide elige su forma de marca con clases (`slide--sky`, `slide--sea`, `slide--divider`, `slide--stat`...). Transicion de barrido diagonal a 30.3 rotando la paleta; las formas flotan en capas con parallax (`data-depth`). Contadores animados con `data-count` / `data-decimals`.
- **hp-terminal-3d** — cada slide es un contenedor 3D colgado del spreader; la grua iza el saliente y baja el entrante con balanceo. Los colores rotan la paleta oficial automaticamente (`PALETTE` en `js/terminal.js`). El placard blanco dentro del contenedor es la zona de contenido.
- **hp-red-global-3d** — el globo de puntos gira hasta el puerto de cada slide (`data-port`); puertos reales editables en el arreglo `PORTS` (`js/red.js`) con nombre, codigo y lat/lon. Arcos entre escalas con pulsos de carga. Unica de la serie con dependencia externa (Three.js via CDN, con fallback estatico).

### Serie interactiva (el usuario toca, no solo mira)

- **ciudad-3d** — la avenida se genera sola alrededor de tus slides (`SPACING`, `TOWERS_PER_BLOCK` en `js/ciudad.js`). Arrastrar gira la mirada en cualquier momento y al soltar la vista regresa al rumbo. Cada `<section class="bb">` es un espectacular.
- **puerto-3d** — el diorama (buque, gruas, patio, gate) es todo CSS 3D generado por `js/puerto.js`. Las gruas trabajan solas en loop. Cada slide tiene su vista de camara en el arreglo `VIEWS` (orbita, inclinacion, zoom y centro); arrastrar orbita libre.
- **grua-sim-3d** — dos modos con la misma fisica de pendulo: AUTO (flechas ejecutan la maniobra completa: archivar la slide en la pila, el camion trae la siguiente) y CABINA (tecla `M`: A/D trolley, W/S izaje, ESPACIO enganchar/soltar, con letrero de objetivo). El contenido vive en `<template class="slide-src">` del HTML.

## Convenciones compartidas

- Sin emojis ni assets binarios: todo es codigo.
- `prefers-reduced-motion` respetado en las cuatro.
- HUD con progreso y contador incluido.
- Cada plantilla cierra con una slide de "como personalizar".
