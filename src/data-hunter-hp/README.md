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

### Rendimiento y nitidez en teléfono

El nivel gráfico `movil` se elige solo en un teléfono (táctil + lado corto
≤ 540 px) y se puede forzar con `?q=movil`. Dibuja al tamaño completo de la
página con un techo de densidad de 1.5, y **con MSAA**.

**La primera versión de este nivel estaba mal y conviene que quede escrito.**
Dibujaba al 60% sin suavizado: iba fluido y se veía a bloques. El error no fue
el número sino de dónde salió — lo afiné contra `test:mobilebench`, que dibuja
por software, o sea gastando CPU por píxel. Ese banco castiga la resolución
muchísimo más de lo que la castiga una GPU de teléfono real, así que optimizar
contra él lleva a pagar en calidad algo que no hacía falta pagar. Un banco de
fps no sabe decir si algo se ve bien; para eso está `test:sharpness`, que
captura el mismo instante del mapa a la densidad real de un móvil (×3) con
varios ajustes, que es la herramienta que faltaba:

| | cantos | detalle |
| --- | --- | --- |
| 0.6 sin MSAA | escalonados | el corrugado del contenedor se pierde |
| 1.0 con MSAA | limpios | **aquí está el salto grande** |
| 1.5 con MSAA | limpios | vuelve el detalle fino de las cajas |

Y **el suavizado es la mitad de la historia**: esta escena son cajas de color
plano vistas en diagonal, o sea que casi todo lo que se dibuja es un canto
inclinado — el peor caso posible para el escalonado. Subir resolución cuesta al
cuadrado; el MSAA del contexto cuesta una fracción de eso y en una GPU de móvil,
que dibuja por baldosas, se resuelve dentro de la baldosa. Y aquí no hay cadena
de postproceso que lo desperdicie (mismo razonamiento que en `alto`).

#### El aparato decide, no yo

Lo táctil y el tamaño de pantalla sirven para separar un teléfono de un equipo
de stand, y para nada más: entre el móvil más flojo que se va a asomar a esto y
el más nuevo hay un orden de magnitud de GPU y ninguno de los dos lo dice.
Adivinarlo desde aquí es exactamente lo que salió mal. Así que el nivel pone el
techo y el suelo (1.5 y 0.75) y `src/components/ResolutionGovernor.tsx` recorre
ese rango con los fps medidos en el propio aparato.

Es un **trinquete: solo baja**. Se arranca arriba —dándole al aparato el
beneficio de la duda— y cada vez que se demuestra que no llega, se afloja un
escalón y ahí se queda. Corregir en los dos sentidos parece lo correcto y no lo
es: en cuanto el aparato cae cerca de la frontera entra en vaivén —baja, con
menos píxeles le sobra margen, sube, vuelve a no llegar, baja— y eso en la mano
no se lee como «se está adaptando», se lee como una imagen que respira. Medido
con dibujo por software, en una sola partida: 0.75 → 0.94 → 1.13 → 0.94. Y no
es un fallo de ajuste sino la forma del problema: subir siempre parece buena
idea justo después de bajar, porque bajar es lo que ha creado el margen que
invita a subir. Con el trinquete no hay nada que perseguir — si el aparato
pudiera con el techo, no habría bajado nunca.

Se paga que un tramo cargado al principio deje la resolución baja el resto de la
partida aunque luego sobre. Se acepta a sabiendas: la partida dura lo que dura,
y quieto y algo más blando se juega mejor que nítido y a tirones.

La primera decisión cae dentro del **briefing**, que es la misma ventana que
aprovecha `Warmup` para compilar shaders. Comprobado con `npm run test:governor`,
que corre el mismo build en dos máquinas de potencia muy distinta: la rápida se
queda clavada en 1.5 y la lenta se asienta en 0.75 antes de empezar a jugar,
ninguna de las dos vuelve a moverse en partida.

Sustituye a `<AdaptiveDpr>`, que estaba montado y **no hacía nada**: ese sigue a
`performance.current`, que solo se mueve si alguien llama a `regress()`, y este
juego no lo llama en ninguna parte. La «red por debajo del nivel» no existía.

Del `PerformanceMonitor` de drei hay además dos cosas que NO se usan, y las dos
por el mismo motivo — hacen algo distinto de lo que su nombre promete:

- `flipflops` parece hecho para cortar el vaivén, pero cuenta cada subida y cada
  bajada, no cada cambio de sentido, y estando ya en el techo sigue contando
  subidas que no mueven nada. En un teléfono sobrado el contador se disparaba a
  los pocos segundos y `onFallback` lo mandaba al suelo: **el aparato más rápido
  acababa con la peor imagen**.
- El `refreshrate` que se le pasa a `bounds` suena a frecuencia del panel, pero
  es el **máximo de fps que ha llegado a medir**. En un aparato que nunca llega
  a la sincronía —el que hay que proteger— el listón se le baja solo hasta por
  debajo de lo que ya está dando, y el gobernador se declara satisfecho sin
  bajar nada. Medido: 35 fps sostenidos y la resolución sin moverse del techo.
  La banda es fija, 60 fps y punto.

### El encuadre, que era lo otro

**La cámara ortográfica tenía el zoom clavado en 58.** En 390 px de ancho eso son
**seis casillas** a la vista: no es que se viera pequeño, es que no se veía a
dónde esquivar. Ahora el zoom garantiza un ancho mínimo de mundo en cuadro
(`camZoomFor`) y en vertical la cámara mira más adelante para bajar al corredor
en pantalla (`camLookAheadFor`).

Alejar la cámara obliga a dibujar más filas, y ahí saltó un fallo escondido: el
techo de filas del nivel dejaba 16 por delante donde la cámara alcanza 20, o sea
océano en el hueco del mapa. `viewRowsFor` dejó de usar coeficientes ajustados a
un encuadre fijo y proyecta las esquinas de la caja de vista sobre el suelo, que
sale exacto para cualquier zoom; y `npm run test:viewport` ahora comprueba la
ventana **ya recortada** por cada nivel, que es la que se dibuja de verdad. De
paso destapó que una tableta se quedaba corta en las dos direcciones.

También estaba mal el reparto de las dos palancas de resolución: el techo del
rango de dpr era `min(maxDpr, scale × densidad)`, así que en un teléfono
(densidad 3) el `min(1, 0.75 × 3)` daba 1 y el `scale` del nivel se perdía
entero. Son dos preguntas distintas —cuánta densidad de pantalla, y qué fracción
de ella— y ahora se responden por separado.

## Verificación

```bash
npm run sim      # simula una partida de 90 s headless (lógica pura, asserts)
npm run build && npx vite preview --port 4189 &
npm run smoke    # WebKit (motor Safari): carga, juega y verifica consola limpia

npm run test:viewport      # que la ventana de filas cubra lo que ve la cámara,
                           # ya recortada por el techo de cada nivel gráfico
npm run test:touch         # los gestos, con toques de verdad sobre un iPhone emulado
npm run test:mobile        # capturas de las cinco pantallas, en vertical y horizontal
npm run test:governor      # que el aparato decida: el rápido arriba, el lento abajo y quieto
npm run test:sharpness     # cómo se ve, a la densidad real de un móvil, con varios ajustes
npm run test:mobilebench   # los niveles dibujando por software. OJO: exagera el coste del
                           # pixel frente a una GPU de movil — no afinar la nitidez con esto
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
