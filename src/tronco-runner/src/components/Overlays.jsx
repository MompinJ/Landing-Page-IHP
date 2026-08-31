import { useCallback, useEffect, useRef, useState } from 'react'
import { useGame } from '../store'
import { sfx } from '../audio'
import { useGamepadAction, useGamepadConnected, useGamepadGrid } from '../useGamepad'
import { LEGEND_GOOD, LEGEND_BAD, RANKS, LEADERBOARD_KEY, BUSINESS_UNITS, GAME_DURATION } from '../constants'
import {
  MAX_COMENTARIO,
  MAX_NOMBRE,
  guardaMarca,
  guardaResena,
  leeResenas,
  leeTabla,
  leeUnidades,
  limpiaNombre,
} from '../marcador'

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

// El tope del nombre lo define `marcador.js`, que es donde vive `limpiaNombre`
// y por tanto quien tiene que estar de acuerdo con la restriccion de la tabla.
// Aqui habia una copia con su propio numero, y es la clase de pareja que se
// desincroniza en cuanto uno de los dos cambia.

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

/* ============================== RESEÑAS ==============================

  Calificar la carrera al terminar. Existe porque en el stand la gente decia en
  voz alta que el juego le habia gustado y eso no quedaba en ninguna parte: al
  desmontar el congreso lo unico que habia para enseñar era una lista de
  puntuaciones, que dice cuanta gente jugo pero no que le parecio a nadie.

  SE PREGUNTA DESPUES DE FIRMAR, nunca antes. Quien acaba de correr esta
  mirando su puntuacion y su puesto en la tabla; interrumpir eso con un
  formulario es la mejor forma de que no conteste ni a lo uno ni a lo otro.
*/

// La estrella, dibujada. En glifo tipografico (★) ninguna fuente garantiza el
// trazo y la mitad de los sistemas la pintan como emoji a color, que es justo
// lo que rompe la paleta de la tarjeta.
function Star({ on }) {
  return (
    <svg className={on ? 'star star-on' : 'star'} viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M12 2.2 L14.9 8.7 L21.9 9.5 L16.7 14.2 L18.2 21.1 L12 17.5 L5.8 21.1 L7.3 14.2 L2.1 9.5 L9.1 8.7 Z"
        fill="currentColor"
      />
    </svg>
  )
}

// Estrellas para LEER: se pintan siempre las cinco y se encienden las que
// valgan. Pintar solo las llenas obliga a contarlas para saber si son tres de
// cinco o tres de tres.
function Estrellas({ n }) {
  return (
    <span className="stars" role="img" aria-label={`${n} de 5 estrellas`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} on={i <= n} />
      ))}
    </span>
  )
}

// Estrellas para PULSAR. Son botones normales: valen para el dedo, el raton y
// la rejilla del mando por igual, como el selector de unidad.
function EstrellasPicker({ value, onPick, row }) {
  return (
    <div className="stars-pick">
      {[1, 2, 3, 4, 5].map((i) => (
        <button
          key={i}
          type="button"
          className={i <= value ? 'star-btn star-btn-on' : 'star-btn'}
          data-gp-row={row}
          aria-label={i === 1 ? '1 estrella' : `${i} estrellas`}
          onClick={() => onPick(i)}
        >
          <Star on={i <= value} />
        </button>
      ))}
    </div>
  )
}

/*
  EL MODAL. Se abre sobre la tarjeta final y tiene SU PROPIA rejilla de mando:
  mientras esta abierto, la de la tarjeta de abajo se apaga (ver `GameOver`).
  Con las dos vivas, la cruceta movia dos cursores a la vez y confirmar pulsaba
  el boton de detras.

  EL COMENTARIO NO ENTRA EN LA REJILLA A PROPOSITO. Escribir 140 caracteres
  letra a letra con la cruceta no lo hace nadie, asi que el campo se deja para
  el dedo (el kiosco es tactil y saca el teclado del sistema) y para el teclado
  fisico. Con mando se califica con las estrellas y se envia, que es lo que de
  verdad se va a usar y no cuesta ni cinco segundos.
*/
function ModalResena({ onEnvia, onCierra }) {
  const [estrellas, setEstrellas] = useState(0)
  const [comentario, setComentario] = useState('')
  const ref = useRef(null)
  useGamepadGrid(ref)

  // B cierra, como en cualquier menu del juego. Que salirse sea lo facil
  // importa: nadie tiene que sentir que el juego le retiene por no opinar.
  useGamepadAction((action) => {
    if (action === 'back') onCierra()
  })

  return (
    <div className="overlay overlay-modal" onClick={onCierra}>
      {/* el clic de dentro no cierra: solo el del fondo */}
      <div className="panel panel-modal" ref={ref} onClick={(e) => e.stopPropagation()}>
        <p className="kicker">Antes de irte</p>
        <h2 className="modal-title">¿QUE TE PARECIO?</h2>
        <p className="modal-sub">Toca las estrellas. El comentario es opcional.</p>

        <EstrellasPicker value={estrellas} onPick={setEstrellas} row={0} />

        <textarea
          className="resena-texto"
          value={comentario}
          maxLength={MAX_COMENTARIO}
          rows={3}
          placeholder="Cuentanos en una linea (opcional)"
          onChange={(e) => setComentario(e.target.value)}
        />
        <p className="resena-cuenta">
          {comentario.length}/{MAX_COMENTARIO}
        </p>

        <div className="btn-row">
          {/* Sin estrellas no hay reseña que mandar, y el boton lo dice en vez
              de aceptar el clic y no hacer nada. Deshabilitado ademas sale de
              la rejilla del mando, asi que el cursor no se posa en el. */}
          <button
            className="btn-primary"
            data-gp-row={1}
            disabled={!estrellas}
            onClick={() => onEnvia({ estrellas, comentario })}
          >
            ENVIAR
          </button>
          <button className="btn-ghost" data-gp-row={1} onClick={onCierra}>
            AHORA NO
          </button>
        </div>
      </div>
    </div>
  )
}

// La tabla de reseñas de la pantalla final: la media arriba y las ultimas
// debajo. Va DESPUES de la tabla de puntos porque es lo segundo que interesa —
// primero donde quede uno, luego que opina el resto.
function TablaResenas({ lista }) {
  if (!lista.length) return null

  const media = lista.reduce((t, r) => t + r.estrellas, 0) / lista.length

  return (
    <div className="board resenas">
      <h3>
        RESEÑAS DEL CONGRESO
        <span className="board-count">
          {media.toFixed(1)} de 5 &middot; {lista.length === 1 ? '1 reseña' : `${lista.length} reseñas`}
        </span>
      </h3>
      <ul className="resenas-list">
        {lista.map((r) => (
          <li key={r.id} className="resena">
            <div className="resena-cab">
              <Estrellas n={r.estrellas} />
              {r.nombre && <span className="resena-quien">{r.nombre}</span>}
              {r.unidad && <span className="punit">{r.unidad}</span>}
            </div>
            {r.comentario && <p className="resena-dice">{r.comentario}</p>}
          </li>
        ))}
      </ul>
    </div>
  )
}

// Trae las reseñas y devuelve tambien la forma de volver a pedirlas: al enviar
// la propia hay que releer para que aparezca arriba de la lista.
function useResenas() {
  const [lista, setLista] = useState([])

  const recarga = useCallback(() => {
    let vivo = true
    leeResenas().then((filas) => {
      // null es "no lo se", no "no hay ninguna": se conserva lo que hubiera.
      if (vivo && filas) setLista(filas)
    })
    return () => {
      vivo = false
    }
  }, [])

  useEffect(() => recarga(), [recarga])

  return [lista, recarga]
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

  // La reseña. `resenaHecha` no distingue si llego al servidor a proposito: al
  // que acaba de opinar se le da las gracias y punto. Su reseña no es una marca
  // en una tabla que vaya a buscar despues, asi que un aviso de "no se pudo
  // guardar tu opinion" solo serviria para dejarle mal sabor de una cosa que
  // hizo por gusto.
  const [resenaAbierta, setResenaAbierta] = useState(false)
  const [resenaHecha, setResenaHecha] = useState(false)
  const [resenas, recargaResenas] = useResenas()

  const ref = useRef(null)
  // Con el modal abierto se apaga la rejilla de la tarjeta: el modal trae la
  // suya, y dos rejillas vivas mueven dos cursores con la misma cruceta.
  useGamepadGrid(ref, !resenaAbierta)

  const rank = RANKS.find((r) => score >= r.min)

  // SE GUARDA LOCAL SIEMPRE Y REMOTO SI SE PUEDE, en ese orden, y la pantalla
  // pasa a la tabla EN EL ACTO. En un stand con cola, hacer esperar a alguien
  // delante de un boton mientras se resuelve una peticion es lo que hace que el
  // siguiente no juegue: la subida sigue por detras y el aviso de si entro o no
  // llega cuando llega, ya sobre la tabla.
  // EL BOTON Y EL GUARDADO TIENEN QUE OPINAR LO MISMO. Aqui no lo hacian: el
  // boton se activaba con `name.trim()` y el guardado exigia `limpiaNombre(name)`,
  // que es mas estricto -- quita todo lo que la tabla no acepta. Un nombre que
  // pasara el primer filtro y no el segundo dejaba el boton pulsable y el
  // guardado se salia por el `return` sin decir nada: se pulsaba GUARDAR y no
  // pasaba absolutamente nada, ni marca ni aviso.
  const nombreLimpio = limpiaNombre(name)
  const puedeGuardar = Boolean(nombreLimpio && unit)

  const save = () => {
    const clean = nombreLimpio
    if (!puedeGuardar) return
    const entry = { id: Date.now(), name: clean, unit, score }

    // La copia LOCAL se escribe siempre, y sin recorte: es la red para cuando
    // el wifi del stand falle, y guarda a todo el que se registra.
    const local = [...loadBoard(), entry].sort((a, b) => b.score - a.score)
    localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(local))

    // PERO LO QUE SE ENSEÑA NO ES LA LOCAL. Aqui habia un `setBoard(local)` y
    // hacia justo lo contrario de lo que promete la pantalla: al pulsar GUARDAR
    // la tabla del congreso -que llevaba ahi desde que se abrio la pantalla-
    // desaparecia de golpe y en su sitio salian los corredores viejos de ESTE
    // equipo. El que acababa de firmar veia esfumarse a todos sus companeros y
    // daba por hecho que no se habia guardado nada.
    //
    // Lo correcto es meter la marca nueva en la tabla que YA ESTA en pantalla y
    // dejar que la relectura de abajo la sustituya por la del servidor cuando
    // llegue. Si la subida falla, se sigue viendo el congreso con la marca
    // propia dentro, que es lo mas parecido a la verdad que se puede enseñar.
    setBoard((previa) => [...previa, entry].sort((a, b) => b.score - a.score))
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

  // Se manda lo que se firmo, sin volver a preguntarlo: pedir otra vez nombre
  // y unidad dentro del modal es la forma mas rapida de que nadie lo rellene.
  const enviaResena = ({ estrellas, comentario }) => {
    setResenaAbierta(false)
    setResenaHecha(true)
    guardaResena({ estrellas, comentario, nombre: nombreLimpio, unidad: unit }).then((ok) => {
      // Solo se relee si entro: si no, la lista se quedaria igual y la
      // relectura seria un viaje para nada.
      if (ok) recargaResenas()
    })
  }

  const typing = savedId === null
  const keysShown = typing && pad
  // Las filas de la rejilla van en el mismo orden que la tarjeta: teclado en
  // pantalla (solo con mando), unidades de negocio, GUARDAR y los botones del
  // final. Con una sola cuenta se mantienen alineados los tres casos.
  const unitRow = keysShown ? KEY_ROWS.length + 1 : 0
  const saveRow = unitRow + Math.ceil(unidades.length / 4)
  // YA GUARDADO, EL CURSOR CAE EN CALIFICAR Y NO EN JUGAR OTRA VEZ. La rejilla
  // se recoloca en la fila 0 cuando encoge (ver `useGamepadGrid`), asi que la
  // fila 0 es la que se lleva el cursor al firmar, y es exactamente donde se
  // quiere que este: pulsar A abre el modal, no arranca otra partida. En cuanto
  // la reseña esta hecha, el boton desaparece, la rejilla vuelve a encoger y el
  // cursor cae solo sobre JUGAR OTRA VEZ, que pasa a ser la unica fila.
  const btnRow = typing ? saveRow + 1 : 1

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
                maxLength={MAX_NOMBRE}
                placeholder="TU NOMBRE"
                onChange={(e) => setName(e.target.value.toUpperCase())}
                onKeyDown={(e) => e.key === 'Enter' && save()}
              />
            </div>
            {keysShown && (
              <NameKeys
                value={name}
                rowOffset={0}
                onType={(ch) => setName((v) => (v + ch).slice(0, MAX_NOMBRE))}
                onBack={() => setName((v) => v.slice(0, -1))}
              />
            )}
            {name.trim() && !nombreLimpio && (
              <p className="reg-label">Usa letras y numeros: A-Z, 0-9, espacio o guion</p>
            )}
            <UnitPicker value={unit} onPick={setUnit} rowOffset={unitRow} unidades={unidades} />
            {/* un unico GUARDAR para los dos casos: va debajo de las unidades
                porque el registro no esta completo hasta elegir terminal */}
            <button
              className="btn-secondary btn-save"
              data-gp-row={saveRow}
              onClick={save}
              disabled={!puedeGuardar}
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
                en una linea y sin alarma.
                Y NO SE LE ECHA LA CULPA A LA RED: decia "sin conexion" y la
                primera vez que fallo de verdad habia conexion de sobra -- era la
                tabla rechazando la fila porque la puntuacion era negativa. Un
                aviso que nombra una causa equivocada manda a quien lo lea a
                mirar donde no es. */}
            {subida === false && (
              <p className="board-empty">
                No se pudo guardar en el marcador del congreso: tu marca quedo guardada en este equipo.
              </p>
            )}

            {/* LA LLAMADA A OPINAR, entre la tabla propia y la de reseñas: se
                pregunta cuando ya se ha visto el puesto, que es cuando la
                carrera esta de verdad terminada. Una vez enviada se cambia por
                el agradecimiento — dejar el boton puesto invita a mandar la
                misma opinion tres veces. */}
            {resenaHecha ? (
              <p className="resena-gracias">Gracias. Tu reseña queda con las demas.</p>
            ) : (
              <div className="resena-cta">
                <p className="reg-label">¿QUE TE PARECIO EL JUEGO?</p>
                <button className="btn-secondary" data-gp-row={0} onClick={() => setResenaAbierta(true)}>
                  CALIFICAR
                </button>
              </div>
            )}

            <TablaResenas lista={resenas} />
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

      {/* Fuera del panel: es una capa por encima de la tarjeta, no un trozo de
          ella, y asi el scroll de la tarjeta no se lo lleva por delante. */}
      {resenaAbierta && <ModalResena onEnvia={enviaResena} onCierra={() => setResenaAbierta(false)} />}
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
