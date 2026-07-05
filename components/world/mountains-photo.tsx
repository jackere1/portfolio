"use client"

import { useMemo, useRef } from "react"
import { useTexture } from "@react-three/drei"
import { useFrame, useThree } from "@react-three/fiber"
import * as THREE from "three"
import { useScrollStore } from "@/hooks/use-scroll-store"
import { HAZE } from "@/lib/surface-light"

// The distant mountains — a real CC0 photograph of misty layered ridges
// (public/textures/mountains), mapped onto a CURVED band wrapping the camera (not
// a flat plane), so every tree stays upright and the ridgeline stays level right
// out to the edges of any viewport — no keystone, no visible plane edges. Its
// bright fog is luminance-keyed to transparent, so the procedural sunset sky
// shows THROUGH the ridges (the photo's haze becomes real aerial perspective).
// The dark forest tones are graded gently into golden hour, keeping the photo's
// detail. One draw call, zero per-frame computation beyond riding the camera.

const MAP_URL = "/textures/mountains/misty-ridges.jpg"
useTexture.preload(MAP_URL)

const R = 88 // backdrop distance (camera sits at the arc's centre)
const HALF_ARC = 1.4 // ~80° each side → 160° total, clears ultrawide
const Y_BOTTOM = -52 // forest base, well below the horizon (hidden by grass/ground)
const Y_TOP = 86 // mist top, up into the sky (keyed transparent) — ~16:9 on the arc
const SEGS = 96

function makeArc(): THREE.BufferGeometry {
  const positions: number[] = []
  const uvs: number[] = []
  const indices: number[] = []
  for (let i = 0; i <= SEGS; i++) {
    const a = -HALF_ARC + (i / SEGS) * 2 * HALF_ARC
    const x = R * Math.sin(a)
    const z = -R * Math.cos(a) // a=0 → straight ahead (−z)
    const u = i / SEGS
    positions.push(x, Y_BOTTOM, z)
    uvs.push(u, 0)
    positions.push(x, Y_TOP, z)
    uvs.push(u, 1)
  }
  for (let i = 0; i < SEGS; i++) {
    const a = i * 2, b = i * 2 + 1, c = (i + 1) * 2, d = (i + 1) * 2 + 1
    indices.push(a, b, c, c, b, d)
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3))
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2))
  g.setIndex(indices)
  return g
}

const VERT = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const FRAG = /* glsl */ `
  precision mediump float;
  uniform sampler2D uMap;
  uniform vec3 uTint;
  uniform vec3 uHaze;
  uniform float uSunU;
  uniform float uOpacity;
  varying vec2 vUv;
  void main() {
    // Keep the actual PHOTOGRAPH — no posterizing ramp. A gentle golden-hour grade
    // with a local-contrast lift so the trees stay crisp rather than washing to fog.
    vec3 tex = texture2D(uMap, vUv).rgb;
    float lum = dot(tex, vec3(0.299, 0.587, 0.114));
    float g = dot(tex, vec3(0.333));
    vec3 col = mix(vec3(g), tex, 0.92);
    col = (col - 0.5) * 1.38 + 0.48;              // strong contrast → cut the fog, crisp trees
    col *= uTint;                                  // warm grade
    float sunProx = exp(-pow((vUv.x - uSunU) * 2.0, 2.0));
    col += uTint * (sunProx * 0.24 * lum);         // warm lift toward the sun
    col = mix(col, uHaze, smoothstep(0.74, 0.98, lum) * 0.28); // only the very brightest mist

    // Sky key: more of the bright mist becomes transparent → distinct ridges with
    // sky between them instead of a solid fog wall.
    float alpha = (1.0 - smoothstep(0.60, 0.84, lum)) * uOpacity;
    if (alpha < 0.01) discard;
    gl_FragColor = vec4(col, alpha);
  }
`

const smoothstep = (e0: number, e1: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)))
  return t * t * (3 - 2 * t)
}

export function MountainsPhoto() {
  const map = useTexture(MAP_URL)
  const { camera } = useThree()
  const meshRef = useRef<THREE.Mesh>(null)
  const matRef = useRef<THREE.ShaderMaterial>(null)
  const geo = useMemo(() => makeArc(), [])
  useMemo(() => {
    map.colorSpace = THREE.SRGBColorSpace
    map.wrapS = map.wrapT = THREE.ClampToEdgeWrapping
  }, [map])

  const uniforms = useMemo(
    () => ({
      uMap: { value: map },
      uTint: { value: new THREE.Color("#ffddb2") },
      uHaze: { value: new THREE.Color(HAZE) },
      uSunU: { value: 0.5 },
      uOpacity: { value: 1 },
    }),
    [map]
  )

  useFrame(() => {
    const m = meshRef.current
    if (m) {
      // Ride the camera horizontally so the curved backdrop is always centred and
      // its edges never swing into frame; distance stays fixed (it's the far view).
      m.position.x = camera.position.x
      m.position.z = camera.position.z
    }
    const mat = matRef.current
    if (mat) {
      mat.uniforms.uOpacity.value =
        1 - smoothstep(0.12, 0.26, useScrollStore.getState().progress)
    }
  })

  return (
    <mesh ref={meshRef} geometry={geo} renderOrder={-1}>
      <shaderMaterial
        ref={matRef}
        uniforms={uniforms}
        vertexShader={VERT}
        fragmentShader={FRAG}
        side={THREE.DoubleSide}
        transparent
        depthWrite={false}
        fog={false}
      />
    </mesh>
  )
}
