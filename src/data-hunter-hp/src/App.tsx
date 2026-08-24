import { Leva } from 'leva';
import { Game } from './components/Game';
import { GameOver } from './ui/GameOver';
import { HUD } from './ui/HUD';
import { hayWebGL2, Salvavidas, SinWebGL } from './ui/Incompatible';
import { Menu } from './ui/Menu';

/**
 * Se pregunta UNA vez, al cargar el módulo, y no en cada render: crear un
 * lienzo de prueba no es gratis y la respuesta no va a cambiar a mitad de
 * partida.
 */
const PUEDE_3D = hayWebGL2();

export default function App() {
  // Antes de montar nada del juego: si el navegador no sabe dibujar en 3D, la
  // escena reventaría al crearse y la pantalla se quedaría en blanco. Mejor
  // decirlo (ver `ui/Incompatible.tsx`).
  if (!PUEDE_3D) return <SinWebGL />;

  return (
    <Salvavidas>
      <div className="app-root">
        <Game />
        <HUD />
        <Menu />
        <GameOver />
        {/* Panel de debug — visible solo con ?debug en la URL */}
        <Leva hidden={!window.location.search.includes('debug')} collapsed />
      </div>
    </Salvavidas>
  );
}
