"use client"

import { useState } from "react"
import { morphology } from "@/lib/content"

const FOCUS =
  "focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-[oklch(0.78_0.18_75/0.7)]"

/**
 * The word. Agglutination stacked end over end: each "stack +" peels in the
 * next suffix, the form growing longer line by line. Then a search pre-filled
 * with the bare stem that breaks on its own morphology — the stem is buried.
 */
export function Morphology() {
  // How many suffix steps are revealed (0…steps.length).
  const [depth, setDepth] = useState(0)
  const [query, setQuery] = useState(morphology.query)
  const [searched, setSearched] = useState(false)

  const atTop = depth >= morphology.steps.length
  const revealed = morphology.steps.slice(0, depth)

  function stack() {
    if (!atTop) setDepth((d) => d + 1)
  }

  function peel() {
    setDepth(0)
  }

  return (
    <div className="w-full max-w-[340px]">
      <div className="substrate relative p-4 font-mono">
        {/* placeholder marker */}
        {morphology.placeholder && (
          <span className="absolute right-2 top-2 text-[0.6rem] text-[oklch(0.55_0.02_80)]">
            [draft]
          </span>
        )}

        {/* base */}
        <div className="flex items-baseline gap-2">
          <span className="text-lg text-[oklch(0.92_0.01_80)]">
            {morphology.base}
          </span>
          <span className="text-xs text-[oklch(0.55_0.02_80)]">
            {morphology.baseGloss}
          </span>
        </div>

        {/* vertical stack — the word growing end over end */}
        <ul className="mt-2 space-y-1">
          {revealed.map((step) => {
            const stem = step.form.slice(0, step.form.length - step.add.length + 1)
            return (
              <li key={step.form} className="flex items-baseline gap-2">
                <span className="text-base text-[oklch(0.92_0.01_80)]">
                  {stem}
                  <span className="text-[oklch(0.78_0.18_75)]">
                    {step.add.replace(/^-/, "")}
                  </span>
                </span>
                <span className="text-xs text-[oklch(0.55_0.02_80)]">
                  {step.gloss}
                </span>
              </li>
            )
          })}
        </ul>

        <div className="mt-3 flex items-center gap-3">
          <button
            type="button"
            onClick={stack}
            disabled={atTop}
            aria-label="stack the next suffix"
            className={`border border-[oklch(0.78_0.18_75/0.5)] px-2 py-1 text-xs uppercase tracking-wider text-[oklch(0.78_0.18_75)] hover:bg-[oklch(0.78_0.18_75/0.1)] disabled:opacity-40 ${FOCUS}`}
          >
            stack +
          </button>
          <button
            type="button"
            onClick={peel}
            aria-label="reset to the stem"
            className={`text-xs uppercase tracking-wider text-[oklch(0.55_0.02_80)] hover:text-[oklch(0.92_0.01_80)] ${FOCUS}`}
          >
            −
          </button>
        </div>

        {/* search that breaks on morphology */}
        <div className="mt-4 border-t border-[oklch(0.55_0.02_80/0.35)] pt-3">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value)
                setSearched(false)
              }}
              aria-label="search the index"
              className={`w-0 flex-1 border border-[oklch(0.55_0.02_80/0.4)] bg-[oklch(0.04_0.01_260/0.6)] px-2 py-1 font-mono text-xs text-[oklch(0.92_0.01_80)] ${FOCUS}`}
            />
            <button
              type="button"
              onClick={() => setSearched(true)}
              className={`border border-[oklch(0.78_0.18_75/0.5)] px-2 py-1 text-xs uppercase tracking-wider text-[oklch(0.78_0.18_75)] hover:bg-[oklch(0.78_0.18_75/0.1)] ${FOCUS}`}
            >
              search
            </button>
          </div>

          {searched && (
            <div className="mt-2 text-xs">
              <span className="text-[oklch(0.62_0.16_250)]">no match</span>
              <span className="text-[oklch(0.55_0.02_80)]"> — {morphology.breaks}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
