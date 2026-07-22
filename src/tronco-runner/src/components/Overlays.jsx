import { useEffect, useState } from 'react'
import { useGame } from '../store'
import { sfx } from '../audio'
import { GOOD_ITEMS, BAD_ITEMS, RANKS, LEADERBOARD_KEY } from '../constants'

function Rules() {
  return (
    <ul className="rules">
      <li>
        <span className="key-hint">Desliza / Flechas</span> para cambiar de carril.
      </li>
      <li>
        <span className="key-hint">Desliza arriba / Espacio</span> para saltar.
      </li>
      <li>
        Recoge los hexagonos <b className="txt-good">verdes</b>: valores del Tronco Comun <b>(+10)</b>.
      </li>
      <li>
        Esquiva los <b className="txt-bad">rojos</b>: riesgos que danan nuestra cultura <b>(-10)</b>.
      </li>
      <li>
        Tienes <b>60 segundos</b>. Boton <span className="key-hint">?</span> o tecla <span className="key-hint">H</span> para pausa y ayuda.
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

function Intro() {
  const startCountdown = useGame((s) => s.startCountdown)
  return (
    <div className="overlay">
      <div className="panel">
        <p className="kicker">Hutchison Ports | Congreso de Calidad</p>
        <h1 className="title">
          TRONCO COMÚN <span className="title-accent">RUNNER</span>
        </h1>
        <p className="subtitle">Corre hacia lo correcto. Evita los riesgos.</p>
        <p className="mission">
          Recorre la terminal: patio de contenedores, buque, vias de ferrocarril y crucero, recolectando los valores
          del Tronco Comun y esquivando los riesgos.
        </p>
        <Rules />
        <Legend />
        <button
          className="btn-primary"
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
  return (
    <div className="overlay">
      <div className="panel">
        <h2 className="title title-sm">PAUSA</h2>
        <Rules />
        <button className="btn-primary" onClick={resume}>
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

function GameOver() {
  const score = useGame((s) => s.score)
  const goods = useGame((s) => s.goods)
  const bads = useGame((s) => s.bads)
  const distShown = useGame((s) => s.distShown)
  const startCountdown = useGame((s) => s.startCountdown)
  const goIntro = useGame((s) => s.goIntro)

  const [name, setName] = useState('')
  const [savedId, setSavedId] = useState(null)
  const [board, setBoard] = useState(loadBoard)

  const rank = RANKS.find((r) => score >= r.min)

  const save = () => {
    const clean = name.trim().toUpperCase().slice(0, 12)
    if (!clean) return
    const entry = { id: Date.now(), name: clean, score }
    const next = [...loadBoard(), entry].sort((a, b) => b.score - a.score).slice(0, 10)
    localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(next))
    setBoard(next)
    setSavedId(entry.id)
  }

  return (
    <div className="overlay">
      <div className="panel">
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
            Distancia: <b>{distShown} m</b>
          </span>
        </div>

        {savedId === null ? (
          <div className="save-row">
            <input
              value={name}
              maxLength={12}
              placeholder="TU NOMBRE"
              onChange={(e) => setName(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === 'Enter' && save()}
            />
            <button className="btn-secondary" onClick={save} disabled={!name.trim()}>
              GUARDAR
            </button>
          </div>
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
          <button className="btn-primary" onClick={startCountdown}>
            JUGAR OTRA VEZ
          </button>
          <button className="btn-ghost" onClick={goIntro}>
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
