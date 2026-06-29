"use client"

import { useScrollStore } from "@/hooks/use-scroll-store"
import { progressToDepth, THERMOCLINE_DEPTH, MAX_DEPTH } from "@/lib/world-config"
import { place, heldLine } from "@/lib/content"

/**
 * The capsule — the rendered cage you ride. A fixed viewport that never moves
 * while the medium rises past it. Its instruments are fed by scroll depth:
 * the depth readout (the home for the orphaned number), the dive-site
 * coordinate, a descent status that flips at the thermocline, and the manifest
 * latch that opens the colophon — the foundation at the bottom.
 */
export function Capsule() {
  const loaded = useScrollStore((s) => s.loaded)
  const progress = useScrollStore((s) => s.progress)
  const setColophonOpen = useScrollStore((s) => s.setColophonOpen)

  if (!loaded) return null

  const depth = progressToDepth(progress)
  const crossed = depth >= THERMOCLINE_DEPTH
  const atFloor = progress > 0.97
  // Pressure builds with depth — the vignette tightens.
  const pressure = 0.35 + progress * 0.4

  return (
    <div className="capsule" aria-hidden="false">
      {/* Glass + pressure vignette over the viewport */}
      <div className="capsule-glass" />
      <div
        className="capsule-vignette"
        style={{ opacity: pressure }}
      />

      {/* Cage struts */}
      <div className="capsule-bar capsule-bar-top" />
      <div className="capsule-bar capsule-bar-bottom" />
      <div className="capsule-bar capsule-bar-left" />
      <div className="capsule-bar capsule-bar-right" />
      <div className="capsule-bevel" />

      {/* Corner bolts */}
      <span className="capsule-bolt capsule-bolt-tl" />
      <span className="capsule-bolt capsule-bolt-tr" />
      <span className="capsule-bolt capsule-bolt-bl" />
      <span className="capsule-bolt capsule-bolt-br" />

      {/* Top instrument deck */}
      <div className="capsule-deck">
        <div className="capsule-depth">
          <span className="capsule-depth-num">
            {Math.round(depth).toString().padStart(3, "0")}
          </span>
          <span className="capsule-depth-unit">m</span>
          <span className="capsule-depth-max">/ {MAX_DEPTH}</span>
        </div>
        <div className="capsule-coord">{place.coordinate}</div>
        <div className="capsule-status">
          <span
            className={`capsule-status-dot ${crossed ? "is-deep" : ""}`}
          />
          {atFloor ? "FOUNDATION" : crossed ? "BELOW THERMOCLINE" : "DESCENDING"}
        </div>
      </div>

      {/* Bottom latch — the manifest (colophon) */}
      <div className="capsule-latch">
        <button
          type="button"
          aria-label={heldLine.open}
          onClick={() => setColophonOpen(true)}
          className={`capsule-latch-btn ${atFloor ? "is-ready" : ""}`}
        >
          <span className="capsule-latch-mark">{heldLine.marker}</span>
          manifest
        </button>
      </div>
    </div>
  )
}
