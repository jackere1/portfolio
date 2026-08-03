// The ground. Evaluated on the CPU so the camera, the grass and the props all
// ground against the exact same surface the mesh is built from — no raycasts,
// no drift between what you stand on and what you see.
//
// Long low rolling treeless swells, as the steppe actually is: no peaks, no
// valleys with trees, no drama. The land is a slow breath.

import { hashSeed } from "./prng"
import { BUUTS } from "./world"

const SEED = hashSeed("ailchin-terrain")

/** Deterministic 2D hash in [0,1). Integer mixing, so no table and no state. */
function hash2(ix: number, iz: number): number {
  let h = SEED ^ Math.imul(ix | 0, 0x27d4eb2d)
  h = Math.imul(h ^ (iz | 0), 0x165667b1)
  h = Math.imul(h ^ (h >>> 15), 0x2545f491)
  h ^= h >>> 13
  return (h >>> 0) / 4294967296
}

function smootherstep(k: number): number {
  return k * k * k * (k * (k * 6 - 15) + 10)
}

/** Value noise with a C2-continuous fade — smooth enough that the ground has
 *  no faceting under a low sun, which is exactly when faceting shows. */
function valueNoise(x: number, z: number): number {
  const x0 = Math.floor(x)
  const z0 = Math.floor(z)
  const fx = smootherstep(x - x0)
  const fz = smootherstep(z - z0)

  const n00 = hash2(x0, z0)
  const n10 = hash2(x0 + 1, z0)
  const n01 = hash2(x0, z0 + 1)
  const n11 = hash2(x0 + 1, z0 + 1)

  const a = n00 + (n10 - n00) * fx
  const b = n01 + (n11 - n01) * fx
  return a + (b - a) * fz
}

interface Octave {
  /** Metres per noise cell. */
  wavelength: number
  /** Metres of vertical amplitude. */
  amplitude: number
  /** Whether the grazed halo flattens this band. Long swells are not flattened
   *  — a camp sits ON the land, it does not carve it. */
  flattened: boolean
}

const OCTAVES: readonly Octave[] = [
  { wavelength: 210, amplitude: 7.2, flattened: false },
  { wavelength: 96, amplitude: 2.6, flattened: false },
  { wavelength: 41, amplitude: 1.15, flattened: true },
  { wavelength: 17, amplitude: 0.42, flattened: true },
  { wavelength: 6.5, amplitude: 0.14, flattened: true },
]

/** How much the small detail is worn flat by hooves and traffic near the camp:
 *  0.3 on the bare halo, 1 out in the ungrazed grass. */
function flattening(x: number, z: number): number {
  const d = Math.hypot(x, z)
  if (d <= BUUTS.inner) return 0.3
  if (d >= BUUTS.outer) return 1
  const k = (d - BUUTS.inner) / (BUUTS.outer - BUUTS.inner)
  return 0.3 + 0.7 * smootherstep(k)
}

/** Ridged noise: folds the field at its midpoint so crests come to a line
 *  rather than a dome. This is what makes a mountain read as a mountain. */
function ridge(x: number, z: number): number {
  return 1 - Math.abs(valueNoise(x, z) * 2 - 1)
}

/**
 * The far ranges.
 *
 * A Mongolian basin is not an infinite plain — it is a wide floor with ranges
 * standing around its rim, and those ridgelines receding in blue-haze steps are
 * most of what the country looks like. They rise only beyond half a kilometre,
 * so nothing near the camp is disturbed and the camera still grounds on the
 * same gentle swells it always did.
 */
function mountains(x: number, z: number): number {
  const d = Math.hypot(x, z)
  if (d < 1200) return 0
  const rise = smootherstep(Math.min(1, (d - 1200) / 2200))

  // DISTANCE is what makes a range read as a range. A 400 m peak a kilometre
  // away subtends 23 degrees and looks like a wall dropped behind the camp;
  // the same peak at three kilometres subtends 5, which is what a real skyline
  // does. Keep them low and keep them far.
  //
  // Only two octaves, and both long: the mesh out here is coarse, and any
  // wavelength it cannot resolve turns the skyline into torn paper.
  const a = ridge(x / 1500 + 5.1, z / 1500 - 2.7)
  const b = ridge(x / 620 - 11.3, z / 620 + 7.9)

  const shape = Math.pow(a, 1.6) * (0.7 + 0.3 * b)
  return rise * shape * 260
}

function rawHeight(x: number, z: number): number {
  let h = 0
  const f = flattening(x, z)
  for (let i = 0; i < OCTAVES.length; i++) {
    const o = OCTAVES[i]
    // Offset each octave so they do not share their lattice and stack ridges.
    const n = valueNoise(
      x / o.wavelength + i * 37.13,
      z / o.wavelength - i * 21.77
    )
    const amp = o.flattened ? o.amplitude * f : o.amplitude
    h += (n * 2 - 1) * amp
  }
  return h + mountains(x, z)
}

/** Raw height at the ger, subtracted everywhere so the ger floor is exactly 0. */
const ORIGIN_OFFSET = rawHeight(0, 0)

/** Ground height in metres at a world XZ. The single source of truth. */
export function heightAt(x: number, z: number): number {
  return rawHeight(x, z) - ORIGIN_OFFSET
}

/** Surface normal by central difference. `out` is mutated; nothing allocates. */
export function normalAt(
  x: number,
  z: number,
  out: { x: number; y: number; z: number },
  eps = 0.6
): void {
  const hL = heightAt(x - eps, z)
  const hR = heightAt(x + eps, z)
  const hD = heightAt(x, z - eps)
  const hU = heightAt(x, z + eps)
  const nx = hL - hR
  const nz = hD - hU
  const ny = 2 * eps
  const len = Math.hypot(nx, ny, nz) || 1
  out.x = nx / len
  out.y = ny / len
  out.z = nz / len
}

/** Steepness in [0,1], 0 flat. Grass thins on the steep faces. */
export function slopeAt(x: number, z: number): number {
  const n = { x: 0, y: 1, z: 0 }
  normalAt(x, z, n)
  return 1 - n.y
}
