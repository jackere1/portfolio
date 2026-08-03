"use client"

import { useMemo, useRef } from "react"
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
// Blades live on a fixed local patch that rides a SNAPPED copy of the camera's
// position, so the world never swims underfoot, and they ground themselves
// against the same baked height map the terrain mesh is built from.
//
// The term that matters is the backlight translucency in the fragment shader:
// at dusk, grass is not a diffuse surface, it is a screen. Light comes THROUGH
// it. Take that term out and stop 01 is a field of grey sticks.

const FIELD_RADIUS = 58
/** Camera position is snapped to this grid so blades never crawl. */
const SNAP = 2.0
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
  geo.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(positions, 3)
  )
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

  uniform vec2  uFieldOrigin;
  uniform float uTime;
  uniform float uWind;
  uniform vec3  uCamPos;
  uniform float uFieldRadius;
  uniform vec2  uWindDir;

  varying vec3  vWorld;
  varying vec3  vNormal;
  varying float vUp;        // 0 at the root, 1 at the tip
  varying float vTint;
  varying float vGround;    // terrain-up, for the hemisphere term

  void main() {
    vec2 worldXZ = uFieldOrigin + iOffset;
    vec4 terrain = sampleTerrain(worldXZ);
    float ground  = terrain.r;
    float density = terrain.g;

    // Dithered radial falloff: instead of a hard edge, blades drop out
    // individually as they get far, which reads as thinning rather than a wall.
    float dist = length(worldXZ - uCamPos.xz);
    float radial = 1.0 - smoothstep(uFieldRadius * 0.74, uFieldRadius, dist);
    float keep = step(1.0 - density * radial, fract(iPhase * 91.7));

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
    // flutter, so the field is never synchronised — least of all at t = 0,
    // where a shared starting phase is most obvious.
    float along  = dot(worldXZ, uWindDir);
    float jitter = iPhase * 6.2831;

    float gust  = sin(along * 0.45 - uTime * 1.65 + jitter * 0.35);
    float swell = sin(along * 0.165 - uTime * 0.60 + jitter * 0.16 + 2.1);
    // Per-blade flutter, at a per-blade RATE as well as a per-blade phase.
    float micro = sin(uTime * (2.1 + fract(iPhase * 7.3) * 1.9) + jitter);

    // Grass is pushed and springs back; it does not oscillate symmetrically
    // about vertical. Bias the gust so it leans downwind and recovers.
    float gustAmt = gust * 0.5 + 0.5;

    float bend = (swell * 0.30 + gustAmt * 0.62 + micro * 0.20) * uWind;

    // A permanent lean: grass grows leaning with the prevailing wind, with
    // enough per-tuft variation that it never reads as combed.
    bend += 0.34 + (fract(iPhase * 17.3) - 0.5) * 0.42;

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
    vGround = 1.0;

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

  void main() {
    vec3 V = normalize(uCamPos - vWorld);
    vec3 L = normalize(uSunDir);
    vec3 N = normalize(vNormal);
    // A blade is a two-sided sliver; which face you see is not meaningful.
    if (dot(N, V) < 0.0) N = -N;

    // Late-summer bunch grass: gold-khaki, dry, never green. Darker at the
    // root where the sward shades itself, paler at the seed head.
    vec3 base = mix(
      vec3(0.115, 0.098, 0.054),
      vec3(0.44,  0.355, 0.155),
      vUp
    );
    base = mix(base, vec3(0.52, 0.44, 0.22), vTint * 0.45);
    // The seed head itself: Stipa carries a pale, almost silver crown.
    base = mix(base, vec3(0.60, 0.545, 0.36), smoothstep(0.80, 1.0, vUp) * 0.55);

    // --- direct -----------------------------------------------------------
    float ndl = max(dot(N, L), 0.0);
    vec3 lit = base * uSunColor * uSunIntensity * ndl;

    // --- THE TERM ---------------------------------------------------------
    // Light coming through the blade from behind. Masked to the upper blade,
    // because the base is buried in the sward and transmits nothing. This is
    // what makes the field burn gold when you look into the low sun.
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

export function Grass() {
  const { quality } = useGpuTier()
  const reduced = useReducedMotion()
  const camera = useThree((s) => s.camera)
  const matRef = useRef<THREE.ShaderMaterial>(null)
  const sun = useMemo(() => createSunState(), [])

  const count = useMemo(() => {
    if (quality.textureMaps.length === 0) return 40_000
    return quality.textureSize >= 1024 ? 330_000 : 150_000
  }, [quality])

  const geometry = useMemo(() => {
    const blade = buildBladeGeometry()
    const geo = new THREE.InstancedBufferGeometry()
    geo.index = blade.index
    geo.attributes.position = blade.attributes.position
    geo.attributes.uv = blade.attributes.uv
    geo.instanceCount = count

    // Seeded and clamped, as everything here is. Same field, every load.
    const rng = makeRng("ailchin-grass")
    const offset = new Float32Array(count * 2)
    const rot = new Float32Array(count)
    const scale = new Float32Array(count * 2)
    const phase = new Float32Array(count)
    const tint = new Float32Array(count)

    // Bunch grass grows in TUFTS with bare soil between them — it is not a
    // lawn, and scattering blades uniformly is the single fastest way to make
    // a steppe read as a golf course. Blades are placed in clumps that share a
    // centre, a height class and a lean.
    const PER_TUFT = 7
    const tufts = Math.ceil(count / PER_TUFT)
    let i = 0

    for (let c = 0; c < tufts && i < count; c++) {
      // Concentrated toward the camera: the exponent buys close-range density
      // without paying for blades the fog would have eaten anyway.
      const r = Math.pow(rng(), 0.6) * FIELD_RADIUS
      const a = rng() * Math.PI * 2
      const cx = Math.cos(a) * r
      const cz = Math.sin(a) * r

      // Height classes, so the field has a silhouette instead of a plateau.
      const tall = rng()
      const tuftHeight = tall < 0.26 ? 0.58 + rng() * 0.34 : 0.26 + rng() * 0.3
      const tuftLean = rng()
      const tuftTint = rng()
      const spread = 0.055 + rng() * 0.075

      for (let b = 0; b < PER_TUFT && i < count; b++, i++) {
        // Blades splay out of a shared root, denser at the middle.
        const br = Math.pow(rng(), 0.6) * spread
        const ba = rng() * Math.PI * 2
        offset[i * 2] = cx + Math.cos(ba) * br
        offset[i * 2 + 1] = cz + Math.sin(ba) * br

        rot[i] = rng() * Math.PI * 2

        // Far blades are widened slightly so they never alias down to nothing.
        const far = r / FIELD_RADIUS
        scale[i * 2] = tuftHeight * (0.62 + rng() * 0.55)
        scale[i * 2 + 1] = 0.009 + rng() * 0.008 + far * 0.014

        // Sharing the tuft's phase keeps a clump moving as one thing in wind.
        phase[i] = (tuftLean + rng() * 0.22) % 1
        tint[i] = (tuftTint + rng() * 0.2) % 1
      }
    }

    geo.setAttribute("iOffset", new THREE.InstancedBufferAttribute(offset, 2))
    geo.setAttribute("iRot", new THREE.InstancedBufferAttribute(rot, 1))
    geo.setAttribute("iScale", new THREE.InstancedBufferAttribute(scale, 2))
    geo.setAttribute("iPhase", new THREE.InstancedBufferAttribute(phase, 1))
    geo.setAttribute("iTint", new THREE.InstancedBufferAttribute(tint, 1))

    geo.boundingSphere = new THREE.Sphere(
      new THREE.Vector3(0, 0, 0),
      FIELD_RADIUS * 3
    )
    return geo
  }, [count])

  const uniforms = useMemo(
    () => ({
      uTerrainMap: { value: getTerrainMap() },
      uMapExtent: { value: MAP_EXTENT },
      uMapRes: { value: MAP_RES },
      uFieldOrigin: { value: new THREE.Vector2() },
      uFieldRadius: { value: FIELD_RADIUS },
      uTime: { value: 0 },
      uWind: { value: 1 },
      // The evening breeze, WNW-ish and constant. One direction for the whole
      // field: wind is weather, not a per-blade opinion.
      uWindDir: { value: new THREE.Vector2(0.87, 0.49).normalize() },
      uCamPos: { value: new THREE.Vector3() },
      uSunDir: { value: new THREE.Vector3(0, 0.05, -1) },
      uSunColor: { value: new THREE.Color(1, 0.7, 0.35) },
      uSunIntensity: { value: 3 },
      uSkyColor: { value: new THREE.Color(0.4, 0.5, 0.7) },
      uGroundColor: { value: new THREE.Color(0.3, 0.25, 0.15) },
      uAmbient: { value: 0.5 },
      uFogColor: { value: new THREE.Color(0.5, 0.44, 0.4) },
      uFogDensity: { value: 0.0022 },
    }),
    []
  )

  useFrame((_, delta) => {
    const u = uniforms
    writeSunState(sun, journey.t)

    // R3F already consumed the clock this frame; calling getDelta() again
    // returns ~0 and would freeze the wind. Use the delta we are handed.
    if (!reduced) u.uTime.value += Math.min(delta, 1 / 20)
    u.uWind.value = reduced ? 0 : 1

    u.uCamPos.value.copy(camera.position)
    u.uFieldOrigin.value.set(
      Math.round(camera.position.x / SNAP) * SNAP,
      Math.round(camera.position.z / SNAP) * SNAP
    )

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
        ref={matRef}
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
