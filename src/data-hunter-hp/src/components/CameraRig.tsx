import { OrthographicCamera } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { CAM_LOOK_AHEAD, camZoomFor } from '../data/balance';
import { debug } from '../debug/debug';
import { QUALITY } from '../render/quality';
import { runtime } from '../store/runtime';
import { attractState } from './AttractMode';

/**
 * Cámara ortográfica estilo Crossy Road (tutorial: "Following the Player" —
 * cámara y luz direccional van pegadas al jugador). En lugar de parentar al
 * mesh, se copia la posición animada del runtime cada frame: mismo efecto,
 * pero sin heredar la rotación del personaje. El screen shake por impacto se
 * suma como ruido amortiguado.
 */
const CAM_OFFSET = new THREE.Vector3(5.2, 9.2, 6.4);
const LIGHT_OFFSET = new THREE.Vector3(-5, 11, 4);

/**
 * Volumen de vista. En una cámara ORTOGRÁFICA el plano `near` puede ser
 * NEGATIVO: el frustum es un prisma, no una pirámide, así que `near` no es una
 * distancia mínima sino el borde del prisma medido desde el plano de la cámara.
 *
 * Con `near = 0.1` toda la geometría que sobresalía POR DETRÁS de ese plano se
 * cortaba a media cara (triángulos sueltos, torres decapitadas): las grúas
 * miden 4-11 m de alto y la cámara vuela a y=9.2, así que en cuanto el jugador
 * se acerca a un pórtico (o lo deja atrás) su parte alta cruza el plano. Medido
 * con scripts/clip-check.ts: hasta 19 mallas en pantalla con profundidad de
 * hasta -11.3 en una ventana de 1600×900 (peor cuanto mayor la resolución).
 *
 * `near` negativo mete el prisma entero por detrás de la cámara y el recorte
 * desaparece; el orden de profundidad no cambia (sigue siendo lineal) y no hay
 * coste de render. `far` amplio evita además que el plano de océano (que llega
 * a ~133 de profundidad) se corte en el horizonte.
 */
const CAM_NEAR = -50;
const CAM_FAR = 200;

/* --------------------------------------------------------------- sombras */

/**
 * Ajustes del mapa de sombras. Los tres van juntos y cada uno arregla un fallo
 * distinto que se veía en pantalla:
 *
 *  - `SHADOW_HALF` (media caja) + `SHADOW_MAP`: 24 unidades repartidas en 1024
 *    téxeles → ~43 téxeles por unidad de mundo, de sobra para sombras suaves de
 *    cajas. La caja se ciñe a lo que alcanza la cámara (±11.4 en X).
 *
 *  - `SHADOW_NEAR`/`SHADOW_FAR`: por omisión three usa 0.5 y 500. Repartir la
 *    precisión del buffer de profundidad sobre 500 unidades cuando la escena
 *    cabe en 30 es lo que producía el moteado sobre las caras: dos superficies
 *    a distinta profundidad caían en el mismo valor cuantizado.
 *
 *  - `SHADOW_NORMAL_BIAS` en vez de `bias` negativo. Un `bias` negativo empuja
 *    la comparación en PROFUNDIDAD, y eso despega la sombra de la base del
 *    objeto (peter-panning): se veía suelo iluminado entre el contenedor y su
 *    propia sombra. `normalBias` desplaza el punto de muestreo a lo largo de la
 *    NORMAL de la superficie, que quita el acné sin mover la sombra de sitio.
 */
// Resolución del mapa de sombras: la marca el nivel gráfico (2048 en 'ultra',
// 1024 por defecto, 512 en 'rapido'). `TEXEL` se deriva de ella, así que el
// anclaje a la rejilla de téxeles sigue siendo correcto en los tres niveles.
const SHADOW_MAP = QUALITY.shadowMap;
const SHADOW_HALF = 12;
const SHADOW_NEAR = 1;
const SHADOW_FAR = 34;
const SHADOW_NORMAL_BIAS = 0.04;

/**
 * ANCLAJE A TÉXEL. La luz sigue al jugador, así que la cámara de sombra se
 * desplaza cada frame; si lo hace en fracciones de téxel, el borde de cada
 * sombra se recalcula distinto en cada fotograma y las siluetas "hierven"
 * (shadow crawling), sobre todo durante el salto.
 *
 * La cura estándar es mover esa cámara SOLO en múltiplos exactos de un téxel.
 * Como el desplazamiento luz→objetivo es constante, la base de la cámara de
 * sombra también lo es y se puede precalcular: basta con redondear el centro en
 * los dos ejes del plano de la luz.
 */
const TEXEL = (SHADOW_HALF * 2) / SHADOW_MAP;
const LIGHT_DIR = LIGHT_OFFSET.clone().normalize();
const LIGHT_RIGHT = new THREE.Vector3(0, 1, 0).cross(LIGHT_DIR).normalize();
const LIGHT_UP = LIGHT_DIR.clone().cross(LIGHT_RIGHT).normalize();

function snapToShadowTexel(x: number, z: number, out: THREE.Vector3) {
  out.set(x, 0, z);
  const alongRight = Math.round(out.dot(LIGHT_RIGHT) / TEXEL) * TEXEL;
  const alongUp = Math.round(out.dot(LIGHT_UP) / TEXEL) * TEXEL;
  const alongDir = out.dot(LIGHT_DIR); // esta componente no afecta a la rejilla
  out.set(0, 0, 0)
    .addScaledVector(LIGHT_RIGHT, alongRight)
    .addScaledVector(LIGHT_UP, alongUp)
    .addScaledVector(LIGHT_DIR, alongDir);
}

export function CameraRig() {
  const camera = useRef<THREE.OrthographicCamera>(null);
  /**
   * ENCUADRE SEGÚN LA PANTALLA. El zoom era una constante (58) y en un teléfono
   * eso dejaba seis casillas a lo ancho: no se veía a dónde esquivar. Ahora sale
   * del tamaño de la ventana (ver `camZoomFor` en `data/balance.ts`, que es
   * donde vive porque `viewRowsFor` necesita el MISMO zoom para saber cuántas
   * filas dibujar). Lo que NO cambia con la pantalla es dónde queda el
   * personaje: siempre en el centro.
   *
   * Se recalcula solo al cambiar el tamaño —girar el teléfono, rotar la
   * pantalla del stand—, no cada frame: `useThree(s => s.size)` ya reacciona al
   * redimensionado y `useMemo` evita rehacer la cuenta 60 veces por segundo.
   */
  const size = useThree((s) => s.size);
  const zoom = useMemo(() => camZoomFor(size.width, size.height), [size.width, size.height]);
  const light = useRef<THREE.DirectionalLight>(null);
  const lookTarget = useRef(new THREE.Vector3());
  const shadowCenter = useRef(new THREE.Vector3());
  const shakeSeed = useRef(0);

  useFrame((state, dt) => {
    const cam = camera.current;
    if (!cam) return;
    if (debug.enabled) {
      const dh = (window as unknown as { __DH?: Record<string, unknown> }).__DH;
      if (dh) { dh.scene = state.scene; dh.camera = cam; dh.gl = state.gl; }
    }
    if (attractState.active) return; // el vuelo cinematico manda

    const px = runtime.x;
    const pz = runtime.z;

    // Cámara libre de depuración (?debug + tecla C): órbita/zoom para revisar
    // los modelos de cerca. En producción nunca se activa.
    if (debug.enabled && debug.freeCam) {
      const r = 12;
      cam.zoom = debug.zoom;
      cam.position.set(px + Math.cos(debug.yaw) * r, debug.height, pz + Math.sin(debug.yaw) * r);
      cam.updateProjectionMatrix();
      lookTarget.current.set(px, 1.2, pz);
      cam.lookAt(lookTarget.current);
      return;
    }
    if (cam.zoom !== zoom) {
      cam.zoom = zoom;
      cam.updateProjectionMatrix();
    }

    cam.position.set(px + CAM_OFFSET.x, CAM_OFFSET.y, pz + CAM_OFFSET.z);
    // AL JUGADOR: en una cámara ortográfica el punto de mira es el centro exacto
    // del cuadro, así que mirarle a él es lo que lo centra (ver CAM_LOOK_AHEAD).
    lookTarget.current.set(px, 0.4, pz - CAM_LOOK_AHEAD);

    if (runtime.shakeTimer > 0) {
      runtime.shakeTimer = Math.max(0, runtime.shakeTimer - dt);
      shakeSeed.current += dt * 55;
      const amp = 0.2 * runtime.shakeTimer;
      cam.position.x += Math.sin(shakeSeed.current * 1.7) * amp;
      cam.position.y += Math.cos(shakeSeed.current * 2.3) * amp;
    }

    cam.lookAt(lookTarget.current);

    // La luz (y su target) siguen al jugador para que las sombras no se
    // queden atrás (tutorial: dirLight.target = player), pero ANCLADAS a la
    // rejilla de téxeles del mapa de sombras: ver `snapToShadowTexel`.
    const l = light.current;
    if (l) {
      snapToShadowTexel(px, pz, shadowCenter.current);
      l.position.set(
        shadowCenter.current.x + LIGHT_OFFSET.x,
        LIGHT_OFFSET.y,
        shadowCenter.current.z + LIGHT_OFFSET.z,
      );
      l.target.position.set(shadowCenter.current.x, 0, shadowCenter.current.z);
      l.target.updateMatrixWorld();
    }
  });

  return (
    <>
      <OrthographicCamera ref={camera} makeDefault zoom={zoom} near={CAM_NEAR} far={CAM_FAR} />
      {/* Ver el bloque de constantes de sombra arriba: cada ajuste corrige un
          artefacto concreto (moteado, sombra despegada, siluetas que hierven). */}
      <directionalLight
        ref={light}
        intensity={1.5}
        castShadow
        shadow-mapSize={[SHADOW_MAP, SHADOW_MAP]}
        shadow-camera-left={-SHADOW_HALF}
        shadow-camera-right={SHADOW_HALF}
        shadow-camera-top={SHADOW_HALF}
        shadow-camera-bottom={-SHADOW_HALF}
        shadow-camera-near={SHADOW_NEAR}
        shadow-camera-far={SHADOW_FAR}
        shadow-normalBias={SHADOW_NORMAL_BIAS}
      />
    </>
  );
}
