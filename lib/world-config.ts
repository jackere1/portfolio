// The boundary lives here.
//
// One world-space line governs where the field is allowed to drift and where
// it locks. Every primitive that needs to agree on the seam imports from this
// file so there is exactly one source of truth for the boundary.

// The dive runs from the surface to the bedrock floor. Camera Y descends across
// this span as scroll progress goes 0 → 1. The span is deliberately taller than
// the stages need: each floor's stage is compact, and the rest of its cell is
// travel void — shaft you fall through between rooms.
export const Y_SURFACE = 20
export const Y_BEDROCK = -40

// World-space Y of the seam (the thermocline). ABOVE it the medium drifts
// (probabilistic); BELOW it the field locks (deterministic, crisp, regular).
// Placed so the camera punches through it just as the Boundary level is read —
// you cross the line while reading about the line. The brief surface is the
// guessing water; most of the dive is the deep, where nothing is permitted to lie.
export const SEAM_Y = 8

// Depth readout: progress maps to metres of descent (the cabin instrument).
export const MAX_DEPTH = 240
export function progressToDepth(progress: number): number {
  return progress * MAX_DEPTH
}
// Depth at which the thermocline sits, for instrument markers.
export const THERMOCLINE_DEPTH =
  ((Y_SURFACE - SEAM_Y) / (Y_SURFACE - Y_BEDROCK)) * MAX_DEPTH

// Half-width of the transition band around the seam (world units). Inside the
// band, primitives blend from drift to locked instead of snapping.
export const SEAM_BAND = 2.5

// Clamped drift amplitudes — bounded chaos, never unbounded.
export const MACHINE_DRIFT_MAX = 0.2
export const PARTICLE_DRIFT_MAX = 0.6
export const CONDUIT_DRIFT_MAX = 1.6

// smoothstep, mirrored from GLSL so the JS region math matches the shader exactly.
function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)))
  return t * t * (3 - 2 * t)
}

// 0 below the seam (locked), 1 above the seam (drift), smooth across the band.
export function regionFactor(y: number): number {
  return smoothstep(SEAM_Y - SEAM_BAND, SEAM_Y + SEAM_BAND, y)
}
