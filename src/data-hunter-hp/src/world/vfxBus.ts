/**
 * Cola de eventos de VFX entre la lógica (playerLogic/traffic) y los
 * componentes de partículas. El productor hace push; el consumidor (Vfx) la
 * drena en su useFrame asignando eventos a slots del pool. Nunca crece sin
 * límite: se vacía cada frame.
 */
export interface VfxEvent {
  kind: 'collect' | 'impact' | 'splash';
  x: number;
  y: number;
  z: number;
}

export const vfxBus: VfxEvent[] = [];
