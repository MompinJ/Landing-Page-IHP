import { useThree } from '@react-three/fiber'
import { useMemo } from 'react'

// Detecta telefonos y tablets. Se evalua una sola vez al cargar.
export const esMovil =
  typeof window !== 'undefined' &&
  window.matchMedia('(max-width: 860px), (pointer: coarse)').matches

export const menosMovimiento =
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches

// Distancia a la que la camara "se para" frente a cada foto.
export const DISTANCIA_FOTO = 7

// Cuanto avanza la camara de principio a fin del scroll.
export const RECORRIDO = 50

// Numero de pantallas: portada + 4 fotos + mensaje final.
export const PAGINAS = 6

// Posicion de la camara en el eje Z para un avance de scroll dado (0 a 1).
export function camaraZ(avance) {
  return 6 - avance * RECORRIDO
}

// Z de cada foto: justo delante de donde se detiene la camara en su pagina.
export function fotoZ(indice) {
  return camaraZ((indice + 1) / (PAGINAS - 1)) - DISTANCIA_FOTO
}

export const CONSTELACION_Z = camaraZ(1) - 8.5

// Alto y ancho visibles a la distancia de las fotos, en unidades de mundo.
export function useMedidas() {
  const camara = useThree((s) => s.camera)
  const tamano = useThree((s) => s.size)

  return useMemo(() => {
    const alto = 2 * DISTANCIA_FOTO * Math.tan((camara.fov * Math.PI) / 360)
    const ancho = alto * (tamano.width / tamano.height)
    return { alto, ancho }
  }, [camara.fov, tamano.width, tamano.height])
}
