"use client"

import { useEffect, useRef } from "react"
import { journey, useJourneyStore } from "@/hooks/use-journey"
import { activeStop, STOPS } from "@/lib/stops"
import { createSunState, localTimeAt, writeSunState } from "@/lib/sun-arc"
import { ToonoDial, ToonoMark } from "./toono-mark"
import { Soundscape } from "@/components/audio/soundscape"

// Instruments, not website chrome. Two values only — the local time at the site
// and the sun's elevation — because those are the two the sky can be checked
// against. TEMP was cut: it was a fabricated number set in the one typeface
// this site says is not permitted to lie.
//
// The readouts are written straight into the DOM from a rAF loop rather than
// through React state. Travelling must cost zero re-renders.

function Instruments() {
  const timeRef = useRef<HTMLSpanElement>(null)
  const sunRef = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    const sun = createSunState()
    let raf = 0
    let lastTime = ""
    let lastSun = ""

    const tick = () => {
      writeSunState(sun, journey.t)

      const t = localTimeAt(journey.t)
      if (t !== lastTime && timeRef.current) {
        timeRef.current.textContent = t
        lastTime = t
      }

      const e = sun.elevationDeg
      const s = `${e >= 0 ? "+" : "−"}${Math.abs(e).toFixed(1)}°`
      if (s !== lastSun && sunRef.current) {
        sunRef.current.textContent = s
        lastSun = s
      }

      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])

  return (
    <div
      style={{
        position: "absolute",
        left: 28,
        bottom: 26,
        display: "flex",
        gap: 26,
        alignItems: "baseline",
      }}
    >
      <div>
        <div className="t-micro">TIME</div>
        <span ref={timeRef} className="t-value" style={{ fontSize: 15 }}>
          20:20
        </span>
      </div>
      <div>
        <div className="t-micro">SUN</div>
        <span ref={sunRef} className="t-value" style={{ fontSize: 15 }}>
          +2.0°
        </span>
      </div>
    </div>
  )
}

function Entry() {
  const entered = useJourneyStore((s) => s.entered)
  const ready = useJourneyStore((s) => s.ready)
  const enter = useJourneyStore((s) => s.enter)

  if (entered) return null

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        background: "var(--night)",
        display: "grid",
        placeItems: "center",
        opacity: 1,
      }}
    >
      <div style={{ display: "grid", justifyItems: "center", gap: 30 }}>
        <ToonoMark size={72} title="Ailchin" />

        <button
          className="snap"
          disabled={!ready}
          onClick={enter}
          style={{
            appearance: "none",
            background: "transparent",
            border: "1px solid var(--ember)",
            color: "var(--ember)",
            padding: "13px 30px",
            cursor: ready ? "pointer" : "wait",
            fontFamily: "var(--font-sans)",
            fontWeight: 500,
            fontSize: 12,
            letterSpacing: "0.26em",
            textTransform: "uppercase",
            opacity: ready ? 1 : 0.4,
          }}
        >
          {ready ? "Enter as a guest" : "Loading"}
        </button>

        <p
          className="t-micro"
          style={{ margin: 0, color: "var(--stone)", letterSpacing: "0.2em" }}
        >
          scroll to approach · move to look
        </p>
      </div>
    </div>
  )
}

export function Chrome() {
  const stopId = useJourneyStore((s) => s.stopId)
  const phase = useJourneyStore((s) => s.phase)
  const entered = useJourneyStore((s) => s.entered)
  const stop = STOPS.find((s) => s.id === stopId) ?? STOPS[0]

  // The chrome obeys the lighting arc: the ink phase flips with the sky.
  useEffect(() => {
    document.documentElement.dataset.phase = phase
  }, [phase])

  const seek = (index: number) => {
    const target = STOPS[index]
    if (!target) return
    const w = window as unknown as { __ailchin?: { seek: (t: number) => void } }
    w.__ailchin?.seek(target.t)
  }

  return (
    <div className="chrome">
      <div style={{ position: "absolute", left: 26, top: 24 }}>
        <ToonoMark size={34} chords={false} title="Ailchin" />
      </div>

      {entered && (
        <>
          <div
            style={{
              position: "absolute",
              right: 26,
              top: "50%",
              transform: "translateY(-50%)",
              display: "grid",
              justifyItems: "end",
              gap: 12,
            }}
          >
            <ToonoDial stopIndex={stop.index} segments={STOPS.length} onSeek={seek} />
            <div style={{ textAlign: "right" }}>
              <div className="t-value" style={{ fontSize: 11, opacity: 0.7 }}>
                {String(stop.index).padStart(2, "0")} / {String(STOPS.length).padStart(2, "0")}
              </div>
              <div className="t-stencil" style={{ fontSize: 11 }}>
                {stop.label}
              </div>
            </div>
          </div>

          <Instruments />
        </>
      )}

      <Soundscape />
      <Entry />
    </div>
  )
}
