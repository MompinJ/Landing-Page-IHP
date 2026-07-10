// ============================================================
// DATOS PUROS DE LA TERMINAL (astillero = Nivel 3, Escudo de Datos)
// Sockets pedagogicos, recompensas, mejoras y configuracion.
// Sin DOM ni logica de flujo: las otras 4 terminales seran otro
// archivo como este; el shell y el motor no cambian.
// ============================================================

const DATOS = {
  version: 2,

  // Id de esta terminal dentro del estado global compartido
  terminal: 'astillero',
  terminalNombre: 'Astillero',
  nivelCurso: 'Nivel 3 - Escudo de Datos',

  imagen: { src: 'assets/base-holografica.png', ancho: 2752, alto: 1536 },

  nivelMax: 3,
  barraMax: 100,

  // Coste en datos de reforzar un modulo al nivel indicado
  mejoras: {
    2: { datos: 150 },
    3: { datos: 300 },
  },

  categorias: {
    hub:          { etiqueta: 'HUB',                  color: '#4da3ff' },
    escudo:       { etiqueta: 'ESCUDO',               color: '#37c9e0' },
    optimizacion: { etiqueta: 'OPTIMIZACION',         color: '#e88a2a' },
    mixto:        { etiqueta: 'ESCUDO + OPTIMIZACION', color: '#5fd4b8' },
  },

  // Los dos mentores = los dos ejes (el humano FRENA, la IA ACELERA)
  mentores: {
    comandante: { nombre: 'COMANDANTE', eje: 'ESCUDO / SEGURIDAD', color: '#37c9e0' },
    ia:         { nombre: 'IA VIRTUAL', eje: 'OPTIMIZACION',       color: '#e88a2a' },
  },

  // Sockets pedagogicos: cada uno ES un subtema disfrazado de
  // infraestructura real del astillero. requiere = ids que deben estar
  // construidos antes (vacio = orden libre).
  sockets: [
    { id: 'hub',   nombre: 'Astillero Central',         categoria: 'hub',          x: 34.5, y: 35,   esHub: true },
    { id: 'sec-1', nombre: 'Perimetro y Accesos',       categoria: 'escudo',       x: 22,   y: 53,   subtema: '3.1 Seguridad de la informacion en IA',      requiere: [], recompensa: { escudo: 13, optimizacion: 0,  datos: 100 } },
    { id: 'sec-2', nombre: 'Boveda de Carga Clasificada', categoria: 'escudo',     x: 45,   y: 64,   subtema: '3.2 Datos personales, sensibles y confidenciales', requiere: [], recompensa: { escudo: 13, optimizacion: 0,  datos: 100 } },
    { id: 'sec-3', nombre: 'Grua de Embarque',          categoria: 'escudo',       x: 60.5, y: 26.5, subtema: '3.3 Riesgos de compartir informacion',       requiere: [], recompensa: { escudo: 13, optimizacion: 0,  datos: 100 } },
    { id: 'sec-4', nombre: 'Torre de Control',          categoria: 'escudo',       x: 26.5, y: 47.5, subtema: '3.4 Informacion segura vs delicada',         requiere: [], recompensa: { escudo: 13, optimizacion: 0,  datos: 100 } },
    { id: 'sec-5', nombre: 'Dique de Inspeccion',       categoria: 'mixto',        x: 55.5, y: 29,   subtema: '3.5 Identifica, anonimiza y consulta',       requiere: [], recompensa: { escudo: 13, optimizacion: 10, datos: 100 } },
    { id: 'sec-6', nombre: 'Canal Seguro Copilot',      categoria: 'optimizacion', x: 71.5, y: 33.5, subtema: '3.6 Copilot Chat corporativo',               requiere: [], recompensa: { escudo: 0,  optimizacion: 30, datos: 100 } },
  ],
};
