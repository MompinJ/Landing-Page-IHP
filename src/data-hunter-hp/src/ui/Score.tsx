import { motion } from 'framer-motion';
import { useGameStore } from '../store/useGameStore';

export function Score() {
  const score = useGameStore((s) => s.score);

  return (
    <div className="hud-panel hud-score">
      <span className="hud-label">Puntos</span>
      <motion.span
        key={score}
        className="hud-value"
        initial={{ scale: 1.25 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 500, damping: 22 }}
      >
        {score.toLocaleString('es-MX')}
      </motion.span>
    </div>
  );
}
