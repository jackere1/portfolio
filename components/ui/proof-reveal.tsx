"use client"

import { useId, useState, type ReactNode } from "react"

interface ProofRevealProps {
  /** Affordance label, e.g. "the gate", "the invariant". */
  label: string
  /** The substrate revealed underneath — the proof. Snaps in, no easing. */
  children: ReactNode
  /** Show the proof expanded by default (collapsible). */
  defaultOpen?: boolean
}

/**
 * Surface → proof. The claim sits above; the substrate sits open beneath it. The
 * toggle collapses/expands it instantly (foreground speed — no transition).
 */
export function ProofReveal({ label, children, defaultOpen = false }: ProofRevealProps) {
  const [open, setOpen] = useState(defaultOpen)
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
