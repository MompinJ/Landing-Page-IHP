import { useEffect, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGame } from '../store'
import { runtime, scroll } from '../runtime'
import { sfx } from '../audio'
import { LANES, PLAYER_Z, VIEW_AHEAD, OBSTACLE_LEN } from '../constants'
import { COURSE } from '../course'
import { useGameTextures, tiledTexture } from '../textures'

// Igual que Items: coordenadas de mundo fijas (zw) mas el scroll compartido.
const TINTS = ['#2a6bd4', '#00aef0', '#d4603c', '#e0b32e', '#b04a6e']

// El curso es fijo, asi que el tinte tambien tiene que serlo: sacarlo del
// indice mantiene la variedad sin que la misma pieza cambie de color entre
// partidas.
const tintFor = (i) => TINTS[i % TINTS.length]

function LowBarrier({ tint }) {
  return (
    <group>
      {/* travesano con franjas amarillo/negro */}
      {[-0.76, -0.38, 0, 0.38, 0.76].map((dx, i) => (
        <mesh key={i} position={[dx, 0.62, 0]}>
          <boxGeometry args={[0.38, 0.22, 0.16]} />
          <meshStandardMaterial
            color={i % 2 === 0 ? '#f5c518' : '#20242a'}
            emissive={i % 2 === 0 ? '#8a6a00' : '#000000'}
            emissiveIntensity={0.35}
          />
        </mesh>
      ))}
      <mesh position={[-0.85, 0.3, 0]}>
        <boxGeometry args={[0.1, 0.62, 0.12]} />
        <meshStandardMaterial color="#39424a" />
      </mesh>
      <mesh position={[0.85, 0.3, 0]}>
        <boxGeometry args={[0.1, 0.62, 0.12]} />
        <meshStandardMaterial color="#39424a" />
      </mesh>
      <mesh position={[0, 0.82, 0]}>
        <sphereGeometry args={[0.09, 8, 8]} />
        <meshStandardMaterial color="#ffb347" emissive="#ff9420" emissiveIntensity={2.4} />
      </mesh>
    </group>
  )
}

// Spreader colgado de la grua: barra amarilla suspendida por cables, sin nada
// que toque el suelo. Esa silueta se lee sola como "pasa por debajo" y ademas
// es la pieza mas reconocible de una terminal de contenedores.
// El canto inferior queda a 1.30 m: el corredor de pie no cabe, agachado si.
function HangingSpreader() {
  return (
    <group>
      <mesh position={[0, 1.55, 0]}>
        <boxGeometry args={[2.35, 0.5, 0.55]} />
        <meshStandardMaterial color="#f5c518" roughness={0.55} metalness={0.35} />
      </mesh>
      {/* franjas de advertencia en la cara que ve el jugador */}
      {[-0.78, -0.26, 0.26, 0.78].map((dx, i) => (
        <mesh key={i} position={[dx, 1.55, 0.29]} rotation={[0, 0, 0.5]}>
          <boxGeometry args={[0.2, 0.78, 0.03]} />
          <meshStandardMaterial color="#20242a" roughness={0.6} />
        </mesh>
      ))}
      {/* twistlocks de las esquinas */}
      {[-1.05, 1.05].map((dx) => (
        <mesh key={dx} position={[dx, 1.34, 0]}>
          <boxGeometry args={[0.3, 0.26, 0.42]} />
          <meshStandardMaterial color="#39424a" roughness={0.5} metalness={0.5} />
        </mesh>
      ))}
      {/* headblock y cables cortos: con cables largos, al salir despedido en
          un choque barrian la pantalla entera como dos barras grises */}
      <mesh position={[0, 3.05, 0]}>
        <boxGeometry args={[0.8, 0.34, 0.5]} />
        <meshStandardMaterial color="#39424a" roughness={0.5} metalness={0.5} />
      </mesh>
      {[-0.62, 0.62].map((dx) => (
        <mesh key={dx} position={[dx, 2.44, 0]}>
          <cylinderGeometry args={[0.05, 0.05, 1.28, 6]} />
          <meshStandardMaterial color="#8d99a6" roughness={0.4} metalness={0.6} />
        </mesh>
      ))}
      <mesh position={[0, 1.86, 0]}>
        <sphereGeometry args={[0.09, 8, 8]} />
        <meshStandardMaterial color="#ffb347" emissive="#ff9420" emissiveIntensity={2.4} />
      </mesh>
    </group>
  )
}

// ---------- Piezas de la Terminal de Usos Multiples ----------

// Cuchara bivalva apoyada en el suelo: se salta. Las dos valvas abiertas dan
// una silueta baja y ancha que se lee igual que la barrera de la TEC.
function ClamshellBucket() {
  return (
    <group>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * 0.42, 0.3, 0]} rotation={[0, 0, s * 0.42]}>
          <boxGeometry args={[0.72, 0.62, 1.5]} />
          <meshStandardMaterial color="#c2762c" roughness={0.55} metalness={0.45} />
        </mesh>
      ))}
      {/* dientes de la boca */}
      {[-0.62, -0.21, 0.21, 0.62].map((dx) => (
        <mesh key={dx} position={[dx, 0.06, 0.62]}>
          <boxGeometry args={[0.16, 0.14, 0.3]} />
          <meshStandardMaterial color="#3a3f46" metalness={0.6} roughness={0.4} />
        </mesh>
      ))}
      {/* cabezal y cables cortos */}
      <mesh position={[0, 0.72, 0]}>
        <boxGeometry args={[0.9, 0.24, 0.5]} />
        <meshStandardMaterial color="#39424a" metalness={0.5} roughness={0.5} />
      </mesh>
      <mesh position={[0, 0.9, 0]}>
        <sphereGeometry args={[0.1, 8, 8]} />
        <meshStandardMaterial color="#ffb347" emissive="#ff9420" emissiveIntensity={2.2} />
      </mesh>
    </group>
  )
}

// Banda transportadora que cruza el carril por encima: se pasa rodando. Igual
// que el spreader, el canto inferior queda a 1.30 m.
function Conveyor() {
  return (
    <group>
      <mesh position={[0, 1.62, 0]}>
        <boxGeometry args={[2.6, 0.44, 0.9]} />
        <meshStandardMaterial color="#5c666f" roughness={0.7} metalness={0.3} />
      </mesh>
      {/* la banda de hule, mas oscura, asomando por el canto */}
      <mesh position={[0, 1.4, 0]}>
        <boxGeometry args={[2.62, 0.12, 0.78]} />
        <meshStandardMaterial color="#22262b" roughness={0.9} />
      </mesh>
      {/* cubierta de galeria y soportes que no bajan al carril */}
      <mesh position={[0, 2.05, 0]}>
        <boxGeometry args={[2.5, 0.5, 1.0]} />
        <meshStandardMaterial color="#e0b32e" roughness={0.6} />
      </mesh>
      {[-1.18, 1.18].map((dx) => (
        <mesh key={dx} position={[dx, 2.5, 0]}>
          <boxGeometry args={[0.16, 0.9, 0.16]} />
          <meshStandardMaterial color="#8d99a6" metalness={0.5} roughness={0.4} />
        </mesh>
      ))}
      {[-0.86, 0.86].map((dx) => (
        <mesh key={dx} position={[dx, 1.62, 0.47]}>
          <boxGeometry args={[0.22, 0.5, 0.04]} />
          <meshStandardMaterial color="#20242a" roughness={0.6} />
        </mesh>
      ))}
    </group>
  )
}

// Tolva receptora: cono invertido sobre patas. Es el bloqueo total de la TUM,
// solo se sale cambiando de carril.
function Hopper({ tint }) {
  return (
    <group>
      <mesh position={[0, 1.5, 0]}>
        <cylinderGeometry args={[1.15, 0.42, 1.5, 4]} />
        <meshStandardMaterial color={tint} roughness={0.65} metalness={0.3} />
      </mesh>
      {/* boca de descarga */}
      <mesh position={[0, 0.62, 0]}>
        <cylinderGeometry args={[0.34, 0.34, 0.4, 8]} />
        <meshStandardMaterial color="#3a3f46" metalness={0.5} roughness={0.5} />
      </mesh>
      {[-1, 1].map((sx) =>
        [-1, 1].map((sz) => (
          <mesh key={`${sx}${sz}`} position={[sx * 0.82, 0.5, sz * 0.62]}>
            <boxGeometry args={[0.14, 1.0, 0.14]} />
            <meshStandardMaterial color="#6b7681" metalness={0.4} roughness={0.5} />
          </mesh>
        ))
      )}
      {/* reja superior y franja de advertencia */}
      <mesh position={[0, 2.28, 0]}>
        <boxGeometry args={[2.3, 0.12, 2.3]} />
        <meshStandardMaterial color="#20242a" roughness={0.8} />
      </mesh>
      <mesh position={[0, 1.95, 0.86]}>
        <boxGeometry args={[1.9, 0.22, 0.06]} />
        <meshStandardMaterial color="#f5c518" emissive="#8a6a00" emissiveIntensity={0.5} />
      </mesh>
    </group>
  )
}

function TallContainer({ tint, maps }) {
  const map = tiledTexture(maps.container, 'container', 1, 1)
  const door = tiledTexture(maps.containerDoor, 'containerDoor', 1, 1)
  return (
    <group>
      <mesh position={[0, 1.11, 0]}>
        <boxGeometry args={[2.05, 2.2, 2.3]} />
        <meshStandardMaterial map={map} color={tint} roughness={0.7} metalness={0.25} />
      </mesh>
      {/* puertas mirando al jugador */}
      <mesh position={[0, 1.11, 1.16]}>
        <planeGeometry args={[2.0, 2.15]} />
        <meshStandardMaterial map={door} color={tint} roughness={0.7} metalness={0.25} />
      </mesh>
      <mesh position={[0, 2.32, 1.05]}>
        <boxGeometry args={[2.05, 0.12, 0.12]} />
        <meshStandardMaterial color="#f5c518" emissive="#8a6a00" emissiveIntensity={0.5} />
      </mesh>
    </group>
  )
}

// Contenedor de 40 pies: 12 m tumbados a lo largo del carril. La diferencia
// con el de 20 no es estetica, es que la ventana de colision mide su largo, asi
// que el carril queda cerrado durante medio segundo largo y hay que decidir
// antes de llegar, no al lado.
function LongContainer({ tint, maps }) {
  const map = tiledTexture(maps.container, 'container', 1, 1)
  const door = tiledTexture(maps.containerDoor, 'containerDoor', 1, 1)
  return (
    <group>
      <mesh position={[0, 1.11, 0]}>
        <boxGeometry args={[2.05, 2.2, 12]} />
        <meshStandardMaterial map={map} color={tint} roughness={0.7} metalness={0.25} />
      </mesh>
      <mesh position={[0, 1.11, 6.01]}>
        <planeGeometry args={[2.0, 2.15]} />
        <meshStandardMaterial map={door} color={tint} roughness={0.7} metalness={0.25} />
      </mesh>
      {/* franja de advertencia en la esquina que se ve venir */}
      <mesh position={[0, 2.32, 5.4]}>
        <boxGeometry args={[2.05, 0.12, 0.12]} />
        <meshStandardMaterial color="#f5c518" emissive="#8a6a00" emissiveIntensity={0.5} />
      </mesh>
      {[-4, 0, 4].map((dz) => (
        <mesh key={dz} position={[0, 0.16, dz]}>
          <boxGeometry args={[2.15, 0.3, 0.5]} />
          <meshStandardMaterial color="#2b3138" roughness={0.8} />
        </mesh>
      ))}
    </group>
  )
}

// Tractocamion portuario con su chasis y contenedor. Va de frente al corredor,
// asi que la cara que se ve es la trompa: parrilla, faros y giro ambar.
function TerminalTractor({ tint, maps }) {
  const map = tiledTexture(maps.container, 'container', 1, 1)
  return (
    <group>
      {/* cabina mirando al jugador */}
      <mesh position={[0, 1.15, 2.2]}>
        <boxGeometry args={[1.95, 1.7, 2.2]} />
        <meshStandardMaterial color="#e0b32e" roughness={0.55} metalness={0.3} />
      </mesh>
      <mesh position={[0, 1.55, 3.31]}>
        <boxGeometry args={[1.6, 0.8, 0.06]} />
        <meshStandardMaterial color="#16324f" roughness={0.25} metalness={0.5} />
      </mesh>
      <mesh position={[0, 0.62, 3.3]}>
        <boxGeometry args={[1.9, 0.5, 0.14]} />
        <meshStandardMaterial color="#39424a" roughness={0.6} />
      </mesh>
      {[-0.7, 0.7].map((dx) => (
        <mesh key={dx} position={[dx, 0.95, 3.32]}>
          <boxGeometry args={[0.36, 0.24, 0.1]} />
          <meshStandardMaterial color="#fff3c4" emissive="#ffe9a0" emissiveIntensity={2.8} />
        </mesh>
      ))}
      <mesh position={[0, 2.12, 2.2]}>
        <boxGeometry args={[0.6, 0.18, 0.5]} />
        <meshStandardMaterial color="#ff9420" emissive="#ff9420" emissiveIntensity={2.6} />
      </mesh>
      {/* chasis con contenedor detras */}
      <mesh position={[0, 0.72, -1.4]}>
        <boxGeometry args={[1.8, 0.28, 5.2]} />
        <meshStandardMaterial color="#2b3138" roughness={0.8} />
      </mesh>
      <mesh position={[0, 1.95, -1.4]}>
        <boxGeometry args={[2.0, 2.15, 4.8]} />
        <meshStandardMaterial map={map} color={tint} roughness={0.7} metalness={0.25} />
      </mesh>
      {[-1, 1].map((sx) =>
        [2.3, -0.4, -3.2].map((dz) => (
          <mesh key={`${sx}${dz}`} position={[sx * 0.92, 0.46, dz]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.46, 0.46, 0.3, 10]} />
            <meshStandardMaterial color="#14181c" roughness={0.9} />
          </mesh>
        ))
      )}
    </group>
  )
}

// ---------- Piezas de la Terminal Intermodal ----------

// Chasis portacontenedores vacio: plataforma esqueleto pegada al suelo. Se
// salta. Al no llevar caja encima se ve a traves y no tapa lo que viene.
function EmptyChassis() {
  return (
    <group>
      {[-0.62, 0.62].map((dx) => (
        <mesh key={dx} position={[dx, 0.46, 0]}>
          <boxGeometry args={[0.22, 0.2, 2.6]} />
          <meshStandardMaterial color="#39424a" roughness={0.7} metalness={0.35} />
        </mesh>
      ))}
      {[-0.9, 0, 0.9].map((dz) => (
        <mesh key={dz} position={[0, 0.46, dz]}>
          <boxGeometry args={[1.55, 0.16, 0.18]} />
          <meshStandardMaterial color="#5c666f" roughness={0.7} />
        </mesh>
      ))}
      {/* twistlocks y reflejantes: dan el borde superior que hay que librar */}
      {[-0.62, 0.62].map((dx) => (
        <mesh key={`t${dx}`} position={[dx, 0.6, 1.05]}>
          <boxGeometry args={[0.26, 0.12, 0.26]} />
          <meshStandardMaterial color="#f5c518" emissive="#8a6a00" emissiveIntensity={0.5} />
        </mesh>
      ))}
      {[-1, 1].map((sx) =>
        [-0.7, 0.7].map((dz) => (
          <mesh key={`w${sx}${dz}`} position={[sx * 0.85, 0.3, dz]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.3, 0.3, 0.22, 10]} />
            <meshStandardMaterial color="#14181c" roughness={0.9} />
          </mesh>
        ))
      )}
    </group>
  )
}

// Grua puente de anden techado: la viga corre arriba y el polipasto cuelga.
// Lo que hay que librar es el bloque del gancho, que baja hasta 1.30 m.
function BridgeCrane() {
  return (
    <group>
      <mesh position={[0, 2.55, 0]}>
        <boxGeometry args={[2.7, 0.5, 0.7]} />
        <meshStandardMaterial color="#5c666f" roughness={0.6} metalness={0.45} />
      </mesh>
      <mesh position={[0, 2.16, 0]}>
        <boxGeometry args={[1.1, 0.4, 0.9]} />
        <meshStandardMaterial color="#e0b32e" roughness={0.6} />
      </mesh>
      {[-0.28, 0.28].map((dx) => (
        <mesh key={dx} position={[dx, 1.78, 0]}>
          <cylinderGeometry args={[0.045, 0.045, 0.9, 6]} />
          <meshStandardMaterial color="#8d99a6" metalness={0.6} roughness={0.4} />
        </mesh>
      ))}
      {/* bloque del gancho */}
      <mesh position={[0, 1.46, 0]}>
        <boxGeometry args={[0.85, 0.42, 0.55]} />
        <meshStandardMaterial color="#39424a" metalness={0.55} roughness={0.45} />
      </mesh>
      <mesh position={[0, 1.16, 0]}>
        <torusGeometry args={[0.17, 0.06, 6, 12]} />
        <meshStandardMaterial color="#c9d4dd" metalness={0.7} roughness={0.35} />
      </mesh>
      <mesh position={[0, 2.16, 0.47]}>
        <boxGeometry args={[0.9, 0.18, 0.05]} />
        <meshStandardMaterial color="#20242a" roughness={0.7} />
      </mesh>
      <mesh position={[0, 1.75, 0]}>
        <sphereGeometry args={[0.09, 8, 8]} />
        <meshStandardMaterial color="#ffb347" emissive="#ff9420" emissiveIntensity={2.4} />
      </mesh>
    </group>
  )
}

// Caja trailer sobre su chasis: el bloqueo corto del patio intermodal
function TrailerBox({ tint }) {
  return (
    <group>
      <mesh position={[0, 1.45, 0]}>
        <boxGeometry args={[2.0, 2.0, 2.3]} />
        <meshStandardMaterial color={tint} roughness={0.6} metalness={0.15} />
      </mesh>
      {/* puerta trasera con bisagras */}
      <mesh position={[0, 1.45, 1.17]}>
        <boxGeometry args={[1.92, 1.9, 0.06]} />
        <meshStandardMaterial color="#e9edf0" roughness={0.55} />
      </mesh>
      {[-0.55, 0.55].map((dx) => (
        <mesh key={dx} position={[dx, 1.45, 1.22]}>
          <boxGeometry args={[0.09, 1.8, 0.05]} />
          <meshStandardMaterial color="#39424a" metalness={0.5} roughness={0.5} />
        </mesh>
      ))}
      <mesh position={[0, 0.4, 0]}>
        <boxGeometry args={[1.7, 0.24, 2.2]} />
        <meshStandardMaterial color="#2b3138" roughness={0.8} />
      </mesh>
      {[-1, 1].map((sx) => (
        <mesh key={sx} position={[sx * 0.82, 0.3, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.3, 0.3, 0.24, 10]} />
          <meshStandardMaterial color="#14181c" roughness={0.9} />
        </mesh>
      ))}
      <mesh position={[0, 2.48, 1.0]}>
        <boxGeometry args={[2.0, 0.1, 0.1]} />
        <meshStandardMaterial color="#f5c518" emissive="#8a6a00" emissiveIntensity={0.5} />
      </mesh>
    </group>
  )
}

// Vagon de pozo con su contenedor: la unidad del convoy estacionado. Encadenar
// varios a 12.5 m deja un carril cerrado durante decenas de metros, que es de
// donde sale la sensacion de correr entre trenes parados.
function RailWagon({ tint, maps }) {
  const map = tiledTexture(maps.container, 'container', 1, 1)
  return (
    <group>
      {/* Largueros laterales: son los que dan la silueta de vagon de pozo, con
          el contenedor hundido entre ellos en vez de apoyado encima de una
          plancha. Antes el contenedor flotaba sobre un cajon oscuro. */}
      {[-1.16, 1.16].map((dx) => (
        <group key={dx}>
          <mesh position={[dx, 1.02, 0]}>
            <boxGeometry args={[0.26, 0.72, 11.6]} />
            <meshStandardMaterial color="#7d3a34" roughness={0.7} metalness={0.35} />
          </mesh>
          <mesh position={[dx, 1.44, 0]}>
            <boxGeometry args={[0.34, 0.16, 11.8]} />
            <meshStandardMaterial color="#93463e" roughness={0.65} metalness={0.4} />
          </mesh>
          {/* nervios verticales del larguero */}
          {[-4.6, -2.7, -0.9, 0.9, 2.7, 4.6].map((dz) => (
            <mesh key={dz} position={[dx * 1.08, 1.02, dz]}>
              <boxGeometry args={[0.08, 0.6, 0.28]} />
              <meshStandardMaterial color="#5f2c27" roughness={0.8} />
            </mesh>
          ))}
        </group>
      ))}
      {/* piso del pozo */}
      <mesh position={[0, 0.7, 0]}>
        <boxGeometry args={[2.1, 0.16, 11.2]} />
        <meshStandardMaterial color="#3a3f46" roughness={0.85} />
      </mesh>

      {/* bogies con bastidor visible y ruedas grandes */}
      {[-4.5, 4.5].map((dz) => (
        <group key={dz} position={[0, 0, dz]}>
          <mesh position={[0, 0.78, 0]}>
            <boxGeometry args={[1.5, 0.3, 1.1]} />
            <meshStandardMaterial color="#2b3138" roughness={0.85} />
          </mesh>
          {[-1, 1].map((sx) => (
            <mesh key={sx} position={[sx * 1.0, 0.5, 0]}>
              <boxGeometry args={[0.2, 0.5, 2.6]} />
              <meshStandardMaterial color="#20262c" roughness={0.85} />
            </mesh>
          ))}
          {[-0.95, 0.95].map((d2) =>
            [-1, 1].map((sx) => (
              <mesh
                key={`${d2}${sx}`}
                position={[sx * 1.02, 0.44, d2]}
                rotation={[0, 0, Math.PI / 2]}
              >
                <cylinderGeometry args={[0.44, 0.44, 0.16, 14]} />
                <meshStandardMaterial color="#4a5058" metalness={0.65} roughness={0.35} />
              </mesh>
            ))
          )}
        </group>
      ))}

      {/* contenedor hundido: su base queda por debajo del canto del larguero */}
      <mesh position={[0, 1.92, 0]}>
        <boxGeometry args={[2.02, 2.2, 11.3]} />
        <meshStandardMaterial map={map} color={tint} roughness={0.7} metalness={0.25} />
      </mesh>
      <mesh position={[0, 3.06, 5.0]}>
        <boxGeometry args={[2.02, 0.12, 0.12]} />
        <meshStandardMaterial color="#f5c518" emissive="#8a6a00" emissiveIntensity={0.5} />
      </mesh>

      {/* testero: platina, enganche y topes, en el extremo que se ve venir */}
      <mesh position={[0, 1.1, 5.95]}>
        <boxGeometry args={[2.5, 0.5, 0.3]} />
        <meshStandardMaterial color="#5f2c27" roughness={0.75} metalness={0.35} />
      </mesh>
      <mesh position={[0, 0.92, 6.25]}>
        <boxGeometry args={[0.42, 0.34, 0.5]} />
        <meshStandardMaterial color="#39424a" metalness={0.6} roughness={0.4} />
      </mesh>
      {[-0.82, 0.82].map((dx) => (
        <mesh key={dx} position={[dx, 1.1, 6.16]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.19, 0.19, 0.34, 10]} />
          <meshStandardMaterial color="#8d99a6" metalness={0.7} roughness={0.35} />
        </mesh>
      ))}
      {/* pasarela y barandal del extremo */}
      <mesh position={[0, 1.56, 5.6]}>
        <boxGeometry args={[2.3, 0.08, 0.7]} />
        <meshStandardMaterial color="#39424a" roughness={0.8} />
      </mesh>
      {[-1.0, 1.0].map((dx) => (
        <mesh key={dx} position={[dx, 1.9, 5.6]}>
          <boxGeometry args={[0.07, 0.7, 0.07]} />
          <meshStandardMaterial color="#c9d4dd" metalness={0.5} roughness={0.5} />
        </mesh>
      ))}
    </group>
  )
}

// Locomotora de maniobras entrando de frente. Es lo que mas rapido cierra del
// juego, asi que la cara tiene que gritar: trompa larga, faro central y
// franjas de peligro en el tope.
function Locomotive() {
  const RED = '#b8322c'
  const RED_DARK = '#8e241f'
  return (
    <group>
      {/* bastidor y faldon lateral: tapan la mitad de la rueda, que es lo que
          hace que se lea como maquina y no como caja sobre ruedas sueltas */}
      <mesh position={[0, 0.95, 0]}>
        <boxGeometry args={[2.5, 0.42, 13.2]} />
        <meshStandardMaterial color="#2b3138" roughness={0.8} metalness={0.35} />
      </mesh>
      {[-1.2, 1.2].map((dx) => (
        <mesh key={dx} position={[dx, 0.72, 0]}>
          <boxGeometry args={[0.14, 0.5, 12.4]} />
          <meshStandardMaterial color={RED_DARK} roughness={0.7} metalness={0.3} />
        </mesh>
      ))}

      {/* capo largo escalonado hacia la trompa: el escalon da perspectiva y
          quita el aspecto de ladrillo que tenia el bloque unico */}
      <mesh position={[0, 1.85, 2.4]}>
        <boxGeometry args={[2.0, 1.4, 5.4]} />
        <meshStandardMaterial color={RED} roughness={0.55} metalness={0.25} />
      </mesh>
      <mesh position={[0, 1.62, 5.6]}>
        <boxGeometry args={[1.75, 0.95, 1.3]} />
        <meshStandardMaterial color={RED} roughness={0.55} metalness={0.25} />
      </mesh>
      {/* rejillas de radiador y linea de cintura */}
      {[-1.01, 1.01].map((dx) => (
        <mesh key={dx} position={[dx, 2.0, 1.4]}>
          <boxGeometry args={[0.05, 0.7, 2.4]} />
          <meshStandardMaterial color="#20242a" roughness={0.9} />
        </mesh>
      ))}
      <mesh position={[0, 1.22, 2.4]}>
        <boxGeometry args={[2.04, 0.12, 5.4]} />
        <meshStandardMaterial color="#e9edf0" roughness={0.6} />
      </mesh>

      {/* cabina con techo saliente y ventanales */}
      <mesh position={[0, 2.5, -2.6]}>
        <boxGeometry args={[2.3, 2.2, 3.4]} />
        <meshStandardMaterial color={RED} roughness={0.55} metalness={0.25} />
      </mesh>
      <mesh position={[0, 3.68, -2.6]}>
        <boxGeometry args={[2.5, 0.22, 3.7]} />
        <meshStandardMaterial color={RED_DARK} roughness={0.6} />
      </mesh>
      <mesh position={[0, 2.85, -0.92]}>
        <boxGeometry args={[1.9, 1.1, 0.08]} />
        <meshStandardMaterial color="#16324f" roughness={0.2} metalness={0.6} />
      </mesh>
      {[-1.16, 1.16].map((dx) => (
        <mesh key={dx} position={[dx, 2.85, -2.6]}>
          <boxGeometry args={[0.06, 1.0, 2.4]} />
          <meshStandardMaterial color="#16324f" roughness={0.2} metalness={0.6} />
        </mesh>
      ))}
      <mesh position={[0, 4.0, -2.6]}>
        <boxGeometry args={[0.7, 0.22, 0.6]} />
        <meshStandardMaterial color="#ff9420" emissive="#ff9420" emissiveIntensity={2.8} />
      </mesh>

      {/* faros: uno alto centrado y dos bajos, la cara que se ve venir */}
      <mesh position={[0, 2.2, 6.27]}>
        <boxGeometry args={[0.6, 0.3, 0.12]} />
        <meshStandardMaterial color="#2b3138" roughness={0.8} />
      </mesh>
      <mesh position={[0, 2.2, 6.34]}>
        <boxGeometry args={[0.44, 0.2, 0.06]} />
        <meshStandardMaterial color="#fff3c4" emissive="#fff3c4" emissiveIntensity={3.4} />
      </mesh>
      {[-0.6, 0.6].map((dx) => (
        <mesh key={dx} position={[dx, 1.32, 6.3]}>
          <boxGeometry args={[0.3, 0.22, 0.08]} />
          <meshStandardMaterial color="#ffe9a0" emissive="#ffe9a0" emissiveIntensity={2.6} />
        </mesh>
      ))}
      {/* pasarela delantera con barandal */}
      <mesh position={[0, 1.18, 6.0]}>
        <boxGeometry args={[2.4, 0.1, 1.0]} />
        <meshStandardMaterial color="#39424a" roughness={0.8} />
      </mesh>
      {[-1.05, 1.05].map((dx) => (
        <mesh key={dx} position={[dx, 1.6, 6.2]}>
          <boxGeometry args={[0.07, 0.85, 0.07]} />
          <meshStandardMaterial color="#e9edf0" metalness={0.5} roughness={0.5} />
        </mesh>
      ))}

      {/* tope con franjas de peligro */}
      <mesh position={[0, 0.82, 6.5]}>
        <boxGeometry args={[2.55, 0.66, 0.28]} />
        <meshStandardMaterial color="#20242a" roughness={0.7} />
      </mesh>
      {[-0.86, -0.29, 0.29, 0.86].map((dx) => (
        <mesh key={dx} position={[dx, 0.82, 6.66]} rotation={[0, 0, 0.5]}>
          <boxGeometry args={[0.26, 0.92, 0.04]} />
          <meshStandardMaterial color="#f5c518" emissive="#8a6a00" emissiveIntensity={0.6} />
        </mesh>
      ))}
      <mesh position={[0, 0.62, 6.62]}>
        <boxGeometry args={[0.42, 0.34, 0.5]} />
        <meshStandardMaterial color="#39424a" metalness={0.6} roughness={0.4} />
      </mesh>

      {/* bogies de tres ejes */}
      {[-3.6, 3.6].map((cz) => (
        <group key={cz} position={[0, 0, cz]}>
          {[-1, 1].map((sx) => (
            <mesh key={sx} position={[sx * 1.06, 0.56, 0]}>
              <boxGeometry args={[0.18, 0.5, 3.6]} />
              <meshStandardMaterial color="#20262c" roughness={0.85} />
            </mesh>
          ))}
          {[-1.3, 0, 1.3].map((dz) =>
            [-1, 1].map((sx) => (
              <mesh
                key={`${dz}${sx}`}
                position={[sx * 1.08, 0.46, dz]}
                rotation={[0, 0, Math.PI / 2]}
              >
                <cylinderGeometry args={[0.46, 0.46, 0.16, 14]} />
                <meshStandardMaterial color="#4a5058" metalness={0.65} roughness={0.35} />
              </mesh>
            ))
          )}
        </group>
      ))}
    </group>
  )
}

// ---------- Piezas de la cubierta del crucero ----------

// Piscina: doce metros de carril que no se cruzan de ninguna manera. Es el
// bloqueo largo de la zona, el equivalente al contenedor de 40 pies.
function Pool() {
  return (
    <group>
      {/* Brocal en marco, no en losa: con una caja maciza de 2.15 x 12 el agua
          quedaba dentro del solido y la piscina se veia como un bloque blanco. */}
      {[-1, 1].map((sx) => (
        <mesh key={sx} position={[sx * 0.96, 0.16, 0]}>
          <boxGeometry args={[0.24, 0.32, 12]} />
          <meshStandardMaterial color="#eef2f5" roughness={0.5} />
        </mesh>
      ))}
      {[-1, 1].map((sz) => (
        <mesh key={`e${sz}`} position={[0, 0.16, sz * 5.88]}>
          <boxGeometry args={[2.15, 0.32, 0.24]} />
          <meshStandardMaterial color="#eef2f5" roughness={0.5} />
        </mesh>
      ))}
      {/* vaso hundido con el agua dentro */}
      <mesh position={[0, -0.35, 0]}>
        <boxGeometry args={[1.75, 1.0, 11.4]} />
        <meshStandardMaterial color="#0e6ea8" roughness={0.3} metalness={0.2} />
      </mesh>
      <mesh position={[0, 0.14, 0]}>
        <boxGeometry args={[1.72, 0.06, 11.3]} />
        <meshStandardMaterial
          color="#22a7e0"
          emissive="#1b7fb0"
          emissiveIntensity={0.7}
          roughness={0.15}
          metalness={0.35}
        />
      </mesh>
      {/* cenefa de gresite y escalerilla */}
      {[-1, 1].map((sx) => (
        <mesh key={sx} position={[sx * 0.9, 0.33, 0]}>
          <boxGeometry args={[0.14, 0.05, 11.6]} />
          <meshStandardMaterial color="#35d3ff" emissive="#35d3ff" emissiveIntensity={0.8} />
        </mesh>
      ))}
      {[-0.55, 0.55].map((dx) => (
        <mesh key={dx} position={[dx, 0.55, 5.4]}>
          <cylinderGeometry args={[0.05, 0.05, 0.8, 8]} />
          <meshStandardMaterial color="#d6dde4" metalness={0.85} roughness={0.2} />
        </mesh>
      ))}
      {/* salvavidas en el borde que se ve venir */}
      <mesh position={[0, 0.4, 5.9]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.34, 0.1, 8, 16]} />
        <meshStandardMaterial color="#ff5d4d" roughness={0.6} />
      </mesh>
    </group>
  )
}

// Tumbonas: se saltan. Van bajas y anchas para leerse como una fila de
// hamacas y no como una barrera de obra.
function DeckChairs() {
  return (
    <group>
      {[-0.5, 0.5].map((dx) => (
        <group key={dx} position={[dx, 0, 0]}>
          <mesh position={[0, 0.32, 0]}>
            <boxGeometry args={[0.72, 0.1, 1.7]} />
            <meshStandardMaterial color="#f4f6f8" roughness={0.6} />
          </mesh>
          <mesh position={[0, 0.5, -0.6]} rotation={[0.9, 0, 0]}>
            <boxGeometry args={[0.72, 0.1, 0.85]} />
            <meshStandardMaterial color="#f4f6f8" roughness={0.6} />
          </mesh>
          <mesh position={[0, 0.36, 0]}>
            <boxGeometry args={[0.62, 0.06, 1.5]} />
            <meshStandardMaterial color="#35d3ff" roughness={0.7} />
          </mesh>
          {[-0.7, 0.7].map((dz) => (
            <mesh key={dz} position={[0, 0.14, dz]}>
              <boxGeometry args={[0.66, 0.28, 0.07]} />
              <meshStandardMaterial color="#c9d4dd" metalness={0.5} roughness={0.4} />
            </mesh>
          ))}
        </group>
      ))}
      {/* mesita con toalla doblada, para que la fila no sea simetrica */}
      <mesh position={[0, 0.3, 0.95]}>
        <cylinderGeometry args={[0.24, 0.24, 0.08, 12]} />
        <meshStandardMaterial color="#e6ebef" roughness={0.6} />
      </mesh>
    </group>
  )
}

// Toldo de cubierta: la lona cuelga hasta 1.30 m, se pasa rodando. Los mastiles
// quedan fuera del carril para que no parezca que hay que esquivarlos.
function Awning({ tint }) {
  return (
    <group>
      <mesh position={[0, 2.15, 0]} rotation={[0, 0, 0]}>
        <boxGeometry args={[2.9, 0.12, 1.5]} />
        <meshStandardMaterial color={tint} roughness={0.75} />
      </mesh>
      {/* faldon que baja: es lo que obliga a rodar */}
      <mesh position={[0, 1.68, 0.72]}>
        <boxGeometry args={[2.9, 0.86, 0.08]} />
        <meshStandardMaterial color={tint} roughness={0.75} />
      </mesh>
      {[-0.95, -0.3, 0.35, 1.0].map((dx) => (
        <mesh key={dx} position={[dx, 1.3, 0.74]}>
          <boxGeometry args={[0.5, 0.24, 0.06]} />
          <meshStandardMaterial color="#ffffff" roughness={0.7} />
        </mesh>
      ))}
      {[-1.4, 1.4].map((dx) => (
        <mesh key={dx} position={[dx, 1.1, 0]}>
          <cylinderGeometry args={[0.07, 0.07, 2.2, 8]} />
          <meshStandardMaterial color="#d6dde4" metalness={0.6} roughness={0.35} />
        </mesh>
      ))}
      <mesh position={[0, 2.32, 0]}>
        <boxGeometry args={[0.9, 0.14, 0.4]} />
        <meshStandardMaterial color="#f5c518" emissive="#8a6a00" emissiveIntensity={0.4} />
      </mesh>
    </group>
  )
}

// Bar de cubierta: bloqueo macizo, solo se esquiva de carril
function DeckBar({ tint }) {
  return (
    <group>
      <mesh position={[0, 0.62, 0]}>
        <boxGeometry args={[2.05, 1.24, 1.5]} />
        <meshStandardMaterial color="#9a7a4e" roughness={0.75} />
      </mesh>
      <mesh position={[0, 1.3, 0]}>
        <boxGeometry args={[2.25, 0.14, 1.8]} />
        <meshStandardMaterial color="#e6ebef" roughness={0.4} metalness={0.2} />
      </mesh>
      {/* estanteria de botellas y toldo del bar */}
      <mesh position={[0, 1.75, -0.5]}>
        <boxGeometry args={[1.9, 0.8, 0.3]} />
        <meshStandardMaterial color="#7a5f3c" roughness={0.8} />
      </mesh>
      {[-0.6, -0.2, 0.2, 0.6].map((dx) => (
        <mesh key={dx} position={[dx, 1.62, -0.35]}>
          <cylinderGeometry args={[0.09, 0.09, 0.42, 8]} />
          <meshStandardMaterial color={tint} roughness={0.3} metalness={0.3} />
        </mesh>
      ))}
      <mesh position={[0, 2.3, 0]}>
        <boxGeometry args={[2.6, 0.12, 2.2]} />
        <meshStandardMaterial color="#35d3ff" roughness={0.7} />
      </mesh>
      {[-1.15, 1.15].map((dx) => (
        <mesh key={dx} position={[dx, 1.75, 0.9]}>
          <cylinderGeometry args={[0.06, 0.06, 1.1, 8]} />
          <meshStandardMaterial color="#d6dde4" metalness={0.6} roughness={0.35} />
        </mesh>
      ))}
      {/* taburetes del lado del corredor */}
      {[-0.6, 0.6].map((dx) => (
        <mesh key={dx} position={[dx, 0.5, 1.1]}>
          <cylinderGeometry args={[0.22, 0.18, 1.0, 10]} />
          <meshStandardMaterial color="#c9d4dd" metalness={0.4} roughness={0.5} />
        </mesh>
      ))}
    </group>
  )
}

// Carrito de servicio cruzando la cubierta
function ServiceCart({ tint }) {
  return (
    <group>
      <mesh position={[0, 0.85, 0]}>
        <boxGeometry args={[1.5, 1.1, 2.4]} />
        <meshStandardMaterial color="#e6ebef" roughness={0.5} metalness={0.2} />
      </mesh>
      <mesh position={[0, 1.46, 0]}>
        <boxGeometry args={[1.7, 0.12, 2.6]} />
        <meshStandardMaterial color={tint} roughness={0.6} />
      </mesh>
      {[0.55, -0.2, -0.95].map((dz) => (
        <mesh key={dz} position={[0, 1.02, dz]}>
          <boxGeometry args={[1.54, 0.06, 0.5]} />
          <meshStandardMaterial color="#c9d4dd" metalness={0.4} roughness={0.5} />
        </mesh>
      ))}
      {[-1, 1].map((sx) =>
        [-0.9, 0.9].map((dz) => (
          <mesh key={`${sx}${dz}`} position={[sx * 0.62, 0.16, dz]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.16, 0.16, 0.1, 8]} />
            <meshStandardMaterial color="#20242a" roughness={0.9} />
          </mesh>
        ))
      )}
      <mesh position={[0, 1.85, 0]}>
        <sphereGeometry args={[0.1, 8, 8]} />
        <meshStandardMaterial color="#ffb347" emissive="#ff9420" emissiveIntensity={2.2} />
      </mesh>
    </group>
  )
}

// ---------- Piezas del astillero ----------

// Planchas de acero apiladas sobre caballetes. Reemplaza al cabrestante, que a
// distancia se leia como un cilindro rojo indescifrable: no se entendia que era
// ni que habia que saltarlo. Una pila plana, ancha y con capas visibles se lee
// de inmediato como "objeto en el suelo" y ademas es material de casco.
function SteelPlates() {
  const LAYERS = [0.12, 0.24, 0.36, 0.48]
  return (
    <group>
      {/* caballetes */}
      {[-0.7, 0.7].map((dz) => (
        <mesh key={dz} position={[0, 0.06, dz]}>
          <boxGeometry args={[2.1, 0.12, 0.34]} />
          <meshStandardMaterial color="#3a3f46" roughness={0.85} />
        </mesh>
      ))}
      {/* planchas: cada capa un poco mas corta, como una pila real */}
      {LAYERS.map((y, i) => (
        <mesh key={y} position={[0, y, 0]}>
          <boxGeometry args={[2.05 - i * 0.12, 0.1, 1.9 - i * 0.1]} />
          <meshStandardMaterial color={i % 2 ? '#7d858d' : '#8f979f'} metalness={0.6} roughness={0.45} />
        </mesh>
      ))}
      {/* cantos oxidados: dan el material y separan las capas */}
      {LAYERS.map((y, i) => (
        <mesh key={`e${y}`} position={[0, y, (1.9 - i * 0.1) / 2 + 0.02]}>
          <boxGeometry args={[2.05 - i * 0.12, 0.11, 0.04]} />
          <meshStandardMaterial color="#8f5b3c" roughness={0.9} />
        </mesh>
      ))}
      {/* franja de advertencia en el canto que se ve venir, y esquineros */}
      <mesh position={[0, 0.58, 0]}>
        <boxGeometry args={[1.9, 0.06, 1.75]} />
        <meshStandardMaterial color="#f5c518" emissive="#8a6a00" emissiveIntensity={0.55} />
      </mesh>
      {[-1, 1].map((sx) => (
        <mesh key={sx} position={[sx * 0.98, 0.32, 0.9]}>
          <boxGeometry args={[0.16, 0.66, 0.16]} />
          <meshStandardMaterial color="#20242a" roughness={0.8} />
        </mesh>
      ))}
    </group>
  )
}

// Travesano de andamio: el tubo cruzado y la red de proteccion cuelgan hasta
// 1.30 m, se pasa rodando. Los verticales quedan fuera del carril.
function ScaffoldBrace() {
  return (
    <group>
      <mesh position={[0, 2.4, 0]} rotation={[0, 0, 0]}>
        <cylinderGeometry args={[0.09, 0.09, 3.0, 8]} />
        <meshStandardMaterial color="#c9a12e" metalness={0.5} roughness={0.5} />
      </mesh>
      <mesh position={[0, 1.55, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.09, 0.09, 3.0, 8]} />
        <meshStandardMaterial color="#c9a12e" metalness={0.5} roughness={0.5} />
      </mesh>
      {/* diagonales de arriostrado */}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[0, 1.98, 0]} rotation={[0, 0, s * 0.62]}>
          <cylinderGeometry args={[0.06, 0.06, 3.2, 6]} />
          <meshStandardMaterial color="#b09030" metalness={0.5} roughness={0.55} />
        </mesh>
      ))}
      {/* malla verde de proteccion, que es lo que se ve y obliga a agacharse */}
      <mesh position={[0, 1.95, 0.34]}>
        <boxGeometry args={[2.9, 0.8, 0.04]} />
        <meshStandardMaterial color="#2c6e49" transparent opacity={0.72} roughness={0.9} />
      </mesh>
      {[-1.45, 1.45].map((dx) => (
        <mesh key={dx} position={[dx, 1.5, 0]}>
          <cylinderGeometry args={[0.1, 0.1, 3.0, 8]} />
          <meshStandardMaterial color="#c9a12e" metalness={0.5} roughness={0.5} />
        </mesh>
      ))}
      <mesh position={[0, 1.38, 0.34]}>
        <boxGeometry args={[2.9, 0.16, 0.06]} />
        <meshStandardMaterial color="#f5c518" emissive="#8a6a00" emissiveIntensity={0.6} />
      </mesh>
    </group>
  )
}

// Linea de servicios del dique: manguera de aire, cable de soldadura y
// umbilicales cruzando el carril sobre caballetes. Es la pieza de rodar que va
// DEBAJO del tablero de un andamio, asi que no puede pasar de ~1.9 m: por eso
// no se usa aqui el marco de andamio, que atravesaria el tablero.
function ServiceLine() {
  const HOSES = [
    { y: 1.28, r: 0.11, c: '#c94b2e' },
    { y: 1.5, r: 0.09, c: '#2f6f9e' },
    { y: 1.42, r: 0.07, c: '#d8a520' },
  ]
  return (
    <group>
      {[-1, 1].map((sx) => (
        <group key={sx}>
          {/* caballete */}
          <mesh position={[sx * 0.92, 0.75, 0]}>
            <boxGeometry args={[0.14, 1.5, 0.14]} />
            <meshStandardMaterial color="#5a6068" metalness={0.5} roughness={0.6} />
          </mesh>
          <mesh position={[sx * 0.92, 0.06, 0]}>
            <boxGeometry args={[0.44, 0.12, 0.7]} />
            <meshStandardMaterial color="#3a3f46" roughness={0.85} />
          </mesh>
        </group>
      ))}
      {HOSES.map((h) => (
        <mesh key={h.y + h.c} position={[0, h.y, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[h.r, h.r, 2.05, 8]} />
          <meshStandardMaterial color={h.c} roughness={0.8} />
        </mesh>
      ))}
      {/* colector y valvulas: dan a entender que son lineas de servicio */}
      <mesh position={[0, 1.62, 0]}>
        <boxGeometry args={[0.6, 0.3, 0.4]} />
        <meshStandardMaterial color="#6b7280" metalness={0.6} roughness={0.5} />
      </mesh>
      {[-0.22, 0.22].map((dx) => (
        <mesh key={dx} position={[dx, 1.84, 0]}>
          <cylinderGeometry args={[0.12, 0.12, 0.12, 10]} />
          <meshStandardMaterial color="#c94b2e" metalness={0.5} roughness={0.5} />
        </mesh>
      ))}
      {/* franja de aviso a la altura a la que cierra el paso */}
      <mesh position={[0, 1.5, 0.26]}>
        <boxGeometry args={[2.05, 0.16, 0.05]} />
        <meshStandardMaterial color="#f5c518" emissive="#8a6a00" emissiveIntensity={0.6} />
      </mesh>
    </group>
  )
}

// Gancho de la grua con una viga eslingada. Es lo unico que se mueve a la
// altura del tablero del andamio: llega de frente y hay que pasarlo rodando
// sin salirse del tablero, que mide 2.1 m de ancho.
function CraneHook() {
  const g = useRef()
  useFrame(({ clock }) => {
    if (!g.current) return
    // balanceo corto: la carga viene viva, no clavada en el aire
    const t = clock.elapsedTime
    g.current.rotation.z = Math.sin(t * 1.6) * 0.09
    g.current.rotation.y = Math.sin(t * 0.9) * 0.12
  })
  return (
    <group ref={g}>
      {/* cable hasta el carro de la grua, muy por encima del cuadro */}
      <mesh position={[0, 8.8, 0]}>
        <cylinderGeometry args={[0.05, 0.05, 10.4, 6]} />
        <meshStandardMaterial color="#4a4f57" metalness={0.7} roughness={0.4} />
      </mesh>
      {/* moton y gancho */}
      <mesh position={[0, 3.25, 0]}>
        <boxGeometry args={[0.44, 0.7, 0.36]} />
        <meshStandardMaterial color="#d0451b" metalness={0.5} roughness={0.5} />
      </mesh>
      <mesh position={[0, 2.75, 0]} rotation={[0, 0, 0.4]}>
        <torusGeometry args={[0.3, 0.09, 8, 12, Math.PI * 1.4]} />
        <meshStandardMaterial color="#e0e3e8" metalness={0.8} roughness={0.3} />
      </mesh>
      {/* eslingas */}
      {[-1, 1].map((sx) => (
        <mesh key={sx} position={[sx * 0.42, 2.15, 0]} rotation={[0, 0, sx * 0.3]}>
          <boxGeometry args={[0.08, 1.1, 0.08]} />
          <meshStandardMaterial color="#2f6f9e" roughness={0.85} />
        </mesh>
      ))}
      {/* viga colgada: es la que cierra el paso a la altura del pecho, o sea
          justo lo que obliga a rodar sin salirse del tablero */}
      <mesh position={[0, 1.5, 0]}>
        <boxGeometry args={[2.7, 0.34, 0.3]} />
        <meshStandardMaterial color="#8a939c" metalness={0.6} roughness={0.45} />
      </mesh>
      {[1.28, 1.72].map((y) => (
        <mesh key={y} position={[0, y, 0]}>
          <boxGeometry args={[2.7, 0.12, 0.62]} />
          <meshStandardMaterial color="#79828b" metalness={0.6} roughness={0.5} />
        </mesh>
      ))}
      {/* franja de aviso y banderolas: hay que leerlo de lejos */}
      <mesh position={[0, 1.5, 0.33]}>
        <boxGeometry args={[2.72, 0.2, 0.05]} />
        <meshStandardMaterial color="#f5c518" emissive="#8a6a00" emissiveIntensity={0.7} />
      </mesh>
      {[-1.1, 0, 1.1].map((dx) => (
        <mesh key={dx} position={[dx, 1.05, 0]}>
          <boxGeometry args={[0.22, 0.34, 0.03]} />
          <meshStandardMaterial color="#ff5a1f" emissive="#5a1c00" emissiveIntensity={0.5} />
        </mesh>
      ))}
    </group>
  )
}

// Torre de andamio con su plataforma: bloqueo macizo del carril
function ScaffoldTower() {
  const V = [-0.85, 0.85]
  return (
    <group>
      {V.map((dx) =>
        V.map((dz) => (
          <mesh key={`${dx}${dz}`} position={[dx, 1.2, dz]}>
            <cylinderGeometry args={[0.09, 0.09, 2.4, 8]} />
            <meshStandardMaterial color="#c9a12e" metalness={0.5} roughness={0.5} />
          </mesh>
        ))
      )}
      {[0.5, 1.35, 2.2].map((y) => (
        <group key={y}>
          {V.map((dz) => (
            <mesh key={dz} position={[0, y, dz]} rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.07, 0.07, 1.7, 6]} />
              <meshStandardMaterial color="#b09030" metalness={0.5} roughness={0.55} />
            </mesh>
          ))}
        </group>
      ))}
      {/* tablones de la plataforma y rodapie */}
      <mesh position={[0, 1.62, 0]}>
        <boxGeometry args={[1.9, 0.1, 1.9]} />
        <meshStandardMaterial color="#9a7a4e" roughness={0.85} />
      </mesh>
      <mesh position={[0, 1.78, 0.9]}>
        <boxGeometry args={[1.9, 0.24, 0.06]} />
        <meshStandardMaterial color="#c9a12e" roughness={0.6} />
      </mesh>
      {/* red y cubo de herramienta arriba */}
      <mesh position={[0, 2.05, 0.92]}>
        <boxGeometry args={[1.8, 0.7, 0.04]} />
        <meshStandardMaterial color="#2c6e49" transparent opacity={0.7} roughness={0.9} />
      </mesh>
      <mesh position={[0.45, 1.85, -0.2]}>
        <cylinderGeometry args={[0.22, 0.18, 0.36, 10]} />
        <meshStandardMaterial color="#d4603c" roughness={0.7} />
      </mesh>
    </group>
  )
}

// Mega-bloque de casco sobre picaderos: doce metros de acero curvado esperando
// a que la Goliath lo levante. Es el bloqueo largo del astillero.
function HullBlock({ tint }) {
  return (
    <group>
      <mesh position={[0, 1.3, 0]}>
        <boxGeometry args={[2.1, 2.0, 12]} />
        <meshStandardMaterial color={tint} roughness={0.75} metalness={0.35} />
      </mesh>
      {/* pantoque: el canto inferior curvado, con un chaflan */}
      <mesh position={[0, 0.42, 0]} rotation={[0, 0, 0.5]}>
        <boxGeometry args={[1.1, 1.1, 12]} />
        <meshStandardMaterial color={tint} roughness={0.75} metalness={0.35} />
      </mesh>
      {/* refuerzos transversales y cordones de soldadura */}
      {[-4.5, -1.5, 1.5, 4.5].map((dz) => (
        <mesh key={dz} position={[0, 1.3, dz]}>
          <boxGeometry args={[2.2, 2.05, 0.16]} />
          <meshStandardMaterial color="#8f5b3c" roughness={0.85} />
        </mesh>
      ))}
      <mesh position={[0, 2.34, 0]}>
        <boxGeometry args={[2.2, 0.12, 12]} />
        <meshStandardMaterial color="#f5c518" emissive="#8a6a00" emissiveIntensity={0.45} />
      </mesh>
      {/* picaderos de madera y cunas */}
      {[-4.8, -1.6, 1.6, 4.8].map((dz) => (
        <mesh key={`p${dz}`} position={[0, 0.14, dz]}>
          <boxGeometry args={[2.4, 0.28, 0.9]} />
          <meshStandardMaterial color="#6b563a" roughness={0.95} />
        </mesh>
      ))}
      {/* cartelas de izado en la cara que se ve venir */}
      {[-0.6, 0.6].map((dx) => (
        <mesh key={dx} position={[dx, 2.55, 5.6]}>
          <boxGeometry args={[0.18, 0.42, 0.5]} />
          <meshStandardMaterial color="#8d99a6" metalness={0.7} roughness={0.3} />
        </mesh>
      ))}
    </group>
  )
}

// SPMT: transportador modular autopropulsado, con una seccion de casco encima,
// viniendo de frente. Muchas ruedas pequenas y muy poca altura de plataforma.
function Spmt({ tint }) {
  return (
    <group>
      <mesh position={[0, 0.62, 0]}>
        <boxGeometry args={[2.3, 0.55, 6.4]} />
        <meshStandardMaterial color="#e0b32e" roughness={0.6} metalness={0.3} />
      </mesh>
      <mesh position={[0, 0.94, 0]}>
        <boxGeometry args={[2.4, 0.12, 6.6]} />
        <meshStandardMaterial color="#39424a" roughness={0.8} />
      </mesh>
      {/* seccion de casco cargada */}
      <mesh position={[0, 1.85, -0.3]}>
        <boxGeometry args={[2.0, 1.7, 5.0]} />
        <meshStandardMaterial color={tint} roughness={0.75} metalness={0.35} />
      </mesh>
      {[-1.4, 1.4].map((dz) => (
        <mesh key={dz} position={[0, 1.85, dz]}>
          <boxGeometry args={[2.1, 1.75, 0.14]} />
          <meshStandardMaterial color="#8f5b3c" roughness={0.85} />
        </mesh>
      ))}
      {/* trenes de ruedas: la firma del SPMT */}
      {[-1, 1].map((sx) =>
        [-2.6, -1.6, -0.5, 0.5, 1.6, 2.6].map((dz) => (
          <mesh key={`${sx}${dz}`} position={[sx * 1.02, 0.28, dz]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.28, 0.28, 0.3, 10]} />
            <meshStandardMaterial color="#14181c" roughness={0.9} />
          </mesh>
        ))
      )}
      {/* baliza y faros de la cara que se ve venir */}
      <mesh position={[0, 1.12, 3.35]}>
        <boxGeometry args={[2.2, 0.3, 0.12]} />
        <meshStandardMaterial color="#20242a" roughness={0.7} />
      </mesh>
      {[-0.75, 0.75].map((dx) => (
        <mesh key={dx} position={[dx, 1.12, 3.42]}>
          <boxGeometry args={[0.34, 0.2, 0.06]} />
          <meshStandardMaterial color="#fff3c4" emissive="#ffe9a0" emissiveIntensity={2.8} />
        </mesh>
      ))}
      <mesh position={[0, 2.85, -0.3]}>
        <boxGeometry args={[0.6, 0.2, 0.5]} />
        <meshStandardMaterial color="#ff9420" emissive="#ff9420" emissiveIntensity={2.8} />
      </mesh>
    </group>
  )
}

function Obstacle({ ob, maps }) {
  const group = useRef()
  const local = useRef({ hit: false, t: 0, dir: 1 })

  useFrame((_, dt0) => {
    const dt = Math.min(dt0, 0.05)
    const phase = useGame.getState().phase
    const st = local.current
    // el tractocamion suma su propio avance: viene de frente, no solo se acerca
    // porque el mundo se mueve
    const z = ob.zw + scroll.s * (1 + ob.approach)
    const half = (ob.len || OBSTACLE_LEN[ob.type]) / 2

    // Una pieza solo estorba a la altura a la que esta puesta: en el astillero
    // hay obstaculos SOBRE el tablero del andamio y otros debajo, en el mismo
    // carril y a pocos metros. Sin esta comprobacion, el que corre por arriba
    // chocaba con lo que hay 2.7 m mas abajo.
    const sameLevel = Math.abs(runtime.deck - ob.dy) < 1.4

    if (phase === 'playing' && !st.hit && sameLevel && Math.abs(z - PLAYER_Z) < half) {
      const dx = Math.abs(LANES[ob.lane] - runtime.x)
      // cada tipo tiene una unica salida: la barrera se salta, el spreader se
      // pasa rodando (y rodar no sirve de nada contra la barrera) y todo lo que
      // es macizo solo se esquiva cambiando de carril
      let clear
      if (ob.type === 'low') clear = runtime.y >= 0.62
      else if (ob.type === 'high' || ob.type === 'hook' || ob.type === 'pipe')
        clear = runtime.slide > 0 && runtime.y < 0.35
      else clear = false
      if (dx < 0.95 && !clear) {
        st.hit = true
        st.t = 0
        // sale despedido hacia el lado contrario al jugador: si se va hacia el
        // carril del jugador tapa la vista justo cuando mas la necesita
        st.dir = runtime.x <= LANES[ob.lane] ? 1 : -1
        useGame.getState().crash(ob.label)
        sfx.bad()
        runtime.shake = 0.7
        runtime.stagger = 0.5
        // chocar te deja de pie: seguir agachado tras el golpe se lee como que
        // el deslizamiento funciono
        runtime.slide = 0
      }
    }

    if (!group.current) return

    // Golpe: impulso lateral + parabola. La posicion se recalcula entera cada
    // frame (el scroll la reescribe), por eso el desplazamiento sale del
    // tiempo acumulado y no de sumas sobre position.
    if (st.hit) {
      st.t += dt
      const t = st.t
      group.current.position.set(
        LANES[ob.lane] + st.dir * t * 6.5,
        ob.dy + Math.max(-4, 3.2 * t - 6 * t * t),
        z
      )
      group.current.rotation.z = st.dir * t * 5
      group.current.rotation.x = t * 3
    } else {
      group.current.position.set(LANES[ob.lane], ob.dy, z)
      group.current.rotation.set(0, 0, 0)
    }
  })

  return (
    <group ref={group}>
      <Skin ob={ob} maps={maps} />
    </group>
  )
}

// Vestuario por zona. La mecanica no cambia nunca (low se salta, high se pasa
// rodando, tall se esquiva); lo unico que cambia es la pieza, que es el equipo
// real de esa unidad de negocio.
const TEC_SKIN = {
  low: LowBarrier,
  high: HangingSpreader,
  tall: TallContainer,
  long: LongContainer,
  truck: TerminalTractor,
  loco: TerminalTractor,
}

const SKINS = {
  tum: { ...TEC_SKIN, low: ClamshellBucket, high: Conveyor, tall: Hopper },
  tec: TEC_SKIN,
  intermodal: {
    ...TEC_SKIN,
    low: EmptyChassis,
    high: BridgeCrane,
    tall: TrailerBox,
    long: RailWagon,
    loco: Locomotive,
  },
  crucero: {
    ...TEC_SKIN,
    low: DeckChairs,
    high: Awning,
    tall: DeckBar,
    long: Pool,
    truck: ServiceCart,
  },
  astillero: {
    ...TEC_SKIN,
    low: SteelPlates,
    high: ScaffoldBrace,
    tall: ScaffoldTower,
    long: HullBlock,
    truck: Spmt,
    hook: CraneHook,
    pipe: ServiceLine,
  },
}

function Skin({ ob, maps }) {
  // astillero, crucero e intermodal todavia corren con las piezas de la TEC:
  // estan a la espera de la lista de equipos de cada unidad
  const set = SKINS[ob.theme] || TEC_SKIN
  const Piece = set[ob.type] || TEC_SKIN[ob.type]
  return <Piece tint={tintFor(ob.key)} maps={maps} />
}

const LIST = COURSE.obstacles

// El curso ya no recicla un pool: es una lista ordenada por distancia y en
// escena solo viven los tramos que caben en la niebla. Los indices avanzan en
// un solo sentido, asi que basta con mover dos cursores.
export function Obstacles() {
  const maps = useGameTextures()
  const [win, setWin] = useState([0, 0])
  const [run, setRun] = useState(0)
  const cur = useRef([0, 0])

  useEffect(
    () =>
      useGame.subscribe((state, prev) => {
        if (state.phase === 'countdown' && prev.phase !== 'countdown') {
          cur.current = [0, 0]
          setWin([0, 0])
          // fuerza el remontaje: si no, los que ya chocaron seguirian marcados
          setRun((r) => r + 1)
        }
      }),
    []
  )

  useFrame(() => {
    let [a, b] = cur.current
    while (a < LIST.length && LIST[a].zw + scroll.s * (1 + LIST[a].approach) > 14) a++
    while (b < LIST.length && LIST[b].d <= scroll.s + VIEW_AHEAD) b++
    if (a !== cur.current[0] || b !== cur.current[1]) {
      cur.current = [a, b]
      setWin([a, b])
    }
  })

  return LIST.slice(win[0], win[1]).map((ob) => (
    <Obstacle key={`${run}-${ob.key}`} ob={ob} maps={maps} />
  ))
}
