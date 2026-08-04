"use client"

import { useState, useEffect } from "react"

export type GpuTier = "high" | "medium" | "mobile" | "low" | "flat"

/** PBR map kinds a surface may request. Drives texture-tier degradation. */
export type MapKind = "albedo" | "normal" | "roughness" | "ao"

/**
 * Every flag here is read by something. When a knob stops being consulted it
 * comes out — a quality config full of dead switches is worse than no config,
 * because it reads as tuned when it is not.
 */
export interface QualityConfig {
  bloomEnabled: boolean
  vignette: boolean
  shadows: boolean
  /** Which PBR maps to load. Empty ⇒ flat tinted materials, nothing fetched. */
  textureMaps: MapKind[]
  /** Advisory source size; 0 ⇒ no image textures at all. */
  textureSize: 2048 | 1024 | 512 | 0
  /** Device pixel ratio ceiling. */
  dpr: number
  /** Touch device: drives gyro look, larger hit targets, touch scroll sync. */
  touch: boolean
}

const ALL_MAPS: MapKind[] = ["albedo", "normal", "roughness"]

const QUALITY: Record<GpuTier, QualityConfig> = {
  high: {
    bloomEnabled: true,
    vignette: true,
    shadows: true,
    textureMaps: ALL_MAPS,
    textureSize: 1024,
    dpr: 1.5,
    touch: false,
  },
  medium: {
    bloomEnabled: true,
    vignette: true,
    shadows: false,
    textureMaps: ["albedo", "roughness"],
    textureSize: 512,
    dpr: 1.25,
    touch: false,
  },
  /**
   * Phones get the SAME WORLD, simplified — not a different site.
   *
   * The scene's own render is about a millisecond on a modest integrated GPU,
   * so the old assumption that a phone could not carry it was never tested; it
   * was a v1 cut made when the cost was unknown. What a phone genuinely cannot
   * carry is the shadow pass and full instance counts, and its screen does not
   * need 1.5x DPR to look right.
   */
  mobile: {
    bloomEnabled: true,
    vignette: true,
    shadows: false,
    textureMaps: ["albedo", "roughness"],
    textureSize: 512,
    dpr: 1,
    touch: true,
  },
  low: {
    bloomEnabled: false,
    vignette: false,
    shadows: false,
    textureMaps: [],
    textureSize: 0,
    dpr: 1,
    touch: false,
  },
  // Phones, weak GPUs and prefers-reduced-motion all land here: the same seven
  // stops, held still. Not a downgrade of the world — the same world, at rest.
  flat: {
    bloomEnabled: false,
    vignette: false,
    shadows: false,
    textureMaps: [],
    textureSize: 0,
    dpr: 1,
    touch: false,
  },
}

function detectTier(): GpuTier {
  if (typeof window === "undefined") return "flat"

  // Reduced motion always wins, on any device. It is a stated preference and
  // no amount of capability overrides it.
  if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
    return "flat"
  }

  const coarse = window.matchMedia?.("(pointer: coarse)").matches ?? false
  const small = window.innerWidth < 900

  try {
    const canvas = document.createElement("canvas")
    const gl = canvas.getContext("webgl2")
    if (!gl) return "flat"

    // Deliberately not a renderer-string allowlist: those rot, and they were
    // wrong about half the hardware in Ulaanbaatar anyway. Capability probes
    // are coarser but they keep being true.
    const maxTex = gl.getParameter(gl.MAX_TEXTURE_SIZE) as number
    const maxVaryings = gl.getParameter(gl.MAX_VARYING_VECTORS) as number
    const floatLinear = gl.getExtension("OES_texture_float_linear") !== null
    const anisoExt = gl.getExtension("EXT_texture_filter_anisotropic")
    const maxAniso = anisoExt
      ? (gl.getParameter(anisoExt.MAX_TEXTURE_MAX_ANISOTROPY_EXT) as number)
      : 1

    const lost = gl.getExtension("WEBGL_lose_context")
    lost?.loseContext()

    // A phone that can do float-linear filtering and 4k textures can carry the
    // simplified world; anything weaker falls back to the flat tier, which is
    // the same nine stops held still rather than a lesser site.
    if (coarse || small) {
      return maxTex >= 4096 && maxVaryings >= 15 && floatLinear ? "mobile" : "flat"
    }

    if (maxTex >= 16384 && maxAniso >= 16 && floatLinear) return "high"
    if (maxTex >= 8192 && maxVaryings >= 15) return "medium"
    return "low"
  } catch {
    return "flat"
  }
}

export function useGpuTier() {
  // SSR and the first client frame agree on "high" so the markup does not
  // flicker; the probe replaces it before anything is drawn.
  const [tier, setTier] = useState<GpuTier>("high")

  useEffect(() => {
    setTier(detectTier())
  }, [])

  return { tier, quality: QUALITY[tier], isFlat: tier === "flat" }
}
