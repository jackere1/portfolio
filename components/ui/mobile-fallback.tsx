"use client"

import type { ComponentType } from "react"
import { rooms, heldLine, type ArtifactKind } from "@/lib/content"
import { useScrollStore } from "@/hooks/use-scroll-store"
import { Colophon } from "@/components/ui/colophon"
import { Gate } from "@/components/artifacts/gate"
import { Ledger } from "@/components/artifacts/ledger"
import { Morphology } from "@/components/artifacts/morphology"
import { Interval } from "@/components/artifacts/interval"
import { Reflex } from "@/components/artifacts/reflex"
import { KillDates } from "@/components/artifacts/killdates"
import { LocalTime } from "@/components/artifacts/localtime"

const artifactFor: Record<ArtifactKind, ComponentType> = {
  gate: Gate,
  ledger: Ledger,
  morphology: Morphology,
  interval: Interval,
  reflex: Reflex,
  killdates: KillDates,
  localtime: LocalTime,
}

/**
 * Mobile carries the same boundary, with CSS instead of WebGL: a held line
 * fixed at the screen's center, a drifting grid above it and a locked grid
 * below, the rooms as native disclosures whose proof snaps open, and the same
 * buried colophon. No 3D, no heavy effects.
 */
export function MobileFallback() {
  const setColophonOpen = useScrollStore((s) => s.setColophonOpen)

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[oklch(0.06_0.02_260)] text-[oklch(0.92_0.01_80)]">
      {/* Two regions, split at the held line */}
      <div className="boundary-bg" aria-hidden="true">
        <div className="boundary-region boundary-drift" />
        <div className="boundary-region boundary-locked" />
      </div>

      {/* A small fixed marker — the latitude that never moves, and the mark
          that opens the colophon. The boundary itself is the two regions. */}
      <div className="fixed left-5 top-5 z-[61] flex items-center gap-2">
        <span className="pointer-events-none font-mono text-[0.6rem] tracking-[0.18em] text-[oklch(0.62_0.16_250/0.6)]">
          {heldLine.label}
        </span>
        <button
          type="button"
          aria-label={heldLine.open}
          onClick={() => setColophonOpen(true)}
          className="font-mono text-[0.85rem] leading-none text-[oklch(0.62_0.16_250/0.85)]"
        >
          {heldLine.marker}
        </button>
      </div>

      {/* The rooms */}
      <main className="relative z-10 mx-auto max-w-md px-6 py-[40vh]">
        {rooms.map((room) => {
          const Artifact = artifactFor[room.artifact]
          return (
            <section key={room.id} className="mb-[28vh]">
              <div className="room-marker">{room.marker}</div>
              <p className="lead mt-3">{room.lead}</p>
              {room.body && <p className="voice mt-4">{room.body}</p>}

              <details className="room-details mt-5">
                <summary className="reveal-control">
                  <span aria-hidden="true">▸ </span>
                  {room.reveal}
                </summary>
                <div className="mt-3">
                  <Artifact />
                </div>
              </details>
            </section>
          )
        })}

        <footer className="mt-8 border-t border-[oklch(0.62_0.16_250/0.2)] pt-4 font-mono text-[0.625rem] text-[oklch(0.5_0.02_80)]">
          encold.guru — built at night, in Ulaanbaatar.
        </footer>
      </main>

      <Colophon />
    </div>
  )
}
