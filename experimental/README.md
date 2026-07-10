# Experimental

Zona de pruebas. Aqui viven ideas sueltas y prototipos que se estan validando *antes* de decidir si vale la pena invertirles mas tiempo, sin la presion de que queden pulidos o completos.

Diferencia con `dinamicas/` y `plantillas/`: aquellas ya estan resueltas y listas para usarse en una capacitacion o duplicarse como base. Lo que vive aqui todavia se esta probando.

## Que va aqui

- Mecanicas o interacciones nuevas que quieres probar sueltas, sin montarlas todavia en una dinamica completa.
- Piezas que despues quieres **desacoplar** y llevarte a otro proyecto (un componente, un efecto visual, un patron de UI) una vez validadas aqui.
- Cualquier cosa a medio terminar que no encaja aun como presentacion, plantilla o dinamica.

## Convencion

Cada experimento vive en su propia carpeta `experimental/<slug>/` con su `index.html` y lo que necesite (total libertad de stack). Se registra en `presentations.json` bajo la clave `experimental`, con el mismo formato que las demas entradas (`slug`, `title`, `path`, etc. — ver README raiz).

Cuando un experimento madura, se saca de aqui: se mueve a `dinamicas/`, `plantillas/` o se desacopla por completo a otro repo, y se borra su entrada de esta seccion.
