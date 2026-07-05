"use client"

import { useRef } from "react"
import { useFrame } from "@react-three/fiber"
import * as THREE from "three"
import { SEAM_Y } from "@/lib/world-config"
import { useScrollStore } from "@/hooks/use-scroll-store"
import { useReducedMotion } from "@/hooks/use-reduced-motion"

/**
 * The seam — the world-space boundary the camera crosses once. A thin cool-blue
 * slab at y = SEAM_Y: razor-sharp edge-on (it lines up with the held line in
 * the Threshold room), a faint luminous membrane when seen at an angle. Soft
 * additive core, no hard 1-texel edge, so it never shimmers.
 */
export function Seam() {
  const coreRef = useRef<THREE.MeshBasicMaterial>(null)
  const reduced = useReducedMotion()
  const velocity = useScrollStore((s) => s.velocity)

  useFrame((state) => {
    if (!coreRef.current) return
    const t = state.clock.elapsedTime
    const pulse = reduced
      ? 0
      : Math.sin(t * 1.2) * 0.08 + Math.min(0.3, velocity * 60)
    coreRef.current.opacity = 0.6 + pulse
  })

  return (
    <group position={[0, SEAM_Y, 0]}>
      {/* The seam — a thin horizontal beam, not a plane: a crisp line that marks
          the boundary from any angle and never washes the view. */}
      <mesh>
        <boxGeometry args={[140, 0.06, 0.06]} />
        <meshBasicMaterial
          ref={coreRef}
          color="#6a93f0"
          transparent
          opacity={0.75}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
    </group>
  )
}
