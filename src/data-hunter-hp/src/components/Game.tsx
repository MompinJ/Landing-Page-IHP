import { AdaptiveDpr, useTexture } from '@react-three/drei';
import { Canvas } from '@react-three/fiber';
import { Suspense } from 'react';
import { TEX_CONTAINER } from '../data/assets';
import { PALETTE } from '../data/palette';
import { useGamepadControls } from '../hooks/useGamepadControls';
import { useKeyboardControls } from '../hooks/useKeyboardControls';
import { Atmosphere } from './Atmosphere';
import { AttractMode } from './AttractMode';
import { CameraRig } from './CameraRig';
import { CraneDrop } from './CraneDrop';
import { DebugHitboxes } from './DebugHitboxes';
import { Drone } from './Drone';
import { Effects } from './Effects';
import { GameLoop } from './GameLoop';
import { Map } from './Map';
import { Player } from './Player';
import { Vfx } from './Vfx';

// PRECARGA de las texturas del juego: si una se carga en caliente al entrar en
// cuadro, el <Suspense> oculta el mapa un instante → "parpadeos negros".
// Ya solo queda el contenedor: las caras de las tarjetas se dibujan en canvas y
// los arcos de bioma perdieron su banner (el nombre de la terminal lo dice el
// sello del pasaporte). Los PNG `gate-*.png` siguen en public/textures por si
// se quieren recuperar, pero nadie los usa.
useTexture.preload(TEX_CONTAINER);

/**
 * Raíz de la escena 3D. Mecánica Crossy Road: el jugador salta por casillas
 * y la cámara ortográfica lo sigue (el mundo NO se desplaza solo).
 */
export function Game() {
  useKeyboardControls();
  useGamepadControls();

  return (
    // `antialias: false` a propósito: la escena NO se pinta en el buffer del
    // canvas sino en el render target del EffectComposer (ver Effects.tsx), así
    // que el MSAA del contexto se asignaba y no se usaba. El suavizado real lo
    // aplica el composer con su propio multisampling.
    <Canvas
      shadows
      dpr={[1, 2]}
      gl={{ powerPreference: 'high-performance', antialias: false }}
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
      {/* Los dos castigos del que se queda atrás (ver world/snatch.ts): el dron
          de seguridad y la grúa que le suelta el contenedor encima. */}
      <Drone />
      <Suspense fallback={null}>
        <CraneDrop />
      </Suspense>
      {/* Visor de hitboxes: apagado salvo ?debug + tecla H */}
      <DebugHitboxes />

      {/* Pipeline compositivo: bloom selectivo + aberración cromática y
          glitch digital reactivos al daño (ver Effects.tsx) */}
      <Effects />

      <AdaptiveDpr pixelated />
    </Canvas>
  );
}
