import { FeatureSlide, Action } from '../components/FeatureSlide.jsx'
import { SKY } from '../theme.js'

const ACTIONS = [
  <Action lead="Publicar">título, contenido e imagen</Action>,
  <Action lead="Noticia Estelar">la más relevante, arriba sola</Action>,
  <Action lead="Vigencia">de 1 a 7 días</Action>,
  <Action lead="Dos secciones">Comunidad y Puerto</Action>,
  <Action lead="Portuario">centralizado y al día</Action>,
]

export default function S05cNoticias() {
  return (
    <FeatureSlide
      moduleTitle="Comunidad HP"
      accent={SKY}
      subtitle="Noticias"
      description="El canal de comunicados oficiales, donde lo más relevante se destaca solo según quién lo emite y su vigencia."
      actions={ACTIONS}
      videoSrc="./videos/comunidad-noticias.mp4"
      cameo="love"
    />
  )
}
