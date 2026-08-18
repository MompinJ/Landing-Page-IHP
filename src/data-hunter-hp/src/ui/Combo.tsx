import { AnimatePresence, motion } from 'framer-motion';
import { useGameStore } from '../store/useGameStore';

export function Combo() {
  const streak = useGameStore((s) => s.streak);
  const multiplier = useGameStore((s) => s.multiplier);

  return (
    <div className="hud-panel hud-combo">
      <span className="hud-label">Combo</span>
      <AnimatePresence mode="popLayout">
        <motion.span
          key={multiplier}
          className={`hud-value hud-combo-x${multiplier}`}
          initial={{ scale: 1.6, rotate: -6 }}
          animate={{ scale: 1, rotate: 0 }}
          exit={{ scale: 0.6, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 400, damping: 18 }}
        >
          x{multiplier}
        </motion.span>
      </AnimatePresence>
      <span className="hud-streak">{streak} seguidos</span>
    </div>
  );
}
