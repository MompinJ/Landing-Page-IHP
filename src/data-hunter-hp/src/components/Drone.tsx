import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { BALANCE } from '../data/balance';
import { PALETTE } from '../data/palette';
import { runtime } from '../store/runtime';
import { drone } from '../world/snatch';

/**
 * DRON DE SEGURIDAD del Smart Port — el que retira al colaborador que se queda
 * atrás en zona de operación (ver `world/snatch.ts`, que es quien decide y
 * quien calcula la pose; aquí no hay ni una decisión de juego).
 *
 * Cuatriturbina institucional: chasis azul HP con franja cian, baliza roja de
 * emergencia, foco de inspección y cabestrante con garra. El modelo mira a +z,
 * que es el convenio de rumbo de `snatch.ts`.
 *
 * Los rotores son DISCOS translúcidos girando, no palas: a 60 fps unas palas
 * de caja se ven como un estroboscopio (aliasing temporal), mientras que el
 * disco desenfocado es justo lo que ve el ojo en un multirrotor real.
 */
const ROPE = BALANCE.DRONE_ROPE;
const UP = new THREE.Vector3(0, 1, 0);
const AIM = new THREE.Vector3();
/** Brazos en X, con los rotores en las puntas */
const ARMS: Array<[number, number]> = [
  [-0.52, 0.52],
  [0.52, 0.52],
  [-0.52, -0.52],
  [0.52, -0.52],
];

/**
 * HAZ DEL FOCO. Un cono translúcido normal NO sirve como luz: al mezclarse
 * como pintura TIÑE y OSCURECE lo que hay detrás (los contenedores bajo el
 * haz se veían apagados y con un triángulo recortado encima). Una luz solo
 * puede SUMAR, así que el material va en mezcla ADITIVA.
 *
 * Y para que el haz no acabe en un borde recto, el degradado va metido en la
 * propia malla: cada vértice lleva un color que va de blanco en el vértice del
 * cono (junto al foco) a negro en la boca. Con mezcla aditiva, negro = no suma
 * nada, así que el haz se disuelve en el aire en vez de cortarse.
 */
function useBeamGeometry() {
  return useMemo(() => {
    const geo = new THREE.ConeGeometry(1, 1, 24, 1, true);
    const pos = geo.getAttribute('position');
    const colors = new Float32Array(pos.count * 3);
    for (let i = 0; i < pos.count; i++) {
      const t = pos.getY(i) + 0.5; // 1 en el vértice (arriba), 0 en la boca
      const v = t * t; // cae rápido: la mitad de abajo casi no pinta
      colors[i * 3] = colors[i * 3 + 1] = colors[i * 3 + 2] = v;
    }
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    return geo;
  }, []);
}

export function Drone() {
  const group = useRef<THREE.Group>(null);
  const cable = useRef<THREE.Group>(null);
  const rotors = useRef<THREE.Mesh[]>([]);
  const beacon = useRef<THREE.MeshStandardMaterial>(null);
  const beamPivot = useRef<THREE.Group>(null);
  const beamMesh = useRef<THREE.Mesh>(null);
  const clawL = useRef<THREE.Group>(null);
  const clawR = useRef<THREE.Group>(null);
  const pool = useRef<THREE.Mesh>(null);
  const claw = useRef(0); // 0 abierta, 1 cerrada
  const beamGeo = useBeamGeometry();

  useFrame((_, dt) => {
    const g = group.current;
    const c = cable.current;
    if (!g || !c) return;
    g.visible = drone.visible;
    c.visible = drone.visible && drone.carrying;
    if (!drone.visible) return;

    g.position.set(drone.x, drone.y, drone.z);
    g.rotation.set(drone.pitch, drone.yaw, drone.roll);

    // Rotores: dos en cada sentido de giro, como cualquier cuadricóptero
    for (let i = 0; i < rotors.current.length; i++) {
      const r = rotors.current[i];
      if (r) r.rotation.y = i % 2 === 0 ? drone.rotor : -drone.rotor;
    }

    // Baliza de emergencia
    if (beacon.current) beacon.current.emissiveIntensity = 0.3 + drone.beacon * 2.6;

    // FOCO DE INSPECCIÓN — no cuelga del chasis: APUNTA al colaborador, que es
    // lo que convierte al dron en un aviso dirigido ("te está buscando a ti")
    // en vez de en decorado que pasa por encima. Va en mundo, no como hijo del
    // dron, para no heredar su alabeo.
    const bp = beamPivot.current;
    const bm = beamMesh.current;
    const pl = pool.current;
    const enfoca = !drone.carrying && drone.light > 0.01;
    if (bp && bm) {
      bp.visible = enfoca;
      if (enfoca) {
        AIM.set(drone.x - runtime.x, drone.y - runtime.y, drone.z - runtime.z);
        const largo = Math.max(0.6, AIM.length());
        AIM.divideScalar(largo);
        bp.position.set(drone.x, drone.y, drone.z);
        bp.quaternion.setFromUnitVectors(UP, AIM);
        // El cono arranca un palmo por debajo del chasis (de la óptica, no del
        // centro del dron) y se estira hasta el colaborador.
        bm.scale.set(largo * 0.2, largo, largo * 0.2);
        bm.position.set(0, -largo / 2 - 0.12, 0);
        (bm.material as THREE.MeshBasicMaterial).opacity = drone.light * 0.5;
      }
    }
    // Charco de luz donde aterriza el haz: es lo que hace legible A QUIÉN está
    // alumbrando. Va pegado al suelo y siempre horizontal, pase lo que pase
    // con la inclinación del dron.
    if (pl) {
      pl.visible = enfoca;
      if (enfoca) {
        pl.position.set(runtime.x, runtime.y + 0.045, runtime.z);
        const s = 1 + Math.sin(runtime.elapsed * 5) * 0.06;
        pl.scale.set(s, s, 1);
        (pl.material as THREE.MeshBasicMaterial).opacity = drone.light * 0.5;
      }
    }

    // La garra cierra al enganchar y se queda cerrada mientras lleva la carga
    claw.current = THREE.MathUtils.damp(claw.current, drone.carrying ? 1 : 0, 22, dt);
    const abre = (1 - claw.current) * 0.5;
    if (clawL.current) clawL.current.rotation.z = -abre;
    if (clawR.current) clawR.current.rotation.z = abre;

    // Cable del cabestrante: cuelga del dron con el ángulo del péndulo (no
    // hereda la inclinación del chasis — la cuerda no sabe de alabeos).
    c.position.set(drone.x, drone.y, drone.z);
    c.rotation.set(-drone.ropeZ, 0, drone.ropeX);
  });

  return (
    <>
      <group ref={group} visible={false} scale={1.28}>
        {/* Chasis */}
        <mesh castShadow>
          <boxGeometry args={[0.62, 0.2, 0.86]} />
          <meshStandardMaterial color={PALETTE.hpNavy} />
        </mesh>
        {/* Franja cian institucional a los costados */}
        <mesh position={[0, 0.02, 0]}>
          <boxGeometry args={[0.64, 0.05, 0.6]} />
          <meshStandardMaterial
            color={PALETTE.cyan}
            emissive={PALETTE.cyan}
            emissiveIntensity={0.9}
            toneMapped={false}
          />
        </mesh>
        {/* Morro: carcasa de sensores mirando adelante */}
        <mesh castShadow position={[0, -0.04, 0.5]}>
          <boxGeometry args={[0.34, 0.18, 0.22]} />
          <meshStandardMaterial color={PALETTE.white} />
        </mesh>
        {/* Baliza roja de emergencia */}
        <mesh position={[0, 0.19, -0.1]}>
          <boxGeometry args={[0.16, 0.12, 0.16]} />
          <meshStandardMaterial
            ref={beacon}
            color={PALETTE.glowBad}
            emissive={PALETTE.glowBad}
            emissiveIntensity={1.5}
            toneMapped={false}
          />
        </mesh>

        {/* Brazos, motores y discos de rotor */}
        {ARMS.map(([x, z], i) => (
          <group key={i} position={[x, 0, z]}>
            <mesh castShadow position={[-x * 0.5, 0, -z * 0.5]} rotation={[0, Math.atan2(x, z), 0]}>
              <boxGeometry args={[0.09, 0.07, 0.72]} />
              <meshStandardMaterial color={PALETTE.steel} />
            </mesh>
            <mesh castShadow>
              <boxGeometry args={[0.16, 0.16, 0.16]} />
              <meshStandardMaterial color={PALETTE.hpNavy} />
            </mesh>
            <mesh ref={(m) => { if (m) rotors.current[i] = m; }} position={[0, 0.13, 0]}>
              <cylinderGeometry args={[0.36, 0.36, 0.015, 16]} />
              <meshStandardMaterial
                color={PALETTE.white}
                transparent
                opacity={0.28}
                depthWrite={false}
                metalness={0.1}
                roughness={0.4}
              />
            </mesh>
            {/* Dos aspas visibles bajo el disco, para que se lea como rotor */}
            <mesh ref={(m) => { if (m) rotors.current[i + 4] = m; }} position={[0, 0.11, 0]}>
              <boxGeometry args={[0.68, 0.012, 0.05]} />
              <meshStandardMaterial color={PALETTE.steel} />
            </mesh>
            {/* Luz de navegación: verde a estribor, roja a babor */}
            <mesh position={[0, -0.09, 0]}>
              <boxGeometry args={[0.06, 0.04, 0.06]} />
              <meshStandardMaterial
                color={x > 0 ? PALETTE.glowGood : PALETTE.glowBad}
                emissive={x > 0 ? PALETTE.glowGood : PALETTE.glowBad}
                emissiveIntensity={1.2}
                toneMapped={false}
              />
            </mesh>
          </group>
        ))}

        {/* Cabestrante y garra (abre/cierra) */}
        <mesh position={[0, -0.16, 0]}>
          <boxGeometry args={[0.22, 0.14, 0.22]} />
          <meshStandardMaterial color={PALETTE.steel} />
        </mesh>
        <group ref={clawL} position={[-0.07, -0.24, 0]}>
          <mesh position={[-0.03, -0.09, 0]}>
            <boxGeometry args={[0.07, 0.2, 0.09]} />
            <meshStandardMaterial color={PALETTE.sunsetOrange} />
          </mesh>
        </group>
        <group ref={clawR} position={[0.07, -0.24, 0]}>
          <mesh position={[0.03, -0.09, 0]}>
            <boxGeometry args={[0.07, 0.2, 0.09]} />
            <meshStandardMaterial color={PALETTE.sunsetOrange} />
          </mesh>
        </group>

      </group>

      {/* Foco de inspección: cono unitario (vértice arriba) que se estira y se
          orienta cada frame del dron al colaborador. Ver `useBeamGeometry`. */}
      <group ref={beamPivot} visible={false}>
        <mesh ref={beamMesh} geometry={beamGeo} renderOrder={2}>
          <meshBasicMaterial
            color={PALETTE.cyan}
            vertexColors
            transparent
            opacity={0}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
            side={THREE.BackSide}
            toneMapped={false}
            fog={false}
          />
        </mesh>
      </group>

      {/* Charco de luz en el suelo, bajo el colaborador alumbrado */}
      <mesh ref={pool} rotation={[-Math.PI / 2, 0, 0]} visible={false} renderOrder={1}>
        <circleGeometry args={[0.85, 24]} />
        <meshBasicMaterial
          color={PALETTE.cyan}
          transparent
          opacity={0}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          toneMapped={false}
          fog={false}
        />
      </mesh>

      {/* Cable del cabestrante — fuera del chasis para que no herede su alabeo */}
      <group ref={cable} visible={false}>
        <mesh position={[0, -ROPE / 2, 0]}>
          <boxGeometry args={[0.035, ROPE, 0.035]} />
          <meshStandardMaterial color={PALETTE.steel} />
        </mesh>
      </group>
    </>
  );
}
