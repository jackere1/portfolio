"use client"

import { useCallback } from "react"
import {
  useScrollStore,
  SECTION_RANGES,
  type SectionName,
} from "@/hooks/use-scroll-store"
import { rooms } from "@/lib/content"
import { THERMOCLINE_DEPTH, MAX_DEPTH } from "@/lib/world-config"
import type Lenis from "lenis"

/**
 * The floor gauge — the cab instrument on the right strut. A tick per floor, a
 * marker at ground level, and a cursor tracking your current depth. Click a tick
 * to descend to that floor.
 */
export function NavOverlay() {
  const progress = useScrollStore((s) => s.progress)
  const loaded = useScrollStore((s) => s.loaded)

  const diveTo = useCallback((p: number) => {
    const lenis = (window as Window & { __lenis?: Lenis }).__lenis
    const max = document.documentElement.scrollHeight - window.innerHeight
    if (lenis) lenis.scrollTo(p * max, { duration: 1.4 })
    else window.scrollTo({ top: p * max, behavior: "smooth" })
  }, [])

  if (!loaded) return null

  const thermoPct = (THERMOCLINE_DEPTH / MAX_DEPTH) * 100

  return (
    <div className="gauge" aria-label="Depth gauge">
      <div className="gauge-track" />
      <div className="gauge-thermo" style={{ top: `${thermoPct}%` }}>
        <span className="gauge-thermo-label">ground level</span>
      </div>
      <div className="gauge-cursor" style={{ top: `${progress * 100}%` }} />

      {rooms.map((room, i) => {
        const [start, end] = SECTION_RANGES[room.id as SectionName]
        const mid = (start + end) / 2
        const active = progress >= start && progress < end
        const target = i === 0 ? 0 : start + (end - start) * 0.3
        return (
          <button
            key={room.id}
            type="button"
            className={`gauge-tick ${active ? "is-active" : ""}`}
            style={{ top: `${mid * 100}%` }}
            onClick={() => diveTo(target)}
            aria-label={`Descend to level ${i + 1}: ${room.id}`}
            aria-current={active ? "true" : undefined}
          >
            <span className="gauge-tick-mark" />
            <span className="gauge-tick-label">
              {String(i + 1).padStart(2, "0")}
            </span>
          </button>
        )
      })}
    </div>
  )
}
