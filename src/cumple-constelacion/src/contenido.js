// ---------------------------------------------------------------
//  TODO EL CONTENIDO DE LA PAGINA VIVE AQUI.
//  Cambia estos textos y las rutas de las fotos, nada mas.
// ---------------------------------------------------------------

export const contenido = {
  // Pantalla de entrada
  intro: {
    antetitulo: 'Hoy es tu día',
    nombre: 'Citlali Itzamaray',
    subtitulo: 'Feliz cumpleaños',
    invitacion: 'desliza',
  },

  // Las cuatro fotos, en orden de aparicion.
  // Pon los archivos en public/fotos/ y apunta la ruta aqui.
  // La ruta va SIN diagonal al inicio: la pagina se sirve desde una
  // subcarpeta, asi que todo se resuelve relativo a index.html.
  //
  // El marco adopta solo la proporcion de cada archivo, o sea que por
  // defecto NO se recorta nada. Si una foto necesita reencuadre:
  //   zoom   > 1 acerca (1.5 = se ve la mitad del encuadre original)
  //   centro [x, y] en 0..1 mueve el recorte. x: 0 izquierda, 1 derecha.
  //                                           y: 0 abajo,     1 arriba.
  fotos: [
    {
      src: 'fotos/4.jpeg',
      // Los cuatro titulos son una sola frase partida en cuatro:
      // "Recordando... la amistad... que hemos construido... y durará."
      // Por eso van en minuscula del segundo en adelante.
      titulo: 'Recordando...',
      texto:
        'Pensar que mi gran amiga, comenzamos esta amistad en WhatsApp, por dudas de matemáticas con el profe Moisés, en líneaaa, que me atreví un poco a sacarte plática y conocer un poco de ti, nuestras conversaciones de nosotros que no nos conocíamos pero logramos encajar en WhatsApp, cuando volvimos a clases taba nervioso por cómo sería nuestra interacción, pero me atreví a hablarte como nos llevábamos y desde ahí surgió una gran amistad que valoro demasiado hasta el día de hoy',
    },
    {
      src: 'fotos/2.jpeg',
      titulo: 'la amistad...',
      texto:
        'A lo largo de nuestra amistad hemos tenido un montón de pláticas y opiniones, unas funables, unas divertidas, muchas tristes :(, y acá seguimos, dándonos consejos mutuamente, escuchando el uno al otro y afrontando cada quien una realidad, buscando seguir adelante cada uno por su cuenta, pero sabiendo que tenemos a alguien que confía',
    },
    {
      src: 'fotos/3.jpeg',
      titulo: 'que hemos construido...',
      texto:
        'Nuestros días en prepa, tengo recuerdos muy bonitos, recuerdo con amor y nostalgia esos días donde lo tenía todo, y siempre me apoyaste y estabas conmigo, pasamos una prepa muy padre, conocerte fue fundamental, eres como una confidente en la que puedo confiar y consultar, esa amistad sana que hemos formado poco a poco y espero que sigamos formando',
    },
    {
      src: 'fotos/1.jpeg',
      titulo: 'y durará.',
      // Media foto era pared blanca: se acerca a la parte de abajo
      zoom: 1.42,
      centro: [0.535, 0.355],
      texto:
        'Desconozco el futuro que nos depara, las relaciones que nos falta, los vínculos que se romperán y los q resurgirán (Angy xfa vuelve), pero me aseguraré de mantener tu amistad, te aprecio mucho y valoro que espero vivir lo suficiente para seguir pasando años junto a ti, y pasar el momento donde seamos bn exitosos y nos vayamos a un viaje y ahí rememorar el pasado...',
    },
  ],

  // El mensaje final, cuando se dibuja la constelacion.
  // Cada string es un parrafo.
  mensaje: {
    parrafos: [
      'Eres mi gran amiga, te quiero muchísimo y te deseo todo lo mejor del mundo.',
    ],
    firma: 'Feliz cumpleaños',
  },
}

// ---------------------------------------------------------------
//  Paleta. Cambiala solo si quieres otro color de acento.
// ---------------------------------------------------------------
export const paleta = {
  fondo: '#05060b',
  oro: '#e8c36a',
  oroClaro: '#fff3d6',
  oroTenue: '#8a6f3c',
  texto: '#f2ece1',
}
