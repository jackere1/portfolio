"use client"

import { useState } from "react"
import { reflex } from "@/lib/content"

// Colors (matched to the substrate palette).
const AMBER = "oklch(0.78 0.18 75)"
const OFFWHITE = "oklch(0.92 0.01 80)"
const MUTED = "oklch(0.55 0.02 80)"

// The box, in pixels. The target is square; it stays fully inside.
const BOX_W = 300
const BOX_H = 96 // ~ h-24
const TARGET = 24

/**
 * "you fall to your reflexes."
 *
 * The instant-snap foreground IS the proof. Each click jumps the target to a
 * new position with ZERO transition — your hand chases a thing that is already
 * gone by the time you "decided". Position is derived deterministically from a
 * click counter (a tiny integer hash), never Math.random in render. The target
 * is a real button, so Enter / Space move it too.
 */
export function Reflex() {
  const [count, setCount] = useState(0)

  const { x, y } = positionFor(count)

  return (
    <div
      className="substrate relative w-full p-4 font-mono"
      style={{ maxWidth: 340 }}
    >
      {reflex.placeholder && (
        <span
          className="absolute right-2 top-2 text-[0.6rem]"
          style={{ color: MUTED }}
          aria-hidden="true"
        >
          [draft]
        </span>
      )}

      <p className="text-[0.78rem]" style={{ color: OFFWHITE }}>
        {reflex.line}
      </p>
      <p className="mt-1 text-[0.65rem]" style={{ color: MUTED }}>
        {reflex.games}
      </p>

      <div
        className="relative mt-3 overflow-hidden"
        style={{
          width: "100%",
          maxWidth: BOX_W,
          height: BOX_H,
          border: `1px solid ${MUTED}`,
        }}
      >
        <button
          type="button"
          aria-label="reflex target"
          onClick={() => setCount((c) => c + 1)}
          className="absolute focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-[oklch(0.78_0.18_75/0.7)]"
          style={{
            // No transition: the foreground snaps. The target is already gone.
            left: x,
            top: y,
            width: TARGET,
            height: TARGET,
            background: AMBER,
            border: "none",
            padding: 0,
            cursor: "pointer",
          }}
        />
      </div>

      <div className="mt-2 text-[0.6rem] tabular-nums" style={{ color: MUTED }}>
        caught: {count}
      </div>
    </div>
  )
}

// Deterministic position from the click count. A small integer hash spreads
// successive counts across the box so the jumps feel unpredictable to the hand
// while staying pure (same count → same place, no Math.random).
function positionFor(n: number): { x: number; y: number } {
  // Two independent LCG-style hashes for x and y.
  const hx = ((n * 2654435761) >>> 0) ^ 0x9e3779b9
  const hy = ((n * 40503 + 0x85ebca6b) >>> 0) ^ 0xc2b2ae35
  const maxX = BOX_W - TARGET
  const maxY = BOX_H - TARGET
  return {
    x: (hx >>> 8) % (maxX + 1),
    y: (hy >>> 8) % (maxY + 1),
  }
}
