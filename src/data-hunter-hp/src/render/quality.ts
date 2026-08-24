/**
 * NIVEL GRÁFICO — cuatro tuberías de dibujo distintas, no la misma con menos
 * calidad. Copiado del planteamiento de Terminal Rally (`src/quality.js` en el
 * repo de la landing), que resolvió exactamente este problema: el juego iba
 * fino en la máquina de quien lo hizo y se arrastraba en el stand.
 *
 * EL DIAGNÓSTICO, que es lo que importa. Este juego NO es pesado de geometría:
 * medido con `scripts/gpu-profile.ts` son 660–970 llamadas de dibujo y 55–80k
 * triángulos por frame, con la geometría ya fusionada por material
 * (`render/boxes.ts`). En una GPU decente eso da 400 fps. Lo que se arrastra en
 * una gráfica integrada es el trabajo POR PÍXEL, y aquí había mucho:
 *
 *   dpr hasta 2 (4× los píxeles en una pantalla retina)
 *   × un render target multimuestreado a 4
 *   × CINCO pasadas a pantalla completa SIEMPRE encendidas
 *     (bloom con mipmaps, aberración cromática, scanline, viñeta)
 *
 * Y las tres últimas corrían igual cuando no pasaba nada: la aberración y el
 * scanline se quedaban con la opacidad a 0, pero la pasada se pagaba entera de
 * todos modos. Eso es lo caro, por este orden:
 *
 *  1. Las pasadas de postproceso a pantalla completa. Cada una vuelve a tocar
 *     todos los píxeles. Por eso en 'alto' no hay cadena de efectos: el mapeo
 *     filmico lo hace el propio renderer (ACES), que sale gratis.
 *  2. La resolución. Es CUADRÁTICA: dibujar al 75% es la mitad de píxeles.
 *  3. La sombra: la pasada de mapa (redibuja la escena entera otra vez) y,
 *     sobre todo, cuántas muestras se leen por píxel — PCF suave lee cuatro
 *     veces más que PCF normal.
 *
 * Se fuerza con `?q=ultra|alto|rapido|movil`. Por defecto 'alto' incluso en
 * máquinas grandes: el número de núcleos no dice NADA de la GPU, y el caso real
 * que hay que cubrir es justo ese, un equipo con muchos hilos y gráfica
 * integrada. En un TELÉFONO el defecto es 'movil' (ver `render/device.ts`).
 */
import * as THREE from 'three';
import { PHONE, TOUCH } from './device';

export interface QualityLevel {
  name: 'ultra' | 'alto' | 'rapido' | 'movil';
  /** Factor de resolución de dibujo (la página estira el resultado) */
  scale: number;
  /**
   * SUELO al que el gobernador de resolución puede bajar el dibujo si los fps
   * se caen (ver `components/ResolutionGovernor.tsx`). Si no se dice, es
   * `scale`: rango de un punto, o sea sin gobernador — el nivel dibuja a su
   * resolución y punto.
   *
   * Solo lo baja 'movil', y por un motivo concreto: los otros tres niveles
   * corren en máquinas que se pueden mirar (el stand, un portátil conocido) y
   * si van mal se les cambia el nivel a mano con `?q=`. Un teléfono ajeno no se
   * puede mirar ni se le puede pedir a nadie que escriba un parámetro en la
   * barra de direcciones, y el abanico de GPU que hay ahí fuera es enorme —
   * entre el móvil más flojo del stand y el más nuevo hay un orden de magnitud.
   * Adivinar eso desde aquí es justo lo que salió mal la primera vez; ahí lo
   * que hace falta no es un número mío sino que el aparato se mida.
   */
  minScale?: number;
  /** Tope de densidad de píxeles, antes de aplicar `scale` */
  maxDpr: number;
  /** ¿Cadena de postproceso? Si no, el canvas dibuja directo a pantalla */
  fx: boolean;
  /** Multimuestreo del render target del composer (solo si `fx`) */
  multisampling: number;
  /** MSAA del propio contexto WebGL (solo tiene sentido si NO hay composer) */
  msaa: boolean;
  /** Bloom selectivo sobre los emisivos (tarjetas, balizas) */
  bloom: boolean;
  shadows: boolean;
  /** PCF suave (4× muestras) frente a PCF normal */
  softShadows: boolean;
  shadowMap: number;
  /** Techo de filas dibujadas: recorta la ventana que calcula `viewRowsFor` */
  maxRows: number;
  /**
   * EXPOSICIÓN del mapeo filmico. Compensa la luz que aportaba el bloom: el
   * halo no solo rodeaba los emisivos, también levantaba el conjunto de la
   * escena, así que al quitar la cadena de efectos el juego se veía apagado.
   * Subir la exposición devuelve ese brillo y es GRATIS — el mapeo de tonos ya
   * se estaba aplicando de todos modos, solo cambia la constante.
   */
  exposure: number;
}

export const LEVELS: Record<QualityLevel['name'], QualityLevel> = {
  // Todo encendido. Es lo que había antes para TODO el mundo.
  ultra: {
    name: 'ultra',
    scale: 1,
    maxDpr: 1.5,
    fx: true,
    multisampling: 4,
    msaa: false,
    bloom: true,
    shadows: true,
    softShadows: true,
    shadowMap: 2048,
    maxRows: 44,
    exposure: 1,
  },
  // POR DEFECTO. Se va la cadena entera de postproceso — que es la palanca
  // grande — y el suavizado lo hace el MSAA del contexto, que en una escena de
  // cajas de colores planos es justo lo que hace falta y cuesta una fracción.
  //
  // Las tarjetas siguen leyéndose de lejos sin bloom porque su material va con
  // `toneMapped: false`: el neón sale a color pleno igual, lo que se pierde es
  // el halo alrededor. El acuse de recibo del golpe tampoco desaparece: queda
  // el flash rojo del HUD y el temblor de cámara, que son los que de verdad
  // avisan.
  alto: {
    name: 'alto',
    scale: 1,
    // DENSIDAD REAL DE LA PANTALLA. Bajarla a 1 era gratis en el stand (donde
    // devicePixelRatio ya es 1) y solo servía para que el juego se viera
    // pixelado en una pantalla retina. Está medido: en el banco por software,
    // 'ultra' y 'alto' dibujaban los MISMOS 1.44 Mpx a dpr 1, y aun así 'alto'
    // iba 3× más rápido — o sea que la ganancia entera venía de quitar las
    // pasadas a pantalla completa, no de recortar resolución. Recortarla
    // también era cobrar dos veces por el mismo arreglo.
    maxDpr: 2,
    fx: false,
    multisampling: 0,
    msaa: true,
    bloom: false,
    shadows: true,
    softShadows: false,
    shadowMap: 1024,
    maxRows: 30,
    exposure: 1.42,
  },
  // La palanca más bruta: dibuja al 75% (la mitad de píxeles) y sin sombras,
  // que quita una pasada de escena entera. Para tablets, equipos táctiles y
  // cualquier máquina de cuatro hilos o menos.
  //
  // `maxRows` subió de 22 a 30, el mismo techo que 'alto'. Con 22, una tableta
  // de 820×1080 —que es táctil, o sea que cae aquí— dibujaba 16 filas por
  // delante donde la cámara alcanza 16.7 y 9 por detrás donde alcanza 12: el
  // hueco del mapa se veía en las dos direcciones. Lo destapó
  // `scripts/viewport-test.ts` al empezar a comprobar la ventana ya recortada.
  // Sale barato porque este nivel no tiene sombras: una fila de más es una
  // pasada de más, no dos.
  rapido: {
    name: 'rapido',
    scale: 0.75,
    maxDpr: 1,
    fx: false,
    multisampling: 0,
    msaa: false,
    bloom: false,
    shadows: false,
    softShadows: false,
    shadowMap: 512,
    maxRows: 30,
    exposure: 1.32,
  },
  /**
   * TELÉFONO.
   *
   * PRIMERA VERSIÓN, Y ESTABA MAL: dibujaba al 60% sin suavizado. Iba fluido y
   * se veía a bloques — «muy pixeleado para un juego de este calibre», que es
   * exactamente lo que era. El error no fue el número sino de dónde salió: lo
   * afiné contra el dibujo POR SOFTWARE (`scripts/mobile-bench.ts`), que gasta
   * CPU por píxel y por tanto castiga la resolución muchísimo más de lo que la
   * castiga una GPU de teléfono de verdad. Optimizar contra un modelo que
   * exagera el coste lleva a pagar en calidad algo que no hacía falta pagar.
   *
   * Lo que se ve, mirado a la densidad real de un móvil con
   * `scripts/sharpness-shot.ts` (que era la herramienta que faltaba: la nitidez
   * no se juzga en una tabla de fps, se juzga mirándola):
   *
   *   0.6 sin MSAA  cantos escalonados y el corrugado del contenedor perdido
   *   1.0 con MSAA  cantos limpios; el salto grande está aquí
   *   1.5 con MSAA  además vuelve el detalle fino de las cajas
   *
   * Y EL SUAVIZADO ES LA MITAD DE LA HISTORIA. Esta escena es de cajas de
   * color plano vistas en diagonal: casi todo lo que se dibuja es un canto
   * inclinado, o sea el peor caso posible para el escalonado. Subir resolución
   * cuesta al cuadrado; encender el MSAA del contexto cuesta una fracción de
   * eso —y en una GPU de móvil, que dibuja por baldosas, se resuelve dentro de
   * la baldosa sin volver a memoria—, y aquí no hay cadena de postproceso que
   * lo desperdicie (mismo razonamiento que en 'alto').
   *
   * `maxDpr` 1.5, no 3. La densidad real de un teléfono son NUEVE veces los
   * píxeles de la página y ahí ya no se ve la diferencia con la mano.
   *
   * Y el número de arriba es solo el TECHO: quien decide de verdad es el
   * aparato, midiéndose (`components/ResolutionGovernor.tsx`). Por eso este
   * nivel es el único con `minScale`.
   */
  movil: {
    name: 'movil',
    scale: 1,
    // Suelo al que puede bajar el gobernador si el teléfono no da. 0.75 y no
    // menos: por debajo se vuelve a ver el escalonado que se acaba de quitar, y
    // un juego borroso tampoco es la respuesta. Si ni con eso llega, más vale
    // que se note y se le pase `?q=rapido`.
    minScale: 0.75,
    maxDpr: 1.5,
    fx: false,
    multisampling: 0,
    msaa: true,
    bloom: false,
    shadows: false,
    softShadows: false,
    shadowMap: 512,
    maxRows: 34,
    exposure: 1.32,
  },
};

/**
 * Detección barata. No hay forma fiable de saber qué GPU hay antes de crear el
 * contexto, así que se mira lo único que el navegador cuenta sin mentir
 * (núcleos y si es táctil) y se tira por lo conservador. `ultra` se pide a mano.
 */
function autoLevel(): QualityLevel['name'] {
  if (typeof navigator === 'undefined') return 'alto';
  // El teléfono se separa del resto de lo táctil: una tableta o un portátil
  // táctil tienen pantalla y GPU de sobra (ver `render/device.ts`).
  if (PHONE) return 'movil';
  const cores = navigator.hardwareConcurrency || 4;
  if (TOUCH || cores <= 4) return 'rapido';
  return 'alto';
}

function askedLevel(): QualityLevel['name'] | null {
  if (typeof window === 'undefined') return null;
  const q = new URLSearchParams(window.location.search).get('q');
  return q === 'ultra' || q === 'alto' || q === 'rapido' || q === 'movil' ? q : null;
}

/**
 * PALANCAS SUELTAS por URL: `?escala=1.5`, `?msaa=0|1` y `?sombras=0|1`.
 *
 * No son para jugar, son para AJUSTAR. La calidad de imagen en un teléfono no
 * se puede decidir desde un banco de fps —hay que mirarla— y no se puede mirar
 * sin poder pedirle al mismo aparato el mismo instante del mapa con dos ajustes
 * distintos. Eso es lo que hace `scripts/sharpness-shot.ts`, y esto es lo que
 * se lo permite. Van encima del nivel elegido y no cambian nada si no se piden.
 */
function palancas(nivel: QualityLevel): QualityLevel {
  if (typeof window === 'undefined') return nivel;
  const q = new URLSearchParams(window.location.search);
  const escala = Number(q.get('escala'));
  const msaa = q.get('msaa');
  const sombras = q.get('sombras');
  if (!Number.isFinite(escala) && msaa === null && sombras === null) return nivel;
  // `?escala=N` quiere decir, literalmente, «dibuja a N veces el tamaño de la
  // página». Eso es UNA cifra, así que se pone en `maxDpr` y `scale` se deja a
  // 1: repartirla entre las dos las multiplicaría (escala 1.5 salía a 2.25).
  return {
    ...nivel,
    scale: escala > 0 ? 1 : nivel.scale,
    // Pedir escala a mano desactiva el suelo automático: si se está mirando una
    // resolución concreta, que nada la mueva por detrás.
    minScale: escala > 0 ? escala : nivel.minScale,
    maxDpr: escala > 0 ? escala : nivel.maxDpr,
    msaa: msaa === null ? nivel.msaa : msaa !== '0',
    shadows: sombras === null ? nivel.shadows : sombras !== '0',
  };
}

export const QUALITY: QualityLevel = palancas(LEVELS[askedLevel() ?? autoLevel()]);

/**
 * Rango de dpr para el <Canvas>. three dibuja a ese factor y el navegador
 * estira el resultado al tamaño de la página. Es `[mínimo, máximo]`: se arranca
 * en el máximo y `<AdaptiveDpr>` puede bajar hasta el mínimo si caen los fps.
 *
 * OJO CON EL ORDEN DE LAS DOS PALANCAS, que aquí estaba mal y justo donde más
 * dolía. Antes el techo era `min(maxDpr, scale × densidadDePantalla)`, o sea
 * que `scale` competía CONTRA `maxDpr` en vez de aplicarse después:
 *
 *   teléfono (densidad 3) en 'rapido' → min(1, 0.75 × 3) = min(1, 2.25) = 1
 *
 * ...que es dibujar al 100% del tamaño de la página. El 75% que dice el nivel
 * no se aplicaba NUNCA en un teléfono ni en una pantalla retina: el recorte se
 * lo comía entero el tope de densidad, y la única máquina donde funcionaba era
 * la del stand, que ya va a densidad 1 y no lo necesitaba.
 *
 * Son dos preguntas distintas y se responden por separado:
 *
 *  1. `maxDpr` — ¿a cuántos píxeles físicos por píxel de página como mucho?
 *     Recorta la densidad de la PANTALLA (2 en retina, 3 en un móvil).
 *  2. `scale` — ¿y de ese tamaño, qué fracción se dibuja de verdad?
 *     Se aplica ENCIMA del resultado anterior, no en su lugar.
 *
 * El suelo del rango es `minScale`, que solo baja en 'movil': es hasta dónde
 * puede aflojar `<AdaptiveDpr>` si el aparato no da. En los demás niveles vale
 * lo mismo que `scale` y el rango se queda en un punto, o sea sin red.
 */
const DENSIDAD = Math.min(
  QUALITY.maxDpr,
  typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1,
);
export const DPR: [number, number] = [QUALITY.minScale ?? QUALITY.scale, QUALITY.scale * DENSIDAD];

/** Tipo de mapa de sombras: PCF suave lee 4× más muestras por píxel */
export const SHADOW_TYPE = QUALITY.softShadows ? THREE.PCFSoftShadowMap : THREE.PCFShadowMap;

/** ¿Se pidió el panel de medición? (`?perf`) */
export const PERF_PANEL =
  typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('perf');
