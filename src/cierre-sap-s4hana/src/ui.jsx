import { createContext, useContext, useEffect, useRef } from "react";
import { motion, animate } from "framer-motion";

// Retraso extra de entrada (cuando hay tarjeta de capitulo) y modo estatico (miniaturas).
export const DelayCtx = createContext(0);
export const StaticCtx = createContext(false);
export const MetaCtx = createContext({ index: 0, total: 1 });

// Curvas de movimiento de Carbon (expressive)
export const ease = [0, 0, 0.3, 1]; // entrada
export const easeInOut = [0.4, 0.14, 0.3, 1]; // estandar

export const v = {
  up: { hidden: { opacity: 0, y: 32 }, show: { opacity: 1, y: 0, transition: { duration: 0.7, ease } } },
  down: { hidden: { opacity: 0, y: -24 }, show: { opacity: 1, y: 0, transition: { duration: 0.7, ease } } },
  left: { hidden: { opacity: 0, x: -48 }, show: { opacity: 1, x: 0, transition: { duration: 0.7, ease } } },
  right: { hidden: { opacity: 0, x: 48 }, show: { opacity: 1, x: 0, transition: { duration: 0.7, ease } } },
  fade: { hidden: { opacity: 0 }, show: { opacity: 1, transition: { duration: 0.8, ease } } },
  pop: { hidden: { opacity: 0, scale: 0.92 }, show: { opacity: 1, scale: 1, transition: { duration: 0.6, ease } } },
  blur: { hidden: { opacity: 0, filter: "blur(12px)" }, show: { opacity: 1, filter: "blur(0px)", transition: { duration: 0.8, ease } } },
  mask: { hidden: { clipPath: "inset(0% 100% 0% 0%)" }, show: { clipPath: "inset(0% 0% 0% 0%)", transition: { duration: 0.9, ease: easeInOut } } },
  maskUp: { hidden: { clipPath: "inset(100% 0% 0% 0%)" }, show: { clipPath: "inset(0% 0% 0% 0%)", transition: { duration: 0.8, ease: easeInOut } } },
  rise: { hidden: { y: "105%" }, show: { y: "0%", transition: { duration: 0.8, ease } } },
};

export const at = (delay = 0, kind = "up") => {
  const base = v[kind];
  return { hidden: base.hidden, show: { ...base.show, transition: { ...base.show.transition, delay } } };
};

export function Item({ as = "div", variants = v.up, children, ...p }) {
  const C = motion[as];
  return (
    <C variants={variants} {...p}>
      {children}
    </C>
  );
}

export function Group({ as = "div", stagger = 0.09, delay = 0, children, ...p }) {
  const C = motion[as];
  return (
    <C variants={{ hidden: {}, show: { transition: { staggerChildren: stagger, delayChildren: delay } } }} {...p}>
      {children}
    </C>
  );
}

export function SplitText({ text, style, stagger = 0.045, delay = 0 }) {
  const words = text.split(" ");
  return (
    <motion.span style={{ display: "block", ...style }} variants={{ hidden: {}, show: { transition: { staggerChildren: stagger, delayChildren: delay } } }}>
      {words.map((w, i) => (
        <span key={i} style={{ display: "inline-block", overflow: "hidden", verticalAlign: "top", paddingBottom: "0.1em", marginBottom: "-0.1em" }}>
          <motion.span style={{ display: "inline-block" }} variants={v.rise}>
            {w}
            {i < words.length - 1 ? " " : ""}
          </motion.span>
        </span>
      ))}
    </motion.span>
  );
}

const fmt = (n, d) => n.toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d });

export function Counter({ to, from = 0, decimals = 0, prefix = "", suffix = "", duration = 1.6, delay = 0.35 }) {
  const base = useContext(DelayCtx);
  const isStatic = useContext(StaticCtx);
  const ref = useRef(null);
  useEffect(() => {
    if (isStatic || !ref.current) return;
    const c = animate(from, to, {
      duration,
      delay: base + delay,
      ease: [0, 0, 0.3, 1],
      onUpdate: (x) => {
        if (ref.current) ref.current.textContent = prefix + fmt(x, decimals) + suffix;
      },
    });
    return () => c.stop();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return <span ref={ref}>{prefix + fmt(isStatic ? to : from, decimals) + suffix}</span>;
}

export function Bar({ pct, color = "var(--blue-60)", height = 16, delay = 0, vertical = false, style }) {
  const size = vertical ? { height: `${pct}%`, width: "100%" } : { width: `${pct}%`, height };
  return (
    <motion.div
      style={{ ...size, background: color, transformOrigin: vertical ? "bottom" : "left", ...style }}
      variants={{
        hidden: vertical ? { scaleY: 0 } : { scaleX: 0 },
        show: vertical ? { scaleY: 1, transition: { duration: 1, ease: easeInOut, delay } } : { scaleX: 1, transition: { duration: 1, ease: easeInOut, delay } },
      }}
    />
  );
}

export function Draw({ d, stroke = "var(--blue-60)", width = 2, delay = 0, duration = 1.1, dash, ...p }) {
  return (
    <motion.path
      d={d}
      fill="none"
      stroke={stroke}
      strokeWidth={width}
      strokeLinecap="butt"
      strokeLinejoin="miter"
      strokeDasharray={dash}
      variants={{
        hidden: { pathLength: 0, opacity: 0 },
        show: { pathLength: 1, opacity: 1, transition: { pathLength: { duration, ease: easeInOut, delay }, opacity: { duration: 0.01, delay } } },
      }}
      {...p}
    />
  );
}

// Medidor cuadrado: el relleno sube desde abajo
export function Meter({ pct, size = 260, color = "var(--blue-60)", track = "var(--blue-10)", delay = 0, children }) {
  return (
    <div style={{ position: "relative", width: size, height: size, background: track, overflow: "hidden" }}>
      <motion.div
        style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: `${pct}%`, background: color, transformOrigin: "bottom" }}
        variants={{ hidden: { scaleY: 0 }, show: { scaleY: 1, transition: { duration: 1.6, ease: easeInOut, delay } } }}
      />
      <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", textAlign: "center", color: "#fff", mixBlendMode: "normal" }}>{children}</div>
    </div>
  );
}

export function CheckBox({ size = 32, color = "var(--blue-60)", delay = 0 }) {
  return (
    <motion.svg width={size} height={size} viewBox="0 0 32 32" style={{ flex: "none" }} variants={v.pop}>
      <rect width="32" height="32" fill={color} />
      <motion.path
        d="M9 16.5l4.5 4.5L23.5 11"
        fill="none"
        stroke="#fff"
        strokeWidth="3"
        strokeLinecap="square"
        variants={{ hidden: { pathLength: 0 }, show: { pathLength: 1, transition: { duration: 0.45, delay: delay + 0.2, ease } } }}
      />
    </motion.svg>
  );
}

export function Slide({ dark, kicker, title, subtitle, children, className = "", grid = true, footer = true, style, titleWidth }) {
  const delay = useContext(DelayCtx);
  const isStatic = useContext(StaticCtx);
  const meta = useContext(MetaCtx);
  return (
    <motion.div
      className={`slide ${dark ? "dark" : ""} ${className}`}
      style={style}
      initial={isStatic ? false : "hidden"}
      animate="show"
      variants={{ hidden: {}, show: { transition: { delayChildren: delay + 0.2, staggerChildren: 0.1 } } }}
    >
      {grid && <div className="grid-bg" />}
      {kicker && (
        <Item className="kicker" variants={v.left}>
          {meta.sectionNum && <span className="num">{meta.sectionNum}</span>}
          <span>{kicker}</span>
        </Item>
      )}
      {title && (
        <h1 className="title" style={{ maxWidth: titleWidth }}>
          <SplitText text={title} />
        </h1>
      )}
      {title && <motion.div className="title-bar" variants={{ hidden: { scaleX: 0 }, show: { scaleX: 1, transition: { duration: 0.7, ease: easeInOut } } }} />}
      {subtitle && (
        <Item className="subtitle" variants={v.fade}>
          {subtitle}
        </Item>
      )}
      {children}
      {footer && (
        <div className="slide-footer">
          <div className="brand">
            <span className="sq" />
            Meridian Motors Group · SAP S/4HANA · Cierre del proyecto
          </div>
          <div>
            {String(meta.index + 1).padStart(2, "0")} / {String(meta.total).padStart(2, "0")}
          </div>
        </div>
      )}
    </motion.div>
  );
}

export function Icon({ icon: I, color = "var(--blue-60)", bg = "var(--blue-10)", size = 60, iconSize = 28 }) {
  return (
    <div style={{ width: size, height: size, background: bg, display: "grid", placeItems: "center", flex: "none" }}>
      <I size={iconSize} color={color} strokeWidth={1.75} strokeLinecap="square" strokeLinejoin="miter" />
    </div>
  );
}
