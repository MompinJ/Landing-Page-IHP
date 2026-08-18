import { Leva } from 'leva';
import { Game } from './components/Game';
import { GameOver } from './ui/GameOver';
import { HUD } from './ui/HUD';
import { Menu } from './ui/Menu';

export default function App() {
  return (
    <div className="app-root">
      <Game />
      <HUD />
      <Menu />
      <GameOver />
      {/* Panel de debug — visible solo con ?debug en la URL */}
      <Leva hidden={!window.location.search.includes('debug')} collapsed />
    </div>
  );
}
