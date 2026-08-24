import { PerformanceMonitor } from '@react-three/drei';
import { useThree } from '@react-three/fiber';
import { useRef } from 'react';
import { debug } from '../debug/debug';
import { DPR, QUALITY } from '../render/quality';

/**
 * GOBERNADOR DE RESOLUCIÓN — el aparato se mide y decide él.
 *
 * POR QUÉ EXISTE. El nivel gráfico se elige por lo único que el navegador
 * cuenta sin mentir antes de dibujar un frame: si es táctil y cuánto mide la
 * pantalla (ver `render/device.ts`). Eso vale para separar un teléfono de un
 * equipo de stand, y no vale para nada más — entre el móvil más flojo que se va
 * a asomar a esto y el más nuevo hay un orden de magnitud de GPU, y ninguno de
 * los dos lo dice. Adivinarlo desde aquí es exactamente lo que salió mal:
 * el nivel 'movil' se afinó contra el dibujo por software, que exagera el coste
 * de cada píxel, y acabó dibujando al 60% en teléfonos que iban sobrados. Fluido
 * y a bloques.
 *
 * La cura no es un número mejor: es dejar de poner el número aquí. Lo que sí se
 * puede saber con certeza es cuántos fps está dando ESTE aparato ahora mismo,
 * así que el nivel pone el techo y el suelo (`scale` y `minScale`) y esto
 * recorre el rango con lo medido.
 *
 * SE ARRANCA ARRIBA, en el techo. La primera decisión tarda unos segundos en
 * tomarse —hacen falta muestras— y ese hueco existe: es el BRIEFING. Mientras
 * se leen las instrucciones la escena ya se está dibujando detrás (el mapa y el
 * vuelo de presentación), así que para cuando se pulsa «A jugar» la resolución
 * ya se ha asentado. Es la misma ventana que aprovecha `Warmup` para compilar
 * los shaders, y por el mismo motivo: es el único rato en el que el jugador no
 * está mirando el reloj.
 *
 * Y NO ES EL VIEJO `<AdaptiveDpr>`, que es lo que había aquí y no hacía lo que
 * su nombre y su comentario prometían: ese sigue a `performance.current`, que
 * solo se mueve cuando alguien llama a `regress()` para avisar de que hay una
 * interacción en curso. Este juego no llama a `regress()` en ninguna parte, o
 * sea que la «red por debajo del nivel elegido» no existía: era un componente
 * montado que nunca cambiaba nada.
 */

/** Fotogramas por segundo a los que se aspira, pase lo que pase. Más no hace
 *  falta: el juego se mueve a saltos discretos de 0.2 s y por encima de 60 no se
 *  distingue, así que perseguir los 120 de un móvil de gama alta solo gastaría
 *  batería. Es una CONSTANTE y no algo medido: ver `bounds` más abajo. */
const OBJETIVO = 60;

/**
 * Banda de fps, como fracción del objetivo. Se afloja la resolución por debajo
 * del 80% —se está perdiendo uno de cada cinco fotogramas y eso ya se siente en
 * la mano—. El borde de arriba lo pide `PerformanceMonitor` para su cuenta
 * interna, pero aquí no se usa para nada: las subidas se ignoran (ver el
 * trinquete en `onDecline`).
 */
const SUBE_POR_ENCIMA = 0.95;
const BAJA_POR_DEBAJO = 0.8;

/** Cuánto se afloja de golpe, como fracción del rango. Un cuarto: del techo al
 *  suelo en cuatro escalones, o sea unos cinco segundos, que cabe en el
 *  briefing; y cada escalón es lo bastante pequeño para no saltar a la vista. */
const PASO = 0.25;

export function ResolutionGovernor() {
  const setDpr = useThree((s) => s.setDpr);
  const [suelo, techo] = DPR;
  /** Resolución aplicada ahora mismo. Solo puede bajar. */
  const actual = useRef(techo);

  // Sin rango no hay nada que gobernar: es el caso de 'ultra', 'alto' y
  // 'rapido', que corren en máquinas que se pueden mirar y ajustar a mano.
  if (suelo >= techo) return null;

  const paso = (techo - suelo) * PASO;

  return (
    <PerformanceMonitor
      /**
       * CUÁNTO TARDA EN DECIDIR. Cada decisión necesita `iterations` ventanas
       * de `ms`, y con los valores por omisión (10 × 250 ms) sale una cada
       * 2.5 s — que son diecisiete segundos para ir del techo al suelo. Medido
       * con la CPU frenada ×6: en todo el briefing no bajaba ni medio escalón,
       * o sea que el jugador entraba a la partida con la resolución sin
       * asentar y el ajuste le pasaba por encima mientras jugaba. Que es justo
       * lo que este componente viene a evitar.
       *
       * 6 × 200 ms son 1.2 s por decisión: del techo al suelo se llega en
       * cinco segundos, que cabe de sobra en lo que se tarda en leer las
       * instrucciones.
       */
      iterations={6}
      ms={200}
      /**
       * LA BANDA ES FIJA, y el argumento `refresco` que llega aquí SE IGNORA a
       * propósito.
       *
       * Se llama «refreshrate» y suena a la frecuencia del panel, pero el
       * monitor lo calcula como el MÁXIMO DE FPS QUE HA LLEGADO A MEDIR. En un
       * aparato con margen eso acaba pareciéndose al refresco real, porque
       * llega a la sincronía vertical y ahí se queda. En un aparato que NO
       * llega nunca —que es justo el que hay que proteger— el máximo medido es
       * su propia cifra mediocre, así que el listón se le baja solo hasta
       * quedar por debajo de lo que ya está dando y el gobernador se declara
       * satisfecho sin bajar nada.
       *
       * Medido sobre el build de producción con la CPU frenada ×6 y dibujo por
       * software: 35 fps sostenidos y la resolución sin moverse del techo. El
       * único caso que este componente existe para cubrir, y no lo cubría.
       */
      bounds={() => [OBJETIVO * BAJA_POR_DEBAJO, OBJETIVO * SUBE_POR_ENCIMA]}
      /**
       * TRINQUETE: solo se baja. Las subidas del monitor se ignoran, y por eso
       * aquí no hay `onIncline` ni `onChange`.
       *
       * Es la parte contraintuitiva y es la que hace que esto funcione. Un
       * gobernador que corrige en los dos sentidos entra, en cuanto el aparato
       * cae cerca de la frontera, en un vaivén: baja, con menos píxeles le
       * sobra margen, sube, vuelve a no llegar, baja. Medido con dibujo por
       * software, en una sola partida: 0.75 → 0.94 → 1.13 → 0.94. Eso en la
       * mano no se lee como «se está adaptando», se lee como una imagen que
       * respira, y molesta más que la resolución de la que se discute.
       *
       * Y el vaivén no es un fallo de ajuste, es la forma del problema: subir
       * SIEMPRE parece buena idea justo después de bajar, porque bajar es
       * precisamente lo que ha creado el margen que invita a subir.
       *
       * Con el trinquete no hay nada que perseguir. Se arranca en el techo —o
       * sea, dándole al aparato el beneficio de la duda— y cada vez que se
       * demuestra que no llega, se afloja un escalón y ahí se queda. Si pudiera
       * con el techo no habría bajado nunca, así que volver a subir es volver a
       * probar algo que ya falló.
       *
       * SE PAGA: un tramo cargado al principio deja la resolución baja el resto
       * de la partida aunque luego sobre. Se acepta a sabiendas — la partida
       * dura lo que dura, y quieto y algo más blando se juega mejor que nítido
       * y a tirones. Hacen falta seis ventanas seguidas por debajo de los 48
       * fps para que cuente, así que un tirón suelto no basta.
       */
      onDecline={({ fps }) => {
        if (actual.current <= suelo) return;
        const nuevo = Math.max(suelo, actual.current - paso);
        if (debug.enabled)
          console.log(`[gov] ${actual.current.toFixed(2)} → ${nuevo.toFixed(2)} (fps=${fps})`);
        actual.current = nuevo;
        setDpr(nuevo);
      }}
    />
  );
}

/** Nivel y rango, para el panel de medición (`?perf`) y para las pruebas */
export const RANGO_RESOLUCION = { nivel: QUALITY.name, suelo: DPR[0], techo: DPR[1] };
