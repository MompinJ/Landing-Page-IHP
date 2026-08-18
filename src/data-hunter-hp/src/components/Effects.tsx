import { Bloom, EffectComposer, Vignette } from '@react-three/postprocessing';
import { useFrame } from '@react-three/fiber';
import { BlendFunction, ChromaticAberrationEffect, ScanlineEffect } from 'postprocessing';
import { useMemo } from 'react';
import * as THREE from 'three';
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

export function Effects() {
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
    <EffectComposer multisampling={4}>
      <Bloom mipmapBlur intensity={0.8} luminanceThreshold={0.5} luminanceSmoothing={0.2} />
      <primitive object={aberrationEffect} />
      <primitive object={scanlineEffect} />
      <Vignette offset={0.25} darkness={0.45} />
    </EffectComposer>
  );
}
