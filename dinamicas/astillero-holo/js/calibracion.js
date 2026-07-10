// ============================================================
// MODO CALIBRACION (tecla C)
// Arrastrar sockets sobre la imagen, ver coordenadas en vivo y
// exportar el array listo para pegar en js/datos.js. Los ajustes
// se guardan en localStorage hasta que se pegan en datos.js.
// ============================================================

const Calibracion = (() => {
  const CLAVE = 'astillero-holo-calibracion-v1';
  let encendido = false;
  const originales = {};

  function init() {
    DATOS.sockets.forEach((s) => { originales[s.id] = { x: s.x, y: s.y }; });

    let guardado = {};
    try { guardado = JSON.parse(localStorage.getItem(CLAVE)) || {}; } catch (e) { guardado = {}; }
    DATOS.sockets.forEach((s) => {
      const o = guardado[s.id];
      if (o) { s.x = o.x; s.y = o.y; }
    });

    document.getElementById('calib-exportar').addEventListener('click', exportar);
    document.getElementById('calib-limpiar').addEventListener('click', limpiar);
    document.getElementById('calib-salir').addEventListener('click', alternar);
    instalarArrastre();
  }

  function activo() { return encendido; }

  function alternar() {
    encendido = !encendido;
    document.body.classList.toggle('calibrando', encendido);
    Render.seleccionar(null);
    Render.toast(encendido
      ? 'CALIBRACION: ARRASTRA LOS SOCKETS Y EXPORTA'
      : 'CALIBRACION DESACTIVADA');
  }

  function instalarArrastre() {
    const capa = document.getElementById('capa-sockets');
    let arrastrando = null;

    capa.addEventListener('pointerdown', (e) => {
      if (!encendido) return;
      const el = e.target.closest('.socket');
      if (!el) return;
      arrastrando = DATOS.sockets.find((s) => s.id === el.dataset.id);
      el.setPointerCapture(e.pointerId);
      e.preventDefault();
    });

    capa.addEventListener('pointermove', (e) => {
      if (!encendido || !arrastrando) return;
      const rect = capa.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      arrastrando.x = Math.round(Math.min(99, Math.max(1, x)) * 10) / 10;
      arrastrando.y = Math.round(Math.min(99, Math.max(1, y)) * 10) / 10;
      Render.posicionar(arrastrando);
    });

    const soltar = () => {
      if (!arrastrando) return;
      arrastrando = null;
      persistir();
    };
    capa.addEventListener('pointerup', soltar);
    capa.addEventListener('pointercancel', soltar);
  }

  // Guarda solo los sockets que difieren de datos.js
  function persistir() {
    const data = {};
    DATOS.sockets.forEach((s) => {
      if (s.x !== originales[s.id].x || s.y !== originales[s.id].y) {
        data[s.id] = { x: s.x, y: s.y };
      }
    });
    localStorage.setItem(CLAVE, JSON.stringify(data));
  }

  // En la pantalla de mapa los botones operan sobre los nodos de terminal
  function enMapa() {
    return typeof Pantallas !== 'undefined' && Pantallas.actual() === 'mapa';
  }

  function exportar() {
    if (enMapa()) { Mapa.exportar(); return; }
    const lineas = DATOS.sockets.map((s) => '    ' + JSON.stringify(s) + ',');
    const codigo = '  sockets: [\n' + lineas.join('\n') + '\n  ],';
    console.log('--- COORDENADAS CALIBRADAS (pegar en js/datos.js) ---\n' + codigo);
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
    if (enMapa()) { Mapa.limpiar(); return; }
    DATOS.sockets.forEach((s) => {
      s.x = originales[s.id].x;
      s.y = originales[s.id].y;
      Render.posicionar(s);
    });
    localStorage.removeItem(CLAVE);
    Render.toast('COORDENADAS RESTAURADAS DESDE datos.js');
  }

  return { init, activo, alternar };
})();
