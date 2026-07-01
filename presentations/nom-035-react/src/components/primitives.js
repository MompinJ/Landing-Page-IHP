// ============================================================
// PRIMITIVAS reusables: co-marca, figura, super grafico, helpers
// ============================================================
import { React, html } from '../html.js';
import { resolveClip, resolveColor } from '../catalog/shapes.js';

const A = (f) => 'assets/' + f;

// Ambos logos. HP arriba-der por defecto; hpLeft=true lo mueve arriba-izq.
export function Cobrand({ hp = 'color', inst = 'azul', hpLeft = false }) {
  const hpSrc = hp === 'white' ? 'hutchisonports-blanco.png' : 'hutchisonports-color.png';
  const instSrc = inst === 'white' ? 'LogoInstitutoHP-blanco.png' : 'LogoInstitutoHP-azul.png';
  const hpCls = hpLeft ? 'lg-hp lg-hp--left r' : 'lg-hp r';
  return html`<div class="cobrand">
    <img class=${hpCls} style=${{ '--d': 700 }} src=${A(hpSrc)} alt="Hutchison Ports" />
    <img class="lg-inst r" style=${{ '--d': 760 }} src=${A(instSrc)} alt="Instituto Hutchison Ports" />
  </div>`;
}

// Figura de marca: bloque solido recortado (se amontonan por z-index).
// anim: 'rs' (aparece) | 'fig-in' (desliza, usa figx) | 'none'
export function Shape({ shape, fill, z = 1, delay = 0, anim = 'rs', figx }) {
  const style = { zIndex: z, clipPath: resolveClip(shape), background: resolveColor(fill), '--d': delay };
  if (figx != null) style['--figx'] = figx;
  const cls = anim && anim !== 'none' ? `gshape ${anim}` : 'gshape';
  return html`<div class=${cls} style=${style}></div>`;
}

// Super grafico: linea fina al angulo de marca.
export function Sg({ top, left, width, color = 'sky', delay = 0 }) {
  return html`<i class="sg" style=${{ top, left, width, background: resolveColor(color), zIndex: 3, '--d': delay }}></i>`;
}

// Convierte ['a','b'] -> a<br/>b.
// Item puede ser array de segmentos: [{t:'DES',c:'sky'},'FAVORABLE'] -> span coloreado inline.
export function lines(arr) {
  const a = Array.isArray(arr) ? arr : [arr];
  return a.map((item, i) => {
    const br = i ? html`<br />` : null;
    if (Array.isArray(item)) {
      const segs = item.map((seg, j) =>
        typeof seg === 'string'
          ? html`<${React.Fragment} key=${j}>${seg}<//>`
          : html`<span key=${j} style=${{ color: resolveColor(seg.c) }}>${seg.t}</span>`
      );
      return html`<${React.Fragment} key=${i}>${br}${segs}<//>`;
    }
    return html`<${React.Fragment} key=${i}>${br}${item}<//>`;
  });
}
