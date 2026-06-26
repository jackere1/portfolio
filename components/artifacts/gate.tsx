"use client"

import { useState } from "react"
import { gate } from "@/lib/content"

const STEP = 7
const FOCUS =
  "focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-[oklch(0.78_0.18_75/0.7)]"

/**
 * The gate. A value with a hard upper bound it physically refuses to cross.
 * PUSH +7 clamps at gate.max; an attempt past the bound moves nothing and
 * increments the blocked counter — push forever, you never pass.
 */
export function Gate() {
  const [value, setValue] = useState(gate.min)
  const [blocked, setBlocked] = useState(0)

  const atGate = value >= gate.max
  const fill = (value / gate.max) * 100

  function push() {
    if (value + STEP > gate.max) {
      setBlocked((b) => b + 1)
      return
    }
    setValue((v) => v + STEP)
  }

  function reset() {
    setValue(gate.min)
    setBlocked(0)
  }

  return (
    <div className="w-full max-w-[340px]">
      <div className="substrate p-4 font-mono">
        {/* value / max */}
        <div className="flex items-baseline gap-2 tabular-nums">
          <span className="text-2xl text-[oklch(0.92_0.01_80)]">{value}</span>
          <span className="text-sm text-[oklch(0.55_0.02_80)]">/ {gate.max}</span>
        </div>

        {/* hard bar — fills value/max, stops at the gate, no transition */}
        <div className="relative mt-3 h-3 w-full border border-[oklch(0.55_0.02_80/0.4)] bg-[oklch(0.04_0.01_260/0.6)]">
          <div
            className="absolute inset-y-0 left-0 bg-[oklch(0.78_0.18_75)]"
            style={{ width: `${fill}%` }}
          />
          {/* the gate: the bright amber line at the bound */}
          <div className="absolute inset-y-0 right-0 w-px bg-[oklch(0.78_0.18_75)]" />
        </div>

        {/* refusal */}
        <div className="mt-3 h-4 text-xs tabular-nums">
          {atGate ? (
            <span className="text-[oklch(0.78_0.18_75)]">
              {gate.refusal} · blocked ×{blocked}
            </span>
          ) : (
            blocked > 0 && (
              <span className="text-[oklch(0.55_0.02_80)]">blocked ×{blocked}</span>
            )
          )}
        </div>

        <div className="mt-3 flex items-center gap-3">
          <button
            type="button"
            onClick={push}
            className={`border border-[oklch(0.78_0.18_75/0.5)] px-2 py-1 text-xs uppercase tracking-wider text-[oklch(0.78_0.18_75)] hover:bg-[oklch(0.78_0.18_75/0.1)] ${FOCUS}`}
          >
            push +{STEP}
          </button>
          <button
            type="button"
            onClick={reset}
            className={`text-xs uppercase tracking-wider text-[oklch(0.55_0.02_80)] hover:text-[oklch(0.92_0.01_80)] ${FOCUS}`}
          >
            reset
          </button>
        </div>
      </div>
    </div>
  )
}
