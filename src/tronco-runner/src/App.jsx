import { Game } from './components/Game'
import { Hud } from './components/Hud'
import { Overlays } from './components/Overlays'

export function App() {
  return (
    <div className="app">
      <Game />
      <div className="vignette" />
      <Hud />
      <Overlays />
    </div>
  )
}
