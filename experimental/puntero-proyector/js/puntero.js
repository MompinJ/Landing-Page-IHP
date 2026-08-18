(() => {
  const canvas = document.getElementById('lienzo');
  const ctx = canvas.getContext('2d');
  const gridCanvas = document.getElementById('rejilla');
  const gctx = gridCanvas.getContext('2d');
  const panel = document.getElementById('panel');
  const logEl = document.getElementById('log');
  const senalEl = document.getElementById('senal');
  const senalEstado = document.getElementById('senal-estado');
  const senalDetalle = document.getElementById('senal-detalle');
  const btnClear = document.getElementById('btn-clear');
  const btnGrid = document.getElementById('btn-grid');
  const btnCal = document.getElementById('btn-cal');
  const btnCalExit = document.getElementById('btn-cal-exit');
  const btnExport = document.getElementById('btn-export');
  const btnHelp = document.getElementById('btn-help');
  const btnStart = document.getElementById('btn-start');
  const intro = document.getElementById('intro');

  const COLORS = { pen: '#38e1ff', touch: '#ff5fae', mouse: '#ffce45' };
  const colorFor = (type) => COLORS[type] || '#9aa0ab';

  // un salto asi de grande entre dos muestras no lo produce un trackpad: delata puntero absoluto
  const JUMP_PX = 120;
  const CAL_TOLERANCE = 40;

  const active = new Map();
  const counts = { pen: 0, touch: 0, mouse: 0, unknown: 0 };
  const bitacora = [];
  let total = 0;
  let jumps = 0;
  let last = null;
  let gridOn = false;

  const resizeCanvas = (c, context) => {
    const dpr = window.devicePixelRatio || 1;
    c.width = innerWidth * dpr;
    c.height = innerHeight * dpr;
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
  };

  // --- dianas de calibracion -------------------------------------------------

  const calState = { on: false, step: 0, hits: [] };

  const calTargets = () => {
    const mx = 90, my = 90;
    const xs = [mx, innerWidth / 2, innerWidth - mx];
    const ys = [my, innerHeight / 2, innerHeight - my];
    const pts = [];
    ys.forEach((y) => xs.forEach((x) => pts.push([x, y])));
    return pts;
  };

  const drawTargets = () => {
    // al terminar la ronda se dejan las dianas y los desvios en pantalla: es el resultado
    if (!calState.on && !calState.hits.length) return;
    const pts = calTargets();
    pts.forEach(([x, y], i) => {
      const done = i < calState.step;
      const now = i === calState.step;
      gctx.strokeStyle = done ? 'rgba(125, 148, 160, 0.5)' : (now ? '#ff5fae' : 'rgba(56, 225, 255, 0.3)');
      gctx.lineWidth = now ? 3 : 1.5;
      gctx.beginPath(); gctx.arc(x, y, now ? 30 : 18, 0, Math.PI * 2); gctx.stroke();
      gctx.beginPath(); gctx.moveTo(x - 40, y); gctx.lineTo(x + 40, y); gctx.stroke();
      gctx.beginPath(); gctx.moveTo(x, y - 40); gctx.lineTo(x, y + 40); gctx.stroke();
    });
    const [tx, ty] = pts[calState.step] || [];
    if (tx != null) {
      gctx.fillStyle = '#ff5fae';
      gctx.font = '600 18px monospace';
      gctx.textAlign = 'center';
      gctx.fillText(`${calState.step + 1} / ${pts.length}`, tx, ty + 62);
    }
    // dibuja donde cayo cada toque frente a su diana
    calState.hits.forEach((h) => {
      gctx.strokeStyle = '#ffce45';
      gctx.lineWidth = 1.5;
      gctx.beginPath(); gctx.moveTo(h.tx, h.ty); gctx.lineTo(h.x, h.y); gctx.stroke();
      gctx.beginPath(); gctx.arc(h.x, h.y, 5, 0, Math.PI * 2); gctx.stroke();
    });
  };

  const calAverage = () => {
    if (!calState.hits.length) return null;
    const sum = calState.hits.reduce(
      (acc, h) => ({ dx: acc.dx + h.dx, dy: acc.dy + h.dy, d: acc.d + Math.hypot(h.dx, h.dy) }),
      { dx: 0, dy: 0, d: 0 }
    );
    const n = calState.hits.length;
    return { dx: sum.dx / n, dy: sum.dy / n, d: sum.d / n, n };
  };

  const registerCalHit = (x, y) => {
    const pts = calTargets();
    const [tx, ty] = pts[calState.step];
    const hit = { tx, ty, x, y, dx: x - tx, dy: y - ty };
    calState.hits.push(hit);
    calState.step += 1;

    const avg = calAverage();
    field('cal-last').textContent = `${hit.dx.toFixed(0)}, ${hit.dy.toFixed(0)} px`;
    field('cal-avg').textContent = `${avg.dx.toFixed(0)}, ${avg.dy.toFixed(0)} px (${avg.d.toFixed(0)} de dist.)`;
    note(`diana ${calState.hits.length}: desvio dx ${hit.dx.toFixed(0)} dy ${hit.dy.toFixed(0)}`);

    if (calState.step >= pts.length) {
      const veredicto = avg.d <= CAL_TOLERANCE
        ? `calibracion OK: desvio medio ${avg.d.toFixed(0)} px`
        : `DESALINEADO: desvio medio ${avg.d.toFixed(0)} px (revisar escalado / relacion de aspecto)`;
      note(veredicto);
      field('cal-step').textContent = 'terminada';
      calState.on = false;
      senalEl.classList.remove('senal--oculta');
      document.body.classList.remove('calibrando');
      btnCalExit.hidden = true;
    } else {
      field('cal-step').textContent = `${calState.step + 1} de ${pts.length}`;
    }
    drawAll();
  };

  const toggleCal = () => {
    calState.on = !calState.on;
    calState.step = 0;
    calState.hits = [];
    senalEl.classList.toggle('senal--oculta', calState.on);
    document.body.classList.toggle('calibrando', calState.on);
    btnCalExit.hidden = !calState.on;
    field('cal-step').textContent = calState.on ? `1 de ${calTargets().length}` : 'apagada';
    field('cal-last').textContent = '--';
    field('cal-avg').textContent = '--';
    note(calState.on ? 'calibracion: toca cada diana en orden' : 'calibracion cancelada');
    drawAll();
  };

  // --- rejilla ---------------------------------------------------------------

  const drawGrid = () => {
    if (!gridOn) return;
    const step = 80;
    gctx.strokeStyle = 'rgba(56, 225, 255, 0.22)';
    gctx.lineWidth = 1;
    for (let x = 0; x <= innerWidth; x += step) {
      gctx.beginPath(); gctx.moveTo(x, 0); gctx.lineTo(x, innerHeight); gctx.stroke();
    }
    for (let y = 0; y <= innerHeight; y += step) {
      gctx.beginPath(); gctx.moveTo(0, y); gctx.lineTo(innerWidth, y); gctx.stroke();
    }
    const marks = [
      [24, 24], [innerWidth - 24, 24],
      [24, innerHeight - 24], [innerWidth - 24, innerHeight - 24],
      [innerWidth / 2, innerHeight / 2]
    ];
    gctx.strokeStyle = '#38e1ff';
    gctx.lineWidth = 2;
    marks.forEach(([x, y]) => {
      gctx.beginPath(); gctx.moveTo(x - 14, y); gctx.lineTo(x + 14, y); gctx.stroke();
      gctx.beginPath(); gctx.moveTo(x, y - 14); gctx.lineTo(x, y + 14); gctx.stroke();
    });
  };

  const drawAll = () => {
    gctx.clearRect(0, 0, innerWidth, innerHeight);
    drawGrid();
    drawTargets();
  };

  const resizeAll = () => {
    resizeCanvas(canvas, ctx);
    resizeCanvas(gridCanvas, gctx);
    drawAll();
    document.getElementById('env-view').textContent = `${innerWidth} x ${innerHeight}`;
  };

  // --- bitacora y panel ------------------------------------------------------

  const stamp = () => performance.now().toFixed(0).padStart(7, ' ');

  const pushLog = (line) => {
    bitacora.push(line);
    const row = document.createElement('div');
    row.className = 'log__row';
    row.textContent = line;
    logEl.prepend(row);
    while (logEl.childElementCount > 14) logEl.lastElementChild.remove();
  };

  const note = (texto) => pushLog(`${stamp()}  ${texto}`);

  const logEvent = (label, evt, delta) => {
    pushLog(
      `${stamp()}  ${label.padEnd(14, ' ')} ` +
      `#${evt.pointerId ?? '-'} ${(evt.pointerType || 'mouse').padEnd(6, ' ')} ` +
      `x:${(evt.clientX ?? 0).toFixed(0)} y:${(evt.clientY ?? 0).toFixed(0)} ` +
      `p:${(evt.pressure ?? 0).toFixed(2)} b:${evt.buttons ?? '-'} ` +
      `salto:${delta == null ? '-' : delta.toFixed(0)}`
    );
  };

  const field = (name) => panel.querySelector(`[data-f="${name}"]`);

  const updatePanel = (label, evt, delta) => {
    field('evt').textContent = label;
    field('type').textContent = evt.pointerType || '(sin tipo)';
    field('id').textContent = evt.pointerId ?? '--';
    field('primary').textContent = evt.isPrimary == null ? '--' : (evt.isPrimary ? 'si' : 'no');
    field('xy').textContent = `${(evt.clientX ?? 0).toFixed(0)}, ${(evt.clientY ?? 0).toFixed(0)}`;
    field('pressure').textContent = (evt.pressure ?? 0).toFixed(2);
    field('tilt').textContent = `${evt.tiltX ?? 0} / ${evt.tiltY ?? 0}`;
    field('size').textContent = `${(evt.width ?? 0).toFixed(1)} x ${(evt.height ?? 0).toFixed(1)}`;
    field('buttons').textContent = evt.buttons ?? '--';
    field('active').textContent = active.size;
    field('total').textContent = total;
    field('jumps').textContent = jumps;
    field('delta').textContent = delta == null ? '--' : `${delta.toFixed(0)} px`;
    field('counts').textContent =
      `pen ${counts.pen} · touch ${counts.touch} · mouse ${counts.mouse} · ? ${counts.unknown}`;
  };

  const updateSenal = (evt) => {
    const tipo = evt.pointerType || 'mouse';
    senalEl.classList.remove('senal--idle');
    senalEl.classList.add('senal--live');
    senalEl.style.borderColor = colorFor(tipo);
    senalEstado.style.color = colorFor(tipo);
    senalEstado.textContent = `SEÑAL: ${tipo.toUpperCase()}`;
    senalDetalle.textContent =
      `${total} eventos · ${jumps} saltos · presion ${(evt.pressure ?? 0).toFixed(2)}` +
      (tipo === 'mouse' && jumps === 0 ? ' · (podria ser el trackpad)' : '');
  };

  // --- captura global --------------------------------------------------------
  // se escucha en window y en fase de captura: nada de lo que este encima
  // (paneles, tarjeta de instrucciones) puede tragarse un evento sin que lo veamos

  const isDrawable = () => intro.hidden && !calState.on;

  const track = (label) => (evt) => {
    total += 1;

    let delta = null;
    if (last && evt.clientX != null) {
      delta = Math.hypot(evt.clientX - last.x, evt.clientY - last.y);
      if (delta >= JUMP_PX) jumps += 1;
    }
    if (evt.clientX != null) last = { x: evt.clientX, y: evt.clientY };

    updateSenal(evt);
    updatePanel(label, evt, delta);
    if (label !== 'pointermove' && label !== 'mousemove') logEvent(label, evt, delta);
  };

  const trackMove = track('pointermove');

  window.addEventListener('pointerdown', (evt) => {
    const type = COLORS[evt.pointerType] ? evt.pointerType : 'unknown';
    counts[type] += 1;
    track('pointerdown')(evt);

    // tocar un boton o un panel no es tocar una diana
    const sobreUI = evt.target instanceof Element &&
      evt.target.closest('.toolbar, .hud, .intro, .help-btn, .senal, .cal-exit');

    if (calState.on) {
      if (!sobreUI) registerCalHit(evt.clientX, evt.clientY);
      return;
    }
    if (!isDrawable()) return;

    active.set(evt.pointerId, { x: evt.clientX, y: evt.clientY, color: colorFor(evt.pointerType) });
    ctx.fillStyle = colorFor(evt.pointerType);
    ctx.beginPath();
    ctx.arc(evt.clientX, evt.clientY, widthFor(evt) / 2, 0, Math.PI * 2);
    ctx.fill();
  }, true);

  window.addEventListener('pointermove', (evt) => {
    trackMove(evt);
    const stroke = active.get(evt.pointerId);
    if (!stroke) return;

    // getCoalescedEvents recupera muestras intermedias que el navegador agrupo en un solo pointermove
    const raw = typeof evt.getCoalescedEvents === 'function' ? evt.getCoalescedEvents() : [];
    const chain = raw.length ? raw : [evt];

    ctx.strokeStyle = stroke.color;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (const p of chain) {
      ctx.lineWidth = widthFor(p);
      ctx.beginPath();
      ctx.moveTo(stroke.x, stroke.y);
      ctx.lineTo(p.clientX, p.clientY);
      ctx.stroke();
      stroke.x = p.clientX;
      stroke.y = p.clientY;
    }
  }, true);

  const release = (label) => (evt) => {
    active.delete(evt.pointerId);
    track(label)(evt);
  };
  window.addEventListener('pointerup', release('pointerup'), true);
  window.addEventListener('pointercancel', release('pointercancel'), true);

  // hover sin contacto: un lapiz que se acerca sin tocar tambien es una senal util
  window.addEventListener('pointerover', track('pointerover'), true);
  window.addEventListener('pointerout', track('pointerout'), true);

  // el boton derecho del lapiz suele llegar como menu contextual: vale la pena verlo
  window.addEventListener('contextmenu', track('contextmenu'), true);

  // red de seguridad: si el navegador no tiene PointerEvent, los eventos crudos son lo unico que hay.
  // con PointerEvent presente serian duplicados de compatibilidad y solo ensuciarian los conteos.
  if (!window.PointerEvent) {
    ['mousedown', 'mouseup', 'click'].forEach((tipo) => {
      window.addEventListener(tipo, track(tipo), true);
    });
    ['touchstart', 'touchend'].forEach((tipo) => {
      window.addEventListener(tipo, (evt) => {
        const t = evt.changedTouches[0];
        if (!t) return;
        track(tipo)({ clientX: t.clientX, clientY: t.clientY, pointerId: t.identifier, pointerType: 'touch', pressure: t.force ?? 0 });
      }, true);
    });
  }

  // sin soporte de presion (mouse), el spec sugiere 0.5 mientras el boton esta activo
  function widthFor(evt) {
    return 1.5 + (evt.pressure > 0 ? evt.pressure : 0.5) * 6;
  }

  // --- exportar --------------------------------------------------------------

  const exportLog = () => {
    const avg = calAverage();
    const cabecera = [
      '# Puntero de proyector // bitacora de diagnostico',
      `fecha: ${new Date().toISOString()}`,
      `userAgent: ${navigator.userAgent}`,
      `maxTouchPoints: ${navigator.maxTouchPoints}`,
      `PointerEvent: ${window.PointerEvent ? 'si' : 'no'}`,
      `devicePixelRatio: ${window.devicePixelRatio || 1}`,
      `viewport: ${innerWidth} x ${innerHeight}`,
      `pantalla: ${screen.width} x ${screen.height}`,
      `eventos: ${total} · saltos: ${jumps}`,
      `conteo: pen ${counts.pen} / touch ${counts.touch} / mouse ${counts.mouse} / ? ${counts.unknown}`,
      avg
        ? `calibracion: ${avg.n} dianas, desvio medio dx ${avg.dx.toFixed(1)} dy ${avg.dy.toFixed(1)} (dist ${avg.d.toFixed(1)} px)`
        : 'calibracion: sin dianas registradas',
      '',
      '# eventos (mas antiguo primero)',
      ''
    ].join('\n');

    const blob = new Blob([cabecera + bitacora.join('\n') + '\n'], { type: 'text/plain' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `puntero-log-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.txt`;
    a.click();
    URL.revokeObjectURL(a.href);
    note(`bitacora exportada (${bitacora.length} lineas)`);
  };

  // --- controles -------------------------------------------------------------

  const clearCanvas = () => {
    ctx.clearRect(0, 0, innerWidth, innerHeight);
    total = 0;
    jumps = 0;
    last = null;
    counts.pen = counts.touch = counts.mouse = counts.unknown = 0;
    bitacora.length = 0;
    logEl.textContent = '';
    senalEl.classList.add('senal--idle');
    senalEl.classList.remove('senal--live');
    senalEl.style.borderColor = '';
    senalEstado.style.color = '';
    senalEstado.textContent = 'SIN SEÑAL';
    senalDetalle.textContent = 'esperando cualquier evento de puntero';
  };

  const toggleGrid = () => { gridOn = !gridOn; drawAll(); };

  btnClear.addEventListener('click', clearCanvas);
  btnGrid.addEventListener('click', toggleGrid);
  btnCal.addEventListener('click', toggleCal);
  btnCalExit.addEventListener('click', toggleCal);
  btnExport.addEventListener('click', exportLog);

  window.addEventListener('keydown', (evt) => {
    const k = evt.key.toLowerCase();
    if (k === 'c') clearCanvas();
    if (k === 'g') toggleGrid();
    if (k === 'd') toggleCal();
    if (k === 'e') exportLog();
    if (k === 'h') intro.hidden = false;
  });

  btnHelp.addEventListener('click', () => { intro.hidden = false; });
  btnStart.addEventListener('click', () => { intro.hidden = true; });

  window.addEventListener('resize', resizeAll);

  document.getElementById('env-touch').textContent = navigator.maxTouchPoints;
  document.getElementById('env-dpr').textContent = (window.devicePixelRatio || 1).toFixed(2);
  document.getElementById('env-support').textContent = window.PointerEvent ? 'si' : 'no (revisa fallback)';
  document.getElementById('env-screen').textContent = `${screen.width} x ${screen.height}`;

  resizeAll();
  note('listo: esperando eventos de puntero');
})();
