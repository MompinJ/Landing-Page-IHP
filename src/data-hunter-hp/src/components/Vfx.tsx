import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { PALETTE } from '../data/palette';
import { vfxBus } from '../world/vfxBus';

/**
 * VFX con pools preasignados: ráfagas de partículas "data stream" (recolección)
 * y anillos de choque (impacto). Los slots se reactivan in situ — nunca se
 * crean geometrías ni materiales durante la partida.
 */
const BURST_SLOTS = 6;
const RING_SLOTS = 5;
const PARTICLES = 26;
const BURST_LIFE = 0.7;
const RING_LIFE = 0.5;

type FxKind = 'collect' | 'impact' | 'splash';

interface FxSlot {
  active: boolean;
  life: number;
  x: number;
  y: number;
  z: number;
  kind: FxKind;
}

function makeSlot(): FxSlot {
  return { active: false, life: 0, x: 0, y: 0, z: 0, kind: 'collect' };
}

const SPLASH_DROP = '#bfe9ff';
const SPLASH_RING = '#7fe3ff';

function Burst({ slot }: { slot: FxSlot }) {
  const points = useRef<THREE.Points>(null);
  const material = useRef<THREE.PointsMaterial>(null);
  const { positions, velocities } = useMemo(() => {
    return {
      positions: new Float32Array(PARTICLES * 3),
      velocities: new Float32Array(PARTICLES * 3),
    };
  }, []);

  useFrame((_, dt) => {
    const mesh = points.current;
    if (!mesh) return;
    if (!slot.active) {
      mesh.visible = false;
      return;
    }

    if (slot.life === 0) {
      const splash = slot.kind === 'splash';
      if (material.current) material.current.color.set(splash ? SPLASH_DROP : PALETTE.glowGood);
      // (re)inicializar partículas: cono ascendente (data) o abanico de gotas (agua)
      for (let i = 0; i < PARTICLES; i++) {
        positions[i * 3] = 0;
        positions[i * 3 + 1] = 0;
        positions[i * 3 + 2] = 0;
        const angle = Math.random() * Math.PI * 2;
        const radial = 0.6 + Math.random() * 1.4;
        velocities[i * 3] = Math.cos(angle) * radial * (splash ? 1.3 : 0.6);
        velocities[i * 3 + 1] = splash ? 1.4 + Math.random() * 1.6 : 2.2 + Math.random() * 2.6;
        velocities[i * 3 + 2] = Math.sin(angle) * radial * (splash ? 1.3 : 0.6);
      }
    }

    slot.life += dt;
    if (slot.life >= BURST_LIFE) {
      slot.active = false;
      mesh.visible = false;
      return;
    }

    mesh.visible = true;
    for (let i = 0; i < PARTICLES; i++) {
      positions[i * 3] += velocities[i * 3] * dt;
      positions[i * 3 + 1] += velocities[i * 3 + 1] * dt;
      positions[i * 3 + 2] += velocities[i * 3 + 2] * dt;
    }
    mesh.geometry.attributes.position.needsUpdate = true;
    mesh.position.set(slot.x, slot.y, slot.z);
    if (material.current) material.current.opacity = 1 - slot.life / BURST_LIFE;
  });

  return (
    <points ref={points} visible={false}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        ref={material}
        color={PALETTE.glowGood}
        size={0.14}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        toneMapped={false}
      />
    </points>
  );
}

function Ring({ slot }: { slot: FxSlot }) {
  const mesh = useRef<THREE.Mesh>(null);
  const material = useRef<THREE.MeshBasicMaterial>(null);

  useFrame((state, dt) => {
    const m = mesh.current;
    if (!m) return;
    if (!slot.active) {
      m.visible = false;
      return;
    }
    slot.life += dt;
    if (slot.life >= RING_LIFE) {
      slot.active = false;
      m.visible = false;
      return;
    }
    m.visible = true;
    const t = slot.life / RING_LIFE;
    m.position.set(slot.x, slot.y, slot.z);
    m.quaternion.copy(state.camera.quaternion); // anillo encarado a cámara
    m.scale.setScalar(0.4 + t * 2.4);
    if (material.current) {
      material.current.color.set(slot.kind === 'splash' ? SPLASH_RING : PALETTE.glowBad);
      material.current.opacity = 0.9 * (1 - t);
    }
  });

  return (
    <mesh ref={mesh} visible={false}>
      <ringGeometry args={[0.42, 0.55, 32]} />
      <meshBasicMaterial
        ref={material}
        color={PALETTE.glowBad}
        transparent
        depthWrite={false}
        side={THREE.DoubleSide}
        blending={THREE.AdditiveBlending}
        toneMapped={false}
      />
    </mesh>
  );
}

export function Vfx() {
  const bursts = useMemo(() => Array.from({ length: BURST_SLOTS }, makeSlot), []);
  const rings = useMemo(() => Array.from({ length: RING_SLOTS }, makeSlot), []);

  // Drenar el bus asignando eventos a slots libres — corre antes que los hijos
  useFrame(() => {
    const assign = (pool: FxSlot[], e: (typeof vfxBus)[number]) => {
      const slot = pool.find((s) => !s.active);
      if (!slot) return; // sin slots libres: se descarta el efecto, nunca se instancia
      slot.active = true;
      slot.life = 0;
      slot.x = e.x;
      slot.y = e.y;
      slot.z = e.z;
      slot.kind = e.kind;
    };
    while (vfxBus.length > 0) {
      const event = vfxBus.pop()!;
      // collect → ráfaga; impact → anillo; splash → anillo + gotas
      if (event.kind === 'collect') assign(bursts, event);
      else if (event.kind === 'impact') assign(rings, event);
      else {
        assign(rings, event);
        assign(bursts, event);
      }
    }
  });

  return (
    <group>
      {bursts.map((slot, i) => (
        <Burst key={`burst${i}`} slot={slot} />
      ))}
      {rings.map((slot, i) => (
        <Ring key={`ring${i}`} slot={slot} />
      ))}
    </group>
  );
}
