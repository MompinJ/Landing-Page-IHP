import { useGame } from '../store'
import { ZONES } from '../course'

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
  const zone = useGame((s) => s.zone)
  const pause = useGame((s) => s.pause)

  if (phase === 'intro' || phase === 'gameover') return null

  const z = ZONES[zone]

  return (
    <div className="hud" style={{ '--zone': z.accent }}>
      {/* el cartel se remonta con la key al cambiar de zona y la animacion CSS
          lo entra y lo saca sola en ~2.4 s */}
      {/* la key va prefijada: sin el prefijo choca con la del mensaje flotante,
          que tambien es un entero pequeno y cuelga del mismo .hud */}
      <div key={`zone-${zone}`} className="zone-card">
        <span className="zone-n">{`ZONA ${zone + 1} / ${ZONES.length}`}</span>
        <strong className="zone-name">{z.name}</strong>
        <span className="zone-tag">{z.tag}</span>
      </div>
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
          <strong>{lastEvent.delta > 0 ? `+${lastEvent.delta}` : lastEvent.delta}</strong> {lastEvent.label}
        </div>
      )}
      {lastEvent && lastEvent.type === 'bad' && phase === 'playing' && (
        <div key={`flash-${lastEvent.id}`} className="bad-flash" />
      )}
    </div>
  )
}
