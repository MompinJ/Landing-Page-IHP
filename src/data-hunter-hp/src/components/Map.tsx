import { useFrame, useThree } from '@react-three/fiber';
import { memo, useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { BALANCE, colX, rowZ, viewRowsFor } from '../data/balance';
import { PALETTE } from '../data/palette';
import { runtime } from '../store/runtime';
import { useGameStore } from '../store/useGameStore';
import { rows, setLookahead, type CardData, type CraneData, type RowData, type VehicleData } from '../world/rows';
import {
  AGVModel,
  HopperTruckModel,
  CargoPile,
  DockExtras,
  FunnelSmoke,
  SailboatModel,
  YachtModel,
  FishingBoatModel,
  ContainerStack,
  GeneralCargo,
  LaunchPad,
  MegaDryDock,
  TallScaffold,
  MobileHarbourCrane,
  DockPortalCrane,
  WheelLoaderModel,
  SiloBattery,
  CruiseShipModel,
  DryDockShip,
  ForkliftModel,
  GantryLoad,
  HarbourMouth,
  HarbourWall,
  JibCrane,
  MovingRTG,
  VerticalDock,
  RailSignal,
  RMGCrane,
  Scaffold,
  ShipyardBlock,
  STSCrane,
  TrainModel,
  TruckModel,
  TugboatModel,
  Warehouse,
  WeldingSparks,
} from './models';
import { isBiomeAnchor } from '../world/rows';
import { CruiseWater, OceanBackground } from './water';
import { MERGED_STD, mergedBoxes, type BoxPart } from '../render/boxes';

/** Las filas se extienden mucho más allá del tablero jugable para que la
 *  cámara nunca muestre el vacío (como el mapa del tutorial) */
const ROW_WIDTH = (BALANCE.MAX_TILE - BALANCE.MIN_TILE + 1 + 26) * BALANCE.TILE;
const TILES_ACROSS = ROW_WIDTH / BALANCE.TILE;

/* ------------------------------------------------- texturas de suelo (canvas) */

function makeGroundTexture(draw: (ctx: CanvasRenderingContext2D) => void): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  draw(canvas.getContext('2d')!);
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.repeat.set(TILES_ACROSS, 1);
  texture.anisotropy = 4;
  return texture;
}

let groundTextures: {
  yard: THREE.CanvasTexture;
  road: THREE.CanvasTexture;
  crane: THREE.CanvasTexture;
  dock: THREE.CanvasTexture;
  shipyard: THREE.CanvasTexture;
  rail: THREE.CanvasTexture;
  belt: THREE.CanvasTexture;
} | null = null;

/** Escala de grises (se tiñen con el color del material), salvo la de grúa */
function getGroundTextures() {
  if (groundTextures) return groundTextures;
  groundTextures = {
    // Patio: retícula pintada por casilla + desgaste sutil
    yard: makeGroundTexture((ctx) => {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, 64, 64);
      ctx.fillStyle = '#d4d4d4';
      ctx.fillRect(0, 0, 3, 64);
      ctx.fillRect(0, 0, 64, 2);
      ctx.fillRect(0, 62, 64, 2);
      ctx.fillStyle = '#efefef';
      ctx.fillRect(20, 14, 18, 10);
      ctx.fillRect(40, 40, 14, 8);
    }),
    // Vía: base gris con marca central discontinua y bordes claros
    road: makeGroundTexture((ctx) => {
      ctx.fillStyle = '#cfcfcf';
      ctx.fillRect(0, 0, 64, 64);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 1, 64, 2);
      ctx.fillRect(0, 61, 64, 2);
      ctx.fillRect(8, 30, 30, 4); // guion central (se repite por casilla)
    }),
    // Fila de grúa: hormigón con franjas de precaución amarillas (a color)
    crane: makeGroundTexture((ctx) => {
      ctx.fillStyle = '#223047';
      ctx.fillRect(0, 0, 64, 64);
      ctx.fillStyle = '#8a6d1d';
      for (let x = -8; x < 72; x += 16) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x + 8, 0);
        ctx.lineTo(x + 2, 6);
        ctx.lineTo(x - 6, 6);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(x, 64);
        ctx.lineTo(x + 8, 64);
        ctx.lineTo(x + 2, 58);
        ctx.lineTo(x - 6, 58);
        ctx.fill();
      }
    }),
    // Astillero TNG: hormigón industrial con manchas de óxido y marcas
    shipyard: makeGroundTexture((ctx) => {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, 64, 64);
      ctx.fillStyle = '#e0e0e0';
      ctx.fillRect(0, 0, 2, 64);
      ctx.fillStyle = '#d8d0c8';
      ctx.fillRect(12, 40, 14, 9); // mancha de óxido tenue
      ctx.fillRect(44, 12, 10, 7);
      ctx.fillStyle = '#efefef';
      ctx.fillRect(30, 26, 18, 3);
    }),
    // Vía TILH (a color): balasto de grava + durmientes + rieles
    rail: makeGroundTexture((ctx) => {
      ctx.fillStyle = '#3b3f46'; // balasto
      ctx.fillRect(0, 0, 64, 64);
      // grava (puntos)
      for (let i = 0; i < 60; i++) {
        const x = (i * 37) % 64;
        const y = (i * 23) % 64;
        ctx.fillStyle = i % 2 ? '#4a4f57' : '#2f333a';
        ctx.fillRect(x, y, 2, 2);
      }
      // durmientes (verticales, se repiten por casilla)
      ctx.fillStyle = '#4a3524';
      for (let x = 4; x < 64; x += 16) ctx.fillRect(x, 8, 6, 48);
      // rieles (horizontales, acero)
      ctx.fillStyle = '#9aa4ad';
      ctx.fillRect(0, 16, 64, 4);
      ctx.fillRect(0, 44, 64, 4);
    }),
    // BANDA TRANSPORTADORA (TUM, a color): goma oscura con galones de sentido.
    // Se dibuja UN galón por casilla; la textura se desplaza a la velocidad de
    // la banda, así que lo que arrastra al jugador es lo mismo que se ve mover.
    belt: makeGroundTexture((ctx) => {
      // Goma NEGRA, no asfalto: el gris de las vías ronda el #26334A y a esta
      // distancia una banda gris con flechas se lee como una carretera pintada.
      ctx.fillStyle = '#15181d';
      ctx.fillRect(0, 0, 64, 64);
      // Costillas de la goma
      ctx.fillStyle = '#1e222a';
      for (let x = 0; x < 64; x += 8) ctx.fillRect(x, 6, 3, 52);
      // Galón de sentido de marcha (apunta a +x)
      ctx.fillStyle = '#c9a94a';
      ctx.beginPath();
      ctx.moveTo(18, 14);
      ctx.lineTo(44, 32);
      ctx.lineTo(18, 50);
      ctx.lineTo(26, 32);
      ctx.closePath();
      ctx.fill();
      // Bordes de la banda
      ctx.fillStyle = '#3c434d';
      ctx.fillRect(0, 0, 64, 5);
      ctx.fillRect(0, 59, 64, 5);
    }),
    // Muelle de madera: tablones horizontales con vetas (se tiñe marrón)
    dock: makeGroundTexture((ctx) => {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, 64, 64);
      ctx.fillStyle = '#dcdcdc';
      for (let y = 0; y < 64; y += 10) ctx.fillRect(0, y, 64, 2); // juntas entre tablones
      ctx.fillStyle = '#ededed';
      for (let i = 0; i < 30; i++) {
        const yy = Math.floor((i * 47) % 64);
        const xx = (i * 29) % 64;
        ctx.fillRect(xx, yy + 3, 8, 1); // vetas cortas
      }
    }),
  };
  return groundTextures;
}

/**
 * Mapa por filas (tutorial: "Rendering the Map" + "Generating the Map").
 * Solo se montan las filas de la ventana visible alrededor del jugador; la
 * ventana se desplaza al completar cada salto (re-render barato: las filas
 * están memoizadas y solo entran/salen por los bordes).
 */
export function Map() {
  const currentRow = useGameStore((s) => s.currentRow);
  // rows se regenera al iniciar partida — la fase fuerza remonte del mapa
  const phase = useGameStore((s) => s.phase);
  // La cámara ortográfica tiene zoom fijo: cuanto mayor es la ventana, más
  // mundo entra en cuadro y más filas hay que dibujar (ver `viewRowsFor`).
  const size = useThree((s) => s.size);
  const view = useMemo(() => viewRowsFor(size.width, size.height), [size.width, size.height]);
  // El generador de filas necesita saber cuánto se ve para ir por delante
  useEffect(() => setLookahead(view.ahead), [view.ahead]);

  const start = Math.max(0, currentRow - view.behind);
  const end = Math.min(rows.length, currentRow + view.ahead + 1);
  const visible = rows.slice(start, end);

  return (
    <group key={phase === 'menu' ? 'menu' : 'game'}>
      {/* Océano infinito bajo todo (elimina el vacío negro del horizonte) */}
      <OceanBackground />
      {/* Buque portacontenedores gigante navegando en el horizonte */}
      <HorizonShip />
      {/* Mar reflectante único que cubre la zona de cruceros actual */}
      <CruiseWater />
      {/* Delantal de arranque: suelo detrás de la fila 0 */}
      {currentRow < view.behind && (
        <mesh position={[0, -0.05, (BALANCE.TILE * (view.behind + 2)) / 2]} receiveShadow>
          <boxGeometry args={[ROW_WIDTH, 0.1, BALANCE.TILE * (view.behind + 2)]} />
          <meshStandardMaterial color="#20304a" roughness={0.95} />
        </mesh>
      )}
      {visible.map((row) => (
        <Row key={row.index} data={row} />
      ))}
    </group>
  );
}

/** Buque lejano que acompaña al jugador por el horizonte marítimo */
function HorizonShip() {
  const g = useRef<THREE.Group>(null);
  useFrame((_, dt) => {
    if (g.current) g.current.position.z = THREE.MathUtils.damp(g.current.position.z, runtime.z - 8, 0.5, dt);
  });
  return (
    <group ref={g} position={[40, -0.35, 0]} scale={2.4} rotation={[0, Math.PI / 2.3, 0]}>
      <CruiseShipModel speed={0} beam={2.9} resort />
      <FunnelSmoke position={[-BALANCE.SHIP_TILES * BALANCE.TILE * 0.22, 2.6, 0]} />
    </group>
  );
}

const Row = memo(function Row({ data }: { data: RowData }) {
  const cruise = data.theme === 'cruise';
  const mega = data.docks?.some((d) => d.mega) ?? false;
  // Zonas de dique en el astillero: se suprime la decoración del lado del
  // dique para que almacenes/grúas no se intersecten con sus muros
  const zpos = data.index % BALANCE.ZONE_LENGTH;
  const nearDockLeft = data.theme === 'shipyard' && Math.abs(zpos - Math.floor(BALANCE.ZONE_LENGTH / 2)) <= 4;
  const nearDockRight = data.theme === 'shipyard' && Math.abs(zpos - 6) <= 4;
  return (
    <group position={[0, 0, rowZ(data.index)]}>
      <Ground type={data.type} theme={data.theme} deck={data.deck} belt={data.belt} />
      {/* Bloqueos jugables por bioma (el mar no tiene bloqueos en tierra) */}
      {!cruise &&
        data.stacks.map((s) => (
          <group key={s.col} position={[colX(s.col), 0, 0]}>
            {data.theme === 'shipyard' ? (
              <ShipyardBlock height={s.height} colorIndex={s.colorIndex} />
            ) : data.theme === 'multi' ? (
              <GeneralCargo height={s.height} colorIndex={s.colorIndex} />
            ) : (
              <ContainerStack height={s.height} colorIndex={s.colorIndex} />
            )}
          </group>
        ))}
      {/* DIQUE MAYOR: muro de lado a lado con buque grande — una sola pieza
          (los segmentos de DockData son colisión; los andamios de cruce los
          dibuja el map de scaffolds de abajo) */}
      {mega && (
        <group>
          <MegaDryDock />
          {/* Punto de embarque de la grúa: en la fila ANTERIOR (z +TILE) */}
          {data.padCol !== undefined && (
            <group position={[colX(data.padCol), 0, BALANCE.TILE]}>
              <LaunchPad />
            </group>
          )}
        </group>
      )}
      {/* DIQUES VERTICALES del astillero: la fila CABEZA dibuja el foso entero
          (varias filas hacia adelante) con su cadena de andamios; los
          segmentos de continuación son solo colisión y no dibujan nada */}
      {!mega &&
        data.docks?.map((dock) => {
          if (dock.cont) return null;
          const centerX = colX(dock.col) + ((dock.tiles - 1) * BALANCE.TILE) / 2;
          return (
            <group key={dock.col} position={[centerX, 0, 0]}>
              <VerticalDock
                widthCols={dock.tiles}
                lenRows={dock.len ?? 1}
                flooded={dock.flooded}
                ship={dock.ship}
                bridgeX={dock.bridge === undefined ? undefined : colX(dock.bridge) - centerX}
              />
            </group>
          );
        })}
      {/* ANDAMIOS: refugios de taller, o PASARELAS ALTAS sobre el buque del
          dique mayor (cruzan por encima del barco) */}
      {data.scaffolds?.map((s) => (
        <group key={`sc${s.col}`} position={[colX(s.col), 0, 0]}>
          {mega ? <TallScaffold /> : <Scaffold />}
        </group>
      ))}
      {/* Decoración fuera del tablero. Cada pieza declara SU modelo (`kind`):
          antes se deducía del índice en el array y bastaba con que una fila
          tuviera una pieza más para que todas cambiaran de modelo. */}
      {data.decor.map((s, i) => {
        if ((nearDockLeft && s.col < 0) || (nearDockRight && s.col > 0)) return null;
        return (
          <group key={`d${i}`} position={[colX(s.col), 0, 0]}>
            {s.kind === 'warehouse' ? (
              <Warehouse colorIndex={s.colorIndex} />
            ) : s.kind === 'jib' ? (
              <JibCrane side={s.col > 0 ? 1 : -1} />
            ) : s.kind === 'block' ? (
              <ShipyardBlock height={s.height} colorIndex={s.colorIndex} />
            ) : s.kind === 'silo' ? (
              <SiloBattery side={s.col > 0 ? 1 : -1} />
            ) : s.kind === 'mobile' ? (
              <MobileHarbourCrane side={s.col > 0 ? 1 : -1} />
            ) : s.kind === 'cargo' ? (
              <CargoPile height={s.height} colorIndex={s.colorIndex} />
            ) : (
              <ContainerStack height={s.height} colorIndex={s.colorIndex} />
            )}
          </group>
        );
      })}
      {/* SUPER-ESTRUCTURAS por bioma: hilera de STS azules + remolcadores.
          Las posiciones son `zpos` (fila dentro de la zona) y por tanto van
          atadas a ZONE_LENGTH: al bajarla de 26 a 18 hubo que reencajarlas —
          las que caían en 19/20 quedaban fuera del bioma y no se dibujaban. */}
      {isBiomeAnchor(data.index) && data.theme === 'port' && <STSCrane side={1} color={PALETTE.hpNavy} />}
      {data.theme === 'port' && zpos === 3 && <STSCrane side={-1} color={PALETTE.hpNavy} />}
      {data.theme === 'port' && zpos === 14 && <STSCrane side={1} color={PALETTE.hpNavy} />}
      {data.theme === 'shipyard' && zpos === 14 && <STSCrane side={1} color={PALETTE.hpNavy} />}
      {/* TUM: la grúa móvil de gancho es la pieza monumental del bioma */}
      {isBiomeAnchor(data.index) && data.theme === 'multi' && (
        <group position={[colX(BALANCE.MAX_TILE + 4), 0, 0]}>
          <MobileHarbourCrane side={1} />
        </group>
      )}
      {isBiomeAnchor(data.index) && data.theme === 'shipyard' && (
        <group>
          {/* Grúa monumental AZUL + dique seco + remolcadores + soldadura */}
          <STSCrane side={1} color={PALETTE.hpNavy} />
          <DryDockShip side={-1} />
          <DockExtras side={-1} />
          <WeldingSparks position={[colX(-11.5), 2.6, 0]} />
          <WeldingSparks position={[colX(11), 5.5, -2]} />
        </group>
      )}
      {/* Segundo DIQUE del astillero (lado opuesto, con su remolcador) */}
      {data.theme === 'shipyard' && zpos === 6 && (
        <group>
          <DryDockShip side={1} />
          <DockExtras side={1} />
          <WeldingSparks position={[colX(12.5), 2.6, 1]} />
        </group>
      )}
      {isBiomeAnchor(data.index) && data.theme === 'rail' && <RMGCrane />}
      {/* Semáforo de paso a nivel en filas de tren */}
      {data.type === 'rail' && data.vehicles[0] && <RailSignal vehicle={data.vehicles[0]} />}
      {/* DIQUE de la dársena: muro corrido en los muelles y bocana abierta en
          las filas de agua — las embarcaciones entran y salen por ahí. */}
      {cruise &&
        [1, -1].map((s) =>
          data.type === 'water' ? (
            <HarbourMouth
              key={`hm${s}`}
              side={s as 1 | -1}
              openPrev={rows[data.index - 1]?.type === 'water'}
              openNext={rows[data.index + 1]?.type === 'water'}
            />
          ) : (
            <HarbourWall key={`hw${s}`} side={s as 1 | -1} />
          ),
        )}
      {data.vehicles.map((v, i) => (
        <Vehicle key={i} data={v} />
      ))}
      {data.cranes.map((c, i) => (
        <Crane key={`c${i}`} data={c} gantry={data.type === 'gantry'} mega={mega} rowIndex={data.index} />
      ))}
      {data.cards.map((c) => (
        <CardTile key={c.col} card={c} />
      ))}
    </group>
  );
});

function Ground({
  type,
  theme,
  deck,
  belt,
}: {
  type: RowData['type'];
  theme: RowData['theme'];
  deck?: number;
  belt?: RowData['belt'];
}) {
  const textures = useMemo(getGroundTextures, []);

  // Zona de cruceros: el agua fatal la dibuja <CruiseWater/> (nada aquí); los
  // muelles/arcos son pontones flotantes seguros.
  if (theme === 'cruise') {
    if (type === 'water') return null;
    return <DockDeck variant={deck ?? 0} />;
  }

  // TUM: banda transportadora — el único suelo del juego que se mueve
  if (type === 'belt' && belt) return <ConveyorDeck belt={belt} />;

  // TILH: vías sobre balasto (textura a color, no se tiñe)
  if (type === 'rail') {
    return (
      <mesh position={[0, -0.04, 0]} receiveShadow>
        <boxGeometry args={[ROW_WIDTH, 0.08, BALANCE.TILE]} />
        <meshStandardMaterial map={textures.rail} roughness={0.95} />
      </mesh>
    );
  }

  if (type === 'road') {
    return (
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.001, 0]} receiveShadow>
        <planeGeometry args={[ROW_WIDTH, BALANCE.TILE]} />
        <meshStandardMaterial map={textures.road} color={PALETTE.asphalt} roughness={0.95} />
      </mesh>
    );
  }
  // Filas de grúa (RTG y pórtico de taller): hormigón con las franjas de
  // precaución que ya trae la textura. Nada emisivo encima — con varias filas
  // de grúa en pantalla, las bandas brillantes se comían la escena.
  if (type === 'crane' || type === 'gantry') {
    return (
      <mesh position={[0, -0.05, 0]} receiveShadow>
        <boxGeometry args={[ROW_WIDTH, 0.1, BALANCE.TILE]} />
        <meshStandardMaterial map={textures.crane} roughness={0.95} />
      </mesh>
    );
  }
  // Patios: hormigón de astillero (TNG) o retícula portuaria (LCT/TILH)
  const map = theme === 'shipyard' ? textures.shipyard : textures.yard;
  const tint = theme === 'shipyard' ? '#39424e' : '#20304a';
  return (
    <mesh position={[0, -0.05, 0]} receiveShadow>
      <boxGeometry args={[ROW_WIDTH, 0.1, BALANCE.TILE]} />
      <meshStandardMaterial map={map} color={tint} roughness={0.95} />
    </mesh>
  );
}

/**
 * BANDA TRANSPORTADORA de TUM. La goma se desplaza a la MISMA velocidad con la
 * que `updateConveyor` arrastra al colaborador: si la textura fuera decorativa
 * y corriera a su aire, el jugador vería moverse el suelo a una velocidad y
 * notaría otra en los pies, que es la forma más rápida de que una mecánica se
 * lea como un bug.
 *
 * Cada fila clona la textura: comparten la imagen (una sola en GPU) pero cada
 * una lleva su propio `offset`, porque dos bandas contiguas pueden correr en
 * sentidos opuestos.
 */
function ConveyorDeck({ belt }: { belt: NonNullable<RowData['belt']> }) {
  const textures = useMemo(getGroundTextures, []);
  const map = useMemo(() => {
    const t = textures.belt.clone();
    t.needsUpdate = true;
    // El galón apunta a +x; en sentido contrario se voltea la textura
    t.repeat.set(TILES_ACROSS * belt.direction, 1);
    return t;
  }, [textures, belt.direction]);

  useFrame((_, dt) => {
    // `vUv = uv * repeat + offset`: subir el offset desplaza el dibujo hacia −x,
    // así que para que la goma corra hacia +x hay que restar.
    map.offset.x -= (belt.direction * belt.speed * dt) / BALANCE.TILE;
  });

  // Bastidor de acero a los dos costados con su franja de seguridad: es lo que
  // dice "esto es maquinaria" y no "esto es un carril pintado".
  const frame = useMemo(
    () =>
      mergedBoxes('belt:frame', () =>
        [-1, 1].flatMap((sz) => [
          {
            size: [ROW_WIDTH, 0.26, 0.14] as [number, number, number],
            pos: [0, 0.13, sz * BALANCE.TILE * 0.5] as [number, number, number],
            color: '#78838f',
          },
          {
            size: [ROW_WIDTH, 0.05, 0.16] as [number, number, number],
            pos: [0, 0.28, sz * BALANCE.TILE * 0.5] as [number, number, number],
            color: '#c9a94a',
          },
        ]),
      ),
    [],
  );

  return (
    <group>
      <mesh position={[0, -0.02, 0]} receiveShadow>
        <boxGeometry args={[ROW_WIDTH, 0.16, BALANCE.TILE * 0.9]} />
        <meshStandardMaterial map={map} roughness={0.85} />
      </mesh>
      <mesh geometry={frame} material={MERGED_STD} castShadow receiveShadow />
    </group>
  );
}

const DECK_WIDTH = (BALANCE.MAX_TILE - BALANCE.MIN_TILE + 1) * BALANCE.TILE;
/** Cara superior del tablado: todo lo que se pinta encima arranca aquí */
const DECK_TOP = 0.11;
/** Borde de la fila donde van los herrajes de amarre */
const DECK_EDGE = BALANCE.TILE * 0.4;

/**
 * ACABADOS de pontón. Con un solo acabado, dos muelles seguidos se leían como un
 * único tablado del doble de fondo, y una racha larga como un parqué hasta el
 * horizonte: mucho suelo repetido y nada que mirar. Cada fila elige el suyo al
 * generarse (`row.deck`) y nunca repite el de la anterior.
 */
const DECK_STYLES: Array<{ map: keyof ReturnType<typeof getGroundTextures>; color: string; props: () => BoxPart[] }> = [
  // 0 · PONTÓN DE MADERA con bolardos de amarre (el de toda la vida)
  {
    map: 'dock',
    color: '#8a6f4e',
    props: () =>
      [-6, -2, 2, 6].map((c) => ({
        size: [0.2, 0.2, 0.2] as [number, number, number],
        pos: [colX(c), 0.16, DECK_EDGE] as [number, number, number],
        color: PALETTE.white,
      })),
  },
  // 1 · ANDÉN DE HORMIGÓN del atraque: franja de seguridad pintada en los dos
  //     bordes y bitas de amarre bajas. Es el suelo del arco de entrada.
  {
    map: 'shipyard',
    color: '#5c6672',
    props: () => {
      const parts: BoxPart[] = [];
      for (const s of [-1, 1]) {
        parts.push({ size: [DECK_WIDTH, 0.03, 0.14], pos: [0, DECK_TOP, s * 0.42], color: '#c9a94a' });
        for (const c of [-4, 4]) {
          parts.push({ size: [0.26, 0.22, 0.26], pos: [colX(c), 0.17, s * DECK_EDGE], color: '#98a2ac' });
        }
      }
      return parts;
    },
  },
  // 2 · MUELLE DE SERVICIO: madera clara con la calle de embarque pintada a lo
  //     ancho (banda navy + marcas blancas) y cornamusas naranja.
  {
    map: 'dock',
    color: '#a3855c',
    props: () => {
      const parts: BoxPart[] = [
        { size: [DECK_WIDTH, 0.03, 0.5], pos: [0, DECK_TOP, 0], color: PALETTE.hpNavy },
      ];
      for (let c = -7; c <= 7; c += 2) {
        parts.push({ size: [0.5, 0.03, 0.07], pos: [colX(c), DECK_TOP + 0.025, 0], color: PALETTE.white });
      }
      for (const c of [-7, -3, 3, 7]) {
        parts.push({ size: [0.3, 0.16, 0.16], pos: [colX(c), 0.16, DECK_EDGE], color: PALETTE.safetyOrange });
      }
      return parts;
    },
  },
];

/** Pontón/muelle flotante SEGURO (fila 'dock'/'gate'): tablado con herrajes de
 *  amarre, deliberadamente distinto de las barcazas móviles (casco de color +
 *  franjas naranja) para que se lea de un vistazo dónde puedes pararte. */
function DockDeck({ variant = 0 }: { variant?: number }) {
  const textures = useMemo(getGroundTextures, []);
  const style = DECK_STYLES[variant % DECK_STYLES.length];
  // Herrajes y pintura: son varias piezas por fila y muchas filas en pantalla —
  // fusionadas en una geometría se pintan de una llamada en vez de una por caja.
  const props = useMemo(
    () => mergedBoxes(`deck:props:${variant % DECK_STYLES.length}`, style.props),
    [variant, style],
  );
  return (
    <group>
      {/* Tablado */}
      <mesh position={[0, 0.03, 0]} receiveShadow castShadow>
        <boxGeometry args={[DECK_WIDTH, 0.16, BALANCE.TILE * 0.96]} />
        <meshStandardMaterial map={textures[style.map]} color={style.color} roughness={0.9} />
      </mesh>
      {/* ESPUMA donde el agua toca el pontón */}
      {[-1, 1].map((sf) => (
        <mesh key={`f${sf}`} position={[0, -0.03, sf * BALANCE.TILE * 0.52]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[DECK_WIDTH + 1.2, 0.16]} />
          <meshBasicMaterial color="#bfe9ff" transparent opacity={0.4} depthWrite={false} />
        </mesh>
      ))}
      <mesh geometry={props} material={MERGED_STD} castShadow />
    </group>
  );
}

/** Posiciona el vehículo leyendo la X mutable de sus metadatos (traffic.ts) */
function Vehicle({ data }: { data: VehicleData }) {
  const group = useRef<THREE.Group>(null);

  useFrame(() => {
    const g = group.current;
    if (!g) return;
    g.position.x = data.x;
    // Encarar el sentido de la marcha (modelos miran +x)
    g.rotation.y = data.direction === 1 ? 0 : Math.PI;
  });

  return (
    <group ref={group}>
      {data.kind === 'truck' && <TruckModel colorIndex={data.colorIndex} speed={data.speed} />}
      {data.kind === 'agv' && <AGVModel colorIndex={data.colorIndex} speed={data.speed} />}
      {/* FLOTA de la dársena. Todas reciben sus propios metadatos: de ahí leen
          cuánto las hunde el colaborador cuando va a bordo (traffic.ts). El
          remolcador es la principal; el resto le da variedad a la marina. */}
      {data.kind === 'tug' && <TugboatModel colorIndex={data.colorIndex} boat={data} />}
      {data.kind === 'sail' && <SailboatModel colorIndex={data.colorIndex} boat={data} />}
      {data.kind === 'yacht' && <YachtModel colorIndex={data.colorIndex} boat={data} />}
      {data.kind === 'fish' && <FishingBoatModel colorIndex={data.colorIndex} boat={data} />}
      {/* Crucero ABORDABLE que cruza la dársena (cubierta de paseo transitable) */}
      {data.kind === 'ship' && <CruiseShipModel speed={data.speed} />}
      {data.kind === 'train' && <TrainModel tiles={data.tiles} colorIndex={data.colorIndex} />}
      {data.kind === 'forklift' && <ForkliftModel colorIndex={data.colorIndex} speed={data.speed} />}
      {/* Maquinaria de granel de TUM: tolvas en convoy y cargadoras de pala */}
      {data.kind === 'hopper' && <HopperTruckModel colorIndex={data.colorIndex} speed={data.speed} />}
      {data.kind === 'loader' && <WheelLoaderModel speed={data.speed} />}
    </group>
  );
}

/**
 * Grúa móvil — la X viene de traffic.ts. En el patio es una RTG (peligran sus
 * patas, el hueco central salva); en el astillero es la carga del puente-grúa,
 * que arrolla en toda su manga y solo se esquiva desde un andamio.
 */
function Crane({
  data,
  gantry = false,
  mega = false,
  rowIndex,
}: {
  data: CraneData;
  gantry?: boolean;
  mega?: boolean;
  rowIndex: number;
}) {
  const group = useRef<THREE.Group>(null);

  useFrame(() => {
    if (group.current) group.current.position.x = data.x;
  });

  // La del dique mayor es un pórtico sobre los muros (y no atropella: iza)
  return (
    <group ref={group}>{mega ? <DockPortalCrane rowIndex={rowIndex} /> : gantry ? <GantryLoad /> : <MovingRTG />}</group>
  );
}

/* ---------------------------------------------------------------- tarjetas */

function makeLabelTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 128;
  const texture = new THREE.CanvasTexture(canvas);
  texture.anisotropy = 4;
  const ctx = canvas.getContext('2d')!;
  return { texture, canvas, ctx };
}

/**
 * FICHA REDONDA de concepto: PALOMITA (✓) para los correctos y TACHE (✗) para
 * los erróneos, dentro de un disco — ya no es una tarjeta rectangular. El
 * símbolo es lo único que hay que leer a distancia, así que ocupa el círculo
 * entero y el concepto va debajo, fuera del disco.
 *
 * Se dibuja en canvas en vez de usar imágenes: borde nítido a cualquier
 * resolución y cero PNG que cargar en caliente en el stand. Las dos texturas se
 * cachean a nivel de módulo — hay dos variantes, no una por ficha.
 */
let tokenFaces: { good: THREE.CanvasTexture; bad: THREE.CanvasTexture } | null = null;

function makeTokenFace(good: boolean): THREE.CanvasTexture {
  const S = 256;
  const canvas = document.createElement('canvas');
  canvas.width = S;
  canvas.height = S;
  const ctx = canvas.getContext('2d')!;
  const accent = good ? PALETTE.glowGood : PALETTE.glowBad;
  const cx = S / 2;
  const cy = S / 2;

  // Disco de fondo (fuera del círculo la textura queda transparente)
  ctx.beginPath();
  ctx.arc(cx, cy, S * 0.46, 0, Math.PI * 2);
  ctx.fillStyle = good ? 'rgba(3, 26, 16, 0.94)' : 'rgba(30, 4, 12, 0.94)';
  ctx.fill();

  // Aro del color del concepto
  ctx.beginPath();
  ctx.arc(cx, cy, S * 0.43, 0, Math.PI * 2);
  ctx.strokeStyle = accent;
  ctx.lineWidth = 14;
  ctx.shadowColor = accent;
  ctx.shadowBlur = 18;
  ctx.stroke();

  // Símbolo centrado, a toda la moneda
  const r = S * 0.26;
  ctx.strokeStyle = accent;
  ctx.lineWidth = 26;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.shadowBlur = 24;
  ctx.beginPath();
  if (good) {
    // PALOMITA
    ctx.moveTo(cx - r * 0.72, cy + r * 0.06);
    ctx.lineTo(cx - r * 0.18, cy + r * 0.6);
    ctx.lineTo(cx + r * 0.74, cy - r * 0.62);
  } else {
    // TACHE
    ctx.moveTo(cx - r * 0.6, cy - r * 0.6);
    ctx.lineTo(cx + r * 0.6, cy + r * 0.6);
    ctx.moveTo(cx + r * 0.6, cy - r * 0.6);
    ctx.lineTo(cx - r * 0.6, cy + r * 0.6);
  }
  ctx.stroke();

  const texture = new THREE.CanvasTexture(canvas);
  texture.anisotropy = 4;
  return texture;
}

function getTokenFaces() {
  if (!tokenFaces) tokenFaces = { good: makeTokenFace(true), bad: makeTokenFace(false) };
  return tokenFaces;
}

/**
 * Ficha de concepto sobre una casilla: disco con palomita/tache, halo circular
 * emisivo para el bloom y etiqueta dibujada en canvas (fuente del sistema —
 * cero dependencias de red, apto para stand offline).
 */
function CardTile({ card }: { card: CardData }) {
  const group = useRef<THREE.Group>(null);
  const spin = useRef(Math.random() * Math.PI * 2);
  const faces = useMemo(getTokenFaces, []);
  const glow = card.good ? PALETTE.glowGood : PALETTE.glowBad;

  const label = useMemo(() => {
    const l = makeLabelTexture();
    l.ctx.clearRect(0, 0, 256, 128);
    l.ctx.fillStyle = 'rgba(2, 8, 16, 0.72)';
    l.ctx.fillRect(0, 40, 256, 50);
    l.ctx.fillStyle = card.good ? '#d8ffe8' : '#ffd7de';
    l.ctx.font = '800 28px "Segoe UI", system-ui, sans-serif';
    l.ctx.textAlign = 'center';
    l.ctx.textBaseline = 'middle';
    l.ctx.fillText(card.label, 128, 65, 240);
    l.texture.needsUpdate = true;
    return l;
  }, [card.label, card.good]);

  useFrame((state, dt) => {
    const g = group.current;
    if (!g) return;
    if (card.collected) {
      g.visible = false;
      return;
    }
    g.visible = true;
    spin.current += dt * (card.good ? 1.4 : 2.2);
    g.position.set(colX(card.col), 0.95 + Math.sin(spin.current * 1.2) * 0.08, 0);
    g.quaternion.copy(state.camera.quaternion);
    if (!card.good) g.position.x += Math.sin(spin.current * 29) * 0.02;
  });

  return (
    <group ref={group}>
      {/* Halo circular emisivo — el bloom lo enciende */}
      <mesh position={[0, 0, -0.035]}>
        <circleGeometry args={[0.62, 28]} />
        <meshBasicMaterial color={glow} toneMapped={false} transparent opacity={0.45} />
      </mesh>
      {/* Disco: palomita (correcto) o tache (erróneo) */}
      <mesh>
        <planeGeometry args={[1.12, 1.12]} />
        <meshBasicMaterial map={card.good ? faces.good : faces.bad} transparent toneMapped={false} />
      </mesh>
      {/* Etiqueta del concepto, debajo del disco */}
      <mesh position={[0, -0.66, 0.02]}>
        <planeGeometry args={[0.92, 0.46]} />
        <meshBasicMaterial map={label.texture} transparent toneMapped={false} />
      </mesh>
    </group>
  );
}
