"use client"

import { useScrollStore } from "@/hooks/use-scroll-store"
import { heldLine } from "@/lib/content"

/**
 * The held invariant.
 *
 * A single cool-blue hairline pinned to the exact vertical center of the
 * SCREEN — a DOM sibling of the canvas, so the camera and parallax can never
 * perturb it. It does not fade per room; it is the one constant while the whole
 * world drifts behind it. Its anchor is a fixed latitude (a value not permitted
 * to lie), and its QED marker opens the colophon — the buried proof. Cross the
 * line, reach the truth.
 */
export function HeldLine() {
  const loaded = useScrollStore((s) => s.loaded)
  const setColophonOpen = useScrollStore((s) => s.setColophonOpen)

  if (!loaded) return null

  return (
    <>
      <div className="held-line" aria-hidden="true" />

      <div
        className="fixed left-5 z-[61] flex items-center gap-3"
        style={{ top: "calc(50vh - 0.9rem)" }}
      >
        <span className="pointer-events-none font-mono text-[0.625rem] tracking-[0.18em] text-[oklch(0.62_0.16_250/0.75)]">
          {heldLine.label}
        </span>
        <button
          type="button"
          aria-label={heldLine.open}
          onClick={() => setColophonOpen(true)}
          className="cursor-pointer font-mono text-[0.85rem] leading-none text-[oklch(0.62_0.16_250/0.85)] hover:text-[oklch(0.7_0.16_250)] focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-4 focus-visible:outline-[oklch(0.62_0.16_250/0.8)]"
        >
          {heldLine.marker}
        </button>
      </div>
    </>
  )
}
