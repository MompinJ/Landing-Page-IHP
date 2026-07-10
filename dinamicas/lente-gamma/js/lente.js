(() => {
  'use strict';

  // Fragmentos auditables. tipo 'riesgo' = anomalia real; 'senuelo' = falso positivo.
  const FRAGS = {
    cifra: {
      tipo: 'riesgo',
      etiqueta: 'DATO INVENTADO',
      explica: 'La OMI no publica esa cifra. Un 340% en un mes es una alucinacion clasica: toda cifra generada por IA se verifica contra la fuente antes de enviarse.'
    },
    confidencial: {
      tipo: 'riesgo',
      etiqueta: 'FUGA DE INFORMACION',
      explica: 'Las tarifas pactadas con otras navieras son confidenciales. Adjuntarlas viola acuerdos comerciales y politicas de datos, aunque la IA lo sugiera con buena intencion.'
    },
    instruccion: {
      tipo: 'riesgo',
      etiqueta: 'INSTRUCCION RIESGOSA',
      explica: 'Desactivar una validacion de seguridad para ganar velocidad nunca es aceptable. La IA optimiza lo que le pediste, no lo que es seguro.'
    },
    supervision: {
      tipo: 'riesgo',
      etiqueta: 'IA SIN SUPERVISION',
      explica: 'Decisiones criticas como que contenedor inspeccionar requieren un humano en el circuito. La IA propone; una persona dispone.'
    },
    sesgo: {
      tipo: 'riesgo',
      etiqueta: 'SESGO',
      explica: 'Excluir a los operadores veteranos por edad es discriminatorio, y ademas desperdicia la experiencia que mas necesita el programa.'
    },
    aprende: {
      tipo: 'senuelo',
      explica: 'Falso positivo: que un sistema aprenda de los datos de operacion es su funcionamiento normal, no una anomalia.'
    },
    declara: {
      tipo: 'senuelo',
      explica: 'Falso positivo: declarar que hubo apoyo de IA y revision humana es exactamente la practica correcta.'
    },
    anonimo: {
      tipo: 'senuelo',
      explica: 'Falso positivo: operar con datos anonimizados es una buena practica de privacidad, no un riesgo.'
    }
  };

  const TOTAL_RIESGOS = Object.values(FRAGS).filter((f) => f.tipo === 'riesgo').length;
  const CASTIGO_SENUELO = 12;

  // [[id|texto]] marca un fragmento auditable
  const CORREO = [
    '<p class="doc__meta">DE: coordinacion.comercial@terminal<br>PARA: Naviera Estrella Azul<br>ASUNTO: Avances del piloto de IA<br>BORRADOR GENERADO POR ASISTENTE-IA v0.9</p>',
    '<p>Estimado cliente:</p>',
    '<p>Le comparto los avances del piloto de inteligencia artificial en la terminal. Segun un estudio de la OMI, [[cifra|las terminales que adoptan IA aumentan su productividad un 340% durante el primer mes]].</p>',
    '<p>Para que pueda comparar condiciones, [[confidencial|adjunto el historial completo de tarifas que manejamos con otras navieras]].</p>',
    '<p>Nuestro copiloto GAMMA ya opera en el patio y [[anonimo|trabaja unicamente con datos anonimizados de la operacion]]. [[aprende|El sistema aprende de cada turno y mejora semana a semana]]. Para agilizar sus citas en temporada alta, [[instruccion|recomendamos desactivar la validacion manual de accesos durante los picos]].</p>',
    '<p>Como parte del piloto, [[supervision|la IA ya decide por si sola que contenedores se inspeccionan, sin intervencion de nuestro personal]].</p>',
    '<p>En el programa de capacitacion [[sesgo|empezaremos por el personal joven, que absorbe estas herramientas mejor que los operadores veteranos]].</p>',
    '<p>[[declara|Este borrador fue redactado con apoyo de IA y sera revisado por una persona antes del envio]].</p>',
    '<p>Atentamente,<br>Coordinacion Comercial</p>'
  ].join('');

  const documento = document.getElementById('documento');
  const docBase = document.getElementById('doc-base');
  const docScan = document.getElementById('doc-scan');
  const lente = document.getElementById('lente');
  const conteo = document.getElementById('conteo');
  const hallazgos = document.getElementById('hallazgos');
  const mensajeTxt = document.getElementById('mensaje-txt');
  const precNivel = document.getElementById('precision-nivel');
  const precValor = document.getElementById('precision-valor');
  const overlay = document.getElementById('overlay');
  const final = document.getElementById('final');

  let marcados = 0;
  let senuelosClic = 0;
  let precision = 100;

  const renderDoc = () =>
    CORREO.replace(/\[\[(\w+)\|([^\]]+)\]\]/g, (_, id, texto) =>
      '<span class="frag" data-id="' + id + '">' + texto + '</span>');

  const fragsDe = (id) => document.querySelectorAll('.frag[data-id="' + id + '"]');

  const ponPrecision = () => {
    precNivel.style.width = precision + '%';
    precValor.textContent = precision + '%';
    const color = precision >= 80 ? 'var(--verde)' : precision >= 60 ? 'var(--ambar)' : 'var(--rojo)';
    precNivel.style.background = color;
    precValor.style.color = color;
  };

  const decir = (txt) => { mensajeTxt.textContent = txt; };

  const revisarFin = () => {
    if (marcados < TOTAL_RIESGOS) return;
    const detalle = 'Anomalias detectadas: ' + marcados + '/' + TOTAL_RIESGOS +
      '. Precision final: ' + precision + '%' +
      (senuelosClic ? ' (' + senuelosClic + ' falso' + (senuelosClic > 1 ? 's' : '') + ' positivo' + (senuelosClic > 1 ? 's' : '') + ').' : ', sin falsos positivos.') +
      ' Este borrador NO debia enviarse: la ultima palabra siempre es de una persona.';
    document.getElementById('final-detalle').textContent = detalle;
    setTimeout(() => { final.hidden = false; }, 700);
  };

  const alClic = (e) => {
    const frag = e.target.closest('.frag');
    if (!frag || frag.classList.contains('marcado') || frag.classList.contains('descartado')) return;
    const id = frag.dataset.id;
    const info = FRAGS[id];

    if (info.tipo === 'riesgo') {
      fragsDe(id).forEach((f) => f.classList.add('marcado'));
      marcados++;
      conteo.textContent = marcados + '/' + TOTAL_RIESGOS;
      const li = document.createElement('li');
      li.className = 'hallazgo';
      li.innerHTML = '<span class="hallazgo__tipo">' + info.etiqueta + '</span>' + info.explica;
      hallazgos.appendChild(li);
      li.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      decir('Hallazgo confirmado: ' + info.etiqueta.toLowerCase() + '. Quedan ' + (TOTAL_RIESGOS - marcados) + '.');
      revisarFin();
    } else {
      fragsDe(id).forEach((f) => f.classList.add('descartado'));
      senuelosClic++;
      precision = Math.max(40, precision - CASTIGO_SENUELO);
      ponPrecision();
      decir(info.explica);
    }
  };

  // ---------- lente ----------

  const moverLente = (e) => {
    const r = documento.getBoundingClientRect();
    const x = e.clientX - r.left;
    const y = e.clientY - r.top;
    lente.style.left = x + 'px';
    lente.style.top = y + 'px';
    docScan.style.clipPath = 'circle(' + (lente.offsetWidth / 2 - 2) + 'px at ' + x + 'px ' + y + 'px)';
  };

  documento.addEventListener('pointermove', (e) => {
    lente.classList.add('viva');
    moverLente(e);
  });

  documento.addEventListener('pointerdown', (e) => {
    lente.classList.add('viva');
    moverLente(e);
  });

  documento.addEventListener('pointerleave', () => {
    lente.classList.remove('viva');
    docScan.style.clipPath = 'circle(0px at -100px -100px)';
  });

  // scroll espejo entre capas (pantallas chicas)
  let sincronizando = false;
  const espejo = (a, b) => a.addEventListener('scroll', () => {
    if (sincronizando) return;
    sincronizando = true;
    b.scrollTop = a.scrollTop;
    sincronizando = false;
  });

  // ---------- ciclo de vida ----------

  const iniciar = () => {
    marcados = 0;
    senuelosClic = 0;
    precision = 100;
    const html = renderDoc();
    docBase.innerHTML = html;
    docScan.innerHTML = html;
    hallazgos.innerHTML = '';
    conteo.textContent = '0/' + TOTAL_RIESGOS;
    final.hidden = true;
    ponPrecision();
    decir('Mueve mi lente sobre el texto: donde yo veo algo raro, lo subrayo. Tu decides si lo marcas.');
  };

  docScan.addEventListener('click', alClic);
  espejo(docBase, docScan);
  espejo(docScan, docBase);

  document.getElementById('btn-reiniciar').addEventListener('click', iniciar);
  document.getElementById('btn-otra').addEventListener('click', iniciar);
  document.getElementById('btn-ayuda').addEventListener('click', () => { overlay.hidden = false; });
  document.getElementById('btn-entendido').addEventListener('click', () => { overlay.hidden = true; });

  iniciar();
})();
