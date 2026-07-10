// ============================================================
// TERMINALES DEL PUERTO (data-driven)
// Una entrada por terminal/nivel del curso. Agregar una terminal
// nueva = agregar su dato aqui + su pantalla de terminal; el mapa
// no se reescribe. Solo la que coincide con DATOS.terminal es
// jugable hoy; el resto se listan bloqueadas.
// Coordenadas en % sobre assets/mapa-cenital.png (calibrar con C).
// ============================================================

const TERMINALES = [
  { id: 'contenedores', nombre: 'Terminal Contenedores', nivel: 1, tema: 'Diagnostico del sistema',  x: 30, y: 30, estado: 'bloqueada' },
  { id: 'cruceros',     nombre: 'Terminal Cruceros',     nivel: 2, tema: 'Camara de aprendizaje',    x: 62, y: 40, estado: 'bloqueada' },
  { id: 'astillero',    nombre: 'Astillero',             nivel: 3, tema: 'Escudo de Datos',          x: 40, y: 55, estado: 'disponible' },
  { id: 'intermodal',   nombre: 'Terminal Intermodal',   nivel: 4, tema: 'Codigo de comando',        x: 50, y: 70, estado: 'bloqueada' },
  { id: 'usos',         nombre: 'Usos Multiples',        nivel: 5, tema: 'Innovacion y digitalizacion', x: 72, y: 62, estado: 'bloqueada' },
];
