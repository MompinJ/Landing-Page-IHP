// ============================================================
// PANTALLA DE MAPA
// Nodos de terminal anclados en % sobre la imagen cenital, con el
// mismo patron de los sockets. Incluye arrastre en modo
// calibracion y export de coordenadas de TERMINALES.
// ============================================================

const Mapa = (() => {
  const CLAVE_CALIB = 'nexo-ia-mapa-calibracion-v1';
  const nodos = {};
  const originales = {};

  function $(id) { return document.getElementById(id); }

  function init() {
    TERMINALES.forEach((t) => { originales[t.id] = { x: t.x, y: t.y }; });
    let guardado = {};
    try { guardado = JSON.parse(localStorage.getItem(CLAVE_CALIB)) || {}; } catch (e) { guardado = {}; }
    TERMINALES.forEach((t) => {
      const o = guardado[t.id];
      if (o) { t.x = o.x; t.y = o.y; }
    });

    TERMINALES.forEach(crearNodo);
    instalarArrastre();
    actualizar();
  }

  function crearNodo(t) {
    const el = document.createElement('div');
    el.className = 'nodo-terminal';
    el.dataset.id = t.id;
    el.innerHTML =
      '<svg class="hex" viewBox="0 0 100 110">' +
        '<polygon points="50,5 94,30 94,80 50,105 6,80 6,30"></polygon>' +
        '<text class="nodo-nivel" x="50" y="57" text-anchor="middle" dominant-baseline="central">N' + t.nivel + '</text>' +
      '</svg>' +
      '<div class="etiqueta">' +
        '<span class="nombre">' + t.nombre.toUpperCase() + '</span>' +
        '<span class="nodo-estado"></span>' +
        '<span class="coords"></span>' +
      '</div>';
    el.addEventListener('click', () => {
      if (typeof Calibracion !== 'undefined' && Calibracion.activo()) return;
      Pantallas.entrar(t.id);
    });
    $('capa-nodos').appendChild(el);
    nodos[t.id] = el;
    posicionar(t);
  }

  function posicionar(t) {
    const el = nodos[t.id];
    el.style.left = t.x + '%';
    el.style.top = t.y + '%';
    el.querySelector('.coords').textContent =
      'x:' + Number(t.x).toFixed(1) + ' y:' + Number(t.y).toFixed(1);
  }

  // Refresca el estado visual de cada nodo leyendo el estado global
  function actualizar() {
    const st = Estado.get();
    TERMINALES.forEach((t) => {
      const el = nodos[t.id];
      if (!el) return;
      const completada = !!(st.terminales[t.id] && st.terminales[t.id].completada);
      const disponible = !completada && t.estado === 'disponible' && t.id === DATOS.terminal;
      const bloqueada = !completada && !disponible;

      el.classList.toggle('completada', completada);
      el.classList.toggle('disponible', disponible);
      el.classList.toggle('bloqueada', bloqueada);

      el.querySelector('.nodo-estado').textContent =
        completada ? 'COMPLETADA' : disponible ? 'DISPONIBLE' : 'PROXIMAMENTE';
    });
  }

  // ---------- Calibracion de nodos (mismo patron que los sockets) ----------

  function instalarArrastre() {
    const capa = $('capa-nodos');
    let arrastrando = null;

    capa.addEventListener('pointerdown', (e) => {
      if (typeof Calibracion === 'undefined' || !Calibracion.activo()) return;
      const el = e.target.closest('.nodo-terminal');
      if (!el) return;
      arrastrando = TERMINALES.find((t) => t.id === el.dataset.id);
      el.setPointerCapture(e.pointerId);
      e.preventDefault();
    });

    capa.addEventListener('pointermove', (e) => {
      if (!arrastrando) return;
      const rect = capa.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      arrastrando.x = Math.round(Math.min(99, Math.max(1, x)) * 10) / 10;
      arrastrando.y = Math.round(Math.min(99, Math.max(1, y)) * 10) / 10;
      posicionar(arrastrando);
    });

    const soltar = () => {
      if (!arrastrando) return;
      arrastrando = null;
      persistir();
    };
    capa.addEventListener('pointerup', soltar);
    capa.addEventListener('pointercancel', soltar);
  }

  function persistir() {
    const data = {};
    TERMINALES.forEach((t) => {
      if (t.x !== originales[t.id].x || t.y !== originales[t.id].y) {
        data[t.id] = { x: t.x, y: t.y };
      }
    });
    localStorage.setItem(CLAVE_CALIB, JSON.stringify(data));
  }

  function exportar() {
    const lineas = TERMINALES.map((t) => '  ' + JSON.stringify(t) + ',');
    const codigo = 'const TERMINALES = [\n' + lineas.join('\n') + '\n];';
    console.log('--- TERMINALES CALIBRADAS (pegar en js/terminales.js) ---\n' + codigo);
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(codigo).then(
        () => Render.toast('EXPORTADO A CONSOLA Y PORTAPAPELES'),
        () => Render.toast('EXPORTADO A CONSOLA (F12)')
      );
    } else {
      Render.toast('EXPORTADO A CONSOLA (F12)');
    }
  }

  function limpiar() {
    TERMINALES.forEach((t) => {
      t.x = originales[t.id].x;
      t.y = originales[t.id].y;
      posicionar(t);
    });
    localStorage.removeItem(CLAVE_CALIB);
    Render.toast('COORDENADAS RESTAURADAS DESDE terminales.js');
  }

  return { init, actualizar, exportar, limpiar };
})();
