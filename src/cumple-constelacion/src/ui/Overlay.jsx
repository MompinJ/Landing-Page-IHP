import { Fragment, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useScroll } from '@react-three/drei'
import * as THREE from 'three'

import { contenido } from '../contenido'
import { PAGINAS, esMovil } from '../util/medidas'

// Cada seccion aparece cuando su pagina esta centrada en pantalla.
function Seccion({ indice, className = '', children }) {
  const caja = useRef()
  const scroll = useScroll()

  useFrame(() => {
    if (!caja.current) return

    const centro = indice / (PAGINAS - 1)
    const distancia = Math.abs(scroll.offset - centro)
    const crudo = 1 - THREE.MathUtils.clamp(distancia / 0.14, 0, 1)
    const visible = crudo * crudo * (3 - 2 * crudo)

    caja.current.style.opacity = visible
    caja.current.style.transform = `translate3d(0, ${(1 - visible) * 24}px, 0)`
    caja.current.style.pointerEvents = visible > 0.6 ? 'auto' : 'none'
  })

  return (
    <section className={`pagina ${className}`}>
      <div className="bloque" ref={caja}>
        {children}
      </div>
    </section>
  )
}

// Version espejo: en vez del recuerdo salen las barras del tachon.
// Cada palabra se convierte en una barra del ancho que le tocaria, y el
// texto no se dibuja: no hay nada que seleccionar ni copiar en la pagina.
function TextoTachado({ texto }) {
  const palabras = texto.split(/\s+/).filter(Boolean)

  return (
    <p className="texto texto--tachado" aria-label="Recuerdo censurado">
      {palabras.map((palabra, i) => (
        <Fragment key={i}>
          {i > 0 ? ' ' : null}
          <span className="tachon" style={{ '--letras': palabra.length }} />
        </Fragment>
      ))}
    </p>
  )
}

export default function Overlay({ visible, censura = false }) {
  const { intro, fotos, mensaje } = contenido

  return (
    <div className={`paginas ${visible ? '' : 'paginas--ocultas'}`}>
      <Seccion indice={0} className="pagina--intro">
        <p className="antetitulo">{intro.antetitulo}</p>
        <h1 className="nombre">{intro.nombre}</h1>
        <span className="filete" />
        <p className="subtitulo">{intro.subtitulo}</p>
        <p className="invitacion">
          <span className="invitacion__linea" />
          {intro.invitacion}
        </p>
      </Seccion>

      {fotos.map((foto, i) => (
        <Seccion
          key={i}
          indice={i + 1}
          className={`pagina--foto ${!esMovil && i % 2 === 0 ? 'pagina--derecha' : ''} ${
            !esMovil && i % 2 === 1 ? 'pagina--izquierda' : ''
          }`}
        >
          <p className="indice">{String(i + 1).padStart(2, '0')}</p>
          <h2 className="titulo">{foto.titulo}</h2>
          <span className="filete filete--corto" />
          {censura ? <TextoTachado texto={foto.texto} /> : <p className="texto">{foto.texto}</p>}
        </Seccion>
      ))}

      <Seccion indice={PAGINAS - 1} className="pagina--final">
        {mensaje.antetitulo ? <p className="antetitulo">{mensaje.antetitulo}</p> : null}
        <div className="mensaje">
          {mensaje.parrafos.map((parrafo, i) => (
            <p key={i}>{parrafo}</p>
          ))}
        </div>
        <span className="filete filete--corto" />
        <p className="firma">{mensaje.firma}</p>
      </Seccion>
    </div>
  )
}
