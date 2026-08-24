import { Bloom, EffectComposer, Vignette } from '@react-three/postprocessing';
import { useFrame } from '@react-three/fiber';
import { BlendFunction, ChromaticAberrationEffect, ScanlineEffect } from 'postprocessing';
import { useMemo } from 'react';
import * as THREE from 'three';
import { QUALITY } from '../render/quality';
import { runtime } from '../store/runtime';

/**
 * FASE 1 — Pipeline compositivo del juego (VFX de post-procesado).
 *
 * - Bloom selectivo: umbral de luminancia alto → solo irradian los emisivos
 *   toneMapped:false (neón verde/rojo de tarjetas, balizas, luces de trabajo),
 *   sin lavar la escena.
 * - Impacto = ABERRACIÓN CROMÁTICA + SCANLINE digital: ambos siguen la
 *   envolvente de `runtime.shakeTimer` (se dispara en golpes/tarjetas rojas/
 *   caídas al agua y decae sola), mutando los uniforms por frame.
 *
 * Nota de implementación: los efectos animados se instancian a mano y se
 * montan como <primitive> — los wrappers de @react-three/postprocessing
 * serializan props con JSON.stringify y en React 19 el `ref` (cíclico) viaja
 * en las props → crash "cannot serialize cyclic structures".
 */
const ABERRATION_MAX = 0.0035;
const SCANLINE_MAX = 0.28;

/**
 * LA CADENA ENTERA ES OPCIONAL y por defecto NO se monta (ver
 * `render/quality.ts`). Era la factura más cara del juego con diferencia:
 * cuatro pasadas a pantalla completa sobre un render target multimuestreado a
 * 4, corriendo SIEMPRE — la aberración y el scanline se quedaban con la
 * opacidad a 0 cuando no había daño, pero la pasada se pagaba igual, porque lo
 * que cuesta es recorrer todos los píxeles, no el valor del uniform.
 *
 * Sin cadena, `<Canvas>` pinta directo a pantalla con el MSAA del contexto y el
 * mapeo filmico ACES del propio renderer, que sale gratis. Lo que se pierde es
 * el halo del bloom y el glitch del golpe; lo que NO se pierde es la lectura
 * del juego: las tarjetas van con `toneMapped: false` (neón a color pleno sin
 * necesidad de halo) y el golpe sigue avisando con el flash rojo del HUD y el
 * temblor de cámara.
 *
 * Se carga en DIFERIDO (`lazy` en `Game.tsx`) y no solo se apaga: así
 * `postprocessing` y `@react-three/postprocessing` salen del paquete principal
 * y NO se descargan siquiera en los niveles que no los usan — que son los que
 * juega casi todo el mundo. En una conexión de stand eso es medio megabyte
 * menos antes de ver la portada.
 */
export default function FxChain() {
  const aberrationEffect = useMemo(
    () =>
      new ChromaticAberrationEffect({
        offset: new THREE.Vector2(0, 0),
        radialModulation: true,
        modulationOffset: 0.4,
      }),
    [],
  );
  const scanlineEffect = useMemo(() => {
    const effect = new ScanlineEffect({ blendFunction: BlendFunction.OVERLAY, density: 1.4 });
    effect.blendMode.opacity.value = 0;
    return effect;
  }, []);

  useFrame(() => {
    // Envolvente del daño (0..1) con caída cuadrática
    const k = Math.min(1, runtime.shakeTimer / 0.35);
    const eased = k * k;
    aberrationEffect.offset.set(ABERRATION_MAX * eased, ABERRATION_MAX * 0.6 * eased);
    scanlineEffect.blendMode.opacity.value = SCANLINE_MAX * eased;
  });

  return (
    // multisampling 4 (el defecto es 8): el composer trabaja a la resolución
    // del canvas por el dpr, así que a 2× en una pantalla retina cada muestra
    // extra cuesta ancho de banda real. A 4 no se aprecia diferencia en aristas
    // de cajas y el relleno baja a la mitad.
    <EffectComposer multisampling={QUALITY.multisampling}>
      {QUALITY.bloom ? (
        <Bloom mipmapBlur intensity={0.8} luminanceThreshold={0.5} luminanceSmoothing={0.2} />
      ) : (
        <></>
      )}
      <primitive object={aberrationEffect} />
      <primitive object={scanlineEffect} />
      <Vignette offset={0.25} darkness={0.45} />
    </EffectComposer>
  );
}
