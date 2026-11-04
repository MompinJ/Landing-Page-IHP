import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Maximize, LayoutGrid, Keyboard } from "lucide-react";
import { DelayCtx, MetaCtx, StaticCtx, easeInOut } from "./ui.jsx";
import { secciones } from "./data.js";
import * as A from "./slides/s1.jsx";
import * as B from "./slides/s2.jsx";
import * as C from "./slides/s3.jsx";

// sec: indice de seccion (null = sin capitulo); tr: transicion de entrada
const SLIDES = [
  { C: A.Portada, t: "Portada", sec: null, tr: "zoom" },
  { C: A.Agenda, t: "Agenda", sec: null, tr: "wipe" },
  { C: A.Contexto, t: "Contexto general", sec: 0, tr: "shutter" },
  { C: A.Arquitectura, t: "¿Qué integra nuestro ERP?", sec: 0, tr: "rise" },
  { C: A.Carta, t: "Carta de autorización", sec: 0, tr: "push" },
  { C: A.Olas, t: "Olas de puesta en marcha", sec: 0, tr: "wipe" },
  { C: A.Gantt, t: "Cronograma (Gantt)", sec: 0, tr: "split" },
  { C: B.Presupuesto, t: "Presupuesto final", sec: 1, tr: "push" },
  { C: B.Viabilidad, t: "Matriz de viabilidad", sec: 1, tr: "rise" },
  { C: B.Resultados, t: "Antes y después", sec: 2, tr: "shutter" },
  { C: B.RiesgoR1, t: "Riesgo 1 (R1)", sec: 2, tr: "diag" },
  { C: B.RiesgoR13, t: "Riesgo 2 (R13)", sec: 2, tr: "push" },
  { C: C.CierreAdminTec, t: "Cierre administrativo y técnico", sec: 3, tr: "split" },
  { C: C.Aprobacion, t: "Aprobación e informe final", sec: 3, tr: "wipe" },
  { C: B.Control, t: "Desviaciones bajo control", sec: 3, tr: "zoom" },
  { C: C.Lecciones, t: "Lecciones aprendidas", sec: 3, tr: "rise" },
  { C: C.Transferencia, t: "Transferencia de conocimiento", sec: 3, tr: "push" },
  { C: C.Valor, t: "Creación de valor", sec: 4, tr: "diag" },
  { C: C.ReflexionCompania, t: "Reflexión: como compañía", sec: 4, tr: "shutter" },
  { C: C.ReflexionEstudiantes, t: "Reflexión: como estudiantes", sec: 4, tr: "push" },
  { C: C.Compromisos, t: "Compromisos y resultados", sec: 4, tr: "split" },
  { C: C.Ahorro, t: "USD 79 M", sec: 4, tr: "zoom" },
  { C: C.Referencias, t: "Base de las cifras", sec: null, tr: "wipe" },
  { C: C.Gracias, t: "Misión cumplida", sec: null, tr: "shutter" },
  { C: C.Preguntas, t: "Anexo: preguntas probables", sec: null, tr: "rise" },
];
const N = SLIDES.length;

/* ------------------------------------------------------------ transiciones */
const D1 = 1.0;
const TR = {
  zoom: {
    enter: { opacity: 0, scale: 1.08, filter: "blur(14px)" },
    center: { opacity: 1, scale: 1, filter: "blur(0px)", transition: { duration: D1, ease: easeInOut } },
  },
  wipe: {
    enter: (d) => ({ clipPath: d > 0 ? "inset(0% 100% 0% 0%)" : "inset(0% 0% 0% 100%)" }),
    center: { clipPath: "inset(0% 0% 0% 0%)", transition: { duration: D1, ease: easeInOut } },
  },
  rise: {
    enter: (d) => ({ clipPath: d > 0 ? "inset(100% 0% 0% 0%)" : "inset(0% 0% 100% 0%)", y: d > 0 ? 80 : -80 }),
    center: { clipPath: "inset(0% 0% 0% 0%)", y: 0, transition: { duration: D1, ease: easeInOut } },
  },
  shutter: {
    enter: { opacity: 1 },
    center: { opacity: 1, transition: { duration: 1.1 } },
  },
  split: {
    enter: { clipPath: "inset(0% 50% 0% 50%)" },
    center: { clipPath: "inset(0% 0% 0% 0%)", transition: { duration: D1, ease: easeInOut } },
  },
  diag: {
    enter: (d) => ({
      clipPath: d > 0 ? "polygon(0% 0%, 0% 0%, -30% 100%, -30% 100%)" : "polygon(130% 0%, 130% 0%, 100% 100%, 100% 100%)",
    }),
    center: (d) => ({
      clipPath: d > 0 ? "polygon(0% 0%, 130% 0%, 100% 100%, -30% 100%)" : "polygon(130% 0%, 0% 0%, -30% 100%, 100% 100%)",
      transition: { duration: 1.1, ease: easeInOut },
    }),
  },
  push: {
    enter: (d) => ({ x: d > 0 ? 1920 : -1920 }),
    center: { x: 0, transition: { duration: D1, ease: easeInOut } },
    exit: (d) => ({ x: d > 0 ? -640 : 640, filter: "brightness(0.5)", transition: { duration: D1, ease: easeInOut } }),
  },
};
const defaultExit = { scale: 0.94, filter: "brightness(0.4)", transition: { duration: D1, ease: easeInOut } };

function variantsFor(tr) {
  const t = TR[tr] || TR.zoom;
  const wrap = (x, z) => (typeof x === "function" ? (d) => ({ ...x(d), zIndex: z }) : { ...x, zIndex: z });
  return {
    enter: wrap(t.enter, 2),
    center: wrap(t.center, 2),
    exit: (d) => ({ ...(typeof t.exit === "function" ? t.exit(d) : t.exit || defaultExit), zIndex: 1 }),
  };
}

// Persianas: franjas azules que se retraen y descubren la diapositiva nueva
function Shutter() {
  const n = 8;
  return (
    <div style={{ position: "absolute", inset: 0, display: "flex", pointerEvents: "none", zIndex: 5 }}>
      {Array.from({ length: n }).map((_, i) => (
        <motion.div
          key={i}
          style={{ flex: 1, background: i % 2 ? "var(--blue-80)" : "var(--blue-60)", transformOrigin: "top" }}
          initial={{ scaleY: 1 }}
          animate={{ scaleY: 0 }}
          transition={{ duration: 0.7, ease: easeInOut, delay: 0.15 + i * 0.05 }}
        />
      ))}
    </div>
  );
}

/* ------------------------------------------------------------ util */
const readHash = () => {
  const n = parseInt((window.location.hash || "").replace(/\D/g, ""), 10);
  return Number.isFinite(n) && n >= 1 && n <= N ? n - 1 : 0;
};
const metaFor = (i) => ({
  index: i,
  total: N,
  sectionNum: SLIDES[i].sec != null ? secciones[SLIDES[i].sec].num : "",
});

function useScale() {
  const [s, setS] = useState({ k: 1, x: 0, y: 0 });
  useLayoutEffect(() => {
    const f = () => {
      const k = Math.min(window.innerWidth / 1920, window.innerHeight / 1080);
      setS({ k, x: (window.innerWidth - 1920 * k) / 2, y: (window.innerHeight - 1080 * k) / 2 });
    };
    f();
    window.addEventListener("resize", f);
    return () => window.removeEventListener("resize", f);
  }, []);
  return s;
}

/* ------------------------------------------------------------ tarjeta de capitulo */
function Chapter({ sec, onDone }) {
  const s = secciones[sec];
  return (
    <motion.div className="chapter" initial={{ x: "-100%" }} animate={{ x: ["-100%", "0%", "0%", "100%"] }} transition={{ duration: 1.9, times: [0, 0.28, 0.66, 1], ease: easeInOut }} onAnimationComplete={onDone}>
      <div className="panel" />
      <div className="edge" style={{ right: -40 }} />
      <motion.div className="content" initial={{ opacity: 0, x: -60 }} animate={{ opacity: [0, 1, 1, 0], x: [-60, 0, 0, 40] }} transition={{ duration: 1.9, times: [0.18, 0.34, 0.6, 0.7] }}>
        <div className="cnum">{s.num}</div>
        <div className="cname">{s.name}</div>
        <div className="csub">{s.sub}</div>
      </motion.div>
    </motion.div>
  );
}

/* ------------------------------------------------------------ app */
export default function App() {
  const [idx, setIdx] = useState(readHash);
  const [dir, setDir] = useState(1);
  const [chapter, setChapter] = useState(null); // { key, sec }
  const [delay, setDelay] = useState(0);
  const [overview, setOverview] = useState(false);
  const [help, setHelp] = useState(false);
  const [chapters, setChapters] = useState(true);
  const [black, setBlack] = useState(false);
  const [idle, setIdle] = useState(false);
  const scale = useScale();
  const idxRef = useRef(idx);
  idxRef.current = idx;

  const go = useCallback(
    (to) => {
      const from = idxRef.current;
      const n = Math.max(0, Math.min(N - 1, to));
      if (n === from) return;
      const d = n > from ? 1 : -1;
      const sec = SLIDES[n].sec;
      const newSection = d > 0 && sec != null && sec !== SLIDES[from].sec && n === from + 1;
      if (chapters && newSection) {
        setChapter({ key: Date.now(), sec });
        setDelay(1.05);
      } else {
        setChapter(null);
        setDelay(0);
      }
      setDir(d);
      setIdx(n);
      window.history.replaceState(null, "", `#${n + 1}`);
    },
    [chapters]
  );
  const next = useCallback(() => go(idxRef.current + 1), [go]);
  const prev = useCallback(() => go(idxRef.current - 1), [go]);

  const fullscreen = () => {
    if (document.fullscreenElement) document.exitFullscreen();
    else document.documentElement.requestFullscreen?.();
  };

  useEffect(() => {
    const onKey = (e) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const k = e.key;
      if (overview) {
        if (k === "Escape" || k === "o" || k === "O") setOverview(false);
        return;
      }
      if (black && k !== "b" && k !== "B" && k !== ".") {
        setBlack(false);
        return;
      }
      if (["ArrowRight", "ArrowDown", "PageDown", " ", "Enter", "n", "N"].includes(k)) {
        e.preventDefault();
        next();
      } else if (["ArrowLeft", "ArrowUp", "PageUp", "Backspace", "p", "P"].includes(k)) {
        e.preventDefault();
        prev();
      } else if (k === "Home") go(0);
      else if (k === "End") go(N - 1);
      else if (k === "f" || k === "F") fullscreen();
      else if (k === "o" || k === "O" || k === "Escape") setOverview((o) => !o);
      else if (k === "h" || k === "H" || k === "?") setHelp((h) => !h);
      else if (k === "c" || k === "C") setChapters((c) => !c);
      else if (k === "b" || k === "B" || k === ".") setBlack((b) => !b);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [next, prev, go, overview, black]);

  // saltar a una diapositiva escribiendo #n en la URL
  useEffect(() => {
    const onHash = () => go(readHash());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, [go]);

  // ocultar controles con el mouse quieto
  useEffect(() => {
    let t;
    const wake = () => {
      setIdle(false);
      clearTimeout(t);
      t = setTimeout(() => setIdle(true), 2200);
    };
    wake();
    window.addEventListener("mousemove", wake);
    return () => {
      window.removeEventListener("mousemove", wake);
      clearTimeout(t);
    };
  }, []);

  // gestos tactiles
  const touch = useRef(null);
  const onPointerDown = (e) => (touch.current = { x: e.clientX, y: e.clientY, t: Date.now() });
  const onPointerUp = (e) => {
    const s = touch.current;
    touch.current = null;
    if (!s || e.target.closest(".chrome")) return;
    const dx = e.clientX - s.x;
    if (Math.abs(dx) > 60) return dx < 0 ? next() : prev();
    if (e.pointerType === "mouse" && e.button === 0 && Math.abs(dx) < 6) next();
  };

  const cur = SLIDES[idx];
  const Cur = cur.C;
  const sectionOf = (i) => SLIDES[i].sec;

  return (
    <div className="viewport" onPointerDown={onPointerDown} onPointerUp={onPointerUp} onContextMenu={(e) => { e.preventDefault(); prev(); }} style={{ cursor: idle ? "none" : "default" }}>
      <div className="stage" style={{ transform: `translate(${scale.x}px, ${scale.y}px) scale(${scale.k})`, background: "var(--navy-950)" }}>
        <AnimatePresence initial={false} custom={dir}>
          <motion.div key={idx} className="slide-layer" custom={dir} variants={variantsFor(cur.tr)} initial="enter" animate="center" exit="exit">
            <MetaCtx.Provider value={metaFor(idx)}>
              <DelayCtx.Provider value={delay}>
                <Cur />
              </DelayCtx.Provider>
              {cur.tr === "shutter" && <Shutter />}
            </MetaCtx.Provider>
          </motion.div>
        </AnimatePresence>
        <AnimatePresence>{chapter && <Chapter key={chapter.key} sec={chapter.sec} onDone={() => setChapter(null)} />}</AnimatePresence>
        <AnimatePresence>
          {black && <motion.div key="black" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ position: "absolute", inset: 0, background: "#000", zIndex: 45 }} />}
        </AnimatePresence>
      </div>

      {/* progreso por diapositiva */}
      <div className="progress">
        {SLIDES.map((s, i) => (
          <div key={i} className="seg" style={{ marginRight: i < N - 1 && sectionOf(i) !== sectionOf(i + 1) ? 6 : 0 }}>
            <motion.i initial={false} animate={{ scaleX: i <= idx ? 1 : 0 }} transition={{ duration: 0.5, ease: easeInOut }} />
          </div>
        ))}
      </div>

      <div className={`chrome ${idle && !help ? "hidden" : ""}`}>
        <div className="counter">
          {String(idx + 1).padStart(2, "0")} <span>/ {N}</span> &nbsp; {cur.t}
        </div>
        <div className="spacer" />
        <button title="Atajos (H)" onClick={() => setHelp((h) => !h)}>
          <Keyboard size={18} />
        </button>
        <button title="Vista general (O)" onClick={() => setOverview(true)}>
          <LayoutGrid size={18} />
        </button>
        <button title="Pantalla completa (F)" onClick={fullscreen}>
          <Maximize size={18} />
        </button>
        <button title="Anterior" onClick={prev}>
          <ChevronLeft size={20} />
        </button>
        <button title="Siguiente" onClick={next}>
          <ChevronRight size={20} />
        </button>
      </div>

      {help && (
        <div className="help" onPointerUp={(e) => e.stopPropagation()}>
          <div><kbd>→</kbd><kbd>Espacio</kbd>Siguiente (también clic o control remoto)</div>
          <div><kbd>←</kbd>Anterior (también clic derecho)</div>
          <div><kbd>F</kbd>Pantalla completa</div>
          <div><kbd>O</kbd>Vista general de diapositivas</div>
          <div><kbd>B</kbd>Pantalla negra</div>
          <div><kbd>C</kbd>Tarjetas de capítulo: {chapters ? "activadas" : "desactivadas"}</div>
          <div><kbd>Inicio</kbd><kbd>Fin</kbd>Primera / última</div>
        </div>
      )}

      {overview && <Overview idx={idx} onPick={(i) => { setOverview(false); go(i); }} onClose={() => setOverview(false)} />}
    </div>
  );
}

/* ------------------------------------------------------------ vista general */
function Overview({ idx, onPick, onClose }) {
  const ref = useRef(null);
  const [w, setW] = useState(300);
  useLayoutEffect(() => {
    const el = ref.current?.querySelector(".thumb");
    if (el) setW(el.clientWidth);
  }, []);
  const k = w / 1920;
  return (
    <div className="overview" ref={ref} onPointerUp={(e) => { e.stopPropagation(); if (e.target === e.currentTarget) onClose(); }}>
      <h2>
        Vista general <span>Clic para ir · O o Esc para cerrar</span>
      </h2>
      <div className="overview-grid">
        {SLIDES.map((s, i) => (
          <div key={i} className={`thumb ${i === idx ? "active" : ""}`} style={{ height: w * (1080 / 1920) }} onClick={() => onPick(i)}>
            <div className="thumb-inner" style={{ transform: `scale(${k})` }}>
              <StaticCtx.Provider value={true}>
                <MetaCtx.Provider value={metaFor(i)}>
                  <s.C />
                </MetaCtx.Provider>
              </StaticCtx.Provider>
            </div>
            <div className="tlabel">
              {i + 1}. {s.t}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
