import { FeatureSlide, Action } from '../components/FeatureSlide.jsx'
import { AQUA } from '../theme.js'

const ACTIONS = [
  <Action lead="Hero">logo y bienvenida</Action>,
  <Action lead="Objetivo y beneficios">qué gana el colaborador</Action>,
  <Action lead="15 módulos">en 6 disciplinas</Action>,
  <Action lead="Cifras y CTA">acceso directo al catálogo</Action>,
]

export default function S05hInstituto() {
  return (
    <FeatureSlide
      moduleTitle="Campus HP"
      accent={AQUA}
      subtitle="Instituto"
      description="La landing informativa del Instituto: la oferta de capacitación en formato dossier, solo lectura y navegación."
      actions={ACTIONS}
      videoSrc="./videos/campus-instituto.mp4"
      cameo="love"
    />
  )
}
