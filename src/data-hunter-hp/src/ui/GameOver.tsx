import { motion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { startMusic } from '../audio/music';
import { unlockAudio } from '../audio/sfx';
import { ORG_UNITS } from '../data/orgUnits';
import { leeUnidades } from '../services/scoreService';
import { useGameStore } from '../store/useGameStore';
import { useAccionMando, useMandoConectado, useRejillaMando } from '../hooks/useGamepadUi';
import { PassportStrip } from './Passport';

/**
 * Pantalla final competitiva: puntuación, pasaporte, conceptos encontrados y
 * ranking. Sin rango ni desglose de aciertos: el marcador y los sellos ya
 * cuentan la partida, y lo demás era ruido entre la cifra y el formulario.
 *
 * El ranking usa localStorage con el mismo shape (RankingEntry) que expondría
 * una API REST de high-scores — cambiar submitScore por un fetch es el único
 * punto de integración.
 *
 * Mismo lenguaje gráfico que la portada y el cartel de terminal: esquina
 * biselada, antetítulo espaciado y botón en paralelogramo.
 *
 * SE FIRMA CON EL MANDO, como en Terminal Rally. En el stand se juega con mando
 * casi siempre y esta pantalla pide escribir un nombre: sin teclado en pantalla
 * hay que soltar el mando y buscar el teclado físico, y con gente esperando
 * turno eso es exactamente lo que hace que nadie firme su marcador.
 *
 * EL TECLADO ESTÁ SIEMPRE, no solo cuando el juego ya ha visto un mando. Salía
 * bajo esa condición y ahí estaba la trampa: el navegador no reconoce un mando
 * hasta que se pulsa un botón EN ESA PÁGINA, así que quien llegaba a la tarjeta
 * con el mando recién cogido veía un campo de texto y ningún sitio donde
 * escribir —justo en el momento en que hace falta—. Puesto siempre, la cruceta
 * lo encuentra ya montado, el dedo puede teclear en el kiosco táctil, y el
 * teclado físico sigue escribiendo en el campo como siempre.
 */

/** Doce letras es lo que acepta el campo, y lo que cabe en la fila del Top 10 */
const MAX_NOMBRE = 12;

/** Las teclas, en filas de siete. La rejilla del mando lee las filas del DOM,
 *  así que este reparto es también el que recorre la cruceta. */
const FILAS_TECLADO = [
  ['A', 'B', 'C', 'D', 'E', 'F', 'G'],
  ['H', 'I', 'J', 'K', 'L', 'M', 'N'],
  ['O', 'P', 'Q', 'R', 'S', 'T', 'U'],
  ['V', 'W', 'X', 'Y', 'Z', 'Ñ', '-'],
];

function TecladoNombre({
  valor,
  onEscribe,
  onBorra,
  filaBase,
}: {
  valor: string;
  onEscribe: (ch: string) => void;
  onBorra: () => void;
  filaBase: number;
}) {
  return (
    <div className="keys">
      {FILAS_TECLADO.map((fila, r) => (
        <div className="keys-row" key={r}>
          {/* Las letras NO se deshabilitan al llegar al límite: la rejilla se
              arma con los controles activos, así que desactivarlas desmontaría
              el teclado entero bajo el cursor. `onEscribe` ya recorta. */}
          {fila.map((ch) => (
            <button
              key={ch}
              type="button"
              className="key"
              data-gp-row={filaBase + r}
              onClick={() => onEscribe(ch)}
            >
              {ch}
            </button>
          ))}
        </div>
      ))}
      <div className="keys-row">
        <button
          type="button"
          className="key key--wide"
          data-gp-row={filaBase + FILAS_TECLADO.length}
          onClick={() => onEscribe(' ')}
        >
          Espacio
        </button>
        <button
          type="button"
          className="key key--wide"
          data-gp-row={filaBase + FILAS_TECLADO.length}
          onClick={onBorra}
          disabled={!valor.length}
        >
          Borrar
        </button>
      </div>
    </div>
  );
}
export function GameOver() {
  const phase = useGameStore((s) => s.phase);
  const score = useGameStore((s) => s.score);
  const foundConcepts = useGameStore((s) => s.foundConcepts);
  const ranking = useGameStore((s) => s.ranking);
  const submitScore = useGameStore((s) => s.submitScore);
  const startGame = useGameStore((s) => s.startGame);
  const backToMenu = useGameStore((s) => s.backToMenu);

  const [name, setName] = useState('');
  const [unit, setUnit] = useState('');
  const [submitted, setSubmitted] = useState(false);
  /** `null` mientras no se ha intentado; luego, si la marca llegó al congreso
   *  o se quedó en el ranking de este equipo. */
  const [subido, setSubido] = useState<boolean | null>(null);
  const [guardando, setGuardando] = useState(false);
  /**
   * LAS UNIDADES SALEN DE LA TABLA, no del código. Es la misma lista contra la
   * que la clave foránea valida al guardar, así que traerla de ahí es lo único
   * que garantiza que lo que se puede elegir es lo que se puede guardar. Se
   * arranca con la copia local para que el picker no parpadee vacío, y se
   * sustituye si la consulta llega.
   */
  const [unidades, setUnidades] = useState(ORG_UNITS.map((u) => ({ codigo: u.code, nombre: u.name })));
  useEffect(() => {
    let vivo = true;
    void leeUnidades().then((lista) => {
      if (vivo && lista?.length) setUnidades(lista);
    });
    return () => {
      vivo = false;
    };
  }, []);

  /**
   * LA REJILLA DEL MANDO vive en la tarjeta entera y no en el formulario: al
   * guardar, el teclado y las unidades desaparecen y el cursor tiene que caer
   * solo sobre «Jugar otra vez». Si la rejilla muriera con el formulario, el
   * cursor moriría con ella.
   */
  const tarjeta = useRef<HTMLDivElement>(null);
  const mando = useMandoConectado();
  const enTarjeta = phase === 'gameover';
  useRejillaMando(tarjeta, enTarjeta);

  const escribe = (ch: string) =>
    setName((n) => (n + ch).slice(0, MAX_NOMBRE).replace(/^ +/, ''));
  const borra = () => setName((n) => n.slice(0, -1));

  // B del mando: mientras se escribe, borra una letra —es lo que espera
  // cualquiera que haya escrito un nombre en una consola—; una vez guardado ya
  // no hay nada que borrar y vuelve a ser «atrás».
  useAccionMando(
    (a) => {
      if (a !== 'back') return;
      if (!submitted && name.length) borra();
      else if (submitted) backToMenu();
    },
    enTarjeta,
  );

  if (phase !== 'gameover') return null;

  // El teclado en pantalla, mientras se escribe (ver la nota de arriba: no se
  // condiciona a que haya mando detectado). Las filas de la rejilla se numeran
  // de arriba abajo con una sola cuenta, para que los dos casos —escribiendo y
  // ya guardado— queden alineados sin listas paralelas.
  const conTeclado = !submitted;
  const filaUnidades = conTeclado ? FILAS_TECLADO.length + 1 : 0;
  const filaGuardar = filaUnidades + 1;
  const filaAcciones = submitted ? 0 : filaGuardar + 1;

  const myName = (name.trim() || 'ANON').toUpperCase();

  return (
    <motion.div
      className="overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.35 }}
    >
      <motion.div
        ref={tarjeta}
        className="card card--wide"
        initial={{ y: 40, scale: 0.94, opacity: 0 }}
        animate={{ y: 0, scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 260, damping: 24, delay: 0.1 }}
      >
        <span className="card-kicker">Fin del recorrido</span>

        <motion.span
          className="final-score"
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 220, damping: 18, delay: 0.2 }}
        >
          {score.toLocaleString('es-MX')}
        </motion.span>
        <span className="final-unit">Puntos</span>

        {/* Pasaporte: qué terminales alcanzó a recorrer. Sin encabezado — los
            sellos llevan el nombre completo de cada terminal y se explican
            solos; el contador "N/5" además prometía un recorrido que no
            siempre se había hecho. */}
        <div className="passport-block">
          <PassportStrip />
        </div>

        {foundConcepts.length > 0 && (
          <div className="concepts">
            {foundConcepts.map((c) => (
              <span key={c} className="concept-chip">{c}</span>
            ))}
          </div>
        )}

        {!submitted ? (
          <form
            className="signup"
            onSubmit={(e) => {
              e.preventDefault();
              // La pantalla pasa al Top 10 EN EL ACTO y la subida sigue por
              // detrás: en un stand con cola, hacer esperar a alguien delante
              // de un botón mientras se resuelve una petición es lo que hace
              // que el siguiente no juegue. El aviso de si subió o no llega
              // cuando llega, ya en la pantalla del ranking.
              setSubmitted(true);
              setGuardando(true);
              void submitScore(name, unit).then((ok) => {
                setSubido(ok);
                setGuardando(false);
              });
            }}
          >
            {/* El campo va ARRIBA del teclado: se escribe mirando lo que sale,
                no al revés. Con teclado físico sigue funcionando igual. */}
            <div className="submit-row">
              <input
                className="name-input"
                value={name}
                maxLength={MAX_NOMBRE}
                placeholder="Tu nombre"
                onChange={(e) => setName(e.target.value)}
                autoFocus={!mando}
              />
            </div>

            {conTeclado && (
              <TecladoNombre valor={name} onEscribe={escribe} onBorra={borra} filaBase={0} />
            )}

            <span className="card-kicker card-kicker--sm">Tu unidad de negocio</span>
            {/* Botones, no un <select>: en el kiosco se juega con el dedo y una
                lista desplegable nativa se abre fuera del lienzo del juego.
                Las once van en UNA fila de rejilla: se recorren con izquierda y
                derecha, y arriba/abajo saltan al teclado o a Guardar. Repartirlas
                en varias filas de cursor sería mentir, porque en pantalla se
                acomodan solas según el ancho. */}
            <div className="chips chips--pick">
              {unidades.map((u) => (
                <button
                  key={u.codigo}
                  type="button"
                  title={u.nombre}
                  data-gp-row={filaUnidades}
                  className={`chip chip--pick${unit === u.codigo ? ' chip--on' : ''}`}
                  onClick={() => setUnit(unit === u.codigo ? '' : u.codigo)}
                >
                  <span>{u.codigo}</span>
                </button>
              ))}
            </div>

            {/* Sin unidad la tabla del congreso rechaza la fila (la exige con
                clave foránea), así que el botón no deja mandarla a rebotar. */}
            <button
              className="btn-skew btn-skew--sm"
              type="submit"
              disabled={!unit}
              data-gp-row={filaGuardar}
            >
              <span>{unit ? 'Guardar' : 'Elige tu unidad'}</span>
            </button>
          </form>
        ) : (
          <>
            <span className="card-kicker card-kicker--sm">
              {guardando ? 'Guardando…' : subido === false ? 'Top 10 de este equipo' : 'Top 10 del congreso'}
            </span>
            {/* Si la marca no salió del equipo hay que DECIRLO: el jugador se
                va creyendo que compite con todo el congreso y su nombre no está
                en ninguna parte. No es un error del jugador ni hay nada que
                pueda hacer, así que se cuenta en una línea y sin alarma. */}
            {subido === false && (
              <p className="how-foot">
                Sin conexión con el marcador del congreso: tu marca quedó guardada en este equipo.
              </p>
            )}
            <div className="board">
              {ranking.map((r, i) => (
                <div
                  key={`${r.name}-${r.date}`}
                  className={`board-row${r.name.toUpperCase() === myName && r.score === score ? ' board-row--me' : ''}`}
                >
                  <span className="board-pos">{i + 1}</span>
                  <span className="board-name">{r.name}</span>
                  <span className="board-unit">{r.unit ?? '—'}</span>
                  <span className="board-score">{r.score.toLocaleString('es-MX')}</span>
                </div>
              ))}
            </div>
          </>
        )}

        <div className="actions">
          <button
            className="btn-skew"
            data-gp-row={filaAcciones}
            onClick={() => {
              unlockAudio();
              startMusic();
              startGame();
            }}
          >
            <span>Jugar otra vez</span>
          </button>
          <button className="btn-ghost" data-gp-row={filaAcciones} onClick={backToMenu}>
            Inicio
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
