import { motion } from 'framer-motion';
import { startMusic } from '../audio/music';
import { unlockAudio } from '../audio/sfx';
import { BALANCE } from '../data/balance';
import { useGameStore } from '../store/useGameStore';
import { Briefing } from './Briefing';

/**
 * PORTADA. Mismo lenguaje gráfico que el cartel de terminal y la pantalla
 * final: esquina biselada, antetítulo espaciado, título
 * en cursiva a dos tonos y botón en paralelogramo.
 *
 * Es UNA SOLA PANTALLA y no lleva botones de navegación, como la de Terminal
 * Rally: delante del stand la portada tiene que contestar «qué es esto» sin
 * que nadie navegue. LAS REGLAS YA NO ESTÁN AQUÍ — se leen en el briefing
 * (ver `Briefing.tsx`), que es el paso previo a la partida. Antes eran cinco
 * párrafos a pie de portada que nadie se paraba a leer con gente esperando
 * turno, y encima competían con el botón de jugar.
 */
export function Menu() {
  const phase = useGameStore((s) => s.phase);
  const openBriefing = useGameStore((s) => s.openBriefing);

  if (phase !== 'menu' && phase !== 'briefing') return null;

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
          Port <em>Quest</em>
        </h1>
        <p className="card-tagline">Salta hacia lo correcto. Esquiva los riesgos.</p>

        {phase === 'menu' ? (
          <>
            <p className="card-lead">
              Cruza las cinco terminales del Grupo — Contenedores, Universal, Cruceros,
              Astillero e Intermodal — recolectando los conceptos de valor y
              esquivando los riesgos.
            </p>

            {/* Las dos cifras que contestan «cuánto dura esto» de un vistazo */}
            <div className="facts">
              <span className="fact">
                <b>{BALANCE.LIVES}</b> vidas
              </span>
              <span className="fact">
                <b>5</b> terminales
              </span>
            </div>

            <button
              className="btn-skew"
              onClick={() => {
                unlockAudio(); // el AudioContext requiere un gesto del usuario
                startMusic(); // ...y la música, por lo mismo (ver audio/music.ts)
                openBriefing();
              }}
            >
              <span>Jugar</span>
            </button>
          </>
        ) : (
          <Briefing />
        )}
      </motion.div>
    </motion.div>
  );
}
