import { FeatureSlide, Action } from '../components/FeatureSlide.jsx'
import { AQUA } from '../theme.js'

const ACTIONS = [
  <Action lead="Manuales">9 documentos, vista y descarga</Action>,
  <Action lead="Evaluaciones">material asociado</Action>,
  <Action lead="Dinámicas">ejercicios de repaso</Action>,
  <Action lead="Storyboard">guion visual</Action>,
]

export default function S05lRepositorios() {
  return (
    <FeatureSlide
      moduleTitle="Campus HP"
      accent={AQUA}
      subtitle="Repositorios"
      description="El primer repositorio de Campus HP — hoy con manuales de mantenimiento, pensado para crecer y alojar todo el conocimiento técnico disperso del grupo."
      actions={ACTIONS}
      videoSrc="./videos/campus-repositorios.mp4"
      cameo="salute"
    />
  )
}
