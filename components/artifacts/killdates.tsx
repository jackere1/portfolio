"use client"

import { useEffect, useState } from "react"
import { killdates } from "@/lib/content"

const DAY_MS = 86_400_000

/** Days remaining until an ISO date from now. An honest live value. */
function daysRemaining(date: string): number {
  return Math.ceil((Date.parse(date) - Date.now()) / DAY_MS)
}

/**
 * Kill-dates. Every project has a date written on it — the day I've agreed to
 * kill it. A clean ledger of commitments: the ISO date (right-aligned, fixed,
 * not editable — that's the point) then the bet. Killed bets are struck through
 * but stay legible; live bets show honest days remaining, recomputed every 60s.
 */
export function KillDates() {
  // Recompute live remaining-days on a 60s tick so the ledger stays current.
  const [, setTick] = useState(0)

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 60_000)
    return () => clearInterval(id)
  }, [])

  return (
    <div className="w-full max-w-[340px]">
      <div className="substrate p-4 font-mono tabular-nums">
        <div className="mb-3 flex items-baseline justify-between">
          <span className="text-[10px] uppercase tracking-[0.18em] text-[oklch(0.55_0.02_80)]">
            kill-dates
          </span>
          {killdates.placeholder && (
            <span className="text-[10px] uppercase tracking-[0.18em] text-[oklch(0.55_0.02_80)]">
              [draft]
            </span>
          )}
        </div>

        <ul className="flex flex-col gap-1.5">
          {killdates.entries.map((entry) => {
            const remaining = entry.killed ? null : daysRemaining(entry.date)
            return (
              <li
                key={`${entry.date}-${entry.name}`}
                className="flex items-baseline gap-3 text-xs"
              >
                {/* date column — right-aligned, fixed, legible even when killed */}
                <span
                  className={`w-[5.5rem] shrink-0 text-right tabular-nums ${
                    entry.killed
                      ? "text-[oklch(0.55_0.02_80)]"
                      : "text-[oklch(0.92_0.01_80)]"
                  }`}
                >
                  {entry.date}
                </span>

                {/* the bet */}
                <span
                  className={`min-w-0 flex-1 truncate ${
                    entry.killed
                      ? "text-[oklch(0.55_0.02_80)] line-through"
                      : "text-[oklch(0.92_0.01_80)]"
                  }`}
                >
                  {entry.name}
                </span>

                {/* status: killed tag, or live days-remaining / overdue */}
                {entry.killed ? (
                  <span className="shrink-0 text-[oklch(0.78_0.18_75/0.5)]">
                    killed
                  </span>
                ) : (
                  <span
                    className={`shrink-0 tabular-nums ${
                      remaining! < 0
                        ? "text-[oklch(0.78_0.18_75)]"
                        : "text-[oklch(0.62_0.16_250)]"
                    }`}
                  >
                    {remaining! < 0 ? "OVERDUE" : `+${remaining}d`}
                  </span>
                )}
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}
