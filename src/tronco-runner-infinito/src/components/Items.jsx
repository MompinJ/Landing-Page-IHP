import { memo, useEffect, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { Text } from '@react-three/drei'
import fontBold from '@fontsource/montserrat/files/montserrat-latin-800-normal.woff'
import { useGame } from '../store'
import { runtime, scroll } from '../runtime'
import { sfx } from '../audio'
import { LANES, PLAYER_Z, VIEW_AHEAD, COLORS } from '../constants'
import { COURSE, rodado } from '../course'

// Los objetos recogibles viven en coordenadas de mundo fijas (zw); el scroll
// compartido los acerca al jugador. Posicion real en escena = zw + scroll.s
//
// Hay dos clases y cada una dice algo distinto de un vistazo:
//   'good' / 'bad'  hexagono con una palabra del glosario, +10 / -10. Son los
//                   mismos arriba que abajo: los que se recogen corriendo por
//                   el techo de un camion o colgado del gancho de la grua no
//                   son otra cosa, son MAS DE LO MISMO. Aqui hubo monedas y
//                   estaban mal -- metian un segundo recogible con su propio
//                   color y su propio contador en un juego cuyo motivo entero
//                   es que la gente lea el vocabulario del Tronco Comun.
//   'lift'          el gancho de la grua, que engancha al corredor y lo sube
//   'shield'        el casco reforzado, que aguanta un choque y desaparece
const SYMBOL = '#04122b'

// La escena esta muy iluminada (ambient + hemi + dos direccionales), asi que
// COLORS.good/bad puros salian lavados a menta y salmon. Estos tonos son mas
// profundos a proposito: con esa luz encima terminan en el verde/rojo de marca.
const FACE = { good: '#12934e', bad: '#c01f31' }

// Recogida, comun a las dos clases. La ventana vertical es lo que impide cobrar
// desde abajo lo que esta arriba: las fichas del techo de un camion no se
// recogen desde el asfalto, ni las del vuelo desde el suelo.
function alcanza(item) {
  const dx = Math.abs(LANES[item.lane] - runtime.x)
  const dh = runtime.deck + runtime.y - item.dy
  return dx < 1.0 && dh < 1.15 && dh > -1.2
}

// memo, por lo mismo que los obstaculos: la ventana avanza varias veces por
// segundo y sin esto se reconciliaban las veinte fichas vivas enteras en cada
// avance.
const Hexagon = memo(function Hexagon({ item }) {
  const group = useRef()
  const ring = useRef()
  const label = useRef()
  const local = useRef({ collected: false, scale: 1, fx: 0 })
  const good = item.kind === 'good'

  useFrame(({ clock }, dt0) => {
    const dt = Math.min(dt0, 0.05)
    const phase = useGame.getState().phase
    const st = local.current
    // Las fichas del techo de un convoy en marcha viajan con el. Va aqui y no
    // en su posicion final a proposito: `z` es tambien con lo que se decide que
    // esta al alcance, y una ficha que se dibuja en un sitio y se recoge en
    // otro es peor que una que no se mueve.
    const z = item.zw + scroll.s - (item.rig ? rodado(item.rig, runtime.distance) : 0)

    if (phase === 'playing' && !st.collected && Math.abs(z - PLAYER_Z) < 0.85 && alcanza(item)) {
      st.collected = true
      st.fx = 1
      if (good) {
        useGame.getState().collect(item.label)
        // El tono sube con la racha, y se lee DESPUES de sumar: la ficha que
        // acaba de entrar es la que tiene que sonar mas arriba, no la anterior.
        sfx.good(useGame.getState().racha - 1)
      } else {
        useGame.getState().hit(item.label)
        sfx.bad()
        runtime.shake = 0.4
      }
    }

    if (st.collected) st.scale = Math.max(0, st.scale - dt * 6)
    if (st.fx > 0) st.fx = Math.max(0, st.fx - dt * 3)

    if (!group.current) return
    const t = clock.elapsedTime
    group.current.position.set(LANES[item.lane], item.dy + 1.05 + Math.sin(t * 2 + item.key) * 0.08, z)
    group.current.rotation.y = Math.sin(t * 1.5 + item.key) * 0.14
    // el grupo nunca llega a escala 0 para que el anillo del fx pueda compensar
    const gs = Math.max(st.scale, 0.001)
    group.current.scale.setScalar(gs)
    group.current.visible = (st.scale > 0.01 || st.fx > 0.01) && z > -110

    // el texto solo aparece de cerca: a 30 m es ilegible y ensucia la lectura
    // de verde/rojo, que es lo unico que el jugador necesita a esa distancia
    if (label.current) {
      const k = Math.max(0, Math.min(1, (z + 30) / 10))
      label.current.fillOpacity = k
      label.current.outlineOpacity = k
    }

    // anillo de onda expansiva al recoger: compensa la escala del grupo
    if (ring.current) {
      const k = 1 - st.fx
      ring.current.visible = st.fx > 0.01
      if (st.fx > 0.01) {
        ring.current.scale.setScalar((1 + k * 2.2) / gs)
        ring.current.material.opacity = st.fx * 0.9
      }
    }
  })

  const c = good ? FACE.good : FACE.bad
  const glow = good ? COLORS.good : COLORS.bad
  const long = (item.label || '').length > 10
  return (
    // Las fichas no se ensucian NI entran en el juego de sombras: son senal de
    // juego, no decorado. A 30 m lo unico que el jugador tiene que leer aqui es
    // verde o rojo, y en cambio son la pieza mas numerosa de la pantalla.
    <group ref={group} userData={{ noDress: true, noShadow: true }}>
      {/* bisel metalico exterior */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[1.05, 1.05, 0.14, 6]} />
        <meshStandardMaterial color="#d6dde4" metalness={0.85} roughness={0.25} />
      </mesh>
      {/* cara de color plena: a 30 m lo unico que el jugador necesita leer es
          verde o rojo, asi que la ficha va llena y el simbolo en navy encima */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.97, 0.97, 0.2, 6]} />
        <meshStandardMaterial color={c} emissive={c} emissiveIntensity={0.35} roughness={0.4} />
      </mesh>
      <mesh ref={ring} rotation={[0, 0, 0]} visible={false}>
        <torusGeometry args={[1.05, 0.05, 8, 32]} />
        <meshBasicMaterial color={glow} transparent opacity={0} />
      </mesh>
      {/* simbolo: paloma o tache, en navy sobre la cara de color */}
      {good ? (
        <group position={[0, 0, 0.13]}>
          <mesh rotation={[0, 0, -0.8]} position={[-0.15, -0.02, 0]}>
            <boxGeometry args={[0.26, 0.13, 0.05]} />
            <meshStandardMaterial color={SYMBOL} roughness={0.5} />
          </mesh>
          <mesh rotation={[0, 0, 0.8]} position={[0.11, 0.06, 0]}>
            <boxGeometry args={[0.54, 0.13, 0.05]} />
            <meshStandardMaterial color={SYMBOL} roughness={0.5} />
          </mesh>
        </group>
      ) : (
        <group position={[0, 0, 0.13]}>
          <mesh rotation={[0, 0, 0.785]}>
            <boxGeometry args={[0.62, 0.13, 0.05]} />
            <meshStandardMaterial color={SYMBOL} roughness={0.5} />
          </mesh>
          <mesh rotation={[0, 0, -0.785]}>
            <boxGeometry args={[0.62, 0.13, 0.05]} />
            <meshStandardMaterial color={SYMBOL} roughness={0.5} />
          </mesh>
        </group>
      )}
      {/* la etiqueta va arriba de la ficha, no dentro: dentro competia con el
          simbolo y a 0.15 de alto era ilegible en movimiento */}
      <Text
        ref={label}
        font={fontBold}
        position={[0, 1.32, 0]}
        fontSize={long ? 0.24 : 0.3}
        maxWidth={2.8}
        lineHeight={1.1}
        textAlign="center"
        anchorX="center"
        anchorY="middle"
        color="#ffffff"
        outlineWidth={0.03}
        outlineColor="#04122b"
      >
        {item.label}
      </Text>
    </group>
  )
})

// GANCHO DE GRUA: el recogible que dispara el izado.
//
// Se dibuja como lo que es -- un gancho de verdad colgando de un cable que se
// pierde hacia arriba -- y con un aro de luz alrededor. El aro es lo que lo
// separa de las cien piezas de acero que hay en pantalla: sin el, un gancho
// mas en un puerto lleno de gruas no se lee como algo que haya que tocar.
const LiftHook = memo(function LiftHook({ item }) {
  const group = useRef()
  const aro = useRef()
  const local = useRef({ taken: false, scale: 1 })

  useFrame(({ clock }, dt0) => {
    const dt = Math.min(dt0, 0.05)
    const st = local.current
    const z = item.zw + scroll.s

    if (
      useGame.getState().phase === 'playing' &&
      !st.taken &&
      !runtime.flying &&
      Math.abs(z - PLAYER_Z) < 1.0 &&
      alcanza(item)
    ) {
      st.taken = true
      // El vuelo arranca en el metro EXACTO de la pieza y no en el del corredor:
      // las fichas del aire estan puestas con esa misma referencia, y medio metro de
      // desfase las dejaria un palmo fuera de la trayectoria toda la subida.
      runtime.flying = true
      runtime.flyFrom = item.d
      useGame.getState().bonus('IZADO DE GRÚA', 25)
      sfx.good()
    }
    if (st.taken) st.scale = Math.max(0, st.scale - dt * 5)

    if (!group.current) return
    const t = clock.elapsedTime
    group.current.position.set(LANES[item.lane], item.dy + 1.25 + Math.sin(t * 1.8) * 0.12, z)
    group.current.scale.setScalar(Math.max(st.scale, 0.001))
    group.current.visible = st.scale > 0.01 && z > -110
    if (aro.current) {
      aro.current.rotation.z = t * 1.2
      aro.current.scale.setScalar(1 + Math.sin(t * 4) * 0.07)
    }
  })

  return (
    <group ref={group} userData={{ noDress: true, noShadow: true }}>
      {/* cable subiendo fuera de cuadro: dice de donde viene la fuerza */}
      <mesh position={[0, 4.2, 0]}>
        <cylinderGeometry args={[0.035, 0.035, 8, 6]} />
        <meshStandardMaterial color="#20242a" roughness={0.7} metalness={0.5} />
      </mesh>
      {/* moton y gancho */}
      <mesh position={[0, 0.42, 0]}>
        <boxGeometry args={[0.34, 0.42, 0.24]} />
        <meshStandardMaterial color="#f5c518" metalness={0.6} roughness={0.35} />
      </mesh>
      <mesh position={[0, -0.05, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.3, 0.075, 8, 18, Math.PI * 1.45]} />
        <meshStandardMaterial color="#e0b32e" metalness={0.75} roughness={0.3} />
      </mesh>
      {/* aro de luz: la senal de "esto se toca" */}
      <mesh ref={aro} rotation={[0, 0, 0]}>
        <torusGeometry args={[0.95, 0.06, 8, 28]} />
        <meshBasicMaterial color={COLORS.amber} transparent opacity={0.85} />
      </mesh>
      <Text
        font={fontBold}
        position={[0, 1.55, 0]}
        fontSize={0.34}
        letterSpacing={0.08}
        anchorX="center"
        anchorY="middle"
        color={COLORS.amber}
        outlineWidth={0.035}
        outlineColor="#04122b"
      >
        GRÚA
      </Text>
    </group>
  )
})

// CASCO REFORZADO: el recogible que aguanta un choque.
//
// Se dibuja como el casco que ya lleva el corredor puesto, en blanco y con su
// lampara, pero envuelto en una burbuja: la forma dice QUE es y la burbuja dice
// que PROTEGE. Un icono de escudo generico no habria dicho ninguna de las dos
// cosas en un juego que va de un puerto.
const ShieldPickup = memo(function ShieldPickup({ item }) {
  const group = useRef()
  const burbuja = useRef()
  const local = useRef({ taken: false, scale: 1 })

  useFrame(({ clock }, dt0) => {
    const dt = Math.min(dt0, 0.05)
    const st = local.current
    const z = item.zw + scroll.s

    if (
      useGame.getState().phase === 'playing' &&
      !st.taken &&
      Math.abs(z - PLAYER_Z) < 0.9 &&
      alcanza(item)
    ) {
      st.taken = true
      useGame.getState().tomaEscudo()
      sfx.shield()
    }
    if (st.taken) st.scale = Math.max(0, st.scale - dt * 5)

    if (!group.current) return
    const t = clock.elapsedTime
    group.current.position.set(LANES[item.lane], item.dy + 1.15 + Math.sin(t * 2.2) * 0.1, z)
    group.current.rotation.y = t * 1.1
    group.current.scale.setScalar(Math.max(st.scale, 0.001))
    group.current.visible = st.scale > 0.01 && z > -110
    if (burbuja.current) burbuja.current.scale.setScalar(1 + Math.sin(t * 3) * 0.05)
  })

  return (
    <group ref={group} userData={{ noDress: true, noShadow: true }}>
      {/* el casco, igual que el que lleva puesto el corredor */}
      <mesh position={[0, 0.05, 0]}>
        <sphereGeometry args={[0.42, 20, 14, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color="#f4f6f8" roughness={0.45} metalness={0.1} />
      </mesh>
      <mesh position={[0, 0.03, -0.09]}>
        <cylinderGeometry args={[0.5, 0.5, 0.07, 20]} />
        <meshStandardMaterial color="#f4f6f8" roughness={0.45} />
      </mesh>
      <mesh position={[0, 0.16, -0.37]}>
        <boxGeometry args={[0.15, 0.11, 0.09]} />
        <meshStandardMaterial color={COLORS.amber} emissive={COLORS.amber} emissiveIntensity={1.8} />
      </mesh>
      {/* burbuja: lo que dice que esto protege y no es un casco de decorado */}
      <mesh ref={burbuja}>
        <sphereGeometry args={[0.78, 20, 16]} />
        <meshStandardMaterial
          color={COLORS.sky}
          emissive={COLORS.sky}
          emissiveIntensity={0.7}
          transparent
          opacity={0.22}
          roughness={0.2}
        />
      </mesh>
      <Text
        font={fontBold}
        position={[0, 1.15, 0]}
        fontSize={0.3}
        letterSpacing={0.08}
        anchorX="center"
        anchorY="middle"
        color={COLORS.sky}
        outlineWidth={0.035}
        outlineColor="#04122b"
      >
        CASCO
      </Text>
    </group>
  )
})

const LIST = COURSE.items

// Ventana deslizante sobre la lista del curso. Los cursores solo avanzan, pero
// AQUI SI PUEDEN VOLVER: la lista se vacia y se vuelve a llenar en cada carrera
// (curso nuevo), asi que al reiniciar hay que devolverlos a cero o la ventana
// se quedaria apuntando mas alla del final de un curso que ya no existe.
export function Items() {
  const [win, setWin] = useState([0, 0])
  const [run, setRun] = useState(0)
  const cur = useRef([0, 0])

  useEffect(
    () =>
      useGame.subscribe((state, prev) => {
        if (state.phase === 'countdown' && prev.phase !== 'countdown') {
          cur.current = [0, 0]
          setWin([0, 0])
          setRun((r) => r + 1)
        }
      }),
    []
  )

  useFrame(() => {
    let [a, b] = cur.current
    // EL `tope` DEL CONVOY, IGUAL QUE EN Rigs.jsx. Una ficha del techo de un
    // camion en marcha se dibuja y se recoge en `zw - rodado`, o sea hasta
    // cincuenta metros MAS ADELANTE de donde nacio; el cursor, en cambio, miraba
    // solo su metro de nacimiento y la daba por pasada mientras seguia estando
    // por delante del corredor. Resultado: la fila entera del techo se
    // desmontaba justo al llegar al convoy y se pasaba por encima sin recoger
    // nada, porque ya no existia.
    //
    // Se resta el `tope` -- lo maximo que ese convoy puede rodar -- y no el
    // `rodado` de este cuadro a proposito: el cursor solo avanza, asi que tiene
    // que decidir con la cota mas conservadora o volveria a dejar atras fichas
    // que todavia no han llegado.
    while (a < LIST.length && LIST[a].zw - (LIST[a].rig?.tope || 0) + scroll.s > 14) a++
    while (b < LIST.length && LIST[b].d <= scroll.s + VIEW_AHEAD) b++
    if (a !== cur.current[0] || b !== cur.current[1]) {
      cur.current = [a, b]
      setWin([a, b])
    }
  })

  return LIST.slice(win[0], win[1]).map((item) => {
    const k = `${run}-${item.key}`
    if (item.kind === 'lift') return <LiftHook key={k} item={item} />
    if (item.kind === 'shield') return <ShieldPickup key={k} item={item} />
    return <Hexagon key={k} item={item} />
  })
}
