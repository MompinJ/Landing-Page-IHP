// ============================================================
// RENDER DOM DE LA VISTA DE BASE
// Toda la logica vive en Estado/DATOS/Flujo. En una fase futura
// este archivo se sustituye por una escena Three.js sin tocar
// los demas.
// ============================================================

const Render = (() => {
  let seleccionado = null;
  let toastTimer = null;
  const nodos = {};

  function $(id) { return document.getElementById(id); }

  function init() {
    DATOS.sockets.forEach(crearSocket);
    $('panel').addEventListener('click', onPanelClick);
    actualizarTodo();
  }

  function crearSocket(d) {
    const el = document.createElement('div');
    el.className = 'socket';
    el.dataset.id = d.id;
    el.style.setProperty('--cat', DATOS.categorias[d.categoria].color);
    el.innerHTML =
      '<div class="anillo"></div>' +
      '<svg class="hex" viewBox="0 0 100 110">' +
        '<polygon points="50,5 94,30 94,80 50,105 6,80 6,30"></polygon>' +
        '<text class="hex-icono" x="50" y="57" text-anchor="middle" dominant-baseline="central"></text>' +
      '</svg>' +
      '<div class="etiqueta">' +
        '<span class="nombre">' + d.nombre.toUpperCase() + '</span>' +
        '<span class="pips"></span>' +
        '<span class="coords"></span>' +
      '</div>';
    el.addEventListener('click', () => {
      if (typeof Calibracion !== 'undefined' && Calibracion.activo()) return;
      onSocketClick(d);
    });
    $('capa-sockets').appendChild(el);
    nodos[d.id] = el;
    posicionar(d);
  }

  // Tocar un socket pedagogico vacio abre su leccion; el resto abre panel
  function onSocketClick(d) {
    const s = Estado.socket(d.id);
    if (!d.esHub && s.estado === 'vacio' && Estado.disponible(d)) {
      seleccionar(null);
      Flujo.abrir(d.id);
      return;
    }
    seleccionar(seleccionado === d.id ? null : d.id);
  }

  // Ancla el socket a la imagen por porcentajes; tambien lo usa Calibracion
  function posicionar(d) {
    const el = nodos[d.id];
    el.style.left = d.x + '%';
    el.style.top = d.y + '%';
    el.querySelector('.coords').textContent =
      'x:' + Number(d.x).toFixed(1) + ' y:' + Number(d.y).toFixed(1);
  }

  function actualizarSocket(d) {
    const el = nodos[d.id];
    const s = Estado.socket(d.id);
    const construido = s.estado === 'construido';
    const disponible = !d.esHub && !construido && Estado.disponible(d);
    const bloqueado = !construido && !disponible;

    el.classList.toggle('estado-construido', construido);
    el.classList.toggle('estado-vacio', disponible);
    el.classList.toggle('estado-bloqueado', bloqueado);
    el.classList.toggle('seleccionado', seleccionado === d.id);

    let icono = '';
    if (!construido) {
      if (d.esHub) icono = Estado.leccionesCompletadas() + '/' + Estado.leccionesTotales();
      else icono = disponible ? '+' : 'X';
    }
    el.querySelector('.hex-icono').textContent = icono;

    const pips = el.querySelector('.pips');
    if (d.esHub) {
      // El hub muestra el avance de las 6 lecciones
      const total = Estado.leccionesTotales();
      const hechas = Estado.leccionesCompletadas();
      let html = '';
      for (let i = 1; i <= total; i++) {
        html += '<span class="pip' + (i <= hechas ? ' lleno' : '') + '"></span>';
      }
      pips.innerHTML = html;
    } else if (construido) {
      let html = '';
      for (let i = 1; i <= DATOS.nivelMax; i++) {
        html += '<span class="pip' + (i <= s.nivel ? ' lleno' : '') + '"></span>';
      }
      pips.innerHTML = html;
    } else {
      pips.innerHTML = '';
    }
  }

  function actualizarTodo() {
    DATOS.sockets.forEach((d) => { posicionar(d); actualizarSocket(d); });
    pintarHUD();
    pintarPanel();
  }

  function seleccionar(id) {
    seleccionado = id;
    DATOS.sockets.forEach(actualizarSocket);
    pintarPanel();
  }

  // ---------- HUD (dos ejes + datos, sin farmeo) ----------

  function pintarHUD() {
    const st = Estado.get();
    const max = DATOS.barraMax;
    $('hud-escudo').textContent = Math.round(st.barras.escudo);
    $('hud-optimizacion').textContent = Math.round(st.barras.optimizacion);
    $('barra-escudo').style.width = (st.barras.escudo / max) * 100 + '%';
    $('barra-optimizacion').style.width = (st.barras.optimizacion / max) * 100 + '%';
    $('hud-datos').textContent = Math.round(st.recursos.datos);
    $('hud-lecciones').textContent =
      Estado.leccionesCompletadas() + '/' + Estado.leccionesTotales();
  }

  // ---------- Panel lateral ----------

  function plantillaHub() {
    const total = Estado.leccionesTotales();
    const hechas = Estado.leccionesCompletadas();
    if (Estado.terminal().completada) {
      return '<p class="panel-desc">Nucleo de mando del astillero, en linea y estable.</p>' +
        '<div class="panel-bloque alerta ok">TERMINAL CONSTRUIDA<br>NIVEL SEGURIDAD COMPLETADO</div>' +
        '<div class="panel-bloque"><p class="linea-gen">Barra de Escudo al maximo. Proxima parada: el mapa del puerto (en construccion).</p></div>';
    }
    return '<p class="panel-desc">Nucleo de mando del astillero. Se enciende solo: complete las ' + total + ' lecciones de la terminal.</p>' +
      '<div class="panel-bloque alerta">HUB BLOQUEADO<br>LECCIONES ' + hechas + ' / ' + total + '</div>';
  }

  function plantillaLeccionCompletada(d, s) {
    const lec = LECCIONES[d.id];
    let html = '<p class="panel-desc">' + d.subtema + '</p>' +
      '<div class="panel-bloque alerta ok">LECCION COMPLETADA' +
        (typeof s.puntaje === 'number' ? '<br>PUNTAJE: ' + s.puntaje : '') +
      '</div>' +
      '<div class="panel-bloque">' +
        '<p class="bloque-titulo">NIVEL DEL MODULO: L' + s.nivel + '</p>' +
        '<p class="linea-gen">Mentor: ' + (lec && lec.mentor === 'ia' ? 'IA VIRTUAL' : lec && lec.mentor === 'ambos' ? 'COMANDANTE + IA' : 'COMANDANTE') + '</p>' +
      '</div>';
    const coste = Estado.costeMejora(d.id);
    if (!coste) {
      return html + '<div class="panel-bloque alerta ok">NIVEL MAXIMO ALCANZADO</div>';
    }
    const alcanza = Estado.get().recursos.datos >= coste.datos;
    html += '<div class="panel-bloque">' +
        '<p class="bloque-titulo">REFORZAR A L' + (s.nivel + 1) + '</p>' +
        '<p class="linea-coste">COSTE: ' + coste.datos + ' DATOS</p>' +
      '</div>' +
      '<button class="boton primario ancho" data-accion="mejorar"' + (alcanza ? '' : ' disabled') + '>REFORZAR MODULO</button>' +
      (alcanza ? '' : '<p class="panel-nota">DATOS INSUFICIENTES</p>');
    return html;
  }

  function plantillaLeccionPendiente(d) {
    return '<p class="panel-desc">' + d.subtema + '</p>' +
      '<div class="panel-bloque">' +
        '<p class="bloque-titulo">MODULO SIN CONSTRUIR</p>' +
        '<p class="linea-gen">Complete la leccion para encender esta infraestructura.</p>' +
      '</div>' +
      '<button class="boton primario ancho" data-accion="leccion">INICIAR LECCION</button>';
  }

  function pintarPanel() {
    const panel = $('panel');
    if (!seleccionado) {
      panel.classList.remove('abierto');
      return;
    }
    const d = Estado.def(seleccionado);
    const s = Estado.socket(d.id);
    const cat = DATOS.categorias[d.categoria];

    let html = '<button class="panel-cerrar" data-accion="cerrar">[X]</button>' +
      '<p class="panel-cat" style="color:' + cat.color + '">&#9670; ' + cat.etiqueta + '</p>' +
      '<h2 class="panel-titulo">' + d.nombre.toUpperCase() + '</h2>';

    if (d.esHub) html += plantillaHub();
    else if (s.estado === 'construido') html += plantillaLeccionCompletada(d, s);
    else html += plantillaLeccionPendiente(d);

    $('panel-contenido').innerHTML = html;
    panel.classList.add('abierto');
  }

  function onPanelClick(e) {
    const btn = e.target.closest('[data-accion]');
    if (!btn || btn.disabled) return;
    const accion = btn.dataset.accion;
    if (accion === 'cerrar') { seleccionar(null); return; }
    if (accion === 'leccion') { Flujo.abrir(seleccionado); return; }
    if (accion === 'mejorar') {
      const res = Estado.mejorar(seleccionado);
      toast(res.motivo, !res.ok);
      if (res.ok) actualizarTodo();
    }
  }

  // ---------- Toast ----------

  function toast(msg, esError) {
    const el = $('toast');
    el.textContent = msg;
    el.classList.toggle('error', !!esError);
    el.classList.add('visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('visible'), 2600);
  }

  return { init, actualizarTodo, pintarHUD, pintarPanel, posicionar, seleccionar, toast };
})();
