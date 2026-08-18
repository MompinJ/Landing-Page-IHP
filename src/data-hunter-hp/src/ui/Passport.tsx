import { motion } from 'framer-motion';
import { UNITS } from '../data/units';
import { BIOME_SEQUENCE, type ZoneTheme } from '../world/rows';
import { useGameStore } from '../store/useGameStore';

/**
 * PASAPORTE DE TERMINALES — la meta de la partida, en la PANTALLA FINAL.
 *
 * El juego es infinito por diseño (Crossy Road), así que sin esto la única
 * respuesta a "¿hasta dónde llegué?" era el número del marcador. Durante la
 * partida no se dibuja: el HUD ya lleva marcador, vidas y combo, y una sexta
 * cosa fija en pantalla compite con el juego en vez de acompañarlo. Mientras
 * juegas, la terminal la anuncia `TerminalSign` y desaparece sola.
 */
export function PassportStrip() {
  const visited = useGameStore((s) => s.visitedUnits);
  return (
    <div className="passport">
      {BIOME_SEQUENCE.map((unit) => (
        <Stamp key={unit} unit={unit} stamped={visited.includes(unit)} />
      ))}
    </div>
  );
}

/** Sello del pasaporte: NOMBRE de la terminal, con sus siglas de apoyo. Las
 *  siglas solas (TEC/TUM/ECV/TNG/TILH) solo las descifra quien ya trabaja en
 *  esa unidad; el nombre es lo que cuenta por dónde pasaste. */
function Stamp({ unit, stamped }: { unit: ZoneTheme; stamped: boolean }) {
  const info = UNITS[unit];
  return (
    <motion.span
      className={`passport-stamp ${stamped ? 'passport-stamp--on' : ''}`}
      title={`${info.code} · ${info.name} — ${info.detail}`}
      animate={stamped ? { scale: [1, 1.25, 1] } : { scale: 1 }}
      transition={{ duration: 0.45 }}
      style={stamped ? { borderColor: info.accent, color: info.accent, boxShadow: `0 0 12px ${info.accent}66` } : undefined}
    >
      <span className="passport-stamp-code">{info.code}</span>
      <span className="passport-stamp-name">{info.name}</span>
    </motion.span>
  );
}
