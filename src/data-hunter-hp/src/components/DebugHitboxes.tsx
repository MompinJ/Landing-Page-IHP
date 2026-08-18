import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { BALANCE, hitHalfExtents, rowZ } from '../data/balance';
import { debug } from '../debug/debug';
import { runtime } from '../store/runtime';
import { rows } from '../world/rows';

/**
 * Visor de HITBOXES (Problema 2) — `?debug` en la URL + tecla H.
 *
 * Dibuja EXACTAMENTE las cajas que evalúa `traffic.ts`, no una aproximación:
 * si una caja no encaja con el modelo que hay debajo, el bug se ve a simple
 * vista. Verde = jugador, rojo = obstáculo que resta vida.
 *
 * Coste cuando está apagado: un `if` por frame y un grupo vacío en la escena.
 */
const MAX_BOXES = 48;
const PLAYER_COLOR = '#39ff88';
const HAZARD_COLOR = '#ff3b5c';

export function DebugHitboxes() {
  const group = useRef<THREE.Group>(null);
  const player = useRef<THREE.LineSegments>(null);

  // Un pool fijo de wireframes: se reposicionan por frame, cero asignaciones
  const geo = useMemo(() => new THREE.EdgesGeometry(new THREE.BoxGeometry(1, 1, 1)), []);
  const hazardMat = useMemo(
    () => new THREE.LineBasicMaterial({ color: HAZARD_COLOR, depthTest: false, toneMapped: false }),
    [],
  );
  const playerMat = useMemo(
    () => new THREE.LineBasicMaterial({ color: PLAYER_COLOR, depthTest: false, toneMapped: false }),
    [],
  );

  useFrame(() => {
    const g = group.current;
    const p = player.current;
    if (!g || !p) return;

    const on = debug.enabled && debug.hitboxes;
    g.visible = on;
    p.visible = on;
    if (!on) return;

    // Caja del jugador (la misma media caja que usa el hit test)
    p.position.set(runtime.x, 0.6, runtime.z);
    p.scale.set(BALANCE.PLAYER_HALF_X * 2, 1.2, BALANCE.PLAYER_HALF_Z * 2);

    let i = 0;
    const place = (x: number, z: number, sx: number, sz: number) => {
      const box = g.children[i++] as THREE.LineSegments | undefined;
      if (!box) return;
      box.visible = true;
      box.position.set(x, 0.55, z);
      box.scale.set(sx * 2, 1.1, sz * 2);
    };

    const from = Math.max(0, runtime.row - 4);
    const to = Math.min(rows.length - 1, runtime.row + 8);
    for (let r = from; r <= to && i < MAX_BOXES; r++) {
      const row = rows[r];
      if (!row || row.theme === 'cruise') continue;
      const rz = rowZ(r);
      for (const v of row.vehicles) {
        const half = hitHalfExtents(v.kind);
        if (half.x > 0) place(v.x, rz, half.x, half.z);
      }
      const legX = BALANCE.CRANE_LEG_HALF_X + BALANCE.PLAYER_HALF_X - BALANCE.HIT_FORGIVE;
      const legZ = BALANCE.CRANE_LEG_HALF_Z + BALANCE.PLAYER_HALF_Z - BALANCE.HIT_FORGIVE;
      for (const c of row.cranes) {
        for (const side of [-1, 1]) place(c.x + side * BALANCE.CRANE_LEG_OFFSET, rz, legX, legZ);
      }
    }
    for (; i < MAX_BOXES; i++) {
      const box = g.children[i] as THREE.LineSegments | undefined;
      if (box) box.visible = false;
    }
  });

  return (
    <>
      <lineSegments ref={player} args={[geo, playerMat]} renderOrder={999} visible={false} />
      <group ref={group} visible={false}>
        {Array.from({ length: MAX_BOXES }, (_, i) => (
          <lineSegments key={i} args={[geo, hazardMat]} renderOrder={999} visible={false} />
        ))}
      </group>
    </>
  );
}
