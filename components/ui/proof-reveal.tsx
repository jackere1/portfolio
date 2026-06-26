"use client"

import { useId, useState, type ReactNode } from "react"

interface ProofRevealProps {
  /** Affordance label, e.g. "the gate", "the invariant". */
  label: string
  /** The substrate revealed underneath — the proof. Snaps in, no easing. */
  children: ReactNode
}

/**
 * Surface → proof. The claim sits above; on click / tap / Enter / Space the
 * substrate snaps into view instantly (foreground speed — no transition),
 * lifting the layer to expose the deterministic proof beneath the prose.
 */
export function ProofReveal({ label, children }: ProofRevealProps) {
  const [open, setOpen] = useState(false)
  const panelId = useId()

  return (
    <div className="mt-4">
      <button
        type="button"
        className="reveal-control"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((o) => !o)}
      >
        <span aria-hidden="true">{open ? "▾ " : "▸ "}</span>
        {label}
      </button>

      {open && (
        <div id={panelId} className="snap mt-3">
          {children}
        </div>
      )}
    </div>
  )
}
