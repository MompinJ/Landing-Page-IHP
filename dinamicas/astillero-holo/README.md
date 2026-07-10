# NEXO-IA — Terminal Astillero (Nivel 3: Escudo de Datos)

E-learning gamificado para Hutchison Ports: curso de IA responsable con piel de
videojuego. Terminal piloto sobre el astillero TNG. Brief completo en
`CONTEXTO.md` (fuente de verdad).

Principio: **construir = aprender**. Cada socket es un subtema disfrazado de
infraestructura real; completar su leccion lo enciende y sube las barras. Sin
farmeo pasivo.

## Como abrir

Abrir `index.html` en el navegador (funciona via `file://` o con el servidor
del hub: `python -m http.server 8080` desde la raiz del repo).

## Estado actual (Build 03)

- **Mapa del puerto**: el juego arranca en la pantalla de MAPA
  (`assets/mapa-cenital.png`) con los 5 nodos de terminal (niveles 1-5).
  Solo el Astillero es jugable; el resto aparecen bloqueadas (PROXIMAMENTE).
  Nodo completado = encendido en verde. Boton "&lt; MAPA" para volver.
- La ultima pantalla vista se guarda: F5 restaura mapa o terminal.
- Agregar una terminal futura = una entrada en `js/terminales.js` + su
  pantalla; el mapa no se reescribe.

## Build 02 (dentro de la terminal)

- HUD de dos ejes: **ESCUDO / SEGURIDAD** (cian, Comandante) y **OPTIMIZACION**
  (naranja, IA virtual) + contador de DATOS y progreso de lecciones.
- 6 sockets pedagogicos (sec-1 a sec-6, subtemas 3.1-3.6) + hub. Tocar un
  socket vacio abre su leccion en overlay con el **orbe del mentor** (cian /
  naranja / ambos) y su frase como subtitulo.
- Al completar: el socket se construye, suben las barras, se otorgan datos y se
  guarda. Con las 6, el hub se enciende solo: terminal construida y Escudo al
  maximo.
- Lecciones **stub** (boton "Completar leccion") salvo `sec-4` (Torre de
  Control), que ya es el mini-juego real de semaforo de riesgos y valida el
  patron.
- Los DATOS se gastan en reforzar modulos (L1 -> L3).

## Arquitectura

| Archivo | Rol |
|---|---|
| `js/datos.js` | Datos de ESTA terminal: sockets, subtemas, recompensas. Sin DOM |
| `js/terminales.js` | Lista data-driven de las 5 terminales del mapa |
| `js/mapa.js` | Pantalla de mapa: nodos, estados, calibracion de nodos |
| `js/pantallas.js` | Gestor MAPA <-> TERMINAL; restaura la ultima pantalla al recargar |
| `js/lecciones.js` | Lecciones con contrato `{id, titulo, subtema, mentor, intro, render(container, onComplete)}` |
| `js/estado.js` | Estado GLOBAL del curso (barras, datos, terminales) + localStorage. Sin DOM |
| `js/flujo.js` | Motor generico leccion -> construir + orbe de mentor (gancho `hablar()` para voz) |
| `js/render.js` | Render DOM de la base (se sustituye por Three.js en el futuro) |
| `js/calibracion.js` | Modo calibracion (tecla C): arrastrar sockets y exportar coordenadas |
| `js/main.js` | Arranque, teclado, instrucciones |

Los mini-juegos reales de builds futuros SOLO sustituyen el `render()` de cada
leccion; el flujo no se toca. Las otras 4 terminales seran otro `datos.js` +
`lecciones.js` con el mismo shell.

## Pendiente (builds futuros)

- Los 5 mini-juegos restantes (sec-1, 2, 3, 5, 6).
- El contenido de las otras 4 terminales (hoy bloqueadas en el mapa).
- Imagen definitiva del mapa del puerto (hoy placeholder: cenital del
  astillero; se cambia el PNG sin tocar codigo).
- Audio real de los orbes (via `Flujo.hablar`), Nivel 0 y jefe final, Three.js.
