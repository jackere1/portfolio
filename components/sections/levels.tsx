"use client"

import type { ComponentType } from "react"
import { rooms, type ArtifactKind } from "@/lib/content"
import { useScrollStore, getSectionProgress } from "@/hooks/use-scroll-store"
import { ProofReveal } from "@/components/ui/proof-reveal"
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
 * The levels. Every level's content lives in ONE fixed slot inside the capsule
 * viewport — it cross-fades in as you reach that depth and out as you pass it,
 * always in the same place. The motion belongs to the medium behind the glass;
 * the text holds its station. That consistency is the meaning.
 */
export function Levels() {
  const loaded = useScrollStore((s) => s.loaded)
  const progress = useScrollStore((s) => s.progress)

  if (!loaded) return null

  return (
    <div className="levels">
      {rooms.map((room, i) => {
        const sp = getSectionProgress(progress, room.id)
        const isFirst = i === 0
        const isLast = i === rooms.length - 1
        // Visible across its band; the first holds at the surface, the last
        // holds at the floor. Brief gaps between levels show just the medium.
        const fadeIn = isFirst ? 1 : Math.min(1, sp / 0.14)
        const fadeOut = isLast ? 1 : Math.min(1, (1 - sp) / 0.14)
        const vis = Math.max(0, Math.min(fadeIn, fadeOut))
        const Artifact = artifactFor[room.artifact]

        return (
          <div
            key={room.id}
            className="level"
            style={{
              opacity: vis,
              pointerEvents: vis > 0.6 ? "auto" : "none",
            }}
            aria-hidden={vis < 0.6}
          >
            <div className="level-index">
              <span className="level-num">{String(i + 1).padStart(2, "0")}</span>
              <span className="level-of">/ {String(rooms.length).padStart(2, "0")}</span>
              <span className="level-rule" />
              <span className="level-name">{room.id}</span>
            </div>
            <p className="lead mt-4">{room.lead}</p>
            {room.body && <p className="voice mt-4">{room.body}</p>}
            <ProofReveal label={room.reveal} defaultOpen>
              <Artifact />
            </ProofReveal>
          </div>
        )
      })}
    </div>
  )
}
