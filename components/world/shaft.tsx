import type { ComponentType } from "react"
import { floors, SHAFT_HALF, type FloorProps } from "@/lib/floors"
import { Y_SURFACE, Y_BEDROCK } from "@/lib/world-config"
import type { RoomId } from "@/lib/content"
import { FloorDivider } from "./floor-divider"
import { FloorGate } from "./floors/gate"
import { FloorBoundary } from "./floors/boundary"
import { FloorLanguage } from "./floors/language"
import { FloorMusic } from "./floors/music"
import { FloorReflex } from "./floors/reflex"
import { FloorKilldates } from "./floors/killdates"
import { FloorPlace } from "./floors/place"

const sceneFor: Record<RoomId, ComponentType<FloorProps>> = {
  gate: FloorGate,
  boundary: FloorBoundary,
  language: FloorLanguage,
  music: FloorMusic,
  reflex: FloorReflex,
  killdates: FloorKilldates,
  place: FloorPlace,
}

const RAIL = 0.16
const railTop = Y_SURFACE + 3
const railBottom = Y_BEDROCK - 2
const railH = railTop - railBottom
const railMidY = (railTop + railBottom) / 2
const CORNERS: [number, number][] = [
  [SHAFT_HALF, SHAFT_HALF],
  [SHAFT_HALF, -SHAFT_HALF],
  [-SHAFT_HALF, SHAFT_HALF],
  [-SHAFT_HALF, -SHAFT_HALF],
]

const railMat = {
  color: "#241a0d",
  emissive: "#e8a020",
  emissiveIntensity: 0.14,
  metalness: 0.8,
  roughness: 0.4,
} as const

/** The continuous corner rails — the constant structure that streams past as you descend. */
function Rails() {
  return (
    <>
      {CORNERS.map(([x, z], i) => (
        <mesh key={i} position={[x, railMidY, z]}>
          <boxGeometry args={[RAIL, railH, RAIL]} />
          <meshStandardMaterial {...railMat} />
        </mesh>
      ))}
    </>
  )
}

const RUNG_STEP = 4
const RUNG = 0.07
const SPAN = SHAFT_HALF * 2
const rungYs: number[] = []
for (let y = railBottom + 3; y < railTop; y += RUNG_STEP) rungYs.push(y)

const rungMat = {
  color: "#1c1408",
  emissive: "#e8a020",
  emissiveIntensity: 0.1,
  metalness: 0.7,
  roughness: 0.5,
} as const

/** Faint square rungs between the rails — passing structure that gives the void
 *  a sense of travel between floors. */
function Rungs() {
  return (
    <>
      {rungYs.map((y, i) => (
        <group key={i} position={[0, y, 0]}>
          <mesh position={[0, 0, SHAFT_HALF]}>
            <boxGeometry args={[SPAN, RUNG, RUNG]} />
            <meshStandardMaterial {...rungMat} />
          </mesh>
          <mesh position={[0, 0, -SHAFT_HALF]}>
            <boxGeometry args={[SPAN, RUNG, RUNG]} />
            <meshStandardMaterial {...rungMat} />
          </mesh>
          <mesh position={[SHAFT_HALF, 0, 0]}>
            <boxGeometry args={[RUNG, RUNG, SPAN]} />
            <meshStandardMaterial {...rungMat} />
          </mesh>
          <mesh position={[-SHAFT_HALF, 0, 0]}>
            <boxGeometry args={[RUNG, RUNG, SPAN]} />
            <meshStandardMaterial {...rungMat} />
          </mesh>
        </group>
      ))}
    </>
  )
}

/**
 * The shaft — continuous rails and rungs, a divider framing each floor cell, and
 * each cell's own stage floating in it with travel void above and below. The
 * camera descends through the dividers from one room into the next.
 */
export function Shaft() {
  return (
    <>
      <Rails />
      <Rungs />
      {floors.map((f) => {
        const Scene = sceneFor[f.id]
        return (
          <group key={f.id}>
            <FloorDivider y={f.cellTop} />
            <Scene
              yTop={f.yTop}
              yBottom={f.yBottom}
              yCenter={f.yCenter}
              height={f.height}
            />
          </group>
        )
      })}
      {/* The bedrock divider at the very bottom */}
      <FloorDivider y={floors[floors.length - 1].cellBottom} />
    </>
  )
}
