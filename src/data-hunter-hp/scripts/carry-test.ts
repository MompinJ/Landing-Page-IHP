/**
 * Verificación del IZADO de la grúa del dique mayor (agarrar→izar→trasladar→
 * aventar): fases bien delimitadas, cota máxima la del izado (no un arco de
 * salto), avance en Z monótono y aterrizaje limpio dos filas más allá del pad.
 */
import { BALANCE, rowZ } from '../src/data/balance';
import { runtime } from '../src/store/runtime';
import { updatePlayer, queueMove } from '../src/world/playerLogic';
import { generateRows, resetRows, rows } from '../src/world/rows';
import { useGameStore } from '../src/store/useGameStore';

const err = (msg: string) => {
  console.error('ERROR:', msg);
  process.exit(1);
};

// Mapa con dique mayor localizable
resetRows();
generateRows(200);
if (!rows.some((r) => r.docks?.some((d) => d.mega) && r.padCol !== undefined)) {
  err('no se generó dique mayor en 200 filas');
}

useGameStore.getState().startGame();
generateRows(200);

// Colocar al colaborador en el PUNTO DE EMBARQUE (pad), fila anterior al dique
const idx = rows.findIndex((r) => r.docks?.some((d) => d.mega));
const pad = rows[idx].padCol!;
runtime.row = idx - 1;
runtime.col = pad;
runtime.x = pad * BALANCE.TILE;
runtime.z = rowZ(idx - 1);
runtime.maxRow = idx - 1;

queueMove('forward');
const dt = 1 / 120;
let maxY = 0;
let prevZ = runtime.z;
let zRetrocede = false;
let viajes = 0;
let faseIzado = false;
let faseVuelo = false;
for (let i = 0; i < 1200 && viajes === 0; i++) {
  updatePlayer(dt);
  if (runtime.carrying) {
    maxY = Math.max(maxY, runtime.y);
    if (runtime.z < prevZ - 1e-9 && runtime.carryPhase < BALANCE.CARRY_LIFT_FRAC) {
      err(`avanza en Z durante el izado vertical (fase ${runtime.carryPhase.toFixed(2)})`);
    }
    if (runtime.z > prevZ + 1e-9) zRetrocede = true;
    if (runtime.carryPhase < BALANCE.CARRY_LIFT_FRAC && runtime.y > 0.05) faseIzado = true;
    if (runtime.carryPhase >= BALANCE.CARRY_RELEASE_FRAC) faseVuelo = true;
  }
  prevZ = runtime.z;
  if (!runtime.stepping && runtime.row === idx + 1) viajes = 1;
}

if (!viajes) err(`no aterrizó al otro lado del dique (row=${runtime.row}, esperado ${idx + 1})`);
if (zRetrocede) err('la Z retrocedió durante el viaje');
if (!faseIzado) err('no hubo fase de izado vertical');
if (!faseVuelo) err('no hubo fase de aventado (vuelo tras la suelta)');
if (Math.abs(maxY - BALANCE.CARRY_LIFT_Y) > 0.25) {
  err(`cota máxima ${maxY.toFixed(2)} ≠ cota de izado ${BALANCE.CARRY_LIFT_Y}`);
}
if (runtime.carryPhase !== -1) err('carryPhase no se limpió al aterrizar');
if (maxY <= BALANCE.MEGADOCK_WALK_Y) err('el viaje no sobrevuela las pasarelas del dique');

console.log(`izado OK: pad fila ${idx - 1} → aterriza fila ${idx + 1} · cota máx ${maxY.toFixed(2)}`);
console.log('OK: fases agarrar/izar/trasladar/aventar consistentes');
