(() => {
  const grid = document.getElementById('hub-grid');
  const count = document.getElementById('hub-count');

  const escape = (str) => String(str ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[c]));

  const renderCard = (p) => {
    const accent = p.accent ? `style="--card-accent: ${escape(p.accent)};"` : '';
    const tags = Array.isArray(p.tags)
      ? p.tags.map((t) => `<span class="hub-card__tag">${escape(t)}</span>`).join('')
      : '';
    const date = p.date ? `<p class="hub-card__date">${escape(p.date)}</p>` : '';
    const subtitle = p.subtitle ? `<p class="hub-card__subtitle">${escape(p.subtitle)}</p>` : '';
    const desc = p.description ? `<p class="hub-card__desc">${escape(p.description)}</p>` : '';

    return `
      <article class="hub-card" ${accent}>
        <span class="hub-card__arrow" aria-hidden="true">&#8599;</span>
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
        return;
      }

      grid.innerHTML = list.map(renderCard).join('');
      count.textContent = `${list.length} ${list.length === 1 ? 'item' : 'items'}`;
    })
    .catch((err) => {
      const isFileProto = location.protocol === 'file:';
      const hint = isFileProto
        ? 'Estas abriendo el archivo via <code>file://</code>. El navegador bloquea <code>fetch()</code> en ese protocolo. Levanta un servidor: <code>python -m http.server 8080</code>'
        : 'Revisa que <code>presentations.json</code> exista y sea JSON valido.';
      renderError(err.message, hint);
    });
})();
