import { useRef } from "react"
import { useFrame } from "@react-three/fiber"
import * as THREE from "three"
import { useReducedMotion } from "@/hooks/use-reduced-motion"
import type { FloorProps } from "@/lib/floors"

const barMat = {
  color: "#d89018",
  emissive: "#e8a020",
  emissiveIntensity: 0.45,
  metalness: 0.8,
  roughness: 0.35,
} as const

/**
 * Gate — a gate that won't let me through. A portcullis of bars blocking the
 * shaft aperture, sealed at the centre. It hums but never opens.
 */
export function FloorGate({ yCenter, height }: FloorProps) {
  const groupRef = useRef<THREE.Group>(null)
  const reduced = useReducedMotion()

  const W = 7
  const H = Math.min(height + 1.5, 5.2)
  const verticals = 7
  const horizontals = 5

  useFrame((state) => {
    if (!groupRef.current || reduced) return
    // A faint mechanical hum — pressure against a thing that holds.
    groupRef.current.position.y =
      yCenter + Math.sin(state.clock.elapsedTime * 2.2) * 0.025
  })

  return (
    <group ref={groupRef} position={[0, yCenter, 0]}>
      {Array.from({ length: verticals }).map((_, i) => {
        const x = -W / 2 + (i / (verticals - 1)) * W
        return (
          <mesh key={`v${i}`} position={[x, 0, 0]}>
            <boxGeometry args={[0.12, H, 0.12]} />
            <meshStandardMaterial {...barMat} />
          </mesh>
        )
      })}
      {Array.from({ length: horizontals }).map((_, i) => {
        const y = -H / 2 + (i / (horizontals - 1)) * H
        return (
          <mesh key={`h${i}`} position={[0, y, 0]}>
            <boxGeometry args={[W, 0.12, 0.12]} />
            <meshStandardMaterial {...barMat} />
          </mesh>
        )
      })}

      {/* The seal at the centre */}
      <mesh position={[0, 0, 0.22]}>
        <boxGeometry args={[1.2, 1.2, 0.35]} />
        <meshStandardMaterial
          color="#2a1f10"
          emissive="#e8a020"
          emissiveIntensity={0.4}
          metalness={0.85}
          roughness={0.3}
        />
      </mesh>
      {/* The lock — cool blue: not permitted through */}
      <mesh position={[0, 0, 0.45]}>
        <torusGeometry args={[0.34, 0.07, 10, 28]} />
        <meshStandardMaterial
          color="#4060c0"
          emissive="#4060c0"
          emissiveIntensity={0.9}
          metalness={0.6}
          roughness={0.3}
        />
      </mesh>
    </group>
  )
}
