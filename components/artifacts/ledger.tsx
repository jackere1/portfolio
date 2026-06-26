"use client"

import { useState } from "react"
import { ledger } from "@/lib/content"

const STEP = 10
const FOCUS =
  "focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-[oklch(0.78_0.18_75/0.7)]"

const FIRST = 0
const LAST = ledger.rows.length - 1

function signed(n: number): string {
  if (n > 0) return `+${n}`
  if (n < 0) return `−${Math.abs(n)}`
  return "0"
}

/**
 * The invariant. A double-column ledger whose total is always exactly zero.
 * Perturb the first row by ±10 and the last row ("reversed") mirrors by ∓10
 * instantly — Σ is not permitted to lie, ever.
 */
export function Ledger() {
  // Only the first row is driven; the last is its exact mirror. The middle
  // rows hold steady so the displayed total is structurally always 0.
  const [head, setHead] = useState(0)

  const amounts = ledger.rows.map((_, i) => {
    if (i === FIRST) return head
    if (i === LAST) return -head
    return 0
  })

  const total = amounts.reduce((a, b) => a + b, 0)

  function perturb(d: number) {
    setHead((h) => h + d)
  }

  return (
    <div className="w-full max-w-[340px]">
      <div className="substrate p-4 font-mono">
        <ul className="tabular-nums">
          {ledger.rows.map((row, i) => (
            <li
              key={row}
              className="flex items-baseline justify-between gap-4 py-0.5"
            >
              <span className="text-[oklch(0.55_0.02_80)]">{row}</span>
              <span
                className={`text-right ${
                  i === LAST
                    ? "text-[oklch(0.62_0.16_250)]"
                    : "text-[oklch(0.92_0.01_80)]"
                }`}
              >
                {signed(amounts[i])}
              </span>
            </li>
          ))}
        </ul>

        <div className="my-3 h-px w-full bg-[oklch(0.55_0.02_80/0.35)]" />

        {/* running total — never anything but 0 */}
        <div className="flex items-baseline justify-between gap-4 tabular-nums">
          <span className="text-[oklch(0.78_0.18_75)]">{ledger.invariant}</span>
          <span className="text-lg text-[oklch(0.78_0.18_75)]">{total}</span>
        </div>

        <p className="mt-1 text-[0.65rem] text-[oklch(0.55_0.02_80)]">
          the balancing entry mirrors instantly
        </p>

        <div className="mt-3 flex items-center gap-3">
          <span className="text-xs uppercase tracking-wider text-[oklch(0.55_0.02_80)]">
            {ledger.rows[FIRST]}
          </span>
          <button
            type="button"
            onClick={() => perturb(STEP)}
            aria-label={`add ${STEP} to ${ledger.rows[FIRST]}`}
            className={`border border-[oklch(0.78_0.18_75/0.5)] px-2 py-1 text-xs text-[oklch(0.78_0.18_75)] hover:bg-[oklch(0.78_0.18_75/0.1)] ${FOCUS}`}
          >
            +{STEP}
          </button>
          <button
            type="button"
            onClick={() => perturb(-STEP)}
            aria-label={`subtract ${STEP} from ${ledger.rows[FIRST]}`}
            className={`border border-[oklch(0.78_0.18_75/0.5)] px-2 py-1 text-xs text-[oklch(0.78_0.18_75)] hover:bg-[oklch(0.78_0.18_75/0.1)] ${FOCUS}`}
          >
            −{STEP}
          </button>
        </div>
      </div>
    </div>
  )
}
