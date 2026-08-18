import { motion } from 'framer-motion';
import { unlockAudio } from '../audio/sfx';
import { BALANCE } from '../data/balance';
import { useGameStore } from '../store/useGameStore';

/** Muestra de vocabulario real de las tarjetas (ver data/items.ts) */
const BUENAS = ['CALIDAD', 'LIDERAZGO', 'RESPALDO', 'MUELLE', 'SENSOR', 'EQUIPO'];
const MALAS = ['AMENAZA', 'FRAUDE', 'MALWARE', 'RIESGO'];

/**
 * PORTADA. Mismo lenguaje gráfico que el cartel de terminal y la pantalla
 * final: esquina biselada, antetítulo espaciado, título
 * en cursiva a dos tonos y botón en paralelogramo.
 */
export function Menu() {
  const phase = useGameStore((s) => s.phase);
  const startGame = useGameStore((s) => s.startGame);

  if (phase !== 'menu') return null;

  return (
    <motion.div className="overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <motion.div
        className="card card--tall"
        initial={{ y: 30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 260, damping: 24 }}
      >
        <span className="card-kicker">Hutchison Ports <i>|</i> Congreso de Calidad</span>
        <h1 className="card-title card-title--hero">
          Data <em>Hunter</em>
        </h1>
        <p className="card-tagline">Salta hacia lo correcto. Esquiva los riesgos.</p>
        <p className="card-lead">
          Cruza las cinco terminales del Grupo — Contenedores, Universal, Cruceros,
          Astillero e Intermodal — recolectando los conceptos de valor y
          esquivando los riesgos.
        </p>

        {/* REGLAS. Cinco líneas y ni una más: esto se lee de pie, con gente
            detrás esperando turno. Cada una arranca con su entradilla en cian
            para poder escanear solo lo que hace falta. Las cifras salen de
            BALANCE — si se retoca el balanceo, el cartel no miente. */}
        <ul className="rules">
          <li className="rule">
            <span>
              <b className="rule-lead">Mover</b> <kbd>↑</kbd> <kbd>←</kbd> <kbd>→</kbd> o{' '}
              <kbd>W</kbd> <kbd>A</kbd> <kbd>D</kbd>. <kbd>Espacio</kbd> avanza. Mando Xbox:{' '}
              <kbd>stick</kbd> y <kbd>A</kbd>.
            </span>
          </li>
          <li className="rule">
            <span>
              <b className="rule-lead">Atrás</b> <kbd>↓</kbd> <kbd>S</kbd>, hasta{' '}
              <strong>{BALANCE.BACK_STEPS_MAX} casillas</strong>. Si te pasas te cae un
              contenedor encima o te saca el dron: <b className="t-bad">una vida</b>.
            </span>
          </li>
          <li className="rule">
            <span>
              <b className="rule-lead">Tarjetas</b> recoge las <b className="t-good">verdes</b>{' '}
              (<strong>+{BALANCE.SCORE_GOOD}</strong>; {BALANCE.COMBO_X2_AT} seguidas{' '}
              <b className="t-warn">x2</b>, {BALANCE.COMBO_X3_AT} <b className="t-warn">x3</b>) y
              esquiva las <b className="t-bad">rojas</b> (<strong>{BALANCE.SCORE_BAD}</strong>).
            </span>
          </li>
          <li className="rule">
            <span>
              <b className="rule-lead">Peligros</b> tráfico, grúas, diques y el agua de{' '}
              <strong>Cruceros</strong> (<strong>{BALANCE.SCORE_OBSTACLE}</strong>): cada golpe
              cuesta <b className="t-bad">una vida</b> de las {BALANCE.LIVES}.
            </span>
          </li>
          <li className="rule">
            <span>
              <b className="rule-lead">Pasaporte</b> cada terminal nueva{' '}
              <b className="t-warn">+{BALANCE.SCORE_STAMP}</b> y las <strong>5 completas</strong>{' '}
              <b className="t-warn">+{BALANCE.SCORE_PASSPORT_COMPLETE}</b>.
            </span>
          </li>
        </ul>

        {/* Muestra del vocabulario: verdes a la izquierda, rojos a la derecha,
            en grupos separados para que no se entremezclen al envolver. */}
        <div className="chips">
          <div className="chips-group">
            {BUENAS.map((w) => (
              <span key={w} className="chip chip--good"><span>{w}</span></span>
            ))}
          </div>
          <div className="chips-group">
            {MALAS.map((w) => (
              <span key={w} className="chip chip--bad"><span>{w}</span></span>
            ))}
          </div>
        </div>

        <button
          className="btn-skew"
          onClick={() => {
            unlockAudio(); // el AudioContext requiere un gesto del usuario
            startGame();
          }}
        >
          <span>Iniciar misión</span>
        </button>
      </motion.div>
    </motion.div>
  );
}
