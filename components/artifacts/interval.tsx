"use client"

import { useEffect, useRef, useState } from "react"
import { interval } from "@/lib/content"

// Colors (matched to the substrate palette).
const AMBER = "oklch(0.78 0.18 75)"
const BLUE = "oklch(0.62 0.16 250)"
const OFFWHITE = "oklch(0.92 0.01 80)"
const MUTED = "oklch(0.55 0.02 80)"

type Sounding = "tension" | "resolution" | null

/**
 * "I could hear an interval before I could name one."
 *
 * The visitor hears the cadence resolve — the 4 falls to the 3 — using the
 * native Web Audio API. No library. A single AudioContext is created lazily on
 * the first user gesture and closed on unmount. Each chord is a set of
 * oscillators, one GainNode each, with short attack/release ramps so nothing
 * clicks. Foreground state (the highlighted chord) snaps; nothing eases.
 */
export function Interval() {
  const ctxRef = useRef<AudioContext | null>(null)
  const [sounding, setSounding] = useState<Sounding>(null)
  // Timeouts that drive the *visual* highlight back to null after a chord.
  const timersRef = useRef<number[]>([])

  // Close the AudioContext when the component leaves the page.
  useEffect(() => {
    return () => {
      for (const id of timersRef.current) window.clearTimeout(id)
      timersRef.current = []
      const ctx = ctxRef.current
      if (ctx && ctx.state !== "closed") void ctx.close()
      ctxRef.current = null
    }
  }, [])

  async function getContext(): Promise<AudioContext> {
    let ctx = ctxRef.current
    if (!ctx || ctx.state === "closed") {
      const Ctor =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext
      ctx = new Ctor()
      ctxRef.current = ctx
    }
    if (ctx.state === "suspended") await ctx.resume()
    return ctx
  }

  // Schedule one chord at absolute time `at` (seconds, ctx clock).
  function playChord(ctx: AudioContext, freqs: readonly number[], at: number) {
    const attack = 0.015
    const hold = 0.5
    const release = 0.12
    const peak = 0.12

    for (const f of freqs) {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = "triangle"
      osc.frequency.setValueAtTime(f, at)

      gain.gain.setValueAtTime(0, at)
      gain.gain.linearRampToValueAtTime(peak, at + attack)
      gain.gain.setValueAtTime(peak, at + attack + hold)
      gain.gain.linearRampToValueAtTime(0, at + attack + hold + release)

      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start(at)
      osc.stop(at + attack + hold + release + 0.2)
    }
  }

  // Drive the visual highlight: snap on now, snap off after the chord settles.
  function flagVisual(which: Exclude<Sounding, null>, delayMs: number) {
    const onId = window.setTimeout(() => setSounding(which), delayMs)
    const offId = window.setTimeout(() => {
      setSounding((cur) => (cur === which ? null : cur))
    }, delayMs + 640)
    timersRef.current.push(onId, offId)
  }

  async function playOne(which: Exclude<Sounding, null>) {
    const ctx = await getContext()
    const freqs = which === "tension" ? interval.tension : interval.resolution
    playChord(ctx, freqs, ctx.currentTime + 0.02)
    flagVisual(which, 0)
  }

  async function playCadence() {
    const ctx = await getContext()
    const t = ctx.currentTime + 0.02
    playChord(ctx, interval.tension, t)
    playChord(ctx, interval.resolution, t + 0.7)
    flagVisual("tension", 0)
    flagVisual("resolution", 700)
  }

  return (
    <div
      className="substrate relative w-full p-4 font-mono"
      style={{ maxWidth: 340 }}
    >
      {interval.placeholder && (
        <span
          className="absolute right-2 top-2 text-[0.6rem]"
          style={{ color: MUTED }}
          aria-hidden="true"
        >
          [draft]
        </span>
      )}

      <div
        className="text-[0.6rem] uppercase tracking-[0.18em]"
        style={{ color: MUTED }}
      >
        cadence
      </div>
      <div
        className="mt-1 text-base font-mono"
        style={{ color: AMBER }}
        aria-label={`suspension resolving, ${interval.label}`}
      >
        {interval.label}
      </div>

      <div className="mt-3 space-y-1" aria-hidden="true">
        <ChordRow
          name="tension"
          freqs={interval.tension}
          active={sounding === "tension"}
        />
        <ChordRow
          name="resolution"
          freqs={interval.resolution}
          active={sounding === "resolution"}
        />
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => void playCadence()}
          className="border px-2 py-1 text-[0.7rem] focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-[oklch(0.78_0.18_75/0.7)]"
          style={{ borderColor: AMBER, color: OFFWHITE }}
          aria-label="play the cadence: tension resolving to resolution"
        >
          ▸ play cadence
        </button>
        <button
          type="button"
          onClick={() => void playOne("tension")}
          className="border px-2 py-1 text-[0.65rem] focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-[oklch(0.78_0.18_75/0.7)]"
          style={{ borderColor: MUTED, color: MUTED }}
          aria-label="play tension chord alone"
        >
          tension
        </button>
        <button
          type="button"
          onClick={() => void playOne("resolution")}
          className="border px-2 py-1 text-[0.65rem] focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-[oklch(0.78_0.18_75/0.7)]"
          style={{ borderColor: MUTED, color: MUTED }}
          aria-label="play resolution chord alone"
        >
          resolution
        </button>
      </div>
    </div>
  )
}

function ChordRow({
  name,
  freqs,
  active,
}: {
  name: string
  freqs: readonly number[]
  active: boolean
}) {
  return (
    <div className="flex items-baseline gap-2">
      <span
        className="w-[5.5rem] shrink-0 text-[0.6rem] uppercase tracking-[0.12em]"
        style={{ color: active ? BLUE : MUTED }}
      >
        {name}
      </span>
      <span
        className="font-mono text-[0.7rem] tabular-nums"
        style={{ color: active ? OFFWHITE : MUTED }}
      >
        {freqs.map((f) => f.toFixed(2)).join("  ")}
      </span>
    </div>
  )
}
