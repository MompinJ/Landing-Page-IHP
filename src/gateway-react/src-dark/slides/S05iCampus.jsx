import { FeatureSlide, Action } from '../components/FeatureSlide.jsx'
import { AQUA } from '../theme.js'

const ACTIONS = [
  <Action lead="Mis cursos">catálogo de inscritos</Action>,
  <Action lead="Entrar al aula">sesiones, recursos y tareas</Action>,
  <Action lead="Diplomados">credenciales visibles</Action>,
  <Action lead="Vistas">alumno y docente</Action>,
]

export default function S05iCampus() {
  return (
    <FeatureSlide
      moduleTitle="Campus HP"
      accent={AQUA}
      subtitle="Campus"
      description="El campus virtual: catálogo de cursos y el aula de cada uno, con sesiones, recursos y tareas."
      actions={ACTIONS}
      videoSrc="./videos/campus-campus.mp4"
      cameo="laugh"
    />
  )
}
