import { AnimatePresence, motion } from 'framer-motion';
import { PALETTE } from '../data/palette';
import { useGameStore } from '../store/useGameStore';
import { Combo } from './Combo';
import { EventPopup } from './EventPopup';
import { Score } from './Score';
import { TerminalSign } from './TerminalSign';
import { Timer } from './Timer';

/**
 * HUD reactivo durante la partida. Cada widget se suscribe SOLO a su slice del
 * store (selectors) — el timer re-renderiza 1 vez por segundo, el score solo
 * en eventos de recolección. Nada del HUD toca el bucle 3D.
 */
export function HUD() {
  const phase = useGameStore((s) => s.phase);
  const lastEvent = useGameStore((s) => s.lastEvent);

  if (phase !== 'playing') return null;

  return (
    <div className="hud">
      <Score />
      <Timer />
      <Combo />
      <EventPopup />
      {/* Cartel de la terminal en la que se entra. La tira de sellos vive en
          la pantalla final, no encima del juego. */}
      <TerminalSign />

      {/* Flash de pantalla en impactos (obstáculo/tarjeta roja) */}
      <AnimatePresence>
        {lastEvent && lastEvent.type !== 'good' && (
          <motion.div
            key={lastEvent.seq}
            className="hud-flash"
            initial={{ opacity: 0.45 }}
            animate={{ opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            style={{ background: `radial-gradient(ellipse at center, transparent 40%, ${PALETTE.glowBad} 130%)` }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
