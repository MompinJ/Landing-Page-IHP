import { useEffect, useRef, useState } from 'react'
import { useGame } from '../store'
import { sfx } from '../audio'
import { useGamepadAction, useGamepadConnected, useGamepadGrid } from '../useGamepad'
import { GOOD_ITEMS, BAD_ITEMS, RANKS, LEADERBOARD_KEY } from '../constants'

function Rules({ pad }) {
  return (
    <ul className="rules">
      <li>
        <span className="key-hint">{pad ? 'Cruceta / Stick' : 'Desliza / Flechas'}</span> para cambiar de carril
        {pad && <> (o las hombreras <span className="key-hint">LB</span> / <span className="key-hint">RB</span>)</>}.
      </li>
      <li>
        <span className="key-hint">{pad ? 'A / Arriba' : 'Desliza arriba / Espacio'}</span> para saltar.
      </li>
      <li>
        <span className="key-hint">{pad ? 'B / Abajo' : 'Desliza abajo / Flecha abajo'}</span> para rodar por debajo.
      </li>
      <li>
        Recoge los hexagonos <b className="txt-good">verdes</b>: valores del Tronco Comun <b>(+10)</b>.
      </li>
      <li>
        Esquiva los <b className="txt-bad">rojos</b>: riesgos que danan nuestra cultura <b>(-10)</b>.
      </li>
      <li>
        Cuidado con los <b>obstaculos</b> <b>(-15)</b>. Cada uno lleva su senal encima y siempre dice lo mismo, sea
        cual sea la terminal: flecha <b className="txt-cue-jump">ambar hacia arriba</b> es saltar y flecha{' '}
        <b className="txt-cue-roll">cian hacia abajo</b> es rodar por debajo. Lo que cierra el carril entero no lleva
        senal: eso se esquiva cambiando de carril.
      </li>
      <li>
        En <b>Cruceros</b> se acaba el suelo: salta de lancha en lancha, porque caer al agua cuesta <b>-15</b>.
      </li>
      <li>
        En el <b>Astillero</b> los andamios se suben por su escalera: si aguantas arriba toda la cadena saltando de
        tablero en tablero, hay <b>bono</b>.
      </li>
      <li>
        Tienes <b>2 minutos</b> para cruzar las <b>5 terminales</b>.{' '}
        {pad ? (
          <>
            Boton <span className="key-hint">START</span> para pausa y ayuda.
          </>
        ) : (
          <>
            Boton <span className="key-hint">?</span> o tecla <span className="key-hint">H</span> para pausa y ayuda.
          </>
        )}
      </li>
    </ul>
  )
}

function Legend() {
  return (
    <div className="legend">
      <div className="legend-col">
        {GOOD_ITEMS.map((l) => (
          <span key={l} className="tag tag-good">
            {l}
          </span>
        ))}
      </div>
      <div className="legend-col">
        {BAD_ITEMS.map((l) => (
          <span key={l} className="tag tag-bad">
            {l}
          </span>
        ))}
      </div>
    </div>
  )
}

// Aviso de mando en la portada. En el stand es lo que distingue "el mando no
// funciona" de "el mando aun no ha despertado": los navegadores no lo exponen
// hasta que se pulsa un boton en el.
//
// Va arriba del panel a proposito: la tarjeta de la portada es mas alta que una
// pantalla de portatil y saca scroll, asi que abajo del todo no lo veria nadie.
function PadBadge({ pad }) {
  if (!pad) return null
  return (
    <p className="pad-badge">
      Mando conectado &mdash; pulsa <b>A</b> para jugar
    </p>
  )
}

function Intro() {
  const startCountdown = useGame((s) => s.startCountdown)
  const pad = useGamepadConnected()
  const ref = useRef(null)
  useGamepadGrid(ref)

  return (
    <div className="overlay">
      <div className="panel" ref={ref}>
        <p className="kicker">Hutchison Ports | Congreso de Calidad</p>
        <h1 className="title">
          TRONCO COMÚN <span className="title-accent">RUNNER</span>
        </h1>
        <p className="subtitle">Corre hacia lo correcto. Evita los riesgos.</p>
        <PadBadge pad={pad} />
        <p className="mission">
          Cruza las cinco terminales del grupo &mdash; Usos Multiples, Contenedores, Intermodal, Cruceros y Astillero
          &mdash; recolectando los valores del Tronco Comun y esquivando los riesgos.
        </p>
        <Rules pad={pad} />
        <Legend />
        <button
          className="btn-primary"
          data-gp-row="0"
          onClick={() => {
            sfx.unlock()
            startCountdown()
          }}
        >
          JUGAR
        </button>
      </div>
    </div>
  )
}

function Countdown() {
  const play = useGame((s) => s.play)
  const [n, setN] = useState(3)

  useEffect(() => {
    if (n > 0) sfx.count()
    else sfx.go()
    if (n === 0) {
      const t = setTimeout(play, 500)
      return () => clearTimeout(t)
    }
    const t = setTimeout(() => setN((v) => v - 1), 750)
    return () => clearTimeout(t)
  }, [n, play])

  return (
    <div className="overlay overlay-clear">
      <div className="count" key={n}>
        {n > 0 ? n : 'GO'}
      </div>
    </div>
  )
}

function Paused() {
  const resume = useGame((s) => s.resume)
  const pad = useGamepadConnected()
  const ref = useRef(null)
  useGamepadGrid(ref)

  // B sale de la pausa sin tener que apuntar al boton; START ya lo hace desde
  // el manejador de partida.
  useGamepadAction((action) => {
    if (action === 'back') resume()
  })

  return (
    <div className="overlay">
      <div className="panel" ref={ref}>
        <h2 className="title title-sm">PAUSA</h2>
        <Rules pad={pad} />
        <button className="btn-primary" data-gp-row="0" onClick={resume}>
          CONTINUAR
        </button>
      </div>
    </div>
  )
}

function loadBoard() {
  try {
    return JSON.parse(localStorage.getItem(LEADERBOARD_KEY)) || []
  } catch {
    return []
  }
}

const MAX_NAME = 12

// Teclado en pantalla para escribir el nombre con el mando. Solo aparece con un
// mando conectado: sin el, el campo de texto de siempre es mejor y mas rapido.
// Las teclas son botones normales, asi que tambien se pueden tocar con el dedo
// o con el raton; el mando solo mueve el cursor por la rejilla.
const KEY_ROWS = [
  ['A', 'B', 'C', 'D', 'E', 'F', 'G'],
  ['H', 'I', 'J', 'K', 'L', 'M', 'N'],
  ['O', 'P', 'Q', 'R', 'S', 'T', 'U'],
  ['V', 'W', 'X', 'Y', 'Z', 'Ñ', '-'],
]

function NameKeys({ value, onType, onBack, onSave, rowOffset }) {
  return (
    <div className="keys">
      {KEY_ROWS.map((row, r) => (
        <div className="keys-row" key={r}>
          {/* las letras nunca se deshabilitan al llegar al limite: la rejilla
              se arma con los controles activos, asi que al desactivarlas se
              desmontaria el teclado entero bajo el cursor. onType ya recorta. */}
          {row.map((ch) => (
            <button key={ch} className="key" data-gp-row={rowOffset + r} onClick={() => onType(ch)}>
              {ch}
            </button>
          ))}
        </div>
      ))}
      <div className="keys-row">
        <button className="key key-wide" data-gp-row={rowOffset + KEY_ROWS.length} onClick={() => onType(' ')}>
          ESPACIO
        </button>
        <button
          className="key key-wide"
          data-gp-row={rowOffset + KEY_ROWS.length}
          onClick={onBack}
          disabled={!value.length}
        >
          BORRAR
        </button>
        <button
          className="key key-wide key-ok"
          data-gp-row={rowOffset + KEY_ROWS.length}
          onClick={onSave}
          disabled={!value.trim()}
        >
          GUARDAR
        </button>
      </div>
    </div>
  )
}

function GameOver() {
  const score = useGame((s) => s.score)
  const goods = useGame((s) => s.goods)
  const bads = useGame((s) => s.bads)
  const crashes = useGame((s) => s.crashes)
  const distShown = useGame((s) => s.distShown)
  const startCountdown = useGame((s) => s.startCountdown)
  const goIntro = useGame((s) => s.goIntro)
  const pad = useGamepadConnected()

  const [name, setName] = useState('')
  const [savedId, setSavedId] = useState(null)
  const [board, setBoard] = useState(loadBoard)

  const ref = useRef(null)
  useGamepadGrid(ref)

  const rank = RANKS.find((r) => score >= r.min)

  const save = () => {
    const clean = name.trim().toUpperCase().slice(0, MAX_NAME)
    if (!clean) return
    const entry = { id: Date.now(), name: clean, score }
    const next = [...loadBoard(), entry].sort((a, b) => b.score - a.score).slice(0, 10)
    localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(next))
    setBoard(next)
    setSavedId(entry.id)
  }

  const typing = savedId === null
  const keysShown = typing && pad
  // El teclado en pantalla ocupa las cinco primeras filas de la rejilla, asi que
  // los botones de abajo empiezan donde acabe. Con una sola cuenta se mantienen
  // alineados los tres casos: teclado, campo de texto y TOP 10 ya guardado.
  const btnRow = keysShown ? KEY_ROWS.length + 1 : typing ? 1 : 0

  return (
    <div className="overlay">
      <div className="panel" ref={ref}>
        <p className="kicker">Fin del recorrido</p>
        <div className="score-big">
          {score}
          <span className="score-unit">PUNTOS</span>
        </div>
        <p className="rank">{rank.name}</p>
        <div className="stats">
          <span>
            Valores: <b className="txt-good">{goods}</b>
          </span>
          <span>
            Riesgos: <b className="txt-bad">{bads}</b>
          </span>
          <span>
            Choques: <b className="txt-bad">{crashes}</b>
          </span>
          <span>
            Distancia: <b>{distShown} m</b>
          </span>
        </div>

        {typing ? (
          <>
            <div className="save-row">
              <input
                value={name}
                maxLength={MAX_NAME}
                placeholder="TU NOMBRE"
                onChange={(e) => setName(e.target.value.toUpperCase())}
                onKeyDown={(e) => e.key === 'Enter' && save()}
              />
              {/* con mando el boton de guardar vive en el teclado en pantalla,
                  para no tener dos GUARDAR distintos en la misma tarjeta */}
              {!keysShown && (
                <button className="btn-secondary" data-gp-row="0" onClick={save} disabled={!name.trim()}>
                  GUARDAR
                </button>
              )}
            </div>
            {keysShown && (
              <NameKeys
                value={name}
                rowOffset={0}
                onType={(ch) => setName((v) => (v + ch).slice(0, MAX_NAME))}
                onBack={() => setName((v) => v.slice(0, -1))}
                onSave={save}
              />
            )}
          </>
        ) : (
          <div className="board">
            <h3>TOP 10 DEL CONGRESO</h3>
            <ol>
              {board.map((e, i) => (
                <li key={e.id} className={e.id === savedId ? 'me' : ''}>
                  <span className="pos">{i + 1}</span>
                  <span className="pname">{e.name}</span>
                  <span className="pscore">{e.score}</span>
                </li>
              ))}
            </ol>
          </div>
        )}

        <div className="btn-row">
          <button className="btn-primary" data-gp-row={btnRow} onClick={startCountdown}>
            JUGAR OTRA VEZ
          </button>
          <button className="btn-ghost" data-gp-row={btnRow} onClick={goIntro}>
            INICIO
          </button>
        </div>
      </div>
    </div>
  )
}

export function Overlays() {
  const phase = useGame((s) => s.phase)
  if (phase === 'intro') return <Intro />
  if (phase === 'countdown') return <Countdown />
  if (phase === 'paused') return <Paused />
  if (phase === 'gameover') return <GameOver />
  return null
}
