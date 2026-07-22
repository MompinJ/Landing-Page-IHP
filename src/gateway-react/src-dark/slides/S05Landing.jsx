import { FeatureSlide } from '../components/FeatureSlide.jsx'
import { SEA_L } from '../theme.js'

// Acento Sea iluminado (el Sea puro se perderia sobre la tinta).
export default function S05Landing() {
  return (
    <FeatureSlide
      moduleTitle="Gateway"
      accent={SEA_L}
      subtitle="La página de inicio"
      description="Un solo usuario y contraseña abren la puerta a Comunidad HP, Campus HP y Reportes HP — sin iniciar sesión por separado en cada uno."
      actions={[
        'Un solo inicio de sesión para todo',
        'Accesos directos a cada módulo',
      ]}
      videoSrc="./videos/gateway-landing.mp4"
    />
  )
}
