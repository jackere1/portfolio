"use client"

import { create } from "zustand"
import { activeStop } from "@/lib/stops"
import { createSunState, writeSunState } from "@/lib/sun-arc"

/** One reused state object; setProgress runs on every scroll frame. */
const scratch = createSunState()

/**
 * The hot path. `journey.t` is written by Lenis every frame and read by every
 * useFrame subscriber — it deliberately lives OUTSIDE React so that travelling
 * causes zero re-renders. Nothing here allocates.
 */
export const journey = {
  /** Progress, 0 at the track's end, 1 seated under the toono. */
  t: 0,
  /** Signed dt of t, for damping and for holding the camera still when idle. */
  velocity: 0,
  /** True once the visitor has clicked in and the AudioContext is unlocked. */
  entered: false,
}

const MUTE_KEY = "ailchin:muted"

interface JourneyState {
  /** Discrete, low-frequency state only — safe to re-render on. */
  ready: boolean
  entered: boolean
  muted: boolean
  stopId: string
  phase: "day" | "dusk" | "night"
  setReady: (v: boolean) => void
  enter: () => void
  toggleMuted: () => void
  /** Called by the scroll driver; only pushes when a DISCRETE value changed. */
  syncDiscrete: (stopId: string, phase: "day" | "dusk" | "night") => void
}

export const useJourneyStore = create<JourneyState>((set) => ({
  ready: false,
  entered: false,
  // Remembered across visits: being asked to mute the same site twice is the
  // kind of small rudeness people do not forgive.
  muted:
    typeof window !== "undefined" &&
    window.localStorage?.getItem(MUTE_KEY) === "1",
  stopId: "track",
  phase: "day",
  setReady: (v) => set({ ready: v }),
  enter: () => {
    journey.entered = true
    set({ entered: true })
  },
  toggleMuted: () =>
    set((s) => {
      const muted = !s.muted
      try {
        window.localStorage?.setItem(MUTE_KEY, muted ? "1" : "0")
      } catch {
        // Private browsing. Not worth failing over.
      }
      return { muted }
    }),
  syncDiscrete: (stopId, phase) =>
    set((s) =>
      s.stopId === stopId && s.phase === phase ? s : { stopId, phase }
    ),
}))

/**
 * Write progress from the scroll driver. Updates the hot object every frame and
 * the React store only when the active stop or the light phase actually flips.
 */
export function setProgress(t: number): void {
  const clamped = t < 0 ? 0 : t > 1 ? 1 : t
  journey.velocity = clamped - journey.t
  journey.t = clamped

  const stopId = activeStop(clamped).id
  // Read the phase off the same arc everything else reads, so the chrome can
  // never disagree with the sky about whether it is day.
  writeSunState(scratch, clamped)
  useJourneyStore.getState().syncDiscrete(stopId, scratch.phase)
}
