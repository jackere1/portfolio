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

  /** Sky dome endpoints, in linear HDR radiance. */
  zenith: Rgb
  horizon: Rgb
  /** Absolute radiance of the solar disc. */
  sunDisc: Rgb
  /** Vertical Mie optical depth, and the strength of the sun's aureole. */
  haze: number
  mieGain: number

  /** The urkh — the felt flap over the crown. 0 folded back, 1 drawn across.
   *  It is drawn as it gets dark, which is also WHY the finale is outdoors:
   *  seeing stars through an uncovered toono reads as poverty. */
  urkh: number
  /** The summer khayaa, rolled up for air and rolled down when it gets cold. */
  khayaaRoll: number

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
  [0.0, 25.0],
  [0.05, 23.0], // 01 The Track's End — late afternoon
  [0.17, 15.5], // 02 The Camp Seen
  [0.29, 8.5], // 03 The East Side
  [0.345, 6.0], // blend window opens
  [0.41, 3.0], // 04 The Herd Comes Home — golden hour
  [0.456, 1.5], // blend window closes; pure twilight below here
  [0.52, -0.6], // 05 The Door — sun on the horizon
  [0.62, -3.2], // 06 The Threshold
  [0.72, -5.0], // 07 Inside — the toono holds the LAST BLUE, never stars
  [0.85, -11.5], // 08 Back Out — the ger has sealed itself behind you
  [0.95, -17.5], // 09 Under It — the Milky Way, from open ground
  [1.0, -19.0],
]

/** Recomputed for 47.886 N and a declination of +12.2 (about 20 August). The
 *  sun at +25 bears 260, not the 288 that was right only at sunset — the camp's
 *  shadows swing 55 degrees across the journey and every afternoon composition
 *  depends on it. */
const AZIMUTH: readonly Key<number>[] = [
  [0.0, 260.3],
  [0.17, 271.2],
  [0.29, 278.8],
  [0.41, 284.9],
  [0.52, 289.1],
  [0.62, 292.2],
  [0.72, 294.4],
  [0.85, 303.1],
  [1.0, 315.6],
]

const SUN_INTENSITY: readonly Key<number>[] = [
  [0.0, 7.8],
  [0.17, 5.9],
  [0.29, 4.2],
  [0.41, 3.1],
  [0.456, 2.2],
  [0.52, 0.62],
  [0.55, 0.14],
  [0.58, 0.0], // dead at about -2.2; the shadow pass dies with it
  [1.0, 0.0],
]

const SUN_COLOR: readonly Key<Rgb>[] = [
  [0.0, rgb(1.0, 0.94, 0.82)],
  [0.17, rgb(1.0, 0.87, 0.66)],
  [0.29, rgb(1.0, 0.8, 0.52)],
  [0.41, rgb(1.0, 0.72, 0.36)],
  [0.456, rgb(1.0, 0.63, 0.28)],
  [0.52, rgb(1.0, 0.44, 0.18)],
  [0.58, rgb(0.9, 0.34, 0.16)],
]

/** Absolute linear radiance of the solar disc. Keyframed rather than constant:
 *  a midday disc and a sunset disc are not the same object. */
const SUN_DISC: readonly Key<Rgb>[] = [
  [0.0, rgb(152, 143, 125)],
  [0.17, rgb(124, 108, 82)],
  [0.29, rgb(94, 72, 44)],
  [0.41, rgb(57, 34, 17)],
  [0.456, rgb(44, 22, 9)],
  [0.52, rgb(16, 5.5, 1.4)],
  [0.56, rgb(0, 0, 0)],
]

/** Sky dome endpoints, now their own tables. They used to be derived from the
 *  hemisphere colours by a fixed multiplier, but that multiplier was only ever
 *  true at dusk. Every row from 0.52 down reproduces the reviewed dusk values
 *  exactly. */
const ZENITH: readonly Key<Rgb>[] = [
  [0.0, rgb(0.3, 0.5, 0.84)],
  [0.17, rgb(0.214, 0.368, 0.652)],
  [0.29, rgb(0.128, 0.228, 0.448)],
  [0.41, rgb(0.05, 0.094, 0.294)],
  [0.52, rgb(0.033, 0.0646, 0.252)],
  [0.62, rgb(0.022, 0.0493, 0.2226)],
  [0.76, rgb(0.0132, 0.0323, 0.1764)],
  [0.85, rgb(0.0066, 0.0187, 0.1176)],
  [0.95, rgb(0.0033, 0.0094, 0.0672)],
  [1.0, rgb(0.002, 0.0051, 0.0357)],
]

const HORIZON: readonly Key<Rgb>[] = [
  [0.0, rgb(0.86, 0.9, 1.0)],
  [0.17, rgb(0.74, 0.71, 0.72)],
  [0.29, rgb(0.62, 0.54, 0.47)],
  [0.345, rgb(0.68, 0.56, 0.44)],
  [0.41, rgb(0.25, 0.174, 0.148)],
  [0.52, rgb(0.1872, 0.114, 0.1054)],
  [0.574, rgb(0.108, 0.09, 0.124)],
  [0.664, rgb(0.0576, 0.066, 0.124)],
  [0.76, rgb(0.0324, 0.039, 0.0868)],
  [0.82, rgb(0.0158, 0.0198, 0.0508)],
  [1.0, rgb(0.0094, 0.0114, 0.0298)],
]

/** Hemisphere sky. Values above 1 are deliberate — this is an irradiance
 *  colour, not an albedo, and THREE.Color is unclamped. */
const SKY_COLOR: readonly Key<Rgb>[] = [
  [0.0, rgb(1.18, 1.49, 2.0)],
  [0.17, rgb(0.88, 1.11, 1.52)],
  [0.29, rgb(0.6, 0.74, 1.03)],
  [0.41, rgb(0.42, 0.5, 0.68)],
  [0.517, rgb(0.3, 0.38, 0.6)],
  [0.574, rgb(0.2, 0.29, 0.53)],
  [0.664, rgb(0.12, 0.19, 0.42)],
  [0.76, rgb(0.06, 0.11, 0.28)],
  [0.82, rgb(0.03, 0.055, 0.16)],
  [1.0, rgb(0.018, 0.03, 0.085)],
]

const GROUND_COLOR: readonly Key<Rgb>[] = [
  [0.0, rgb(1.05, 0.86, 0.52)],
  [0.29, rgb(0.6, 0.48, 0.28)],
  [0.41, rgb(0.36, 0.28, 0.16)],
  [0.574, rgb(0.19, 0.16, 0.12)],
  [0.76, rgb(0.07, 0.07, 0.08)],
  [1.0, rgb(0.03, 0.032, 0.042)],
]

/** The arc lives in SKY_COLOR and GROUND_COLOR. This is a SECOND multiplier on
 *  top, so keeping it small as well dims everything twice — which is what once
 *  turned the whole camp into black silhouettes. It rises as the sun crosses
 *  the horizon, because that is when the sky stops being fill and becomes key. */
const AMBIENT: readonly Key<number>[] = [
  [0.0, 0.55],
  [0.29, 0.52],
  [0.41, 0.5],
  [0.517, 0.68],
  [0.574, 0.8],
  [0.664, 0.8],
  [0.76, 0.62],
  [0.82, 0.38],
  [1.0, 0.25],
]

const FOG_COLOR: readonly Key<Rgb>[] = [
  [0.0, rgb(0.62, 0.7, 0.86)],
  [0.29, rgb(0.45, 0.42, 0.4)],
  [0.41, rgb(0.3, 0.25, 0.21)],
  [0.517, rgb(0.26, 0.19, 0.17)],
  [0.574, rgb(0.15, 0.15, 0.2)],
  [0.664, rgb(0.08, 0.11, 0.2)],
  [0.76, rgb(0.045, 0.065, 0.14)],
  [0.82, rgb(0.022, 0.033, 0.082)],
  [1.0, rgb(0.013, 0.019, 0.048)],
]

const FOG_DENSITY: readonly Key<number>[] = [
  [0.0, 0.0016],
  [0.41, 0.0022],
  [0.517, 0.0028],
  [0.664, 0.0042],
  [0.82, 0.0062],
  [1.0, 0.0075],
]

/** A bright afternoon needs far less exposure than a dark night. */
const EXPOSURE: readonly Key<number>[] = [
  [0.0, 0.42],
  [0.17, 0.5],
  [0.29, 0.62],
  [0.41, 0.88],
  [0.574, 0.84],
  [0.664, 0.82],
  [0.76, 0.66],
  [0.82, 0.52],
  [1.0, 0.42],
]

/** Vertical Mie depth and aureole gain — the haze that makes a daytime horizon
 *  whiten and the sun wear a glare. */
const HAZE: readonly Key<number>[] = [
  [0.0, 0.115],
  [0.29, 0.145],
  [0.456, 0.17],
]
const MIE_GAIN: readonly Key<number>[] = [
  [0.0, 0.9],
  [0.29, 1.5],
  [0.456, 2.4],
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

  sampleColor(ZENITH, p, out.zenith)
  sampleColor(HORIZON, p, out.horizon)
  sampleColor(SUN_DISC, p, out.sunDisc)
  out.haze = sampleNumber(HAZE, p)
  out.mieGain = sampleNumber(MIE_GAIN, p)

  // The ger seals itself as the cold comes down: the crown is covered and the
  // wall skirt is rolled back to the ground, both on sun elevation so they can
  // never disagree with the sky.
  out.urkh = clamp((-elevation - 3) / 7, 0, 1)
  out.khayaaRoll = 0.24 * (1 - clamp((-elevation - 1) / 8, 0, 1))

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
    zenith: rgb(0, 0, 0),
    horizon: rgb(0, 0, 0),
    sunDisc: rgb(0, 0, 0),
    haze: 0.115,
    mieGain: 0.9,
    urkh: 0,
    khayaaRoll: 0.24,
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
  // 47.886 N, about 20 August: the sun is at +25 around 16:20 and reaches
  // astronomical night at about 22:35. Derived from the same elevation table
  // the sky reads, so the clock and the light cannot drift apart.
  const minutes = sampleNumber(
    [
      [0.0, 16 * 60 + 20],
      [0.05, 16 * 60 + 34],
      [0.17, 17 * 60 + 28],
      [0.29, 18 * 60 + 26],
      [0.41, 19 * 60 + 21],
      [0.52, 20 * 60 + 6],
      [0.62, 20 * 60 + 29],
      [0.72, 20 * 60 + 46],
      [0.85, 21 * 60 + 32],
      [0.95, 22 * 60 + 19],
      [1.0, 22 * 60 + 35],
    ],
    clamp(t, 0, 1)
  )
  const h = Math.floor(minutes / 60)
  const m = Math.floor(minutes % 60)
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`
}
