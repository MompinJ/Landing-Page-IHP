/* ============================================================
   DINAMICA CABINA RTG — motor
   Bloque de 6 carriles x 8 bahias en CSS 3D. La camara va montada
   en el trolley (como la cabina real), asi que el spreader queda
   fijo en el centro de la pantalla y lo que se traslada es el
   plano del patio.

   Carriles A-B -> PATIO A (si es cultura)
   Carriles C-D -> linea de inspeccion
   Carriles E-F -> PATIO B (no es cultura)

   Ciclo de la maquina: posicionar -> arriar -> cerrar twistlocks
   -> izar -> trasladar -> arriar -> abrir twistlocks.
   Con el spreader abajo no hay traslado, igual que en obra.

   Las medidas del mundo tienen que coincidir con las variables
   --cw / --cd / --bw / --bd / --bh de css/styles.css.
   ============================================================ */

(() => {
  // ---------- geometria del mundo ----------
  const CARRILES = 6;
  const BAHIAS = 8;
  const CW = 150;              // ancho de carril
  const CD = 330;              // largo de bahia
  const BW = 134, BD = 300, BH = 78;
  const Z_ARRIBA = 200;        // altura de traslado
  const Z_PISO = 6;            // spreader posado en piso vacio
  const FILAS_LLEGADA = [2, 3];

  const T_MOVE = 0.2;          // segundos base de traslado
  const T_MOVE_CELDA = 0.09;
  const T_MOVE_MAX = 1;
  const T_HOIST = 780;         // ms de izado / arriado
  const T_LOCK = 340;          // ms de twistlocks
  const REPEAT_MS = 320;

  // ---------- los 16 contenedores ----------
  const CAJAS = [
    {
      rot: 'HISTORIA\nY TRADICIONES', color: 'navy', cultura: true,
      why: 'Lo que el grupo ha vivido junto y sigue contando —el origen de la terminal, las anecdotas, los aniversarios— es la memoria compartida de la que nace todo lo demas.'
    },
    {
      rot: 'SEGURIDAD', color: 'verde', cultura: true,
      why: 'Cuando cuidarse y cuidar al companero es un habito y no un reglamento colgado en la pared, la seguridad dejo de ser un procedimiento y se volvio cultura.'
    },
    {
      rot: 'LIDERAZGO', color: 'gris', cultura: true,
      why: 'El ejemplo de quien dirige ensena lo que de verdad se premia y lo que se tolera. La cultura se aprende mirando al jefe, no leyendo el manual.'
    },
    {
      rot: 'VALORES', color: 'navy', cultura: true,
      why: 'Son el nucleo de la cultura: lo que el grupo considera correcto aunque nadie este mirando y no haya auditoria de por medio.'
    },
    {
      rot: 'DISCIPLINA', color: 'acero', cultura: true,
      why: 'Es un habito compartido: como se cumple lo acordado cuando no hay supervisor cerca. Eso no lo fija un reglamento, lo sostiene el grupo.'
    },
    {
      rot: 'NORMAS Y\nCOMPORTAMIENTOS', color: 'verde', cultura: true,
      why: 'Las reglas no escritas —como se saluda, como se reporta un error, que se deja pasar— son cultura en estado puro.'
    },
    {
      rot: 'DINERO', color: 'cielo', cultura: false,
      why: 'Es un recurso, no una creencia compartida. La cultura influye en como se gasta y se cuida, pero el dinero en si no forma parte de ella.'
    },
    {
      rot: 'ESTRUCTURA\nORGANIZACIONAL', color: 'navy', cultura: false,
      why: 'El organigrama es un diseno formal: se puede redibujar en una junta. La cultura no cambia con un memorandum ni con una reestructura.'
    },
    {
      rot: 'COMUNICACION', color: 'acero', cultura: true,
      why: 'No hablamos del correo ni del radio, sino del como: si se puede decir lo que no funciona, si las malas noticias suben. Ese como es cultural.'
    },
    {
      rot: 'AMISTAD', color: 'verde', cultura: true,
      why: 'Las relaciones informales y la confianza entre companeros son las que sostienen el dia a dia cuando el procedimiento no alcanza.'
    },
    {
      rot: 'JERARQUIA', color: 'gris', cultura: true,
      why: 'Cuidado con esta: el organigrama no es cultura, pero como se vive la autoridad —a quien se le habla de tu, a quien nadie contradice— si lo es.'
    },
    {
      rot: 'CLIENTES', color: 'oxido', cultura: false,
      why: 'Son un actor externo. Como los tratamos si es cultura; ellos, como tales, no forman parte de la cultura de la organizacion.'
    },
    {
      rot: 'TECNOLOGIA\nE INNOVACION', color: 'navy', cultura: false,
      why: 'Son herramientas y capacidades: se compran y se instalan. La cultura decide si se usan o se quedan en la caja, pero no se compra ni se instala.'
    },
    {
      rot: 'ENTORNO\nLABORAL', color: 'acero', cultura: true,
      why: 'El clima que se respira —si la gente se siente segura de opinar o prefiere callarse— es cultura vivida, no infraestructura.'
    },
    {
      rot: 'IDENTIDAD', color: 'oxido', cultura: true,
      why: 'El nosotros: quienes creemos que somos como grupo y que nos hace distintos. Es la capa mas profunda de la cultura.'
    },
    {
      rot: 'PRESION EXTERNA\nY COMPETENCIA', color: 'navy', cultura: false,
      why: 'Viene de afuera: mercado, regulacion, competidores. Es el contexto que presiona a la cultura, no una parte de ella.'
    }
  ];

  const MATRICULAS = [
    'TNGU 4471820', 'HPHU 2210945', 'MXCU 7738110', 'TNGU 9042317',
    'HPHU 5514208', 'MXCU 3390761', 'TNGU 8127433', 'HPHU 6605192',
    'MXCU 1748036', 'TNGU 2963584', 'HPHU 4082715', 'MXCU 5310927',
    'TNGU 7194602', 'HPHU 3627458', 'MXCU 9805143', 'TNGU 6438029'
  ];

  // ---------- DOM ----------
  const $ = (id) => document.getElementById(id);
  const suelo = $('suelo');
  const capaSlots = $('slots');
  const capaCajas = $('cajas');
  const capaPintura = $('pintura');
  const grua = $('grua');
  const spreader = $('spreader');
  const monitor = $('monitor');
  const orden = $('orden');
  const toast = $('toast');
  const radar = $('radar');
  const grumbo = $('grumbo');
  const btnLock = $('btn-lock');

  // ---------- estado ----------
  const g = { row: 2, col: 0, abajo: false, anclado: false, carga: null, ocupada: false };
  let slots = [];
  let cajas = [];
  let stats = { mal: 0 };

  const zonaDe = (row) => (row < 2 ? 'si' : row < 4 ? 'inspeccion' : 'no');
  const nombreCarril = (row) => String.fromCharCode(65 + row);
  // en el plano, la bahia 1 es la mas cercana a la cabina y las
  // siguientes se alejan: por eso la profundidad va en negativo
  const YT = (col) => -(col + 1) * CD;

  /* el zoom de la escena tiene que ser un numero puro, y CSS no sabe
     dividir dos longitudes, asi que se calcula aqui */
  const ajustarZoom = () => {
    const z = Math.min(window.innerWidth / 1500, window.innerHeight / 900);
    document.documentElement.style.setProperty('--zoom', z.toFixed(3));
  };
  window.addEventListener('resize', ajustarZoom);

  // ---------- avisos ----------
  let toastTimer = 0;
  const decir = (msg, tipo = '') => {
    toast.hidden = false;
    toast.className = `toast ${tipo}`;
    toast.textContent = msg;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { toast.hidden = true; }, 2300);
  };

  const enMonitor = (titulo, texto, tipo = '') => {
    monitor.className = `monitor ${tipo}`;
    $('monitor-titulo').textContent = titulo;
    $('monitor-texto').innerHTML = texto;
  };

  // ---------- construccion del bloque ----------
  const pintarZonas = () => {
    capaPintura.innerHTML = '';
    const zonas = [
      { clase: 'si', desde: 0, hasta: 2, texto: 'PATIO A\nSI ES CULTURA' },
      { clase: 'in', desde: 2, hasta: 4, texto: 'LINEA DE\nINSPECCION' },
      { clase: 'no', desde: 4, hasta: 6, texto: 'PATIO B\nNO ES CULTURA' }
    ];
    zonas.forEach((z) => {
      const banda = document.createElement('div');
      banda.className = `zona zona--${z.clase}`;
      banda.style.left = `${z.desde * CW}px`;
      banda.style.top = `${YT(BAHIAS - 1)}px`;
      banda.style.width = `${(z.hasta - z.desde) * CW}px`;
      banda.style.height = `${(BAHIAS + 0.5) * CD}px`;
      capaPintura.appendChild(banda);

      for (let b = 0; b < BAHIAS; b += 3) {
        const marca = document.createElement('div');
        marca.className = `marca-piso marca-piso--${z.clase}`;
        marca.style.left = `${z.desde * CW}px`;
        marca.style.top = `${YT(b) + CD * 0.36}px`;
        marca.style.width = `${(z.hasta - z.desde) * CW}px`;
        marca.style.height = `${CD * 0.3}px`;
        marca.dataset.bahia = b;
        marca.innerHTML = `<b>${z.texto}</b>`;
        capaPintura.appendChild(marca);
      }
    });
  };

  /* bloques vecinos: no se juegan, pero sin ellos el patio se ve
     como una isla flotando en asfalto */
  const COLORES_DECO = ['#26333f', '#2f4150', '#3a4a3f', '#4a3b34', '#334255', '#2b3a45'];
  const pintarVecinos = () => {
    const columnas = [-2.7, -1.45, CARRILES + 0.45, CARRILES + 1.7];
    columnas.forEach((cx, i) => {
      for (let b = 0; b < BAHIAS; b++) {
        const pisos = (b + i) % 3 === 0 ? 2 : 1;
        for (let p = 0; p < pisos; p++) {
          const el = document.createElement('div');
          el.className = 'caja caja--deco';
          el.style.setProperty('--c', COLORES_DECO[(b * 3 + i * 2 + p) % COLORES_DECO.length]);
          el.style.left = `${cx * CW + (CW - BW) / 2}px`;
          el.style.top = `${YT(b) + (CD - BD) / 2}px`;
          el.style.transform = `translateZ(${p * BH}px)`;
          el.dataset.bahia = b;
          el.innerHTML =
            `<div class="cara cara--lado cara--lado--izq"></div>` +
            `<div class="cara cara--lado cara--lado--der"></div>` +
            `<div class="cara cara--frente"></div>` +
            `<div class="cara cara--top"></div>`;
          capaPintura.appendChild(el);
        }
      }
    });
  };

  const construirSlots = () => {
    capaSlots.innerHTML = '';
    slots = [];
    for (let r = 0; r < CARRILES; r++) {
      slots.push(new Array(BAHIAS).fill(null));
      for (let c = 0; c < BAHIAS; c++) {
        const s = document.createElement('div');
        s.className = 'slot';
        s.style.left = `${r * CW}px`;
        s.style.top = `${YT(c)}px`;
        s.style.width = `${CW}px`;
        s.style.height = `${CD}px`;
        s.addEventListener('click', () => irA(r, c));
        capaSlots.appendChild(s);
      }
    }
  };

  const nodoCaja = (caja) => {
    const el = document.createElement('div');
    el.className = `caja caja--${caja.color}`;
    el.innerHTML =
      `<div class="cara cara--lado cara--lado--izq"></div>` +
      `<div class="cara cara--lado cara--lado--der"></div>` +
      `<div class="cara cara--frente"><span>${caja.mat}</span></div>` +
      `<div class="cara cara--top"><span class="rot">${caja.rot}</span><span class="caja__marca"></span></div>`;
    return el;
  };

  const colocarNodo = (caja, row, col) => {
    caja.el.classList.remove('caja--gancho');
    caja.el.style.transform = '';
    capaCajas.appendChild(caja.el);
    caja.el.style.left = `${row * CW + (CW - BW) / 2}px`;
    caja.el.style.top = `${YT(col) + (CD - BD) / 2}px`;
  };

  const repartir = () => {
    capaCajas.innerHTML = '';
    const mazo = CAJAS.map((c, i) => ({ ...c, mat: MATRICULAS[i] }));
    for (let i = mazo.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [mazo[i], mazo[j]] = [mazo[j], mazo[i]];
    }
    cajas = mazo;
    cajas.forEach((caja, i) => {
      const row = FILAS_LLEGADA[Math.floor(i / BAHIAS)];
      const col = i % BAHIAS;
      caja.el = nodoCaja(caja);
      caja.row = row;
      caja.col = col;
      slots[row][col] = caja;
      colocarNodo(caja, row, col);
    });
  };

  // ---------- camara y grua ----------
  /* Todo lo que queda mas cerca del observador que el plano de la
     camara (perspective) se proyectaria invertido arriba, que es el
     artefacto clasico del 3D en CSS. Por eso el asfalto y las bandas
     se recortan por delante y las bahias que quedan a la espalda
     se apagan. */
  const VISTA_ATRAS = 2;   // bahias visibles por detras de la camara
  const RECORTE = 900;     // px de asfalto por delante de la camara

  const recortar = () => {
    const cy = YT(g.col) + CD / 2;
    const asfalto = suelo.querySelector('.asfalto');
    asfalto.style.top = `${cy - 6800}px`;
    asfalto.style.height = `${6800 + RECORTE}px`;

    capaPintura.querySelectorAll('.zona').forEach((z) => {
      z.style.height = `${cy + RECORTE - YT(BAHIAS - 1)}px`;
    });
    capaPintura.querySelectorAll('[data-bahia]').forEach((m) => {
      m.style.display = Number(m.dataset.bahia) >= g.col - VISTA_ATRAS ? '' : 'none';
    });
    for (let r = 0; r < CARRILES; r++) {
      for (let c = 0; c < BAHIAS; c++) {
        capaSlots.children[r * BAHIAS + c].style.display = c >= g.col - VISTA_ATRAS ? '' : 'none';
      }
    }
    cajas.forEach((caja) => {
      caja.el.style.display = caja.col < 0 || caja.col >= g.col - VISTA_ATRAS ? '' : 'none';
    });
  };

  const situar = (dur) => {
    suelo.style.transitionDuration = `${dur}s`;
    suelo.style.transform =
      `translate3d(${-(g.row * CW + CW / 2)}px, ${-(YT(g.col) + CD / 2)}px, 0)`;
    grua.style.left = `${g.row * CW + (CW - BW) / 2}px`;
    grua.style.top = `${YT(g.col) + (CD - BD) / 2}px`;
    grumbo.style.backgroundPosition = `${g.row * -46 - g.col * 8}px 0`;
    capaSlots.querySelectorAll('.slot.is-aqui').forEach((s) => s.classList.remove('is-aqui'));
    const cel = capaSlots.children[g.row * BAHIAS + g.col];
    if (cel) cel.classList.add('is-aqui');
    recortar();
    pintarRadar();
  };

  const alturaPosado = () => (g.carga || slots[g.row][g.col] ? BH : Z_PISO);

  const situarZ = () => {
    grua.style.setProperty('--z', `${g.abajo ? alturaPosado() : Z_ARRIBA}px`);
  };

  /* si se pulsa algo mientras la maquina esta en maniobra, el comando
     no se tira: queda en cola y sale en cuanto termina el movimiento */
  let pendiente = null;
  const encolar = (fn) => { pendiente = { fn, t: Date.now() }; };

  const ocupar = (ms) => {
    g.ocupada = true;
    setTimeout(() => {
      g.ocupada = false;
      refrescar();
      if (pendiente && Date.now() - pendiente.t < 1200) {
        const { fn } = pendiente;
        pendiente = null;
        fn();
      } else {
        pendiente = null;
      }
    }, ms);
    refrescar();
  };

  const balancear = () => {
    grua.classList.remove('is-swing');
    void grua.offsetWidth;
    grua.classList.add('is-swing');
    setTimeout(() => grua.classList.remove('is-swing'), 1500);
  };

  const sacudir = () => {
    document.body.classList.remove('sacude');
    void document.body.offsetWidth;
    document.body.classList.add('sacude');
    setTimeout(() => document.body.classList.remove('sacude'), 340);
  };

  const irA = (row, col) => {
    if (g.ocupada) { encolar(() => irA(row, col)); return; }
    if (g.abajo) { decir('IZA EL SPREADER ANTES DE TRASLADAR', 'mal'); sacudir(); return; }
    row = Math.max(0, Math.min(CARRILES - 1, row));
    col = Math.max(0, Math.min(BAHIAS - 1, col));
    const dist = Math.abs(row - g.row) + Math.abs(col - g.col);
    if (!dist) return;
    const dur = Math.min(T_MOVE_MAX, T_MOVE + dist * T_MOVE_CELDA);
    g.row = row;
    g.col = col;
    situar(dur);
    sacudir();
    ocupar(dur * 1000);
    setTimeout(balancear, dur * 1000);
  };

  const mover = (dr, dc) => irA(g.row + dr, g.col + dc);

  // ---------- hoist ----------
  const hoist = (quiere) => {
    if (g.ocupada) { encolar(() => hoist(quiere)); return; }
    if (quiere === 'down' && g.abajo) return;
    if (quiere === 'up' && !g.abajo) return;

    if (!g.abajo) {
      if (g.carga && slots[g.row][g.col]) { decir('SLOT OCUPADO: BUSCA UN HUECO LIBRE', 'mal'); return; }
      g.abajo = true;
      situarZ();
      ocupar(T_HOIST);
      return;
    }

    if (g.anclado && !g.carga) {
      const caja = slots[g.row][g.col];
      if (caja) {
        slots[g.row][g.col] = null;
        g.carga = caja;
        caja.row = -1;
        caja.col = -1;
        caja.estado = null;
        caja.el.classList.remove('is-ok', 'is-mal');
        caja.el.classList.add('caja--gancho');
        caja.el.style.left = '0px';
        caja.el.style.top = '0px';
        grua.appendChild(caja.el);
        $('finale').hidden = true;
        enMonitor('CARGA ENGANCHADA', `<b>${caja.rot.replace(/\n/g, ' ')}</b> va en el gancho. Llevala al patio que le corresponde.`);
        contar();
      }
    }
    g.abajo = false;
    situarZ();
    ocupar(T_HOIST);
  };

  // ---------- twistlocks ----------
  const twist = () => {
    if (g.ocupada) { encolar(twist); return; }
    if (!g.abajo) { decir('ARRIA EL SPREADER PARA OPERAR LOS TWISTLOCKS', 'mal'); return; }

    if (g.anclado) {
      if (g.carga) {
        const caja = g.carga;
        g.carga = null;
        caja.row = g.row;
        caja.col = g.col;
        slots[g.row][g.col] = caja;
        colocarNodo(caja, g.row, g.col);
        evaluar(caja);
      }
      g.anclado = false;
      grua.classList.remove('is-locked');
      ocupar(T_LOCK);
      return;
    }

    if (!g.carga && !slots[g.row][g.col]) { decir('NO HAY CAJA BAJO EL SPREADER', 'mal'); return; }
    g.anclado = true;
    grua.classList.add('is-locked');
    ocupar(T_LOCK);
  };

  // ---------- evaluacion ----------
  const evaluar = (caja) => {
    const zona = zonaDe(caja.row);
    const marca = caja.el.querySelector('.caja__marca');
    caja.el.classList.remove('is-ok', 'is-mal');
    const nombre = caja.rot.replace(/\n/g, ' ');

    if (zona === 'inspeccion') {
      marca.textContent = '';
      caja.estado = null;
      enMonitor('DE VUELTA EN INSPECCION', `<b>${nombre}</b> quedo otra vez en la linea. Decide despues a que patio va.`);
      decir('CAJA DEVUELTA A INSPECCION');
      contar();
      return;
    }

    const bien = (zona === 'si') === caja.cultura;
    caja.estado = bien ? 'ok' : 'mal';
    caja.el.classList.add(bien ? 'is-ok' : 'is-mal');
    marca.innerHTML = bien ? '&#10003;' : '&#10007;';

    if (bien) {
      decir('BIEN ESTIBADO', 'ok');
      enMonitor(caja.cultura ? 'CORRECTO // SI ES CULTURA' : 'CORRECTO // NO ES CULTURA',
        `<b>${nombre}.</b> ${caja.why}`, 'ok');
    } else {
      stats.mal++;
      decir('PATIO EQUIVOCADO', 'mal');
      sacudir();
      enMonitor(zona === 'si' ? 'PATIO EQUIVOCADO // ESTO NO ES CULTURA' : 'PATIO EQUIVOCADO // ESTO SI ES CULTURA',
        `<b>${nombre}.</b> ${caja.why}`, 'mal');
    }
    contar();
  };

  const contar = () => {
    const colocadas = cajas.filter((c) => c.row >= 0 && zonaDe(c.row) !== 'inspeccion');
    const correctas = colocadas.filter((c) => c.estado === 'ok').length;
    $('cnt-colocados').textContent = `${colocadas.length}/16`;
    $('cnt-correctos').textContent = correctas;
    $('cnt-errores').textContent = stats.mal;
    pintarRadar();
    if (colocadas.length === 16) setTimeout(() => cerrar(correctas), 1000);
  };

  // ---------- radar del tablero ----------
  const pintarRadar = () => {
    radar.innerHTML = '';
    for (let c = BAHIAS - 1; c >= 0; c--) {
      for (let r = 0; r < CARRILES; r++) {
        const cel = document.createElement('i');
        const zona = zonaDe(r);
        cel.className = `rcel rcel--${zona === 'inspeccion' ? 'in' : zona}`;
        const caja = slots[r] ? slots[r][c] : null;
        if (caja) {
          cel.classList.add('tiene');
          if (caja.estado) cel.classList.add(caja.estado);
        }
        if (r === g.row && c === g.col) cel.classList.add('grua');
        radar.appendChild(cel);
      }
    }
    $('radar-pos').textContent = `BAHIA ${String(g.col + 1).padStart(2, '0')} · CARRIL ${nombreCarril(g.row)}`;
  };

  // ---------- consola ----------
  const refrescar = () => {
    const debajo = slots[g.row] ? slots[g.row][g.col] : null;

    $('lmp-landed').className = g.abajo ? 'lampara on' : 'lampara';
    $('lmp-lock').className = g.anclado ? 'lampara on' : 'lampara';
    $('lmp-load').className = g.carga ? 'lampara on' : 'lampara';
    $('btn-lock-txt').textContent = g.anclado ? 'ABRIR TWISTLOCKS' : 'CERRAR TWISTLOCKS';
    btnLock.disabled = !g.abajo || g.ocupada;
    btnLock.classList.remove('is-hot');

    let txt;
    if (g.carga) {
      if (g.abajo) { txt = 'ABRE LOS TWISTLOCKS PARA SOLTAR LA CAJA AQUI'; btnLock.classList.add('is-hot'); }
      else txt = 'TRASLADA AL PATIO QUE CORRESPONDA Y ARRIA SOBRE UN HUECO LIBRE';
    } else if (g.anclado && g.abajo) {
      txt = 'TWISTLOCKS CERRADOS: IZA PARA LEVANTAR LA CAJA';
    } else if (g.abajo) {
      if (debajo) { txt = `"${debajo.rot.replace(/\n/g, ' ')}" BAJO EL SPREADER: CIERRA TWISTLOCKS`; btnLock.classList.add('is-hot'); }
      else txt = 'NO HAY CAJA EN ESTE SLOT: IZA Y CAMBIA DE POSICION';
    } else {
      txt = debajo
        ? `SOBRE "${debajo.rot.replace(/\n/g, ' ')}" (${debajo.mat}): ARRIA EL SPREADER`
        : 'POSICIONA LA GRUA SOBRE UNA CAJA Y ARRIA EL SPREADER';
    }
    orden.textContent = txt;
  };

  // ---------- cierre ----------
  const cerrar = (correctas) => {
    const finale = $('finale');
    const todas = correctas === 16;
    $('finale-kicker').textContent = todas ? 'TURNO CERRADO' : 'REVISION DE PATIO';
    $('finale-titulo').textContent = todas ? 'PATIO CERTIFICADO' : 'HAY CAJAS EN EL PATIO EQUIVOCADO';
    $('finale-score').textContent = todas
      ? `16 de 16 en su patio, con ${stats.mal} ${stats.mal === 1 ? 'correccion' : 'correcciones'} durante el turno.`
      : `${correctas} de 16 en su patio. Puedes seguir operando y mover las que quedaron mal.`;

    const listaSi = $('lista-si');
    const listaNo = $('lista-no');
    listaSi.innerHTML = '';
    listaNo.innerHTML = '';
    CAJAS.forEach((base) => {
      const caja = cajas.find((c) => c.rot === base.rot);
      const li = document.createElement('li');
      li.innerHTML = `<b>${base.rot.replace(/\n/g, ' ')}</b>`;
      if (caja && caja.estado === 'mal') {
        li.className = 'fallo';
        const p = document.createElement('p');
        p.textContent = base.why;
        li.appendChild(p);
      }
      (base.cultura ? listaSi : listaNo).appendChild(li);
    });
    finale.hidden = false;
  };

  // ---------- reinicio ----------
  const reiniciar = () => {
    $('finale').hidden = true;
    stats = { mal: 0 };
    g.row = 2; g.col = 0;
    g.abajo = false; g.anclado = false; g.carga = null; g.ocupada = false;
    grua.classList.remove('is-locked');
    construirSlots();
    repartir();
    situar(0.2);
    situarZ();
    contar();
    refrescar();
    enMonitor('SISTEMA DE PATIO', 'Engancha una caja de la linea de inspeccion y llevala al patio que le toca.');
  };

  // ---------- palancas ----------
  const conPalanca = (el, resolver) => {
    let timer = 0;
    let ultimo = null;

    const aplicar = (e) => {
      const caja = el.getBoundingClientRect();
      const dx = e.clientX - (caja.left + caja.width / 2);
      const dy = e.clientY - (caja.top + caja.height / 2);
      const dir = resolver(dx, dy);
      const palanca = el.querySelector('.stick__palanca');
      if (!dir) {
        palanca.style.transform = 'translate(-50%, -50%)';
        el.querySelectorAll('.is-press').forEach((f) => f.classList.remove('is-press'));
        clearInterval(timer);
        ultimo = null;
        return;
      }
      const off = { up: [0, -13], down: [0, 13], left: [-13, 0], right: [13, 0] }[dir.eje] || [0, 0];
      palanca.style.transform = `translate(calc(-50% + ${off[0]}px), calc(-50% + ${off[1]}px))`;
      el.querySelectorAll('.is-press').forEach((f) => f.classList.remove('is-press'));
      if (dir.flecha) dir.flecha.classList.add('is-press');
      if (dir.eje === ultimo) return;
      ultimo = dir.eje;
      clearInterval(timer);
      dir.accion();
      if (dir.repite) timer = setInterval(dir.accion, REPEAT_MS);
    };

    const soltar = () => {
      clearInterval(timer);
      ultimo = null;
      el.querySelector('.stick__palanca').style.transform = 'translate(-50%, -50%)';
      el.querySelectorAll('.is-press').forEach((f) => f.classList.remove('is-press'));
    };

    el.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      el.setPointerCapture(e.pointerId);
      aplicar(e);
    });
    el.addEventListener('pointermove', (e) => { if (el.hasPointerCapture(e.pointerId)) aplicar(e); });
    ['pointerup', 'pointercancel', 'pointerleave'].forEach((ev) => el.addEventListener(ev, soltar));
  };

  const flecha = (el, clave) => el.querySelector(`.stick__flecha--${clave}`);

  conPalanca($('stick-mov'), (dx, dy) => {
    const el = $('stick-mov');
    if (Math.abs(dx) < 14 && Math.abs(dy) < 14) return null;
    if (Math.abs(dx) > Math.abs(dy)) {
      const eje = dx < 0 ? 'left' : 'right';
      return { eje, repite: true, flecha: flecha(el, eje), accion: () => mover(dx < 0 ? -1 : 1, 0) };
    }
    const eje = dy < 0 ? 'up' : 'down';
    return { eje, repite: true, flecha: flecha(el, eje), accion: () => mover(0, dy < 0 ? 1 : -1) };
  });

  conPalanca($('stick-hoist'), (dx, dy) => {
    const el = $('stick-hoist');
    if (Math.abs(dy) < 14) return null;
    const eje = dy < 0 ? 'up' : 'down';
    return { eje, repite: false, flecha: flecha(el, eje), accion: () => hoist(dy < 0 ? 'up' : 'down') };
  });

  btnLock.addEventListener('click', twist);

  window.addEventListener('keydown', (e) => {
    const k = e.key.toLowerCase();
    if (k === 'arrowup' || k === 'w') { e.preventDefault(); mover(0, 1); }
    else if (k === 'arrowdown' || k === 's') { e.preventDefault(); mover(0, -1); }
    else if (k === 'arrowleft' || k === 'a') { e.preventDefault(); mover(-1, 0); }
    else if (k === 'arrowright' || k === 'd') { e.preventDefault(); mover(1, 0); }
    else if (k === ' ') { e.preventDefault(); hoist(); }
    else if (k === 'enter') { e.preventDefault(); twist(); }
    else if (k === 'r') reiniciar();
    else if (k === 'escape') { $('overlay').hidden = true; $('finale').hidden = true; }
  });

  $('btn-entendido').addEventListener('click', () => { $('overlay').hidden = true; });
  $('btn-ayuda').addEventListener('click', () => { $('overlay').hidden = false; });
  $('btn-corregir').addEventListener('click', () => { $('finale').hidden = true; });
  $('btn-reiniciar').addEventListener('click', reiniciar);

  // ---------- arranque ----------
  ajustarZoom();
  pintarZonas();
  pintarVecinos();
  construirSlots();
  repartir();
  situar(0);
  situarZ();
  contar();
  refrescar();
})();
