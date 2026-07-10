(() => {
  const canvas = document.getElementById('lienzo');
  const ctx = canvas.getContext('2d');
  const gridCanvas = document.getElementById('rejilla');
  const gctx = gridCanvas.getContext('2d');
  const panel = document.getElementById('panel');
  const logEl = document.getElementById('log');
  const btnClear = document.getElementById('btn-clear');
  const btnGrid = document.getElementById('btn-grid');
  const btnHelp = document.getElementById('btn-help');
  const btnStart = document.getElementById('btn-start');
  const intro = document.getElementById('intro');

  const COLORS = { pen: '#38e1ff', touch: '#ff5fae', mouse: '#ffce45' };
  const colorFor = (type) => COLORS[type] || '#9aa0ab';

  const active = new Map();
  const counts = { pen: 0, touch: 0, mouse: 0, unknown: 0 };
  let gridOn = false;

  const resizeCanvas = (c, context) => {
    const dpr = window.devicePixelRatio || 1;
    c.width = innerWidth * dpr;
    c.height = innerHeight * dpr;
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
  };

  const drawGrid = () => {
    gctx.clearRect(0, 0, innerWidth, innerHeight);
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

  const resizeAll = () => {
    resizeCanvas(canvas, ctx);
    resizeCanvas(gridCanvas, gctx);
    drawGrid();
  };

  // sin soporte de presion (mouse), el spec sugiere 0.5 mientras el boton esta activo
  const widthFor = (evt) => 1.5 + (evt.pressure > 0 ? evt.pressure : 0.5) * 6;

  const logEvent = (label, evt) => {
    const row = document.createElement('div');
    row.className = 'log__row';
    row.textContent =
      `${performance.now().toFixed(0).padStart(7, ' ')}  ${label.padEnd(13, ' ')} ` +
      `#${evt.pointerId} ${(evt.pointerType || '?').padEnd(6, ' ')} ` +
      `x:${evt.clientX.toFixed(0)} y:${evt.clientY.toFixed(0)} p:${evt.pressure.toFixed(2)}`;
    logEl.prepend(row);
    while (logEl.childElementCount > 14) logEl.lastElementChild.remove();
  };

  const field = (name) => panel.querySelector(`[data-f="${name}"]`);

  const updatePanel = (evt) => {
    field('type').textContent = evt.pointerType || '(sin tipo)';
    field('id').textContent = evt.pointerId;
    field('primary').textContent = evt.isPrimary ? 'si' : 'no';
    field('xy').textContent = `${evt.clientX.toFixed(0)}, ${evt.clientY.toFixed(0)}`;
    field('pressure').textContent = evt.pressure.toFixed(2);
    field('tilt').textContent = `${evt.tiltX ?? 0} / ${evt.tiltY ?? 0}`;
    field('size').textContent = `${evt.width.toFixed(1)} x ${evt.height.toFixed(1)}`;
    field('buttons').textContent = evt.buttons;
    field('active').textContent = active.size;
    field('counts').textContent =
      `pen ${counts.pen} · touch ${counts.touch} · mouse ${counts.mouse} · ? ${counts.unknown}`;
  };

  canvas.addEventListener('pointerdown', (evt) => {
    const type = COLORS[evt.pointerType] ? evt.pointerType : 'unknown';
    counts[type] += 1;
    canvas.setPointerCapture(evt.pointerId);
    active.set(evt.pointerId, { x: evt.clientX, y: evt.clientY, color: colorFor(evt.pointerType) });

    ctx.fillStyle = colorFor(evt.pointerType);
    ctx.beginPath();
    ctx.arc(evt.clientX, evt.clientY, widthFor(evt) / 2, 0, Math.PI * 2);
    ctx.fill();

    logEvent('pointerdown', evt);
    updatePanel(evt);
  });

  canvas.addEventListener('pointermove', (evt) => {
    updatePanel(evt);
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
  });

  const release = (label) => (evt) => {
    active.delete(evt.pointerId);
    logEvent(label, evt);
    updatePanel(evt);
  };
  canvas.addEventListener('pointerup', release('pointerup'));
  canvas.addEventListener('pointercancel', release('pointercancel'));

  const clearCanvas = () => ctx.clearRect(0, 0, innerWidth, innerHeight);
  const toggleGrid = () => { gridOn = !gridOn; drawGrid(); };

  btnClear.addEventListener('click', clearCanvas);
  btnGrid.addEventListener('click', toggleGrid);

  window.addEventListener('keydown', (evt) => {
    const k = evt.key.toLowerCase();
    if (k === 'c') clearCanvas();
    if (k === 'g') toggleGrid();
    if (k === 'h') intro.hidden = false;
  });

  btnHelp.addEventListener('click', () => { intro.hidden = false; });
  btnStart.addEventListener('click', () => { intro.hidden = true; });

  window.addEventListener('resize', resizeAll);

  document.getElementById('env-touch').textContent = navigator.maxTouchPoints;
  document.getElementById('env-dpr').textContent = (window.devicePixelRatio || 1).toFixed(2);
  document.getElementById('env-support').textContent = window.PointerEvent ? 'si' : 'no (revisa fallback)';
  document.getElementById('env-view').textContent = `${innerWidth} x ${innerHeight}`;

  resizeAll();
})();
