import { useEffect, useState } from 'react'
import { gamepadState } from '../gamepad'

// Panel de diagnostico del mando: ?gamepad=debug
//
// Existe para poder validar el mando en una maquina que no es la de uno. El del
// stand abre la URL en su Windows, pulsa botones y manda una captura; con el id,
// el mapeo y los indices que se encienden ya se sabe si el mapeo estandar se
// cumple ahi, sin tener que cambiar a ciegas, desplegar y volver a preguntar.

const NAMES = {
  0: 'A',
  1: 'B',
  2: 'X',
  3: 'Y',
  4: 'LB',
  5: 'RB',
  6: 'LT',
  7: 'RT',
  8: 'VIEW',
  9: 'START',
  10: 'LS',
  11: 'RS',
  12: 'D-UP',
  13: 'D-DN',
  14: 'D-IZQ',
  15: 'D-DER',
  16: 'GUIA',
}

export function GamepadDebug() {
  const [, tick] = useState(0)

  // El panel se refresca en su propio rAF: el estado del mando se muta en sitio
  // dentro de gamepad.js y no notifica por frame a proposito.
  useEffect(() => {
    let raf = 0
    const loop = () => {
      tick((v) => v + 1)
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [])

  const s = gamepadState
  const odd = s.connected && s.mapping !== 'standard'

  return (
    <div className="gp-debug">
      <h4>Diagnostico de mando</h4>
      <dl>
        <dt>Gamepad API</dt>
        <dd className={s.supported ? 'ok' : 'ko'}>{s.supported ? 'disponible' : 'no disponible'}</dd>
        <dt>Contexto seguro</dt>
        <dd className={s.secure ? 'ok' : 'ko'}>{s.secure ? 'si' : 'NO'}</dd>
        <dt>Estado</dt>
        <dd className={s.connected ? 'ok' : 'warn'}>
          {s.connected ? 'conectado' : s.awaiting ? 'pulsa un boton del mando' : 'sin mando'}
        </dd>
        <dt>id</dt>
        <dd className="mono">{s.id || '-'}</dd>
        <dt>indice</dt>
        <dd className="mono">{s.index < 0 ? '-' : s.index}</dd>
        <dt>mapping</dt>
        <dd className={odd ? 'ko mono' : 'mono'}>{s.mapping || '-'}</dd>
      </dl>

      {!s.secure && (
        <p className="gp-note ko">
          La pagina no esta en contexto seguro, asi que el navegador nunca va a entregar el mando. Pasa al abrirla por
          IP de LAN con http. Usa localhost en esta misma maquina o la URL https del despliegue.
        </p>
      )}
      {odd && (
        <p className="gp-note ko">
          El mando no reporta mapeo estandar: los indices de abajo pueden no coincidir con los nombres. Anota que boton
          fisico enciende cada indice.
        </p>
      )}

      <div className="gp-grid">
        {s.buttons.map((v, i) => (
          <span key={i} className={v > 0.5 ? 'gp-b on' : 'gp-b'}>
            <b>{i}</b>
            {NAMES[i] || ''}
          </span>
        ))}
      </div>
      <div className="gp-axes">
        {s.axes.map((v, i) => (
          <span key={i} className="mono">
            ej{i}: {v.toFixed(2)}
          </span>
        ))}
      </div>
    </div>
  )
}
