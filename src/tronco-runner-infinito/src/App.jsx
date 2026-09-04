import { useEffect } from 'react'
import { Game } from './components/Game'
import { Hud } from './components/Hud'
import { Overlays } from './components/Overlays'
import { GamepadDebug } from './components/GamepadDebug'
import { GAMEPAD_DEBUG, startGamepad } from './gamepad'

export function App() {
  // El sondeo del mando vive fuera del bucle de render de three: asi sigue
  // funcionando en los menus, que estan en DOM y no en el canvas.
  useEffect(startGamepad, [])

  return (
    <div className="app">
      <Game />
      <div className="vignette" />
      <Hud />
      <Overlays />
      {GAMEPAD_DEBUG && <GamepadDebug />}
    </div>
  )
}
