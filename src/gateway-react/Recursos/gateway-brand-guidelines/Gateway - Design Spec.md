# Gateway — Especificación de marca y diseño

> Documento de handoff para Claude Code. Describe la identidad visual de **Gateway**, la plataforma digital del **Instituto Hutchison Ports (IHP HUB)**. Acompáñalo con la carpeta `Gateway SVG/` (kit de logos en vectorial).

---

## 1. Qué es Gateway

Gateway es la marca de la **plataforma digital de capacitación, comunidad y reconocimiento** del Instituto Hutchison Ports. El concepto central es **"una sola puerta a todo el HUB"**: un inicio de sesión único (single sign-on) desde el cual el trabajador accede a formación, comunidad y reportes.

- **Significado:** puerta de acceso / gateway.
- **Carácter:** confianza, institucional, seguro, profesional.
- **Tono:** corporativo pero cercano; la ruta más institucional y de confianza del HUB.

---

## 2. El logotipo

El logotipo combina **isotipo** (símbolo) + **wordmark** (`gateway` en minúsculas).

### Wordmark
- Texto: `gateway`, siempre en **minúsculas**.
- Fuente: **Montserrat ExtraBold (800)** en digital — equivalente exacto de **Verlag Black** en impresión.
- Color partido: `gate` en **Sea Blue `#002E6D`** + `way` en el color firma (por defecto **Aqua Green `#54BBAB`**).
- `letter-spacing` muy cerrado: aprox. `-0.045em` (escala con el tamaño; p. ej. `-7px` a 170px, `-3.5px` a 80px).

### Respaldo institucional
- `by HUTCHISON PORTS` acompaña al logotipo en contextos formales.
- "BY" en mayúsculas, tracking amplio, color tenue.
- `HUTCHISON` en peso 800, `PORTS` en peso 500, separados por `margin-left: 0.05em`.

### Área de protección
- Margen libre mínimo alrededor del logotipo = **altura del isotipo**.

---

## 3. El isotipo (símbolo)

Un **arco-portal** atravesado por una **flecha ascendente**. Representa el login único (la puerta) y el progreso (la flecha que sube nivel a nivel).

### Anatomía
1. **Arco-portal exterior** — la puerta de entrada. Estable, segura, abierta.
2. **Arco interior** (opacidad 0.5) — profundidad: detrás de la puerta hay un recorrido.
3. **Flecha ascendente** — atraviesa el portal hacia arriba: entrar es progresar.

### SVG del símbolo (canónico)

Se dibuja como trazo (`stroke`), nunca relleno. `viewBox="0 0 96 96"`, `currentColor` para que herede el color del contexto:

```svg
<svg viewBox="0 0 96 96">
  <g fill="none" stroke="currentColor" stroke-width="5.5" stroke-linejoin="round" stroke-linecap="round">
    <path d="M22 80 V52 A26 26 0 0 1 74 52 V80"/>
    <path d="M34 80 V55 A14 14 0 0 1 62 55 V80" stroke-opacity="0.5"/>
    <path d="M48 80 V37 M40.5 47 L48 37 L55.5 47" stroke-width="4"/>
  </g>
</svg>
```

> En código, defínelo una vez como `<symbol id="g-mark">` y reutilízalo con `<use href="#g-mark">`, controlando el color vía `style="color:…"`.

---

## 4. Paleta de color

Paleta corporativa **Hutchison Ports Brand Guidelines v4.1**. Gateway hereda la paleta completa; el **Aqua Green** es su color firma.

### Primarios
| Nombre | HEX | Pantone | Uso |
|---|---|---|---|
| Ports Sky Blue | `#009BDE` | PMS 2925 | Primario corporativo |
| Ports Sea Blue | `#002E6D` | PMS 294 | Texto, fondos oscuros, `gate` del wordmark |

### Secundarios
| Nombre | HEX | Pantone | Uso |
|---|---|---|---|
| Horizon Blue | `#9ACAEB` | PMS 291 | Acentos sobre fondo oscuro |
| **Aqua Green ★** | `#54BBAB` | PMS 3258 | **Color firma de Gateway** — `way`, isotipo, CTAs |
| Sunray Yellow | `#FFC627` | PMS 123 | Acento puntual (flecha, destacados) |
| Sunset Orange | `#EE7523` | PMS 158 | Acento puntual |

### Variantes del Aqua Green usadas en el sistema
- `#2BA697` — verde más oscuro, para texto/etiquetas sobre fondo claro (mejor contraste que `#54BBAB`).
- `#6FCBBC` — verde más claro, para `way` sobre fondo Sea Blue oscuro.

### Neutros y fondos de soporte
| Token | HEX | Uso |
|---|---|---|
| Fondo claro menta | `#F2FAF8` | Fondo de slides/secciones claras |
| Fondo claro frío | `#EEF3F7` / `#EDF2F7` | Fondos alternos, tarjetas |
| Panel menta | `#E8F6F3` | Bloques destacados sobre blanco |
| Borde sutil | `#DFE7EF` / `#DCE3EC` | Bordes de tarjetas |
| Azul oscuro alterno | `#06376E` / `#054b8f` | Paneles dentro de fondo Sea Blue |
| Texto secundario | `#41607F` / `#5C7796` | Párrafos sobre fondo claro |
| Texto terciario / labels | `#9AAABF` / `#A0AFC2` / `#A9B8CB` | Etiquetas, metadatos |
| Texto sobre oscuro | `#B9CBE2` (cuerpo) · `#7E96B6` (tenue) | Párrafos y metadatos sobre Sea Blue |

---

## 5. Tipografía

| Fuente | Rol | Notas |
|---|---|---|
| **Verlag** | Corporativa de impresión | Tipografía maestra. Requiere licencia. |
| **Montserrat** | Web / digital / HUB | Google Font, libre. Compone el logotipo en digital. Pesos 400→800. Sustituta exacta de Verlag. |
| **Arial** | Sistema / fallback | Sólo email HTML, Word, documentos internos. |

- Stack en código: `font-family: 'Montserrat', Arial, sans-serif;`
- Import: `https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;800&display=swap`
- El logotipo siempre en **Montserrat ExtraBold (800)** / Verlag Black.
- Activar `-webkit-font-smoothing: antialiased`.

### Escala tipográfica observada
- Titulares grandes: 800, `letter-spacing` negativo fuerte (`-3px` a `-7px`).
- Eyebrows / etiquetas de sección: 24px, 700, `letter-spacing: 3px`, `text-transform: uppercase`, color Aqua Green `#2BA697`.
- Cuerpo: 18–30px, peso 500–600, `text-wrap: pretty`.
- Micro-labels de pie: 15–16px, 700, `letter-spacing: 2px`, uppercase, color `#A0AFC2`.

---

## 6. Lenguaje visual / patrones de UI

- **Eyebrow de sección:** punto circular (`9–10px`, Aqua Green) + texto en uppercase con tracking. Patrón recurrente para encabezar bloques.
- **Esquinas redondeadas generosas:** tarjetas `border-radius: 18–24px`; inputs/botones `12–14px`; icono de app `46px`.
- **Tarjetas:** fondo blanco, borde `1px solid #DFE7EF`, sin sombra o sombra muy suave azulada (`0 16px 34px rgba(0,46,109,.10)`).
- **Layout:** flex/grid con `gap` generoso; mucho aire; padding amplio.
- **Dos modos de fondo:**
  - *Claro:* `#F2FAF8` / blanco, texto `#002E6D`.
  - *Oscuro (negativo):* `#002E6D`, texto blanco, `way` en `#6FCBBC`, acentos `#54BBAB`/`#9ACAEB`.
- **CTAs:** fondo Aqua Green `#54BBAB`, texto Sea Blue `#002E6D`, peso 800. (Sobre fondo claro, también CTA Sea Blue sólido con texto blanco.)
- **Sombras:** siempre teñidas de azul marino — `rgba(0,46,109,…)`, nunca negro puro.
- **Sin gradientes salvo** el degradado sutil de la pantalla de acceso (`linear-gradient(160deg,#054b8f,#002E6D)`).

---

## 7. Versiones del logotipo (obligatorias)

1. **Principal · color** — sobre fondo claro: `gate` Sea Blue + `way` Aqua Green, isotipo Aqua Green.
2. **Monocromo** — todo en Sea Blue `#002E6D` (o un solo tono) sobre fondo claro.
3. **Negativo** — sobre fondo Sea Blue: `gate` blanco + `way` `#6FCBBC`, isotipo blanco o Aqua Green.

Variaciones de color del wordmark admitidas (el isotipo y `way` toman el color, `gate` permanece Sea Blue salvo en negativo): Aqua Green (firma), Sky Blue, Sunset Orange, Sea Blue (monocromo), Horizon Blue y Sunray Yellow sobre oscuro.

---

## 8. Kit de archivos — `Gateway SVG/`

Cada pieza es un SVG vectorial independiente. El texto usa Montserrat vía Google Fonts; **para impresión/offline, convertir el texto a curvas**.

| Archivo | Contenido |
|---|---|
| `isotipo-color.svg` | Isotipo en Aqua Green |
| `isotipo-monocromo.svg` | Isotipo en un solo tono |
| `isotipo-blanco.svg` | Isotipo blanco (para fondo oscuro) |
| `isotipo-app-navy.svg` | Icono de app (isotipo sobre cuadro Sea Blue redondeado) |
| `wordmark-gateway-color.svg` | Solo wordmark, color |
| `wordmark-gateway-monocromo.svg` | Solo wordmark, monocromo |
| `logo-horizontal-color.svg` | Logo completo (iso + wordmark), color |
| `logo-horizontal-monocromo.svg` | Logo completo, monocromo |
| `logo-horizontal-negativo.svg` | Logo completo, negativo (fondo oscuro) |
| `logo-by-hutchison-color.svg` | Logo + respaldo "by Hutchison Ports", color |
| `logo-by-hutchison-negativo.svg` | Logo + respaldo, negativo |
| `by-hutchison-ports-color.svg` | Solo byline "by Hutchison Ports", color |
| `by-hutchison-ports-blanco.svg` | Solo byline, blanco |

> Estructura de un SVG de logo: el isotipo va como grupo de `<path>` con `stroke`; el wordmark como `<text>` en Montserrat 800. El isotipo ocupa `viewBox 0 0 96 96` y se posiciona/escala con un `<g transform="translate(...) scale(...)">`.

---

## 9. Aplicaciones de referencia

- **Pantalla de acceso (login):** fondo degradado Sea Blue, logo negativo, inputs translúcidos (`rgba(255,255,255,.12)` + borde `.18`), CTA "Entrar al HUB" en Aqua Green.
- **Icono de app:** cuadro Sea Blue `border-radius:46px` con isotipo Aqua Green centrado; sombra `0 24px 48px rgba(0,46,109,.28)`.
- **Credencial:** tarjeta blanca, logo pequeño arriba, avatar circular (`#E8F6F3` con iniciales en Aqua Green), nombre y rol.
- **Favicon/avatar:** el isotipo aislado funciona perfectamente.

---

## 10. Reglas rápidas (do / don't)

**Sí**
- Wordmark siempre en minúsculas y en Montserrat ExtraBold.
- `way` en el color firma; mantener el `gate` en Sea Blue (salvo negativo).
- Respetar el área de protección = altura del isotipo.
- Sombras teñidas de azul marino, nunca negras.
- Usar `#2BA697` para verde sobre fondo claro (contraste de texto) y `#6FCBBC` para `way` sobre oscuro.

**No**
- No rellenar el isotipo (es siempre de trazo).
- No usar mayúsculas en el wordmark.
- No introducir colores fuera de la paleta v4.1.
- No abusar de gradientes (solo el login los usa).
- No estirar, rotar ni reespaciar el logotipo.
