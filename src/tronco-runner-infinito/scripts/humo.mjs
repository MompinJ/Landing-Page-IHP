// PRUEBA DE HUMO SIN PANTALLA.
//
// Un runner infinito no se puede probar a ojo. Lo que falla no es el primer
// metro: es el kilometro seis, cuando ya se sortearon veinte terminales, las
// ventanas de dibujo se reciclaron mil veces y el perfil de alturas lleva
// cuatrocientos puntos. Y ademas el trazado no es el mismo dos veces, asi que
// "lo probe y se veia bien" no dice nada de la partida siguiente.
//
// Por eso la prueba va en dos mitades, que es la division que de verdad importa
// en un juego generado:
//
//   1. EL GENERADOR, en frio y sin dibujar nada. Se le piden doce kilometros de
//      curso y se comprueban las invariantes que el resto del juego da por
//      hechas: listas ordenadas por distancia, perfil de alturas dentro de
//      rango, ninguna plataforma encimada con otra en su carril, cada pieza a la
//      altura del suelo que le toca, y que las cinco terminales y las dos
//      mecanicas nuevas aparecen de verdad. Corre en un segundo y cubre mas
//      curso del que nadie va a correr en el stand.
//
//   2. EL JUEGO VIVO, dibujando. Comprueba lo que el generador no puede saber:
//      que nadie tira un error a la consola, que el corredor se sostiene a
//      alturas posibles, que el gancho de la grua lo sube y lo vuelve a dejar en
//      el suelo, y que chocar acaba la carrera.
//
// OJO CON EL RELOJ: sin pantalla el navegador dibuja por software y va a unos
// siete cuadros por segundo, con el dt del juego topado en 0.05. O sea que un
// minuto de reloj real son unos cuatro segundos y medio de juego, y el corredor
// avanza a la decima parte de lo que avanzaria en la maquina del stand. Los
// umbrales de aqui estan puestos contra eso.
//
//   node scripts/humo.mjs [segundos]

import { chromium } from '../../data-hunter-hp/node_modules/playwright/index.mjs'

const SEGUNDOS = Number(process.argv[2]) || 60
const URL = process.env.URL || 'http://localhost:5177/?debug'

const errores = []
let fallos = 0

function comprueba(cond, msg) {
  if (cond) return
  fallos++
  console.error(`  FALLO  ${msg}`)
}

const navegador = await chromium.launch()

// CADA MITAD EN SU PROPIA PESTAÑA, y no por limpieza: la primera mitad rehace el
// curso entero decenas de veces desde fuera, con la escena de la portada viva
// detras dibujando ese mismo curso. Eso no pasa nunca jugando -- el curso solo
// se rehace al lanzar la cuenta atras, que remonta las ventanas en el acto --,
// asi que ensuciar la pestaña de la parte viva con ese estado seria probar una
// situacion que el juego no tiene.
async function abre(extra = '') {
  const pg = await navegador.newPage({ viewport: { width: 1280, height: 720 } })
  pg.on('console', (m) => {
    if (m.type() === 'error') errores.push(m.text())
  })
  pg.on('pageerror', (e) => errores.push(String(e)))
  // 'networkidle' no llega nunca: el servidor de desarrollo mantiene abierto su
  // websocket de recarga y el juego dibuja sin parar.
  // AL FRENTE, SIEMPRE. Chrome estrangula los temporizadores de las pestañas
  // que no se ven: con varias abiertas a lo largo de la prueba, la cuenta atras
  // -- que son cuatro setTimeout encadenados -- se quedaba colgada y la espera
  // de 'playing' vencia sin que nada estuviera roto en el juego.
  await pg.bringToFront()
  await pg.goto(URL + extra, { waitUntil: 'domcontentloaded' })
  await pg.waitForFunction(() => window.__TR, null, { timeout: 20000 })
  return pg
}

// Arranca una carrera: los dos botones que pulsa cualquiera en el stand.
//
// La inmunidad se pone DURANTE la cuenta atras y no despues de que la partida
// empiece: entre que la espera de 'playing' se resuelve y corre el siguiente
// evaluate pasa casi un segundo de reloj real, y a trece metros por segundo eso
// da de sobra para estrellarse. Las pruebas que dependen de llegar a una pieza
// concreta se caian ahi, y el mensaje decia "no se pudo recoger" cuando lo que
// pasaba es que nunca se llego.
async function arranca(pg, { inmune = false } = {}) {
  await pg.getByRole('button', { name: 'JUGAR' }).click()
  await pg.getByRole('button', { name: 'A CORRER' }).click()
  if (inmune) {
    await pg.evaluate(() => {
      const s = window.__TR.store
      window.__crashReal = s.getState().crash
      s.setState({ crash: () => {} })
    })
  }
  // Sin pantalla la cuenta atras tarda cinco segundos largos, y con varias
  // pestañas ya usadas puede tardar bastante mas: el margen es generoso a
  // proposito, porque agotarlo no significa nada roto en el juego.
  await pg.waitForFunction(() => window.__TR.store.getState().phase === 'playing', null, { timeout: 60000 })
}

let pagina = await abre()

/* ==================== 1. EL GENERADOR, EN FRIO ==================== */

const gen = await pagina.evaluate(() => {
  const c = window.__TR.curso
  const KM = 12000
  const malos = []

  c.resetCourse()
  for (let d = 0; d < KM; d += 200) c.ensureCourse(d)

  const { COURSE, PLATFORMS } = c

  // Las listas se recorren con cursores que solo avanzan: si no van ordenadas
  // por distancia, la ventana de dibujo se salta piezas enteras sin avisar.
  for (const [nombre, lista] of Object.entries(COURSE)) {
    for (let i = 1; i < lista.length; i++) {
      if (lista[i].d < lista[i - 1].d) {
        malos.push(`${nombre} desordenada en ${Math.round(lista[i].d)} m`)
        break
      }
    }
  }
  for (let i = 1; i < PLATFORMS.length; i++) {
    if (PLATFORMS[i].d0 < PLATFORMS[i - 1].d0) {
      malos.push(`plataformas desordenadas en ${Math.round(PLATFORMS[i].d0)} m`)
      break
    }
  }

  // Dos plataformas encimadas en el mismo carril serian dos suelos a la vez, y
  // el corredor quedaria enganchado entre ellas.
  for (let i = 0; i < PLATFORMS.length; i++) {
    const a = PLATFORMS[i]
    for (let j = i + 1; j < PLATFORMS.length; j++) {
      const b = PLATFORMS[j]
      if (b.d0 > a.end) break
      if (a.lane === b.lane && b.d0 < a.end - 0.5) {
        malos.push(`plataformas encimadas en el carril ${a.lane}, ${Math.round(b.d0)} m`)
        i = PLATFORMS.length
        break
      }
    }
  }

  // Cada pieza se coloca a la altura del suelo de su metro (salvo las que van
  // ARRIBA de un andamio, 2.7 m por encima). Si se separan, los obstaculos
  // flotan o se hunden: el juego decide si te pegan comparando esa altura con
  // la del corredor.
  for (const o of COURSE.obstacles) {
    const dif = o.dy - c.deckAt(o.d)
    if (dif < -0.05 || dif > 3.0) malos.push(`obstaculo a ${dif.toFixed(2)} m del suelo en ${Math.round(o.d)} m`)
  }

  // Las fichas del izado van colgadas en la curva del vuelo. Que ninguna quede
  // bajo el suelo ni sobre el techo del vuelo es comprobar que corredor y fichas
  // leen la misma curva.
  for (const it of COURSE.items) {
    const alt = it.dy - c.deckAt(it.d)
    if (alt < -0.1 || alt > 5.4) malos.push(`ficha a ${alt.toFixed(2)} m del suelo en ${Math.round(it.d)} m`)
  }

  // NINGUN VALOR DENTRO DE UN OBSTACULO.
  //
  // La fila de premio se reparte en el hueco que queda detras de cada patron, y
  // ese hueco se acorto para que hubiera mas obstaculos por kilometro: si la
  // fila se sale por el otro extremo, la ultima ficha acaba dentro de la pieza
  // del patron siguiente. Y eso es de lo peor que puede pasar en un juego de
  // esquivar -- un premio plantado donde hay que chocarse para cogerlo.
  const porCarril = [[], [], []]
  for (const o of COURSE.obstacles) porCarril[o.lane]?.push(o)
  for (const it of COURSE.items) {
    // las rojas tambien: una roja medio metida en un contenedor no se puede
    // esquivar por separado y se lee como un fallo del juego
    if (it.kind === 'lift') continue
    // las del izado van por el aire, cinco metros por encima de la pista
    if (it.dy - c.deckAt(it.d) > 1.6) continue
    for (const o of porCarril[it.lane] || []) {
      if (o.d < it.d - 20) continue
      if (o.d > it.d + 20) break
      const medio = (window.__TR.constantes.OBSTACLE_LEN[o.type] || 2) / 2
      if (Math.abs(o.d - it.d) < medio + 0.9) {
        malos.push(`ficha dentro de un ${o.type} en ${Math.round(it.d)} m, carril ${it.lane}`)
        break
      }
    }
    if (malos.length > 5) break
  }

  // CONVOYES EN MARCHA: el carril que barren tiene que estar limpio de punta a
  // punta. Un camion que rueda setenta metros hacia adelante pasa por encima de
  // todo lo que hubiera ahi, y verlo atravesar un contenedor parado es peor que
  // no moverlo; ademas seria una pieza viniendose encima que nadie coloco.
  let enMarcha = 0
  for (const p of PLATFORMS) {
    if (!p.v) continue
    if (p.ramp > 0) enMarcha++
    for (const o of COURSE.obstacles) {
      if (o.d < p.d0 - 6) continue
      if (o.d > p.end + p.tope + 8) break
      if (o.lane === p.lane) {
        malos.push(`obstaculo en el carril que barre un convoy, ${Math.round(o.d)} m`)
        break
      }
    }
  }

  // VIA DOBLE: dos convoyes en carriles contiguos que se abordan por el mismo
  // metro. Es la unica ruta de altura del juego por la que se puede cambiar de
  // carril, asi que se comprueban las dos cosas que la hacen jugable:
  //
  //   - QUE LOS HUECOS NO COINCIDAN. Si los cortes de las dos vias caen a la
  //     misma altura, pasarse al techo de al lado no salva ningun salto y la via
  //     doble es decorado caro.
  //   - QUE EL TERCER CARRIL NO SEA UNA ENCERRONA. Con dos carriles llenos de
  //     camion, el que queda es el unico suelo que hay: una pieza que solo se
  //     esquiva cambiando de carril seria muerte segura para quien no se subio.
  const cabezas = PLATFORMS.filter((p) => p.kind === 'rig' && p.ramp > 0)
  let dobles = 0
  for (const a of cabezas) {
    const b = cabezas.find((x) => x !== a && Math.abs(x.d0 - a.d0) < 0.01 && Math.abs(x.lane - a.lane) === 1)
    // cada pareja se mira una sola vez, desde el carril de la izquierda
    if (!b || b.lane < a.lane) continue
    dobles++
    if (Math.abs(a.end - b.end) < 1.5) malos.push(`via doble con los huecos alineados en ${Math.round(a.d0)} m`)
    const libre = [0, 1, 2].find((l) => l !== a.lane && l !== b.lane)
    const hasta = Math.max(...a.convoy.map((p) => p.end), ...b.convoy.map((p) => p.end)) + (a.tope || 0)
    for (const o of COURSE.obstacles) {
      if (o.d < a.d0 - 6) continue
      if (o.d > hasta) break
      if (o.lane === libre && ['tall', 'long', 'truck', 'loco'].includes(o.type)) {
        malos.push(`encerrona en el carril ${libre} al lado de una via doble, ${Math.round(o.d)} m`)
        break
      }
    }
  }

  // El suelo va del fondo del dique (-4.6) a la cubierta del crucero (3.2).
  // Cualquier cosa fuera de ahi es un perfil roto.
  let minY = 0
  let maxY = 0
  for (let d = 0; d < KM; d += 3) {
    const y = c.deckAt(d)
    minY = Math.min(minY, y)
    maxY = Math.max(maxY, y)
  }

  const terminales = {}
  for (let i = 0; i < c.chainCount(); i++) {
    const k = c.chainZone(i).key
    terminales[k] = (terminales[k] || 0) + 1
  }

  const kinds = (k) => COURSE.items.filter((e) => e.kind === k).length
  const huella = () =>
    COURSE.obstacles
      .slice(0, 60)
      .map((o) => `${Math.round(o.d)}${o.type}${o.lane}`)
      .join('')

  const res = {
    malos: malos.slice(0, 6),
    terminales,
    zonas: c.chainCount(),
    obstaculos: COURSE.obstacles.length,
    palabras: kinds('good') + kinds('bad'),
    enAlto: COURSE.items.filter((e) => e.kind === 'good' && e.dy - c.deckAt(e.d) > 1).length,
    ganchos: kinds('lift'),
    cascos: kinds('shield'),
    camiones: PLATFORMS.filter((p) => p.kind === 'rig').length,
    dobles,
    trenes: PLATFORMS.filter((p) => p.estilo === 'tren').length,
    enMarcha,
    // Toda ficha que este sobre el techo de un convoy tiene que saber en que
    // convoy viaja: si no, se queda clavada en el aire cuando el arranca. Se
    // busca por plataforma y no por altura a secas -- a tres metros del suelo
    // tambien van las de la cubierta del crucero y media curva del izado.
    sueltas: PLATFORMS.reduce((n, p) => {
      if (p.kind !== 'rig') return n
      return (
        n +
        COURSE.items.filter(
          (i) =>
            i.lane === p.lane &&
            i.d >= p.d0d &&
            i.d <= p.end &&
            Math.abs(i.dy - c.deckAt(i.d) - p.h) < 0.3 &&
            i.rig !== p
        ).length
      )
    }, 0),
    andamios: PLATFORMS.filter((p) => p.kind === 'scaf').length,
    lanchas: COURSE.boats.length,
    minY,
    maxY,
  }

  // Dos cursos seguidos no pueden salir iguales: es el motivo entero del juego.
  const h1 = huella()
  c.resetCourse()
  c.ensureCourse(1200)
  res.repetido = h1 === huella()

  return res
})

console.log('--- 1. Generador (12 km en frio) ---')
console.log(
  `Terminales: ${gen.zonas} (${Object.entries(gen.terminales)
    .map(([k, n]) => `${k} x${n}`)
    .join(', ')})`
)
console.log(`Obstaculos ${gen.obstaculos} | fichas ${gen.palabras} (${gen.enAlto} en alto) | ganchos ${gen.ganchos}`)
console.log(
  `Camiones ${gen.camiones} (${gen.trenes} vagones de tren) | convoyes en marcha ${gen.enMarcha} | ` +
    `vias dobles ${gen.dobles} | ` +
    `andamios ${gen.andamios} | lanchas ${gen.lanchas} | cascos ${gen.cascos}`
)
console.log(`Suelo entre ${gen.minY.toFixed(2)} y ${gen.maxY.toFixed(2)} m`)

comprueba(gen.malos.length === 0, `invariantes rotas: ${JSON.stringify(gen.malos)}`)
comprueba(gen.enMarcha > 3, `casi ningun convoy se pone en marcha (${gen.enMarcha} en 12 km)`)
comprueba(gen.trenes > 0, 'la intermodal no genero ningun tren que trepar')
comprueba(gen.sueltas === 0, `${gen.sueltas} fichas de techo sin convoy al que agarrarse`)
comprueba(Object.keys(gen.terminales).length === 5, `no salieron las cinco terminales: ${Object.keys(gen.terminales)}`)
comprueba(gen.camiones >= 6, `pocos camiones portacontenedor en 12 km (${gen.camiones})`)
comprueba(gen.dobles >= 3, `casi ninguna via doble en 12 km (${gen.dobles})`)
comprueba(gen.andamios >= 6, `pocos andamios en 12 km (${gen.andamios})`)
comprueba(gen.ganchos >= 8, `pocos ganchos de grua en 12 km (${gen.ganchos})`)
comprueba(gen.enAlto > 150, `pocas fichas en alto (camion e izado) en 12 km (${gen.enAlto})`)
comprueba(gen.cascos >= 8, `pocos cascos reforzados en 12 km (${gen.cascos})`)
comprueba(gen.lanchas > 20, `pocas lanchas en 12 km (${gen.lanchas})`)
comprueba(gen.minY > -5.0 && gen.maxY < 3.5, `perfil de alturas fuera de rango (${gen.minY} .. ${gen.maxY})`)
comprueba(!gen.repetido, 'dos partidas seguidas generaron el mismo curso')

/* ==================== 2. EL JUEGO VIVO ==================== */

await pagina.close()
pagina = await abre()

// Entrar: JUGAR -> A CORRER. Son los mismos dos botones que pulsa cualquiera en
// el stand, asi que de paso se comprueba que ese camino existe.
await arranca(pagina, { inmune: true })

console.log(`\n--- 2. Juego vivo (${SEGUNDOS} s de reloj real) ---`)

const vivo = await pagina.evaluate(async (segundos) => {
  const { store, curso } = window.__TR
  const rt = window.__rt
  const out = { picos: [], zonas: new Set(), maxDist: 0, vuelos: 0, altoVuelo: 0, fichas: 0, sobreCamion: 0, mult: 1, racha: 0 }
  const t0 = performance.now()
  const espera = (ms) => new Promise((r) => setTimeout(r, ms))

  // SE LE QUITA LA MUERTE AL CORREDOR, y es la unica forma de que esta parte
  // sirva de algo: con una sola vida, un robot que no sabe saltar se estrella
  // antes de llegar a nada de lo que hay que comprobar. `crash` es una accion
  // del store, asi que se sustituye desde fuera sin tocar el juego. Que el
  // choque funciona se comprueba aparte, justo despues.
  const crashReal = window.__crashReal

  while (performance.now() - t0 < segundos * 1000) {
    await espera(40)
    const st = store.getState()
    if (st.phase !== 'playing') continue

    const suelo = rt.deck
    const alto = rt.deck + rt.y
    if (suelo < -5.2 || suelo > 6.2) out.picos.push({ d: Math.round(rt.distance), suelo })
    if (alto < -5.6 || alto > 9) out.picos.push({ d: Math.round(rt.distance), alto })

    if (rt.flying) {
      out.altoVuelo = Math.max(out.altoVuelo, rt.y)
      if (!out.volando) {
        out.volando = true
        out.vuelos++
      }
    } else if (out.volando) {
      out.volando = false
      // al soltar el gancho hay que quedar en el suelo, no colgado en el aire
      if (rt.y > 0.8) out.picos.push({ d: Math.round(rt.distance), colgado: rt.y })
    }
    if (rt.deck > 2.5 && !curso.cruStage(rt.distance)) out.sobreCamion++

    out.zonas.add(st.zone)
    out.maxDist = Math.max(out.maxDist, rt.distance)
    out.fichas = st.goods
    out.mult = Math.max(out.mult, st.mult)
    out.racha = Math.max(out.racha, st.mejorRacha)

    // EL ROBOT JUEGA A ALGO: se va al carril de lo mas apetecible que tenga
    // delante -- un gancho de grua, una moneda o la rampa de un camion -- en vez
    // de dar tumbos al azar. Sin esto no pisa nunca las piezas nuevas y la
    // prueba no llega a ejercitarlas.
    const d = rt.distance
    // Las piezas raras van primero: si se buscara "lo mas cercano" a secas, el
    // robot se pasaria la carrera pegado a los hexagonos del suelo, que son
    // los que siempre hay, y no pisaria nunca un gancho ni un casco -- que es
    // justo lo que esta prueba viene a ejercitar.
    const cerca = (e, dd) => dd > d + 6 && dd < d + 80
    const objetivo =
      curso.COURSE.items.find((e) => cerca(e, e.d) && (e.kind === 'lift' || e.kind === 'shield')) ||
      curso.PLATFORMS.find((p) => cerca(p, p.d0) && p.ramp > 0) ||
      curso.COURSE.items.find((e) => cerca(e, e.d) && e.kind === 'good')
    if (objetivo) rt.targetLane = objetivo.lane
  }

  out.zonas = [...out.zonas]
  store.setState({ crash: crashReal })
  return out
}, SEGUNDOS)

// EL CHOQUE TIENE QUE MATAR: es la regla entera de este juego, asi que se
// provoca a proposito y se mira que pasa por el frenado y termina en la
// pantalla final. La espera es larga porque sin pantalla el reloj del juego
// avanza a un tercio largo del real.
const muerte = await pagina.evaluate(async () => {
  const { store } = window.__TR
  const espera = (ms) => new Promise((r) => setTimeout(r, ms))
  if (store.getState().phase !== 'playing') return { fase: 'no-jugando' }
  store.getState().crash('PRUEBA DE CHOQUE')
  await espera(200)
  const frenando = store.getState().phase
  for (let i = 0; i < 80 && store.getState().phase !== 'gameover'; i++) await espera(250)
  const final = store.getState()
  return { frenando, fase: final.phase, causa: final.causa }
})

const finalUI = (await pagina.textContent('.panel').catch(() => '')) || ''

console.log(`Distancia: ${Math.round(vivo.maxDist)} m | terminales pisadas: ${vivo.zonas.length}`)
console.log(
  `Izados: ${vivo.vuelos} (hasta ${vivo.altoVuelo.toFixed(1)} m) | fichas recogidas: ${vivo.fichas} | ` +
    `mejor racha ${vivo.racha} (x${vivo.mult})`
)
console.log(`Cuadros corriendo sobre un camion: ${vivo.sobreCamion}`)
console.log(`Muerte: ${muerte.frenando} -> ${muerte.fase} (${muerte.causa})`)
console.log(`Errores de consola: ${errores.length}`)
if (errores.length) console.log(errores.slice(0, 8).join('\n'))

comprueba(errores.length === 0, 'hubo errores de consola')
comprueba(vivo.maxDist > 150, `el corredor apenas avanzo (${Math.round(vivo.maxDist)} m)`)
comprueba(vivo.picos.length === 0, `alturas imposibles: ${JSON.stringify(vivo.picos.slice(0, 5))}`)
comprueba(vivo.fichas > 0, 'no se recogio ni una ficha')
// El izado y la racha NO se aseguran aqui a proposito: esta parte corre con
// semilla al azar, y si la primera terminal sale crucero o astillero no hay
// ningun gancho en los doscientos metros que da tiempo a recorrer sin pantalla.
// Una prueba que falla segun la semilla es peor que no tenerla: se aprende a
// ignorarla. Ambas cosas se comprueban abajo con semilla fija.
comprueba(muerte.frenando === 'crashed', `chocar no paso por el frenado (${muerte.frenando})`)
comprueba(muerte.fase === 'gameover', `chocar no acabo la partida (${muerte.fase})`)
comprueba(/PRUEBA DE CHOQUE/.test(finalUI), 'la pantalla final no dice contra que se choco')

/* ==================== 3. TREPARSE AL CAMION ====================

  La parte viva corre donde le toca y puede pasarse una carrera entera sin
  cruzarse con un convoy. El camion es la pieza estrella de este juego, asi que
  se comprueba a proposito: se fija la semilla (?seed=), se le pregunta al
  generador donde puso el primer convoy, y se arranca la partida treinta metros
  antes de su rampa (?skip=) con el corredor ya puesto en ese carril.

  Lo que tiene que pasar es exactamente lo que se le promete al jugador: que la
  rampa lo suba al techo sin tener que clavar ningun salto, que se sostenga alli
  arriba, y que al acabarse el convoy vuelva al suelo.
*/
await pagina.close()
pagina = await abre('&seed=987654')

const donde = await pagina.evaluate(() => {
  const c = window.__TR.curso
  c.resetCourse()
  c.ensureCourse(3000)
  // El PARADO: es el que puede recorrerse entero en el tiempo que da una
  // prueba sin pantalla, asi que es con el que se comprueba que la rampa sube y
  // que al acabarse el convoy se vuelve al suelo. El que rueda se prueba
  // aparte, y solo el abordaje: recorrerlo entero son trescientos metros.
  const p = c.PLATFORMS.find((x) => x.kind === 'rig' && x.ramp > 0 && !x.v)
  const m = c.PLATFORMS.find((x) => x.kind === 'rig' && x.ramp > 0 && x.v)
  if (!p) return null
  return {
    d0: Math.round(p.d0),
    lane: p.lane,
    h: p.h,
    marcha: m ? { d0: Math.round(m.d0), lane: m.lane, h: m.h, v: m.v, tope: Math.round(m.tope) } : null,
    // la pendiente se mide aqui, en frio, y no sobre la partida viva: rehacer
    // el curso con una carrera encima es justo lo que esta prueba evita
    cuesta: {
      antes: c.rampAngle(p, p.d0 - 1),
      media: c.rampAngle(p, p.d0 + p.ramp / 2),
      techo: c.rampAngle(p, p.d0d + 5),
      grados: (c.rampAngle(p, p.d0 + 1) * 180) / Math.PI,
    },
  }
})

let camion = { subio: 0, bajo: false }
if (!donde) {
  comprueba(false, 'con semilla fija no se genero ningun convoy en 3 km')
} else {
  await pagina.close()
  pagina = await abre(`&seed=987654&skip=${Math.max(1, donde.d0 - 30)}`)
  await arranca(pagina, { inmune: true })

  camion = await pagina.evaluate(async (info) => {
    const rt = window.__rt
    const espera = (ms) => new Promise((r) => setTimeout(r, ms))
    let subio = 0
    let bajo = false
    // se le pone el carril del camion y no se le toca nada mas: subir tiene que
    // ser cosa de la rampa, no de un salto bien medido
    for (let i = 0; i < 400; i++) {
      rt.targetLane = info.lane
      await espera(40)
      if (rt.deck > info.h - 0.35) subio = Math.max(subio, rt.deck)
      else if (subio) bajo = true
      if (bajo) break
    }
    return { subio, bajo, dist: Math.round(rt.distance) }
  }, donde)
}

console.log(`\n--- 3. Camion portacontenedor (semilla fija, convoy en ${donde ? donde.d0 : '?'} m) ---`)
console.log(`Altura maxima sobre el camion: ${camion.subio.toFixed(2)} m | volvio al suelo: ${camion.bajo}`)

comprueba(camion.subio > 2.5, `la rampa no subio al corredor al techo (${camion.subio.toFixed(2)} m)`)
comprueba(camion.bajo, 'el corredor no volvio al suelo al acabarse el convoy')

// LA PENDIENTE DE LA RAMPA, que es de donde salen la inclinacion del corredor y
// el golpe metalico al pisarla. Se comprueba el contrato entero -- empinada
// dentro de la rampa, plana fuera -- porque el corredor dispara el sonido
// exactamente con esa condicion: si `rampAngle` devolviera algo distinto de
// cero sobre el techo, el golpe sonaria en bucle mientras se corre por arriba.
const cuesta = donde?.cuesta || null

console.log(`Rampa: ${cuesta ? cuesta.grados.toFixed(1) : '?'} grados de inclinacion`)

comprueba(cuesta !== null, 'no se encontro rampa de camion para medir la pendiente')
comprueba(cuesta?.antes === 0, 'la rampa se empina antes de empezar')
comprueba(cuesta?.media > 0.3, `la rampa del camion sale demasiado plana (${cuesta?.media})`)
comprueba(cuesta?.techo === 0, 'el techo del camion sigue contando como rampa')

/* ---------- El convoy EN MARCHA ----------

  Lo unico que hay que comprobar aqui es lo que cambia: que un convoy que va
  rodando SIGUE recogiendo al que entra por su carril. Todo lo demas -- techo,
  saltos entre remolques, bono -- es la misma maquinaria que la del parado, solo
  que preguntada unos metros antes (ver rodado() en course.js).

  Se arranca pegado a su rampa a proposito: el camion lleva ya un buen trecho
  rodado cuando el corredor llega, y alcanzarlo desde lejos son doscientos
  metros que sin pantalla no da tiempo a correr.
*/
let rodante = { subio: 0, avanzo: 0 }
if (donde?.marcha) {
  await pagina.close()
  pagina = await abre(`&seed=987654&skip=${Math.max(1, donde.marcha.d0 - 5)}`)
  await arranca(pagina, { inmune: true })
  rodante = await pagina.evaluate(async (info) => {
    const { store } = window.__TR
    const c = window.__TR.curso
    const rt = window.__rt
    const espera = (ms) => new Promise((r) => setTimeout(r, ms))
    const p = c.PLATFORMS.find((x) => x.kind === 'rig' && x.ramp > 0 && x.v && Math.round(x.d0) === info.d0)
    let subio = 0
    let avanzo = 0
    // LAS FICHAS DEL TECHO DE UN CONVOY EN MARCHA.
    //
    // Se cuentan aparte y solo mientras se va ARRIBA, porque es exactamente lo
    // que estuvo roto: la ventana de dibujo de las fichas miraba el metro en el
    // que nacieron y no el que llevan rodado con el camion, asi que la fila
    // entera se desmontaba cincuenta metros antes de llegar a ella. Desde el
    // juego se veia como pasar por encima de los valores sin que se recogiera
    // ninguno -- y lo que pasaba es que ya no estaban.
    let alSubir = null
    let arriba = 0
    for (let i = 0; i < 700; i++) {
      rt.targetLane = info.lane
      await espera(40)
      if (p) avanzo = Math.max(avanzo, c.rodado(p, rt.distance))
      if (rt.deck > info.h - 0.35) {
        subio = Math.max(subio, rt.deck)
        if (alSubir === null) alSubir = store.getState().goods
        arriba = store.getState().goods - alSubir
        if (arriba > 0) break
      } else if (alSubir !== null) {
        break // se acabo el convoy: lo que se recogiera despues no es del techo
      }
    }
    return { subio, avanzo, arriba }
  }, donde.marcha)
}

console.log(
  `Convoy en marcha (v ${donde?.marcha?.v ?? '?'}, en ${donde?.marcha?.d0 ?? '?'} m): rodo ` +
    `${rodante.avanzo.toFixed(1)} m | el corredor subio a ${rodante.subio.toFixed(2)} m y recogio ` +
    `${rodante.arriba} fichas del techo`
)

comprueba(!!donde?.marcha, 'con semilla fija no salio ningun convoy en marcha')
comprueba(rodante.avanzo > 4, `el convoy en marcha no llego a rodar (${rodante.avanzo.toFixed(1)} m)`)
comprueba(rodante.subio > 2.5, `la rampa de un convoy en marcha no recogio al corredor (${rodante.subio.toFixed(2)} m)`)
comprueba(rodante.arriba > 0, 'no se recogio ni una ficha corriendo por el techo de un convoy en marcha')

/* ==================== 3b. VIA DOBLE: DEL TECHO DE UNO AL DE AL LADO ====================

  La mitad de los convoyes salen emparejados con otro en el carril contiguo, y
  eso es lo unico que hace que ahi arriba se pueda ir a algun sitio que no sea
  hacia adelante. Se comprueba lo que promete: que se aborda uno por su rampa y
  que desde su techo se pasa al del vecino SIN TOCAR EL SUELO.

  El salto se decide mirando antes -- se le pregunta al curso si el carril de al
  lado tiene techo seis metros mas alla --, que es lo que hace cualquiera que
  juegue: cruzarse a ciegas justo sobre un hueco es caerse, y eso no seria un
  fallo del juego sino del que salta.
*/
await pagina.close()
pagina = await abre('&seed=987654')

const par = await pagina.evaluate(() => {
  const c = window.__TR.curso
  c.resetCourse()
  c.ensureCourse(6000)
  const cabezas = c.PLATFORMS.filter((p) => p.kind === 'rig' && p.ramp > 0)
  for (const a of cabezas) {
    const b = cabezas.find((x) => x !== a && Math.abs(x.d0 - a.d0) < 0.01 && Math.abs(x.lane - a.lane) === 1)
    if (b) return { d0: Math.round(a.d0), a: a.lane, b: b.lane, h: a.h }
  }
  return null
})

let cruce = { subio: 0, cruzo: 0 }
if (!par) {
  comprueba(false, 'con semilla fija no salio ninguna via doble en 6 km')
} else {
  await pagina.close()
  pagina = await abre(`&seed=987654&skip=${Math.max(1, par.d0 - 30)}`)
  await arranca(pagina, { inmune: true })

  cruce = await pagina.evaluate(async (info) => {
    const c = window.__TR.curso
    const LANES = window.__TR.constantes.LANES
    const rt = window.__rt
    const espera = (ms) => new Promise((r) => setTimeout(r, ms))
    let subio = 0
    let cruzo = 0
    let destino = info.a
    for (let i = 0; i < 700; i++) {
      rt.targetLane = destino
      await espera(40)
      if (rt.deck <= info.h - 0.35) {
        if (subio > 0) break // se acabo el convoy (o se cayo de el)
        continue
      }
      subio = Math.max(subio, rt.deck)
      // ya plantado sobre el techo al que se iba: si era el del vecino, se
      // cambio de convoy en marcha sin bajarse
      if (Math.abs(LANES[destino] - rt.x) > 0.3) continue
      if (destino === info.b) cruzo++
      const otro = destino === info.a ? info.b : info.a
      // ¿hay techo enfrente dentro de un par de zancadas? Si no, no se salta
      if (c.supportAt(rt.distance + 6, LANES[otro], rt.deck) > info.h - 0.35) destino = otro
    }
    return { subio, cruzo }
  }, par)
}

console.log(`\n--- 3b. Via doble (semilla fija, pareja en ${par ? par.d0 : '?'} m, carriles ${par ? par.a : '?'} y ${par ? par.b : '?'}) ---`)
console.log(`Altura sobre el convoy: ${cruce.subio.toFixed(2)} m | cambios de convoy por arriba: ${cruce.cruzo}`)

comprueba(cruce.subio > 2.5, `no se llego al techo de la via doble (${cruce.subio.toFixed(2)} m)`)
comprueba(cruce.cruzo > 0, 'no se pudo pasar del techo de un convoy al del carril de al lado')

/* ==================== 4. CASCO Y RECORD ====================

  Las dos piezas que no se pueden probar corriendo a lo tonto, porque las dos
  dependen de que pase algo concreto: que te choques llevando casco, y que
  cruces una marca que ya existia en el equipo.

  El record se planta a mano en el localStorage antes de arrancar -- que es
  exactamente lo que habra en la maquina del stand cuando llegue el segundo
  jugador -- y el casco se busca en el curso con la semilla fija, igual que se
  hizo con el convoy.
*/
await pagina.close()
pagina = await abre('&seed=246810')

const casco = await pagina.evaluate(() => {
  const c = window.__TR.curso
  c.resetCourse()
  c.ensureCourse(4000)
  const i = c.COURSE.items.find((x) => x.kind === 'shield')
  return i ? { d: Math.round(i.d), lane: i.lane } : null
})

let prueba = {}
if (!casco) {
  comprueba(false, 'con semilla fija no se genero ningun casco en 4 km')
} else {
  const arranque = Math.max(1, casco.d - 30)
  await pagina.close()
  pagina = await abre(`&seed=246810&skip=${arranque}`)
  // el record que dejo "el jugador anterior": cae poco despues del casco
  await pagina.evaluate((m) => localStorage.setItem('terminal-rally-infinito-record', String(m)), arranque + 55)
  await arranca(pagina, { inmune: true })

  prueba = await pagina.evaluate(async (info) => {
    const { store } = window.__TR
    const rt = window.__rt
    const espera = (ms) => new Promise((r) => setTimeout(r, ms))
    const crashReal = window.__crashReal
    let recogido = false
    for (let i = 0; i < 700 && !recogido; i++) {
      rt.targetLane = info.lane
      await espera(40)
      recogido = store.getState().escudo
    }
    if (!recogido) return { recogido: false }

    // chocar CON casco: no puede acabar la partida
    store.setState({ crash: crashReal })
    store.getState().crash('PRUEBA CON CASCO')
    await espera(150)
    const trasGolpe = { fase: store.getState().phase, escudo: store.getState().escudo, invuln: rt.invuln > 0 }

    // y ahora a cruzar la marca del equipo, otra vez sin estorbos
    store.setState({ crash: () => {} })
    let recordHecho = false
    for (let i = 0; i < 700 && !recordHecho; i++) {
      await espera(40)
      recordHecho = store.getState().recordHecho
    }
    store.setState({ crash: crashReal })
    return { recogido, trasGolpe, recordHecho, record: store.getState().record }
  }, casco)
}

console.log(`\n--- 4. Casco y record (semilla fija, casco en ${casco ? casco.d : '?'} m) ---`)
console.log(`Casco recogido: ${prueba.recogido} | tras el golpe: ${JSON.stringify(prueba.trasGolpe)}`)
console.log(`Record de ${prueba.record} m batido: ${prueba.recordHecho}`)

comprueba(prueba.recogido, 'no se pudo recoger el casco reforzado')
comprueba(prueba.trasGolpe?.fase === 'playing', 'chocar con casco acabo la partida')
comprueba(prueba.trasGolpe?.escudo === false, 'el casco no se gasto al chocar')
comprueba(prueba.trasGolpe?.invuln === true, 'no hubo gracia despues de romperse el casco')
comprueba(prueba.recordHecho, 'cruzar la marca del equipo no conto como record')

/* ==================== 5. IZADO DE GRUA Y RACHA ====================

  Con semilla fija, por lo mismo que el camion y el casco: en la parte viva el
  gancho puede caer detras de un crucero entero y no aparecer en los metros que
  da tiempo a correr sin pantalla.

  Y de paso se comprueba la RACHA aqui y no alla, porque este es el sitio del
  juego donde de verdad se construye: la fila del vuelo va limpia y sin rojas,
  o sea que un izado bien aprovechado tiene que llevar el multiplicador arriba.
*/
await pagina.close()
pagina = await abre('&seed=987654')
const gancho = await pagina.evaluate(() => {
  const c = window.__TR.curso
  c.resetCourse()
  c.ensureCourse(3000)
  const i = c.COURSE.items.find((x) => x.kind === 'lift')
  return i ? { d: Math.round(i.d), lane: i.lane } : null
})

let vuelo = {}
if (!gancho) {
  comprueba(false, 'con semilla fija no se genero ningun gancho de grua en 3 km')
} else {
  await pagina.close()
  pagina = await abre(`&seed=987654&skip=${Math.max(1, gancho.d - 25)}`)
  await arranca(pagina, { inmune: true })

  vuelo = await pagina.evaluate(async (info) => {
    const { store, curso } = window.__TR
    const rt = window.__rt
    const espera = (ms) => new Promise((r) => setTimeout(r, ms))
    let alto = 0
    let volo = false
    let enSuelo = null
    for (let i = 0; i < 900; i++) {
      // ir a por el gancho primero y luego a por cada ficha del aire: es lo que
      // hace un jugador que sabe, y lo que llena la racha
      const d = rt.distance
      const obj =
        (!volo && curso.COURSE.items.find((e) => e.kind === 'lift' && e.d > d + 4 && e.d < d + 80)) ||
        curso.COURSE.items.find((e) => e.kind === 'good' && e.d > d + 5 && e.d < d + 40)
      if (obj) rt.targetLane = obj.lane
      await espera(40)
      if (rt.flying) {
        volo = true
        alto = Math.max(alto, rt.y)
      } else if (volo && enSuelo === null) {
        enSuelo = rt.y
      }
      if (enSuelo !== null && i > 40) break
    }
    return { volo, alto, enSuelo, mult: store.getState().mult, racha: store.getState().mejorRacha }
  }, gancho)
}

console.log(`\n--- 5. Izado de grua (semilla fija, gancho en ${gancho ? gancho.d : '?'} m) ---`)
console.log(
  `Volo: ${vuelo.volo} | altura ${Number(vuelo.alto || 0).toFixed(2)} m | al soltar quedo a ${Number(
    vuelo.enSuelo ?? -1
  ).toFixed(2)} m del suelo | racha ${vuelo.racha} (x${vuelo.mult})`
)

comprueba(vuelo.volo === true, 'el gancho no llego a izar al corredor')
comprueba(vuelo.alto > 4.2, `el izado no llego a subir (${Number(vuelo.alto || 0).toFixed(2)} m)`)
comprueba(vuelo.enSuelo !== null && vuelo.enSuelo < 0.8, 'al soltar el gancho el corredor se quedo colgado')
comprueba(vuelo.mult > 1, `la fila del izado no llego a subir el multiplicador (racha ${vuelo.racha})`)

/* ==================== 6. RAYAS DE VELOCIDAD Y REVANCHA ====================

  Las dos cosas de esta tanda que no se pueden ver corriendo un rato:

  Las RAYAS DE VELOCIDAD no salen hasta pasado un tercio de la rampa de
  velocidad, o sea despues del kilometro, que sin pantalla no se alcanza nunca.
  Se llega con ?skip= y se comprueban las dos mitades de la regla: encendidas
  corriendo deprisa, y apagadas en cuanto la partida deja de correr.

  La REVANCHA es la cadena entera del marcador: la semilla se guarda con la
  marca, la marca se vuelve a correr, y la pista que sale es la misma. Lo que de
  verdad se prueba aqui es lo ultimo -- que dos carreras con la misma semilla
  son la misma carrera --, porque es lo unico que hace comparables dos puntajes
  de una tabla de curso sorteado.
*/
await pagina.close()
pagina = await abre('&skip=2600')
await arranca(pagina, { inmune: true })

const rayas = await pagina.evaluate(async () => {
  const { store } = window.__TR
  const espera = (ms) => new Promise((r) => setTimeout(r, ms))
  const m = window.__scene.getObjectByName('rayas')
  if (!m) return { hay: false }
  await espera(500)
  const brillo = () => {
    const c = m.instanceColor
    let max = 0
    if (c) for (let i = 0; i < c.array.length; i++) max = Math.max(max, c.array[i])
    return max
  }
  const corriendo = { visible: m.visible, brillo: brillo(), v: window.__rt.speed }
  // en pausa la carrera no avanza, asi que no hay velocidad que dibujar
  store.getState().pause()
  await espera(300)
  const parado = m.visible
  store.getState().resume()
  return { hay: true, corriendo, parado, n: m.count }
})

console.log(`\n--- 6. Rayas de velocidad (a ${Number(rayas.corriendo?.v || 0).toFixed(1)} m/s) ---`)
console.log(`Rayas: ${rayas.n} | encendidas: ${rayas.corriendo?.visible} (brillo ${Number(rayas.corriendo?.brillo || 0).toFixed(2)}) | en pausa: ${rayas.parado}`)

comprueba(rayas.hay, 'no se encontro la malla de las rayas de velocidad')
comprueba(rayas.corriendo?.visible === true, 'las rayas no se encendieron a velocidad alta')
comprueba(rayas.corriendo?.brillo > 0.02, 'las rayas estan en la escena pero no pintan nada')
comprueba(rayas.parado === false, 'las rayas se quedaron puestas con la partida parada')

/* ---------- La semilla: misma pista, metro por metro ---------- */
await pagina.close()
pagina = await abre()

const semillas = await pagina.evaluate(() => {
  const { curso } = window.__TR

  // Huella de la pista: donde cae cada obstaculo y cada plataforma. Dos
  // carreras que la comparten son, literalmente, la misma carrera.
  const huella = () => {
    curso.ensureCourse(4000)
    return (
      curso.COURSE.obstacles.slice(0, 150).map((o) => `${o.kind}:${o.d.toFixed(2)}:${o.lane}`).join('|') +
      '#' +
      curso.PLATFORMS.slice(0, 25).map((p) => `${p.kind}:${p.d0.toFixed(2)}:${p.lane}`).join('|')
    )
  }

  curso.resetCourse(4242)
  const a = huella()
  curso.resetCourse(777)
  const otra = huella()
  curso.resetCourse(4242)
  const b = huella()
  return { igual: a === b, distinta: a !== otra }
})

/* ---------- La pantalla final NO pide nombre ----------

  El juego no guarda marcas de nadie, asi que pedir un nombre seria pedirselo
  para nada: en el stand, quien lo escribe se queda esperando a verse en una
  lista que no existe. Se comprueba desde fuera y sobre el DOM de verdad -- que
  no hay campo, ni teclado en pantalla, ni tabla -- porque es exactamente lo que
  el jugador ve, y porque quitarlo del render es lo unico que lo garantiza.
*/
const final = await pagina.evaluate(async () => {
  const espera = (ms) => new Promise((r) => setTimeout(r, ms))
  window.__TR.store.setState({ phase: 'gameover', score: 640, distShown: 815, goods: 12, bads: 1, mejorRacha: 9 })
  await espera(300)
  const q = (sel) => document.querySelectorAll(sel).length
  return {
    campos: q('.panel input'),
    teclas: q('.key'),
    unidades: q('.unit'),
    guardar: [...document.querySelectorAll('.panel button')].filter((b) => /GUARDAR/i.test(b.textContent)).length,
    tabla: q('.board'),
    revancha: q('.preto'),
    botones: [...document.querySelectorAll('.panel button')].map((b) => b.textContent.trim()),
  }
})

console.log(`\n--- 6b. Semilla y pantalla final ---`)
console.log(`Misma semilla, misma pista: ${semillas.igual} | otra semilla, otra pista: ${semillas.distinta}`)
console.log(`Botones de la pantalla final: ${JSON.stringify(final.botones)}`)

comprueba(semillas.igual, 'dos carreras con la misma semilla salieron distintas')
comprueba(semillas.distinta, 'dos semillas distintas dieron la misma pista')
comprueba(final.campos === 0, `la pantalla final sigue pidiendo un nombre (${final.campos} campos)`)
comprueba(final.teclas === 0, `sigue saliendo el teclado en pantalla (${final.teclas} teclas)`)
comprueba(final.unidades === 0, `sigue saliendo el selector de unidad (${final.unidades} botones)`)
comprueba(final.guardar === 0, 'la pantalla final sigue teniendo boton de GUARDAR')
comprueba(final.tabla === 0, 'la pantalla final sigue mostrando la tabla')
comprueba(final.revancha === 0, 'la pantalla final sigue ofreciendo revancha')
comprueba(
  final.botones.length === 1 && /JUGAR OTRA VEZ/i.test(final.botones[0]),
  `la pantalla final tiene que dejar un solo boton: ${JSON.stringify(final.botones)}`
)

console.log(`\nErrores de consola totales: ${errores.length}`)
if (errores.length) console.log(errores.slice(0, 8).join('\n'))
comprueba(errores.length === 0, 'hubo errores de consola')

await navegador.close()

if (fallos) {
  console.error(`\n${fallos} comprobacion(es) fallidas`)
  process.exit(1)
}
console.log('\nOK')
