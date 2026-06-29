"use client"

import {
  EffectComposer,
  Bloom,
  Vignette,
} from "@react-three/postprocessing"
import { BlendFunction } from "postprocessing"
import type { QualityConfig } from "@/hooks/use-gpu-tier"

// Bloom is kept at a fixed, moderate intensity. The dawn sky is composed of
// mid-tone colours (no pure white, ever — a standing rule), so it sits below the
// 0.7 luminance threshold and never blows out; only the amber emissives and the
// cab lamp bloom. (We avoid a per-frame intensity ref: in React 19 a ref passed
// to <Bloom> is serialized by the library's JSON.stringify(props) memo and throws
// on the effect's circular structure.)
export function PostProcessing({ quality }: { quality: QualityConfig }) {
  if (!quality.bloomEnabled) return null

  return (
    <EffectComposer multisampling={0}>
      <Bloom
        luminanceThreshold={0.7}
        luminanceSmoothing={0.4}
        intensity={0.9}
        mipmapBlur
      />

      {quality.vignette ? (
        <Vignette
          offset={0.3}
          darkness={0.5}
          blendFunction={BlendFunction.NORMAL}
        />
      ) : (
        <></>
      )}
    </EffectComposer>
  )
}
