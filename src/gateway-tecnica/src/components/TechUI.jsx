// Piezas compartidas por el capitulo tecnico (S09-S16).
// Mantienen el mismo lenguaje del deck: viñeta diagonal a 30.3°, logos al pie,
// paneles planos (sin sombras) y la paleta Hutchison Ports.
import logoHP from '../../assets/hutchisonports-color.png'
import logoInstituto from '../../assets/LogoInstitutoHP-azul.png'

export const C = {
  SEA:     '#002E6D',
  SEAALT:  '#06376E',
  SKY:     '#009BDE',
  AQUA:    '#54BBAB',
  AQUAD:   '#2BA697',
  AQUAL:   '#6FCBBC',
  HORIZON: '#9ACAEB',
  YELLOW:  '#FFC627',
  ORANGE:  '#EE7523',
  BODY:    '#41607F',
  MUTE:    '#7E96B6',
  PANEL:   'rgba(0,46,109,0.045)',
  LINE:    'rgba(0,46,109,0.12)',
}

// Logos al pie, consistentes con el resto del deck.
export function Logos({ side = 'left', d = 1040 }) {
  return (
    <div className="r" style={{
      position: 'absolute', zIndex: 9, bottom: 56, [side]: 112,
      display: 'flex', alignItems: 'center', gap: 34, '--d': d,
    }}>
      <img src={logoInstituto} alt="Instituto Hutchison Ports"
        style={{ height: 46, objectFit: 'contain', display: 'block' }} />
      <img src={logoHP} alt="Hutchison Ports"
        style={{ height: 90, objectFit: 'contain', display: 'block' }} />
    </div>
  )
}

// Viñeta diagonal a 30.3° (el angulo de marca), igual que en S02/S03.
export function DiagBullet({ color = C.AQUA, size = 14, style }) {
  return (
    <span style={{
      width: size, height: size, flexShrink: 0, display: 'inline-block',
      background: color, transform: 'skewX(-30.3deg)', ...style,
    }} />
  )
}

// Etiqueta tipo "chip" para nombres de tecnologia.
export function Chip({ children, color = C.SEA, bg = 'rgba(0,46,109,0.07)' }) {
  return (
    <span style={{
      display: 'inline-block', padding: '9px 17px', borderRadius: 999,
      background: bg, color, fontWeight: 700, fontSize: 19, letterSpacing: '-0.2px',
      whiteSpace: 'nowrap',
    }}>
      {children}
    </span>
  )
}

// Item de lista: viñeta diagonal + titulo en negrita + descriptor opcional.
export function Item({ title, line, color = C.AQUA, titleColor = C.SEA }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 15 }}>
      <DiagBullet color={color} size={13} style={{ marginTop: 7 }} />
      <div>
        <span style={{ color: titleColor, fontWeight: 800, fontSize: 20, letterSpacing: '-0.3px' }}>
          {title}
        </span>
        {line && (
          <span style={{ color: C.BODY, fontWeight: 500, fontSize: 18 }}>
            {' — '}{line}
          </span>
        )}
      </div>
    </div>
  )
}

// Encabezado de columna: icono de linea + titulo.
export function ColHead({ icon, color, children }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 22 }}>
      <svg viewBox="0 0 48 48" width={46} height={46}
        style={{ color, flexShrink: 0, display: 'block' }} aria-hidden>
        {icon}
      </svg>
      <div style={{ color: C.SEA, fontWeight: 800, fontSize: 27, letterSpacing: '-0.5px' }}>
        {children}
      </div>
    </div>
  )
}

// Fila editorial (sin caja): icono grande + nombre + descriptor.
// Mismo patron que los modulos/beneficios de las slides de negocio.
export function Row({ icon, name, line, color = C.AQUAD, d }) {
  return (
    <div className="rs" style={{ display: 'flex', alignItems: 'flex-start', gap: 22, '--d': d }}>
      <svg viewBox="0 0 48 48" width={56} height={56}
        style={{ color, flexShrink: 0, display: 'block', marginTop: 1 }} aria-hidden>
        {icon}
      </svg>
      <div>
        <div style={{ color: C.SEA, fontWeight: 800, fontSize: 28, letterSpacing: '-0.4px' }}>{name}</div>
        <div style={{ color: C.BODY, fontWeight: 500, fontSize: 20, marginTop: 4, lineHeight: 1.4 }}>{line}</div>
      </div>
    </div>
  )
}

// Pie de nota editorial (sin caja): viñeta diagonal + etiqueta + texto.
export function Footnote({ label, color = C.AQUAD, maxWidth = 1080, children }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
      <DiagBullet color={color} size={16} style={{ marginTop: 7 }} />
      <div style={{ maxWidth }}>
        <span style={{
          color, fontWeight: 800, fontSize: 14, letterSpacing: '2px',
          textTransform: 'uppercase', marginRight: 14,
        }}>
          {label}
        </span>
        <span style={{ color: C.SEA, fontWeight: 600, fontSize: 21, lineHeight: 1.45 }}>
          {children}
        </span>
      </div>
    </div>
  )
}
