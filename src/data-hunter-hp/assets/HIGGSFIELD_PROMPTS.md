# HIGGSFIELD AI — Prompts de Assets para "Data Hunter - Hutchison Ports"

> **Assets ya generados** (nano_banana_pro, ~2 créditos c/u) y cableados al juego:
> `public/textures/` → `container.png` (corrugado 1:1 gris neutro, se tiñe),
> `card-good.png`/`card-bad.png` (tarjetas 3:4 limpias, un solo emblema),
> `gate-cruise.png`/`gate-port.png` (banners de arco 21:9 planos),
> `water.png` (agua tileable 1:1 dársena ECV).
>
> **LECCIÓN CLAVE de prompt (por qué la 1ª tanda salió fea):** para texturas que
> se pegan a geometría, exigir SIEMPRE *"Flat 2D, edge to edge, NO 3D scene, NO
> background environment, NO perspective, NO surrounding objects"* — si no, el
> modelo renderiza el asset DENTRO de una escena con fondo y basura alrededor.
> Y para tarjetas: *"NO outer frame or border, single centered emblem, negative
> space in bottom third"* (el juego ya pone su propio marco + etiqueta; un marco
> en la imagen = doble marco recargado).

## Prompts VÁLIDOS ya usados (copiar tal cual, funcionan)

**Contenedor corrugado (`container.png`, 1:1):**
```
Seamless tileable flat texture of a shipping container corrugated metal side
panel. Orthographic front view, perfectly even flat studio lighting, no shadows,
no baked highlights. Neutral light gray steel color (#d0d4d8) so it can be
color-tinted in engine. Evenly spaced vertical corrugation ribs, subtle fine
weathering and scratches, a horizontal reinforcement rail along the very top and
very bottom edges. Clean crisp edges, PBR albedo game texture, tiles perfectly on
left and right edges, no logos, no text, no numbers, no watermark, square.
```

**Banner de arco (`gate-*.png`, 21:9):**
```
Flat 2D graphic design banner, vector style, completely filling the frame edge to
edge. NO 3D scene, NO background environment, NO floating monitors, NO perspective,
NO surrounding objects. Solid deep navy blue banner background (#002E6D) with a thin
clean cyan tech border line (#00E5FF) inset from the edges. On the left a small flat
white low-poly cruise ship icon, on the right a small flat white anchor icon. Large
bold white sans-serif text centered reading exactly 'TERMINAL DE CRUCEROS' on two
lines, sky blue accent underline. Minimal, clean, lots of negative space, flat, 21:9.
```
(variante contenedores: borde/iconos naranja #EE7523, "TERMINAL DE CONTENEDORES".)

**Tarjeta de concepto (`card-*.png`, 3:4):**
```
Flat clean trading card face design, portrait orientation, filling the entire frame
edge to edge with NO outer frame or border. Deep navy blue background (#002E6D) with
a very subtle darker vignette. One single large centered glowing neon green shield
emblem (#00FF66) with a soft glow, a few thin elegant cyan circuit accent lines
radiating gently from it, lots of clean empty negative space especially in the
bottom third. Minimal, uncluttered, modern, flat design, no text, no numbers, no
busy patterns, no extra icons, 3:4 portrait.
```
(variante negativa: fondo charcoal #12060b, emblema de alerta rojo #FF0033 con glitch.)

Prompts optimizados y listos para copiar/pegar en Higgsfield AI (text-to-video, image-to-video, motion graphics).
Todos siguen la fórmula: **Estilo/Render + Aislamiento de fondo + Color Lock institucional + Comportamiento de loop**.

## Color Lock institucional (incluir siempre)

| Token | Hex | Uso |
|---|---|---|
| Azul HP (dominante) | `#003366` | Estructuras, marcos, uniforme |
| Naranja seguridad | `#FF6600` | Chaleco reflejante, acentos industriales |
| Cyan smart-port | `#00E5FF` | HUD, terminales, drones, Digital Twin |
| Gris acero | `#8A9BA8` | Grúas, contenedores, metal |
| Glow positivo | `#00FF66` | Tarjetas/VFX de conceptos correctos |
| Glow negativo | `#FF0033` | Tarjetas/VFX de peligro y ciberamenaza |

> **Nota técnica Three.js:** los clips con `solid black background #000000` se integran con
> `THREE.AdditiveBlending` sin recorte; los que pidan `transparent alpha channel` van a
> `VideoTexture` + `transparent: true`. Pedir siempre loop perfecto para evitar "pops" en el stand.

---

## 1. Tarjeta de Concepto Positivo (holograma verde)

```
3D low-poly isometric floating holographic card, Unreal Engine 5 render, Octane render, clean edges,
futuristic smart port cyberpunk aesthetic. A sleek translucent data card with glowing neon green
circuitry iconography (#00FF66) over a deep corporate navy blue frame (#003366), thin cyan accent
lines (#00E5FF), subtle inner light rays. The card slowly rotates on its vertical axis with smooth
floating motion, gentle bobbing up and down. Seamless looping animation, 60fps fluid motion graphics,
isolated on solid black background #000000, no text, no watermark, centered composition.
```

**Variante icónica** (generar una por familia de conceptos — sustituir `[ICON]`):
`[ICON]` ∈ shield (Seguridad/Ciberseguridad), gear (Procedimiento/Mejora continua), neural network
(IA/Machine Learning), bar chart (Analítica/KPIs), handshake (Colaboración/Trabajo en equipo),
checkmark seal (Calidad/Certificación), magnifier (Auditoría/Trazabilidad).

```
3D low-poly isometric holographic emblem of a [ICON], Unreal Engine 5 render, Octane render, clean
edges, futuristic smart port cyberpunk style. Glowing neon green wireframe (#00FF66) with navy blue
core (#003366) and cyan rim light (#00E5FF). Slow smooth rotation, gentle hover, seamless looping
animation, 60fps fluid motion graphics, isolated on solid black background #000000, no text.
```

## 2. Tarjeta de Concepto Negativo (glitch rojo)

```
3D low-poly isometric floating data card corrupted by digital glitch art, Unreal Engine 5 render,
Octane render, clean edges, futuristic smart port cyberpunk aesthetic. Fractured dark card with
vibrant red danger glow (#FF0033) over pure black (#000000), scanline distortion, datamosh artifacts,
flickering hazard-alert strobes, broken circuitry sparks, subtle skull-free cyberattack motif. The
card twitches with static interference and alert blinking while slowly rotating. Seamless looping
animation, 60fps fluid motion graphics, isolated on solid black background #000000, no readable text,
no watermark, centered composition.
```

**Variante "peligro industrial":**

```
3D low-poly isometric warning card with industrial hazard styling, Unreal Engine 5 render, Octane
render, clean edges, futuristic smart port cyberpunk. Black card with aggressive red glow (#FF0033),
diagonal hazard stripes glitching between analog and digital states, emergency strobe flicker,
sparks. Twitchy static loop, slow rotation, seamless looping animation, 60fps fluid motion graphics,
isolated on solid black background #000000, no text.
```

## 3. VFX de Recolección (Good — data stream verde)

```
Vertical burst of ascending digital particles, data stream style, 3D low-poly fractal geometry
shards, Unreal Engine 5 render, Octane render, clean edges, futuristic smart port cyberpunk. Bright
neon green particles (#00FF66) with cyan sparks (#00E5FF) rising and dissolving into glowing binary
motes, soft additive bloom, energy uplift feeling. Explosion resolves and re-emits in a perfect
cycle: seamless looping animation, 60fps fluid motion graphics, isolated on solid black background
#000000, centered, no text.
```

## 4. VFX de Impacto / Daño (Bad — onda de choque roja)

```
Radial shockwave impact VFX, industrial spark burst with digital distortion, 3D low-poly style,
Unreal Engine 5 render, Octane render, clean edges, futuristic smart port cyberpunk. Vibrant red
energy ring (#FF0033) expanding fast with black smoke wisps, orange industrial sparks (#FF6600),
RGB-split glitch distortion at the wavefront, quick decay. Fast punchy hit that resets cleanly:
seamless looping animation, 60fps fluid motion graphics, isolated on solid black background #000000,
centered, no text.
```

## 5. Elementos de HUD animado (marcos, barras, contadores)

**Marco de terminal portuaria:**

```
Futuristic port-terminal HUD frame, thin angular brackets and corner markers, 3D low-poly flat-depth
motion graphics, Unreal Engine 5 render, clean edges, smart port cyberpunk. Navy blue base (#003366)
with luminous cyan strokes (#00E5FF) and small white telemetry ticks, subtle scanline sweep across
the frame. Seamless looping animation, 60fps fluid motion graphics, isolated on solid black
background #000000 with transparent alpha channel friendly edges, no readable text.
```

**Barra de progreso energética:**

```
Futuristic energy progress bar, smart grid style, segmented cells filling with luminous cyan light
(#00E5FF) inside a navy blue housing (#003366) with steel gray bezel (#8A9BA8), soft glow pulse when
full, tiny data ticks animating along the edge. Clean edges, Unreal Engine 5 render, motion graphics.
Fill cycle loops perfectly: seamless looping animation, 60fps fluid motion graphics, isolated on
solid black background #000000, horizontal composition, no text.
```

**Contador digital smart grid:**

```
Digital counter display panel, smart grid seven-segment hybrid style, glowing cyan digits placeholder
blocks (#00E5FF) on navy blue panel (#003366), subtle flicker and refresh sweep, corner status LEDs
in green (#00FF66). Futuristic smart port cyberpunk, clean edges, Unreal Engine 5 render, motion
graphics. Seamless looping animation, 60fps fluid motion graphics, isolated on solid black background
#000000, no readable words (abstract digit blocks only).
```

## 6. Extras de ambiente para el stand (opcionales)

**Loop de fondo — terminal inteligente:**

```
Isometric 3D low-poly futuristic container terminal at night, Unreal Engine 5 render, Octane render,
clean edges, smart port cyberpunk. Navy blue mega-structures (#003366), steel gray RTG cranes
(#8A9BA8), stacked containers with cyan edge lights (#00E5FF), orange safety accents (#FF6600),
autonomous AGVs gliding on glowing lanes, drones hovering with green beacons (#00FF66). Slow
cinematic parallax drift, seamless looping animation, 60fps fluid motion graphics, no text,
no watermark.
```

**Personaje — colaborador HP (referencia de modelado):**

```
3D low-poly isometric character turnaround, port worker with white safety helmet, orange reflective
vest (#FF6600) with silver stripes, navy blue uniform (#003366), friendly stylized proportions like
a voxel arcade hero, Unreal Engine 5 render, Octane render, clean edges, futuristic smart port
cyberpunk. Slow 360 degree turntable rotation, seamless looping animation, 60fps fluid motion
graphics, isolated on solid black background #000000, full body centered, no text.
```
