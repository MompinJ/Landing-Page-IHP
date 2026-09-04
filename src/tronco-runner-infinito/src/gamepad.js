// Lectura de mando (Xbox y compatibles) portable entre navegadores.
//
// La Gamepad API no emite eventos de boton: hay que sondear. Aqui vive el unico
// rAF que sondea, y lo que publica son acciones semanticas (left, right, up,
// down, confirm, back, pause). Ni el juego ni los menus saben de indices de
// boton ni de ejes.
//
// Las reglas que hacen que el mismo codigo valga en Chrome, Edge, Firefox y
// Safari sobre Windows, macOS y Linux:
//
//   1. navigator.getGamepads() se vuelve a pedir CADA frame y no se guarda
//      nunca el objeto Gamepad entre frames: en Chrome es una instantanea
//      inmutable, asi que cachearlo deja los botones congelados. Es el fallo de
//      portabilidad clasico (funciona en Firefox, no en Chrome).
//   2. La cruceta se lee de las dos formas posibles a la vez: botones 12-15
//      (mapeo estandar) y eje sombrero 9 (Firefox sobre Linux la expone asi).
//      Se combinan con OR, asi que no hay que detectar navegador.
//   3. Un boton puede llegar como objeto GamepadButton o como numero suelto
//      segun la implementacion; pressed() acepta las dos formas.
//   4. Si el mando no reporta mapping 'standard' se sigue intentando con los
//      mismos indices, pero queda anotado para el panel de diagnostico, que es
//      lo unico capaz de distinguir "no hay mando" de "hay mando con otro
//      mapeo" sin tener la maquina delante.

// ?gamepad=debug saca el panel de diagnostico. Existe para poder validar el
// mando en una maquina ajena (Windows en el stand) sin tenerla a mano: el que
// esta enfrente abre la URL, pulsa botones y manda una captura.
export const GAMEPAD_DEBUG = new URLSearchParams(window.location.search).get('gamepad') === 'debug'

// Umbrales del stick con histeresis: para activar hay que pasar DEAD, para
// soltar hay que bajar de LIVE. Sin la banda intermedia un stick con drift en
// el borde dispara y suelta varias veces por segundo.
const DEAD = 0.55
const LIVE = 0.32

// Repeticion al mantener, solo para las direcciones y solo en menus: el
// gameplay ignora las repeticiones (un carril por pulsacion).
const REPEAT_DELAY = 0.42
const REPEAT_RATE = 0.11

// Indices del mapeo 'standard' del W3C, que es lo que reportan los mandos de
// Xbox en Chrome, Edge, Firefox y Safari.
const BTN = {
  A: 0,
  B: 1,
  X: 2,
  Y: 3,
  LB: 4,
  RB: 5,
  LT: 6,
  RT: 7,
  VIEW: 8,
  START: 9,
  DUP: 12,
  DDOWN: 13,
  DLEFT: 14,
  DRIGHT: 15,
}

const ACTIONS = ['left', 'right', 'up', 'down', 'confirm', 'back', 'pause']
const REPEATABLE = new Set(['left', 'right', 'up', 'down'])

// Instantanea observable del estado del mando. La leen el panel de diagnostico
// y el aviso de "mando conectado"; se muta en sitio y se avisa por suscripcion
// solo cuando cambia algo que importa, para no re-renderizar React a 60 fps.
export const gamepadState = {
  supported: typeof navigator !== 'undefined' && typeof navigator.getGamepads === 'function',
  // La Gamepad API exige contexto seguro. localhost y https cuentan; una IP de
  // LAN por http plano NO, y ahi los mandos no aparecen y no salta ningun
  // error. Es el modo de fallo mas confuso que tiene esto, asi que se detecta y
  // se dice con todas sus letras en el panel.
  secure: typeof window === 'undefined' || window.isSecureContext !== false,
  connected: false,
  id: '',
  index: -1,
  mapping: '',
  // Por privacidad los navegadores no exponen el mando hasta que se pulsa un
  // boton en el. Hasta entonces esto es true y la interfaz lo explica en vez de
  // parecer rota.
  awaiting: true,
  buttons: [],
  axes: [],
}

const actionListeners = new Set()
const statusListeners = new Set()

// Suscripcion a acciones. El callback recibe (accion, repeat): repeat es true
// cuando viene de mantener pulsado, y el gameplay la descarta.
export function onGamepadAction(fn) {
  actionListeners.add(fn)
  return () => actionListeners.delete(fn)
}

// Suscripcion a cambios de conexion/mapeo. Solo dispara cuando cambia de
// verdad, nunca por frame.
export function onGamepadStatus(fn) {
  statusListeners.add(fn)
  return () => statusListeners.delete(fn)
}

function emitAction(action, repeat) {
  // copia: un listener puede desuscribirse dentro del propio callback
  for (const fn of [...actionListeners]) fn(action, repeat)
}

function emitStatus() {
  for (const fn of [...statusListeners]) fn(gamepadState)
}

// Los botones llegan como GamepadButton en todo navegador moderno, pero
// implementaciones viejas dan numeros sueltos. Los gatillos son analogicos, de
// ahi el umbral sobre value.
function pressed(b) {
  if (b == null) return false
  if (typeof b === 'object') return b.pressed === true || b.value > 0.5
  return b > 0.5
}

// Firefox sobre Linux expone la cruceta como un unico eje "sombrero" con ocho
// direcciones repartidas en [-1, 1] y un valor fuera de rango en reposo.
// -1 arriba, y de ahi en sentido horario en pasos de 2/7.
const HAT = [
  ['up'],
  ['up', 'right'],
  ['right'],
  ['down', 'right'],
  ['down'],
  ['down', 'left'],
  ['left'],
  ['up', 'left'],
]

function hatDirs(v) {
  if (v == null || v > 1.05 || v < -1.05) return null
  const i = Math.round((v + 1) / (2 / 7))
  return HAT[i] || null
}

// Estado retenido del stick: -1 / 0 / 1 por eje. Es lo que implementa la
// histeresis; en la banda intermedia se conserva el valor anterior.
const stick = { x: 0, y: 0 }

function latch(v, cur) {
  if (v >= DEAD) return 1
  if (v <= -DEAD) return -1
  if (Math.abs(v) < LIVE) return 0
  return cur
}

function readActions(gp) {
  const b = gp.buttons || []
  const ax = gp.axes || []
  const a = { left: false, right: false, up: false, down: false, confirm: false, back: false, pause: false }

  // cruceta como botones (mapeo estandar)
  if (pressed(b[BTN.DUP])) a.up = true
  if (pressed(b[BTN.DDOWN])) a.down = true
  if (pressed(b[BTN.DLEFT])) a.left = true
  if (pressed(b[BTN.DRIGHT])) a.right = true

  // cruceta como eje sombrero; se suma a lo anterior en vez de sustituirlo
  const hat = hatDirs(ax[9])
  if (hat) for (const d of hat) a[d] = true

  // stick izquierdo con zona muerta e histeresis
  stick.x = latch(ax[0] ?? 0, stick.x)
  stick.y = latch(ax[1] ?? 0, stick.y)
  if (stick.x < 0) a.left = true
  if (stick.x > 0) a.right = true
  if (stick.y < 0) a.up = true
  if (stick.y > 0) a.down = true

  // hombreras para cambiar de carril: en un runner de tres carriles resultan
  // mas comodas que la cruceta y las busca sola bastante gente
  if (pressed(b[BTN.LB])) a.left = true
  if (pressed(b[BTN.RB])) a.right = true

  a.confirm = pressed(b[BTN.A])
  // B y X van juntos a 'back' porque en partida esa accion es rodar, y es el
  // gesto que sale solo con el pulgar mientras A salta
  a.back = pressed(b[BTN.B]) || pressed(b[BTN.X])
  a.pause = pressed(b[BTN.START]) || pressed(b[BTN.VIEW])
  return a
}

// Estado de flanco por accion: si esta pulsada y cuanto falta para repetir.
const edge = {}
for (const k of ACTIONS) edge[k] = { down: false, wait: 0 }

function resetEdges() {
  for (const k of ACTIONS) {
    edge[k].down = false
    edge[k].wait = 0
  }
  stick.x = 0
  stick.y = 0
}

function pickPad() {
  // Regla 1: lista nueva cada frame, sin guardar nada.
  const pads = navigator.getGamepads ? navigator.getGamepads() : []
  let best = null
  for (const p of pads) {
    if (!p || !p.connected) continue
    // se prefiere el que reporta mapeo estandar; si ninguno lo hace, el primero
    if (!best || (p.mapping === 'standard' && best.mapping !== 'standard')) best = p
  }
  return best
}

function syncStatus(gp) {
  const wasConnected = gamepadState.connected
  const wasId = gamepadState.id
  if (gp) {
    gamepadState.connected = true
    gamepadState.awaiting = false
    gamepadState.id = gp.id || ''
    gamepadState.index = gp.index
    gamepadState.mapping = gp.mapping || ''
  } else {
    gamepadState.connected = false
    gamepadState.id = ''
    gamepadState.index = -1
    gamepadState.mapping = ''
  }
  if (gamepadState.connected !== wasConnected || gamepadState.id !== wasId) {
    if (!gp) {
      // al desconectarse hay que soltar los flancos o se queda un carril pegado
      resetEdges()
      // tras un desconectado el navegador vuelve a exigir una pulsacion para
      // revelar el mando, asi que el aviso de "pulsa un boton" vuelve a aplicar
      gamepadState.awaiting = true
    }
    emitStatus()
  }
}

function poll(dt) {
  const gp = pickPad()
  syncStatus(gp)
  if (!gp) return

  if (GAMEPAD_DEBUG) {
    gamepadState.buttons = (gp.buttons || []).map((b) => (typeof b === 'object' ? b.value : b))
    gamepadState.axes = [...(gp.axes || [])]
  }

  const a = readActions(gp)
  for (const k of ACTIONS) {
    const st = edge[k]
    if (!a[k]) {
      st.down = false
      st.wait = 0
      continue
    }
    if (!st.down) {
      st.down = true
      st.wait = REPEAT_DELAY
      emitAction(k, false)
    } else if (REPEATABLE.has(k)) {
      st.wait -= dt
      if (st.wait <= 0) {
        st.wait = REPEAT_RATE
        emitAction(k, true)
      }
    }
  }
}

let started = false

export function startGamepad() {
  if (started || !gamepadState.supported) return
  started = true

  // gamepadconnected llega antes de la primera pulsacion en algunos navegadores
  // y despues en otros, asi que solo sirve para quitar el aviso de "pulsa un
  // boton" cuanto antes. La deteccion de verdad la hace el sondeo.
  window.addEventListener('gamepadconnected', () => {
    gamepadState.awaiting = false
  })
  window.addEventListener('gamepaddisconnected', () => {
    resetEdges()
    gamepadState.awaiting = true
  })

  let last = performance.now()
  const tick = (now) => {
    const dt = Math.min((now - last) / 1000, 0.1)
    last = now
    poll(dt)
    requestAnimationFrame(tick)
  }
  requestAnimationFrame(tick)
}
