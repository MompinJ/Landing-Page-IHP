// Anillo de puntos que orbita alrededor de un centro.
// El componente se monta centrado en el punto (0,0) del padre — usar
// position:absolute + top:50% + left:50% en el wrapper para centrar.

export function OrbitRing({
  radius,        // px desde el centro hasta los dots
  count,         // numero de dots
  dotSize = 5,   // diametro del dot en px
  color = '#54BBAB',
  duration = 24, // segundos para una vuelta completa
  reverse = false,
  // fracciones de opacidad que se ciclan entre dots (da efecto de cola)
  opacities = [1, 0.7, 0.45, 0.25, 0.12],
}) {
  const dots = Array.from({ length: count }, (_, i) => {
    const angle  = (i / count) * Math.PI * 2
    // posicion dentro del div radius*2 x radius*2
    const cx     = radius + radius * Math.cos(angle)
    const cy     = radius + radius * Math.sin(angle)
    const op     = opacities[i % opacities.length]
    return { cx, cy, op }
  })

  return (
    <div style={{
      position:  'absolute',
      width:     radius * 2,
      height:    radius * 2,
      top:       '50%',
      left:      '50%',
      marginTop: -radius,
      marginLeft:-radius,
      animation: `${reverse ? 'orbit-ccw' : 'orbit-cw'} ${duration}s linear infinite`,
    }}>
      {dots.map(({ cx, cy, op }, i) => (
        <span key={i} style={{
          position:     'absolute',
          left:         cx - dotSize / 2,
          top:          cy - dotSize / 2,
          width:        dotSize,
          height:       dotSize,
          borderRadius: '50%',
          background:   color,
          opacity:      op,
          display:      'block',
        }} />
      ))}
    </div>
  )
}
