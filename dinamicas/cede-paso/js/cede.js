/* ============================================================
   DINAMICA CEDE EL PASO — motor
   8 escenarios nocturnos: se muestran solo las luces de otro
   buque y hay que elegir la maniobra correcta contra reloj.
   Al responder se revela la silueta (rot = rumbo del otro) y la
   regla que aplica. Puntos por acierto y rapidez.
   NOTA: reglamento simplificado para demo; validar con un
   experto en COLREG antes de usar como material formal.
   ============================================================ */

(() => {
  // ---------- configuracion ----------
  const TIME = 18;                 // segundos por ronda
  const PT_OK = 100, PT_FAST = 50; // acierto + bonus por rapidez
  // luces: x/y relativos al centro del buque; c: r(oja) g(verde) w(blanca)
  const SCENES = [
    {
      q: 'VES ROJA Y VERDE A LA VEZ, CON SUS DOS TOPES BLANCOS EN LINEA, JUSTO POR TU PROA',
      bearing: 0.5, dist: 0.34,
      lights: [{ x: 0, y: -34, c: 'w' }, { x: 0, y: -14, c: 'w' }, { x: -17, y: 12, c: 'r' }, { x: 17, y: 12, c: 'g' }],
      opts: ['CAIGO A ESTRIBOR', 'MANTENGO RUMBO Y VELOCIDAD', 'CAIGO A BABOR'],
      ok: 0, rot: 180, type: 'MOTOR DE VUELTA ENCONTRADA',
      why: 'De frente: LOS DOS caen a estribor para pasar babor con babor.'
    },
    {
      q: 'POR TU AMURA DE BABOR: UNA LUZ VERDE CON SU TOPE BLANCO ARRIBA',
      bearing: 0.26, dist: 0.32,
      lights: [{ x: 0, y: -26, c: 'w' }, { x: 15, y: 10, c: 'g' }],
      opts: ['CAIGO A ESTRIBOR YA', 'MANTENGO RUMBO Y VELOCIDAD, VIGILANDO', 'PARO MAQUINAS'],
      ok: 1, rot: 90, type: 'MOTOR CRUZANDO DESDE TU BABOR',
      why: 'Le ves la VERDE: el te ve en ROJA y el debe ceder. Tu mantienes rumbo y velocidad... sin dejar de vigilar.'
    },
    {
      q: 'POR TU AMURA DE ESTRIBOR: UNA LUZ ROJA CON SU TOPE BLANCO ARRIBA',
      bearing: 0.74, dist: 0.32,
      lights: [{ x: 0, y: -26, c: 'w' }, { x: -15, y: 10, c: 'r' }],
      opts: ['ACELERO Y LE CRUZO POR LA PROA', 'MANTENGO: TENGO PREFERENCIA', 'CAIGO A ESTRIBOR Y PASO POR SU POPA'],
      ok: 2, rot: 270, type: 'MOTOR CRUZANDO DESDE TU ESTRIBOR',
      why: 'Le ves la ROJA: TU cedes. Caes a estribor y pasas por su POPA, nunca por su proa.'
    },
    {
      q: 'JUSTO POR TU PROA, SOLO UNA LUZ BLANCA BAJA... Y CADA VEZ LA VES MAS CERCA',
      bearing: 0.5, dist: 0.3,
      lights: [{ x: 0, y: 4, c: 'w' }],
      opts: ['MANTENGO: EL DE ADELANTE DEBE APARTARSE', 'ME APARTO POR CUALQUIER BANDA: YO LO ALCANZO', 'DOY CINCO PITADAS Y SIGO'],
      ok: 1, rot: 0, type: 'BUQUE ALCANZADO (SU LUZ DE POPA)',
      why: 'Solo blanca = su luz de POPA: tu lo alcanzas. El que alcanza SIEMPRE se aparta.'
    },
    {
      q: 'POR TU PROA: DOS LUCES ROJAS EN LINEA VERTICAL',
      bearing: 0.42, dist: 0.34,
      lights: [{ x: 0, y: -30, c: 'r' }, { x: 0, y: -10, c: 'r' }],
      opts: ['ME APARTO CON TIEMPO Y DE SOBRA', 'MANTENGO: YO VOY A MOTOR', 'ME ACERCO A VER SI NECESITA AYUDA'],
      ok: 0, rot: 210, type: 'BUQUE SIN GOBIERNO',
      why: 'Dos rojas en vertical = SIN GOBIERNO: no puede maniobrar. Apartate amplio y con tiempo.'
    },
    {
      q: 'ROJA - BLANCA - ROJA EN LINEA VERTICAL, AVANZANDO DESPACIO POR TU ESTRIBOR',
      bearing: 0.66, dist: 0.34,
      lights: [{ x: 0, y: -36, c: 'r' }, { x: 0, y: -18, c: 'w' }, { x: 0, y: 0, c: 'r' }],
      opts: ['TENGO PREFERENCIA: EL ME VE EN VERDE', 'LE PIDO PASO POR RADIO Y SIGO', 'ME APARTO: SU MANIOBRA ESTA RESTRINGIDA'],
      ok: 2, rot: 250, type: 'MANIOBRA RESTRINGIDA (DRAGA / CABLE)',
      why: 'Roja-blanca-roja = maniobra RESTRINGIDA (draga, cable, buzos): no puede apartarse el. Cedes tu.'
    },
    {
      q: 'VERDE SOBRE BLANCA EN EL PALO, Y ABAJO SE LE VE UNA ROJA DE COSTADO',
      bearing: 0.3, dist: 0.33,
      lights: [{ x: 0, y: -34, c: 'g' }, { x: 0, y: -16, c: 'w' }, { x: -13, y: 12, c: 'r' }],
      opts: ['ME APARTO: ESTA PESCANDO Y ARRASTRA APAREJO', 'LE PASO PEGADO POR SU POPA', 'MANTENGO: SOY MAS GRANDE'],
      ok: 0, rot: 240, type: 'PESQUERO ARRASTRANDO',
      why: 'Verde sobre blanca = pesquero ARRASTRANDO. Lleva aparejo largo: apartate de sobra, el tiene preferencia.'
    },
    {
      q: 'POR TU AMURA DE BABOR: UNA VERDE... PERO SIN NINGUNA LUZ DE TOPE',
      bearing: 0.3, dist: 0.3,
      lights: [{ x: 13, y: 6, c: 'g' }],
      opts: ['MANTENGO: LE VEO LA VERDE, EL CEDE', 'CEDO: SIN TOPE ES VELERO, LA VELA MANDA', 'DOY UNA PITADA LARGA Y SIGO'],
      ok: 1, rot: 90, type: 'VELERO NAVEGANDO A VELA',
      why: 'Sin luz de tope no es de motor: es VELERO. El motor se aparta de la vela, aunque le veas la verde.'
    }
  ];
  const TOTAL = SCENES.length;

  // ---------- DOM ----------
  const $ = (id) => document.getElementById(id);
  const vessel = $('vessel'), lightsEl = $('lights'), sil = $('sil'), vType = $('vessel-type');
  const question = $('question'), optionsEl = $('options');
  const hudRound = $('hud-round'), hudScore = $('hud-score');
  const timerEl = document.querySelector('.timer'), timerFill = $('timer-fill');
  const toast = $('toast');
  const verdict = $('verdict'), verdictCard = $('verdict-card');
  const intro = $('intro'), finale = $('finale');

  let toastTimer = 0;
  const say = (msg) => {
    toast.hidden = false;
    toast.textContent = msg;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { toast.hidden = true; }, 2600);
  };

  // ---------- estado ----------
  const st = {
    round: 0, score: 0, hits: 0,
    timeLeft: TIME, order: [],
    phase: 'intro'          // intro | play | verdict | over
  };

  // ---------- ronda ----------
  const setupRound = () => {
    const s = SCENES[st.round];
    st.phase = 'play';
    st.timeLeft = TIME;
    verdict.hidden = true;

    vessel.style.left = `${s.bearing * 100}%`;
    vessel.style.top = `${s.dist * 100}%`;
    vessel.classList.remove('is-revealed');
    vType.hidden = true;

    lightsEl.innerHTML = '';
    s.lights.forEach((l) => {
      const d = document.createElement('i');
      d.className = `nlight nlight--${l.c}`;
      d.style.left = `${l.x}px`;
      d.style.top = `${l.y}px`;
      lightsEl.appendChild(d);
    });
    sil.style.rotate = `${s.rot - 90}deg`;   // la silueta apunta a la derecha por defecto

    question.textContent = s.q;

    // opciones barajadas
    st.order = s.opts.map((_, i) => i);
    for (let i = st.order.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [st.order[i], st.order[j]] = [st.order[j], st.order[i]];
    }
    optionsEl.innerHTML = '';
    st.order.forEach((oi, pos) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'opt';
      b.innerHTML = `<b>${pos + 1}</b>${s.opts[oi]}`;
      b.addEventListener('click', () => answer(oi, b));
      optionsEl.appendChild(b);
    });

    updateHud();
  };

  const reveal = () => {
    const s = SCENES[st.round];
    vessel.classList.add('is-revealed');
    vType.textContent = s.type;
    vType.hidden = false;
  };

  const answer = (oi, btn) => {
    if (st.phase !== 'play') return;
    st.phase = 'verdict';
    const s = SCENES[st.round];
    const good = oi === s.ok;

    [...optionsEl.children].forEach((b, pos) => {
      b.disabled = true;
      if (st.order[pos] === s.ok) b.classList.add('is-right');
      else if (b === btn && !good) b.classList.add('is-wrong');
    });
    reveal();

    let pts = 0;
    if (good) {
      st.hits++;
      pts = PT_OK + Math.round(PT_FAST * (st.timeLeft / TIME));
      st.score += pts;
    }
    verdictCard.className = `verdict__card ${good ? 'is-good' : 'is-bad'}`;
    $('vd-kicker').textContent = good ? `CORRECTO · +${pts} PTS` : (oi < 0 ? 'SE ACABO EL TIEMPO' : 'INCORRECTO');
    $('vd-title').textContent = s.type;
    $('vd-detail').textContent = s.why;
    $('vd-next').textContent = st.round >= TOTAL - 1 ? 'VER RESULTADO' : 'SIGUIENTE';
    verdict.hidden = false;
    updateHud();
  };

  const nextStep = () => {
    verdict.hidden = true;
    st.round++;
    if (st.round >= TOTAL) { showFinale(); return; }
    setupRound();
  };

  const showFinale = () => {
    st.phase = 'over';
    const rank = st.score >= 1020 ? 'Practico mayor del puerto.' :
                 st.score >= 780 ? 'Oficial de guardia confiable.' :
                 st.score >= 520 ? 'Timonel prometedor.' : 'Vigia dormido.';
    $('finale-kicker').textContent = 'FIN DE LA GUARDIA';
    $('finale-title').textContent = rank;
    $('finale-score').textContent = `${st.score} PTS`;
    $('finale-detail').textContent = `${st.hits} DE ${TOTAL} MANIOBRAS CORRECTAS`;
    finale.hidden = false;
  };

  const updateHud = () => {
    hudRound.textContent = `${Math.min(st.round + 1, TOTAL)}/${TOTAL}`;
    hudScore.textContent = st.score;
  };

  const reset = () => {
    st.round = 0; st.score = 0; st.hits = 0;
    st.phase = 'intro';
    finale.hidden = true;
    verdict.hidden = true;
    intro.hidden = false;
    setupIdle();
    updateHud();
  };

  // escena de fondo mientras esta abierta la intro
  const setupIdle = () => {
    const s = SCENES[0];
    vessel.style.left = `${s.bearing * 100}%`;
    vessel.style.top = `${s.dist * 100}%`;
    vessel.classList.remove('is-revealed');
    vType.hidden = true;
    lightsEl.innerHTML = '';
    question.textContent = '...';
    optionsEl.innerHTML = '';
    timerFill.style.width = '100%';
    timerEl.classList.remove('is-low');
  };

  const startGame = () => {
    intro.hidden = true;
    if (st.phase === 'intro') {
      if (st.round === 0 && !st.score && optionsEl.children.length === 0) setupRound();
      else st.phase = 'play';
    }
  };

  const openHelp = () => {
    if (st.phase !== 'play') return;
    st.phase = 'intro';
    intro.hidden = false;
  };

  // ---------- entrada ----------
  document.addEventListener('keydown', (e) => {
    const k = e.key.toLowerCase();
    if (k === 'r') reset();
    if (k === 'h') { if (intro.hidden) openHelp(); else startGame(); }
    if ((k === 'enter' || k === ' ') && !intro.hidden) { e.preventDefault(); startGame(); return; }
    if (k === 'enter' && !verdict.hidden) { nextStep(); return; }
    if (k === 'enter' && st.phase === 'over' && !finale.hidden) reset();
    if (st.phase === 'play' && ['1', '2', '3'].includes(k)) {
      const pos = Number(k) - 1;
      const btn = optionsEl.children[pos];
      if (btn) answer(st.order[pos], btn);
    }
  });
  $('start').addEventListener('click', startGame);
  $('help').addEventListener('click', openHelp);
  $('vd-next').addEventListener('click', nextStep);
  $('restart').addEventListener('click', reset);

  // ---------- loop (timer) ----------
  let last = performance.now();
  const tick = (now) => {
    requestAnimationFrame(tick);
    const dt = Math.max(0, Math.min((now - last) / 1000, 0.05));
    last = now;
    if (st.phase !== 'play') return;
    st.timeLeft -= dt;
    if (st.timeLeft <= 0) {
      st.timeLeft = 0;
      answer(-1, null);
      say('TE QUEDASTE MIRANDO LAS LUCES: EN EL PUENTE SE DECIDE A TIEMPO');
    }
    timerFill.style.width = `${(st.timeLeft / TIME) * 100}%`;
    timerEl.classList.toggle('is-low', st.timeLeft < TIME * 0.28);
  };

  reset();
  requestAnimationFrame(tick);
})();
