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
  /** Max device-pixel-ratio for the canvas — the single biggest lever on a
   *  software rasterizer, where cost is per pixel. Low on weak/software paths. */
  maxDpr: number
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
    maxDpr: 1.5,
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
    maxDpr: 1.5,
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
    maxDpr: 1.25,
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
    // Software rasterizers land here — keep the pixel count low.
    maxDpr: 0.65,
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
    maxDpr: 1,
  },
}

// Manual override: `?dive` forces the full 3D experience (WebGL still
// required), `?flat` forces the CSS dive, `?auto` clears the choice. Sticky
// via localStorage so it survives navigation. The instrument never guesses
// silently — every fallback decision is logged to the console.
function readOverride(): "dive" | "flat" | null {
  try {
    const q = new URLSearchParams(window.location.search)
    if (q.has("auto")) localStorage.removeItem("dive-override")
    else if (q.has("dive")) localStorage.setItem("dive-override", "dive")
    else if (q.has("flat")) localStorage.setItem("dive-override", "flat")
    const s = localStorage.getItem("dive-override")
    return s === "dive" || s === "flat" ? s : null
  } catch {
    return null
  }
}

// A record of why the dive rendered (or didn't), surfaced on the fallback page
// and on `window.__diveDiag` so a "just text" report is self-diagnosing.
export interface DiveDiag {
  reason: string
  webgl: boolean
  renderer: string
  pointerFine: boolean
  width: number
  error: string
}
export const diveDiag: DiveDiag = {
  reason: "not run",
  webgl: false,
  renderer: "",
  pointerFine: false,
  width: 0,
  error: "",
}

// Detection runs ONCE per page load and is shared by every hook instance.
// Each probe opens a WebGL context; browsers cap ~16 live contexts and evict
// the oldest — which is the main canvas. Probing per-component killed the
// renderer once enough PbrMaterials mounted. One probe, released immediately.
let cachedTier: GpuTier | null = null

function detectGpuTier(): GpuTier {
  if (typeof window === "undefined") return "fallback"
  if (cachedTier !== null) return cachedTier
  cachedTier = probeGpuTier()
  ;(window as unknown as { __diveDiag?: DiveDiag }).__diveDiag = diveDiag
  return cachedTier
}

function probeGpuTier(): GpuTier {
  const override = readOverride()
  if (override === "flat") {
    diveDiag.reason = "?flat override"
    console.info("[dive] fallback: ?flat override")
    return "fallback"
  }

  // `?tier=ultra|high|medium|low` forces a quality tier — for testing on a
  // software-rendering machine, or for a visitor who wants to push their GPU.
  try {
    const forced = new URLSearchParams(window.location.search).get("tier")
    if (forced && ["ultra", "high", "medium", "low"].includes(forced)) {
      diveDiag.reason = "?tier=" + forced + " override"
      return forced as GpuTier
    }
  } catch {
    /* ignore */
  }

  // Touch-first devices and truly phone-narrow viewports get the CSS dive.
  // A narrow *desktop* window does not — pointer precision, not window width,
  // is what the cab needs.
  const mobileUA =
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    )
  const fine = window.matchMedia("(pointer: fine)").matches
  const coarseOnly = window.matchMedia("(pointer: coarse)").matches && !fine
  diveDiag.pointerFine = fine
  diveDiag.width = window.innerWidth
  if (override !== "dive" && (mobileUA || coarseOnly || window.innerWidth < 480)) {
    diveDiag.reason = mobileUA
      ? "mobile UA"
      : coarseOnly
        ? "no fine pointer (touch-only)"
        : "viewport < 480px"
    console.info("[dive] fallback:", diveDiag.reason)
    return "fallback"
  }

  // Check WebGL support — one probe context, released before returning.
  try {
    const canvas = document.createElement("canvas")
    const gl =
      canvas.getContext("webgl2") || canvas.getContext("webgl")
    if (!gl) {
      diveDiag.reason = "WebGL unavailable (hardware acceleration off?)"
      console.info("[dive] fallback: WebGL unavailable")
      return "fallback"
    }
    diveDiag.webgl = true

    let tier: GpuTier | null = null

    const debugInfo = gl.getExtension("WEBGL_debug_renderer_info")
    if (debugInfo) {
      const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL)
      diveDiag.renderer = String(renderer)
      const rendererLower = String(renderer).toLowerCase()

      // Software rasterizers (SwiftShader, Mesa llvmpipe, generic "software"):
      // WebGL works, but every pixel is drawn on the CPU. Force the lightest
      // tier so the scene stays usable — the dense grass is fill-rate suicide here.
      if (/swiftshader|llvmpipe|software|basic render|microsoft basic/.test(rendererLower)) {
        diveDiag.reason = "ok: software render → low"
        gl.getExtension("WEBGL_lose_context")?.loseContext()
        console.info("[dive] tier: low (software renderer:", rendererLower + ")")
        return "low"
      }

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
        tier = "ultra"
      } else if (
        // Mid-range GPUs
        rendererLower.includes("gtx") ||
        rendererLower.includes("rx 5") ||
        rendererLower.includes("arc")
      ) {
        tier = "high"
      } else if (
        // Integrated GPUs
        rendererLower.includes("intel") ||
        rendererLower.includes("mesa")
      ) {
        tier = "medium"
      }
    }

    if (tier === null) {
      // Fallback: check max texture size as a rough proxy
      const maxTextureSize = gl.getParameter(gl.MAX_TEXTURE_SIZE)
      tier = maxTextureSize >= 16384 ? "high" : maxTextureSize >= 8192 ? "medium" : "low"
    }

    gl.getExtension("WEBGL_lose_context")?.loseContext()
    diveDiag.reason = "ok: tier " + tier
    console.info("[dive] tier:", tier, diveDiag.renderer || "(renderer hidden)")
    return tier
  } catch (e) {
    diveDiag.reason = "WebGL threw"
    diveDiag.error = e instanceof Error ? e.message : String(e)
    console.info("[dive] fallback: WebGL threw —", diveDiag.error)
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
