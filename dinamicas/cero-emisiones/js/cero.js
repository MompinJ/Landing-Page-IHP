/* ============================================================
   DINAMICA RUTA A CERO EMISIONES — motor
   Juego de gestion: 8 decisiones operativas, dos presupuestos
   (dinero y carbono). Reventar cualquiera = fin del anio.
   La mezcla optima exige elegir DONDE conviene lo verde.
   ============================================================ */

(() => {
  // ---------- presupuestos del anio ----------
  const BUDGET_MONEY = 300;   // miles de USD
  const BUDGET_CO2 = 350;     // toneladas de CO2

  // ---------- decisiones (editar aqui) ----------
  // opciones: { name, cost (kUSD), co2 (t), note (feedback al elegir) }
  const TASKS = [
    {
      title: 'Mover 600 contenedores del muelle al patio',
      desc: 'La descarga del buque de la semana. Con que flota interna la mueves?',
      options: [
        { name: 'Tractores diesel', cost: 40, co2: 90, note: 'Barato hoy... pero el diesel se come tu tope de carbono.' },
        { name: 'Flota electrica de patio', cost: 65, co2: 25, note: 'Mas inversion, 70 por ciento menos emisiones en el patio.' }
      ]
    },
    {
      title: 'Apilar y ordenar el patio',
      desc: 'Las gruas de patio trabajaran todo el anio. Cuales usas?',
      options: [
        { name: 'RTG diesel', cost: 30, co2: 70, note: 'El clasico: ruge, cuesta poco y emite mucho.' },
        { name: 'eRTG electrificado', cost: 50, co2: 18, note: 'Electrificar las RTG es de lo que mas carbono ahorra por peso.' }
      ]
    },
    {
      title: 'Enviar 300 contenedores al Bajio',
      desc: 'El cliente automotriz espera su carga tierra adentro.',
      options: [
        { name: '300 viajes de camion', cost: 90, co2: 160, note: '300 diesel en carretera: caro Y contaminante.' },
        { name: '1 tren intermodal', cost: 70, co2: 45, note: 'El tren gano en dinero Y en carbono: lo verde a veces es lo barato.' }
      ]
    },
    {
      title: 'Iluminar el patio de noche',
      desc: 'Operacion 24/7: el patio no puede quedarse a oscuras.',
      options: [
        { name: 'Halogenuro metalico', cost: 12, co2: 30, note: 'Lo de siempre: consume el triple de energia.' },
        { name: 'Torres LED', cost: 18, co2: 9, note: 'Mas caras de instalar; se pagan solas en energia.' }
      ]
    },
    {
      title: 'Energia para 80 reefers conectados',
      desc: 'La fruta no espera: los reefers consumen dia y noche.',
      options: [
        { name: 'Red convencional', cost: 25, co2: 55, note: 'La red de siempre, con su mezcla de combustoleo.' },
        { name: 'Contrato de energia eolica', cost: 32, co2: 8, note: 'Un PPA renovable: mismos enchufes, otra huella.' }
      ]
    },
    {
      title: 'Buque atracado 24 horas',
      desc: 'Mientras carga, el buque necesita energia a bordo.',
      options: [
        { name: 'Sus motores auxiliares', cost: 0, co2: 120, note: 'Gratis para la terminal... y la chimenea encendida todo el dia.' },
        { name: 'Energia desde el muelle', cost: 45, co2: 15, note: 'Cold ironing: el buque apaga maquinas y se enchufa a tierra.' }
      ]
    },
    {
      title: 'Flota de supervision e inspeccion',
      desc: 'Los supervisores recorren la terminal todo el dia.',
      options: [
        { name: 'Pickups a gasolina', cost: 15, co2: 22, note: 'Comodas, si; necesarias para todo recorrido, no.' },
        { name: 'Bicis + vehiculos electricos', cost: 20, co2: 3, note: 'La mitad de los recorridos cabian en una bici.' }
      ]
    },
    {
      title: 'Pico de demanda electrica del verano',
      desc: 'El patio electrificado exige mas potencia en horas pico.',
      options: [
        { name: 'Generadores diesel de respaldo', cost: 20, co2: 80, note: 'El respaldo facil que ensucia todo lo demas que lograste.' },
        { name: 'Banco de baterias', cost: 55, co2: 6, note: 'Carga en la noche, descarga en el pico: cero humo.' }
      ]
    }
  ];

  // referencia: el anio "todo sucio" (la opcion de mas CO2 de cada decision)
  const BASELINE_CO2 = TASKS.reduce((s, t) => s + Math.max(...t.options.map((o) => o.co2)), 0);

  // ---------- DOM ----------
  const $ = (id) => document.getElementById(id);
  const barMoney = $('bar-money'), barCo2 = $('bar-co2');
  const bMoney = $('b-money'), bCo2 = $('b-co2');
  const hudStep = $('hud-step'), hudStatus = $('hud-status');
  const taskEl = $('task'), optionsEl = $('options');
  const feedback = $('feedback'), finale = $('finale');

  let fbTimer = 0;
  const say = (msg, ms = 2800) => {
    feedback.hidden = false;
    feedback.textContent = msg;
    clearTimeout(fbTimer);
    fbTimer = setTimeout(() => { feedback.hidden = true; }, ms);
  };

  // ---------- estado ----------
  let idx = 0, money = 0, co2 = 0, spentCo2 = 0, playing = true;

  const fmtMoney = (v) => `$${Math.max(0, Math.round(v))}K`;
  const fmtCo2 = (v) => `${Math.max(0, Math.round(v))} t`;

  const updateBars = () => {
    bMoney.textContent = `${fmtMoney(money)} DISPONIBLES`;
    bCo2.textContent = `${fmtCo2(co2)} DE MARGEN`;
    const pm = Math.max(0, money / BUDGET_MONEY);
    const pc = Math.max(0, co2 / BUDGET_CO2);
    barMoney.style.width = `${pm * 100}%`;
    barCo2.style.width = `${pc * 100}%`;
    [[barMoney, pm], [barCo2, pc]].forEach(([bar, p]) => {
      bar.classList.toggle('is-warn', p < 0.4 && p >= 0.18);
      bar.classList.toggle('is-crit', p < 0.18);
    });
  };

  const showTask = () => {
    if (idx >= TASKS.length) { endYear(true); return; }
    const t = TASKS[idx];
    hudStep.textContent = `DECISION ${idx + 1}/${TASKS.length}`;
    $('task-kicker').textContent = `DECISION ${String(idx + 1).padStart(2, '0')}`;
    $('task-title').textContent = t.title;
    $('task-desc').textContent = t.desc;
    optionsEl.innerHTML = '';
    t.options.forEach((o, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'opt';
      b.innerHTML =
        `<span class="opt__key">${i + 1}</span>` +
        `<span class="opt__name">${o.name}</span>` +
        `<span class="opt__chips">` +
        `<span class="chip chip--cost">-$${o.cost}K</span>` +
        `<span class="chip chip--co2">-${o.co2} tCO2</span>` +
        `</span>`;
      b.addEventListener('click', () => pick(i));
      optionsEl.appendChild(b);
    });
    // reinicia la animacion de entrada de la tarjeta
    taskEl.style.animation = 'none';
    void taskEl.offsetWidth;
    taskEl.style.animation = '';
  };

  const pick = (i) => {
    if (!playing) return;
    const o = TASKS[idx].options[i];
    money -= o.cost;
    co2 -= o.co2;
    spentCo2 += o.co2;
    updateBars();
    say(o.note.toUpperCase());

    if (money < 0) { endYear(false, 'money'); return; }
    if (co2 < 0) { endYear(false, 'co2'); return; }

    idx++;
    setTimeout(showTask, 350);
  };

  // ---------- fin de anio ----------
  const endYear = (ok, bust) => {
    playing = false;
    const avoided = BASELINE_CO2 - spentCo2;

    if (ok) {
      const score = Math.round(money * 2 + co2 * 3);
      const rank = score >= 520 ? 'Directora o director de descarbonizacion.' :
                   score >= 330 ? 'Estratega ESG.' :
                   score >= 150 ? 'Vas a media transicion.' : 'Cerraste el anio... raspando.';
      $('finale-kicker').textContent = 'CERRASTE EL ANIO';
      $('finale-title').textContent = rank;
      $('finale-score').textContent =
        `${score} PTS · SOBRARON ${fmtMoney(money)} Y ${fmtCo2(co2)} DE CARBONO`;
      $('finale-detail').textContent =
        `EVITASTE ${Math.round(avoided)} TONELADAS DE CO2 FRENTE A OPERAR TODO EN DIESEL`;
    } else {
      document.body.classList.add('shake');
      setTimeout(() => document.body.classList.remove('shake'), 500);
      $('finale-kicker').textContent = 'ANIO INTERRUMPIDO';
      $('finale-title').textContent = bust === 'money'
        ? 'Te quedaste sin presupuesto.' : 'Reventaste el tope de carbono.';
      $('finale-score').textContent = `EN LA DECISION ${idx + 1} DE ${TASKS.length}`;
      $('finale-detail').textContent = bust === 'money'
        ? 'LO VERDE RINDE MAS DONDE MAS CARBONO AHORRA POR PESO INVERTIDO: NO SE PUEDE TODO A LA VEZ'
        : 'LO BARATO SALIO CARO: EL DIESEL SE COMIO EL TOPE DEL ANIO';
    }

    // comparativa de CO2
    $('cmp-base-v').textContent = `${BASELINE_CO2} t`;
    $('cmp-you-v').textContent = `${Math.round(spentCo2)} t`;
    finale.hidden = false;
    requestAnimationFrame(() => {
      $('cmp-base').style.width = '100%';
      $('cmp-you').style.width = `${Math.min(100, (spentCo2 / BASELINE_CO2) * 100)}%`;
    });
  };

  const reset = () => {
    idx = 0;
    money = BUDGET_MONEY;
    co2 = BUDGET_CO2;
    spentCo2 = 0;
    playing = true;
    finale.hidden = true;
    feedback.hidden = true;
    $('cmp-base').style.width = '0';
    $('cmp-you').style.width = '0';
    hudStatus.textContent = 'CADA DECISION GASTA DINERO Y CARBONO: QUE NO TE FALTE NINGUNO';
    updateBars();
    showTask();
  };

  // ---------- entrada ----------
  document.addEventListener('keydown', (e) => {
    const k = e.key.toLowerCase();
    if (k === 'r') { reset(); return; }
    if (k === 'enter' && !finale.hidden) { reset(); return; }
    const n = parseInt(e.key, 10);
    if (playing && n >= 1 && n <= (TASKS[idx]?.options.length ?? 0)) pick(n - 1);
  });
  $('restart').addEventListener('click', reset);

  reset();
})();
