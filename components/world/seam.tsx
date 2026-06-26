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
 * the Boundary room), a faint luminous membrane when seen at an angle. Soft
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
      : Math.sin(t * 1.2) * 0.05 + Math.min(0.25, velocity * 60)
    coreRef.current.opacity = 0.3 + pulse
  })

  return (
    <group position={[0, SEAM_Y, 0]}>
      {/* Faint membrane — the glow between the two regions. */}
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[70, 70]} />
        <meshBasicMaterial
          color="#4f7bdc"
          transparent
          opacity={0.05}
          side={THREE.DoubleSide}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* The crisp seam — a thin slab; a bright line seen edge-on. */}
      <mesh>
        <boxGeometry args={[70, 0.05, 70]} />
        <meshBasicMaterial
          ref={coreRef}
          color="#5b86e8"
          transparent
          opacity={0.3}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
    </group>
  )
}
