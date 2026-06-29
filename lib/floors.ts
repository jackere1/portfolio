import { SECTION_RANGES } from "@/hooks/use-scroll-store"
import { Y_SURFACE, Y_BEDROCK } from "@/lib/world-config"
import { rooms, type RoomId } from "@/lib/content"

// The shaft's cross-section: each floor cell is a square bay of this half-width.
export const SHAFT_HALF = 5

// A stage fills only this much of its cell; the remainder is travel void — the
// shaft you fall through between rooms.
export const STAGE_HEIGHT = 6

// Map scroll progress to world Y (the camera descends this span).
export function yAtProgress(p: number): number {
  return Y_SURFACE + (Y_BEDROCK - Y_SURFACE) * p
}

// Centre-anchored stages float in the middle of their cell (void above and
// below). Floor-anchored stages stand on the cell floor (void only above).
type Anchor = "center" | "floor"
const ANCHOR: Record<RoomId, Anchor> = {
  gate: "center",
  boundary: "center",
  language: "center",
  music: "center",
  reflex: "center",
  killdates: "floor",
  place: "floor",
}

export interface FloorBand {
  id: RoomId
  index: number
  /** Full cell, top → bottom — used for the dividers between floors. */
  cellTop: number
  cellBottom: number
  /** The compact stage the scene fills (a sub-band of the cell). */
  yTop: number
  yBottom: number
  yCenter: number
  height: number
}

export const floors: FloorBand[] = rooms.map((room, index) => {
  const [start, end] = SECTION_RANGES[room.id]
  const cellTop = yAtProgress(start)
  const cellBottom = yAtProgress(end)
  const cellH = cellTop - cellBottom
  const h = Math.min(STAGE_HEIGHT, cellH - 0.5)

  let yTop: number
  let yBottom: number
  if (ANCHOR[room.id] === "floor") {
    yBottom = cellBottom + 0.5
    yTop = yBottom + h
  } else {
    const c = (cellTop + cellBottom) / 2
    yTop = c + h / 2
    yBottom = c - h / 2
  }

  return {
    id: room.id,
    index,
    cellTop,
    cellBottom,
    yTop,
    yBottom,
    yCenter: (yTop + yBottom) / 2,
    height: yTop - yBottom,
  }
})

// Each floor scene receives its compact stage bounds and builds within them.
export interface FloorProps {
  yTop: number
  yBottom: number
  yCenter: number
  height: number
}
