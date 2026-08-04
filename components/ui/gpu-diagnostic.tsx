"use client"

/**
 * The tier decision, readable on the device that made it.
 *
 * A phone showed the flat tier and there was no way to ask it why — the answer
 * lived in a `window` object nobody can open on a phone, so diagnosis was
 * reduced to inference from a desktop that could not reproduce the fault. This
 * is the fix for that, not decoration: `?diag=1` prints what the probe saw.
 *
 * Deliberately styled inline. It must render even if the world, the chrome or
 * the stylesheet is the thing that is broken.
 */

import type { GpuProbe } from "@/hooks/use-gpu-tier"

export function GpuDiagnostic({ probe }: { probe: GpuProbe | null }) {
  if (!probe) return null

  const rows: [string, string][] = [
    ["tier", probe.tier + (probe.forced ? " (forced)" : "")],
    ["reason", probe.reason],
    ["webgl2", String(probe.webgl2)],
    ["max texture", String(probe.maxTexture)],
    ["max varyings", String(probe.maxVaryings)],
    ["max aniso", String(probe.maxAniso)],
    ["float linear", `${probe.floatLinear} (not required)`],
    ["reduced motion", String(probe.reducedMotion)],
    ["coarse pointer", String(probe.coarse)],
    ["width", `${probe.width}px`],
  ]

  return (
    <div
      style={{
        position: "fixed",
        inset: "auto 8px 8px 8px",
        zIndex: 9999,
        padding: "10px 12px",
        background: "rgba(6,8,14,0.92)",
        border: "1px solid rgba(224,180,110,0.35)",
        borderRadius: 6,
        font: "500 11px/1.5 ui-monospace, SFMono-Regular, Menlo, monospace",
        color: "#e8dcc8",
        letterSpacing: "0.02em",
        maxWidth: 460,
        margin: "0 auto",
      }}
    >
      {rows.map(([k, v]) => (
        <div key={k} style={{ display: "flex", gap: 10 }}>
          <span style={{ opacity: 0.55, minWidth: 104 }}>{k}</span>
          <span style={{ color: k === "tier" ? "#f0b060" : undefined }}>{v}</span>
        </div>
      ))}
      <div style={{ opacity: 0.45, marginTop: 6 }}>
        ?tier=mobile to force · ?diag=1 to show this
      </div>
    </div>
  )
}
