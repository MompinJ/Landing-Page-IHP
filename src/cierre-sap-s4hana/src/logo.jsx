import { useId } from "react";

// Logotipo de Meridian Motors Group redibujado en vectores a partir del render
// entregado por el equipo (M gris con trazo azul, MERIDIAN / MOTORS GROUP).
// tone: "dark" para fondos azul oscuro, "light" para fondos claros.
// mark: solo el simbolo (M + trazo), sin texto.
export function Logo({ width = 320, tone = "dark", mark = false, style }) {
  const id = useId().replace(/:/g, "");
  const dark = tone === "dark";
  const m = dark ? ["#d5dbe6", "#7c8698"] : ["#5a6272", "#2b3039"];
  const word = dark ? "#ffffff" : "#161616";
  const sub = dark ? "#78a9ff" : "#0f62fe";
  const vb = mark ? "360 70 950 560" : "60 70 1416 850";
  const [, , w, h] = vb.split(" ").map(Number);
  return (
    <svg width={width} height={(width * h) / w} viewBox={vb} style={{ display: "block", ...style }} role="img" aria-label="Meridian Motors Group">
      <defs>
        <linearGradient id={`m${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={m[0]} />
          <stop offset="1" stopColor={m[1]} />
        </linearGradient>
        <linearGradient id={`s${id}`} x1="0" y1="1" x2="1" y2="0">
          <stop offset="0" stopColor="#0f62fe" />
          <stop offset="1" stopColor="#4589ff" />
        </linearGradient>
      </defs>
      <path d="M480 560 V170 L790 425 L1055 170 V560" fill="none" stroke={`url(#m${id})`} strokeWidth="110" strokeLinejoin="miter" strokeMiterlimit="6" />
      <path d="M372 600 C 600 438, 930 300, 1300 290 C 1010 330, 790 452, 640 600 Z" fill={`url(#s${id})`} />
      {!mark && (
        <>
          <text x="768" y="800" textAnchor="middle" fill={word} style={{ font: "800 212px Montserrat, sans-serif", letterSpacing: "6px" }}>
            MERIDIAN
          </text>
          <rect x="80" y="868" width="190" height="14" fill={sub} />
          <rect x="1266" y="868" width="190" height="14" fill={sub} />
          <text x="768" y="898" textAnchor="middle" fill={sub} style={{ font: "600 66px Montserrat, sans-serif", letterSpacing: "26px" }}>
            MOTORS GROUP
          </text>
        </>
      )}
    </svg>
  );
}
