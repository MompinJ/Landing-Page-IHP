import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import * as THREE from 'three';
import { PALETTE } from '../data/palette';
import { runtime } from '../store/runtime';
import { useGameStore } from '../store/useGameStore';
import { updatePlayer } from '../world/playerLogic';
import { standHeight } from '../world/rows';
import { checkHits, updateConveyor, updateWaterRiding } from '../world/traffic';

/**
 * Colaborador HP low-poly: casco blanco, chaleco naranja reflejante y
 * uniforme azul institucional. El frente del modelo (franja del chaleco)
 * mira a +z, por eso la rotación objetivo lleva un offset de π respecto a
 * la tabla de rotaciones del tutorial (forward=0 → mirar -z).
 *
 * En la terminal de cruceros el colaborador ABORDA las barcazas móviles
 * (`runtime.riding`): sube a la cubierta y cabecea con el oleaje. La barcaza la
 * dibuja el mapa; aquí solo se ajusta la altura/balanceo del cuerpo.
 */
export function Player() {
  const group = useRef<THREE.Group>(null);
  const deckY = useRef(0);

  useFrame((_, dt) => {
    const g = group.current;
    if (!g) return;

    if (useGameStore.getState().phase === 'playing') {
      updatePlayer(dt);
      updateWaterRiding(dt); // mecánica río: arrastre de barcaza / caída al agua
      updateConveyor(dt); // TUM: la banda transportadora arrastra por el suelo
      checkHits(); // colisión contra la posición YA actualizada de este frame
    }

    // RETIRADA (dron o contenedor): el cuerpo ya no pisa nada — la posición es
    // la que escribe `snatch.ts` (mundo absoluto, sin altura de cubierta que
    // sumar). Colgando del cabestrante acompaña el balanceo del cable
    // (roll/pitch del péndulo) y gira despacio sobre su propio eje...
    if (runtime.snatching) {
      deckY.current = 0;
      g.position.set(runtime.x, runtime.y, runtime.z);
      g.rotation.set(runtime.snatchPitch, Math.PI + runtime.snatchSpin, runtime.snatchRoll);
      // ...y bajo el CONTENEDOR no cuelga de nada: queda de sello en el suelo.
      // El volumen se conserva a ojo (lo que pierde de alto lo gana de ancho),
      // que es el aplastado de dibujo animado de toda la vida.
      const q = runtime.snatchSquash;
      g.scale.set(1 + (1 - q) * 0.55, q, 1 + (1 - q) * 0.55);
      g.visible = true;
      return;
    }
    if (g.scale.y !== 1) g.scale.set(1, 1, 1);

    // Montado: el cuerpo se apoya sobre la cubierta y cabecea. La altura de
    // cubierta se amortigua porque no es la misma en barcaza (0.2) que en
    // crucero (0.46): al abordar, sube a la cubierta en vez de teletransportarse.
    // En el astillero pasa lo mismo con andamios y pasarelas de dique: se SUBE
    // encima, y por eso la grúa pórtico le pasa por debajo.
    const riding = runtime.riding;
    const bob = riding ? Math.sin(runtime.elapsed * 2.4) * 0.05 : 0;
    const stand = riding
      ? runtime.rideY
      : standHeight(
          runtime.stepping ? runtime.toRow : runtime.row,
          runtime.stepping ? runtime.toCol : runtime.col,
        );
    deckY.current = THREE.MathUtils.damp(deckY.current, stand, 18, dt);
    g.position.set(runtime.x, runtime.y + bob + deckY.current, runtime.z);

    // Rotación al rumbo del último salto, por el camino corto
    const target = runtime.facing + Math.PI;
    const delta = ((target - g.rotation.y + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
    g.rotation.y += delta * Math.min(1, dt * 14);

    // Balanceo (roll) solo montado en la barcaza
    g.rotation.z = riding ? Math.sin(runtime.elapsed * 1.7) * 0.05 : 0;

    // Parpadeo durante la invulnerabilidad post-golpe
    g.visible = runtime.invulnTimer <= 0 || Math.sin(runtime.elapsed * 40) > -0.4;
  });

  return (
    <group ref={group} rotation={[0, Math.PI, 0]}>
      {/* Piernas — uniforme azul HP */}
      <mesh castShadow position={[-0.14, 0.3, 0]}>
        <boxGeometry args={[0.2, 0.6, 0.24]} />
        <meshStandardMaterial color={PALETTE.hpNavy} />
      </mesh>
      <mesh castShadow position={[0.14, 0.3, 0]}>
        <boxGeometry args={[0.2, 0.6, 0.24]} />
        <meshStandardMaterial color={PALETTE.hpNavy} />
      </mesh>
      {/* Torso — chaleco reflejante naranja */}
      <mesh castShadow position={[0, 0.85, 0]}>
        <boxGeometry args={[0.56, 0.5, 0.34]} />
        <meshStandardMaterial color={PALETTE.safetyOrange} />
      </mesh>
      {/* Franja reflejante del chaleco (cara frontal del modelo) */}
      <mesh position={[0, 0.85, 0.176]}>
        <boxGeometry args={[0.56, 0.08, 0.01]} />
        <meshStandardMaterial color={PALETTE.white} emissive={PALETTE.white} emissiveIntensity={0.6} toneMapped={false} />
      </mesh>
      {/* Brazos — mangas azules */}
      <mesh castShadow position={[-0.4, 0.82, 0]}>
        <boxGeometry args={[0.16, 0.46, 0.2]} />
        <meshStandardMaterial color={PALETTE.hpNavy} />
      </mesh>
      <mesh castShadow position={[0.4, 0.82, 0]}>
        <boxGeometry args={[0.16, 0.46, 0.2]} />
        <meshStandardMaterial color={PALETTE.hpNavy} />
      </mesh>
      {/* Cabeza */}
      <mesh castShadow position={[0, 1.28, 0]}>
        <boxGeometry args={[0.34, 0.3, 0.3]} />
        <meshStandardMaterial color="#E8B98A" />
      </mesh>
      {/* Casco blanco de seguridad */}
      <mesh castShadow position={[0, 1.48, 0]}>
        <boxGeometry args={[0.4, 0.16, 0.36]} />
        <meshStandardMaterial color={PALETTE.white} />
      </mesh>
      <mesh position={[0, 1.54, 0]}>
        <boxGeometry args={[0.26, 0.08, 0.26]} />
        <meshStandardMaterial color={PALETTE.white} />
      </mesh>
    </group>
  );
}
