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

/**
 * The largest texture this site ever creates: the 1024² terrain map and the
 * 1024×512 star map. A gate may ask for this and nothing beyond it.
 *
 * A CAPABILITY GATE MAY ONLY REQUIRE CAPABILITIES THAT ARE USED. This one once
 * demanded `OES_texture_float_linear`, which nothing here has ever needed — the
 * single float texture in the world is NEAREST-filtered on purpose and bilinear
 * -filtered by hand in the shader, precisely BECAUSE float textures are only
 * linearly filterable behind that extension. The check therefore required the
 * exact capability the code was written to do without, and since a large share
 * of mobile GPUs do not expose it, every one of those phones was sent to the
 * flat tier for a reason that never applied to it. It shipped, and it took a
 * real phone to catch, because the desktop GPU that "verified" it happened to
 * expose the extension and so never exercised the branch.
 */
const REQUIRED_TEXTURE_SIZE = 1024

/** What the probe saw, and what it concluded. Exposed on `window.__ailchin.gpu`
 *  and rendered by `?diag=1`, because a tier decision that cannot be read back
 *  off the device that made it is a decision nobody can debug. */
export interface GpuProbe {
  tier: GpuTier
  /** Why this tier, in one line, in plain words. */
  reason: string
  webgl2: boolean
  maxTexture: number
  maxVaryings: number
  maxAniso: number
  /** Reported only. Deliberately NOT gated on — see above. */
  floatLinear: boolean
  reducedMotion: boolean
  coarse: boolean
  width: number
  forced: boolean
}

const TIER_NAMES: readonly string[] = ["high", "medium", "mobile", "low", "flat"]

/** `?tier=mobile` forces a tier. For support and for verifying the other
 *  branches from a machine that cannot reproduce them. */
function forcedTier(): GpuTier | null {
  try {
    const q = new URLSearchParams(window.location.search).get("tier")
    return q && TIER_NAMES.includes(q) ? (q as GpuTier) : null
  } catch {
    return null
  }
}

function detectGpu(): GpuProbe {
  const p: GpuProbe = {
    tier: "flat",
    reason: "server render",
    webgl2: false,
    maxTexture: 0,
    maxVaryings: 0,
    maxAniso: 1,
    floatLinear: false,
    reducedMotion: false,
    coarse: false,
    width: 0,
    forced: false,
  }
  if (typeof window === "undefined") return p

  p.width = window.innerWidth
  p.reducedMotion =
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false
  p.coarse = window.matchMedia?.("(pointer: coarse)").matches ?? false

  const forced = forcedTier()
  if (forced) {
    return { ...p, tier: forced, forced: true, reason: `forced by ?tier=${forced}` }
  }

  // Reduced motion always wins, on any device. It is a stated preference and
  // no amount of capability overrides it.
  if (p.reducedMotion) {
    return { ...p, tier: "flat", reason: "prefers-reduced-motion: reduce" }
  }

  try {
    const canvas = document.createElement("canvas")
    const gl = canvas.getContext("webgl2")
    if (!gl) return { ...p, tier: "flat", reason: "no WebGL2 context" }

    p.webgl2 = true
    // Deliberately not a renderer-string allowlist: those rot, and they were
    // wrong about half the hardware in Ulaanbaatar anyway.
    p.maxTexture = gl.getParameter(gl.MAX_TEXTURE_SIZE) as number
    p.maxVaryings = gl.getParameter(gl.MAX_VARYING_VECTORS) as number
    p.floatLinear = gl.getExtension("OES_texture_float_linear") !== null
    const anisoExt = gl.getExtension("EXT_texture_filter_anisotropic")
    p.maxAniso = anisoExt
      ? (gl.getParameter(anisoExt.MAX_TEXTURE_MAX_ANISOTROPY_EXT) as number)
      : 1

    gl.getExtension("WEBGL_lose_context")?.loseContext()

    if (!(p.maxTexture >= REQUIRED_TEXTURE_SIZE)) {
      return {
        ...p,
        tier: "flat",
        reason: `MAX_TEXTURE_SIZE ${p.maxTexture} < ${REQUIRED_TEXTURE_SIZE}`,
      }
    }

    // A phone that can hold this site's textures can carry the simplified
    // world. Everything a phone genuinely cannot afford — the shadow pass, full
    // instance counts, 1.5x DPR — is already off in the `mobile` config, and
    // none of it is a capability question.
    if (p.coarse || p.width < 900) {
      return {
        ...p,
        tier: "mobile",
        reason: p.coarse ? "touch device" : `narrow viewport (${p.width}px)`,
      }
    }

    if (p.maxTexture >= 16384 && p.maxAniso >= 16) {
      return { ...p, tier: "high", reason: "desktop, 16k textures, 16x aniso" }
    }
    if (p.maxTexture >= 8192) {
      return { ...p, tier: "medium", reason: "desktop, 8k textures" }
    }
    return { ...p, tier: "low", reason: `desktop, MAX_TEXTURE_SIZE ${p.maxTexture}` }
  } catch (err) {
    return { ...p, tier: "flat", reason: `probe threw: ${String(err)}` }
  }
}

export function useGpuTier() {
  // SSR and the first client frame agree on "high" so the markup does not
  // flicker; the probe replaces it before anything is drawn.
  const [probe, setProbe] = useState<GpuProbe | null>(null)

  useEffect(() => {
    const p = detectGpu()
    setProbe(p)
    const w = window as unknown as { __ailchin?: Record<string, unknown> }
    w.__ailchin = { ...(w.__ailchin ?? {}), gpu: p }
  }, [])

  const tier = probe?.tier ?? "high"
  return { tier, quality: QUALITY[tier], isFlat: tier === "flat", probe }
}
