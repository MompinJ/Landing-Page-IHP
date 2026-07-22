import { FeatureSlide, Action } from '../components/FeatureSlide.jsx'
import { AQUA } from '../theme.js'

const ACTIONS = [
  <Action lead="Catálogo">15 módulos</Action>,
  <Action lead="Contenido">texto, tarjetas y cifras por unidad</Action>,
  <Action lead="Dinámica de repaso">mini-juego, no un quiz</Action>,
]

export default function S05jModulos() {
  return (
    <FeatureSlide
      moduleTitle="Campus HP"
      accent={AQUA}
      subtitle="Módulos"
      description="Cápsulas de e-learning por disciplina: contenido teórico en unidades, con una dinámica interactiva para reforzar lo aprendido."
      actions={ACTIONS}
      videoSrc="./videos/campus-modulos.mp4"
      cameo="wow"
    />
  )
}
