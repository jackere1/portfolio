"use client"

import { forwardRef, useMemo, useRef } from "react"
import { useFrame } from "@react-three/fiber"
import {
  EffectComposer,
  Bloom,
  ToneMapping,
  Noise,
  Vignette,
} from "@react-three/postprocessing"
import {
  BlendFunction,
  Effect,
  ToneMappingMode,
} from "postprocessing"
import * as THREE from "three"
import { journey } from "@/hooks/use-journey"
import { createSunState, writeSunState } from "@/lib/sun-arc"
import type { QualityConfig } from "@/hooks/use-gpu-tier"

// Pass order matters, and it is not the obvious one.
//
//   render (linear HDR) -> EXPOSURE -> bloom -> AgX -> grain -> vignette
//
// Exposure must come BEFORE bloom. Bloom thresholds at a luminance of 1.0, and
// if the exposure ramp is applied afterwards then that threshold drifts against
// the image for the whole journey — bright at the surface, inert by the time it
// is supposed to be picking up a stove. Bloom is a convolution effect, so it
// takes its own pass, which means an effect placed before it genuinely runs
// first rather than being merged into the same shader.
//
// AgX, not ACES. ACES skews deep blues toward purple, and this site is a navy
// sky for two thirds of its length.

const EXPOSURE_FRAG = /* glsl */ `
  uniform float exposure;
  void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
    outputColor = vec4(inputColor.rgb * exposure, inputColor.a);
  }
`

class ExposureEffectImpl extends Effect {
  constructor() {
    super("ExposureEffect", EXPOSURE_FRAG, {
      blendFunction: BlendFunction.SRC,
      uniforms: new Map([["exposure", new THREE.Uniform(1.0)]]),
    })
  }

  setExposure(v: number) {
    const u = this.uniforms.get("exposure")
    if (u) u.value = v
  }
}

const ExposureEffect = forwardRef<ExposureEffectImpl>(function ExposureEffect(
  _props,
  ref
) {
  const effect = useMemo(() => new ExposureEffectImpl(), [])
  const sun = useMemo(() => createSunState(), [])

  useFrame(() => {
    writeSunState(sun, journey.t)
    effect.setExposure(sun.exposure)
  })

  return <primitive ref={ref} object={effect} dispose={null} />
})

export function PostProcessing({ quality }: { quality: QualityConfig }) {
  // Never pass a ref to <Bloom>: @react-three/postprocessing memoises effect
  // args with JSON.stringify(props), and in React 19 a ref object serialises
  // into a circular structure and throws. Hard-won; do not "tidy" it away.
  const grainRef = useRef(null)

  if (!quality.bloomEnabled) {
    return (
      <EffectComposer multisampling={0} frameBufferType={THREE.HalfFloatType}>
        <ExposureEffect />
        <ToneMapping mode={ToneMappingMode.AGX} />
      </EffectComposer>
    )
  }

  return (
    <EffectComposer multisampling={0} frameBufferType={THREE.HalfFloatType}>
      <ExposureEffect />

      <Bloom
        // Threshold 1.0 is naturally selective once exposure runs first: only
        // sources authored above unity — the sun, a stove, a door seam — bloom.
        luminanceThreshold={1.0}
        luminanceSmoothing={0.25}
        intensity={0.62}
        mipmapBlur
      />

      <ToneMapping mode={ToneMappingMode.AGX} />

      {/* Grain is not a look here, it is a fix: a Bortle-1 sky gradient bands
          badly on 8-bit output, and a little noise is what breaks it up. */}
      <Noise
        ref={grainRef}
        premultiply
        blendFunction={BlendFunction.OVERLAY}
        opacity={0.042}
      />

      {quality.vignette ? (
        <Vignette offset={0.26} darkness={0.42} blendFunction={BlendFunction.NORMAL} />
      ) : (
        <></>
      )}
    </EffectComposer>
  )
}
