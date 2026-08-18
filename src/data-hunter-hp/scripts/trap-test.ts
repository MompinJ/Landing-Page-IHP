/**
 * ¿Puede el jugador quedar ENCERRADO? Al no existir el retroceso, una fila que
 * tape por completo el tramo libre donde está el jugador lo deja atrapado sin
 * salida. Este test recorre el mapa generado buscando esa situación.
 *
 *   npx tsx scripts/trap-test.ts
 */
import { BALANCE } from '../src/data/balance';
import { useGameStore } from '../src/store/useGameStore';
import { generateRows, isBlocked, rows } from '../src/world/rows';

useGameStore.getState().startGame();
while (rows.length < 400) generateRows(BALANCE.ROWS_BATCH);

let trampas = 0;
const ejemplos: string[] = [];

for (let r = 0; r < rows.length - 1; r++) {
  // Tramos libres de la fila r (donde el jugador puede desplazarse de lado)
  let tramo: number[] = [];
  const revisar = () => {
    if (tramo.length && tramo.every((c) => isBlocked(r + 1, c))) {
      trampas++;
      if (ejemplos.length < 5) ejemplos.push(`fila ${r}: cols ${tramo[0]}..${tramo[tramo.length - 1]} sin salida a la fila ${r + 1}`);
    }
    tramo = [];
  };
  for (let c = BALANCE.MIN_TILE; c <= BALANCE.MAX_TILE; c++) {
    if (isBlocked(r, c)) revisar();
    else tramo.push(c);
  }
  revisar();
}

console.log(`filas analizadas: ${rows.length - 1}`);
console.log(`tramos sin salida (jugador encerrado): ${trampas}`);
for (const e of ejemplos) console.log('  ' + e);
if (trampas > 0) {
  console.error('FALLO: el mapa puede encerrar al jugador');
  process.exit(1);
}
console.log('OK: todo tramo libre tiene salida hacia adelante');
