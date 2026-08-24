import { useFrame, useThree } from '@react-three/fiber';
import { useRef, useState } from 'react';
import { BALANCE } from '../data/balance';
import { BIOME_SEQUENCE, generateRows, rows } from '../world/rows';
import { useGameStore } from '../store/useGameStore';
import { Row, subeEtiquetasPendientes } from './Map';

/**
 * PRECALENTADO DE SHADERS — el arreglo de los tirones, sin tocar la calidad.
 *
 * EL DIAGNÓSTICO (medido con `scripts/jank-test.ts`): jugando de verdad, la
 * mediana del frame es 1.7 ms (≈590 fps) pero aparecían frames sueltos de 37 y
 * 76 ms. Un frame de 76 ms es un congelón que se ve, y es exactamente lo que se
 * siente como «va trabado» — los fps MEDIOS lo esconden, porque dos frames
 * malos entre cuatro mil no mueven la media.
 *
 * Y el 100% de esos tirones caía en el mismo frame en que el contador de
 * programas de WebGL subía en uno. O sea: NO era la GPU, ni los triángulos, ni
 * la resolución. Era que cada material nuevo que entra en cuadro por primera vez
 * compila y enlaza su shader EN MEDIO DE LA PARTIDA, y eso congela el hilo.
 *
 * LA SOLUCIÓN: compilarlos todos antes, mientras el jugador lee el briefing.
 * Ese hueco es regalado — la pantalla está quieta y nadie mira los fps.
 *
 * Y NO SOLO SHADERS. Compilar un material y subir sus texturas son dos cosas
 * distintas: `compile()` hace lo primero, y lo segundo three lo hace la primera
 * vez que algo se DIBUJA — que aquí no pasa nunca, porque las filas de
 * precalentado van invisibles. Así que el precalentado dejaba dibujados los
 * canvas de las 206 etiquetas de ficha y le pasaba a la partida el trabajo que
 * de verdad atasca el frame: subirlas. Se cierra con `initTexture`, a
 * cuentagotas (ver `ETIQUETAS_POR_FRAME`).
 *
 * Dos detalles de three que lo hacen barato:
 *
 *  - `compile()` recorre con `traverse`, NO con `traverseVisible` (comprobado en
 *    three 0.185): los objetos INVISIBLES también compilan su material. Así que
 *    las filas de precalentado se montan con `visible={false}` y no se dibujan
 *    ni un frame.
 *  - se usa `compile()` y NO `compileAsync()`: ver el porqué junto a la llamada
 *    (la versión asíncrona rompía en WebKit al combinarse con la ventana
 *    deslizante). Bloquear aquí es gratis — estamos en el menú.
 */

/**
 * VENTANA DESLIZANTE. No se montan todas las filas de golpe: se montan unas
 * pocas, se dejan construir y se sustituyen por las siguientes. Así el coste de
 * memoria es constante y aun así se recorren cientos de filas.
 *
 * Es lo que hace falta porque las geometrías NO se cachean por modelo sino por
 * VARIANTE — `stack:3:2` (pila de altura 3, color 2) es una clave distinta de
 * `stack:4:1`, igual que cada ancho y fondo de dique, cada casco y cada largo
 * de tren. Montar una vuelta a las cinco terminales cubría los materiales pero
 * dejaba fuera media tabla de variantes, y el tirón reaparecía en la primera
 * pila de altura no vista.
 */
const FILAS_POR_FRAME = 6;

/**
 * Etiquetas de ficha subidas a la GPU por frame. A cuentagotas porque son ~6.6
 * MB en total: soltarlos de golpe cambiaría un tirón en partida por un tirón en
 * el briefing. Doce por frame vacía la cola de doscientas en menos de veinte
 * frames, o sea en un parpadeo del rato que se tarda en leer las instrucciones.
 */
const ETIQUETAS_POR_FRAME = 12;

/**
 * Filas recorridas por el precalentado. Generoso a propósito: el mapa se
 * regenera al empezar la partida (`startGame` → `resetRows`), así que las filas
 * que se calientan NO son las que se van a jugar. Lo que se está llenando es la
 * caché de variantes, que vive en el módulo y sobrevive a la regeneración — o
 * sea que lo que importa no es acertar el mapa, sino ver bastantes variantes
 * como para que el del jugador no traiga ninguna nueva.
 */
const HASTA = BIOME_SEQUENCE.length * BALANCE.ZONE_LENGTH * 12;

export function Warmup() {
  const gl = useThree((s) => s.gl);
  const camera = useThree((s) => s.camera);
  const scene = useThree((s) => s.scene);
  const phase = useGameStore((s) => s.phase);

  const [desde, setDesde] = useState(0);
  const group = useRef<import('three').Group>(null);
  const listo = useRef(false);

  useFrame(() => {
    if (listo.current) return;
    // Solo antes de jugar: durante la partida el hilo es del juego.
    if (phase !== 'menu' && phase !== 'briefing') return;

    // Las etiquetas de ficha se suben a la GPU aquí, a cuentagotas. Van
    // ANTES del `return` de abajo a propósito: la cola se sigue llenando
    // mientras se montan filas, así que hay que seguir vaciándola después de
    // haberlas recorrido todas (ver `subeEtiquetasPendientes` en Map.tsx).
    const pendientes = subeEtiquetasPendientes(gl, ETIQUETAS_POR_FRAME);

    if (desde >= HASTA) {
      // No se da por terminado hasta que no queda ninguna textura por subir:
      // dejarse una es dejarse un tirón en la partida.
      if (pendientes === 0) listo.current = true;
      return;
    }

    // El mapa del menú puede no llegar tan lejos todavía
    while (rows.length < desde + FILAS_POR_FRAME * 2 + 2) generateRows(BALANCE.ROWS_BATCH);

    // Se compila LA ESCENA ENTERA, no solo el grupo de filas. Medido: pasando
    // solo el grupo quedaban tres shaders sin compilar que reventaban la
    // partida — uno `points` y dos `basic`, que son las PARTÍCULAS del VFX y
    // los acentos sin luz. Esos no viven en ninguna fila: los montan <Vfx/>,
    // <Player/> y <CraneDrop/>, que cuelgan de la escena por su cuenta.
    //
    // SÍNCRONO A PROPÓSITO, no `compileAsync`. La versión asíncrona devuelve una
    // promesa que sondea `properties.get(material).currentProgram.isReady()`
    // hasta que el programa está listo; como la ventana deslizante DESMONTA las
    // filas del frame anterior, esa promesa acababa sondeando materiales ya
    // soltados y reventaba con «undefined is not an object». Se veía solo en
    // WebKit (`npm run smoke`), que es exactamente el navegador que no puede
    // fallar aquí.
    //
    // Y perder el paralelismo no cuesta nada en este sitio: el precalentado
    // corre en el menú y el briefing, que es tiempo REGALADO — bloquear un
    // instante ahí es justo lo que venimos a hacer para no bloquear en partida.
    // Si el programa ya estaba compilado, la llamada sale por la caché.
    gl.compile(scene, camera);

    setDesde((n) => n + FILAS_POR_FRAME);
  });

  // Nada que conservar en cuanto se ha jugado: los shaders están en la caché del
  // renderer y las geometrías en la de `render/boxes.ts`.
  if (phase !== 'menu' && phase !== 'briefing') return null;
  const muestra = rows.slice(desde, desde + FILAS_POR_FRAME * 2);

  return (
    // `visible={false}`: se compila pero NO se dibuja (ver cabecera).
    // `dispose={null}`: R3F no debe desmontar tirando de `dispose()` en este
    // subárbol — los materiales fusionados (`MERGED_STD`, `MERGED_GLOW`) son
    // singletons COMPARTIDOS con el juego, y disponerlos liberaría justo los
    // programas que acabamos de compilar, devolviendo los tirones.
    <group ref={group} visible={false} dispose={null}>
      {muestra.map((row) => (
        <Row key={row.index} data={row} />
      ))}
    </group>
  );
}
