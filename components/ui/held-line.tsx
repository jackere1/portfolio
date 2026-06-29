"use client"

import { useScrollStore } from "@/hooks/use-scroll-store"
import { heldLine } from "@/lib/content"

/**
 * A small fixed marker — a true value (Ulaanbaatar's latitude) that never moves
 * while the world drifts, and the QED mark that opens the colophon (the buried
 * proof). Quiet, in the corner; the boundary itself lives in the 3D field.
 */
export function HeldLine() {
  const loaded = useScrollStore((s) => s.loaded)
  const setColophonOpen = useScrollStore((s) => s.setColophonOpen)

  if (!loaded) return null

  return (
    <div className="fixed left-6 top-6 z-[61] flex items-center gap-2">
      <span className="pointer-events-none font-mono text-[0.6rem] tracking-[0.18em] text-[oklch(0.62_0.16_250/0.55)]">
        {heldLine.label}
      </span>
      <button
        type="button"
        aria-label={heldLine.open}
        onClick={() => setColophonOpen(true)}
        className="cursor-pointer font-mono text-[0.8rem] leading-none text-[oklch(0.62_0.16_250/0.8)] hover:text-[oklch(0.7_0.16_250)] focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-4 focus-visible:outline-[oklch(0.62_0.16_250/0.8)]"
      >
        {heldLine.marker}
      </button>
    </div>
  )
}
