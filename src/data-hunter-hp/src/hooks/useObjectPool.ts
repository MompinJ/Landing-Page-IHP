import { useRef } from 'react';

export interface Pooled {
  /** Un objeto libre puede reasignarse; uno activo está en juego */
  active: boolean;
}

export interface ObjectPool<T extends Pooled> {
  items: T[];
  /** Obtiene un objeto libre (o null si el pool está agotado). Nunca hace `new` en caliente. */
  acquire: () => T | null;
  release: (item: T) => void;
  releaseAll: () => void;
}

/** Crea un pool preasignado de `size` objetos usando `factory` UNA sola vez. */
export function createPool<T extends Pooled>(size: number, factory: (index: number) => T): ObjectPool<T> {
  const items = Array.from({ length: size }, (_, i) => {
    const item = factory(i);
    item.active = false;
    return item;
  });
  return {
    items,
    acquire() {
      for (const item of items) {
        if (!item.active) {
          item.active = true;
          return item;
        }
      }
      return null;
    },
    release(item) {
      item.active = false;
    },
    releaseAll() {
      for (const item of items) item.active = false;
    },
  };
}

/**
 * Pool preasignado estable entre renders. Prohibido instanciar/destruir en el
 * game loop: toda entidad (tarjeta, obstáculo, camión) se recicla de aquí.
 */
export function useObjectPool<T extends Pooled>(size: number, factory: (index: number) => T): ObjectPool<T> {
  const poolRef = useRef<ObjectPool<T> | null>(null);
  if (poolRef.current === null) poolRef.current = createPool(size, factory);
  return poolRef.current;
}
