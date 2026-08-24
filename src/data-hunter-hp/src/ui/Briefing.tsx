import { motion } from 'framer-motion';
import { BALANCE } from '../data/balance';
import { badItemsFor, goodItemsFor } from '../data/items';
import { TOUCH } from '../render/device';
import { useGameStore } from '../store/useGameStore';

/**
 * BRIEFING — las instrucciones, copiadas de Terminal Rally (`tronco-runner` en
 * el repo de la landing) y traducidas a los verbos de este juego.
 *
 * La idea que se copia no es el maquetado: es DÓNDE viven las instrucciones.
 * En Terminal Rally no están en el menú — son el paso previo a la carrera, se
 * leen al pulsar JUGAR y se cierran con «A CORRER», que es cuando de verdad
 * hacen falta. Aquí igual: la portada contesta «qué es esto y quién va
 * ganando», y el briefing contesta «qué hago yo con el mando».
 *
 * Y se copia cómo se leen, que era el problema real: dejaron de ser una lista
 * de párrafos a pie de página y se parecen al juego —
 *
 *  - la ficha va DIBUJADA tal cual se ve en pista (hexágono con paloma o
 *    tache), porque enseñar la pieza vale más que describirla;
 *  - el icono de cada tarjeta SE MUEVE como el movimiento que pide (la flecha
 *    de avanzar bota, las de columna van y vienen), apagado con
 *    `prefers-reduced-motion`;
 *  - el CONTROL va dibujado, no descrito, y es el del aparato que hay delante:
 *    en el stand se juega con mando casi siempre, así que sale la cara del Xbox
 *    con su color real y el teclado baja a pie de línea; en un teléfono sale el
 *    DEDO con la dirección del gesto, porque enseñarle una cruceta a quien
 *    juega con el pulgar es enseñarle el mando de otro. Lo decide `TOUCH` (ver
 *    `render/device.ts`), una sola vez y para las tres tarjetas;
 *  - y lo que sale al paso son órdenes cortas con su coste a la derecha, en
 *    una columna que se puede leer sola.
 */

/** Flechas DIBUJADAS, no glifos tipográficos: ninguna fuente garantiza el
 *  trazo, y esta es la forma que el jugador va a buscar en el mando. La
 *  rotación va DENTRO del svg — una animación CSS sobre `transform` pisaría el
 *  estilo en línea y la flecha acabaría apuntando al revés. */
function Arrow({ dir, className }: { dir: 'up' | 'down' | 'left' | 'right'; className?: string }) {
  const rot = { up: 0, down: 180, left: -90, right: 90 }[dir];
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 3 L21 14 H15.5 V21 H8.5 V14 H3 Z" fill="currentColor" transform={`rotate(${rot} 12 12)`} />
    </svg>
  );
}

/** Las dos flechas de columna en una sola pieza: el movimiento lateral se
 *  entiende como par, no como dos teclas sueltas. */
function ColumnGlyph({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 34 24" aria-hidden="true">
      <path d="M9 3 L1 12 L9 21 V15 H14 V9 H9 Z" fill="currentColor" />
      <path d="M25 3 L33 12 L25 21 V15 H20 V9 H25 Z" fill="currentColor" />
    </svg>
  );
}

/** Caras del mando con el color real del Xbox — los mismos verde y rojo que
 *  usan Terminal Rally y Corte Limpio, para que las dinámicas del stand digan
 *  A y B con el mismo color. */
const FACE: Record<string, { bg: string; fg: string }> = {
  A: { bg: '#6ac72f', fg: '#0b1118' },
  B: { bg: '#e5342b', fg: '#ffffff' },
};

function PadFace({ k }: { k: 'A' | 'B' }) {
  return (
    <span className="pad-face" style={{ background: FACE[k].bg, color: FACE[k].fg }}>
      {k}
    </span>
  );
}

/** Cruceta entera con los brazos que valen encendidos. Se dibuja completa a
 *  propósito: medio jugador busca la cruz en el mando, no la palabra. */
function DPad({ dirs }: { dirs: Array<'up' | 'down' | 'left' | 'right'> }) {
  const on = (d: 'up' | 'down' | 'left' | 'right') => (dirs.includes(d) ? 'dpad-arm dpad-on' : 'dpad-arm');
  return (
    <span className="dpad" aria-hidden="true">
      <span className={on('up')} data-d="up" />
      <span className={on('down')} data-d="down" />
      <span className={on('left')} data-d="left" />
      <span className={on('right')} data-d="right" />
      <span className="dpad-hub" />
    </span>
  );
}

/**
 * EL GESTO DIBUJADO — el equivalente táctil de la cara del mando: un dedo y la
 * estela de por dónde se arrastra.
 *
 * Se dibuja el RASTRO y no solo una flecha porque lo que hay que enseñar no es
 * la dirección (esa ya la dice el icono grande de la tarjeta) sino que el
 * control es *arrastrar*: la mitad de la gente que coge un juego así en el
 * móvil prueba a tocar y se queda ahí. Por eso «avanza» lleva además la
 * palabra TOCA — es el control original de Crossy Road y el que se descubre
 * solo.
 */
function Gesto({ dirs }: { dirs: Array<'up' | 'down' | 'left' | 'right'> }) {
  return (
    <span className="gesto" aria-hidden="true">
      {dirs.map((d) => (
        <svg key={d} className={`gesto-svg gesto-${d}`} viewBox="0 0 26 30">
          {/* Estela: tres trazos que se van apagando por detrás del dedo */}
          <path
            d="M13 24 V9"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeDasharray="3 3.5"
            opacity="0.5"
          />
          {/* Punta del gesto */}
          <path d="M13 2 L19.5 10 H6.5 Z" fill="currentColor" />
          {/* La yema del dedo, donde empieza el arrastre */}
          <circle cx="13" cy="26" r="3.6" fill="currentColor" />
        </svg>
      ))}
    </span>
  );
}

/** La tarjeta del juego, dibujada como se ve en pista: hexágono a color pleno
 *  con paloma o tache en navy. */
function Hex({ good }: { good: boolean }) {
  return (
    <svg className={good ? 'hex-ico hex-good' : 'hex-ico hex-bad'} viewBox="0 0 40 44" aria-hidden="true">
      <path d="M20 1 L38 11 V33 L20 43 L2 33 V11 Z" fill="currentColor" />
      {good ? (
        <path
          d="M12 22 L18 28 L28 15"
          fill="none"
          stroke="#04122b"
          strokeWidth="4.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ) : (
        <path d="M13 15 L27 29 M27 15 L13 29" fill="none" stroke="#04122b" strokeWidth="4.5" strokeLinecap="round" />
      )}
    </svg>
  );
}

/** Cabecera: la retícula del tablero vista desde arriba con las dos fichas
 *  encima. Es puro adorno CSS, pero pone al que lee delante de la pista antes
 *  de leer una sola palabra. */
function BoardStrip() {
  return (
    <div className="brief-track" aria-hidden="true">
      <span className="brief-lane" />
      <span className="brief-lane" />
      <span className="brief-lane" />
      <span className="brief-tile brief-tile--good" />
      <span className="brief-tile brief-tile--bad" />
    </div>
  );
}

/** Muestra REAL del vocabulario de cada tipo de tarjeta: sale de `items.ts`,
 *  que es la misma lista que siembra el mapa. Si el glosario cambia, el
 *  briefing cambia con él en vez de mentir con una lista escrita a mano. */
const MUESTRA_BUENAS = goodItemsFor('port').slice(0, 3).concat(goodItemsFor('shipyard').slice(0, 2));
const MUESTRA_MALAS = badItemsFor('port').slice(0, 2).concat(badItemsFor('multi').slice(0, 2));

export function Briefing() {
  const startGame = useGameStore((s) => s.startGame);
  const backToMenu = useGameStore((s) => s.backToMenu);

  return (
    <>
      <span className="brief-kicker">Antes de empezar</span>

      <div className="howto">
        <BoardStrip />

        {/* 1 — LO ÚNICO QUE HAY QUE SABER. Tres tarjetas numeradas: el icono se
            mueve como el movimiento que pide y enseña el botón del mando. */}
        <div className="how-sec">
          <p className="how-title">Lo único que hay que saber</p>
          <div className="how-cards">
            <div className="how-card">
              <span className="how-step">1</span>
              <Arrow dir="up" className="how-glyph glyph-fwd anim-hop" />
              <b>AVANZA</b>
              {TOUCH ? (
                <span className="pad-row">
                  <span className="toca">TOCA</span>
                  <Gesto dirs={['up']} />
                </span>
              ) : (
                <>
                  <span className="pad-row">
                    <PadFace k="A" />
                    <DPad dirs={['up']} />
                  </span>
                  <span className="alt-keys">
                    o <kbd>↑</kbd> <kbd>W</kbd> <kbd>espacio</kbd>
                  </span>
                </>
              )}
            </div>
            <div className="how-card">
              <span className="how-step">2</span>
              <ColumnGlyph className="how-glyph glyph-side anim-side" />
              <b>ESQUIVA</b>
              {TOUCH ? (
                <span className="pad-row">
                  <Gesto dirs={['left', 'right']} />
                </span>
              ) : (
                <>
                  <span className="pad-row">
                    <DPad dirs={['left', 'right']} />
                  </span>
                  <span className="alt-keys">
                    o <kbd>←</kbd> <kbd>→</kbd> <kbd>A</kbd> <kbd>D</kbd>
                  </span>
                </>
              )}
            </div>
            <div className="how-card">
              <span className="how-step">3</span>
              <Arrow dir="down" className="how-glyph glyph-back anim-back" />
              <b>RECULA</b>
              {TOUCH ? (
                <span className="pad-row">
                  <Gesto dirs={['down']} />
                </span>
              ) : (
                <>
                  <span className="pad-row">
                    <DPad dirs={['down']} />
                  </span>
                  <span className="alt-keys">
                    o <kbd>↓</kbd> <kbd>S</kbd> — con correa
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* 2 — QUÉ RECOGER. La ficha dibujada tal cual se ve en pista: enseñar
            la pieza vale más que describirla. */}
        <div className="how-sec">
          <p className="how-title">Qué recoger</p>
          <div className="loot">
            <div className="loot-card loot-card--good">
              <Hex good />
              <b>RECÓGELO</b>
              <span className="loot-val">+{BALANCE.SCORE_GOOD}</span>
              <span className="loot-tags">
                {MUESTRA_BUENAS.map((w) => (
                  <span key={w} className="tag tag--good">
                    {w}
                  </span>
                ))}
              </span>
            </div>
            <div className="loot-card loot-card--bad">
              <Hex good={false} />
              <b>NI LO TOQUES</b>
              <span className="loot-val">{BALANCE.SCORE_BAD}</span>
              <span className="loot-tags">
                {MUESTRA_MALAS.map((w) => (
                  <span key={w} className="tag tag--bad">
                    {w}
                  </span>
                ))}
              </span>
            </div>
          </div>
          <p className="how-foot">
            Lo que PISAS es tuyo: si el suelo te lleva por encima de una ficha, la recoges igual —
            verde o roja. {BALANCE.COMBO_X2_AT} verdes seguidas <b className="t-warn">x2</b>,{' '}
            {BALANCE.COMBO_X3_AT} <b className="t-warn">x3</b>.
          </p>
        </div>

        {/* 3 — LO QUE TE SALE AL PASO. Órdenes cortas con su coste a la
            derecha, en una columna que se puede leer sola. */}
        <div className="how-sec">
          <p className="how-title">Lo que te sale al paso</p>
          <ul className="cues">
            <li>
              <span className="cue-ico cue-ico--traffic" />
              <span>
                Camiones, trenes y grúas: <b>cruza por el hueco</b>
              </span>
              <b className="cue-cost">1 vida</b>
            </li>
            <li>
              <span className="cue-ico cue-ico--water" />
              <span>
                En <b>Cruceros</b> se acaba el suelo: salta de casco en casco
              </span>
              <b className="cue-cost">1 vida</b>
            </li>
            <li>
              <span className="cue-ico cue-ico--belt" />
              <span>
                En la <b>Universal</b> el suelo se mueve: te descoloca, no te mata
              </span>
              <b className="cue-cost cue-cost--free">libre</b>
            </li>
            <li>
              <span className="cue-ico cue-ico--dock" />
              <span>
                En el <b>Astillero</b> el dique tapa el paso: pasarela o punto de embarque
              </span>
              <b className="cue-cost cue-cost--free">libre</b>
            </li>
            <li>
              <span className="cue-ico cue-ico--back" />
              <span>
                Atrás solo <b>{BALANCE.BACK_STEPS_MAX} casillas</b>: al que se queda le cae un
                contenedor
              </span>
              <b className="cue-cost">1 vida</b>
            </li>
            <li>
              <span className="cue-ico cue-ico--stamp" />
              <span>
                <b>Pasaporte</b>: cada terminal nueva sella, las cinco lo completan
              </span>
              <b className="cue-cost cue-cost--good">
                +{BALANCE.SCORE_STAMP} / +{BALANCE.SCORE_PASSPORT_COMPLETE}
              </b>
            </li>
          </ul>
          <p className="how-foot">
            Cuanto más lejos llegas, más aprieta: todo va más rápido y salen más fichas rojas.
          </p>
        </div>

        <p className="how-goal">
          <b>{BALANCE.LIVES} vidas.</b> <b>5 terminales.</b> Salta hacia lo correcto.
        </p>
      </div>

      <div className="brief-btns">
        <motion.button className="btn-skew" onClick={startGame} whileTap={{ scale: 0.97 }}>
          <span>A jugar</span>
        </motion.button>
        <button className="btn-ghost" onClick={backToMenu}>
          Volver
        </button>
      </div>
    </>
  );
}
