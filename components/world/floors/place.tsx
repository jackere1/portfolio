"use client"

import { useMemo } from "react"
import { makeRng, seededRange } from "@/lib/prng"
import { PbrMaterial } from "@/lib/textures"
import type { FloorProps } from "@/lib/floors"

interface Block {
  x: number
  z: number
  w: number
  d: number
  h: number
  lit: boolean
  cool: boolean
}

/**
 * Place — the basement foundation. Raw concrete bedrock, structural and honest,
 * the part not permitted to lie; the colophon opens from here. On the slab sits
 * Ulaanbaatar at night — a low silhouette of blocks and ger roofs, the city the
 * whole descent rests on, the work that only matters here.
 */
export function FloorPlace({ yTop, yBottom }: FloorProps) {
  const floorY = yBottom
  const ceilY = yTop
  const colH = ceilY - floorY

  const blocks = useMemo<Block[]>(() => {
    const rng = makeRng("floor-place")
    return Array.from({ length: 40 }, () => ({
      x: seededRange(rng, -3.6, 3.6),
      z: seededRange(rng, -3.8, 0.6),
      w: seededRange(rng, 0.26, 0.7),
      d: seededRange(rng, 0.26, 0.7),
      h: seededRange(rng, 0.4, 2.1),
      lit: rng() > 0.45,
      cool: rng() > 0.72,
    }))
  }, [])

  const gers = useMemo(() => {
    const rng = makeRng("floor-place-ger")
    return Array.from({ length: 9 }, () => ({
      x: seededRange(rng, -3.6, 3.6),
      z: seededRange(rng, -0.2, 1.4),
      r: seededRange(rng, 0.2, 0.36),
    }))
  }, [])

  const cityBase = floorY + 0.02

  return (
    <group>
      {/* The concrete foundation slab — the hero surface. */}
      <mesh position={[0, floorY, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[10, 10]} />
        <PbrMaterial
          name="concrete-foundation"
          repeat={[3, 3]}
          anisotropy={8}
          flatColor="#3a3a3e"
          flatRoughness={0.95}
        />
      </mesh>

      {/* Structural columns — poured concrete, floor to ceiling. */}
      {(
        [
          [-3.6, -3.6],
          [3.6, -3.6],
        ] as const
      ).map(([x, z], i) => (
        <mesh key={`col${i}`} position={[x, floorY + colH / 2, z]}>
          <boxGeometry args={[0.55, colH, 0.55]} />
          <PbrMaterial
            name="concrete-foundation"
            repeat={[1, Math.max(1, Math.round(colH / 3))]}
            flatColor="#35353a"
            flatRoughness={0.95}
          />
        </mesh>
      ))}

      {/* The city on the bedrock — blocks with scattered window lights. */}
      {blocks.map((b, i) => (
        <group key={`b${i}`} position={[b.x, cityBase + b.h / 2, b.z]}>
          <mesh>
            <boxGeometry args={[b.w, b.h, b.d]} />
            <meshStandardMaterial
              color="#0e0a06"
              emissive="#e8a020"
              emissiveIntensity={b.lit ? 0.16 : 0.05}
              metalness={0.4}
              roughness={0.75}
            />
          </mesh>
          {b.lit && (
            <mesh position={[0, b.h * 0.1, b.d / 2 + 0.002]}>
              <planeGeometry args={[b.w * 0.5, 0.12]} />
              <meshBasicMaterial
                color={b.cool ? "#9fb8f0" : "#f0b452"}
                transparent
                opacity={0.85}
              />
            </mesh>
          )}
        </group>
      ))}

      {/* Ger roofs — low domes among the blocks. */}
      {gers.map((g, i) => (
        <mesh key={`g${i}`} position={[g.x, cityBase + g.r * 0.4, g.z]}>
          <coneGeometry args={[g.r, g.r * 0.7, 8]} />
          <meshStandardMaterial
            color="#15100a"
            emissive="#e8a020"
            emissiveIntensity={0.1}
            metalness={0.3}
            roughness={0.85}
          />
        </mesh>
      ))}

      {/* The survey benchmark — the immovable mark on bedrock, front and centre.
          The exact coordinate is stated in the colophon; here it is only the disc. */}
      <group position={[0, floorY + 0.03, 2.2]}>
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.5, 0.5, 0.05, 32]} />
          <meshStandardMaterial
            color="#b9892f"
            emissive="#e8a020"
            emissiveIntensity={0.12}
            metalness={0.9}
            roughness={0.35}
          />
        </mesh>
        <mesh position={[0, 0.04, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.34, 0.02, 8, 32]} />
          <meshStandardMaterial color="#e8a020" emissive="#e8a020" emissiveIntensity={0.5} />
        </mesh>
        {/* The mark itself — cool blue, the boundary note */}
        <mesh position={[0, 0.05, 0]}>
          <sphereGeometry args={[0.05, 12, 12]} />
          <meshStandardMaterial color="#4060c0" emissive="#4060c0" emissiveIntensity={0.9} />
        </mesh>
      </group>
    </group>
  )
}
