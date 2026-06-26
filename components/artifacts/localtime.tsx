"use client"

import { useEffect, useState } from "react"
import { place } from "@/lib/content"

const PLACEHOLDER_TIME = "--:--:--"

const timeFormat = new Intl.DateTimeFormat("en-GB", {
  timeZone: place.timezone,
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
})

/** The UTC offset label for the place's timezone, e.g. "UTC+8". */
function offsetLabel(): string {
  try {
    const parts = new Intl.DateTimeFormat("en-GB", {
      timeZone: place.timezone,
      timeZoneName: "shortOffset",
    }).formatToParts(new Date())
    const tz = parts.find((p) => p.type === "timeZoneName")
    return tz?.value ?? "UTC+8"
  } catch {
    return "UTC+8"
  }
}

/**
 * Local time. The ground truth: a fixed coordinate and the live local time
 * where the work happens. The coordinate is the immovable truth; the time is
 * the live one, ticking every second. Initialized in an effect to avoid an
 * SSR/first-paint mismatch — a stable placeholder shows until mounted.
 */
export function LocalTime() {
  const [time, setTime] = useState<string | null>(null)
  const [offset, setOffset] = useState("UTC+8")

  useEffect(() => {
    setOffset(offsetLabel())
    const update = () => setTime(timeFormat.format(new Date()))
    update()
    const id = setInterval(update, 1000)
    return () => clearInterval(id)
  }, [])

  return (
    <div className="w-full max-w-[340px]">
      <div className="substrate p-4 font-mono tabular-nums">
        <div className="mb-3 text-[10px] uppercase tracking-[0.18em] text-[oklch(0.55_0.02_80)]">
          ground truth
        </div>

        {/* fixed truth — the coordinate */}
        <div className="text-xs tabular-nums text-[oklch(0.92_0.01_80)]">
          {place.coordinate}
        </div>
        <div className="text-xs text-[oklch(0.55_0.02_80)]">{place.city}</div>

        {/* live truth — the local time, ticking */}
        <div className="mt-3 flex items-baseline gap-2">
          <span className="text-2xl tabular-nums text-[oklch(0.92_0.01_80)]">
            {time ?? PLACEHOLDER_TIME}
          </span>
          <span className="text-xs tabular-nums text-[oklch(0.62_0.16_250)]">
            {offset}
          </span>
        </div>
      </div>
    </div>
  )
}
