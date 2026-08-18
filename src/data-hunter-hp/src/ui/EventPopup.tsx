import { AnimatePresence, motion } from 'framer-motion';
import { useGameStore } from '../store/useGameStore';

/**
 * Popup flotante por evento de gameplay: "+100 Innovación", "-50 Phishing",
 * "-25 ¡Choque!". Cada seq nuevo monta un elemento que sube y se desvanece.
 */
export function EventPopup() {
  const lastEvent = useGameStore((s) => s.lastEvent);
  if (!lastEvent) return null;

  const positive = lastEvent.type === 'good';
  const text =
    lastEvent.type === 'obstacle'
      ? `${lastEvent.points} ${lastEvent.label ?? '¡Choque!'}`
      : `${positive ? '+' : ''}${lastEvent.points} ${lastEvent.label}`;

  return (
    <AnimatePresence>
      <motion.div
        key={lastEvent.seq}
        className={`event-popup ${positive ? 'event-popup--good' : 'event-popup--bad'}`}
        initial={{ opacity: 0, y: 10, scale: 0.85 }}
        animate={{ opacity: [0, 1, 1, 0], y: -46, scale: 1 }}
        transition={{ duration: 1.0, times: [0, 0.12, 0.7, 1] }}
      >
        {text}
      </motion.div>
    </AnimatePresence>
  );
}
