// Isotipo Gateway: arco-portal con flecha ascendente
// stroke only, nunca fill — canónico del design spec
export function GatewayMark({ size = 96, color = '#54BBAB', strokeWidth = 5.5, style }) {
  return (
    <svg
      viewBox="0 0 96 96"
      width={size}
      height={size}
      style={{ display: 'block', color, flexShrink: 0, ...style }}
    >
      <g fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinejoin="round" strokeLinecap="round">
        <path d="M22 80 V52 A26 26 0 0 1 74 52 V80" />
        <path d="M34 80 V55 A14 14 0 0 1 62 55 V80" strokeOpacity="0.5" />
        <path d="M48 80 V37 M40.5 47 L48 37 L55.5 47" strokeWidth={strokeWidth * 0.73} />
      </g>
    </svg>
  )
}

// Wordmark "gateway" con color partido gate/way
export function GatewayWordmark({
  gateColor = '#002E6D',
  wayColor  = '#54BBAB',
  fontSize  = 80,
  style,
}) {
  return (
    <span style={{
      fontFamily: "'Montserrat', Arial, sans-serif",
      fontWeight: 800,
      fontSize,
      letterSpacing: `${-fontSize * 0.045}px`,
      lineHeight: 1,
      display: 'inline-block',
      ...style,
    }}>
      <span style={{ color: gateColor }}>gate</span>
      <span style={{ color: wayColor }}>way</span>
    </span>
  )
}

// Logo horizontal completo
export function GatewayLogo({
  size         = 64,
  gateColor    = '#002E6D',
  wayColor     = '#54BBAB',
  markColor    = '#54BBAB',
  wordmarkSize,
  style,
}) {
  const ws = wordmarkSize ?? size * 1.15
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: size * 0.18, ...style }}>
      <GatewayMark size={size} color={markColor} />
      <GatewayWordmark gateColor={gateColor} wayColor={wayColor} fontSize={ws} />
    </div>
  )
}

// Versión negativa (sobre fondo oscuro)
export function GatewayLogoNeg({ size = 64, wordmarkSize, style }) {
  return (
    <GatewayLogo
      size={size}
      gateColor="#ffffff"
      wayColor="#6FCBBC"
      markColor="#ffffff"
      wordmarkSize={wordmarkSize}
      style={style}
    />
  )
}
