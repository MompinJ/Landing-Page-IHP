import { useFrame, useThree } from '@react-three/fiber';
import { memo, useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { BALANCE, clampViewRows, colX, rowZ, viewRowsFor } from '../data/balance';
import { PALETTE } from '../data/palette';
import { registraSonda } from '../debug/debug';
import { QUALITY } from '../render/quality';
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
  // Nota para quien lo intente: aquí se probó `useDeferredValue` para que el
  // montaje de las filas nuevas no bloqueara el frame. NO sirve, y está medido
  // (`scripts/jank-test.ts`): los tirones salieron idénticos. Con el dibujo
  // atado al rAF de R3F no hay tiempo ocioso donde repartir el trabajo, así que
  // diferirlo solo lo reordena — el frame lo sigue pagando entero.
  const currentRow = useGameStore((s) => s.currentRow);
  // rows se regenera al iniciar partida — la fase fuerza remonte del mapa.
  // El briefing cuenta como portada: pasar de la portada a las instrucciones
  // no regenera nada, así que remontar el mapa entero ahí sería un parpadeo
  // gratis en la pantalla que el jugador está leyendo.
  const phase = useGameStore((s) => s.phase);
  const enPartida = phase === 'playing' || phase === 'gameover';
  // La cámara ortográfica tiene zoom fijo: cuanto mayor es la ventana, más
  // mundo entra en cuadro y más filas hay que dibujar (ver `viewRowsFor`).
  const size = useThree((s) => s.size);
  // La ventana de dibujo la calcula `viewRowsFor` a partir del tamaño de la
  // ventana, pero el NIVEL GRÁFICO le pone techo: cada fila de más son mallas,
  // llamadas de dibujo y, si hay sombra, una segunda pasada de todas ellas. En
  // una pantalla grande con gráfica integrada, dibujar 44 filas de puerto es
  // justo lo que no se puede pagar (ver `render/quality.ts`).
  const view = useMemo(
    () => clampViewRows(viewRowsFor(size.width, size.height), QUALITY.maxRows),
    [size.width, size.height],
  );
  // El generador de filas necesita saber cuánto se ve para ir por delante
  useEffect(() => setLookahead(view.ahead), [view.ahead]);

  const start = Math.max(0, currentRow - view.behind);
  const end = Math.min(rows.length, currentRow + view.ahead + 1);
  const visible = rows.slice(start, end);

  return (
    <group key={enPartida ? 'game' : 'menu'}>
      {/* EL SUELO DE TODAS LAS FILAS, en una llamada de dibujo por tipo en vez
          de una por fila. Vive aquí y no dentro de <Row> porque instanciar
          consiste justamente en juntar lo que estaba repartido (ver
          `BandaDeSuelo`). */}
      <BandaDeSuelo visibles={visible} />
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

/** Se exporta para que el PRECALENTADO de shaders (`Warmup.tsx`) monte filas
 *  reales en vez de una réplica que se desincronizaría en cuanto alguien
 *  añadiera una pieza nueva a una fila. */
export const Row = memo(function Row({ data }: { data: RowData }) {
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

/**
 * SUELO — de una llamada de dibujo POR FILA a una por TIPO DE SUELO.
 *
 * Era el grupo homogéneo más grande del frame: con la ventana de un teléfono
 * hay unas treinta filas en cuadro, cada una dibujaba su losa y eso son treinta
 * llamadas de las ciento ochenta que se envían — un 17% del frame en losas
 * planas. Y son todas iguales salvo la textura y el tinte: misma forma, mismo
 * ancho, cambiando solo la Z.
 *
 * Eso es exactamente para lo que existe el dibujo INSTANCIADO: una geometría,
 * un material, y una lista de posiciones que la GPU repite sin volver a cruzar
 * al hilo de JavaScript. Las treinta llamadas se quedan en una por tipo de
 * suelo presente — dos o tres dentro de una terminal, cuatro o cinco al cruzar
 * de una a otra.
 *
 * Los suelos ESPECIALES se quedan fuera y siguen yendo fila a fila, porque
 * ninguno de los dos se repite igual: la banda transportadora lleva su propio
 * desplazamiento de textura (dos bandas contiguas pueden correr en sentidos
 * opuestos) y el pontón de cruceros tiene variantes con geometría distinta. Son
 * pocas filas y no compensa forzarlas al molde.
 */
interface SueloSimple {
  /** Clave de agrupación: filas con la misma clave comparten malla */
  clave: string;
  mapa: THREE.CanvasTexture;
  /** Tinte del material, o `null` si la textura ya va a color */
  tinte: string | null;
  /** Altura de la losa y su centro en Y */
  alto: number;
  y: number;
}

/** El suelo de esta fila, si es de los que se pueden instanciar. `null` = va
 *  por su cuenta (ver la cabecera de arriba). */
function sueloSimpleDe(data: RowData): SueloSimple | null {
  const t = getGroundTextures();
  // Cruceros: el agua la dibuja <CruiseWater/> y los pontones tienen variantes
  if (data.theme === 'cruise') return null;
  // TUM: la banda lleva desplazamiento propio por fila
  if (data.type === 'belt' && data.belt) return null;

  // TILH: vías sobre balasto (textura a color, no se tiñe)
  if (data.type === 'rail') return { clave: 'rail', mapa: t.rail, tinte: null, alto: 0.08, y: -0.04 };
  if (data.type === 'road')
    return { clave: 'road', mapa: t.road, tinte: PALETTE.asphalt, alto: 0.1, y: -0.05 };
  // Filas de grúa (RTG y pórtico de taller): hormigón con franjas de precaución
  if (data.type === 'crane' || data.type === 'gantry')
    return { clave: 'crane', mapa: t.crane, tinte: null, alto: 0.1, y: -0.05 };
  // Patios: hormigón de astillero (TNG) o retícula portuaria (LCT/TILH)
  return data.theme === 'shipyard'
    ? { clave: 'yard-shipyard', mapa: t.shipyard, tinte: '#39424e', alto: 0.1, y: -0.05 }
    : { clave: 'yard', mapa: t.yard, tinte: '#20304a', alto: 0.1, y: -0.05 };
}

/** Geometrías y materiales del suelo, uno por tipo y compartidos: son los que
 *  hacen que todas las filas de un tipo quepan en una sola llamada. */
const sueloGeo: Record<string, THREE.BoxGeometry> = {};
const sueloMat: Record<string, THREE.MeshStandardMaterial> = {};

function recursosSuelo(s: SueloSimple) {
  if (!sueloGeo[s.clave]) sueloGeo[s.clave] = new THREE.BoxGeometry(ROW_WIDTH, s.alto, BALANCE.TILE);
  if (!sueloMat[s.clave]) {
    sueloMat[s.clave] = new THREE.MeshStandardMaterial({
      map: s.mapa,
      color: s.tinte ?? '#ffffff',
      roughness: 0.95,
    });
  }
  return { geo: sueloGeo[s.clave], mat: sueloMat[s.clave] };
}

/** Una malla instanciada por tipo de suelo presente en la ventana visible. */
function BandaDeSuelo({ visibles }: { visibles: RowData[] }) {
  const grupos = useMemo(() => {
    const por: Record<string, { suelo: SueloSimple; zs: number[] }> = {};
    for (const fila of visibles) {
      const s = sueloSimpleDe(fila);
      if (!s) continue;
      (por[s.clave] ??= { suelo: s, zs: [] }).zs.push(rowZ(fila.index));
    }
    return Object.values(por);
  }, [visibles]);

  return (
    <>
      {grupos.map((g) => (
        <LosasInstanciadas key={g.suelo.clave} suelo={g.suelo} zs={g.zs} />
      ))}
    </>
  );
}

const MATRIZ = new THREE.Matrix4();

function LosasInstanciadas({ suelo, zs }: { suelo: SueloSimple; zs: number[] }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const { geo, mat } = recursosSuelo(suelo);

  // Las posiciones se escriben en un efecto y no en el render: `InstancedMesh`
  // no las toma por props, hay que meterlas en su buffer de matrices y avisar.
  useEffect(() => {
    const m = ref.current;
    if (!m) return;
    for (let i = 0; i < zs.length; i++) {
      MATRIZ.makeTranslation(0, suelo.y, zs[i]);
      m.setMatrixAt(i, MATRIZ);
    }
    m.count = zs.length;
    m.instanceMatrix.needsUpdate = true;
    // La caja que three usa para descartar fuera de cuadro se calcula de la
    // geometría, que aquí está en el origen: sin recalcularla, la banda entera
    // desaparecía en cuanto el origen salía del encuadre.
    m.computeBoundingSphere();
  }, [zs, suelo.y]);

  return (
    // `key` con el número de losas: `InstancedMesh` reserva su buffer al
    // crearse, así que al crecer la ventana hay que rehacerla en vez de
    // intentar escribir más allá de lo reservado.
    <instancedMesh
      key={zs.length}
      ref={ref}
      args={[geo, mat, Math.max(1, zs.length)]}
      receiveShadow
      frustumCulled={false}
    />
  );
}

/** Suelos que NO se instancian: pontón de cruceros y banda transportadora. */
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
  if (theme === 'cruise') {
    if (type === 'water') return null;
    return <DockDeck variant={deck ?? 0} />;
  }
  if (type === 'belt' && belt) return <ConveyorDeck belt={belt} />;
  return null;
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
    // `vUv = uv * repeat + offset`, así que una marca del dibujo aparece donde
    // `u = (c − offset) / repeat` y se mueve a `−(Δoffset/Δt) / repeat`.
    //
    // SIN `belt.direction` AQUÍ, a propósito: el sentido ya lo lleva el `repeat`
    // negativo de arriba, que voltea la textura. Multiplicarlo también en el
    // offset lo aplicaba DOS veces y se cancelaba —quedaba `speed / (TILE *
    // TILES_ACROSS)` en los dos casos—, así que la goma corría siempre hacia el
    // mismo lado mientras los galones y el empujón sí se volteaban: con sentido
    // −1 las flechas y el arrastre iban a un lado y la goma se veía correr al
    // otro. Medido en `scripts/belt-direction-test.ts`.
    map.offset.x -= (belt.speed * dt) / BALANCE.TILE;
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

/**
 * ETIQUETAS DE FICHA, CACHEADAS POR PALABRA — era la fuente de tirones que
 * quedaba viva en partida.
 *
 * Lo que hacía antes: `CardTile` creaba su textura dentro de un `useMemo`. Un
 * `useMemo` es POR INSTANCIA, así que no cacheaba nada entre fichas — cada
 * ficha que entraba en cuadro dibujaba su canvas y subía una textura nueva a la
 * GPU, incluso para una palabra ya vista diez filas antes. Y no se liberaba
 * ninguna. Medido recorriendo el mapa entero en un teléfono emulado: de 14 a 70
 * texturas, y al volver a la fila 0 seguían siendo 70 — o sea acumulación, no
 * reciclaje. Cada una de esas subidas es un frame largo, y caían justo donde
 * hay más fichas.
 *
 * Es raro porque justo debajo, `tokenFaces` ya cachea a nivel de módulo con
 * este mismo razonamiento escrito al lado («hay dos variantes, no una por
 * ficha»). A las etiquetas no se les aplicó la misma disciplina.
 *
 * POR QUÉ 128×64 Y NO 256×128. La etiqueta mide 0.92 unidades de mundo de
 * ancho. Proyectada, eso son ~41 píxeles de aparato en un teléfono (zoom 35,
 * densidad 1.5) y ~91 en el stand (zoom 58, densidad 2). Una textura de 256 de
 * ancho estaba sobremuestreada seis veces: se pagaba memoria y ancho de banda
 * por detalle que no cabe en pantalla. A 128 sobra en los dos sitios.
 *
 * Y LA CUENTA DE MEMORIA, que es la que decide si esto se puede cachear entero:
 * el glosario son 349 palabras y a 128×64 RGBA son 32 KB cada una, o sea 11 MB
 * si salieran TODAS en una sesión. Una partida real ve del orden de ochenta, o
 * sea ~2.5 MB. A 256×128 habrían sido 45 MB y habría hecho falta una caché con
 * desalojo; a este tamaño la caché simple es la respuesta correcta.
 */
const LABEL_W = 128;
const LABEL_H = 64;
// Un objeto plano y no un `Map`: este fichero EXPORTA un componente llamado
// `Map`, que tapa al del lenguaje — `new Map()` aquí dentro no compila.
const labelCache: Record<string, THREE.CanvasTexture> = {};

/**
 * Etiquetas creadas pero AÚN NO SUBIDAS a la GPU.
 *
 * Crear la textura y subirla son dos cosas distintas, y esto costó verlo:
 * `<Warmup>` monta cientos de filas durante el briefing y llama a
 * `gl.compile()`, y con eso el canvas de las 206 etiquetas queda dibujado — la
 * caché de arriba se llena entera y en partida ya no se crea casi ninguna. Pero
 * `compile()` prepara MATERIALES, no sube TEXTURAS: three sube cada textura la
 * primera vez que se DIBUJA, y las filas del precalentado van con
 * `visible={false}` justamente para no dibujarse. Medido: tras el briefing, 206
 * etiquetas en caché y solo 10 texturas subidas; durante la partida, 60.
 *
 * O sea que el precalentado se estaba comiendo el trabajo de dibujar los
 * canvas y dejando para la partida el trabajo que de verdad atasca el frame.
 * Esta cola es lo que permite terminar la faena en el briefing (ver
 * `subeEtiquetasPendientes`).
 */
const labelPendientes: THREE.CanvasTexture[] = [];

function getLabelTexture(label: string, good: boolean): THREE.CanvasTexture {
  const key = `${good ? 'g' : 'b'}:${label}`;
  const hit = labelCache[key];
  if (hit) return hit;

  const canvas = document.createElement('canvas');
  canvas.width = LABEL_W;
  canvas.height = LABEL_H;
  const ctx = canvas.getContext('2d')!;
  // Banda oscura detrás del texto: la ficha se lee sobre suelo claro y sobre
  // contenedores de colores, y sin fondo la palabra desaparecía en la mitad.
  ctx.fillStyle = 'rgba(2, 8, 16, 0.72)';
  ctx.fillRect(0, LABEL_H * 0.31, LABEL_W, LABEL_H * 0.39);
  ctx.fillStyle = good ? '#d8ffe8' : '#ffd7de';
  ctx.font = `800 ${Math.round(LABEL_H * 0.22)}px "Segoe UI", system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  // `maxWidth` condensa la palabra larga en vez de recortarla
  ctx.fillText(label, LABEL_W / 2, LABEL_H * 0.508, LABEL_W * 0.94);

  const texture = new THREE.CanvasTexture(canvas);
  texture.anisotropy = 4;
  texture.needsUpdate = true;
  labelCache[key] = texture;
  labelPendientes.push(texture);
  return texture;
}

/**
 * Sube a la GPU hasta `cuantas` etiquetas de la cola y devuelve cuántas quedan.
 *
 * `initTexture` es la puerta que three deja abierta para justo esto: forzar la
 * subida de una textura sin tener que dibujarla. Se hace a cuentagotas —unas
 * pocas por frame— en vez de todas de golpe: son ~6.6 MB en total y soltarlos
 * en un solo frame convertiría el tirón de la partida en un tirón del briefing,
 * que es más benigno pero se sigue viendo.
 */
export function subeEtiquetasPendientes(gl: THREE.WebGLRenderer, cuantas: number): number {
  for (let i = 0; i < cuantas && labelPendientes.length > 0; i++) {
    gl.initTexture(labelPendientes.pop()!);
  }
  return labelPendientes.length;
}

/** Cuántas etiquetas hay cacheadas (lo leen los scripts de medición) */
export function labelCacheSize(): number {
  return Object.keys(labelCache).length;
}
registraSonda('labelCacheSize', labelCacheSize);

/**
 * GEOMETRÍAS DE LA FICHA, compartidas. Las tres son idénticas en todas las
 * fichas del tablero, y con `<circleGeometry>` / `<planeGeometry>` en el JSX
 * cada ficha que se montaba creaba las suyas y las subía a la GPU otra vez.
 * Medido en el mismo recorrido: de 58 a 265 geometrías vivas, subiendo y
 * bajando con el desfile de filas. Compartir una sola de cada quita ese
 * trasiego entero.
 */
const CARD_GEO = {
  // 1.24 y no 1.12: el plano crece justo lo que ocupaba el halo, que ahora va
  // pintado dentro de la textura (ver `makeTokenFace`). La moneda se dibuja
  // proporcionalmente más pequeña dentro, así que en pantalla mide lo mismo.
  disco: new THREE.PlaneGeometry(1.24, 1.24),
  etiqueta: new THREE.PlaneGeometry(0.92, 0.46),
};

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

  /**
   * HALO, DIBUJADO AQUÍ Y NO EN SU PROPIA MALLA.
   *
   * Antes el resplandor era un `<circleGeometry>` aparte detrás del disco: una
   * malla más por ficha, o sea una llamada de dibujo más por ficha. Con trece
   * fichas en cuadro en un teléfono eran trece llamadas de las 180 que se
   * envían — un 7% del frame gastado en un degradado.
   *
   * Y no hacía falta ninguna malla: el halo es radial y concéntrico con el
   * disco, así que cabe en la MISMA textura. Y sale gratis de memoria porque
   * estas caras son dos —una buena y una mala— compartidas por todas las
   * fichas del tablero, al revés que las etiquetas, que son una por palabra.
   *
   * El disco se dibuja un 10% más pequeño dentro del lienzo para dejarle sitio
   * al halo por fuera; el plano de la ficha crece en la misma proporción, así
   * que en pantalla la moneda mide exactamente lo que medía.
   */
  const K = 0.903; // 1.12 / 1.24: lo que encoge el dibujo al crecer el plano
  const halo = ctx.createRadialGradient(cx, cy, S * 0.30, cx, cy, S * 0.5);
  halo.addColorStop(0, accent + '73'); // 45% de opacidad, la del halo que había
  halo.addColorStop(0.62, accent + '2e');
  halo.addColorStop(1, accent + '00');
  ctx.fillStyle = halo;
  ctx.fillRect(0, 0, S, S);

  // Disco de fondo (fuera del círculo la textura queda transparente)
  ctx.beginPath();
  ctx.arc(cx, cy, S * 0.46 * K, 0, Math.PI * 2);
  ctx.fillStyle = good ? 'rgba(3, 26, 16, 0.94)' : 'rgba(30, 4, 12, 0.94)';
  ctx.fill();

  // Aro del color del concepto
  ctx.beginPath();
  ctx.arc(cx, cy, S * 0.43 * K, 0, Math.PI * 2);
  ctx.strokeStyle = accent;
  ctx.lineWidth = 14 * K;
  ctx.shadowColor = accent;
  ctx.shadowBlur = 18;
  ctx.stroke();

  // Símbolo centrado, a toda la moneda
  const r = S * 0.26 * K;
  ctx.strokeStyle = accent;
  ctx.lineWidth = 26 * K;
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

  // La textura sale de la caché de módulo: la misma palabra la comparten todas
  // las fichas que la lleven, en esta y en las siguientes partidas.
  const label = useMemo(() => getLabelTexture(card.label, card.good), [card.label, card.good]);

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
      {/* Disco con su halo ya pintado dentro: palomita (correcto) o tache
          (erróneo). UNA malla por ficha, no tres. */}
      <mesh geometry={CARD_GEO.disco}>
        <meshBasicMaterial map={card.good ? faces.good : faces.bad} transparent toneMapped={false} />
      </mesh>
      {/* Etiqueta del concepto, debajo del disco */}
      <mesh position={[0, -0.66, 0.02]} geometry={CARD_GEO.etiqueta}>
        <meshBasicMaterial map={label} transparent toneMapped={false} />
      </mesh>
    </group>
  );
}
