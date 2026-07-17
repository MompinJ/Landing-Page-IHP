import { FeatureSlide } from '../components/FeatureSlide.jsx'

const SEA = '#002E6D'

export default function S05Landing() {
  return (
    <FeatureSlide
      moduleTitle="Gateway"
      accent={SEA}
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
