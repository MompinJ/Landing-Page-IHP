import { useGameStore } from '../store/useGameStore';

/** Indicador de VIDAS (sustituye al temporizador — la partida es a 2 vidas) */
export function Timer() {
  const lives = useGameStore((s) => s.lives);
  const shield = useGameStore((s) => s.shield);
  const critical = lives <= 1;

  return (
    <div className={`hud-panel hud-timer${critical ? ' hud-timer--critical' : ''}`}>
      <span className="hud-label">Vidas</span>
      <span className="hud-value">{('\u2665'.repeat(Math.max(0, lives)) || '\u2014') + (shield ? ' \u26E8' : '')}</span>
    </div>
  );
}
