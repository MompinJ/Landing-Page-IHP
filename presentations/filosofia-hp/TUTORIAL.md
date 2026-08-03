# Introducción a la Filosofía Hutchison Ports — Tutorial de presentación

Deck de 30 láminas (React + Vite, build estática en esta carpeta). Se abre
desde `index.html` y no necesita red: fuentes, imágenes y videos van incluidos.

## Controles

| Acción | Cómo |
| --- | --- |
| Avanzar / retroceder | `→` `←` (también `PageDown`/`PageUp`, `Espacio`, click en los flancos de la pantalla o swipe en táctil) |
| Índice de láminas | `Esc` abre la rejilla; click en cualquier lámina para saltar |
| Primera / última lámina | `Home` / `End` |

Entre lámina y lámina corre la **Cortina HP** (el isotipo en orientación
bandera barre la pantalla); mientras corre no se aceptan más avances, así que
pulsar dos veces la flecha no se salta láminas.

## Los tres videos

- **Video · Bienvenida** (tras la portada), **Video · La cultura HP** (acto 3)
  y **Video · Valores y creencias** (tras las láminas UNITY, antes del cierre).
- Se reproducen con click en el botón de play del reproductor. En estas
  láminas (y en el juego) las zonas de click laterales quedan desactivadas:
  se navega con teclado o swipe.

## El juego de la línea del tiempo («De un dique en Hong Kong…»)

Actividad para la sala, con los 11 hitos de la historia del Grupo:

1. Aparece una tarjeta amarilla con el año oculto (`¿…?`).
2. Se mueve con los botones **◀ Izquierda / Derecha ▶** o **arrastrándola**
   con el mouse; izquierda es lo más antiguo.
3. **Colocar** confirma: el año se revela — placa **aqua** si la posición era
   correcta, **naranja** si no — y la tarjeta viaja sola a su lugar
   cronológico.
4. El marcador (arriba a la derecha) lleva la cuenta; **Reiniciar** rebaraja.
5. Al terminar, la lámina queda como la línea del tiempo completa y correcta:
   puede dejarse en pantalla como material de repaso.

Sugerencia de facilitación: pedir a la sala que vote «¿izquierda o derecha?»
antes de cada Colocar.

## Accesibilidad / proyección

- Con `prefers-reduced-motion` activado en el sistema, el deck elimina todas
  las animaciones (contenido ya puesto, sin cortina).
- El lienzo es 16:9 (1600×900) y se escala a cualquier proyector sin
  re-maquetar; las formas de marca sangran hasta el borde real de la pantalla.

## Créditos de imágenes

Ver `img/historia/creditos.txt` (Wikimedia Commons + sitios oficiales del
Grupo, con licencias).
