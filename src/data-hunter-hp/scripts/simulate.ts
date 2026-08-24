/**
 * Simulación headless de una partida completa (90 s a 60 fps) con un jugador
 * aleatorio estilo Crossy Road. Valida la lógica pura sin navegador:
 * generación de filas, cola de saltos, validación de movimientos, tráfico,
 * hit detection, tarjetas, combo, timer y fin de partida.
 *
 *   npx tsx scripts/simulate.ts
 */
import { BALANCE } from '../src/data/balance';
import { runtime, type MoveDirection } from '../src/store/runtime';
import { useGameStore } from '../src/store/useGameStore';
import { queueMove, sweepPickup, updatePlayer } from '../src/world/playerLogic';
import { rows } from '../src/world/rows';
import { updateDying } from '../src/world/death';
import { checkHits, updateConveyor, updateTraffic, updateWaterRiding } from '../src/world/traffic';
import { vfxBus } from '../src/world/vfxBus';

const DT = 1 / 60;

useGameStore.getState().startGame();

let frames = 0;
let vfxEvents = 0;
let queuedMoves = 0;

/**
 * Golpes absorbidos por el ESCUDO: emiten VFX de impacto pero, al no costar
 * vida, no incrementan `obstaclesHit`. Hay que contarlos aparte o el cuadre
 * de eventos VFX falla en cuanto el bot recoge un concepto de protección.
 *
 * Se cuentan como «eventos de choque que NO subieron el contador de golpes»,
 * no por los puntos del evento: chocar ya no resta puntos (`SCORE_OBSTACLE`
 * = 0), así que mirar `points === 0` marcaba como absorbido TODO golpe y el
 * cuadre salía al doble.
 */
let obstacleEvents = 0;
useGameStore.subscribe(
  (s) => s.lastEvent,
  (e) => {
    if (e && e.type === 'obstacle') obstacleEvents++;
  },
);

function randomMove(): MoveDirection {
  const r = Math.random();
  if (r < 0.62) return 'forward';
  if (r < 0.78) return 'left';
  if (r < 0.94) return 'right';
  return 'backward';
}

while (useGameStore.getState().phase === 'playing' && frames < 60 * 200) {
  frames++;

  // — réplica del GameLoop —
  runtime.elapsed += DT;
  // El remate de muerte corre aquí igual que en el juego: si no, al perder la
  // última vida la partida se quedaría para siempre en «jugando» y nunca
  // llegaría a la pantalla final (ver `world/death.ts`).
  const escalaTiempo = updateDying(DT);
  if (runtime.dying > 0) {
    if (escalaTiempo > 0) updateTraffic(DT * escalaTiempo);
    continue;
  }
  updateTraffic(DT);

  // — jugador aleatorio: intenta un salto ~4 veces por segundo —
  if (Math.random() < 0.07) {
    queueMove(randomMove());
    queuedMoves++;
  }
  // El mismo orden EXACTO que <Player/>: si la simulación se salta un paso,
  // deja de valer como red de seguridad justo en el bioma que ese paso mueve.
  updatePlayer(DT);
  updateWaterRiding(DT); // mecánica río (abordar barcaza / caer al agua)
  updateConveyor(DT); // TUM: el suelo que se mueve
  sweepPickup(); // recogida al pasar por encima
  checkHits(); // igual que <Player/>: la colisión va tras mover al jugador

  vfxEvents += vfxBus.length;
  vfxBus.length = 0; // en el juego real lo drena <Vfx/>

}

const s = useGameStore.getState();
const results = {
  phase: s.phase,
  frames,
  simSeconds: +(frames * DT).toFixed(1),
  score: s.score,
  maxRow: s.maxRow,
  rowsGenerated: rows.length,
  goodCollected: s.goodCollected,
  badHit: s.badHit,
  vehicleHits: s.obstaclesHit,
  queuedMoves,
  livesLeft: s.lives,
  shieldAbsorbs: obstacleEvents - s.obstaclesHit,
  vfxEvents,
};
console.table(results);

const failures: string[] = [];
if (s.phase !== 'gameover') failures.push('la partida no terminó en gameover');
if (s.lives > 0) failures.push('terminó con vidas restantes (debería morir por vidas)');
if (s.maxRow < 2) failures.push(`el jugador apenas avanzó (maxRow=${s.maxRow})`);
if (rows.length < BALANCE.ROWS_BATCH + 2) failures.push('el mapa no se extendió');
if (s.maxRow > rows.length - BALANCE.ROWS_EXTEND_AT) failures.push('el mapa se quedó corto frente al jugador');
if (s.goodCollected + s.badHit + s.obstaclesHit === 0) failures.push('cero interacciones (tarjetas/vehículos sospechosos)');
if (vfxEvents !== s.goodCollected + s.badHit + obstacleEvents)
  failures.push(
    `descuadre eventos VFX (${vfxEvents}) vs eventos de juego ` +
      `(${s.goodCollected} verdes + ${s.badHit} rojas + ${obstacleEvents} choques)`,
  );
if (runtime.col < BALANCE.MIN_TILE || runtime.col > BALANCE.MAX_TILE) failures.push('el jugador salió del tablero');

if (failures.length) {
  console.error('FALLOS:\n - ' + failures.join('\n - '));
  process.exit(1);
}
console.log('OK: partida Crossy Road simulada de 90 s consistente');
