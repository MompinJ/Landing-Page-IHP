import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import { playTrainBell } from '../audio/sfx';
import { BALANCE, colX } from '../data/balance';
import { rows } from '../world/rows';

import { runtime } from '../store/runtime';
import { useGameStore } from '../store/useGameStore';
import { updateTraffic } from '../world/traffic';

/**
 * Sistema central: temporizador estricto de 90 s + tráfico/colisiones.
 * Corre dentro del Canvas pero SOLO escribe en `runtime`/metadatos; toca el
 * store únicamente en eventos discretos (cambio de segundo, impacto, fin).
 */
export function GameLoop() {
  const bellTimer = useRef(0);
  useFrame((_, dt) => {
    const store = useGameStore.getState();
    if (store.phase !== 'playing') return;

    runtime.elapsed += dt;

    // Vehículos + hit detection (lógica pura compartida con la simulación)
    updateTraffic(dt);

    // AUDIO ESPACIAL: campana del cruce cuando un tren cercano se aproxima
    bellTimer.current -= dt;
    if (bellTimer.current <= 0) {
      for (let r = runtime.row; r <= runtime.row + 3; r++) {
        const row = rows[r];
        const train = row?.type === 'rail' ? row.vehicles[0] : undefined;
        if (!train) continue;
        const dist = Math.abs(train.x - runtime.x);
        const nearBoard = Math.abs(train.x) < colX(BALANCE.MAX_TILE) + BALANCE.TRAIN_WARN_DISTANCE + 5;
        if (nearBoard && dist < 22) {
          playTrainBell(Math.sign(train.x - runtime.x) * Math.min(1, dist / 12), 0.14 * (1 - dist / 24));
          bellTimer.current = 0.55;
          break;
        }
      }
    }
  });

  return null;
}
