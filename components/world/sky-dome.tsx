"use client"

import { useMemo, useRef } from "react"
import { useFrame, useThree } from "@react-three/fiber"
import * as THREE from "three"
import { useScrollStore } from "@/hooks/use-scroll-store"

/**
 * The dawn sky over the steppe — a cheap gradient dome that rides the camera and
 * fades to nothing as the shaft walls close in underground. A few lines of shader
 * beats a full atmosphere model here, and it stays tintable to the amber palette.
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
  uniform float uOpacity;
  varying vec3 vDir;
  void main() {
    float h = vDir.y;                       // -1 down .. +1 up
    vec3 up = mix(uHorizon, uZenith, smoothstep(0.0, 0.55, h));
    vec3 col = mix(uLow, up, smoothstep(-0.25, 0.05, h));
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
      uZenith: { value: new THREE.Color("#7fa6d8") },
      uHorizon: { value: new THREE.Color("#e8b478") },
      uLow: { value: new THREE.Color("#cf8a5a") },
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
