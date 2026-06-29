import { useMemo } from "react"
import { makeRng, seededRange } from "@/lib/prng"
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
 * Place — Ulaanbaatar at night, on the bedrock. A low silhouette of blocks and
 * ger roofs with scattered window lights. The ground the whole dive rests on;
 * the work that only matters here.
 */
export function FloorPlace({ yBottom }: FloorProps) {
  const blocks = useMemo<Block[]>(() => {
    const rng = makeRng("floor-place")
    return Array.from({ length: 46 }, () => ({
      x: seededRange(rng, -4.6, 4.6),
      z: seededRange(rng, -3.5, 1.5),
      w: seededRange(rng, 0.3, 0.85),
      d: seededRange(rng, 0.3, 0.85),
      h: seededRange(rng, 0.5, 2.6),
      lit: rng() > 0.45,
      cool: rng() > 0.72,
    }))
  }, [])

  const gers = useMemo(() => {
    const rng = makeRng("floor-place-ger")
    return Array.from({ length: 10 }, () => ({
      x: seededRange(rng, -4.5, 4.5),
      z: seededRange(rng, 0, 2),
      r: seededRange(rng, 0.22, 0.4),
    }))
  }, [])

  const baseY = yBottom + 0.4

  return (
    <group>
      {blocks.map((b, i) => (
        <group key={`b${i}`} position={[b.x, baseY + b.h / 2, b.z]}>
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
              <planeGeometry args={[b.w * 0.5, 0.13]} />
              <meshBasicMaterial
                color={b.cool ? "#9fb8f0" : "#f0b452"}
                transparent
                opacity={0.85}
              />
            </mesh>
          )}
        </group>
      ))}

      {/* Ger roofs — low domes among the blocks */}
      {gers.map((g, i) => (
        <mesh key={`g${i}`} position={[g.x, baseY + g.r * 0.4, g.z]}>
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
    </group>
  )
}
