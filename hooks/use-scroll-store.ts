import { create } from "zustand"

// The seven strata, top → bottom — outer self first, inner self deepest. The
// seam (lib/world-config SEAM_Y) is crossed in the "threshold" room.
export type SectionName =
  | "surface"
  | "threshold"
  | "reflex"
  | "ear"
  | "tongue"
  | "oath"
  | "place"

interface ScrollState {
  /** 0-1 overall scroll progress */
  progress: number
  /** Current scroll velocity (for effects that react to scroll speed) */
  velocity: number
  /** Currently active room based on scroll position */
  activeSection: SectionName
  /** Whether the experience has finished loading */
  loaded: boolean
  /** The colophon — the buried truth — is open. */
  colophonOpen: boolean

  setProgress: (p: number) => void
  setVelocity: (v: number) => void
  setActiveSection: (s: SectionName) => void
  setLoaded: (l: boolean) => void
  setColophonOpen: (o: boolean) => void
}

/**
 * Room scroll ranges (start, end) as fractions of total scroll. Centered so
 * each room is active when the camera arrives at its keyframe (≈ index/6).
 */
export const SECTION_RANGES: Record<SectionName, [number, number]> = {
  surface: [0, 0.09],
  threshold: [0.09, 0.25],
  reflex: [0.25, 0.42],
  ear: [0.42, 0.58],
  tongue: [0.58, 0.75],
  oath: [0.75, 0.91],
  place: [0.91, 1.0],
}

export const useScrollStore = create<ScrollState>((set) => ({
  progress: 0,
  velocity: 0,
  activeSection: "surface",
  loaded: false,
  colophonOpen: false,
  setProgress: (p) => set({ progress: p }),
  setVelocity: (v) => set({ velocity: v }),
  setActiveSection: (s) => set({ activeSection: s }),
  setLoaded: (l) => set({ loaded: l }),
  setColophonOpen: (o) => set({ colophonOpen: o }),
}))

/** Get progress within a specific room (0-1) */
export function getSectionProgress(
  globalProgress: number,
  section: SectionName
): number {
  const [start, end] = SECTION_RANGES[section]
  if (globalProgress <= start) return 0
  if (globalProgress >= end) return 1
  return (globalProgress - start) / (end - start)
}
