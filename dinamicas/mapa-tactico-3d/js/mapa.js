/* ============================================================
   MAPA TACTICO NEXO-IA — WebGL con Three.js
   Estetica "Ruta C": low-poly holografico. Relleno oscuro +
   aristas emisivas + bloom. Todo es geometria primitiva.

   PERSONALIZAR:
   - SECTORS: terminales (posicion, estado, textos, silueta)
   - COL: paleta
   - TOUR_S / velocidad de pulsos en las constantes
   ============================================================ */

import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;

const COL = {
  bg: 0x020610,
  fill: 0x081627,
  fill2: 0x0b2138,
  cyan: 0x38e1ff,
  cyanDim: 0x1a6f8f,
  amber: 0xff9b3a,
  aqua: 0x54ffc8,
  locked: 0x3a5f8c,
};

const TOUR_S = 11;          // segundos por parada del tour
const PULSE_SPEED = 90;     // unidades/segundo de los pulsos de datos

/* ---------- setup ---------- */

let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('gl'), antialias: true });
} catch (e) {
  throw e; // el aviso .fallback queda visible
}
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);

const scene = new THREE.Scene();
scene.background = new THREE.Color(COL.bg);
scene.fog = new THREE.FogExp2(COL.bg, 0.0011);

const camera = new THREE.PerspectiveCamera(46, innerWidth / innerHeight, 1, 4000);

const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.9, 0.65, 0.22);
composer.addPass(bloom);
composer.addPass(new OutputPass());

/* ---------- materiales compartidos ---------- */

const mats = new Map();
const fillMat = (c) => {
  const k = `f${c}`;
  if (!mats.has(k)) mats.set(k, new THREE.MeshBasicMaterial({ color: c }));
  return mats.get(k);
};
const lineMat = (c, op = 0.85) => {
  const k = `l${c}:${op}`;
  if (!mats.has(k)) mats.set(k, new THREE.LineBasicMaterial({ color: c, transparent: true, opacity: op }));
  return mats.get(k);
};
const glowMat = (c, op) => new THREE.MeshBasicMaterial({
  color: c, transparent: true, opacity: op, blending: THREE.AdditiveBlending, depthWrite: false,
});

/* pieza holografica: relleno oscuro + aristas brillantes */
const holo = (geo, edge = COL.cyan, fill = COL.fill, op = 0.85) => {
  const g = new THREE.Group();
  g.add(new THREE.Mesh(geo, fillMat(fill)));
  g.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo), lineMat(edge, op)));
  return g;
};
const put = (parent, obj, x, y, z, ry = 0) => {
  obj.position.set(x, y, z);
  if (ry) obj.rotation.y = ry;
  parent.add(obj);
  return obj;
};

/* ---------- piezas reutilizables ---------- */

const box = (parent, w, h, d, x, y, z, edge = COL.cyan, ry = 0, fill = COL.fill) =>
  put(parent, holo(new THREE.BoxGeometry(w, h, d), edge, fill), x, y + h / 2, z, ry);

const cyl = (parent, rT, rB, h, seg, x, y, z, edge = COL.cyan, fill = COL.fill) =>
  put(parent, holo(new THREE.CylinderGeometry(rT, rB, h, seg), edge, fill), x, y + h / 2, z);

// grua de muelle: 4 patas, viga superior y pluma sobre el agua
const crane = (parent, x, z, ry = 0, edge = COL.cyan) => {
  const g = new THREE.Group();
  const LEG = 44, SPAN = 34;
  [[-14, -SPAN / 2], [14, -SPAN / 2], [-14, SPAN / 2], [14, SPAN / 2]]
    .forEach(([lx, lz]) => box(g, 3, LEG, 3, lx, 0, lz, edge));
  box(g, 34, 4, SPAN + 6, 0, LEG, 0, edge);               // portal
  box(g, 4, 4, SPAN + 52, 0, LEG + 6, -26, edge);         // pluma
  box(g, 8, 6, 8, 0, LEG - 8, -30, COL.amber);            // trolley
  return put(parent, g, x, 0, z, ry);
};

// buque generico: casco + proa + superestructura
const ship = (parent, len, beam, x, z, ry, edge = COL.cyan, decks = 2) => {
  const g = new THREE.Group();
  box(g, len, 12, beam, 0, 0, 0, edge, 0, COL.fill2);
  const bow = holo(new THREE.CylinderGeometry(beam * 0.5, beam * 0.62, 12, 3), edge, COL.fill2);
  bow.rotation.y = Math.PI;
  put(g, bow, len / 2 + beam * 0.22, 6, 0);
  for (let i = 0; i < decks; i++)
    box(g, 26 - i * 7, 7, beam - 6 - i * 4, -len / 2 + 26, 12 + i * 7, 0, edge);
  return put(parent, g, x, 0, z, ry);
};

/* ---------- siluetas por terminal ---------- */

const buildContenedores = (g) => {
  for (let r = 0; r < 3; r++) for (let c = 0; c < 4; c++) {
    const hgt = 1 + ((r * 4 + c) % 3);
    for (let k = 0; k < hgt; k++) {
      const edge = (r + c + k) % 4 === 0 ? COL.amber : COL.cyan;
      box(g, 17, 7.5, 8, -32 + c * 21, k * 7.5, -20 + r * 15, edge);
    }
  }
  crane(g, -55, 24, Math.PI / 2);
  crane(g, 55, 24, Math.PI / 2);
};

const buildCruceros = (g) => {
  box(g, 74, 12, 30, -8, 0, 4);                       // terminal
  box(g, 56, 9, 22, -8, 12, 4);
  box(g, 34, 8, 14, -8, 21, 4, COL.amber);
  ship(g, 165, 26, 30, -78, 0.12, COL.cyan, 4);       // crucero atracado
};

const buildAstillero = (g) => {
  box(g, 16, 16, 110, -52, 0, 0);                     // muro del dique
  box(g, 16, 16, 110, 24, 0, 0);
  box(g, 92, 16, 16, -14, 0, -55);
  ship(g, 96, 24, -14, 4, Math.PI / 2, COL.cyanDim, 1); // casco en reparacion
  box(g, 4, 52, 4, -52, 16, 30);                      // portico
  box(g, 4, 52, 4, 24, 16, 30);
  box(g, 84, 5, 6, -14, 66, 30, COL.amber);
  // domo de escudo
  const dome = new THREE.Mesh(
    new THREE.SphereGeometry(122, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2),
    glowMat(COL.cyan, 0.05)
  );
  dome.material.side = THREE.DoubleSide;
  g.add(dome);
  const wire = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.SphereGeometry(122, 14, 7, 0, Math.PI * 2, 0, Math.PI / 2)),
    lineMat(COL.cyan, 0.1)
  );
  g.add(wire);
};

const buildIntermodal = (g) => {
  box(g, 66, 22, 40, -20, 0, -18);                    // bodega
  box(g, 66, 6, 8, -20, 22, -18, COL.amber);          // techumbre
  box(g, 150, 1.2, 2.5, 0, 0, 22);                    // rieles
  box(g, 150, 1.2, 2.5, 0, 0, 30);
  for (let i = 0; i < 5; i++)                         // tren
    box(g, 22, 8, 8, -56 + i * 26, 1.2, 26, i === 0 ? COL.amber : COL.cyan);
  box(g, 17, 7.5, 8, 38, 0, -22);
  box(g, 17, 7.5, 8, 38, 7.5, -22, COL.amber);
  box(g, 17, 7.5, 8, 58, 0, -16);
};

const buildUsos = (g) => {
  [-30, 0, 30].forEach((x) => {
    cyl(g, 14, 14, 36, 10, x, 0, -22);
    put(g, holo(new THREE.SphereGeometry(14, 10, 5, 0, Math.PI * 2, 0, Math.PI / 2), COL.cyan), x, 36, -22);
  });
  box(g, 40, 14, 26, 10, 0, 26, COL.amber);           // nave de carga general
  crane(g, -44, 30, Math.PI / 2);
  ship(g, 120, 24, 60, 88, -0.35, COL.amber, 1);      // granelero
};

const buildHub = (g) => {
  cyl(g, 74, 82, 10, 6, 0, 0, 0, COL.cyan, COL.fill2);
  cyl(g, 52, 60, 14, 6, 0, 10, 0, COL.cyan);
  cyl(g, 30, 40, 24, 6, 0, 24, 0, COL.cyan, COL.fill2);
  box(g, 26, 16, 26, 0, 48, 0, COL.amber);
  // haz de luz del nucleo
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(3, 11, 130, 10, 1, true), glowMat(COL.cyan, 0.16));
  put(g, beam, 0, 129, 0);
  const tip = new THREE.Mesh(new THREE.SphereGeometry(5, 10, 8), glowMat(COL.cyan, 0.9));
  put(g, tip, 0, 66, 0);
};

/* ---------- escena ---------- */

const SECTORS = [
  { key: 'M01', name: 'M01 Terminal de Contenedores', sub: 'DIAGNOSTICO DEL SISTEMA',
    pos: [-195, -245], state: 'active', build: buildContenedores },
  { key: 'M02', name: 'M02 Terminal de Cruceros', sub: 'CAMARA DE APRENDIZAJE',
    pos: [255, -220], state: 'locked', build: buildCruceros },
  { key: 'M03', name: 'M03 Astillero', sub: 'ESCUDO DE DATOS (SEGURIDAD)',
    pos: [-350, 45], state: 'locked', build: buildAstillero },
  { key: 'M04', name: 'M04 Terminal Intermodal', sub: 'CODIGO DE COMANDO (PROMPTS)',
    pos: [-70, 315], state: 'locked', build: buildIntermodal },
  { key: 'M05', name: 'M05 Terminal de Usos Multiples', sub: 'INNOVACION Y DIGITALIZACION',
    pos: [315, 185], state: 'locked', build: buildUsos },
];

// suelo y rejilla
const ground = new THREE.Mesh(new THREE.PlaneGeometry(3200, 3200), fillMat(0x020810));
ground.rotation.x = -Math.PI / 2;
ground.position.y = -0.6;
scene.add(ground);

const grid = new THREE.GridHelper(2600, 52, 0x0e3a5c, 0x07233c);
grid.material.transparent = true;
grid.material.opacity = 0.4;
scene.add(grid);

// plataforma + silueta por sector
const platformFor = (state) => {
  const edge = state === 'active' ? COL.cyan : state === 'done' ? COL.aqua : COL.locked;
  const p = holo(new THREE.CylinderGeometry(104, 112, 9, 6), edge, COL.fill2, state === 'locked' ? 0.5 : 0.95);
  p.position.y = 4.5;
  return p;
};

const sectorGroups = SECTORS.map((s) => {
  const g = new THREE.Group();
  g.position.set(s.pos[0], 0, s.pos[1]);
  g.add(platformFor(s.state));
  const inner = new THREE.Group();
  inner.position.y = 9;
  s.build(inner);
  if (s.state === 'locked') inner.traverse((o) => {
    if (o.material && o.material.opacity !== undefined && o.material.transparent) o.material = o.material.clone();
    if (o.isLineSegments) { o.material = o.material.clone(); o.material.opacity *= 0.4; }
  });
  g.add(inner);
  scene.add(g);
  return g;
});

const hubGroup = new THREE.Group();
buildHub(hubGroup);
scene.add(hubGroup);

// haz extra sobre el sector activo
const activeBeam = new THREE.Mesh(new THREE.CylinderGeometry(2, 8, 100, 10, 1, true), glowMat(COL.cyan, 0.13));
activeBeam.position.set(SECTORS[0].pos[0], 60, SECTORS[0].pos[1]);
scene.add(activeBeam);

/* ---------- rutas de datos con pulsos ---------- */

const roads = [];
const roadLine = (pts, color, op) => {
  const geo = new THREE.BufferGeometry().setFromPoints(pts);
  scene.add(new THREE.Line(geo, lineMat(color, op)));
};

SECTORS.forEach((s) => {
  const [x, z] = s.pos;
  const y = 1.4;
  const pts = [new THREE.Vector3(0, y, 0), new THREE.Vector3(x, y, 0), new THREE.Vector3(x, y, z)];
  roadLine(pts, COL.cyan, s.state === 'locked' ? 0.22 : 0.6);
  roadLine(pts.map((p) => p.clone().add(new THREE.Vector3(7, 0, 7))), COL.amber, s.state === 'locked' ? 0.14 : 0.4);

  // longitudes acumuladas para animar pulsos
  const lens = [0];
  for (let i = 1; i < pts.length; i++) lens.push(lens[i - 1] + pts[i].distanceTo(pts[i - 1]));
  const total = lens[lens.length - 1];
  const mkPulse = (color, dir, off) => {
    const m = new THREE.Mesh(new THREE.SphereGeometry(2.4, 8, 6), glowMat(color, 0.95));
    scene.add(m);
    return { m, t: off * total, dir, pts, lens, total, dim: s.state === 'locked' };
  };
  roads.push(mkPulse(COL.cyan, 1, 0), mkPulse(COL.cyan, 1, 0.5), mkPulse(COL.amber, -1, 0.25));
});

// anillo de circuito alrededor del hub
{
  const pts = [];
  for (let i = 0; i <= 60; i++) {
    const a = (i / 60) * Math.PI * 2;
    pts.push(new THREE.Vector3(Math.cos(a) * 150, 1.2, Math.sin(a) * 150));
  }
  roadLine(pts, COL.cyan, 0.22);
}

const stepPulse = (p, dt) => {
  p.t = (p.t + dt * PULSE_SPEED * p.dir + p.total) % p.total;
  let i = 1;
  while (i < p.lens.length - 1 && p.lens[i] < p.t) i++;
  const f = (p.t - p.lens[i - 1]) / (p.lens[i] - p.lens[i - 1]);
  p.m.position.lerpVectors(p.pts[i - 1], p.pts[i], f);
  p.m.material.opacity = p.dim ? 0.25 : 0.95;
};

/* ---------- motas de ambiente ---------- */

const motes = (() => {
  const N = 380, arr = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) {
    arr[i * 3] = (Math.random() - 0.5) * 1700;
    arr[i * 3 + 1] = 8 + Math.random() * 330;
    arr[i * 3 + 2] = (Math.random() - 0.5) * 1700;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(arr, 3));
  const pts = new THREE.Points(geo, new THREE.PointsMaterial({
    color: COL.cyan, size: 2.2, transparent: true, opacity: 0.4,
    blending: THREE.AdditiveBlending, depthWrite: false,
  }));
  scene.add(pts);
  return pts;
})();

/* ---------- etiquetas DOM proyectadas ---------- */

const labelsBox = document.getElementById('labels');
const mkTag = (cls, html, anchor) => {
  const d = document.createElement('div');
  d.className = `tag ${cls}`;
  d.innerHTML = html;
  labelsBox.appendChild(d);
  return { el: d, anchor };
};

const tags = SECTORS.map((s, i) => {
  const locked = s.state === 'locked';
  const small = locked
    ? `<small><i class="lock"></i>${s.sub}</small>`
    : `<small>${s.sub}</small>`;
  return mkTag(locked ? 'tag--locked' : '', `<strong>${s.name}</strong>${small}`,
    new THREE.Vector3(s.pos[0], 86, s.pos[1]));
});
tags.push(mkTag('tag--hub', '<strong>Digital Hub (Unit 0)</strong><small>PROYECTO NEXO-IA</small>',
  new THREE.Vector3(0, 150, 0)));

const projectTags = () => {
  const w = innerWidth, h = innerHeight;
  tags.forEach(({ el, anchor }) => {
    const v = anchor.clone().project(camera);
    if (v.z > 1) { el.style.display = 'none'; return; }
    el.style.display = '';
    el.style.transform =
      `translate(-50%, -110%) translate(${(v.x * 0.5 + 0.5) * w}px, ${(-v.y * 0.5 + 0.5) * h}px)`;
  });
};

/* ---------- camara: orbita + tour ---------- */

const cam = { theta: 2.4, phi: 0.92, r: 640, tgt: new THREE.Vector3(0, 24, 0) };
const want = { theta: 2.4, phi: 0.92, r: 640, tgt: cam.tgt.clone() };
let manualHold = 0, dragging = false, paused = false;

const hudStatus = document.getElementById('hud-status');
const mGamma = document.getElementById('m-gamma');

const TOUR = [-1, 0, 1, 2, 3, 4]; // -1 = hub
let tourIdx = 0, tourT = 0, stops = 0;

const focus = (i) => {
  tags.forEach((t, k) => t.el.classList.toggle('is-focus', i === -1 ? k === tags.length - 1 : k === i));
  if (i === -1) {
    want.tgt.set(0, 30, 0);
    want.r = 660;
    hudStatus.textContent = 'DIGITAL HUB (UNIT 0) — PROYECTO NEXO-IA';
  } else {
    const s = SECTORS[i];
    want.tgt.set(s.pos[0], 22, s.pos[1]);
    want.r = 450;
    want.theta = Math.atan2(s.pos[0], s.pos[1]);
    hudStatus.textContent = `ENFOQUE: ${s.name.toUpperCase()} — ${s.sub}`;
  }
};

const gl = document.getElementById('gl');
gl.addEventListener('pointerdown', (e) => { dragging = true; gl.setPointerCapture(e.pointerId); });
gl.addEventListener('pointermove', (e) => {
  if (!dragging) return;
  want.theta -= e.movementX * 0.005;
  want.phi = Math.max(0.42, Math.min(1.25, want.phi - e.movementY * 0.004));
  manualHold = 4;
});
gl.addEventListener('pointerup', () => { dragging = false; });
gl.addEventListener('pointercancel', () => { dragging = false; });
addEventListener('wheel', (e) => {
  want.r = Math.max(300, Math.min(980, want.r + e.deltaY * 0.5));
  manualHold = 4;
}, { passive: true });

addEventListener('keydown', (e) => {
  if (e.code === 'Space') {
    e.preventDefault();
    paused = !paused;
    hudStatus.textContent = paused ? 'PAUSA' : 'TOUR CINEMATICO EN CURSO';
    return;
  }
  if (e.key === '0') { tourIdx = 0; tourT = 0; focus(-1); manualHold = 8; }
  const n = parseInt(e.key, 10);
  if (n >= 1 && n <= SECTORS.length) {
    tourIdx = n; tourT = 0;
    focus(n - 1);
    manualHold = 8;
  }
});

/* ---------- minimapa ---------- */

const mm = document.getElementById('minimap');
const mctx = mm.getContext('2d');
const drawMinimap = (t) => {
  const s = mm.width, c = s / 2, k = c / 420;
  mctx.clearRect(0, 0, s, s);
  mctx.strokeStyle = 'rgba(56,225,255,0.25)';
  mctx.beginPath(); mctx.arc(c, c, c * 0.62, 0, Math.PI * 2); mctx.stroke();
  // barrido
  const a = t * 0.5;
  mctx.strokeStyle = 'rgba(56,225,255,0.35)';
  mctx.beginPath(); mctx.moveTo(c, c);
  mctx.lineTo(c + Math.cos(a) * c * 0.9, c + Math.sin(a) * c * 0.9); mctx.stroke();
  // hub
  mctx.fillStyle = '#38e1ff';
  mctx.fillRect(c - 3, c - 3, 6, 6);
  // sectores
  SECTORS.forEach((sec, i) => {
    const x = c + sec.pos[0] * k, y = c + sec.pos[1] * k;
    const focused = TOUR[tourIdx] === i;
    mctx.fillStyle = sec.state === 'locked' ? 'rgba(90,130,175,0.8)' : '#54ffc8';
    mctx.beginPath(); mctx.arc(x, y, focused ? 5 : 3, 0, Math.PI * 2); mctx.fill();
    if (focused) {
      mctx.strokeStyle = '#38e1ff';
      mctx.beginPath(); mctx.arc(x, y, 8, 0, Math.PI * 2); mctx.stroke();
    }
  });
};

/* ---------- bucle ---------- */

let last = performance.now(), elapsed = 0;

const frame = (now) => {
  requestAnimationFrame(frame);
  const dt = Math.min((now - last) / 1000, 0.05);
  last = now;
  if (paused) { composer.render(); return; }
  elapsed += dt;

  // tour cinematico
  if (!dragging && (manualHold -= dt) <= 0) {
    tourT += dt;
    if (tourT >= TOUR_S) {
      tourT = 0;
      tourIdx = (tourIdx + 1) % TOUR.length;
      focus(TOUR[tourIdx]);
      stops++;
      mGamma.textContent = `${Math.min(100, (stops * 7) % 105)}/100`;
    }
    if (!REDUCED) want.theta += dt * 0.05; // deriva orbital
  }

  // camara
  const k = 1 - Math.exp(-dt * 4.5);
  let dTheta = want.theta - cam.theta;
  dTheta = ((dTheta + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI;
  cam.theta += dTheta * k;
  want.theta = cam.theta + dTheta * (1 - k); // evita saltos acumulados
  cam.phi += (want.phi - cam.phi) * k;
  cam.r += (want.r - cam.r) * k;
  cam.tgt.lerp(want.tgt, k);

  camera.position.set(
    cam.tgt.x + cam.r * Math.sin(cam.phi) * Math.sin(cam.theta),
    cam.tgt.y + cam.r * Math.cos(cam.phi),
    cam.tgt.z + cam.r * Math.sin(cam.phi) * Math.cos(cam.theta)
  );
  camera.lookAt(cam.tgt);

  // animaciones
  roads.forEach((p) => stepPulse(p, dt));
  if (!REDUCED) motes.rotation.y += dt * 0.008;
  activeBeam.material.opacity = 0.1 + 0.05 * Math.sin(elapsed * 2.2);

  composer.render();
  projectTags();
  drawMinimap(elapsed);
};

const onResize = () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  composer.setSize(innerWidth, innerHeight);
};
addEventListener('resize', onResize);

document.body.classList.add('ready');
focus(-1);
requestAnimationFrame(frame);
