import { useEffect, useState } from 'react'
import { useProgress } from '@react-three/drei'
import { contenido } from '../contenido'

// Puerta de entrada: espera a que carguen las fotos y deja que ella
// decida cuando empieza. Tambien evita el primer cuadro en negro.
export default function Portada({ onEntrar }) {
  const { active, progress } = useProgress()
  const [listo, setListo] = useState(false)
  const [saliendo, setSaliendo] = useState(false)

  useEffect(() => {
    // Un respiro minimo para que no parpadee en conexiones rapidas
    if (!active && progress >= 100) {
      const id = setTimeout(() => setListo(true), 600)
      return () => clearTimeout(id)
    }
  }, [active, progress])

  const entrar = () => {
    setSaliendo(true)
    setTimeout(onEntrar, 900)
  }

  return (
    <div className={`portada ${saliendo ? 'portada--fuera' : ''}`}>
      <div className="portada__centro">
        <p className="antetitulo">para ti</p>
        <h1 className="nombre nombre--portada">{contenido.intro.nombre}</h1>
        <span className="filete" />

        {listo ? (
          <button className="boton" onClick={entrar}>
            <span>abrir</span>
          </button>
        ) : (
          <div className="cargando">
            <span className="cargando__barra">
              <span className="cargando__relleno" style={{ transform: `scaleX(${progress / 100})` }} />
            </span>
            <span className="cargando__texto">encendiendo las estrellas</span>
          </div>
        )}
      </div>
    </div>
  )
}
