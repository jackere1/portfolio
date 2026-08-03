// The arc. One monotonic journey scalar t drives a keyframed sun elevation,
// and EVERY light, fog, exposure and sky value is read from it. Nothing in the
// world is driven by wall-clock time, so the journey is scrub-safe in both
// directions and identical on every load.
//
// This module is deliberately free of any three.js import: the flat tier reads
// the same arc to colour its chrome, and it must not pull a renderer with it.

import { clamp } from "./prng"

export interface Rgb {
  r: number
  g: number
  b: number
}

export interface SunState {
  /** Degrees above the horizon. +3 at the surface, -19 at the end. */
  elevationDeg: number
  /** Compass degrees. The sun sets WNW and drifts north-west as it goes under. */
  azimuthDeg: number
  /** Unit vector from the world origin toward the sun. */
  dirX: number
  dirY: number
  dirZ: number

  sunIntensity: number
  sunColor: Rgb

  /** Hemisphere light: sky above, bounced ground below. */
  skyColor: Rgb
  groundColor: Rgb
  ambientIntensity: number

  fogColor: Rgb
  fogDensity: number

  /** Renderer exposure. Falls far less than real radiance does — the eye adapts. */
  exposure: number

  /** 0 until the sun is 6 deg under, 1 by 12 deg under. The single curve that
   *  sells the entire dusk-deepening arc. */
  starOpacity: number

  /** Multiplier for the two time-bound warm chrome tokens. Reaches 0 at t=0.48;
   *  anything depending on it must be removable, not merely faded. */
  warmLife: number

  /** Which ink phase the DOM chrome is in. */
  phase: "dusk" | "night"
}

// --- keyframe machinery -----------------------------------------------------

type Key<T> = readonly [number, T]

function lerp(a: number, b: number, k: number): number {
  return a + (b - a) * k
}

/** Linear interpolation across a sorted keyframe table. Clamps at both ends. */
function sampleNumber(keys: readonly Key<number>[], t: number): number {
  if (t <= keys[0][0]) return keys[0][1]
  const last = keys[keys.length - 1]
  if (t >= last[0]) return last[1]
  for (let i = 1; i < keys.length; i++) {
    const [t1, v1] = keys[i]
    if (t <= t1) {
      const [t0, v0] = keys[i - 1]
      return lerp(v0, v1, (t - t0) / (t1 - t0))
    }
  }
  return last[1]
}

/** As `sampleNumber`, but writes into a preallocated colour (no allocation). */
function sampleColor(
  keys: readonly Key<Rgb>[],
  t: number,
  out: Rgb
): void {
  if (t <= keys[0][0]) {
    out.r = keys[0][1].r
    out.g = keys[0][1].g
    out.b = keys[0][1].b
    return
  }
  const last = keys[keys.length - 1]
  if (t >= last[0]) {
    out.r = last[1].r
    out.g = last[1].g
    out.b = last[1].b
    return
  }
  for (let i = 1; i < keys.length; i++) {
    const [t1, c1] = keys[i]
    if (t <= t1) {
      const [t0, c0] = keys[i - 1]
      const k = (t - t0) / (t1 - t0)
      out.r = lerp(c0.r, c1.r, k)
      out.g = lerp(c0.g, c1.g, k)
      out.b = lerp(c0.b, c1.b, k)
      return
    }
  }
}

const rgb = (r: number, g: number, b: number): Rgb => ({ r, g, b })

// --- the arc itself ---------------------------------------------------------

/**
 * Sun elevation against journey progress. Strictly decreasing, and pinned to
 * the seven stop values so the sky and the instrument readout can never
 * disagree about what the light is doing.
 */
const ELEVATION: readonly Key<number>[] = [
  [0.0, 3.0],
  [0.04, 2.0], // 01 The Track's End
  [0.17, -0.5], // 02 The Buuts
  [0.31, -2.0], // 03 The Corral
  [0.47, -4.0], // 04 The East Wall
  [0.62, -7.0], // 05 The Door
  [0.78, -10.0], // 06 The Threshold
  [0.93, -18.0], // 07 The Toono
  [1.0, -19.0],
]

/** The sun sets WNW at this latitude in late summer and keeps drifting
 *  north-west as it sinks. */
const AZIMUTH: readonly Key<number>[] = [
  [0.0, 288],
  [0.17, 293],
  [0.47, 300],
  [0.78, 306],
  [1.0, 312],
]

const SUN_INTENSITY: readonly Key<number>[] = [
  [0.0, 3.1],
  [0.04, 2.9],
  [0.14, 1.7],
  [0.17, 0.9], // horizon
  [0.24, 0.12],
  [0.31, 0.0], // dead, and the shadow pass dies with it
  [1.0, 0.0],
]

const SUN_COLOR: readonly Key<Rgb>[] = [
  [0.0, rgb(1.0, 0.72, 0.36)],
  [0.1, rgb(1.0, 0.58, 0.26)],
  [0.17, rgb(1.0, 0.42, 0.18)],
  [0.31, rgb(0.9, 0.34, 0.16)],
]

const SKY_COLOR: readonly Key<Rgb>[] = [
  [0.0, rgb(0.42, 0.5, 0.68)],
  [0.17, rgb(0.3, 0.38, 0.6)],
  [0.31, rgb(0.2, 0.29, 0.53)],
  [0.47, rgb(0.12, 0.19, 0.42)],
  [0.62, rgb(0.06, 0.11, 0.28)],
  [0.78, rgb(0.03, 0.055, 0.16)],
  [1.0, rgb(0.018, 0.03, 0.085)],
]

const GROUND_COLOR: readonly Key<Rgb>[] = [
  [0.0, rgb(0.36, 0.28, 0.16)],
  [0.31, rgb(0.19, 0.16, 0.12)],
  [0.62, rgb(0.07, 0.07, 0.08)],
  [1.0, rgb(0.03, 0.032, 0.042)],
]

// Once the sun is down the SKY is the light source, and at civil twilight it is
// still a substantial one — you can read outdoors at sun -3.
//
// The arc is carried by SKY_COLOR and GROUND_COLOR, which already fall by more
// than an order of magnitude from surface to night. This intensity is a second
// multiplier on top, so keeping it small as well dims everything twice and is
// what turned stops 03 to 05 into black silhouettes with every prop invisible.
// It rises as the sun crosses the horizon, because that is the moment the sky
// stops being a fill light and becomes the key.
const AMBIENT: readonly Key<number>[] = [
  [0.0, 0.5],
  [0.17, 0.68],
  [0.31, 0.8],
  [0.47, 0.8],
  [0.62, 0.62],
  [0.78, 0.38],
  [1.0, 0.25],
]

/** Tracks the horizon the eye is actually looking at, which is why it swings
 *  warm before it swings cold. */
const FOG_COLOR: readonly Key<Rgb>[] = [
  [0.0, rgb(0.3, 0.25, 0.21)],
  [0.17, rgb(0.26, 0.19, 0.17)],
  [0.31, rgb(0.15, 0.15, 0.2)],
  [0.47, rgb(0.08, 0.11, 0.2)],
  [0.62, rgb(0.045, 0.065, 0.14)],
  [0.78, rgb(0.022, 0.033, 0.082)],
  [1.0, rgb(0.013, 0.019, 0.048)],
]

/** Rises as the light dies: pressure, and a free horizon LOD. */
const FOG_DENSITY: readonly Key<number>[] = [
  [0.0, 0.0022],
  [0.17, 0.0028],
  [0.47, 0.0042],
  [0.78, 0.0062],
  [1.0, 0.0075],
]

const EXPOSURE: readonly Key<number>[] = [
  [0.0, 0.88],
  [0.31, 0.84],
  [0.47, 0.82],
  [0.62, 0.66],
  [0.78, 0.52],
  [1.0, 0.42],
]

/**
 * Write the full sun state for progress `t` into a preallocated object.
 * Called once per frame from the director — allocates nothing.
 */
export function writeSunState(out: SunState, t: number): void {
  const p = clamp(t, 0, 1)

  const elevation = sampleNumber(ELEVATION, p)
  const azimuth = sampleNumber(AZIMUTH, p)
  out.elevationDeg = elevation
  out.azimuthDeg = azimuth

  // Bearing -> direction, lifted by elevation. North is -Z, east is +X.
  const el = (elevation * Math.PI) / 180
  const az = (azimuth * Math.PI) / 180
  const horiz = Math.cos(el)
  out.dirX = horiz * Math.sin(az)
  out.dirY = Math.sin(el)
  out.dirZ = -horiz * Math.cos(az)

  out.sunIntensity = sampleNumber(SUN_INTENSITY, p)
  sampleColor(SUN_COLOR, p, out.sunColor)

  sampleColor(SKY_COLOR, p, out.skyColor)
  sampleColor(GROUND_COLOR, p, out.groundColor)
  out.ambientIntensity = sampleNumber(AMBIENT, p)

  sampleColor(FOG_COLOR, p, out.fogColor)
  out.fogDensity = sampleNumber(FOG_DENSITY, p)

  out.exposure = sampleNumber(EXPOSURE, p)

  // Stars ramp on sun elevation, not on t — so the sky and the SUN readout
  // physically cannot disagree about when the first star appears.
  out.starOpacity = clamp((-elevation - 6) / 6, 0, 1)

  out.warmLife = clamp((0.48 - p) / 0.18, 0, 1)
  out.phase = p >= 0.48 ? "night" : "dusk"
}

/** Allocate a zeroed state object. Create one per consumer, then reuse it. */
export function createSunState(): SunState {
  const s: SunState = {
    elevationDeg: 0,
    azimuthDeg: 0,
    dirX: 0,
    dirY: 0,
    dirZ: 0,
    sunIntensity: 0,
    sunColor: rgb(0, 0, 0),
    skyColor: rgb(0, 0, 0),
    groundColor: rgb(0, 0, 0),
    ambientIntensity: 0,
    fogColor: rgb(0, 0, 0),
    fogDensity: 0,
    exposure: 1,
    starOpacity: 0,
    warmLife: 1,
    phase: "dusk",
  }
  writeSunState(s, 0)
  return s
}

/** Convenience for non-hot paths (tests, the flat tier, the instrument strip). */
export function sunStateAt(t: number): SunState {
  const s = createSunState()
  writeSunState(s, t)
  return s
}

/** Local time at the dive site, as the instrument prints it. Derived from the
 *  same elevation table rather than invented, so it cannot drift from the sky. */
export function localTimeAt(t: number): string {
  // Late August at 47.9N: the sun crosses +3 deg around 20:14 and reaches
  // -19 deg (astronomical night) around 22:31.
  const minutes = sampleNumber(
    [
      [0.0, 20 * 60 + 14],
      [0.04, 20 * 60 + 20],
      [0.17, 20 * 60 + 42],
      [0.31, 20 * 60 + 55],
      [0.47, 21 * 60 + 12],
      [0.62, 21 * 60 + 34],
      [0.78, 21 * 60 + 58],
      [0.93, 22 * 60 + 27],
      [1.0, 22 * 60 + 31],
    ],
    clamp(t, 0, 1)
  )
  const h = Math.floor(minutes / 60)
  const m = Math.floor(minutes % 60)
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`
}
