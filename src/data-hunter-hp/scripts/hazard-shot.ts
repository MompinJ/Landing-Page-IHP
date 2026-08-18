/**
 * Captura de los DOS castigos por quedarse atrás, en el orden en que los ve un
 * jugador nuevo: primero el CONTENEDOR que suelta la grúa pórtico y después la
 * RETIRADA DEL DRON. En cada uno el colaborador recula lo que le deja la correa
 * (con la máquina ya avisando encima) y da el paso de más.
 *
 *   npx tsx scripts/hazard-shot.ts [url]
 */
import { mkdirSync } from 'node:fs';
import { chromium } from 'playwright';

const URL = process.argv[2] ?? 'http://localhost:5199/?debug';
const OUT = 'scripts/hazard-out';
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({
  args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'],
});
const page = await browser.newPage({ viewport: { width: 1500, height: 900 } });
page.on('pageerror', (e) => console.error('[pageerror]', String(e)));
await page.goto(URL, { waitUntil: 'networkidle' });
await page.getByRole('button', { name: 'Iniciar misión' }).click();
await page.waitForTimeout(1200);

/** Planta al colaborador en un tramo de 5 filas seguidas limpias por la col 0 */
async function colocar(desde: number): Promise<number> {
  return page.evaluate((inicio) => {
    const dh = (window as any).__DH;
    dh.teleport(inicio + 100, 0); // fuerza la generación del mapa por delante
    // Sin funciones con nombre aquí dentro: el transpilado de tsx les inyecta
    // un `__name` que no existe en la página.
    // Dos pasadas: primero se busca en el patio de contenedores (el escenario
    // más despejado) y, si no sale, en cualquier bioma.
    for (let pasada = 0; pasada < 2; pasada++) {
      for (let i = inicio; i < inicio + 100; i++) {
        let ok = true;
        // Solo importan las 4 filas que el colaborador va a pisar al recular
        for (let r = i - 3; r <= i; r++) {
          const fila = dh.rows[r];
          // Tramo LIMPIO: pisable y sin nada que atropelle, para que lo único
          // que le pase al colaborador en la captura sea el castigo.
          const mala =
            !fila ||
            (pasada === 0 && fila.theme !== 'port') ||
            fila.type === 'water' ||
            fila.vehicles.length > 0 ||
            fila.cranes.length > 0 ||
            fila.belt ||
            fila.stacks.some((st: any) => st.col === 0) ||
            !!fila.docks?.length;
          if (mala) ok = false;
        }
        if (ok) {
          dh.teleport(i, 0);
          return i;
        }
      }
    }
    return -1;
  }, desde);
}

/** Agota la correa: al último paso la máquina ya está avisando encima */
async function recular() {
  for (let n = 0; n < 3; n++) {
    await page.keyboard.press('ArrowDown');
    await page.waitForTimeout(420);
  }
  await page.waitForTimeout(700);
}

const estado = () =>
  page.evaluate(() => {
    const dh = (window as any).__DH;
    return {
      row: dh.runtime.row,
      kind: dh.runtime.snatchKind,
      snatching: dh.runtime.snatching,
      t: dh.runtime.snatchTime,
      lives: dh.store.getState().lives,
    };
  });

/** Espera a que el reloj del castigo arranque (la grúa puede venir de camino) */
async function esperarSuelta(limite = 6000) {
  const t0 = Date.now();
  while (Date.now() - t0 < limite) {
    const e = await estado();
    if (e.t > 0.05) return;
    await page.waitForTimeout(60);
  }
  console.error('ERROR: el castigo no arrancó en', limite, 'ms');
  process.exit(1);
}

/** Espera a que termine (y a que el HUD acuse el golpe) */
async function esperarFin(limite = 8000) {
  const t0 = Date.now();
  while (Date.now() - t0 < limite) {
    if (!(await estado()).snatching) return;
    await page.waitForTimeout(80);
  }
  console.error('ERROR: el castigo no terminó en', limite, 'ms');
  process.exit(1);
}

// ---------------------------------------------------------- 1. el contenedor
const fila1 = await colocar(30);
if (fila1 < 0) {
  console.error('ERROR: no se encontró un tramo limpio para la primera captura');
  process.exit(1);
}
await page.waitForTimeout(1000);
// Se agota la correa: la grúa arranca a rodar por sus rieles en cuanto se entra
// en la zona de aviso, así que la primera foto la pilla llegando.
await page.keyboard.press('ArrowDown'); // el primero es gratis
await page.waitForTimeout(420);
await page.keyboard.press('ArrowDown'); // aquí entra en zona de aviso
await page.waitForTimeout(420);
await page.keyboard.press('ArrowDown');
await page.waitForTimeout(120);
await page.screenshot({ path: `${OUT}/box-1-llega.png` });
await page.waitForTimeout(1600); // el carro recorre la viga y el cable baja
await page.screenshot({ path: `${OUT}/box-2-encima.png` });

await page.keyboard.press('ArrowDown');
await esperarSuelta();
// El tipo se lee AHORA: al reaparecer, el juego ya tiene armada la otra máquina
const kind1 = (await estado()).kind;
await page.waitForTimeout(180); // twistlocks abiertos, cajón suelto
await page.screenshot({ path: `${OUT}/box-3-suelta.png` });
await page.waitForTimeout(260); // caída
await page.screenshot({ path: `${OUT}/box-4-impacto.png` });
await page.waitForTimeout(400); // reposo con el cajón en el suelo
await page.screenshot({ path: `${OUT}/box-5-reposo.png` });
await esperarFin();
await page.waitForTimeout(500);
await page.screenshot({ path: `${OUT}/box-6-reaparece.png` });
const tras1 = await estado();
console.log(`castigo 1 (${kind1}):`, JSON.stringify(tras1));
if (kind1 !== 'crane') {
  console.error(`ERROR: el primero de la partida debía ser el contenedor, fue ${kind1}`);
  process.exit(1);
}

// ---------------------------------------------------------------- 2. el dron
const fila2 = await colocar(fila1 + 20);
if (fila2 < 0) {
  console.error('ERROR: no se encontró un tramo limpio para la segunda captura');
  process.exit(1);
}
await page.waitForTimeout(1000);
await recular();
await page.screenshot({ path: `${OUT}/drone-1-patrulla.png` });
await page.keyboard.press('ArrowDown');
await esperarSuelta();
const kind2 = (await estado()).kind;
await page.waitForTimeout(420);
await page.screenshot({ path: `${OUT}/drone-2-descenso.png` });
await page.waitForTimeout(330);
await page.screenshot({ path: `${OUT}/drone-3-enganche.png` });
await page.waitForTimeout(500);
await page.screenshot({ path: `${OUT}/drone-4-izado.png` });
await esperarFin();
await page.waitForTimeout(500);
await page.screenshot({ path: `${OUT}/drone-5-reaparece.png` });
const tras2 = await estado();
console.log(`castigo 2 (${kind2}):`, JSON.stringify(tras2));
if (kind2 !== 'drone') {
  console.error(`ERROR: el segundo debía ser el dron, fue ${kind2}`);
  process.exit(1);
}

if (tras1.snatching || tras2.snatching) {
  console.error('ERROR: algún castigo no terminó');
  process.exit(1);
}
if (tras2.lives !== 1) {
  console.error(`ERROR: dos castigos debían costar dos vidas (3 → 1), quedan ${tras2.lives}`);
  process.exit(1);
}
console.log(`capturas en ${OUT}/`);
await browser.close();
