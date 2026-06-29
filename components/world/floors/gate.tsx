"use client"

import { useEffect, useMemo, useRef } from "react"
import { useFrame } from "@react-three/fiber"
import * as THREE from "three"
import { useReducedMotion } from "@/hooks/use-reduced-motion"
import { useGpuTier } from "@/hooks/use-gpu-tier"
import { makeRng, seededRange } from "@/lib/prng"
import { PbrMaterial } from "@/lib/textures"
import type { FloorProps } from "@/lib/floors"

const barMat = {
  color: "#d89018",
  emissive: "#e8a020",
  emissiveIntensity: 0.45,
  metalness: 0.8,
  roughness: 0.35,
} as const

// A unit blade: a thin upright quad whose base sits at y=0, tip at y=1, so an
// instance can pivot at its root (sway = rotation about Z) and scale its height.
function bladeGeometry() {
  const g = new THREE.PlaneGeometry(0.06, 1, 1, 1)
  g.translate(0, 0.5, 0)
  return g
}

interface Blade {
  x: number
  z: number
  h: number
  lean: number
  phase: number
  speed: number
  amp: number
}

interface Hill {
  x: number
  z: number
  r: number
}

/**
 * Gate — the surface. The Mongolian steppe at dawn, and the building's entrance
 * gate standing on it: a barred lock sealed at the centre. The gate still refuses
 * (it never opens) — but the elevator takes you down instead of through. This is
 * the bright, drifting surface; the grass sways (seeded, clamped); below it the
 * world locks.
 */
export function FloorGate({ yTop, yBottom, yCenter }: FloorProps) {
  const reduced = useReducedMotion()
  const { quality } = useGpuTier()
  const gateRef = useRef<THREE.Group>(null)
  const grassRef = useRef<THREE.InstancedMesh>(null)
  const dummy = useMemo(() => new THREE.Object3D(), [])
  const geo = useMemo(() => bladeGeometry(), [])

  const groundY = yBottom

  const bladeCount =
    quality.geometryDetail === "full"
      ? 900
      : quality.geometryDetail === "reduced"
        ? 280
        : 0

  const blades = useMemo<Blade[]>(() => {
    const rng = makeRng("floor-gate-grass")
    return Array.from({ length: bladeCount }, () => ({
      // Dense in the foreground (toward the camera), thinning into the field.
      x: seededRange(rng, -7, 7),
      z: seededRange(rng, -2.5, 4.2),
      h: seededRange(rng, 0.28, 0.7),
      lean: seededRange(rng, -0.18, 0.18),
      phase: seededRange(rng, 0, Math.PI * 2),
      speed: seededRange(rng, 0.6, 1.2),
      amp: seededRange(rng, 0.05, 0.12),
    }))
  }, [bladeCount])

  const hills = useMemo<Hill[]>(() => {
    const rng = makeRng("floor-gate-hills")
    return Array.from({ length: 5 }, (_, i) => ({
      x: seededRange(rng, -22, 22),
      z: -22 - i * 5 - seededRange(rng, 0, 6),
      r: seededRange(rng, 9, 16),
    }))
  }, [])

  // Write the resting grass after mount (and keep it so under reduced motion).
  useEffect(() => {
    if (!grassRef.current) return
    for (let i = 0; i < blades.length; i++) {
      const b = blades[i]
      dummy.position.set(b.x, groundY, b.z)
      dummy.rotation.set(0, 0, b.lean)
      dummy.scale.set(1, b.h, 1)
      dummy.updateMatrix()
      grassRef.current.setMatrixAt(i, dummy.matrix)
    }
    grassRef.current.instanceMatrix.needsUpdate = true
  }, [blades, groundY, dummy])

  useFrame((state) => {
    const t = state.clock.elapsedTime

    // The gate's faint mechanical hum — pressure against a thing that holds.
    if (gateRef.current && !reduced) {
      gateRef.current.position.y = yCenter + Math.sin(t * 2.2) * 0.025
    }

    // Grass drift — the surface is allowed to guess; bounded, seeded sway.
    if (grassRef.current && !reduced) {
      for (let i = 0; i < blades.length; i++) {
        const b = blades[i]
        dummy.position.set(b.x, groundY, b.z)
        dummy.rotation.set(0, 0, b.lean + Math.sin(t * b.speed + b.phase) * b.amp)
        dummy.scale.set(1, b.h, 1)
        dummy.updateMatrix()
        grassRef.current.setMatrixAt(i, dummy.matrix)
      }
      grassRef.current.instanceMatrix.needsUpdate = true
    }
  })

  const W = 7
  const H = Math.min(yTop - yBottom + 1.5, 5)

  return (
    <group>
      {/* The steppe — a wide ground plane receding to the dawn horizon. */}
      <mesh position={[0, groundY, -22]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[70, 66]} />
        <PbrMaterial
          name="steppe-grass"
          repeat={[18, 18]}
          tint="#d8c89a"
          flatColor="#5a6a3a"
          flatRoughness={0.95}
        />
      </mesh>

      {/* Rolling hills on the horizon — caps of flattened spheres. */}
      {hills.map((h, i) => (
        <mesh key={i} position={[h.x, groundY - h.r * 0.16, h.z]} scale={[1, 0.26, 1]}>
          <sphereGeometry args={[h.r, 20, 12]} />
          <meshStandardMaterial color="#373221" roughness={1} metalness={0} />
        </mesh>
      ))}

      {/* Grass — instanced blades, seeded layout, clamped sway. */}
      {bladeCount > 0 && (
        <instancedMesh
          ref={grassRef}
          args={[geo, undefined, bladeCount]}
          frustumCulled={false}
        >
          <meshStandardMaterial
            color="#7e7a3e"
            roughness={0.9}
            metalness={0}
            side={THREE.DoubleSide}
          />
        </instancedMesh>
      )}

      {/* Two gateposts framing the entrance — brushed metal on its bedrock. */}
      {[-W / 2 - 0.5, W / 2 + 0.5].map((x, i) => (
        <mesh key={i} position={[x, groundY + H / 2, 0]}>
          <boxGeometry args={[0.5, H + 0.6, 0.5]} />
          <PbrMaterial
            name="brushed-metal"
            repeat={[1, 3]}
            tint="#c9bca4"
            flatColor="#2a2620"
            metalness={0.85}
            flatRoughness={0.5}
            emissive="#e8a020"
            emissiveIntensity={0.08}
          />
        </mesh>
      ))}

      {/* The gate itself — a portcullis of bars, sealed at the centre. It holds. */}
      <group ref={gateRef} position={[0, yCenter, 0]}>
        {Array.from({ length: 7 }).map((_, i) => {
          const x = -W / 2 + (i / 6) * W
          return (
            <mesh key={`v${i}`} position={[x, 0, 0]}>
              <boxGeometry args={[0.12, H, 0.12]} />
              <meshStandardMaterial {...barMat} />
            </mesh>
          )
        })}
        {Array.from({ length: 5 }).map((_, i) => {
          const y = -H / 2 + (i / 4) * H
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
    </group>
  )
}
