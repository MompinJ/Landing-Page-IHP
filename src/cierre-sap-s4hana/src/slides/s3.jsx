import { motion } from "framer-motion";
import { FileCheck, Wrench, GraduationCap, BookOpen, LifeBuoy, Megaphone, ArrowRight, MessagesSquare } from "lucide-react";
import { Slide, Item, Group, Counter, Bar, Draw, Meter, CheckBox, Icon, v, at, ease, easeInOut, SplitText } from "../ui.jsx";
import * as D from "../data.js";
import { Logo } from "../logo.jsx";
import cierreImg from "../assets/cierre.jpg";
import portadaImg from "../assets/portada.jpg";

/* ================================================================ Cierre administrativo y tecnico */
function CheckCard({ title, icon, items, dark, delay }) {
  return (
    <Item variants={v.up} className="tile" style={{ flex: 1, minHeight: 520, padding: "48px 50px", background: dark ? "var(--blue-100)" : "#fff", color: dark ? "#fff" : "var(--ink)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 18, marginBottom: 34 }}>
        <Icon icon={icon} color={dark ? "#fff" : "var(--blue-60)"} bg={dark ? "var(--blue-60)" : "var(--blue-10)"} />
        <div className="h3" style={{ color: dark ? "#fff" : undefined }}>{title}</div>
      </div>
      <Group stagger={0.2} delay={delay} style={{ display: "flex", flexDirection: "column", gap: 34 }}>
        {items.map((t) => (
          <Item key={t} variants={v.left} style={{ display: "flex", alignItems: "center", gap: 20, font: "400 26px/1.3 var(--sans)" }}>
            <CheckBox size={32} color={dark ? "var(--blue-50)" : "var(--blue-60)"} />
            {t}
          </Item>
        ))}
      </Group>
    </Item>
  );
}

export function CierreAdminTec() {
  return (
    <Slide kicker="Cierre formal" title="Cierre administrativo y técnico" subtitle="Ocho actividades verificadas antes de liberar al equipo">
      <Group stagger={0.15} delay={0.3} style={{ position: "absolute", left: 120, right: 120, top: 360, display: "flex", gap: 2 }}>
        <CheckCard title="Cierre administrativo" icon={FileCheck} items={D.cierreAdmin} delay={0.5} />
        <CheckCard title="Cierre técnico y operativo" icon={Wrench} items={D.cierreTec} delay={1.0} dark />
      </Group>
    </Slide>
  );
}

/* ================================================================ Aprobacion e informe final */
export function Aprobacion() {
  return (
    <Slide kicker="Cierre formal" title="Cierre formal autorizado" subtitle={<>Se nos autorizó <b>el cierre formal del proyecto</b> y la entrega del informe final</>}>
      <Group stagger={0} style={{ position: "absolute", left: 120, top: 350, width: 660, height: 610 }}>
        <motion.div className="tile" variants={{ hidden: { opacity: 0, y: 70 }, show: { opacity: 1, y: 0, transition: { duration: 0.8, ease } } }} style={{ position: "absolute", inset: 0, padding: "48px 54px", borderTop: "8px solid var(--blue-60)" }}>
          <Logo width={150} tone="light" />
          <div style={{ font: "400 34px/1.2 var(--sans)", marginTop: 22 }}>Autorización de cierre formal del proyecto</div>
          <div style={{ font: "400 17px/1 var(--mono)", color: "var(--gray-60)", marginTop: 14 }}>SAP S/4HANA · 17 dic 2027</div>
          <div style={{ marginTop: 40, display: "flex", flexDirection: "column", gap: 16 }}>
            {[92, 80, 88, 60, 84, 72, 50].map((w, i) => (
              <motion.div key={i} variants={{ hidden: { scaleX: 0 }, show: { scaleX: 1, transition: { duration: 0.6, ease: easeInOut, delay: 0.6 + i * 0.07 } } }} style={{ height: 10, width: `${w}%`, background: "var(--gray-20)", transformOrigin: "left" }} />
            ))}
          </div>
          <div style={{ position: "absolute", left: 54, bottom: 46, width: 260 }}>
            <svg width="260" height="60" viewBox="0 0 260 60">
              <Draw d="M10 44 C 30 6, 50 8, 52 36 S 76 54, 86 26 C 94 6, 106 48, 124 34 C 142 20, 150 40, 170 32 C 190 24, 210 18, 240 26" stroke="var(--blue-90)" width={2.5} delay={1.3} duration={1.3} />
            </svg>
            <div style={{ borderTop: "1px solid var(--gray-50)", paddingTop: 8, font: "400 15px/1 var(--mono)", color: "var(--gray-60)" }}>Patrocinador del proyecto</div>
          </div>
        </motion.div>
        <motion.div
          variants={{ hidden: { opacity: 0, scale: 2.6, rotate: -24 }, show: { opacity: 1, scale: 1, rotate: -10, transition: { delay: 2.5, type: "spring", stiffness: 420, damping: 20 } } }}
          style={{ position: "absolute", right: 40, bottom: 76, padding: "14px 30px", border: "5px solid var(--blue-60)", color: "var(--blue-60)", font: "600 50px/1 var(--sans)", letterSpacing: ".1em", background: "rgba(255,255,255,.85)" }}
        >
          AUTORIZADO
        </motion.div>
      </Group>

      <Group stagger={0.15} delay={0.5} style={{ position: "absolute", left: 820, right: 120, top: 350, display: "flex", flexDirection: "column", gap: 2 }}>
        <Item variants={v.right} className="tile" style={{ padding: "30px 44px" }}>
          <div className="h3" style={{ marginBottom: 20 }}>Autorizaciones recibidas</div>
          <Group stagger={0.15} delay={0.9} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {D.aprobacion.map((t) => (
              <Item key={t} variants={v.left} style={{ display: "flex", alignItems: "center", gap: 16, font: "400 22px/1.3 var(--sans)" }}>
                <CheckBox size={28} />
                {t}
              </Item>
            ))}
          </Group>
        </Item>
        <Item variants={v.right} style={{ padding: "30px 44px", background: "var(--blue-100)", color: "#fff" }}>
          <div className="h3" style={{ color: "#fff", marginBottom: 20 }}>Informe final: contenido</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2 }}>
            {D.informe.map(([k, d], i) => (
              <motion.div key={k} variants={at(1.0 + i * 0.12, "pop")} style={{ padding: "20px 24px", background: "rgba(255,255,255,.08)" }}>
                <div style={{ font: "600 22px/1.1 var(--sans)" }}>{k}</div>
                <div style={{ font: "400 18px/1.3 var(--sans)", color: "var(--blue-30)", marginTop: 6 }}>{d}</div>
              </motion.div>
            ))}
          </div>
        </Item>
        <Item variants={v.right} className="tile" style={{ padding: "26px 44px", display: "flex", gap: 24, alignItems: "flex-start", borderLeft: "6px solid var(--gray-30)" }}>
          <span className="tag light" style={{ flex: "none", marginTop: 2 }}>Siguiente paso</span>
          <div>
            <div style={{ font: "600 22px/1.2 var(--sans)" }}>Aprobación final del cliente</div>
            <div style={{ font: "400 18px/1.4 var(--sans)", color: "var(--gray-70)", marginTop: 6 }}>{D.aprobacionCliente}</div>
          </div>
        </Item>
      </Group>
    </Slide>
  );
}

/* ================================================================ Lecciones */
export function Lecciones() {
  return (
    <Slide kicker="Lecciones aprendidas" title="Qué haríamos igual o mejor" subtitle="Cinco aprendizajes para el siguiente proyecto">
      <Group stagger={0.12} delay={0.4} style={{ position: "absolute", left: 120, right: 120, top: 360, display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 2 }}>
        {D.lecciones.map((l, i) => (
          <Item
            key={l.tema}
            variants={{ hidden: { opacity: 0, y: 60 }, show: { opacity: 1, y: 0, transition: { duration: 0.7, ease } } }}
            className="tile"
            style={{ height: 470, padding: "36px 32px", display: "flex", flexDirection: "column", background: i % 2 ? "#fff" : "var(--blue-10)" }}
          >
            <div style={{ font: "300 72px/1 var(--sans)", color: "var(--blue-60)" }}>{String(i + 1).padStart(2, "0")}</div>
            <div style={{ width: 40, height: 4, background: "var(--blue-60)", marginTop: 28 }} />
            <div style={{ font: "600 28px/1.1 var(--sans)", marginTop: 26 }}>{l.tema}</div>
            <div style={{ font: "400 21px/1.45 var(--sans)", color: "var(--gray-80)", marginTop: 18 }}>{l.rec}</div>
          </Item>
        ))}
      </Group>
    </Slide>
  );
}

/* ================================================================ Transferencia */
const trIcons = [GraduationCap, BookOpen, LifeBuoy];

export function Transferencia() {
  return (
    <Slide kicker="Cierre formal" title="Transferencia de conocimiento" subtitle="El conocimiento se queda en la compañía cuando sale el equipo del proyecto">
      <Group stagger={0.14} delay={0.4} style={{ position: "absolute", left: 120, top: 360, width: 1000, display: "flex", flexDirection: "column", gap: 2 }}>
        {D.transferencia.map(([k, d], i) => (
          <Item key={k} variants={v.left} className="tile" style={{ padding: "30px 38px", display: "flex", gap: 28, alignItems: "flex-start" }}>
            <Icon icon={trIcons[i]} />
            <div>
              <div className="h3">{k}</div>
              <div style={{ font: "400 21px/1.45 var(--sans)", color: "var(--gray-80)", marginTop: 8 }}>{d}</div>
            </div>
          </Item>
        ))}
      </Group>
      <Item variants={v.right} style={{ position: "absolute", left: 1160, right: 120, top: 360, height: 600, background: "var(--blue-100)", color: "#fff", padding: "38px 44px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <Megaphone size={28} color="var(--blue-40)" strokeWidth={1.75} />
          <div className="h3" style={{ color: "#fff", fontSize: 26 }}>Manejo de la resistencia</div>
        </div>
        <ul className="list" style={{ marginTop: 24, gap: 12 }}>
          {D.resistencia.map((t) => (
            <li key={t} style={{ fontSize: 21, color: "var(--blue-10)" }}>{t}</li>
          ))}
        </ul>
        <div style={{ display: "flex", gap: 2, marginTop: 34 }}>
          <div style={{ flex: 1, padding: "24px 24px", background: "rgba(255,255,255,.08)" }}>
            <div style={{ font: "300 60px/1 var(--sans)" }}>
              <Counter to={92} suffix="%" delay={1.0} />
            </div>
            <div style={{ font: "400 17px/1.3 var(--sans)", color: "var(--blue-30)", marginTop: 8 }}>adopción</div>
          </div>
          <div style={{ flex: 1.3, padding: "24px 24px", background: "rgba(255,255,255,.08)" }}>
            <div style={{ font: "300 60px/1 var(--sans)" }}>
              <Counter to={10000} suffix="+" delay={1.2} />
            </div>
            <div style={{ font: "400 17px/1.3 var(--sans)", color: "var(--blue-30)", marginTop: 8 }}>usuarios capacitados</div>
          </div>
        </div>
      </Item>
    </Slide>
  );
}

/* ================================================================ Creacion de valor */
export function Valor() {
  return (
    <Slide kicker="Valor" title="Creación de valor para la compañía" subtitle="Una sola operación con prácticas probadas, lista para crecer">
      <Group stagger={0.12} delay={0.4} style={{ position: "absolute", left: 120, right: 120, top: 360, display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 2 }}>
        {D.valor.map((t, i) => {
          const dark = t.accent || i === 0;
          return (
            <Item
              key={t.big}
              variants={{ hidden: { opacity: 0, y: 60 }, show: { opacity: 1, y: 0, transition: { duration: 0.7, ease } } }}
              style={{ height: 560, padding: "44px 36px", display: "flex", flexDirection: "column", justifyContent: "space-between", background: t.accent ? "var(--blue-60)" : i === 0 ? "var(--blue-100)" : "#fff", color: dark ? "#fff" : "var(--ink)" }}
            >
              <div className="label" style={{ color: dark ? "var(--blue-20)" : undefined }}>{String(i + 1).padStart(2, "0")}</div>
              <div>
                <div style={{ font: `300 ${t.big.length > 9 ? 50 : 66}px/1.05 var(--sans)`, letterSpacing: "-.02em", color: dark ? "#fff" : "var(--blue-70)" }}>
                  {t.big === "USD 79 M" ? <Counter to={79} prefix="USD " suffix=" M" delay={0.9} /> : t.big}
                </div>
                <div style={{ font: "400 21px/1.45 var(--sans)", marginTop: 22, color: dark ? "var(--blue-10)" : "var(--gray-70)" }}>{t.sub}</div>
              </div>
            </Item>
          );
        })}
      </Group>
    </Slide>
  );
}

/* ================================================================ Reflexiones (mapa) */
function MindMap({ center, items }) {
  const W = 1680;
  const boxW = 560;
  const boxH = 220;
  const cx = W / 2;
  const cy = 300;
  const pos = [
    [0, 0],
    [W - boxW, 0],
    [0, 380],
    [W - boxW, 380],
  ];
  const paths = [
    `M${cx - 170} ${cy} H${cx - 220} V${boxH / 2} H${boxW}`,
    `M${cx + 170} ${cy} H${cx + 220} V${boxH / 2} H${W - boxW}`,
    `M${cx - 170} ${cy} H${cx - 220} V${380 + boxH / 2} H${boxW}`,
    `M${cx + 170} ${cy} H${cx + 220} V${380 + boxH / 2} H${W - boxW}`,
  ];
  return (
    <Group stagger={0} style={{ position: "absolute", left: 120, top: 340, width: W, height: 600 }}>
      <svg width={W} height={600} style={{ position: "absolute", inset: 0 }}>
        {paths.map((d, i) => (
          <Draw key={i} d={d} stroke="var(--blue-40)" width={2} delay={0.9 + i * 0.1} duration={0.8} />
        ))}
      </svg>
      <motion.div variants={at(0.4, "pop")} style={{ position: "absolute", left: cx - 170, top: cy - 50, width: 340, height: 100, background: "var(--blue-60)", color: "#fff", display: "grid", placeItems: "center", font: "400 30px/1 var(--sans)" }}>
        {center}
      </motion.div>
      {items.map((t, i) => (
        <motion.div
          key={i}
          variants={{ hidden: { opacity: 0, x: i % 2 ? 50 : -50 }, show: { opacity: 1, x: 0, transition: { duration: 0.6, ease, delay: 1.5 + i * 0.15 } } }}
          className="tile"
          style={{ position: "absolute", left: pos[i][0], top: pos[i][1], width: boxW, height: boxH, padding: "28px 34px", borderTop: "4px solid var(--blue-60)", display: "flex", alignItems: "center" }}
        >
          <div style={{ font: "400 22px/1.45 var(--sans)", color: "var(--gray-80)" }}>{t}</div>
        </motion.div>
      ))}
    </Group>
  );
}

export function ReflexionCompania() {
  return (
    <Slide kicker="Valor y reflexión" title="Reflexión final">
      <MindMap center="Como compañía" items={D.reflexionCompania} />
    </Slide>
  );
}
export function ReflexionEstudiantes() {
  return (
    <Slide kicker="Valor y reflexión" title="Reflexión final">
      <MindMap center="Como estudiantes" items={D.reflexionEstudiantes} />
    </Slide>
  );
}

/* ================================================================ Compromisos */
export function Compromisos() {
  return (
    <Slide kicker="Resultados" title="Los compromisos se convirtieron en resultados">
      <Group stagger={0.2} delay={0.4} style={{ position: "absolute", left: 120, right: 120, top: 330, display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 2 }}>
        {D.compromisos.map((c, i) => (
          <Item key={c.label} variants={v.up} className="tile" style={{ height: 500, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 30 }}>
            <Meter pct={c.to} size={300} color={c.color} delay={0.6 + i * 0.2}>
              <div style={{ font: "300 72px/1 var(--sans)", letterSpacing: "-.02em", textShadow: "0 1px 12px rgba(0,17,65,.25)" }}>
                <Counter to={c.to} decimals={c.decimals || 0} suffix={c.suffix} delay={0.6 + i * 0.2} />
              </div>
            </Meter>
            <div style={{ font: "400 26px/1 var(--sans)" }}>{c.label}</div>
          </Item>
        ))}
      </Group>
      <Item variants={v.fade} style={{ position: "absolute", left: 120, right: 120, top: 870, textAlign: "center", font: "300 28px/1.4 var(--sans)", color: "var(--gray-70)" }}>
        Una plataforma global única, <b style={{ color: "var(--ink)", fontWeight: 600 }}>preparada para la siguiente expansión.</b>
      </Item>
    </Slide>
  );
}

/* ================================================================ Retroalimentacion del cierre */
export function Retroalimentacion() {
  return (
    <Slide kicker="Retroalimentación" title="Lo que salió bien" subtitle="Retroalimentación del cierre para la compañía y el equipo">
      <Group stagger={0.1} delay={0.4} style={{ position: "absolute", left: 120, top: 350, width: 1090, display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 2 }}>
        {D.retroBien.map(([n, t], i) => (
          <Item key={t} variants={v.up} className="tile" style={{ height: 250, padding: "30px 32px", display: "flex", flexDirection: "column", borderTop: "4px solid var(--blue-60)" }}>
            <CheckBox size={30} delay={0.6 + i * 0.1} />
            <div style={{ font: `300 ${n.length > 8 ? 46 : 58}px/1 var(--sans)`, letterSpacing: "-.02em", color: "var(--blue-80)", marginTop: "auto" }}>{n}</div>
            <div style={{ font: "400 19px/1.35 var(--sans)", color: "var(--gray-80)", marginTop: 12 }}>{t}</div>
          </Item>
        ))}
      </Group>
      <Item variants={v.right} style={{ position: "absolute", left: 1250, right: 120, top: 350, height: 502, background: "var(--blue-100)", color: "#fff", overflow: "hidden" }}>
        <div style={{ height: 170, position: "relative" }}>
          <img src={portadaImg} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "50% 35%" }} />
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(0,17,65,0) 40%, rgba(0,17,65,1) 100%)" }} />
        </div>
        <div style={{ padding: "6px 36px 30px" }}>
          <div className="h3" style={{ color: "#fff", fontSize: 25 }}>Para mantener</div>
          <ul className="list" style={{ marginTop: 16, gap: 12 }}>
            {D.retroMantener.map((t) => (
              <li key={t} style={{ fontSize: 19, color: "var(--blue-10)" }}>{t}</li>
            ))}
          </ul>
        </div>
      </Item>
      <Item variants={v.fade} style={{ position: "absolute", left: 120, right: 120, top: 880, font: "300 25px/1.4 var(--sans)", color: "var(--gray-70)" }}>
        Reconocimiento al equipo del proyecto, a los usuarios clave, a Infraestructura y Redes, y al patrocinador: <b style={{ color: "var(--ink)", fontWeight: 600 }}>el resultado es de todos.</b>
      </Item>
    </Slide>
  );
}

/* ================================================================ USD 79 M */
export function Ahorro() {
  const meses = (34.2 / 79) * 12; // 5.2
  return (
    <Slide dark kicker="Retorno">
      <motion.div variants={{ hidden: { scaleY: 0 }, show: { scaleY: 1, transition: { duration: 0.9, ease: easeInOut } } }} style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 16, background: "var(--blue-60)", transformOrigin: "top" }} />
      <div style={{ position: "absolute", left: 120, top: 220 }}>
        <div style={{ font: "300 200px/0.95 var(--sans)", letterSpacing: "-.04em", whiteSpace: "nowrap" }}>
          <Counter to={79} prefix="USD " suffix=" M" delay={0.4} duration={2} />
        </div>
        <Item variants={v.left} style={{ font: "400 26px/1 var(--mono)", letterSpacing: ".12em", color: "var(--blue-40)", marginTop: 28 }}>
          AHORRO ANUAL ESPERADO
        </Item>
      </div>
      <Group stagger={0} style={{ position: "absolute", left: 120, right: 120, top: 640 }}>
        <motion.div variants={v.fade} className="label" style={{ marginBottom: 20 }}>
          Recuperación de la inversión, mes a mes
        </motion.div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(12, 1fr)", gap: 4 }}>
          {Array.from({ length: 12 }).map((_, m) => {
            const fill = Math.max(0, Math.min(1, meses - m));
            return (
              <div key={m} style={{ height: 90, background: "rgba(255,255,255,.08)", position: "relative", overflow: "hidden" }}>
                {fill > 0 && (
                  <motion.div
                    variants={{ hidden: { scaleY: 0 }, show: { scaleY: 1, transition: { duration: 0.35, ease, delay: 1.0 + m * 0.18 } } }}
                    style={{ position: "absolute", left: 0, bottom: 0, top: 0, width: `${fill * 100}%`, background: "var(--blue-60)", transformOrigin: "bottom" }}
                  />
                )}
                <div style={{ position: "absolute", left: 12, bottom: 10, font: "400 15px/1 var(--mono)", color: "var(--blue-20)" }}>{m + 1}</div>
              </div>
            );
          })}
        </div>
        <motion.div variants={at(2.2)} style={{ display: "flex", alignItems: "baseline", gap: 24, marginTop: 30 }}>
          <span style={{ font: "300 64px/1 var(--sans)" }}>&lt; 6 meses</span>
          <span style={{ font: "400 22px/1.4 var(--sans)", color: "var(--blue-30)" }}>inversión de USD 34.2 M ÷ ahorro de USD 79 M al año</span>
        </motion.div>
      </Group>
    </Slide>
  );
}

/* ================================================================ Referencias */
export function Referencias() {
  return (
    <Slide kicker="Soporte" title="Base de las cifras y referencias" subtitle="Nuestros supuestos, comparados con fuentes públicas">
      <Group stagger={0.08} delay={0.4} className="tile" style={{ position: "absolute", left: 120, right: 120, top: 350 }}>
        <div style={{ display: "flex", background: "var(--blue-100)", color: "#fff", font: "400 15px/1 var(--mono)", padding: "20px 36px" }}>
          <div style={{ width: 380 }}>TEMA</div>
          <div style={{ flex: 1 }}>REFERENCIA</div>
          <div style={{ width: 400 }}>FUENTE</div>
        </div>
        {D.fuentes.map(([t, r, f]) => (
          <Item key={t} variants={v.left} style={{ display: "flex", alignItems: "center", padding: "22px 36px", borderTop: "1px solid var(--gray-20)" }}>
            <div style={{ width: 380, font: "600 20px/1.3 var(--sans)", paddingRight: 20 }}>{t}</div>
            <div style={{ flex: 1, font: "400 19px/1.45 var(--sans)", color: "var(--gray-80)", paddingRight: 30 }}>{r}</div>
            <div style={{ width: 400, font: "400 17px/1.4 var(--mono)", color: "var(--blue-70)" }}>{f}</div>
          </Item>
        ))}
      </Group>
    </Slide>
  );
}

/* ================================================================ Cierre */
export function Gracias() {
  return (
    <Slide dark footer={false} grid={false} style={{ padding: 0 }}>
      <motion.div style={{ position: "absolute", top: 0, right: 0, bottom: 0, width: 860, overflow: "hidden" }} variants={{ hidden: { clipPath: "inset(0% 0% 0% 100%)" }, show: { clipPath: "inset(0% 0% 0% 0%)", transition: { duration: 1.2, ease: easeInOut } } }}>
        <motion.img src={cierreImg} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} variants={{ hidden: { scale: 1.2 }, show: { scale: 1.02, transition: { duration: 9, ease: "easeOut" } } }} />
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(90deg, rgba(0,17,65,.7) 0%, rgba(0,17,65,0) 45%)" }} />
      </motion.div>
      <motion.div style={{ position: "absolute", left: 1044, top: 0, width: 16, height: 1080, background: "var(--blue-60)", transformOrigin: "bottom" }} variants={{ hidden: { scaleY: 0 }, show: { scaleY: 1, transition: { duration: 1, ease: easeInOut, delay: 0.5 } } }} />
      <div style={{ position: "absolute", left: 120, top: 150, width: 900 }}>
        <Item variants={v.left}>
          <Logo width={220} tone="dark" />
        </Item>
        <h1 style={{ font: "300 76px/1.1 var(--sans)", letterSpacing: "-.02em", marginTop: 50 }}>
          <SplitText text="Proyecto cerrado en" />
          <SplitText text="alcance, tiempo y presupuesto" style={{ fontWeight: 600, color: "var(--blue-40)" }} />
        </h1>
        <motion.div variants={{ hidden: { scaleX: 0 }, show: { scaleX: 1, transition: { duration: 0.8, ease: easeInOut, delay: 0.4 } } }} style={{ width: 160, height: 4, background: "var(--blue-60)", marginTop: 56, transformOrigin: "left" }} />
        <Item variants={v.blur} style={{ font: "300 72px/1 var(--sans)", marginTop: 50 }}>
          Gracias
        </Item>
        <Item variants={v.fade} style={{ font: "400 26px/1 var(--mono)", color: "var(--blue-30)", marginTop: 20 }}>
          ¿Preguntas?
        </Item>
      </div>
      <Group stagger={0.07} delay={0.8} style={{ position: "absolute", left: 120, bottom: 90, display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px 40px", width: 820 }}>
        {D.equipo.map((n) => (
          <Item key={n} variants={v.up} style={{ font: "400 18px/1.3 var(--sans)", color: "var(--blue-20)" }}>
            {n}
          </Item>
        ))}
      </Group>
    </Slide>
  );
}

/* ================================================================ Anexo: preguntas */
export function Preguntas() {
  return (
    <Slide kicker="Anexo" title="Preguntas probables" subtitle="Respuestas preparadas para la sesión de preguntas">
      <Group stagger={0.14} delay={0.4} style={{ position: "absolute", left: 120, right: 120, top: 350, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2 }}>
        {D.preguntas.map(([q, a]) => (
          <Item key={q} variants={v.up} className="tile" style={{ padding: "34px 40px", height: 290 }}>
            <div style={{ display: "flex", gap: 18, alignItems: "flex-start" }}>
              <Icon icon={MessagesSquare} size={52} iconSize={24} />
              <div style={{ font: "600 25px/1.3 var(--sans)" }}>{q}</div>
            </div>
            <div style={{ display: "flex", gap: 14, marginTop: 26, font: "400 22px/1.5 var(--sans)", color: "var(--gray-80)" }}>
              <ArrowRight size={24} color="var(--blue-60)" style={{ flex: "none", marginTop: 5 }} />
              {a}
            </div>
          </Item>
        ))}
      </Group>
    </Slide>
  );
}
