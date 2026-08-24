/**
 * LA MÚSICA (`src/audio/music.ts`).
 *
 * No se puede comprobar oyéndola desde un script, así que se comprueba por sus
 * efectos, que es donde están de todas formas las promesas concretas:
 *
 *   1. NO suena antes de que el jugador toque nada. Los navegadores lo exigen,
 *      y saltárselo no es solo de mala educación: el navegador suspende el
 *      contexto y luego la música no arranca ni cuando debe.
 *   2. Suena al empezar a jugar.
 *   3. APRIETA con la dificultad: más notas por segundo en la fila 120 que en
 *      la 0, porque el tempo sube con la misma curva que usa el juego.
 *   4. SE APARTA en el remate de muerte: el volumen baja y el arpegio calla,
 *      que es lo que hace que el golpe suene a final.
 *   5. El botón de SILENCIO calla de verdad y se recuerda al recargar.
 *
 * Y aparte, sin navegador, que las cinco terminales suenen DISTINTO: es la
 * promesa de «a medida» y se puede comprobar leyendo las paletas.
 *
 *   npx tsx scripts/music-test.ts [url]
 */
import { chromium, devices } from 'playwright';
import { duracionPaso, PALETAS } from '../src/audio/music';

const BASE = process.argv[2] ?? 'http://localhost:4212/';
const fallos: string[] = [];
const ok: string[] = [];
const check = (c: boolean, m: string) => (c ? ok : fallos).push(m);

/* ------------------------------------ las paletas, sin navegador ni audio */

const nombres = Object.keys(PALETAS);
const huellas = new Set(
  Object.values(PALETAS).map((p) => `${p.escala.join(',')}|${p.arpegio}|${p.bajo}|${p.transporte}`),
);
check(
  huellas.size === nombres.length,
  `las ${nombres.length} terminales tienen sonido propio (${huellas.size} paletas distintas)`,
);
check(
  Object.values(PALETAS).every((p) => p.escala[0] === 0 && p.escala.every((g) => g >= 0 && g < 12)),
  'todas las escalas parten de la tónica y caben en una octava',
);
check(
  duracionPaso(1) < duracionPaso(0),
  `el tempo sube con la tensión (${(60 / duracionPaso(0) / 4).toFixed(0)} → ${(60 / duracionPaso(1) / 4).toFixed(0)} bpm)`,
);

/* ------------------------------------------------------ y ahora, sonando */

const browser = await chromium.launch({
  args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist', '--autoplay-policy=user-gesture-required'],
});
const ctx = await browser.newContext({ ...devices['iPhone 13'] });
const page = await ctx.newPage();
page.on('pageerror', (e) => console.error('[pageerror]', String(e)));
await page.goto(`${BASE}?debug&daily&fps=off`, { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);

const estado = () => page.evaluate(`window.__PQ_MUSICA()`) as Promise<{ notas: number; volumen: number; silenciada: boolean; sonando: boolean }>;

// 1. antes del gesto, silencio absoluto
const antes = await estado();
check(antes.notas === 0 && !antes.sonando, `antes de tocar nada no suena (notas ${antes.notas})`);

// 2. al pulsar Jugar arranca — y el briefing NO se queda mudo.
// La ventana es de cuatro segundos a propósito: el compás dura casi tres al
// tempo de la portada, así que medir uno y medio solo alcanzaba a ver el primer
// acorde del colchón y no decía nada sobre si la cama se mueve o no.
await page.getByRole('button', { name: 'Jugar', exact: true }).click();
await page.waitForTimeout(4000);
const enMenu = await estado();
check(
  enMenu.notas >= 6,
  `en el briefing hay cama sonando y no un acorde suelto (${enMenu.notas} notas en 4 s)`,
);

await page.getByRole('button', { name: 'A jugar' }).click();
await page.waitForTimeout(400);

/** Notas por segundo durante un rato, con el jugador en la fila que se diga */
async function ritmoEnFila(fila: number): Promise<number> {
  await page.evaluate(`(() => { const dh = window.__DH; dh.teleport(${fila}, 0); dh.store.getState().setCurrentRow(${fila}); })()`);
  await page.waitForTimeout(600); // que el planificador se entere
  const a = (await estado()).notas;
  await page.waitForTimeout(2500);
  const b = (await estado()).notas;
  return (b - a) / 2.5;
}

const ritmoFacil = await ritmoEnFila(0);
const ritmoDuro = await ritmoEnFila(140);
check(
  ritmoDuro > ritmoFacil * 1.15,
  `aprieta con la dificultad: ${ritmoFacil.toFixed(1)} notas/s en la fila 0 → ${ritmoDuro.toFixed(1)} en la 140`,
);

// 4. el remate de muerte la aparta
const volNormal = (await estado()).volumen;
await page.evaluate(`(() => { const s = window.__DH.store.getState(); for (let i=0;i<5;i++) s.hitObstacle('prueba'); })()`);
await page.waitForTimeout(450); // dentro del remate, antes de la pantalla final
const enMuerte = await estado();
check(
  enMuerte.volumen < volNormal * 0.6,
  `en el remate de muerte se aparta (volumen ${volNormal.toFixed(2)} → ${enMuerte.volumen.toFixed(2)})`,
);

// 5. silenciar calla de verdad, y se recuerda
await page.waitForTimeout(1200); // que termine el remate
await page.getByRole('button', { name: /silenciar la música/i }).click();
await page.waitForTimeout(400);
const c = (await estado()).notas;
await page.waitForTimeout(1500);
const d = (await estado()).notas;
check(d === c, `silenciada no agenda ni una nota más (${c} → ${d})`);

await page.reload({ waitUntil: 'networkidle' });
await page.waitForTimeout(800);
check((await estado()).silenciada === true, 'el silencio se recuerda al recargar');

await browser.close();

console.log('OK:\n - ' + ok.join('\n - '));
if (fallos.length) {
  console.error('\nFALLOS:\n - ' + fallos.join('\n - '));
  process.exit(1);
}
console.log('\nLa música suena, cambia con la terminal, aprieta y se calla cuando toca.');
