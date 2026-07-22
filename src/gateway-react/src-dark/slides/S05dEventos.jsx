import { FeatureSlide, Action } from '../components/FeatureSlide.jsx'
import { SKY } from '../theme.js'

const ACTIONS = [
  <Action lead="Ver eventos">propios o globales</Action>,
  <Action lead="Crear eventos">título, fecha y lugar</Action>,
  <Action lead="Lo que pasó">reseña con fotos</Action>,
]

export default function S05dEventos() {
  return (
    <FeatureSlide
      moduleTitle="Comunidad HP"
      accent={SKY}
      subtitle="Eventos"
      description="Calendario de eventos corporativos, sociales y de capacitación — un vistazo de qué pasa en el grupo, sin confirmar asistencia."
      actions={ACTIONS}
      videoSrc="./videos/comunidad-eventos.mp4"
      cameo="laugh"
    />
  )
}
