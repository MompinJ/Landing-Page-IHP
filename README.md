# Repositorio de Presentaciones

Hub estatico para navegar entre presentaciones independientes. Cada presentacion vive en su propia carpeta bajo `presentations/<slug>/` con sus propios estilos, scripts y assets — **no hay acoplamiento entre ellas**.

## Estructura

```
/
  index.html              # Hub (indice navegable)
  hub.css                 # Estilos del hub
  hub.js                  # Render dinamico de tarjetas
  presentations.json      # Manifest de presentaciones y plantillas
  presentations/          # Presentaciones reales (una carpeta por slug)
    check-eat/
      index.html
      Check-Eat.pdf
      css/styles.css
      js/presentation.js
      assets/checkeat-icon.png
  plantillas/             # Plantillas 3D listas para duplicar
    README.md             # Guia de uso de las plantillas
    cubo-3d/
    orbita-3d/
    profundidad-3d/
    galaxia-3d/
    sonar-3d/
    altamar-3d/
    carta-nautica-3d/
    hp-corporativo-3d/
    hp-terminal-3d/
    hp-red-global-3d/
    ciudad-3d/
    puerto-3d/
    grua-sim-3d/
  dinamicas/              # Juegos interactivos para la audiencia
    mexico-hp/
    trivia-grua/
    atraque-hp/
    estiba-hp/
    despacho-hp/
    cadena-hp/
    caza-riesgos/
    etica-hp/
    cero-emisiones/
    memorama-unity/
    caza-fugas/
    linea-fuego/
    flujo-terminal/
  experimental/          # Zona de pruebas: ideas sueltas antes de decidir si se desacoplan
    README.md
```

## Como abrir

El hub usa `fetch()` para leer el manifest, asi que necesita un servidor HTTP (no funciona via `file://`).

```bash
python -m http.server 8080
# http://localhost:8080
```

## Plantillas 3D

En `plantillas/` hay 4 bases listas para duplicar, todas vanilla y con navegacion completa (teclado, swipe, rueda):

| Plantilla | Tecnica | Estetica |
|---|---|---|
| `cubo-3d` | Cubo CSS 3D que rota en cada transicion | Oscura, cian electrico |
| `orbita-3d` | Carrusel cilindrico con arrastre e inercia | Aurora violeta, glassmorphism |
| `profundidad-3d` | Lienzo infinito estilo impress.js, camara que vuela | Editorial: papel, serif, tinta |
| `galaxia-3d` | Campo de estrellas WebGL (Three.js) con warp | Espacio profundo, glass |
| `sonar-3d` | Descenso submarino en Z, medidor de profundidad vivo | Naval: CRT abisal, verde sonar |
| `altamar-3d` | Oleaje canvas que se embravece, cielo del alba a la noche | Naval: travesia, vela y laton |
| `carta-nautica-3d` | Mesa de derrota 3D, ruta trazada en vivo y barco | Naval: papel de carta, tinta, rojo |
| `hp-corporativo-3d` | Barrido diagonal a 30.3 grados + parallax por capas | Hutchison Ports (manual v4.1) |
| `hp-terminal-3d` | Grua portico que iza y baja contenedores 3D | Hutchison Ports: patio y paleta oficial |
| `hp-red-global-3d` | Globo de puntos WebGL que gira a cada puerto | Hutchison Ports: red global sobre blanco |
| `ciudad-3d` | Avenida nocturna; arrastra para mirar alrededor | Interactiva: neones y espectaculares LED |
| `puerto-3d` | Diorama de puerto orbitable con gruas trabajando | Interactiva: maqueta de dia de operacion |
| `grua-sim-3d` | Simulador de grua con fisica (modo cabina con M) | Interactiva: amanecer industrial |

Para usar una: `cp -r plantillas/<plantilla> presentations/<tu-slug>`, edita las slides y registrala en el manifest. Detalles en `plantillas/README.md`. Las plantillas aparecen en su propia seccion del hub (clave `templates` del manifest).

## Dinamicas

Juegos interactivos para la audiencia, en `dinamicas/<slug>/` (clave `dinamicas` del manifest, tercera seccion del hub):

| Dinamica | Que hace el participante |
|---|---|
| `mexico-hp` | Navega un buque por un mapa de Mexico que al tocar tierra se convierte en grua movil. Hay que llegar a las 5 sedes de Hutchison Ports (Ensenada, Manzanillo, Lazaro Cardenas, Veracruz, Hidalgo); cada llegada abre la ficha de la sede en pantalla completa con sus unidades de negocio (ICAVE/TNG/HPMX, LCT/LCMT, etc.) y un boton ACEPTAR para continuar. Tren intermodal Veracruz-Hidalgo con la tecla T |
| `trivia-grua` | Llega un contenedor con una pregunta rotulada; hay que operarlo con la grua (teclado o consola de botones en pantalla) y soltarlo en la plataforma VERDADERO o FALSO. Balanceo de pendulo, caida con gravedad, veredicto en grande y marcador de aciertos. Preguntas editables en `js/trivia.js` |
| `atraque-hp` | Maniobra de atraque con fisica naval: inercia real, timon que solo muerde con arrancada, remolcadores (Q/E) y viento de traves en niveles avanzados. Entrar por la bocana y quedar en la bahia alineado a menos de 1.5 nudos; puntaje por suavidad, tiempo y cascos para competir entre participantes. Niveles editables en `js/atraque.js` |
| `estiba-hp` | Corte transversal del buque con 7 bahias: la grua entrega contenedores con tonelaje rotulado y hay que estibarlos cuidando la escora (clinometro en vivo, momento = peso x distancia a cruija). Pasarse de 8 grados = volcadura animada. Puntaje por escora final y tiempo. Configuracion en `js/estiba.js` |
| `despacho-hp` | Arcade de clasificacion: los contenedores llegan por la banda y hay que leer sus marcas (reefer, rombo IMO, averia, carga seca) y despacharlos con WASD o botonera a la zona correcta antes de que expire el anillo de tiempo. Combos, errores que ensenan la regla y ritmo creciente. Tipos y ritmo en `js/despacho.js` |
| `cadena-hp` | Ordenar el flujo logistico arrastrando fichas a la ruta: importacion (buque a cliente), exportacion (planta a buque) y cadena de frio reefer. Al confirmar, las correctas se fijan y las equivocadas regresan; puntaje por intentos y tiempo. Tambien jugable con teclado. Escenarios editables en `js/cadena.js` |
| `caza-riesgos` | Semana de seguridad: escena del patio en SVG con 10 actos/condiciones inseguras escondidas entre senuelos seguros (carga suspendida, estiba desfasada, salida bloqueada, punto ciego...). Clic sobre cada riesgo en 90 segundos; los fallos restan, cada hallazgo ensena la regla y al final se revelan los no encontrados. Los riesgos son grupos `.hz` del SVG: editables sin tocar el motor |
| `etica-hp` | Compliance gamificado: cada contenedor trae un dilema de integridad (la cena del licitante, el primo proveedor, el pago de facilitacion...) y la grua lo coloca en ACEPTAR, DECLARAR AL COMITE o DECLINAR. El veredicto siempre explica la politica; si fallas, la plataforma correcta parpadea. Dilemas editables en `js/etica.js` |
| `cero-emisiones` | Gestion ESG: 8 decisiones operativas del anio con dos presupuestos que no se pueden reventar (dinero y toneladas de CO2). Lo barato contamina, lo verde cuesta y a veces lo verde tambien es lo barato (tren vs camiones). Cierre con comparativa de carbono evitado vs operar todo en diesel. Presupuestos y decisiones en `js/cero.js` |
| `memorama-unity` | RH: memorama de parejas valor-comportamiento con los valores UNITY (cartas azules = valor, blancas = conducta). Modo 1 equipo contra reloj o 2 equipos por turnos (acertar da punto y repite). Cada pareja unida repasa el valor en el toast. Parejas editables en `js/memorama.js` |
| `caza-fugas` | Ambiente: variante de la Caza de Riesgos con 11 fugas y derroches (descarga al mar, ralenti, tambo sin charola, manguera abierta, mala segregacion, clima con puerta abierta...) entre buenas practicas senuelo. Mismo motor de point-and-click: escena editable via grupos `.hz` del SVG |
| `linea-fuego` | Seguridad: 6 maniobras cenitales (grua girando, reversa, snap-back de cabo, pasillo de montacargas, izaje con viento, apertura de contenedor) con 4 posiciones marcadas; hay que elegir la UNICA segura contra reloj. Al responder se revelan las zonas de peligro y la regla. Rondas editables como grupos `.round` del SVG |
| `flujo-terminal` | Pieza VISUAL (no juego): el ciclo de descarga animado en CSS 3D — STS toma del buque, tractores en circuito, RTG estiba en pilas que crecen. Tira de flujo en vivo, camara cinematica automatica (arrastra para orbitar, 1-4 vistas, espacio pausa) y reinicio al vaciar la cubierta. Ritmo y layout en `js/flujo.js` |
| `tronco-runner` | Endless runner 3D estilo Subway Surfers (React Three Fiber): corre por 3 carriles recolectando los valores del Tronco Comun (+10), esquivando riesgos (-10) y sorteando obstaculos fisicos que piden tres acciones distintas (-15): saltar, rodar por debajo o cambiar de carril. El trazado es un curso fijo escrito a mano (`src/course.js`), igual en todas las partidas para que el TOP 10 sea comparable: 2 minutos, 2340 m, 5 zonas de 468 m y cada zona es una unidad de negocio del grupo — **Usos Multiples, Contenedores, Intermodal, Cruceros y Astillero** — anunciada con cartel y un portico fisico rotulado que se cruza por debajo, y con una fila de tres valores en el carril que cada patron deja libre. Cada zona trae su equipo real y viste con el los obstaculos sin cambiar la mecanica: en la TUM se salta una cuchara bivalva, se rueda bajo una banda transportadora y se esquiva una tolva receptora, entre gruas moviles portuarias, brazos de carga, silos, tanques y montones de granel; la TEC lleva los trece elementos de una terminal de contenedores (STS, RTG, RMG sobre rieles cruzando por encima de los carriles, straddle carriers, reach stackers, empty handlers, tractocamiones, reefer racks, arcos OCR, nave CFS, espuelas de doble estiba y slots numerados) y sube el escalon: muros de contenedores consecutivos y contenedores de 40 pies que cierran un carril durante 12 m — la ventana de colision mide el largo real de la pieza — mas el tractocamion, que viene de frente cerrando un 35% mas rapido que el mundo. La de **Cruceros** (zona 4) es la unica sin suelo continuo: se sale de un muelle, se cruza mar abierto saltando entre diez lanchas que ocupan un solo carril cada una y van cambiando de carril. El mar es suelo, no un obstaculo invisible: tiene lamina y fondo pisable, asi que fallar el salto es caer al agua, seguir corriendo con el agua por las rodillas y volver a subirse a la lancha siguiente por su propio pie (-15 y las fichas perdidas, pero sin que nadie te cambie de carril), y una pasarela con escalones sube 3.2 m a la cubierta del crucero — que se ve venir desde el agua con su superestructura de balcones. A bordo los obstaculos son piscina de 12 m, tumbonas, toldos y bar de cubierta, y al final una pasarela de desembarco baja al muelle otra vez. La Intermodal (zona 3) se juega como Subway Surfers: los tres carriles son tres espuelas y se corre sobre la via, con convoyes de vagones estacionados que cierran un carril 25-37 m (dos en paralelo dejan solo el pasillo central), locomotoras entrando de frente a +80% de velocidad, gruas puente que se pasan rodando y chasis vacios que se saltan, entre RMG sobre rieles, reach stackers, empty handlers, mulas, filas de chasis, doble estiba, andenes de inspeccion, cross-docking y gates con bascula y OCR. El **Astillero** cierra el recorrido (zona 5) y su protagonista es el dique seco **con un buque dentro**: se baja 4.6 m a la solera y se corre pegado al casco de un barco de 14 m de alto y 300 m de largo — obra viva roja, linea de flotacion, costuras de plancha, marcas de calado, helice de bronce y timon a la vista en la popa, torres de andamio trepando el costado y picaderos bajo la quilla. Aqui **las alturas son una eleccion y se juegan**: los andamios van en cadenas de dos o tres tableros sobre UN carril, con escalera solo en el primero y huecos de 5-7 m entre ellos, asi que para seguir arriba hay que ir saltando de tablero en tablero (el ultimo salto es diagonal, del carril central al derecho) mientras se esquiva lo que hay encima: lineas de servicio que se ruedan, planchas que se saltan y el gancho de la grua con una viga eslingada, que llega de frente a la altura del tablero. Aguantar arriba hasta el final de una cadena paga un bono, y sobre el tablero no va ni una ficha: el hexagono tapaba justo el canto donde hay que aterrizar. Al pasar por debajo, el andamio se vuelve translucido (la camara va a 4.3 m y el tablero a 2.7, o sea que si no, tapa al propio corredor). Por abajo tampoco es gratis: bajo cada tablero cruzan lineas de servicio que obligan a rodar. Por eso el suelo dejo de ser funcion solo de la distancia y pasa a depender del carril y de la altura a la que va el corredor (`supportAt`). La grua Goliath cruza el dique de lado a lado; alrededor van gruas torre sobre rieles, plumas de pedestal, talleres de prefabricacion, corte por plasma y naves de granallado. Obstaculos: planchas de acero apiladas, travesanos de andamio con malla, lineas de servicio, torres de andamio, mega-bloques de casco de 12 m, SPMT de frente y gancho de grua con carga. Ambientado con skybox de puerto al atardecer y texturas tileables generadas con Higgsfield (contenedores corrugados, asfalto, cubierta, teca, balasto, agua), gruas STS/RTG, casco con mar a los costados y botes salvavidas. Las fichas van a color pleno con paloma/tache en navy para leerse a 30 m y la etiqueta del valor aparece encima al acercarse; el FOV se abre con la velocidad y hay vineta, tambaleo del corredor al chocar y sacudida de camara. Movimiento estilo SS: salto corto y snappy con margen de gracia, voltereta con cooldown (flecha abajo / swipe abajo) que corta el salto si se pulsa en el aire, y alabeo de camara al cambiar de carril. Swipe/tap/teclado, rangos por puntaje y TOP 10 en localStorage para el stand. Fuente en `src/tronco-runner` (compilar y copiar `dist/` como en gateway-react); `?skip=<metros>` arranca la partida en ese metro para inspeccionar una zona |

## Experimental

Zona de pruebas en `experimental/<slug>/` (clave `experimental` del manifest, cuarta seccion del hub). Aqui van ideas sueltas y prototipos a medio validar — sin la presion de que queden pulidos o completos — antes de decidir si se **desacoplan** a otro proyecto o se promueven a `dinamicas/`/`plantillas/`. Detalles y convencion en `experimental/README.md`.

## Como agregar una presentacion nueva

1. Crear carpeta `presentations/<slug>/` con su propio `index.html` y assets (CSS/JS/imagenes que necesite). Total libertad de stack y estilos. La via rapida: duplicar una plantilla de `plantillas/`.
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
  "theme": "mi-presentacion",
  "path": "presentations/mi-presentacion/index.html"
}
```

3. (Opcional) Para que la tarjeta adopte el estilo visual de la presentacion, define un bloque de tema en `hub.css` bajo `[data-theme="<slug>"]` reutilizando sus colores, fuentes y decoracion. Sin `theme` (o sin bloque) la tarjeta usa el estilo brutalista por defecto.
4. Recargar el hub. La tarjeta aparece automaticamente y su titulo entra al marquee superior.

Campos `subtitle`, `description`, `date`, `tags`, `accent`, `theme` son opcionales. Solo `title` y `path` obligatorios. El campo `accent` colorea la barra superior y el hover de la tarjeta; `theme` selecciona el bloque de estilo en `hub.css`.

## Presentaciones actuales

| Slug | Titulo |
|---|---|
| `gateway-tecnica` | Gateway — Arquitectura Tecnica, HUB Digital IHP para el area de TI (microservicios tras el API Gateway + capitulo tecnico), identidad Hutchison Ports (13 slides, React) |
| `gateway-react` | Gateway by Hutchison Ports — version React de la ejecutiva (25 slides con recorrido en video modulo por modulo), sucesora de la vanilla `gateway` |
| `gateway-navy` | Gateway — Navy Edition: espejo oscuro de `gateway-react` (mismo contenido, transiciones y videos; rediseño navy/glass para salas oscuras). Misma app Vite, pagina `dark.html` |
| `nom-035` | NOM-035 — Modulo 0, factores de riesgo psicosocial, identidad Hutchison Ports v4.1 (en construccion) |
| `check-eat` | Check-Eat — Nutricion Estudiantil UCC (10 slides) |
| `infra-azure-hub` | Infraestructura Azure — HUB Hutchison Ports, Fase 1 economica (11 slides, React) |
| `infra-gateway` | HUB Digital IHP — Que se contrata en la nube y cuanto cuesta (divulgativa, servicio por servicio + costos), identidad Hutchison Ports v4.1 (13 slides, HTML/CSS/JS) |

## Notas

- Sin build, sin npm. HTML/CSS/JS vanilla.
- El hub ordena por `date` descendente (mas reciente primero).
- Cada presentacion implementa lo que quiera (slides custom, scroll, video, etc).
