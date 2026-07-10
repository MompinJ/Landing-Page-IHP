// ============================================================
// MOTOR DE FLUJO DE LECCIONES (generico, no sabe de temas)
// tocar socket -> abrir leccion -> onComplete -> construir modulo
// + subir barras + otorgar datos + guardar -> volver a la base.
// Tambien contiene el orbe de mentor minimo con el gancho hablar().
// ============================================================

const Flujo = (() => {
  let abierta = null;

  function $(id) { return document.getElementById(id); }

  function abrir(id) {
    const lec = LECCIONES[id];
    if (!lec) { Render.toast('LECCION NO DISPONIBLE', true); return; }
    abierta = id;

    $('leccion-subtema').textContent = lec.subtema;
    $('leccion-titulo').textContent = lec.titulo.toUpperCase();
    montarOrbes(lec.mentor);
    hablar(lec.intro);

    const contenedor = $('leccion-contenedor');
    contenedor.innerHTML = '';
    lec.render(contenedor, alCompletar);

    $('overlay-leccion').hidden = false;
  }

  function cerrar() {
    abierta = null;
    $('overlay-leccion').hidden = true;
    $('leccion-contenedor').innerHTML = '';
  }

  function activo() { return abierta !== null; }

  function alCompletar(resultado) {
    if (!abierta) return;
    const id = abierta;
    const res = Estado.completarLeccion(id, resultado);
    if (!res.ok) {
      Render.toast(res.motivo, true);
      cerrar();
      Render.actualizarTodo();
      return;
    }

    // Confirmacion breve dentro del overlay y regreso a la base
    hablar('Modulo en linea. Buen trabajo.');
    $('leccion-contenedor').innerHTML =
      '<div class="leccion-exito">MODULO CONSTRUIDO<span>' + textoRecompensa(res.recompensa) + '</span></div>';

    setTimeout(() => {
      cerrar();
      Render.actualizarTodo();
      Render.toast('MODULO CONSTRUIDO: ' + textoRecompensa(res.recompensa));
      if (res.terminalCompletada) {
        setTimeout(() => {
          Render.seleccionar('hub');
          Render.toast('ASTILLERO CENTRAL EN LINEA: NIVEL SEGURIDAD COMPLETADO');
        }, 1600);
      }
    }, 1400);
  }

  function textoRecompensa(rec) {
    const partes = [];
    if (rec.escudo) partes.push('+' + rec.escudo + ' ESCUDO');
    if (rec.optimizacion) partes.push('+' + rec.optimizacion + ' OPTIMIZACION');
    if (rec.datos) partes.push('+' + rec.datos + ' DATOS');
    return partes.join(' / ');
  }

  // ---------- Orbe de mentor (version minima) ----------

  function montarOrbes(mentor) {
    const zona = $('mentor-zona');
    const cuales = mentor === 'ambos' ? ['comandante', 'ia'] : [mentor];
    zona.innerHTML = cuales.map((m) => {
      const datos = DATOS.mentores[m];
      return '<div class="orbe-bloque">' +
        '<div class="orbe ' + (m === 'ia' ? 'orbe-naranja' : 'orbe-cian') + '"></div>' +
        '<span class="orbe-nombre">' + datos.nombre + '</span>' +
      '</div>';
    }).join('');
  }

  // Gancho de voz: aqui se conectara el audio generado (TTS) despues.
  // Por ahora: subtitulo en pantalla + pulso del orbe (accesibilidad).
  function hablar(texto) {
    $('mentor-subtitulo').textContent = texto;
    document.querySelectorAll('#mentor-zona .orbe').forEach((o) => {
      o.classList.remove('hablando');
      void o.offsetWidth;
      o.classList.add('hablando');
    });
  }

  return { abrir, cerrar, activo, hablar };
})();
