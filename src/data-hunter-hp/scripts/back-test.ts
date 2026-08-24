/**
 * Verificación de la MARCHA ATRÁS con correa y del castigo por quedarse atrás
 * (la grúa pórtico y su contenedor):
 *  - se puede recular hasta BACK_STEPS_MAX filas por detrás de la máxima,
 *  - el paso que se pasa de ahí dispara el castigo (no se descarta en silencio),
 *  - el contenedor lo APLASTA donde está, sin levantarlo del suelo,
 *  - cuesta UNA vida y reaparece en una fila pisable cerca del frente.
 *
 * Se repite DOS veces: el castigo tiene que poder volver a ocurrir en la misma
 * partida, que es donde se vería si la grúa se queda colgada tras el primero.
 */
import { BALANCE, rowZ } from '../src/data/balance';
import { runtime } from '../src/store/runtime';
import { queueMove, updatePlayer } from '../src/world/playerLogic';
import { generateRows, isBlocked, resetRows, rows } from '../src/world/rows';
import { backDanger, backRoomLeft, crane } from '../src/world/snatch';
import { useGameStore } from '../src/store/useGameStore';

const err = (msg: string) => {
  console.error('ERROR:', msg);
  process.exit(1);
};

const dt = 1 / 120;
const paso = () => {
  for (let i = 0; i < 60 && (runtime.stepping || runtime.moveQueue.length); i++) updatePlayer(dt);
};

resetRows();
generateRows(200);
useGameStore.getState().startGame();
generateRows(200);

// Tramo de 5 filas seguidas pisables por la columna 0 (ni agua ni obstáculo)
const COL = 0;
let base = -1;
for (let i = 12; i < 120 && base < 0; i++) {
  let ok = true;
  for (let r = i - 4; r <= i; r++) {
    if (rows[r].type === 'water' || isBlocked(r, COL)) ok = false;
  }
  if (ok) base = i;
}
if (base < 0) err('no se encontró un tramo de 5 filas pisables para la prueba');

runtime.row = runtime.maxRow = base;
runtime.col = COL;
runtime.x = 0;
runtime.z = rowZ(base);
useGameStore.getState().setCurrentRow(base);

/** Recula hasta agotar la correa y deja que el castigo se ejecute entero */
function retirada(): { kind: string; alturaMax: number; squashMin: number; segundos: number } {
  let pasos = 0;
  while (backRoomLeft() > 0) {
    const antes = runtime.row;
    queueMove('backward');
    paso();
    if (runtime.row !== antes - 1) err(`paso atrás ${pasos + 1}: fila ${runtime.row}, esperada ${antes - 1}`);
    if (runtime.snatching) err(`el castigo bajó en el paso ${pasos + 1} (dentro de la correa)`);
    pasos++;
    if (pasos > BALANCE.BACK_STEPS_MAX) err('la correa no frena nunca');
  }
  if (!backDanger()) err('no hay aviso con el margen agotado');
  if (!crane.visible) err('la grúa no se plantó durante el aviso');

  queueMove('backward');
  updatePlayer(dt);
  if (!runtime.snatching) err('el paso fuera de la correa no disparó el castigo');

  let alturaMax = 0;
  let squashMin = 1;
  let frames = 0;
  while (runtime.snatching && frames < 60 * 8) {
    updatePlayer(dt);
    alturaMax = Math.max(alturaMax, runtime.y);
    squashMin = Math.min(squashMin, runtime.snatchSquash);
    if (runtime.snatching && !crane.visible) err('la grúa desapareció a mitad del castigo');
    frames++;
  }
  if (runtime.snatching) err('el castigo no terminó nunca');
  if (crane.visible) err('la grúa se quedó en pantalla al terminar');
  return { alturaMax, squashMin, segundos: frames * dt };
}

/** Estado sano tras cada castigo: coste, reaparición y partida que sigue */
function revisaReaparicion(vidasAntes: number, kind: string) {
  const s = useGameStore.getState();
  if (s.lives !== vidasAntes - 1) err(`${kind}: vidas ${s.lives}, esperadas ${vidasAntes - 1}`);
  if (runtime.invulnTimer <= 0) err(`${kind}: reaparece sin invulnerabilidad`);
  if (runtime.snatchSquash !== 1) err(`${kind}: reaparece aplastado`);
  if (rows[runtime.row].type === 'water') err(`${kind}: reapareció en el agua`);
  if (isBlocked(runtime.row, runtime.col)) err(`${kind}: reapareció dentro de un obstáculo`);
  if (runtime.row > runtime.maxRow) err(`${kind}: reapareció por delante de su fila máxima`);
  if (backRoomLeft() < 0) err(`${kind}: reapareció ya fuera de la correa (castigo en bucle)`);
  if (s.currentRow !== runtime.row) err(`${kind}: el HUD quedó con otra fila que el runtime`);

  runtime.stunTimer = 0;
  const antes = runtime.row;
  queueMove('forward');
  paso();
  if (runtime.row !== antes + 1) err(`${kind}: no avanza después (${antes} → ${runtime.row})`);
}

for (let vuelta = 1; vuelta <= 2; vuelta++) {
  const vidasAntes = useGameStore.getState().lives;
  const r = retirada();

  // El contenedor APLASTA donde el colaborador está: no puede levantarlo del
  // suelo (eso era lo que hacía el cabestrante del dron, que ya no existe).
  if (r.alturaMax > 0.5) err(`el contenedor no puede levantarlo (${r.alturaMax.toFixed(2)})`);
  if (r.squashMin > 0.2) err(`no quedó aplastado bajo el contenedor (${r.squashMin.toFixed(2)})`);

  revisaReaparicion(vidasAntes, 'contenedor');
  console.log(
    `  castigo ${vuelta}: ${r.segundos.toFixed(2)} s · altura ${r.alturaMax.toFixed(1)} · ` +
      `aplaste ${r.squashMin.toFixed(2)}`,
  );
}

console.log(`OK  correa=${BALANCE.BACK_STEPS_MAX} pasos · el contenedor cae y la grúa se retira, dos veces`);
