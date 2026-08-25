import { AnimatePresence, motion } from 'framer-motion';
import { BALANCE } from '../data/balance';
import { UNITS } from '../data/units';
import { useGameStore } from '../store/useGameStore';
import { BIOME_SEQUENCE } from '../world/rows';

/**
 * CARTEL DE ENTRADA A TERMINAL — el letrero que anuncia dónde estás.
 *
 * El mapa cambia de bioma sin avisar, y hasta ahora la única pista de en qué
 * unidad de negocio andabas era el color del cielo. El cartel usa el mismo
 * lenguaje gráfico que la portada y la pantalla final (esquina biselada,
 * antetítulo espaciado, título en cursiva a dos tonos), para
 * que las tres pantallas se lean como el mismo producto.
 *
 * Aparece ~2.6 s y se va solo: es un rótulo de paso, no un HUD permanente.
 */
export function TerminalSign() {
  const entered = useGameStore((s) => s.enteredUnit);
  if (!entered) return null;

  const info = UNITS[entered.unit];
  const total = BIOME_SEQUENCE.length;
  const pos = BIOME_SEQUENCE.indexOf(entered.unit) + 1;
  const lap = Math.floor(entered.stage / total) + 1;

  // Título a dos tonos: la última palabra en el color de la terminal, igual
  // que el "TERMINAL RALLY" de la portada.
  const words = info.name.trim().split(' ');
  const tail = words.pop() ?? info.name;
  const head = words.join(' ');

  return (
    // El centrado va en el contenedor y NO en el elemento animado: framer
    // reescribe `transform` en cada frame y se llevaría por delante el
    // translateX(-50%) que lo centra.
    <div className="term-sign" style={{ ['--accent' as string]: info.accent }}>
      <AnimatePresence>
        <motion.div
          key={entered.seq}
          initial={{ opacity: 0, y: -26, scale: 0.94 }}
          animate={{ opacity: [0, 1, 1, 0], y: 0, scale: 1 }}
          transition={{ duration: 2.6, times: [0, 0.08, 0.78, 1], ease: 'easeOut' }}
        >
          <div className="term-sign-card">
            <span className="term-sign-kicker">
              Entrando a · Terminal {pos} de {total}
              {lap > 1 ? ` · Vuelta ${lap}` : ''}
            </span>
            <h2 className="term-sign-title">
              {head && <span>{head} </span>}
              <em>{tail}</em>
            </h2>
            <span className="term-sign-detail">{info.detail}</span>
            {entered.fresh && (
              <span className="term-sign-badge">
                Sello nuevo +{BALANCE.SCORE_STAMP}
              </span>
            )}
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
