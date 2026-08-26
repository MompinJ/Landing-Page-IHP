import { Component, Fragment, type ErrorInfo, type ReactNode } from 'react';

/**
 * CUANDO EL JUEGO NO PUEDE ARRANCAR, QUE LO DIGA.
 *
 * El fallo que trajo esto aquí fue «no carga en algunos teléfonos», y lo peor
 * no era el fallo sino la FORMA de fallar: pantalla en blanco. Sin mensaje, sin
 * pista, sin nada que el que lo sufre pueda contar más allá de «no carga». En
 * un stand eso es lo más caro que hay — el que se planta delante no va a abrir
 * la consola del navegador, se va a ir.
 *
 * La causa concreta ya está arreglada (el objetivo de compilación, ver
 * `vite.config.ts`), pero la lección es la otra: quedan aparatos que NO van a
 * poder con esto y hay que decírselo. El suelo real lo marca WebGL2, que es lo
 * que three exige desde r163 y que llegó con Safari 15 e iOS 15.
 *
 * Son dos redes distintas y cubren cosas distintas:
 *
 *  - `SinWebGL` — el navegador funciona pero no sabe dibujar en 3D. Se
 *    comprueba ANTES de montar la escena, porque montarla sería justamente el
 *    momento de reventar.
 *  - `Salvavidas` — cualquier otro error que reviente el árbol de React. Sin
 *    una barrera así, una excepción en cualquier componente desmonta la
 *    aplicación entera y deja... la pantalla en blanco otra vez.
 *
 * Y hay una TERCERA que no puede vivir aquí: si el paquete de JavaScript no
 * llega a ejecutarse (sintaxis que el navegador no entiende, o la descarga que
 * falla), este fichero tampoco se ejecuta. Esa la cubre `index.html` con un
 * bloque de aviso escrito a mano y sin dependencias.
 */

/** Estilos EN LÍNEA a propósito: si lo que falló fue la hoja de estilos, un
 *  mensaje que dependa de ella tampoco se vería. Esto se ve pase lo que pase. */
const CAJA: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 14,
  padding: 28,
  textAlign: 'center',
  background: '#061a2e',
  color: '#eaf2fb',
  font: '16px/1.5 "Segoe UI", system-ui, -apple-system, sans-serif',
};

const TITULO: React.CSSProperties = {
  fontSize: 24,
  fontWeight: 900,
  fontStyle: 'italic',
  textTransform: 'uppercase',
  letterSpacing: '0.02em',
};

const PIE: React.CSSProperties = { fontSize: 13, color: '#8fb2d0', maxWidth: '32ch' };

function Aviso({ titulo, cuerpo, pie }: { titulo: string; cuerpo: string; pie?: string }) {
  return (
    <div style={CAJA} role="alert">
      <span style={{ fontSize: 12, letterSpacing: '0.26em', color: '#3fa9f5' }}>PORT QUEST</span>
      <span style={TITULO}>{titulo}</span>
      <p style={{ maxWidth: '34ch' }}>{cuerpo}</p>
      {pie && <p style={PIE}>{pie}</p>}
    </div>
  );
}

/**
 * ¿Sabe este navegador dibujar en 3D? Se pregunta creando un lienzo de usar y
 * tirar, que es la única forma fiable — la lista de navegadores no sirve:
 * WebGL2 se puede desactivar por ajuste, por falta de memoria o porque el
 * sistema haya puesto esa tarjeta en su lista negra, y en los tres casos el
 * navegador se llama igual.
 */
export function hayWebGL2(): boolean {
  try {
    const lienzo = document.createElement('canvas');
    return !!lienzo.getContext('webgl2');
  } catch {
    return false;
  }
}

export function SinWebGL() {
  return (
    <Aviso
      titulo="Este navegador no puede con el 3D"
      cuerpo="Port Quest necesita WebGL 2, y este navegador no lo tiene disponible."
      pie="Suele arreglarse actualizando el navegador (en iPhone, actualizando iOS a la 15 o posterior) o abriéndolo en Chrome o Safari en vez de dentro de otra aplicación."
    />
  );
}

/**
 * BARRERA DE ERRORES. React desmonta el árbol entero cuando un componente
 * lanza, así que sin esto cualquier excepción acaba en pantalla blanca. Tiene
 * que ser una clase: es la única forma que da React de capturar un error de
 * render, no hay equivalente con hooks.
 */
export class Salvavidas extends Component<
  { children: ReactNode },
  { fallo: Error | null; intento: number }
> {
  state: { fallo: Error | null; intento: number } = { fallo: null, intento: 0 };

  static getDerivedStateFromError(fallo: Error) {
    return { fallo };
  }

  componentDidCatch(fallo: Error, info: ErrorInfo) {
    // A la consola SIEMPRE, aunque en pantalla no salga nada: es lo único que va
    // a tener quien intente reproducirlo desde fuera del stand.
    console.error('[Port Quest] el juego se cayó:', fallo, info.componentStack);

    /**
     * UN REINTENTO, Y SOLO UNO.
     *
     * Hay un fallo de ARRANQUE que se dispara aproximadamente una de cada cinco
     * cargas: «Maximum update depth exceeded» dentro de `<CanvasImpl>` de
     * react-three-fiber, en un `set` que su propio store hace al ver que la
     * cámara cambió de identidad — que es lo que provoca el `makeDefault` de la
     * cámara de drei al montarse. Es anterior a este salvavidas y está medido:
     * quitando del medio todo lo que se tocó por encima, se seguía cayendo 2 de
     * cada 10 cargas.
     *
     * Lo que lo dispara es una CARRERA entre que React monta y que el lienzo se
     * mide, y por eso salía en producción y casi nunca en local: se gana o se
     * pierde por milisegundos de latencia. Y por eso mismo un reintento la gana
     * casi siempre — al remontar, el lienzo ya tiene tamaño.
     *
     * Cambiar la `key` es lo que fuerza el remonte de verdad: sin ella React
     * reutilizaría el árbol y volvería a caer en el mismo estado. Al segundo
     * intento se deja de insistir y se enseña el aviso: repetir sin fin dejaría
     * al jugador delante de una pantalla que parpadea sin decir nada.
     */
    if (this.state.intento < 1) {
      this.setState((previo) => ({ fallo: null, intento: previo.intento + 1 }));
    }
  }

  render() {
    if (!this.state.fallo) {
      return <Fragment key={this.state.intento}>{this.props.children}</Fragment>;
    }
    return (
      <Aviso
        titulo="El juego se ha caído"
        cuerpo="Algo ha fallado al dibujar la partida. Recarga la página para volver a empezar."
        pie={this.state.fallo.message}
      />
    );
  }
}
