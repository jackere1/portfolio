// The boundary lives here.
//
// One world-space line governs where the field is allowed to drift and where
// it locks. Every primitive that needs to agree on the seam imports from this
// file so there is exactly one source of truth for the boundary.

// World-space Y of the seam. ABOVE it the field drifts (probabilistic); BELOW
// it the field locks (deterministic, crisp, regular). The camera descends from
// y≈12 to y≈-24, so the crossing happens once, mid-journey, near the Boundary
// room — you literally pass from guess into truth.
export const SEAM_Y = -8

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
