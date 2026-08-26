import { useEffect, useRef, useState } from 'react'
import { useGame } from '../store'
import { sfx } from '../audio'
import { useGamepadAction, useGamepadConnected, useGamepadGrid } from '../useGamepad'
import { LEGEND_GOOD, LEGEND_BAD, RANKS, LEADERBOARD_KEY, BUSINESS_UNITS, GAME_DURATION } from '../constants'
import { guardaMarca, leeTabla, leeUnidades, limpiaNombre } from '../marcador'

// Flechas dibujadas, no texto: son las mismas que van rotuladas encima de los
// obstaculos en pista, asi que la instruccion y el juego dicen lo mismo con la
// misma forma. En glifo tipografico ninguna fuente garantiza el trazo.
// La rotacion va DENTRO del svg, no en el transform del elemento: las
// animaciones de las tarjetas animan transform, y una animacion CSS pisa el
// estilo en linea, asi que la flecha de rodar se enderezaba a media animacion
// y apuntaba arriba, que es justo la senal contraria.
function Arrow({ dir, className }) {
  const rot = { up: 0, down: 180, left: -90, right: 90 }[dir] ?? 0
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 3 L21 14 H15.5 V21 H8.5 V14 H3 Z" fill="currentColor" transform={`rotate(${rot} 12 12)`} />
    </svg>
  )
}

function LaneGlyph({ className }) {
  return (
    <svg className={className} viewBox="0 0 34 24" aria-hidden="true">
      <path d="M9 3 L1 12 L9 21 V15 H14 V9 H9 Z" fill="currentColor" />
      <path d="M25 3 L33 12 L25 21 V15 H20 V9 H25 Z" fill="currentColor" />
    </svg>
  )
}

// Botones del mando dibujados con el color real de la cara del Xbox — los
// mismos que usa Corte Limpio, para que las dos dinamicas del stand digan A y B
// con el mismo verde y el mismo rojo. En el congreso se juega con mando casi
// siempre, asi que el mando manda en las instrucciones y el teclado va de pie.
const FACE = {
  A: { bg: '#6ac72f', fg: '#0b1118' },
  B: { bg: '#e5342b', fg: '#ffffff' },
  X: { bg: '#2a7de1', fg: '#ffffff' },
  Y: { bg: '#f0b91d', fg: '#0b1118' },
}

function PadFace({ k, sm }) {
  const c = FACE[k]
  return (
    <span className={sm ? 'pad-face pad-face-sm' : 'pad-face'} style={{ background: c.bg, color: c.fg }}>
      {k}
    </span>
  )
}

// Cruceta con los brazos que valen encendidos. Se dibuja entera a proposito:
// medio jugador busca la cruz en el mando, no la palabra "cruceta".
function DPad({ dirs }) {
  const on = (d) => (dirs.includes(d) ? 'dpad-arm dpad-on' : 'dpad-arm')
  return (
    <span className="dpad" aria-hidden="true">
      <span className={on('up')} data-d="up" />
      <span className={on('down')} data-d="down" />
      <span className={on('left')} data-d="left" />
      <span className={on('right')} data-d="right" />
      <span className="dpad-hub" />
    </span>
  )
}

function Bumper({ k }) {
  return <span className="bumper">{k}</span>
}

// Fichas del juego dibujadas tal cual se ven en pista: hexagono a color pleno
// con paloma o tache en navy. Enseñar la pieza vale mas que describirla, que es
// lo que hacia antes ("hexagono verde: ...").
function Chip({ good }) {
  return (
    <svg className={good ? 'chip-ico chip-good' : 'chip-ico chip-bad'} viewBox="0 0 40 44" aria-hidden="true">
      <path d="M20 1 L38 11 V33 L20 43 L2 33 V11 Z" fill="currentColor" />
      {good ? (
        <path d="M12 22 L18 28 L28 15" fill="none" stroke="#04122b" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />
      ) : (
        <path d="M13 15 L27 29 M27 15 L13 29" fill="none" stroke="#04122b" strokeWidth="4.5" strokeLinecap="round" />
      )}
    </svg>
  )
}

// Cabecera del briefing: tres carriles corriendo hacia el jugador. Es puro
// adorno en CSS, pero pone al que lee delante de la pista antes de leer nada.
function TrackStrip() {
  return (
    <div className="track" aria-hidden="true">
      <span className="track-line" />
      <span className="track-line" />
      <span className="track-chip track-chip-good" />
      <span className="track-chip track-chip-bad" />
    </div>
  )
}

// Instrucciones. Se leen de un vistazo y se parecen al juego: la ficha que se
// recoge esta dibujada, los iconos se mueven como el movimiento que piden y
// cada renglon es una orden corta, no una explicacion. Antes era una lista de
// ocho parrafos que nadie se paraba a leer delante del stand.
function HowTo() {
  return (
    <div className="howto">
      <TrackStrip />

      <div className="how-sec">
        <p className="how-title">Lo unico que hay que saber</p>
        <div className="how-cards">
          <div className="how-card">
            <span className="how-step">1</span>
            <LaneGlyph className="how-glyph anim-lane" />
            <b>ESQUIVA</b>
            <span className="pad-row">
              <DPad dirs={['left', 'right']} />
              <Bumper k="LB" />
              <Bumper k="RB" />
            </span>
            <span className="alt-keys">o flechas / desliza</span>
          </div>
          <div className="how-card">
            <span className="how-step">2</span>
            <Arrow dir="up" className="how-glyph glyph-jump anim-jump" />
            <b>SALTA</b>
            <span className="pad-row">
              <PadFace k="A" />
              <DPad dirs={['up']} />
            </span>
            <span className="alt-keys">o espacio</span>
          </div>
          <div className="how-card">
            <span className="how-step">3</span>
            <Arrow dir="down" className="how-glyph glyph-roll anim-roll" />
            <b>RUEDA</b>
            <span className="pad-row">
              <PadFace k="B" />
              <DPad dirs={['down']} />
            </span>
            <span className="alt-keys">o flecha abajo</span>
          </div>
        </div>
      </div>

      <div className="how-sec">
        <p className="how-title">Que recoger</p>
        <div className="loot">
          <div className="loot-card loot-good">
            <Chip good />
            <b>RECOGELO</b>
            <span className="loot-val">+10</span>
            <span className="loot-tags">
              {LEGEND_GOOD.map((l) => (
                <span key={l} className="tag tag-good">
                  {l}
                </span>
              ))}
            </span>
          </div>
          <div className="loot-card loot-bad">
            <Chip good={false} />
            <b>NI LO TOQUES</b>
            <span className="loot-val">-10</span>
            <span className="loot-tags">
              {LEGEND_BAD.map((l) => (
                <span key={l} className="tag tag-bad">
                  {l}
                </span>
              ))}
            </span>
          </div>
        </div>
      </div>

      <div className="how-sec">
        <p className="how-title">Lo que te sale al paso</p>
        <ul className="cues">
          <li>
            <PadFace k="A" sm />
            <span>
              Boton <b className="txt-cue-jump">A verde</b>: salta o te lo llevas puesto
            </span>
            <b className="cue-cost">-15</b>
          </li>
          <li>
            <PadFace k="B" sm />
            <span>
              Boton <b className="txt-cue-roll">B rojo</b>: agachate y rueda
            </span>
            <b className="cue-cost">-15</b>
          </li>
          <li>
            <span className="cue-ico cue-block" />
            <span>Sin boton: cierra el carril, cambiate</span>
            <b className="cue-cost">-15</b>
          </li>
          <li>
            <span className="cue-ico cue-water" />
            <span>
              En <b>Cruceros</b> se acaba el suelo: salta de lancha en lancha
            </span>
            <b className="cue-cost">-15</b>
          </li>
          <li>
            <span className="cue-ico cue-bonus" />
            <span>
              En el <b>Astillero</b> sube al andamio y aguanta arriba
            </span>
            <b className="cue-cost cost-good">BONO</b>
          </li>
        </ul>
        <p className="how-foot">El boton flotando sobre la pieza es el que hay que apretar, igual en las cinco terminales.</p>
      </div>

      <p className="how-goal">
        <b>2 minutos.</b> <b>5 terminales.</b> Corre hacia lo correcto.{' '}
        <Bumper k="START" /> o <span className="key-hint">H</span> para pausa.
      </p>
    </div>
  )
}

// Aviso de mando en la portada. En el stand es lo que distingue "el mando no
// funciona" de "el mando aun no ha despertado": los navegadores no lo exponen
// hasta que se pulsa un boton en el.
function PadBadge({ pad }) {
  if (!pad) return null
  return (
    <p className="pad-badge">
      Mando conectado &mdash; pulsa <b>A</b> para jugar
    </p>
  )
}

// La tabla LOCAL es ahora la red de seguridad, no la fuente: la buena vive en
// Supabase (ver marcador.js). Esta se sigue escribiendo y leyendo para que el
// stand no dependa de que el wifi aguante ocho horas seguidas.
function loadBoard() {
  try {
    return JSON.parse(localStorage.getItem(LEADERBOARD_KEY)) || []
  } catch {
    return []
  }
}

// Trae la tabla del congreso y se queda con ella si llega. Se usa en la portada
// y en el final; devuelve una funcion de limpieza porque el componente puede
// desmontarse mientras la peticion vuela.
function useTablaCongreso(setBoard) {
  useEffect(() => {
    let vivo = true
    leeTabla().then((filas) => {
      if (vivo && filas) setBoard(filas)
    })
    return () => {
      vivo = false
    }
  }, [setBoard])
}

// Tabla de records. Es la misma en la portada y en el final de partida, asi que
// el que acaba de jugar reconoce donde quedo sin volver a leer nada.
//
// Salen TODOS los corredores, no un top recortado: en el stand la gracia es
// buscarse en la lista y ver a los companeros, no solo a los diez mejores. La
// lista tiene su propio scroll para que la tarjeta no crezca sin fin.
function Board({ entries, meId }) {
  const meRef = useRef(null)

  // al guardar, la fila propia puede caer fuera de la ventana de la lista:
  // se trae sola en vez de obligar a buscarla
  useEffect(() => {
    if (meId) meRef.current?.scrollIntoView({ block: 'center' })
  }, [meId])

  if (!entries.length) {
    return (
      <div className="board">
        <h3>TABLA DEL CONGRESO</h3>
        <p className="board-empty">Todavia no hay marcas. La primera es tuya.</p>
      </div>
    )
  }

  const mePos = meId ? entries.findIndex((e) => e.id === meId) + 1 : 0

  return (
    <div className="board">
      <h3>
        TABLA DEL CONGRESO
        <span className="board-count">{entries.length} corredores</span>
      </h3>
      {mePos > 0 && (
        <p className="board-me">
          Vas en el puesto <b>{mePos}</b> de {entries.length}
        </p>
      )}
      <ol className="board-list">
        {entries.map((e, i) => (
          <li key={e.id} className={e.id === meId ? 'me' : ''} ref={e.id === meId ? meRef : null}>
            <span className={`pos pos-${i + 1 <= 3 ? i + 1 : 'n'}`}>{i + 1}</span>
            <span className="pname">{e.name}</span>
            <span className="punit">{e.unit}</span>
            <span className="pscore">{e.score}</span>
          </li>
        ))}
      </ol>
    </div>
  )
}

// Portada. Una sola pantalla: que hay que hacer, JUGAR y la tabla. No lleva
// botones a otras vistas a proposito — delante del stand la portada tiene que
// contestar "que es esto y quien va ganando" sin que nadie navegue.
//
// Las instrucciones no viven aqui: son el paso previo a la carrera (briefing),
// asi que se leen cuando de verdad hacen falta y no antes.
function Intro() {
  const startCountdown = useGame((s) => s.startCountdown)
  const pad = useGamepadConnected()
  const [view, setView] = useState('menu')
  // Arranca con lo local para que la portada no parpadee, y se sustituye por la
  // del congreso en cuanto llegue: el que se acerca al stand ve contra quien
  // compite antes de tocar el mando.
  const [board, setBoard] = useState(loadBoard)
  useTablaCongreso(setBoard)
  const ref = useRef(null)
  useGamepadGrid(ref)

  // el sonido se desbloquea en el primer toque real del usuario, o sea al
  // entrar al briefing, no al arrancar la carrera
  const brief = () => {
    sfx.unlock()
    setView('briefing')
  }

  // B vuelve al menu desde el briefing sin tener que apuntar al boton
  useGamepadAction((action) => {
    if (action === 'back' && view !== 'menu') setView('menu')
  })

  return (
    <div className="overlay">
      <div className="panel" ref={ref}>
        <p className="kicker">Hutchison Ports | Congreso de Calidad</p>
        <h1 className="title">
          TERMINAL <span className="title-accent">RALLY</span>
        </h1>
        <p className="subtitle">Corre hacia lo correcto. Evita los riesgos.</p>
        <PadBadge pad={pad} />

        {view === 'menu' ? (
          <>
            <p className="mission">
              Cruza las cinco terminales del grupo &mdash; Usos Multiples, Contenedores, Intermodal, Cruceros y
              Astillero &mdash; recogiendo los valores del Tronco Comun y esquivando los riesgos.
            </p>
            <div className="facts">
              <span className="fact">
                <b>2</b> minutos
              </span>
              <span className="fact">
                <b>5</b> terminales
              </span>
            </div>
            <button className="btn-primary btn-hero" data-gp-row="0" onClick={brief}>
              JUGAR
            </button>
            <Board entries={board} />
          </>
        ) : (
          <>
            <p className="brief-kicker">Antes de empezar</p>
            <HowTo />
            <div className="btn-row">
              <button className="btn-primary" data-gp-row="0" onClick={startCountdown}>
                A CORRER
              </button>
              <button className="btn-ghost" data-gp-row="0" onClick={() => setView('menu')}>
                VOLVER
              </button>
            </div>
          </>
        )}
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
        <HowTo />
        <button className="btn-primary" data-gp-row="0" onClick={resume}>
          CONTINUAR
        </button>
      </div>
    </div>
  )
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

// Las unidades en filas de cuatro. La rejilla del mando lee las filas del DOM,
// asi que el reparto de aqui es tambien el que recorre la cruceta -- y por eso
// se reparte sobre la lista que se este usando y no sobre un numero fijo: si la
// tabla trae una unidad mas, la cruceta la alcanza sin tocar nada.
function enFilasDeCuatro(lista) {
  const filas = []
  for (let i = 0; i < lista.length; i += 4) filas.push(lista.slice(i, i + 4))
  return filas
}

// LAS UNIDADES SALEN DE LA TABLA, no del codigo: es la misma lista contra la
// que la clave foranea valida al guardar, asi que traerla de ahi es lo unico
// que garantiza que lo que se puede elegir es lo que se puede guardar. Se
// arranca con la copia local para que el picker no parpadee vacio.
function useUnidades() {
  const [lista, setLista] = useState(BUSINESS_UNITS)
  useEffect(() => {
    let vivo = true
    leeUnidades().then((remota) => {
      if (vivo && remota && remota.length) setLista(remota)
    })
    return () => {
      vivo = false
    }
  }, [])
  return lista
}

function UnitPicker({ value, onPick, rowOffset, unidades }) {
  return (
    <div className="units">
      <p className="units-label">UNIDAD DE NEGOCIO</p>
      <div className="units-grid">
        {enFilasDeCuatro(unidades).map((row, r) => (
          <div className="units-row" key={r}>
            {row.map((u) => (
              <button
                key={u}
                className={u === value ? 'unit unit-on' : 'unit'}
                data-gp-row={rowOffset + r}
                onClick={() => onPick(u)}
              >
                {u}
              </button>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

function NameKeys({ value, onType, onBack, rowOffset }) {
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
  const timeShown = useGame((s) => s.timeShown)
  const goIntro = useGame((s) => s.goIntro)
  const pad = useGamepadConnected()

  const [name, setName] = useState('')
  const [unit, setUnit] = useState('')
  const [savedId, setSavedId] = useState(null)
  const [board, setBoard] = useState(loadBoard)
  // null mientras no se ha intentado; luego, si la marca llego al congreso o se
  // quedo en la tabla de este equipo.
  const [subida, setSubida] = useState(null)
  useTablaCongreso(setBoard)
  const unidades = useUnidades()

  const ref = useRef(null)
  useGamepadGrid(ref)

  const rank = RANKS.find((r) => score >= r.min)

  // SE GUARDA LOCAL SIEMPRE Y REMOTO SI SE PUEDE, en ese orden, y la pantalla
  // pasa a la tabla EN EL ACTO. En un stand con cola, hacer esperar a alguien
  // delante de un boton mientras se resuelve una peticion es lo que hace que el
  // siguiente no juegue: la subida sigue por detras y el aviso de si entro o no
  // llega cuando llega, ya sobre la tabla.
  const save = () => {
    const clean = limpiaNombre(name)
    if (!clean || !unit) return
    const entry = { id: Date.now(), name: clean, unit, score }
    // sin recorte: la tabla guarda a todo el que se registra, no solo al top
    const next = [...loadBoard(), entry].sort((a, b) => b.score - a.score)
    localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(next))
    setBoard(next)
    setSavedId(entry.id)

    guardaMarca({
      nombre: clean,
      unidad: unit,
      puntos: score,
      distancia: distShown,
      // La carrera dura GAME_DURATION y el reloj baja: lo corrido es la resta.
      // No es telemetria, es media prueba de que la carrera ocurrio -- la tabla
      // cruza metros y tiempo para rechazar lo imposible.
      duracionMs: (GAME_DURATION - timeShown) * 1000,
    }).then(async (ok) => {
      setSubida(ok)
      if (!ok) return
      const filas = await leeTabla()
      if (!filas) return
      // Al releer, la fila propia es otra: la del servidor, con su id. Se busca
      // por nombre y puntos para que el desplazamiento a "donde quede" siga
      // apuntando al corredor y no a un id local que ya no existe en la lista.
      const mia = filas.find((f) => f.name === clean && f.score === score)
      setBoard(filas)
      if (mia) setSavedId(mia.id)
    })
  }

  const typing = savedId === null
  const keysShown = typing && pad
  // Las filas de la rejilla van en el mismo orden que la tarjeta: teclado en
  // pantalla (solo con mando), unidades de negocio, GUARDAR y los botones del
  // final. Con una sola cuenta se mantienen alineados los tres casos.
  const unitRow = keysShown ? KEY_ROWS.length + 1 : 0
  const saveRow = unitRow + Math.ceil(unidades.length / 4)
  const btnRow = typing ? saveRow + 1 : 0

  return (
    <div className="overlay">
      <div className="panel" ref={ref}>
        <p className="kicker">Fin del recorrido</p>
        <div className="score-big">
          {score}
          <span className="score-unit">PUNTOS</span>
        </div>
        <p className="rank-label">TU RANGO</p>
        <p className="rank">{rank.name}</p>
        <div className="stats">
          <span className="stat">
            <b className="txt-good">{goods}</b>
            <i>Valores</i>
          </span>
          <span className="stat">
            <b className="txt-bad">{bads}</b>
            <i>Riesgos</i>
          </span>
          <span className="stat">
            <b className="txt-bad">{crashes}</b>
            <i>Choques</i>
          </span>
          <span className="stat">
            <b>{distShown}</b>
            <i>Metros</i>
          </span>
        </div>

        {typing ? (
          <div className="register">
            <p className="reg-label">REGISTRA TU MARCA</p>
            <div className="save-row">
              <input
                value={name}
                maxLength={MAX_NAME}
                placeholder="TU NOMBRE"
                onChange={(e) => setName(e.target.value.toUpperCase())}
                onKeyDown={(e) => e.key === 'Enter' && save()}
              />
            </div>
            {keysShown && (
              <NameKeys
                value={name}
                rowOffset={0}
                onType={(ch) => setName((v) => (v + ch).slice(0, MAX_NAME))}
                onBack={() => setName((v) => v.slice(0, -1))}
              />
            )}
            <UnitPicker value={unit} onPick={setUnit} rowOffset={unitRow} unidades={unidades} />
            {/* un unico GUARDAR para los dos casos: va debajo de las unidades
                porque el registro no esta completo hasta elegir terminal */}
            <button
              className="btn-secondary btn-save"
              data-gp-row={saveRow}
              onClick={save}
              disabled={!name.trim() || !unit}
            >
              GUARDAR
            </button>
          </div>
        ) : (
          <>
            <Board entries={board} meId={savedId} />
            {/* Si la marca no salio del equipo hay que DECIRLO: el corredor se
                va creyendo que compite con todo el congreso y su nombre no esta
                en ninguna parte. No hay nada que pueda hacer, asi que se cuenta
                en una linea y sin alarma. */}
            {subida === false && (
              <p className="board-empty">
                Sin conexion con el marcador del congreso: tu marca quedo guardada en este equipo.
              </p>
            )}
          </>
        )}

        {/* Un solo boton y devuelve al inicio: en el stand el que acaba le pasa
            el mando al siguiente, que tiene que entrar por la portada y su
            briefing, no caer de golpe en una cuenta atras de un juego que no ha
            visto. Un INICIO aparte sobraba: hacia lo mismo. */}
        <div className="btn-row">
          <button className="btn-primary" data-gp-row={btnRow} onClick={goIntro}>
            JUGAR OTRA VEZ
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
