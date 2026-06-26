"use client"

import { Html } from "@react-three/drei"
import type { ReactNode } from "react"
import { useScrollStore, getSectionProgress } from "@/hooks/use-scroll-store"
import { roomById, type RoomId } from "@/lib/content"
import { ProofReveal } from "@/components/ui/proof-reveal"

interface RoomProps {
  id: RoomId
  position: [number, number, number]
  artifact: ReactNode
  distanceFactor?: number
  /** First room: visible at load (no fade-in from progress 0). */
  holdStart?: boolean
}

/**
 * A room on the surface: a depth marker, the claim (the voice), and — beneath
 * it — the proof, revealed on a snap. The panel itself fades softly with scroll
 * (ambient speed); the reveal underneath snaps instantly (foreground speed).
 */
export function Room({
  id,
  position,
  artifact,
  distanceFactor = 7,
  holdStart = false,
}: RoomProps) {
  const room = roomById(id)
  const progress = useScrollStore((s) => s.progress)
  const sp = getSectionProgress(progress, id)

  // Ambient fade — soft, scroll-driven: in over the first 12%, out over the last.
  // The first room holds visible at load (no fade-in from progress 0).
  const fadeOut = sp > 0.88 ? (1 - sp) / 0.12 : 1
  const raw = holdStart ? fadeOut : sp < 0.12 ? sp / 0.12 : fadeOut
  const opacity = Math.max(0, Math.min(1, raw))

  return (
    <Html
      position={position}
      center
      distanceFactor={distanceFactor}
      style={{
        opacity,
        transition: "opacity 0.3s",
        pointerEvents: opacity < 0.1 ? "none" : "auto",
      }}
    >
      <div className="w-[340px]">
        <div className="room-marker">{room.marker}</div>
        <p className="lead mt-3">{room.lead}</p>
        {room.body && <p className="voice mt-4">{room.body}</p>}
        <ProofReveal label={room.reveal}>{artifact}</ProofReveal>
      </div>
    </Html>
  )
}
