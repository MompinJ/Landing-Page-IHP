import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { runtime } from '../runtime'
import { deckAt } from '../course'
import { PLAYER_Z, COLORS } from '../constants'

// LA GRUA QUE TE IZA.
//
// Es el equivalente portuario del jetpack: mientras dura el vuelo, un portico
// corre a la par del corredor, su carro se coloca sobre su carril y el
// cabestrante lo lleva colgado por encima de todo lo que hay en pista.
//
// Se dibuja aparte del escenario y del curso porque no ocupa un metro concreto:
// existe solo mientras hay un vuelo, y va donde va el corredor. Todo cuelga de
// tres numeros que ya conoce el juego -- el carril (runtime.x), la altura
// (runtime.y) y el suelo de ese metro --, asi que el gancho no puede
// desincronizarse de quien lleva colgando.
//
// DONDE MIRA LA CAMARA, Y POR QUE ESTO SE DIBUJA COMO SE DIBUJA.
//
// La camara va a cuatro metros y pico y encuadra la pista: a la altura del
// corredor, el borde de arriba del cuadro cae sobre los ocho metros y medio.
// O sea que el portico -- veinte metros, patas a quince a cada lado -- NO SE VE
// NUNCA mientras te lleva, y no hay altura a la que ponerlo que lo arregle:
// bajarlo hasta que entre en cuadro seria plantarlo encima de la cabeza, y ahi
// ya no es una grua, es un techo.
//
// Asi que lo que se dibuja con detalle es lo unico que de verdad esta en cuadro:
// EL MOTON Y EL GANCHO, justo encima del corredor, con sus dos cables subiendo
// y saliendose por arriba. Un cable que se pierde fuera del cuadro cuenta la
// grua entera sin tener que ensenarla. El portico sigue ahi arriba porque
// existe -- y porque se le ve la sombra pasar --, pero no es el que tiene que
// convencer a nadie.
//
// SE AGARRA UNA BARRA, NO UN ARO, y esto costo dos intentos.
//
// El gancho colgaba a tres metros del suelo -- metro y pico por encima de las
// manos -- y el izado se leia como un muneco flotando con los brazos en alto y
// una caja naranja suelta por encima, sin tocarse. Pero bajarlo hasta las manos
// tampoco valia: con los brazos levantados las manos llegan a 1.73, y ahi un
// aro horizontal le queda al muneco alrededor del casco, como un flotador. Es
// que no cabe: la cabeza y el casco ocupan de 1.42 a 1.95, o sea justo la
// altura a la que llegan las manos.
//
// Lo que si cabe es una BARRA. Cruza a la altura de las manos y un palmo por
// detras del pecho -- que es donde estan --, pasa por detras de la cabeza sin
// rodearla porque es delgada, y de ella cuelgan las eslingas al gancho, que ya
// va por encima del casco. Ademas es lo que se agarra de verdad cuando a uno lo
// iza una grua.
//
// El portico entra y sale con una fundida corta. Sin ella aparece de golpe un
// edificio de veinte metros sobre la cabeza del jugador en el fotograma en que
// toca el gancho, y eso se lee como un fallo de dibujo, no como una grua.

const BEAM_Y = 20.5 // altura de la viga sobre el suelo
const SPAN = 15.5 // medio ancho del portico
// Altura de la barra sobre los pies del corredor: la de sus manos con los
// brazos en alto. Sale de la pose del izado en Player (hombro a 1.3, brazo de
// 0.48 girado 2.7 rad), asi que si aquella cambia, esta tiene que cambiar con
// ella. Las manos van a x = +-0.36, o sea dentro del largo de la barra.
const BARRA_Y = 1.78
const ARO_Z = 0.2 // las manos quedan un palmo por detras del pecho
const CABLE_X = 0.24 // separacion de los dos ramales de cable

export function CraneLift() {
  const group = useRef()
  const carro = useRef()
  const cables = useRef()
  const gancho = useRef()
  const fade = useRef(0)
  const mats = useRef([])

  useFrame((_, dt0) => {
    const dt = Math.min(dt0, 0.05)
    const g = group.current
    if (!g) return

    const objetivo = runtime.flying ? 1 : 0
    fade.current += (objetivo - fade.current) * Math.min(1, dt * 6)
    const a = fade.current
    g.visible = a > 0.02
    if (!g.visible) return
    for (const m of mats.current) if (m) m.opacity = a

    const suelo = deckAt(runtime.distance)
    g.position.set(0, suelo, PLAYER_Z)

    // el carro corre por la viga hasta ponerse sobre el carril del corredor:
    // es lo que explica por que el cable cuelga siempre recto
    const pies = runtime.deck + runtime.y - suelo
    if (carro.current) carro.current.position.x = runtime.x
    if (gancho.current) gancho.current.position.set(runtime.x, pies, ARO_Z)
    if (cables.current) {
      // los dos ramales van del moton al carro: miden un metro y se estiran
      const desde = pies + 3.05
      const alto = Math.max(0.4, BEAM_Y - 1.5 - desde)
      cables.current.position.set(runtime.x, desde, ARO_Z)
      cables.current.scale.y = alto
    }
  })

  // Las piezas nacen transparentes y solo cambia la opacidad: alternar
  // `transparent` en caliente obliga a recompilar el programa de cada material,
  // y eso seria un tiron cada vez que empieza o acaba un vuelo.
  const reg = (i) => (m) => (mats.current[i] = m)

  return (
    <group ref={group} visible={false} userData={{ noShadow: true, noDress: true }}>
      {/* viga principal del portico */}
      <mesh position={[0, BEAM_Y, 0]}>
        <boxGeometry args={[SPAN * 2, 1.1, 1.7]} />
        <meshStandardMaterial ref={reg(0)} color="#f5c518" metalness={0.5} roughness={0.5} transparent opacity={0} />
      </mesh>
      <mesh position={[0, BEAM_Y - 0.85, 0]}>
        <boxGeometry args={[SPAN * 2, 0.35, 1.2]} />
        <meshStandardMaterial ref={reg(1)} color="#c9a12e" metalness={0.5} roughness={0.6} transparent opacity={0} />
      </mesh>

      {/* patas: sin ellas la viga parece flotar y no se lee como grua */}
      {[-1, 1].map((sx, i) => (
        <group key={sx}>
          <mesh position={[sx * SPAN, BEAM_Y / 2, 0]}>
            <boxGeometry args={[0.9, BEAM_Y, 0.9]} />
            <meshStandardMaterial
              ref={reg(2 + i)}
              color="#e6ecf2"
              metalness={0.4}
              roughness={0.55}
              transparent
              opacity={0}
            />
          </mesh>
          <mesh position={[sx * SPAN, 0.35, 0]}>
            <boxGeometry args={[1.7, 0.7, 3.2]} />
            <meshStandardMaterial
              ref={reg(4 + i)}
              color="#39424a"
              metalness={0.4}
              roughness={0.7}
              transparent
              opacity={0}
            />
          </mesh>
        </group>
      ))}

      {/* carro del cabestrante */}
      <mesh ref={carro} position={[0, BEAM_Y - 1.25, 0]}>
        <boxGeometry args={[2.2, 0.8, 1.9]} />
        <meshStandardMaterial ref={reg(6)} color="#2a2f36" metalness={0.6} roughness={0.4} transparent opacity={0} />
      </mesh>

      {/* Los dos ramales del cable. Van en pareja y no solo: un cabrestante de
          verdad tiene la carga reenviada por poleas, y ademas dos lineas se ven
          y una sola se pierde contra el cielo. Miden 1 m y se estiran. */}
      <group ref={cables} position={[0, 10, 0]}>
        {[-CABLE_X, CABLE_X].map((x) => (
          <mesh key={x} position={[x, 0.5, 0]}>
            <cylinderGeometry args={[0.045, 0.045, 1, 6]} />
            <meshStandardMaterial
              ref={reg(x < 0 ? 7 : 8)}
              color="#aab3bb"
              metalness={0.8}
              roughness={0.35}
              transparent
              opacity={0}
            />
          </mesh>
        ))}
      </group>

      {/* ---- MOTON, GANCHO Y BARRA ----
          Lo unico de la grua que se ve de cerca, asi que va con la pieza
          completa: chapas laterales, las dos poleas por las que entra el cable,
          la tuerca giratoria, el gancho -- por encima del casco -- y la barra
          de la que tiran las manos. */}
      <group ref={gancho}>
        {/* chapas del moton */}
        <mesh position={[0, 2.72, 0]}>
          <boxGeometry args={[0.62, 0.66, 0.26]} />
          <meshStandardMaterial
            ref={reg(9)}
            color="#f5c518"
            metalness={0.55}
            roughness={0.4}
            transparent
            opacity={0}
          />
        </mesh>
        {/* franjas negras: es lo que hace que se lea como aparejo de carga */}
        {[-0.18, 0.18].map((x) => (
          <mesh key={x} position={[x, 2.72, 0.14]}>
            <boxGeometry args={[0.1, 0.66, 0.02]} />
            <meshStandardMaterial
              ref={reg(x < 0 ? 10 : 11)}
              color="#20242a"
              metalness={0.3}
              roughness={0.6}
              transparent
              opacity={0}
            />
          </mesh>
        ))}
        {/* las dos poleas asomando por los costados */}
        {[-0.34, 0.34].map((x) => (
          <mesh key={x} position={[x, 2.88, 0]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.19, 0.19, 0.1, 12]} />
            <meshStandardMaterial
              ref={reg(x < 0 ? 12 : 13)}
              color="#39424a"
              metalness={0.7}
              roughness={0.3}
              transparent
              opacity={0}
            />
          </mesh>
        ))}
        {/* tuerca giratoria y vastago */}
        <mesh position={[0, 2.32, 0]}>
          <cylinderGeometry args={[0.15, 0.15, 0.14, 10]} />
          <meshStandardMaterial
            ref={reg(14)}
            color="#8d949b"
            metalness={0.8}
            roughness={0.3}
            transparent
            opacity={0}
          />
        </mesh>
        {/* EL GANCHO, por encima del casco: aqui si cabe un aro. Va de canto
            hacia la camara, que es como se ve un gancho desde atras. */}
        <mesh position={[0, 2.12, 0]}>
          <torusGeometry args={[0.17, 0.06, 8, 16, Math.PI * 1.5]} />
          <meshStandardMaterial
            ref={reg(15)}
            color="#e0b32e"
            metalness={0.75}
            roughness={0.3}
            transparent
            opacity={0}
          />
        </mesh>
        {/* eslingas del gancho a los extremos de la barra */}
        {[-1, 1].map((sx) => (
          <mesh key={sx} position={[sx * 0.26, 1.95, ARO_Z / 2]} rotation={[0, 0, sx * 0.5]}>
            <cylinderGeometry args={[0.035, 0.035, 0.42, 6]} />
            <meshStandardMaterial
              ref={reg(sx < 0 ? 16 : 17)}
              color="#aab3bb"
              metalness={0.8}
              roughness={0.35}
              transparent
              opacity={0}
            />
          </mesh>
        ))}
        {/* LA BARRA: lo que agarran las manos */}
        <mesh position={[0, BARRA_Y, ARO_Z]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.055, 0.055, 1.05, 10]} />
          <meshStandardMaterial
            ref={reg(18)}
            color="#e0b32e"
            metalness={0.7}
            roughness={0.35}
            transparent
            opacity={0}
          />
        </mesh>
        {/* topes de los extremos, para que la barra no se lea como un palo */}
        {[-0.52, 0.52].map((x) => (
          <mesh key={x} position={[x, BARRA_Y, ARO_Z]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.085, 0.085, 0.08, 10]} />
            <meshStandardMaterial
              ref={reg(x < 0 ? 19 : 20)}
              color="#20242a"
              metalness={0.5}
              roughness={0.5}
              transparent
              opacity={0}
            />
          </mesh>
        ))}
        {/* baliza del moton: da el punto de luz que sigue al corredor */}
        <mesh position={[0, 3.12, 0]}>
          <sphereGeometry args={[0.12, 8, 8]} />
          <meshBasicMaterial ref={reg(21)} color={COLORS.amber} transparent opacity={0} />
        </mesh>
      </group>
    </group>
  )
}
