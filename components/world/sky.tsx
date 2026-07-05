"use client"

import { useMemo, useRef } from "react"
import { useFrame, useThree } from "@react-three/fiber"
import * as THREE from "three"
import { useScrollStore } from "@/hooks/use-scroll-store"
import { useReducedMotion } from "@/hooks/use-reduced-motion"
import { makeRng, seededRange } from "@/lib/prng"
import {
  SUN_DIR,
  SKY_ZENITH,
  SKY_HIGH,
  SKY_MID,
  SKY_HORIZON,
  SKY_SUN_GLOW,
  SKY_SUN_DISC,
  CLOUD_LIT,
  CLOUD_SHADOW,
} from "@/lib/surface-light"

/**
 * The sunset sky — fully procedural, zero assets, a handful of ops per pixel so it
 * runs on a software rasterizer too. A warm gradient (deep blue-violet zenith →
 * burning orange horizon), a low sun disc with a broad glow sitting down the shaft
 * where the meadow is backlit, and a few soft cloud bands drifting across the top.
 *
 * It is the surface's roof only: as the cab crosses ground level into the sealed
 * shaft the sky is faded out and switched off, so no daylight leaks into the deep.
 */

// A soft cloud field baked once to a canvas (drifting is a cheap UV scroll in the
// shader). Overlapping feathered blobs → cloudy alpha; seeded so it never differs
// between loads.
function makeCloudTexture(): THREE.Texture | null {
  if (typeof document === "undefined") return null
  const S = 256
  const c = document.createElement("canvas")
  c.width = c.height = S
  const ctx = c.getContext("2d")
  if (!ctx) return null
  ctx.fillStyle = "#000"
  ctx.fillRect(0, 0, S, S)
  ctx.globalCompositeOperation = "lighter"
  const rng = makeRng("surface-clouds")
  // Big masses for the cloud formations, then finer clumps for structure.
  const blobs = 68
  for (let i = 0; i < blobs; i++) {
    const big = i < 34
    const x = seededRange(rng, 0, S)
    const y = seededRange(rng, 0, S)
    const r = big ? seededRange(rng, 42, 96) : seededRange(rng, 12, 34)
    const a = big ? seededRange(rng, 0.1, 0.22) : seededRange(rng, 0.07, 0.17)
    // draw the blob wrapped so the texture tiles horizontally (clouds scroll in u)
    for (const dx of [-S, 0, S]) {
      const g = ctx.createRadialGradient(x + dx, y, 0, x + dx, y, r)
      g.addColorStop(0, `rgba(255,255,255,${a})`)
      g.addColorStop(1, "rgba(255,255,255,0)")
      ctx.fillStyle = g
      ctx.fillRect(x + dx - r, y - r, r * 2, r * 2)
    }
  }
  const tex = new THREE.CanvasTexture(c)
  tex.wrapS = THREE.RepeatWrapping
  tex.wrapT = THREE.RepeatWrapping
  tex.minFilter = THREE.LinearFilter
  return tex
}

const VERT = /* glsl */ `
  varying vec3 vDir;
  varying vec2 vUv;
  void main() {
    vDir = normalize(position);
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const FRAG = /* glsl */ `
  precision highp float;
  uniform vec3 uSunDir;
  uniform vec3 uZenith;
  uniform vec3 uHigh;
  uniform vec3 uMid;
  uniform vec3 uHorizon;
  uniform vec3 uSunGlow;
  uniform vec3 uSunDisc;
  uniform vec3 uCloudLit;
  uniform vec3 uCloudShadow;
  uniform sampler2D uClouds;
  uniform float uTime;
  uniform float uOpacity;
  varying vec3 vDir;

  void main() {
    vec3 dir = normalize(vDir);
    float h = dir.y;                                   // −1 down .. +1 up

    // Rich sunset gradient: burning orange at the horizon, up through a rose band
    // and a dusky purple to deep violet-blue overhead — many colours bleeding.
    vec3 col = uHorizon;
    col = mix(col, uMid,    smoothstep(-0.04, 0.11, h));
    col = mix(col, uHigh,   smoothstep(0.06, 0.34, h));
    col = mix(col, uZenith, smoothstep(0.30, 0.78, h));

    // Concentrate the warm horizon burn toward the sun's azimuth.
    float az = dot(normalize(dir.xz), normalize(uSunDir.xz));
    float horizonBurn = smoothstep(0.1, 1.0, az) * (1.0 - smoothstep(0.0, 0.30, abs(h)));
    col = mix(col, uHorizon * 1.2, horizonBurn * 0.75);

    // The sun: a TIGHTER halo so it doesn't wash the whole sky white, an inner
    // glow, and a bright disc.
    float s = max(dot(dir, uSunDir), 0.0);
    col += uSunGlow * pow(s, 9.0) * 0.5;
    col += uSunGlow * pow(s, 70.0) * 0.8;
    col += uSunDisc * pow(s, 1600.0) * 1.3;

    // Clouds: mapped by azimuth + elevation (well-defined at every angle, unlike a
    // horizon-degenerate planar projection), two scrolling octaves drifting across
    // the sky band so the formations actually read.
    float azm = atan(dir.z, dir.x) * 0.159155 + 0.5;
    vec2 cuv = vec2(azm * 3.0, h * 1.5);
    float t = uTime * 0.006;
    float c = texture2D(uClouds, cuv + vec2(t, 0.0)).r * 0.6
            + texture2D(uClouds, cuv * 2.3 + vec2(-t * 1.7, t * 0.2)).r * 0.4;
    float cmask = smoothstep(0.04, 0.14, h) * (1.0 - smoothstep(0.78, 1.05, h));
    float cd = smoothstep(0.30, 0.54, c) * cmask;
    // Dramatic sunset clouds: cooler-grey bodies that read against the warm sky,
    // brightening and warming toward the sun.
    vec3 cloudCol = mix(uCloudShadow, uCloudLit, clamp(s * 2.0, 0.0, 1.0));
    cloudCol += uCloudLit * pow(s, 2.0) * 0.7;       // bright glow near the sun
    col = mix(col, cloudCol, cd);

    gl_FragColor = vec4(col, uOpacity);
  }
`

const smoothstep = (e0: number, e1: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)))
  return t * t * (3 - 2 * t)
}

export function SurfaceSky() {
  const { camera } = useThree()
  const reduced = useReducedMotion()
  const meshRef = useRef<THREE.Mesh>(null)
  const matRef = useRef<THREE.ShaderMaterial>(null)
  const clouds = useMemo(() => makeCloudTexture(), [])

  const uniforms = useMemo(
    () => ({
      uSunDir: { value: SUN_DIR.clone() },
      uZenith: { value: new THREE.Color(SKY_ZENITH) },
      uHigh: { value: new THREE.Color(SKY_HIGH) },
      uMid: { value: new THREE.Color(SKY_MID) },
      uHorizon: { value: new THREE.Color(SKY_HORIZON) },
      uSunGlow: { value: new THREE.Color(SKY_SUN_GLOW) },
      uSunDisc: { value: new THREE.Color(SKY_SUN_DISC) },
      uCloudLit: { value: new THREE.Color(CLOUD_LIT) },
      uCloudShadow: { value: new THREE.Color(CLOUD_SHADOW) },
      uClouds: { value: clouds },
      uTime: { value: 0 },
      uOpacity: { value: 1 },
    }),
    [clouds]
  )

  useFrame((state) => {
    const p = useScrollStore.getState().progress
    const vis = p < 0.3
    if (meshRef.current) {
      meshRef.current.visible = vis
      meshRef.current.position.copy(camera.position)
    }
    if (!vis) return
    // Clouds drift — but freeze under reduced motion.
    if (!reduced) uniforms.uTime.value = state.clock.elapsedTime
    // Open at the surface; gone by the time the shaft walls have closed the frame.
    uniforms.uOpacity.value = 1 - smoothstep(0.14, 0.3, p)
  })

  return (
    <mesh ref={meshRef} renderOrder={-1}>
      <sphereGeometry args={[100, 40, 20]} />
      <shaderMaterial
        ref={matRef}
        uniforms={uniforms}
        vertexShader={VERT}
        fragmentShader={FRAG}
        side={THREE.BackSide}
        depthWrite={false}
        fog={false}
      />
    </mesh>
  )
}
