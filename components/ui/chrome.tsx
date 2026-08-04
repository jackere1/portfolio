"use client"

import { useEffect, useRef, useState } from "react"
import { journey, useJourneyStore } from "@/hooks/use-journey"
import { activeStop, STOPS } from "@/lib/stops"
import { createSunState, localTimeAt, writeSunState } from "@/lib/sun-arc"
import { useProgress } from "@react-three/drei"
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

function SoundToggle() {
  const muted = useJourneyStore((s) => s.muted)
  const toggle = useJourneyStore((s) => s.toggleMuted)

  return (
    <button
      className="snap"
      onClick={toggle}
      aria-pressed={!muted}
      aria-label={muted ? "Turn sound on" : "Turn sound off"}
      title={muted ? "Sound off" : "Sound on"}
      style={{
        position: "absolute",
        right: 26,
        bottom: 26,
        appearance: "none",
        background: "transparent",
        border: "none",
        padding: 6,
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        gap: 8,
      }}
    >
      {/* Three bars of grass bending in wind — full when the sound is on,
          flattened when it is off. The world's own vocabulary, not a speaker. */}
      <svg width="18" height="16" viewBox="0 0 18 16" fill="none" aria-hidden>
        {[0, 1, 2].map((i) => {
          const h = muted ? 3 : [7, 12, 9][i]
          return (
            <path
              key={i}
              d={`M${3 + i * 6} 14 Q${4.4 + i * 6} ${14 - h / 2} ${
                5.6 + i * 6
              } ${14 - h}`}
              stroke="var(--ink-dim)"
              strokeWidth="1.4"
              strokeLinecap="round"
            />
          )
        })}
      </svg>
      <span className="t-micro" style={{ letterSpacing: "0.24em" }}>
        {muted ? "OFF" : "ON"}
      </span>
    </button>
  )
}

function Entry() {
  const entered = useJourneyStore((s) => s.entered)
  const ready = useJourneyStore((s) => s.ready)
  const enter = useJourneyStore((s) => s.enter)

  // Real progress, from the loading manager that the textures and the star map
  // already go through. The button used to enable as soon as the scroll driver
  // was up, which on a slow connection is a control that looks ready, does
  // nothing useful, and explains none of it.
  const { active, progress } = useProgress()
  const loading = active && progress < 100
  const canEnter = ready && !loading

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
        // The entry is ALWAYS on the night ground, whatever the sky is doing
        // behind it, so it carries the night inks explicitly. Inheriting the
        // daylight phase put dark text on a black screen.
        ["--ink" as string]: "var(--starlit)",
        ["--ink-dim" as string]: "var(--starlit-dim)",
      }}
    >
      <div style={{ display: "grid", justifyItems: "center", gap: 30 }}>
        <ToonoMark size={72} title="Ailchin" />

        <button
          className="snap"
          disabled={!canEnter}
          onClick={enter}
          style={{
            appearance: "none",
            background: "transparent",
            border: "1px solid var(--ember)",
            color: "var(--ember)",
            padding: "13px 30px",
            cursor: canEnter ? "pointer" : "wait",
            fontFamily: "var(--font-sans)",
            fontWeight: 500,
            fontSize: 12,
            letterSpacing: "0.26em",
            textTransform: "uppercase",
            opacity: canEnter ? 1 : 0.45,
            position: "relative",
            overflow: "hidden",
          }}
        >
          {/* The fill IS the progress bar. A separate bar would be a second
              thing to look at for the same fact. */}
          {loading && (
            <span
              aria-hidden
              style={{
                position: "absolute",
                left: 0,
                top: 0,
                bottom: 0,
                width: `${Math.round(progress)}%`,
                background: "var(--ember)",
                opacity: 0.16,
              }}
            />
          )}
          <span style={{ position: "relative" }}>
            {canEnter
              ? "Enter as a guest"
              : loading
                ? `Loading · ${Math.round(progress)}%`
                : "Loading"}
          </span>
        </button>

        <div style={{ display: "grid", justifyItems: "center", gap: 9 }}>
          <p
            className="t-micro"
            style={{ margin: 0, letterSpacing: "0.2em" }}
          >
            scroll to approach · move to look
          </p>
          <p
            className="t-micro"
            style={{ margin: 0, letterSpacing: "0.2em" }}
          >
            nine stops · afternoon to night · about four minutes
          </p>
        </div>
      </div>
    </div>
  )
}

/** Shown until the visitor actually scrolls, then gone for good. A hint that
 *  outstays its usefulness is just clutter over the world. */
function ScrollHint() {
  const [gone, setGone] = useState(false)

  useEffect(() => {
    const check = () => {
      if (journey.t > 0.012) {
        setGone(true)
        window.removeEventListener("scroll", check)
      }
    }
    window.addEventListener("scroll", check, { passive: true })
    return () => window.removeEventListener("scroll", check)
  }, [])

  if (gone) return null

  return (
    <div
      style={{
        position: "absolute",
        left: "50%",
        bottom: 34,
        transform: "translateX(-50%)",
        display: "grid",
        justifyItems: "center",
        gap: 7,
        pointerEvents: "none",
      }}
    >
      <span className="t-micro" style={{ letterSpacing: "0.28em" }}>
        SCROLL
      </span>
      <svg width="13" height="20" viewBox="0 0 13 20" fill="none" aria-hidden>
        <path
          d="M6.5 1 L6.5 17 M2 12.5 L6.5 17 L11 12.5"
          stroke="var(--ink-dim)"
          strokeWidth="1.3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  )
}

/** At the last stop there is nowhere further to scroll, and nothing saying so.
 *  This is the only place in the piece that offers to take you back. */
function BeginAgain() {
  const stopId = useJourneyStore((s) => s.stopId)
  if (stopId !== STOPS[STOPS.length - 1].id) return null

  return (
    <button
      className="snap"
      onClick={() => {
        const w = window as unknown as {
          __ailchin?: { seek: (t: number) => void }
        }
        w.__ailchin?.seek(0)
      }}
      style={{
        position: "absolute",
        left: "50%",
        bottom: 30,
        transform: "translateX(-50%)",
        appearance: "none",
        background: "transparent",
        border: "1px solid var(--stone)",
        color: "var(--ink-dim)",
        padding: "10px 22px",
        cursor: "pointer",
        fontFamily: "var(--font-sans)",
        fontWeight: 500,
        fontSize: 10,
        letterSpacing: "0.26em",
        textTransform: "uppercase",
      }}
    >
      Ride back
    </button>
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

  // Arrow keys walk the route. The dial is already clickable, so not being
  // able to reach the same thing from the keyboard was simply an omission.
  useEffect(() => {
    if (!entered) return
    const onKey = (e: KeyboardEvent) => {
      const i = STOPS.findIndex((s) => s.id === stopId)
      if (e.key === "ArrowDown" || e.key === "ArrowRight") {
        if (i < STOPS.length - 1) seek(i + 1)
      } else if (e.key === "ArrowUp" || e.key === "ArrowLeft") {
        if (i > 0) seek(i - 1)
      } else if (e.key === "Home") {
        seek(0)
      } else if (e.key === "End") {
        seek(STOPS.length - 1)
      } else {
        return
      }
      e.preventDefault()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [entered, stopId])

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
          <SoundToggle />
          <ScrollHint />
          <BeginAgain />
        </>
      )}

      <Soundscape />
      <Entry />
    </div>
  )
}
