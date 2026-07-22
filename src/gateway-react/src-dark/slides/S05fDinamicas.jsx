import { FeatureSlide, Action } from '../components/FeatureSlide.jsx'
import { SKY } from '../theme.js'

const ACTIONS = [
  <Action lead="Diarias">palabra del día y rompecabezas</Action>,
  <Action lead="Semanales">5 tipos de juego</Action>,
  <Action lead="Racha">con un día de gracia</Action>,
  <Action lead="Tablero">ranking por puntos</Action>,
]

export default function S05fDinamicas() {
  return (
    <FeatureSlide
      moduleTitle="Comunidad HP"
      accent={SKY}
      subtitle="Dinámicas"
      description="Mini juegos diarios y semanales que premian la participación con puntos y rachas."
      actions={ACTIONS}
      videoSrc="./videos/comunidad-dinamicas.mp4"
      cameo="care"
    />
  )
}
