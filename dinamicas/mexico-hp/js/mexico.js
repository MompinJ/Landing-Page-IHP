/* ============================================================
   DINAMICA RUTA HUTCHISON MEXICO — motor
   - Mapa proyectado de lat/lon reales
   - Vehiculo anfibio: barco en el mar, GRUA MOVIL en tierra
     mexicana (EUA y Guatemala siguen bloqueados)
   - Al llegar a una SEDE salta el modal de pantalla completa
     con todas sus unidades de negocio (ACEPTAR para seguir)
   - Tren intermodal Veracruz -> Hidalgo con la tecla T
   ============================================================ */

(() => {
  // ---------- sedes y unidades de negocio (editables) ----------
  const LOCATIONS = [
    {
      label: 'ENSENADA', chip: 'ENSENADA', state: 'BAJA CALIFORNIA · PACIFICO',
      mark: [-116.62, 31.85], dock: [-117.05, 31.72],
      intro: 'La puerta del Pacifico en Baja California, a un paso del corredor con California.',
      units: [
        { code: 'EIT', name: 'Ensenada International Terminal', desc: 'Terminal de contenedores y carga general; tambien atiende cruceros.' }
      ]
    },
    {
      label: 'MANZANILLO', chip: 'MANZANILLO', state: 'COLIMA · PACIFICO',
      mark: [-104.32, 19.06], dock: [-104.75, 18.72],
      intro: 'El puerto de contenedores mas activo del Pacifico mexicano y eje del comercio con Asia.',
      units: [
        { code: 'TIMSA', name: 'Terminal Internacional de Manzanillo', desc: 'Terminal especializada de contenedores con conexion ferroviaria al centro del pais.' }
      ]
    },
    {
      label: 'LAZARO CARDENAS', chip: 'LAZARO', state: 'MICHOACAN · PACIFICO',
      mark: [-102.18, 17.94], dock: [-102.35, 17.5],
      intro: 'Aguas profundas para los buques mas grandes del Pacifico y salida intermodal al Bajio y CDMX.',
      units: [
        { code: 'LCT', name: 'Lazaro Cardenas Terminal Portuaria de Contenedores', desc: 'Terminal de contenedores de aguas profundas con gruas super post-panamax.' },
        { code: 'LCMT', name: 'Lazaro Cardenas Multipurpose Terminal', desc: 'Terminal de usos multiples: carga general, automoviles y carga de proyecto.' }
      ]
    },
    {
      label: 'VERACRUZ', chip: 'VERACRUZ', state: 'VERACRUZ · GOLFO DE MEXICO',
      mark: [-96.13, 19.2], dock: [-95.7, 19.28],
      intro: 'El puerto historico del Golfo concentra tres unidades de negocio del grupo.',
      units: [
        { code: 'ICAVE', name: 'Internacional de Contenedores Asociados de Veracruz', desc: 'La principal terminal de contenedores del puerto, presente en la ampliacion del nuevo puerto.' },
        { code: 'TNG', name: 'Talleres Navales del Golfo', desc: 'Astillero de reparacion y conversion de buques en el Golfo de Mexico.' },
        { code: 'HPMX', name: 'Hutchison Ports Mexico', desc: 'La organizacion que coordina las operaciones del grupo en el pais.' }
      ]
    },
    {
      label: 'HIDALGO', chip: 'HIDALGO', state: 'ATITALAQUIA · TIERRA ADENTRO',
      mark: [-99.22, 20.06], dock: null, // se llega en grua o en tren
      intro: 'El puerto seco del grupo: la carga del Golfo llega por ferrocarril al corazon industrial del pais.',
      units: [
        { code: 'TILH', name: 'Terminal Intermodal Logistica de Hidalgo', desc: 'Patio ferroviario intermodal con despacho aduanal interior, conectado por tren con Veracruz.' }
      ]
    }
  ];

  const RAIL = [[-96.13, 19.2], [-96.9, 19.4], [-97.8, 19.62], [-98.6, 19.95], [-99.22, 20.06]];
  const SHIP_START = [-109.2, 21.3];
  const DOCK_R = 34;       // radio de llegada por mar
  const LAND_R = 30;       // radio de llegada por tierra (al pin)
  const VERACRUZ_I = 3, HIDALGO_I = 4;

  // ---------- costa de Mexico (lon, lat simplificados) ----------
  const MX = [
    [-117.12, 32.53], [-116.62, 31.85], [-116.0, 30.4], [-115.2, 29.0],
    [-114.2, 27.9], [-113.2, 26.8], [-112.3, 25.5], [-111.5, 24.6],
    [-110.0, 22.95], [-109.4, 23.2], [-110.3, 24.15], [-111.0, 25.5],
    [-112.0, 27.0], [-113.1, 28.6], [-114.0, 29.9], [-114.55, 31.0],
    [-114.75, 31.75], [-114.3, 31.6], [-113.5, 31.25], [-112.4, 29.9],
    [-111.5, 28.8], [-110.9, 27.9], [-109.8, 26.7], [-109.0, 25.6],
    [-107.9, 24.6], [-106.4, 23.2], [-105.4, 21.6], [-105.25, 20.65],
    [-105.65, 20.4], [-104.9, 19.6], [-104.32, 19.06], [-103.5, 18.55],
    [-102.18, 17.94], [-101.0, 17.3], [-99.9, 16.83], [-98.5, 16.3],
    [-96.5, 15.65], [-95.2, 16.15], [-94.1, 16.1], [-93.0, 15.4],
    [-92.25, 14.55], [-92.15, 15.1], [-91.75, 16.07], [-90.45, 16.08],
    [-90.4, 17.25], [-89.15, 17.82], [-88.3, 18.5], [-87.85, 19.6],
    [-87.45, 20.2], [-86.75, 21.15], [-87.1, 21.6], [-88.5, 21.55],
    [-89.65, 21.28], [-90.35, 21.0], [-90.5, 19.85], [-91.3, 18.95],
    [-91.8, 18.65], [-92.65, 18.55], [-94.4, 18.15], [-95.75, 18.77],
    [-96.13, 19.2], [-96.45, 20.0], [-97.35, 20.95], [-97.85, 22.25],
    [-97.7, 23.8], [-97.45, 25.2], [-97.5, 25.95], [-99.1, 26.4],
    [-99.5, 27.5], [-100.5, 28.7], [-101.4, 29.77], [-102.3, 29.88],
    [-103.1, 29.0], [-104.4, 29.55], [-105.0, 30.6], [-106.45, 31.78],
    [-108.2, 31.78], [-108.2, 31.33], [-111.07, 31.33], [-114.72, 32.6]
  ];
  // EUA y Guatemala: decorativos y SIEMPRE bloqueados
  const USA = [
    [-117.12, 32.53], [-114.72, 32.6], [-111.07, 31.33], [-108.2, 31.33],
    [-108.2, 31.78], [-106.45, 31.78], [-105.0, 30.6], [-104.4, 29.55],
    [-103.1, 29.0], [-102.3, 29.88], [-101.4, 29.77], [-100.5, 28.7],
    [-99.5, 27.5], [-99.1, 26.4], [-97.5, 25.95],
    [-96.8, 26.4], [-96.8, 33.4], [-117.4, 33.4], [-117.4, 32.8]
  ];
  const GT = [
    [-92.25, 14.55], [-92.15, 15.1], [-91.75, 16.07], [-90.45, 16.08],
    [-90.4, 17.25], [-89.15, 17.82], [-88.3, 18.5],
    [-87.9, 17.0], [-88.6, 14.9], [-90.5, 13.9], [-92.0, 14.1]
  ];

  // ---------- proyeccion ----------
  const VW = 1000, VH = 690;
  const px = ([lon, lat]) => [(lon + 118.5) * 31, (33.6 - lat) * 33.5];

  const mxPoly = MX.map(px);
  const usaPoly = USA.map(px);
  const gtPoly = GT.map(px);

  const inPoly = (pt, poly) => {
    let inside = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const [xi, yi] = poly[i], [xj, yj] = poly[j];
      if ((yi > pt[1]) !== (yj > pt[1]) &&
          pt[0] < ((xj - xi) * (pt[1] - yi)) / (yj - yi) + xi) inside = !inside;
    }
    return inside;
  };

  // ---------- construir el mapa SVG ----------
  const svg = document.getElementById('map');
  svg.setAttribute('viewBox', `0 0 ${VW} ${VH}`);
  const NS = 'http://www.w3.org/2000/svg';
  const el = (tag, attrs) => {
    const e = document.createElementNS(NS, tag);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    svg.appendChild(e);
    return e;
  };

  let gridD = '';
  for (let gx = 0; gx <= VW; gx += 56) gridD += `M ${gx} 0 V ${VH} `;
  for (let gy = 0; gy <= VH; gy += 56) gridD += `M 0 ${gy} H ${VW} `;
  el('path', { d: gridD, class: 'sea-grid' });

  const toPath = (poly) => 'M ' + poly.map((p) => `${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' L ') + ' Z';
  el('path', { d: toPath(usaPoly), class: 'land', opacity: 0.5 });
  el('path', { d: toPath(gtPoly), class: 'land', opacity: 0.5 });
  el('path', { d: toPath(mxPoly), class: 'land' });

  const label = (lon, lat, text, size = 15) => {
    const [x, y] = px([lon, lat]);
    const t = el('text', { x, y, fill: 'rgba(0,46,109,0.4)', 'font-size': size, 'font-weight': 800, 'font-family': 'Montserrat, sans-serif', 'letter-spacing': 3 });
    t.textContent = text;
  };
  label(-103.5, 25.4, 'MEXICO', 26);
  label(-104, 32.6, 'EUA', 13);
  label(-90.8, 15.2, 'GUAT.', 11);
  label(-112, 19.5, 'OCEANO PACIFICO', 12);
  label(-94.5, 23.5, 'GOLFO DE MEXICO', 12);

  const railPx = RAIL.map(px);
  el('path', { d: 'M ' + railPx.map((p) => p.join(' ')).join(' L '), class: 'rail' });

  // ---------- DOM ----------
  const board = document.getElementById('board');
  const place = (node, x, y) => {
    node.style.left = `${(x / VW) * 100}%`;
    node.style.top = `${(y / VH) * 100}%`;
  };

  const ports = LOCATIONS.map((u) => {
    const p = document.createElement('div');
    p.className = 'port';
    p.innerHTML = `<div class="port__pin"><span class="port__diamond"></span><span class="port__code">${u.label}</span></div>`;
    u.markPx = px(u.mark);
    place(p, u.markPx[0], u.markPx[1]);
    board.appendChild(p);

    if (u.dock) {
      const zone = document.createElement('div');
      zone.className = 'dockzone';
      u.dockPx = px(u.dock);
      place(zone, u.dockPx[0], u.dockPx[1]);
      board.appendChild(zone);
    }
    return p;
  });

  const sizeZones = () => {
    const s = board.clientWidth / VW;
    document.querySelectorAll('.dockzone').forEach((z) => {
      z.style.width = `${DOCK_R * 2 * s}px`;
      z.style.height = `${DOCK_R * 2 * s * 0.92}px`;
    });
  };
  sizeZones();
  window.addEventListener('resize', sizeZones);

  // vehiculo: sprites SVG vista cenital (proa hacia la derecha)
  const SHIP_SVG = `
    <svg viewBox="0 0 100 40" xmlns="http://www.w3.org/2000/svg">
      <path d="M 6 11 L 64 11 Q 85 11 95.5 20 Q 85 29 64 29 L 6 29 Q 1.5 29 1.5 24 L 1.5 16 Q 1.5 11 6 11 Z"
            fill="#002E6D" stroke="#001638" stroke-width="1.6"/>
      <path d="M 9 14 L 62 14 Q 79 14 88 20 Q 79 26 62 26 L 9 26 Q 5 26 5 22.5 L 5 17.5 Q 5 14 9 14 Z"
            fill="#0d4486"/>
      <path d="M 90 17.5 Q 93.5 20 90 22.5" fill="none" stroke="#9ACAEB" stroke-width="1.5" stroke-linecap="round"/>
      <g stroke="#001638" stroke-width="0.7">
        <rect x="22" y="14.6" width="8.6" height="5" rx="0.6" fill="#EE7523"/>
        <rect x="31.6" y="14.6" width="8.6" height="5" rx="0.6" fill="#009BDE"/>
        <rect x="41.2" y="14.6" width="8.6" height="5" rx="0.6" fill="#FFC627"/>
        <rect x="50.8" y="14.6" width="8.6" height="5" rx="0.6" fill="#54BBAB"/>
        <rect x="60.4" y="14.6" width="8.6" height="5" rx="0.6" fill="#EE7523"/>
        <rect x="22" y="20.4" width="8.6" height="5" rx="0.6" fill="#54BBAB"/>
        <rect x="31.6" y="20.4" width="8.6" height="5" rx="0.6" fill="#FFC627"/>
        <rect x="41.2" y="20.4" width="8.6" height="5" rx="0.6" fill="#EE7523"/>
        <rect x="50.8" y="20.4" width="8.6" height="5" rx="0.6" fill="#009BDE"/>
        <rect x="60.4" y="20.4" width="8.6" height="5" rx="0.6" fill="#9ACAEB"/>
      </g>
      <rect x="7.5" y="13" width="11" height="14" rx="1.4" fill="#f6f8fb" stroke="#001638" stroke-width="1"/>
      <rect x="9.5" y="15.2" width="7" height="2" rx="1" fill="#0d4486"/>
      <rect x="9.5" y="22.8" width="7" height="2" rx="1" fill="#0d4486"/>
      <circle cx="13" cy="20" r="1.7" fill="#EE7523" stroke="#001638" stroke-width="0.7"/>
    </svg>`;

  const CRANE_SVG = `
    <svg viewBox="0 0 100 44" xmlns="http://www.w3.org/2000/svg">
      <g fill="#11203a">
        <rect x="14" y="3" width="11" height="6" rx="2.5"/>
        <rect x="29" y="3" width="11" height="6" rx="2.5"/>
        <rect x="44" y="3" width="11" height="6" rx="2.5"/>
        <rect x="14" y="35" width="11" height="6" rx="2.5"/>
        <rect x="29" y="35" width="11" height="6" rx="2.5"/>
        <rect x="44" y="35" width="11" height="6" rx="2.5"/>
      </g>
      <rect x="8" y="7" width="56" height="30" rx="3.5" fill="#FFC627" stroke="#0a1f3f" stroke-width="1.8"/>
      <path d="M 10 9 l 7 26 M 16 9 l 7 26" stroke="#0a1f3f" stroke-width="2.6" opacity="0.85"/>
      <rect x="52" y="9.5" width="10.5" height="11" rx="1.5" fill="#002E6D"/>
      <rect x="59.5" y="11" width="3" height="8" rx="1" fill="#9fd8ff"/>
      <rect x="24" y="14" width="12" height="16" rx="1.5" fill="#3c4a60" stroke="#0a1f3f" stroke-width="1"/>
      <circle cx="42" cy="22" r="8.5" fill="#E07B20" stroke="#0a1f3f" stroke-width="1.6"/>
      <circle cx="42" cy="22" r="3" fill="#0a1f3f"/>
      <path d="M 42 18.6 L 93 20.6 L 93 23.4 L 42 25.4 Z" fill="#EE7523" stroke="#7a2f0d" stroke-width="1"/>
      <path d="M 60 19.3 L 60 24.7 M 76 19.9 L 76 24.1" stroke="#7a2f0d" stroke-width="1.4"/>
      <rect x="91" y="17.5" width="6" height="9" rx="1.2" fill="#002E6D"/>
      <circle cx="94" cy="29.5" r="2.6" fill="#FFC627" stroke="#0a1f3f" stroke-width="1.2"/>
      <path d="M 94 26 L 94 22" stroke="#0a1f3f" stroke-width="1.2"/>
    </svg>`;

  const ship = document.createElement('div');
  ship.className = 'ship';
  ship.innerHTML =
    `<div class="skin skin--ship">${SHIP_SVG}</div>
     <div class="skin skin--crane">${CRANE_SVG}</div>`;
  board.appendChild(ship);

  const train = document.createElement('div');
  train.className = 'train';
  train.innerHTML = '<i></i><i></i><i></i>';
  board.appendChild(train);

  // ---------- HUD / modal ----------
  const chipsBox = document.getElementById('chips');
  const chips = LOCATIONS.map((u) => {
    const c = document.createElement('span');
    c.className = 'chip';
    c.textContent = u.chip;
    chipsBox.appendChild(c);
    return c;
  });
  const modal = document.getElementById('modal');
  const modalOk = document.getElementById('modal-ok');
  const status = document.getElementById('hud-status');
  const toast = document.getElementById('toast');
  const finale = document.getElementById('finale');

  let toastTimer = 0;
  const say = (msg) => {
    toast.hidden = false;
    toast.textContent = msg;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { toast.hidden = true; }, 2600);
  };

  let modalOpen = false;
  const openModal = (u, via) => {
    document.getElementById('modal-kicker').textContent = `LLEGASTE ${via} A`;
    document.getElementById('modal-title').textContent = u.label;
    document.getElementById('modal-state').textContent =
      `${u.state} · ${u.units.length} ${u.units.length === 1 ? 'UNIDAD DE NEGOCIO' : 'UNIDADES DE NEGOCIO'}`;
    document.getElementById('modal-intro').textContent = u.intro;
    document.getElementById('modal-units').innerHTML = u.units.map((n) =>
      `<div class="unit">
         <span class="unit__code">${n.code}</span>
         <span class="unit__name">${n.name}</span>
         <span class="unit__desc">${n.desc}</span>
       </div>`).join('');
    modal.hidden = false;
    modalOpen = true;
    modalOk.focus();
  };
  const closeModal = () => {
    modal.hidden = true;
    modalOpen = false;
    if (visited.size === LOCATIONS.length) {
      setTimeout(() => { finale.hidden = false; }, 500);
    }
  };
  modalOk.addEventListener('click', closeModal);

  // ---------- estado ----------
  const visited = new Set();
  const st = {
    x: 0, y: 0, heading: -0.6, speed: 0,
    mode: 'ship',            // ship | crane
    cooldown: new Set(),     // sedes recien visitadas (hasta alejarse)
    trainT: -1
  };
  const keys = {};

  const reset = () => {
    [st.x, st.y] = px(SHIP_START);
    st.heading = -0.6; st.speed = 0;
    st.mode = 'ship';
    st.cooldown.clear();
    st.trainT = -1;
    visited.clear();
    chips.forEach((c) => c.classList.remove('is-done'));
    ports.forEach((p) => p.classList.remove('is-visited', 'is-near'));
    ship.classList.remove('is-crane');
    modal.hidden = true; modalOpen = false;
    finale.hidden = true;
    train.classList.remove('is-running');
    status.textContent = 'EN ALTAMAR';
  };
  reset();

  const markVisited = (i) => {
    if (visited.has(i)) return;
    visited.add(i);
    chips[i].classList.add('is-done');
    ports[i].classList.add('is-visited');
  };

  const arrive = (i, via) => {
    const u = LOCATIONS[i];
    st.speed = 0;
    st.cooldown.add(i);
    markVisited(i);
    status.textContent = `EN ${u.label}`;
    openModal(u, via);
  };

  // ---------- entrada ----------
  document.addEventListener('keydown', (e) => {
    const k = e.key.toLowerCase();
    if (modalOpen) {
      if (['enter', ' ', 'escape'].includes(k)) { e.preventDefault(); closeModal(); }
      return;
    }
    if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(k)) e.preventDefault();
    keys[k] = true;
    if (k === 'r') reset();
    if (k === 't' && st.trainT < 0 && !visited.has(HIDALGO_I)) {
      const vz = LOCATIONS[VERACRUZ_I];
      const d = Math.hypot(st.x - vz.dockPx[0], st.y - vz.dockPx[1]);
      const dLand = Math.hypot(st.x - vz.markPx[0], st.y - vz.markPx[1]);
      if (Math.min(d, dLand) < DOCK_R * 2.2) {
        st.trainT = 0;
        train.classList.add('is-running');
        say('TREN INTERMODAL DESPACHADO A HIDALGO');
      } else {
        say('EL TREN SALE DESDE VERACRUZ: ACERCATE PRIMERO');
      }
    }
  });
  document.addEventListener('keyup', (e) => { keys[e.key.toLowerCase()] = false; });

  document.querySelectorAll('.touchpad button').forEach((b) => {
    const k = b.dataset.k;
    b.addEventListener('pointerdown', (e) => { e.preventDefault(); keys[k] = true; });
    b.addEventListener('pointerup', () => { keys[k] = false; });
    b.addEventListener('pointerleave', () => { keys[k] = false; });
  });

  // ---------- tren ----------
  const railPoint = (t) => {
    const seg = t * (railPx.length - 1);
    const i = Math.min(Math.floor(seg), railPx.length - 2);
    const f = seg - i;
    return [
      railPx[i][0] + (railPx[i + 1][0] - railPx[i][0]) * f,
      railPx[i][1] + (railPx[i + 1][1] - railPx[i][1]) * f
    ];
  };

  // ---------- loop ----------
  let last = performance.now();
  let wakeTimer = 0;

  const tick = (now) => {
    requestAnimationFrame(tick);
    const dt = Math.min((now - last) / 1000, 0.033);
    last = now;

    if (!modalOpen) {
      const thrust = keys.w || keys.arrowup;
      const left = keys.a || keys.arrowleft;
      const right = keys.d || keys.arrowright;

      const maxV = st.mode === 'ship' ? 95 : 62;   // la grua es mas lenta
      const turn = st.mode === 'ship' ? 2.1 : 2.6; // pero vira mas agil

      if (left) st.heading -= turn * dt;
      if (right) st.heading += turn * dt;
      if (thrust) st.speed = Math.min(st.speed + 130 * dt, maxV);
      else st.speed *= Math.pow(0.4, dt);

      const nx = st.x + Math.cos(st.heading) * st.speed * dt;
      const ny = st.y + Math.sin(st.heading) * st.speed * dt;
      const next = [nx, ny];

      const inMx = inPoly(next, mxPoly);
      const blocked = inPoly(next, usaPoly) || inPoly(next, gtPoly);

      if (blocked) {
        st.speed = 0; // frontera cerrada
      } else {
        // anfibio: el modo cambia segun el terreno
        if (inMx && st.mode === 'ship') {
          st.mode = 'crane';
          ship.classList.add('is-crane');
          status.textContent = 'EN TIERRA: GRUA MOVIL';
          say('DESEMBARCO: AHORA ERES UNA GRUA MOVIL');
        } else if (!inMx && st.mode === 'crane') {
          st.mode = 'ship';
          ship.classList.remove('is-crane');
          status.textContent = 'EN ALTAMAR';
          say('DE VUELTA AL MAR: MODO BUQUE');
        }
        st.x = Math.max(8, Math.min(VW - 8, nx));
        st.y = Math.max(8, Math.min(VH - 8, ny));
      }

      // estela / huellas
      wakeTimer -= dt;
      if (st.speed > 22 && wakeTimer <= 0) {
        wakeTimer = 0.09;
        const w = document.createElement('i');
        w.className = 'wake';
        place(w, st.x - Math.cos(st.heading) * 12, st.y - Math.sin(st.heading) * 12);
        board.appendChild(w);
        setTimeout(() => w.remove(), 1700);
      }

      // llegadas: por mar (zona de atraque) o por tierra (al pin)
      LOCATIONS.forEach((u, i) => {
        const dSea = u.dockPx ? Math.hypot(st.x - u.dockPx[0], st.y - u.dockPx[1]) : Infinity;
        const dLand = Math.hypot(st.x - u.markPx[0], st.y - u.markPx[1]);
        const d = Math.min(dSea, dLand);

        ports[i].classList.toggle('is-near', d < DOCK_R * 2 && !visited.has(i));

        if (st.cooldown.has(i)) {
          if (d > DOCK_R * 1.8) st.cooldown.delete(i);
          return;
        }
        if (st.mode === 'ship' && dSea < DOCK_R) arrive(i, 'POR MAR');
        else if (st.mode === 'crane' && dLand < LAND_R) arrive(i, 'POR TIERRA');
      });
    }

    // tren (sigue corriendo aunque el modal este abierto)
    if (st.trainT >= 0 && st.trainT <= 1) {
      st.trainT += dt / 4.2;
      const t = Math.min(st.trainT, 1);
      const [tx2, ty2] = railPoint(t);
      place(train, tx2, ty2);
      if (st.trainT >= 1) {
        st.trainT = 2;
        train.classList.remove('is-running');
        st.cooldown.add(HIDALGO_I);
        markVisited(HIDALGO_I);
        openModal(LOCATIONS[HIDALGO_I], 'EN TREN');
      }
    }

    place(ship, st.x, st.y);
    ship.style.transform = `rotate(${(st.heading * 180) / Math.PI}deg)`;
  };
  requestAnimationFrame(tick);

  document.getElementById('restart').addEventListener('click', reset);
})();
