import { useTexture } from '@react-three/drei';
import { Canvas } from '@react-three/fiber';
import { lazy, Suspense } from 'react';
import { TEX_CONTAINER } from '../data/assets';
import { PALETTE } from '../data/palette';
import { useGamepadControls } from '../hooks/useGamepadControls';
import { useKeyboardControls } from '../hooks/useKeyboardControls';
import { useTouchControls } from '../hooks/useTouchControls';
import { DPR, QUALITY, SHADOW_TYPE } from '../render/quality';
import { Atmosphere } from './Atmosphere';
import { AttractMode } from './AttractMode';
import { CameraRig } from './CameraRig';
import { CraneDrop } from './CraneDrop';
import { DebugHitboxes } from './DebugHitboxes';
import { GameLoop } from './GameLoop';
import { Map } from './Map';
import { FpsMeter, Perf } from './Perf';
import { Player } from './Player';
import { ResolutionGovernor } from './ResolutionGovernor';
import { ShaderAnchor } from './ShaderAnchor';
import { Vfx } from './Vfx';
import { Warmup } from './Warmup';

// PRECARGA de las texturas del juego: si una se carga en caliente al entrar en
// cuadro, el <Suspense> oculta el mapa un instante → "parpadeos negros".
// Ya solo queda el contenedor: las caras de las tarjetas se dibujan en canvas y
// los arcos de bioma perdieron su banner (el nombre de la terminal lo dice el
// sello del pasaporte). Los PNG `gate-*.png` siguen en public/textures por si
// se quieren recuperar, pero nadie los usa.
useTexture.preload(TEX_CONTAINER);

/**
 * CADENA DE POSTPROCESO en diferido. Solo la usa el nivel 'ultra', así que
 * cargarla con el resto metía `postprocessing` entero (~medio mega) en el
 * paquete principal para todo el mundo. Con el import dinámico, quien juega en
 * 'alto' o 'rapido' no la descarga nunca.
 */
const FxChain = lazy(() => import('./Effects'));

/**
 * Raíz de la escena 3D. Mecánica Crossy Road: el jugador salta por casillas
 * y la cámara ortográfica lo sigue (el mundo NO se desplaza solo).
 */
export function Game() {
  useKeyboardControls();
  useGamepadControls();
  // Deslizar y tocar. Se registra SIEMPRE, no solo en táctiles: `pointer*`
  // unifica dedo y ratón, así que un portátil con pantalla táctil o un monitor
  // táctil del stand funcionan sin tener que acertar la detección — y si la
  // detección fallara, el que se queda sin controles es justo el que no tiene
  // teclado. Lo que decide la detección es qué se DIBUJA (ver `render/device.ts`).
  useTouchControls();

  return (
    // EL DIBUJO VA POR NIVELES (ver `render/quality.ts`, `?q=` para forzarlo).
    // Aquí se decide lo que más cuesta en una gráfica integrada:
    //
    //  - `dpr`: la resolución es cuadrática. Antes iba a [1, 2] para todos, o
    //    sea 4× los píxeles en una pantalla retina. Aquí solo se declara el
    //    RANGO; dentro de él, en un teléfono, quien elige es el propio aparato
    //    midiéndose (ver `<ResolutionGovernor>` abajo).
    //  - `antialias`: solo tiene sentido SIN composer. Con cadena de efectos la
    //    escena no se pinta en el buffer del canvas sino en el render target
    //    del EffectComposer, así que el MSAA del contexto se asignaba y no se
    //    usaba; sin cadena, es el suavizado bueno y barato para una escena de
    //    cajas de colores planos.
    //  - `shadows`: PCF suave lee cuatro veces más muestras por píxel que PCF
    //    normal, y en 'rapido' no hay sombra en absoluto (una pasada menos de
    //    escena entera).
    <Canvas
      shadows={QUALITY.shadows ? { type: SHADOW_TYPE } : false}
      dpr={DPR}
      gl={{
        powerPreference: 'high-performance',
        antialias: QUALITY.msaa,
        // Sin bloom la escena se veía apagada: el halo no solo rodeaba los
        // emisivos, levantaba el conjunto. Se devuelve por exposición, que es
        // gratis (el mapeo filmico ya se aplicaba igual).
        toneMappingExposure: QUALITY.exposure,
      }}
      style={{ position: 'absolute', inset: 0 }}
    >
      {/* Atmósfera de niebla marina nocturna: el horizonte se funde con el
          océano en vez de cortar a negro (identidad nocturna-industrial) */}
      <color attach="background" args={['#0a2740']} />
      <fogExp2 attach="fog" args={['#0a2740', 0.016]} />

      <ambientLight intensity={0.6} color={PALETTE.white} />
      <hemisphereLight args={[PALETTE.cyan, PALETTE.hpNavy, 0.25]} />

      <CameraRig />
      <GameLoop />
      <Atmosphere />
      <AttractMode />
      <Suspense fallback={null}>
        <Map />
      </Suspense>
      <Vfx />
      <Player />
      {/* El castigo del que se queda atrás (ver world/snatch.ts): la grúa
          pórtico que le suelta el contenedor encima. */}
      <Suspense fallback={null}>
        <CraneDrop />
      </Suspense>
      {/* Visor de hitboxes: apagado salvo ?debug + tecla H */}
      <DebugHitboxes />

      {/* Pipeline compositivo: bloom selectivo + aberración cromática y glitch
          digital reactivos al daño. Solo en 'ultra' (ver Effects.tsx): son
          cuatro pasadas a pantalla completa por frame y es, de largo, lo más
          caro del juego en una gráfica integrada. */}
      {QUALITY.fx && (
        <Suspense fallback={null}>
          <FxChain />
        </Suspense>
      )}

      {/* PRECALENTADO DE SHADERS mientras se lee el briefing: es lo que quita
          los congelones de 40-76 ms que daba compilar un material nuevo en
          mitad de la partida (ver Warmup.tsx). No cuesta calidad. */}
      <Warmup />

      {/* ...y esto es lo que impide que se DES-compilen. three borra un programa
          cuando se descarta el último material que lo usaba, y al pasar de una
          terminal a otra eso ocurre: el programa se borra y hay que enlazarlo
          otra vez en mitad de la partida (ver ShaderAnchor.tsx). */}
      <ShaderAnchor />

      {/* Contador de fps, siempre a la vista. Se oculta con la tecla F, o de
          entrada con `?fps=off` para el kiosco del stand. */}
      <FpsMeter />

      {/* Panel de medición (`?perf`): fps, reparto js/dibujo y EL NOMBRE DE LA
          GPU — lo primero que hay que mirar si el juego va lento. */}
      <Perf />

      {/* EL APARATO SE MIDE Y DECIDE su resolución dentro del rango del nivel
          (ver ResolutionGovernor.tsx). Sustituye a `<AdaptiveDpr>`, que estaba
          aquí y no hacía nada: ese sigue a `performance.current`, que solo se
          mueve si alguien llama a `regress()`, y este juego no lo llama en
          ninguna parte. Solo tiene rango que recorrer el nivel 'movil' — en el
          resto de niveles no se monta. */}
      <ResolutionGovernor />
    </Canvas>
  );
}
