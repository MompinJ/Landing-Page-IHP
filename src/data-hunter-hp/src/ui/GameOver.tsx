import { motion } from 'framer-motion';
import { useState } from 'react';
import { startMusic } from '../audio/music';
import { unlockAudio } from '../audio/sfx';
import { ORG_UNITS } from '../data/orgUnits';
import { postScore } from '../services/scoreService';
import { accuracyOf, useGameStore } from '../store/useGameStore';
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
 */
export function GameOver() {
  const phase = useGameStore((s) => s.phase);
  const score = useGameStore((s) => s.score);
  const goodCollected = useGameStore((s) => s.goodCollected);
  const badHit = useGameStore((s) => s.badHit);
  const obstaclesHit = useGameStore((s) => s.obstaclesHit);
  const foundConcepts = useGameStore((s) => s.foundConcepts);
  const ranking = useGameStore((s) => s.ranking);
  const visitedUnits = useGameStore((s) => s.visitedUnits);
  const submitScore = useGameStore((s) => s.submitScore);
  const startGame = useGameStore((s) => s.startGame);
  const backToMenu = useGameStore((s) => s.backToMenu);

  const [name, setName] = useState('');
  const [unit, setUnit] = useState('');
  const [submitted, setSubmitted] = useState(false);

  if (phase !== 'gameover') return null;

  // La precisión ya no se enseña en pantalla, pero sigue viajando con el score
  // (ranking local y POST a la API de high-scores).
  const accuracy = accuracyOf({ goodCollected, badHit, obstaclesHit });

  const myName = (name.trim() || 'ANON').toUpperCase();

  return (
    <motion.div
      className="overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.35 }}
    >
      <motion.div
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
              submitScore(name, unit);
              postScore({
                name: name.trim() || 'ANON',
                score,
                accuracy,
                maxRow: useGameStore.getState().maxRow,
                concepts: foundConcepts,
                units: visitedUnits,
                unit: unit || undefined,
                date: new Date().toISOString(),
                event: 'congreso-hutchison-ports',
              });
              setSubmitted(true);
            }}
          >
            <span className="card-kicker card-kicker--sm">Tu unidad de negocio</span>
            {/* Botones, no un <select>: en el kiosco se juega con el dedo y una
                lista desplegable nativa se abre fuera del lienzo del juego. */}
            <div className="chips chips--pick">
              {ORG_UNITS.map((u) => (
                <button
                  key={u.code}
                  type="button"
                  title={u.name}
                  className={`chip chip--pick${unit === u.code ? ' chip--on' : ''}`}
                  onClick={() => setUnit(unit === u.code ? '' : u.code)}
                >
                  <span>{u.code}</span>
                </button>
              ))}
            </div>
            <div className="submit-row">
              <input
                className="name-input"
                value={name}
                maxLength={12}
                placeholder="Tu nombre"
                onChange={(e) => setName(e.target.value)}
                autoFocus
              />
              <button className="btn-skew btn-skew--sm" type="submit"><span>Guardar</span></button>
            </div>
          </form>
        ) : (
          <>
            <span className="card-kicker card-kicker--sm">Top 10 del congreso</span>
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
            onClick={() => {
              unlockAudio();
              startMusic();
              startGame();
            }}
          >
            <span>Jugar otra vez</span>
          </button>
          <button className="btn-ghost" onClick={backToMenu}>Inicio</button>
        </div>
      </motion.div>
    </motion.div>
  );
}
