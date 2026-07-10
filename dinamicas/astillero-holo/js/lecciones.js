// ============================================================
// LECCIONES DE LA TERMINAL
// Cada leccion es un modulo autocontenido que cumple el contrato:
//   { id, titulo, subtema, mentor, intro, render(container, onComplete) }
// render() dibuja el mini-juego dentro de container y llama
// onComplete({ exito, puntaje }) cuando el usuario termina.
// Los mini-juegos reales de builds futuros SOLO sustituyen render().
// ============================================================

const LECCIONES = (() => {
  function def(id) {
    return DATOS.sockets.find((s) => s.id === id);
  }

  // Stub temporal: marcador de posicion con boton "Completar leccion".
  // descripcion = que mini-juego ira aqui cuando se construya de verdad.
  function stub(descripcion) {
    return function (contenedor, onComplete) {
      contenedor.innerHTML =
        '<div class="stub-leccion">' +
          '<p class="stub-marca">MINI-JUEGO EN CONSTRUCCION</p>' +
          '<p class="stub-desc">' + descripcion + '</p>' +
          '<button class="boton primario ancho" data-stub-completar>COMPLETAR LECCION</button>' +
        '</div>';
      contenedor.querySelector('[data-stub-completar]').addEventListener('click', () => {
        onComplete({ exito: true });
      });
    };
  }

  // Leccion real de referencia (valida el patron): semaforo de riesgos.
  // Clasificar documentos en verde / amarillo / rojo.
  function semaforoRiesgos(contenedor, onComplete) {
    const casos = [
      {
        frase: 'Horario publico de arribos y salidas de buques',
        correcta: 'verde',
        explica: 'Informacion publica: se puede compartir y consultar con IA sin riesgo.',
      },
      {
        frase: 'Reporte interno de productividad del patio, sin nombres',
        correcta: 'amarillo',
        explica: 'Uso interno: solo en canales corporativos y con criterio.',
      },
      {
        frase: 'Manifiesto con pasaportes de la tripulacion',
        correcta: 'rojo',
        explica: 'Datos personales sensibles: jamas a una IA publica.',
      },
      {
        frase: 'Credenciales de acceso al sistema de la terminal',
        correcta: 'rojo',
        explica: 'Secreto absoluto: no se comparte con nadie, tampoco con la IA.',
      },
    ];
    const nombres = { verde: 'VERDE', amarillo: 'AMARILLO', rojo: 'ROJO' };
    let indice = 0;
    let aciertos = 0;

    function pintarCaso() {
      const caso = casos[indice];
      contenedor.innerHTML =
        '<div class="semaforo">' +
          '<p class="semaforo-progreso">DOCUMENTO ' + (indice + 1) + ' / ' + casos.length + '</p>' +
          '<p class="semaforo-frase">"' + caso.frase + '"</p>' +
          '<div class="semaforo-botones">' +
            '<button class="boton semaforo-btn verde" data-color="verde">VERDE</button>' +
            '<button class="boton semaforo-btn amarillo" data-color="amarillo">AMARILLO</button>' +
            '<button class="boton semaforo-btn rojo" data-color="rojo">ROJO</button>' +
          '</div>' +
          '<div class="semaforo-feedback" hidden></div>' +
        '</div>';

      contenedor.querySelectorAll('.semaforo-btn').forEach((btn) => {
        btn.addEventListener('click', () => responder(btn.dataset.color));
      });
    }

    function responder(color) {
      const caso = casos[indice];
      const acierto = color === caso.correcta;
      if (acierto) aciertos++;

      contenedor.querySelectorAll('.semaforo-btn').forEach((b) => {
        b.disabled = true;
        if (b.dataset.color === caso.correcta) b.classList.add('resalta');
      });

      const fb = contenedor.querySelector('.semaforo-feedback');
      fb.hidden = false;
      fb.className = 'semaforo-feedback ' + (acierto ? 'bien' : 'mal');
      fb.innerHTML =
        '<p>' + (acierto ? 'CORRECTO' : 'INCORRECTO: era ' + nombres[caso.correcta]) + '</p>' +
        '<p class="semaforo-explica">' + caso.explica + '</p>' +
        '<button class="boton primario" data-sigue>' +
          (indice + 1 < casos.length ? 'SIGUIENTE DOCUMENTO' : 'VER RESULTADO') +
        '</button>';

      fb.querySelector('[data-sigue]').addEventListener('click', () => {
        indice++;
        if (indice < casos.length) pintarCaso();
        else terminar();
      });
    }

    function terminar() {
      contenedor.innerHTML =
        '<div class="semaforo">' +
          '<p class="semaforo-progreso">RESULTADO</p>' +
          '<p class="semaforo-frase">' + aciertos + ' / ' + casos.length + ' documentos bien clasificados</p>' +
          '<button class="boton primario ancho" data-fin>ENCENDER LA TORRE</button>' +
        '</div>';
      contenedor.querySelector('[data-fin]').addEventListener('click', () => {
        onComplete({ exito: true, puntaje: aciertos });
      });
    }

    pintarCaso();
  }

  const lecciones = {
    'sec-1': {
      mentor: 'comandante',
      intro: 'Comandante al habla. Antes de mover un solo contenedor, asegure el perimetro: la informacion solo entra y sale por accesos controlados.',
      render: stub('Escape room: sellar los accesos con datos expuestos antes de que se filtren.'),
    },
    'sec-2': {
      mentor: 'comandante',
      intro: 'Hay carga que no puede viajar a la vista. Datos personales, sensibles y confidenciales van en boveda, no en cubierta.',
      render: stub('Analisis de caso: etiquetar los datos sensibles de un manifiesto (unos obvios, otros por contexto).'),
    },
    'sec-3': {
      mentor: 'comandante',
      intro: 'Cada dato que sube a la nube es carga embarcada: ya no vuelve. Piense dos veces que iza esta grua.',
      render: stub('Consecuencias ramificadas: decidir que se sube al buque/nube y ver el resultado (fuga, multa, reputacion).'),
    },
    'sec-4': {
      mentor: 'comandante',
      intro: 'Torre de control: no todo documento pesa lo mismo. Aprenda a leer el semaforo antes de dar salida.',
      render: semaforoRiesgos,
    },
    'sec-5': {
      mentor: 'ambos',
      intro: 'Inspeccion final: identifique y anonimice antes de consultar. Mi colega digital le mostrara como acelerar sin exponer datos.',
      render: stub('Editor: tachar o sustituir los datos sensibles de un documento antes de "zarpar" (enviarlo a la IA).'),
    },
    'sec-6': {
      mentor: 'ia',
      intro: 'Canal seguro establecido. Soy tu copiloto: dentro del entorno corporativo puedo procesar lo que la IA publica jamas deberia ver.',
      render: stub('Comparacion interactiva: Copilot corporativo vs IA publica (seguridad y gobernanza).'),
    },
  };

  // Completa cada leccion con titulo y subtema desde los datos del socket
  Object.keys(lecciones).forEach((id) => {
    const socket = def(id);
    lecciones[id].id = id;
    lecciones[id].titulo = socket.nombre;
    lecciones[id].subtema = socket.subtema;
  });

  return lecciones;
})();
