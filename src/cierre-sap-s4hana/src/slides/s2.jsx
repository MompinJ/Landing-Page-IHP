import { motion } from "framer-motion";
import { Bot, ShieldCheck, Search, Check, ArrowRight, Award, Wallet, CalendarCheck, BadgeCheck } from "lucide-react";
import { Slide, Item, Group, Counter, Bar, CheckBox, v, at, ease, easeInOut } from "../ui.jsx";
import * as D from "../data.js";

/* ================================================================ Investigacion libre: IA */
export function InvestigacionIA() {
  const total = D.ia.reduce((s, r) => s + r[1], 0);
  const max = D.ia[0][1];
  return (
    <Slide kicker="Espacio de investigación libre" title="La IA como herramienta del proyecto" subtitle={<>Se usó para ahorrar tiempo del equipo; <b>no es parte del sistema entregado</b></>}>
      <Group stagger={0.1} delay={0.4} className="tile" style={{ position: "absolute", left: 120, top: 370, width: 1060, padding: "30px 44px 20px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", paddingBottom: 14 }}>
          <div className="label">Uso</div>
          <div className="label">Costo USD</div>
        </div>
        {D.ia.map(([uso, c]) => (
          <Item key={uso} variants={v.fade} style={{ padding: "18px 0", borderTop: "1px solid var(--gray-20)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 20 }}>
              <div style={{ font: "400 22px/1.3 var(--sans)" }}>{uso}</div>
              <div style={{ font: "300 30px/1 var(--sans)" }}>
                <Counter to={c} delay={0.8} />
              </div>
            </div>
            <div style={{ height: 10, background: "var(--gray-10)", marginTop: 12 }}>
              <Bar pct={(c / max) * 100} height={10} delay={0.3} />
            </div>
          </Item>
        ))}
      </Group>

      <Group stagger={0.14} delay={0.6} style={{ position: "absolute", left: 1220, right: 120, top: 370, display: "flex", flexDirection: "column", gap: 2 }}>
        <Item variants={v.right} style={{ background: "var(--blue-100)", color: "#fff", padding: "36px 40px" }}>
          <Bot size={32} color="var(--blue-40)" strokeWidth={1.75} />
          <div className="label" style={{ color: "var(--blue-30)", marginTop: 24 }}>Costo total</div>
          <div style={{ font: "300 84px/1 var(--sans)", marginTop: 14, letterSpacing: "-.02em" }}>
            <Counter to={total} prefix="$" delay={0.9} />
          </div>
          <div style={{ font: "400 21px/1.4 var(--sans)", color: "var(--blue-20)", marginTop: 14 }}>
            Menos del <b style={{ color: "#fff" }}>0.1%</b> del costo del proyecto
          </div>
        </Item>
        <Item variants={v.right} className="tile" style={{ padding: "30px 40px" }}>
          <div className="label" style={{ marginBottom: 16 }}>Qué permitió</div>
          <ul className="list" style={{ gap: 10 }}>
            <li style={{ fontSize: 21 }}>Atender dudas de usuarios sin crecer la mesa de ayuda</li>
            <li style={{ fontSize: 21 }}>Traducir materiales sin contratar traductores</li>
          </ul>
        </Item>
      </Group>
    </Slide>
  );
}

/* ================================================================ Presupuesto */
export function Presupuesto() {
  const max = D.costoReal[0][1];
  const autorizado = 39.7;
  const real = 34.2;
  return (
    <Slide kicker="Costos" title="Presupuesto: cierre final" subtitle={<>Costo real <b>USD 34.2 M</b> contra USD 39.7 M autorizados</>}>
      <Group stagger={0.07} delay={0.4} className="tile" style={{ position: "absolute", left: 120, top: 350, width: 1040, padding: "26px 44px 22px" }}>
        <div className="label" style={{ paddingBottom: 14 }}>En qué se invirtió (USD M)</div>
        {D.costoReal.map(([k, n]) => (
          <Item key={k} variants={v.fade} style={{ display: "flex", alignItems: "center", height: 56, borderTop: "1px solid var(--gray-20)" }}>
            <div style={{ width: 410, font: "400 20px/1.2 var(--sans)" }}>{k}</div>
            <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 14 }}>
              <div style={{ width: `${(n / max) * 86}%` }}>
                <Bar pct={100} height={18} delay={0.2} />
              </div>
              <span style={{ font: "600 20px/1 var(--sans)" }}>{n.toFixed(1)}</span>
            </div>
          </Item>
        ))}
      </Group>

      <Group stagger={0} style={{ position: "absolute", left: 1200, right: 120, top: 350, height: 610, background: "var(--blue-100)", color: "#fff", padding: "40px 44px" }}>
        <motion.div variants={v.fade} className="label" style={{ color: "var(--blue-30)" }}>
          Resultado del presupuesto
        </motion.div>
        <motion.div variants={at(0.5)} style={{ font: "300 120px/1 var(--sans)", letterSpacing: "-.03em", marginTop: 26 }}>
          <Counter to={13.9} decimals={1} suffix="%" delay={0.6} />
        </motion.div>
        <motion.div variants={at(0.6, "fade")} style={{ font: "400 24px/1.35 var(--sans)", color: "var(--blue-20)", marginTop: 10 }}>
          por debajo de lo autorizado
        </motion.div>
        <div style={{ marginTop: 56, display: "flex", flexDirection: "column", gap: 22 }}>
          {[
            ["Autorizado", autorizado, "var(--blue-30)"],
            ["Real", real, "var(--blue-50)"],
          ].map(([k, n, c], i) => (
            <div key={k}>
              <div style={{ display: "flex", justifyContent: "space-between", font: "400 19px/1 var(--sans)", color: "var(--blue-20)", marginBottom: 10 }}>
                <span>{k}</span>
                <span style={{ color: "#fff", fontWeight: 600 }}>{n.toFixed(1)}</span>
              </div>
              <div style={{ width: `${(n / autorizado) * 100}%` }}>
                <Bar pct={100} color={c} height={26} delay={0.9 + i * 0.3} />
              </div>
            </div>
          ))}
        </div>
        <motion.div variants={at(1.6, "fade")} style={{ position: "absolute", left: 44, right: 44, bottom: 36, font: "400 17px/1.45 var(--sans)", color: "var(--blue-30)" }}>
          Las variaciones por partida se cubrieron con la contingencia prevista en el plan.
        </motion.div>
      </Group>
    </Slide>
  );
}

/* ================================================================ Matriz de viabilidad */
function Squares({ n, color, delay }) {
  return (
    <div style={{ display: "flex", gap: 4, justifyContent: "center" }}>
      {[1, 2, 3, 4, 5].map((k) => (
        <motion.span key={k} variants={at(delay + k * 0.04, "pop")} style={{ width: 18, height: 18, background: k <= n ? color : "var(--gray-20)" }} />
      ))}
    </div>
  );
}

export function Viabilidad() {
  const V = D.viabilidad;
  const colors = ["var(--gray-50)", "var(--blue-40)", "var(--blue-60)"];
  const COLW = 250;
  return (
    <Slide kicker="Decisión" title="Matriz de viabilidad" subtitle={<>Elegimos <b>C, licencia propia en AWS</b>: empata con RISE y gana en control sobre los cambios</>}>
      <Group stagger={0} style={{ position: "absolute", left: 120, top: 350, width: 1340 }}>
        <motion.div
          variants={{ hidden: { opacity: 0 }, show: { opacity: 1, transition: { duration: 0.6, delay: 1.6 } } }}
          style={{ position: "absolute", right: 0, top: 0, width: COLW, height: 600, border: "3px solid var(--blue-60)", background: "rgba(15,98,254,.04)" }}
        />
        <motion.div variants={at(1.9, "pop")} style={{ position: "absolute", right: 0, top: -34, width: COLW, display: "flex", justifyContent: "center" }}>
          <span className="tag blue">
            <Award size={15} /> Alternativa elegida
          </span>
        </motion.div>
        <div style={{ display: "flex", alignItems: "center", height: 70, position: "relative" }}>
          <div style={{ flex: 1 }} className="label">Criterio</div>
          <div style={{ width: 100, textAlign: "center" }} className="label">Peso</div>
          {V.alternativas.map((a, i) => (
            <div key={a} style={{ width: COLW, textAlign: "center", font: `${i === 2 ? 600 : 400} 19px/1.2 var(--sans)`, color: i === 2 ? "var(--blue-70)" : "var(--ink)", padding: "0 10px" }}>
              {a}
            </div>
          ))}
        </div>
        {V.criterios.map(([c, w, s], r) => {
          const key = c.startsWith("Control");
          return (
            <motion.div
              key={c}
              variants={{ hidden: { opacity: 0, x: -30 }, show: { opacity: 1, x: 0, transition: { duration: 0.5, ease, delay: 0.3 + r * 0.1 } } }}
              style={{ display: "flex", alignItems: "center", height: 60, borderTop: "1px solid var(--gray-20)", background: key ? "var(--blue-10)" : "transparent" }}
            >
              <div style={{ flex: 1, font: `${key ? 600 : 400} 21px/1.2 var(--sans)`, paddingLeft: 16 }}>{c}</div>
              <div style={{ width: 100, textAlign: "center", font: "400 19px/1 var(--mono)", color: "var(--gray-60)" }}>{w}%</div>
              {s.map((n, i) => (
                <div key={i} style={{ width: COLW }}>
                  <Squares n={n} color={colors[i]} delay={0.6 + r * 0.1 + i * 0.06} />
                </div>
              ))}
            </motion.div>
          );
        })}
        <div style={{ display: "flex", alignItems: "center", height: 108, borderTop: "2px solid var(--ink)" }}>
          <div style={{ flex: 1, font: "600 23px/1 var(--sans)", paddingLeft: 16 }}>Puntaje ponderado</div>
          <div style={{ width: 100 }} />
          {V.total.map((t, i) => (
            <div key={i} style={{ width: COLW, padding: "0 30px" }}>
              <div style={{ font: "300 40px/1 var(--sans)", textAlign: "center", color: i === 0 ? "var(--gray-50)" : "var(--ink)" }}>
                <Counter to={t} decimals={2} delay={1.3} />
              </div>
              <div style={{ height: 8, background: "var(--gray-20)", marginTop: 12 }}>
                <Bar pct={(t / 5) * 100} color={colors[i]} height={8} delay={1.3} />
              </div>
            </div>
          ))}
        </div>
      </Group>
      <Item variants={v.right} className="tile top" style={{ position: "absolute", right: 120, top: 420, width: 260, padding: "26px 26px" }}>
        <div className="label">Desempate</div>
        <div style={{ font: "600 22px/1.25 var(--sans)", marginTop: 14 }}>Control sobre los cambios</div>
        <div style={{ font: "400 18px/1.45 var(--sans)", color: "var(--gray-70)", marginTop: 12 }}>
          Con licencia propia decidimos cuándo y cómo se actualiza el sistema.
        </div>
      </Item>
    </Slide>
  );
}

/* ================================================================ Resultados antes y despues */
export function Resultados() {
  return (
    <Slide kicker="Resultados" title="Antes y después" subtitle="Las metas de negocio se cumplieron">
      <Group stagger={0.08} delay={0.4} style={{ position: "absolute", left: 120, right: 120, top: 340, display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 2 }}>
        {D.metricas.map((m) => {
          const mx = Math.max(m.a, m.d) || 1;
          return (
            <Item key={m.k} variants={v.pop} className="tile" style={{ padding: "28px 34px", height: 296 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <div style={{ font: "600 23px/1.1 var(--sans)" }}>{m.k}</div>
                  <div style={{ font: "400 16px/1 var(--sans)", color: "var(--gray-60)", marginTop: 8 }}>{m.u}</div>
                </div>
                <span className="tag light">
                  <Check size={15} /> {m.meta}
                </span>
              </div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 18, marginTop: 34 }}>
                <span style={{ font: "300 30px/1 var(--sans)", color: "var(--gray-50)" }}>{m.aLabel || m.a}</span>
                <ArrowRight size={24} color="var(--gray-50)" style={{ alignSelf: "center" }} />
                <span style={{ font: "300 68px/1 var(--sans)", letterSpacing: "-.02em", color: "var(--blue-70)" }}>
                  {m.dLabel ? (
                    <motion.span variants={v.blur} style={{ display: "inline-block", fontSize: 56 }}>
                      {m.dLabel}
                    </motion.span>
                  ) : (
                    <Counter from={m.a} to={m.d} decimals={m.dec || 0} delay={0.9} duration={1.8} />
                  )}
                </span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 30 }}>
                <div style={{ width: `${Math.max((m.a / mx) * 100, 1)}%` }}>
                  <Bar pct={100} color="var(--gray-30)" height={8} delay={0.4} />
                </div>
                <div style={{ width: `${Math.max((m.d / mx) * 100, 1.5)}%` }}>
                  <Bar pct={100} color="var(--blue-60)" height={8} delay={0.7} />
                </div>
              </div>
            </Item>
          );
        })}
      </Group>
    </Slide>
  );
}

/* ================================================================ Riesgos */
function Matriz({ p, i, code }) {
  const cell = 54;
  const tone = (s) => (s >= 15 ? "var(--blue-30)" : s >= 8 ? "var(--blue-20)" : "var(--blue-10)");
  return (
    <div style={{ position: "relative", paddingLeft: 30, paddingBottom: 30 }}>
      <div style={{ display: "grid", gridTemplateColumns: `repeat(5, ${cell}px)`, gap: 2 }}>
        {[5, 4, 3, 2, 1].map((pp) =>
          [1, 2, 3, 4, 5].map((ii) => {
            const hit = pp === p && ii === i;
            return (
              <motion.div
                key={`${pp}-${ii}`}
                variants={at(0.3 + (5 - pp + ii) * 0.04, "pop")}
                style={{ width: cell, height: cell, background: hit ? "var(--blue-80)" : tone(pp * ii), display: "grid", placeItems: "center", position: "relative", font: "600 17px/1 var(--sans)", color: "#fff" }}
              >
                {hit && (
                  <>
                    <motion.span style={{ position: "absolute", inset: -4, border: "3px solid var(--blue-60)" }} animate={{ scale: [1, 1.3], opacity: [0.9, 0] }} transition={{ duration: 1.6, repeat: Infinity, ease: "easeOut", delay: 1 }} />
                    {code}
                  </>
                )}
              </motion.div>
            );
          })
        )}
      </div>
      <div style={{ position: "absolute", left: -6, top: 0, bottom: 30, width: 20, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ transform: "rotate(-90deg)", whiteSpace: "nowrap", font: "400 13px/1 var(--mono)", color: "var(--gray-60)" }}>PROBABILIDAD</div>
      </div>
      <div style={{ position: "absolute", left: 30, right: 0, bottom: 0, textAlign: "center", font: "400 13px/1 var(--mono)", color: "var(--gray-60)" }}>IMPACTO</div>
    </div>
  );
}

function Riesgo({ r, n }) {
  return (
    <Slide kicker={`Riesgo ${n} · gestionado`} title={`${r.name} (${r.code})`} subtitle={<>Probabilidad {r.p} de 5 e impacto {r.i} de 5: <b>prioridad alta</b>, con plan de respuesta desde el inicio</>}>
      <Group stagger={0.15} delay={0.3} style={{ position: "absolute", left: 120, top: 360, width: 620, display: "flex", flexDirection: "column", gap: 2 }}>
        <Item variants={v.left} className="tile" style={{ padding: "32px 36px", display: "flex", gap: 40, alignItems: "center" }}>
          <Matriz p={r.p} i={r.i} code={r.code} />
          <div>
            <div className="label">Prioridad</div>
            <div style={{ font: "300 64px/1 var(--sans)", color: "var(--blue-80)", marginTop: 10 }}>Alta</div>
            <div style={{ font: "400 17px/1.4 var(--sans)", color: "var(--gray-60)", marginTop: 12, width: 150 }}>Vigilado en cada revisión semanal</div>
          </div>
        </Item>
        <Group stagger={0.1} delay={0.6} style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 2 }}>
          {r.stats.map(([a, b]) => (
            <Item key={b} variants={v.up} className="tile" style={{ padding: "24px 24px", height: 150 }}>
              <div style={{ font: "300 46px/1 var(--sans)", color: "var(--blue-70)" }}>{a}</div>
              <div style={{ font: "400 17px/1.3 var(--sans)", color: "var(--gray-70)", marginTop: 12 }}>{b}</div>
            </Item>
          ))}
        </Group>
      </Group>
      <Group stagger={0.15} delay={0.6} style={{ position: "absolute", left: 780, right: 120, top: 360, display: "flex", flexDirection: "column", gap: 2 }}>
        <Item variants={v.right} className="tile" style={{ padding: "30px 40px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 18 }}>
            <Search size={26} color="var(--gray-70)" strokeWidth={1.75} />
            <div className="h3">Qué pasó</div>
          </div>
          <ul className="list" style={{ gap: 10 }}>
            {r.paso.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
        </Item>
        <Item variants={v.right} className="tile" style={{ padding: "30px 40px", borderLeft: "6px solid var(--blue-60)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 18 }}>
            <ShieldCheck size={26} color="var(--blue-60)" strokeWidth={1.75} />
            <div className="h3">Cómo respondimos</div>
          </div>
          <ul className="list" style={{ gap: 10 }}>
            {r.respuesta.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
        </Item>
        <Item variants={v.mask} style={{ background: "var(--blue-100)", color: "#fff", padding: "28px 40px", display: "flex", alignItems: "center", gap: 22 }}>
          <CheckBox size={40} color="var(--blue-50)" delay={1.4} />
          <div>
            <div className="label" style={{ color: "var(--blue-30)" }}>Resultado</div>
            <div style={{ font: "400 24px/1.35 var(--sans)", marginTop: 8 }}>{r.resultado}</div>
          </div>
        </Item>
      </Group>
    </Slide>
  );
}

export const RiesgoR1 = () => <Riesgo r={D.riesgos.r1} n={1} />;
export const RiesgoR13 = () => <Riesgo r={D.riesgos.r13} n={2} />;

/* ================================================================ Desviaciones bajo control */
const ctlIcons = [Wallet, CalendarCheck, BadgeCheck];

export function Control() {
  return (
    <Slide kicker="Cierre formal" title="Desviaciones bajo control" subtitle="Lo imprevisto se absorbió con lo que el plan ya tenía previsto">
      <Group stagger={0.16} delay={0.4} style={{ position: "absolute", left: 120, right: 120, top: 360, display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 2 }}>
        {D.control.map((m, i) => {
          const I = ctlIcons[i];
          return (
            <Item key={m.label} variants={v.up} className="tile top" style={{ padding: "40px 44px", height: 400 }}>
              <I size={36} color="var(--blue-60)" strokeWidth={1.75} />
              <div style={{ font: "300 96px/1 var(--sans)", letterSpacing: "-.03em", marginTop: 60, color: "var(--blue-80)" }}>
                {m.text ? <motion.span variants={v.blur} style={{ display: "inline-block" }}>{m.text}</motion.span> : <Counter to={m.to} decimals={m.decimals || 0} prefix={m.prefix || ""} suffix={m.suffix || ""} delay={0.7} />}
              </div>
              <div style={{ font: "600 24px/1.25 var(--sans)", marginTop: 26 }}>{m.label}</div>
              <div style={{ font: "400 19px/1.35 var(--sans)", color: "var(--gray-60)", marginTop: 8 }}>{m.note}</div>
            </Item>
          );
        })}
      </Group>
      <Item variants={v.up} className="tile" style={{ position: "absolute", left: 120, right: 120, top: 800, padding: "30px 44px", display: "flex", alignItems: "center", gap: 40 }}>
        <div style={{ width: 360 }}>
          <div className="label">Contingencia</div>
          <div style={{ font: "400 24px/1.2 var(--sans)", marginTop: 10 }}>
            Usada <b>43%</b> · disponible <b>57%</b>
          </div>
        </div>
        <div style={{ flex: 1, height: 26, background: "var(--blue-10)" }}>
          <Bar pct={(2.7 / 6.3) * 100} height={26} delay={1.4} />
        </div>
      </Item>
    </Slide>
  );
}
