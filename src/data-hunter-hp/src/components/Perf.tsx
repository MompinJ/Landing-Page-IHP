import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useRef } from 'react';
import { PERF_PANEL, QUALITY } from '../render/quality';

/**
 * CONTADOR DE FPS — la versión de un vistazo, sin el resto del panel.
 *
 * Va SIEMPRE visible y se oculta con la tecla **F** (o con `?fps=off` en la URL,
 * que es lo que hay que poner en el kiosco del stand: delante de visitantes, un
 * número de depuración encima del juego sobra).
 *
 * Dos decisiones a propósito:
 *
 *  - Enseña la MEDIANA de los últimos frames, no la media. Un solo tirón de
 *    76 ms hunde la media y deja el contador parpadeando en rojo cuando el
 *    juego va fino; la mediana dice cómo va de verdad. El peor frame del último
 *    medio segundo se enseña aparte, en pequeño, que es donde SÍ se ve el tirón.
 *  - Se pinta por DOM directo, no por estado de React: un `setState` por frame
 *    mide más el contador que el juego.
 *
 * El color es el presupuesto de frame, no una escala bonita: verde si cumple
 * 120 fps (8.3 ms), ámbar si al menos cumple 60 (16.7 ms), rojo si no llega.
 */
export function FpsMeter() {
  const box = useRef<HTMLDivElement | null>(null);
  const muestras = useRef<number[]>([]);
  const ultimo = useRef(0);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const apagado = new URLSearchParams(window.location.search).get('fps') === 'off';
    const el = document.createElement('div');
    el.className = 'fps-meter';
    el.hidden = apagado;
    document.body.appendChild(el);
    box.current = el;

    // F para esconderlo/enseñarlo. Se ignora mientras se escribe el nombre en
    // la tabla final: ahí la F es una letra, no un atajo.
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== 'KeyF' || e.repeat) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
      el.hidden = !el.hidden;
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      el.remove();
      box.current = null;
    };
  }, []);

  useFrame(() => {
    const el = box.current;
    if (!el || el.hidden) return;

    const ahora = performance.now();
    if (ultimo.current) muestras.current.push(ahora - ultimo.current);
    ultimo.current = ahora;
    if (muestras.current.length < 12) return;

    const ms = muestras.current;
    const orden = [...ms].sort((a, b) => a - b);
    const mediana = orden[orden.length >> 1];
    const peor = orden[orden.length - 1];
    muestras.current = [];

    const fps = Math.round(1000 / mediana);
    // Umbrales con un pelo de holgura (115 y 57 en vez de 120 y 60): con vsync
    // a 120 Hz la mediana se queda clavada en 8.33 ms, justo en la frontera, y
    // el contador parpadeaba entre verde y ámbar sin que pasara nada.
    const clase = mediana <= 1000 / 115 ? 'fps-ok' : mediana <= 1000 / 57 ? 'fps-medio' : 'fps-mal';
    el.className = `fps-meter ${clase}`;
    el.innerHTML = `<b>${fps}</b> fps<span class="fps-peor">peor ${peor.toFixed(0)} ms</span>`;
  });

  return null;
}

/**
 * PANEL DE MEDICIÓN (`?perf`). Copiado de Terminal Rally, y sobre todo por una
 * línea: EL NOMBRE REAL DE LA GPU.
 *
 * Es lo primero que hay que mirar cuando alguien dice que el juego va lento en
 * su máquina. Si ahí pone **SwiftShader** o **llvmpipe**, el navegador no está
 * usando la tarjeta y lo está dibujando TODO por software — y entonces no hay
 * nivel gráfico que arregle nada, lo que hay que arreglar es la aceleración por
 * hardware del navegador. Sin este dato se pierden tardes enteras optimizando
 * una escena que ya estaba bien.
 *
 * Lo demás sirve para saber POR DÓNDE se va el frame:
 *  - mediana contra p95 y PEOR frame: si la mediana es buena y el peor se
 *    dispara, el problema son TIRONES (compilar un shader, montar una fila
 *    cara), no rendimiento sostenido — y se persiguen con
 *    `scripts/jank-test.ts`, que es como se encontraron los de 76 ms.
 *  - llamadas y triángulos: lo que cuesta la escena en sí.
 *
 * Aquí hubo un reparto «js contra dibujo» que se quitó porque MENTÍA: medido
 * entre el fin de un frame y el principio del siguiente, se tragaba la espera
 * de vsync y la apuntaba como trabajo de js (marcaba «js 8.4 ms · dibujo 0.0
 * ms» con la GPU parada). Separar CPU de GPU de verdad exige envolver el
 * render, y R3F solo lo permite tomando el control del bucle — demasiado precio
 * para un panel de diagnóstico.
 *
 * Se escribe por DOM directo y no por estado de React: a 60 fps, un
 * `setState` por frame mide más el panel que el juego.
 */
export function Perf() {
  const gl = useThree((s) => s.gl);
  const box = useRef<HTMLDivElement | null>(null);
  const acc = useRef({ t0: 0 });
  const muestras = useRef<number[]>([]);
  const ultimo = useRef(0);

  useEffect(() => {
    if (!PERF_PANEL) return;
    const el = document.createElement('div');
    el.className = 'perf-panel';
    document.body.appendChild(el);
    box.current = el;

    // Nombre real de la tarjeta. `WEBGL_debug_renderer_info` es la única vía;
    // algunos navegadores lo capan por privacidad, y entonces `RENDERER` a
    // secas devuelve un genérico ("WebKit WebGL") que no dice nada.
    const ctx = gl.getContext();
    const dbg = ctx.getExtension('WEBGL_debug_renderer_info');
    const gpu = dbg
      ? String(ctx.getParameter(dbg.UNMASKED_RENDERER_WEBGL))
      : String(ctx.getParameter(ctx.RENDERER));
    el.dataset.gpu = gpu;

    acc.current.t0 = performance.now();
    return () => {
      el.remove();
      box.current = null;
    };
  }, [gl]);

  useFrame(() => {
    if (!PERF_PANEL || !box.current) return;
    const now = performance.now();
    if (ultimo.current) muestras.current.push(now - ultimo.current);
    ultimo.current = now;

    const a = acc.current;
    if (now - a.t0 < 500 || muestras.current.length < 8) return;
    a.t0 = now;

    const orden = muestras.current.sort((x, y) => x - y);
    const mediana = orden[orden.length >> 1];
    const p95 = orden[Math.min(orden.length - 1, Math.floor(orden.length * 0.95))];
    const peor = orden[orden.length - 1];
    muestras.current = [];

    const info = gl.info;
    const el = box.current;
    const gpu = el.dataset.gpu ?? '?';
    const software = /swiftshader|llvmpipe|software/i.test(gpu);
    el.innerHTML =
      `<b>${(1000 / mediana).toFixed(0)} fps</b> · ${mediana.toFixed(1)} ms<br>` +
      `p95 ${p95.toFixed(1)} ms · peor ${peor.toFixed(1)} ms<br>` +
      `${info.render.calls} llamadas · ${(info.render.triangles / 1000).toFixed(0)}k tri<br>` +
      `${info.programs?.length ?? 0} programas · ${info.memory.textures} texturas<br>` +
      `nivel <b>${QUALITY.name}</b> · dpr ${gl.getPixelRatio().toFixed(2)}<br>` +
      `<span class="${software ? 'perf-bad' : 'perf-ok'}">${gpu}</span>` +
      (software ? '<br><span class="perf-bad">SIN ACELERACIÓN POR HARDWARE</span>' : '');
  });

  return null;
}
