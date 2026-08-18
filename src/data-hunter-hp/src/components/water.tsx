import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { BALANCE, rowZ } from '../data/balance';
import { runtime } from '../store/runtime';
import { zoneOf } from '../world/rows';

const ROW_WIDTH = (BALANCE.MAX_TILE - BALANCE.MIN_TILE + 1 + 26) * BALANCE.TILE;
const ZONE_SPAN = BALANCE.ZONE_LENGTH * BALANCE.TILE;

/**
 * Mapa de NORMALES de oleaje (canvas, seamless). Da brillo especular animado
 * de la luz direccional → el agua se lee como agua aunque el reflejo sea sutil
 * (p. ej. en GPU por software). Se combina con los reflejos reales.
 */
function makeRippleNormalMap(size = 128): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const img = ctx.createImageData(size, size);
  const d = img.data;
  const h = (x: number, y: number) => {
    const u = (x / size) * Math.PI * 2;
    const v = (y / size) * Math.PI * 2;
    return Math.sin(u * 3) * 0.5 + Math.sin(v * 4) * 0.4 + Math.sin((u + v) * 2) * 0.3;
  };
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const hl = h(x - 1, y);
      const hr = h(x + 1, y);
      const hd = h(x, y - 1);
      const hu = h(x, y + 1);
      const nx = (hl - hr) * 0.6;
      const ny = (hd - hu) * 0.6;
      const nz = 1;
      const len = Math.hypot(nx, ny, nz);
      const idx = (y * size + x) * 4;
      d[idx] = Math.floor(((nx / len) * 0.5 + 0.5) * 255);
      d[idx + 1] = Math.floor(((ny / len) * 0.5 + 0.5) * 255);
      d[idx + 2] = Math.floor(((nz / len) * 0.5 + 0.5) * 255);
      d[idx + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(9, 9);
  return tex;
}

/**
 * OCÉANO INFINITO — elimina el vacío negro bajo y alrededor de los muelles.
 * Plano gigante a Y=-0.5 que sigue al jugador (siempre cubre la vista de la
 * cámara isométrica). Material estándar barato (sin reflexión: esa la pone
 * CruiseWater solo donde se juega sobre agua) con normal-map de oleaje animado
 * por dt → crestas con brillo especular cyan/azul en movimiento constante.
 */
const oceanTime = { value: 0 };

export function OceanBackground() {
  const mesh = useRef<THREE.Mesh>(null);
  const normalMap = useMemo(makeRippleNormalMap, []);
  const material = useMemo(() => {
    const m = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#0e4f7d'),
      emissive: new THREE.Color('#0a3d63'),
      emissiveIntensity: 0.55,
      normalMap,
      normalScale: new THREE.Vector2(0.9, 0.9),
      metalness: 0.35,
      roughness: 0.35,
    });
    // OLAS DE VERTICE reales (desplazamiento por suma de senos en mundo)
    m.onBeforeCompile = (shader) => {
      shader.uniforms.uTime = oceanTime;
      shader.vertexShader = 'uniform float uTime;\n' + shader.vertexShader.replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
         vec4 _wp = modelMatrix * vec4(position, 1.0);
         transformed.z += 0.09 * sin(0.55 * _wp.x + uTime * 1.1)
                        + 0.07 * sin(0.8 * _wp.z + uTime * 0.8);`
      );
    };
    return m;
  }, [normalMap]);

  useFrame((_, dt) => {
    oceanTime.value += dt;
    normalMap.offset.x = (normalMap.offset.x + dt * 0.014) % 1;
    normalMap.offset.y = (normalMap.offset.y + dt * 0.01) % 1;
    const m = mesh.current;
    if (!m) return;
    // Sigue al jugador en pasos de casilla (sin jitter de textura)
    m.position.x = Math.round(runtime.x / BALANCE.TILE) * BALANCE.TILE;
    m.position.z = Math.round(runtime.z / BALANCE.TILE) * BALANCE.TILE;
  });

  return (
    <mesh ref={mesh} rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.5, 0]} material={material}>
      <planeGeometry args={[240, 240, 96, 96]} />
    </mesh>
  );
}

/**
 * Superficie de agua REAL para la terminal de cruceros: un único plano con
 * `MeshReflectorMaterial` que refleja grúas, barcos y el neón de las tarjetas,
 * con reflejos ondulados por el mapa de distorsión animado. Se autoposiciona
 * sobre la zona de mar actual y se oculta en el puerto (cero coste de reflexión
 * cuando no se ve).
 */
export function CruiseWater() {
  const mesh = useRef<THREE.Mesh>(null);
  const normalMap = useMemo(makeRippleNormalMap, []);

  useFrame((_, dt) => {
    normalMap.offset.x = (normalMap.offset.x + dt * 0.022) % 1;
    normalMap.offset.y = (normalMap.offset.y - dt * 0.016 + 1) % 1;

    const m = mesh.current;
    if (!m) return;
    const cruise = zoneOf(runtime.row) === 'cruise';
    m.visible = cruise;
    if (cruise) {
      const zoneStart = Math.floor(runtime.row / BALANCE.ZONE_LENGTH) * BALANCE.ZONE_LENGTH;
      const centerRow = zoneStart + BALANCE.ZONE_LENGTH / 2 - 0.5;
      m.position.z = rowZ(centerRow);
    }
  });

  // AGUA GARANTIZADA: material estándar con emisivo propio — se ve azul en
  // cualquier GPU/iluminación. (El MeshReflectorMaterial anterior devolvía el
  // reflejo del cielo nocturno = agua negra en hardware real → eliminado.)
  return (
    <mesh ref={mesh} rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.06, 0]} visible={false}>
      <planeGeometry args={[ROW_WIDTH, ZONE_SPAN + 4]} />
      <meshStandardMaterial
        color="#1266a0"
        emissive="#0d517f"
        emissiveIntensity={0.6}
        normalMap={normalMap}
        normalScale={new THREE.Vector2(1.0, 1.0)}
        metalness={0.3}
        roughness={0.3}
      />
    </mesh>
  );
}
