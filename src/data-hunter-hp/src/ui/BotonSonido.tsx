import { useState } from 'react';
import { alternarMusica, musicaSilenciada } from '../audio/music';

/**
 * SILENCIAR — pequeño, siempre visible, y no es un extra.
 *
 * En un stand la máquina se queda encendida todo el día con la misma música
 * sonando; quien está de pie al lado ocho horas necesita poder apagarla sin
 * buscar un menú, y quien abre el juego en el móvil en una sala en silencio
 * también. La preferencia se recuerda entre partidas (ver `audio/music.ts`),
 * así que se pulsa una vez y no se vuelve a tocar.
 *
 * Va FUERA del `.hud`: ese contenedor tiene `pointer-events: none` para que los
 * gestos del tablero le pasen por debajo, y un botón ahí dentro no se podría
 * pulsar. Y por eso mismo hay que sacarlo del alcance de `useTouchControls`,
 * que ya lo hace solo — su comprobación de interfaz incluye `button`.
 */
export function BotonSonido() {
  const [silenciada, setSilenciada] = useState(musicaSilenciada);

  return (
    <button
      className="btn-sonido"
      type="button"
      onClick={() => setSilenciada(alternarMusica())}
      aria-pressed={silenciada}
      aria-label={silenciada ? 'Activar la música' : 'Silenciar la música'}
      title={silenciada ? 'Activar la música' : 'Silenciar la música'}
    >
      {/* Dibujado, no un glifo de fuente: el emoji de altavoz sale de un color
          distinto en cada sistema y aquí tiene que ser del azul de la marca. */}
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4 9.5h3.4L12 5.4v13.2L7.4 14.5H4z" fill="currentColor" />
        {silenciada ? (
          <path
            d="M15.5 9.5l5 5M20.5 9.5l-5 5"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        ) : (
          <>
            <path d="M15.6 9.2a4 4 0 0 1 0 5.6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <path d="M18.2 6.9a7.5 7.5 0 0 1 0 10.2" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </>
        )}
      </svg>
    </button>
  );
}
