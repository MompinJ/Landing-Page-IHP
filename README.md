# Repositorio de Presentaciones

Hub estatico para navegar entre presentaciones independientes. Cada presentacion vive en su propia carpeta bajo `presentations/<slug>/` con sus propios estilos, scripts y assets — **no hay acoplamiento entre ellas**.

## Estructura

```
/
  index.html              # Hub (indice navegable)
  hub.css                 # Estilos del hub
  hub.js                  # Render dinamico de tarjetas
  presentations.json      # Manifest de presentaciones y plantillas
  presentations/          # Presentaciones reales (una carpeta por slug)
    check-eat/
      index.html
      Check-Eat.pdf
      css/styles.css
      js/presentation.js
      assets/checkeat-icon.png
  plantillas/             # Plantillas 3D listas para duplicar
    README.md             # Guia de uso de las plantillas
    cubo-3d/
    orbita-3d/
    profundidad-3d/
    galaxia-3d/
    sonar-3d/
    altamar-3d/
    carta-nautica-3d/
    hp-corporativo-3d/
    hp-terminal-3d/
    hp-red-global-3d/
    ciudad-3d/
    puerto-3d/
    grua-sim-3d/
  dinamicas/              # Juegos interactivos para la audiencia
    mexico-hp/
    trivia-grua/
```

## Como abrir

El hub usa `fetch()` para leer el manifest, asi que necesita un servidor HTTP (no funciona via `file://`).

```bash
python -m http.server 8080
# http://localhost:8080
```

## Plantillas 3D

En `plantillas/` hay 4 bases listas para duplicar, todas vanilla y con navegacion completa (teclado, swipe, rueda):

| Plantilla | Tecnica | Estetica |
|---|---|---|
| `cubo-3d` | Cubo CSS 3D que rota en cada transicion | Oscura, cian electrico |
| `orbita-3d` | Carrusel cilindrico con arrastre e inercia | Aurora violeta, glassmorphism |
| `profundidad-3d` | Lienzo infinito estilo impress.js, camara que vuela | Editorial: papel, serif, tinta |
| `galaxia-3d` | Campo de estrellas WebGL (Three.js) con warp | Espacio profundo, glass |
| `sonar-3d` | Descenso submarino en Z, medidor de profundidad vivo | Naval: CRT abisal, verde sonar |
| `altamar-3d` | Oleaje canvas que se embravece, cielo del alba a la noche | Naval: travesia, vela y laton |
| `carta-nautica-3d` | Mesa de derrota 3D, ruta trazada en vivo y barco | Naval: papel de carta, tinta, rojo |
| `hp-corporativo-3d` | Barrido diagonal a 30.3 grados + parallax por capas | Hutchison Ports (manual v4.1) |
| `hp-terminal-3d` | Grua portico que iza y baja contenedores 3D | Hutchison Ports: patio y paleta oficial |
| `hp-red-global-3d` | Globo de puntos WebGL que gira a cada puerto | Hutchison Ports: red global sobre blanco |
| `ciudad-3d` | Avenida nocturna; arrastra para mirar alrededor | Interactiva: neones y espectaculares LED |
| `puerto-3d` | Diorama de puerto orbitable con gruas trabajando | Interactiva: maqueta de dia de operacion |
| `grua-sim-3d` | Simulador de grua con fisica (modo cabina con M) | Interactiva: amanecer industrial |

Para usar una: `cp -r plantillas/<plantilla> presentations/<tu-slug>`, edita las slides y registrala en el manifest. Detalles en `plantillas/README.md`. Las plantillas aparecen en su propia seccion del hub (clave `templates` del manifest).

## Dinamicas

Juegos interactivos para la audiencia, en `dinamicas/<slug>/` (clave `dinamicas` del manifest, tercera seccion del hub):

| Dinamica | Que hace el participante |
|---|---|
| `mexico-hp` | Navega un buque por un mapa de Mexico que al tocar tierra se convierte en grua movil. Hay que llegar a las 5 sedes de Hutchison Ports (Ensenada, Manzanillo, Lazaro Cardenas, Veracruz, Hidalgo); cada llegada abre la ficha de la sede en pantalla completa con sus unidades de negocio (ICAVE/TNG/HPMX, LCT/LCMT, etc.) y un boton ACEPTAR para continuar. Tren intermodal Veracruz-Hidalgo con la tecla T |
| `trivia-grua` | Llega un contenedor con una pregunta rotulada; hay que operarlo con la grua (teclado o consola de botones en pantalla) y soltarlo en la plataforma VERDADERO o FALSO. Balanceo de pendulo, caida con gravedad, veredicto en grande y marcador de aciertos. Preguntas editables en `js/trivia.js` |

## Como agregar una presentacion nueva

1. Crear carpeta `presentations/<slug>/` con su propio `index.html` y assets (CSS/JS/imagenes que necesite). Total libertad de stack y estilos. La via rapida: duplicar una plantilla de `plantillas/`.
2. Agregar entrada en `presentations.json`:

```json
{
  "slug": "mi-presentacion",
  "title": "Mi Presentacion",
  "subtitle": "Subtitulo corto",
  "description": "Descripcion mas larga visible en la tarjeta.",
  "date": "2026-06",
  "tags": ["Tag1", "Tag2"],
  "accent": "#2563eb",
  "theme": "mi-presentacion",
  "path": "presentations/mi-presentacion/index.html"
}
```

3. (Opcional) Para que la tarjeta adopte el estilo visual de la presentacion, define un bloque de tema en `hub.css` bajo `[data-theme="<slug>"]` reutilizando sus colores, fuentes y decoracion. Sin `theme` (o sin bloque) la tarjeta usa el estilo brutalista por defecto.
4. Recargar el hub. La tarjeta aparece automaticamente y su titulo entra al marquee superior.

Campos `subtitle`, `description`, `date`, `tags`, `accent`, `theme` son opcionales. Solo `title` y `path` obligatorios. El campo `accent` colorea la barra superior y el hover de la tarjeta; `theme` selecciona el bloque de estilo en `hub.css`.

## Presentaciones actuales

| Slug | Titulo |
|---|---|
| `check-eat` | Check-Eat — Nutricion Estudiantil UCC (10 slides) |
| `infra-azure-hub` | Infraestructura Azure — HUB Hutchison Ports, Ultra-MVP (10 slides, React) |

## Notas

- Sin build, sin npm. HTML/CSS/JS vanilla.
- El hub ordena por `date` descendente (mas reciente primero).
- Cada presentacion implementa lo que quiera (slides custom, scroll, video, etc).
