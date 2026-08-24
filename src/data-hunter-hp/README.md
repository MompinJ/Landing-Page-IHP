# Port Quest — Hutchison Ports

Arcade 3D estilo **Crossy Road** para stand de congreso, basado en la
arquitectura del tutorial de [javascriptgametutorials.com](https://javascriptgametutorials.com/tutorials/three-js/crossy-road):
tablero de 17 casillas de ancho, el colaborador HP avanza saltando casilla
por casilla por una terminal portuaria inteligente — recolecta conceptos
correctos (verde), evita tarjetas de amenaza (rojo) y cruza vías con camiones
y AGVs en movimiento. Partida de **90 segundos** exactos.

## Stack

React 19 + Vite + TypeScript · Three.js + @react-three/fiber + drei ·
@react-three/rapier (físicas) · Zustand (estado) · Framer Motion (UI) · Leva (debug).

## Correr

```bash
npm install
npm run dev        # http://localhost:5173  (añadir ?debug para panel Leva)
npm run build
```

## Arquitectura

Mecánica espejo del tutorial (valores: casillas -8..8, salto 0.2 s con arco
`sin(p·π)`, filas por lotes de 20 extendidas a falta de 10, AGVs de 3 casillas
y camiones de 5 con wrap-around, cámara ortográfica y luz pegadas al jugador):

- `src/store/useGameStore.ts` — estado REACTIVO (fases, score, combo, timer HUD,
  fila actual, ranking). El bucle 3D lo lee vía `getState()` (transient).
- `src/store/runtime.ts` — estado TRANSITORIO a 60 fps (posición en tablero,
  cola de saltos, stun/invulnerabilidad). Singleton mutable fuera de React.
- `src/world/rows.ts` — generación procedural de filas (`yard` con pilas de
  contenedores, `road` con tráfico, `crane` con pórtico RTG) + validación de
  movimientos (`isBlocked`) y tarjetas por casilla.
- `src/world/playerLogic.ts` / `src/world/traffic.ts` — lógica PURA de salto,
  colisiones y knockback, compartida entre el juego y la simulación headless.
- `src/components/` — `Game` (Canvas), `CameraRig` (ortográfica follow + luz),
  `Map` (ventana de filas visible), `models.tsx` (camión con ruedas, AGV,
  pila de contenedores, grúa RTG con trolley animado), `Player`, `Vfx`.
- `src/ui/` — HUD, menú y game over en Framer Motion.
- `src/data/` — `items.ts` (GOOD/BAD_ITEMS), `palette.ts` (tokens HP), `balance.ts`
  (todo el tuning del juego).
- `assets/HIGGSFIELD_PROMPTS.md` — prompts para assets en Higgsfield AI;
  `public/textures/card-{good,bad}.png` ya generadas con esos prompts
  (nano_banana_pro, 3:4) y aplicadas a las tarjetas del juego.

## Teléfono

Se juega con el dedo, con los controles de **Terminal Rally** (`tronco-runner`
en el repo de la landing), que es la dinámica del stand que ya había resuelto
esto: **un gesto = una acción**, sin joystick virtual ni botones en pantalla —
en 390 px de ancho el dedo ya tapa bastante.

| Gesto | Acción |
| --- | --- |
| Tocar | Avanzar (el control original de Crossy Road) |
| Deslizar arriba / abajo | Avanzar / recular |
| Deslizar izquierda / derecha | Cambiar de columna |

Dos cosas se hacen distinto que en Terminal Rally, y las dos por la misma razón
—allí el mundo corre solo y aquí está quieto hasta que el jugador salta
(`src/hooks/useTouchControls.ts`)—: el gesto se resuelve **al cruzar el umbral**
y no al levantar el dedo (esperar mete un retardo de gesto delante de cada
paso), y el origen se reancla, así que arrastrar el dedo despacio encadena
pasos. Un golpe seco sigue siendo UN paso: lo que separa el golpe del barrido es
el tiempo, no la distancia, y el freno está atado al ritmo de salto del propio
personaje.

El briefing enseña el control del aparato que hay delante: la cara del mando de
Xbox en el stand, el dedo en un teléfono (`TOUCH` en `src/render/device.ts`).

### Rendimiento en teléfono

El nivel gráfico `movil` se elige solo en un teléfono (táctil + lado corto
≤ 540 px) y se puede forzar con `?q=movil`. Medido con `npm run test:mobilebench`,
que dibuja por software a resolución de teléfono porque es el peor caso real y
el mejor sustituto que hay de una GPU de móvil:

| | fps | ms/frame | píxeles dibujados |
| --- | --- | --- | --- |
| antes (`rapido`) | 101 | 9.9 | 259 kpx (390×664) |
| ahora (`movil`) | **150** | **6.7** | **93 kpx** (234×398) |

Un 48% más rápido **dibujando el triple de mundo** — porque en un teléfono la
cámara se aleja para que quepan las columnas y eso mete más filas en cuadro. La
ganancia entera viene de los píxeles, y de ahí salieron dos cosas:

- **`scale` no se estaba aplicando donde más falta hacía.** El techo del rango
  de dpr era `min(maxDpr, scale × densidad)`, así que en un teléfono
  (densidad 3) el `min(1, 0.75 × 3)` daba 1: el 75% que decía el nivel se
  perdía entero y solo funcionaba en la máquina del stand, que ya va a
  densidad 1 y no lo necesitaba. Son dos preguntas distintas —cuánta densidad
  de pantalla, y qué fracción de ella— y ahora se responden por separado.
- **La cámara ortográfica tenía el zoom clavado en 58.** En 390 px de ancho eso
  son **seis casillas** a la vista: no es que se viera pequeño, es que no se veía
  a dónde esquivar. Ahora el zoom garantiza un ancho mínimo de mundo en cuadro
  (`camZoomFor`) y en vertical la cámara mira más adelante para bajar al
  corredor en pantalla (`camLookAheadFor`).

Alejar la cámara obliga a dibujar más filas, y ahí saltó un fallo escondido: el
techo de filas del nivel dejaba 16 por delante donde la cámara alcanzaba 20, o
sea océano en el hueco del mapa. `viewRowsFor` dejó de usar coeficientes
ajustados a un encuadre fijo y proyecta las esquinas de la caja de vista sobre
el suelo, que sale exacto para cualquier zoom; y `npm run test:viewport` ahora
comprueba la ventana **ya recortada** por cada nivel, que es la que se dibuja de
verdad. De paso destapó que una tableta se quedaba corta en las dos direcciones.

## Verificación

```bash
npm run sim      # simula una partida de 90 s headless (lógica pura, asserts)
npm run build && npx vite preview --port 4189 &
npm run smoke    # WebKit (motor Safari): carga, juega y verifica consola limpia

npm run test:viewport      # que la ventana de filas cubra lo que ve la cámara,
                           # ya recortada por el techo de cada nivel gráfico
npm run test:touch         # los gestos, con toques de verdad sobre un iPhone emulado
npm run test:mobile        # capturas de las cinco pantallas, en vertical y horizontal
npm run test:mobilebench   # los niveles gráficos dibujando por software (peor caso)
npm run test:mobileperf    # una partida en teléfono emulado con la CPU frenada
```

## Estado del plan

- [x] Pasos 1-5 — proyecto aislado, prompts Higgsfield, store, mundo, colisiones,
      VFX/SFX (primera iteración como lane-runner)
- [x] Rediseño Crossy Road (javascriptgametutorials.com): tablero 17 casillas,
      salto por casillas con cola de movimientos, filas procedurales
      yard/road/crane, tráfico con wrap-around y hit detection + knockback,
      cámara ortográfica siguiendo al jugador
- [x] Modelos con silueta real: camión portacontenedores (6 ruedas que giran),
      AGV, pilas de contenedores con textura corrugada procedural (canvas
      teñido por color institucional)
- [x] Grúa RTG MÓVIL como peligro (fila `crane`): recorre la fila rebotando en
      los bordes, sus patas atropellan y el hueco central es paso seguro;
      suelo con franjas de precaución amarillas
- [x] Texturas Higgsfield generadas y aplicadas a las tarjetas (verde/glitch roja)
- [x] Mapa mejorado: suelos pintados por casilla (retícula de patio, marcas de
      vía), skyline de contenedores fuera del tablero
- [x] Accesibilidad de stand: filas 0-4 sin tráfico, máx. 2 vías consecutivas,
      velocidades moderadas, hitbox con margen de perdón, invulnerabilidad 1.5 s
- [x] Sistema de ZONAS: cada 26 filas alterna terminal de contenedores ↔
      terminal de cruceros (inspirada en Hutchison Ports ECV, Ensenada:
      dos muelles de atraque, marina, áreas verdes). Zona cruceros: paseo de
      losetas con palmeras, dársenas de agua (textura Higgsfield animada) con
      CRUCEROS de 8 casillas lentos y lanchas de marina rápidas de 2; la
      transición es un arco con banner Higgsfield ("TERMINAL DE CRUCEROS" /
      "TERMINAL DE CONTENEDORES") y balizas cyan, siempre fila segura con premio
- [x] Debug: `?row=N` arranca la partida en esa fila (para probar zonas)
- [x] Agua REAL animada por shader (`src/components/water.tsx`): olas de vértices
      con normales analíticas (brillo especular en movimiento) + espuma en crestas,
      material singleton compartido (olas en espacio-mundo → sin costuras entre
      filas). Reemplaza la textura estática que "parecía imagen".
- [x] Zona de cruceros = MAR abierto sin tierra (fuera palmeras y losetas)
- [x] MECÁNICA DE RÍO (Crossy Road): la terminal de cruceros alterna filas de
      AGUA FATAL (barcazas móviles que hay que ABORDAR) con MUELLES de madera
      seguros. Si aterrizas sobre una barcaza la montas y te arrastra en X
      (`updateWaterRiding` en traffic.ts); si caes al agua → salpicadura + −25 +
      retroceso al muelle. Barcazas = barcos de color con proa y borde naranja;
      muelles = tablado de madera con bolardos (distinción visual clara).
- [x] Agua REAL con reflejos: `MeshReflectorMaterial` (drei) en un único plano
      que cubre la zona activa, con mapa de distorsión + normal-map de oleaje
      animados (`src/components/water.tsx`); refleja grúas, barcos y el neón de
      las tarjetas. Se oculta en el puerto (cero coste de reflexión).
- [x] OCÉANO INFINITO (`OceanBackground`): plano gigante a y=-0.5 que sigue al
      jugador — se acabó el vacío negro en bordes y horizonte; niebla marina
      `fogExp2` funde el horizonte con el cielo (paleta nocturna conservada)
- [x] 4 BIOMAS Hutchison Ports en rotación cada 26 filas (ver PROMPT-MEJORAS.md):
      LCT (contenedores) → ECV (cruceros/río) → TNG (astillero: dique seco con
      casco en imprimación, hélices, andamios, chispas de soldadura, jib cranes)
      → TILH (intermodal: vías en balasto, trenes rápidos con semáforo de cruce
      que parpadea antes de pasar, patios de contenedores)
- [x] Grúas MONUMENTALES una por bioma en la fila-ancla: STS Super Post-Panamax
      (navy en LCT, roja industrial en TNG) con pluma sobre el océano; RMG
      amarilla en TILH abarcando 3 filas de vías (el jugador pasa por debajo)

Pendiente de pulido: exportar los modelos procedurales a GLB si se quieren
reutilizar fuera, VFX de vídeo Higgsfield (HUD animado), ranking contra API real.
