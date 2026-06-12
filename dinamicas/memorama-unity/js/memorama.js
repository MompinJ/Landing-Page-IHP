/* ============================================================
   DINAMICA MEMORAMA UNITY — motor
   Parejas valor <-> comportamiento. Modo 1 equipo (reloj e
   intentos) o 2 equipos (turnos; acertar da punto y repite).
   ============================================================ */

(() => {
  // ---------- parejas (editar aqui) ----------
  // value: carta azul · behavior: carta blanca · why: toast al unirlas
  const PAIRS = [
    {
      value: 'UNRIVALLED STANDARDS',
      behavior: 'Ponemos estandares nuevos... y los volvemos a superar.',
      why: 'ESTANDARES INSUPERABLES: innovar y exceder lo que ya hicimos bien.'
    },
    {
      value: 'NETWORK STRENGTH',
      behavior: 'Un solo equipo, en todos los puertos y husos horarios.',
      why: 'FUERZA DE RED: cooperar entre puertos, paises y continentes.'
    },
    {
      value: 'INFORMED DECISIONS',
      behavior: 'Decidimos con datos y con el futuro en mente.',
      why: 'DECISIONES INFORMADAS: ver el panorama completo y el detalle.'
    },
    {
      value: 'TRUSTED AND HONEST',
      behavior: 'Profesionales, eticos y de frente, aunque algo salga mal.',
      why: 'CONFIABLES Y HONESTOS: nuestra palabra se sostiene.'
    },
    {
      value: 'YOUR PARTNERS',
      behavior: 'Lo que le importa al cliente, nos importa a nosotros.',
      why: 'TUS SOCIOS: soluciones a la medida y relaciones de largo plazo.'
    },
    {
      value: 'UNITY',
      behavior: 'La palabra que resume como trabajamos los 30,000.',
      why: 'UNITY: un solo nombre para los cinco valores de la red.'
    }
  ];

  // ---------- DOM ----------
  const $ = (id) => document.getElementById(id);
  const grid = $('grid');
  const modeModal = $('mode-modal');
  const turnEl = $('turn'), turnTeam = $('turn-team');
  const meterA = $('m-a'), meterB = $('m-b'), meterTries = $('m-tries');
  const scoreA = $('score-a'), scoreB = $('score-b');
  const triesEl = $('tries'), timeEl = $('time');
  const hudStatus = $('hud-status');
  const toast = $('toast'), finale = $('finale');

  let toastTimer = 0;
  const say = (msg, ms = 2600) => {
    toast.hidden = false;
    toast.textContent = msg;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { toast.hidden = true; }, ms);
  };

  // ---------- estado ----------
  let mode = 0;              // 1 o 2 equipos
  let cards = [];            // { el, pair, kind, done }
  let open = [];             // cartas volteadas este turno
  let busy = false, playing = false;
  let tries = 0, matched = 0, t = 0;
  let team = 0;              // 0 = A, 1 = B
  const score = [0, 0];

  const fmtTime = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

  const shuffle = (a) => {
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };

  const updateHud = () => {
    triesEl.textContent = String(tries);
    timeEl.textContent = fmtTime(t);
    scoreA.textContent = String(score[0]);
    scoreB.textContent = String(score[1]);
    if (mode === 2) {
      turnTeam.textContent = team === 0 ? 'EQUIPO A' : 'EQUIPO B';
      turnEl.classList.toggle('is-b', team === 1);
      meterA.classList.toggle('is-turn', team === 0);
      meterB.classList.toggle('is-turn', team === 1);
    }
  };

  // ---------- tablero ----------
  const build = () => {
    grid.innerHTML = '';
    cards = [];
    const deck = [];
    PAIRS.forEach((p, i) => {
      deck.push({ pair: i, kind: 'value', text: p.value });
      deck.push({ pair: i, kind: 'behavior', text: p.behavior });
    });
    shuffle(deck).forEach((d) => {
      const el = document.createElement('div');
      el.className = `card card--${d.kind}`;
      el.innerHTML =
        `<div class="card__inner">
           <div class="card__face card__back"></div>
           <div class="card__face card__front">${d.text}</div>
         </div>`;
      grid.appendChild(el);
      const card = { el, pair: d.pair, kind: d.kind, done: false };
      el.addEventListener('click', () => flip(card));
      cards.push(card);
    });
  };

  const flip = (card) => {
    if (!playing || busy || card.done || open.includes(card)) return;
    card.el.classList.add('is-open');
    open.push(card);
    if (open.length < 2) return;

    busy = true;
    tries++;
    const [a, b] = open;
    const isMatch = a.pair === b.pair && a.kind !== b.kind;

    if (isMatch) {
      setTimeout(() => {
        a.done = b.done = true;
        a.el.classList.add('is-done');
        b.el.classList.add('is-done');
        matched++;
        if (mode === 2) score[team]++;
        say(PAIRS[a.pair].why);
        hudStatus.textContent = mode === 2
          ? `PUNTO PARA EL ${team === 0 ? 'EQUIPO A' : 'EQUIPO B'}: REPITE TURNO`
          : 'PAREJA CORRECTA';
        open = [];
        busy = false;
        updateHud();
        if (matched === PAIRS.length) setTimeout(endGame, 800);
      }, 450);
    } else {
      a.el.classList.add('is-fail');
      b.el.classList.add('is-fail');
      setTimeout(() => {
        [a, b].forEach((c) => c.el.classList.remove('is-open', 'is-fail'));
        open = [];
        busy = false;
        if (mode === 2) {
          team = 1 - team;
          hudStatus.textContent = `TURNO DEL ${team === 0 ? 'EQUIPO A' : 'EQUIPO B'}`;
        }
        updateHud();
      }, 950);
      updateHud();
    }
  };

  // ---------- fin ----------
  const endGame = () => {
    playing = false;
    if (mode === 2) {
      const empate = score[0] === score[1];
      const winner = score[0] > score[1] ? 'EQUIPO A' : 'EQUIPO B';
      $('finale-kicker').textContent = 'MEMORAMA COMPLETO';
      $('finale-title').textContent = empate ? 'Empate de campeonato.' : `Gana el ${winner}.`;
      $('finale-score').textContent = `A ${score[0]} — ${score[1]} B`;
      $('finale-detail').textContent = `${tries} INTENTOS · ${fmtTime(t)} · LOS VALORES QUEDARON REPASADOS`;
    } else {
      const perfect = PAIRS.length;
      const rank = tries <= perfect + 2 ? 'Memoria institucional.' :
                   tries <= perfect + 5 ? 'Conoces bien la casa.' :
                   tries <= perfect + 9 ? 'Buen repaso de valores.' : 'Releete el UNITY, va de nuevo.';
      $('finale-kicker').textContent = 'MEMORAMA COMPLETO';
      $('finale-title').textContent = rank;
      $('finale-score').textContent = `${tries} INTENTOS · ${fmtTime(t)}`;
      $('finale-detail').textContent = `LO PERFECTO ERAN ${perfect}: CADA PAREJA A LA PRIMERA`;
    }
    finale.hidden = false;
  };

  const start = (m) => {
    mode = m;
    tries = 0; matched = 0; t = 0;
    team = 0; score[0] = 0; score[1] = 0;
    open = []; busy = false;
    playing = true;
    modeModal.hidden = true;
    finale.hidden = true;
    meterA.hidden = meterB.hidden = mode !== 2;
    meterTries.hidden = false;
    turnEl.hidden = mode !== 2;
    hudStatus.textContent = mode === 2 ? 'TURNO DEL EQUIPO A' : 'ENCUENTRA LAS PAREJAS VALOR-COMPORTAMIENTO';
    build();
    updateHud();
  };

  const reset = () => {
    playing = false;
    finale.hidden = true;
    modeModal.hidden = false;
    hudStatus.textContent = 'ELIGE MODO DE JUEGO';
  };

  document.querySelectorAll('.modebtn').forEach((b) =>
    b.addEventListener('click', () => start(parseInt(b.dataset.mode, 10))));
  $('restart').addEventListener('click', reset);
  document.addEventListener('keydown', (e) => {
    const k = e.key.toLowerCase();
    if (k === 'r') reset();
    if (k === 'enter' && !finale.hidden) reset();
    if (modeModal.hidden === false && (k === '1' || k === '2')) start(parseInt(k, 10));
  });

  // reloj
  let last = performance.now();
  const tick = (now) => {
    requestAnimationFrame(tick);
    const dt = (now - last) / 1000;
    last = now;
    if (playing) { t += dt; timeEl.textContent = fmtTime(t); }
  };
  requestAnimationFrame(tick);
})();
