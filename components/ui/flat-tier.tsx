"use client"

import { useEffect, useRef, useState } from "react"
import { STOPS } from "@/lib/stops"
import { localTimeAt, sunStateAt } from "@/lib/sun-arc"
import { ToonoMark } from "./toono-mark"

// Phones, weak GPUs and prefers-reduced-motion all land here.
//
// This is not a downgrade of the world — it is the same world, held still. The
// same seven stops in the same order under the same sun arc, read rather than
// travelled. It reads the identical lib/sun-arc, so the light here and the
// light in the 3D tier are the same light; only the renderer changes.

function rgbCss(c: { r: number; g: number; b: number }, scale = 255): string {
  const k = (v: number) =>
    Math.round(Math.max(0, Math.min(1, v)) * scale)
  return `rgb(${k(c.r)} ${k(c.g)} ${k(c.b)})`
}

export function FlatTier() {
  const [t, setT] = useState(0)
  const trackRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onScroll = () => {
      const max = document.body.scrollHeight - window.innerHeight
      setT(max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0)
    }
    onScroll()
    window.addEventListener("scroll", onScroll, { passive: true })
    window.addEventListener("resize", onScroll)
    return () => {
      window.removeEventListener("scroll", onScroll)
      window.removeEventListener("resize", onScroll)
    }
  }, [])

  const sun = sunStateAt(t)

  return (
    <>
      <div
        aria-hidden
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 0,
          background: `linear-gradient(
            to bottom,
            ${rgbCss(sun.skyColor, 210)} 0%,
            ${rgbCss(sun.fogColor, 235)} 62%,
            ${rgbCss(sun.groundColor, 160)} 100%
          )`,
        }}
      />

      <header
        style={{
          position: "fixed",
          top: 18,
          left: 18,
          right: 18,
          zIndex: 2,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <ToonoMark size={30} chords={false} title="Ailchin" />
        <div style={{ textAlign: "right" }}>
          <span className="t-value" style={{ fontSize: 12 }}>
            {localTimeAt(t)}
          </span>
          <span
            className="t-value"
            style={{ fontSize: 12, marginLeft: 12, opacity: 0.7 }}
          >
            {sun.elevationDeg >= 0 ? "+" : "−"}
            {Math.abs(sun.elevationDeg).toFixed(1)}°
          </span>
        </div>
      </header>

      <main ref={trackRef} style={{ position: "relative", zIndex: 1 }}>
        {STOPS.map((stop) => (
          <section
            key={stop.id}
            style={{
              minHeight: "100svh",
              display: "grid",
              alignContent: "center",
              padding: "0 24px",
              maxWidth: 620,
            }}
          >
            <div className="t-value" style={{ fontSize: 11, opacity: 0.65 }}>
              {String(stop.index).padStart(2, "0")} / 07
            </div>
            <h2
              className="t-prose"
              style={{ fontSize: 26, margin: "10px 0 0" }}
            >
              {stop.label}
            </h2>
          </section>
        ))}
      </main>
    </>
  )
}
