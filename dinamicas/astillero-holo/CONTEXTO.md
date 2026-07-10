# Contexto del proyecto — NEXO-IA (e-learning gamificado)

> Este documento REEMPLAZA cualquier versión anterior del contexto. Si tienes en
> memoria una versión donde esto era un "juego de conquista con economía de
> farmeo, unidades y combate", descártala: esa lectura era incorrecta. Lee esto
> como la fuente de verdad.

Léelo completo antes de cualquier tarea. No es una tarea; es el brief.

## Qué es (de verdad)

Un **curso de e-learning gamificado** para capacitar a empleados de **Hutchison
Ports** en el uso responsable de la IA (proyecto narrativo: **NEXO-IA**). No es un
juego de conquista: es un **curso con piel de videojuego**. Manda la pedagogía;
la mecánica de juego es el gancho, no el centro.

El jugador es un operador reclutado para liderar la transición digital del puerto.
Aprende 5 temas de IA; al aprender, **construye** su base holográfica. Termina
certificado como "Especialista en IA".

## El principio que ordena todo

**Construir = aprender.** No se farmea moneda ni se compra infraestructura por
jugar. Cada módulo de la base se "construye" (se enciende) al **completar la
lección** que representa. La base se arma conforme el empleado domina los temas.
La frase "reforzar la base" significa, literalmente, reforzar el conocimiento.

## Qué NO hacer (correcciones al enfoque viejo)

- **NO** economía de farmeo pasivo (nada de "+38 créditos/ciclo" sin hacer nada).
- **NO** combate, enemigos ni unidades militares. El "jefe final" es un quiz de
  decisiones, no una batalla.
- **NO** generar ni editar imágenes con IA en el código; los fondos son assets
  fijos ya generados.
- **NO** cámara rotable en la vista de base (imagen plana; rompe la perspectiva).

## Estética (ya establecida, no cambiar)

Holograma táctico estilo Halo/XCOM. Fondo navy muy oscuro; estructuras en
**wireframe cian**; debajo, el **fantasma (ghost) de la foto real** de la
instalación; rejilla y scan lines. **Naranja = selección / eje técnico.** Cian =
eje humano. Etiquetas monospace. Ya tenemos generados los fondos holográficos
del astillero (oblicuo y cenital) con este look.

## Shell global (se programa UNA vez, persiste en las 5 terminales)

Estos elementos son la carcasa compartida; viven por encima de cualquier terminal
y no desaparecen:

1. **HUD con dos barras + recursos.** Las dos barras son los dos ejes de
   competencia del jugador (ver mentores). Los recursos se ganan completando
   lecciones y se gastan en mejorar módulos. Sin generación pasiva.
2. **Dos orbes de voz** (los mentores). Bolas holográficas flotantes que pulsan
   con el audio, simulando una llamada. Sin cara ni cuerpo (evita el problema de
   consistencia de personajes). Un orbe cian (humano) y uno naranja (IA).
3. **Mapa del puerto** (selección de terminal / nivel).

## Los dos mentores = los dos ejes (crítico: no invertir)

Son dos fuerzas OPUESTAS. Los nombres y el look son flexibles (pueden cambiar);
lo que NO cambia es el dualismo y qué eje es cada uno:

- **Eje HUMANO — "Comandante" (orbe cian).** Criterio humano, ética, **seguridad**.
  Es el que te FRENA, te hace validar y anonimizar. Alimenta la **barra de
  Escudo / Seguridad**.
- **Eje TÉCNICO — "IA virtual" (orbe naranja).** Potencia del algoritmo, velocidad,
  **optimización** y prompting. Es el que te ACELERA, te empuja a experimentar.
  Alimenta la **barra de Optimización**.

Ojo, es contraintuitivo pero es la tesis del curso: **el humano cuida, la IA
empuja.** No invertir.

Notas de producción de los orbes: las voces conviene **generarlas** (dos voces
distintas). El audio SIEMPRE va acompañado de **subtítulos en pantalla**
(accesibilidad + gente sin bocinas en su escritorio).

## Arquitectura de dos capas

1. **Vista de MAPA** (cenital, top-down) = las **5 terminales del puerto = los 5
   niveles** del curso. Es la selección de nivel (equivale al "NEXO-IA Operations
   Map" de la propuesta). Ya tenemos el fondo cenital del astillero; las otras
   terminales tendrán el suyo.
2. **Vista de BASE** (oblicua holográfica) = el interior de UNA terminal, donde se
   construye/aprende. Ya tenemos el astillero funcionando así.

## Molde de una terminal (se replica x5)

El shell es global. Cada terminal es **solo datos** — lo único que cambia:

- **Su arte holográfico** (foto real de esa terminal -> ghost + wireframe).
- **Su tema del curso** (1 de los 5 niveles).
- **Sus sockets = lecciones** (ver abajo).

Es decir: se programa el shell + la lógica de terminal una vez, y las 5 terminales
son 5 archivos de datos.

## Sockets pedagógicos (concepto clave)

Un socket NO es infraestructura decorativa: **cada socket ES un subtema de la
lección, disfrazado de infraestructura real** de esa terminal. Completar la
lección de un socket lo "construye" y mueve las barras. Así la fantasía (armar el
puerto) y la pedagogía (aprender) quedan casadas.

## Mapa de los 5 niveles <-> 5 terminales (de la propuesta)

| Terminal | Tema del curso |
|---|---|
| M01 Terminal de Contenedores | Nivel 1 - Diagnostico del sistema (que es la IA, tradicional vs generativa, mitos) |
| M02 Terminal de Cruceros | Nivel 2 - Camara de aprendizaje (como aprende, datos, sesgos, alucinaciones) |
| M03 Astillero | Nivel 3 - Escudo de datos (seguridad, datos sensibles, anonimizar) |
| M04 Terminal Intermodal | Nivel 4 - Codigo de comando (prompts: Rol + Contexto + Objetivo) |
| M05 Terminal de Usos Multiples | Nivel 5 - Innovacion y digitalizacion |

Antes del mapa va el **Nivel 0 (El despertar del Nexo)**: login, tutorial, escaneo
del jugador y creacion de perfil. Despues de las 5 terminales va el **Jefe final
(Caos digital)**: quiz de decisiones para estabilizar una crisis, y certificacion.

---

## TERMINAL DE REFERENCIA (resuelta): Astillero = Nivel Seguridad

Esta es la plantilla ya resuelta. Las otras 4 terminales siguen esta MISMA
estructura, cambiando tema y sockets. (Los nombres/mecanicas son la propuesta base;
el usuario puede ajustarlos.)

El astillero es el Nivel 3 del PDF (Escudo de Datos). Sus 6 subtemas se reparten en
6 sockets, cada uno disfrazado de infraestructura real del astillero:

| Socket (infraestructura real) | Subtema | Que construyes al completar | Mini-mecanica (pantalla aparte) | Barra que sube |
|---|---|---|---|---|
| **Perimetro y Accesos** | 3.1 Seguridad de la informacion en IA | Cerco perimetral / control de accesos | Escape room: sellar accesos con datos expuestos | Escudo |
| **Boveda de Carga Clasificada** | 3.2 Datos personales, sensibles y confidenciales | Boveda segura del almacen | Analisis de caso: etiquetar datos sensibles en un manifiesto (unos obvios, otros por contexto) | Escudo |
| **Grua de Embarque** | 3.3 Riesgos de compartir informacion | Grua con protocolo de carga | Consecuencias ramificadas: decides que "subes al buque/nube" y ves el resultado (fuga, multa, reputacion) | Escudo |
| **Torre de Control** | 3.4 Informacion segura vs delicada | Torre y su semaforo | Semaforo de riesgos: clasificar documentos en verde/amarillo/rojo | Escudo |
| **Dique de Inspeccion** | 3.5 Identifica, anonimiza y consulta | Dique seco operativo | Editor: tachar/sustituir datos sensibles antes de "zarpar" (enviar a la IA) | Escudo + algo de Optimizacion |
| **Canal Seguro Copilot** | 3.6 Copilot Chat corporativo | Compuerta / terminal Copilot | Comparacion interactiva: Copilot corporativo vs IA publica (seguridad y gobernanza) | Optimizacion |

El **hub central (Astillero Central)** se enciende al completar los 6 sockets ->
nivel Seguridad completado, barra de Escudo al maximo. Al salir al mapa, la
terminal aparece "iluminada / construida".

---

## Notas tecnicas (siguen vigentes de la version anterior)

- Sockets posicionados en **porcentajes** sobre la imagen de fondo (anclaje al
  escalar). Camara fija.
- **Modo calibracion** (tecla `C`): arrastrar sockets y exportar sus coords.
- Estado persistente con **localStorage** (es app real). El estado del HUD y el
  progreso son **globales** (compartidos entre terminales y mini-juegos).
- Separar **datos** (terminales, sockets, lecciones, costes, estado) del
  **render**, pensando en migrar la vista de base a **Three.js** (wireframe 3D
  seleccionable) en una v2 sin reescribir la logica.

## Estado actual

- Vista de base del **astillero** ya construida y funcionando (fondo holografico +
  sockets + HUD + calibracion).
- Fondos holograficos generados: astillero oblicuo (base) y cenital (mapa).
- Falta: reetiquetar el HUD a los dos ejes, los orbes de voz, el flujo de
  lecciones (construir = completar leccion), el mapa de 5 terminales, y las otras
  4 terminales.
