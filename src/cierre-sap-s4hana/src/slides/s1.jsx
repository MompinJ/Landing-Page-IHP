import { motion } from "framer-motion";
import { Users, Globe, MapPin, CalendarDays, Flag, Rocket, CalendarCheck } from "lucide-react";
import { Slide, Item, Group, Counter, Draw, v, at, ease, easeInOut, SplitText } from "../ui.jsx";
import * as D from "../data.js";
import portada from "../assets/portada.jpg";

/* ================================================================ Portada */
export function Portada() {
  return (
    <Slide dark footer={false} grid={false} style={{ padding: 0 }}>
      <motion.div
        style={{ position: "absolute", top: 0, right: 0, bottom: 0, width: 860, overflow: "hidden" }}
        variants={{ hidden: { clipPath: "inset(0% 0% 0% 100%)" }, show: { clipPath: "inset(0% 0% 0% 0%)", transition: { duration: 1.2, ease: easeInOut } } }}
      >
        <motion.img
          src={portada}
          alt=""
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
          variants={{ hidden: { scale: 1.2 }, show: { scale: 1.02, transition: { duration: 9, ease: "easeOut" } } }}
        />
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(90deg, rgba(0,17,65,.55) 0%, rgba(0,17,65,0) 40%)" }} />
      </motion.div>
      <motion.div
        style={{ position: "absolute", left: 1044, top: 0, width: 16, height: 1080, background: "var(--blue-60)", transformOrigin: "top" }}
        variants={{ hidden: { scaleY: 0 }, show: { scaleY: 1, transition: { duration: 1, ease: easeInOut, delay: 0.6 } } }}
      />

      <div style={{ position: "absolute", left: 120, top: 120, width: 880 }}>
        <Item variants={v.left} style={{ display: "flex", gap: 2 }}>
          <span className="tag blue">MMG</span>
          <span className="tag ghost">Proyecto ERP · Unidad 5</span>
        </Item>
        <h1 style={{ font: "300 80px/1.08 var(--sans)", letterSpacing: "-.02em", marginTop: 64 }}>
          <SplitText text="Implementación de" />
          <SplitText text="SAP S/4HANA" style={{ fontWeight: 600, color: "var(--blue-40)" }} />
          <SplitText text="en Meridian Motors Group" />
        </h1>
        <Item variants={v.fade} style={{ font: "300 28px/1.4 var(--sans)", color: "var(--blue-20)", marginTop: 36, maxWidth: 700 }}>
          Resumen general, resultados, lecciones aprendidas y reflexión final
        </Item>
      </div>

      <Group stagger={0.08} delay={0.6} style={{ position: "absolute", left: 120, bottom: 190, display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px 40px", width: 820 }}>
        {D.equipo.map((n) => (
          <Item key={n} variants={v.up} style={{ display: "flex", alignItems: "center", gap: 14, font: "400 20px/1.3 var(--sans)", color: "#fff" }}>
            <span style={{ width: 8, height: 8, background: "var(--blue-40)" }} />
            {n}
          </Item>
        ))}
      </Group>
      <Item variants={v.fade} style={{ position: "absolute", left: 120, bottom: 90, font: "400 17px/1.7 var(--mono)", color: "var(--blue-30)" }}>
        {D.materia}
        <br />
        {D.uni}
      </Item>
    </Slide>
  );
}

/* ================================================================ Agenda */
export function Agenda() {
  return (
    <Slide title="Agenda" subtitle="Del acta de autorización al cierre formal">
      <Group stagger={0.1} delay={0.3} style={{ position: "absolute", left: 120, right: 120, top: 350, display: "flex", flexDirection: "column", gap: 2 }}>
        {D.secciones.map((s, i) => (
          <Item key={s.num} variants={v.left} className="tile" style={{ display: "flex", alignItems: "stretch", height: 108 }}>
            <div style={{ width: 150, background: i === 0 ? "var(--blue-60)" : "var(--blue-90)", color: "#fff", display: "flex", alignItems: "center", paddingLeft: 30, font: "300 52px/1 var(--sans)" }}>{s.num}</div>
            <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 40px" }}>
              <div style={{ font: "400 34px/1 var(--sans)" }}>{s.name}</div>
              <div style={{ font: "400 19px/1 var(--mono)", color: "var(--gray-60)" }}>{s.sub}</div>
            </div>
          </Item>
        ))}
      </Group>
    </Slide>
  );
}

/* ================================================================ Contexto */
const ctxIcons = [Users, Globe, MapPin, CalendarDays];

export function Contexto() {
  const W = 1100;
  const cx = [175, 550, 925];
  const chip = 204;
  const gap = 20;
  return (
    <Slide kicker="Contexto general" title="Una sola plataforma global" subtitle={<>20 localidades en 3 continentes con <b>un solo sistema y una sola forma de trabajar</b></>}>
      <Group stagger={0.1} delay={0.3} style={{ position: "absolute", left: 120, top: 370, width: 480, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2 }}>
        {D.contexto.map((c, i) => {
          const I = ctxIcons[i];
          return (
            <Item key={c.label} variants={v.up} className="tile" style={{ padding: "26px 26px", height: 280 }}>
              <I size={28} color="var(--blue-60)" strokeWidth={1.75} />
              <div style={{ font: "300 64px/1 var(--sans)", letterSpacing: "-.02em", marginTop: 44 }}>
                <Counter to={c.to} suffix={c.suffix || ""} delay={0.5 + i * 0.1} />
              </div>
              <div style={{ font: "600 20px/1.2 var(--sans)", marginTop: 10 }}>{c.label}</div>
              <div style={{ font: "400 16px/1.3 var(--sans)", color: "var(--gray-60)", marginTop: 4 }}>{c.note}</div>
            </Item>
          );
        })}
      </Group>

      <Group stagger={0} style={{ position: "absolute", left: 700, top: 370, width: W, height: 520 }}>
        <svg width={W} height={520} style={{ position: "absolute", inset: 0 }}>
          {cx.map((x, i) => (
            <Draw key={i} d={`M550 90 V120 H${x} V150`} stroke="var(--gray-50)" width={2} delay={0.7 + i * 0.1} duration={0.6} />
          ))}
          {cx.map((x, i) => (
            <Draw key={"b" + i} d={`M${x} 270 V310`} stroke="var(--gray-50)" width={2} delay={1.3} duration={0.4} />
          ))}
          {D.modulos.map((_, i) => (
            <Draw key={"m" + i} d={`M${i * (chip + gap) + chip / 2} 386 V420`} stroke="var(--gray-50)" width={2} delay={1.7 + i * 0.05} duration={0.35} />
          ))}
        </svg>
        <Item variants={v.down} style={{ position: "absolute", left: 300, top: 0, width: 500, height: 90, background: "var(--blue-100)", color: "#fff", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center" }}>
          <div style={{ font: "600 26px/1 var(--sans)" }}>Meridian Motors Group</div>
          <div style={{ font: "400 15px/1 var(--mono)", color: "var(--blue-30)", marginTop: 10 }}>10,000+ usuarios · 3 continentes · 20 localidades</div>
        </Item>
        {D.olasCtx.map((o, i) => (
          <motion.div
            key={o.name}
            variants={at(0.9 + i * 0.12)}
            style={{ position: "absolute", left: cx[i] - 175, top: 150, width: 350, height: 120, background: ["var(--blue-60)", "var(--blue-70)", "var(--blue-80)"][i], color: "#fff", padding: "18px 22px" }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", font: "400 15px/1 var(--mono)", color: "var(--blue-20)" }}>
              <span>{o.ola}</span>
              <span>{o.date}</span>
            </div>
            <div style={{ font: "600 28px/1 var(--sans)", marginTop: 16 }}>{o.name}</div>
            <div style={{ font: "400 17px/1 var(--sans)", marginTop: 10, color: "var(--blue-10)" }}>{o.detail}</div>
          </motion.div>
        ))}
        <motion.div
          variants={{ hidden: { opacity: 0, scaleX: 0.5 }, show: { opacity: 1, scaleX: 1, transition: { duration: 0.7, ease: easeInOut, delay: 1.4 } } }}
          style={{ position: "absolute", left: 0, top: 310, width: W, height: 76, background: "var(--blue-100)", color: "#fff", display: "grid", placeItems: "center", font: "400 24px/1 var(--sans)" }}
        >
          <span>
            <b style={{ fontWeight: 600 }}>SAP S/4HANA for Automotive</b> · una plantilla y datos únicos
          </span>
        </motion.div>
        {D.modulos.map(([m, d], i) => (
          <motion.div
            key={m}
            variants={at(1.8 + i * 0.06)}
            className="tile"
            style={{ position: "absolute", left: i * (chip + gap), top: 420, width: chip, height: 96, padding: "18px 14px", textAlign: "center", borderTop: "4px solid var(--blue-60)" }}
          >
            <div style={{ font: "600 22px/1 var(--sans)", color: "var(--blue-80)" }}>{m}</div>
            <div style={{ font: "400 16px/1.2 var(--sans)", color: "var(--gray-60)", marginTop: 8 }}>{d}</div>
          </motion.div>
        ))}
      </Group>
      <Group stagger={0.08} delay={2.2} style={{ position: "absolute", left: 700, top: 908, width: W, display: "flex", gap: 20 }}>
        {D.bases.map((b) => (
          <Item key={b} variants={v.fade} style={{ flex: 1, height: 44, border: "1px dashed var(--gray-50)", display: "grid", placeItems: "center", font: "400 16px/1 var(--mono)", color: "var(--gray-70)" }}>
            {b}
          </Item>
        ))}
      </Group>
    </Slide>
  );
}

/* ================================================================ Arquitectura */
const capaStyle = {
  Usuarios: { bg: "var(--blue-100)", color: "#fff", sub: "var(--blue-30)" },
  Módulos: { bg: "var(--blue-60)", color: "#fff", sub: "var(--blue-20)" },
  Conexiones: { bg: "var(--white)", color: "var(--ink)", sub: "var(--gray-60)" },
  Ambientes: { bg: "var(--blue-80)", color: "#fff", sub: "var(--blue-30)" },
  Base: { bg: "var(--blue-20)", color: "var(--blue-90)", sub: "var(--blue-70)" },
};

export function Arquitectura() {
  const n = D.arquitectura.length;
  return (
    <Slide kicker="Contexto general" title="¿Qué integra nuestro ERP?" subtitle="Cinco capas, de los usuarios a la infraestructura">
      <Group stagger={0} style={{ position: "absolute", left: 120, right: 120, top: 350, display: "flex", flexDirection: "column", gap: 14 }}>
        {D.arquitectura.map((c, k) => {
          const s = capaStyle[c.capa];
          return (
            <motion.div
              key={c.capa}
              variants={{ hidden: { opacity: 0, y: 40 }, show: { opacity: 1, y: 0, transition: { duration: 0.6, ease, delay: 0.4 + (n - 1 - k) * 0.35 } } }}
              style={{ display: "flex", alignItems: "stretch", gap: 2 }}
            >
              <div style={{ width: 210, flex: "none", display: "flex", alignItems: "center", font: "400 17px/1 var(--mono)", color: "var(--gray-60)", textTransform: "uppercase" }}>
                <span style={{ color: "var(--blue-60)", marginRight: 14 }}>{String(k + 1).padStart(2, "0")}</span>
                {c.capa}
              </div>
              <div style={{ flex: 1, display: "flex", gap: 2 }}>
                {c.items.map(([t, d]) => (
                  <div key={t} style={{ flex: 1, height: 100, background: s.bg, color: s.color, padding: "0 24px", display: "flex", flexDirection: "column", justifyContent: "center" }}>
                    <div style={{ font: "600 23px/1.15 var(--sans)" }}>{t}</div>
                    {d && <div style={{ font: "400 16px/1.3 var(--sans)", color: s.sub, marginTop: 6 }}>{d}</div>}
                  </div>
                ))}
              </div>
            </motion.div>
          );
        })}
      </Group>
    </Slide>
  );
}

/* ================================================================ Carta de autorizacion */
export function Carta() {
  const C = D.carta;
  const total = 39.7;
  return (
    <Slide kicker="Inicio formal" title="Carta de autorización del proyecto" subtitle={<>Da inicio formal al proyecto y autoridad al director · <b>{C.fecha}</b></>}>
      <motion.div
        className="tile"
        variants={{ hidden: { opacity: 0, y: 50 }, show: { opacity: 1, y: 0, transition: { duration: 0.8, ease } } }}
        style={{ position: "absolute", left: 120, top: 360, width: 1040, height: 590, padding: "44px 54px", borderLeft: "8px solid var(--blue-60)" }}
      >
        <div style={{ display: "grid", gridTemplateColumns: "1.15fr 1fr", gap: 56 }}>
          <Group stagger={0.1} delay={0.5}>
            <div className="label" style={{ marginBottom: 26 }}>Qué se autorizó</div>
            {C.que.map(([k, d]) => (
              <Item key={k} variants={v.up} style={{ marginBottom: 26 }}>
                <div style={{ font: "600 24px/1 var(--sans)", color: "var(--blue-70)" }}>{k}</div>
                <div style={{ font: "400 21px/1.4 var(--sans)", color: "var(--gray-80)", marginTop: 8 }}>{d}</div>
              </Item>
            ))}
          </Group>
          <Group stagger={0.1} delay={0.8}>
            <div className="label" style={{ marginBottom: 26 }}>Quién</div>
            {C.quien.map(([k, d]) => (
              <Item key={k} variants={v.up} style={{ marginBottom: 26 }}>
                <div style={{ font: "600 22px/1 var(--sans)" }}>{k}</div>
                <div style={{ font: "400 20px/1.4 var(--sans)", color: "var(--gray-80)", marginTop: 8 }}>{d}</div>
              </Item>
            ))}
          </Group>
        </div>
        <div style={{ position: "absolute", right: 54, bottom: 36, width: 380, textAlign: "center" }}>
          <svg width="380" height="70" viewBox="0 0 380 70">
            <Draw d="M40 50 C 60 10, 80 10, 85 40 S 110 60, 120 30 C 128 8, 140 52, 160 38 C 180 24, 190 44, 210 36 C 230 28, 240 18, 262 40 C 280 58, 300 30, 340 28" stroke="var(--blue-90)" width={2.5} delay={1.6} duration={1.5} />
          </svg>
          <div style={{ borderTop: "1px solid var(--gray-50)", paddingTop: 8, font: "400 15px/1 var(--mono)", color: "var(--gray-60)" }}>Patrocinador · Dirección General</div>
        </div>
      </motion.div>

      <Group stagger={0.12} delay={0.6} style={{ position: "absolute", left: 1180, right: 120, top: 360, display: "flex", flexDirection: "column", gap: 2 }}>
        <Item variants={v.right} style={{ padding: "36px 40px", background: "var(--blue-100)", color: "#fff" }}>
          <div className="label" style={{ color: "var(--blue-30)" }}>Presupuesto autorizado</div>
          <div style={{ font: "300 96px/1 var(--sans)", letterSpacing: "-.03em", marginTop: 18 }}>
            <Counter to={total} decimals={1} delay={0.8} />
            <span style={{ font: "400 34px/1 var(--sans)", color: "var(--blue-30)", marginLeft: 14 }}>M USD</span>
          </div>
          <div style={{ display: "flex", height: 20, marginTop: 30, gap: 2 }}>
            {C.presupuesto.map(([k, n, c], i) => (
              <motion.div key={k} style={{ width: `${(n / total) * 100}%`, background: c, transformOrigin: "left" }} variants={{ hidden: { scaleX: 0 }, show: { scaleX: 1, transition: { duration: 0.7, ease: easeInOut, delay: 1.0 + i * 0.3 } } }} />
            ))}
          </div>
        </Item>
        {C.presupuesto.map(([k, n, c]) => (
          <Item key={k} variants={v.right} className="tile" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "26px 40px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 16, font: "400 22px/1 var(--sans)" }}>
              <span style={{ width: 16, height: 16, background: c }} />
              {k}
            </div>
            <div style={{ font: "300 38px/1 var(--sans)" }}>{n.toFixed(1)}</div>
          </Item>
        ))}
      </Group>
    </Slide>
  );
}

/* ================================================================ Olas */
const MESES = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
const faseColor = ["var(--gray-20)", "var(--blue-10)", "var(--blue-20)", "var(--blue-30)"];

export function Olas() {
  const L = 340;
  const W = 1340;
  const x = (d) => (d / 365) * W;
  return (
    <Slide kicker="Implementación" title="Olas de puesta en marcha" subtitle="Una región a la vez, empezando con un piloto en Guatemala">
      <Group stagger={0} style={{ position: "absolute", left: 120, top: 350, width: L + W, height: 600 }}>
        <div style={{ position: "absolute", left: L, top: 0, width: W, height: 44 }}>
          {D.fases.map(([n, a, b], i) => (
            <motion.div
              key={n}
              variants={{ hidden: { opacity: 0, scaleX: 0 }, show: { opacity: 1, scaleX: 1, transition: { duration: 0.6, ease: easeInOut, delay: 0.4 + i * 0.15 } } }}
              style={{ position: "absolute", left: x(a), width: x(b) - x(a) - 2, top: 0, height: 44, background: faseColor[i], transformOrigin: "left", display: "flex", alignItems: "center", paddingLeft: 12, font: "400 15px/1 var(--mono)", color: i === 3 ? "var(--blue-90)" : "var(--gray-80)", overflow: "hidden", whiteSpace: "nowrap" }}
            >
              {n}
            </motion.div>
          ))}
        </div>
        <div style={{ position: "absolute", left: L, top: 58, width: W, height: 450 }}>
          {MESES.map((m, i) => (
            <div key={m} style={{ position: "absolute", left: x(D.doyOf(i + 1, 1)), top: 0, bottom: 0, borderLeft: "1px solid var(--gray-20)" }}>
              <div style={{ font: "400 15px/1 var(--mono)", color: "var(--gray-60)", padding: "4px 0 0 8px" }}>{m}</div>
            </div>
          ))}
        </div>
        {D.olas.map((o, i) => {
          const top = 110 + i * 112;
          return (
            <div key={o.n} style={{ position: "absolute", left: 0, top, width: L + W, height: 90 }}>
              <Item variants={v.left} style={{ position: "absolute", left: 0, top: 10, width: L - 30 }}>
                <div style={{ font: "400 28px/1 var(--sans)" }}>
                  <span style={{ fontWeight: 600, color: o.color }}>{o.n}</span> {o.name}
                </div>
                <div style={{ font: "400 17px/1.3 var(--sans)", color: "var(--gray-60)", marginTop: 8 }}>{o.detail}</div>
              </Item>
              <div style={{ position: "absolute", left: L, top: 22, width: W, height: 46 }}>
                <motion.div
                  variants={{ hidden: { scaleX: 0 }, show: { scaleX: 1, transition: { duration: 0.8, ease: easeInOut, delay: 0.9 + i * 0.3 } } }}
                  style={{ position: "absolute", left: x(o.prep), width: x(o.start) - x(o.prep), height: 46, background: "repeating-linear-gradient(135deg, var(--gray-20) 0 8px, var(--gray-10) 8px 16px)", transformOrigin: "left" }}
                />
                <motion.div
                  variants={{ hidden: { scaleX: 0 }, show: { scaleX: 1, transition: { duration: 0.8, ease: easeInOut, delay: 1.3 + i * 0.3 } } }}
                  style={{ position: "absolute", left: x(o.start), width: x(o.end) - x(o.start), height: 46, background: o.color, transformOrigin: "left" }}
                />
                <motion.div variants={at(1.4 + i * 0.3, "pop")} style={{ position: "absolute", left: x(o.start) - 13, top: 10, width: 26, height: 26, rotate: 45, background: "#fff", border: `4px solid ${o.color}` }} />
                <motion.div variants={at(1.5 + i * 0.3, "fade")} style={{ position: "absolute", left: x(o.prep) - 190, top: 13, width: 176, textAlign: "right", font: "600 18px/1.2 var(--sans)" }}>
                  <Rocket size={16} style={{ verticalAlign: -2, marginRight: 6 }} color={o.color} />
                  Arranque {o.startL}
                </motion.div>
                <motion.div variants={at(1.6 + i * 0.3, "fade")} style={{ position: "absolute", left: x(o.end) + 14, top: 13, whiteSpace: "nowrap", font: "600 18px/1.2 var(--sans)" }}>
                  <CalendarCheck size={16} style={{ verticalAlign: -2, marginRight: 6 }} color={o.color} />
                  Cierre {o.endL}
                </motion.div>
              </div>
            </div>
          );
        })}
        <motion.div variants={at(2.5, "pop")} style={{ position: "absolute", left: L + x(D.fin) - 22, top: 446, display: "flex", flexDirection: "column", alignItems: "center" }}>
          <div style={{ width: 44, height: 44, background: "var(--blue-100)", display: "grid", placeItems: "center" }}>
            <Flag size={22} color="#fff" />
          </div>
          <div style={{ marginTop: 8, whiteSpace: "nowrap", font: "600 18px/1 var(--sans)", transform: "translateX(-35%)" }}>Fin del proyecto 17 dic</div>
        </motion.div>
        <motion.div
          style={{ position: "absolute", top: 50, left: L, width: 2, height: 460, background: "var(--blue-60)" }}
          variants={{ hidden: { x: 0, opacity: 0 }, show: { x: [0, W], opacity: [0, 1, 1, 0], transition: { duration: 2.6, ease: "easeInOut", delay: 0.6, times: [0, 0.05, 0.9, 1] } } }}
        />
        <Item variants={v.fade} style={{ position: "absolute", left: L, top: 556, display: "flex", gap: 36, font: "400 17px/1 var(--sans)", color: "var(--gray-70)" }}>
          <span><span style={{ display: "inline-block", width: 26, height: 14, marginRight: 10, verticalAlign: -2, background: "repeating-linear-gradient(135deg, var(--gray-30) 0 6px, var(--gray-10) 6px 12px)" }} />Preparación del arranque</span>
          <span><span style={{ display: "inline-block", width: 26, height: 14, marginRight: 10, verticalAlign: -2, background: "var(--blue-60)" }} />En operación con acompañamiento</span>
          <span><span style={{ display: "inline-block", width: 13, height: 13, marginRight: 12, verticalAlign: -1, transform: "rotate(45deg)", border: "3px solid var(--ink)" }} />Arranque</span>
        </Item>
      </Group>
    </Slide>
  );
}

/* ================================================================ Gantt */
export function Gantt() {
  const W = 900;
  const x = (m, d) => (D.doyOf(m, d) / 365) * W;
  const tp = D.gantt.reduce((s, g) => s + g[4], 0);
  const tr = D.gantt.reduce((s, g) => s + g[5], 0);
  return (
    <Slide kicker="Planeación" title="Cronograma con recursos y costos" subtitle={<>Costos en millones de USD por fase: <b>plan contra real</b></>}>
      <div className="tile" style={{ position: "absolute", left: 120, right: 120, top: 350, padding: "26px 40px 16px" }}>
        <div style={{ display: "flex", alignItems: "flex-end", font: "400 15px/1 var(--mono)", color: "var(--gray-60)", paddingBottom: 12, borderBottom: "1px solid var(--gray-20)" }}>
          <div style={{ width: 460 }}>FASE Y RESPONSABLES</div>
          <div style={{ width: W, display: "flex" }}>
            {MESES.map((m) => (
              <div key={m} style={{ flex: 1, textAlign: "center" }}>{m[0]}</div>
            ))}
          </div>
          <div style={{ flex: 1, textAlign: "right" }}>PLAN</div>
          <div style={{ width: 110, textAlign: "right" }}>REAL</div>
        </div>
        <div style={{ position: "relative" }}>
          <div style={{ position: "absolute", left: 460, top: 0, bottom: 0, width: W, display: "flex", pointerEvents: "none" }}>
            {MESES.map((m, i) => (
              <div key={m} style={{ flex: 1, borderLeft: i ? "1px solid var(--gray-10)" : "none" }} />
            ))}
          </div>
          <Group stagger={0.12} delay={0.4}>
            {D.gantt.map(([n, a, b, r, p, re], i) => (
              <Item key={n} variants={v.fade} style={{ display: "flex", alignItems: "center", height: 70, borderBottom: "1px solid var(--gray-10)" }}>
                <div style={{ width: 460, paddingRight: 20 }}>
                  <div style={{ font: "600 20px/1.15 var(--sans)" }}>{n}</div>
                  <div style={{ font: "400 15px/1.2 var(--sans)", color: "var(--gray-60)", marginTop: 4 }}>{r}</div>
                </div>
                <div style={{ width: W, position: "relative", height: 24 }}>
                  <motion.div
                    variants={{ hidden: { scaleX: 0 }, show: { scaleX: 1, transition: { duration: 0.9, ease: easeInOut, delay: 0.2 } } }}
                    style={{ position: "absolute", left: x(...a), width: x(...b) - x(...a), height: 24, background: i === 0 ? "var(--blue-100)" : i < 4 ? "var(--blue-60)" : "var(--blue-80)", transformOrigin: "left" }}
                  />
                </div>
                <div style={{ flex: 1, textAlign: "right", font: "400 21px/1 var(--sans)", color: "var(--gray-60)" }}>{p.toFixed(1)}</div>
                <div style={{ width: 110, textAlign: "right", font: "600 21px/1 var(--sans)" }}>{re.toFixed(1)}</div>
              </Item>
            ))}
            <Item variants={v.fade} style={{ display: "flex", alignItems: "center", height: 66 }}>
              <div style={{ width: 460 + W, font: "600 19px/1 var(--sans)" }}>
                Total <span style={{ fontWeight: 400, color: "var(--gray-60)" }}>· la diferencia se cubrió con la contingencia prevista</span>
              </div>
              <div style={{ flex: 1, textAlign: "right", font: "400 24px/1 var(--sans)", color: "var(--gray-60)" }}>{tp.toFixed(1)}</div>
              <div style={{ width: 110, textAlign: "right", font: "600 26px/1 var(--sans)", color: "var(--blue-60)" }}>
                <Counter to={tr} decimals={1} from={tp} delay={1.8} duration={1.2} />
              </div>
            </Item>
          </Group>
        </div>
      </div>
    </Slide>
  );
}
