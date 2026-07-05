"use client"

import { Component, Suspense, type ReactNode } from "react"

/**
 * The line between the part of the scene that is allowed to fail and the part
 * that must never take the whole page down with it.
 *
 * <Suspense> catches *suspension* (a pending asset), never a *thrown* error — so
 * a 404 / decode failure / lost WebGL context on any single asset used to
 * propagate straight past every Suspense boundary to the page root and blank the
 * entire experience. These boundaries stop that: a heavy asset that fails to
 * load degrades to a graceful fallback (a cheaper sky, or simply nothing) while
 * the rest of the world keeps rendering.
 *
 * Two layers:
 *  - <AssetBoundary> wraps a single in-canvas asset (an HDRI, a glTF, a PBR
 *    stage). Error → its `errorFallback` (default: nothing). Loading →
 *    `suspenseFallback` (default: nothing). One dead asset never blanks the scene.
 *  - <CanvasCrashBoundary> wraps the whole <Canvas> in the DOM. A catastrophic
 *    renderer failure (no WebGL, driver crash) falls back to the CSS dive instead
 *    of a white page.
 */

interface CatchProps {
  fallback: ReactNode
  onError?: (error: unknown) => void
  children: ReactNode
}

class CatchErrors extends Component<CatchProps, { failed: boolean }> {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  componentDidCatch(error: unknown) {
    this.props.onError?.(error)
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children
  }
}

export function AssetBoundary({
  children,
  suspenseFallback = null,
  errorFallback = null,
  label,
}: {
  children: ReactNode
  suspenseFallback?: ReactNode
  errorFallback?: ReactNode
  /** Named so a failed asset is legible in the console, never silent. */
  label?: string
}) {
  return (
    <CatchErrors
      fallback={errorFallback}
      onError={(e) =>
        console.warn(`[dive] asset failed${label ? ` (${label})` : ""} — degrading:`, e)
      }
    >
      <Suspense fallback={suspenseFallback}>{children}</Suspense>
    </CatchErrors>
  )
}

export function CanvasCrashBoundary({
  children,
  fallback,
}: {
  children: ReactNode
  fallback: ReactNode
}) {
  return (
    <CatchErrors
      fallback={fallback}
      onError={(e) => console.error("[dive] canvas crashed — falling back to CSS dive:", e)}
    >
      {children}
    </CatchErrors>
  )
}
