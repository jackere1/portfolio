"use client"

import { useEffect, useRef } from "react"

const RING = 18 // px — the small ring diameter
const HALF = RING / 2

/**
 * The foreground pointer. A small cool-blue ring that snaps to the mouse with
 * zero easing — the fast, deterministic foreground over the slow drifting
 * world. Additive: the native cursor stays for usability. Hidden entirely on
 * coarse/touch pointers, no-hover devices, or reduced-motion preference.
 *
 * No per-move setState — the handler writes transform directly to the ref.
 */
export function Cursor() {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const coarse = window.matchMedia("(pointer: coarse)").matches
    const noHover = !window.matchMedia("(hover: hover)").matches
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    if (coarse || noHover || reduced) return

    const el = ref.current
    if (!el) return

    const move = (e: MouseEvent) => {
      // Instant — no transition. Center the ring on the pointer.
      el.style.transform = `translate(${e.clientX - HALF}px, ${
        e.clientY - HALF
      }px) scale(1)`
    }
    const down = () => {
      const t = el.style.transform.replace(/ scale\([^)]*\)/, "")
      el.style.transform = `${t} scale(0.7)`
    }
    const up = () => {
      const t = el.style.transform.replace(/ scale\([^)]*\)/, "")
      el.style.transform = `${t} scale(1)`
    }

    window.addEventListener("mousemove", move)
    window.addEventListener("mousedown", down)
    window.addEventListener("mouseup", up)
    return () => {
      window.removeEventListener("mousemove", move)
      window.removeEventListener("mousedown", down)
      window.removeEventListener("mouseup", up)
    }
  }, [])

  return (
    <div
      ref={ref}
      aria-hidden="true"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: RING,
        height: RING,
        borderRadius: "9999px",
        border: "1px solid oklch(0.62 0.16 250 / 0.8)",
        backgroundColor: "transparent",
        pointerEvents: "none",
        zIndex: 70,
        transition: "none",
        willChange: "transform",
      }}
    >
      {/* tiny center dot */}
      <span
        aria-hidden="true"
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          width: 2,
          height: 2,
          marginTop: -1,
          marginLeft: -1,
          borderRadius: "9999px",
          backgroundColor: "oklch(0.62 0.16 250 / 0.8)",
        }}
      />
    </div>
  )
}
