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
   * SUELO al que `<AdaptiveDpr>` puede bajar la resolución si los fps se caen,
   * como fracción del tamaño de la página. Si no se dice, es `scale`: o sea,
   * sin red — el nivel dibuja siempre a su resolución y punto.
   *
   * Solo lo baja 'movil', y por un motivo concreto: los otros tres niveles
   * corren en máquinas que se pueden mirar (el stand, un portátil conocido) y
   * si van mal se les cambia el nivel a mano con `?q=`. Un teléfono ajeno no se
   * puede mirar ni se le puede pedir a nadie que escriba un parámetro en la
   * barra de direcciones, y el abanico de GPU que hay ahí fuera es enorme. Ahí
   * la red no sobra: si el aparato no da, que se vea más blando pero que se
   * siga jugando.
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
   * TELÉFONO. Es 'rapido' apretado una vuelta más, y cada vuelta está medida
   * contra el dibujo por software (`scripts/mobile-bench.ts`), que es el peor
   * caso real y el mejor sustituto que hay de una GPU de móvil:
   *
   *  - `scale` 0.6 en vez de 0.75. La resolución es CUADRÁTICA: 0.6² es un
   *    36% de los píxeles de la pantalla contra el 56% de 'rapido'. En un
   *    juego de cajas de colores planos vistas a 35 de zoom no hay detalle fino
   *    que perder, y es de largo la palanca más barata que queda.
   *  - `maxDpr` 1. En un teléfono `devicePixelRatio` es 3: dibujar a la
   *    densidad real serían NUEVE veces los píxeles. Nadie mira un móvil con
   *    lupa mientras corre.
   *
   * Y UNA QUE NO SE APRIETA, a propósito: `maxRows` sube a 34, más que en
   * ningún otro nivel. Parece al revés y no lo es. En un teléfono la cámara se
   * ALEJA para que quepan las columnas (`camZoomFor`), y alejarse mete más
   * mundo en cuadro: a 390×664 la cámara alcanza 20 filas por delante y 13 por
   * detrás. Con el techo en 22 —el de 'rapido'— el recorte dejaba 16 por
   * delante y el jugador veía el azul del océano en el hueco del mapa, que es
   * peor fallo que cualquier fps. El ahorro de un teléfono no está en dibujar
   * menos mundo sino en dibujar menos PÍXELES, que es lo que hacen las dos
   * palancas de arriba: 34 filas al 36% de resolución cuestan mucho menos que
   * 22 al 100%.
   */
  movil: {
    name: 'movil',
    scale: 0.6,
    // Hasta el 42% si hace falta. Es lo que se ve cuando el teléfono no da: en
    // un juego de cajas de colores planos eso se lee como bordes más blandos,
    // no como un juego roto — y es justo la razón de que `<AdaptiveDpr>` vaya
    // SIN `pixelated` (ver Game.tsx), que convertía lo blando en cuadrotes.
    minScale: 0.42,
    maxDpr: 1,
    fx: false,
    multisampling: 0,
    msaa: false,
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

export const QUALITY: QualityLevel = LEVELS[askedLevel() ?? autoLevel()];

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
