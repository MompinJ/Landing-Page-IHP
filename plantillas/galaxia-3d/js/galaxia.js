/* ============================================================
   PLANTILLA GALAXIA 3D — deck + fondo WebGL (Three.js via CDN)
   El deck (slides DOM) funciona aunque Three.js no cargue:
   el fondo simplemente queda en el degradado CSS de fallback.
   ============================================================ */

// ---------- configuracion rapida ----------
const STAR_COUNT = 4200;        // cantidad de estrellas (bajar en equipos modestos)
const STAR_COLOR = 0xbfcaff;    // color base de las estrellas
const STAR_COLOR_HOT = 0xffc46b; // segundo color (estrellas calidas)
const NEBULA = 0x1a1f4a;        // tinte de la niebla de fondo
const WARP_BOOST = 26;          // velocidad extra durante el cambio de slide
const DRIFT = 0.55;             // velocidad de crucero del campo de estrellas

// ============================================================
// DECK (no depende de WebGL)
// ============================================================
const slides = Array.from(document.querySelectorAll('.slide'));
const hudFill = document.getElementById('hud-fill');
const hudCounter = document.getElementById('hud-counter');

let current = 0;
let warp = 0; // 0..1, se enciende al cambiar de slide y decae solo

const pad = (n) => String(n).padStart(2, '0');

const updateHud = () => {
  hudCounter.textContent = `${pad(current + 1)} / ${pad(slides.length)}`;
  hudFill.style.width = `${((current + 1) / slides.length) * 100}%`;
};

const goTo = (target) => {
  if (target < 0 || target >= slides.length || target === current) return;
  const prev = slides[current];
  prev.classList.remove('is-active');
  prev.classList.add('is-leaving');
  setTimeout(() => prev.classList.remove('is-leaving'), 700);

  current = target;
  slides[current].classList.add('is-active');
  warp = 1; // dispara el salto a warp del fondo
  updateHud();
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
  if (now - wheelLock < 650 || Math.abs(e.deltaY) < 18) return;
  wheelLock = now;
  if (e.deltaY > 0) goTo(current + 1); else goTo(current - 1);
}, { passive: true });

updateHud();

// ============================================================
// FONDO WEBGL (carga perezosa de Three.js; con fallback)
// ============================================================
const mouse = { x: 0, y: 0 };
document.addEventListener('pointermove', (e) => {
  mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
  mouse.y = (e.clientY / window.innerHeight) * 2 - 1;
});

const startSpace = (THREE) => {
  const canvas = document.getElementById('space');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(NEBULA, 0.0009);

  const camera = new THREE.PerspectiveCamera(68, window.innerWidth / window.innerHeight, 1, 3000);
  camera.position.z = 600;

  // ---------- estrellas: dos nubes de puntos (frias y calidas) ----------
  const makeStars = (count, color, size) => {
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 2400;     // x
      pos[i * 3 + 1] = (Math.random() - 0.5) * 1600; // y
      pos[i * 3 + 2] = -Math.random() * 2400;        // z (delante de la camara)
    }
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const mat = new THREE.PointsMaterial({
      color,
      size,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.9,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });
    return new THREE.Points(geo, mat);
  };

  const starsCool = makeStars(Math.floor(STAR_COUNT * 0.8), STAR_COLOR, 2.1);
  const starsHot = makeStars(Math.floor(STAR_COUNT * 0.2), STAR_COLOR_HOT, 2.8);
  scene.add(starsCool, starsHot);

  // ---------- loop ----------
  const advance = (points, speed) => {
    const arr = points.geometry.attributes.position.array;
    for (let i = 2; i < arr.length; i += 3) {
      arr[i] += speed; // las estrellas vienen hacia la camara
      if (arr[i] > camera.position.z) arr[i] = -2400; // recicla al fondo
    }
    points.geometry.attributes.position.needsUpdate = true;
  };

  const render = () => {
    requestAnimationFrame(render);

    // el warp decae exponencialmente despues de cada cambio de slide
    warp *= 0.94;
    const speed = DRIFT + warp * WARP_BOOST;

    advance(starsCool, speed);
    advance(starsHot, speed * 1.25);

    // parallax suave hacia el mouse
    camera.position.x += (mouse.x * 60 - camera.position.x) * 0.04;
    camera.position.y += (-mouse.y * 40 - camera.position.y) * 0.04;
    camera.lookAt(0, 0, -600);

    // estiramiento visual en warp: las estrellas crecen un poco
    starsCool.material.size = 2.1 + warp * 6;
    starsHot.material.size = 2.8 + warp * 8;

    renderer.render(scene, camera);
  };
  render();

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });
};

// carga desde CDN; si falla (sin internet) el deck sigue con el fondo CSS
import('https://cdn.jsdelivr.net/npm/three@0.165.0/build/three.module.js')
  .then(startSpace)
  .catch(() => {
    console.warn('[galaxia-3d] Three.js no disponible: usando fondo estatico CSS.');
  });
