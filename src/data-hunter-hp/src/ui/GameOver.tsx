import { motion } from 'framer-motion';
import { useCallback, useEffect, useRef, useState } from 'react';
import { startMusic } from '../audio/music';
import { unlockAudio } from '../audio/sfx';
import { ORG_UNITS } from '../data/orgUnits';
import {
  MAX_COMENTARIO,
  MAX_NOMBRE,
  guardaResena,
  leeResenas,
  leeUnidades,
  type Resena,
} from '../services/scoreService';
import { useGameStore } from '../store/useGameStore';
import { useAccionMando, useMandoConectado, useRejillaMando } from '../hooks/useGamepadUi';
import { PassportStrip } from './Passport';

/**
 * Pantalla final competitiva: puntuación, pasaporte, conceptos encontrados y
 * ranking. Sin rango ni desglose de aciertos: el marcador y los sellos ya
 * cuentan la partida, y lo demás era ruido entre la cifra y el formulario.
 *
 * El ranking usa localStorage con el mismo shape (RankingEntry) que expondría
 * una API REST de high-scores — cambiar submitScore por un fetch es el único
 * punto de integración.
 *
 * Mismo lenguaje gráfico que la portada y el cartel de terminal: esquina
 * biselada, antetítulo espaciado y botón en paralelogramo.
 *
 * SE FIRMA CON EL MANDO, como en Terminal Rally. En el stand se juega con mando
 * casi siempre y esta pantalla pide escribir un nombre: sin teclado en pantalla
 * hay que soltar el mando y buscar el teclado físico, y con gente esperando
 * turno eso es exactamente lo que hace que nadie firme su marcador.
 *
 * EL TECLADO ESTÁ SIEMPRE, no solo cuando el juego ya ha visto un mando. Salía
 * bajo esa condición y ahí estaba la trampa: el navegador no reconoce un mando
 * hasta que se pulsa un botón EN ESA PÁGINA, así que quien llegaba a la tarjeta
 * con el mando recién cogido veía un campo de texto y ningún sitio donde
 * escribir —justo en el momento en que hace falta—. Puesto siempre, la cruceta
 * lo encuentra ya montado, el dedo puede teclear en el kiosco táctil, y el
 * teclado físico sigue escribiendo en el campo como siempre.
 */

/* El tope del nombre lo define `scoreService`, que es donde vive `limpiaNombre`
   y por tanto quien tiene que estar de acuerdo con la restricción de la tabla.
   Aquí había una copia con su propio número y es la clase de pareja que se
   desincroniza en cuanto uno de los dos cambia. */

/** Las teclas, en filas de siete. La rejilla del mando lee las filas del DOM,
 *  así que este reparto es también el que recorre la cruceta. */
const FILAS_TECLADO = [
  ['A', 'B', 'C', 'D', 'E', 'F', 'G'],
  ['H', 'I', 'J', 'K', 'L', 'M', 'N'],
  ['O', 'P', 'Q', 'R', 'S', 'T', 'U'],
  ['V', 'W', 'X', 'Y', 'Z', 'Ñ', '-'],
];

function TecladoNombre({
  valor,
  onEscribe,
  onBorra,
  filaBase,
}: {
  valor: string;
  onEscribe: (ch: string) => void;
  onBorra: () => void;
  filaBase: number;
}) {
  return (
    <div className="keys">
      {FILAS_TECLADO.map((fila, r) => (
        <div className="keys-row" key={r}>
          {/* Las letras NO se deshabilitan al llegar al límite: la rejilla se
              arma con los controles activos, así que desactivarlas desmontaría
              el teclado entero bajo el cursor. `onEscribe` ya recorta. */}
          {fila.map((ch) => (
            <button
              key={ch}
              type="button"
              className="key"
              data-gp-row={filaBase + r}
              onClick={() => onEscribe(ch)}
            >
              {ch}
            </button>
          ))}
        </div>
      ))}
      <div className="keys-row">
        <button
          type="button"
          className="key key--wide"
          data-gp-row={filaBase + FILAS_TECLADO.length}
          onClick={() => onEscribe(' ')}
        >
          Espacio
        </button>
        <button
          type="button"
          className="key key--wide"
          data-gp-row={filaBase + FILAS_TECLADO.length}
          onClick={onBorra}
          disabled={!valor.length}
        >
          Borrar
        </button>
      </div>
    </div>
  );
}
/** Lo que tarda el modal en salir solo después de firmar. Medido contra lo que
 *  hace falta, no elegido redondo: por debajo de un segundo pisa la entrada del
 *  Top 10 y se lee como un fallo; muy por encima, al jugador ya le dio tiempo
 *  de soltar el mando y el que se encuentra el modal es el siguiente de la
 *  cola. */
const ESPERA_RESENA = 1200;

/* ============================== RESEÑAS ==============================
 *
 * Calificar la partida al terminar. Existe porque en el stand la gente decía en
 * voz alta que el juego le había gustado y eso no quedaba en ninguna parte: al
 * desmontar el congreso lo único que había para enseñar era una lista de
 * puntuaciones, que dice cuánta gente jugó pero no qué le pareció a nadie.
 *
 * SE PREGUNTA DESPUÉS DE FIRMAR, nunca antes. Quien acaba de jugar está mirando
 * su puntuación y su puesto en el Top 10; interrumpir eso con un formulario es
 * la mejor forma de que no conteste ni a lo uno ni a lo otro.
 */

/** La estrella, dibujada. En glifo tipográfico (★) ninguna fuente garantiza el
 *  trazo y la mitad de los sistemas la pintan como emoji a color, que es justo
 *  lo que rompe la paleta de la tarjeta. */
function Star({ on }: { on: boolean }) {
  return (
    <svg className={on ? 'star star-on' : 'star'} viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M12 2.2 L14.9 8.7 L21.9 9.5 L16.7 14.2 L18.2 21.1 L12 17.5 L5.8 21.1 L7.3 14.2 L2.1 9.5 L9.1 8.7 Z"
        fill="currentColor"
      />
    </svg>
  );
}

/** Estrellas para LEER: se pintan siempre las cinco y se encienden las que
 *  valgan. Pintar solo las llenas obliga a contarlas para saber si son tres de
 *  cinco o tres de tres. */
function Estrellas({ n }: { n: number }) {
  return (
    <span className="stars" role="img" aria-label={`${n} de 5 estrellas`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} on={i <= n} />
      ))}
    </span>
  );
}

/** Estrellas para PULSAR. Botones normales, como las fichas de unidad: valen
 *  para el dedo, el ratón y la rejilla del mando por igual. */
function EstrellasPicker({
  valor,
  onElige,
  fila,
}: {
  valor: number;
  onElige: (n: number) => void;
  fila: number;
}) {
  return (
    <div className="stars-pick">
      {[1, 2, 3, 4, 5].map((i) => (
        <button
          key={i}
          type="button"
          className={i <= valor ? 'star-btn star-btn--on' : 'star-btn'}
          data-gp-row={fila}
          aria-label={i === 1 ? '1 estrella' : `${i} estrellas`}
          onClick={() => onElige(i)}
        >
          <Star on={i <= valor} />
        </button>
      ))}
    </div>
  );
}

/**
 * EL MODAL. Se abre sobre la tarjeta final y tiene SU PROPIA rejilla de mando:
 * mientras está abierto, la de la tarjeta de abajo se apaga (ver `GameOver`).
 * Con las dos vivas, la cruceta movía dos cursores a la vez y confirmar pulsaba
 * el botón de detrás.
 *
 * EL COMENTARIO NO ENTRA EN LA REJILLA A PROPÓSITO. Escribir 140 caracteres
 * letra a letra con la cruceta no lo hace nadie, así que el campo se deja para
 * el dedo (el kiosco es táctil y saca el teclado del sistema) y para el teclado
 * físico. Con mando se califica con las estrellas y se envía, que es lo que de
 * verdad se va a usar y no cuesta ni cinco segundos.
 */
function ModalResena({
  onEnvia,
  onCierra,
}: {
  onEnvia: (r: { estrellas: number; comentario: string }) => void;
  onCierra: () => void;
}) {
  const [estrellas, setEstrellas] = useState(0);
  const [comentario, setComentario] = useState('');
  const caja = useRef<HTMLDivElement>(null);
  useRejillaMando(caja);

  // B cierra, como en cualquier menú del juego. Que salirse sea lo fácil
  // importa: nadie tiene que sentir que el juego le retiene por no opinar.
  useAccionMando((a) => {
    if (a === 'back') onCierra();
  });

  return (
    <motion.div
      className="overlay overlay--modal"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
    >
      {/* EL FONDO NO CIERRA, y antes sí. Se quitó al hacer que el modal salga
          solo: ahora aparece delante de alguien que no lo pidió, en un kiosco
          táctil, donde un roce en el borde es lo más fácil del mundo. Cerrarse
          por un roce —sin que quien lo sufre entienda siquiera que había algo—
          es peor que pedir un toque de más. Se sale por «Ahora no» o por B. */}
      <motion.div
        ref={caja}
        className="card card--modal"
        initial={{ y: 24, scale: 0.96, opacity: 0 }}
        animate={{ y: 0, scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 280, damping: 26 }}
      >
        <span className="card-kicker">Antes de irte</span>
        <span className="card-title">¿Qué te pareció?</span>
        <p className="card-lead card-lead--sm">Toca las estrellas. El comentario es opcional.</p>

        <EstrellasPicker valor={estrellas} onElige={setEstrellas} fila={0} />

        <textarea
          className="resena-texto"
          value={comentario}
          maxLength={MAX_COMENTARIO}
          rows={3}
          placeholder="Cuéntanos en una línea (opcional)"
          onChange={(e) => setComentario(e.target.value)}
        />
        <span className="resena-cuenta">
          {comentario.length}/{MAX_COMENTARIO}
        </span>

        <div className="actions">
          {/* Sin estrellas no hay reseña que mandar, y el botón lo dice en vez
              de aceptar el clic y no hacer nada. Deshabilitado además sale de
              la rejilla del mando, así que el cursor no se posa en él. */}
          <button
            className="btn-skew btn-skew--sm"
            type="button"
            disabled={!estrellas}
            data-gp-row={1}
            onClick={() => onEnvia({ estrellas, comentario })}
          >
            <span>{estrellas ? 'Enviar' : 'Elige estrellas'}</span>
          </button>
          <button className="btn-ghost" type="button" data-gp-row={1} onClick={onCierra}>
            Ahora no
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

/** La tabla de reseñas de la pantalla final: la media arriba y las últimas
 *  debajo. Va DESPUÉS del Top 10 porque es lo segundo que interesa — primero
 *  dónde quedó uno, luego qué opina el resto. */
function TablaResenas({ lista }: { lista: Resena[] }) {
  if (!lista.length) return null;

  const media = lista.reduce((t, r) => t + r.estrellas, 0) / lista.length;

  return (
    <div className="resenas">
      <span className="card-kicker card-kicker--sm">
        Reseñas <i>·</i> {media.toFixed(1)} de 5 <i>·</i>{' '}
        {lista.length === 1 ? '1 reseña' : `${lista.length} reseñas`}
      </span>
      <div className="resenas-list">
        {lista.map((r) => (
          <div key={r.id} className="resena">
            <div className="resena-cab">
              <Estrellas n={r.estrellas} />
              {r.nombre && <span className="resena-quien">{r.nombre}</span>}
              {r.unidad && <span className="board-unit">{r.unidad}</span>}
            </div>
            {r.comentario && <p className="resena-dice">{r.comentario}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}

/** Trae las reseñas y devuelve también la forma de volver a pedirlas: al enviar
 *  la propia hay que releer para que aparezca arriba de la lista. */
function useResenas(): [Resena[], () => void] {
  const [lista, setLista] = useState<Resena[]>([]);

  const recarga = useCallback(() => {
    // `null` es «no lo sé», no «no hay ninguna»: se conserva lo que hubiera.
    void leeResenas().then((filas) => {
      if (filas) setLista(filas);
    });
  }, []);

  useEffect(() => recarga(), [recarga]);

  return [lista, recarga];
}

export function GameOver() {
  const phase = useGameStore((s) => s.phase);
  const score = useGameStore((s) => s.score);
  const foundConcepts = useGameStore((s) => s.foundConcepts);
  const ranking = useGameStore((s) => s.ranking);
  const submitScore = useGameStore((s) => s.submitScore);
  const startGame = useGameStore((s) => s.startGame);
  const backToMenu = useGameStore((s) => s.backToMenu);

  const [name, setName] = useState('');
  const [unit, setUnit] = useState('');
  const [submitted, setSubmitted] = useState(false);
  /** `null` mientras no se ha intentado; luego, si la marca llegó al congreso
   *  o se quedó en el ranking de este equipo. */
  const [subido, setSubido] = useState<boolean | null>(null);
  const [guardando, setGuardando] = useState(false);
  /**
   * LAS UNIDADES SALEN DE LA TABLA, no del código. Es la misma lista contra la
   * que la clave foránea valida al guardar, así que traerla de ahí es lo único
   * que garantiza que lo que se puede elegir es lo que se puede guardar. Se
   * arranca con la copia local para que el picker no parpadee vacío, y se
   * sustituye si la consulta llega.
   */
  const [unidades, setUnidades] = useState(ORG_UNITS.map((u) => ({ codigo: u.code, nombre: u.name })));
  useEffect(() => {
    let vivo = true;
    void leeUnidades().then((lista) => {
      if (vivo && lista?.length) setUnidades(lista);
    });
    return () => {
      vivo = false;
    };
  }, []);

  /**
   * LA REJILLA DEL MANDO vive en la tarjeta entera y no en el formulario: al
   * guardar, el teclado y las unidades desaparecen y el cursor tiene que caer
   * solo sobre «Jugar otra vez». Si la rejilla muriera con el formulario, el
   * cursor moriría con ella.
   */
  const tarjeta = useRef<HTMLDivElement>(null);
  const mando = useMandoConectado();
  const enTarjeta = phase === 'gameover';

  /**
   * LA RESEÑA. `resenaHecha` no distingue si llegó al servidor a propósito: al
   * que acaba de opinar se le da las gracias y punto. Su reseña no es una marca
   * en una tabla que vaya a buscar después, así que un aviso de «no se pudo
   * guardar tu opinión» solo serviría para dejarle mal sabor de una cosa que
   * hizo por gusto.
   */
  const [resenaAbierta, setResenaAbierta] = useState(false);
  const [resenaHecha, setResenaHecha] = useState(false);
  const [resenas, recargaResenas] = useResenas();

  /*
    EL MODAL SALE SOLO AL FIRMAR, UNA SOLA VEZ.

    Con el botón a secas casi nadie lo pulsaba: el que acaba de firmar ya vio lo
    que venía a ver y le pasa el mando al siguiente. Preguntar de frente es lo
    que hay entre recoger reseñas y tener un botón que nadie toca.

    PERO NO PISA EL MOMENTO: espera a que el Top 10 lleve un segundo largo en
    pantalla. Lo que el jugador acaba de ganarse es ver su puesto, y taparlo en
    el mismo instante en que aparece convierte el premio en un trámite.

    Y SOLO UNA VEZ: cerrado con «Ahora no» se queda cerrado, y el botón
    «Calificar» sigue ahí para el que se arrepienta. El pestillo va en una ref
    porque no debe provocar un redibujado — solo recuerda que ya salió.
  */
  const yaSalioSolo = useRef(false);
  useEffect(() => {
    if (!submitted || yaSalioSolo.current) return;
    yaSalioSolo.current = true;
    const t = setTimeout(() => setResenaAbierta(true), ESPERA_RESENA);
    // Si se pulsa «Jugar otra vez» antes de que salte, esto se desmonta y el
    // modal no llega a abrirse sobre una pantalla que ya no existe.
    return () => clearTimeout(t);
  }, [submitted]);

  // Con el modal abierto se apaga la rejilla de la tarjeta: el modal trae la
  // suya, y dos rejillas vivas mueven dos cursores con la misma cruceta.
  useRejillaMando(tarjeta, enTarjeta && !resenaAbierta);

  const escribe = (ch: string) =>
    setName((n) => (n + ch).slice(0, MAX_NOMBRE).replace(/^ +/, ''));
  const borra = () => setName((n) => n.slice(0, -1));

  // B del mando: mientras se escribe, borra una letra —es lo que espera
  // cualquiera que haya escrito un nombre en una consola—; una vez guardado ya
  // no hay nada que borrar y vuelve a ser «atrás».
  // Mientras el modal está abierto esta acción se apaga: allí B cierra el
  // modal, y si las dos escucharan a la vez, cerrar la reseña te sacaría además
  // al menú.
  useAccionMando(
    (a) => {
      if (a !== 'back') return;
      if (!submitted && name.length) borra();
      else if (submitted) backToMenu();
    },
    enTarjeta && !resenaAbierta,
  );

  // Se manda lo que se firmó, sin volver a preguntarlo: pedir otra vez nombre y
  // unidad dentro del modal es la forma más rápida de que nadie lo rellene.
  const enviaResena = ({ estrellas, comentario }: { estrellas: number; comentario: string }) => {
    setResenaAbierta(false);
    setResenaHecha(true);
    void guardaResena({ estrellas, comentario, nombre: name, unidad: unit }).then((ok) => {
      // Solo se relee si entró: si no, la lista se quedaría igual y la
      // relectura sería un viaje para nada.
      if (ok) recargaResenas();
    });
  };

  if (phase !== 'gameover') return null;

  // El teclado en pantalla, mientras se escribe (ver la nota de arriba: no se
  // condiciona a que haya mando detectado). Las filas de la rejilla se numeran
  // de arriba abajo con una sola cuenta, para que los dos casos —escribiendo y
  // ya guardado— queden alineados sin listas paralelas.
  const conTeclado = !submitted;
  const filaUnidades = conTeclado ? FILAS_TECLADO.length + 1 : 0;
  const filaGuardar = filaUnidades + 1;
  // YA GUARDADO, EL CURSOR CAE EN CALIFICAR Y NO EN «JUGAR OTRA VEZ». La
  // rejilla se recoloca en la fila 0 cuando encoge (ver `useRejillaMando`), así
  // que la fila 0 es la que se lleva el cursor al firmar, y es exactamente
  // donde se quiere que esté: pulsar A abre el modal, no arranca otra partida.
  // En cuanto la reseña está hecha el botón desaparece, la rejilla vuelve a
  // encoger y el cursor cae solo sobre «Jugar otra vez», que pasa a ser la
  // única fila.
  const filaResena = 0;
  const filaAcciones = submitted ? 1 : filaGuardar + 1;

  const myName = (name.trim() || 'ANON').toUpperCase();

  return (
    <motion.div
      className="overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.35 }}
    >
      <motion.div
        ref={tarjeta}
        className="card card--wide"
        initial={{ y: 40, scale: 0.94, opacity: 0 }}
        animate={{ y: 0, scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 260, damping: 24, delay: 0.1 }}
      >
        <span className="card-kicker">Fin del recorrido</span>

        <motion.span
          className="final-score"
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 220, damping: 18, delay: 0.2 }}
        >
          {score.toLocaleString('es-MX')}
        </motion.span>
        <span className="final-unit">Puntos</span>

        {/* Pasaporte: qué terminales alcanzó a recorrer. Sin encabezado — los
            sellos llevan el nombre completo de cada terminal y se explican
            solos; el contador "N/5" además prometía un recorrido que no
            siempre se había hecho. */}
        <div className="passport-block">
          <PassportStrip />
        </div>

        {foundConcepts.length > 0 && (
          <div className="concepts">
            {foundConcepts.map((c) => (
              <span key={c} className="concept-chip">{c}</span>
            ))}
          </div>
        )}

        {!submitted ? (
          <form
            className="signup"
            onSubmit={(e) => {
              e.preventDefault();
              // La pantalla pasa al Top 10 EN EL ACTO y la subida sigue por
              // detrás: en un stand con cola, hacer esperar a alguien delante
              // de un botón mientras se resuelve una petición es lo que hace
              // que el siguiente no juegue. El aviso de si subió o no llega
              // cuando llega, ya en la pantalla del ranking.
              setSubmitted(true);
              setGuardando(true);
              void submitScore(name, unit).then((ok) => {
                setSubido(ok);
                setGuardando(false);
              });
            }}
          >
            {/* El campo va ARRIBA del teclado: se escribe mirando lo que sale,
                no al revés. Con teclado físico sigue funcionando igual. */}
            <div className="submit-row">
              <input
                className="name-input"
                value={name}
                maxLength={MAX_NOMBRE}
                placeholder="Tu nombre"
                onChange={(e) => setName(e.target.value)}
                autoFocus={!mando}
              />
            </div>

            {conTeclado && (
              <TecladoNombre valor={name} onEscribe={escribe} onBorra={borra} filaBase={0} />
            )}

            <span className="card-kicker card-kicker--sm">Tu unidad de negocio</span>
            {/* Botones, no un <select>: en el kiosco se juega con el dedo y una
                lista desplegable nativa se abre fuera del lienzo del juego.
                Las once van en UNA fila de rejilla: se recorren con izquierda y
                derecha, y arriba/abajo saltan al teclado o a Guardar. Repartirlas
                en varias filas de cursor sería mentir, porque en pantalla se
                acomodan solas según el ancho. */}
            <div className="chips chips--pick">
              {unidades.map((u) => (
                <button
                  key={u.codigo}
                  type="button"
                  title={u.nombre}
                  data-gp-row={filaUnidades}
                  className={`chip chip--pick${unit === u.codigo ? ' chip--on' : ''}`}
                  onClick={() => setUnit(unit === u.codigo ? '' : u.codigo)}
                >
                  <span>{u.codigo}</span>
                </button>
              ))}
            </div>

            {/* Sin unidad la tabla del congreso rechaza la fila (la exige con
                clave foránea), así que el botón no deja mandarla a rebotar. */}
            <button
              className="btn-skew btn-skew--sm"
              type="submit"
              disabled={!unit}
              data-gp-row={filaGuardar}
            >
              <span>{unit ? 'Guardar' : 'Elige tu unidad'}</span>
            </button>
          </form>
        ) : (
          <>
            <span className="card-kicker card-kicker--sm">
              {guardando ? 'Guardando…' : subido === false ? 'Top 10 de este equipo' : 'Top 10 del congreso'}
            </span>
            {/* Si la marca no salió del equipo hay que DECIRLO: el jugador se
                va creyendo que compite con todo el congreso y su nombre no está
                en ninguna parte. No es un error suyo ni hay nada que pueda
                hacer, así que se cuenta en una línea y sin alarma.
                Y NO SE LE ECHA LA CULPA A LA RED: decía «sin conexión» y la
                primera vez que falló de verdad había conexión de sobra — era la
                tabla rechazando la fila. Un aviso que nombra una causa
                equivocada manda a quien lo lea a mirar donde no es. */}
            {subido === false && (
              <p className="how-foot">
                No se pudo guardar en el marcador del congreso: tu marca quedó guardada en este equipo.
              </p>
            )}
            <div className="board">
              {ranking.map((r, i) => (
                <div
                  key={`${r.name}-${r.date}`}
                  className={`board-row${r.name.toUpperCase() === myName && r.score === score ? ' board-row--me' : ''}`}
                >
                  <span className="board-pos">{i + 1}</span>
                  <span className="board-name">{r.name}</span>
                  <span className="board-unit">{r.unit ?? '—'}</span>
                  <span className="board-score">{r.score.toLocaleString('es-MX')}</span>
                </div>
              ))}
            </div>

            {/* LA LLAMADA A OPINAR, entre el Top 10 y la tabla de reseñas: se
                pregunta cuando ya se ha visto el puesto, que es cuando la
                partida está de verdad terminada. Una vez enviada se cambia por
                el agradecimiento — dejar el botón puesto invita a mandar la
                misma opinión tres veces. */}
            {resenaHecha ? (
              <p className="resena-gracias">Gracias. Tu reseña queda con las demás.</p>
            ) : (
              <div className="resena-cta">
                <span className="card-kicker card-kicker--sm">¿Qué te pareció el juego?</span>
                <button
                  className="btn-skew btn-skew--sm"
                  type="button"
                  data-gp-row={filaResena}
                  onClick={() => setResenaAbierta(true)}
                >
                  <span>Calificar</span>
                </button>
              </div>
            )}

            <TablaResenas lista={resenas} />
          </>
        )}

        <div className="actions">
          <button
            className="btn-skew"
            data-gp-row={filaAcciones}
            onClick={() => {
              unlockAudio();
              startMusic();
              startGame();
            }}
          >
            <span>Jugar otra vez</span>
          </button>
          <button className="btn-ghost" data-gp-row={filaAcciones} onClick={backToMenu}>
            Inicio
          </button>
        </div>
      </motion.div>

      {/* Fuera de la tarjeta: es una capa por encima de ella, no un trozo suyo,
          y así el scroll de la tarjeta no se lo lleva por delante. */}
      {resenaAbierta && (
        <ModalResena onEnvia={enviaResena} onCierra={() => setResenaAbierta(false)} />
      )}
    </motion.div>
  );
}
