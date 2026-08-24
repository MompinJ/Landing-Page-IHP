import { AnimatePresence, motion } from 'framer-motion';
import { useGameStore } from '../store/useGameStore';

/**
 * Popup flotante por evento de gameplay: "+10 Innovación", "−10 Phishing",
 * "−1 vida · ¡Choque!". Cada seq nuevo monta un elemento que sube y se
 * desvanece.
 *
 * El choque NO enseña puntos porque no los cuesta (ver `SCORE_OBSTACLE`):
 * enseña la moneda con la que se paga de verdad, que es el corazón. Con la
 * plantilla de puntos salía un "0 ¡Choque!" que se leía como que no ha pasado
 * nada, justo cuando acaba de pasar lo más grave de la partida.
 */
export function EventPopup() {
  const lastEvent = useGameStore((s) => s.lastEvent);
  if (!lastEvent) return null;

  const positive = lastEvent.type === 'good';
  const text =
    lastEvent.type === 'obstacle'
      ? lastEvent.points === 0
        ? `\u22121 vida \u00b7 ${lastEvent.label ?? '\u00a1Choque!'}`
        : `${lastEvent.points} ${lastEvent.label ?? '\u00a1Choque!'}`
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
