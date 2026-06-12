⚓ Design System: Plataforma de Presentaciones "Puerto Moderno"

Estilo: Creativo, Minimalista, Corporativo, Disruptivo.
Temática: Naval, Contenedores, Barcos, Grúas, Logística Portuaria.

Este Design System establece las reglas y componentes visuales para crear presentaciones en formato web que transmitan solidez corporativa y vanguardia tecnológica, inspiradas en la eficiencia y la escala del mundo marítimo.

1. Identidad Visual y Concepto

La interfaz debe sentirse como el panel de control de un puerto inteligente del futuro.

Creativo/Disruptivo: Uso de asimetrías controladas, tipografía de gran tamaño y contrastes fuertes (Azul Mar vs. Amarillo Sunray/Naranja Sunset).

Minimalista/Corporativo: Fondos limpios (bgSurface), mucho espacio en blanco (whitespace) para dejar "respirar" el contenido y estructuras de grillas estrictas (como el apilamiento de contenedores).

Temática Naval: Elementos gráficos inspirados en radares, coordenadas (uso de tipografía Mono), texturas de acero corrugado (sutiles) y bloques rectangulares perfectos (contenedores).

2. Paleta de Colores

2.1 Colores Principales (La Profundidad y el Cielo)

Primary Sky Blue (#009BDE): Para elementos interactivos principales, links, y acentos dinámicos.

Primary Sea Blue (#002E6D): El ancla visual. Fondos de secciones importantes, tipografía principal sobre fondos claros.

2.2 Colores Secundarios (Las Señales Portuarias)

Horizon Blue (#9ACAEB): Para fondos secundarios, bloques de citas o áreas de descanso visual.

Aqua Green (#54BBAB): Indicadores de éxito, datos positivos, "vía libre".

Sunray Yellow (#FFC627): Color de Alta Visibilidad. Ideal para Call to Actions (CTAs) disruptivos, alertas, o resaltar métricas clave (como una grúa amarilla contra el cielo azul).

Sunset Orange (#EE7523): Para detalles vibrantes, insignias o destacar elementos urgentes.

2.3 Tintes y Funcionales


Fondo General: bgSurface (#F8FAFC) - Da una sensación más moderna y técnica que el blanco puro.

Texto Principal: textPrimary (#222F4F) - Asegura legibilidad máxima sin el impacto agresivo del negro.

3. Tipografía

El contraste tipográfico es clave para el estilo disruptivo.

3.1 Display (Verlag / Montserrat Black)

Uso: Títulos principales de diapositivas (h1), números estadísticos gigantes.

Estilo: Enorme, contundente. Puede estar parcialmente cortada por el borde de la pantalla para dar sensación de inmensidad (como el casco de un buque carguero).

3.2 UI & Body (Montserrat)

Uso: Texto general, descripciones, botones.

Estilos Clave:

Regular (400): Cuerpos de texto (max 60-70 caracteres por línea).

SemiBold (600) / Bold (700): Subtítulos, labels en gráficos, botones. Párrafos cortos de alto impacto.

3.3 Datos y Código (JetBrains Mono / Fira Code)

Uso: Coordenadas (ej. LAT 19.19 LON -96.13), cifras de tonelaje, números de contenedores (ej. MSKU 906032 5), paginación de la presentación (01 / 15).

Efecto: Aporta el toque "técnico/radar" y disruptivo.

4. Efectos y Overlays (La Atmósfera)

La regla de oro: Nunca negro puro para sombrear o cubrir. La oscuridad en el mar es azul profunda.

Fotografías de Fondo: Siempre usar el Hero nocturno overlay rgba(0, 28, 80, 0.58) o el Hero slider overlay rgba(0, 46, 109, 0.55) para asegurar la legibilidad del texto blanco/amarillo encima.

Efecto "Contenedor": Uso de tarjetas (cards) con bordes afilados (border-radius: 0 o muy sutil 2px).

Card Overlay: linear-gradient(180deg, rgba(0,46,109,0) 0%, rgba(0,46,109,0.85) 100%) sobre imágenes de puertos/grúas para colocar texto en la parte inferior de la tarjeta.

5. Componentes y Patrones de Diseño

5.1 Grilla "Container Stacking" (Apilamiento)

El layout de las diapositivas debe basarse en bloques rectangulares que recuerden al apilamiento perfecto de contenedores en un puerto.

Usar CSS Grid para crear layouts asimétricos pero perfectamente alineados.

Alternar bloques de color sólido (ej. un "contenedor" Sea Blue junto a uno Sunray Yellow).

5.2 Tipografía "Cargo" (Estilo Carga)

Usar números de diapositiva grandes en tipografía Mono en las esquinas, simulando códigos de registro de contenedores (ej. [ SLIDE_04 ]).

Cajas delimitadoras finas (borderSubtle: #E2E8F0) alrededor de datos específicos.

5.3 Botones y CTAs

Primary Action: Rectangulares, contundentes. Fondo Sunray Yellow, texto textPrimary (Bold), sin bordes redondeados.

Secondary Action: Borde Sky Blue, fondo transparente, texto Sky Blue. Hover: efecto Brand gradient.

5.4 Gráficos y Datos (Dashboard Portuario)

Las presentaciones corporativas tienen datos. Mostrarlos como un panel de control.

Usar tipografía Mono para los valores de los ejes.

Utilizar los gradientes para rellenar áreas de gráficos:

Ocean Gradient para volúmenes de carga estables.

Sunset Gradient para crecimiento disruptivo o alertas.

5.5 Transiciones

Movimientos horizontales o verticales limpios, como el desplazamiento de una grúa pórtico o el deslizamiento de un contenedor. Nada de fundidos suaves o rebotes; movimiento industrial y preciso.

6. Ejemplo de Composición de Diapositiva (Slide Tipo)

Slide: "Eficiencia Operativa" (Layout de 2 columnas)

Fondo General: bgSurface.

Columna Izquierda (30% ancho):

Fondo: Ocean Gradient o sólido Sea Blue.

Texto [ SLIDE_05 ] en Mono, color Horizon Blue en la esquina superior.

Título H1 (Verlag/Black): "VELOCIDAD" en blanco, justificado a la izquierda, ocupando mucho espacio.

Columna Derecha (70% ancho):

Fotografía en blanco y negro de una grúa pórtico trabajando.

Aplicar Card Overlay en la parte inferior de la foto.

Dato destacado flotando sobre el overlay: +24% (Tipografía Mono gigante, color Sunray Yellow).

Párrafo corto en Montserrat Regular, color blanco, explicando la métrica.
