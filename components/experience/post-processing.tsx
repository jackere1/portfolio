import {
  EffectComposer,
  Bloom,
  Vignette,
} from "@react-three/postprocessing"
import { BlendFunction } from "postprocessing"
import type { QualityConfig } from "@/hooks/use-gpu-tier"

export function PostProcessing({ quality }: { quality: QualityConfig }) {
  if (!quality.bloomEnabled) return null

  return (
    <EffectComposer multisampling={0}>
      <Bloom
        luminanceThreshold={0.7}
        luminanceSmoothing={0.4}
        intensity={1.2}
        mipmapBlur
      />

      {quality.vignette && (
        <Vignette
          offset={0.3}
          darkness={0.5}
          blendFunction={BlendFunction.NORMAL}
        />
      )}
    </EffectComposer>
  )
}
