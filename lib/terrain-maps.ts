// Height and grass density, baked once into a single float texture so the grass
// vertex shader can ground and mask a quarter-million blades without the CPU
// touching any of them.
//
//   R = ground height, metres
//   G = grass density, 0..1
//   B = slope, 0..1
//   A = bare-soil amount, 0..1  (the buuts halo and the ruts)
//
// Sampled with NEAREST and bilinear-filtered by hand in the shader: float
// textures are only linearly filterable behind an extension, and a silent
// fallback to point sampling would step the grass base height by a third of a
// metre, which is very visible on a blade half a metre tall.

import * as THREE from "three"
import { heightAt, slopeAt } from "./heightfield"
import { BUUTS, TERRAIN_SIZE, TRACK_FROM, TRACK_TO } from "./world"

export const MAP_RES = 1024
/** World extent the map covers, centred on the ger. */
export const MAP_EXTENT = TERRAIN_SIZE

/** Signed lateral offset of the track's centreline — it wanders, as ruts do. */
function trackCenterAt(k: number): { x: number; z: number } {
  const x = TRACK_FROM.x + (TRACK_TO.x - TRACK_FROM.x) * k
  const z = TRACK_FROM.z + (TRACK_TO.z - TRACK_FROM.z) * k
  // A slow wander, so the corridor is never a ruled line.
  const wander = Math.sin(k * 5.1) * 5.2 + Math.sin(k * 11.7 + 1.3) * 1.9
  return { x: x + wander, z }
}

/**
 * Distance from a point to the nearer of the two ruts, in metres.
 *
 * The track is a polyline; we find the genuinely closest point on it, then
 * measure to the two hard-packed lines running 1.15 m either side of that
 * centre, with their grass median between. Measuring against every sample
 * independently (rather than the closest one) smears the ruts into broad
 * bands across the whole map, which reads as bare swathes of nothing.
 */
function distanceToRuts(x: number, z: number): number {
  const STEPS = 64
  let bestD2 = Infinity
  let bestT = 0
  let prev = trackCenterAt(0)

  for (let i = 1; i <= STEPS; i++) {
    const cur = trackCenterAt(i / STEPS)
    const vx = cur.x - prev.x
    const vz = cur.z - prev.z
    const len2 = vx * vx + vz * vz || 1
    let k = ((x - prev.x) * vx + (z - prev.z) * vz) / len2
    k = k < 0 ? 0 : k > 1 ? 1 : k
    const px = prev.x + vx * k
    const pz = prev.z + vz * k
    const d2 = (x - px) * (x - px) + (z - pz) * (z - pz)
    if (d2 < bestD2) {
      bestD2 = d2
      // Signed perpendicular offset, so the two ruts sit either side.
      const nx = -vz / Math.sqrt(len2)
      const nz = vx / Math.sqrt(len2)
      bestT = (x - px) * nx + (z - pz) * nz
    }
    prev = cur
  }

  const perp = Math.abs(bestT)
  const along = Math.sqrt(Math.max(0, bestD2 - bestT * bestT))
  // Distance to whichever rut is nearer, plus the along-track falloff so the
  // corridor genuinely ends where the track does.
  return Math.hypot(Math.abs(perp - 1.15), along)
}

function smoothstep(a: number, b: number, x: number): number {
  const k = Math.max(0, Math.min(1, (x - a) / (b - a)))
  return k * k * (3 - 2 * k)
}

let cached: THREE.DataTexture | null = null

/** Build (once) the height/density texture. Deterministic — same every load. */
export function getTerrainMap(): THREE.DataTexture {
  if (cached) return cached

  const data = new Float32Array(MAP_RES * MAP_RES * 4)
  const half = MAP_EXTENT / 2
  const step = MAP_EXTENT / (MAP_RES - 1)

  for (let j = 0; j < MAP_RES; j++) {
    const z = -half + j * step
    for (let i = 0; i < MAP_RES; i++) {
      const x = -half + i * step
      const o = (j * MAP_RES + i) * 4

      const h = heightAt(x, z)
      const slope = slopeAt(x, z)

      // The grazed halo: bare, dung-flecked, trampled ground a home wears into
      // the steppe. Grass returns as you walk out of it.
      const d = Math.hypot(x, z)
      const halo = smoothstep(BUUTS.inner, BUUTS.outer, d)

      // The ruts. No pavement, no signs, no paint — just two hard-packed lines.
      const rut = smoothstep(0.35, 1.5, distanceToRuts(x, z))

      // Steep faces hold less; the steppe's slopes are visibly thinner.
      const slopeMask = 1 - smoothstep(0.28, 0.62, slope)

      const density = halo * rut * slopeMask
      const bare = Math.max(1 - halo, 1 - rut)

      data[o] = h
      data[o + 1] = density
      data[o + 2] = slope
      data[o + 3] = bare
    }
  }

  const tex = new THREE.DataTexture(
    data,
    MAP_RES,
    MAP_RES,
    THREE.RGBAFormat,
    THREE.FloatType
  )
  tex.magFilter = THREE.NearestFilter
  tex.minFilter = THREE.NearestFilter
  tex.wrapS = THREE.ClampToEdgeWrapping
  tex.wrapT = THREE.ClampToEdgeWrapping
  tex.generateMipmaps = false
  tex.needsUpdate = true

  cached = tex
  return tex
}

/** GLSL for sampling the map. Shared verbatim by the grass and the ground so
 *  the two can never disagree about where the surface is. */
export const TERRAIN_MAP_GLSL = /* glsl */ `
  uniform sampler2D uTerrainMap;
  uniform float uMapExtent;
  uniform float uMapRes;

  vec4 sampleTerrainRaw(vec2 uv) {
    return texture2D(uTerrainMap, uv);
  }

  // Manual bilinear: the map is NEAREST-filtered on purpose (see terrain-maps.ts).
  vec4 sampleTerrain(vec2 worldXZ) {
    vec2 uv = worldXZ / uMapExtent + 0.5;
    uv = clamp(uv, vec2(0.5 / uMapRes), vec2(1.0 - 0.5 / uMapRes));

    vec2 texel = vec2(1.0 / uMapRes);
    vec2 f = fract(uv * uMapRes - 0.5);
    vec2 base = (floor(uv * uMapRes - 0.5) + 0.5) * texel;

    vec4 s00 = texture2D(uTerrainMap, base);
    vec4 s10 = texture2D(uTerrainMap, base + vec2(texel.x, 0.0));
    vec4 s01 = texture2D(uTerrainMap, base + vec2(0.0, texel.y));
    vec4 s11 = texture2D(uTerrainMap, base + texel);

    return mix(mix(s00, s10, f.x), mix(s01, s11, f.x), f.y);
  }
`
