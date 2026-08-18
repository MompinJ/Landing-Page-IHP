import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import * as THREE from 'three';
import { BALANCE, colX } from '../data/balance';
import { PALETTE } from '../data/palette';
import { crane } from '../world/snatch';
import { ContainerBox } from './models';

/**
 * GRÚA PÓRTICO CON CONTENEDOR — el otro castigo del que se queda atrás (ver
 * `world/snatch.ts`, que es quien decide y quien calcula la pose; aquí solo se
 * dibuja).
 *
 * Se ve la máquina entera de arriba abajo, que es lo que hace legible la
 * amenaza: viga sobre las patas, CARRO que persigue tu columna, cables, spreader
 * amarillo con los twistlocks y el TEU colgando. En el suelo, la marca de
 * peligro pintada bajo la carga — el aviso que da cualquier terminal de verdad.
 */
const BEAM_Y = BALANCE.DROP_BEAM_Y;
const BOX = BALANCE.DROP_BOX;
/** Las patas caen fuera del tablero jugable, no estorban ninguna casilla */
const LEG_X = colX(BALANCE.MAX_TILE) + 1.5;
const CRANE_YELLOW = '#FFC627';
/** Rojo de contenedor peligroso (el único de este color en pantalla) */
const DANGER_RED = '#E03131';
/** Anclaje de los cuatro cables en el carro */
const CABLES: Array<[number, number]> = [
  [-0.95, -0.42],
  [0.95, -0.42],
  [-0.95, 0.42],
  [0.95, 0.42],
];

export function CraneDrop() {
  const rig = useRef<THREE.Group>(null);
  const trolley = useRef<THREE.Group>(null);
  const cables = useRef<THREE.Group>(null);
  const spreader = useRef<THREE.Group>(null);
  const box = useRef<THREE.Group>(null);
  const mark = useRef<THREE.Mesh>(null);

  useFrame(() => {
    const g = rig.current;
    if (!g) return;
    g.visible = crane.visible;
    if (!crane.visible) return;

    // El pórtico se planta en la fila del colaborador
    g.position.z = crane.z;

    if (trolley.current) trolley.current.position.x = crane.x;
    if (spreader.current) {
      // El spreader cuelga del cable, así que va donde lo lleva el péndulo
      spreader.current.position.set(crane.spreaderX, crane.spreaderY, 0);
      spreader.current.rotation.z = crane.boxTilt;
    }
    // Los cables son una sola caja unitaria estirada desde el carro: el largo
    // cambia cada frame sin recrear geometría, y giran con el balanceo (el
    // pivote del péndulo es el carro, no el suelo).
    if (cables.current) {
      cables.current.position.set(crane.x, BEAM_Y - 0.28, 0);
      cables.current.rotation.z = crane.boxTilt;
      cables.current.scale.y = Math.max(0.02, crane.cable);
    }
    if (box.current) {
      box.current.position.set(crane.boxX, crane.boxY, crane.boxZ - crane.z);
      box.current.rotation.z = crane.boxTilt;
    }
    if (mark.current) {
      const m = mark.current.material as THREE.MeshBasicMaterial;
      m.opacity = crane.mark * 0.95;
      mark.current.visible = crane.mark > 0.01;
      mark.current.position.x = crane.boxX;
      mark.current.position.z = crane.boxZ - crane.z;
      const s = 1 + crane.mark * 0.12;
      mark.current.scale.set(s, s, 1);
    }
  });

  return (
    <group ref={rig} visible={false}>
      {/* Patas del pórtico, fuera del tablero */}
      {[-LEG_X, LEG_X].map((x) => (
        <group key={x} position={[x, 0, 0]}>
          <mesh castShadow position={[0, BEAM_Y / 2, -0.5]}>
            <boxGeometry args={[0.38, BEAM_Y, 0.38]} />
            <meshStandardMaterial color={CRANE_YELLOW} />
          </mesh>
          <mesh castShadow position={[0, BEAM_Y / 2, 0.5]}>
            <boxGeometry args={[0.38, BEAM_Y, 0.38]} />
            <meshStandardMaterial color={CRANE_YELLOW} />
          </mesh>
          {/* Base sobre rieles */}
          <mesh position={[0, 0.22, 0]}>
            <boxGeometry args={[0.6, 0.44, 1.9]} />
            <meshStandardMaterial color={PALETTE.hpNavy} />
          </mesh>
        </group>
      ))}

      {/* Viga: cruza el tablero entero por encima */}
      <mesh castShadow position={[0, BEAM_Y, 0]}>
        <boxGeometry args={[LEG_X * 2 + 0.4, 0.46, 1.5]} />
        <meshStandardMaterial color={CRANE_YELLOW} />
      </mesh>
      {/* Pasarela de servicio, para que la viga no sea un ladrillo liso */}
      <mesh position={[0, BEAM_Y + 0.32, 0.85]}>
        <boxGeometry args={[LEG_X * 2, 0.08, 0.3]} />
        <meshStandardMaterial color={PALETTE.steel} />
      </mesh>

      {/* Carro: recorre la viga hasta ponerse sobre tu columna */}
      <group ref={trolley}>
        <mesh castShadow position={[0, BEAM_Y - 0.05, 0]}>
          <boxGeometry args={[1.5, 0.5, 1.1]} />
          <meshStandardMaterial color={PALETTE.white} />
        </mesh>
        <mesh position={[0, BEAM_Y + 0.24, 0]}>
          <boxGeometry args={[0.5, 0.16, 0.5]} />
          <meshStandardMaterial
            color={PALETTE.glowBad}
            emissive={PALETTE.glowBad}
            emissiveIntensity={1.3}
            toneMapped={false}
          />
        </mesh>
      </group>

      {/* Cables (caja unitaria que se estira hacia abajo) */}
      <group ref={cables}>
        {CABLES.map(([x, z], i) => (
          <mesh key={i} position={[x, -0.5, z]}>
            <boxGeometry args={[0.045, 1, 0.045]} />
            <meshStandardMaterial color="#0e1116" />
          </mesh>
        ))}
      </group>

      {/* Spreader con sus twistlocks */}
      <group ref={spreader}>
        <mesh castShadow>
          <boxGeometry args={[BOX[0] + 0.15, 0.2, BOX[2] * 0.75]} />
          <meshStandardMaterial color={CRANE_YELLOW} />
        </mesh>
        <mesh position={[0, 0.16, 0]}>
          <boxGeometry args={[0.7, 0.18, 0.5]} />
          <meshStandardMaterial color={PALETTE.steel} />
        </mesh>
        {[-1, 1].map((sx) =>
          [-1, 1].map((sz) => (
            <mesh key={`${sx}${sz}`} position={[sx * (BOX[0] / 2 - 0.1), -0.14, sz * (BOX[2] / 2 - 0.12)]}>
              <boxGeometry args={[0.13, 0.16, 0.13]} />
              <meshStandardMaterial color={PALETTE.sunsetOrange} />
            </mesh>
          )),
        )}
      </group>

      {/* El TEU que va a caer. Rojo de aviso, no naranja: en un patio lleno de
          cajas naranjas y azules, el que te va a matar tiene que ser el único
          de su color en pantalla. */}
      <group ref={box}>
        <ContainerBox size={BOX} color={DANGER_RED} />
      </group>

      {/* Marca de peligro pintada en el suelo, justo bajo la carga: en la
          isométrica ES el aviso —la sombra que dice DÓNDE va a caer— así que
          va grande y a plena luz, no como detalle decorativo. */}
      <mesh ref={mark} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.035, 0]}>
        <planeGeometry args={[BOX[0] + 1.0, BOX[2] + 1.0]} />
        <meshBasicMaterial
          color={PALETTE.glowBad}
          transparent
          opacity={0}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
    </group>
  );
}
