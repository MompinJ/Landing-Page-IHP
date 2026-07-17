import { FeatureSlide, Action } from '../components/FeatureSlide.jsx'

const SKY = '#009BDE'

const ACTIONS = [
  <Action lead="Responder">una vez, con progreso visible</Action>,
  <Action lead="Tipos de pregunta">rating, estrellas, opción o texto</Action>,
  <Action lead="Deadline">fecha límite opcional</Action>,
  <Action lead="Ver mi respuesta">consultarla después</Action>,
  <Action lead="Crear formularios">solo con permiso</Action>,
]

export default function S05eFormularios() {
  return (
    <FeatureSlide
      moduleTitle="Comunidad HP"
      accent={SKY}
      subtitle="Formularios"
      description="Encuestas de satisfacción e institucionales, respondidas una pregunta a la vez, con barra de progreso."
      actions={ACTIONS}
      videoSrc="./videos/comunidad-formularios.mp4"
      cameo="wow"
    />
  )
}
