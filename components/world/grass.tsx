"use client"

import { useMemo } from "react"
import { useFrame, useThree } from "@react-three/fiber"
import * as THREE from "three"
import { makeRng } from "@/lib/prng"
import { journey } from "@/hooks/use-journey"
import { createSunState, writeSunState } from "@/lib/sun-arc"
import { useGpuTier } from "@/hooks/use-gpu-tier"
import { useReducedMotion } from "@/hooks/use-reduced-motion"
import {
  getTerrainMap,
  MAP_EXTENT,
  MAP_RES,
  TERRAIN_MAP_GLSL,
} from "@/lib/terrain-maps"

// The field.
//
// Blades are placed once in a square tile and then WRAPPED toroidally around
// the camera in the vertex shader: a blade's world position is its offset plus
// whole multiples of the tile. As the camera travels, a blade jumps by exactly
// one tile — and it can only do that at the tile boundary, which is past the
// fade, where it is already invisible.
//
// The earlier version snapped the whole field to a 2 m grid instead. That
// teleported every blade at once every two metres of travel, re-sampling the
// density mask underneath them, so blades visibly popped in and out while you
// scrolled.
//
// The term that matters is the backlight translucency in the fragment shader:
// at dusk, grass is not a diffuse surface, it is a screen. Light comes THROUGH
// it. Take that term out and stop 01 is a field of grey sticks.

const BLADE_SEGMENTS = 4

function buildBladeGeometry(): THREE.BufferGeometry {
  // A tapered strip that closes to a point: 2 verts per rung, plus the tip.
  const positions: number[] = []
  const uvs: number[] = []
  const indices: number[] = []

  for (let i = 0; i < BLADE_SEGMENTS; i++) {
    const v = i / BLADE_SEGMENTS
    // Width tapers toward the tip, but not linearly — a blade keeps its body
    // most of the way up and then closes quickly.
    const w = 0.5 * (1 - Math.pow(v, 1.7))
    positions.push(-w, v, 0, w, v, 0)
    uvs.push(0, v, 1, v)
  }
  positions.push(0, 1, 0)
  uvs.push(0.5, 1)

  for (let i = 0; i < BLADE_SEGMENTS - 1; i++) {
    const a = i * 2
    indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2)
  }
  const last = (BLADE_SEGMENTS - 1) * 2
  indices.push(last, last + 1, BLADE_SEGMENTS * 2)

  const geo = new THREE.BufferGeometry()
  geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3))
  geo.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2))
  geo.setIndex(indices)
  return geo
}

const VERT = /* glsl */ `
  precision highp float;

  ${TERRAIN_MAP_GLSL}

  attribute vec2  iOffset;
  attribute float iRot;
  attribute vec2  iScale;   // x = height, y = width
  attribute float iPhase;
  attribute float iTint;
  attribute float iClump;

  uniform float uTileSize;
  uniform vec4  uFade;      // (in0, in1, out0, out1) in metres
  uniform float uChannel;   // 0 = grazed grass (G), 1 = hard plants (A)
  uniform float uStiffness; // 1 = grass, ~0.25 = a nettle stem
  uniform float uTime;
  uniform float uWind;
  uniform vec3  uCamPos;
  uniform vec2  uWindDir;

  varying vec3  vWorld;
  varying vec3  vNormal;
  varying float vUp;        // 0 at the root, 1 at the tip
  varying float vTint;

  void main() {
    // Toroidal wrap: keep every blade within half a tile of the camera on each
    // axis, at a world position that is always the same offset within the same
    // repeating lattice. A blade only relocates when it crosses the boundary,
    // and the boundary is beyond the fade.
    vec2 tile = vec2(uTileSize);
    vec2 worldXZ = iOffset + floor((uCamPos.xz - iOffset) / tile + 0.5) * tile;

    vec4 terrain = sampleTerrain(worldXZ);
    float ground  = terrain.r;
    float density = mix(terrain.g, terrain.a, uChannel);

    // A window rather than a single falloff, so several tiles can be layered:
    // a dense one underfoot and a sparse one reaching out to the fog.
    float dist = length(worldXZ - uCamPos.xz);
    float window = smoothstep(uFade.x, uFade.y, dist) *
                   (1.0 - smoothstep(uFade.z, uFade.w, dist));

    // Dithered against the TUFT's own value, not the blade's. Every blade in a
    // clump shares iClump, so a tuft survives or dies whole. Testing per blade
    // shreds every clump into scattered stalks — which is fatal for the
    // tussocks, whose entire character is that they are dense standing clumps.
    float keep = step(1.0 - density * window, iClump);

    float height = iScale.x * keep;
    float width  = iScale.y;

    float up = position.y;
    vUp = up;
    vTint = iTint;

    // --- wind ---------------------------------------------------------------
    // Wind is a thing that TRAVELS. You see a gust arrive at the far edge of a
    // field and cross it. So the waves are functions of distance along the wind
    // direction MINUS time, with wavelengths short enough (14 m and 38 m) to fit
    // inside the field several times over — a wave longer than the field puts
    // every blade in the same phase, and the whole steppe breathes as one lung.
    //
    // And every blade gets its own phase offset in EVERY term, not just the
    // flutter, so the field is never synchronised.
    float along  = dot(worldXZ, uWindDir);
    float jitter = iPhase * 6.2831;

    float gust  = sin(along * 0.45 - uTime * 1.65 + jitter * 0.35);
    float swell = sin(along * 0.165 - uTime * 0.60 + jitter * 0.16 + 2.1);
    float micro = sin(uTime * (2.1 + fract(iPhase * 7.3) * 1.9) + jitter);

    // Grass is pushed and springs back; it does not oscillate symmetrically
    // about vertical. Bias the gust so it leans downwind and recovers.
    float gustAmt = gust * 0.5 + 0.5;

    float bend = (swell * 0.30 + gustAmt * 0.62 + micro * 0.20) * uWind * uStiffness;

    // A permanent lean: grass grows leaning with the prevailing wind, with
    // enough per-tuft variation that it never reads as combed. A woody stem
    // barely leans at all, which is half of what makes it read as not-grass.
    bend += (0.34 + (fract(iPhase * 17.3) - 0.5) * 0.42) * uStiffness;

    // Anchored at the root — quadratic in height, so the base stays planted.
    bend *= up * up;

    float c = cos(iRot);
    float s = sin(iRot);

    // Rotate the flat blade about its own axis FIRST...
    vec3 rotated = vec3(position.x * width * c, up * height, -position.x * width * s);

    // ...then bend it in WORLD space, along the wind. Bending before the
    // rotation makes each blade lean whichever way it happens to face, which
    // is a field being blown in three hundred directions at once.
    float push = bend * height * 0.55;
    rotated.x += uWindDir.x * push;
    rotated.z += uWindDir.y * push;
    // Losing a little height as it bends keeps the blade the same length.
    rotated.y -= bend * bend * height * 0.16;

    vec3 world = vec3(worldXZ.x, ground, worldXZ.y) + rotated;
    vWorld = world;

    // Face normal: the blade's own facing, tilted by how far it has been bent.
    vec3 n = normalize(vec3(s, 0.0, c) + vec3(uWindDir.x, 0.0, uWindDir.y) * bend * 0.45);
    vNormal = normalize(vec3(n.x, bend * 0.5, n.z));

    gl_Position = projectionMatrix * viewMatrix * vec4(world, 1.0);
  }
`

const FRAG = /* glsl */ `
  precision highp float;

  varying vec3  vWorld;
  varying vec3  vNormal;
  varying float vUp;
  varying float vTint;

  uniform vec3  uSunDir;
  uniform vec3  uSunColor;
  uniform float uSunIntensity;
  uniform vec3  uSkyColor;
  uniform vec3  uGroundColor;
  uniform float uAmbient;
  uniform vec3  uFogColor;
  uniform float uFogDensity;
  uniform vec3  uCamPos;
  uniform float uSpecies;   // 0 = grass, 1 = hard plants

  void main() {
    vec3 V = normalize(uCamPos - vWorld);
    vec3 L = normalize(uSunDir);
    vec3 N = normalize(vNormal);
    // A blade is a two-sided sliver; which face you see is not meaningful.
    if (dot(N, V) < 0.0) N = -N;

    // Late-summer grazed grass: gold-khaki, dry, never green. Darker at the
    // root where the sward shades itself, paler at the cropped tip.
    vec3 base = mix(
      vec3(0.115, 0.098, 0.054),
      vec3(0.44,  0.355, 0.155),
      vUp
    );
    base = mix(base, vec3(0.52, 0.44, 0.22), vTint * 0.45);
    base = mix(base, vec3(0.60, 0.545, 0.36), smoothstep(0.80, 1.0, vUp) * 0.55);

    if (uSpecies > 0.5) {
      // The ungrazed. халгай near the camp is genuinely GREEN — it is never
      // eaten and it is standing in dung-rich ground, so it is the only green
      // in a gold landscape, and it is green precisely where the animals are.
      // Further out the same layer is дэрс: a coarse, straw-coloured tussock.
      float nearCamp = 1.0 - smoothstep(9.0, 34.0, length(vWorld.xz));
      vec3 nettle = mix(vec3(0.055, 0.088, 0.036),
                        vec3(0.16, 0.26, 0.10), vUp);
      vec3 chee   = mix(vec3(0.10, 0.086, 0.05),
                        vec3(0.40, 0.34, 0.17), vUp);
      base = mix(chee, nettle, nearCamp);
      base = mix(base, base * 1.25, vTint * 0.5);
    }

    // --- direct -----------------------------------------------------------
    float ndl = max(dot(N, L), 0.0);
    vec3 lit = base * uSunColor * uSunIntensity * ndl;

    // --- THE TERM ---------------------------------------------------------
    // Light coming through the blade from behind. Masked to the upper blade,
    // because the base is buried in the sward and transmits nothing.
    //
    // It must stay GOLD. Pushed too hard it goes white, and white backlit
    // grass is wheat — the wrong crop, the wrong country, and the exact kitsch
    // tell this whole world is built to avoid.
    float back = pow(max(dot(V, -L), 0.0), 6.0);
    float thin = smoothstep(0.12, 1.0, vUp);
    // Grazing incidence along the blade: a leaf edge-on transmits far more.
    float edge = 1.0 - abs(dot(N, V));
    vec3 through = vec3(0.95, 0.60, 0.20) * back * thin *
                   (0.45 + 0.55 * edge) * uSunIntensity * 0.30;

    // --- ambient ----------------------------------------------------------
    // Hemisphere, plus a root-darkening gradient standing in for the occlusion
    // of the sward. Grass casts no shadows; it shades itself.
    float hemi = 0.5 + 0.5 * N.y;
    vec3 amb = mix(uGroundColor, uSkyColor, hemi) * uAmbient;
    float rootAo = mix(0.14, 1.0, smoothstep(0.0, 0.5, vUp));

    vec3 col = (lit + amb * base * 1.1) * rootAo + through;

    // --- fog --------------------------------------------------------------
    float d = length(uCamPos - vWorld);
    float fogAmt = 1.0 - exp(-uFogDensity * uFogDensity * d * d);
    col = mix(col, uFogColor, clamp(fogAmt, 0.0, 1.0));

    gl_FragColor = vec4(max(col, 0.0), 1.0);
  }
`

interface TileProps {
  seed: string
  count: number
  /** Half-extent of the wrapping tile, in metres. */
  tileHalf: number
  /** (in0, in1, out0, out1) — the distance window this tile is visible over. */
  fade: [number, number, number, number]
  perTuft: number
  /** 0 = grazed grass (density from G), 1 = hard plants (density from A). */
  species: 0 | 1
  /** Height range in metres, [short, tall]. */
  height: [number, number]
  /** Fraction of tufts drawn from the taller class. */
  tallShare: number
  width: [number, number]
  /** 1 = grass, lower = a woody stem that barely moves. */
  stiffness: number
  spread: number
}

function GrassTile({
  seed,
  count,
  tileHalf,
  fade,
  perTuft,
  species,
  height,
  tallShare,
  width,
  stiffness,
  spread: spreadBase,
}: TileProps) {
  const camera = useThree((s) => s.camera)
  const reduced = useReducedMotion()
  const sun = useMemo(() => createSunState(), [])

  const geometry = useMemo(() => {
    const blade = buildBladeGeometry()
    const geo = new THREE.InstancedBufferGeometry()
    geo.index = blade.index
    geo.attributes.position = blade.attributes.position
    geo.attributes.uv = blade.attributes.uv
    geo.instanceCount = count

    // Seeded and clamped, as everything here is. Same field, every load.
    const rng = makeRng(seed)
    const offset = new Float32Array(count * 2)
    const rot = new Float32Array(count)
    const scale = new Float32Array(count * 2)
    const phase = new Float32Array(count)
    const tint = new Float32Array(count)
    const clump = new Float32Array(count)

    // Bunch grass grows in TUFTS with bare soil between them — it is not a
    // lawn, and scattering blades uniformly is the fastest way to make a
    // steppe read as a golf course.
    const tufts = Math.ceil(count / perTuft)
    let i = 0

    for (let t = 0; t < tufts && i < count; t++) {
      // Uniform across the tile: the wrap needs an even lattice, and density
      // is set by the tile's size rather than by clustering toward the middle.
      const cx = (rng() * 2 - 1) * tileHalf
      const cz = (rng() * 2 - 1) * tileHalf

      // Height classes, so the field has a silhouette instead of a plateau.
      const tall = rng()
      const tuftHeight =
        tall < tallShare
          ? height[1] * (0.78 + rng() * 0.42)
          : height[0] * (0.7 + rng() * 0.7)
      const tuftLean = rng()
      const tuftTint = rng()
      const tuftClump = rng()
      const spread = spreadBase * (0.6 + rng() * 0.9)

      for (let b = 0; b < perTuft && i < count; b++, i++) {
        // Blades splay out of a shared root, denser at the middle.
        const br = Math.pow(rng(), 0.6) * spread
        const ba = rng() * Math.PI * 2
        offset[i * 2] = cx + Math.cos(ba) * br
        offset[i * 2 + 1] = cz + Math.sin(ba) * br

        rot[i] = rng() * Math.PI * 2
        scale[i * 2] = tuftHeight * (0.62 + rng() * 0.55)
        scale[i * 2 + 1] = width[0] + rng() * (width[1] - width[0])

        // Sharing the tuft's phase keeps a clump moving as one thing in wind.
        phase[i] = (tuftLean + rng() * 0.22) % 1
        tint[i] = (tuftTint + rng() * 0.2) % 1
        clump[i] = tuftClump
      }
    }

    geo.setAttribute("iOffset", new THREE.InstancedBufferAttribute(offset, 2))
    geo.setAttribute("iRot", new THREE.InstancedBufferAttribute(rot, 1))
    geo.setAttribute("iScale", new THREE.InstancedBufferAttribute(scale, 2))
    geo.setAttribute("iPhase", new THREE.InstancedBufferAttribute(phase, 1))
    geo.setAttribute("iTint", new THREE.InstancedBufferAttribute(tint, 1))
    geo.setAttribute("iClump", new THREE.InstancedBufferAttribute(clump, 1))

    // The mesh is wrapped around the camera every frame, so it is never off
    // screen and must never be culled against a stale bound.
    geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e6)
    return geo
  }, [seed, count, tileHalf, perTuft, height, tallShare, width, spreadBase])

  const uniforms = useMemo(
    () => ({
      uTerrainMap: { value: getTerrainMap() },
      uMapExtent: { value: MAP_EXTENT },
      uMapRes: { value: MAP_RES },
      uTileSize: { value: tileHalf * 2 },
      uFade: { value: new THREE.Vector4(...fade) },
      uChannel: { value: species },
      uSpecies: { value: species },
      uStiffness: { value: stiffness },
      uTime: { value: 0 },
      uWind: { value: 1 },
      uCamPos: { value: new THREE.Vector3() },
      // The evening breeze, WNW-ish and constant. One direction for the whole
      // field: wind is weather, not a per-blade opinion.
      uWindDir: { value: new THREE.Vector2(0.87, 0.49).normalize() },
      uSunDir: { value: new THREE.Vector3(0, 0.05, -1) },
      uSunColor: { value: new THREE.Color(1, 0.7, 0.35) },
      uSunIntensity: { value: 3 },
      uSkyColor: { value: new THREE.Color(0.4, 0.5, 0.7) },
      uGroundColor: { value: new THREE.Color(0.3, 0.25, 0.15) },
      uAmbient: { value: 0.3 },
      uFogColor: { value: new THREE.Color(0.3, 0.25, 0.21) },
      uFogDensity: { value: 0.0022 },
    }),
    [tileHalf, fade, species, stiffness]
  )

  useFrame((_, delta) => {
    const u = uniforms
    writeSunState(sun, journey.t)

    // R3F already consumed the clock this frame; calling getDelta() again
    // returns ~0 and would freeze the wind. Use the delta we are handed.
    if (!reduced) u.uTime.value += Math.min(delta, 1 / 20)
    u.uWind.value = reduced ? 0 : 1

    u.uCamPos.value.copy(camera.position)
    u.uSunDir.value.set(sun.dirX, sun.dirY, sun.dirZ)
    u.uSunColor.value.setRGB(sun.sunColor.r, sun.sunColor.g, sun.sunColor.b)
    u.uSunIntensity.value = sun.sunIntensity
    u.uSkyColor.value.setRGB(sun.skyColor.r, sun.skyColor.g, sun.skyColor.b)
    u.uGroundColor.value.setRGB(
      sun.groundColor.r,
      sun.groundColor.g,
      sun.groundColor.b
    )
    u.uAmbient.value = sun.ambientIntensity
    u.uFogColor.value.setRGB(sun.fogColor.r, sun.fogColor.g, sun.fogColor.b)
    u.uFogDensity.value = sun.fogDensity
  })

  return (
    <mesh geometry={geometry} frustumCulled={false} renderOrder={1}>
      <shaderMaterial
        vertexShader={VERT}
        fragmentShader={FRAG}
        uniforms={uniforms}
        side={THREE.DoubleSide}
        fog={false}
        toneMapped={false}
      />
    </mesh>
  )
}

/**
 * Three layers, and the proportions are the point.
 *
 * There is almost no tall grass around a Mongolian camp: the herd eats it. The
 * ground is cropped to stubble and bald soil for hundreds of metres, and it
 * stays that way while the family is camped there. So the two grass layers are
 * SHORT — ankle height, patchy, with bare ground showing through everywhere.
 *
 * Everything that stands tall is something nothing will eat: халгай, which
 * follows the dung and is therefore the only green thing in a gold landscape,
 * and дэрс further out. They come from their own density channel and their own
 * stiffness, because a woody stem does not ripple like a blade.
 */
export function Vegetation() {
  const { quality } = useGpuTier()

  const [near, far, hard] = useMemo(() => {
    if (quality.textureMaps.length === 0) return [40_000, 40_000, 12_000]
    return quality.textureSize >= 1024
      ? [165_000, 150_000, 68_000]
      : [80_000, 70_000, 32_000]
  }, [quality])

  return (
    <>
      {/* Grazed stubble, close in. Short, dense where it survives at all. */}
      <GrassTile
        seed="ailchin-graze-near"
        count={near}
        tileHalf={20}
        fade={[-1, 0, 15, 20]}
        perTuft={7}
        species={0}
        height={[0.11, 0.3]}
        tallShare={0.2}
        width={[0.01, 0.018]}
        stiffness={1}
        spread={0.075}
      />
      {/* The same sward, thinning out toward the fog. */}
      <GrassTile
        seed="ailchin-graze-far"
        count={far}
        tileHalf={58}
        fade={[12, 19, 44, 58]}
        perTuft={5}
        species={0}
        height={[0.12, 0.32]}
        tallShare={0.18}
        width={[0.014, 0.026]}
        stiffness={1}
        spread={0.09}
      />
      {/* The ungrazed: халгай near the dung, дэрс out on the open ground.
          These carry every tall silhouette in the world. */}
      <GrassTile
        seed="ailchin-hardplants"
        count={hard}
        tileHalf={60}
        fade={[-1, 0, 44, 60]}
        perTuft={20}
        species={1}
        height={[0.46, 1.05]}
        tallShare={0.45}
        width={[0.02, 0.042]}
        stiffness={0.28}
        spread={0.11}
      />
    </>
  )
}
