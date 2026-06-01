# Repositorio de Presentaciones

Hub estatico para navegar entre presentaciones independientes. Cada presentacion vive en su propia carpeta bajo `presentations/<slug>/` con sus propios estilos, scripts y assets — **no hay acoplamiento entre ellas**.

## Estructura

```
/
  index.html              # Hub (indice navegable)
  hub.css                 # Estilos del hub
  hub.js                  # Render dinamico de tarjetas
  presentations.json      # Manifest de presentaciones
  presentations/
    check-eat/
      index.html
      Check-Eat.pdf
      css/styles.css
      js/presentation.js
      assets/checkeat-icon.png
```

## Como abrir

El hub usa `fetch()` para leer el manifest, asi que necesita un servidor HTTP (no funciona via `file://`).

```bash
python -m http.server 8080
# http://localhost:8080
```

## Como agregar una presentacion nueva

1. Crear carpeta `presentations/<slug>/` con su propio `index.html` y assets (CSS/JS/imagenes que necesite). Total libertad de stack y estilos.
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
  "path": "presentations/mi-presentacion/index.html"
}
```

3. Recargar el hub. La tarjeta aparece automaticamente.

Campos `subtitle`, `description`, `date`, `tags`, `accent` son opcionales. Solo `title` y `path` obligatorios. El campo `accent` colorea la barra superior y el hover de la tarjeta.

## Presentaciones actuales

| Slug | Titulo |
|---|---|
| `check-eat` | Check-Eat — Nutricion Estudiantil UCC (10 slides) |

## Notas

- Sin build, sin npm. HTML/CSS/JS vanilla.
- El hub ordena por `date` descendente (mas reciente primero).
- Cada presentacion implementa lo que quiera (slides custom, scroll, video, etc).
