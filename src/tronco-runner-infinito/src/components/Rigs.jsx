import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGame } from '../store'
import { runtime, scroll } from '../runtime'
import { sfx } from '../audio'
import { LANES, VIEW_AHEAD, RIG_H } from '../constants'
import { PLATFORMS, deckAt, rodado } from '../course'
import { mergeParts } from '../merge'
import { bakedDetail } from '../detail'
import { useGameTextures, tiledTexture } from '../textures'
import { QUALITY } from '../quality'

// CAMION PORTACONTENEDOR QUE SE TREPA.
//
// Es la jugada de Subway Surfers traida al puerto: el tren por el que se corre
// aqui es un tractocamion con su contenedor de 40 pies. Se sube por la rampa
// trasera y se corre por encima del contenedor recogiendo valores.
//
// Y es geometria de JUEGO, no decorado: su rampa y su techo son exactamente lo
// que devuelve supportAt(), por eso se dibuja desde la lista del curso
// (PLATFORMS) y no desde el generador de escenario. Comparte toda la maquinaria
// con los andamios del dique -- son la misma idea: una plataforma que ocupa un
// carril, con rampa solo en la primera de la cadena, y para seguir arriba hay
// que ir saltando de una a otra.
//
// LA RAMPA RECOGE SIEMPRE al que pasa por su carril, y eso es deliberado: el
// camion no es una trampa con premio escondido, es una ruta alternativa que se
// ve venir de lejos. Lo que cuesta es SOSTENERSE hasta el final del convoy.
//
// La cabina va a la MISMA altura que el contenedor y no es licencia: un tractor
// moderno lleva el deflector del techo igualado a la caja justo para no
// arrastrar aire. Sale gratis y resuelve el unico problema real de correr sobre
// un camion, que es que hacer al llegar a la cabina.

const CAB_LEN = 3.4 // lo que ocupa la cabina al frente del conjunto
const CHASSIS_Y = 0.78 // cota del piso del chasis: de ahi para arriba, contenedor

/* ---------- UNA PALETA CORTA, Y A PROPOSITO ----------

  Cada familia de material distinta es UNA MALLA MAS por convoy: la fusion
  agrupa por material (ver merge.js), asi que dos piezas que solo se diferencian
  en dos centesimas de rugosidad se dibujan por separado. El camion llego a
  tener dieciseis familias -- cada caja con la rugosidad que le parecio bien al
  escribirla -- y con varios convoyes en pantalla eso son cien llamadas de
  dibujo solo de camiones.

  Con cuatro acabados y tres emisivos se dibuja igual de bien. Lo que distingue
  una chapa de otra es el COLOR, y el color va en los vertices.
*/
const STEEL = { metalness: 0.55, roughness: 0.45 } // acero desnudo: vigas, chasis
const PAINT = { metalness: 0.3, roughness: 0.6 } // chapa pintada
const RUBBER = { metalness: 0.05, roughness: 0.95 } // ruedas
const GLASS = { metalness: 0.6, roughness: 0.15 } // lunas
// Marcas viales: un solo emisivo ambar flojo para galones, cantos y avisos.
const MARCA = { emissive: '#8a6a00', emissiveIntensity: 0.6 }
// Luces encendidas: faros y balizas. La roja va aparte porque el emisivo es del
// material y ahi el color no lo pueden poner los vertices.
const LUZ = { emissive: '#ffc27a', emissiveIntensity: 2 }
const ROJO = { emissive: '#ff2d3f', emissiveIntensity: 2.2 }

function buildRig(p) {
  const out = []
  const box = (pos, size, color, extra = {}) => out.push({ geo: 'box', pos, size, color, ...extra })
  const cyl = (pos, args, color, extra = {}) => out.push({ geo: 'cyl', pos, args, color, ...extra })

  const R = p.ramp
  const H = RIG_H
  // Largo del cajon: lo que queda del tramo pisable despues de la cabina
  const cajaLen = Math.max(6, p.len - CAB_LEN)
  // z local: 0 es el pie de la rampa y el recorrido avanza hacia -z
  const z0 = -R // canto trasero del remolque
  const zCaja = z0 - cajaLen / 2
  const zCabina = z0 - cajaLen - CAB_LEN / 2

  if (R > 0) {
    // RAMPA TRASERA de carga, inclinada de cero a la altura del techo. Es la
    // unica forma de subir, asi que tiene que leerse a cien metros: por eso va
    // en amarillo/negro y con las bandas cruzadas de una rampa de verdad.
    const slope = Math.atan2(H, R)
    const diag = Math.hypot(R, H)
    box([0, H / 2, -R / 2], [2.1, 0.13, diag], '#8d949b', { ...STEEL, rot: [slope, 0, 0] })
    // galones de la rampa: apuntan hacia arriba, que es a donde lleva
    for (let i = 0; i < 5; i++) {
      const f = (i + 0.5) / 5
      box([0, H * f + 0.08, -R * f], [1.9, 0.05, 0.45], i % 2 === 0 ? '#f5c518' : '#20242a', MARCA)
    }
    for (const sx of [-1, 1]) {
      box([sx * 1.02, H / 2 + 0.28, -R / 2], [0.09, 0.4, diag], '#c9a12e', { ...STEEL, rot: [slope, 0, 0] })
    }
  } else {
    // Canto de entrada de un camion al que solo se llega saltando: la marca va
    // PINTADA sobre el techo, no en postes. Quien salta lo mira desde arriba y
    // lo lee entero, y quien pasa por el suelo no se come un poste a la altura
    // de los ojos.
    box([0, H + 0.03, -0.05], [2.06, 0.06, 0.3], '#f5c518', MARCA)
    for (let i = 0; i < 3; i++) {
      box([0, H + 0.04, -0.9 - i * 1.2], [1.8 - i * 0.42, 0.05, 0.5], '#ff9d2f', MARCA)
    }
  }

  // ---- Contenedor de 40 pies ----
  // El corrugado es la textura del juego, la misma que visten los contenedores
  // del patio: si el que se trepa fuera liso se leeria como otra cosa.
  box([0, (CHASSIS_Y + H) / 2, zCaja], [2.08, H - CHASSIS_Y, cajaLen], '#2a6bd4', {
    tex: 'container',
    repeat: [Math.round(cajaLen / 2.4), 1],
    metalness: 0.35,
    roughness: 0.6,
  })
  // techo liso: es por donde se corre, y el corrugado en el suelo se ve sucio
  box([0, H - 0.03, zCaja], [2.06, 0.08, cajaLen], '#245ab0', PAINT)
  // cantos: marcan el ancho pisable desde arriba
  for (const sx of [-1, 1]) {
    box([sx * 1.0, H + 0.02, zCaja], [0.1, 0.06, cajaLen], '#e6ecf2', PAINT)
  }
  // puertas traseras con sus barras
  box([0, (CHASSIS_Y + H) / 2, z0 - 0.06], [2.09, H - CHASSIS_Y - 0.08, 0.1], '#1d4e99', {
    tex: 'containerDoor',
    repeat: [1, 1],
    roughness: 0.6,
  })

  // ---- Chasis y ejes ----
  box([0, CHASSIS_Y - 0.16, zCaja], [1.9, 0.28, cajaLen + 0.2], '#39424a', STEEL)
  for (const sx of [-1, 1]) {
    box([sx * 0.98, CHASSIS_Y - 0.2, zCaja], [0.12, 0.2, cajaLen], '#20242a', STEEL)
  }
  // ruedas: nunca fuera del carril, que mide 2.3 m de ancho
  const ejes = [z0 - 1.6, z0 - 3.0, z0 - cajaLen + 1.2, zCabina + 0.6, zCabina - 1.1]
  for (const ez of ejes) {
    for (const sx of [-1, 1]) {
      cyl([sx * 0.94, 0.52, ez], [0.52, 0.52, 0.3, 12], '#1b1e23', { ...RUBBER, rot: [0, 0, Math.PI / 2] })
    }
  }

  // ---- Cabina del tractor ----
  // El techo va a la misma cota que el contenedor: se sale del cajon y se sigue
  // corriendo sobre el deflector hasta el morro.
  box([0, (CHASSIS_Y + H) / 2 + 0.1, zCabina], [2.02, H - CHASSIS_Y + 0.2, CAB_LEN - 0.5], '#e6ecf2', PAINT)
  box([0, H - 0.03, zCabina], [2.0, 0.08, CAB_LEN - 0.5], '#d7dee5', PAINT)
  // parabrisas al frente y ventanillas laterales
  box([0, H - 0.85, zCabina - CAB_LEN / 2 + 0.28], [1.7, 0.85, 0.08], '#16324f', GLASS)
  for (const sx of [-1, 1]) {
    box([sx * 1.0, H - 0.9, zCabina + 0.2], [0.06, 0.7, 1.1], '#16324f', GLASS)
  }
  // morro, defensa y faros
  box([0, CHASSIS_Y + 0.35, zCabina - CAB_LEN / 2 + 0.1], [2.0, 0.9, 0.35], '#cfd6dd', PAINT)
  box([0, CHASSIS_Y - 0.05, zCabina - CAB_LEN / 2], [2.05, 0.28, 0.2], '#39424a', STEEL)
  for (const sx of [-1, 1]) {
    box([sx * 0.72, CHASSIS_Y + 0.12, zCabina - CAB_LEN / 2 - 0.02], [0.34, 0.2, 0.12], '#fff3cf', LUZ)
  }
  // tubos de escape y baliza de techo
  for (const sx of [-1, 1]) {
    cyl([sx * 1.0, CHASSIS_Y + 0.9, zCabina + CAB_LEN / 2 - 0.3], [0.09, 0.09, 1.7, 8], '#9aa3ab', STEEL)
  }
  out.push({ geo: 'sph', pos: [0, H + 0.16, zCabina], args: [0.11, 8, 8], color: '#ffb347', ...LUZ })

  // Pilotos rojos de cola en el remolque de atras, encendidos de verdad si el
  // convoy va rodando: es lo que dice de un vistazo que eso se mueve.
  if (p.ramp > 0) {
    for (const sx of [-1, 1]) {
      box([sx * 0.78, CHASSIS_Y + 0.2, z0 + 0.06], [0.24, 0.24, 0.1], '#ff4757', ROJO)
    }
  }

  // Galones en el canto de salida: avisan de que ahi se salta al camion
  // siguiente en vez de bajarse.
  if (p.jump) {
    const zf = z0 - cajaLen - CAB_LEN
    for (let i = 0; i < 3; i++) {
      box([0, H + 0.04, zf + 1.2 + i * 1.2], [0.85 + i * 0.28, 0.05, 0.42], '#ff9d2f', MARCA)
    }
  }

  return out
}

// VAGON PORTACONTENEDORES QUE SE TREPA.
//
// Es el mismo juego que el camion -- misma rampa, mismo techo a 2.9 m, mismas
// reglas de soporte -- con otra piel, y esa piel importa: en un patio de
// ferrocarril lo que se trepa tiene que ser un tren. Es ademas la imagen mas
// reconocible de todo el genero: correr por el techo de un convoy en marcha.
//
// La cadena se recorre de COLA a MORRO, asi que el ultimo trozo (`last`) lleva
// la locomotora y no un contenedor: es lo que hace que la fila de vagones se
// lea como un tren entero y no como tres cajas sueltas sobre una via.
function buildTren(p) {
  const out = []
  const box = (pos, size, color, extra = {}) => out.push({ geo: 'box', pos, size, color, ...extra })
  const cyl = (pos, args, color, extra = {}) => out.push({ geo: 'cyl', pos, args, color, ...extra })

  const R = p.ramp
  const H = RIG_H
  const DECK = 1.12 // piso del vagon, de ahi para arriba va la carga
  const z0 = -R // canto trasero
  const len = p.len
  const zc = z0 - len / 2

  if (R > 0) {
    // RAMPA DE CARGA DE MATERIAL RODANTE. Existe de verdad en las terminales
    // intermodales -- es por donde entran y salen los remolques del vagon -- y
    // aqui hace lo mismo que la del camion: es la unica forma de subir, asi que
    // se lee a cien metros en amarillo y negro.
    const slope = Math.atan2(H, R)
    const diag = Math.hypot(R, H)
    box([0, H / 2, -R / 2], [2.15, 0.14, diag], '#8d949b', { ...STEEL, rot: [slope, 0, 0] })
    for (let i = 0; i < 5; i++) {
      const f = (i + 0.5) / 5
      box([0, H * f + 0.08, -R * f], [1.95, 0.05, 0.45], i % 2 === 0 ? '#f5c518' : '#20242a', MARCA)
    }
    for (const sx of [-1, 1]) {
      box([sx * 1.04, H / 2 + 0.28, -R / 2], [0.09, 0.4, diag], '#c9a12e', { ...STEEL, rot: [slope, 0, 0] })
    }
  } else {
    // canto de entrada pintado en el techo, igual que en el camion: quien salta
    // lo lee desde arriba y quien pasa por debajo no se come un poste
    box([0, H + 0.03, -0.05], [2.06, 0.06, 0.3], '#f5c518', MARCA)
    for (let i = 0; i < 3; i++) {
      box([0, H + 0.04, -0.9 - i * 1.2], [1.8 - i * 0.42, 0.05, 0.5], '#ff9d2f', MARCA)
    }
  }

  // ---- Bastidor ----
  box([0, DECK - 0.2, zc], [2.24, 0.34, len], '#3b444d', STEEL)
  for (const sx of [-1, 1]) {
    box([sx * 1.08, DECK - 0.24, zc], [0.12, 0.42, len - 0.6], '#20242a', STEEL)
  }
  // topes y gancho de enganche en los dos cantos
  for (const ez of [z0 - 0.1, z0 - len + 0.1]) {
    box([0, DECK - 0.3, ez], [0.5, 0.3, 0.35], '#20242a', STEEL)
    for (const sx of [-1, 1]) cyl([sx * 0.72, DECK - 0.3, ez], [0.16, 0.16, 0.3, 8], '#9aa3ab', { ...STEEL, rot: [Math.PI / 2, 0, 0] })
  }

  // ---- Bogies ----
  // Dos por vagon, con sus cuatro ruedas. Es lo que separa a un vagon de una
  // caja: por debajo de un tren se ve el hueco entre los bogies.
  for (const bz of [z0 - 2.4, z0 - len + 2.4]) {
    box([0, 0.78, bz], [1.86, 0.34, 2.8], '#262c33', STEEL)
    for (const dz of [-0.9, 0.9]) {
      for (const sx of [-1, 1]) {
        cyl([sx * 0.9, 0.46, bz + dz], [0.46, 0.46, 0.14, 12], '#14181c', { ...STEEL, rot: [0, 0, Math.PI / 2] })
      }
    }
  }

  if (p.last) {
    // ---- LOCOMOTORA ----
    // Va en el trozo de cabeza, que es por donde se sale del tren. El techo se
    // queda a la misma cota que los vagones: se sigue corriendo por encima
    // hasta el morro y se salta desde ahi.
    box([0, (DECK + H) / 2, zc + 1.2], [2.16, H - DECK, len - 3.4], '#c8461f', PAINT)
    box([0, H - 0.04, zc + 1.2], [2.12, 0.1, len - 3.4], '#a63817', PAINT)
    // franja de la casa a media altura
    box([0, DECK + 0.55, zc + 1.2], [2.18, 0.3, len - 3.6], '#f5c518', MARCA)
    // cabina con sus ventanas, hacia el morro
    const zCab = z0 - len + 2.6
    box([0, (DECK + H) / 2 + 0.06, zCab], [2.1, H - DECK + 0.12, 2.4], '#e6ecf2', PAINT)
    box([0, H - 0.04, zCab], [2.06, 0.1, 2.4], '#d7dee5', PAINT)
    box([0, H - 0.75, zCab - 1.16], [1.7, 0.8, 0.1], '#16324f', GLASS)
    for (const sx of [-1, 1]) {
      box([sx * 1.02, H - 0.8, zCab], [0.06, 0.7, 1.5], '#16324f', GLASS)
    }
    // morro corto, faros y bocina
    box([0, DECK + 0.5, z0 - len + 0.9], [2.1, 1.1, 1.4], '#c8461f', PAINT)
    box([0, DECK - 0.05, z0 - len + 0.3], [2.2, 0.4, 0.3], '#20242a', STEEL)
    for (const sx of [-1, 1]) {
      box([sx * 0.66, DECK + 0.85, z0 - len + 0.22], [0.36, 0.24, 0.12], '#fff3cf', LUZ)
    }
    out.push({ geo: 'sph', pos: [0, H + 0.18, zCab], args: [0.12, 8, 8], color: '#ffb347', ...LUZ })
  } else {
    // ---- Contenedor de 40 pies sobre el vagon ----
    box([0, (DECK + H) / 2, zc], [2.08, H - DECK, len - 1.4], p.color || '#2c9d8a', {
      tex: 'container',
      repeat: [Math.round((len - 1.4) / 2.4), 1],
      metalness: 0.35,
      roughness: 0.6,
    })
    box([0, H - 0.03, zc], [2.06, 0.08, len - 1.4], '#22796a', PAINT)
    for (const sx of [-1, 1]) {
      box([sx * 1.0, H + 0.02, zc], [0.1, 0.06, len - 1.4], '#e6ecf2', PAINT)
    }
    box([0, (DECK + H) / 2, z0 - 0.76], [2.09, H - DECK - 0.08, 0.1], '#1c6558', {
      tex: 'containerDoor',
      repeat: [1, 1],
      roughness: 0.6,
    })
  }

  // Pilotos rojos de cola en el vagon de atras: es lo que dice, de un vistazo y
  // desde lejos, que eso de ahi delante es material rodante y no un muro.
  if (p.ramp > 0) {
    for (const sx of [-1, 1]) {
      box([sx * 0.8, DECK + 0.25, z0 + 0.05], [0.24, 0.24, 0.1], '#ff4757', ROJO)
    }
  }

  // Galones en el canto de salida: ahi se salta al vagon siguiente.
  if (p.jump) {
    const zf = z0 - len
    for (let i = 0; i < 3; i++) {
      box([0, H + 0.04, zf + 1.2 + i * 1.2], [0.85 + i * 0.28, 0.05, 0.42], '#ff9d2f', MARCA)
    }
  }

  return out
}

const DONE = { sh: 1 }

function RigMesh({ part, maps }) {
  const p = part.p
  const d = bakedDetail()
  const map = p.tex ? tiledTexture(maps[p.tex], p.tex, p.repeat?.[0] ?? 1, p.repeat?.[1] ?? 1) : d.wear
  const lamp = (p.emissiveIntensity || 0) >= 1
  return (
    <mesh
      geometry={part.geometry}
      castShadow={QUALITY.shadows && !lamp}
      receiveShadow={QUALITY.shadows}
      userData={DONE}
    >
      <meshStandardMaterial
        vertexColors
        map={lamp ? null : map}
        normalMap={lamp || !QUALITY.normalMap ? null : d.normal}
        roughnessMap={lamp || !QUALITY.roughMap ? null : d.rough}
        emissive={p.emissive || '#000000'}
        emissiveIntensity={p.emissiveIntensity || 0}
        metalness={p.metalness || 0.1}
        roughness={p.roughness ?? 0.85}
        envMapIntensity={1.15}
      />
    </mesh>
  )
}

/* ---------- EL CONVOY ENTERO, EN UNA SOLA TANDA DE MALLAS ----------

  Los dos o tres remolques de un convoy se dibujaban por separado, y cada uno
  pedia su juego de mallas: con tres convoyes en pantalla eran mas de cien
  llamadas de dibujo solo de camiones. Y no hacia falta ninguna: van pegados,
  van al mismo carril y ruedan a la vez, asi que son UNA pieza para el dibujo
  aunque sean tres para el juego -- que sigue tratandolas por separado, porque
  entre una y otra hay un hueco que hay que saltar.

  Cada remolque se construye en sus propias coordenadas (z=0 es el pie de su
  rampa) y se corre hacia atras lo que lo separa de la cabeza del convoy.
*/
function Convoy({ piezas, maps }) {
  const group = useRef()
  const golpe = useRef(false)
  const cabeza = piezas[0]
  const base = deckAt(cabeza.d0d + 2)
  const zw = 2 - cabeza.d0
  const parts = useMemo(() => {
    const props = []
    for (const p of piezas) {
      const dz = p.d0 - cabeza.d0
      for (const x of p.estilo === 'tren' ? buildTren(p) : buildRig(p)) {
        props.push({ ...x, pos: [x.pos[0], x.pos[1], x.pos[2] - dz] })
      }
    }
    return mergeParts(props)
  }, [piezas, cabeza])
  useEffect(() => () => parts.forEach((x) => x.geometry.dispose()), [parts])

  useFrame(() => {
    // Lo que lleva rodado el convoy sale del metro del corredor y no de un
    // reloj propio, y es lo que hace que esto encaje sin tocar nada mas: el
    // mundo entero se mueve contra `distance`, asi que un camion con su propio
    // reloj se desincronizaria del suelo en cuanto cambiara el ritmo.
    const off = rodado(cabeza, runtime.distance)
    if (group.current) group.current.position.set(LANES[cabeza.lane], base, zw - off + scroll.s)

    // ESTAMPARSE CONTRA EL COSTADO.
    //
    // Normalmente no puede pasar: la rampa recoge a cualquiera que entre por el
    // carril. Pero se puede saltar la rampa entera (a 25 m/s el salto cubre
    // trece metros y la rampa mide siete) y caer contra el cajon, y tambien se
    // puede cambiar de carril a mitad del convoy. Eso es un choque, y el camion
    // tiene que cobrarlo: si no, el corredor lo atraviesa como si fuera humo.
    if (golpe.current || useGame.getState().phase !== 'playing' || runtime.flying) return
    if (Math.abs(LANES[cabeza.lane] - runtime.x) > 0.95) return
    if (runtime.deck + runtime.y >= base + RIG_H - 1.0) return
    const d = runtime.distance - off
    for (const p of piezas) {
      if (d < p.d0d + 0.4 || d > p.end) continue
      golpe.current = true
      useGame.getState().crash(p.estilo === 'tren' ? 'VAGÓN DE CONTENEDOR' : 'CAMIÓN DE CONTENEDOR')
      sfx.bad()
      runtime.shake = 0.8
      runtime.stagger = 0.5
      break
    }
  })

  return (
    <group ref={group}>
      {parts.map((part) => (
        <RigMesh key={part.key} part={part} maps={maps} />
      ))}
    </group>
  )
}

// Misma ventana deslizante que los andamios, sobre las plataformas de tipo
// camion. Los cursores pueden volver a cero: el curso se rehace en cada carrera.
export function Rigs() {
  const maps = useGameTextures()
  const [win, setWin] = useState([0, 0])
  const cur = useRef([0, 0])

  useFrame(() => {
    let [a, b] = cur.current
    if (a >= PLATFORMS.length || scroll.s < (PLATFORMS[a]?.d0 ?? Infinity) - VIEW_AHEAD - 60) {
      a = 0
      b = 0
    }
    // El `tope` es lo que un convoy en marcha puede adelantarse: sin sumarlo, el
    // cursor lo daba por pasado -- mira su metro de nacimiento -- y el camion
    // desaparecia de la pantalla con el corredor todavia encima.
    while (
      a < PLATFORMS.length &&
      2 - PLATFORMS[a].d0 - PLATFORMS[a].span - (PLATFORMS[a].tope || 0) + scroll.s > 26
    )
      a++
    while (b < PLATFORMS.length && PLATFORMS[b].d0 <= scroll.s + VIEW_AHEAD) b++
    if (a !== cur.current[0] || b !== cur.current[1]) {
      cur.current = [a, b]
      setWin([a, b])
    }
  })

  // Un componente por CONVOY, no por remolque: la ventana puede traer el convoy
  // a trozos, asi que se agrupa por la lista que comparten (ver course.js) y se
  // dibuja entero desde que asoma el primero.
  const vistos = new Set()
  const out = []
  for (const p of PLATFORMS.slice(win[0], win[1])) {
    if (p.kind !== 'rig') continue
    const piezas = p.convoy || [p]
    if (vistos.has(piezas)) continue
    vistos.add(piezas)
    // El carril entra en la clave porque las vias dobles nacen en el MISMO
    // metro: sin el, las dos mitades de una pareja comparten key y React se
    // queda dibujando una sola.
    out.push(<Convoy key={`c-${piezas[0].d0}-${piezas[0].lane}`} piezas={piezas} maps={maps} />)
  }
  return out
}
