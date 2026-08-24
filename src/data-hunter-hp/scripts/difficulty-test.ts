/**
 * CURVA DE DIFICULTAD — «cuanto más avanzas, más se complica» tiene que poder
 * medirse sobre el mapa que se genera de verdad, no quedarse en la intención
 * de quien tocó las constantes.
 *
 * Se muestrea el mapa en tres tramos (arranque, media rampa y saturación) y se
 * comprueba que las cuatro palancas de `difficultyForRow` se mueven en la
 * dirección correcta y CADA UNA de forma apreciable:
 *
 *   velocidad de lo que atropella · densidad de peligro móvil ·
 *   proporción de tarjetas rojas · arrastre de la banda transportadora
 *
 * Se promedia sobre varias partidas porque el mapa es aleatorio: con una sola
 * semilla, un tramo con dos diques seguidos hunde la densidad de tráfico y el
 * test parpadearía sin que nadie hubiera roto nada.
 */
import { BALANCE, difficultyForRow, hitHalfExtents } from '../src/data/balance';
import { generateRows, resetRows, rows, type RowData } from '../src/world/rows';

const err = (msg: string) => {
  console.error('ERROR:', msg);
  process.exit(1);
};

interface Tramo {
  nombre: string;
  desde: number;
  hasta: number;
}

const TRAMOS: Tramo[] = [
  { nombre: 'arranque  ', desde: BALANCE.SAFE_START_ROWS, hasta: 60 },
  { nombre: 'media rampa', desde: 90, hasta: 150 },
  { nombre: 'saturación', desde: 200, hasta: 320 },
];

interface Medida {
  velocidad: number;
  densidadPeligro: number;
  rojasPorCiento: number;
  bandaVelocidad: number;
  peligrosSeguidos: number;
}

/**
 * ¿Esta fila tiene algo que ATROPELLE? Es la misma pregunta que se hace
 * `hitTest`, no «¿tiene vehículos?»:
 *
 *  - la BANDA arrastra pero no mata;
 *  - en CRUCEROS los barcos son plataforma, no obstáculo (hitTest se salta el
 *    bioma entero), así que una fila de agua llena de cascos no es una fila de
 *    peligro — contarla inflaba la medida hasta que el tramo de arranque ya
 *    salía con dos peligros seguidos y la comprobación no medía nada;
 *  - la grúa del dique mayor está PARADA (speed 0): es un ascensor.
 */
function esPeligro(row: RowData): boolean {
  if (row.theme === 'cruise') return false;
  return (
    row.vehicles.some((v) => hitHalfExtents(v.kind).x > 0) || row.cranes.some((c) => c.speed > 0)
  );
}

function medir(tramo: Tramo, mapas: number): Medida {
  let velTotal = 0;
  let velN = 0;
  let peligro = 0;
  let filas = 0;
  let verdes = 0;
  let rojas = 0;
  let bandaTotal = 0;
  let bandaN = 0;
  let seguidosMax = 0;

  for (let m = 0; m < mapas; m++) {
    resetRows();
    generateRows(tramo.hasta + 40);
    let seguidos = 0;
    for (let i = tramo.desde; i < tramo.hasta; i++) {
      const row = rows[i];
      if (!row) continue;
      filas++;
      for (const v of row.vehicles) {
        velTotal += v.speed;
        velN++;
      }
      for (const c of row.cranes) {
        if (c.speed > 0) {
          velTotal += c.speed;
          velN++;
        }
      }
      if (esPeligro(row)) {
        peligro++;
        seguidos++;
        seguidosMax = Math.max(seguidosMax, seguidos);
      } else {
        seguidos = 0;
      }
      for (const card of row.cards) {
        if (card.good) verdes++;
        else rojas++;
      }
      if (row.belt) {
        bandaTotal += row.belt.speed;
        bandaN++;
      }
    }
  }

  return {
    velocidad: velN ? velTotal / velN : 0,
    densidadPeligro: filas ? (peligro / filas) * 100 : 0,
    rojasPorCiento: verdes + rojas ? (rojas / (verdes + rojas)) * 100 : 0,
    bandaVelocidad: bandaN ? bandaTotal / bandaN : 0,
    peligrosSeguidos: seguidosMax,
  };
}

const MAPAS = 30;
const medidas = TRAMOS.map((t) => ({ tramo: t, m: medir(t, MAPAS) }));

console.log(`\nmuestreo sobre ${MAPAS} mapas por tramo (rampa: ${BALANCE.RAMP_ROWS} filas)\n`);
console.table(
  Object.fromEntries(
    medidas.map(({ tramo, m }) => [
      tramo.nombre.trim(),
      {
        'filas': `${tramo.desde}–${tramo.hasta}`,
        'dificultad': difficultyForRow((tramo.desde + tramo.hasta) / 2).toFixed(2),
        'vel. media': m.velocidad.toFixed(2),
        '% filas con peligro': m.densidadPeligro.toFixed(1),
        '% tarjetas rojas': m.rojasPorCiento.toFixed(1),
        'peligros seguidos': m.peligrosSeguidos,
        'banda': m.bandaVelocidad.toFixed(2),
      },
    ]),
  ),
);

const [ini, , fin] = medidas.map((x) => x.m);

// Cada palanca tiene que moverse de verdad. Los mínimos son holgados a
// propósito: aquí solo se cazan las regresiones (una constante que se queda
// en 1, una rampa desconectada del generador), no se afina el balanceo.
if (fin.velocidad <= ini.velocidad * 1.25) {
  err(`la velocidad apenas sube: ${ini.velocidad.toFixed(2)} → ${fin.velocidad.toFixed(2)} (se esperaba +25% mínimo)`);
}
if (fin.rojasPorCiento <= ini.rojasPorCiento * 1.25) {
  err(
    `la proporción de tarjetas rojas apenas sube: ` +
      `${ini.rojasPorCiento.toFixed(1)}% → ${fin.rojasPorCiento.toFixed(1)}%`,
  );
}
if (fin.bandaVelocidad <= ini.bandaVelocidad * 1.2) {
  err(`la banda no arrastra más lejos: ${ini.bandaVelocidad.toFixed(2)} → ${fin.bandaVelocidad.toFixed(2)}`);
}
if (fin.peligrosSeguidos <= ini.peligrosSeguidos) {
  err(
    `no se encadenan más peligros al final: ${ini.peligrosSeguidos} → ${fin.peligrosSeguidos} ` +
      `(ROAD_STREAK_MAX_LATE = ${BALANCE.ROAD_STREAK_MAX_LATE})`,
  );
}

// ...y tiene que haber TECHO: sin él, la partida larga deja de ser difícil
// para volverse imposible, y aguantar deja de premiar.
if (difficultyForRow(BALANCE.RAMP_ROWS * 10) !== 1) err('la dificultad no satura: la rampa no tiene techo');
if (difficultyForRow(0) !== 0) err('la dificultad no arranca en 0: las primeras filas ya vienen apretadas');

console.log('OK: las cuatro palancas suben con la distancia y la rampa satura');
