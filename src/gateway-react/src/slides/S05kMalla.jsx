import { FeatureSlide, Action } from '../components/FeatureSlide.jsx'

const AQUA = '#54BBAB'

const ACTIONS = [
  <Action lead="Objetivo">por qué existe y qué cubre</Action>,
  <Action lead="Infografía">roadmap 2025-2027 por disciplina</Action>,
  <Action lead="Diseño del programa">cómo se estructuró</Action>,
]

export default function S05kMalla() {
  return (
    <FeatureSlide
      moduleTitle="Campus HP"
      accent={AQUA}
      subtitle="Malla curricular"
      description="El mapa de contenidos del Instituto: qué disciplinas y materias componen el programa y cómo evoluciona en el tiempo."
      actions={ACTIONS}
      videoSrc="./videos/campus-malla.mp4"
      cameo="care"
    />
  )
}
