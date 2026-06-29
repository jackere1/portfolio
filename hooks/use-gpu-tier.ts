"use client"

import { useState, useEffect } from "react"

export type GpuTier = "ultra" | "high" | "medium" | "low" | "fallback"

/** PBR map kinds a floor may request. Drives texture-tier degradation. */
export type MapKind = "albedo" | "normal" | "roughness" | "ao"

export interface QualityConfig {
  particleCount: number
  bloomEnabled: boolean
  chromaticAberration: boolean
  vignette: boolean
  filmGrain: boolean
  geometryDetail: "full" | "reduced" | "minimal"
  shadows: boolean
  /** Which PBR maps to load. Empty ⇒ use a flat tinted material (weak GPUs). */
  textureMaps: MapKind[]
  /** Advisory source size; 0 ⇒ no image textures at all. */
  textureSize: 2048 | 1024 | 512 | 0
}

const ALL_MAPS: MapKind[] = ["albedo", "normal", "roughness"]

const QUALITY_CONFIGS: Record<GpuTier, QualityConfig> = {
  ultra: {
    particleCount: 4000,
    bloomEnabled: true,
    chromaticAberration: false,
    vignette: true,
    filmGrain: false,
    geometryDetail: "full",
    shadows: false,
    textureMaps: ALL_MAPS,
    textureSize: 1024,
  },
  high: {
    particleCount: 2000,
    bloomEnabled: true,
    chromaticAberration: false,
    vignette: true,
    filmGrain: false,
    geometryDetail: "full",
    shadows: false,
    textureMaps: ALL_MAPS,
    textureSize: 1024,
  },
  medium: {
    particleCount: 800,
    bloomEnabled: true,
    chromaticAberration: false,
    vignette: false,
    filmGrain: false,
    geometryDetail: "reduced",
    shadows: false,
    // Drop the (relief-only) normal map on integrated GPUs; keep albedo + roughness.
    textureMaps: ["albedo", "roughness"],
    textureSize: 512,
  },
  low: {
    particleCount: 0,
    bloomEnabled: false,
    chromaticAberration: false,
    vignette: false,
    filmGrain: false,
    geometryDetail: "minimal",
    shadows: false,
    // No image textures — floors fall back to flat tinted materials.
    textureMaps: [],
    textureSize: 0,
  },
  fallback: {
    particleCount: 0,
    bloomEnabled: false,
    chromaticAberration: false,
    vignette: false,
    filmGrain: false,
    geometryDetail: "minimal",
    shadows: false,
    textureMaps: [],
    textureSize: 0,
  },
}

function detectGpuTier(): GpuTier {
  if (typeof window === "undefined") return "fallback"

  // Mobile detection
  const isMobile =
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    ) || window.innerWidth < 768

  if (isMobile) return "fallback"

  // Check WebGL support
  try {
    const canvas = document.createElement("canvas")
    const gl =
      canvas.getContext("webgl2") || canvas.getContext("webgl")
    if (!gl) return "fallback"

    const debugInfo = gl.getExtension("WEBGL_debug_renderer_info")
    if (debugInfo) {
      const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL)
      const rendererLower = renderer.toLowerCase()

      // High-end GPUs
      if (
        rendererLower.includes("rtx") ||
        rendererLower.includes("rx 6") ||
        rendererLower.includes("rx 7") ||
        rendererLower.includes("m1") ||
        rendererLower.includes("m2") ||
        rendererLower.includes("m3") ||
        rendererLower.includes("m4") ||
        rendererLower.includes("apple") ||
        rendererLower.includes("gtx 1080") ||
        rendererLower.includes("gtx 1070")
      ) {
        return "ultra"
      }

      // Mid-range GPUs
      if (
        rendererLower.includes("gtx") ||
        rendererLower.includes("rx 5") ||
        rendererLower.includes("arc")
      ) {
        return "high"
      }

      // Integrated GPUs
      if (
        rendererLower.includes("intel") ||
        rendererLower.includes("mesa")
      ) {
        return "medium"
      }
    }

    // Fallback: check max texture size as a rough proxy
    const maxTextureSize = gl.getParameter(gl.MAX_TEXTURE_SIZE)
    if (maxTextureSize >= 16384) return "high"
    if (maxTextureSize >= 8192) return "medium"
    return "low"
  } catch {
    return "fallback"
  }
}

export function useGpuTier() {
  const [tier, setTier] = useState<GpuTier>("high") // default to high SSR
  const [quality, setQuality] = useState<QualityConfig>(QUALITY_CONFIGS.high)

  useEffect(() => {
    const detected = detectGpuTier()
    setTier(detected)
    setQuality(QUALITY_CONFIGS[detected])
  }, [])

  return { tier, quality, isFallback: tier === "fallback" }
}
