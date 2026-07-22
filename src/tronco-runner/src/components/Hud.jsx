import { useGame } from '../store'

function fmtTime(t) {
  const m = Math.floor(t / 60)
  const s = t % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

export function Hud() {
  const phase = useGame((s) => s.phase)
  const score = useGame((s) => s.score)
  const timeShown = useGame((s) => s.timeShown)
  const distShown = useGame((s) => s.distShown)
  const lastEvent = useGame((s) => s.lastEvent)
  const pause = useGame((s) => s.pause)

  if (phase === 'intro' || phase === 'gameover') return null

  return (
    <div className="hud">
      <div className="chips">
        <div className="chip">
          <span className="chip-label">Tiempo</span>
          <span className="chip-value">{fmtTime(timeShown)}</span>
        </div>
        <div className="chip chip-accent">
          <span className="chip-label">Puntos</span>
          <span className="chip-value">{score}</span>
        </div>
        <div className="chip">
          <span className="chip-label">Distancia</span>
          <span className="chip-value">{distShown} m</span>
        </div>
      </div>
      <button className="help-btn" onClick={pause} aria-label="Ayuda">
        ?
      </button>
      {lastEvent && phase === 'playing' && (
        <div key={lastEvent.id} className={`float-msg ${lastEvent.type}`}>
          <strong>{lastEvent.type === 'good' ? '+10' : '-10'}</strong> {lastEvent.label}
        </div>
      )}
      {lastEvent && lastEvent.type === 'bad' && phase === 'playing' && (
        <div key={`flash-${lastEvent.id}`} className="bad-flash" />
      )}
    </div>
  )
}
