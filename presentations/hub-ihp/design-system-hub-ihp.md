# Design System Hutchison Ports v2.0

Sistema de diseno oficial completo para Hutchison Ports.

## 1. Colores Primarios

| Token | Nombre | Pantone | HEX | RGB |
|---|---|---|---|---|
| skyBlue100 | Azul Sky Ports | PMS 2925 | #009BDE | 0/155/222 |
| seaBlue100 | Azul Mar Ports | PMS 294 | #002E6D | 0/46/109 |

## 2. Colores Secundarios

| Token | Nombre | Pantone | HEX | RGB |
|---|---|---|---|---|
| horizonBlue100 | Azul Horizonte | PMS 291 | #9ACAEB | 154/202/235 |
| aquaGreen100 | Verde Aqua | PMS 3258 | #54BBAB | 84/187/171 |
| sunrayYellow100 | Amarillo Sunray | PMS 123 | #FFC627 | 255/198/39 |
| sunsetOrange100 | Naranja Sunset | PMS 158 | #EE7523 | 238/117/35 |

## 3. Sistema de tintes 100/80/60/40/20

### Azul Sky Ports
- skyBlue100: #009BDE (botones CTA, links activos)
- skyBlue80:  #33AFE5 (hover botones)
- skyBlue60:  #66C3EB (bordes activos, badges)
- skyBlue40:  #99D7F2 (fondos de cards)
- skyBlue20:  #CCEBF8 (fondos sutiles, chips)

### Azul Mar Ports
- seaBlue100: #002E6D (titulos, fondos oscuros)
- seaBlue80:  #33588A (texto secundario)
- seaBlue60:  #6682A7 (iconos inactivos)
- seaBlue40:  #99ABC5 (bordes sutiles)
- seaBlue20:  #CCD5E2 (fondos neutros)

### Azul Horizonte Ports
- horizonBlue100: #9ACAEB (fondo Beneficios)
- horizonBlue80:  #AED5EF
- horizonBlue60:  #C2DFF3
- horizonBlue40:  #D6EAF7
- horizonBlue20:  #EAF4FB

### Verde Aqua Ports
- aquaGreen100: #54BBAB (nivel Fundacional, exito)
- aquaGreen80:  #76C8BC
- aquaGreen60:  #98D6CD
- aquaGreen40:  #BBE4DD
- aquaGreen20:  #DDF1EE

### Amarillo Sunray Ports
- sunrayYellow100: #FFC627 (Cultura, logros)
- sunrayYellow80:  #FFD152
- sunrayYellow60:  #FFDD7D
- sunrayYellow40:  #FFE8A8
- sunrayYellow20:  #FFF4D4

### Naranja Sunset Ports
- sunsetOrange100: #EE7523 (Operaciones, Esencial)
- sunsetOrange80:  #F1914F
- sunsetOrange60:  #F5AC7B
- sunsetOrange40:  #F8C8A7
- sunsetOrange20:  #FCE3D3

## 4. Colores funcionales

Neutros:
- white: #FFFFFF
- bgSurface: #F8FAFC
- bgMuted: #F1F5F9
- borderSubtle: #E2E8F0
- textPrimary: #222F4F
- textSecondary: #5F6C7B
- textMuted: #94A3B8

Semanticos:
- success: #54BBAB
- warning: #FFC627
- danger: #DC2626
- info: #009BDE

## 5. Mapeo Disciplinas

- Cultura Organizacional: sunrayYellow100 #FFC627
- Operaciones: sunsetOrange100 #EE7523
- Gestion: aquaGreen100 #54BBAB (antes #4CAF50 hardcoded - migrar)
- Tecnologia: seaBlue100 #002E6D
- Salud y Bienestar: horizonBlue100 #9ACAEB (antes #00BCD4 - migrar)
- Comercial: skyBlue100 #009BDE (antes #7C3AED - migrar)

## 6. Niveles de aprendizaje

- Fundacional: aquaGreen100 #54BBAB
- Esencial: sunsetOrange100 #EE7523
- Intermedio: skyBlue100 #009BDE
- Avanzado: seaBlue100 #002E6D
- Maestro (nuevo): sunrayYellow100 #FFC627

## 7. Overlays oficiales

- Hero slider: rgba(0, 46, 109, 0.55)
- Hero nocturno: rgba(0, 28, 80, 0.58)
- Stats sobre foto: rgba(0, 46, 109, 0.82)
- CTA azul oscuro: rgba(0, 46, 109, 0.75)
- CTA claro horizonte: rgba(182, 221, 248, 0.88)
- Quiz/Dinamica overlay: rgba(0, 155, 222, 0.92)

REGLA: nunca negro puro. Siempre seaBlue translucido.

## 8. Gradientes

```css
--hp-gradient-brand: linear-gradient(180deg, #002E6D 0%, #009BDE 100%);
--hp-gradient-sunset: linear-gradient(135deg, #FFC627 0%, #EE7523 100%);
--hp-gradient-ocean: linear-gradient(135deg, #002E6D 0%, #1A4B8D 50%, #009BDE 100%);
--hp-gradient-fresh: linear-gradient(135deg, #54BBAB 0%, #009BDE 100%);
--hp-gradient-card-overlay: linear-gradient(180deg, rgba(0,46,109,0) 0%, rgba(0,46,109,0.85) 100%);
```

## 9. Tipografia

### 9.1 Familias

| Familia | Stack | Uso |
|---|---|---|
| Display | `Verlag, Montserrat, sans-serif` | Headings via clase `.hp-verlag-title` (weight 900, uppercase, letter-spacing -0.4px) |
| Body / UI | `Montserrat, sans-serif` | Cuerpo, descripciones, botones, labels, captions |
| Mono | `"JetBrains Mono", "Fira Code", monospace` | XP indicators, codigo, datos numericos |

### 9.2 Pesos

| Peso | Valor | Token Montserrat | Uso |
|---|---|---|---|
| Light | 300 | Montserrat_300Light | H2 light variant |
| Regular | 400 | Montserrat_400Regular | Body, descripciones |
| Medium | 500 | Montserrat_500Medium | Nav links |
| SemiBold | 600 | Montserrat_600SemiBold | Stat labels, overline, paragraph2SemiBold |
| Bold | 700 | Montserrat_700Bold | H1-H4, botones, badges, quick-links |
| ExtraBold | 800 | Montserrat_800ExtraBold | paragraphLarge |
| Black | 900 | — | `.hp-verlag-title` (display headings) |

### 9.3 Titulos — escala completa

Cada estilo es un drop-in. Mobile (`<640px`) usa el primer valor, desktop el segundo.

#### `display-xl` — Hero H1 (Landing + Instituto)

```tsx
{
  fontFamily:    'Verlag, Montserrat, sans-serif',
  fontSize:      isMobile ? 'clamp(2rem, 9vw, 2.8rem)' : 'clamp(2.6rem, 4vw, 4rem)',
  fontWeight:    900,
  lineHeight:    1.05,
  letterSpacing: '-0.4px',
  textTransform: 'uppercase',
  color:         '#FFFFFF',          // sobre overlay oscuro
  whiteSpace:    'pre-line',         // permite \n en titulos multi-linea
  margin:        '0 0 20px',
}
```
- **Uso:** unica linea por pagina. Slider hero, hero Instituto.
- **Clase:** `.hp-verlag-title`.

#### `display-lg` — H2 de seccion

```tsx
{
  fontFamily:    'Verlag, Montserrat, sans-serif',
  fontSize:      isMobile ? 'clamp(1.6rem, 6vw, 2.2rem)' : 'clamp(2rem, 3.5vw, 3.2rem)',
  fontWeight:    900,
  lineHeight:    1.1,
  letterSpacing: '-0.4px',
  textTransform: 'uppercase',
  color:         '#002E6D',          // seaBlue100 sobre claro
  margin:        '0 0 16px',
}
```
- **Uso:** Servicios, Stats, Ecosistema, CTA, Intro, Beneficios, Disciplinas, Modalidades, Futuro, Cierre.
- Sobre fondo oscuro: `color: '#FFFFFF'`.

#### `display-md` — H3 de card / sub-seccion

```tsx
{
  fontFamily:    'Verlag, Montserrat, sans-serif',
  fontSize:      isMobile ? 'clamp(1.4rem, 5vw, 1.8rem)' : 'clamp(1.6rem, 2.6vw, 2.4rem)',
  fontWeight:    900,
  lineHeight:    1.15,
  letterSpacing: '-0.3px',
  textTransform: 'uppercase',
  color:         '#002E6D',
  margin:        '0 0 12px',
}
```
- **Uso:** titulos de cards de servicios (cuando no es logo), cards de modulos, cards de beneficios.

#### `heading-sm` — H3 en componentes densos (modality, quick-link)

```tsx
{
  fontFamily:    'Montserrat, sans-serif',
  fontSize:      'clamp(1rem, 1.3vw, 1.15rem)',
  fontWeight:    700,
  lineHeight:    1.3,
  letterSpacing: '-0.2px',
  color:         '#002E6D',
  margin:        '0 0 8px',
}
```
- **Uso:** titulo de `ModalityCard`, label de quick-link en CTA final.
- **No** usa familia Verlag, **no** es uppercase.

#### `heading-xs` — H4 / label de categoria

```tsx
{
  fontFamily:    'Montserrat, sans-serif',
  fontSize:      isMobile ? 15 : 16,
  fontWeight:    700,
  lineHeight:    1.4,
  letterSpacing: '0.3px',
  color:         '#1A4B8D',          // seaBlue80
  textTransform: 'uppercase',
}
```
- **Uso:** nombres de discipline en discipline-header, badges grandes, sub-titulos de bloque.

### 9.4 Descripciones — escala completa

#### `body-lg` — descripcion principal (DescriptionCSS.base)

```tsx
{
  fontFamily:    'Montserrat, sans-serif',
  fontSize:      'clamp(1.1rem, 1.3vw, 1.25rem)',
  fontWeight:    400,
  lineHeight:    1.7,
  letterSpacing: '0.01em',
  color:         '#002E6D',          // o textPrimary segun contraste
  textWrap:      'balance',
  maxWidth:      480,                // tipica en hero / intro split
  margin:        '0 0 28px',
}
```
- **Uso:** descripcion bajo H1/H2 en hero, servicios, intro Instituto, CTA final.
- **Sobre fondo oscuro:** `color: '#FFFFFF'`.
- **Token oficial:** importar `DescriptionCSS.base` desde `@hp/tokens` y spread.

#### `body` — cuerpo estandar (vars de `.hp-inst`)

```tsx
{
  fontFamily: 'Montserrat, sans-serif',
  fontSize:   'clamp(1rem, 1.2vw, 1.15rem)',
  fontWeight: 400,
  lineHeight: 1.8,
  color:      '#222F4F',             // textPrimary
}
```
- **Uso:** parrafos largos en secciones de copy (Beneficios, Vision Global, Futuro).
- **Clase:** `.hp-desc` dentro de `.hp-inst`.

#### `body-sm` — descripcion compacta (DescriptionCSS.sm)

```tsx
{
  fontFamily:    'Montserrat, sans-serif',
  fontSize:      'clamp(0.95rem, 1.1vw, 1.05rem)',
  fontWeight:    400,
  lineHeight:    1.65,
  letterSpacing: '0.01em',
  color:         '#222F4F',
  textWrap:      'balance',
}
```
- **Uso:** descripcion de modality card, atlas card, modulo en carrusel, columnas estrechas.
- **Clase:** `.hp-desc-tight`.
- **Token oficial:** `DescriptionCSS.sm`.

#### `body-tight` — texto secundario en cards de modulo

```tsx
{
  fontFamily: 'Montserrat, sans-serif',
  fontSize:   'clamp(0.9rem, 1vw, 1rem)',
  fontWeight: 400,
  lineHeight: 1.75,
  color:      '#222F4F',
  textWrap:   'pretty',
}
```
- **Uso:** descripcion dentro de modality card, atlas card. Cuando importa balance de lineas sin hard-break.

#### `body-hero-sub` — subtitulo de hero (override de body-lg)

```tsx
{
  fontFamily: 'Montserrat, sans-serif',
  fontSize:   isMobile ? 16 : 22,
  fontWeight: 400,
  lineHeight: 1.6,
  color:      '#FFFFFF',
  maxWidth:   isMobile ? '100%' : 520,
  margin:     '0 0 28px',
}
```
- **Uso especifico:** descripcion bajo H1 en hero slider Landing.

### 9.5 UI / utilitarios

#### `button` — todos los botones (primario, secundario, terciario)

```tsx
{
  fontFamily:    'Montserrat, sans-serif',
  fontSize:      isMobile ? 13 : 14,
  fontWeight:    700,
  lineHeight:    1.4,
  letterSpacing: '0.5px',
  textTransform: 'uppercase',
}
```
- **Variantes de tamano:**
  - Standard CTA (hero, CTA final): `13/14`
  - Boton de servicio / accion secundaria: `12/14`
  - Boton hero principal: `13/14` con padding `14/24` mobile, `16/32` desktop

#### `quick-link-label` — items del listado CTA

```tsx
{
  fontFamily: 'Montserrat, sans-serif',
  fontSize:   isMobile ? 15 : 18,
  fontWeight: 700,
  lineHeight: 1.3,
  color:      '#FFFFFF',
}
```

#### `quick-link-sub` — descripcion debajo de quick-link

```tsx
{
  fontFamily: 'Montserrat, sans-serif',
  fontSize:   isMobile ? 12 : 14,
  fontWeight: 400,
  lineHeight: 1.5,
  color:      'rgba(255,255,255,0.9)',
  marginTop:  2,
}
```

#### `stat-xl` — numeros gigantes de KPI (Instituto)

```tsx
{
  fontFamily:    'Montserrat, sans-serif',
  fontSize:      isMobile ? 'clamp(2.6rem, 9vw, 3.6rem)' : 'clamp(3.8rem, 6.5vw, 6rem)',
  fontWeight:    700,
  lineHeight:    1,
  letterSpacing: '-2px',
  color:         '#009BDE',           // skyBlue100
}
```

#### `stat-lg` — numeros de KPI (Landing)

```tsx
{
  fontFamily:    'Montserrat, sans-serif',
  fontSize:      isMobile ? 'clamp(1.8rem, 7vw, 2.6rem)' : 'clamp(2.6rem, 5vw, 4.2rem)',
  fontWeight:    700,
  lineHeight:    1,
  letterSpacing: '-1px',
  color:         '#FFFFFF',
}
```

#### `stat-label` — texto debajo de un stat

```tsx
{
  fontFamily:    'Montserrat, sans-serif',
  fontSize:      isMobile ? 13 : 15,
  fontWeight:    600,
  lineHeight:    1.3,
  letterSpacing: '0.5px',
  textTransform: 'uppercase',
  color:         '#FFFFFF',
  marginTop:     10,
}
```

#### `overline` — track heads, eyebrow text

```tsx
{
  fontFamily:    'Montserrat, sans-serif',
  fontSize:      '0.8rem',
  fontWeight:    700,
  lineHeight:    1.5,
  letterSpacing: '0.8px',
  textTransform: 'uppercase',
  color:         '#1A4B8D',           // seaBlue80
}
```

#### `caption` — texto fino, helpers, metadata

```tsx
{
  fontFamily:    'Montserrat, sans-serif',
  fontSize:      '0.85rem',
  fontWeight:    400,
  lineHeight:    1.5,
  letterSpacing: '0.2px',
  color:         '#5F6C7B',           // textSecondary
}
```

#### `nav` — items de FloatingNavbar

```tsx
{
  fontFamily:    'Montserrat, sans-serif',
  fontSize:      11,
  fontWeight:    500,
  lineHeight:    1.45,
  letterSpacing: '0.3px',
}
```

#### `badge` — chips de discipline / level / modality

```tsx
{
  fontFamily:    'Montserrat, sans-serif',
  fontSize:      12,
  fontWeight:    700,
  lineHeight:    1,
  letterSpacing: '0.5px',
  textTransform: 'uppercase',
  padding:       '6px 12px',
  borderRadius:  999,
  /* background: discipline.color o levelColor + opacity 0.12; color: discipline.color */
}
```

#### `xp-indicator` — solo dinamicas gamificadas

```tsx
{
  fontFamily: '"JetBrains Mono", "Fira Code", monospace',
  fontSize:   18,
  fontWeight: 700,
  color:      '#FFC627',              // sunrayYellow100
}
```

### 9.6 Reglas tipograficas

1. **Solo `.hp-verlag-title`** lleva familia Verlag. Todo lo demas es Montserrat.
2. Titulos uppercase **siempre** que sean Verlag (display-xl, display-lg, display-md).
3. **Descripciones**: usar `DescriptionCSS.base` o `DescriptionCSS.sm` desde `@hp/tokens`. No hardcodear `fontSize` para parrafos.
4. **Color de cuerpo** sobre claro: `#002E6D` (seaBlue100) cuando es descripcion bajo titulo en seccion claro; `#222F4F` (textPrimary) para parrafos largos de copy.
5. **`textWrap: 'balance'`** en descripciones cortas (≤ 3 lineas). **`textWrap: 'pretty'`** en parrafos largos.
6. **`letter-spacing` negativo** solo en titulos display (Verlag).
7. Numeros de stats: **monospace-like via Montserrat 700** con `letter-spacing` negativo (`-1px` o `-2px`).
8. **Nunca `font-size` en px duros** para titulos H1–H3 — usar `clamp()` responsive.
9. Maximo 3 niveles tipograficos por seccion (titulo + descripcion + CTA/badge).
10. Touch target en links de texto interactivos: padding suficiente para `minHeight: 44`.

## 10. Layout

Breakpoints:
- isMobile: width < 640
- isTablet: width < 1024
- isDesktop: width >= 1024
- isWide: width >= 1440

Spacing scale (base 8px):
4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80, 96, 128

Border radius:
- sm 6px (chips), md 8px (botones), lg 10px (track heads)
- xl 12px (cards), 2xl 16px (modality), 3xl 18px (flip cards)

## 11. Sombras

```css
--shadow-sm:   0 2px 8px rgba(0, 46, 109, 0.06);
--shadow-md:   0 2px 16px rgba(0, 46, 109, 0.10);
--shadow-lg:   0 12px 32px rgba(0, 46, 109, 0.12);
--shadow-xl:   0 16px 40px rgba(0, 46, 109, 0.18);
--shadow-2xl:  0 18px 45px rgba(0, 46, 109, 0.22);
--shadow-3xl:  0 24px 60px rgba(0, 46, 109, 0.28);

--shadow-glow-sky:     0 0 24px rgba(0, 155, 222, 0.4);
--shadow-glow-yellow:  0 0 24px rgba(255, 198, 39, 0.5);
--shadow-glow-success: 0 0 24px rgba(84, 187, 171, 0.4);
```

REGLA DURA: nunca rgba(0,0,0,*). Siempre rgba(0, 46, 109, *).

## 12. Animacion

Easing:
- ease: [0.16, 1, 0.3, 1] (entradas, flip)
- ease-out: [0, 0, 0.2, 1]
- ease-bounce: [0.68, -0.55, 0.265, 1.55] (gamificacion)

Duraciones:
- Hero entrance: 0.65s
- Section fade-in: 0.55-0.6s
- Card hover: 0.3s
- Flip card: 0.65s
- Hero cross-fade: 1.1s
- Count-up: 1800ms + i*200ms
- Quiz correcto: 0.4s ease-bounce
- Quiz error: 0.25s shake
- Progress fill: 1.2s ease-out
- Achievement unlock: 0.8s ease-bounce + glow

Patron entrada:
```tsx
<motion.div
  initial={{ opacity: 0, y: 20 }}
  whileInView={{ opacity: 1, y: 0 }}
  viewport={{ once: true, margin: '-40px' }}
  transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
/>
```

## 13. Componentes core

Boton primario:
```tsx
{
  background: '#009BDE',
  color: '#FFFFFF',
  borderRadius: 8,
  padding: isMobile ? '14px 24px' : '16px 32px',
  fontSize: isMobile ? 13 : 14,
  fontWeight: 700,
  letterSpacing: '0.5px',
  textTransform: 'uppercase',
  minHeight: 44,
}
```

Boton secundario outlined:
```tsx
{
  background: 'transparent',
  color: '#FFFFFF',
  border: '2px solid rgba(255,255,255,0.5)',
  borderRadius: 8,
}
```

Boton terciario ghost (nuevo, para dinamicas):
```tsx
{
  background: 'transparent',
  color: '#009BDE',
  border: '2px solid currentColor',
  borderRadius: 8,
}
```

## 14. Componentes de dinamicas interactivas

Quiz Card:
```tsx
{
  background: '#FFFFFF',
  borderRadius: 16,
  padding: 32,
  boxShadow: 'var(--shadow-lg)',
  borderTop: '4px solid disciplineColor',
}
```

Quiz Option:
- default: bg #F8FAFC, border 2px #E2E8F0, minHeight 56
- hover: borderColor #009BDE, bg #CCEBF8
- selected: borderColor #009BDE, bg #CCEBF8
- correct: borderColor #54BBAB, bg #DDF1EE, shadow-glow-success
- incorrect: borderColor #DC2626, bg #FEE2E2, animation shake

Progress Bar:
- Container: h 8, bg #F1F5F9, borderRadius 999
- Fill: bg gradient-fresh, transition width 1.2s ease-out

Badge / Achievement:
- padding 6px 12px, borderRadius 999, fontSize 12, weight 700, uppercase
- Achievement especial: gradient sunset + shadow-glow-yellow

XP indicator:
- fontFamily monospace, weight 700, color #FFC627, fontSize 18
- count-up animado

## 15. Accesibilidad

Contraste WCAG verificado:
- seaBlue100 sobre white: 13.5:1 AAA
- skyBlue100 sobre white: 3.4:1 (solo texto grande 18px+)
- textPrimary sobre white: 13.1:1 AAA
- sunrayYellow100 sobre seaBlue100: 9.6:1 AAA

Touch targets: minimo 44x44px (WCAG 2.5.5)

Focus:
```css
*:focus-visible {
  outline: 3px solid #009BDE;
  outline-offset: 2px;
}
```

Reduced motion:
```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

## 16. Reglas duras

1. Color accion: skyBlue100 #009BDE. Sin excepciones.
2. Color textual: seaBlue100 sobre claro, white sobre oscuro.
3. Tintes: usar 80/60/40/20, nunca inventar hex intermedios.
4. Sombras: rgba(0, 46, 109, *). Nunca negro.
5. Tipografia: Montserrat body, Verlag headings.
6. Touch target: minHeight 44.
7. Imagenes: webp, lazy, async.
8. Easing entrada: [0.16, 1, 0.3, 1].
9. GPU layer en animaciones.
10. Hardcoded prohibidos: #4CAF50, #00BCD4, #7C3AED.
11. Accesibilidad: AA, focus-visible, reduced-motion.
12. Dinamicas: feedback visual claro, animaciones <500ms.

Version 2.0
