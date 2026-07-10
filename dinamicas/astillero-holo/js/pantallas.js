// ============================================================
// GESTOR DE PANTALLAS: MAPA <-> TERMINAL
// Envuelve al astillero sin tocar su interior. La pantalla actual
// se guarda en el estado global: al recargar se restaura.
// ============================================================

const Pantallas = (() => {
  function $(id) { return document.getElementById(id); }

  function init() {
    const ui = Estado.get().ui || {};
    if (ui.pantalla === 'terminal' && ui.terminal) entrar(ui.terminal, true);
    else irAlMapa(true);
  }

  function actual() {
    return document.body.classList.contains('pantalla-terminal') ? 'terminal' : 'mapa';
  }

  function irAlMapa(silencioso) {
    // Cierra lo que la terminal tuviera abierto antes de salir
    if (typeof Flujo !== 'undefined') Flujo.cerrar();
    Render.seleccionar(null);

    document.body.classList.add('pantalla-mapa');
    document.body.classList.remove('pantalla-terminal');
    $('btn-mapa').hidden = true;
    Mapa.actualizar();
    Estado.setPantalla('mapa', null);
    if (!silencioso) Render.toast('MAPA DEL PUERTO');
  }

  function entrar(id, silencioso) {
    const t = TERMINALES.find((x) => x.id === id);
    if (!t) return;
    // Solo es jugable la terminal cuyo contenido esta cargado (DATOS.terminal)
    if (t.estado === 'bloqueada' || t.id !== DATOS.terminal) {
      Render.toast('PROXIMAMENTE: NIVEL ' + t.nivel + ' - ' + t.nombre.toUpperCase(), true);
      return;
    }

    document.body.classList.add('pantalla-terminal');
    document.body.classList.remove('pantalla-mapa');
    $('btn-mapa').hidden = false;
    Render.actualizarTodo();
    Estado.setPantalla('terminal', id);
    if (!silencioso) Render.toast('TERMINAL: ' + t.nombre.toUpperCase());
  }

  return { init, actual, irAlMapa, entrar };
})();
