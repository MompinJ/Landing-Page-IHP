import { useTexture } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useMemo, useRef, type ReactNode } from 'react';
import * as THREE from 'three';
import { BALANCE, colX, rowZ } from '../data/balance';
import { TEX_CONTAINER } from '../data/assets';
import { PALETTE } from '../data/palette';
import { runtime } from '../store/runtime';
import { MERGED_GLOW, MERGED_STD, mergedBoxes, type BoxPart } from '../render/boxes';

/**
 * Modelos low-poly procedurales del puerto (estilo box-art del tutorial de
 * Crossy Road, tematizado Hutchison Ports). Slots listos para sustituir por
 * GLB si algún día se exportan assets.
 */
export const VEHICLE_COLORS = [PALETTE.hpNavy, PALETTE.steel, PALETTE.sunsetOrange, PALETTE.hpSky] as const;
export const CONTAINER_COLORS = [PALETTE.hpNavy, PALETTE.steel, PALETTE.sunsetOrange, PALETTE.hpSky] as const;

/* -------------------------------------------------- textura de contenedor */

/**
 * Caja de contenedor con textura corrugada realista (Higgsfield, gris neutro)
 * teñida con `color` del material — una sola imagen sirve para los 4 colores
 * institucionales. `useTexture` cachea por URL, así todas las cajas comparten
 * la misma textura en memoria.
 */
export function ContainerBox({
  size,
  color,
}: {
  size: [number, number, number];
  color: string;
}) {
  const map = useTexture(TEX_CONTAINER);
  return (
    <mesh castShadow receiveShadow>
      <boxGeometry args={size} />
      <meshStandardMaterial map={map} color={color} metalness={0.12} roughness={0.68} />
    </mesh>
  );
}

/* ------------------------------------------------------------------ ruedas */

function Wheel({ x, z, radius = 0.26, spinRef }: { x: number; z: number; radius?: number; spinRef?: React.MutableRefObject<THREE.Mesh[]> }) {
  return (
    <mesh
      ref={(m) => {
        if (m && spinRef && !spinRef.current.includes(m)) spinRef.current.push(m);
      }}
      position={[x, radius, z]}
      rotation={[Math.PI / 2, 0, 0]}
      castShadow
    >
      <cylinderGeometry args={[radius, radius, 0.22, 10]} />
      <meshStandardMaterial color="#1a1d24" roughness={0.9} />
    </mesh>
  );
}

/* ------------------------------------------------------------------ camión */

/** Camión portacontenedores — 5 casillas de largo (tutorial: truck = 5 tiles) */
function truckParts(): BoxPart[] {
  const len = 5 * BALANCE.TILE;
  return [
    // Chasis
    { size: [len * 0.92, 0.14, 0.8], pos: [0, 0.42, 0], color: '#232a36' },
    // Cabina
    { size: [1.0, 0.95, 0.95], pos: [len * 0.36, 0.95, 0], color: PALETTE.white },
    // Parabrisas
    { size: [0.02, 0.34, 0.72], pos: [len * 0.36 + 0.51, 1.1, 0], color: '#20304a' },
  ];
}

export function TruckModel({ colorIndex, speed }: { colorIndex: number; speed: number }) {
  const wheels = useRef<THREE.Mesh[]>([]);
  const color = VEHICLE_COLORS[colorIndex % VEHICLE_COLORS.length];

  useFrame((_, dt) => {
    for (const w of wheels.current) w.rotation.y += (speed * dt) / 0.26;
  });

  const len = 5 * BALANCE.TILE;
  const body = useMemo(() => mergedBoxes('truck', truckParts), []);
  return (
    <group>
      <mesh geometry={body} material={MERGED_STD} castShadow />
      {/* Contenedor de carga (texturizado) */}
      <group position={[-len * 0.12, 1.12, 0]}>
        <ContainerBox size={[len * 0.62, 1.15, 1.0]} color={color} />
      </group>
      {/* Ruedas (3 ejes como el tutorial) — giran, así que van sueltas */}
      <Wheel x={len * 0.36} z={0.42} spinRef={wheels} />
      <Wheel x={len * 0.36} z={-0.42} spinRef={wheels} />
      <Wheel x={0.1} z={0.42} spinRef={wheels} />
      <Wheel x={0.1} z={-0.42} spinRef={wheels} />
      <Wheel x={-len * 0.34} z={0.42} spinRef={wheels} />
      <Wheel x={-len * 0.34} z={-0.42} spinRef={wheels} />
    </group>
  );
}

/* --------------------------------------------------------------------- AGV */

/** AGV autónomo — 3 casillas (tutorial: car = 3 tiles), plataforma baja */
export function AGVModel({ colorIndex, speed }: { colorIndex: number; speed: number }) {
  const wheels = useRef<THREE.Mesh[]>([]);
  const color = VEHICLE_COLORS[colorIndex % VEHICLE_COLORS.length];

  useFrame((_, dt) => {
    for (const w of wheels.current) w.rotation.y += (speed * dt) / 0.2;
  });

  const len = 3 * BALANCE.TILE;
  const body = useMemo(
    () =>
      mergedBoxes(`agv:${color}`, () => [
        { size: [len * 0.9, 0.5, 0.95] as [number, number, number], pos: [0, 0.45, 0] as [number, number, number], color },
      ]),
    [color, len],
  );
  return (
    <group>
      <mesh geometry={body} material={MERGED_STD} castShadow />
      {/* Carga ligera (mini contenedor texturizado) */}
      <group position={[0, 0.95, 0]}>
        <ContainerBox size={[len * 0.5, 0.5, 0.8]} color={PALETTE.steel} />
      </group>
      <Wheel x={len * 0.3} z={0.4} radius={0.2} spinRef={wheels} />
      <Wheel x={len * 0.3} z={-0.4} radius={0.2} spinRef={wheels} />
      <Wheel x={-len * 0.3} z={0.4} radius={0.2} spinRef={wheels} />
      <Wheel x={-len * 0.3} z={-0.4} radius={0.2} spinRef={wheels} />
    </group>
  );
}

/* ----------------------------------------------------- pila de contenedores */

/**
 * Material ÚNICO de todos los contenedores de la escena: la textura corrugada
 * más color por vértice, para que una pila entera (hasta 3 cajas de colores
 * distintos) se pinte de una sola llamada. Antes cada caja llevaba su propio
 * material solo para cambiar el tinte.
 */
let containerMaterial: THREE.MeshStandardMaterial | null = null;
function getContainerMaterial(map: THREE.Texture): THREE.MeshStandardMaterial {
  if (!containerMaterial) {
    containerMaterial = new THREE.MeshStandardMaterial({
      map,
      vertexColors: true,
      metalness: 0.12,
      roughness: 0.68,
    });
  }
  return containerMaterial;
}

function stackParts(height: number, colorIndex: number): BoxPart[] {
  return Array.from({ length: height }, (_, level) => ({
    size: [1.0, 0.95, 1.0] as [number, number, number],
    pos: [0, 0.475 + level * 0.95, 0] as [number, number, number],
    color: CONTAINER_COLORS[(colorIndex + level) % CONTAINER_COLORS.length],
  }));
}

/** Pila de contenedores (equivalente a los árboles del tutorial, alturas 1-3) */
export function ContainerStack({ height, colorIndex }: { height: number; colorIndex: number }) {
  const map = useTexture(TEX_CONTAINER);
  const geo = useMemo(() => mergedBoxes(`stack:${height}:${colorIndex}`, () => stackParts(height, colorIndex)), [height, colorIndex]);
  const material = useMemo(() => getContainerMaterial(map), [map]);
  return <mesh geometry={geo} material={material} castShadow receiveShadow />;
}

/* ------------------------------------------- zona cruceros (ECV Ensenada) */

/**
 * TEXTURA DE LA SUPERESTRUCTURA — un mosaico de UNA cubierta de camarotes que se
 * repite a escala de mundo (ver `WorldUV` en `src/render/boxes.ts`).
 *
 * Antes era una tira de 256×64 estirada 0..1 en cada cara: las portillas salían
 * como rayas verticales, con un tamaño distinto en cada caseta, y la hilera de
 * ventanas se pintaba también en los tejados. Ahora el mosaico tiene una medida
 * FÍSICA (`HOUSE_TILE` × `HOUSE_DECK`) y la ventana mide lo mismo en todo el
 * barco, mire por donde se mire.
 */
const HOUSE_TILE = 0.47;
/** Alto de una cubierta. Las casetas miden un número ENTERO de cubiertas para
 *  que ninguna hilera de ventanas quede cortada por la mitad. */
const HOUSE_DECK = 0.3;
/** Punto liso del mosaico (zona blanca bajo el antepecho) para tejados y suelos */
const HOUSE_CAP_UV: [number, number] = [0.5, 0.08];

let hullTexture: THREE.CanvasTexture | null = null;

/** Mosaico de una cubierta: línea de trancanil, hilera de ventanas y antepecho */
function getHullTexture(): THREE.CanvasTexture {
  if (hullTexture) return hullTexture;
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 64;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#f2f5f8';
  ctx.fillRect(0, 0, 128, 64);
  // Canto de la cubierta de arriba (el mosaico se repite en vertical, así que
  // esta línea marca la separación entre cubierta y cubierta)
  ctx.fillStyle = '#d7e0e9';
  ctx.fillRect(0, 0, 128, 3);
  // Hilera de ventanas de camarote: 4 por mosaico
  for (let i = 0; i < 4; i++) {
    const x = 6 + i * 32;
    ctx.fillStyle = '#22364e';
    ctx.fillRect(x, 14, 20, 22);
    // Reflejo de cielo en el tercio de arriba: sin él el cristal se lee como
    // un agujero negro desde la cámara isométrica
    ctx.fillStyle = '#41729c';
    ctx.fillRect(x, 14, 20, 7);
  }
  // Antepecho bajo las ventanas
  ctx.fillStyle = '#ccd6e0';
  ctx.fillRect(0, 36, 128, 2);
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  // Es un mapa de COLOR: sin esto three lo trata como lineal y los cristales
  // navy salen lavados en gris
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  hullTexture = texture;
  return texture;
}

/* ------------------------------------------- amenidades de cubierta (lido) */

/** Colores de vacaciones: sombrillas, toallas y bañadores de los pasajeros */
const RESORT_COLORS = ['#EE7523', '#00E5FF', '#FFC627', '#FF5C7A', '#4FE08A', '#F5F7FA'] as const;
const SWIMWEAR = ['#FF5C7A', '#FFC627', '#00E5FF', '#4FE08A', '#EE7523', '#F5F7FA'] as const;

/**
 * El mobiliario de cubierta se declara como PIEZAS, no como componentes: todas
 * acaban fusionadas en la geometría del barco (ver `src/render/boxes.ts`). Antes
 * cada sombrilla eran 2 mallas con 2 materiales; con 14 muebles por barco y
 * varios barcos en pantalla, eso solo en el lido ya eran cientos de draw calls.
 */

/** Sombrilla de cubierta (mástil + parasol cónico) */
function parasol(x: number, y: number, z: number, color: string, s = 1): BoxPart[] {
  return [
    { size: [0.03 * s, 0.3 * s, 0.03 * s], pos: [x, y + 0.15 * s, z], color: '#dfe7ee' },
    { cone: [0.23 * s, 0.13 * s, 8], pos: [x, y + 0.33 * s, z], color },
  ];
}

/** Tumbona: colchoneta + respaldo reclinado. `face` orienta el respaldo. */
function sunLounger(x: number, y: number, z: number, color: string, face: 1 | -1): BoxPart[] {
  return [
    { size: [0.3, 0.05, 0.15], pos: [x, y + 0.055, z], color },
    { size: [0.15, 0.04, 0.15], pos: [x + face * -0.13, y + 0.12, z], rot: [0, 0, face * 0.8], color },
  ];
}

/** Pasajero: figura mínima de dos cajas, suficiente a escala de la cámara */
function passenger(x: number, y: number, z: number, color: string): BoxPart[] {
  return [
    { size: [0.09, 0.17, 0.09], pos: [x, y + 0.11, z], color },
    { size: [0.085, 0.085, 0.085], pos: [x, y + 0.245, z], color: '#e8b48c' },
  ];
}

/** Brocal de la alberca (la lámina de agua va aparte, al material que brilla) */
function poolRim(x: number, y: number, z: number, w: number, d: number): BoxPart {
  return { size: [w, 0.09, d], pos: [x, y + 0.045, z], color: '#eef3f7' };
}

/** Lámina de agua turquesa: va en la geometría GLOW para que la encienda el bloom */
function poolWater(x: number, y: number, z: number, w: number, d: number): BoxPart {
  return { size: [w - 0.13, 0.05, d - 0.13], pos: [x, y + 0.075, z], color: '#2ad4f5' };
}

/**
 * Crucero ECV — casco de `SHIP_TILES`. ABORDABLE: la cubierta de paseo va
 * despejada en el CENTRO, justo sobre el tramo que `SHIP_DECK_TILES` declara
 * abordable; los castillos de proa y popa quedan fuera de ese tramo, así que el
 * jugador nunca puede aterrizar dentro de una caseta.
 *
 * Se usa igual como decorado (speed 0) que como plataforma móvil del río.
 *
 * `beam` = MANGA (ancho) a la altura de la cubierta. La obra viva se queda
 * siempre estrecha (`WATER_BEAM`): un casco más ancho que la fila se metería
 * dentro del pontón de al lado, que solo levanta 0.11. Todo el ensanche va por
 * encima de esa cota, así el barco puede volar sobre el muelle sin clipping.
 *
 * `resort` habilita el lido en el CENTRO de la cubierta (albercas, tobogán).
 * Solo para cruceros de fondo: en los abordables ese tramo es donde aterriza
 * el jugador y tiene que seguir despejado.
 *
 * RENDIMIENTO: el barco entero son 3 mallas (opaco fusionado, acentos brillantes
 * y las casetas con portillas, que llevan textura propia). Eran ~90.
 */
const WATER_BEAM = 1.24;

/** Medidas derivadas del barco — las comparten el constructor de geometría y el
 *  componente, así no hay dos sitios donde puedan desincronizarse. */
function cruiseDims(beam: number) {
  const len = BALANCE.SHIP_TILES * BALANCE.TILE;
  const deck = BALANCE.SHIP_DECK_Y;
  /** Media cubierta abierta: cubre con holgura el tramo abordable */
  const open = (BALANCE.SHIP_DECK_TILES * BALANCE.TILE) / 2 + BALANCE.BOARD_MARGIN + 0.14;
  /** Largo de cada castillo (proa/popa), lo que queda de casco */
  const house = len * 0.47 - open;
  const deckW = beam * 0.9;
  const half = deckW / 2;
  /** Carril central que el jugador pisa: SIEMPRE despejado de mobiliario */
  const lane = 0.92;
  /**
   * ALTURAS DE LA SUPERESTRUCTURA, en cubiertas enteras de `HOUSE_DECK`: la
   * textura de camarotes se repite a escala de mundo, así que una caseta con
   * altura "suelta" cortaría la última hilera de ventanas por la mitad.
   */
  const aftH = HOUSE_DECK * 3;
  const aftUpH = HOUSE_DECK * 2;
  const bowH = HOUSE_DECK * 3;
  return {
    len,
    deck,
    open,
    house,
    deckW,
    half,
    lane,
    aftH,
    aftUpH,
    bowH,
    /** Techo del castillo de popa (donde se apoya el solárium) */
    aftTop: deck + aftH + aftUpH,
    /** Techo del castillo de proa (donde se apoya el puente) */
    bowTop: deck + bowH,
    /** Obra viva: nunca más ancha que la fila (ver nota de `beam`) */
    water: Math.min(beam, WATER_BEAM),
    /** Cota a la que arranca el ensanche: por encima del tablado del pontón */
    flare: 0.19,
    /** Eje longitudinal de las alas (bandas laterales del paseo) */
    wing: Math.max(0.92 / 2 + 0.11, half - 0.24),
  };
}

/** Repartos deterministas del mobiliario a lo largo de toda la eslora */
function cruiseSlots(len: number): number[] {
  const out: number[] = [];
  for (let x = -len * 0.42; x <= len * 0.42; x += 0.94) out.push(x);
  return out;
}

/** Piezas opacas del crucero (casco, cubierta, castillos y mobiliario) */
function cruiseHullParts(beam: number, resort: boolean): BoxPart[] {
  const d = cruiseDims(beam);
  const { len, deck, open, house, deckW, half, lane, water, flare, wing } = d;
  const navy = PALETTE.hpNavy;
  const parts: BoxPart[] = [
    // OBRA VIVA estrecha (línea de flotación)
    { size: [len * 0.92, flare, water], pos: [0, flare / 2, 0], color: navy },
    // Casco navy ENSANCHADO hasta la línea de cubierta
    { size: [len * 0.94, deck - flare, beam], pos: [0, flare + (deck - flare) / 2, 0], color: navy },
    // Proa en diamante (a las dos alturas del casco). Cada tramo remata 0.02 por
    // DEBAJO del casco que lo acompaña y arranca 0.015 por ENCIMA de su fondo: a
    // ras compartía plano con él por arriba (se veía parpadear) y por abajo, que
    // no se ve a cámara pero sí se dibuja en el mapa de sombras.
    { size: [water * 0.72, flare - 0.035, water * 0.72], pos: [len * 0.47, 0.015 + (flare - 0.035) / 2, 0], rot: [0, Math.PI / 4, 0], color: navy },
    {
      size: [beam * 0.72, deck - flare - 0.035, beam * 0.72],
      pos: [len * 0.47, flare + 0.015 + (deck - flare - 0.035) / 2, 0],
      rot: [0, Math.PI / 4, 0],
      color: navy,
    },
    // CUBIERTA DE PASEO corrida de proa a popa + carril marcado del jugador
    { size: [len * 0.9, 0.06, deckW], pos: [0, deck + 0.02, 0], color: '#c9d5df' },
    { size: [open * 2 - 0.05, 0.02, lane], pos: [0, deck + 0.055, 0], color: '#e6edf3' },
  ];

  // Barandillas del paseo (a los costados, fuera del carril del jugador)
  for (const s of [-1, 1]) {
    parts.push({ size: [len * 0.9, 0.05, 0.04], pos: [0, deck + 0.24, s * (half - 0.03)], color: PALETTE.white });
  }

  // MOBILIARIO DE LAS ALAS: albercas, tumbonas, sombrillas y pasajeros a los
  // costados del paseo — nunca dentro del carril central
  const slots = cruiseSlots(len);
  slots.forEach((x, i) => {
    for (const s of [-1, 1] as const) {
      const z = s * wing;
      const y = deck + 0.05;
      if (i % 4 === 1) {
        parts.push(...parasol(x, y, z, RESORT_COLORS[(i + (s > 0 ? 0 : 3)) % RESORT_COLORS.length], 0.82));
      } else if (i % 4 === 2) {
        parts.push(...passenger(x, y, z, SWIMWEAR[(i * 2 + (s > 0 ? 1 : 4)) % SWIMWEAR.length]));
      } else if (i % 4 === 3) {
        // Alberca alargada de costado: la mancha turquesa que hace que se lea
        // como crucero de vacaciones desde la cámara isométrica
        parts.push(poolRim(x, y, z, 0.78, Math.min(0.34, half - lane / 2 - 0.04)));
      } else {
        parts.push(...sunLounger(x, y, z, RESORT_COLORS[(i * 2 + (s > 0 ? 1 : 2)) % RESORT_COLORS.length], s > 0 ? 1 : -1));
      }
    }
  });

  // LIDO CENTRAL: solo en cruceros de fondo (en los abordables este tramo es la
  // zona de aterrizaje y va despejada)
  if (resort) {
    const y = deck + 0.05;
    parts.push(poolRim(0, y, 0, 1.15, Math.min(lane, deckW - 0.5)));
    parts.push(poolRim(-1.75, y, 0, 0.75, Math.min(0.7, deckW - 0.9)));
    // Tobogán: mástil + rampa inclinada (dos cajas en vez de un toro)
    parts.push({ size: [0.07, 0.6, 0.07], pos: [1.9, y + 0.3, 0], color: '#dfe7ee' });
    parts.push({ size: [0.62, 0.07, 0.16], pos: [1.62, y + 0.42, 0], rot: [0, 0, 0.55], color: PALETTE.safetyOrange });
    parts.push({ size: [0.5, 0.07, 0.16], pos: [1.2, y + 0.12, 0.16], rot: [0, 0.5, 0.28], color: PALETTE.safetyOrange });
    parts.push(...passenger(-0.95, y, 0, SWIMWEAR[2]));
    parts.push(...passenger(0.95, y, 0, SWIMWEAR[0]));
  }

  // CASTILLO DE POPA: solárium en el techo + chimenea (las casetas van aparte,
  // con la textura de camarotes)
  const aft = -(open + house / 2);
  const solY = d.aftTop;
  /**
   * Reparto del techo del castillo, de popa a proa: chimenea, sombrillas y
   * solárium. La caseta de arriba va centrada en `aft + 0.05` y mide
   * `house * 0.78`, así que TODO lo que se apoye encima tiene que caber dentro
   * de ese tramo: la chimenea sobresalía por popa y se leía como una caja
   * flotando sobre el agua.
   */
  const roofAft = aft + 0.05 - house * 0.39;
  const funnelW = 0.42;
  const funnelX = roofAft + funnelW / 2 + 0.03;
  parts.push(poolRim(aft + 0.05 + house * 0.28, solY, 0, house * 0.3, beam * 0.26));
  for (const s of [-1, 1]) {
    parts.push(...parasol(aft + 0.05 + house * 0.04, solY, s * beam * 0.17, RESORT_COLORS[s > 0 ? 0 : 1], 0.55));
  }
  parts.push(...passenger(aft + 0.05 + house * 0.38, solY, beam * 0.14, SWIMWEAR[3]));
  // Chimenea: casco azul HP con tapa navy más pequeña, para que el azul se lea
  // desde arriba. Apoyada en el techo del castillo.
  parts.push({ size: [funnelW, 0.56, beam * 0.26], pos: [funnelX, solY + 0.28, 0], color: PALETTE.hpSky });
  parts.push({ size: [funnelW * 0.8, 0.06, beam * 0.2], pos: [funnelX, solY + 0.58, 0], color: navy });

  // CASTILLO DE PROA: puente acristalado + mástil, sobre el techo de la caseta
  const bow = open + house / 2;
  parts.push({ size: [house * 0.62, 0.36, beam * 0.52], pos: [bow + 0.02, d.bowTop + 0.18, 0], color: '#3a6ea8' });
  parts.push({ size: [0.07, 0.6, 0.07], pos: [bow, d.bowTop + 0.65, 0], color: PALETTE.white });

  // BOTES SALVAVIDAS colgados del costado, bajo el paseo
  for (const s of [-1, 1]) {
    for (const x of [-open * 0.72, open * 0.72]) {
      parts.push({ size: [0.44, 0.14, 0.13], pos: [x, deck - 0.09, s * (half + 0.02)], color: PALETTE.safetyOrange });
    }
  }
  return parts;
}

/** Piezas que deben ENCENDER el bloom: las láminas de agua de las albercas */
function cruiseGlowParts(beam: number, resort: boolean): BoxPart[] {
  const { len, deck, open, house, deckW, half, lane, wing, aftTop } = cruiseDims(beam);
  const parts: BoxPart[] = [];
  cruiseSlots(len).forEach((x, i) => {
    if (i % 4 !== 3) return;
    for (const s of [-1, 1]) {
      parts.push(poolWater(x, deck + 0.05, s * wing, 0.78, Math.min(0.34, half - lane / 2 - 0.04)));
    }
  });
  if (resort) {
    parts.push(poolWater(0, deck + 0.05, 0, 1.15, Math.min(lane, deckW - 0.5)));
    parts.push(poolWater(-1.75, deck + 0.05, 0, 0.75, Math.min(0.7, deckW - 0.9)));
  }
  const aft = -(open + house / 2);
  parts.push(poolWater(aft + 0.05 + house * 0.28, aftTop, 0, house * 0.3, beam * 0.26));
  return parts;
}

/**
 * Casetas de proa y popa: llevan la textura de camarotes, así que no pueden
 * fusionarse con el resto (van a su propia malla, con material compartido).
 *
 * Las tres comparten `uvWorld`, con el MISMO origen vertical: la retícula de
 * cubiertas es la del barco, no la de cada caja, así la caseta de arriba
 * continúa las hileras de la de abajo en vez de arrancar su propio patrón.
 */
function cruiseHouseParts(beam: number): BoxPart[] {
  const { deck, open, house, aftH, aftUpH, bowH } = cruiseDims(beam);
  const aft = -(open + house / 2);
  const bow = open + house / 2;
  const uvWorld = { tile: [HOUSE_TILE, HOUSE_DECK] as [number, number], originY: deck, cap: HOUSE_CAP_UV };
  return [
    { size: [house, aftH, beam * 0.62], pos: [aft, deck + aftH / 2, 0], color: '#ffffff', uvWorld },
    { size: [house * 0.78, aftUpH, beam * 0.5], pos: [aft + 0.05, deck + aftH + aftUpH / 2, 0], color: '#ffffff', uvWorld },
    { size: [house * 0.9, bowH, beam * 0.6], pos: [bow, deck + bowH / 2, 0], color: '#ffffff', uvWorld },
  ];
}

/** Material de las casetas: uno solo para todos los cruceros de la escena */
let hullMaterial: THREE.MeshStandardMaterial | null = null;
function getHullMaterial(): THREE.MeshStandardMaterial {
  if (!hullMaterial) {
    // Misma rugosidad/metalidad que `MERGED_STD`: con 0.45 las casetas brillaban
    // más que el resto del barco y se leían como otro material
    hullMaterial = new THREE.MeshStandardMaterial({ map: getHullTexture(), color: '#ffffff', roughness: 0.72, metalness: 0.12 });
  }
  return hullMaterial;
}

export function CruiseShipModel({
  speed,
  beam = 1.8,
  resort = false,
}: {
  speed: number;
  beam?: number;
  resort?: boolean;
}) {
  const group = useRef<THREE.Group>(null);
  const bob = useRef(Math.random() * Math.PI * 2);
  const moving = speed > 0;

  useFrame((_, dt) => {
    bob.current += dt;
    const g = group.current;
    if (!g) return;
    // Cabeceo suave; navegando es más contenido (el jugador va encima)
    g.position.y = Math.sin(bob.current * 0.9) * (moving ? 0.02 : 0.04);
    g.rotation.x = Math.sin(bob.current * 0.7) * (moving ? 0.006 : 0.012);
  });

  const key = `cruise:${beam.toFixed(2)}:${resort ? 'r' : ''}`;
  const hull = useMemo(() => mergedBoxes(`${key}:hull`, () => cruiseHullParts(beam, resort)), [key, beam, resort]);
  const glow = useMemo(() => mergedBoxes(`${key}:glow`, () => cruiseGlowParts(beam, resort)), [key, beam, resort]);
  const houses = useMemo(() => mergedBoxes(`${key}:house`, () => cruiseHouseParts(beam)), [key, beam]);
  const houseMat = useMemo(getHullMaterial, []);
  const len = BALANCE.SHIP_TILES * BALANCE.TILE;

  return (
    <>
      <group ref={group}>
        <mesh geometry={hull} material={MERGED_STD} castShadow receiveShadow />
        <mesh geometry={glow} material={MERGED_GLOW} />
        <mesh geometry={houses} material={houseMat} castShadow receiveShadow />
      </group>
      {/* Estela: solo cuando navega de verdad, y fuera del grupo que cabecea */}
      {moving && <Wake len={len} beam={WATER_BEAM} stern={len * 0.45} />}
    </>
  );
}

/* ============ FLOTA DE LA DÁRSENA (ECV) — plataformas abordables ========= */

/**
 * Todas las embarcaciones pequeñas se dibujan con las MISMAS cotas para que el
 * colaborador se apoye igual en cualquiera de ellas y para que la fila se lea
 * como una sola marina y no como cuatro maquetas distintas:
 *
 *   - casco de `BOAT_BEAM` de manga (por debajo de la fila: dos filas de agua
 *     contiguas tienen que dejar ver el agua entre ellas)
 *   - cara superior del casco en HULL_TOP; la cubierta pisable 0.02 por encima
 *   - todo lo que se apoye encima queda claramente por encima o por debajo de
 *     esa cota: dos caras mirando arriba a la misma altura pelean por el píxel
 *     (z-fighting) y sale una banda moteada que parpadea al mover la cámara
 *   - superestructuras (caseta, palo, cabina) FUERA del tramo abordable
 */
const HULL_TOP = 0.29;
const BEAM = BALANCE.BOAT_BEAM;
const DECK_Y = HULL_TOP + 0.02;

/** Lo único que el modelo necesita saber del vehículo para flotar: cuánto lo
 *  hunde el peso del colaborador (lo escribe `updateBuoyancy` en traffic.ts). */
export interface Buoyant {
  sink?: number;
}

/** Largo dibujado de un tipo de la flota, en unidades de mundo */
function boatLen(kind: string): number {
  const f = BALANCE.BOAT_FLEET.find((b) => b.kind === kind);
  return (f?.visual ?? 4) * BALANCE.TILE;
}

/** Media cubierta abordable: hasta aquí puede aterrizar el colaborador, así que
 *  de aquí para fuera es donde va todo lo que sobresale. */
function boatOpen(kind: string): number {
  const f = BALANCE.BOAT_FLEET.find((b) => b.kind === kind);
  return ((f?.tiles ?? 3) * BALANCE.TILE) / 2;
}

/** Casco común: obra viva, franja de flotación, proa en diamante y cubierta */
function hullParts(len: number, open: number, hull: string, deck = '#3a4658'): BoxPart[] {
  return [
    // Casco: de 0.03 a HULL_TOP
    { size: [len * 0.84, 0.26, BEAM], pos: [0, 0.16, 0], color: hull },
    // Proa en diamante, 0.03 POR DEBAJO de la cara del casco (nunca a ras)
    { size: [BEAM * 0.78, 0.22, BEAM * 0.78], pos: [len * 0.42, 0.15, 0], rot: [0, Math.PI / 4, 0], color: hull },
    // Franja de flotación navy — unifica la lectura de toda la flota
    { size: [len * 0.88, 0.07, BEAM + 0.04], pos: [0, 0.05, 0], color: PALETTE.hpNavy },
    // CUBIERTA pisable: la única cara a esta altura
    { size: [open * 2 + 0.3, 0.04, BEAM * 0.8], pos: [0, DECK_Y, 0], color: deck },
  ];
}

/* ---------------------------------------------------------------- estela */

/**
 * ESPUMA DE POPA. Antes era un plano de COLOR LISO: se leía como una losa
 * celeste de bordes rectos flotando en el agua, separada del barco y con el
 * canto marcado a contraluz. Ahora la forma la pone una textura con ALFA — la V
 * de olas divergentes que abre una hélice, apagándose con la distancia — así el
 * plano no tiene borde que se pueda ver.
 */
let wakeTexture: THREE.CanvasTexture | null = null;
function getWakeTexture(): THREE.CanvasTexture {
  if (wakeTexture) return wakeTexture;
  const W = 128;
  const H = 64;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;
  const img = ctx.createImageData(W, H);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      /** 0 pegado a la popa (borde +x del plano), 1 en el extremo lejano */
      const d = 1 - x / (W - 1);
      /** 0 en el eje del barco, 1 en el costado del plano */
      const t = Math.abs(y / (H - 1) - 0.5) * 2;
      /** La estela se ABRE con la distancia */
      const spread = 0.2 + 0.8 * d;
      /** Cresta de la ola divergente, justo en el borde de la V */
      const edge = Math.exp(-(((t - spread) / 0.16) ** 2));
      /** Espuma revuelta pegada a la popa, dentro de la V */
      const core = t < spread ? (1 - t / spread) ** 1.6 : 0;
      /** Se apaga con la distancia y en los costados: alfa 0 en todo el borde
       *  del plano, que es lo que hacía que se viera el rectángulo */
      const falloff = (1 - d) ** 0.9 * Math.min(1, (1 - t) * 5);
      const i = (y * W + x) * 4;
      img.data[i] = 255;
      img.data[i + 1] = 255;
      img.data[i + 2] = 255;
      img.data[i + 3] = Math.round(255 * Math.min(1, (0.38 * core + 0.62 * edge) * falloff));
    }
  }
  ctx.putImageData(img, 0, 0);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  wakeTexture = texture;
  return texture;
}

/** Una sola geometría y un solo material para TODAS las estelas de la escena:
 *  el tamaño de cada una se ajusta con la escala de la malla. */
const WAKE_GEO = new THREE.PlaneGeometry(1, 1);
let wakeMaterial: THREE.MeshBasicMaterial | null = null;
function getWakeMaterial(): THREE.MeshBasicMaterial {
  if (!wakeMaterial) {
    wakeMaterial = new THREE.MeshBasicMaterial({
      map: getWakeTexture(),
      color: '#cbe9fb',
      transparent: true,
      opacity: 0.5,
      depthWrite: false,
    });
  }
  return wakeMaterial;
}

/**
 * Estela de espuma. Va FUERA del grupo que cabecea: es agua, no barco — si
 * escora y se hunde con el casco, la lámina se mete bajo la superficie por un
 * costado y asoma por el otro.
 *
 * Se planta a `WAKE_Y`, entre la superficie del mar (-0.06) y la obra viva de
 * cualquier embarcación, así que pasa POR DEBAJO del casco: el extremo caliente
 * de la espuma queda tapado por el propio barco y no se ve dónde empieza.
 */
const WAKE_Y = -0.02;

function Wake({ len, beam, stern = len * 0.4 }: { len: number; beam: number; stern?: number }) {
  const long = len * 0.62;
  return (
    <mesh
      geometry={WAKE_GEO}
      material={getWakeMaterial()}
      position={[-(stern + long / 2) + 0.1, WAKE_Y, 0]}
      rotation={[-Math.PI / 2, 0, 0]}
      // Poco más ancha que la manga: la fila de al lado puede ser otra dársena
      // y una estela que se derrama en el carril vecino no se entiende
      scale={[long, beam * 1.35, 1]}
    />
  );
}

/**
 * Cuerpo flotante compartido: cabeceo con el oleaje y HUNDIMIENTO por el peso
 * del colaborador (`boat.sink`, que integra traffic.ts como muelle amortiguado).
 * Antes cada modelo repetía este useFrame y ya iban tres copias.
 */
function FloatingBoat({ boat, children }: { boat?: Buoyant; children: ReactNode }) {
  const g = useRef<THREE.Group>(null);
  const bob = useRef(Math.random() * Math.PI * 2);
  useFrame((_, dt) => {
    bob.current += dt;
    const el = g.current;
    if (!el) return;
    const sink = boat?.sink ?? 0;
    el.position.y = Math.sin(bob.current * 1.4) * 0.03 - sink;
    el.rotation.z = Math.sin(bob.current * 1.1) * 0.02 + sink * 0.22;
  });
  return <group ref={g}>{children}</group>;
}

/* ---------------------------------------------------------- remolcador */

/** Variantes de remolcador: puerto (navy), salvamento (rojo), servicio (ámbar) */
const TUG_HULLS = [PALETTE.hpNavy, '#a63a2a', '#c9861e'] as const;

function tugParts(hull: string): BoxPart[] {
  const len = boatLen('tug');
  const open = boatOpen('tug');
  return [
    ...hullParts(len, open, hull),
    // Caseta del patrón + chimenea, a PROA y fuera del tramo abordable. Se
    // hunde en el casco (base 0.22) para no compartir plano con nada.
    { size: [len * 0.19, 0.46, BEAM * 0.76], pos: [open + 0.42, 0.45, 0], color: PALETTE.white },
    { size: [len * 0.12, 0.24, BEAM * 0.54], pos: [open + 0.42, 0.78, 0], color: '#3a6ea8' },
    { size: [0.2, 0.34, 0.28], pos: [open + 0.06, 0.55, 0], color: PALETTE.hpSky },
    { size: [0.22, 0.05, 0.3], pos: [open + 0.06, 0.74, 0], color: PALETTE.hpNavy },
    // Bita de remolque a popa. Arranca DENTRO del tablado de la cubierta (que va
    // de 0.29 a 0.33), no en su cara de abajo: a ras compartían plano y el
    // solape entraba en el mapa de sombras.
    { size: [0.16, 0.18, 0.16], pos: [-len * 0.38, 0.4, 0], color: '#2b333f' },
  ];
}

/** Defensa perimetral de llantas: naranja de seguridad, al material que brilla.
 *  Remata en 0.24, por DEBAJO de HULL_TOP: a ras las dos caras parpadeaban. */
function tugFenderParts(): BoxPart[] {
  return [{ size: [boatLen('tug') * 0.86, 0.08, BEAM + 0.06], pos: [0, 0.2, 0], color: PALETTE.safetyOrange }];
}

/**
 * REMOLCADOR DE PUERTO — la plataforma PRINCIPAL de la marina. Es el barco que
 * de verdad trabaja en una terminal de cruceros y el que más sale en el sorteo
 * de la flota.
 */
export function TugboatModel({ colorIndex = 0, boat }: { colorIndex?: number; boat?: Buoyant }) {
  const hull = TUG_HULLS[colorIndex % TUG_HULLS.length];
  const geo = useMemo(() => mergedBoxes(`tug:${hull}`, () => tugParts(hull)), [hull]);
  const fender = useMemo(() => mergedBoxes('tug:fender', tugFenderParts), []);
  return (
    <>
      <FloatingBoat boat={boat}>
        <mesh geometry={geo} material={MERGED_STD} castShadow />
        <mesh geometry={fender} material={MERGED_GLOW} />
      </FloatingBoat>
      <Wake len={boatLen('tug')} beam={BEAM} />
    </>
  );
}

/* -------------------------------------------------------------- velero */

const SAIL_HULLS = ['#1f4f7a', '#8d2f3a', '#2f6d52', '#f4f6f8'] as const;

/**
 * VELERO. El palo y las velas van a PROA del tramo abordable y con el pie a
 * 1.85: el colaborador mide 1.56 sobre cubierta, así que pasa por debajo de la
 * botavara sin que la vela le tape en cámara — que es lo que pasaría con una
 * mayor cayendo sobre la bañera.
 */
function sailParts(hull: string): BoxPart[] {
  const len = boatLen('sail');
  const open = boatOpen('sail');
  /** Palo, justo por delante del tramo abordable */
  const palo = open + 0.55;
  /** Pie de la vela. El colaborador mide 1.56 sobre una cubierta a 0.31, o sea
   *  1.87: la vela arranca por encima para que pase por debajo de la botavara
   *  sin que le tape en cámara. */
  const pie = 1.98;
  const parts: BoxPart[] = [
    ...hullParts(len, open, hull, '#8a6f4e'),
    // Regala y bañera
    { size: [len * 0.8, 0.1, BEAM * 0.94], pos: [0, HULL_TOP, 0], color: hull },
    { size: [open * 1.5, 0.06, BEAM * 0.5], pos: [-open * 0.35, DECK_Y + 0.03, 0], color: '#6b5334' },
    // Palo y botavara
    { size: [0.1, 2.9, 0.1], pos: [palo, 1.7, 0], color: '#d8dee6' },
    { size: [1.5, 0.07, 0.07], pos: [palo - 0.75, pie - 0.06, 0], color: '#d8dee6' },
    // Franja de cubierta y timón
    { size: [len * 0.82, 0.05, 0.06], pos: [0, HULL_TOP - 0.02, BEAM / 2], color: PALETTE.hpNavy },
    { size: [len * 0.82, 0.05, 0.06], pos: [0, HULL_TOP - 0.02, -BEAM / 2], color: PALETTE.hpNavy },
    { size: [0.1, 0.4, 0.1], pos: [-len * 0.34, 0.5, 0], color: '#2b333f' },
  ];

  /**
   * VELA MAYOR en tres escalones de anchura decreciente: un rectángulo plano se
   * leía como una valla publicitaria blanca plantada en el barco. Escalonada da
   * la silueta triangular de una vela sin salirse de las cajas, y va girada un
   * pelín en Y para que la cámara isométrica le pille algo de canto en vez de
   * una cara plana.
   */
  const escalones: Array<[number, number, number]> = [
    [1.4, 0.42, 0.0],
    [0.95, 0.38, 0.42],
    [0.5, 0.34, 0.8],
  ];
  let y = pie;
  for (const [ancho, alto, subida] of escalones) {
    void subida;
    parts.push({
      size: [ancho, alto, 0.05],
      // La caída (borde de popa) escalona; la relinga queda pegada al palo
      pos: [palo - ancho / 2 - 0.05, y + alto / 2, 0],
      rot: [0, 0.2, 0],
      color: '#eef3f7',
    });
    y += alto;
  }
  // Banda de color al pie de la mayor — remata la vela y la ata al casco. Va
  // algo MÁS CORTA que el primer escalón: con la misma medida y el mismo centro,
  // sus dos cantos caían en el plano de la vela y el tramo que se solapa peleaba
  // por el píxel (`scripts/zfight-deep.ts`).
  parts.push({ size: [1.32, 0.1, 0.06], pos: [palo - 0.77, pie + 0.1, 0], rot: [0, 0.2, 0], color: hull });
  // Foque pequeño por delante del palo
  parts.push({ size: [0.5, 0.75, 0.05], pos: [palo + 0.3, pie + 0.42, 0], rot: [0, 0.2, 0], color: '#dbe6ef' });
  return parts;
}

export function SailboatModel({ colorIndex = 0, boat }: { colorIndex?: number; boat?: Buoyant }) {
  const hull = SAIL_HULLS[colorIndex % SAIL_HULLS.length];
  const geo = useMemo(() => mergedBoxes(`sail:${hull}`, () => sailParts(hull)), [hull]);
  return (
    <>
      <FloatingBoat boat={boat}>
        <mesh geometry={geo} material={MERGED_STD} castShadow />
      </FloatingBoat>
      <Wake len={boatLen('sail')} beam={BEAM} />
    </>
  );
}

/* ---------------------------------------------------- yate / prácticos */

const YACHT_ACCENTS = [PALETTE.hpSky, PALETTE.safetyOrange, '#2f6d52', '#a63a2a'] as const;

/**
 * LANCHA DE PRÁCTICOS / yate. Casco blanco con franja de color, puente elevado
 * a proa y bañera despejada: la silueta rápida de la dársena.
 */
function yachtParts(accent: string): BoxPart[] {
  const len = boatLen('yacht');
  const open = boatOpen('yacht');
  return [
    ...hullParts(len, open, PALETTE.white, '#d8dee6'),
    // Franja de color a media altura del casco (a los dos costados)
    { size: [len * 0.82, 0.09, BEAM + 0.03], pos: [0, 0.19, 0], color: accent },
    // Puente + parabrisas inclinado, a proa del tramo abordable
    { size: [len * 0.22, 0.44, BEAM * 0.78], pos: [open + 0.4, 0.5, 0], color: PALETTE.white },
    { size: [0.06, 0.3, BEAM * 0.66], pos: [open + 0.18, 0.6, 0], rot: [0, 0, 0.35], color: '#20304a' },
    // Arco de radar y antena
    { size: [0.08, 0.5, BEAM * 0.7], pos: [open + 0.46, 0.95, 0], color: '#8a9ba8' },
    { size: [0.34, 0.05, 0.34], pos: [open + 0.46, 1.22, 0], color: '#8a9ba8' },
    // Asiento de bañera
    { size: [0.3, 0.24, BEAM * 0.6], pos: [-open * 0.5, DECK_Y + 0.14, 0], color: '#20304a' },
  ];
}

export function YachtModel({ colorIndex = 0, boat }: { colorIndex?: number; boat?: Buoyant }) {
  const accent = YACHT_ACCENTS[colorIndex % YACHT_ACCENTS.length];
  const geo = useMemo(() => mergedBoxes(`yacht:${accent}`, () => yachtParts(accent)), [accent]);
  return (
    <>
      <FloatingBoat boat={boat}>
        <mesh geometry={geo} material={MERGED_STD} castShadow />
      </FloatingBoat>
      <Wake len={boatLen('yacht')} beam={BEAM} />
    </>
  );
}

/* ------------------------------------------------------------ pesquero */

const FISH_HULLS = ['#2f6d52', '#a63a2a', '#1f4f7a', '#c9861e'] as const;

/**
 * PESQUERO. Al revés que el remolcador: la caseta va a POPA y la cubierta de
 * trabajo (la pisable) queda a proa, con su pluma y su tambor de red.
 */
function fishParts(hull: string): BoxPart[] {
  const len = boatLen('fish');
  const open = boatOpen('fish');
  return [
    ...hullParts(len, open, hull, '#8a6f4e'),
    // Caseta a popa + chimenea. La caseta va MÁS ESTRECHA que la cubierta
    // (BEAM*0.8): con la misma manga, sus costados caían en el mismo plano que
    // el canto de la cubierta y la regala parpadeaba en todo el tramo donde se
    // solapan. Medido con `scripts/zfight-parts.ts`.
    { size: [len * 0.18, 0.5, BEAM * 0.74], pos: [-open - 0.42, 0.48, 0], color: PALETTE.white },
    { size: [len * 0.12, 0.22, BEAM * 0.56], pos: [-open - 0.42, 0.8, 0], color: '#3a6ea8' },
    { size: [0.16, 0.3, 0.16], pos: [-open - 0.75, 0.62, 0], color: hull },
    // Pluma de pesca a proa, fuera del tramo abordable
    { size: [0.1, 1.9, 0.1], pos: [open + 0.35, 1.2, 0], color: '#c9a94a' },
    { size: [len * 0.3, 0.07, 0.07], pos: [open + 0.05, 1.85, 0], rot: [0, 0, -0.3], color: '#c9a94a' },
    // Tambor de red y cajas de pescado en cubierta
    { size: [0.34, 0.34, BEAM * 0.66], pos: [open - 0.15, DECK_Y + 0.18, 0], color: '#5c6773' },
    { size: [0.3, 0.16, 0.28], pos: [-open * 0.3, DECK_Y + 0.1, BEAM * 0.22], color: PALETTE.hpSky },
    // Defensas de flotador a los costados. Rematan en 0.24, por DEBAJO de
    // HULL_TOP (0.29): estaban a ras, o sea dos caras mirando arriba a la misma
    // altura pisando el mismo trozo de planta — la regala parpadeaba moteada al
    // mover la cámara. Es el mismo cuidado que ya tenía el remolcador.
    { size: [len * 0.6, 0.1, 0.08], pos: [0, 0.19, BEAM / 2], color: PALETTE.safetyOrange },
    { size: [len * 0.6, 0.1, 0.08], pos: [0, 0.19, -BEAM / 2], color: PALETTE.safetyOrange },
  ];
}

export function FishingBoatModel({ colorIndex = 0, boat }: { colorIndex?: number; boat?: Buoyant }) {
  const hull = FISH_HULLS[colorIndex % FISH_HULLS.length];
  const geo = useMemo(() => mergedBoxes(`fish:${hull}`, () => fishParts(hull)), [hull]);
  return (
    <>
      <FloatingBoat boat={boat}>
        <mesh geometry={geo} material={MERGED_STD} castShadow />
      </FloatingBoat>
      <Wake len={boatLen('fish')} beam={BEAM} />
    </>
  );
}

/** Palmera low-poly (áreas verdes de ECV) — bloqueo de la zona cruceros */
function palmParts(): BoxPart[] {
  const parts: BoxPart[] = [];
  // Tronco ligeramente inclinado en segmentos
  for (const seg of [0, 1, 2]) {
    parts.push({ size: [0.18, 0.55, 0.18], pos: [seg * 0.06, 0.3 + seg * 0.5, 0], color: '#8a6a48' });
  }
  // Corona de hojas
  for (let i = 0; i < 6; i++) {
    const angle = (i / 6) * Math.PI * 2;
    parts.push({
      size: [0.85, 0.05, 0.28],
      pos: [0.12 + Math.cos(angle) * 0.42, 1.75, Math.sin(angle) * 0.42],
      rot: [Math.sin(angle) * 0.5, -angle, -0.5 - Math.cos(angle) * 0.2],
      color: '#2e9e5b',
    });
  }
  parts.push({ size: [0.22, 0.18, 0.22], pos: [0.12, 1.72, 0], color: '#7a5c3e' });
  return parts;
}

export function PalmTree({ height }: { height: number }) {
  const geo = useMemo(() => mergedBoxes('palm', palmParts), []);
  return (
    <group scale={0.85 + height * 0.15}>
      <mesh geometry={geo} material={MERGED_STD} />
    </group>
  );
}

/* ============== DIQUE MAYOR (astillero) — el tapón monumental ============ */

/** Ancho jugable del tablero, que es lo que ocupa el dique de lado a lado */
const MEGADOCK_W = (BALANCE.MAX_TILE - BALANCE.MIN_TILE + 1) * BALANCE.TILE;
/** Andamiaje del dique: mismo amarillo que los andamios decorativos grandes */
const MEGADOCK_SCAFF = '#c9a94a';

/**
 * DIQUE MAYOR — misma factura que los diques decorativos de los costados (los
 * "grandotes"): casco de obra viva en óxido, GRAN LOSA GRIS de cubierta con
 * casetas encima, y andamiaje amarillo de varios niveles pegado al casco, con
 * lámparas de obra encendidas. Una sola geometría por fila; los segmentos de
 * DockData son colisión, no dibujo.
 *
 * Alturas: casco 0.15→1.5, CUBIERTA →2.05, casetas →2.55. Las pasarelas de
 * cruce van a MEGADOCK_WALK_Y (2.8): POR ENCIMA del buque ENTERO —casetas
 * incluidas—, con sus torres apoyadas en los bordes de la fila (z ±0.5), fuera
 * de la manga del casco (±0.39). El lanzamiento de la grúa vuela a 4.2.
 *
 * OJO al tope de 2.55: las pasarelas se sortean entre las columnas ±3…±6, o
 * sea x = ±3.3…±6.6 con medio tablón de 0.51, así que CUALQUIER caseta que
 * pase de |x| = 2.79 cae debajo de un tablón. Subir una caseta por encima de
 * 2.55 obliga a subir MEGADOCK_WALK_Y (ver el comentario en balance.ts).
 */
function megaDockParts(): BoxPart[] {
  const w = MEGADOCK_W;
  const wall = '#55606e';
  const rust = '#7a4033';
  const parts: BoxPart[] = [];

  // Muros del foso sobre los bordes de la fila + coronación ámbar (imagen)
  for (const s of [-1, 1]) {
    parts.push({ size: [w, 0.78, 0.14], pos: [0, 0.39, s * 0.48], color: wall });
    parts.push({ size: [w, 0.07, 0.22], pos: [0, 0.82, s * 0.48], color: '#b89a3e' });
  }
  // Fondo del foso y picaderos
  parts.push({ size: [w, 0.06, 0.84], pos: [0, -0.12, 0], color: '#2b333f' });
  for (let x = -6; x <= 6; x += 2) {
    parts.push({ size: [0.7, 0.24, 0.5], pos: [x, 0.0, 0], color: '#3a4658' });
  }

  // EL BUQUE GRANDOTE — casco óxido y gran losa de cubierta gris (imagen)
  const L = 11.2;
  parts.push({ size: [L, 1.35, 0.74], pos: [0, 0.82, 0], color: rust });
  parts.push({ size: [0.62, 1.35, 0.62], pos: [L / 2, 0.82, 0], rot: [0, Math.PI / 4, 0], color: rust });
  parts.push({ size: [0.5, 1.2, 0.7], pos: [-L / 2 - 0.18, 0.78, 0], color: rust });
  // La cubierta sobresale del casco por los dos costados, como en la imagen
  parts.push({ size: [L + 0.5, 0.5, 0.86], pos: [0, 1.8, 0], color: '#9aa4ad' });
  // Casetas de cubierta: bloques claros + uno azul (la seña de la imagen)
  parts.push({ size: [1.7, 0.5, 0.6], pos: [-1.2, 2.3, 0], color: '#c9ced6' });
  parts.push({ size: [1.1, 0.42, 0.56], pos: [0.9, 2.26, 0], color: '#c9ced6' });
  parts.push({ size: [0.5, 0.5, 0.5], pos: [2.2, 2.3, 0], color: '#3a6ea8' });
  parts.push({ size: [0.9, 0.4, 0.5], pos: [-3.2, 2.25, 0], color: '#aeb6c0' });

  // ANDAMIAJE AMARILLO de tres niveles pegado al casco, por los dos costados
  for (const sz of [-1, 1]) {
    const z = sz * 0.44;
    for (const nivel of [0.55, 1.1, 1.65]) {
      parts.push({ size: [L * 0.9, 0.05, 0.16], pos: [0, nivel, z], color: MEGADOCK_SCAFF });
    }
    for (let x = -5; x <= 5; x += 1.6) {
      parts.push({ size: [0.06, 1.75, 0.06], pos: [x, 0.88, z], color: MEGADOCK_SCAFF });
    }
  }
  return parts;
}

/** Lámparas de obra del andamiaje — encendidas (material que brilla) */
function megaDockGlowParts(): BoxPart[] {
  const parts: BoxPart[] = [];
  for (const sz of [-1, 1]) {
    for (const x of [-3.8, 0.4, 4.2]) {
      parts.push({ size: [0.18, 0.12, 0.1], pos: [x, 1.78, sz * 0.46], color: '#ffe9a8' });
    }
  }
  return parts;
}

export function MegaDryDock() {
  const geo = useMemo(() => mergedBoxes('megadock', megaDockParts), []);
  const glow = useMemo(() => mergedBoxes('megadock:glow', megaDockGlowParts), []);
  return (
    <group>
      {/* `name` lo usa scripts/scaffold-shot.ts para comprobar que el buque no
          llega a la cota del tablón de las pasarelas */}
      <mesh name="megadock" geometry={geo} material={MERGED_STD} castShadow receiveShadow />
      <mesh geometry={glow} material={MERGED_GLOW} />
    </group>
  );
}

/**
 * PASARELA ALTA del dique: torre de andamio cuya plataforma cruza POR ENCIMA
 * del buque (MEGADOCK_WALK_Y > cubierta). Las patas van en los bordes de la
 * fila (z ±0.5), fuera de la manga del casco: la torre puede plantarse en
 * cualquier columna del dique sin atravesar el barco.
 */
function tallScaffoldParts(): BoxPart[] {
  const y = BALANCE.MEGADOCK_WALK_Y;
  const metal = MEGADOCK_SCAFF;
  const parts: BoxPart[] = [];
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      parts.push({ size: [0.08, y - 0.05, 0.08], pos: [sx * 0.4, (y - 0.05) / 2, sz * 0.5], color: metal });
    }
  }
  // Travesaños a dos alturas, repartidos por la torre (proporcionales a `y`:
  // con cotas fijas se quedaban en la mitad baja al subir la pasarela)
  for (const frac of [0.36, 0.68]) {
    for (const sz of [-1, 1]) {
      parts.push({ size: [0.86, 0.05, 0.05], pos: [0, y * frac, sz * 0.5], color: metal });
    }
  }
  // Plataforma de tablones que cruza la fila entera (lo que se pisa)
  parts.push({ size: [BALANCE.TILE - 0.08, 0.08, 1.16], pos: [0, y - 0.04, 0], color: '#a9855b' });
  // Rodapiés de seguridad a los dos lados del tablón
  for (const sx of [-1, 1]) {
    parts.push({ size: [0.06, 0.14, 1.16], pos: [sx * (BALANCE.TILE / 2 - 0.06), y + 0.05, 0], color: PALETTE.hpNavy });
  }
  return parts;
}

/** Franja reflectante de la pasarela: se tiene que ver desde lejos que AHÍ se cruza */
function tallScaffoldGlowParts(): BoxPart[] {
  const y = BALANCE.MEGADOCK_WALK_Y;
  return [-1, 1].map((sz) => ({
    size: [BALANCE.TILE - 0.1, 0.05, 0.05] as [number, number, number],
    pos: [0, y + 0.02, sz * 0.55] as [number, number, number],
    color: PALETTE.safetyOrange,
  }));
}

export function TallScaffold() {
  const frame = useMemo(() => mergedBoxes('tallscaffold', tallScaffoldParts), []);
  const glow = useMemo(() => mergedBoxes('tallscaffold:glow', tallScaffoldGlowParts), []);
  return (
    <group>
      <mesh geometry={frame} material={MERGED_STD} castShadow receiveShadow />
      <mesh geometry={glow} material={MERGED_GLOW} />
    </group>
  );
}

/**
 * GRÚA DEL DIQUE — la grúa AZUL de los diques grandotes, parada con el gancho
 * sobre el PUNTO DE EMBARQUE de la fila anterior (z +1.1 en coordenadas locales
 * de la fila del dique). No patrulla ni atropella: es la catapulta.
 *
 * Es una grúa de ORINQUE (torre giratoria), no un pórtico: la columna se planta
 * a un costado del pad y la pluma GIRA sobre ella para llevarse al colaborador
 * al otro lado del buque. Antes la columna estaba en la vertical del recorrido
 * y el izado entero se resolvía alargando el cable: la máquina se quedaba
 * quieta y el viaje no se leía como "me está llevando la grúa".
 *
 * Torre giratoria, carro, cable y gancho van SUELTOS de la geometría fusionada:
 * durante el izado siguen al colaborador (agarrar → izar → trasladar → aventar)
 * y el resto del tiempo la pluma queda encarada al pad con el gancho colgando.
 */
/** Alto de la columna. Da margen a la cota de izado: el gancho sube a
 *  CARRY_LIFT_Y + el largo del estrobo (1.66) y debe quedar BAJO la pluma. */
const DOCK_CRANE_H = 6.2;
/** Desplante de la torre respecto al PUNTO DE EMBARQUE. Una casilla EXACTA al
 *  costado: es lo que obliga a la pluma a girar ~38° para seguir al gancho, y
 *  al caer sobre la línea de una columna nunca pisa la torre de una pasarela
 *  (las pasarelas del dique guardan 2 casillas con el pad).
 *
 *  El costado es +X a propósito: con la cámara isométrica fija (offset
 *  5.2/9.2/6.4) la pluma queda entonces de PERFIL —barre de abajo-izquierda a
 *  arriba-izquierda— y el giro se ve. Al otro costado el arco cae casi en la
 *  vertical de pantalla: la pluma se solapa con la torre y la grúa se lee como
 *  un poste gordo, que es justo lo que se quería quitar. */
const MAST_X = BALANCE.TILE;
/** La torre se planta tras el muro del fondo, fuera del foso y del buque */
const MAST_Z = -0.66;
/** Alcance de la pluma. El gancho pide como mucho hypot(1.1, 1.76) = 2.08 en
 *  reposo; el resto es voladizo para que se vea pluma por delante del carro. */
const JIB_LEN = 2.5;
/** Reposo del gancho: a media altura sobre el pad, como botón de "súbete" */
const HOOK_REST_Z = 1.1;
const HOOK_REST_Y = 2.35;

/** Parte FIJA: torre y base, en coordenadas locales de la torre */
function dockCraneMastParts(): BoxPart[] {
  const blue = '#3a6ea8';
  const h = DOCK_CRANE_H;
  return [
    { size: [0.34, h, 0.34], pos: [0, h / 2, 0], color: blue },
    { size: [0.66, 0.22, 0.66], pos: [0, 0.11, 0], color: '#2f3a49' },
    // Riostras a media altura, para que la torre no sea un palo liso
    { size: [0.5, 0.12, 0.5], pos: [0, h * 0.45, 0], color: '#2f3a49' },
  ];
}

/**
 * Parte GIRATORIA: cabina de mando, pluma hacia +Z y contrapluma con
 * contrapeso hacia −Z. El contrapeso es lo que hace legible el giro — barre el
 * lado contrario al gancho y se ve desde cualquier ángulo de cámara.
 */
function dockCraneJibParts(): BoxPart[] {
  const blue = '#3a6ea8';
  const h = DOCK_CRANE_H;
  return [
    // Corona de giro + cabina
    { size: [0.52, 0.24, 0.52], pos: [0, h - 0.62, 0], color: '#2f3a49' },
    { size: [0.4, 0.36, 0.44], pos: [0, h - 0.72, 0.42], color: '#c9ced6' },
    // PLUMA hacia el gancho
    { size: [0.28, 0.28, JIB_LEN + 0.3], pos: [0, h - 0.15, (JIB_LEN + 0.3) / 2], color: blue },
    // CONTRAPLUMA + contrapeso
    { size: [0.24, 0.24, 1.15], pos: [0, h - 0.15, -0.62], color: blue },
    { size: [0.62, 0.5, 0.5], pos: [0, h - 0.3, -1.15], color: '#2f3a49' },
    // Tirante que ata la punta de la pluma a la torre (silueta de torre-grúa)
    { size: [0.1, 0.9, 0.1], pos: [0, h + 0.32, 0], color: blue },
  ];
}

export function DockPortalCrane({ rowIndex }: { rowIndex: number }) {
  const mastGeo = useMemo(() => mergedBoxes('dockcrane:mast', dockCraneMastParts), []);
  const jibGeo = useMemo(() => mergedBoxes('dockcrane:jib', dockCraneJibParts), []);
  const slew = useRef<THREE.Group>(null);
  const trolley = useRef<THREE.Mesh>(null);
  const cable = useRef<THREE.Mesh>(null);
  const hook = useRef<THREE.Mesh>(null);
  /** Z del gancho en coordenadas de la FILA (el mesh guarda ya el RADIO) */
  const hookZ = useRef(HOOK_REST_Z);

  useFrame((_, dt) => {
    const s = slew.current;
    const t = trolley.current;
    const c = cable.current;
    const h = hook.current;
    if (!s || !t || !c || !h) return;
    // ¿El izado en curso es de ESTA grúa? (el izado aterriza en dique + 1)
    const activo = runtime.carrying && runtime.toRow === rowIndex + 1;
    // Mientras no haya SOLTADO, el gancho va pegado al colaborador; tras el
    // aventón (o sin izado) vuelve suave a su reposo sobre el pad.
    const agarrado = activo && runtime.carryPhase < BALANCE.CARRY_RELEASE_FRAC;
    const zObj = agarrado ? runtime.z - rowZ(rowIndex) : HOOK_REST_Z;
    const yObj = agarrado ? runtime.y + 1.66 : HOOK_REST_Y;
    // Agarrado sigue DURO (el gancho es quien lo lleva); suelto, con pereza
    hookZ.current = THREE.MathUtils.damp(hookZ.current, zObj, agarrado ? 26 : 3.2, dt);
    const hy = THREE.MathUtils.damp(h.position.y, yObj, agarrado ? 26 : 2.4, dt);

    // GIRO DE LA TORRE: la pluma apunta siempre al gancho. Como la torre está
    // desplazada un costado, seguir al colaborador de la fila del pad a la de
    // aterrizaje obliga a barrer un arco — la grúa gira Y el carro entra.
    const dx = -MAST_X; // el gancho viaja por la columna del pad (x local 0)
    const dz = hookZ.current - MAST_Z;
    const radio = Math.min(JIB_LEN, Math.hypot(dx, dz));
    s.rotation.y = Math.atan2(dx, dz);
    // El carro corre por la pluma en la vertical del gancho, y el cable los une
    const topY = DOCK_CRANE_H - 0.32;
    t.position.z = radio;
    c.position.z = radio;
    h.position.z = radio;
    h.position.y = hy;
    c.position.y = (topY + hy + 0.13) / 2;
    c.scale.y = Math.max(0.05, topY - hy - 0.13);
  });

  const radioReposo = Math.hypot(MAST_X, HOOK_REST_Z - MAST_Z);
  return (
    <group position={[MAST_X, 0, MAST_Z]}>
      <mesh geometry={mastGeo} material={MERGED_STD} castShadow />
      {/* TORRE GIRATORIA: pluma, carro, cable y gancho giran como un cuerpo */}
      <group ref={slew} rotation={[0, Math.atan2(-MAST_X, HOOK_REST_Z - MAST_Z), 0]}>
        <mesh geometry={jibGeo} material={MERGED_STD} castShadow />
        {/* Carro sobre la pluma */}
        <mesh ref={trolley} position={[0, DOCK_CRANE_H - 0.38, radioReposo]} castShadow>
          <boxGeometry args={[0.42, 0.2, 0.46]} />
          <meshStandardMaterial color="#2f3a49" />
        </mesh>
        {/* Cable (caja unitaria escalada en Y entre carro y gancho) */}
        <mesh ref={cable} position={[0, (DOCK_CRANE_H - 0.32 + HOOK_REST_Y) / 2, radioReposo]}>
          <boxGeometry args={[0.045, 1, 0.045]} />
          <meshStandardMaterial color="#20304a" />
        </mesh>
        {/* BLOQUE DEL GANCHO naranja — brilla para leerse como "súbete aquí" */}
        <mesh ref={hook} position={[0, HOOK_REST_Y, radioReposo]}>
          <boxGeometry args={[0.3, 0.26, 0.3]} />
          <meshBasicMaterial color={PALETTE.safetyOrange} toneMapped={false} />
        </mesh>
      </group>
    </group>
  );
}

/**
 * PUNTO DE EMBARQUE: el pad marcado en la fila anterior al dique donde hay que
 * ponerse para que la grúa te aviente. Placa con marco de peligro ENCENDIDO —
 * es un botón en el suelo y se tiene que leer como tal desde lejos.
 */
export function LaunchPad() {
  const base = useMemo(
    () =>
      mergedBoxes('launchpad', () => [
        { size: [0.94, 0.05, 0.94], pos: [0, 0.03, 0], color: '#2f3a49' },
      ]),
    [],
  );
  const frame = useMemo(
    () =>
      mergedBoxes('launchpad:glow', () => {
        const parts: BoxPart[] = [];
        for (const sx of [-1, 1]) {
          parts.push({ size: [0.08, 0.06, 1.0], pos: [sx * 0.47, 0.04, 0], color: '#FFC627' });
          parts.push({ size: [1.0, 0.06, 0.08], pos: [0, 0.04, sx * 0.47], color: '#FFC627' });
        }
        return parts;
      }),
    [],
  );
  return (
    <group>
      <mesh geometry={base} material={MERGED_STD} receiveShadow />
      <mesh geometry={frame} material={MERGED_GLOW} />
    </group>
  );
}

/* ================== SUPER-ESTRUCTURAS MONUMENTALES (1 por bioma) ========= */

/**
 * Grúa STS (Ship-to-Shore) Super Post-Panamax — monumental, estática, en el
 * borde marítimo. Patas en el muelle y pluma (boom) extendida sobre el océano.
 * Low-poly deliberado: se instancia UNA vez por bioma (fila-ancla).
 */
function stsParts(color: string): BoxPart[] {
  const legH = 7.5;
  const boomLen = 9;
  const parts: BoxPart[] = [];
  // Patas dobles (pórtico)
  for (const z of [-1.1, 1.1]) {
    for (const x of [-1.2, 1.2]) {
      parts.push({ size: [0.4, legH, 0.4], pos: [x, legH / 2, z], color });
    }
  }
  parts.push({ size: [2.8, 0.3, 0.3], pos: [0, legH * 0.55, 0], color }); // travesaño
  // Viga principal + pluma sobre el mar, mástil y tirante
  parts.push({ size: [boomLen + 2.8, 0.5, 0.6], pos: [boomLen / 2 - 1.4, legH, 0], color });
  parts.push({ size: [0.3, 3.2, 0.3], pos: [0, legH + 1.6, 0], color });
  parts.push({ size: [boomLen * 0.72, 0.1, 0.1], pos: [boomLen * 0.3, legH + 1.1, 0], rot: [0, 0, -0.42], color: PALETTE.steel });
  // Cabina del operador + spreader colgando de la pluma
  parts.push({ size: [0.8, 0.6, 0.8], pos: [1.6, legH - 0.6, 0], color: PALETTE.white });
  parts.push({ size: [0.06, 3.2, 0.06], pos: [boomLen * 0.55, legH - 1.6, 0], color: '#0e1116' });
  parts.push({ size: [1.1, 0.16, 0.7], pos: [boomLen * 0.55, legH - 3.3, 0], color: PALETTE.safetyOrange });
  return parts;
}

export function STSCrane({ side = 1, color = PALETTE.hpNavy }: { side?: 1 | -1; color?: string }) {
  const geo = useMemo(() => mergedBoxes(`sts:${color}`, () => stsParts(color)), [color]);
  const beacon = useMemo(
    () =>
      mergedBoxes('sts:beacon', () => [
        { size: [0.16, 0.16, 0.16] as [number, number, number], pos: [0, 10.9, 0] as [number, number, number], color: PALETTE.glowBad },
      ]),
    [],
  );
  return (
    <group position={[side * colX(12), 0, 0]} rotation={[0, side === 1 ? 0 : Math.PI, 0]}>
      <mesh geometry={geo} material={MERGED_STD} castShadow />
      {/* Baliza aérea */}
      <mesh geometry={beacon} material={MERGED_GLOW} />
    </group>
  );
}

/**
 * Grúa RMG intermodal (TILH) — pórtico sobre rieles que abarca el ancho del
 * tablero y ~3 filas de profundidad; el jugador pasa por debajo. Estática,
 * una por bioma ferroviario (fila-ancla).
 */
function rmgParts(): BoxPart[] {
  const legX = colX(BALANCE.MAX_TILE) + 1.2;
  const beamY = 5.2;
  const depth = 3 * BALANCE.TILE;
  const color = '#FFC627';
  const parts: BoxPart[] = [];
  for (const x of [-legX, legX]) {
    for (const z of [-depth / 2, depth / 2]) {
      parts.push({ size: [0.45, beamY, 0.45], pos: [x, beamY / 2, z], color });
    }
    // Viga longitudinal sobre rieles
    parts.push({ size: [0.5, 0.25, depth + 0.8], pos: [x, 0.3, 0], color });
  }
  // Doble viga transversal superior
  for (const z of [-depth / 2, depth / 2]) {
    parts.push({ size: [legX * 2 + 0.6, 0.5, 0.4], pos: [0, beamY, z], color });
  }
  // Trolley
  parts.push({ size: [1.0, 0.4, depth + 0.4], pos: [colX(-3), beamY + 0.4, 0], color: PALETTE.white });
  parts.push({ size: [0.05, 1.6, 0.05], pos: [colX(-3), beamY - 0.8, 0], color: '#0e1116' });
  return parts;
}

export function RMGCrane() {
  const geo = useMemo(() => mergedBoxes('rmg', rmgParts), []);
  return (
    <group>
      <mesh geometry={geo} material={MERGED_STD} castShadow />
      {/* Contenedor colgado del trolley (textura propia) */}
      <group position={[colX(-3), 5.2 - 1.9, 0]}>
        <ContainerBox size={[1.0, 0.95, 1.0]} color={PALETTE.sunsetOrange} />
      </group>
    </group>
  );
}

/* ===================== BIOMA TNG (Astillero Naval) ======================= */

function dryDockParts(side: 1 | -1): BoxPart[] {
  const len = 5;
  const wall = '#55606e';
  const rust = '#8b3a2a';
  const parts: BoxPart[] = [];
  // Muros del dique (dársena en U alrededor del casco)
  for (const x of [-2.6, 2.6]) parts.push({ size: [0.7, 1.1, len + 2.2], pos: [x, 0.55, 0], color: wall });
  for (const s of [-1, 1]) parts.push({ size: [5.9, 1.1, 0.7], pos: [0, 0.55, (s * (len + 2.2)) / 2], color: wall });
  // Fondo del dique (más bajo que el patio) y picaderos
  parts.push({ size: [5.2, 0.08, len + 1.6], pos: [0, -0.18, 0], color: '#2b333f' });
  for (const z of [-3, 0, 3]) parts.push({ size: [2.2, 0.5, 0.8], pos: [0, 0.2, z], color: '#3a4658' });
  // BARCO en reparación: casco bajo rojo óxido + obra muerta gris APILADOS
  // (sin caras coplanares → sin z-fighting)
  parts.push({ size: [3.0, 1.5, len], pos: [0, 1.35, 0], color: rust });
  parts.push({ size: [2.8, 0.7, len - 0.3], pos: [0, 2.45, 0], color: '#7d8791' });
  // Proa (diamante) y popa achatada — silueta de barco
  parts.push({ size: [2.1, 1.5, 2.1], pos: [0, 1.35, len / 2], rot: [0, Math.PI / 4, 0], color: rust });
  parts.push({ size: [2.4, 1.5, 0.7], pos: [0, 1.35, -len / 2 - 0.3], color: rust });
  // Superestructura blanca + chimenea (a popa)
  parts.push({ size: [1.9, 0.8, 1.7], pos: [0, 3.2, -len * 0.25], color: PALETTE.white });
  parts.push({ size: [0.5, 0.5, 0.5], pos: [0, 3.85, -len * 0.32], color: PALETTE.hpSky });
  // Andamios metálicos junto al casco
  const sx = side === -1 ? 1.9 : -1.9;
  for (const z of [-len * 0.35, 0, len * 0.35]) {
    for (const y of [0.6, 1.5, 2.4]) parts.push({ size: [0.5, 0.05, 1.6], pos: [sx, y, z], color: '#c9a94a' });
    for (const zz of [-0.7, 0.7]) parts.push({ size: [0.05, 2.9, 0.05], pos: [sx, 1.4, z + zz], color: '#c9a94a' });
  }
  return parts;
}

/** Coronación con franja de seguridad del dique seco */
function dryDockCopingParts(): BoxPart[] {
  const len = 5;
  return [-2.6, 2.6].map((x) => ({
    size: [0.72, 0.08, len + 2.2] as [number, number, number],
    pos: [x, 1.14, 0] as [number, number, number],
    color: '#7a6218',
  }));
}

export function DryDockShip({ side = -1 }: { side?: 1 | -1 }) {
  const geo = useMemo(() => mergedBoxes(`drydock:${side}`, () => dryDockParts(side)), [side]);
  const coping = useMemo(() => mergedBoxes('drydock:cop', dryDockCopingParts), []);
  return (
    <group position={[side * colX(14), 0, 0]}>
      <mesh geometry={geo} material={MERGED_STD} receiveShadow />
      <mesh geometry={coping} material={MERGED_GLOW} />
    </group>
  );
}

/**
 * DIQUE VERTICAL JUGABLE: el foso corre A LO LARGO del recorrido — `widthCols`
 * columnas de ancho por `lenRows` filas de fondo, como un dique seco de verdad
 * (excavado perpendicular al muelle). MISMA FACTURA que el dique mayor: muros
 * altos con coronación ámbar, foso hundido y (si hay eslora) un buque
 * monumental en reparación. Se dibuja UNA pieza desde la fila cabeza,
 * extendida hacia adelante (−z); la cruza la CADENA DE ANDAMIOS.
 */
function vDockParts(widthCols: number, lenRows: number, flooded: boolean): BoxPart[] {
  const w = widthCols * BALANCE.TILE - 0.12; // ancho (X)
  const d = lenRows * BALANCE.TILE - 0.1; // fondo (Z): varias filas
  const wall = '#55606e';
  const parts: BoxPart[] = [
    // Interior: hundido en seco o INUNDADO (compuerta abierta)
    { size: [w - 0.3, 0.05, d - 0.3], pos: [0, flooded ? -0.04 : -0.18, 0], color: flooded ? '#1266a0' : '#181f29' },
  ];
  // Muros perimetrales ALTOS (media cota del andamio: imponen sin tapar la
  // cadena de pasarelas, que cruza a SCAFFOLD_Y)
  const wallH = 0.5;
  for (const s of [-1, 1]) {
    parts.push({ size: [w, wallH, 0.16], pos: [0, wallH / 2, (s * (d - 0.16)) / 2], color: wall });
    parts.push({ size: [0.16, wallH, d], pos: [(s * (w - 0.16)) / 2, wallH / 2, 0], color: wall });
  }
  if (!flooded) {
    // Picaderos a lo largo de la eslora: lo que sostiene la quilla en seco
    const n = lenRows * 2;
    for (let i = 0; i < n; i++) {
      parts.push({ size: [w * 0.45, 0.24, 0.5], pos: [0, -0.03, -d / 2 + (i + 0.5) * (d / n)], color: '#3a4658' });
    }
  }
  return parts;
}

/**
 * BUQUE MONUMENTAL del dique vertical — la misma factura que el del dique
 * mayor (casco de obra viva en óxido, GRAN LOSA GRIS de cubierta con casetas,
 * andamiaje amarillo de tres niveles pegado a los costados), pero con la
 * eslora A LO LARGO del foso (eje Z). `beam` depende del ancho del foso.
 */
/** Lado de la caja girada 45° que hace de roda, en fracción de manga */
const VDOCK_BOW_SIDE = 0.55;

/**
 * ENCAJE DEL BUQUE EN LA ESLORA DEL FOSO. Antes la eslora era una fracción fija
 * del fondo (0.78·d) y la roda —una caja girada 45°, que asoma manga·0.71 por
 * delante del casco— se salía del muro más de una casilla. Con dos diques
 * seguidos, esa proa entraba en el foso vecino y los dos se leían como uno
 * solo. Ahora la eslora se DESPEJA de la restricción: casco + roda + popa tiene
 * que caber en el fondo con aire contra los muros.
 */
function vDockShipFit(lenRows: number, beam: number) {
  const d = lenRows * BALANCE.TILE - 0.1; // fondo del foso (Z)
  const bow = beam * VDOCK_BOW_SIDE * Math.SQRT1_2; // vuelo de la roda
  const stern = 0.43; // vuelo de la popa achatada
  const L = Math.max(1.6, d - 0.44 - bow - stern); // eslora del casco
  // La eslora TOTAL es asimétrica (roda larga, popa corta): se corre el casco
  // para que el conjunto quede centrado en el foso.
  return { L, bow, stern, zOff: (stern - bow) / 2 };
}

function vDockShipParts(lenRows: number, beam: number): BoxPart[] {
  const { L, zOff } = vDockShipFit(lenRows, beam);
  const rust = '#7a4033';
  const parts: BoxPart[] = [
    // Casco: obra viva de óxido, proa en diamante y popa achatada
    { size: [beam, 1.35, L], pos: [0, 0.82, zOff], color: rust },
    {
      size: [beam * VDOCK_BOW_SIDE, 1.35, beam * VDOCK_BOW_SIDE],
      pos: [0, 0.82, zOff + L / 2],
      rot: [0, Math.PI / 4, 0],
      color: rust,
    },
    { size: [beam * 0.92, 1.2, 0.5], pos: [0, 0.78, zOff - L / 2 - 0.18], color: rust },
    // La GRAN LOSA de cubierta sobresale del casco, pero SOLO un poco: con
    // vuelo generoso, desde la cámara isométrica tapaba el casco de óxido y el
    // andamiaje entero, y el buque se leía como un bloque gris flotando.
    { size: [beam + 0.12, 0.5, L + 0.12], pos: [0, 1.8, zOff], color: '#9aa4ad' },
    // Casetas de cubierta: bloques claros + uno azul (la seña del dique mayor)
    { size: [beam * 0.66, 0.5, L * 0.2], pos: [0, 2.3, zOff - L * 0.2], color: '#c9ced6' },
    { size: [beam * 0.5, 0.42, L * 0.13], pos: [0, 2.26, zOff + L * 0.1], color: '#c9ced6' },
    { size: [0.5, 0.5, 0.5], pos: [0, 2.3, zOff + L * 0.32], color: '#3a6ea8' },
    { size: [beam * 0.45, 0.4, L * 0.1], pos: [0, 2.25, zOff - L * 0.42], color: '#aeb6c0' },
  ];
  // Andamiaje amarillo de tres niveles pegado al casco, por los dos costados
  for (const sx of [-1, 1]) {
    const x = sx * (beam / 2 + 0.09);
    for (const nivel of [0.55, 1.1, 1.65]) {
      parts.push({ size: [0.16, 0.05, L * 0.9], pos: [x, nivel, zOff], color: MEGADOCK_SCAFF });
    }
    for (let z = -L * 0.42; z <= L * 0.42; z += 1.4) {
      parts.push({ size: [0.06, 1.75, 0.06], pos: [x, 0.88, zOff + z], color: MEGADOCK_SCAFF });
    }
  }
  return parts;
}

/** Lámparas de obra del andamiaje del buque — encendidas, como en el mayor */
function vDockShipGlowParts(lenRows: number, beam: number): BoxPart[] {
  const { L, zOff } = vDockShipFit(lenRows, beam);
  const parts: BoxPart[] = [];
  for (const sx of [-1, 1]) {
    for (const f of [-0.3, 0.12, 0.38]) {
      parts.push({ size: [0.16, 0.11, 0.1], pos: [sx * (beam / 2 + 0.11), 1.78, zOff + f * L], color: '#ffe9a8' });
    }
  }
  return parts;
}

/** Coronación ÁMBAR perimetral sobre los muros, como la del dique mayor.
 *  Emisividad contenida: hay dique en buena parte de las filas del astillero
 *  y a plena potencia el bloom convertía el patio en una parrilla de barras. */
function vDockCopingParts(widthCols: number, lenRows: number): BoxPart[] {
  const w = widthCols * BALANCE.TILE - 0.12;
  const d = lenRows * BALANCE.TILE - 0.1;
  const parts: BoxPart[] = [];
  for (const s of [-1, 1]) {
    parts.push({ size: [w, 0.06, 0.2], pos: [0, 0.53, (s * (d - 0.16)) / 2], color: '#b89a3e' });
    parts.push({ size: [0.2, 0.06, d], pos: [(s * (w - 0.16)) / 2, 0.53, 0], color: '#b89a3e' });
  }
  return parts;
}

export function VerticalDock({
  widthCols,
  lenRows,
  flooded = false,
  ship = false,
  bridgeX,
}: {
  widthCols: number;
  lenRows: number;
  flooded?: boolean;
  ship?: boolean;
  /** X local (respecto al centro de la banda) de la cadena de andamios */
  bridgeX?: number;
}) {
  const body = useMemo(
    () => mergedBoxes(`vdock:${widthCols}:${lenRows}:${flooded}`, () => vDockParts(widthCols, lenRows, flooded)),
    [widthCols, lenRows, flooded],
  );
  const coping = useMemo(
    () => mergedBoxes(`vdock:cop:${widthCols}:${lenRows}`, () => vDockCopingParts(widthCols, lenRows)),
    [widthCols, lenRows],
  );
  // El buque monumental se apea A LO LARGO del foso, arrimado al costado
  // contrario de la cadena de andamios para que la pasarela no lo atraviese.
  // La MANGA se come casi todas las columnas libres (las que no son pasarela),
  // dejando solo el aire del andamiaje: un casco estrecho en un foso ancho se
  // leía como una torre, no como el buque en reparación de la referencia.
  // (deja ~0.4 de aire por costado para el andamiaje, sin rozar la pasarela)
  const beam = Math.min((widthCols - 1) * BALANCE.TILE - 0.8, 3.3);
  const vessel = useMemo(
    () => (ship ? mergedBoxes(`vdockShip:${lenRows}:${beam}`, () => vDockShipParts(lenRows, beam)) : null),
    [ship, lenRows, beam],
  );
  const vesselGlow = useMemo(
    () => (ship ? mergedBoxes(`vdockShip:glow:${lenRows}:${beam}`, () => vDockShipGlowParts(lenRows, beam)) : null),
    [ship, lenRows, beam],
  );
  const zC = -((lenRows - 1) * BALANCE.TILE) / 2; // centro del foso respecto a la fila cabeza
  // Centro de las columnas SIN pasarela: el buque se aparta media casilla del
  // costado de la cadena de andamios (encaje comprobado en scripts/vdock-test)
  const vesselX = bridgeX === undefined || bridgeX === 0 ? 0 : (bridgeX > 0 ? -1 : 1) * (BALANCE.TILE / 2);
  return (
    <group>
      <group position={[0, 0, zC]}>
        <mesh geometry={body} material={MERGED_STD} castShadow receiveShadow />
        <mesh geometry={coping} material={MERGED_GLOW} />
        {vessel && (
          <group position={[vesselX, 0, 0]}>
            <mesh geometry={vessel} material={MERGED_STD} castShadow />
            {vesselGlow && <mesh geometry={vesselGlow} material={MERGED_GLOW} />}
          </group>
        )}
      </group>
      {/* CADENA DE ANDAMIOS: una pasarela por fila, todas en la misma columna */}
      {bridgeX !== undefined &&
        Array.from({ length: lenRows }, (_, k) => (
          <group key={k} position={[bridgeX, 0, -k * BALANCE.TILE]}>
            <Scaffold />
          </group>
        ))}
    </group>
  );
}

/* ------------------------------- astillero: andamios + grúa pórtico móvil */

/**
 * ANDAMIO TRANSITABLE: plataforma de tubo y tablón a `SCAFFOLD_Y`. Es el
 * refugio de las filas de grúa pórtico — el colaborador se sube encima y el
 * bloque de casco pasa por debajo.
 *
 * La geometría no es libre: el andamio es una PASARELA ESTRECHA (z ±0.35) para
 * que las patas de la grúa portal (z ±0.62) pasen por fuera, y su tablón queda
 * por encima del bloque de casco (0.55) para que este pase por debajo. De ahí
 * sale la regla legible "arriba estás a salvo".
 */
function scaffoldParts(): BoxPart[] {
  const y = BALANCE.SCAFFOLD_Y;
  const px = 0.42;
  const pz = 0.35;
  const metal = '#c9a94a';
  const parts: BoxPart[] = [];
  // Montantes. Rematan por DEBAJO de la cara del tablón (que está en `y`): a la
  // misma cota, las cuatro cabezas de tubo peleaban con él por el píxel.
  const poste = y - 0.05;
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      parts.push({ size: [0.07, poste, 0.07], pos: [sx * px, poste / 2, sz * pz], color: metal });
    }
  }
  // Travesaños y cruces de San Andrés en los dos costados
  for (const sz of [-1, 1]) {
    parts.push({ size: [px * 2, 0.05, 0.05], pos: [0, y * 0.55, sz * pz], color: metal });
    parts.push({ size: [y * 1.05, 0.04, 0.04], pos: [0, y * 0.5, sz * pz], rot: [0, 0, 0.62], color: metal });
  }
  // Tablón: la superficie que se pisa (borde superior justo en SCAFFOLD_Y)
  parts.push({ size: [BALANCE.TILE - 0.06, 0.07, pz * 2 + 0.14], pos: [0, y - 0.035, 0], color: '#a9855b' });
  // Escalerilla de acceso
  for (const h of [0.18, 0.38, 0.58]) {
    parts.push({ size: [0.12, 0.03, 0.28], pos: [px + 0.06, h, 0], color: metal });
  }
  return parts;
}

/** Rodapié de seguridad: al material que enciende el bloom */
function scaffoldGlowParts(): BoxPart[] {
  const y = BALANCE.SCAFFOLD_Y;
  return [-1, 1].map((sz) => ({
    size: [BALANCE.TILE - 0.06, 0.09, 0.04] as [number, number, number],
    pos: [0, y + 0.05, sz * 0.4] as [number, number, number],
    color: PALETTE.safetyOrange,
  }));
}

export function Scaffold() {
  const frame = useMemo(() => mergedBoxes('scaffold', scaffoldParts), []);
  const glow = useMemo(() => mergedBoxes('scaffold:glow', scaffoldGlowParts), []);
  return (
    <group>
      <mesh geometry={frame} material={MERGED_STD} castShadow receiveShadow />
      <mesh geometry={glow} material={MERGED_GLOW} />
    </group>
  );
}

/**
 * GRÚA PORTAL DE TALLER: la máquina entera recorre la fila. Es el peligro del
 * astillero y su geometría está atada a la del andamio:
 *
 *  - patas a z ±0.62 → pasan POR FUERA de la pasarela del andamio (z ±0.35)
 *  - viga superior a 2.6 → por ENCIMA del colaborador subido al andamio (2.28)
 *  - bloque de casco a ras de suelo (tope 0.55) → por DEBAJO del tablón (0.59)
 *
 * Así la grúa atraviesa la casilla del andamio sin tocar ni la estructura ni a
 * quien esté encima: refugiarse funciona, quedarse en el suelo no.
 *
 * No cuelga de cables a propósito: cualquier cable tendría que cruzar el tablón
 * del andamio. El bloque va apeado en un transportador bajo, y el gancho de la
 * grúa queda recogido en alto.
 */
function gantryParts(): BoxPart[] {
  const beamY = 2.6;
  const legZ = 0.62;
  const legX = 0.78;
  const steel = PALETTE.sunsetOrange;
  const parts: BoxPart[] = [];
  // PORTAL: cuatro patas por fuera de la pasarela + bogies sobre el carril
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      parts.push({ size: [0.16, beamY, 0.16], pos: [sx * legX, beamY / 2, sz * legZ], color: steel });
      parts.push({ size: [0.42, 0.24, 0.26], pos: [sx * legX, 0.12, sz * legZ], color: '#2b333f' });
    }
  }
  // Vigas superiores + travesaño
  for (const sz of [-1, 1]) {
    parts.push({ size: [legX * 2 + 0.4, 0.24, 0.2], pos: [0, beamY, sz * legZ], color: steel });
  }
  parts.push({ size: [0.7, 0.16, legZ * 2], pos: [0, beamY + 0.2, 0], color: steel });
  // Cabina del operador, colgada de la viga
  parts.push({ size: [0.5, 0.44, 0.36], pos: [legX * 0.7, beamY - 0.42, legZ], color: PALETTE.white });
  // Gancho recogido en alto: nunca baja a la altura del andamio
  for (const sz of [-1, 1]) {
    parts.push({ size: [0.03, 0.9, 0.03], pos: [0, beamY - 0.45, sz * 0.55], color: '#0e1116' });
  }
  parts.push({ size: [0.3, 0.14, 0.5], pos: [0, beamY - 0.95, 0], color: '#FFC627' });
  // Transportador: chasis bajo + ruedas
  parts.push({ size: [1.9, 0.16, 0.5], pos: [0, 0.09, 0], color: '#2b333f' });
  for (const x of [-0.7, -0.24, 0.24, 0.7]) {
    for (const z of [-0.22, 0.22]) {
      parts.push({ size: [0.14, 0.14, 0.08], pos: [x, 0.06, z], color: '#14181f' });
    }
  }
  // BLOQUE DE CASCO en imprimación (la silueta que hay que esquivar)
  parts.push({ size: [1.72, 0.36, 0.46], pos: [0, 0.36, 0], color: '#8b3a2a' });
  parts.push({ size: [1.5, 0.06, 0.4], pos: [0, 0.53, 0], color: '#7d8791' });
  for (const x of [-0.55, 0, 0.55]) {
    parts.push({ size: [0.07, 0.38, 0.48], pos: [x, 0.36, 0], color: '#6f5148' });
  }
  return parts;
}

export function GantryLoad() {
  const beacon = useRef<THREE.MeshStandardMaterial>(null);
  const t = useRef(Math.random() * 10);
  useFrame((_, dt) => {
    t.current += dt;
    if (beacon.current) beacon.current.emissiveIntensity = Math.sin(t.current * 7) > 0 ? 1.5 : 0.15;
  });

  const body = useMemo(() => mergedBoxes('gantry', gantryParts), []);
  const stripe = useMemo(
    () =>
      mergedBoxes('gantry:glow', () => [
        { size: [1.74, 0.07, 0.52] as [number, number, number], pos: [0, 0.2, 0] as [number, number, number], color: '#FFC627' },
      ]),
    [],
  );

  return (
    <group>
      <mesh geometry={body} material={MERGED_STD} castShadow />
      {/* Franja de peligro del bloque */}
      <mesh geometry={stripe} material={MERGED_GLOW} />
      {/* Baliza de aviso: parpadea, así que necesita material propio */}
      <mesh position={[0.86, 0.62, 0]}>
        <boxGeometry args={[0.1, 0.14, 0.1]} />
        <meshStandardMaterial ref={beacon} color="#5a3a00" emissive={PALETTE.safetyOrange} emissiveIntensity={0.2} toneMapped={false} />
      </mesh>
    </group>
  );
}

/** Grúa de pluma (jib crane) del astillero — AZUL institucional, decorativa */
function jibParts(): BoxPart[] {
  const blue = PALETTE.hpSky;
  const navy = PALETTE.hpNavy;
  return [
    // Base giratoria (caja en vez de cilindro: a esta escala no se distingue y
    // permite fusionarla con el resto de la grúa)
    { size: [1.1, 0.5, 1.1], pos: [0, 0.25, 0], color: navy },
    { size: [0.35, 3.2, 0.35], pos: [0, 1.8, 0], color: blue },
    { size: [3.2, 0.22, 0.22], pos: [1.4, 3.3, 0], rot: [0, 0, -0.35], color: blue },
    // Contrapeso, cable y gancho
    { size: [0.7, 0.5, 0.5], pos: [-0.8, 2.9, 0], color: navy },
    { size: [0.04, 1.0, 0.04], pos: [2.7, 2.4, 0], color: '#0e1116' },
    { size: [0.5, 0.3, 0.5], pos: [2.7, 1.8, 0], color: PALETTE.safetyOrange },
  ];
}

/**
 * La grúa NO se coloca sola: la posiciona quien la usa, con la columna que le
 * asigna el generador de decorado. Antes se anclaba a `colX(10.5)`, así que
 * todas las grúas del bioma caían en la misma X y las de filas contiguas se
 * atravesaban entre sí.
 */
export function JibCrane({ side = 1 }: { side?: 1 | -1 }) {
  const geo = useMemo(() => mergedBoxes('jib', jibParts), []);
  return (
    <group rotation={[0, side === 1 ? Math.PI * 0.75 : Math.PI * 0.25, 0]}>
      <mesh geometry={geo} material={MERGED_STD} />
    </group>
  );
}

/** Almacén/nave industrial del astillero — techo a dos aguas y portón */
function warehouseParts(accent: string): BoxPart[] {
  return [
    { size: [4.2, 2.0, 3.2], pos: [0, 1.0, 0], color: PALETTE.steel },
    // Techo a dos aguas (dos faldones)
    { size: [2.5, 0.14, 3.4], pos: [-1.05, 2.35, 0], rot: [0, 0, 0.36], color: PALETTE.hpNavy },
    { size: [2.5, 0.14, 3.4], pos: [1.05, 2.35, 0], rot: [0, 0, -0.36], color: PALETTE.hpNavy },
    // Portón + banda de color institucional (cajas planas: el plano suelto
    // costaba una malla más y aquí no se ve la diferencia)
    { size: [1.6, 1.5, 0.04], pos: [0, 0.8, 1.62], color: '#2b333f' },
    { size: [4.0, 0.3, 0.04], pos: [0, 1.85, 1.62], color: accent },
  ];
}

export function Warehouse({ colorIndex = 0 }: { colorIndex?: number }) {
  const accent = VEHICLE_COLORS[colorIndex % VEHICLE_COLORS.length];
  const geo = useMemo(() => mergedBoxes(`wh:${accent}`, () => warehouseParts(accent)), [accent]);
  const lamp = useMemo(
    () =>
      mergedBoxes('wh:lamp', () => [
        { size: [0.5, 0.08, 0.06] as [number, number, number], pos: [0, 1.62, 1.65] as [number, number, number], color: '#fff2c4' },
      ]),
    [],
  );
  return (
    <group>
      <mesh geometry={geo} material={MERGED_STD} />
      {/* Luminaria del portón */}
      <mesh geometry={lamp} material={MERGED_GLOW} />
    </group>
  );
}

/** Pieza de astillero como bloqueo de casilla: hélice o sección de casco */
function propellerParts(): BoxPart[] {
  const parts: BoxPart[] = [
    { size: [0.8, 0.4, 0.8], pos: [0, 0.2, 0], color: '#3a4658' },
    { size: [0.28, 0.3, 0.28], pos: [0, 0.9, 0], rot: [Math.PI / 2, 0, 0], color: '#b08d3f' },
  ];
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2;
    parts.push({
      size: [0.34, 0.5, 0.06],
      pos: [Math.cos(a) * 0.34, 0.9 + Math.sin(a) * 0.34, 0],
      rot: [0, 0.5, a],
      color: '#c9a256',
    });
  }
  return parts;
}

function hullSectionParts(height: number): BoxPart[] {
  return [
    { size: [0.9, 0.9 * height, 0.7], pos: [0, 0.45 * height, 0], color: '#8b3a2a' },
    { size: [0.95, 0.08, 0.75], pos: [0, 0.9 * height + 0.05, 0], color: '#7d8791' },
  ];
}

export function ShipyardBlock({ height, colorIndex }: { height: number; colorIndex: number }) {
  const propeller = colorIndex % 2 === 0;
  const geo = useMemo(
    () =>
      propeller
        ? mergedBoxes('shipyardBlock:prop', propellerParts)
        : mergedBoxes(`shipyardBlock:hull:${height}`, () => hullSectionParts(height)),
    [propeller, height],
  );
  return <mesh geometry={geo} material={MERGED_STD} castShadow />;
}

/** Chispas de soldadura en loop (amarillo/naranja) — ambient del astillero */
export function WeldingSparks({ position }: { position: [number, number, number] }) {
  const points = useRef<THREE.Points>(null);
  const t = useRef(Math.random() * 10);
  const COUNT = 14;
  const { positions, seeds } = useMemo(() => {
    const p = new Float32Array(COUNT * 3);
    const s = new Float32Array(COUNT);
    for (let i = 0; i < COUNT; i++) s[i] = Math.random();
    return { positions: p, seeds: s };
  }, []);

  useFrame((_, dt) => {
    t.current += dt;
    const mesh = points.current;
    if (!mesh) return;
    // Ráfagas intermitentes: visible ~40% del tiempo
    const phase = t.current % 2.6;
    mesh.visible = phase < 1.0;
    if (!mesh.visible) return;
    for (let i = 0; i < COUNT; i++) {
      const life = (phase * (1.6 + seeds[i]) + seeds[i]) % 0.5;
      const angle = seeds[i] * Math.PI * 2 + i;
      positions[i * 3] = Math.cos(angle) * life * 1.6;
      positions[i * 3 + 1] = -life * (1.2 + seeds[i] * 2) * life * 4;
      positions[i * 3 + 2] = Math.sin(angle) * life * 1.6;
    }
    mesh.geometry.attributes.position.needsUpdate = true;
  });

  return (
    <points ref={points} position={position}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial color="#ffcf5a" size={0.08} transparent opacity={0.95} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
    </points>
  );
}

/* ================= BIOMA TILH (Terminal Intermodal) ====================== */

/** Tren de carga: locomotora + plataformas con contenedores HP. El largo
 *  cuadra con `tiles` para que el modelo coincida con su hitbox. */
function trainParts(len: number): BoxPart[] {
  const carLen = 1.9;
  const cars = Math.floor((len * 0.8) / (carLen + 0.15));
  const firstX = len * 0.42 - carLen / 2 - 1.6;
  const parts: BoxPart[] = [
    // Locomotora al frente
    { size: [1.7, 0.8, 0.95], pos: [len * 0.42, 0.55, 0], color: PALETTE.hpNavy },
    { size: [0.9, 0.5, 0.9], pos: [len * 0.42 - 0.2, 1.15, 0], color: PALETTE.hpNavy },
    // Nariz amarilla de seguridad
    { size: [0.06, 0.7, 0.9], pos: [len * 0.42 + 0.86, 0.55, 0], color: '#FFC627' },
    // Ruedas ferroviarias simplificadas (bloque bajo corrido)
    { size: [len * 0.9, 0.14, 0.55], pos: [0, 0.14, 0], color: '#14181f' },
  ];
  // Bastidores de las plataformas
  for (let i = 0; i < cars; i++) {
    parts.push({ size: [carLen, 0.16, 0.9], pos: [firstX - i * (carLen + 0.15), 0.36, 0], color: '#2b333f' });
  }
  return parts;
}

export function TrainModel({ tiles, colorIndex }: { tiles: number; colorIndex: number }) {
  const len = tiles * BALANCE.TILE;
  const carLen = 1.9;
  const cars = Math.floor((len * 0.8) / (carLen + 0.15));
  const firstX = len * 0.42 - carLen / 2 - 1.6;
  const body = useMemo(() => mergedBoxes(`train:${tiles}`, () => trainParts(len)), [tiles, len]);
  const lamp = useMemo(
    () =>
      mergedBoxes(`train:lamp:${tiles}`, () => [
        { size: [0.06, 0.14, 0.2] as [number, number, number], pos: [len * 0.42 + 0.9, 0.8, 0] as [number, number, number], color: '#fff6d8' },
      ]),
    [tiles, len],
  );
  return (
    <group>
      <mesh geometry={body} material={MERGED_STD} castShadow />
      {/* Faro de la locomotora */}
      <mesh geometry={lamp} material={MERGED_GLOW} />
      {/* Contenedores de las plataformas (textura propia) */}
      {Array.from({ length: cars }, (_, i) => (
        <group key={i} position={[firstX - i * (carLen + 0.15), 0.92, 0]}>
          <ContainerBox size={[carLen * 0.92, 0.95, 0.85]} color={VEHICLE_COLORS[(colorIndex + i) % VEHICLE_COLORS.length]} />
        </group>
      ))}
    </group>
  );
}

/**
 * Semáforo de paso a nivel: parpadea en rojo cuando el tren se acerca al
 * tablero (lee la X del tren cada frame — cero estado en React).
 */
export function RailSignal({ vehicle }: { vehicle: { x: number; direction: 1 | -1; tiles: number } }) {
  const lampA = useRef<THREE.MeshStandardMaterial>(null);
  const lampB = useRef<THREE.MeshStandardMaterial>(null);
  const t = useRef(0);

  useFrame((_, dt) => {
    t.current += dt;
    const halfLen = (vehicle.tiles * BALANCE.TILE) / 2;
    const head = vehicle.x + vehicle.direction * halfLen;
    const entryEdge = vehicle.direction === 1 ? colX(BALANCE.MIN_TILE) : colX(BALANCE.MAX_TILE);
    const distToEntry = (entryEdge - head) * vehicle.direction;
    const onBoard = Math.abs(vehicle.x) < colX(BALANCE.MAX_TILE) + halfLen;
    const warning = (distToEntry > -1 && distToEntry < BALANCE.TRAIN_WARN_DISTANCE) || onBoard;
    const blink = warning && Math.sin(t.current * 14) > 0;
    const intensity = blink ? 1.6 : 0;
    if (lampA.current) lampA.current.emissiveIntensity = intensity;
    if (lampB.current) lampB.current.emissiveIntensity = blink ? 0 : warning ? 1.6 : 0; // alternadas
  });

  return (
    <group position={[colX(BALANCE.MAX_TILE) + 0.9, 0, 0]}>
      <mesh castShadow position={[0, 0.75, 0]}>
        <boxGeometry args={[0.12, 1.5, 0.12]} />
        <meshStandardMaterial color="#d8dde2" roughness={0.6} />
      </mesh>
      {/* Cruceta */}
      <mesh position={[0, 1.55, 0]} rotation={[0, 0, Math.PI / 4]}>
        <boxGeometry args={[0.7, 0.1, 0.04]} />
        <meshStandardMaterial color={PALETTE.white} />
      </mesh>
      <mesh position={[0, 1.55, 0]} rotation={[0, 0, -Math.PI / 4]}>
        <boxGeometry args={[0.7, 0.1, 0.04]} />
        <meshStandardMaterial color={PALETTE.white} />
      </mesh>
      {/* Doble lámpara alternante */}
      <mesh position={[-0.14, 1.2, 0]}>
        <sphereGeometry args={[0.09, 8, 8]} />
        <meshStandardMaterial ref={lampA} color="#3d0a0a" emissive={PALETTE.glowBad} emissiveIntensity={0} toneMapped={false} />
      </mesh>
      <mesh position={[0.14, 1.2, 0]}>
        <sphereGeometry args={[0.09, 8, 8]} />
        <meshStandardMaterial ref={lampB} color="#3d0a0a" emissive={PALETTE.glowBad} emissiveIntensity={0} toneMapped={false} />
      </mesh>
    </group>
  );
}

/** Montacargas de patio naval (TNG) — 2 casillas: cuerpo naranja, mástil con
 *  horquillas al frente, pórtico de seguridad y baliza giratoria */
function forkliftParts(): BoxPart[] {
  const dark = '#1a1d24';
  const parts: BoxPart[] = [
    // Cuerpo + contrapeso
    { size: [1.1, 0.55, 0.8], pos: [-0.15, 0.5, 0], color: PALETTE.safetyOrange },
    { size: [0.35, 0.45, 0.75], pos: [-0.75, 0.45, 0], color: '#2b333f' },
    // Pórtico de seguridad (jaula)
    { size: [0.65, 0.06, 0.75], pos: [-0.05, 1.34, 0], color: dark },
    // Mástil
    { size: [0.08, 1.1, 0.6], pos: [0.52, 0.75, 0], color: dark },
    // Carga: pieza naval sobre las horquillas
    { size: [0.45, 0.4, 0.5], pos: [0.78, 0.4, 0], color: '#8b3a2a' },
  ];
  for (const z of [-0.32, 0.32]) parts.push({ size: [0.06, 0.55, 0.06], pos: [-0.05, 1.05, z], color: dark });
  for (const z of [-0.18, 0.18]) parts.push({ size: [0.5, 0.05, 0.09], pos: [0.75, 0.14, z], color: '#8a929b' });
  return parts;
}

export function ForkliftModel({ colorIndex, speed }: { colorIndex: number; speed: number }) {
  const wheels = useRef<THREE.Mesh[]>([]);
  const beacon = useRef<THREE.MeshStandardMaterial>(null);
  const t = useRef(Math.random() * 10);
  void colorIndex;

  useFrame((_, dt) => {
    t.current += dt;
    for (const w of wheels.current) w.rotation.y += (speed * dt) / 0.18;
    if (beacon.current) beacon.current.emissiveIntensity = Math.sin(t.current * 9) > 0 ? 1.4 : 0.15;
  });

  const geo = useMemo(() => mergedBoxes('forklift', forkliftParts), []);
  return (
    <group>
      <mesh geometry={geo} material={MERGED_STD} castShadow />
      {/* Baliza giratoria (parpadea: material propio) */}
      <mesh position={[-0.05, 1.44, 0]}>
        <boxGeometry args={[0.1, 0.12, 0.1]} />
        <meshStandardMaterial ref={beacon} color="#5a3a00" emissive="#FFC627" emissiveIntensity={0.2} toneMapped={false} />
      </mesh>
      <Wheel x={0.35} z={0.34} radius={0.18} spinRef={wheels} />
      <Wheel x={0.35} z={-0.34} radius={0.18} spinRef={wheels} />
      <Wheel x={-0.5} z={0.34} radius={0.18} spinRef={wheels} />
      <Wheel x={-0.5} z={-0.34} radius={0.18} spinRef={wheels} />
    </group>
  );
}

/* ------------------------------------------------------- grúa RTG móvil */

/**
 * Grúa RTG móvil que recorre su fila: pórtico sobre neumáticos con patas a
 * ±CRANE_LEG_OFFSET (el peligro), viga superior, cabina y spreader con
 * contenedor colgando. El hueco entre patas es el paso seguro.
 */
function rtgParts(): BoxPart[] {
  const legOffset = BALANCE.CRANE_LEG_OFFSET;
  const beamY = 3.5;
  const steel = PALETTE.sunsetOrange;
  const parts: BoxPart[] = [];
  // Patas (el peligro) con base y neumáticos
  for (const x of [-legOffset, legOffset]) {
    for (const z of [0.42, -0.42]) parts.push({ size: [0.3, beamY, 0.3], pos: [x, beamY / 2, z], color: steel });
    parts.push({ size: [0.4, 0.3, 1.3], pos: [x, 0.42, 0], color: steel });
    for (const z of [0.45, -0.45]) {
      parts.push({ size: [0.4, 0.4, 0.26], pos: [x, 0.2, z], color: '#1a1d24' });
    }
  }
  // Viga superior doble + cabina
  for (const z of [0.42, -0.42]) {
    parts.push({ size: [legOffset * 2 + 0.9, 0.32, 0.28], pos: [0, beamY, z], color: PALETTE.hpNavy });
  }
  parts.push({ size: [0.7, 0.5, 0.7], pos: [legOffset * 0.4, beamY + 0.34, 0], color: PALETTE.white });
  return parts;
}

/** Franjas de peligro de las patas: al material que enciende el bloom */
function rtgGlowParts(): BoxPart[] {
  const legOffset = BALANCE.CRANE_LEG_OFFSET;
  return [-legOffset, legOffset].map((x) => ({
    size: [0.42, 0.08, 1.32] as [number, number, number],
    pos: [x, 0.6, 0] as [number, number, number],
    color: '#FFC627',
  }));
}

export function MovingRTG() {
  const beamY = 3.5;
  const sway = useRef(Math.random() * Math.PI * 2);
  const load = useRef<THREE.Group>(null);

  useFrame((_, dt) => {
    sway.current += dt;
    if (load.current) load.current.rotation.z = Math.sin(sway.current * 1.3) * 0.04;
  });

  const geo = useMemo(() => mergedBoxes('rtg', rtgParts), []);
  const glow = useMemo(() => mergedBoxes('rtg:glow', rtgGlowParts), []);
  const spreader = useMemo(
    () =>
      mergedBoxes('rtg:spreader', () => [
        { size: [0.03, 1.1, 0.03] as [number, number, number], pos: [-0.32, -0.55, 0] as [number, number, number], color: '#0e1116' },
        { size: [0.03, 1.1, 0.03] as [number, number, number], pos: [0.32, -0.55, 0] as [number, number, number], color: '#0e1116' },
        { size: [1.05, 0.12, 1.02] as [number, number, number], pos: [0, -1.15, 0] as [number, number, number], color: PALETTE.safetyOrange },
      ]),
    [],
  );

  return (
    <group>
      <mesh geometry={geo} material={MERGED_STD} castShadow />
      <mesh geometry={glow} material={MERGED_GLOW} />
      {/* Spreader + contenedor colgando (balanceo sutil) */}
      <group ref={load} position={[0, beamY, 0]}>
        <mesh geometry={spreader} material={MERGED_STD} castShadow />
        <group position={[0, -1.7, 0]}>
          <ContainerBox size={[1.0, 0.95, 1.0]} color={PALETTE.hpSky} />
        </group>
      </group>
    </group>
  );
}


/* ==================== AMBIENTE VIVO (tanda final) ======================== */

/** Humo de chimenea: bocanadas que suben y se disipan en loop */
export function FunnelSmoke({ position }: { position: [number, number, number] }) {
  const g = useRef<THREE.Group>(null);
  const t = useRef(Math.random() * 5);
  useFrame((_, dt) => {
    t.current += dt;
    const gr = g.current;
    if (!gr) return;
    gr.children.forEach((puff, i) => {
      const life = (t.current * 0.35 + i * 0.25) % 1;
      puff.position.set(Math.sin(life * 5 + i) * 0.18, life * 1.6, 0);
      puff.scale.setScalar(0.18 + life * 0.5);
      const m = (puff as THREE.Mesh).material as THREE.MeshStandardMaterial;
      m.opacity = 0.34 * (1 - life);
    });
  });
  return (
    <group ref={g} position={position}>
      {[0, 1, 2, 3].map((i) => (
        <mesh key={i}>
          <sphereGeometry args={[1, 6, 6]} />
          <meshStandardMaterial color="#c9d2da" transparent opacity={0.3} depthWrite={false} />
        </mesh>
      ))}
    </group>
  );
}

/** Extras del dique: grua cantilever con gancho animado, focos de trabajo,
 *  trabajadores en andamios y reflejo falso sobre el oceano */
function dockExtrasParts(side: 1 | -1): BoxPart[] {
  const parts: BoxPart[] = [
    // Grua cantilever sobre el dique
    { size: [0.3, 5.2, 0.3], pos: [side * -3.4, 2.6, 0], color: PALETTE.hpSky },
    { size: [Math.abs(side * 4.6), 0.24, 0.24], pos: [side * -1.2, 5.1, 0], color: PALETTE.hpSky },
  ];
  // Trabajadores en el andamio
  [-1.6, 0.4, 1.9].forEach((z, i) => {
    parts.push({ size: [0.16, 0.28, 0.12], pos: [side * 1.55, 1.76 + (i % 2) * 0.9, z], color: PALETTE.safetyOrange });
    parts.push({ size: [0.12, 0.12, 0.12], pos: [side * 1.55, 1.98 + (i % 2) * 0.9, z], color: PALETTE.white });
  });
  return parts;
}

export function DockExtras({ side = -1 }: { side?: 1 | -1 }) {
  const hook = useRef<THREE.Group>(null);
  const t = useRef(Math.random() * 6);
  useFrame((_, dt) => {
    t.current += dt;
    if (hook.current) hook.current.position.y = -1.2 - Math.sin(t.current * 0.5) * 0.8;
  });
  const x = side * colX(14);
  const body = useMemo(() => mergedBoxes(`dockExtras:${side}`, () => dockExtrasParts(side)), [side]);
  const lamps = useMemo(
    () =>
      mergedBoxes(`dockExtras:lamp:${side}`, () =>
        [-2.2, 2.2].map((z) => ({
          size: [0.24, 0.16, 0.24] as [number, number, number],
          pos: [side * -2.6, 3.6, z] as [number, number, number],
          color: '#fff2c4',
        })),
      ),
    [side],
  );
  const hookGeo = useMemo(
    () =>
      mergedBoxes('dockExtras:hook', () => [
        { size: [0.04, 2.4, 0.04] as [number, number, number], color: '#0e1116' },
        { size: [0.3, 0.2, 0.3] as [number, number, number], pos: [0, -1.3, 0] as [number, number, number], color: PALETTE.safetyOrange },
      ]),
    [],
  );
  return (
    <group position={[x, 0, 0]}>
      <mesh geometry={body} material={MERGED_STD} />
      {/* Focos de trabajo */}
      <mesh geometry={lamps} material={MERGED_GLOW} />
      <group position={[0, 5.1, 0]}>
        <group ref={hook}>
          <mesh geometry={hookGeo} material={MERGED_STD} />
        </group>
      </group>
      {/* Conos de luz falsa (aditivos: no se pueden fusionar con lo opaco) */}
      {[-2.2, 2.2].map((z) => (
        <mesh key={z} position={[side * -2.6 + side * 0.7, 2.1, z]} rotation={[0, 0, side * 0.5]}>
          <coneGeometry args={[1.0, 3.0, 8, 1, true]} />
          <meshBasicMaterial color="#fff2c4" transparent opacity={0.07} depthWrite={false} blending={THREE.AdditiveBlending} side={THREE.DoubleSide} />
        </mesh>
      ))}
      {/* Reflejo falso del conjunto sobre el oceano */}
      <mesh position={[side * 2.5, -0.47, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[3.4, 7]} />
        <meshBasicMaterial color="#3aa0d8" transparent opacity={0.1} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>
    </group>
  );
}


/* ------------------------------- terminal de cruceros: dársena cerrada (ECV) */

/**
 * DÁRSENA CERRADA — resuelve que se viera "nacer" a los barcos.
 *
 * El problema no era estético sino geométrico: al reaparecer, la popa de un
 * crucero cae en x = ±19.25, y la cámara ortográfica alcanza ±11.4 en X a
 * 1600 px (±27 en 4K). Alejar el punto de reaparición no sirve — el ciclo se
 * iría por encima de los 25 s de espera. La única salida es TAPARLO.
 *
 * Así que la marina deja de ser mar abierto y pasa a ser una dársena cerrada
 * por terminales: un muelle corrido y alto a ambos costados que se come toda la
 * franja donde ocurre el wrap, con bocanas abiertas solo en las filas de agua.
 * Fuera de la dársena no se ve nada; los barcos SALEN por la bocana.
 *
 * La altura no es decorativa: un crucero mide 2.66 con la chimenea y la cámara
 * mira 43.7° por encima, así que para ocultarlo desde la fila contigua hace
 * falta masa hasta y ≈ 3.9. De ahí `TERMINAL_H`.
 */
const HARBOUR_X = colX(BALANCE.MAX_TILE + BALANCE.WRAP_MARGIN);
/**
 * Cara interior del muelle. En los tramos macizos entra hasta 9.5 —justo detrás
 * del borde del pontón (9.35) y aún fuera del tablero (8.8)— porque la línea de
 * visión de un barco parado en la bocana cruza la fila contigua a ~x 9.9: sin
 * esa masa se le vería asomar la proa de golpe.
 */
const TERMINAL_INNER_WALL = 9.5;
/** En los morros la cara interior se queda en la línea del dique: el canal debe
 *  quedar despejado para que el barco navegue por él. */
const TERMINAL_INNER_MOLE = HARBOUR_X - 0.2;
/** Hasta dónde llega el muelle mar adentro (cubre toda la zona de reaparición) */
const TERMINAL_OUTER = 21;
const TERMINAL_H = 4.4;

/** Nave de terminal: masa opaca + cubierta + franja de ventanas iluminadas.
 *  Es el modelo MÁS repetido del bioma marino (dos por fila, más los morros de
 *  cada bocana), así que se fusiona por completo: de 6 mallas a 2. */
function terminalParts(depth: number, inner: number): BoxPart[] {
  const len = TERMINAL_OUTER - inner;
  return [
    { size: [len, TERMINAL_H, depth], pos: [0, TERMINAL_H / 2, 0], color: '#26374e' },
    // Cubierta
    { size: [len + 0.14, 0.16, depth + 0.14], pos: [0, TERMINAL_H + 0.08, 0], color: '#42536b' },
    // Zócalo de muelle (hormigón sobre la línea de flotación)
    { size: [len + 0.04, 0.9, depth + 0.06], pos: [0, 0.45, 0], color: '#46515f' },
  ];
}

/** Franjas de ventanas encendidas hacia la dársena: sin ellas la terminal se lee
 *  como un bloque muerto contra el agua */
function terminalWindowParts(side: 1 | -1, depth: number, inner: number): BoxPart[] {
  const len = TERMINAL_OUTER - inner;
  return [1.75, 2.95].map((y) => ({
    size: [0.04, 0.34, depth * 0.88] as [number, number, number],
    pos: [-side * (len / 2 + 0.02), y, 0] as [number, number, number],
    color: '#7fd0ff',
  }));
}

function TerminalMass({ side, depth, inner }: { side: 1 | -1; depth: number; inner: number }) {
  const mid = (inner + TERMINAL_OUTER) / 2;
  const body = useMemo(() => mergedBoxes(`term:${depth}:${inner}`, () => terminalParts(depth, inner)), [depth, inner]);
  const win = useMemo(
    () => mergedBoxes(`term:win:${side}:${depth}:${inner}`, () => terminalWindowParts(side, depth, inner)),
    [side, depth, inner],
  );
  return (
    <group position={[side * mid, 0, 0]}>
      <mesh geometry={body} material={MERGED_STD} receiveShadow />
      <mesh geometry={win} material={MERGED_GLOW} />
    </group>
  );
}

/** Tramo macizo del muelle — filas de la marina que NO son canal navegable */
export function HarbourWall({ side = 1 }: { side?: 1 | -1 }) {
  return <TerminalMass side={side} depth={BALANCE.TILE * 1.02} inner={TERMINAL_INNER_WALL} />;
}

/**
 * BOCANA — el hueco del muelle por el que navegan las embarcaciones.
 *
 * Dos morros dejan un canal de 1.3 (el casco más ancho mide 1.2). El cabezal
 * junto al canal baja a la altura del muelle para que la abertura se lea como
 * una puerta y no como una grieta, y lleva baliza de navegación: verde a un
 * costado, roja al otro.
 *
 * Cada morro se mete 0.47 en la fila vecina. Contra un muelle eso no se nota
 * (los dos son masa maciza), pero contra OTRA fila de agua el morro cae dentro
 * de su canal y se ve un tapón de muro flotando en mitad de la dársena. Desde
 * que `MAX_WATER_STREAK` es 2 eso pasa de verdad, así que el morro que da a
 * otra fila de agua no se dibuja: el canal sigue de largo, que es justo lo que
 * cuenta la escena.
 */
export function HarbourMouth({
  side = 1,
  openPrev = false,
  openNext = false,
}: {
  side?: 1 | -1;
  /** La fila anterior (+z) también es agua: el canal continúa hacia allá */
  openPrev?: boolean;
  /** La fila siguiente (−z) también es agua */
  openNext?: boolean;
}) {
  const lights = useRef<THREE.MeshStandardMaterial[]>([]);
  const t = useRef(Math.random() * 10);

  useFrame((_, dt) => {
    t.current += dt;
    const on = Math.sin(t.current * 1.6) > 0.2 ? 1.6 : 0.25;
    for (const m of lights.current) m.emissiveIntensity = on;
  });

  // Morro: de z=0.65 (borde del canal) a z=1.12 (encaja con la fila vecina)
  const moleDepth = 0.47;
  const moleZ = 0.885;

  // Avanzar es −z: el morro de z negativo mira a la fila SIGUIENTE
  const sides = ([-1, 1] as const).filter((s) => (s === -1 ? !openNext : !openPrev));

  return (
    <group>
      {sides.map((s) => (
        <group key={s} position={[0, 0, s * moleZ]}>
          {/* Cuerpo alto del morro (misma masa que el muelle) */}
          <TerminalMass side={side} depth={moleDepth} inner={TERMINAL_INNER_MOLE} />
          {/* Cabezal bajo junto al canal: convierte el hueco en una puerta */}
          <mesh castShadow position={[side * (TERMINAL_INNER_MOLE + 0.55), 0.55, 0]}>
            <boxGeometry args={[1.2, 1.1, moleDepth + 0.06]} />
            <meshStandardMaterial color="#46515f" roughness={0.95} />
          </mesh>
          <mesh position={[side * (TERMINAL_INNER_MOLE + 0.55), 1.13, 0]}>
            <boxGeometry args={[1.24, 0.07, moleDepth + 0.1]} />
            <meshStandardMaterial color="#93a1ae" roughness={0.8} />
          </mesh>
          {/* Baliza de navegación en la punta */}
          <mesh castShadow position={[side * (TERMINAL_INNER_MOLE + 0.1), 1.42, 0]}>
            <cylinderGeometry args={[0.06, 0.09, 0.5, 8]} />
            <meshStandardMaterial color={PALETTE.white} roughness={0.6} />
          </mesh>
          <mesh position={[side * (TERMINAL_INNER_MOLE + 0.1), 1.75, 0]}>
            <sphereGeometry args={[0.12, 10, 10]} />
            <meshStandardMaterial
              ref={(m) => {
                if (m && !lights.current.includes(m)) lights.current.push(m);
              }}
              color={s > 0 ? '#0f3d1a' : '#3d0f14'}
              emissive={s > 0 ? PALETTE.glowGood : PALETTE.glowBad}
              emissiveIntensity={0}
              toneMapped={false}
            />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/* ======== TERMINAL MULTIPROPÓSITO (carga general, granel, Ro-Ro) ========= */

/**
 * CAMIÓN TOLVA de granel. El tráfico de TUM no son coches: es lo que mueve una
 * terminal de granel y carga general — tolvas que van y vienen del silo y
 * cargadoras de pala trabajando el montón. Van en CONVOY, pegados como la fila
 * que se forma bajo la torre de carga, y el hueco entre dos es la ventana de
 * paso.
 */
function hopperParts(color: string): BoxPart[] {
  const len = 3.4;
  return [
    // Chasis
    { size: [len * 0.94, 0.16, 0.86], pos: [0, 0.42, 0], color: '#232a36' },
    // Cabina
    { size: [0.82, 0.86, 0.9], pos: [len * 0.38, 0.93, 0], color },
    { size: [0.03, 0.32, 0.7], pos: [len * 0.38 + 0.42, 1.1, 0], color: '#20304a' },
    // Tolva: caja con los costados inclinados hacia dentro (silueta de volquete)
    { size: [len * 0.56, 0.66, 0.98], pos: [-len * 0.13, 0.9, 0], color: '#5c6773' },
    { size: [len * 0.58, 0.1, 1.04], pos: [-len * 0.13, 1.26, 0], color: '#7d8791' },
    // Granel asomando por arriba (arena/mineral)
    { size: [len * 0.5, 0.14, 0.86], pos: [-len * 0.13, 1.32, 0], color: '#9c8760' },
    // Guardabarros trasero
    { size: [0.22, 0.3, 1.0], pos: [-len * 0.46, 0.62, 0], color },
  ];
}

export function HopperTruckModel({ colorIndex, speed }: { colorIndex: number; speed: number }) {
  const wheels = useRef<THREE.Mesh[]>([]);
  const color = VEHICLE_COLORS[colorIndex % VEHICLE_COLORS.length];

  useFrame((_, dt) => {
    for (const w of wheels.current) w.rotation.y += (speed * dt) / 0.24;
  });

  const geo = useMemo(() => mergedBoxes(`hopper:${color}`, () => hopperParts(color)), [color]);
  return (
    <group>
      <mesh geometry={geo} material={MERGED_STD} castShadow />
      <Wheel x={1.25} z={0.44} radius={0.24} spinRef={wheels} />
      <Wheel x={1.25} z={-0.44} radius={0.24} spinRef={wheels} />
      <Wheel x={-0.55} z={0.44} radius={0.24} spinRef={wheels} />
      <Wheel x={-0.55} z={-0.44} radius={0.24} spinRef={wheels} />
      <Wheel x={-1.2} z={0.44} radius={0.24} spinRef={wheels} />
      <Wheel x={-1.2} z={-0.44} radius={0.24} spinRef={wheels} />
    </group>
  );
}

/**
 * CARGADORA FRONTAL de pala. Silueta inconfundible: cuerpo articulado amarillo,
 * cucharón por delante y ruedas enormes. Es la máquina que mueve el montón de
 * granel, y no se parece a nada de las otras cuatro terminales.
 */
function loaderParts(): BoxPart[] {
  const body = '#e8b21e';
  return [
    // Cuerpo trasero (motor) y delantero (articulados por la cintura)
    { size: [1.15, 0.6, 0.95], pos: [-0.72, 0.62, 0], color: body },
    { size: [0.9, 0.5, 0.9], pos: [0.35, 0.6, 0], color: body },
    { size: [0.3, 0.35, 0.7], pos: [-0.15, 0.6, 0], color: '#2f3a49' },
    // Cabina acristalada
    { size: [0.72, 0.66, 0.82], pos: [-0.55, 1.22, 0], color: PALETTE.white },
    { size: [0.74, 0.34, 0.84], pos: [-0.55, 1.3, 0], color: '#20304a' },
    // Brazos y cucharón cargado
    { size: [1.5, 0.14, 0.12], pos: [0.75, 0.86, 0.42], rot: [0, 0, -0.16], color: '#2f3a49' },
    { size: [1.5, 0.14, 0.12], pos: [0.75, 0.86, -0.42], rot: [0, 0, -0.16], color: '#2f3a49' },
    { size: [0.5, 0.62, 1.06], pos: [1.5, 0.55, 0], color: '#5c6773' },
    { size: [0.56, 0.1, 1.1], pos: [1.52, 0.24, 0], color: '#9aa4ad' },
    { size: [0.34, 0.16, 0.92], pos: [1.45, 0.9, 0], color: '#9c8760' },
    // Baliza
    { size: [0.12, 0.14, 0.12], pos: [-0.55, 1.62, 0], color: PALETTE.safetyOrange },
  ];
}

export function WheelLoaderModel({ speed }: { speed: number }) {
  const wheels = useRef<THREE.Mesh[]>([]);
  useFrame((_, dt) => {
    for (const w of wheels.current) w.rotation.y += (speed * dt) / 0.3;
  });
  const geo = useMemo(() => mergedBoxes('loader', loaderParts), []);
  return (
    <group>
      <mesh geometry={geo} material={MERGED_STD} castShadow />
      <Wheel x={0.55} z={0.5} radius={0.3} spinRef={wheels} />
      <Wheel x={0.55} z={-0.5} radius={0.3} spinRef={wheels} />
      <Wheel x={-0.8} z={0.5} radius={0.3} spinRef={wheels} />
      <Wheel x={-0.8} z={-0.5} radius={0.3} spinRef={wheels} />
    </group>
  );
}

/**
 * CARGA GENERAL — el bloqueo jugable de TUM, el equivalente a la pila de
 * contenedores de TEC. Deliberadamente distinto de un contenedor: bobinas de
 * acero flejadas, tubería atada y pacas. Bajo y ancho, porque esto no se apila
 * tres alturas.
 */
function generalCargoParts(height: number, colorIndex: number): BoxPart[] {
  const parts: BoxPart[] = [];
  const palet = '#6b5334';
  // Tarima
  parts.push({ size: [1.0, 0.1, 1.0], pos: [0, 0.05, 0], color: palet });

  if (colorIndex % 3 === 0) {
    // BOBINAS de acero tumbadas, con fleje naranja
    for (let level = 0; level < height; level++) {
      const y = 0.35 + level * 0.52;
      parts.push({ size: [0.92, 0.46, 0.46], pos: [0, y, -0.24], color: PALETTE.steel });
      parts.push({ size: [0.92, 0.46, 0.46], pos: [0, y, 0.24], color: '#6f7d89' });
      parts.push({ size: [0.14, 0.5, 0.98], pos: [0, y, 0], color: PALETTE.safetyOrange });
    }
  } else if (colorIndex % 3 === 1) {
    // TUBERÍA atada (tres tubos por altura)
    for (let level = 0; level < height; level++) {
      const y = 0.28 + level * 0.42;
      for (const z of [-0.32, 0, 0.32]) {
        parts.push({ size: [1.0, 0.36, 0.3], pos: [0, y, z], color: '#7d8791' });
      }
      parts.push({ size: [0.1, 0.4, 1.0], pos: [0.3, y, 0], color: '#2f3a49' });
    }
  } else {
    // PACAS / sacos ensacados
    for (let level = 0; level < height; level++) {
      const y = 0.28 + level * 0.42;
      parts.push({ size: [0.96, 0.38, 0.96], pos: [0, y, 0], color: level % 2 ? '#c2ab86' : '#a8916d' });
      parts.push({ size: [1.0, 0.05, 1.0], pos: [0, y + 0.2, 0], color: '#5c6b7a' });
    }
  }
  return parts;
}

export function GeneralCargo({ height, colorIndex }: { height: number; colorIndex: number }) {
  const geo = useMemo(
    () => mergedBoxes(`cargo:${height}:${colorIndex % 3}`, () => generalCargoParts(height, colorIndex)),
    [height, colorIndex],
  );
  return <mesh geometry={geo} material={MERGED_STD} castShadow receiveShadow />;
}

/** BATERÍA DE SILOS de granel — la silueta que identifica a TUM en el skyline */
function siloParts(): BoxPart[] {
  const parts: BoxPart[] = [];
  parts.push({ size: [4.4, 0.3, 2.6], pos: [0, 0.15, 0], color: '#3a4453' });
  for (let i = 0; i < 4; i++) {
    const x = -1.5 + i * 1.0;
    parts.push({ size: [0.9, 4.2, 0.9], pos: [x, 2.4, 0], color: i % 2 ? '#c9ced6' : '#aeb6c0' });
    parts.push({ cone: [0.66, 0.7, 8], pos: [x, 4.85, 0], color: PALETTE.hpNavy });
  }
  // Galería de transporte que une las cabezas
  parts.push({ size: [4.2, 0.34, 0.5], pos: [0, 4.7, 0], color: PALETTE.steel });
  return parts;
}

/** La coloca el mapa en la columna que trae la pieza de decorado, como el
 *  almacén del astillero — aquí no se posiciona sola. */
export function SiloBattery({ side = 1 }: { side?: 1 | -1 }) {
  void side;
  const geo = useMemo(() => mergedBoxes('silos', siloParts), []);
  return <mesh geometry={geo} material={MERGED_STD} castShadow receiveShadow />;
}

/**
 * GRÚA MÓVIL DE GANCHO (mobile harbour crane) — la que trabaja carga general:
 * chasis sobre neumáticos, torre giratoria y pluma inclinada con gancho. Es la
 * pieza que distingue a TUM de TEC, donde todo son pórticos.
 */
function mobileCraneParts(side: 1 | -1): BoxPart[] {
  const parts: BoxPart[] = [];
  const body = PALETTE.sunsetOrange;
  // Chasis y estabilizadores
  parts.push({ size: [3.0, 0.5, 1.5], pos: [0, 0.55, 0], color: '#2f3a49' });
  for (const x of [-1.3, 1.3]) {
    for (const z of [-0.85, 0.85]) parts.push({ size: [0.5, 0.3, 0.5], pos: [x, 0.2, z], color: body });
  }
  // Torre giratoria + cabina
  parts.push({ size: [1.5, 1.5, 1.4], pos: [0, 1.55, 0], color: body });
  parts.push({ size: [0.7, 0.6, 0.6], pos: [side * 0.75, 2.1, 0.5], color: PALETTE.white });
  // Pluma inclinada hacia el mar + gancho
  parts.push({ size: [6.4, 0.36, 0.42], pos: [side * 2.6, 3.75, 0], rot: [0, 0, side * -0.44], color: PALETTE.white });
  parts.push({ size: [0.1, 1.6, 0.1], pos: [side * 5.2, 4.2, 0], color: '#2f3a49' });
  parts.push({ size: [0.34, 0.5, 0.34], pos: [side * 5.2, 3.3, 0], color: PALETTE.steel });
  // Contrapeso
  parts.push({ size: [1.0, 0.9, 1.3], pos: [side * -1.2, 1.9, 0], color: '#3a4453' });
  return parts;
}

export function MobileHarbourCrane({ side = 1 }: { side?: 1 | -1 }) {
  const geo = useMemo(() => mergedBoxes(`mobcrane:${side}`, () => mobileCraneParts(side)), [side]);
  return <mesh geometry={geo} material={MERGED_STD} castShadow receiveShadow />;
}

/** Carga general suelta en el muelle (decorado pequeño de 1×1) */
function cargoPileParts(height: number, colorIndex: number): BoxPart[] {
  return generalCargoParts(height, colorIndex);
}

export function CargoPile({ height, colorIndex }: { height: number; colorIndex: number }) {
  const geo = useMemo(
    () => mergedBoxes(`pile:${height}:${colorIndex % 3}`, () => cargoPileParts(height, colorIndex)),
    [height, colorIndex],
  );
  return <mesh geometry={geo} material={MERGED_STD} castShadow />;
}
