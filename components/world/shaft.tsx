import { Suspense, type ComponentType } from "react"
import { floors, SHAFT_HALF, type FloorProps } from "@/lib/floors"
import { Y_SURFACE, Y_BEDROCK, SEAM_Y } from "@/lib/world-config"
import type { RoomId } from "@/lib/content"
import { FloorDivider } from "./floor-divider"
import { ShaftWalls } from "./shaft-walls"
import { FloorSurface } from "./floors/surface"
import { FloorThreshold } from "./floors/threshold"
import { FloorReflex } from "./floors/reflex"
import { FloorEar } from "./floors/ear"
import { FloorTongue } from "./floors/tongue"
import { FloorOath } from "./floors/oath"
import { FloorPlace } from "./floors/place"

const sceneFor: Record<RoomId, ComponentType<FloorProps>> = {
  surface: FloorSurface,
  threshold: FloorThreshold,
  reflex: FloorReflex,
  ear: FloorEar,
  tongue: FloorTongue,
  oath: FloorOath,
  place: FloorPlace,
}

const RAIL = 0.16
// The rails belong to the shaft, not the sky: they begin just above the seam
// (ground level) and run to the bedrock. Above ground the steppe is open — no
// cage over the appearance; the structure forms as you cross into the deep.
const railTop = SEAM_Y + 2
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

      {/* The concrete shaft — present only below ground level. */}
      <Suspense fallback={null}>
        <ShaftWalls />
      </Suspense>

      {floors.map((f) => {
        const Scene = sceneFor[f.id]
        // Above the open mouth of the shaft there is no ceiling; underground each
        // cell is capped by a poured concrete storey slab.
        const showDivider = f.cellTop < SEAM_Y + 4
        const concrete = f.cellTop <= SEAM_Y
        return (
          <Suspense key={f.id} fallback={null}>
            <group>
              {showDivider && <FloorDivider y={f.cellTop} concrete={concrete} />}
              <Scene
                yTop={f.yTop}
                yBottom={f.yBottom}
                yCenter={f.yCenter}
                height={f.height}
                stillness={f.stillness}
              />
            </group>
          </Suspense>
        )
      })}

      {/* The bedrock slab at the very bottom — the foundation. */}
      <Suspense fallback={null}>
        <FloorDivider y={floors[floors.length - 1].cellBottom} concrete />
      </Suspense>
    </>
  )
}
