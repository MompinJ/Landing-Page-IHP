import { useEffect, useRef, useState } from 'react'
import { useGame } from '../store'
import { sfx } from '../audio'
import { useGamepadAction, useGamepadConnected, useGamepadGrid } from '../useGamepad'
import { LEGEND_GOOD, LEGEND_BAD, RANKS, STREAK_X2, STREAK_X3 } from '../constants'

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
        <p className="how-title">Lo único que hay que saber</p>
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
        <p className="how-title">Qué recoger</p>
        <div className="loot">
          <div className="loot-card loot-good">
            <Chip good />
            <b>RECÓGELO</b>
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
              Botón <b className="txt-cue-jump">A verde</b>: salta o te lo llevas puesto
            </span>
            <b className="cue-cost">FIN</b>
          </li>
          <li>
            <PadFace k="B" sm />
            <span>
              Botón <b className="txt-cue-roll">B rojo</b>: agáchate y rueda
            </span>
            <b className="cue-cost">FIN</b>
          </li>
          <li>
            <span className="cue-ico cue-block" />
            <span>Sin botón: cierra el carril, cámbiate</span>
            <b className="cue-cost">FIN</b>
          </li>
          <li>
            <span className="cue-ico cue-water" />
            <span>
              En <b>Cruceros</b> se acaba el suelo: salta de lancha en lancha
            </span>
            <b className="cue-cost">FIN</b>
          </li>
        </ul>
        <p className="how-foot">El botón flotando sobre la pieza es el que hay que apretar, igual en las cinco terminales.</p>
      </div>

      <div className="how-sec">
        <p className="how-title">La racha es el juego</p>
        <div className="loot">
          <div className="loot-card loot-good">
            <b>x2</b>
            <span className="loot-val">{STREAK_X2} seguidas</span>
            <span className="loot-tags">
              <span className="tag tag-good">CADA VALOR VALE EL DOBLE</span>
            </span>
          </div>
          <div className="loot-card loot-good">
            <b>x3</b>
            <span className="loot-val">{STREAK_X3} seguidas</span>
            <span className="loot-tags">
              <span className="tag tag-good">EL TRIPLE</span>
            </span>
          </div>
        </div>
        <p className="how-foot">
          Una ficha roja te rompe la racha. A x3 no cuesta 10 puntos: cuesta el x3.
        </p>
      </div>

      <div className="how-sec">
        <p className="how-title">Súbete a lo alto</p>
        <ul className="cues">
          <li>
            <span className="cue-ico cue-truck" />
            <span>
              <b>Camión de contenedor</b>: entra por su carril, la rampa te sube. Corre por arriba y salta de
              techo en techo
            </span>
            <b className="cue-cost cost-good">+VALORES</b>
          </li>
          <li>
            <span className="cue-ico cue-hook" />
            <span>
              <b>Gancho de grúa</b>: tócalo y te iza. Volando no te pega nada, muévete de carril para llevarte
              la fila entera
            </span>
            <b className="cue-cost cost-good">+VALORES</b>
          </li>
          <li>
            <span className="cue-ico cue-bonus" />
            <span>
              Aguanta arriba hasta el final del convoy &mdash; o del andamio del <b>Astillero</b>
            </span>
            <b className="cue-cost cost-good">BONO</b>
          </li>
          <li>
            <span className="cue-ico cue-shield" />
            <span>
              <b>Casco reforzado</b>: aguanta un choque y se rompe. Es la única segunda oportunidad que hay
            </span>
            <b className="cue-cost cost-good">1 GOLPE</b>
          </li>
          <li>
            <span className="cue-ico cue-record" />
            <span>
              La raya amarilla del suelo es <b>tu récord</b>. Pasarla es lo único que hay que batir
            </span>
            <b className="cue-cost cost-good">+100</b>
          </li>
        </ul>
      </div>

      <p className="how-goal how-goal-life">
        <b>UNA SOLA VIDA.</b> El primer golpe acaba la carrera &mdash; salvo que lleves casco. Sin reloj y sin
        meta: el puerto no se termina y cada vez sale distinto. <Bumper k="START" /> o{' '}
        <span className="key-hint">H</span> para pausa.
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


// Portada. Una sola pantalla: que hay que hacer y JUGAR. No lleva botones a
// otras vistas a proposito — delante del stand la portada tiene que contestar
// "que es esto" sin que nadie navegue, y aqui no hay tabla que consultar: este
// juego no guarda marcas de nadie (ver mas abajo, antes de GameOver).
//
// Las instrucciones no viven aqui: son el paso previo a la carrera (briefing),
// asi que se leen cuando de verdad hacen falta y no antes.
function Intro() {
  const startCountdown = useGame((s) => s.startCountdown)
  const pad = useGamepadConnected()
  const [view, setView] = useState('menu')
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
        <p className="title-sub">2.0</p>
        <p className="subtitle">Una vida. Sin meta. Corre hasta donde aguantes.</p>
        <PadBadge pad={pad} />

        {view === 'menu' ? (
          <>
            <p className="mission">
              Las cinco terminales del grupo &mdash; Usos Múltiples, Contenedores, Intermodal, Cruceros y
              Astillero &mdash; encadenadas al azar y sin final. Recoge los valores del Tronco Común, y trépate
              a los camiones o déjate izar por la grúa para llevarte los que van por arriba.
            </p>
            <div className="facts">
              <span className="fact">
                <b>1</b> vida
              </span>
              <span className="fact">
                <b>∞</b> metros
              </span>
            </div>
            <button className="btn-primary btn-hero" data-gp-row="0" onClick={brief}>
              JUGAR
            </button>
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

// AQUI NO SE PIDE NOMBRE, Y ES A PROPOSITO.
//
// Este juego no guarda marcas de nadie: el marcador del congreso es del Terminal
// Rally por tiempo, donde todos corren EXACTAMENTE el mismo trazado y por eso
// dos puntajes se pueden poner uno al lado del otro. Aqui el curso se sortea en
// cada partida, asi que una tabla compararia carreras que no se parecen.
//
// Pedir un nombre para algo que no se guarda es peor que no pedirlo: en el
// stand, quien lo escribe se queda esperando a verse en una lista que no
// existe. Lo unico que si persiste son los METROS de la mejor carrera de este
// equipo (RECORD_KEY en store.js), que es lo que pinta la raya amarilla de la
// pista y lo unico que hay que batir. Con eso se acabaron tambien el teclado en
// pantalla, el selector de unidad y la revancha.

function GameOver() {
  const score = useGame((s) => s.score)
  const goods = useGame((s) => s.goods)
  const bads = useGame((s) => s.bads)
  const bonuses = useGame((s) => s.bonuses)
  const mejorRacha = useGame((s) => s.mejorRacha)
  const recordHecho = useGame((s) => s.recordHecho)
  const distShown = useGame((s) => s.distShown)
  const causa = useGame((s) => s.causa)
  const goIntro = useGame((s) => s.goIntro)

  const ref = useRef(null)
  useGamepadGrid(ref)

  const rank = RANKS.find((r) => score >= r.min)

  return (
    <div className="overlay">
      <div className="panel" ref={ref}>
        <p className="kicker">Hasta aquí llegaste</p>
        {/* CONTRA QUE FUE. Con una sola vida, lo primero que pregunta quien
            acaba de perder es que le pego, y en un runner a 29 m/s eso pasa en
            un fotograma. Decirlo en la pantalla final es la diferencia entre
            "el juego me mato" y "me comi el contenedor". */}
        {causa && (
          <p className="causa">
            Te frenó <b>{causa}</b>
          </p>
        )}
        <div className="score-big">
          {score}
          <span className="score-unit">PUNTOS</span>
        </div>
        <p className="rank-label">TU RANGO</p>
        <p className="rank">{rank.name}</p>
        {bonuses > 0 && <p className="how-foot">{bonuses} bono(s) por aguantar arriba y por récord</p>}
        {/* RECORD BATIDO, ARRIBA DEL TODO. En un juego sin final es lo unico
            que hay que celebrar, y quien lo consigue quiere verlo antes que el
            puntaje. Los metros SI se guardan solos en el equipo (RECORD_KEY),
            que es lo unico que este juego guarda y por tanto lo unico que se
            puede prometer en la pantalla final. */}
        {recordHecho && <p className="record-final">NUEVO RÉCORD DE ESTE EQUIPO</p>}
        <div className="stats">
          <span className="stat">
            <b>{distShown}</b>
            <i>Metros</i>
          </span>
          <span className="stat">
            <b className="txt-good">{goods}</b>
            <i>Valores</i>
          </span>
          <span className="stat">
            <b className="txt-amber">{mejorRacha}</b>
            <i>Mejor racha</i>
          </span>
          <span className="stat">
            <b className="txt-bad">{bads}</b>
            <i>Riesgos</i>
          </span>
        </div>

        {/* Un solo boton y devuelve al inicio: en el stand el que acaba le pasa
            el mando al siguiente, que tiene que entrar por la portada y su
            briefing, no caer de golpe en una cuenta atras de un juego que no ha
            visto. */}
        <div className="btn-row">
          <button className="btn-primary" data-gp-row="0" onClick={goIntro}>
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
