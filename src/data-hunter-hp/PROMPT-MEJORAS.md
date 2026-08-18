# PROMPT REFINADO — Biomas Hutchison Ports + océano infinito (EJECUTADO)

Versión mejorada del spec original, anclada en las operaciones REALES de
Hutchison Ports México. Refinamientos aplicados sobre el prompt del usuario:

1. **Biomas de 26 filas, no 100**: a ~1 fila/s en una partida de 90 s, con 100
   filas el jugador solo vería un bioma; con 26 recorre los 4.
2. **Paleta nocturna conservada**: en vez del cielo diurno `#80c0e0` del spec
   (rompía la identidad aprobada), niebla marina nocturna `#0a2740` con
   `fogExp2` — mismo objetivo (sin cortes a negro) sin cambiar el mood.
3. **Océano barato + reflejo caro donde importa**: el plano infinito usa
   material estándar con normal-map animado (dt), y `MeshReflectorMaterial`
   queda solo para el agua jugable de ECV (rendimiento 60 FPS).

## Rotación de biomas (`ZoneTheme` en src/world/rows.ts)

| Bioma | Operación real | Contenido |
|---|---|---|
| `port` | LCT (Lázaro Cárdenas) | pilas de contenedores, camiones/AGVs, RTG móvil, **STS monumental** en el borde marítimo |
| `cruise` | ECV (Ensenada) | mecánica río: agua fatal + barcazas + muelles; cruceros decorativos |
| `shipyard` | TNG (Talleres Navales del Golfo, Veracruz, +85 años) | **dique seco con casco en imprimación rojo óxido**, hélices/secciones como bloqueos, andamios, grúas de pluma, **chispas de soldadura** en loop, STS roja industrial |
| `rail` | TILH (Tula, Hidalgo — puerto seco intermodal) | vías sobre **balasto**, **trenes de carga rápidos** (loco + plataformas con contenedores), **semáforos de cruce** que parpadean al acercarse el tren, **RMG amarilla** de 3 filas bajo la que pasas |

- Arcos de transición con banners Higgsfield por bioma (`gate-{port,cruise,shipyard,rail}.png`).
- Super-estructuras (STS/RMG/dique) SOLO en la fila-ancla (`isBiomeAnchor`) —
  una instancia por bioma, draw calls controlados.
- Pooling intacto: trenes = `VehicleData` normal (wrap con aire extra
  `TRAIN_GAP_TILES` para la pausa entre pasadas que da sentido al semáforo).
- `<OceanBackground/>` en `water.tsx`: plano 240×240 a y=-0.5 que sigue al
  jugador por casillas, color `#001a33`, normal-map de oleaje animado.
