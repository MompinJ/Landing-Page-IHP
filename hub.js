(() => {
  const grid = document.getElementById('hub-grid');
  const count = document.getElementById('hub-count');
  const tplGrid = document.getElementById('tpl-grid');
  const tplCount = document.getElementById('tpl-count');
  const dynGrid = document.getElementById('dyn-grid');
  const dynCount = document.getElementById('dyn-count');
  const tickerTrack = document.getElementById('ticker-track');

  const buildTicker = (list) => {
    if (!tickerTrack) return;
    const titles = list
      .map((p) => String(p.title ?? '').toUpperCase().trim())
      .filter(Boolean);
    if (titles.length === 0) return;
    const sep = '  //  ';
    const run = titles.join(sep) + sep;
    // se duplica el contenido para que el loop del marquee sea continuo
    tickerTrack.innerHTML = `<span>${escape(run)}</span><span>${escape(run)}</span>`;
  };

  const escape = (str) => String(str ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[c]));

  const renderCard = (p) => {
    const accent = p.accent ? `--card-accent: ${escape(p.accent)};` : '';
    const theme = p.theme ? escape(p.theme) : 'default';
    const tags = Array.isArray(p.tags)
      ? p.tags.map((t) => `<span class="hub-card__tag">${escape(t)}</span>`).join('')
      : '';
    const date = p.date ? `<p class="hub-card__date">${escape(p.date)}</p>` : '';
    const subtitle = p.subtitle ? `<p class="hub-card__subtitle">${escape(p.subtitle)}</p>` : '';
    const desc = p.description ? `<p class="hub-card__desc">${escape(p.description)}</p>` : '';

    // chrome + deco: capas puramente decorativas que cada tema estiliza en hub.css
    return `
      <article class="hub-card" data-theme="${theme}" style="${accent}">
        <span class="hub-card__chrome" aria-hidden="true"></span>
        <span class="hub-card__deco" aria-hidden="true"></span>
        <span class="hub-card__arrow" aria-hidden="true">&#8599;</span>
        <span class="hub-card__kind" aria-hidden="true"></span>
        ${date}
        <h3 class="hub-card__title">
          <a href="${escape(p.path)}">${escape(p.title)}</a>
        </h3>
        ${subtitle}
        ${desc}
        <div class="hub-card__tags">${tags}</div>
      </article>
    `;
  };

  const renderError = (msg, hint) => {
    grid.innerHTML = `
      <div class="hub-error">
        <strong>No se pudo cargar el indice.</strong>
        <p style="margin-top: 0.5rem;">${escape(msg)}</p>
        ${hint ? `<p style="margin-top: 0.75rem;">${hint}</p>` : ''}
      </div>
    `;
    count.textContent = 'error';
    if (tplGrid) {
      tplGrid.innerHTML = '<p class="hub-empty">Sin manifest no hay plantillas.</p>';
      tplCount.textContent = 'error';
    }
    if (dynGrid) {
      dynGrid.innerHTML = '<p class="hub-empty">Sin manifest no hay dinamicas.</p>';
      dynCount.textContent = 'error';
    }
  };

  const sortByDateDesc = (a, b) => String(b.date ?? '').localeCompare(String(a.date ?? ''));

  fetch('presentations.json', { cache: 'no-store' })
    .then((res) => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    })
    .then((data) => {
      const list = Array.isArray(data?.presentations) ? data.presentations.slice() : [];
      list.sort(sortByDateDesc);

      if (list.length === 0) {
        grid.innerHTML = '<p class="hub-empty">Aun no hay presentaciones registradas en <code>presentations.json</code>.</p>';
        count.textContent = '0';
      } else {
        grid.innerHTML = list.map(renderCard).join('');
        buildTicker(list);
        count.textContent = `${String(list.length).padStart(2, '0')} // ${list.length === 1 ? 'item' : 'items'}`;
      }

      // ---- plantillas (segunda seccion, mismo manifest) ----
      if (tplGrid) {
        const tpls = Array.isArray(data?.templates) ? data.templates : [];
        if (tpls.length === 0) {
          tplGrid.innerHTML = '<p class="hub-empty">Sin plantillas registradas.</p>';
          tplCount.textContent = '0';
        } else {
          tplGrid.innerHTML = tpls.map(renderCard).join('');
          tplCount.textContent = `${String(tpls.length).padStart(2, '0')} // ${tpls.length === 1 ? 'base' : 'bases'}`;
        }
      }

      // ---- dinamicas (tercera seccion) ----
      if (dynGrid) {
        const dyns = Array.isArray(data?.dinamicas) ? data.dinamicas : [];
        if (dyns.length === 0) {
          dynGrid.innerHTML = '<p class="hub-empty">Sin dinamicas registradas.</p>';
          dynCount.textContent = '0';
        } else {
          dynGrid.innerHTML = dyns.map(renderCard).join('');
          dynCount.textContent = `${String(dyns.length).padStart(2, '0')} // ${dyns.length === 1 ? 'juego' : 'juegos'}`;
        }
      }
    })
    .catch((err) => {
      const isFileProto = location.protocol === 'file:';
      const hint = isFileProto
        ? 'Estas abriendo el archivo via <code>file://</code>. El navegador bloquea <code>fetch()</code> en ese protocolo. Levanta un servidor: <code>python -m http.server 8080</code>'
        : 'Revisa que <code>presentations.json</code> exista y sea JSON valido.';
      renderError(err.message, hint);
    });
})();
