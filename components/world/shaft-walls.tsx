"use client"

import { SHAFT_HALF } from "@/lib/floors"
import { SEAM_Y, Y_BEDROCK } from "@/lib/world-config"
import { PbrMaterial } from "@/lib/textures"

// The shaft is open to the steppe above ground; the concrete walls begin exactly
// at the seam (ground level) and run to the bedrock — the line where the walls
// appear IS the boundary. Back + sides only; the +z face is the open cab aperture,
// so stages (x,z ∈ [-4,4], facing +z) are never occluded.
const TOP = SEAM_Y
const BOTTOM = Y_BEDROCK - 2
const H = TOP - BOTTOM
const MID = (TOP + BOTTOM) / 2
const SPAN = SHAFT_HALF * 2
const REPEAT: [number, number] = [3, Math.round(H / 3.5)]

const flat = { flatColor: "#3a3a3e", flatRoughness: 0.96, metalness: 0 }

export function ShaftWalls() {
  return (
    <group>
      {/* Back wall — z = -SHAFT_HALF, facing +z toward the cab. */}
      <mesh position={[0, MID, -SHAFT_HALF]}>
        <planeGeometry args={[SPAN, H]} />
        <PbrMaterial name="concrete-foundation" repeat={REPEAT} {...flat} />
      </mesh>
      {/* Left wall — x = -SHAFT_HALF, facing +x. */}
      <mesh position={[-SHAFT_HALF, MID, 0]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[SPAN, H]} />
        <PbrMaterial name="concrete-foundation" repeat={REPEAT} {...flat} />
      </mesh>
      {/* Right wall — x = +SHAFT_HALF, facing -x. */}
      <mesh position={[SHAFT_HALF, MID, 0]} rotation={[0, -Math.PI / 2, 0]}>
        <planeGeometry args={[SPAN, H]} />
        <PbrMaterial name="concrete-foundation" repeat={REPEAT} {...flat} />
      </mesh>
    </group>
  )
}
