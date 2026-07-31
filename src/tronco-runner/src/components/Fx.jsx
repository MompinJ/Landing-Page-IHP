import { EffectComposer, Bloom, N8AO, ToneMapping, SMAA, HueSaturation } from '@react-three/postprocessing'
import { ToneMappingMode } from 'postprocessing'
import { QUALITY } from '../quality'

// Cadena de postproceso. El orden importa y es el de una camara de verdad:
// oclusion ambiental sobre la imagen lineal -> destello de las luces -> curva
// filmica al final.
//
// El tone mapping va AQUI y no en el material: al dibujar dentro de un render
// target three desactiva su tonemapping de shader, asi que sin esta pasada la
// imagen sale cruda y quemada. Por eso mismo el bloom trabaja todavia en HDR,
// que es lo que hace que el sol y las balizas florezcan en vez de recortarse.
export function Fx() {
  if (!QUALITY.bloom && !QUALITY.ao) return null

  return (
    <EffectComposer multisampling={QUALITY.ao ? 4 : 2} enableNormalPass={QUALITY.ao}>
      {QUALITY.ao ? (
        // La oclusion ambiental es lo que le quita el aire de maqueta a un
        // escenario hecho de cajas: sin ella todo apoya sobre el suelo sin
        // tocarlo. Se usa N8AO y no el SSAO clasico porque este trabaja en
        // metros de mundo (radio 1.1 m: cantos de contenedor, patas de grua,
        // travesanos de andamio) y trae su propio filtro de ruido; el SSAO de
        // la libreria dejaba el granulado de sal y pimienta sobre los silos.
        <N8AO
          halfRes
          aoRadius={1.1}
          distanceFalloff={0.9}
          intensity={2.6}
          aoSamples={16}
          denoiseSamples={8}
          denoiseRadius={12}
          color="#0b1526"
        />
      ) : (
        <></>
      )}
      {QUALITY.bloom ? (
        // Umbral alto: solo florecen el sol, los reflejos especulares y las
        // luces, no las chapas claras. Con umbral bajo el patio entero brilla y
        // se pierde el contraste que acaban de dar las sombras.
        <Bloom mipmapBlur intensity={0.55} luminanceThreshold={0.82} luminanceSmoothing={0.25} radius={0.72} />
      ) : (
        <></>
      )}
      {/* medio punto de saturacion: el atardecer del panorama pide color, y la
          curva filmica se lo come si no se compensa */}
      <HueSaturation saturation={0.08} />
      <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
      <SMAA />
    </EffectComposer>
  )
}
