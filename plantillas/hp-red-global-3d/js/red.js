/* ============================================================
   PLANTILLA HP RED GLOBAL 3D — globo de la red
   Globo de puntos (Three.js) que gira hasta el puerto de cada
   slide. Arcos entre puertos con pulsos de carga viajando.
   El deck funciona aunque WebGL/CDN no esten disponibles.
   ============================================================ */

// ---------- configuracion rapida ----------
// puertos de la red: [nombre, codigo, lat, lon]
// el orden define la ruta; cada slide elige uno con data-port
const PORTS = [
  ['Hong Kong', 'HIT', 22.30, 114.16],
  ['Yantian', 'YICT', 22.58, 114.27],
  ['Veracruz', 'ICAVE', 19.20, -96.13],
  ['Barcelona', 'BEST', 41.35, 2.16],
  ['Felixstowe', 'POF', 51.96, 1.35],
  ['Rotterdam', 'ECT', 51.95, 4.05],
  ['Panama', 'PPC', 9.35, -79.90],
  ['Sydney', 'SICTL', -33.97, 151.20],
  ['Karachi', 'KICT', 24.80, 67.00],
  ['Jakarta', 'JICT', -6.10, 106.90]
];

const DOT_COUNT = 1100;     // puntos del globo
const COLOR_DOTS = 0x009BDE;   // Ports Sky Blue (puntos del globo)
const COLOR_NODE = 0x002E6D;   // Ports Sea Blue (puertos)
const COLOR_NODE_ON = 0xFFC627; // Ports Sunray Yellow (puerto activo)
const COLOR_ARC = 0x002E6D;
const COLOR_PULSE = 0xEE7523;  // Ports Sunset Orange

// ============================================================
// DECK (independiente de WebGL)
// ============================================================
const slides = Array.from(document.querySelectorAll('.slide'));
const hudPort = document.getElementById('hud-port');
const hudCounter = document.getElementById('hud-counter');

let current = 0;
let onSlideChange = () => {}; // la conecta el modulo del globo

const pad = (n) => String(n + 1).padStart(2, '0');

const portOf = (slide) => {
  const i = parseInt(slide.dataset.port ?? '0', 10) || 0;
  return Math.min(i, PORTS.length - 1);
};

const fmtCoord = (lat, lon) =>
  `${Math.abs(lat).toFixed(1)}${lat >= 0 ? 'N' : 'S'} ${Math.abs(lon).toFixed(1)}${lon >= 0 ? 'E' : 'W'}`;

const updateHud = () => {
  const p = PORTS[portOf(slides[current])];
  hudPort.textContent = `${p[1]} · ${p[0].toUpperCase()} · ${fmtCoord(p[2], p[3])}`;
  hudCounter.textContent = `${pad(current)} / ${pad(slides.length - 1)}`;
};

const goTo = (target) => {
  if (target < 0 || target >= slides.length || target === current) return;
  slides[current].classList.remove('is-active');
  current = target;
  slides[current].classList.add('is-active');
  updateHud();
  onSlideChange(portOf(slides[current]));
};

document.addEventListener('keydown', (e) => {
  switch (e.key) {
    case 'ArrowRight':
    case 'ArrowDown':
    case 'PageDown':
    case ' ':
      e.preventDefault(); goTo(current + 1); break;
    case 'ArrowLeft':
    case 'ArrowUp':
    case 'PageUp':
      e.preventDefault(); goTo(current - 1); break;
    case 'Home': e.preventDefault(); goTo(0); break;
    case 'End': e.preventDefault(); goTo(slides.length - 1); break;
  }
});

let touchX = null;
document.addEventListener('touchstart', (e) => { touchX = e.touches[0].clientX; }, { passive: true });
document.addEventListener('touchend', (e) => {
  if (touchX === null) return;
  const dx = e.changedTouches[0].clientX - touchX;
  touchX = null;
  if (Math.abs(dx) < 45) return;
  if (dx < 0) goTo(current + 1); else goTo(current - 1);
}, { passive: true });

let wheelLock = 0;
document.addEventListener('wheel', (e) => {
  const now = Date.now();
  if (now - wheelLock < 900 || Math.abs(e.deltaY) < 18) return;
  wheelLock = now;
  if (e.deltaY > 0) goTo(current + 1); else goTo(current - 1);
}, { passive: true });

updateHud();

// ============================================================
// GLOBO WEBGL
// ============================================================
const startGlobe = (THREE) => {
  const canvas = document.getElementById('globe');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(42, window.innerWidth / window.innerHeight, 0.1, 100);
  camera.position.set(0, 0, 7.2);

  const R = 2.05;
  const globe = new THREE.Group();
  // el globo vive a la derecha del layout (el contenido va a la izquierda)
  const wide = () => window.innerWidth > 860;
  globe.position.x = wide() ? 1.55 : 0;
  globe.position.y = wide() ? 0 : 0.9;
  scene.add(globe);

  const latLonToVec = (lat, lon, r) => {
    const phi = lat * Math.PI / 180;
    const lambda = lon * Math.PI / 180;
    return new THREE.Vector3(
      r * Math.cos(phi) * Math.sin(lambda),
      r * Math.sin(phi),
      r * Math.cos(phi) * Math.cos(lambda)
    );
  };

  // ---------- esfera de puntos (fibonacci) ----------
  {
    const pos = new Float32Array(DOT_COUNT * 3);
    const golden = Math.PI * (3 - Math.sqrt(5));
    for (let i = 0; i < DOT_COUNT; i++) {
      const y = 1 - (i / (DOT_COUNT - 1)) * 2;
      const rad = Math.sqrt(1 - y * y);
      const th = golden * i;
      pos[i * 3] = Math.cos(th) * rad * R;
      pos[i * 3 + 1] = y * R;
      pos[i * 3 + 2] = Math.sin(th) * rad * R;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    globe.add(new THREE.Points(geo, new THREE.PointsMaterial({
      color: COLOR_DOTS, size: 0.055, transparent: true, opacity: 0.9
    })));
  }

  // esfera interior blanca: oculta los puntos de la cara trasera
  // (sin esto el globo se lee como un disco plano)
  globe.add(new THREE.Mesh(
    new THREE.SphereGeometry(R * 0.97, 48, 48),
    new THREE.MeshBasicMaterial({ color: 0xffffff })
  ));

  // anillo ecuatorial sutil
  {
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(R * 1.001, 0.004, 8, 128),
      new THREE.MeshBasicMaterial({ color: COLOR_DOTS, transparent: true, opacity: 0.35 })
    );
    ring.rotation.x = Math.PI / 2;
    globe.add(ring);
  }

  // ---------- nodos de puertos ----------
  const nodes = PORTS.map(([, , lat, lon]) => {
    const m = new THREE.Mesh(
      new THREE.SphereGeometry(0.045, 12, 12),
      new THREE.MeshBasicMaterial({ color: COLOR_NODE })
    );
    m.position.copy(latLonToVec(lat, lon, R * 1.01));
    globe.add(m);
    return m;
  });

  // ---------- arcos entre puertos consecutivos ----------
  const curves = [];
  for (let i = 0; i < PORTS.length - 1; i++) {
    const a = latLonToVec(PORTS[i][2], PORTS[i][3], R * 1.01);
    const b = latLonToVec(PORTS[i + 1][2], PORTS[i + 1][3], R * 1.01);
    const mid = a.clone().add(b).multiplyScalar(0.5).normalize()
      .multiplyScalar(R * (1.18 + a.distanceTo(b) * 0.12));
    const curve = new THREE.QuadraticBezierCurve3(a, mid, b);
    curves.push(curve);

    const pts = curve.getPoints(72);
    const geo = new THREE.BufferGeometry().setFromPoints(pts);
    globe.add(new THREE.Line(geo, new THREE.LineBasicMaterial({
      color: COLOR_ARC, transparent: true, opacity: 0.5
    })));
  }

  // pulsos de carga que recorren los arcos
  const pulses = curves.map((curve, i) => {
    const m = new THREE.Mesh(
      new THREE.SphereGeometry(0.05, 10, 10),
      new THREE.MeshBasicMaterial({ color: COLOR_PULSE })
    );
    m.userData = { curve, offset: i * 0.23 };
    globe.add(m);
    return m;
  });

  // ---------- rotacion hacia el puerto activo ----------
  // con rotation.x = lat y rotation.y = -lon el puerto queda
  // exactamente de frente a la camara (orden XYZ de Three)
  let targetRX = 0, targetRY = 0;
  let activePort = 0;

  const focusPort = (i) => {
    activePort = i;
    const lat = PORTS[i][2] * Math.PI / 180;
    const lon = PORTS[i][3] * Math.PI / 180;
    targetRX = lat;
    // camino corto en Y para no dar la vuelta larga al planeta
    let ry = -lon;
    while (ry - globe.rotation.y > Math.PI) ry -= Math.PI * 2;
    while (ry - globe.rotation.y < -Math.PI) ry += Math.PI * 2;
    targetRY = ry;

    nodes.forEach((n, j) => {
      n.material.color.setHex(j === i ? COLOR_NODE_ON : COLOR_NODE);
      n.scale.setScalar(j === i ? 2.1 : 1);
    });
  };

  onSlideChange = focusPort;
  focusPort(portOf(slides[current]));

  // ---------- loop ----------
  let t = 0;
  const render = () => {
    requestAnimationFrame(render);
    t += 0.016;

    globe.rotation.x += (targetRX - globe.rotation.x) * 0.045;
    globe.rotation.y += (targetRY + Math.sin(t * 0.35) * 0.025 - globe.rotation.y) * 0.045;

    pulses.forEach((p) => {
      const k = (t * 0.11 + p.userData.offset) % 1;
      p.position.copy(p.userData.curve.getPoint(k));
      p.scale.setScalar(0.7 + Math.sin(k * Math.PI) * 0.6);
    });

    // el nodo activo late
    nodes[activePort].scale.setScalar(2.1 + Math.sin(t * 3.2) * 0.35);

    renderer.render(scene, camera);
  };
  render();

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    globe.position.x = wide() ? 1.55 : 0;
    globe.position.y = wide() ? 0 : 0.9;
  });
};

import('https://cdn.jsdelivr.net/npm/three@0.165.0/build/three.module.js')
  .then(startGlobe)
  .catch(() => {
    document.body.classList.add('no-webgl');
    console.warn('[hp-red-global-3d] Three.js no disponible: fallback estatico.');
  });
