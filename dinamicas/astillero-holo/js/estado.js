// ============================================================
// ESTADO GLOBAL Y LOGICA DE PROGRESO
// Sin DOM. Estado GLOBAL del curso (barras, recursos) + progreso
// por terminal, preparado para compartirse entre las 5 terminales
// aunque hoy solo exista el astillero. Persistencia en localStorage.
// Principio: construir = aprender. Las barras y los datos SOLO se
// ganan completando lecciones; no hay generacion pasiva.
// ============================================================

const Estado = (() => {
  const CLAVE = 'nexo-ia-estado-v1';
  let st = null;

  function plantillaTerminal() {
    const sockets = {};
    DATOS.sockets.forEach((s) => {
      sockets[s.id] = s.esHub
        ? { estado: 'bloqueado', nivel: 0 }
        : { estado: 'vacio', nivel: 0 };
    });
    return { completada: false, sockets };
  }

  function plantilla() {
    const terminales = {};
    terminales[DATOS.terminal] = plantillaTerminal();
    return {
      version: DATOS.version,
      barras: { escudo: 0, optimizacion: 0 },
      recursos: { datos: 0 },
      terminales,
      // Ultima pantalla vista, para restaurarla al recargar
      ui: { pantalla: 'mapa', terminal: null },
    };
  }

  function init() {
    let guardado = null;
    try { guardado = JSON.parse(localStorage.getItem(CLAVE)); } catch (e) { guardado = null; }
    st = plantilla();
    if (guardado && guardado.version === DATOS.version) {
      Object.assign(st.barras, guardado.barras);
      Object.assign(st.recursos, guardado.recursos);
      if (guardado.ui) Object.assign(st.ui, guardado.ui);
      if (guardado.terminales) {
        Object.keys(guardado.terminales).forEach((t) => {
          if (t !== DATOS.terminal) { st.terminales[t] = guardado.terminales[t]; return; }
          const term = guardado.terminales[t];
          st.terminales[t].completada = !!term.completada;
          DATOS.sockets.forEach((s) => {
            if (term.sockets && term.sockets[s.id]) st.terminales[t].sockets[s.id] = term.sockets[s.id];
          });
        });
      }
    }
    guardar();
  }

  function guardar() {
    localStorage.setItem(CLAVE, JSON.stringify(st));
  }

  function get() { return st; }

  function terminal() { return st.terminales[DATOS.terminal]; }

  function socket(id) { return terminal().sockets[id]; }

  function def(id) {
    return DATOS.sockets.find((s) => s.id === id);
  }

  function leccionesTotales() {
    return DATOS.sockets.filter((s) => !s.esHub).length;
  }

  function leccionesCompletadas() {
    return DATOS.sockets.filter((s) => !s.esHub && socket(s.id).estado === 'construido').length;
  }

  // Un socket esta disponible si sus prerrequisitos (requiere) estan construidos
  function disponible(d) {
    if (d.esHub) return false;
    return (d.requiere || []).every((req) => socket(req).estado === 'construido');
  }

  function sumaBarra(barra, cantidad) {
    st.barras[barra] = Math.min(DATOS.barraMax, Math.round(st.barras[barra] + (cantidad || 0)));
  }

  // Nucleo del flujo construir = aprender
  function completarLeccion(id, resultado) {
    const d = def(id);
    if (!d || d.esHub) return { ok: false, motivo: 'LECCION INVALIDA' };
    const s = socket(id);
    if (s.estado === 'construido') return { ok: false, motivo: 'MODULO YA CONSTRUIDO' };
    if (!disponible(d)) return { ok: false, motivo: 'REQUIERE OTRO MODULO ANTES' };
    if (!resultado || resultado.exito !== true) return { ok: false, motivo: 'LECCION NO COMPLETADA' };

    s.estado = 'construido';
    s.nivel = 1;
    if (typeof resultado.puntaje === 'number') s.puntaje = resultado.puntaje;

    sumaBarra('escudo', d.recompensa.escudo);
    sumaBarra('optimizacion', d.recompensa.optimizacion);
    st.recursos.datos += d.recompensa.datos || 0;

    // Al completar las 6 lecciones se enciende el hub: terminal construida
    let terminalCompletada = false;
    if (leccionesCompletadas() === leccionesTotales() && !terminal().completada) {
      const hub = terminal().sockets.hub;
      hub.estado = 'construido';
      hub.nivel = 1;
      terminal().completada = true;
      st.barras.escudo = DATOS.barraMax;
      terminalCompletada = true;
    }

    guardar();
    return { ok: true, recompensa: d.recompensa, terminalCompletada };
  }

  // Mejorar (reforzar) un modulo ya construido gastando datos
  function costeMejora(id) {
    const s = socket(id);
    if (!s || s.estado !== 'construido' || s.nivel >= DATOS.nivelMax) return null;
    return DATOS.mejoras[s.nivel + 1];
  }

  function mejorar(id) {
    const s = socket(id);
    if (!s || s.estado !== 'construido') return { ok: false, motivo: 'NO CONSTRUIDO' };
    const coste = costeMejora(id);
    if (!coste) return { ok: false, motivo: 'NIVEL MAXIMO' };
    if (st.recursos.datos < coste.datos) return { ok: false, motivo: 'DATOS INSUFICIENTES' };
    st.recursos.datos -= coste.datos;
    s.nivel += 1;
    guardar();
    return { ok: true, motivo: 'MODULO REFORZADO A NIVEL ' + s.nivel };
  }

  function setPantalla(pantalla, terminal) {
    st.ui = { pantalla, terminal };
    guardar();
  }

  function reiniciar() {
    st = plantilla();
    guardar();
  }

  return {
    init, get, guardar, def, socket, terminal, setPantalla,
    disponible, completarLeccion, costeMejora, mejorar,
    leccionesTotales, leccionesCompletadas, reiniciar,
  };
})();
