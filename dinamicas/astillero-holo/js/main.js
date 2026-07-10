// ============================================================
// ARRANQUE
// Orden: Estado (progreso) -> Calibracion (posiciones) -> Render.
// Sin reloj de generacion pasiva: construir = aprender.
// ============================================================

(function () {
  const CLAVE_VISTO = 'nexo-ia-instrucciones-vistas';

  Estado.init();
  Calibracion.init();
  Render.init();
  Mapa.init();
  Pantallas.init();

  document.getElementById('btn-mapa').addEventListener('click', () => {
    Pantallas.irAlMapa();
  });

  // ---------- Instrucciones ----------

  const overlay = document.getElementById('overlay-instrucciones');

  function mostrarInstrucciones(visible) {
    overlay.hidden = !visible;
    if (!visible) localStorage.setItem(CLAVE_VISTO, '1');
  }

  document.getElementById('btn-ayuda').addEventListener('click', () => {
    mostrarInstrucciones(overlay.hidden);
  });
  document.getElementById('btn-empezar').addEventListener('click', () => {
    mostrarInstrucciones(false);
  });
  document.getElementById('btn-reiniciar').addEventListener('click', () => {
    if (!window.confirm('Reiniciar el progreso del curso? Se pierde todo.')) return;
    Estado.reiniciar();
    Flujo.cerrar();
    Render.seleccionar(null);
    Render.actualizarTodo();
    Pantallas.irAlMapa(true);
    mostrarInstrucciones(false);
    Render.toast('PROGRESO REINICIADO');
  });

  if (!localStorage.getItem(CLAVE_VISTO)) mostrarInstrucciones(true);

  // Cerrar la leccion con el boton [X] (salir sin completar)
  document.getElementById('leccion-cerrar').addEventListener('click', () => {
    Flujo.cerrar();
  });

  // ---------- Teclado ----------

  document.addEventListener('keydown', (e) => {
    if (e.key === 'c' || e.key === 'C') {
      if (Flujo.activo()) return;
      Calibracion.alternar();
    } else if (e.key === 'Escape') {
      if (Flujo.activo()) Flujo.cerrar();
      else if (!overlay.hidden) mostrarInstrucciones(false);
      else Render.seleccionar(null);
    } else if (e.key === '?') {
      mostrarInstrucciones(overlay.hidden);
    }
  });
})();
