import { FeatureSlide, Action } from '../components/FeatureSlide.jsx'

const AQUAD = '#2BA697'

// Pasada rapida: el video hace la mayor parte del trabajo, solo un vistazo
// a grandes rasgos de lo que ya existe.
const ACTIONS = [
  <Action lead="Dashboard">KPIs, cumplimiento y rankings</Action>,
  <Action lead="Consultas">estado por usuario</Action>,
  <Action lead="Generar reportes">PDF y Excel</Action>,
]

export default function S05mReportes() {
  return (
    <FeatureSlide
      moduleTitle="Reportes HP"
      accent={AQUAD}
      description="Métricas y calificaciones en un tablero centralizado — para decidir con datos, no a ciegas."
      actions={ACTIONS}
      videoSrc="./videos/reportes-hp.mp4"
      cameo="love"
    />
  )
}
