import { useGame } from '../store'
import { chainZone } from '../course'
import { STREAK_X2, STREAK_X3 } from '../constants'

export function Hud() {
  const phase = useGame((s) => s.phase)
  const score = useGame((s) => s.score)
  const distShown = useGame((s) => s.distShown)
  const goods = useGame((s) => s.goods)
  const racha = useGame((s) => s.racha)
  const mult = useGame((s) => s.mult)
  const escudo = useGame((s) => s.escudo)
  const record = useGame((s) => s.record)
  const recordHecho = useGame((s) => s.recordHecho)
  const lastEvent = useGame((s) => s.lastEvent)
  const zone = useGame((s) => s.zone)
  const pause = useGame((s) => s.pause)

  if (phase === 'intro' || phase === 'gameover') return null

  const z = chainZone(zone)
  // Cuanto falta para el siguiente escalon. Es lo que convierte la racha en
  // algo que se persigue: "llevas 6" no dice nada, "faltan 2 para x2" si.
  const siguiente = racha < STREAK_X2 ? STREAK_X2 : racha < STREAK_X3 ? STREAK_X3 : 0

  return (
    <div className="hud" style={{ '--zone': z.accent }}>
      {/* el cartel se remonta con la key al cambiar de terminal y la animacion
          CSS lo entra y lo saca sola en ~2.4 s */}
      {/* la key va prefijada: sin el prefijo choca con la del mensaje flotante,
          que tambien es un entero pequeno y cuelga del mismo .hud */}
      <div key={`zone-${zone}`} className="zone-card">
        {/* Sin denominador: el recorrido no tiene un total al que llegar, y lo
            que de verdad se presume aqui es cuantas terminales se han cruzado */}
        <span className="zone-n">{`TERMINAL ${zone + 1}`}</span>
        <strong className="zone-name">{z.name}</strong>
        <span className="zone-tag">{z.tag}</span>
      </div>
      <div className="chips">
        {/* Sin reloj: lo que hay en su sitio es la distancia, que es la medida
            de una carrera sin final. Los puntos siguen en el centro porque son
            los que ordenan la tabla. */}
        <div className="chip">
          <span className="chip-label">Distancia</span>
          <span className="chip-value">{distShown} m</span>
        </div>
        <div className="chip chip-accent">
          <span className="chip-label">Puntos</span>
          <span className="chip-value">{score}</span>
        </div>
        <div className="chip">
          <span className="chip-label">Valores</span>
          <span className="chip-value">{goods}</span>
        </div>
      </div>

      {/* RACHA. Va debajo de las cifras y no entre ellas: no es un dato que se
          consulte, es un aviso que aparece cuando hay algo que perder. Con la
          racha a cero no se pinta nada, que es lo que mantiene el HUD callado
          la mayor parte del tiempo. */}
      {racha > 0 && (
        <div className={`streak${mult > 1 ? ' streak-on' : ''}`}>
          {/* la key remonta el multiplicador al subir de escalon, y la animacion
              CSS le da el golpe de escala sola */}
          <b key={mult} className="streak-mult">
            {mult > 1 ? `x${mult}` : `${racha}`}
          </b>
          <span className="streak-txt">
            {siguiente ? `${siguiente - racha} para x${mult + 1}` : 'racha máxima'}
          </span>
        </div>
      )}

      {/* Casco reforzado en la mochila: mientras este puesto, un choque no mata */}
      {escudo && (
        <div className="shield-tag">
          <span className="shield-ico" aria-hidden="true" />
          CASCO PUESTO
        </div>
      )}

      {/* La marca a batir. Desaparece al superarla, porque a partir de ahi ya no
          hay nada que batir: lo que queda es seguir. */}
      {record > 0 && !recordHecho && (
        <div className="record-tag">
          RÉCORD <b>{record} m</b>
        </div>
      )}
      {recordHecho && phase === 'playing' && (
        <div key="record-hit" className="record-hit">
          ¡RÉCORD PERSONAL!
        </div>
      )}

      <button className="help-btn" onClick={pause} aria-label="Ayuda">
        ?
      </button>
      {lastEvent && phase === 'playing' && lastEvent.delta !== 0 && (
        <div key={lastEvent.id} className={`float-msg ${lastEvent.type}`}>
          <strong>{lastEvent.delta > 0 ? `+${lastEvent.delta}` : lastEvent.delta}</strong> {lastEvent.label}
          {lastEvent.mult > 1 && <em className="float-mult">x{lastEvent.mult}</em>}
        </div>
      )}
      {lastEvent && lastEvent.type === 'bad' && phase === 'playing' && (
        <div key={`flash-${lastEvent.id}`} className="bad-flash" />
      )}
    </div>
  )
}
