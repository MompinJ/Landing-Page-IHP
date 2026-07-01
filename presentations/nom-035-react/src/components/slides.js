// ============================================================
// ARCHETIPOS de slide. Cada uno consume datos + catalogo + primitivas.
// Mapea type -> clase CSS del kit (s1..s4) y -> render.
// ============================================================
import { html } from '../html.js';
import { Cobrand, Shape, Sg, lines } from './primitives.js';
import { SemaforoGame } from './SemaforoGame.js';
import { SwipeGame } from './SwipeGame.js';
import { ExpedienteGame } from './ExpedienteGame.js';
import { AuditoriaGame } from './AuditoriaGame.js';

export const SLIDE_CLASS = {
  cover: 's1', mission: 's2', divider: 's3', content: 's4', 'content-r': 's4', 'nom-intro': 's6', 'nom-goal': 's7', 'nom-what': 's8', 'nom-question': 's9', 'nom-quadrants': 's10', 'nom-sky-text': 's11', 'nom-wedge': 's12', 'nom-title': 's13', 'nom-para': 's14', 'nom-factor': 's15', 'nom-ask': 's16', 'nom-quad-cond': 's17', 'nom-quad-def': 's18', 'nom-key': 's19', 'nom-bands': 's20', 'nom-worker': 's21', 'nom-list': 's22', 'nom-resp': 's23', 'nom-aqua-title': 's24', 'nom-oblist': 's25', 'nom-gracias': 's26', semaforo: 's5', swipe: 's-swipe', expediente: 's-exp', auditoria: 's-aud',
};

// --- PORTADA: foto + banda que comparte su filo + titulo ---
function Cover(s) {
  const cb = s.cobrand || {};
  return html`
    <div class="layer photo-wrap rs" style=${{ '--d': 0 }}>
      <div class="photo" style=${s.photo ? { '--photo': `url(${s.photo})` } : null}></div>
    </div>
    <${Shape} shape="band-portada" fill="band" z=${2} delay=${240} anim="rs" />
    <${Cobrand} hp=${cb.hp || 'color'} inst=${cb.inst || 'white'} />
    <h1 class="s1-title">
      <span class="l1 r" style=${{ '--d': 640 }}>${s.module}</span>
      <span class="l2 r" style=${{ '--d': 760 }}>${s.title}<em>${s.titleAccent}</em></span>
    </h1>
  `;
}

// --- MISION: figuras a la derecha (deslizan) + titulo serif ---
function Mission(s) {
  const cb = s.cobrand || {};
  return html`
    <${Shape} shape="sky-tr"   fill="horizon" z=${1} delay=${0}   anim="fig-in" />
    <${Shape} shape="steel-tr" fill="steel"   z=${2} delay=${160} anim="fig-in" />
    <div class="s2-body">
      <p class="s2-eyebrow r" style=${{ '--d': 480 }}>${s.kicker}</p>
      <h2 class="s2-title r" style=${{ '--d': 600 }}>${lines(s.title)}</h2>
    </div>
    <${Cobrand} hp=${cb.hp || 'color'} inst=${cb.inst || 'azul'} />
  `;
}

// --- DIVISOR: dos formas amontonadas + super graficos + numeral ---
function Divider(s) {
  const cb = s.cobrand || {};
  return html`
    <${Shape} shape="aqua-hang" fill="aqua" z=${1} delay=${0}   anim="rs" />
    <${Shape} shape="sky-hang"  fill="sky"  z=${2} delay=${120} anim="rs" />
    <${Sg} top="22%" left="40%" width="48vw" color="sky"  delay=${300} />
    <${Sg} top="64%" left="34%" width="42vw" color="aqua" delay=${360} />
    <div class="s3-body">
      <p class="kicker r" style=${{ '--d': 420 }}>${s.kicker}</p>
      <span class="bignum c-sea r" style=${{ '--d': 500 }}>${s.num}</span>
      <h2 class="dtitle c-sea r" style=${{ '--d': 600 }}>${lines(s.title)}</h2>
    </div>
    <${Cobrand} hp=${cb.hp || 'color'} inst=${cb.inst || 'azul'} />
  `;
}

// --- CONTENIDO: figuras a la izquierda + titulo grande a la derecha ---
function Content(s) {
  const cb = s.cobrand || {};
  return html`
    <${Shape} shape="sky-tl"   fill="horizon" z=${1} delay=${0}   anim="fig-in" figx="-13%" />
    <${Shape} shape="steel-bl" fill="sky"     z=${2} delay=${160} anim="fig-in" figx="-13%" />
    <div class="s4-body">
      <p class="s4-kicker r" style=${{ '--d': 420 }}>${s.kicker}</p>
      <h2 class="dtitle c-sea r" style=${{ '--d': 520 }}>${lines(s.title)}</h2>
    </div>
    <${Cobrand} hp=${cb.hp || 'color'} inst=${cb.inst || 'azul'} hpLeft=${true} />
  `;
}

// --- CONTENIDO-R: figuras a la derecha (espejo) + titulo grande a la izquierda ---
function ContentR(s) {
  const cb = s.cobrand || {};
  return html`
    <${Shape} shape="cnt-tr" fill="steel"   z=${1} delay=${0}   anim="fig-in" figx="13%" />
    <${Shape} shape="cnt-br" fill="horizon" z=${2} delay=${160} anim="fig-in" figx="13%" />
    <div class="s4r-body">
      <p class="s4-kicker r" style=${{ '--d': 420 }}>${s.kicker}</p>
      <h2 class="dtitle c-sea r" style=${{ '--d': 520 }}>${lines(s.title)}</h2>
    </div>
    <${Cobrand} hp=${cb.hp || 'color'} inst=${cb.inst || 'azul'} />
  `;
}

// --- INTRO NOM-035: bandera amarilla + paralelogramo azul + titular ---
function NomIntro(s) {
  const cb = s.cobrand || {};
  return html`
    <${Shape} shape="nom-yellow" fill="sunray" z=${1} delay=${0}   anim="fig-in" figx="13%" />
    <${Shape} shape="nom-blue"   fill="band"   z=${2} delay=${160} anim="fig-in" figx="13%" />
    <p class="s6-lead r" style=${{ '--d': 520 }}>${s.lead}</p>
    <h2 class="s6-title r" style=${{ '--d': 660 }}>${s.title}</h2>
    <img class="brand-logo brand-logo--br r" style=${{ '--d': 800 }} src="assets/hutchisonports-color.png" alt="Hutchison Ports" />
    <img class="s6-inst r" style=${{ '--d': 850 }} src=${'assets/LogoInstitutoHP-' + (cb.inst || 'color') + '.png'} alt="Instituto Hutchison Ports" />
  `;
}

// --- OBJETIVO: amarillo + cuña blanca + titular grande + bloque lateral ---
function NomGoal(s) {
  const cb = s.cobrand || {};
  return html`
    <${Shape} shape="nom2-white" fill="paper" z=${1} delay=${120} anim="rs" />
    <div class="s7-titlewrap">
      <h2 class="s7-title r" style=${{ '--d': 480 }}>${lines(s.title)}</h2>
    </div>
    <div class="s7-objwrap">
      <div class="s7-obj r" style=${{ '--d': 640 }}>
        <p class="s7-obj-lbl">${s.objLabel}</p>
        <p class="s7-obj-body">
          ${(s.body || []).map((seg, i) => seg.em
      ? html`<strong key=${i}>${seg.t}</strong>`
      : html`<span key=${i}>${seg.t}</span>`)}
        </p>
      </div>
    </div>
    <img class="brand-logo brand-logo--br r" style=${{ '--d': 800 }} src="assets/hutchisonports-color.png" alt="Hutchison Ports" />
    <img class="lg-inst-bl r" style=${{ '--d': 850 }} src=${'assets/LogoInstitutoHP-' + (cb.inst || 'azul') + '.png'} alt="Instituto Hutchison Ports" />
  `;
}

// --- QUE ES: amarillo + cuña blanca abajo-der + titular serif + texto ---
function NomWhat(s) {
  const cb = s.cobrand || {};
  return html`
    <${Shape} shape="nom3-white" fill="paper" z=${1} delay=${120} anim="rs" />
    <h2 class="s8-title r" style=${{ '--d': 460 }}>${s.title}</h2>
    <div class="s8-body">
      <p class="s8-q r" style=${{ '--d': 600 }}>${s.q}</p>
      <p class="s8-text r" style=${{ '--d': 700 }}>${lines(s.text)}</p>
    </div>
    <img class="brand-logo brand-logo--br r" style=${{ '--d': 820 }} src="assets/hutchisonports-color.png" alt="Hutchison Ports" />
    <img class="lg-inst-bl r" style=${{ '--d': 860 }} src=${'assets/LogoInstitutoHP-' + (cb.inst || 'azul') + '.png'} alt="Instituto Hutchison Ports" />
  `;
}

// --- PREGUNTA: titular grande claro sobre cielo (divisor de seccion) ---
function NomQuestion(s) {
  const cb = s.cobrand || {};
  return html`
    <div class="s9-titlewrap">
      <h2 class=${'s9-title r' + (s.dense ? ' s9-title--dense' : '')} style=${{ '--d': 480 }}>${lines(s.title)}</h2>
    </div>
    <img class="brand-logo brand-logo--br r" style=${{ '--d': 760 }} src="assets/hutchisonports-color.png" alt="Hutchison Ports" />
    <img class="lg-inst-bl r" style=${{ '--d': 800 }} src=${'assets/LogoInstitutoHP-' + (cb.inst || 'azul') + '.png'} alt="Instituto Hutchison Ports" />
  `;
}

// --- CUADRANTES: 4 regiones diagonales con sus etiquetas ---
function NomQuadrants(s) {
  return html`
    <${Shape} shape="q-blue"   fill="horizon" z=${1} delay=${0}   anim="rs" />
    <${Shape} shape="q-gray"   fill="steel"   z=${2} delay=${120} anim="rs" />
    <${Shape} shape="q-teal"   fill="aqua"    z=${3} delay=${240} anim="rs" />
    <${Shape} shape="q-yellow" fill="sunray"  z=${4} delay=${360} anim="rs" />
    <p class="qd-lbl qd-admin r" style=${{ '--d': 560 }}>${s.admin}</p>
    <p class="qd-lbl qd-jefes r" style=${{ '--d': 640 }}>${s.jefes}</p>
    <p class="qd-lbl qd-todos r" style=${{ '--d': 720 }}>${lines(s.todos)}</p>
    <p class="qd-lbl qd-sind r"  style=${{ '--d': 800 }}>${s.sind}</p>
  `;
}

// --- TEXTO SOBRE CIELO: kicker + parrafo con resaltado ---
function NomSkyText(s) {
  const cb = s.cobrand || {};
  return html`
    <div class="s11-wrap">
      <p class="s11-kicker r" style=${{ '--d': 460 }}>${lines(s.kicker)}</p>
      <p class="s11-body r" style=${{ '--d': 600 }}>
        ${(s.body || []).map((seg, i) => seg.em
      ? html`<strong key=${i}>${seg.t}</strong>`
      : html`<span key=${i}>${seg.t}</span>`)}
      </p>
    </div>
    <img class="brand-logo brand-logo--br r" style=${{ '--d': 760 }} src="assets/hutchisonports-color.png" alt="Hutchison Ports" />
    <img class="lg-inst-bl r" style=${{ '--d': 800 }} src=${'assets/LogoInstitutoHP-' + (cb.inst || 'azul') + '.png'} alt="Instituto Hutchison Ports" />
  `;
}

// --- PREGUNTA (cuña azul + titular navy sobre blanco) ---
function NomWedge(s) {
  const cb = s.cobrand || {};
  return html`
    <${Shape} shape="nom4-blue" fill="horizon" z=${1} delay=${120} anim="rs" />
    <div class="s12-band"></div>
    <div class="s12-wrap">
      <h2 class="s12-title r" style=${{ '--d': 480 }}>${lines(s.title)}</h2>
    </div>
    <img class="brand-logo brand-logo--br r" style=${{ '--d': 760 }} src="assets/hutchisonports-color.png" alt="Hutchison Ports" />
    <img class="lg-inst-bl r" style=${{ '--d': 800 }} src=${'assets/LogoInstitutoHP-' + (cb.inst || 'azul') + '.png'} alt="Instituto Hutchison Ports" />
  `;
}

// --- TITULO SOBRE AZUL (cuña blanca abajo-der + titular mixto) ---
function NomTitleBlue(s) {
  const cb = s.cobrand || {};
  return html`
    <${Shape} shape="nom5-white" fill="paper" z=${1} delay=${120} anim="rs" />
    <div class="s13-wrap">
      <h2 class="s13-title r" style=${{ '--d': 480 }}>${lines(s.title)}</h2>
    </div>
    <img class="brand-logo brand-logo--br r" style=${{ '--d': 760 }} src="assets/hutchisonports-color.png" alt="Hutchison Ports" />
    <img class="lg-inst-bl r" style=${{ '--d': 800 }} src=${'assets/LogoInstitutoHP-' + (cb.inst || 'azul') + '.png'} alt="Instituto Hutchison Ports" />
  `;
}

// --- PARRAFO SOBRE AZUL (cuña blanca abajo-der + texto navy) ---
function NomParaBlue(s) {
  const cb = s.cobrand || {};
  return html`
    <${Shape} shape="nom5-white" fill="paper" z=${1} delay=${120} anim="rs" />
    <div class="s14-wrap">
      <p class="s14-body r" style=${{ '--d': 480 }}>${lines(s.body)}</p>
    </div>
    <img class="brand-logo brand-logo--br r" style=${{ '--d': 760 }} src="assets/hutchisonports-color.png" alt="Hutchison Ports" />
    <img class="lg-inst-bl r" style=${{ '--d': 800 }} src=${'assets/LogoInstitutoHP-' + (cb.inst || 'azul') + '.png'} alt="Instituto Hutchison Ports" />
  `;
}

// --- FACTOR N (paralelogramo amarillo + titular + parrafo) ---
function NomFactor(s) {
  const cb = s.cobrand || {};
  return html`
    <${Shape} shape=${s.shape || 'nom6-yellow'} fill="sunray" z=${1} delay=${120} anim="fig-in" figx="13%" />
    <h2 class="s15-title r" style=${{ '--d': 460 }}>${lines(s.title)}</h2>
    <p class=${'s15-body r' + (s.big ? ' s15-body--big' : '')} style=${{ '--d': 620 }}>${lines(s.body)}</p>
    <img class="brand-logo brand-logo--br r" style=${{ '--d': 760 }} src="assets/hutchisonports-color.png" alt="Hutchison Ports" />
    <img class="lg-inst-bl r" style=${{ '--d': 800 }} src=${'assets/LogoInstitutoHP-' + (cb.inst || 'azul') + '.png'} alt="Instituto Hutchison Ports" />
  `;
}

// --- PREGUNTA FACTOR (fondo azul + cuña blanca arriba-izq + titular navy) ---
function NomAsk(s) {
  const cb = s.cobrand || {};
  return html`
    <${Shape} shape="nom7-white" fill="paper" z=${1} delay=${120} anim="rs" />
    <div class="s16-wrap">
      <h2 class="s16-title r" style=${{ '--d': 480 }}>${lines(s.title)}</h2>
    </div>
    <img class="brand-logo brand-logo--br r" style=${{ '--d': 760 }} src="assets/hutchisonports-color.png" alt="Hutchison Ports" />
    <img class="lg-inst-bl r" style=${{ '--d': 800 }} src=${'assets/LogoInstitutoHP-' + (cb.inst || 'azul') + '.png'} alt="Instituto Hutchison Ports" />
  `;
}

// --- CUADRANTES DE CONDICIONES (mismas formas, 3 etiquetas + region blanca) ---
function NomQuadCond(s) {
  const cb = s.cobrand || {};
  return html`
    <${Shape} shape="q-blue"   fill="horizon" z=${1} delay=${0}   anim="rs" />
    <${Shape} shape="q-gray"   fill="steel"   z=${2} delay=${120} anim="rs" />
    <${Shape} shape="q-teal"   fill="sky"     z=${3} delay=${240} anim="rs" />
    <${Shape} shape="q-yellow" fill="paper"   z=${4} delay=${360} anim="rs" />
    <p class="qd-lbl qd-admin r" style=${{ '--d': 560 }}>${lines(s.inseguras)}</p>
    <p class="qd-lbl qd-jefes r" style=${{ '--d': 640 }}>${lines(s.insalubres)}</p>
    <p class="qd-lbl qd-todos r" style=${{ '--d': 720 }}>${lines(s.peligrosas)}</p>
    <img class="brand-logo brand-logo--br r" style=${{ '--d': 800 }} src="assets/hutchisonports-color.png" alt="Hutchison Ports" />
    <img class="lg-inst-bl r" style=${{ '--d': 840 }} src=${'assets/LogoInstitutoHP-' + (cb.inst || 'azul') + '.png'} alt="Instituto Hutchison Ports" />
  `;
}

// --- CUADRANTES CON DEFINICION (encabezado + subtitulo por region) ---
function NomQuadDef(s) {
  const cb = s.cobrand || {};
  const cell = (pos, d, item) => html`
    <div class=${'qd-lbl qd-def ' + pos + ' r'} style=${{ '--d': d }}>
      <p class="qd-def-h">${lines(item.h)}</p>
      <p class="qd-def-s">${lines(item.s)}</p>
    </div>
  `;
  return html`
    <${Shape} shape="q-blue"   fill="horizon" z=${1} delay=${0}   anim="rs" />
    <${Shape} shape="q-gray"   fill="steel"   z=${2} delay=${120} anim="rs" />
    <${Shape} shape="q-teal"   fill="sky"     z=${3} delay=${240} anim="rs" />
    <${Shape} shape="q-yellow" fill="paper"   z=${4} delay=${360} anim="rs" />
    ${cell('qd-admin', 560, s.rebasa)}
    ${cell('qd-jefes', 640, s.noPermite)}
    ${cell('qd-todos', 720, s.genera)}
    <img class="brand-logo brand-logo--br r" style=${{ '--d': 800 }} src="assets/hutchisonports-color.png" alt="Hutchison Ports" />
    <img class="lg-inst-bl r" style=${{ '--d': 840 }} src=${'assets/LogoInstitutoHP-' + (cb.inst || 'azul') + '.png'} alt="Instituto Hutchison Ports" />
  `;
}

// --- CARACTERISTICAS CLAVE (cuña blanca + kicker + nota + titular grande) ---
function NomKey(s) {
  const cb = s.cobrand || {};
  return html`
    <${Shape} shape="nom9-white" fill="paper" z=${1} delay=${120} anim="rs" />
    <p class="s19-kicker r" style=${{ '--d': 440 }}>${lines(s.kicker)}</p>
    <p class="s19-note r" style=${{ '--d': 560 }}>${lines(s.note)}</p>
    <h2 class="s19-title r" style=${{ '--d': 680 }}>${lines(s.title)}</h2>
    <img class="brand-logo brand-logo--br r" style=${{ '--d': 800 }} src="assets/hutchisonports-color.png" alt="Hutchison Ports" />
    <img class="lg-inst-bl r" style=${{ '--d': 840 }} src=${'assets/LogoInstitutoHP-' + (cb.inst || 'azul') + '.png'} alt="Instituto Hutchison Ports" />
  `;
}

// --- DOS BANDAS DIAGONALES (encabezado + subtitulo c/u) ---
function NomBands(s) {
  const cb = s.cobrand || {};
  return html`
    <${Shape} shape="k2-horizon" fill="horizon" z=${1} delay=${0}   anim="rs" />
    <${Shape} shape="k2-sky"     fill="sky"     z=${2} delay=${160} anim="rs" />
    <div class="s20-a qd-def r" style=${{ '--d': 480 }}>
      <p class="qd-def-h">${lines(s.a.h)}</p>
      <p class="qd-def-s">${lines(s.a.s)}</p>
    </div>
    <div class="s20-b qd-def r" style=${{ '--d': 620 }}>
      <p class="qd-def-h">${lines(s.b.h)}</p>
      <p class="qd-def-s">${lines(s.b.s)}</p>
    </div>
    <img class="brand-logo brand-logo--br r" style=${{ '--d': 800 }} src="assets/hutchisonports-color.png" alt="Hutchison Ports" />
    <img class="lg-inst-bl r" style=${{ '--d': 840 }} src=${'assets/LogoInstitutoHP-' + (cb.inst || 'azul') + '.png'} alt="Instituto Hutchison Ports" />
  `;
}

// --- TRABAJADOR (foto recortada a la derecha + texto blanco sobre cielo) ---
function NomWorker(s) {
  const cb = s.cobrand || {};
  return html`
    <div class="s21-worker-box rs" style=${{ '--d': 200 }}>
      <img class="s21-worker" src="assets/trabajador.png" alt="Trabajador portuario" />
    </div>
    <div class="s21-textwrap">
      <p class="s21-text r" style=${{ '--d': 520 }}>${lines(s.text)}</p>
    </div>
    <img class="lg-inst-bl r" style=${{ '--d': 760 }} src=${'assets/LogoInstitutoHP-' + (cb.inst || 'blanco') + '.png'} alt="Instituto Hutchison Ports" />
  `;
}

// --- LISTA (amarillo + cuña blanca + titular + viñetas) ---
function NomList(s) {
  const cb = s.cobrand || {};
  return html`
    <${Shape} shape="nom5-white" fill="paper" z=${1} delay=${120} anim="rs" />
    <div class="s22-wrap">
      <h2 class="s22-title r" style=${{ '--d': 460 }}>${lines(s.title)}</h2>
      <ul class="s22-list r" style=${{ '--d': 620 }}>
        ${(s.items || []).map((it, i) => html`<li key=${i}>${it}</li>`)}
      </ul>
    </div>
    <img class="brand-logo brand-logo--br r" style=${{ '--d': 780 }} src="assets/hutchisonports-color.png" alt="Hutchison Ports" />
    <img class="lg-inst-bl r" style=${{ '--d': 820 }} src=${'assets/LogoInstitutoHP-' + (cb.inst || 'azul') + '.png'} alt="Instituto Hutchison Ports" />
  `;
}

// --- RESPONSABILIDAD (2 paralelogramos + kicker aqua + titular navy) ---
function NomResp(s) {
  const cb = s.cobrand || {};
  return html`
    <${Shape} shape="resp-aqua" fill="aqua" z=${1} delay=${120} anim="fig-in" figx="13%" />
    <${Shape} shape="resp-navy" fill="sea"  z=${2} delay=${240} anim="fig-in" figx="13%" />
    <div class="s23-wrap">
      <p class="s23-kicker r" style=${{ '--d': 480 }}>${lines(s.kicker)}</p>
      <h2 class="s23-title r" style=${{ '--d': 620 }}>${lines(s.title)}</h2>
    </div>
    <img class="brand-logo brand-logo--br r" style=${{ '--d': 760 }} src="assets/hutchisonports-color.png" alt="Hutchison Ports" />
    <img class="lg-inst-bl r" style=${{ '--d': 800 }} src=${'assets/LogoInstitutoHP-' + (cb.inst || 'azul') + '.png'} alt="Instituto Hutchison Ports" />
  `;
}

// --- TITULO SOBRE AQUA (cuña blanca abajo-der + titular navy grande) ---
function NomAquaTitle(s) {
  const cb = s.cobrand || {};
  return html`
    <${Shape} shape="nom5-white" fill="paper" z=${1} delay=${120} anim="rs" />
    <div class="s24-wrap">
      <h2 class="s24-title r" style=${{ '--d': 480 }}>${lines(s.title)}</h2>
    </div>
    <img class="brand-logo brand-logo--br r" style=${{ '--d': 760 }} src="assets/hutchisonports-color.png" alt="Hutchison Ports" />
    <img class="lg-inst-bl r" style=${{ '--d': 800 }} src=${'assets/LogoInstitutoHP-' + (cb.inst || 'azul') + '.png'} alt="Instituto Hutchison Ports" />
  `;
}

// --- LISTA NUMERADA (banda diagonal + titular + obligaciones) ---
function NomObList(s) {
  const cb = s.cobrand || {};
  return html`
    <${Shape} shape=${s.shape || 'nom6-yellow'} fill=${s.shapeFill || 'aqua'} z=${1} delay=${120} anim="fig-in" figx="13%" />
    <h2 class="s25-title r" style=${{ '--d': 440 }}>${s.title}</h2>
    <ol class="s25-list r" style=${{ '--d': 600 }}>
      ${(s.items || []).map((it, i) => html`<li key=${i}>${it}</li>`)}
    </ol>
    <img class="brand-logo brand-logo--br r" style=${{ '--d': 760 }} src="assets/hutchisonports-color.png" alt="Hutchison Ports" />
    <img class="lg-inst-bl r" style=${{ '--d': 800 }} src=${'assets/LogoInstitutoHP-' + (cb.inst || 'azul') + '.png'} alt="Instituto Hutchison Ports" />
  `;
}

// --- CIERRE GRACIAS (banda aqua diagonal + titular + subtitulo) ---
function NomGracias(s) {
  const cb = s.cobrand || {};
  return html`
    <${Shape} shape="nom10-band" fill="aqua" z=${1} delay=${120} anim="fig-in" figx="14%" />
    <div class="s26-wrap">
      <h2 class="s26-title r" style=${{ '--d': 440 }}>${s.title || 'GRACIAS'}</h2>
      <p class="s26-sub r" style=${{ '--d': 620 }}>${lines(s.sub)}</p>
    </div>
    <img class="brand-logo brand-logo--br r" style=${{ '--d': 760 }} src="assets/hutchisonports-color.png" alt="Hutchison Ports" />
    <img class="lg-inst-bl r" style=${{ '--d': 800 }} src=${'assets/LogoInstitutoHP-' + (cb.inst || 'azul') + '.png'} alt="Instituto Hutchison Ports" />
  `;
}

function Semaforo() {
  return html`<${SemaforoGame} />`;
}

function SwipeDyn() {
  return html`<${SwipeGame} />`;
}

function ExpedienteDyn() {
  return html`<${ExpedienteGame} />`;
}

function AuditoriaDyn() {
  return html`<${AuditoriaGame} />`;
}

const RENDERERS = { cover: Cover, mission: Mission, divider: Divider, content: Content, 'content-r': ContentR, 'nom-intro': NomIntro, 'nom-goal': NomGoal, 'nom-what': NomWhat, 'nom-question': NomQuestion, 'nom-quadrants': NomQuadrants, 'nom-sky-text': NomSkyText, 'nom-wedge': NomWedge, 'nom-title': NomTitleBlue, 'nom-para': NomParaBlue, 'nom-factor': NomFactor, 'nom-ask': NomAsk, 'nom-quad-cond': NomQuadCond, 'nom-quad-def': NomQuadDef, 'nom-key': NomKey, 'nom-bands': NomBands, 'nom-worker': NomWorker, 'nom-list': NomList, 'nom-resp': NomResp, 'nom-aqua-title': NomAquaTitle, 'nom-oblist': NomObList, 'nom-gracias': NomGracias, semaforo: Semaforo, swipe: SwipeDyn, expediente: ExpedienteDyn, auditoria: AuditoriaDyn };

export function SlideBody({ slide }) {
  const fn = RENDERERS[slide.type];
  return fn ? fn(slide) : null;
}
