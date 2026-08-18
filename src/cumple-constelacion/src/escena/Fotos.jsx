import { useMemo } from 'react'
import { useTexture } from '@react-three/drei'
import * as THREE from 'three'

import Foto from './Foto'
import { contenido } from '../contenido'
import { esMovil, fotoZ, useMedidas } from '../util/medidas'

export default function Fotos() {
  const { alto: altoVisible, ancho: anchoVisible } = useMedidas()

  const rutas = useMemo(
    () => contenido.fotos.map((f) => import.meta.env.BASE_URL + f.src),
    []
  )

  // Se cargan todas juntas para poder medirlas antes de dibujar nada
  const texturas = useTexture(rutas)

  const colocadas = useMemo(() => {
    return contenido.fotos.map((foto, i) => {
      const textura = texturas[i]

      textura.anisotropy = 4
      textura.minFilter = THREE.LinearMipmapLinearFilter
      textura.generateMipmaps = true
      textura.needsUpdate = true

      // El marco toma la proporcion real del archivo: asi ninguna foto se
      // recorta sola. Para recortar a proposito estan zoom y centro.
      const img = textura.image
      const aspecto = img && img.width && img.height ? img.width / img.height : 3 / 4

      // Cuanto espacio de pantalla puede ocupar el marco. En movil manda el
      // texto: los recuerdos son largos y necesitan mas de media pantalla,
      // asi que la foto cede altura.
      const altoMaximo = altoVisible * (esMovil ? 0.34 : 0.6)
      const anchoMaximo = anchoVisible * (esMovil ? 0.72 : 0.34)

      let ancho = anchoMaximo
      let alto = ancho / aspecto
      if (alto > altoMaximo) {
        alto = altoMaximo
        ancho = alto * aspecto
      }

      // En movil la foto va arriba y el texto debajo. Se ancla por el canto
      // de abajo, no por el centro: si se centrara, una foto horizontal
      // quedaria flotando con un hueco enorme hasta el texto.
      // En pantalla grande se alternan los lados y va centrada.
      const x = esMovil ? 0 : (i % 2 === 0 ? -1 : 1) * (anchoVisible * 0.19)
      const y = esMovil ? alto / 2 + altoVisible * 0.06 : 0.1

      return {
        textura,
        aspectoImagen: aspecto,
        ancho,
        alto,
        posicion: [x, y, fotoZ(i)],
        indice: i,
        zoom: foto.zoom ?? 1,
        centro: foto.centro ?? [0.5, 0.5],
      }
    })
  }, [texturas, altoVisible, anchoVisible])

  return (
    <>
      {colocadas.map((foto) => (
        <Foto key={foto.indice} {...foto} />
      ))}
    </>
  )
}
