import { FeatureSlide, Action } from '../components/FeatureSlide.jsx'
import { YELLOW } from '../theme.js'

const ACTIONS = [
  <Action lead="Línea de tiempo">todas las ediciones</Action>,
  <Action lead="Detalle de congreso">galería, podio y proyectos</Action>,
  <Action lead="Detalle de proyecto">objetivo, impacto y equipo</Action>,
  <Action lead="Ganador de Calidad Total">unidad ganadora y métricas</Action>,
  <Action lead="Entregables">centralizados por proyecto</Action>,
  <Action lead="Herramientas">builder para nuevos congresos</Action>,
]

export default function S05nMejoraContinua() {
  return (
    <FeatureSlide
      moduleTitle="Mejora continua"
      accent={YELLOW}
      subtitle="Congreso de Calidad"
      description="El archivo histórico del Congreso Anual de Calidad: cada edición reúne los proyectos presentados, los premios otorgados y la unidad de negocio ganadora."
      actions={ACTIONS}
      videoSrc="./videos/mejora-continua.mp4"
      cameo="laugh"
    />
  )
}
