import { memo, useEffect, useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGame } from '../store'
import { scroll } from '../runtime'
import { SEGMENT_LENGTH as L, NUM_SEGMENTS, THEME_METERS, LANES, COLORS } from '../constants'
import { ZONES, cruStage, astStage, deckAt, DECK_Y, DOCK_Y, SHIP_FROM, SHIP_TO } from '../course'
import { useGameTextures, tiledTexture } from '../textures'

const START = 16 // borde frontal del segmento k=0 cuando scroll=0


function mulberry32(a) {
  return function () {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// El escenario sale de la misma lista de zonas que el curso: asi el paisaje no
// puede quedarse en la unidad anterior cuando el portico ya cambio de zona.
const themeFor = (k) => ZONES[Math.floor((k * L) / THEME_METERS) % ZONES.length].key

// Tintes claros: multiplican la textura gris del contenedor
const CONTAINER_COLORS = ['#2a6bd4', '#00aef0', '#2c9d8a', '#d4603c', '#2c6e49', '#e0b32e', '#b04a6e']

function buildProps(theme, seed) {
  const rnd = mulberry32(seed * 9301 + 49297)
  const out = []
  const box = (pos, size, color, extra = {}) => out.push({ geo: 'box', pos, size, color, ...extra })
  const cyl = (pos, args, color, extra = {}) => out.push({ geo: 'cyl', pos, args, color, ...extra })
  const sph = (pos, args, color, extra = {}) =>
    out.push({ geo: 'sph', pos, args, color, emissive: color, emissiveIntensity: 2, ...extra })

  const laneLines = (edgeColor = '#0d5c8c') => {
    box([-1.15, 0.03, 0], [0.07, 0.02, L], COLORS.neon, { emissive: COLORS.neon, emissiveIntensity: 1.4 })
    box([1.15, 0.03, 0], [0.07, 0.02, L], COLORS.neon, { emissive: COLORS.neon, emissiveIntensity: 1.4 })
    box([-3.5, 0.025, 0], [0.12, 0.02, L], '#123a5e', { emissive: edgeColor, emissiveIntensity: 0.7 })
    box([3.5, 0.025, 0], [0.12, 0.02, L], '#123a5e', { emissive: edgeColor, emissiveIntensity: 0.7 })
  }

  // Contenedor con proporciones reales: 2.4 ancho x 2.2 alto x 5.8 largo
  const container = (x, y, z, color) =>
    box([x, y, z], [2.4, 2.2, 5.8], color, { tex: 'container', repeat: [2, 1], roughness: 0.7, metalness: 0.25 })

  const stack = (x, z, maxH) => {
    const h = 1 + Math.floor(rnd() * maxH)
    const color = CONTAINER_COLORS[Math.floor(rnd() * CONTAINER_COLORS.length)]
    for (let i = 0; i < h; i++) {
      container(x + (rnd() - 0.5) * 0.15, 1.12 + i * 2.24, z, rnd() < 0.6 ? color : CONTAINER_COLORS[Math.floor(rnd() * CONTAINER_COLORS.length)])
    }
    return h
  }

  // Grua RTG: portico sobre las pilas laterales
  // span = separacion de las patas. Cuando la grua se planta sobre los tres
  // carriles hay que abrirla: con el valor de patio las patas caerian sobre los
  // carriles laterales. Math.sign(0) es 0, asi que el fallback tampoco sobra.
  const rtg = (x, z, span = 3.6) => {
    const s = Math.sign(x) || 1
    for (const dz of [-2.6, 2.6]) {
      box([x - span * s, 4.6, z + dz], [0.45, 9.2, 0.45], '#e8eef2')
      box([x + span * s, 4.6, z + dz], [0.45, 9.2, 0.45], '#e8eef2')
      cyl([x - span * s, 0.5, z + dz], [0.55, 0.55, 0.5, 10], '#1b232c', { rot: [0, 0, Math.PI / 2] })
      cyl([x + span * s, 0.5, z + dz], [0.55, 0.55, 0.5, 10], '#1b232c', { rot: [0, 0, Math.PI / 2] })
    }
    box([x, 9.3, z], [span * 2 + 0.8, 0.55, 6], '#e8eef2')
    box([x - (span - 2.1) * s, 8.5, z], [1.5, 1.1, 1.3], COLORS.sky, {
      emissive: COLORS.sky,
      emissiveIntensity: 0.4,
    })
    box([x, 7.6, z], [0.12, 3, 0.12], '#4a5560')
    box([x, 6.0, z], [2.2, 0.5, 1.6], '#e0b32e')
  }

  // Grua STS de muelle en silueta lejana, con pluma hacia el mar
  const sts = (x, z) => {
    const s = Math.sign(x)
    for (const dz of [-3, 3]) {
      box([x - 2.5 * s, 7, z + dz], [0.7, 14, 0.7], '#2e4a66')
      box([x + 2.5 * s, 7, z + dz], [0.7, 14, 0.7], '#2e4a66')
    }
    box([x, 13.6, z], [6.4, 0.8, 7.4], '#2e4a66')
    box([x + 7.5 * s, 16.4, z], [14, 0.55, 0.9], '#22384f', { rot: [0, 0, -0.24 * s] })
    box([x - 2 * s, 16.8, z], [0.4, 6, 0.4], '#2e4a66')
    box([x + 1 * s, 12.4, z], [2.4, 1.6, 2.2], '#3a566e')
    sph([x, 14.2, z - 3.4], [0.16, 8, 8], '#ff5d4d')
    sph([x + 6 * s, 14.9, z], [0.14, 8, 8], '#ffd98a')
  }

  // ---------- Equipo propio de la Terminal Especializada de Contenedores ----------

  // Rack de reefers: pasarela de servicio con las tomas de corriente. Los
  // puntos azules encendidos son lo que lo distingue de una pila cualquiera.
  const reeferRack = (x, z, len) => {
    const s = Math.sign(x) || 1
    for (let dz = -len / 2; dz <= len / 2; dz += 3.2) {
      box([x, 2.4, z + dz], [0.22, 4.8, 0.22], '#aeb8c0')
    }
    box([x, 4.7, z], [0.5, 0.16, len], '#aeb8c0')
    box([x, 2.6, z], [0.5, 0.14, len], '#aeb8c0')
    box([x, 3.4, z], [0.06, 1.5, len], '#8c98a3')
    for (let dz = -len / 2 + 1; dz <= len / 2 - 1; dz += 2.4) {
      box([x - 0.3 * s, 2.9, z + dz], [0.28, 0.34, 0.22], '#f5c518')
      sph([x - 0.45 * s, 2.9, z + dz], [0.07, 6, 6], '#6fd8ff', { emissiveIntensity: 2.2 })
    }
  }

  // Straddle carrier: portico alto sobre neumaticos que se lleva el contenedor
  // por dentro. Solo tiene sentido en una terminal de contenedores.
  const straddle = (x, z) => {
    for (const sx of [-1.9, 1.9]) {
      for (const dz of [-2.6, 2.6]) {
        box([x + sx, 3.6, z + dz], [0.3, 7.2, 0.3], '#e8eef2')
        cyl([x + sx, 0.55, z + dz], [0.55, 0.55, 0.45, 10], '#14181c', { rot: [0, 0, Math.PI / 2] })
      }
    }
    box([x, 7.4, z], [4.6, 0.6, 6.2], '#e8eef2')
    box([x + 1.6, 6.4, z + 2.4], [1.2, 1.2, 1.3], COLORS.sky, { emissive: COLORS.sky, emissiveIntensity: 0.4 })
    box([x, 2.4, z], [2.4, 2.2, 5.8], '#2c9d8a', { tex: 'container', repeat: [2, 1], roughness: 0.7 })
  }

  // Arco de revision OCR del acceso: portico con camaras sobre el carril de
  // camiones, siempre a un lado para no invadir la pista del corredor.
  const ocrGate = (x, z) => {
    for (const dx of [-2.6, 2.6]) box([x + dx, 2.5, z], [0.4, 5, 0.5], '#e6ebef')
    box([x, 5.2, z], [5.9, 0.7, 0.9], '#e6ebef')
    box([x, 4.6, z], [5.5, 0.3, 1.0], '#0b2a4a')
    for (const dx of [-1.5, 0, 1.5]) {
      box([x + dx, 4.35, z + 0.45], [0.34, 0.26, 0.3], '#20262c')
      sph([x + dx, 4.35, z + 0.62], [0.07, 6, 6], '#6fd8ff', { emissiveIntensity: 2 })
    }
    box([x, 5.9, z], [3.2, 0.5, 0.12], COLORS.sky, { emissive: COLORS.sky, emissiveIntensity: 0.7 })
  }

  // Grua de patio RMG: como la RTG pero sobre rieles y sin cabina, que es lo
  // que la delata como automatizada. Las vigas van rectas y el carro corre por
  // arriba en vez de colgar de un chasis con ruedas.
  const rmg = (x, z, len) => {
    for (const dz of [-len / 2, len / 2]) {
      box([x - 5.4, 5.2, z + dz], [0.5, 10.4, 0.5], '#c9d4dd')
      box([x + 5.4, 5.2, z + dz], [0.5, 10.4, 0.5], '#c9d4dd')
      // Los refuerzos de las patas se quedan fuera de la pista. Un travesano
      // corrido de pata a pata cruzaba los tres carriles a la altura del pecho
      // y se leia como un obstaculo que en realidad no colisiona.
      box([x - 5.4, 1.2, z + dz], [1.6, 0.4, 0.6], '#8fa2b3')
      box([x + 5.4, 1.2, z + dz], [1.6, 0.4, 0.6], '#8fa2b3')
    }
    box([x, 10.6, z], [11.8, 0.8, 1.4], '#c9d4dd')
    box([x, 10.6, z + len / 2 - 3], [3.2, 1.0, 2.6], '#0b2a4a')
    box([x, 9.4, z + len / 2 - 3], [2.4, 0.5, 2.0], '#f5c518')
    // rieles: son la diferencia visible con la RTG
    for (const dx of [-5.4, 5.4]) {
      box([x + dx, 0.06, z], [0.5, 0.12, len + 6], '#5b6670')
      box([x + dx, 0.16, z], [0.14, 0.12, len + 6], '#b9c4cc', { metalness: 0.95, roughness: 0.25 })
    }
    sph([x - 5.4, 10.8, z], [0.12, 8, 8], '#ff5d4d')
  }

  // Tractocamion portuario aparcado con su chasis y contenedor
  const tractor = (x, z, rot) => {
    box([x, 1.15, z + 2.2], [1.95, 1.7, 2.2], '#e0b32e', { rot: [0, rot, 0] })
    box([x, 0.72, z - 1.4], [1.8, 0.28, 5.2], '#2b3138', { rot: [0, rot, 0] })
    box([x, 1.95, z - 1.4], [2.0, 2.15, 4.8], CONTAINER_COLORS[Math.floor(rnd() * CONTAINER_COLORS.length)], {
      tex: 'container',
      repeat: [2, 1],
      roughness: 0.7,
      rot: [0, rot, 0],
    })
    for (const dz of [2.3, -0.4, -3.2]) {
      cyl([x - 0.92, 0.46, z + dz], [0.46, 0.46, 0.3, 10], '#14181c', { rot: [0, 0, Math.PI / 2] })
      cyl([x + 0.92, 0.46, z + dz], [0.46, 0.46, 0.3, 10], '#14181c', { rot: [0, 0, Math.PI / 2] })
    }
  }

  // Manipulador de vacios (top loader): mastil alto y cabezal por arriba del
  // contenedor, al reves del reach stacker, que lo agarra con pluma inclinada.
  const emptyHandler = (x, z) => {
    box([x, 1.05, z], [2.5, 1.5, 4.8], '#d4603c')
    box([x, 2.2, z - 1.1], [1.7, 1.2, 1.6], '#2b3a49')
    for (const dz of [-1.6, 1.6]) {
      cyl([x - 1.25, 0.66, z + dz], [0.66, 0.66, 0.5, 10], '#14181c', { rot: [0, 0, Math.PI / 2] })
      cyl([x + 1.25, 0.66, z + dz], [0.66, 0.66, 0.5, 10], '#14181c', { rot: [0, 0, Math.PI / 2] })
    }
    for (const dx of [-0.5, 0.5]) box([x + dx, 3.6, z + 2.3], [0.28, 6.6, 0.28], '#39424a')
    box([x, 6.2, z + 2.9], [2.3, 0.4, 1.2], '#39424a')
    box([x, 5.0, z + 2.9], [2.0, 2.15, 4.6], '#8fa2b3', { tex: 'container', repeat: [2, 1], roughness: 0.75 })
  }

  // Espuela de ferrocarril de doble estiba: el vagon de pozo lleva un
  // contenedor hundido y otro encima, que es la firma del doble estiba.
  const doubleStack = (x, z, cars) => {
    box([x, 0.06, z], [3.0, 0.12, cars * 16 + 8], '#4e555c', { tex: 'ballast', repeat: [1, 4] })
    for (const dx of [-0.7, 0.7]) {
      box([x + dx, 0.18, z], [0.12, 0.14, cars * 16 + 8], '#b9c4cc', { metalness: 0.95, roughness: 0.25 })
    }
    for (let i = 0; i < cars; i++) {
      const cz = z - ((cars - 1) * 16) / 2 + i * 16
      box([x, 0.62, cz], [2.5, 0.5, 14], '#2b323a')
      for (const dz of [-5.6, 5.6]) {
        cyl([x - 1, 0.42, cz + dz], [0.4, 0.4, 0.28, 10], '#14181c', { rot: [0, 0, Math.PI / 2] })
        cyl([x + 1, 0.42, cz + dz], [0.4, 0.4, 0.28, 10], '#14181c', { rot: [0, 0, Math.PI / 2] })
      }
      // el de abajo va hundido en el pozo, el de arriba apoyado sobre el
      box([x, 1.75, cz], [2.4, 2.2, 12], CONTAINER_COLORS[Math.floor(rnd() * CONTAINER_COLORS.length)], {
        tex: 'container',
        repeat: [4, 1],
        roughness: 0.7,
      })
      box([x, 4.0, cz], [2.4, 2.2, 12], CONTAINER_COLORS[Math.floor(rnd() * CONTAINER_COLORS.length)], {
        tex: 'container',
        repeat: [4, 1],
        roughness: 0.7,
      })
    }
  }

  // Zona CFS: nave de consolidacion con andenes, toldo y montacargas fuera
  const cfs = (x, z, len) => {
    const s = Math.sign(x) || 1
    box([x, 3.2, z], [11, 6.4, len], '#dfe4e8')
    box([x, 6.7, z], [11.6, 0.7, len + 0.5], '#7f8f9c')
    box([x - 5.9 * s, 4.3, z], [1.6, 0.3, len * 0.8], '#0b2a4a')
    for (let dz = -len / 2 + 5; dz <= len / 2 - 5; dz += 7) {
      // andenes de carga con su cortina y tope de muelle
      box([x - 5.55 * s, 1.7, z + dz], [0.2, 3.4, 3.0], '#39424a')
      box([x - 5.9 * s, 0.5, z + dz], [0.7, 1.0, 3.4], '#2b3138')
      box([x - 5.4 * s, 5.0, z + dz], [0.12, 0.4, 2.6], '#9fd8ff', {
        emissive: '#9fd8ff',
        emissiveIntensity: 0.6,
      })
    }
  }

  // ---------- Equipo propio de la Terminal Intermodal ----------

  // Anden techado con grua puente: la viga corre por dentro de la nave, que es
  // lo que distingue una grua puente de un portico de patio.
  const bridgeShed = (x, z, len) => {
    for (const dx of [-4.6, 4.6]) {
      for (let dz = -len / 2; dz <= len / 2; dz += 8) {
        box([x + dx, 3.4, z + dz], [0.5, 6.8, 0.5], '#b6c0c8')
      }
      box([x + dx, 6.6, z], [0.6, 0.5, len], '#8fa2ae')
    }
    box([x, 7.2, z], [10.4, 0.7, len], '#7f8f9c')
    // viga de la grua puente cruzando la nave, con su polipasto
    box([x, 5.9, z + len * 0.15], [9.4, 0.55, 0.9], '#e0b32e')
    box([x - 1.4, 5.4, z + len * 0.15], [1.3, 0.7, 1.1], '#39424a')
    cyl([x - 1.4, 4.5, z + len * 0.15], [0.05, 0.05, 1.4, 6], '#8d99a6')
    box([x - 1.4, 3.7, z + len * 0.15], [1.0, 0.35, 0.7], '#39424a')
    box([x, 0.9, z], [9.6, 0.2, len], '#c3ccd2')
  }

  // Fila de chasis portacontenedores estacionados, algunos con caja y otros
  // vacios: es el inventario que siempre esta esperando en un patio intermodal.
  const chassisRow = (x, z, n) => {
    for (let i = 0; i < n; i++) {
      const cz = z + i * 5.4
      box([x, 0.55, cz], [2.0, 0.2, 4.6], '#39424a')
      for (const dz of [-1.6, 1.6]) {
        cyl([x - 0.85, 0.32, cz + dz], [0.32, 0.32, 0.22, 8], '#14181c', { rot: [0, 0, Math.PI / 2] })
        cyl([x + 0.85, 0.32, cz + dz], [0.32, 0.32, 0.22, 8], '#14181c', { rot: [0, 0, Math.PI / 2] })
      }
      // En la intermodal los contenedores quietos van sobre el tren, no
      // repartidos por el patio: los chasis van casi todos vacios y solo uno de
      // cada cuatro carga caja, que ademas se lee como "recien bajada".
      if (rnd() < 0.25) {
        box([x, 1.75, cz], [2.0, 2.15, 4.4], CONTAINER_COLORS[Math.floor(rnd() * CONTAINER_COLORS.length)], {
          tex: 'container',
          repeat: [2, 1],
          roughness: 0.7,
        })
      }
    }
  }

  // Puerta automatizada: bascula de pesaje hundida en el piso, caseta y arco
  // OCR encima. Las tres cosas juntas son el acceso de una intermodal.
  const gateWithScale = (x, z) => {
    box([x, 0.04, z], [4.6, 0.12, 7], '#8a949c', { metalness: 0.4, roughness: 0.6 })
    for (const dz of [-3.4, 3.4]) box([x, 0.1, z + dz], [4.8, 0.16, 0.3], '#f5c518')
    box([x + 3.6, 1.5, z], [1.8, 3, 2.6], '#e6ebef')
    box([x + 3.6, 1.9, z - 1.32], [1.3, 1.0, 0.08], '#16324f', { metalness: 0.5, roughness: 0.25 })
    box([x + 3.6, 3.2, z], [2.0, 0.3, 2.9], '#0b2a4a')
    ocrGate(x, z + 6)
  }

  // Anden de inspeccion aduanera (previo): plataforma a la altura de la caja,
  // techo ligero y las cortinas de cada posicion.
  const inspectionBay = (x, z, len) => {
    const s = Math.sign(x) || 1
    box([x, 0.6, z], [5.0, 1.2, len], '#c3ccd2')
    for (let dz = -len / 2 + 2; dz <= len / 2 - 2; dz += 6) {
      box([x - 2.4 * s, 1.9, z + dz], [0.24, 1.4, 0.24], '#8d99a6')
      box([x + 2.4 * s, 1.9, z + dz], [0.24, 1.4, 0.24], '#8d99a6')
      box([x, 1.35, z + dz], [5.2, 0.1, 3.0], '#f5c518', { emissive: '#8a6a00', emissiveIntensity: 0.3 })
    }
    box([x, 2.7, z], [5.6, 0.25, len], '#7f8f9c')
    for (let dz = -len / 2 + 3; dz <= len / 2 - 3; dz += 6) {
      sph([x, 2.5, z + dz], [0.11, 8, 8], '#dff3ff', { emissiveIntensity: 1.8 })
    }
  }

  // Un vagon de pozo suelto, pensado para encadenarse con los de las franjas
  // vecinas. El indice decide el color en vez del azar para que un mismo tren
  // no cambie de paleta al cruzar el borde de una franja.
  const railCar = (x, z, idx) => {
    const c = CONTAINER_COLORS[idx % CONTAINER_COLORS.length]
    box([x, 0.72, z], [2.3, 0.2, 13.4], '#3a3f46')
    for (const dx of [-1.16, 1.16]) {
      box([x + dx, 1.02, z], [0.26, 0.72, 13.2], '#7d3a34')
      box([x + dx, 1.44, z], [0.34, 0.16, 13.4], '#93463e')
    }
    for (const dz of [-5.0, 5.0]) {
      box([x, 0.78, z + dz], [1.5, 0.3, 1.1], '#2b3138')
      for (const d2 of [-0.95, 0.95]) {
        cyl([x - 1.02, 0.44, z + dz + d2], [0.44, 0.44, 0.16, 12], '#4a5058', { rot: [0, 0, Math.PI / 2] })
        cyl([x + 1.02, 0.44, z + dz + d2], [0.44, 0.44, 0.16, 12], '#4a5058', { rot: [0, 0, Math.PI / 2] })
      }
    }
    box([x, 1.92, z], [2.02, 2.2, 12.6], c, { tex: 'container', repeat: [4, 1], roughness: 0.7 })
    // el segundo piso solo en algunos: da variedad sin romper la continuidad
    if (idx % 3 !== 0) {
      box([x, 4.15, z], [2.02, 2.2, 12.6], CONTAINER_COLORS[(idx + 3) % CONTAINER_COLORS.length], {
        tex: 'container',
        repeat: [4, 1],
        roughness: 0.7,
      })
    }
  }

  // Nave de cross-docking: portones en las dos caras, tren de un lado y
  // camiones del otro, sin nada almacenado en medio.
  const crossDock = (x, z, len) => {
    box([x, 3.0, z], [8.5, 6, len], '#dfe4e8')
    box([x, 6.4, z], [9.1, 0.7, len + 0.4], '#7f8f9c')
    for (const sx of [-1, 1]) {
      for (let dz = -len / 2 + 5; dz <= len / 2 - 5; dz += 7) {
        box([x + sx * 4.3, 1.6, z + dz], [0.2, 3.2, 3.2], '#39424a')
        box([x + sx * 4.55, 0.45, z + dz], [0.6, 0.9, 3.4], '#2b3138')
      }
    }
    box([x, 5.0, z], [1.4, 0.34, len * 0.7], '#0b2a4a')
  }

  // Torre de iluminacion de patio
  const mast = (x, z) => {
    cyl([x, 3, z], [0.09, 0.13, 6, 6], '#3d4854')
    box([x, 6.1, z], [1.1, 0.3, 0.4], '#2c3540')
    for (const dx of [-0.35, 0, 0.35]) {
      box([x + dx, 6.0, z + 0.18], [0.24, 0.16, 0.06], '#fff3c4', { emissive: '#ffe9a0', emissiveIntensity: 2.4 })
    }
  }

  // ---------- Equipo e infraestructura de la Terminal de Usos Multiples ----------

  // Grua movil portuaria (MHC): base sobre neumaticos, torreta giratoria y
  // pluma inclinada. Es la silueta que identifica una terminal multiproposito
  // frente a una de contenedores, que va de porticos fijos.
  const mhc = (x, z) => {
    const s = Math.sign(x) || 1
    box([x, 0.75, z], [4.4, 1.1, 6.2], '#1f2a35')
    for (const dz of [-2.2, 0, 2.2]) {
      for (const dx of [-1.9, 1.9]) {
        cyl([x + dx, 0.5, z + dz], [0.5, 0.5, 0.55, 10], '#14181c', { rot: [0, 0, Math.PI / 2] })
      }
    }
    // gatos estabilizadores desplegados
    for (const dz of [-2.6, 2.6]) {
      box([x - 2.6 * s, 0.35, z + dz], [1.6, 0.3, 0.7], '#e0b32e')
      cyl([x - 3.2 * s, 0.18, z + dz], [0.42, 0.42, 0.36, 8], '#39424a')
    }
    cyl([x, 2.1, z], [1.7, 1.9, 1.6, 14], '#e0b32e')
    box([x, 3.6, z], [3.0, 1.8, 3.4], '#e0b32e')
    box([x + 1.5 * s, 3.5, z + 1.2], [1.0, 1.3, 1.2], '#2b3a49')
    // pluma hacia el muelle y tirante
    box([x + 5.2 * s, 7.4, z], [11.5, 0.5, 0.6], '#d8a13a', { rot: [0, 0, -0.52 * s] })
    box([x - 0.9 * s, 6.2, z], [0.4, 4.6, 0.4], '#d8a13a')
    sph([x + 9.4 * s, 10.0, z], [0.14, 8, 8], '#ff5d4d')
    // cable y cuchara bivalva colgando de la punta
    cyl([x + 9.4 * s, 8.4, z], [0.05, 0.05, 3.0, 6], '#8d99a6')
    box([x + 9.4 * s, 6.7, z], [1.5, 1.0, 1.6], '#c2762c')
  }

  // Brazo de carga articulado: la columna y los dos tramos de tuberia con los
  // que se conecta un buque tanque.
  const loadingArm = (x, z) => {
    const s = Math.sign(x) || 1
    cyl([x, 2.4, z], [0.34, 0.42, 4.8, 10], '#b6c0c8')
    box([x, 4.9, z], [0.9, 0.5, 0.9], '#5c666f')
    cyl([x - 1.4 * s, 5.8, z], [0.2, 0.2, 3.4, 8], '#d8dee3', { rot: [0, 0, 0.7 * s] })
    cyl([x - 3.0 * s, 4.7, z], [0.18, 0.18, 3.0, 8], '#d8dee3', { rot: [0, 0, -0.5 * s] })
    sph([x - 4.2 * s, 3.6, z], [0.22, 8, 8], '#ffb347', { emissiveIntensity: 1.2 })
  }

  // Silo con cono de descarga y casa de maquinas
  const silo = (x, z, h) => {
    cyl([x, h / 2 + 1.2, z], [1.75, 1.75, h, 16], '#e6eaed')
    cyl([x, 0.85, z], [1.75, 0.5, 1.7, 16], '#c3ccd2')
    cyl([x, h + 1.55, z], [1.0, 1.75, 0.9, 16], '#c3ccd2')
    box([x, h + 2.4, z], [1.6, 0.9, 1.6], '#8d99a6')
    sph([x, h + 3.0, z], [0.12, 8, 8], '#ff5d4d')
  }

  // Tanque de fluidos con domo, cinturon y escalera exterior
  const tank = (x, z, r) => {
    cyl([x, 2.3, z], [r, r, 4.6, 20], '#d3dade')
    cyl([x, 4.9, z], [r * 0.55, r, 0.9, 20], '#b9c3c9')
    cyl([x, 3.4, z], [r + 0.04, r + 0.04, 0.16, 20], '#9aa6ae')
    box([x, 2.8, z + r], [0.5, 5.2, 0.12], '#8d99a6')
    sph([x, 5.5, z], [0.11, 8, 8], '#ffe9a0', { emissiveIntensity: 1.4 })
  }

  // Monton de granel a cielo abierto. El cono con radio superior 0 es lo que
  // lo separa visualmente de cualquier cosa construida.
  const pile = (x, z, r, color) => cyl([x, r * 0.42, z], [0, r, r * 0.84, 12], color, { roughness: 1 })

  // Galeria de banda transportadora: cajon elevado sobre caballetes
  const conveyorRun = (x, z, len, y) => {
    box([x, y, z], [1.5, 1.0, len], '#e0b32e')
    box([x, y - 0.62, z], [1.2, 0.24, len], '#22262b')
    for (let dz = -len / 2 + 2; dz <= len / 2 - 2; dz += 7) {
      box([x - 0.6, y / 2, z + dz], [0.24, y, 0.24], '#8d99a6')
      box([x + 0.6, y / 2, z + dz], [0.24, y, 0.24], '#8d99a6')
    }
  }

  // Tolva receptora de patio: la misma pieza que el obstaculo, en decorado
  const hopperProp = (x, z) => {
    cyl([x, 2.2, z], [1.7, 0.6, 2.2, 4], '#d4603c')
    cyl([x, 0.9, z], [0.5, 0.5, 0.6, 8], '#39424a')
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) box([x + sx * 1.2, 0.6, z + sz * 0.9], [0.2, 1.2, 0.2], '#6b7681')
    }
  }

  // Almacen techado con techo a dos aguas y porton
  const warehouse = (x, z, len) => {
    const s = Math.sign(x) || 1
    box([x, 3.0, z], [9, 6, len], '#c9d2d8')
    box([x, 6.4, z], [9.6, 1.0, len + 0.4], '#8fa2ae', { rot: [0, 0, 0] })
    box([x - 4.5 * s, 2.2, z], [0.2, 4.4, len * 0.45], '#3f4a55')
    for (let dz = -len / 2 + 4; dz <= len / 2 - 4; dz += 8) {
      box([x - 4.55 * s, 5.4, z + dz], [0.12, 0.5, 2.4], '#9fd8ff', { emissive: '#9fd8ff', emissiveIntensity: 0.6 })
    }
  }

  // Montacarga de gran tonelaje / reach stacker: contrapeso, mastil y horquilla
  const heavyLift = (x, z, boom) => {
    box([x, 1.0, z], [2.4, 1.3, 4.6], '#e0b32e')
    box([x, 2.1, z - 0.9], [1.6, 1.1, 1.5], '#2b3a49')
    for (const dz of [-1.5, 1.5]) {
      cyl([x - 1.2, 0.62, z + dz], [0.62, 0.62, 0.5, 10], '#14181c', { rot: [0, 0, Math.PI / 2] })
      cyl([x + 1.2, 0.62, z + dz], [0.62, 0.62, 0.5, 10], '#14181c', { rot: [0, 0, Math.PI / 2] })
    }
    if (boom) {
      box([x, 3.4, z + 2.6], [0.7, 0.7, 6.5], '#d8a13a', { rot: [-0.5, 0, 0] })
      box([x, 1.5, z + 5.2], [2.3, 0.5, 0.5], '#39424a')
    } else {
      box([x, 2.9, z + 2.2], [0.35, 4.6, 0.35], '#39424a')
      box([x, 0.5, z + 2.6], [1.4, 0.14, 1.2], '#39424a')
    }
  }

  if (theme === 'tum') {
    // ----- Terminal de Usos Multiples -----
    // Corredor de concreto, y a los lados las tres familias de la TUM: muelle
    // con MHC y brazos de carga, patio con tolvas y montones, y al fondo la
    // infraestructura de almacenamiento (silos, tanques, almacen techado).
    // El apron se extiende mucho mas que en la TEC: aqui los lados son patio
    // abierto y sin pilas de contenedores tapando, el borde del suelo se veia
    // como una franja negra contra el mar.
    box([0, -0.11, 0], [11, 0.22, L], '#dfe2da', { tex: 'asphalt', repeat: [3, L / 4], roughness: 0.95 })
    box([-20, -0.13, 0], [30, 0.22, L], '#bdb7a8', { tex: 'asphalt', repeat: [7, L / 4], roughness: 1 })
    box([20, -0.13, 0], [30, 0.22, L], '#bdb7a8', { tex: 'asphalt', repeat: [7, L / 4], roughness: 1 })
    laneLines('#7a6a20')
    // rayas de patio a cielo abierto delimitando las eras de granel
    for (const sx of [-1, 1]) {
      box([sx * 4.8, 0.02, 0], [0.14, 0.02, L], '#c9a12e', { emissive: '#7a5c10', emissiveIntensity: 0.3 })
    }

    // Izquierda: linea de muelle
    if (seed % 2 === 0) mhc(-14, (rnd() - 0.5) * L * 0.5)
    else loadingArm(-10.5, (rnd() - 0.5) * L * 0.6)
    // montones de granel y cucharas apoyadas en el patio abierto
    const GRANEL = ['#8a7a5e', '#6f6a63', '#a8955f', '#5d5750']
    for (let z = -L / 2 + 4; z <= L / 2 - 4; z += 9) {
      if (rnd() < 0.8) pile(-9 - rnd() * 6, z, 2.4 + rnd() * 2.2, GRANEL[Math.floor(rnd() * GRANEL.length)])
      if (rnd() < 0.4) {
        const x = -7.6 - rnd() * 1.5
        box([x, 0.5, z + 3], [1.6, 1.0, 2.2], '#c2762c')
        box([x, 1.15, z + 3], [1.0, 0.3, 0.6], '#39424a')
      }
    }

    // Derecha: almacenamiento y transporte interno. Todo empieza pasado x=11
    // porque a menos distancia los silos y tanques tapan el carril lateral.
    if (seed % 3 === 0) {
      const z = (rnd() - 0.5) * L * 0.4
      for (let i = 0; i < 4; i++) silo(12.5 + (i % 2) * 4.4, z + Math.floor(i / 2) * 4.6 - 2.3, 7.5 + rnd() * 2)
      conveyorRun(12.5, z, L * 0.5, 10.5)
    } else if (seed % 3 === 1) {
      const z = (rnd() - 0.5) * L * 0.4
      tank(13.5, z - 6, 3.4)
      tank(14.5, z + 4, 4.2)
      tank(22, z - 1, 3.6)
    } else {
      warehouse(17, (rnd() - 0.5) * L * 0.3, L * 0.55)
    }
    for (let z = -L / 2 + 6; z <= L / 2 - 6; z += 11) {
      if (rnd() < 0.5) hopperProp(7.6 + rnd() * 1.4, z)
      if (rnd() < 0.45) heavyLift((rnd() < 0.5 ? -1 : 1) * (8.8 + rnd() * 1.6), z + 4, rnd() < 0.5)
    }
    mast(-4.6, -L * 0.3)
    mast(4.6, L * 0.3)
  } else if (theme === 'tec') {
    // ----- Terminal Especializada de Contenedores -----
    box([0, -0.11, 0], [11, 0.22, L], '#d0d6dc', { tex: 'asphalt', repeat: [3, L / 4], roughness: 0.95 })
    box([-13, -0.13, 0], [15, 0.22, L], '#848c94', { tex: 'asphalt', repeat: [4, L / 4], roughness: 0.95 })
    box([13, -0.13, 0], [15, 0.22, L], '#848c94', { tex: 'asphalt', repeat: [4, L / 4], roughness: 0.95 })
    laneLines()
    // rayas amarillas de patio junto a los bloques
    for (const sx of [-1, 1]) {
      box([sx * 4.6, 0.02, 0], [0.14, 0.02, L], '#c9a12e', { emissive: '#7a5c10', emissiveIntensity: 0.3 })
    }
    for (let z = -L / 2 + 3.4; z <= L / 2 - 3.4; z += 6.8) {
      for (const sx of [-1, 1]) {
        if (rnd() < 0.85) stack(sx * (6.6 + rnd() * 1.6), z, 3)
        if (rnd() < 0.5) stack(sx * (11 + rnd() * 2), z + 1.5, 4)
      }
    }
    // ranuras del patio de apilamiento: raya de slot y su placa de numeracion
    for (let z = -L / 2 + 3; z <= L / 2 - 3; z += 6.5) {
      for (const sx of [-1, 1]) {
        box([sx * 5.6, 0.02, z], [3.6, 0.02, 0.16], '#c9a12e', { emissive: '#7a5c10', emissiveIntensity: 0.25 })
        box([sx * 5.3, 0.55, z], [0.07, 0.9, 0.07], '#8d99a6')
        box([sx * 5.3, 1.05, z], [0.06, 0.34, 0.5], '#f5c518', { emissive: '#8a6a00', emissiveIntensity: 0.4 })
      }
    }

    // Las gruas son las protagonistas: la STS entra mucho mas cerca que antes y
    // una grua de patio cruza por encima de los tres carriles, con las patas
    // fuera de la pista. Es la imagen que la gente reconoce de una TEC.
    sts((rnd() < 0.5 ? -1 : 1) * 12.5, (rnd() - 0.5) * L * 0.6)
    // Una de cada cuatro franjas se queda sin grua de patio: con las tres
    // ocupadas el corredor se convertia en un tunel continuo de porticos y el
    // efecto de pasar por debajo dejaba de notarse.
    if (seed % 4 === 0) rtg(0, (rnd() - 0.5) * L * 0.5, 5.8)
    else if (seed % 4 === 1) rmg(0, (rnd() - 0.5) * L * 0.4, 9)
    else if (seed % 4 === 2) rtg((rnd() < 0.5 ? -1 : 1) * 8.5, (rnd() - 0.5) * L * 0.5)

    // el resto del equipo se reparte por semilla para que ninguna franja lleve
    // las seis piezas encima
    if (seed % 5 === 1) reeferRack((rnd() < 0.5 ? -1 : 1) * 5.9, (rnd() - 0.5) * L * 0.4, L * 0.5)
    if (seed % 5 === 2) straddle((rnd() < 0.5 ? -1 : 1) * 8.2, (rnd() - 0.5) * L * 0.5)
    if (seed % 5 === 3) ocrGate((rnd() < 0.5 ? -1 : 1) * 10.5, (rnd() - 0.5) * L * 0.5)
    if (seed % 5 === 4) cfs((rnd() < 0.5 ? -1 : 1) * 15, (rnd() - 0.5) * L * 0.3, L * 0.6)
    if (seed % 5 === 0) doubleStack((rnd() < 0.5 ? -1 : 1) * 13.5, (rnd() - 0.5) * L * 0.3, 2)
    // trafico de patio: mulas, reach stacker y manipulador de vacios
    for (let z = -L / 2 + 5; z <= L / 2 - 5; z += 12) {
      const sx = rnd() < 0.5 ? -1 : 1
      const r = rnd()
      if (r < 0.4) tractor(sx * (6.4 + rnd() * 1.2), z, rnd() < 0.5 ? 0 : Math.PI)
      else if (r < 0.62) heavyLift(sx * (7.2 + rnd() * 1.4), z, true)
      else if (r < 0.8) emptyHandler(sx * (7.6 + rnd() * 1.2), z)
    }
    mast(-4.4, -L * 0.32)
    mast(4.4, L * 0.32)
  } else if (theme === 'astillero') {
    // ----- Astillero -----
    // El dique seco es el protagonista y el recorrido baja a su solera. Lo que
    // hay que reconocer al instante es un BUQUE EN REPARACION: antes el casco
    // era una pared plana y no se entendia que era. Ahora la banda de babor la
    // ocupa un barco entero, con su popa (helice y timon), su pantoque
    // redondeado, su linea de flotacion, su cubierta y su puente.
    const dSeg = seed * L
    const dAt = (z) => dSeg - z
    const STEP = 3
    const KEEL = DOCK_Y + 1.1 // fondo del casco, apoyado en los picaderos
    const SHIP_X = -13.4
    const SHIP_LEN = SHIP_TO - SHIP_FROM

    // Media manga y altura del casco a lo largo del barco: 0 = popa, 1 = proa.
    // Es lo que le da forma de barco en vez de caja.
    const shipAt = (d) => {
      if (d < SHIP_FROM || d > SHIP_TO) return null
      const u = (d - SHIP_FROM) / SHIP_LEN
      let w
      if (u < 0.1) w = 1.1 + (u / 0.1) * 3.3
      else if (u > 0.86) w = 4.4 - ((u - 0.86) / 0.14) * 3.9
      else w = 4.4
      // arrufo: el casco sube hacia los extremos
      const rise = u < 0.12 ? (1 - u / 0.12) * 1.6 : u > 0.9 ? ((u - 0.9) / 0.1) * 2.2 : 0
      // La popa vuela sobre el agua (el codaste): su fondo sube mucho, y es lo
      // que deja ver la helice y el timon por debajo.
      const lift = u < 0.075 ? (1 - u / 0.075) * 2.9 : u > 0.9 ? ((u - 0.9) / 0.1) * 1.8 : 0
      // 14 m de quilla a cubierta. Antes eran 2.8 y el canto superior del casco
      // quedaba POR DEBAJO de la camara (que en el fondo del dique va a -0.3):
      // el barco se veia como unas bandas de color y no como un buque. Un buque
      // en dique seco te tapa el cielo, y eso es justo lo que hay que sentir.
      return { w, u, deck: 14 + rise, bottom: KEEL + lift }
    }

    // Contador de rebanadas. NO se puede usar Math.round(cz) % n para espaciar
    // detalles: con rebanadas de 3 m los centros caen en +-1.5, +-4.5, +-7.5...
    // y ese modulo nunca vale 0, asi que la helice, el timon, los picaderos y
    // las gruas de cubierta no se dibujaban NUNCA.
    let si = 0
    for (let z = -L / 2; z < L / 2; z += STEP, si++) {
      const cz = z + STEP / 2
      const d = dAt(cz)
      const stage = astStage(d) || 'borde'
      const y = deckAt(d)
      const enDique = stage !== 'grada'

      // suelo por el que se corre
      box([0, y - 0.11, cz], [12, 0.22, STEP], '#b9bab4', {
        tex: 'asphalt',
        repeat: [3, 1],
        roughness: 0.95,
      })
      box([-1.15, y + 0.03, cz], [0.07, 0.02, STEP], COLORS.neon, {
        emissive: COLORS.neon,
        emissiveIntensity: 1.4,
      })
      box([1.15, y + 0.03, cz], [0.07, 0.02, STEP], COLORS.neon, {
        emissive: COLORS.neon,
        emissiveIntensity: 1.4,
      })

      if (enDique) {
        // Solera del dique de pared a pared. El piso del corredor solo mide
        // 12 m, asi que sin esto el buque y sus picaderos quedaban flotando
        // sobre el vacio a diez metros del carril.
        box([-6.5, DOCK_Y - 0.24, cz], [27, 0.3, STEP], '#a9aaa3', {
          tex: 'asphalt',
          repeat: [7, 1],
          roughness: 0.95,
        })
        // canal de desague en el eje del dique
        box([-13.4, DOCK_Y - 0.06, cz], [0.7, 0.12, STEP], '#8f9089', { roughness: 0.9 })
        // Pared del dique a estribor: altares escalonados del fondo al muelle
        for (let i = 0; i < 3; i++) {
          const ty = DOCK_Y + 1.6 + i * 1.6
          if (ty > 0) break
          box([7.4 + i * 1.1, (ty + DOCK_Y) / 2, cz], [2.2, ty - DOCK_Y, STEP], '#c3c4bd', {
            roughness: 0.95,
          })
        }
        // macizos del muelle a los dos lados: cierran el canon y sostienen gruas
        box([16, DOCK_Y / 2 - 0.2, cz], [16, Math.abs(DOCK_Y) + 0.4, STEP], '#adaea7', { roughness: 0.95 })
        box([16, 0.06, cz], [16, 0.2, STEP], '#c9ccc6', { tex: 'asphalt', repeat: [4, 1], roughness: 0.95 })
        box([-25, DOCK_Y / 2 - 0.2, cz], [14, Math.abs(DOCK_Y) + 0.4, STEP], '#adaea7', { roughness: 0.95 })
        box([-25, 0.06, cz], [14, 0.2, STEP], '#c9ccc6', { tex: 'asphalt', repeat: [4, 1], roughness: 0.95 })
        box([9.2, 0.2, cz], [0.16, 0.14, STEP], '#b9c4cc', { metalness: 0.9, roughness: 0.3 })

        // ---- EL BUQUE ----
        const s = shipAt(d)
        if (s) {
          const hullTop = KEEL + s.deck
          const wl = KEEL + 1.9 // linea de flotacion
          // obra viva: rojo antiincrustante, con el pantoque en chaflan
          box([SHIP_X, (s.bottom + wl) / 2, cz], [s.w * 2, wl - s.bottom, STEP], '#8f3a2c', {
            roughness: 0.8,
          })
          // Pantoque: solo un chaflan pequeno en la esquina inferior de estribor.
          // Antes era una cuna de 3.5 m repetida cada 3 m y el casco se leia como
          // una estanteria de tablas en vez de como un barco.
          box([SHIP_X + s.w - 0.32, s.bottom + 0.32, cz], [0.9, 0.9, STEP], '#8f3a2c', {
            rot: [0, 0, 0.78],
            roughness: 0.8,
          })
          // boot-top negro y obra muerta
          box([SHIP_X, wl + 0.22, cz], [s.w * 2 + 0.06, 0.44, STEP], '#20242a', { roughness: 0.9 })
          box([SHIP_X, (wl + 0.44 + hullTop) / 2, cz], [s.w * 2, hullTop - wl - 0.44, STEP], '#1f4f63', {
            roughness: 0.7,
            metalness: 0.25,
          })
          // trancanil y regala de cubierta
          box([SHIP_X, hullTop, cz], [s.w * 2 + 0.1, 0.3, STEP], '#c3c4bd', { roughness: 0.7 })
          box([SHIP_X, hullTop + 0.55, cz], [s.w * 2 - 0.3, 0.8, STEP], '#1f4f63', { roughness: 0.7 })
          // Costuras de las planchas y marcas de calado: son lo que da escala.
          // Sin ellas, catorce metros de casco liso no se leen como grandes.
          if (si % 3 === 0) {
            box([SHIP_X + s.w, (wl + hullTop) / 2, cz], [0.12, hullTop - wl, 0.3], '#173d4d', { roughness: 0.85 })
          }
          for (const hy of [wl + 2.6, wl + 6.0, wl + 9.4]) {
            if (hy < hullTop - 0.6) {
              box([SHIP_X + s.w, hy, cz], [0.1, 0.12, STEP], '#173d4d', { roughness: 0.85 })
            }
          }
          if (si % 5 === 0 && s.u < 0.5) {
            for (let m = 0; m < 5; m++) {
              box([SHIP_X + s.w + 0.02, s.bottom + 0.7 + m * 0.9, cz], [0.06, 0.3, 0.3], '#e9eef2', {
                roughness: 0.6,
              })
            }
          }
          // superestructura y chimenea, en el cuarto de popa
          if (s.u > 0.1 && s.u < 0.24) {
            box([SHIP_X, hullTop + 3.4, cz], [s.w * 1.5, 5.0, STEP], '#eef2f5', { roughness: 0.6 })
            if (si % 2 === 0) {
              box([SHIP_X + s.w * 0.76, hullTop + 3.0, cz], [0.1, 0.7, 1.8], '#16324f', {
                roughness: 0.2,
                metalness: 0.5,
              })
              box([SHIP_X + s.w * 0.76, hullTop + 5.0, cz], [0.1, 0.7, 1.8], '#16324f', {
                roughness: 0.2,
                metalness: 0.5,
              })
            }
          }
          if (s.u > 0.15 && s.u < 0.185) {
            box([SHIP_X, hullTop + 7.4, cz], [s.w * 1.1, 3.0, STEP], '#c0392b', { roughness: 0.65 })
          }
          // Popa en seco: helice de bronce y timon bajo el codaste. Es la imagen
          // que hace obvio de un golpe que es un barco fuera del agua, asi que
          // va grande y colocada DEBAJO del fondo del casco, no dentro de el.
          if (s.u > 0.022 && s.u < 0.05 && si % 2 === 0) {
            const py = KEEL - 0.7
            cyl([SHIP_X, py, cz], [0.5, 0.5, 1.4, 12], '#b07a2a', { rot: [0, 0, Math.PI / 2] })
            for (let k = 0; k < 4; k++) {
              const a2 = (k / 4) * Math.PI * 2 + 0.4
              box([SHIP_X + Math.cos(a2) * 1.5, py + Math.sin(a2) * 1.5, cz], [2.2, 0.85, 0.16], '#c2882c', {
                rot: [0, 0, a2],
                roughness: 0.35,
                metalness: 0.65,
              })
            }
            // bocina del eje saliendo del casco
            cyl([SHIP_X, py + 0.1, cz - 1.6], [0.34, 0.34, 2.2, 10], '#7d858d', {
              rot: [Math.PI / 2, 0, 0],
              metalness: 0.5,
            })
          }
          if (s.u < 0.022 && si % 2 === 0) {
            box([SHIP_X, KEEL - 0.2, cz], [0.34, 3.4, 1.9], '#8f3a2c', { roughness: 0.8 })
            box([SHIP_X, KEEL + 1.4, cz], [0.6, 0.5, 0.9], '#7d858d', { metalness: 0.5 })
          }
          // Cubierta: tapas de escotilla y una grua de a bordo. Sin nada arriba
          // el canto superior parecia el borde de un muro.
          if (si % 4 === 0 && s.u > 0.28 && s.u < 0.84) {
            box([SHIP_X, hullTop + 1.15, cz], [s.w * 1.5, 0.5, 3.4], '#3f4a55', { roughness: 0.8 })
            box([SHIP_X + s.w * 0.6, hullTop + 2.6, cz], [0.5, 3.4, 0.5], '#d4603c')
            box([SHIP_X + s.w * 0.1, hullTop + 4.2, cz], [4.4, 0.4, 0.5], '#d4603c', { rot: [0, 0, 0.2] })
          }
          // Torre de andamio de trabajo trepando el costado: cuatro niveles con
          // su malla. Es lo que dice "esto se esta reparando" y ademas rompe la
          // verticalidad del casco.
          // Solo dos niveles, y la malla en el de abajo y a tramos. Con cuatro
          // niveles enmallados el andamio se convertia en una cortina verde de
          // catorce metros que tapaba el barco entero: se veia la malla, no el
          // buque, que es exactamente lo contrario de lo que hace falta aqui.
          const sx = SHIP_X + s.w + 1.0
          for (let i = 0; i < 2; i++) {
            const py = KEEL + 1.4 + i * 3.3
            box([sx, py, cz], [1.7, 0.1, STEP], '#9a7a4e', { roughness: 0.9 })
            box([sx, py + 1.05, cz], [0.06, 0.06, STEP], '#e0b32e')
            if (si % 3 === 0) box([sx + 0.78, py + 1.6, cz], [0.09, 3.2, 0.09], '#e0b32e')
          }
          if (si % 6 < 3) {
            box([sx - 0.75, KEEL + 3.0, cz], [0.04, 3.0, STEP], '#2c6e49', {
              roughness: 0.9,
            })
          }
          if (si % 4 === 0) {
            sph([sx - 0.5, KEEL + 2.2, cz], [0.17, 8, 8], '#bfe9ff', { emissiveIntensity: 3.4 })
          }
          if (si % 7 === 0) {
            sph([sx - 0.5, KEEL + 8.1, cz], [0.15, 8, 8], '#ffe9a0', { emissiveIntensity: 3 })
          }
          // picaderos bajo la quilla
          if (si % 3 === 0) {
            box([SHIP_X, DOCK_Y + 0.55, cz], [3.0, 1.1, 1.2], '#6b563a', { roughness: 0.95 })
          }
        }
      } else {
        // Grada de construccion: varadero inclinado al mar
        box([13, -0.6, cz], [14, 0.3, STEP], '#b9bab4', { rot: [0, 0, -0.07], roughness: 0.95 })
        for (const dx of [8.4, 11.4]) box([dx, -0.2, cz], [0.7, 0.24, STEP], '#8f8f88', { roughness: 0.9 })
        box([26, -2.0, cz], [16, 0.12, STEP], '#4a7d99', {
          tex: 'water',
          repeat: [4, 1],
          emissive: '#16324a',
          emissiveIntensity: 0.4,
          roughness: 0.55,
        })
        box([-13, 2.4, cz], [12, 5.0, STEP], '#c3c4bd', { roughness: 0.9 })
      }
    }

    // ---- Piezas grandes, una por franja ----

    // Grua Goliath: portico gigante cruzando el dique de lado a lado, muy por
    // encima del buque. Es LA silueta del astillero.
    if (astStage(dSeg) !== 'grada' && seed % 3 === 0) {
      const gz = (rnd() - 0.5) * L * 0.4
      for (const gx of [-19.5, 12.5]) {
        for (const dz of [-3.2, 3.2]) {
          box([gx, 13, gz + dz], [1.5, 26, 1.5], '#e0b32e', { roughness: 0.6 })
          box([gx, 0.4, gz + dz], [2.2, 0.8, 2.2], '#39424a')
        }
        box([gx, 7, gz], [1.2, 0.5, 6.4], '#c9a12e')
      }
      box([-3.5, 27.2, gz], [38, 2.6, 4.2], '#e0b32e', { roughness: 0.6 })
      box([-3.5, 25.4, gz], [38, 1.0, 3.0], '#c9a12e', { roughness: 0.65 })
      box([-3.5, 29.0, gz], [34, 1.2, 2.0], '#b09030')
      box([-8, 24.4, gz], [4.2, 1.6, 3.6], '#39424a')
      for (const dx of [-9.2, -6.8]) cyl([dx, 20.5, gz], [0.07, 0.07, 8.0, 6], '#8d99a6')
      box([-8, 16.4, gz], [3.4, 0.8, 2.2], '#5c666f')
      sph([-19.5, 28.4, gz], [0.2, 8, 8], '#ff5d4d')
      sph([12.5, 28.4, gz], [0.2, 8, 8], '#ff5d4d')
    }

    // Grua torre sobre rieles en el borde del dique
    if (astStage(dSeg) !== 'grada' && seed % 3 === 1) {
      const gz = (rnd() - 0.5) * L * 0.5
      cyl([10.2, 1.0, gz], [1.5, 1.7, 2.0, 12], '#d4603c')
      box([10.2, 10, gz], [1.1, 18, 1.1], '#e0b32e')
      box([10.2, 19.4, gz], [1.9, 1.2, 1.9], '#d4603c')
      box([3.6, 20.4, gz], [14, 0.6, 0.8], '#e0b32e', { rot: [0, 0, 0.05] })
      box([14.6, 20.2, gz], [5.0, 0.5, 0.7], '#c9a12e')
      cyl([-1.4, 17.0, gz], [0.05, 0.05, 6.4, 6], '#8d99a6')
      box([-1.4, 13.4, gz], [1.0, 0.5, 1.0], '#39424a')
      sph([10.2, 20.2, gz], [0.16, 8, 8], '#ff5d4d')
    }

    // Grua pluma de pedestal. Alta a proposito: a 8 m cruzaba a la altura del ojo
    if (astStage(dSeg) !== 'grada' && seed % 3 === 2) {
      const gz = (rnd() - 0.5) * L * 0.5
      cyl([9.6, 4.6, gz], [1.3, 1.7, 9.2, 12], '#8d99a6')
      box([9.6, 10.4, gz], [2.6, 2.2, 3.0], '#d4603c')
      box([4.2, 14.2, gz], [11.5, 0.55, 0.7], '#e0b32e', { rot: [0, 0, 0.34] })
      cyl([-0.8, 11.6, gz], [0.05, 0.05, 5.4, 6], '#8d99a6')
      cyl([-0.8, 8.4, gz], [0.34, 0.34, 0.9, 10], '#39424a')
      sph([9.6, 11.8, gz], [0.14, 8, 8], '#ffd98a')
    }

    // Talleres al otro lado del muelle: prefabricacion, corte CNC, granallado
    if (astStage(dSeg) !== 'grada') {
      const tz = (rnd() - 0.5) * L * 0.3
      const tx = 21 + rnd() * 3
      box([tx, 4.0, tz], [11, 8, L * 0.55], '#dfe4e8', { roughness: 0.8 })
      box([tx, 8.4, tz], [11.6, 0.8, L * 0.58], '#8f9ba6')
      box([tx - 5.6, 2.6, tz], [0.2, 5.2, L * 0.3], '#39424a')
      if (seed % 2 === 0) {
        for (const dz of [-4, 2]) cyl([tx + 2, 9.6, tz + dz], [0.5, 0.5, 2.4, 10], '#b9c4cc')
      } else {
        sph([tx - 5.4, 1.6, tz], [0.22, 8, 8], '#bfe9ff', { emissiveIntensity: 3.4 })
      }
      for (let z = -L / 2 + 6; z <= L / 2 - 6; z += 14) {
        if (rnd() < 0.55) {
          const bx = 15 + rnd() * 2
          box([bx, 1.9, z], [4.6, 3.6, 7.5], '#7d4a3a', { roughness: 0.85, metalness: 0.3 })
          box([bx, 0.2, z], [5.0, 0.4, 1.0], '#6b563a')
          box([bx, 3.75, z], [4.4, 0.3, 7.2], '#c3c4bd')
        }
      }
    }

    mast(11.4, -L * 0.3)
    if (astStage(dSeg) === 'grada') mast(-8.6, L * 0.3)
  } else if (theme === 'intermodal') {
    // ----- Terminal Intermodal -----
    // Los tres carriles SON tres espuelas de ferrocarril: se corre sobre la via
    // y los obstaculos largos son vagones estacionados encima de ella. De ahi
    // sale la lectura de Subway Surfers. A los lados, patio de maniobras
    // asfaltado con el resto de la operacion.
    box([0, -0.11, 0], [11, 0.22, L], '#7d848c', { tex: 'ballast', repeat: [3, L / 4], roughness: 1 })
    box([-15, -0.14, 0], [20, 0.22, L], '#9aa0a6', { tex: 'asphalt', repeat: [5, L / 4], roughness: 0.95 })
    box([15, -0.14, 0], [20, 0.22, L], '#9aa0a6', { tex: 'asphalt', repeat: [5, L / 4], roughness: 0.95 })
    for (let z = -L / 2 + 0.7; z <= L / 2 - 0.7; z += 1.4) {
      box([0, 0.02, z], [8.4, 0.08, 0.28], '#4a3a2b')
    }
    for (const c of LANES) {
      box([c - 0.5, 0.12, 0], [0.09, 0.12, L], '#b9c4cc', { metalness: 0.95, roughness: 0.25 })
      box([c + 0.5, 0.12, 0], [0.09, 0.12, L], '#b9c4cc', { metalness: 0.95, roughness: 0.25 })
    }
    box([-3.5, 0.025, 0], [0.12, 0.02, L], '#123a5e', { emissive: '#0d5c8c', emissiveIntensity: 0.7 })
    box([3.5, 0.025, 0], [0.12, 0.02, L], '#123a5e', { emissive: '#0d5c8c', emissiveIntensity: 0.7 })

    // Espuelas paralelas: las vias de carga y descarga simultanea.
    for (const sx of [-1, 1]) {
      box([sx * 7.4, 0.06, 0], [3.2, 0.12, L], '#4e555c', { tex: 'ballast', repeat: [1, L / 4] })
      for (const dx of [-0.5, 0.5]) {
        box([sx * 7.4 + dx, 0.16, 0], [0.09, 0.12, L], '#b9c4cc', { metalness: 0.95, roughness: 0.25 })
      }
    }

    // Convoyes largos estacionados. La clave es que los vagones se colocan en
    // una rejilla global de 15 m (las franjas miden 30 y estan alineadas a
    // multiplos de 30), asi que los de una franja continuan exactamente los de
    // la siguiente: el tren se ve entero y no cortado en trozos de 30 m. El
    // flag se mantiene 3 franjas seguidas, o sea 90 m de tren de un tiron.
    const trenAqui = seed % 6 < 3
    if (trenAqui) {
      const sx = Math.floor(seed / 6) % 2 === 0 ? -1 : 1
      for (const dz of [-7.5, 7.5]) railCar(sx * 7.4, dz, seed * 7 + (dz > 0 ? 1 : 0))
    }

    // Una grua de patio por franja, alternando la RMG que cubre las vias con la
    // RTG sobre neumaticos. La RMG es la pieza que define una intermodal.
    if (seed % 3 === 0) rmg(0, (rnd() - 0.5) * L * 0.4, 10)
    else if (seed % 3 === 1) rtg(0, (rnd() - 0.5) * L * 0.5, 5.8)

    // Infraestructura a los lados, repartida por semilla
    // Todo lo que sea un edificio grande vive pasado x=15. Una franja puede
    // quedar con su centro justo detras de la camara, y entonces sus props se
    // dibujan ENTRE la camara y el corredor; a 3 m de la camara solo entran
    // ~3 m de ancho en cuadro, asi que a partir de x=15 ya no pueden taparlo.
    if (seed % 5 === 0) bridgeShed((rnd() < 0.5 ? -1 : 1) * 17, (rnd() - 0.5) * L * 0.3, L * 0.6)
    else if (seed % 5 === 1) crossDock((rnd() < 0.5 ? -1 : 1) * 17.5, (rnd() - 0.5) * L * 0.3, L * 0.6)
    else if (seed % 5 === 2) inspectionBay((rnd() < 0.5 ? -1 : 1) * 15.5, (rnd() - 0.5) * L * 0.3, L * 0.5)
    else if (seed % 5 === 3) gateWithScale((rnd() < 0.5 ? -1 : 1) * 15, (rnd() - 0.5) * L * 0.4)
    else reeferRack((rnd() < 0.5 ? -1 : 1) * 11.5, (rnd() - 0.5) * L * 0.4, L * 0.5)

    // Chasis esperando, mulas maniobrando y las maquinas que suben y bajan
    // contenedores del tren
    chassisRow((rnd() < 0.5 ? -1 : 1) * (10.5 + rnd() * 1.5), -L / 2 + 4, 3 + Math.floor(rnd() * 2))
    for (let z = -L / 2 + 6; z <= L / 2 - 6; z += 11) {
      const sx = rnd() < 0.5 ? -1 : 1
      const r = rnd()
      if (r < 0.34) tractor(sx * (10.6 + rnd() * 1.4), z, rnd() < 0.5 ? 0 : Math.PI)
      else if (r < 0.6) heavyLift(sx * (11.2 + rnd() * 1.4), z, true)
      else if (r < 0.78) emptyHandler(sx * (11.6 + rnd() * 1.2), z)
    }

    // senales ferroviarias
    for (let z = -L / 2 + 5; z <= L / 2 - 5; z += 12) {
      const sx = rnd() < 0.5 ? -1 : 1
      box([sx * 5.1, 1.6, z], [0.14, 3.2, 0.14], '#55606b')
      box([sx * 5.1, 3.3, z + 0.02], [0.5, 1.1, 0.22], '#20262c')
      const green = rnd() < 0.6
      sph([sx * 5.1, 3.55, z + 0.16], [0.13, 10, 10], green ? COLORS.good : COLORS.bad)
      sph([sx * 5.1, 3.1, z + 0.16], [0.13, 10, 10], green ? '#1a2b22' : '#3a1418', { emissiveIntensity: 0.2 })
    }
    mast((rnd() < 0.5 ? -1 : 1) * 5.6, (rnd() - 0.5) * L * 0.7)
  } else {
    // ----- Terminal de Cruceros -----
    // Unica zona con relieve. Se sale de un muelle, se cruza mar abierto (aqui
    // NO se dibuja suelo: las lanchas las pone Boats desde el curso, y lo que
    // queda entre ellas es agua de verdad) y una pasarela sube 3.2 m a la
    // cubierta del crucero.
    //
    // Una franja de 30 m puede caer a caballo de dos tramos, asi que el suelo
    // se dibuja por rebanadas consultando en que tramo cae cada metro, en vez
    // de con una caja larga por franja. Eso ademas hace que la pasarela y el
    // casco del barco continuen exactos de una franja a la siguiente.
    const dSeg = seed * L
    const dAt = (z) => dSeg - z // metro del recorrido que corresponde a un z local
    const STEP = 2
    const SEA = -0.95

    // El agua esta al mismo nivel en toda la zona: lo que cambia de altura es
    // por lo que se corre, no el mar. La lancha va casi a ras y la cubierta del
    // crucero queda cuatro metros por encima.
    box([0, SEA, 0], [96, 0.12, L], '#4a7d99', {
      tex: 'water',
      repeat: [16, L / 8],
      emissive: '#16324a',
      emissiveIntensity: 0.4,
      roughness: 0.55,
      metalness: 0.1,
    })

    for (let z = -L / 2; z < L / 2; z += STEP) {
      const cz = z + STEP / 2
      const d = dAt(cz)
      // Fuera de la zona el tramo es 'muelle', que es suelo raso al nivel cero.
      // Antes caia en 'cubierta' y ahi esta el fallo: una franja de 30 m se
      // elige por su centro, asi que la primera franja de cruceros empieza
      // ANTES del metro 1404 y esos metros, que todavia son intermodal y estan
      // a cota cero, se dibujaban como cubierta de crucero a 3.2 m. Un trozo de
      // barco volando sobre el patio, justo en el cambio de zona.
      const stage = cruStage(d) || 'muelle'

      if (stage === 'muelle') {
        box([0, -0.11, cz], [14, 0.22, STEP], '#c9ccc6', { tex: 'asphalt', repeat: [4, 1], roughness: 0.95 })
        box([-1.15, 0.03, cz], [0.07, 0.02, STEP], COLORS.neon, { emissive: COLORS.neon, emissiveIntensity: 1.4 })
        box([1.15, 0.03, cz], [0.07, 0.02, STEP], COLORS.neon, { emissive: COLORS.neon, emissiveIntensity: 1.4 })
        // bitas de amarre en el borde del muelle
        if (Math.round(cz) % 6 === 0) {
          cyl([6.2, 0.3, cz], [0.26, 0.32, 0.6, 10], '#39424a')
          cyl([-6.2, 0.3, cz], [0.26, 0.32, 0.6, 10], '#39424a')
        }
      } else if (stage === 'rampa') {
        const y = deckAt(d)
        box([0, y - 0.11, cz], [11, 0.22, STEP + 0.25], '#d9e0e6', { roughness: 0.6 })
        box([0, y + 0.02, cz], [10.2, 0.05, 0.55], '#b9c4cc')
        for (const sx of [-1, 1]) {
          box([sx * 5.2, y + 0.62, cz], [0.09, 1.24, 0.09], '#ffffff')
          box([sx * 5.2, y + 1.2, cz], [0.07, 0.07, STEP], '#ffffff')
          box([sx * 5.2, y + 0.72, cz], [0.05, 0.05, STEP], '#ffd98a', {
            emissive: '#ffd98a',
            emissiveIntensity: 1.2,
          })
        }
      } else if (stage === 'cubierta') {
        const y = DECK_Y
        box([0, y - 0.11, cz], [13, 0.22, STEP], '#9a9182', { tex: 'teak', repeat: [4, 1], roughness: 0.6 })
        box([-1.15, y + 0.03, cz], [0.07, 0.02, STEP], COLORS.neon, { emissive: COLORS.neon, emissiveIntensity: 1.4 })
        box([1.15, y + 0.03, cz], [0.07, 0.02, STEP], COLORS.neon, { emissive: COLORS.neon, emissiveIntensity: 1.4 })
        // casco blanco bajando al agua y barandal de cubierta
        for (const sx of [-1, 1]) {
          box([sx * 6.6, y - 1.9, cz], [0.3, 3.4, STEP], '#eef2f5', { roughness: 0.5 })
          box([sx * 6.75, y - 3.75, cz], [0.28, 0.5, STEP], '#123a6b')
          box([sx * 4.6, y + 0.55, cz], [0.08, 1.1, 0.08], '#ffffff')
          box([sx * 4.6, y + 1.12, cz], [0.06, 0.06, STEP], '#ffffff')
          box([sx * 4.6, y + 1.34, cz], [0.04, 0.04, STEP], '#ffd98a', {
            emissive: '#ffd98a',
            emissiveIntensity: 1.3,
          })
          if (Math.round(cz) % 4 === 0) sph([sx * 6.5, y - 1.4, cz], [0.11, 8, 8], '#ffe9a0', { emissiveIntensity: 1.6 })
        }
        // Superestructura a babor: cabinas y balcones subiendo nueve metros.
        // Es lo que hace que el barco se lea como crucero desde el tramo de
        // agua, cuando todavia esta a cien metros. Va solo de un lado para que
        // la cubierta no se convierta en un pasillo cerrado.
        box([-9.6, y + 4.6, cz], [5.4, 9.2, STEP], '#f4f7f9', { roughness: 0.45 })
        box([-6.9, y + 4.6, cz], [0.2, 9.2, STEP], '#dfe6ec', { roughness: 0.5 })
        for (const by of [1.8, 4.4, 7.0]) {
          box([-6.85, y + by, cz], [0.12, 0.9, STEP * 0.72], '#16324f', { roughness: 0.25, metalness: 0.4 })
          box([-6.78, y + by - 0.55, cz], [0.1, 0.1, STEP * 0.8], '#ffffff')
        }
        if (Math.round(cz) % 6 === 0) sph([-6.9, y + 9.0, cz], [0.1, 8, 8], '#ffe9a0', { emissiveIntensity: 1.8 })
      }
    }

    // Decorado del tramo de agua: boyas y espuma, para que el mar no sea un
    // plano liso mientras se salta de lancha en lancha.
    if (cruStage(dSeg) === 'botes' || cruStage(dSeg) === 'muelle') {
      for (let z = -L / 2 + 4; z <= L / 2 - 4; z += 9) {
        if (rnd() < 0.5) {
          const x = 8 + rnd() * 7
          cyl([x, -0.55, z], [0.3, 0.42, 1.0, 10], '#e0b32e')
          sph([x, 0.1, z], [0.14, 8, 8], '#ff5d4d')
        }
        if (rnd() < 0.6) {
          box([(rnd() - 0.5) * 26, -0.9, z + 3], [2.6 + rnd() * 3, 0.04, 0.7], '#dff3ff', {
            emissive: '#bfe9ff',
            emissiveIntensity: 0.35,
          })
        }
      }
    }

    // Decorado de a bordo: solo donde hay cubierta
    if (cruStage(dSeg) === 'cubierta') {
      const y = DECK_Y
      // botes salvavidas pegados al costado
      for (let z = -L / 2 + 5; z <= L / 2 - 5; z += 13) {
        for (const sx of [-1, 1]) {
          if (rnd() < 0.7) continue
          box([sx * 6.0, y + 1.1, z - 0.7], [0.09, 2.2, 0.09], '#ffffff')
          box([sx * 6.0, y + 1.1, z + 0.7], [0.09, 2.2, 0.09], '#ffffff')
          box([sx * 6.0, y + 2.15, z], [0.09, 0.09, 1.6], '#ffffff')
          cyl([sx * 6.0, y + 1.62, z], [0.26, 0.26, 1.5, 10], '#e67e22', { rot: [Math.PI / 2, 0, 0] })
          box([sx * 6.0, y + 1.79, z], [0.34, 0.1, 0.95], '#f4f6f8')
        }
      }
      // camastros y sombrillas junto al barandal
      for (let z = -L / 2 + 3; z <= L / 2 - 3; z += 5.5) {
        if (rnd() < 0.7) {
          const sx = rnd() < 0.5 ? -1 : 1
          const x = sx * (4.0 + rnd() * 0.4)
          box([x, y + 0.28, z], [0.6, 0.1, 1.5], '#f4f6f8')
          box([x, y + 0.55, z - 0.55], [0.6, 0.5, 0.1], '#f4f6f8', { rot: [-0.5, 0, 0] })
          box([x, y + 0.15, z], [0.5, 0.2, 1.3], COLORS.sky)
          if (rnd() < 0.35) {
            cyl([x, y + 1.1, z + 0.9], [0.05, 0.05, 2.2, 6], '#c9d4dd')
            cyl([x, y + 2.15, z + 0.9], [0.05, 1.1, 0.5, 10], '#ff8c1a')
          }
        }
      }
      // chimenea y mastil
      if (seed % 2 === 1) {
        const z = (rnd() - 0.5) * L * 0.5
        cyl([5.9, y + 4.1, z], [1.15, 1.5, 5.4, 14], '#c0392b')
        cyl([5.9, y + 6.9, z], [1.17, 1.17, 0.55, 14], '#20242c')
        sph([5.9, y + 7.5, z], [0.12, 8, 8], '#ff5d4d')
      }
    }
  }
  return out
}

function PropMesh({ p, maps }) {
  const map = p.tex ? tiledTexture(maps[p.tex], p.tex, p.repeat?.[0] ?? 1, p.repeat?.[1] ?? 1) : null
  return (
    <mesh position={p.pos} rotation={p.rot || [0, 0, 0]}>
      {p.geo === 'box' ? (
        <boxGeometry args={p.size} />
      ) : p.geo === 'cyl' ? (
        <cylinderGeometry args={p.args} />
      ) : (
        <sphereGeometry args={p.args} />
      )}
      <meshStandardMaterial
        map={map}
        color={p.color}
        emissive={p.emissive || '#000000'}
        emissiveIntensity={p.emissiveIntensity || 0}
        metalness={p.metalness || 0.1}
        roughness={p.roughness ?? 0.85}
      />
    </mesh>
  )
}

const Segment = memo(function Segment({ theme, seed, maps }) {
  const props = useMemo(() => buildProps(theme, seed), [theme, seed])
  return (
    <group>
      {props.map((p, i) => (
        <PropMesh key={i} p={p} maps={maps} />
      ))}
    </group>
  )
})

const initialSlots = () => Array.from({ length: NUM_SEGMENTS }, (_, i) => ({ slot: i, k: i }))

export function World() {
  const maps = useGameTextures()
  // Los slots viven en un ref mutable: el reciclaje se aplica sincrono dentro
  // del frame (con estado de React un update tardio duplicaba el salto de k
  // y dejaba huecos de 30 m en el piso). El contador solo fuerza re-render.
  const slotsRef = useRef(null)
  if (slotsRef.current === null) slotsRef.current = initialSlots()
  const [, setVersion] = useState(0)
  const refs = useRef([])

  useEffect(
    () =>
      useGame.subscribe((state, prev) => {
        if (state.phase === 'countdown' && prev.phase !== 'countdown') {
          slotsRef.current = initialSlots()
          setVersion((v) => v + 1)
        }
      }),
    []
  )

  useFrame(() => {
    // el escenario lee el mismo scroll que el curso: con dos integradores
    // separados los porticos acababan cayendo en el tema equivocado
    const s = scroll.s
    let changed = false
    slotsRef.current.forEach((seg, i) => {
      // recicla todo lo que haga falta este mismo frame (importante con ?skip)
      while (START + s - seg.k * L - L > START + 2) {
        seg.k += NUM_SEGMENTS
        changed = true
      }
      const g = refs.current[i]
      if (g) g.position.z = START + s - seg.k * L - L / 2
    })
    if (changed) setVersion((v) => v + 1)
  })

  return slotsRef.current.map((seg, i) => (
    <group key={seg.slot} ref={(el) => (refs.current[i] = el)}>
      <Segment theme={themeFor(seg.k)} seed={seg.k} maps={maps} />
    </group>
  ))
}
