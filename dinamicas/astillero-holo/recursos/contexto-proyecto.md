# Contexto del proyecto — Astillero RTS (base-builder web)

Lee esto primero. Es el brief del proyecto. NO es una tarea todavía; es para que
entiendas qué estamos construyendo antes de recibir la instrucción de código.

## Qué es

Un juego web de conquista y construcción de bases, estilo **Halo Wars**,
tematizado sobre un astillero real: el **TNG de Hutchison Ports (Veracruz,
México)**. El jugador construye y mejora módulos sobre la instalación real,
sube de tier y defiende/expande.

## Concepto core (la mecánica)

- Hay un **hub central** (el astillero) y **sockets** modulares alrededor.
- Cada zona real del astillero es un socket con una función:
  - **Economía** → almacenes (generan créditos)
  - **Energía** → parque de tanques / combustible (genera energía)
  - **Producción** → diques secos (de aquí salen barcos = las "unidades")
  - **Defensa** → grúas / torretas / muelle
  - **Hub** → astillero central (sube de tier y desbloquea más sockets)
- El jugador construye módulos en sockets vacíos y los **mejora por niveles**
  (L1 → L2 → L3). Subir el tier del hub desbloquea nuevos sockets.
- Los **barcos que salen de los diques son las unidades** del jugador.

## Estética (importante, define todo el look)

Estilo **holograma táctico** tipo Halo / XCOM / Homeworld. La ficción es que el
jugador es el comandante mirando una **mesa de mando holográfica**.

- Fondo **azul navy muy oscuro**, casi negro.
- Estructuras dibujadas como **wireframe cian / azul brillante** que "glowea".
- Debajo del wireframe se intuye un **fantasma (ghost) de la foto real** del
  astillero, tenue y de bajo contraste.
- Rejilla cian sutil y scan lines en el suelo.
- **Naranja = elemento seleccionado** (solo para selección; nunca hornear naranja
  en el fondo).
- Paleta monocromo azul + acento naranja de selección. Etiquetas en monospace.

## Arquitectura de DOS capas (clave)

El juego tiene dos vistas distintas, cada una con su ángulo de cámara:

1. **Vista de BASE** — ángulo **oblicuo aéreo (2.5D)**, con sensación de
   profundidad. Aquí se construye y mejora. Es la capa táctica.
2. **Vista de MAPA** — ángulo **cenital puro (top-down 2D)**, plano desde arriba.
   Aquí se navega entre terminales/bases del puerto. Es la capa estratégica.

Son capas separadas que conviven; una no reemplaza a la otra.

## Decisiones técnicas (respétalas)

- **Los fondos son imágenes ya generadas** (con IA, aparte). Son **assets fijos**.
  NO las regeneres, NO uses IA, NO cambies el estilo. Úsalas tal cual como PNG.
- Sobre esas imágenes, **el código dibuja** los sockets, el HUD, la lógica.
- **v1 (lo que se pide ahora):** fondo estático (la imagen) + overlay de sockets
  clicables + HUD + lógica de construir/mejorar/tiers. **Cámara fija**, no rota.
- **v2 (después, no ahora):** migrar la vista de base a **wireframe 3D real en
  Three.js**, usando la imagen como referencia/ghost, con cada módulo como objeto
  3D seleccionable. Por eso conviene separar datos (sockets, módulos, costes) del
  render, para no rehacer todo al migrar.

## Estado actual

- Ya existen los **dos fondos base** generados:
  - `base-holografica.png` → vista de base, oblicua 2.5D (con dos grúas azules,
    nave central, diques, tanques).
  - `mapa-cenital.png` → vista de mapa, top-down.
- Falta **todo el motor**: es lo que vas a construir.

## Qué NO hacer

- No generar ni editar imágenes con IA.
- No re-renderizar los fondos ni cambiar su estilo.
- No hacer la cámara rotable en v1 (la imagen es plana; se rompe la perspectiva).
- No meter frameworks pesados si no aportan; vanilla está bien para v1.

Cuando confirmes que entendiste el proyecto, se te pasará la instrucción de build
(`build-01-vista-base.md`) junto con las imágenes.
