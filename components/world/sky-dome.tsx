"use client"

import { useMemo, useRef } from "react"
import { useFrame, useThree } from "@react-three/fiber"
import * as THREE from "three"
import { useScrollStore } from "@/hooks/use-scroll-store"

/**
 * The eternal blue sky over the steppe — a cheap gradient dome that rides the
 * camera and fades to nothing as the shaft walls close in underground. Deep blue
 * at the zenith, paling to a hazed horizon, with a soft high sun. A few lines of
 * shader beats a full atmosphere model, and it melts into the scene fog at the
 * ridge line so hills and sky are one continuous air.
 */
const VERT = /* glsl */ `
  varying vec3 vDir;
  void main() {
    vDir = normalize(position);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const FRAG = /* glsl */ `
  uniform vec3 uZenith;
  uniform vec3 uHorizon;
  uniform vec3 uLow;
  uniform vec3 uFog;
  uniform vec3 uSunDir;
  uniform vec3 uSunCore;
  uniform vec3 uSunHaze;
  uniform float uOpacity;
  varying vec3 vDir;
  void main() {
    vec3 dir = normalize(vDir);
    float h = dir.y;                        // -1 down .. +1 up
    vec3 up = mix(uHorizon, uZenith, smoothstep(0.02, 0.60, h));
    vec3 col = mix(uLow, up, smoothstep(-0.25, 0.05, h));
    // Distant hills sit at the fog limit and render as pure fog; the sky band
    // just above them meets that same color, so ridge lines melt into the haze
    // instead of banding against it.
    float melt = (1.0 - smoothstep(0.0, 0.20, abs(h))) * 0.85;
    col = mix(col, uFog, melt);
    // The sun, after the melt so it still warms the sky toward it: a broad soft
    // halo, a brighter inner glow, then a bright disc — it shines, never a flat
    // white dot. Additive over the blue.
    float s = max(dot(dir, uSunDir), 0.0);
    col += uSunHaze * pow(s, 3.5);
    col += uSunHaze * 1.4 * pow(s, 22.0);
    col += uSunCore * pow(s, 350.0);
    gl_FragColor = vec4(col, uOpacity);
  }
`

const smoothstep = (e0: number, e1: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)))
  return t * t * (3 - 2 * t)
}

export function SkyDome() {
  const { camera } = useThree()
  const meshRef = useRef<THREE.Mesh>(null)
  const matRef = useRef<THREE.ShaderMaterial>(null)

  const uniforms = useMemo(
    () => ({
      uZenith: { value: new THREE.Color("#2f6bb8") },
      uHorizon: { value: new THREE.Color("#a8c6de") },
      uLow: { value: new THREE.Color("#b6c9d6") },
      // Must match FOG[0] in components/experience/environment.tsx — the sky
      // above the ridge line and the haze on the hills are the same air.
      uFog: { value: new THREE.Color("#aec6da") },
      // Must match KEY_POS[0] in components/experience/environment.tsx — the
      // dome's sun and the scene's key light are the same high daytime sun,
      // placed up-front so it actually shows in the porthole and lights the
      // faces the camera sees.
      uSunDir: { value: new THREE.Vector3(4, 12, -5).normalize() },
      uSunCore: { value: new THREE.Color("#fff6e2").multiplyScalar(0.7) },
      uSunHaze: { value: new THREE.Color("#eaf1f7").multiplyScalar(0.3) },
      uOpacity: { value: 1 },
    }),
    []
  )

  useFrame(() => {
    const p = useScrollStore.getState().progress
    // Open at the surface; gone by the time the walls have formed.
    uniforms.uOpacity.value = 1 - smoothstep(0.12, 0.3, p)
    if (meshRef.current) meshRef.current.position.copy(camera.position)
  })

  return (
    <mesh ref={meshRef} renderOrder={-1}>
      <sphereGeometry args={[80, 32, 16]} />
      <shaderMaterial
        ref={matRef}
        uniforms={uniforms}
        vertexShader={VERT}
        fragmentShader={FRAG}
        side={THREE.BackSide}
        transparent
        depthWrite={false}
        fog={false}
      />
    </mesh>
  )
}
