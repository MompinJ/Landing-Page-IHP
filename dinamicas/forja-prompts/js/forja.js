(() => {
  'use strict';

  // Fichas por categoria: puntos 0 (debil), 1 (regular), 2 (fuerte).
  const CATEGORIAS = [
    {
      id: 'rol',
      nombre: 'ROL',
      consejo: 'Un rol especifico enfoca al modelo: no es lo mismo un asistente generico que un analista de patio.',
      opciones: [
        { texto: 'Eres un asistente.', puntos: 0 },
        { texto: 'Eres experto en logistica.', puntos: 1 },
        { texto: 'Eres analista de operaciones de una terminal de contenedores.', puntos: 2 }
      ]
    },
    {
      id: 'contexto',
      nombre: 'CONTEXTO',
      consejo: 'Sin datos de la operacion, GAMMA inventa supuestos. Dale cifras reales: buques, gruas, ventana.',
      opciones: [
        { texto: 'Tenemos mucho trabajo.', puntos: 0 },
        { texto: 'Llego un buque grande esta manana.', puntos: 1 },
        { texto: 'Buque con 120 movimientos, 3 gruas STS disponibles, ventana de atraque de 6 horas.', puntos: 2 }
      ]
    },
    {
      id: 'tarea',
      nombre: 'TAREA',
      consejo: 'Pide una accion concreta y medible, no un "ayudame". El verbo manda.',
      opciones: [
        { texto: 'Ayudame con la descarga.', puntos: 0 },
        { texto: 'Dime como organizar las gruas.', puntos: 1 },
        { texto: 'Genera la secuencia de descarga por grua que cumpla la ventana y justifica cada asignacion.', puntos: 2 }
      ]
    },
    {
      id: 'formato',
      nombre: 'FORMATO',
      consejo: 'Si no pides formato, recibes parrafos. Pide tabla, lista o resumen segun lo que vayas a hacer con la salida.',
      opciones: [
        { texto: 'Como tu quieras.', puntos: 0 },
        { texto: 'En una lista.', puntos: 1 },
        { texto: 'Tabla con columnas grua / bahia / hora estimada, y un resumen de 3 lineas para el jefe de turno.', puntos: 2 }
      ]
    }
  ];

  const MAX_PUNTOS = 8;
  const UMBRAL_TRANSMISION = 6;

  const RESPUESTAS = [
    {
      min: 0,
      texto: 'Claro, con gusto te ayudo. Descargar un buque puede hacerse de muchas maneras. Lo importante es la seguridad y la comunicacion del equipo. Avisame si necesitas algo mas.'
    },
    {
      min: 3,
      texto: 'Sugerencia general:\n- Dividir el buque en zonas proa / media / popa\n- Asignar una grua por zona\n- Priorizar contenedores de importacion\n(Nota: sin datos de movimientos ni ventana, los tiempos son estimados.)'
    },
    {
      min: 6,
      texto: 'Plan preliminar (120 movs / 3 STS / 6 h):\n- STS-1: bahias 02-14, 42 movs\n- STS-2: bahias 18-30, 40 movs\n- STS-3: bahias 34-46, 38 movs\nRitmo requerido: 6.7 movs/h por grua. Holgura: 24 min.'
    },
    {
      min: 8,
      texto: 'GRUA | BAHIA | HORA EST.\nSTS-1 | 02-14 | 08:00-13:40\nSTS-2 | 18-30 | 08:00-13:30\nSTS-3 | 34-46 | 08:10-13:50\n\nRESUMEN P/ JEFE DE TURNO:\nVentana de 6 h se cumple con 24 min de holgura. STS-3 arranca 10 min tarde por reposicionamiento. Riesgo principal: reefers en bahia 30 requieren desconexion previa.'
    }
  ];

  const banco = document.getElementById('banco');
  const forja = document.getElementById('forja');
  const arco = document.getElementById('arco');
  const senalEl = document.getElementById('senal');
  const respuestaEl = document.getElementById('respuesta');
  const consejoTxt = document.getElementById('consejo-txt');
  const btnTransmitir = document.getElementById('btn-transmitir');
  const overlay = document.getElementById('overlay');

  const ARCO_LARGO = 151;

  // seleccion[catId] = indice de opcion montada, o null
  const seleccion = {};
  let animRespuesta = null;
  let textoActual = '';

  const puntosTotales = () =>
    CATEGORIAS.reduce((s, c) => s + (seleccion[c.id] != null ? c.opciones[seleccion[c.id]].puntos : 0), 0);

  const teclear = (texto) => {
    if (texto === textoActual) return;
    textoActual = texto;
    if (animRespuesta) cancelAnimationFrame(animRespuesta);
    let i = 0;
    const paso = () => {
      i = Math.min(texto.length, i + 3);
      respuestaEl.textContent = texto.slice(0, i);
      if (i < texto.length) animRespuesta = requestAnimationFrame(paso);
    };
    animRespuesta = requestAnimationFrame(paso);
  };

  const refrescar = () => {
    const pts = puntosTotales();
    const pct = Math.round((pts / MAX_PUNTOS) * 100);

    senalEl.textContent = pct;
    arco.style.strokeDashoffset = ARCO_LARGO * (1 - pts / MAX_PUNTOS);
    arco.style.stroke = pts >= UMBRAL_TRANSMISION ? 'var(--cian)' : pts >= 3 ? 'var(--ambar)' : 'var(--rojo)';
    senalEl.parentElement.style.color = arco.style.stroke;

    let resp = RESPUESTAS[0];
    RESPUESTAS.forEach((r) => { if (pts >= r.min) resp = r; });
    teclear(resp.texto);

    btnTransmitir.disabled = pts < UMBRAL_TRANSMISION;

    // EVA aconseja sobre la ranura mas debil
    let peor = null;
    CATEGORIAS.forEach((c) => {
      const p = seleccion[c.id] != null ? c.opciones[seleccion[c.id]].puntos : -1;
      if (peor === null || p < peor.p) peor = { c, p };
    });
    if (pts === MAX_PUNTOS) {
      consejoTxt.textContent = 'Instruccion de grado operativo. Asi se le habla a un copiloto de IA.';
    } else if (peor.p < 0) {
      consejoTxt.textContent = 'Falta montar ' + peor.c.nombre + '. ' + peor.c.consejo;
    } else if (peor.p < 2) {
      consejoTxt.textContent = 'Tu ficha de ' + peor.c.nombre + ' es debil. ' + peor.c.consejo;
    } else {
      consejoTxt.textContent = 'Senal en ascenso. Revisa que cada ranura tenga su mejor ficha.';
    }
  };

  const pintar = () => {
    banco.innerHTML = '';
    forja.innerHTML = '';

    CATEGORIAS.forEach((cat) => {
      const grupo = document.createElement('div');
      grupo.className = 'grupo';
      grupo.innerHTML = '<p class="grupo__nombre">' + cat.nombre + '</p>';
      cat.opciones.forEach((op, i) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'ficha';
        b.textContent = op.texto;
        b.classList.toggle('usada', seleccion[cat.id] === i);
        b.addEventListener('click', () => {
          seleccion[cat.id] = i;
          pintar();
        });
        grupo.appendChild(b);
      });
      banco.appendChild(grupo);

      const ranura = document.createElement('div');
      ranura.className = 'ranura';
      const idx = seleccion[cat.id];
      const llena = idx != null;
      ranura.innerHTML = '<p class="ranura__nombre">RANURA ' + cat.nombre + '</p>';
      const hueco = document.createElement('div');
      hueco.className = 'ranura__hueco' + (llena ? ' llena' : '');
      hueco.textContent = llena ? cat.opciones[idx].texto : '[ vacia ]';
      if (llena) {
        hueco.tabIndex = 0;
        hueco.setAttribute('role', 'button');
        hueco.setAttribute('aria-label', 'Retirar ficha de ' + cat.nombre);
        const retirar = () => { seleccion[cat.id] = null; pintar(); };
        hueco.addEventListener('click', retirar);
        hueco.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); retirar(); }
        });
      }
      ranura.appendChild(hueco);
      forja.appendChild(ranura);
    });

    refrescar();
  };

  btnTransmitir.addEventListener('click', () => {
    btnTransmitir.textContent = 'TRANSMISION SELLADA';
    btnTransmitir.disabled = true;
    consejoTxt.textContent = 'Prompt transmitido a GAMMA. Cambia cualquier ficha para forjar otro.';
    setTimeout(() => {
      btnTransmitir.textContent = 'TRANSMITIR A GAMMA';
      refrescar();
    }, 2200);
  });

  document.getElementById('btn-ayuda').addEventListener('click', () => { overlay.hidden = false; });
  document.getElementById('btn-entendido').addEventListener('click', () => { overlay.hidden = true; });

  CATEGORIAS.forEach((c) => { seleccion[c.id] = null; });
  pintar();
})();
