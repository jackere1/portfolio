// Seeded, bounded randomness.
//
// The probabilistic side of the field is allowed to drift — but only within
// clamped, reproducible bounds. Two loads of the page produce the exact same
// "chaos". Nothing here is ever unbounded, and nothing is ever different
// between runs. Drift is permitted; lying is not.

// xmur3 string hash → a stable uint32 seed. Same name, same seed, forever.
export function hashSeed(str: string): number {
  let h = 1779033703 ^ str.length
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353)
    h = (h << 13) | (h >>> 19)
  }
  h = Math.imul(h ^ (h >>> 16), 2246822507)
  h = Math.imul(h ^ (h >>> 13), 3266489909)
  return (h ^= h >>> 16) >>> 0
}

// mulberry32 — a tiny, fast PRNG with a single 32-bit state. Returns a
// function producing values in [0, 1).
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return function () {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// Convenience: a named, reproducible generator.
export function makeRng(name: string): () => number {
  return mulberry32(hashSeed(name))
}

export function clamp(v: number, min: number, max: number): number {
  return v < min ? min : v > max ? max : v
}

// A value in [min, max) drawn from the generator.
export function seededRange(rng: () => number, min: number, max: number): number {
  return min + rng() * (max - min)
}

// The canonical bounded-chaos primitive: an offset in [-amplitude, +amplitude].
// Drift can never exceed its clamp because the clamp is the construction.
export function seededDrift(rng: () => number, amplitude: number): number {
  return (rng() * 2 - 1) * amplitude
}
