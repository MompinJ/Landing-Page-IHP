/**
 * RECOGIDA AL PASAR POR ENCIMA — la mecánica que arreglaba el fallo más
 * visible del bioma TUM: sobre la BANDA transportadora el suelo te lleva por
 * encima del hexágono verde y no lo recogías. Para cogerlo había que saltar
 * justo en su casilla, o sea que la única fila con premio garantizado era
 * también la única donde el premio se te escapaba solo.
 *
 * Se comprueban las tres cosas que tienen que ser ciertas a la vez:
 *
 *  1. ARRASTRADO SE RECOGE. Puesto en el extremo de una banda, sin encolar un
 *     solo salto, la banda lo lleva por encima de la tarjeta y la cobra.
 *  2. TAMBIÉN LAS ROJAS. Si la banda te arrastra hacia un riesgo, quitarte de
 *     en medio a tiempo ES la mecánica de la fila: no puede ser que la verde
 *     se recoja sola y la roja te perdone.
 *  3. NO SE PASA DE LARGO. Quieto en una casilla NO se recoge la tarjeta de la
 *     casilla de al lado — con un radio de recogida generoso, esquivar una
 *     roja dejaría de ser posible.
 */
import { BALANCE, colX, rowZ } from '../src/data/balance';
import { runtime } from '../src/store/runtime';
import { sweepPickup } from '../src/world/playerLogic';
import { generateRows, resetRows, rows, type RowData } from '../src/world/rows';
import { useGameStore } from '../src/store/useGameStore';
import { updateConveyor } from '../src/world/traffic';

const err = (msg: string) => {
  console.error('ERROR:', msg);
  process.exit(1);
};

const DT = 1 / 60;

/** Deja al colaborador quieto en una fila, en la X que se le pida */
function colocar(row: number, x: number) {
  runtime.row = row;
  runtime.maxRow = Math.max(runtime.maxRow, row);
  runtime.col = Math.round(x / BALANCE.TILE);
  runtime.x = x;
  runtime.z = rowZ(row);
  runtime.y = 0;
  runtime.stepping = false;
  runtime.snatching = false;
  runtime.stunTimer = 0;
}

/** Banda con una tarjeta del color pedido, buscada sobre el mapa generado */
function buscarBanda(good: boolean): { row: RowData; cardCol: number } | null {
  for (const row of rows) {
    if (row.type !== 'belt' || !row.belt) continue;
    const card = row.cards.find((c) => !c.collected && c.good === good);
    if (card) return { row, cardCol: card.col };
  }
  return null;
}

resetRows();
useGameStore.getState().startGame();
generateRows(600);

// ---------------------------------------------------------------- 1 y 2 ----
for (const good of [true, false]) {
  const hallazgo = buscarBanda(good);
  if (!hallazgo) err(`no se generó ninguna banda con tarjeta ${good ? 'verde' : 'roja'} en 600 filas`);
  const { row, cardCol } = hallazgo!;
  const belt = row.belt!;

  // Arranca en el borde CONTRA el que empuja la banda, para que el arrastre lo
  // lleve por encima de la tarjeta. La banda topa con los bordes del tablero,
  // así que desde el extremo correcto siempre acaba cruzándola.
  const desde = belt.direction === 1 ? BALANCE.MIN_TILE : BALANCE.MAX_TILE;
  if ((belt.direction === 1 && cardCol <= desde) || (belt.direction === -1 && cardCol >= desde)) {
    continue; // la tarjeta queda detrás del arranque: esta fila no sirve
  }
  colocar(row.index, colX(desde));

  const antes = useGameStore.getState();
  const buenasAntes = antes.goodCollected;
  const malasAntes = antes.badHit;

  // Ni un salto: solo el suelo moviéndose bajo los pies
  let frames = 0;
  const limite = 60 * 30;
  while (frames < limite && !row.cards.find((c) => c.col === cardCol)!.collected) {
    updateConveyor(DT);
    sweepPickup();
    frames++;
  }

  const card = row.cards.find((c) => c.col === cardCol)!;
  if (!card.collected) {
    err(
      `la banda (fila ${row.index}, sentido ${belt.direction}) arrastró al colaborador ` +
        `por encima de la tarjeta ${good ? 'verde' : 'roja'} de la columna ${cardCol} sin recogerla`,
    );
  }
  const ahora = useGameStore.getState();
  if (good && ahora.goodCollected !== buenasAntes + 1) err('la tarjeta verde no puntuó al recogerse arrastrado');
  if (!good && ahora.badHit !== malasAntes + 1) err('la tarjeta roja no penalizó al recogerse arrastrado');

  console.log(
    `  ${good ? 'verde' : 'roja '} recogida arrastrado: fila ${row.index} · sentido ${belt.direction} · ` +
      `col ${cardCol} · ${(frames * DT).toFixed(2)} s de banda, 0 saltos`,
  );
}

// -------------------------------------------------------------------- 3 ----
// Quieto a una casilla de distancia: no se puede recoger lo que no se pisa.
const conTarjeta = rows.find((r) => r.cards.some((c) => !c.collected));
if (!conTarjeta) err('no quedan tarjetas sin recoger para probar el alcance');
const suelta = conTarjeta!.cards.find((c) => !c.collected)!;
const vecina = suelta.col + (suelta.col < BALANCE.MAX_TILE ? 1 : -1);
colocar(conTarjeta!.index, colX(vecina));
for (let i = 0; i < 120; i++) sweepPickup();
if (suelta.collected) {
  err(
    `se recogió la tarjeta de la columna ${suelta.col} estando parado en la ${vecina}: ` +
      `PICKUP_RADIUS (${BALANCE.PICKUP_RADIUS}) alcanza a la casilla de al lado y las rojas dejan de esquivarse`,
  );
}
console.log(`  alcance: parado en col ${vecina} NO se recoge la tarjeta de col ${suelta.col}`);

// El radio no puede llegar al centro de la casilla contigua, pase lo que pase
if (BALANCE.PICKUP_RADIUS >= BALANCE.TILE) {
  err(`PICKUP_RADIUS (${BALANCE.PICKUP_RADIUS}) >= TILE (${BALANCE.TILE}): solaparía casillas contiguas`);
}

console.log('OK: lo que se pisa se recoge (también arrastrado), y ni un dedo más');
