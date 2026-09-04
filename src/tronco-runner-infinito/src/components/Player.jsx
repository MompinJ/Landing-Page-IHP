import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGame } from '../store'
import { runtime } from '../runtime'
import {
  supportAt,
  platformUnder,
  ceilingAt,
  inSeaAt,
  deckAt,
  flyHeightAt,
  rampAngle,
  rodado,
  SEA_FLOOR,
  SEA_LEVEL,
} from '../course'
import { sfx } from '../audio'
import { QUALITY } from '../quality'
import { approach, smoothDamp } from '../smooth'
import {
  LANES,
  PLAYER_Z,
  COLORS,
  FLY_LEN,
  JUMP_V,
  GRAVITY,
  SLIDE_FALL,
  SLIDE_TIME,
  SLIDE_COOLDOWN,
  ROLL_PIVOT,
  ROLL_HALF_WIDTH,
} from '../constants'

const SKIN = '#e8b98c'
const NAVY = '#0a3a8c'
const NAVY_DARK = '#122a52'

export function Player() {
  const group = useRef()
  const body = useRef()
  const legL = useRef()
  const legR = useRef()
  const armL = useRef()
  const armR = useRef()
  const shadow = useRef()
  const roll = useRef()
  const splash = useRef()
  // estado entre frames: si venia mojado y sobre que andamio venia
  const wasWet = useRef(false)
  const wasOn = useRef(null)
  const paid = useRef({ p: null, d: 0 })
  // velocidad lateral del cuerpo colgado y el balanceo que sale de ella
  const swingV = useRef({ v: 0 })
  const swing = useRef(0)
  const burbuja = useRef()
  // cuanto se echa el cuerpo contra la cuesta de una rampa, amortiguado, y si
  // el cuadro anterior ya venia pisandola (para que el golpe suene una vez)
  const cuesta = useRef(0)
  const enRampa = useRef(false)

  useFrame((state, dt0) => {
    const dt = Math.min(dt0, 0.05)
    const phase = useGame.getState().phase
    const active = phase === 'playing'
    // Pendiente que se esta subiendo en ESTE cuadro. Se declara aqui, fuera de
    // los dos caminos, porque la parte de animacion de mas abajo corre siempre:
    // asi, en cuanto se deja de subir vuelve sola a cero sin acordarse de nada.
    let subida = 0

    // IZADO DE GRUA. Mientras el cabestrante tira, la altura la manda la curva
    // del vuelo y no la gravedad: la fisica de salto, rodada, techos y suelo se
    // queda entera fuera, porque colgado de un cable no hay ninguna de esas
    // cosas. Lo unico que sigue vivo es el carril, que es con lo que se va a
    // buscar los valores de arriba.
    if (active && runtime.flying) {
      // COLGADO NO SE CORRE DE LADO: SE BALANCEA.
      //
      // Corriendo, el carril se cambia con una persecucion rapida y seca, que
      // es lo que hace que se sienta con los pies en el suelo. Colgado de un
      // cable eso mismo se lee como si el muneco flotara: un cuerpo suspendido
      // ACELERA y SE PASA de largo antes de asentarse. El amortiguador lo da
      // gratis, y su propia velocidad (swingV) es de donde sale la inclinacion,
      // asi que el balanceo nace y muere con el movimiento en vez de aparecer
      // al pulsar y quedarse puesto. Es el mismo truco que el alabeo de la
      // camara al cambiar de carril.
      runtime.x = smoothDamp(runtime.x, LANES[runtime.targetLane], swingV.current, 0.42, dt)
      runtime.slide = 0
      runtime.slideCd = 0
      runtime.jumpBuf = 0
      runtime.slideBuf = 0
      runtime.vy = 0
      const suelo = deckAt(runtime.distance)
      runtime.deck = suelo
      runtime.y = Math.max(0, flyHeightAt(runtime.distance, runtime.flyFrom) - suelo)
      runtime.wet = false
      wasWet.current = false
      // el vuelo se acaba por metros, no por segundos: al llegar al final de la
      // curva el corredor ya esta posado y solo hay que soltarlo
      if (runtime.distance - runtime.flyFrom >= FLY_LEN) {
        runtime.flying = false
        runtime.y = 0
      }
    } else if (active) {
      // El desplazamiento de carril tambien va en tiempo real y no por cuadro:
      // con la forma antigua, a 30 fps el corredor cruzaba el carril de dos
      // zancadas de golpe, y esa era la mitad de la sensacion de tiron.
      runtime.x = approach(runtime.x, LANES[runtime.targetLane], 13, dt)
      const grounded = runtime.y <= 0.001

      if (runtime.slideCd > 0) runtime.slideCd = Math.max(0, runtime.slideCd - dt)

      if (runtime.jumpBuf > 0) {
        runtime.jumpBuf = Math.max(0, runtime.jumpBuf - dt)
        if (grounded) {
          runtime.vy = JUMP_V
          runtime.jumpBuf = 0
          if (runtime.slide > 0) {
            // saltar corta la rodada, pero cuenta como rodada gastada
            runtime.slide = 0
            runtime.slideCd = SLIDE_COOLDOWN
          }
          sfx.jump()
        }
      }

      // El buffer de rodada no caduca en el aire: pulsar abajo mientras saltas
      // te tira al suelo de golpe y la voltereta arranca al tocarlo.
      if (runtime.slideBuf > 0) {
        if (!grounded) {
          runtime.vy = Math.min(runtime.vy, -SLIDE_FALL)
        } else if (runtime.slide <= 0 && runtime.slideCd <= 0) {
          runtime.slideBuf = 0
          runtime.slide = SLIDE_TIME
          sfx.slide()
        } else {
          // rodando o levantandose: la pulsacion se descarta en vez de
          // encadenar otra vuelta, si no se queda hecho bola indefinidamente
          runtime.slideBuf = Math.max(0, runtime.slideBuf - dt)
        }
      }

      if (runtime.slide > 0) {
        runtime.slide = Math.max(0, runtime.slide - dt)
        if (runtime.slide === 0) runtime.slideCd = SLIDE_COOLDOWN
      }

      // Vertical en coordenadas absolutas. Hace falta porque el suelo ya no es
      // una funcion solo de la distancia: en el astillero hay andamios que
      // ocupan un carril, asi que el soporte depende de por donde vas y de a
      // que altura vas. runtime.y se sigue publicando como altura SOBRE el
      // soporte, que es lo que miran las holguras de los obstaculos.
      let gy = runtime.deck + runtime.y
      const gy0 = gy // altura al empezar el frame, para saber de donde se venia
      const support = supportAt(runtime.distance, runtime.x, gy)
      gy += runtime.vy * dt
      runtime.vy -= GRAVITY * dt
      if (gy <= support && runtime.vy <= 0) {
        gy = support
        runtime.vy = 0
      }
      // Techo: por debajo de un tablero de andamio no se puede saltar a traves
      // de el. El tope solo se aplica si se va POR DEBAJO; si el suelo es el
      // propio tablero, no hay techo ninguno.
      const ceil = ceilingAt(runtime.distance, runtime.x)
      const roof = ceil - 1.9 // hasta donde llega la cabeza del corredor
      if (support < ceil - 0.5 && gy > roof) {
        // Se recorta solo si en este frame se venia de DEBAJO del techo: eso es
        // chocar contra el. Si ya se entro bajo el tablero volando por encima,
        // solo se corta la subida, porque un tiron hacia abajo se lee mucho peor
        // que un cuadro con la cabeza asomando. Mirar de donde se venia y no
        // cuanto se ha pasado hace que no dependa de los fps.
        if (gy0 <= roof + 0.05) gy = roof
        if (runtime.vy > 0) runtime.vy = 0
      }

      runtime.deck = support
      runtime.y = Math.max(0, gy - support)

      // Caida al mar. Se cobra UNA vez por remojon, al entrar: dentro del agua
      // se sigue corriendo con el agua por las rodillas hasta trepar a la
      // lancha siguiente, que sostiene siempre a quien va por su carril. Antes
      // el agua era un obstaculo que ademas cambiaba de carril al jugador solo,
      // y eso no habia forma de entenderlo desde fuera.
      //
      // La condicion son LOS PIES BAJO EL AGUA, no "el suelo de aqui es el fondo
      // del mar": mientras se salta de lancha a lancha el suelo de abajo es el
      // mar todo el vuelo, asi que con la otra condicion cada salto bien hecho
      // cantaba caida al agua sin que el corredor la tocara.
      const wet = inSeaAt(runtime.distance) && gy < SEA_LEVEL - 0.05
      if (wet && !wasWet.current) {
        useGame.getState().crash('CAIDA AL MAR')
        sfx.bad()
        runtime.shake = 0.5
        runtime.stagger = 0.35
      }
      wasWet.current = wet
      runtime.wet = wet

      // Bono por cadena completa, valga para andamios o para camiones: se paga
      // al salir por el canto del ultimo tablero o del ultimo techo, o sea al
      // haber aguantado arriba todos los saltos. Es lo que sustituye a las
      // fichas que antes iban encima y tapaban la vista justo donde hay que
      // aterrizar; cuanto paga y como se llama lo trae cada plataforma.
      const ride = platformUnder(runtime.distance, runtime.x, gy)
      const prev = wasOn.current

      // LA RAMPA SE PISA Y SE SUBE, Y HASTA AHORA NO SE NOTABA NI UNA COSA NI
      // LA OTRA: el suelo cambiaba de altura y el corredor seguia vertical y en
      // silencio. Son los dos unicos avisos que caben en los tres decimos de
      // segundo que dura subir siete metros a veinte metros por segundo:
      //
      //   el golpe metalico -- una plancha de acero bajo unas botas -- que dice
      //   QUE se acaba de pisar, y
      //   la inclinacion contra la cuesta, que dice que se esta SUBIENDO.
      //
      // Se echa ADELANTE y no hacia atras: un camion se tumba sobre la rampa
      // porque va sobre ruedas, pero una persona la ataca. Sale del angulo real
      // de la rampa (la calcula el curso, que es de quien es la forma), asi que
      // la del camion -- mas corta y mas alta -- se nota mas empinada que la
      // escalera del andamio, que es exactamente lo que son.
      //
      // La condicion son LOS PIES SOBRE LA CHAPA, no "voy por el carril de la
      // rampa": la rampa recoge a cualquiera que pase por su carril venga a la
      // altura que venga (ver platformUnder), asi que con lo segundo el golpe
      // sonaba tambien al saltar por encima de ella. Y como se mira el pisar y
      // no la pieza, cae igual de bien si se aterriza a media rampa.
      if (ride && runtime.y <= 0.2) subida = rampAngle(ride, runtime.distance)
      const yaPagado = paid.current.p === prev && Math.abs(runtime.distance - paid.current.d) < 60
      // el bono se paga al salir por el canto del ultimo, y en un convoy en
      // marcha ese canto no esta en el metro donde nacio: hay que preguntar en
      // metros de la plataforma
      const salida = prev ? runtime.distance - rodado(prev, runtime.distance) : 0
      if (prev && ride !== prev && prev.last && salida > prev.end - 1 && !yaPagado) {
        // el margen de 60 m es para no cobrar dos veces si el corredor sale y
        // vuelve a entrar en el ultimo metro (basta con rozar el limite del
        // carril), pero si permitir el cobro en la partida siguiente
        paid.current = { p: prev, d: runtime.distance }
        useGame.getState().bonus(prev.bonusLabel, prev.bonus)
        sfx.good()
      }
      wasOn.current = ride
    }

    const t = state.clock.elapsedTime
    const running = active || phase === 'countdown' || phase === 'intro' || phase === 'gameover'
    // colgado del gancho las piernas no corren: cuelgan
    const colgado = runtime.flying
    // Inclinacion del pendulo. El objetivo sale de la velocidad lateral, no de
    // lo que falta para llegar: asi el cuerpo se va hacia donde arranca y se
    // endereza solo al frenar. Suelta, vuelve a cero y deja de estorbar.
    const quiere = colgado ? Math.max(-0.45, Math.min(0.45, -swingV.current.v * 0.085)) : 0
    swing.current = approach(swing.current, quiere, colgado ? 7 : 12, dt)
    const freq = 13
    const sw = running ? Math.sin(t * freq) : Math.sin(t * 3) * 0.3
    const bob = runtime.y > 0 ? 0 : Math.abs(Math.sin(t * freq)) * 0.09

    // tambaleo tras chocar: el cuerpo se va hacia atras y vuelve. Sin esto el
    // choque solo se sentia en la camara y el jugador no entendia que fue suyo
    if (runtime.stagger > 0) runtime.stagger = Math.max(0, runtime.stagger - dt)
    const stag = runtime.stagger / 0.5

    // Rodada. rp va de 0 a 1 durante la voltereta; tuck es cuanto esta hecho
    // ovillo, con entrada y salida rapidas (el x1.7 aplana la meseta) para que
    // enganche con la carrera sin tirones en los extremos.
    const rp = runtime.slide > 0 ? 1 - runtime.slide / SLIDE_TIME : 0
    const tuck = runtime.slide > 0 ? Math.min(1, Math.sin(Math.PI * rp) * 1.7) : 0

    if (!group.current) return
    group.current.position.set(runtime.x, runtime.deck + runtime.y + bob * (1 - tuck), PLAYER_Z)
    group.current.rotation.z =
      (LANES[runtime.targetLane] - runtime.x) * -0.06 + Math.sin(t * 26) * 0.18 * stag + swing.current

    // La voltereta gira alrededor del centro del cuerpo y encoge hacia el: si
    // girara sobre los pies la cabeza describiria un arco de metro y medio y
    // saldria disparada fuera del carril.
    if (roll.current) {
      const s = 1 - 0.3 * tuck
      const th = -Math.PI * 2 * (rp * rp * (3 - 2 * rp))
      roll.current.scale.setScalar(s)
      roll.current.rotation.x = th
      // El pivote baja segun lo tumbado que este el cuerpo. Con altura fija se
      // quedaba a media altura justo cuando el corredor esta horizontal y se
      // veia flotando medio metro sobre su propia sombra: el radio de un
      // elipsoide de medio eje ROLL_PIVOT por ROLL_HALF_WIDTH lo resuelve.
      roll.current.position.y =
        s * Math.hypot(ROLL_PIVOT * Math.cos(th), ROLL_HALF_WIDTH * Math.sin(th))
    }

    // inclinacion de carrera hacia adelante, mas marcada en el aire y mas
    // todavia subiendo una rampa. La cuesta se amortigua aparte y rapido (se
    // entra y se sale de ella en un palmo de metros), y va fuera del parentesis
    // del ovillo: rodando por la rampa el cuerpo tambien sube, y enderezarlo
    // ahi dejaba la voltereta flotando de lado sobre la chapa.
    // El golpe se resuelve aqui, en la parte que corre SIEMPRE, y no dentro del
    // camino de partida: quien se estrella subiendo una rampa dejaba el estado
    // puesto, y en la carrera siguiente la primera rampa entraba muda.
    if (subida > 0 && !enRampa.current) sfx.rampa()
    enRampa.current = subida > 0
    cuesta.current = approach(cuesta.current, subida * 0.55, 11, dt)
    body.current.rotation.x =
      ((running ? -0.14 - (runtime.y > 0 ? 0.18 : 0) : 0) + stag * 0.5) * (1 - tuck) - cuesta.current

    legL.current.rotation.x = sw * 0.9
    legR.current.rotation.x = -sw * 0.9
    armL.current.rotation.x = -sw * 0.8
    armR.current.rotation.x = sw * 0.8
    if (runtime.y > 0) {
      legL.current.rotation.x = 0.7
      legR.current.rotation.x = -0.5
      armL.current.rotation.x = -1.1
      armR.current.rotation.x = -0.9
    }
    // Burbuja del casco reforzado. Es la misma que envuelve al recogible: lo
    // que se ve en pista y lo que se lleva puesto tienen que ser la misma cosa,
    // o nadie relaciona una con otra. Parpadea mientras dura la gracia
    // posterior al golpe, que es cuando el jugador necesita saber que sigue
    // siendo intocable.
    if (burbuja.current) {
      burbuja.current.visible = runtime.shield || runtime.invuln > 0
      if (burbuja.current.visible) {
        const parpadeo = runtime.invuln > 0 ? 0.35 + Math.abs(Math.sin(t * 22)) * 0.4 : 0.2
        burbuja.current.material.opacity = parpadeo
        burbuja.current.scale.setScalar(1 + Math.sin(t * 3) * 0.04)
      }
    }

    if (colgado) {
      // brazos arriba agarrados al gancho y piernas sueltas balanceandose: es
      // la silueta que dice "me estan izando" sin tener que explicarlo
      const osc = Math.sin(t * 2.4) * 0.16
      legL.current.rotation.x = 0.18 + osc
      legR.current.rotation.x = 0.05 - osc
      armL.current.rotation.x = -2.7
      armR.current.rotation.x = -2.7
    }
    if (tuck > 0.02) {
      // rodillas al pecho y brazos abrazandolas: cuanto mas cerrado el ovillo,
      // menos sobresale nada de la silueta que gira
      legL.current.rotation.x = -2.1 * tuck
      legR.current.rotation.x = -1.95 * tuck
      armL.current.rotation.x = -1.8 * tuck
      armR.current.rotation.x = -1.8 * tuck
    }

    // sombra de contacto: encoge y se desvanece al saltar
    if (shadow.current) {
      const k = Math.max(0.25, 1 - runtime.y * 0.55)
      shadow.current.scale.set(k, k, k * (1 + tuck * 0.3))
      // Con sombra de sol la mancha se queda solo como referencia de aterrizaje
      // (en un runner hace falta saber sobre que carril se va a caer), asi que
      // baja a la mitad: sumada a la sombra real quedaba una mancha negra doble.
      shadow.current.material.opacity = runtime.wet ? 0 : (QUALITY.shadows ? 0.18 : 0.35) * k
      shadow.current.position.set(runtime.x, runtime.deck + 0.01, PLAYER_Z)
    }

    // Espuma alrededor de los pies mientras se va por el agua. Sin ella, correr
    // con el agua por las rodillas se lee igual que correr sobre el mar, que es
    // exactamente la confusion que se queria quitar.
    if (splash.current) {
      const on = active && runtime.wet && runtime.y < 0.25
      splash.current.visible = on
      if (on) {
        const k = 1 + Math.sin(t * 18) * 0.14
        splash.current.scale.set(k, k, 1)
      }
    }
  })

  return (
    <>
      <mesh ref={shadow} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, PLAYER_Z]} userData={{ noShadow: true }}>
        <circleGeometry args={[0.42, 20]} />
        <meshBasicMaterial color="#000000" transparent opacity={0.35} />
      </mesh>
      <group ref={group}>
        {/* Espuma alrededor de las piernas al ir por el agua. Va dentro del
            grupo del corredor para seguir su carril sin recalcular nada
            (mojado, el suelo es siempre SEA_FLOOR), y un palmo POR ENCIMA de la
            lamina: a ras del mar desaparecia, porque el disco de agua mide 200 m
            de radio y a esa escala la profundidad no distingue diez centimetros. */}
        <mesh
          ref={splash}
          rotation={[-Math.PI / 2, 0, 0]}
          position={[0, SEA_LEVEL - SEA_FLOOR + 0.25, 0]}
          userData={{ noShadow: true }}
        >
          <ringGeometry args={[0.38, 0.92, 20]} />
          <meshBasicMaterial color="#dff3ff" transparent opacity={0.8} />
        </mesh>
        {/* Burbuja del casco reforzado: fuera del pivote de la voltereta, para
            que no gire con el cuerpo al rodar. */}
        <mesh ref={burbuja} position={[0, 0.95, 0]} visible={false} userData={{ noShadow: true, noDress: true }}>
          <sphereGeometry args={[1.05, 20, 16]} />
          <meshStandardMaterial
            color={COLORS.sky}
            emissive={COLORS.sky}
            emissiveIntensity={0.8}
            transparent
            opacity={0.2}
            roughness={0.2}
            depthWrite={false}
          />
        </mesh>
        {/* Pivote de la voltereta. El cuerpo cuelga de el desplazado hacia
            abajo la misma cantidad, asi que en reposo la pose queda intacta. */}
        <group ref={roll} position={[0, ROLL_PIVOT, 0]}>
          <group ref={body} position={[0, -ROLL_PIVOT, 0]}>
            {/* torso: overol azul marino redondeado */}
            <mesh position={[0, 1.02, 0]}>
              <capsuleGeometry args={[0.27, 0.42, 6, 14]} />
              <meshStandardMaterial color={NAVY} roughness={0.92} />
            </mesh>
            {/* chaleco de seguridad con franjas reflejantes */}
            <mesh position={[0, 1.1, 0]}>
              <capsuleGeometry args={[0.29, 0.26, 6, 14]} />
              <meshStandardMaterial color="#ff8c1a" roughness={0.82} />
            </mesh>
            <mesh position={[0, 1.18, 0]}>
              <cylinderGeometry args={[0.305, 0.305, 0.07, 16]} />
              <meshStandardMaterial color="#d9dfe4" emissive="#aebfca" emissiveIntensity={0.55} roughness={0.28} metalness={0.15} />
            </mesh>
            <mesh position={[0, 1.0, 0]}>
              <cylinderGeometry args={[0.3, 0.3, 0.07, 16]} />
              <meshStandardMaterial color="#d9dfe4" emissive="#aebfca" emissiveIntensity={0.55} roughness={0.28} metalness={0.15} />
            </mesh>
            {/* cabeza con cara */}
            <mesh position={[0, 1.62, 0]}>
              <sphereGeometry args={[0.2, 18, 18]} />
              <meshStandardMaterial color={SKIN} roughness={0.6} />
            </mesh>
            <mesh position={[-0.075, 1.65, -0.155]}>
              <sphereGeometry args={[0.028, 8, 8]} />
              <meshStandardMaterial color="#1c1c22" />
            </mesh>
            <mesh position={[0.075, 1.65, -0.155]}>
              <sphereGeometry args={[0.028, 8, 8]} />
              <meshStandardMaterial color="#1c1c22" />
            </mesh>
            {/* Casco blanco con visera y lampara. Lleva barniz (clearcoat): un
                casco es plastico brillante sobre pintura mate, y esa capa es lo
                que le pone la lengua de sol encima que se ve en cualquier foto
                de obra. Sin ella el casco se lee como yeso. */}
            <mesh position={[0, 1.73, 0]}>
              <sphereGeometry args={[0.225, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
              <meshPhysicalMaterial color="#f4f6f8" roughness={0.5} clearcoat={1} clearcoatRoughness={0.12} />
            </mesh>
            <mesh position={[0, 1.72, -0.05]}>
              <cylinderGeometry args={[0.265, 0.265, 0.035, 24]} />
              <meshPhysicalMaterial color="#f4f6f8" roughness={0.5} clearcoat={1} clearcoatRoughness={0.12} />
            </mesh>
            <mesh position={[0, 1.79, -0.2]}>
              <boxGeometry args={[0.08, 0.06, 0.05]} />
              <meshStandardMaterial color={COLORS.amber} emissive={COLORS.amber} emissiveIntensity={1.6} />
            </mesh>
            {/* brazos */}
            <group ref={armL} position={[-0.36, 1.3, 0]}>
              <mesh position={[0, -0.24, 0]}>
                <capsuleGeometry args={[0.085, 0.34, 4, 10]} />
                <meshStandardMaterial color={NAVY} roughness={0.92} />
              </mesh>
              <mesh position={[0, -0.48, 0]}>
                <sphereGeometry args={[0.085, 10, 10]} />
                <meshStandardMaterial color="#e0b32e" roughness={0.88} />
              </mesh>
            </group>
            <group ref={armR} position={[0.36, 1.3, 0]}>
              <mesh position={[0, -0.24, 0]}>
                <capsuleGeometry args={[0.085, 0.34, 4, 10]} />
                <meshStandardMaterial color={NAVY} roughness={0.92} />
              </mesh>
              <mesh position={[0, -0.48, 0]}>
                <sphereGeometry args={[0.085, 10, 10]} />
                <meshStandardMaterial color="#e0b32e" roughness={0.88} />
              </mesh>
            </group>
            {/* piernas y botas */}
            <group ref={legL} position={[-0.14, 0.72, 0]}>
              <mesh position={[0, -0.3, 0]}>
                <capsuleGeometry args={[0.095, 0.42, 4, 10]} />
                <meshStandardMaterial color={NAVY_DARK} roughness={0.94} />
              </mesh>
              <mesh position={[0, -0.62, -0.05]}>
                <boxGeometry args={[0.17, 0.12, 0.3]} />
                <meshStandardMaterial color="#2c2c34" roughness={0.42} />
              </mesh>
            </group>
            <group ref={legR} position={[0.14, 0.72, 0]}>
              <mesh position={[0, -0.3, 0]}>
                <capsuleGeometry args={[0.095, 0.42, 4, 10]} />
                <meshStandardMaterial color={NAVY_DARK} roughness={0.94} />
              </mesh>
              <mesh position={[0, -0.62, -0.05]}>
                <boxGeometry args={[0.17, 0.12, 0.3]} />
                <meshStandardMaterial color="#2c2c34" roughness={0.42} />
              </mesh>
            </group>
          </group>
        </group>
      </group>
    </>
  )
}
