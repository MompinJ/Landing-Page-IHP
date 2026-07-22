import { FeatureSlide, Action } from '../components/FeatureSlide.jsx'
import { SKY } from '../theme.js'

const ACTIONS = [
  <Action lead="Crear ticket">categoría, título y prioridad</Action>,
  <Action lead="Folio único">se genera automático</Action>,
  <Action lead="Seguimiento">abierto → proceso → resuelto</Action>,
  <Action lead="Responder">si piden más info</Action>,
  <Action lead="Mis tickets">historial y estado</Action>,
]

export default function S05gSoporte() {
  return (
    <FeatureSlide
      moduleTitle="Comunidad HP"
      accent={SKY}
      subtitle="Soporte"
      description="Sistema de tickets internos para reportar problemas o pedir ayuda sobre el hub, con folio y seguimiento."
      actions={ACTIONS}
      videoSrc="./videos/comunidad-soporte.mp4"
      cameo="salute"
    />
  )
}
