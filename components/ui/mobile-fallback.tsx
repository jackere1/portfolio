"use client"

import { useEffect, useState, type ComponentType } from "react"
import { rooms, heldLine, place, type ArtifactKind } from "@/lib/content"
import { MAX_DEPTH, THERMOCLINE_DEPTH } from "@/lib/world-config"
import { useScrollStore } from "@/hooks/use-scroll-store"
import { diveDiag } from "@/hooks/use-gpu-tier"
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
 * Mobile carries the same descent with CSS instead of WebGL: a cab frame fixed
 * over a two-region medium (steppe drift above ground level, locked concrete
 * below), a depth readout that ticks as you scroll down, the levels as native
 * disclosures whose proof snaps open, and the same buried manifest (the colophon).
 */
export function MobileFallback() {
  const setColophonOpen = useScrollStore((s) => s.setColophonOpen)
  const [depth, setDepth] = useState(0)

  useEffect(() => {
    const onScroll = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight
      const p = max > 0 ? window.scrollY / max : 0
      setDepth(p * MAX_DEPTH)
    }
    onScroll()
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  const crossed = depth >= THERMOCLINE_DEPTH
  const atFloor = depth >= MAX_DEPTH - 6
  // Only prompt to enable 3D when WebGL was actually blocked on a capable
  // browser — not when the fallback is intentional (touch / phone / tiny window).
  const webglBlocked = diveDiag.reason.startsWith("WebGL")

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[oklch(0.06_0.02_260)] text-[oklch(0.92_0.01_80)]">
      {/* The medium — two regions split at ground level */}
      <div className="boundary-bg" aria-hidden="true">
        <div className="boundary-region boundary-drift" />
        <div className="boundary-region boundary-locked" />
      </div>

      {/* The capsule frame */}
      <div className="capsule" aria-hidden="false">
        <div className="capsule-glass" />
        <div className="capsule-vignette" style={{ opacity: 0.4 }} />
        <div className="capsule-bar capsule-bar-top" />
        <div className="capsule-bar capsule-bar-bottom" />
        <div className="capsule-bar capsule-bar-left" />
        <div className="capsule-bar capsule-bar-right" />
        <div className="capsule-bevel" />
        <span className="capsule-bolt capsule-bolt-tl" />
        <span className="capsule-bolt capsule-bolt-tr" />
        <span className="capsule-bolt capsule-bolt-bl" />
        <span className="capsule-bolt capsule-bolt-br" />

        <div className="capsule-deck">
          <div className="capsule-depth">
            <span className="capsule-depth-num">
              {Math.round(depth).toString().padStart(3, "0")}
            </span>
            <span className="capsule-depth-unit">m</span>
          </div>
          <div className="capsule-status">
            <span className={`capsule-status-dot ${crossed ? "is-deep" : ""}`} />
            {atFloor ? "FOUNDATION" : crossed ? "BELOW GROUND" : "DESCENDING"}
          </div>
        </div>

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

      {/* The levels */}
      <main className="relative z-10 mx-auto max-w-md px-7 pt-[24vh] pb-[20vh]">
        <p className="mb-[18vh] font-mono text-[0.6rem] tracking-[0.22em] text-[oklch(0.62_0.16_250/0.7)]">
          {place.coordinate}
        </p>
        {rooms.map((room, i) => {
          const Artifact = artifactFor[room.artifact]
          return (
            <section key={room.id} className="mb-[24vh]">
              <div className="level-index">
                <span className="level-num">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="level-of">
                  / {String(rooms.length).padStart(2, "0")}
                </span>
                <span className="level-rule" />
                <span className="level-name">{room.id}</span>
              </div>
              <p className="lead mt-3">{room.lead}</p>
              {room.body && <p className="voice mt-4">{room.body}</p>}
              <details className="room-details mt-5" open={room.revealOpen ?? true}>
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
      </main>

      {/* Below the levels: a prompt to enable the 3D, but ONLY when WebGL was
          genuinely blocked (a capable browser with acceleration off) — never a
          nag on real touch/phone visitors, for whom this CSS dive is the point. */}
      <div className="relative z-10 pb-16 text-center">
        {webglBlocked ? (
          <div className="mx-auto max-w-md px-7">
            <p className="font-mono text-[0.68rem] tracking-[0.16em] text-[oklch(0.72_0.13_250/0.9)]">
              THIS BROWSER ISN’T RENDERING 3D
            </p>
            <p className="mx-auto mt-3 max-w-sm font-mono text-[0.6rem] leading-[1.7] tracking-[0.08em] text-[oklch(0.58_0.02_80/0.8)]">
              WebGL is switched off here, so the full dive can’t run — everything
              above still works. To see it: turn on{" "}
              <span className="text-[oklch(0.7_0.02_80/0.95)]">
                “Use graphics acceleration when available”
              </span>{" "}
              in settings (System) and reload. On Linux, if it’s still blank,
              check{" "}
              <span className="text-[oklch(0.7_0.02_80/0.95)]">chrome://gpu</span>;
              enable{" "}
              <span className="text-[oklch(0.7_0.02_80/0.95)]">chrome://flags</span>{" "}
              → “Ignore GPU blocklist”, or launch with{" "}
              <span className="text-[oklch(0.7_0.02_80/0.95)]">
                --enable-unsafe-swiftshader
              </span>
              .
            </p>
          </div>
        ) : (
          <a
            href="?dive"
            className="font-mono text-[0.6rem] tracking-[0.22em] text-[oklch(0.62_0.16_250/0.6)] hover:text-[oklch(0.75_0.16_250/0.95)]"
          >
            descend in 3d →
          </a>
        )}
        <p className="mx-auto mt-6 max-w-md px-7 font-mono text-[0.5rem] leading-relaxed tracking-[0.12em] text-[oklch(0.44_0.02_80/0.55)]">
          webgl: {diveDiag.webgl ? "yes" : "no"} · gpu:{" "}
          {diveDiag.renderer || "hidden"} · {diveDiag.reason}
          {diveDiag.error ? ` (${diveDiag.error})` : ""}
        </p>
      </div>

      <Colophon />
    </div>
  )
}
